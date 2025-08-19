"use client"

// import { WidgetFooter } from "../components/widget-footer";
// import { WidgetHeader } from "../components/widget-header";
import { useAtomValue } from "jotai";                      // Hook para leer el estado
import { screenAtom } from "../../atoms/widget-atoms";     // Importamos el atom de estado de las pantallas
import { WidgetAuthScreen } from "../screens/widget-auth-screen";
import { WidgetErrorScreen } from "../screens/widget-error-screen";
import { WidgetLoadingScreen } from "../screens/widget-loading-screen";
import { WidgetSelectionScreen } from "../screens/widget-selection-screen";
import { WidgetChatScreen } from "../screens/widget-chat-screen";



interface Props {
  organizationId: string | null;
}

export const WidgetView = ({ organizationId }: Props) => {

  const screen = useAtomValue(screenAtom); // leemos el valor del atom de estado de pantalla
  
  const screenComponents = {               // Se crea un objeto con las pantallas posibles y a cada uno de ellas se le pasa el componente correspondiente
    error: <WidgetErrorScreen />,
    loading: <WidgetLoadingScreen organizationId={organizationId} />,
    auth: <WidgetAuthScreen />,
    voice: <p>TODO: Voice</p>,
    inbox: <p>TODO: Inbox</p>,
    selection: <WidgetSelectionScreen />,
    chat: <WidgetChatScreen />,
    contact: <p>TODO: Contact</p>,
  }

  return (
    <main className="min-h-screen min-w-screen flex h-full w-full flex-col overflow-hidden rounded-xl border bg-muted">
      
      {/* Se renderiza el componente en base al valor del atom de estado de pantalla */}
      {screenComponents[screen]} 
      {/* <WidgetFooter /> */}
    </main>
  )
}

export default WidgetView

// http://localhost:3001/?organizationId=123