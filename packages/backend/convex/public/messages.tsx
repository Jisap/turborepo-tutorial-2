import { ConvexError, v } from "convex/values";
import { action, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { supportAgent } from "../system/ai/agents/supportAgent";
import { Id } from "../_generated/dataModel";
import { paginationOptsValidator } from "convex/server";

// Punto de entrada principal para que un usuario envíe un nuevo mensaje a una conversación existente.
// Su objetivo no es solo guardar el mensaje, sino orquestar una serie de validaciones y, lo más importante, 
// invocar al agente de inteligencia artificial (supportAgent) para que procese el mensaje y genere una respuesta.

export const create = action({
  args: {                                                                    // Argumentos del método
    prompt: v.string(),                                                      // Texto del mensaje del usuario
    threadId: v.string(),                                                    // El ID de la conversación
    contactSessionId: v.id("contactSessions")                                // El ID de la sesión del usuario
  },
  handler: async(ctx, args) => {
    
    const contactSession = await ctx.runQuery(                               // 1º Obtiene la sesión del usuario -> validación de sesión
      internal.system.contactSessions.getOne,                                // Usa la consulta interna "getOne" para obtener el objeto contactSession
      {
        contactSessionId: args.contactSessionId
      }
    );

    if (!contactSession || contactSession.expiresAt < Date.now()) {          // Si la sesión no existe o ha expirado, lanza un error de "No autorizado"
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session"
      })
    }

    const conversation = await ctx.runQuery(                                 // 2º Obtiene la conversación -> validación de conversación
      internal.system.conversations.getByThreadId,                           // Usa la consulta interna "getByThreadId" para obtener el objeto conversation
      {
        threadId: args.threadId
      }
    )

    if (!conversation) {                                                     // Si la conversación no se encuentra, lanza un error
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Conversation not found',
      });
    }

    // Añade una capa extra de seguridad: asegura que la sesión que envía el mensaje
    // es la misma que inició la conversación.
    if (conversation.contactSessionId !== contactSession._id) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Conversation not found for this session',
      });
    }

    if (conversation.status === 'resolved') {                                // Si la conversación ya está marcada como "resuelta", no se pueden añadir más mensajes
      throw new ConvexError({
        code: 'BAD_REQUEST',
        message: 'Conversation resolved',
      });
    }

    await supportAgent.generateText(                                         // 3º Invoca el agente de IA para generar una respuesta
      ctx,
      { threadId: args.threadId },
      { prompt: args.prompt }
    );
  }
})

export const getMany = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    contactSessionId: v.id('contactSessions'),
  },

  handler: async (ctx, args) => {
    // 1. Validar la sesión del usuario
    const contactSession = await ctx.db.get(args.contactSessionId);

    if (!contactSession || contactSession.expiresAt < Date.now()) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'Invalid session',
      });
    }

    // 2. Validar que el usuario tiene permiso para ver esta conversación
    const conversation = await ctx.db
      .query('conversations')
      .withIndex('by_thread_id', (q) => q.eq('threadId', args.threadId))
      .unique();

    // Si la conversación no existe o no pertenece a esta sesión, lanzamos un error.
    // Usamos NOT_FOUND para no dar pistas sobre si la conversación existe.
    if (!conversation || conversation.contactSessionId !== contactSession._id) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Conversation not found',
      });
    }

    // 3. Si la autorización es correcta, obtener los mensajes
    const paginated = await supportAgent.listMessages(ctx, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
    });

    return paginated;
  },
});