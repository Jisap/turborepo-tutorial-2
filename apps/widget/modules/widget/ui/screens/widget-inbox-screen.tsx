'use client';

import { useAtomValue, useSetAtom } from 'jotai';


import { ArrowLeftIcon, TriangleAlertIcon } from 'lucide-react';

import { Button } from '@workspace/ui/components/button';
import { usePaginatedQuery } from 'convex/react';

import { formatDistanceToNow } from 'date-fns';
import ConversationStatusIcon from '@workspace/ui/components/conversation-status-icon';
import { useInfiniteScroll } from '@workspace/ui/hooks/use-infinite-scroll';
import { InfiniteScrollTrigger } from '@workspace/ui/components/infinite-scroll-trigger';
import { api } from '@workspace/backend/_generated/api';
import { WidgetHeader } from '../components/widget-header';
import { WidgetFooter } from '../components/widget-footer';
import { contactSessionIdAtomFamily, conversationIdAtom, organizationIdAtom, screenAtom } from '../../atoms/widget-atoms';

// Este componente es la "bandeja de entrada" del widget. Su propósito principal es mostrar al usuario 
// una lista de todas sus conversaciones pasadas, permitiéndole seleccionar una para continuar chateando 
// o simplemente revisar el historial.


export default function WidgetInboxScreen() {
  const setScreen = useSetAtom(screenAtom);                               // hook para actualizar el estado de screen
  const setConversationId = useSetAtom(conversationIdAtom);               // hook para guardar el id de la conversación seleccionada

  const organizationId = useAtomValue(organizationIdAtom);                // Lee el ID de la organización actual.
  const contactSessionId = useAtomValue(                                  // Lee el ID de la sesión del contacto. Este ID es crucial, ya que funciona como la "llave" para autenticar al usuario y saber qué conversaciones le pertenecen.
    contactSessionIdAtomFamily(organizationId!)                           // ya que funciona como la "llave" para autenticar al usuario y saber qué conversaciones le pertenecen.
  );

  const conversations = usePaginatedQuery(                                // hook de convex para obtener los datos de forma paginada. Conversations contiene la función loadMore que se pasa al hook de scroll infinito
    api.public.conversations.getMany,                                     // Llamada a getMany para obtener una lista de conversaciones y su último mensaje
    contactSessionId
      ? {
        contactSessionId,                                                 // Le pasamos el ID de la sesión del contacto
      }
      : 'skip',                                                           // y si no hay ID se salta la consulta evitando errores
    {
      initialNumItems: 10,                                                // Obtenemos la primeras 10 conversaciones  
    }
  );

  // Para no cargar todas las conversaciones de golpe y mejorar el rendimiento,
  // el componente implementa un scroll infinito:
  
  const { canLoadMore, handleLoadMore, isLoadingMore, topElementRef } =
    useInfiniteScroll({                                                   // utilizamos un hook personalizado
      loadMore: conversations.loadMore,
      status: conversations.status,
      loadSize: 10,
    });

  return (
    <>
    {/* Encabezado con un botón de atras para volver a la selección */}
      <WidgetHeader>
        <div className="flex items-center gap-x-2">
          <Button
            type="button"
            onClick={() => setScreen('selection')}
            className="group"
            variant="transparent"
          >
            <ArrowLeftIcon
              className="-ms-0.5 opacity-60 transition-transform group-hover:-translate-x-0.5"
              size={16}
              aria-hidden="true"
            />
            Inbox
          </Button>
        </div>
      </WidgetHeader>

      {/* Lista de conversaciones */}
      <div className="flex flex-col flex-1 gap-y-4 p-4 overflow-y-hidden">
        {conversations.results.length > 0 &&
        // Se mapea conversations.results para renderizar cada conversación como un botón.
          conversations.results.map((conversation) => (
            <Button
              type="button"
              onClick={() => {
                setConversationId(conversation._id);
                setScreen('chat');
              }}
              variant="outline"
              className="h-20 w-full justify-between"
              key={conversation._id}
            >
              <div className="flex flex-col overflow-hidden justify-start gap-4 w-full">
                <div className="flex items-center justify-between gap-x-2">
                  <span className="text-muted-foreground text-xs">Chat</span>
                  <span className="text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(conversation._creationTime))}
                  </span>
                </div>
                <div className="flex w-full items justify-between gap-x-2">
                  <p className="truncate text-sm">
                    {conversation.lastMessage?.text}
                  </p>
                  <ConversationStatusIcon status={conversation.status} />
                </div>
              </div>
            </Button>
          ))}
        <InfiniteScrollTrigger
          canLoadMore={canLoadMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={handleLoadMore}
          ref={topElementRef}
        />
      </div>

      <WidgetFooter />
    </>
  );
}