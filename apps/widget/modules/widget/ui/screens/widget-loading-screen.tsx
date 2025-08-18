"use client"

import { useAtomValue, useSetAtom } from "jotai";
import { LoaderIcon } from "lucide-react";
import { errorMessageAtom, loadignMessageAtom, organizationIdAtom, screenAtom } from "../../atoms/widget-atoms";
import { WidgetHeader } from "../components/widget-header";
import { useEffect, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";

type InitStep = "storage" | "org" | "session" | "settings" | "vapi" | "done";

export const WidgetLoadingScreen = ({ organizationId }:{ organizationId: string | null }) => {
  
  const [step, setStep] = useState<InitStep>("org");
  const [sessionValid, setSessionValid] = useState<boolean>(false);

  const loadingMessage = useAtomValue(loadignMessageAtom);    // Estado del mensaje de carga
  const setLoadingMessage = useSetAtom(loadignMessageAtom);   // Función para actualizar el estado del mensaje de carga
  const setErrorMessage = useSetAtom(errorMessageAtom);       // Función para actualizar el estado del mensaje de error
  const setScreen = useSetAtom(screenAtom);                   // Función para actualizar el estado de la pantalla que se muestra
  const setOrganizationId = useSetAtom(organizationIdAtom);   // Función para actualizar el estado de la ID de la organización

  // Step 1: Verificamos si el estado de la organización es correcto
  const validateOrganization = useAction(api.public.organizations.validate); // Usamos la action de validación de la organización para verificar si la organización existe

  useEffect(() => {
    if(step !== "org"){
      return
    }

    setLoadingMessage("loading organization...");

    if(!organizationId) {
      setErrorMessage("Organization ID is required");
      setScreen("error")
      return
    }

    setLoadingMessage("validating organization...");

    validateOrganization({ organizationId })
      .then((result) => {
        if(result.valid){
          setOrganizationId(organizationId);
          setStep("session");
        }else{
          setErrorMessage(result.reason || "Invalid configuration");
          setScreen("error");
        }
      })
      .catch(() => {
        setErrorMessage("Unable to validate organization");
        setScreen("error");
      })
  },[
    step, 
    organizationId, 
    setErrorMessage, 
    setScreen, 
    setStep, 
    validateOrganization, 
    setLoadingMessage
  ]);

  // step 2: Validate Session (if exists)
  const validateSession = useMutation(api.public.contactSessions.validate);
  useEffect(() => {
    if(step !== "session"){
      return
    }
  },[])

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

      <div className="flex flex-1 flex-col items-center justify-center gap-y-4 p-4 text-muted-foreground">
        <LoaderIcon className="animate-spin" />
        <p className="text-sm">
          {loadingMessage || "Loading..."}
        </p>
      </div>
    </>
  )
}