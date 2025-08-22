"use client"

import { useThreadMessages, toUIMessages } from '@convex-dev/agent/react';
import { Button } from "@workspace/ui/components/button";
import { WidgetHeader } from "../components/widget-header";
import { ArrowLeftIcon, MenuIcon } from "lucide-react";
import { useAtomValue, useSetAtom } from "jotai";
import { contactSessionIdAtomFamily, conversationIdAtom, organizationIdAtom, screenAtom } from "../../atoms/widget-atoms";
import { api } from "@workspace/backend/_generated/api";;
import { useAction, useQuery } from "convex/react";
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { Form, FormField } from '@workspace/ui/components/form';
import { AIResponse } from '../../../../../../packages/ui/src/components/ai/response';
import { useInfiniteScroll } from '@workspace/ui/hooks/use-infinite-scroll';
import { InfiniteScrollTrigger } from '@workspace/ui/components/infinite-scroll-trigger';
import { 
  AIConversation,
  AIConversationContent,
  AIConversationScrollButton,
} from "@workspace/ui/components/ai/conversation";
import {
  AIInput,
  AIInputSubmit,
  AIInputTextarea,
  AIInputToolbar,
  AIInputTools,
} from '@workspace/ui/components/ai/input';
import {
  AIMessage,
  AIMessageContent,
} from '@workspace/ui/components/ai/message';
import {
  AISuggestion,
  AISuggestions,
} from '@workspace/ui/components/ai/suggestion';


const formSchema = z.object({
  message: z.string().min(1, 'Message is required' )
});

export const WidgetChatScreen = () => {

  const setScreen = useSetAtom(screenAtom);                     // Función para actualizar el estado de la pantalla que se muestra  
  const setConversationId = useSetAtom(conversationIdAtom);     // Función para actualizar el estado del ID de la conversación

  const conversationId = useAtomValue(conversationIdAtom);      // Atom para leer el ID de la conversación
  const organizationId = useAtomValue(organizationIdAtom);      // Atom para leer el ID de la organización
  const contactSessionId = useAtomValue(                        // Atom para leer el ID de la sesión de contacto
    contactSessionIdAtomFamily(organizationId || "")
  )

  const conversation = useQuery(                                // Query para obtener la conversación
    api.public.conversations.getOne,                            // Función de consulta getOne
    conversationId && contactSessionId                          // Argumentos para la consulta.  Si no son null o undefinded
      ? {                                                       // getOne las usa
         conversationId,
         contactSessionId,
        } 
      : "skip"                                                  // Si son null o undefined no se ejecuta la consulta
  );

  const messages = useThreadMessages(                           // Query para obtener los mensajes de la conversación
    api.public.messages.getMany,                                // Función de consulta getMany
    conversation?.threadId && contactSessionId                  // Argumentos para la consulta.  Si no son null o undefinded
      ? {
        threadId: conversation.threadId,                        // getMany las usa
        contactSessionId,                       
      }
      : 'skip',
    {
      initialNumItems: 10,
    }
  );

  const {
    topElementRef,
    handleLoadMore,
    canLoadMore,
    isLoadingMore,
  } = useInfiniteScroll({                                     // useInfiniteScroll proporciona los elementos necesarios para implementar el scroll infinito
    status: messages.status,
    loadMore: messages.loadMore,
    loadSize: 10,
  })

  const onBack = () => {
    setConversationId(null);
    setScreen("selection");
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: '' },
  });

  const createMessage = useAction(api.public.messages.create);
  
  const onSubmit = async(values: z.infer<typeof formSchema>) => {
    if (!conversation || !contactSessionId) return;

    form.reset();

    await createMessage({
      threadId: conversation.threadId,
      prompt: values.message,
      contactSessionId,
    });
  }

  return (
    <>
      <WidgetHeader className="flex items-center justify-between">
        <div className="flex items-center gap-x-2">
          <Button
            onClick={onBack}
            size="icon"
            variant="transparent"
          >
            <ArrowLeftIcon  />
          </Button>
          <p>Chat</p>
        </div>

        <Button 
          size="icon"
          variant="transparent"  
        >
          <MenuIcon />
        </Button>
      </WidgetHeader>

      <AIConversation>
        <AIConversationContent>
          {/* Propociona el boton de carga más para el scroll infinito */}
          <InfiniteScrollTrigger 
            canLoadMore={canLoadMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={handleLoadMore}
            ref={topElementRef}
          />
          {toUIMessages(messages.results ?? [])?.map((message) => (
            <AIMessage
              from={message.role === 'user' ? 'user' : 'assistant'}
              key={message.id}
            >
              <AIMessageContent>
                <AIResponse>{message.content}</AIResponse>
              </AIMessageContent>
              {/* TODO: Add Avatar component */}
            </AIMessage>
          ))}
        </AIConversationContent>
      </AIConversation>
      {/* TODO: Add suggestions */}

      <Form {...form}>
        <AIInput 
          onSubmit={form.handleSubmit(onSubmit)}
          className='rounded-none border-x-0 border-b-0'
        >
          <FormField
            control={form.control}
            disabled={conversation?.status === 'resolved'}
            name="message"
            render={({ field }) => (
              <AIInputTextarea
                disabled={conversation?.status === 'resolved'}
                onChange={field.onChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();

                    form.handleSubmit(onSubmit)();
                  }
                }}
                placeholder={
                  conversation?.status === 'resolved'
                    ? 'This conversation has been resolved'
                    : 'Type your messages...'
                }
                value={field.value}
              />
            )}
          />
          
          <AIInputToolbar>
            <AIInputTools />
            <AIInputSubmit
              type="submit"
              disabled={
                conversation?.status === 'resolved' || !form.formState.isValid
              }
              status="ready"
            />
          </AIInputToolbar>
        </AIInput>
      </Form>
    </>
  )
}