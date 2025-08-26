import { ConvexError, v } from "convex/values";
import { action, mutation, query } from "../_generated/server";
import { components, internal } from "../_generated/api";
import { supportAgent } from "../system/ai/agents/supportAgent";
import { Id } from "../_generated/dataModel";
import { paginationOptsValidator } from "convex/server";
import { saveMessage } from "@convex-dev/agent";



export const create = mutation({
  args: {
    prompt: v.string(),
    conversationId: v.id('conversations'),
  },
  handler: async (ctx, args) => {
    // 1. Validar la identity del usuario
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'Identity not found',
      })
    }

    // 2. Validar que el usuario pertenece a una organización
    const orgId = identity.orgId as string

    if (!orgId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'Organization not found',
      })
    }

    // 3. Obtener la conversación y validar que existe y pertenece a la organización del usuario
    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Conversation not found',
      })
    }

    // Se comprueba que la conversación pertenezca a la organización del usuario
    if (conversation.organizationId !== orgId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'Invalid Organization ID',
      })
    }

    // 4. Validar que la conversación no esté resuelta
    if (conversation.status === 'resolved') {
      throw new ConvexError({
        code: 'BAD_REQUEST',
        message: 'Conversation resolved',
      })
    }

    // 5. Si todas las validaciones son correctas, guardar el nuevo mensaje del asistente
    await saveMessage(ctx, components.agent, {
      threadId: conversation.threadId,
      agentName: identity.familyName,
      message: {
        role: 'assistant',
        content: args.prompt,
      },
    })
  },
})

export const getMany = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
  },

  handler: async (ctx, args) => {
    // 1. Validar la identity del usuario
    const identity = await ctx.auth.getUserIdentity()
    if (identity === null) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'Identity not found',
      })
    }

    // 2. Validar que el usuario tiene pertenece a una organización
    const orgId = identity.orgId as string
    if (!orgId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'Organization not found',
      })
    }

    // 3º Obtenemos la conversación y se valida
    // Obtenemos la conversación en base al threadId de los argumentos
    // Se utiliza el índice de búsqueda "by_thread_id" para obtener la conversación
    const conversation = await ctx.db
      .query('conversations')
      .withIndex('by_thread_id', (q) => q.eq('threadId', args.threadId))
      .unique()

    if (!conversation) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Conversation not found',
      })
    }

    if (conversation.organizationId !== orgId) { // Si la organizationId según el threadId no coinde con la del usuario logueado -> error
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'Invalid Organization ID',
      })
    }

    // 4. Si las validaciones son correctas, obtener los mensajes del agente de IA
    const paginated = await supportAgent.listMessages(ctx, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
    })

    return paginated

  },
});