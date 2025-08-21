import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

// consulta interna diseñada para encontrar y devolver un único documento de la tabla conversations basándose en un threadId específico.

export const getByThreadId = internalQuery({
  args: {
    threadId: v.string(),
  },
  handler: async(ctx, args) => {
   
    const conversation = await ctx.db
      .query("conversations")                                              // Busca en la tabla "conversations" usando el índice "by_thread_id" para un rendimiento óptimo.
      .withIndex("by_thread_id", (q) => q.eq("threadId", args.threadId))   // El índice permite encontrar rápidamente la conversación por su `threadId` sin escanear toda la tabla.
      .unique();                                                           // .unique() devuelve el único documento que coincide o null si no se encuentra ninguno.
                                                                           // Lanza un error si se encuentran múltiples documentos, garantizando la unicidad.
      return conversation;
  }
})