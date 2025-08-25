"use client"

import { Id } from "@workspace/backend/_generated/dataModel"

export const ConversationIdView = ({ conversationId }: { conversationId: Id<'conversations'> }) => {
  return (
    <div>
      Client view
    </div>
  )
}