import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { createClerkClient } from "@clerk/backend"


const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY || "",
})


export const validate = mutation({
  args: {
    organizationId: v.string()
  },
  handler: async(ctx, args) => {
    try {
      await clerkClient.organizations.getOrganization({ // Verificamos si la organización esta definida en Clerk
        organizationId: args.organizationId,
      });

      return { valid: true };
    } catch  {
      return { valid: false, reason: "Organization not found" };
    }
  }
});