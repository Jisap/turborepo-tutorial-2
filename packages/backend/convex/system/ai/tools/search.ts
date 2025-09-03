
import { createTool } from "@convex-dev/agent";
import z from "zod";
import { internal } from "../../../_generated/api";
import rag from "../rag";
import { generateText } from "ai";
import { supportAgent } from "../agents/supportAgent";

import { google } from "@ai-sdk/google";
import { SEARCH_INTERPRETER_PROMPT } from "../constant";

/**
 * Define una herramienta de búsqueda para el agente de IA.
 * Esta herramienta busca en la base de conocimientos (knowledge base) para encontrar
 * información relevante y luego utiliza un LLM para generar una respuesta
 * basada en los resultados de la búsqueda.
 */
export const search = createTool({
  description:
    "Search the knowledge base for relevant information to help answer user questions",
  args: z.object({
    query: z.string().describe("The search query to find relevant information"),
  }) as any,
  handler: async (ctx: any, args) => {                                                         // El manejador (handler) es la función que se ejecuta cuando el agente decide usar esta herramienta.
    
    if (!ctx.threadId) {                                                                       // Comprueba que se proporcione un ID de hilo en el contexto.
      return "Missing thread ID";
    }

    const conversation = await ctx.runQuery(                                                   // Obtiene la conversación actual usando el ID del hilo para obtener el contexto necesario. 
      internal.system.conversations.getByThreadId,
      {
        threadId: ctx.threadId,
      }
    );

    if (!conversation) {
      return "Conversation not found";
    }

    const orgId = conversation.organizationId;                                                 // Usa el ID de la organización para asegurar que la búsqueda se realice en el namespace correcto.

    
    const searchResult = await rag.search(ctx, {                                               // Realiza la búsqueda RAG (Retrieval-Augmented Generation) en la base de conocimientos.
      namespace: orgId,
      query: args.query,
      limit: 5,
    });

    const contextText = `Found results in ${searchResult.entries                               // Obtiene los resultados de la búsqueda y los convierte en una cadena de texto.
      .map(e => e.title || null)
      .filter(t => t !== null)
      .join(", ")}. Here is the context:\n\n${searchResult.text}`;

    
    const response = await generateText({                                                      // Utiliza un LLM para interpretar los resultados de la búsqueda y generar una respuesta natural.
      model: google.chat("gemini-2.5-flash"),                                                  // Esto evita mostrar al usuario los datos en bruto y ofrece una respuesta más conversacional.
      messages: [
        {
          role: "system",
          content: SEARCH_INTERPRETER_PROMPT,
        },

        {
          role: "user",
          content: `User asked: "${args.query}\n\nSearch results: ${contextText}"`,
        },
      ],
    });

    
    await supportAgent.saveMessage(ctx, {                                                      // Guarda la respuesta generada por la IA en el historial de la conversación.
      threadId: ctx.threadId,
      message: {
        role: "assistant",
        content: response.text,
      },
    });

    
    return response.text;                                                                      // Devuelve el texto de la respuesta para que el agente lo comunique al usuario.
  },
});