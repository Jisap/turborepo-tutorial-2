import { createTool } from '@convex-dev/agent'
import z from 'zod'
import { internal } from '../../../_generated/api'
import { supportAgent } from '../agents/supportAgent';


export const escalateConversation = createTool({
  description: 'Escalate a conversation',
  args: z.object({}) as any,
  handler: async (ctx: any) => {
    if (!ctx.threadId) {
      return 'Missing thread Id'
    }

    await ctx.runMutation(internal.system.conversations.escalate, {
      threadId: ctx.threadId,
    })

    await supportAgent.saveMessage(ctx, {
      threadId: ctx.threadId,
      message: {
        role: 'assistant',
        content: 'Conversation escalated to a human operator.',
      },
    })

    return 'Conversation escalated to a human operator'
  },
})

