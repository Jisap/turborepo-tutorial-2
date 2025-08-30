import { createTool } from '@convex-dev/agent'
import z from 'zod'
import { internal } from '../../../_generated/api'
import { supportAgent } from '../agents/supportAgent';

/**
 * Una herramienta para escalar conversaciones a un agente humano.
 *
 * Esta herramienta marca una conversación como que necesita intervención humana y notifica a los canales apropiados.
 * Requiere un ID de hilo válido en el contexto.
 *
 * @throws Devolverá un mensaje de error si no se proporciona un ID de hilo en el contexto.
 * @returns Un mensaje de confirmación indicando que la conversación ha sido escalada.
 */

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

