import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

/**
 * Define las propiedades que acepta el componente `InfiniteScrollTrigger`.
 */
interface InfiniteScrollTriggerProps {
  canLoadMore: boolean;       /** Indica si se pueden cargar más elementos. Controla si el botón está habilitado. */
  isLoadingMore: boolean;     /** Indica si actualmente se están cargando más elementos. Muestra el texto "Loading...". */
  onLoadMore: () => void;     /** La función que se ejecuta al hacer clic en el botón o cuando el trigger es visible. */
  loadMoreText?: string;      /** (Opcional) Texto personalizado para el botón cuando se puede cargar más. */ 
  noMoreText?: string;        /** (Opcional) Texto personalizado para cuando no hay más elementos que cargar. */
  className?: string;         /** (Opcional) Clases CSS adicionales para el contenedor principal. */
}

/**
 * Un componente de UI que actúa como un disparador para cargar más elementos en una lista infinita.
 * Puede ser activado manualmente (haciendo clic) o automáticamente cuando se hace visible en el viewport
 * (usando una `ref` y un `IntersectionObserver`).
 *
 * Se utiliza `React.forwardRef` para permitir que el componente padre pase una `ref`
 * directamente al elemento `div` del DOM, lo cual es esencial para que el `IntersectionObserver` funcione.
 */

export const InfiniteScrollTrigger = React.forwardRef<HTMLDivElement, InfiniteScrollTriggerProps>( // Recibe 2 argumentos: la ref y las props
  ({
    canLoadMore,
    isLoadingMore,
    onLoadMore,
    loadMoreText = "Load more",
    noMoreText = "No more items",
    className,
  }, ref) => {
    // Determina el texto del botón basándose en el estado de la carga.
    let text = loadMoreText;
    if (isLoadingMore) {
      text = "Loading...";
    } else if (!canLoadMore) {
      text = noMoreText;
    }
  
    return (
      <div 
        ref={ref} 
        className={cn("flex w-full justify-center py-2", className)}
      >
        <Button
          // El botón se deshabilita si no se puede cargar más o si ya está cargando.
          disabled={!canLoadMore || isLoadingMore}
          onClick={onLoadMore}
          size="sm"
          variant="ghost"
        >
          {text}
        </Button>
      </div>
    );
  }
);
InfiniteScrollTrigger.displayName = "InfiniteScrollTrigger";