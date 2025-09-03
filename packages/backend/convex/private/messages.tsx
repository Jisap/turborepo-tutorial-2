import { ConvexError, v } from "convex/values";
import { action, mutation, query } from "../_generated/server";
import { components, internal } from "../_generated/api";
import { supportAgent } from "../system/ai/agents/supportAgent";
import { paginationOptsValidator } from "convex/server";
import { saveMessage } from "@convex-dev/agent";
import { generateText } from 'ai';
import { google } from "@ai-sdk/google";
import { SUPPORT_AGENT_PROMPT } from "../system/ai/constant";



/**
 * enhanceResponse mejora la respuesta de un agente de soporte humano utilizando IA.
 *
 * Esta acción no envía un mensaje al cliente final. En su lugar, actúa como un
 * "asistente para el asistente": toma un borrador de texto escrito por el operador,
 * lo envía a un modelo de IA (Gemini) para que lo reformule de manera más profesional,
 * y devuelve la versión mejorada al panel del operador para que este decida si usarla.
 */

/**
 * Resumen del Flujo de Trabajo
 * 1º Un cliente escribe en el widget expecificando que quiere un operador humano.
 * 2º status = escalated
 * 3º A ti (operador) te aparece una nueva conversación en el panel.
 * 4º Abres la conversación. Lees el mensaje del cliente.
 * 5º Escribes una respuesta.
 * 6º (Opcional) Usas la IA (Gemini) para que te ayude a reformular tu respuesta y hacerla más profesional.
 * 7º Envías la respuesta final al cliente.
 */
export const enhanceResponse = action({
  args: {
    // 1. Recibe el mensaje del agente como argumento
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    // 2. Verifica que el usuario esté autenticado y pertenezca a una organización
    const identity = await ctx.auth.getUserIdentity();

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

    // 3. Llama al modelo de IA de Google (Gemini) para mejorar el texto
    const response = await generateText({
      model: google.chat('gemini-1.5-flash'),
      messages: [
        {
          // 3a. Se le da una instrucción al sistema para que sepa cuál es su rol
          role: "system",
          content: SUPPORT_AGENT_PROMPT,
        },
        {
          // 3b. Se le pasa el mensaje del agente para que lo procese
          role: "user",
          content: args.prompt,
        },
      ],
    });

    // 4. Devuelve el texto mejorado por la IA
    return response.text;
  },
})

// Endpoints para la conversación de un agente de soporte humano desde el dashboard.

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

    // 5. Si la conversación está en estado "unresolved", cambiar el estado a "escalated" porque el agente de soporte humano está respondiendo
    if(conversation.status === 'unresolved'){
      await ctx.db.patch(args.conversationId, {
        status: 'escalated'
      })
    }

    // 6. Si todas las validaciones son correctas, guardar el nuevo mensaje del asistente
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