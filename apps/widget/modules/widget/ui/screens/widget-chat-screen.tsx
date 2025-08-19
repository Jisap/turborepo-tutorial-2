"use client"

import { Button } from "@workspace/ui/components/button";
import { WidgetHeader } from "../components/widget-header";
import { ArrowLeftIcon, MenuIcon } from "lucide-react";
import { useAtomValue, useSetAtom } from "jotai";
import { contactSessionIdAtomFamily, conversationIdAtom, organizationIdAtom, screenAtom } from "../../atoms/widget-atoms";
import { api } from "@workspace/backend/_generated/api";
import { use } from "react";
import { useQuery } from "convex/react";

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

  const onBack = () => {
    setConversationId(null);
    setScreen("selection");
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

      <div className="flex flex-1 flex-col gap-y-4 p-4">
        <p className="text-sm">
          {JSON.stringify(conversation)}
        </p>
      </div>
    </>
  )
}