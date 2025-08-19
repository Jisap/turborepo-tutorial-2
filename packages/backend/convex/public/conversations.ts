import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";


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

    const threadId = "123" // TODO: Replace with a real threadId

    const conversationId = await ctx.db.insert("conversations", {
      contactSessionId: session._id,
      status: "unresolved",
      organizationId: args.organizationId,
      threadId,
    });


    return conversationId;
  }
})
