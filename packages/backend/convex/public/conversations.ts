import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { supportAgent } from "../system/ai/agents/supportAgent";
import { MessageDoc, saveMessage } from "@convex-dev/agent";
import { components } from "../_generated/api";
import { paginationOptsValidator } from "convex/server";


export const getMany = query({
  args: {
    contactSessionId: v.id('contactSessions'),
    paginationOpts: paginationOptsValidator,
  },

  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.contactSessionId);           // Obtenemos la sesión del usuario -> validación de sesión

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'Invalid session',
      });
    }

    const conversations = await ctx.db                                   // Obtenemos las conversaciones que tiene el usuario
      .query('conversations')
      .withIndex('by_contact_session_id', (q) =>
        q.eq('contactSessionId', args.contactSessionId)
      )
      .order('desc')
      .paginate(args.paginationOpts);

    const conversationsWithLastMessage = await Promise.all(              // El proposito es tomar una lista paginada de conversaciones y enriquecerlas con la información de su último mensaje
      conversations.page.map(async (conversation) => {                   // Por cada conversación
        let lastMessage: MessageDoc | null = null;                       // Se inicializa el último mensaje como null	

        const message = await supportAgent.listMessages(ctx, {           // Llamamos a listMessages del agente de soporte                
          threadId: conversation.threadId,                               // para que busque en hilo (thread) de la convesación actual
          paginationOpts: {
            cursor: null,
            numItems: 1,                                                 // Solo obtenemos un mensaje. Como la lista esta ordenada de forma decendente el mensaje será el último
          },
        });

        if (message.page.length > 0) lastMessage = message.page[0] ?? null; // Si se encontró un mensaje se asigna a lasMessage

        return {
          _id: conversation._id,
          _creationTime: conversation._creationTime,
          contactSessionId: conversation.contactSessionId,
          organizationId: conversation.organizationId,
          status: conversation.status,
          threadId: conversation.threadId,
          lastMessage,
        };
      })
    );

    return {
      ...conversations,
      page: conversationsWithLastMessage,
    };
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

    
    await saveMessage(ctx, components.agent, {                   // Guarda el mensaje de bienvenida inicial del asistente en el nuevo hilo.
      threadId,
      message: {
        role: 'assistant',
        content: 'Hello, how can I help you today?',
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
