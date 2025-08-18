"use client"

import { useAtomValue, useSetAtom } from "jotai";
import { LoaderIcon } from "lucide-react";
import { contactSessionIdAtomFamily, errorMessageAtom, loadignMessageAtom, organizationIdAtom, screenAtom } from "../../atoms/widget-atoms";
import { WidgetHeader } from "../components/widget-header";
import { useEffect, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";


type InitStep = "storage" | "org" | "session" | "settings" | "vapi" | "done";

/**
 * WidgetLoadingScreen component.
 * Actúa como una pantalla de carga y validación inicial para el widget.
 * Orquesta un proceso de validación de varios pasos para asegurar que la organización es válida
 * y para verificar si existe una sesión de usuario antes de decidir qué pantalla principal mostrar.
 * Este componente muestra un ícono de carga y mensajes de estado al usuario durante este proceso.
 *
 * @param {object} props - Las props del componente.
 * @param {string | null} props.organizationId - El ID de la organización, pasado a través de los parámetros de búsqueda (search params).
 */
export const WidgetLoadingScreen = ({ organizationId }:{ organizationId: string | null }) => {
  
  
  const [step, setStep] = useState<InitStep>("org");                // Estado interno para gestionar el paso actual del flujo de inicialización.
  
  const [sessionValid, setSessionValid] = useState<boolean>(false); // Estado interno para rastrear si la sesión de contacto existente es válida.

  const loadingMessage = useAtomValue(loadignMessageAtom);          // Estado del mensaje de carga
  const setLoadingMessage = useSetAtom(loadignMessageAtom);         // Función para actualizar el estado del mensaje de carga
  const setErrorMessage = useSetAtom(errorMessageAtom);             // Función para actualizar el estado del mensaje de error
  const setScreen = useSetAtom(screenAtom);                         // Función para actualizar el estado de la pantalla que se muestra
  const setOrganizationId = useSetAtom(organizationIdAtom);         // Función para actualizar el estado de la ID de la organización

  // Recupera el ID de la sesión de contacto desde el almacenamiento, específico para la organización actual.
  const contactSessionId = useAtomValue(contactSessionIdAtomFamily(organizationId || ""));

  // --- Hooks del Backend de Convex ---
  // Acción de Convex para validar el ID de la organización contra el backend.
  const validateOrganization = useAction(api.public.organizations.validate);

  // Paso 1: Validar el ID de la Organización.
  // Este efecto se ejecuta cuando el componente se monta y el paso es "org".
  useEffect(() => {                                            
    if(step !== "org"){
      return
    }

    
    setLoadingMessage("Finding organization ID...");                 // Mensaje inicial mientras verificamos el ID.

    
    if (!organizationId) {                                           // Verificación crítica: si no se proporciona organizationId, muestra un error.
      setErrorMessage("Organization ID is required");
      setScreen("error")
      return
    }

    
    setLoadingMessage("validating organization...");                 // Actualiza el mensaje y llama al backend para validar.
    validateOrganization({ organizationId })
      .then((result) => {
        if(result.valid){
          // Si tiene éxito, almacena el ID globalmente y avanza al siguiente paso.
          setOrganizationId(organizationId);
          setStep("session");
        }else{
          // Si la validación falla, muestra el motivo y cambia a la pantalla de error.
          setErrorMessage(result.reason || "Invalid configuration");
          setScreen("error");
        }
      })
      .catch(() => {
        // Maneja errores de red u otros errores inesperados.
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

  // Mutación de Convex para validar un ID de sesión de contacto existente contra el backend.
  const validateContactSession = useMutation(api.public.contactSessions.validate);

  // Paso 2: Validar la Sesión de Contacto (si existe una).
  // Este efecto se ejecuta una vez que la organización ha sido validada y el paso es "session".
  useEffect(() => {
    if(step !== "session"){
      return
    }

    setLoadingMessage("Finding contact session ID...");

    // Si no se encuentra un ID de sesión en el almacenamiento para esta organización, es un usuario nuevo.
    // Marca la sesión como no válida y salta al paso final.
    if(!contactSessionId) {
      setSessionValid(false);
      setStep("done")
      return
    };

    // Si existe un ID de sesión, lo valida con el backend.
    setLoadingMessage("Validating session...");
    validateContactSession({ contactSessionId })
      .then((result) => {
        // Almacena el resultado de la validación y avanza al paso final.
        setSessionValid(result.valid);
        setStep("done");
      
      })
      .catch(() => {
        // En caso de error, asume que la sesión no es válida y avanza.
        setSessionValid(false)
        setStep("done");
      })
  },[
    step,
    contactSessionId,
    setSessionValid,
    setStep,
    validateContactSession,
    setLoadingMessage,
  ]);

  // Paso 3: Decisión Final.
  // Este efecto se ejecuta cuando todas las validaciones están completas y el paso es "done".
  useEffect(() => {
    if(step !== "done"){
      return
    }

    // Determina si hay una sesión válida (convex confirmo ese id) 
    // y activa (se encontro un id de session en el navegador).
    const hasValidSession = contactSessionId && sessionValid;
    // Establece la pantalla final basándose en el estado de la sesión.
    // 'selection' para usuarios existentes, 'auth' para usuarios nuevos.
    setScreen(hasValidSession ? "selection" : "auth");
  },[step, contactSessionId, sessionValid, setScreen]);

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