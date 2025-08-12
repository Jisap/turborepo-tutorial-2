import Vapi from "@vapi-ai/web";
import { useEffect, useState } from "react";


interface TranscriptMessage {                                              // Define la estructura de un mensaje en la transcripción.
  role: "user" | "assistant";                                              // Quién dijo el mensaje.
  text: string;                                                            // El contenido del mensaje.
}


export const useVapi = () => {                                             // Hook personalizado para gestionar la lógica de Vapi.
  
  const [vapi, setVapi] = useState<Vapi | null>(null);                     // Estado para almacenar la instancia del cliente de Vapi. 
  const [isConnected, setIsConnected] = useState(false);                   // Estado para saber si la llamada está activa. 
  const [isConnecting, setIsConnecting] = useState(false);                 // Estado para mostrar un indicador mientras se establece la llamada.
  const [isSpeaking, setIsSpeaking] = useState(false);                     // Estado para saber si el usuario o el asistente están hablando.
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);   // Estado para almacenar la transcripción de la conversación.

  useEffect(() => {
    // Crea una nueva instancia de Vapi con una clave de API (para pruebas).
    // En un entorno real, esta clave debería venir de una variable de entorno.
    // Only for testing the vapi API, otherwise customers will provide their own API keys
    const vapiInstance = new Vapi("***** ***** ***** ***** *****");
    setVapi(vapiInstance);

    // --- SUSCRIPCIÓN A EVENTOS DE VAPI ---

    vapiInstance.on("call-start", () => {                                  // Se dispara cuando la llamada comienza.
      setIsConnected(true);
      setIsConnecting(false);
      setTranscript([]); // Limpia la transcripción anterior.
    });

    vapiInstance.on("call-end", () => {                                    // Se dispara cuando la llamada termina.
      setIsConnected(false);
      setIsConnecting(false);
      setIsSpeaking(false);
    });

    vapiInstance.on("speech-start", () => {                                // Se dispara cuando alguien empieza a hablar.
      setIsSpeaking(true);
    });

    vapiInstance.on("speech-end", () => {                                  // Se dispara cuando alguien deja de hablar.
      setIsSpeaking(false);
    });

    vapiInstance.on("error", (error) => {                                  // Se dispara si ocurre un error.
      console.log("VAPI_ERROR", error);
      setIsConnecting(false); // Detiene el estado de "conectando".
    });

    vapiInstance.on("message", (message) => {                              // Se dispara cuando se recibe un mensaje (ej. transcripción).    
      if (message.type === "transcript" &&                                 // Filtra solo los mensajes de transcripción final para evitar textos parciales.
        message.transcriptType === "final"
      ) { 
        
        setTranscript((prev) => [                                          // Añade el nuevo mensaje a la transcripción.
          ...prev,
          {
            role: message.role === "user" ? "user" : "assistant",
            text: message.transcript,
          },
        ]);
      }
    });

    
    return () => {                                                          // Función de limpieza: se ejecuta cuando el componente se desmonta.
      vapiInstance?.stop();                                                 // Detiene la llamada para liberar recursos.
    };
  }, []); 

  
  const startCall = () => {                                                 // Función para iniciar la llamada.
    setIsConnecting(true);
    if (vapi) {
      // Inicia la llamada con un ID de asistente (para pruebas).
      // En un entorno real, este ID debería ser un parámetro.
      vapi?.start("***** ***** ***** ***** *****");
    }
  };

  // Función para terminar la llamada.
  const endCall = () => {
    if (vapi) {
      vapi?.stop();
    }
  };

  // Devuelve el estado y las funciones para que el componente los use.
  return {
    isSpeaking,
    isConnecting,
    isConnected,
    transcript,
    startCall,
    endCall,
  };
};
