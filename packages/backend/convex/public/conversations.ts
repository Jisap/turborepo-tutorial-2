import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { supportAgent } from "../system/ai/agents/supportAgent";


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
  handler: async(ctx, args) => {
    const session = await ctx.db.get(args.contactSessionId); // Al darle el arg contactSessionId get sabe que tiene que obtener el objeto contactSession asociado a ese id
    if(!session || session.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session"
      })
    }

    const { threadId } = await supportAgent.createThread(ctx,{  // Crea un hilo de conversación en el agente de soporte basado en userId que es el id de la organización
      userId: args.organizationId
    })

    const conversationId = await ctx.db.insert("conversations", { // Cada conversación se asocia con la id de la session de contacto que la inicio
      contactSessionId: session._id,
      status: "unresolved",
      organizationId: args.organizationId,
      threadId,
    });


    return conversationId;
  }
})
