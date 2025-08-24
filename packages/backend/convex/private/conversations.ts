import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { supportAgent } from "../system/ai/agents/supportAgent";
import { MessageDoc, saveMessage } from "@convex-dev/agent";
import { components } from "../_generated/api";
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

    const orgId = identity.org as string;                      // Si la autenticación es exitosa, extrae el orgId (ID de la organización) de la identidad del usuario.       
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


export const getOne = query({
  args: {
    conversationId: v.id("conversations"),
    contactSessionId: v.id("contactSessions"),
  },
  handler: async(ctx, args) => {
    const session = await ctx.db.get(args.contactSessionId); // Al darle el arg contactSessionId get sabe que tiene que obtener el objeto contactSession asociado a ese id
    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session"
      })
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      return null
    }

    if (conversation.contactSessionId !== session._id) {    // un usuario solo pueda ver las conversaciones que le pertenecen.
      throw new ConvexError({                               // session_id representa el id de la session del usuario que actualmente esta intentando acceder a la conversación
        code: "NOT_FOUND",
        message: "Incorrect session"
      })
    }

    return {
      _id: conversation._id,
      status: conversation.status,
      threadId: conversation.threadId,
    }
  }
})




export const create = mutation({
  args: {
    organizationId: v.string(),
    contactSessionId: v.id("contactSessions"),
  },
  handler: async(ctx, args) => {                                 // Obtenemos la sesión del usuario -> validación de sesión
    const session = await ctx.db.get(args.contactSessionId);     // Al darle el arg contactSessionId get sabe que tiene que obtener el objeto contactSession asociado a ese id
    if(!session || session.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session"
      })
    }

    const { threadId } = await supportAgent.createThread(ctx,{   // Crea un hilo de conversación en el agente de soporte basado en userId que es el id de la organización
      userId: args.organizationId
    })

    const today = new Date().toUTCString();                      // Obtenemos la fecha actual en formato UTC para dársela al agente.

    await saveMessage(ctx, components.agent, {                   // Guarda el mensaje de bienvenida inicial del asistente en el nuevo hilo.
      threadId,
      message: {
        role: 'assistant',
        // Inyectamos la fecha actual en el primer mensaje para que el agente la conozca.
        content: `Hello, how can I help you today? For your reference, today's date is ${today}.`,
      },
    });

    const conversationId = await ctx.db.insert("conversations", { // Cada conversación se asocia con la id de la session de contacto que la inicio
      contactSessionId: session._id,
      status: "unresolved",
      organizationId: args.organizationId,
      threadId,
    });


    return conversationId;
  }
})
