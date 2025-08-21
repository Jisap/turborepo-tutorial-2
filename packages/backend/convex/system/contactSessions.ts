import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

// Una internalQuery es un tipo de función de Convex que, a diferencia de una query normal, no puede ser llamada desde el cliente
// Solo puede ser invocada desde otras funciones del backend de Convex, como mutations, actions o internalMutations.

export const getOne = internalQuery({ // Obtiene los datos de una contactSession por su ID
  args: {
    contactSessionId: v.id("contactSessions"),
  },
  handler: async(ctx, args) =>  {
    return await ctx.db.get(args.contactSessionId); //
  }
})