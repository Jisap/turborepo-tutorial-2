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
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll"
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger"




const formSchema = z.object({
  message: z.string().min(1, "Message is required"),
})

/**
 * Componente que renderiza la vista de una conversación desde la perspectiva de un agente de soporte.
 *
 * Esta vista está diseñada para ser utilizada por un operador humano o una IA en un panel de control.
 * Muestra el historial de mensajes, permite enviar nuevas respuestas y gestionar el estado de la conversación.
 *
 * Responsabilidades clave:
 * - Cargar los detalles de la conversación y sus mensajes de forma paginada.
 * - Invertir la perspectiva de los mensajes: los del cliente ('user') se muestran a la izquierda y los del agente ('assistant') a la derecha.
 * - Permitir al agente enviar nuevos mensajes.
 * - Gestionar el ciclo de vida del estado de la conversación (sin resolver -> escalada -> resuelta).
 * - Deshabilitar interacciones cuando la conversación está resuelta.
 *
 * @param {object} props - Propiedades del componente.
 * @param {Id<'conversations'>} props.conversationId - El ID de la conversación a mostrar.
 */
export const ConversationIdView = ({ conversationId }: { conversationId: Id<'conversations'> }) => {

  const conversation = useQuery(api.private.conversations.getOne, {                         // Carga los detalles de la conversación (estado, ID del hilo, etc.).
    conversationId
  })

  
  
  const messages = useThreadMessages(                                                       // Carga los mensajes del hilo de la conversación de forma paginada.
    api.private.messages.getMany,                                                           // "skip" se usa si el threadId aún no se ha cargado para evitar una query inválida.
    conversation?.threadId ? { threadId: conversation.threadId } : "skip",
    {initialNumItems: 10}
  )

  const createMessage = useMutation(api.private.messages.create);                           // Mutación para crear un nuevo mensaje en la conversación.

  
  const form = useForm<z.infer<typeof formSchema>>({                                        // Configuración del formulario para el envío de mensajes con react-hook-form y Zod.
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: '',
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {                          // Función que se ejecuta al enviar el formulario.
    try {
      
      await createMessage({ conversationId, prompt: values.message });                      // Llama a la mutación de Convex para crear el mensaje. 
      
      form.reset();                                                                         // Resetea el campo del formulario tras el envío.
    } catch (err) {
      console.error(err);
    }
  }

  
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)                           // Estado para controlar la carga mientras se actualiza el estado de la conversación.
  
  const updateConversationStatus = useMutation(api.private.conversations.updateStatus);     // Mutación para actualizar el estado de la conversación en la base de datos.

  // Maneja el cambio de estado de la conversación en un ciclo:
  // sin resolver -> escalada -> resuelta -> sin resolver.
  const handleToggleStatus = async () => {
    if(!conversation) return

    setIsUpdatingStatus(true)

    let newStatus:  "unresolved" | "escalated" | "resolved"

    // Lógica para ciclar entre los estados.
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

  // Hook personalizado para gestionar la lógica del scroll infinito.
  // Se integra con el estado de paginación de `useThreadMessages`.
  const {
    canLoadMore,
    handleLoadMore,
    isLoadingFirstPage, // No se usa actualmente, pero está disponible.
    isLoadingMore,
    topElementRef,
  } = useInfiniteScroll({
    status: messages.status,
    loadMore: messages.loadMore,
    loadSize: 12,
    observerEnabled: true,
  })



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
          {/* Componente invisible que dispara la carga de más mensajes al ser visible en pantalla. */}
          <InfiniteScrollTrigger
            canLoadMore={canLoadMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={handleLoadMore}
            ref={topElementRef}
          />
          {/* Transforma los mensajes del formato de agente de Convex al formato de la UI. */}
          {toUIMessages(messages.results ?? [])?.map((message) => (
            <AIMessage
              // Lógica clave de inversión de roles para la UI:
              // La DB almacena roles absolutos ('user' para el cliente, 'assistant' para el agente).
              // La prop 'from' del componente de UI es relativa a quién está viendo la conversación.
              // Desde el panel del agente, invertimos los roles: los mensajes del cliente ('user')
              // se muestran a la izquierda (estilo 'assistant') y los del agente a la derecha (estilo 'user').
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