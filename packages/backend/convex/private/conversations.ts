import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { supportAgent } from "../system/ai/agents/supportAgent";
import { MessageDoc, saveMessage } from "@convex-dev/agent";

import { paginationOptsValidator, PaginationResult } from "convex/server";
import { Doc } from "../_generated/dataModel";

// Este endpoint está diseñado para ser utilizado por la parte "privada" de tu aplicación (por ejemplo, un dashboard para los agentes de soporte), 
// donde los usuarios ya están autenticados como miembros de una organización. Su objetivo principal es obtener una lista paginada 
// de conversaciones, enriquecida con datos adicionales como el último mensaje y la información del contacto que inició la conversación.

// ## Asegura que solo un miembro autenticado de una organización pueda acceder.
// ## Obtiene una lista paginada de conversaciones para esa organización, con un filtro opcional por estado.
// ## Enriquece cada conversación con los detalles del contacto y el último mensaje.
// ## Devuelve los datos listos para ser consumidos por un dashboard o una interfaz de administración.

export const getMany = query({ // No es necesario el contactSessionId porque este endpoint se usa en /web y para entrar se necesita esta autenticado
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(                           // El endpoint acepta un argumento opcional status (unresolved, escalated, o resolved).
      v.union(
        v.literal("unresolved"),
        v.literal("escalated"),
        v.literal("resolved")
      )
    )
  },

  handler: async (ctx, args) => {

    const identity = await ctx.auth.getUserIdentity()          // Verificamos si hay un usuario autenticado
    if (identity === null) {                                   // A diferencia del endpoint public, que valida una sesión de contacto temporal, 
      throw new ConvexError({                                  // este endpoint se basa en la autenticación de Clerk.
        code: 'UNAUTHORIZED',
        message: 'Identity not found',
      });
    }

    const orgId = identity.orgId as string;                    // Si la autenticación es exitosa, extrae el orgId (ID de la organización) de la identidad del usuario.
    if (!orgId) {                                              // Esto es crucial porque la consulta solo devolverá las conversaciones que pertenecen a la organización  
      throw new ConvexError({                                  // del usuario que realiza la petición.
        code: 'UNAUTHORIZED',
        message: 'Identity not found',
      });
    }

    let conversations: PaginationResult<Doc<"conversations">>

    if (args.status) {                                                                // Si se proporciona un status
      conversations = await ctx.db
        .query('conversations')                                                       // Buscamos conversaciones 
        .withIndex('by_status_and_organization_id', (q) =>                            // usando el index "by_status_and_organization_id"
          q
            .eq('status', args.status as Doc<'conversations'>['status'])              // que coincidan tanto con el status 
            .eq('organizationId', orgId),                                             // como con el orgId del usuario.
        )
        .order('desc')
        .paginate(args.paginationOpts)
    } else {
      conversations = await ctx.db                                                    // Si no se proporciona el status                                    
        .query('conversations')                                                       // la consulta utiliza el índice más simple "by_organization_id"
        .withIndex('by_organization_id', (q) => q.eq('organizationId', orgId))
        .order('desc')
        .paginate(args.paginationOpts)
    }

    // La consulta inicial solo devuelve los datos básicos de la conversación. Para que la UI sea más útil, 
    // se necesita información adicional.

    const conversationsWithAdditionalData = await Promise.all(                         // Procesamos todas las conversaciones de la página actual en paralelo,
      
      conversations.page.map(async (conversation) => {                                 // Por cada conversación
        let lastMessage: MessageDoc | null = null

        const contactSession = await ctx.db.get(conversation.contactSessionId)         // 1º Obtenemos el contactSession correspondiente a la conversación. Esto permite mostrar en el dashboard quién es el cliente (su nombre, email, etc.)

        if (!contactSession) {                                                         // Si por alguna razón la sesión no existe, la conversación se marcará para ser descartada
          return null
        }

        const messages = await supportAgent.listMessages(ctx, {                        // 2º Llama al agente de soporte para obtener  
          threadId: conversation.threadId,                                             // los mensajes del hilo (threadId) de la conversación.
          paginationOpts: {
            numItems: 1,                                                               // Se especifica numItems: 1 para traer solo el último mensaje, ya que están ordenados de forma descendente.
            cursor: null,
          },
        })

        if (messages.page.length > 0) {                                                // 3º Si se encontró un mensaje se asigna a lastMessage
          lastMessage = messages.page[0] ?? null
        }

        return {                                                                        // 4º Se devuelve un nuevo objeto que contiene 
          ...conversation,                                                              // los campos de la conversación original 
          lastMessage,                                                                  // más el nuevo campo lastMessage.
          contactSession,                                                               // y el campo contactSession que contiene la información del contacto.
        }
      }),
    )

    const validConversations = conversationsWithAdditionalData.filter(                  // Se eliminan las conversaciones que devolvieron null en el paso anterior (aquellas cuyo contactSession no se encontró).
      (conv): conv is NonNullable<typeof conv> => conv !== null,
    )

    return {
      ...conversations,
      page: validConversations,
    }
   
  },
});

export const updateStatus = mutation({
  args: {
    conversationId: v.id('conversations'),
    status: v.union(
      v.literal('unresolved'),
      v.literal('escalated'),
      v.literal('resolved')
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (identity === null) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'Identity not found',
      })
    }

    const orgId = identity.orgId as string
    if (!orgId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'Organization not found',
      })
    }

    const conversation = await ctx.db.get(args.conversationId)
    if (!conversation) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Conversation not found',
      })
    }

    if (conversation.organizationId !== orgId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'Invalid Organization ID',
      })
    }

    await ctx.db.patch(args.conversationId, {
      status: args.status
    })

  }
})


export const getOne = query({
  args: {
    conversationId: v.id('conversations'),
  },
  handler: async (ctx, args) => {

    const identity = await ctx.auth.getUserIdentity()
    if (identity === null) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'Identity not found',
      })
    }

    const orgId = identity.orgId as string
    if (!orgId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'Organization not found',
      })
    }

    const conversation = await ctx.db.get(args.conversationId)
    if (!conversation) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Conversation not found',
      })
    }

    if (conversation.organizationId !== orgId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'Invalid Organization ID',
      })
    }

    const contactSession = await ctx.db.get(conversation.contactSessionId)

    if (!contactSession) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Contact Session not found',
      })
    }

    return {
      ...conversation,
      contactSession,
    }
  },
})
