"use client"

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { contactSessionIdAtomFamily, conversationIdAtom, errorMessageAtom, organizationIdAtom, screenAtom } from "../../atoms/widget-atoms";
import { WidgetHeader } from "../components/widget-header";
import { Button } from "@workspace/ui/components/button";
import { MessageSquareTextIcon } from "lucide-react";
import { create } from '../../../../../../packages/backend/convex/public/conversations';
import { api } from "@workspace/backend/_generated/api";
import { useMutation } from "convex/react";
import { useState } from "react";

export const WidgetSelectionScreen = () => {
  
  const setScreen = useSetAtom(screenAtom);                  // Función para actualizar el estado de la pantalla que se muestra
  const setErrorMessage = useSetAtom(errorMessageAtom);      // Función para actualizar el estado del mensaje de error
  const setConversationId = useSetAtom(conversationIdAtom);  // Función para actualizar el estado del ID de la conversación

  const organizationId = useAtomValue(organizationIdAtom);   // Atom para leer el ID de la organización
  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || "")
  );

  const createConversation = useMutation(api.public.conversations.create);
  const [isPending, setIsPending] = useState(false);

  const handleNewConversation = async() => {
    
    
    if(!organizationId){
      setScreen("error");
      setErrorMessage("Missing organization ID");
      return;
    }
    
    if(!contactSessionId){
      setScreen("auth");
      return;
    }

    setIsPending(true);

    try {
      const conversationId = await createConversation({
        organizationId,
        contactSessionId,
      });

      setConversationId(conversationId);
      setScreen("chat");

    } catch {
      setScreen("auth");
    } finally {
      setIsPending(false);
    }

  }


  return (
    <>
      <WidgetHeader>
        <div className="flex flex-col justify-between gap-y-2 px-2 py-6 font-semibold">
          <p className="text-3xl">
            Hi there!
          </p>
          <p className="text-lg">
            Let&apos;s get you started
          </p>
        </div>
      </WidgetHeader>

      <div className="flex flex-1 flex-col items-center gap-y-4 p-4 overflow-y-auto">
        <Button
          className="h-16 w-full justify-between"
          variant="outline"
          onClick={handleNewConversation}
          disabled={isPending}
        >
          <div className="flex items-center gap-x-2">
            <MessageSquareTextIcon className="size-4"/>
            <span>Start chat</span>
          </div>
        </Button>
      </div>
    </>
  )
}