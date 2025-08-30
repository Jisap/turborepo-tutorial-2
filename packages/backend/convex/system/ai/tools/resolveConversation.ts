import { createTool, type ToolCtx } from '@convex-dev/agent';
import { z } from 'zod';
import { internal } from '../../../_generated/api';
import { supportAgent } from '../agents/supportAgent';


// Solución: Error "Type instantiation is excessively deep and possibly infinite"
// El error ocurre debido a la complejidad de la inferencia de tipos cuando TypeScript intenta resolver los tipos genéricos anidados entre:
// - Los tipos genéricos de createTool
// - Los tipos complejos generados por Zod
// - Los tipos del contexto de Convex
// Esta combinación crea una estructura de tipos recursiva que excede los límites de inferencia de TypeScript.
// Solución Implementada:
// - Se utilizó una combinación de:
// - Interfaz TypeScript explícita para los argumentos
// - Aserción de tipo as any para el esquema de validación
// - Tipado explícito en el handler

/**
 * Una herramienta para resolver conversaciones por su ID de hilo.
 *
 * Esta herramienta marca una conversación como resuelta en el sistema y guarda un mensaje de confirmación
 * en el hilo. Requiere un ID de hilo válido en el contexto para funcionar.
 *
 * @throws Devolverá un mensaje de error si no se proporciona un ID de hilo en el contexto.
 * @returns Un mensaje de éxito indicando que la conversación ha sido resuelta.
 */

export const resolveConversation = createTool({
  description: "Resolve a conversation",
  args: z.object({}) as any,
  handler: async (ctx: any) => {
    if (!ctx.threadId) {
      return 'Missing thread Id';
    }

    await ctx.runMutation(internal.system.conversations.resolve, {
      threadId: ctx.threadId,
    });

    await supportAgent.saveMessage(ctx, {
      threadId: ctx.threadId,
      message: {
        role: 'assistant',
        content: 'Conversation resolved.',
      },
    });

    return 'Conversation resolved';
  },
});