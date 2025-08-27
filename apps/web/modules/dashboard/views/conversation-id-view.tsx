"use client"

import { api } from "@workspace/backend/_generated/api"
import { Id } from "@workspace/backend/_generated/dataModel"
import { Button } from "@workspace/ui/components/button"
import { useMutation, useQuery } from "convex/react"
import { MoreHorizontalIcon, Wand2Icon } from "lucide-react"
import {
  AIConversation,
  AIConversationContent,
  AIConversationScrollButton,
} from '@workspace/ui/components/ai/conversation'
import {
  AIInput,
  AIInputButton,
  AIInputSubmit,
  AIInputTextarea,
  AIInputToolbar,
  AIInputTools,
} from '@workspace/ui/components/ai/input'
import {
  AIMessage,
  AIMessageContent,
} from '@workspace/ui/components/ai/message'
import { Form, FormField } from '@workspace/ui/components/form'
import z from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from '@hookform/resolvers/zod'
import { toUIMessages, useThreadMessages } from '@convex-dev/agent/react';
import { AIResponse } from '@workspace/ui/components/ai/response';
import { DicebearAvatar } from "@workspace/ui/components/dicebear-avatar"
import { ConversationStatusButton } from "../ui/components/conversation-status-button"
import { useState } from "react"


const formSchema = z.object({
  message: z.string().min(1, "Message is required"),
})

export const ConversationIdView = ({ conversationId }: { conversationId: Id<'conversations'> }) => {

  const conversation = useQuery(api.private.conversations.getOne, {
    conversationId
  })

  const messages = useThreadMessages(
    api.private.messages.getMany,
    conversation?.threadId ? { threadId: conversation.threadId } : "skip",
    {initialNumItems: 10}
  )

  const createMessage = useMutation(api.private.messages.create);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: '',
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await createMessage({ conversationId, prompt: values.message });

      form.reset();
    } catch (err) {
      console.error(err);
    }
  }

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const updateConversationStatus = useMutation(api.private.conversations.updateStatus);
  const handleToggleStatus = async () => {
    if(!conversation) return

    setIsUpdatingStatus(true)

    let newStatus:  "unresolved" | "escalated" | "resolved"

    // Cycle states: unresolved -> escalated -> resolved -> unresolved
    if(conversation.status === 'unresolved') {
      newStatus = "escalated"
    }else if (conversation.status === 'escalated') {
      newStatus = "resolved"
    }else{
      newStatus = "unresolved"
    }

    try {
      await updateConversationStatus({
        conversationId,
        status: newStatus
      })
    }catch(error){
      console.error("Error updating conversation status", error)
    }finally{
      setIsUpdatingStatus(false)
    }
  }


  return (
    <div className="flex h-full flex-col bg-muted">
      <header className="flex items-center justify-between border-b bg-background p-2.5">
        <Button size="sm" variant="ghost">
          <MoreHorizontalIcon />
        </Button>

        {!!conversation && (
          <ConversationStatusButton 
            onClick={handleToggleStatus}
            status={conversation.status}
            disabled={isUpdatingStatus}
          />
        )}
      </header>
     
      <AIConversation className="max-h-[calc(100vh-180px)]">
        <AIConversationContent>
          {toUIMessages(messages.results ?? [])?.map((message) => (
            <AIMessage
              // La base de datos almacena los roles de forma absoluta ('user' para el cliente, 'assistant' para el agente).
              // La prop 'from' del componente de UI es relativa a quién está viendo la conversación.
              // Como estamos en el panel del agente, invertimos los roles para que los mensajes del cliente ('user')
              // aparezcan como si vinieran del 'assistant' (a la izquierda) y viceversa.
              from={message.role === "user" ? "assistant" : "user"}
              key={message.id}
            >
              <AIMessageContent>
                <AIResponse>
                  {message.content}
                </AIResponse>
              </AIMessageContent>

              {message.role === "user" && (
                <DicebearAvatar 
                  seed={conversation?.contactSession._id ?? "user"}
                  size={32}
                />
              )}

            </AIMessage>
          ))}
        </AIConversationContent>

        <AIConversationScrollButton />

      </AIConversation>

      <div className="p-2">
        <Form {...form}>
          <AIInput onSubmit={form.handleSubmit(onSubmit)}>
            <FormField 
              control={form.control}
              disabled={conversation?.status === "resolved"}
              name="message"
              render={({ field }) => (
                <AIInputTextarea 
                  disabled={
                    conversation?.status === 'resolved' ||
                    form.formState.isSubmitting 
                    // TODO: or if enhancing prompt
                  }
                  onChange={field.onChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      form.handleSubmit(onSubmit)()
                    }
                  }}
                  placeholder={
                    conversation?.status === 'resolved'
                      ? 'This conversation has been resolved'
                      : 'Type your response as an operator...'
                  }
                  value={field.value}
                />
              )}
            />

            <AIInputToolbar>
              <AIInputTools>
                <AIInputButton
                  disabled={conversation?.status === 'resolved'}
                >
                  <Wand2Icon /> 
                  Enhance
                </AIInputButton>
              </AIInputTools>  

              <AIInputSubmit 
                disabled={
                  conversation?.status === 'resolved' ||
                  !form.formState.isValid ||
                  form.formState.isSubmitting 
                  // TODO: or if enhancing prompt
                }
                status="ready"
                type="submit"
              />
            </AIInputToolbar>
          </AIInput>
        </Form>

      </div>

    </div>
  )
}