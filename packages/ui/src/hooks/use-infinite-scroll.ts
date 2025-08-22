import { useEffect, useCallback, useRef } from 'react';


interface UseInfiniteScrollProps {
  
  status: "CanLoadMore" | "LoadingMore" | "Exhausted" | "LoadingFirstPage";    /** El estado actual de la carga de datos. Es crucial para controlar cuándo se debe disparar la carga. */
  loadMore: (numItems: number) => void;                                        /** La función que se ejecuta para cargar más elementos. Recibe el número de ítems a cargar. */
  loadSize?: number;                                                           /** (Opcional) El número de elementos a cargar en cada llamada. Por defecto es 10. */
  observerEnabled?: boolean;                                                   /** (Opcional) Permite habilitar o deshabilitar el observador. Útil si quieres detener la detección temporalmente. Por defecto es true. */
}

/**
 * Un hook de React para implementar la funcionalidad de scroll infinito.
 * Utiliza la API `IntersectionObserver` para detectar cuándo un elemento de referencia
 * entra en el viewport y dispara una función para cargar más datos.
 *
 * @param {UseInfiniteScrollProps} props - Las propiedades para configurar el hook.
 * @returns Un objeto con la ref para el elemento vigía, la función para cargar más, y estados booleanos derivados.
 */


export const useInfiniteScroll = ({
  status,
  loadMore,
  loadSize = 10,
  observerEnabled = true,
}: UseInfiniteScrollProps) => {
  
  // Ref que se asignará al elemento "vigía" al final de la lista.
  // Cuando este elemento sea visible, se cargarán más ítems.
  const topElementRef = useRef<HTMLDivElement>(null);

  // Función memoizada para cargar más elementos.
  // Solo se ejecuta si el estado es "CanLoadMore" para evitar cargas múltiples o innecesarias.
  const handleLoadMore = useCallback(() => {
    if (status === "CanLoadMore") {
      loadMore(loadSize);
    }
  }, [status, loadMore, loadSize])

  useEffect(() => {
    
    const topElement = topElementRef.current;                         // Obtenemos la referencia al elemento DOM.

    if (!(topElement && observerEnabled)) return;                     // Si el elemento no existe o el observador está deshabilitado, no hacemos nada.

 
    const observer = new IntersectionObserver(([entry]) => {          // Creamos un IntersectionObserver al que se le pasa un elemento observado (entry)
      
      if (entry?.isIntersecting) {                                    // Si el elemento está intersectando (es decir, visible en el viewport)...
        
        handleLoadMore();                                             // ...llamamos a la función para cargar más elementos.
      }
    },
      { threshold: 0.1 }                                              // `threshold` indica qué porcentaje del elemento debe estar visible para que se dispare el callback.
    );                                                                // 0.1 significa que se activará cuando el 10% del elemento sea visible.

    
    observer.observe(topElement);                                     // Empezamos a observar el elemento vigía.

    
    return () => {
      observer.disconnect();                                          // Función de limpieza:
    }
  }, [handleLoadMore, observerEnabled]);

  // Devolvemos la ref y varios valores booleanos de conveniencia para facilitar su uso en el componente.
  return {
    topElementRef,
    handleLoadMore,
    canLoadMore: status === "CanLoadMore",
    isLoadingMore: status === "LoadingMore",
    isLoadingFirstPage: status === "LoadingFirstPage",
    isExhausted: status === "Exhausted",
  }
}