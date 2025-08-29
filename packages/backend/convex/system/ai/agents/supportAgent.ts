

import { Agent } from "@convex-dev/agent";
import { components } from "../../../_generated/api";
import { google } from '@ai-sdk/google';


// export const supportAgent = new Agent(components.agent, {
//   name: "customer-support-agent",
//   languageModel: google("gemini-1.5-flash-latest"),
//   instructions: "You are a customer support agent",
//   chat: google.chat("gemini-1.5-flash-latest")
// });


export const supportAgent = new Agent(components.agent , {
  chat: google.chat('gemini-2.5-pro'),
  instructions: `You are a customer support agent. Use "resolveConversation" tool when user expresses finalization of the conversation. Use "escalateConversation" tool
	when user expresses frustration, or request a human explicitly`,
});