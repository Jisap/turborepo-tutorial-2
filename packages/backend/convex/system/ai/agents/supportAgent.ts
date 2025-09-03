import { Agent } from "@convex-dev/agent";
import { components } from "../../../_generated/api";
import { google } from '@ai-sdk/google';
import { SUPPORT_AGENT_PROMPT } from "../constant";



export const supportAgent = new Agent(components.agent , {
  chat: google.chat('gemini-2.5-pro'),
  instructions: SUPPORT_AGENT_PROMPT,
});