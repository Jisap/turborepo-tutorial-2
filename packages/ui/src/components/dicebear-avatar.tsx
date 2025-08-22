"use client"

import { useMemo } from "react";

import { glass } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";
import { Avatar, AvatarImage } from "@workspace/ui/components/avatar";
import { cn } from "@workspace/ui/lib/utils";

/**
 * Define las propiedades que acepta el componente DicebearAvatar.
 */
interface DicebearAvatarProps {
  seed: string;                   /** La "semilla" (seed) utilizada para generar un avatar único. Suele ser un ID de usuario, email, etc. */
  size?: number;                  /** (Opcional) El tamaño del avatar en píxeles. Por defecto es 32. */
  className?: string;             /** (Opcional) Clases CSS adicionales para el componente Avatar principal. */
  badgeClassName?: string;        /** (Opcional) Clases CSS adicionales para la insignia (badge). */
  imageUrl?: string;              /** (Opcional) URL de una imagen personalizada para usar como avatar. Si se proporciona, anula la generación de Dicebear. */
  badgeImageUrl?: string;         /** (Opcional) URL de una imagen para mostrar como una insignia superpuesta en la esquina. */ 
}

/**
 * Un componente que muestra un avatar.
 * Puede mostrar una imagen proporcionada a través de `imageUrl` o generar un avatar único
 * y determinista basado en una `seed` usando la librería Dicebear.
 * También soporta una insignia (badge) opcional que se superpone en la esquina.
 */

export const DicebearAvatar = ({
  seed,
  size = 32,
  className,
  imageUrl,
  badgeClassName,
  badgeImageUrl
}: DicebearAvatarProps) => {
  
  // `useMemo` se usa para optimizar el rendimiento.
  // La generación del avatar solo se ejecutará si `imageUrl`, `seed` o `size` cambian.
  const avatarSrc = useMemo(() => {
    
    if (imageUrl) return imageUrl;                     // Si se proporciona una URL de imagen, se usa esa con prioridad.

    const avatar = createAvatar(glass, {               // Si no, se crea un avatar con Dicebear. 
      seed: seed.toLowerCase().trim(),                 // Se normaliza la semilla para asegurar consistencia (ej. "John" y "john " generan el mismo avatar).
      size,
    })

    return avatar.toDataUri();                         // Se convierte el avatar SVG a un Data URI para poder usarlo en el `src` de una imagen.
  
  }, [imageUrl, seed, size]);

  
  const badgeSize = Math.round(size * 0.5);            // Calcula el tamaño de la insignia como un porcentaje del tamaño del avatar principal.

  return (
    // Contenedor principal con posicionamiento relativo para poder colocar la insignia de forma absoluta.
    <div
      className="relative inline-block"
      style={{ width: size, height: size }}
    >
      {/* Componente base de Avatar de shadcn/ui */}
      <Avatar
        className={cn("border", className)}
        style={{ width: size, height: size }}
      >
        <AvatarImage alt="Image" src={avatarSrc} />
      </Avatar>
      {
        // Renderiza la insignia solo si se proporciona una `badgeImageUrl`.
        badgeImageUrl && (
          <div
            className={
              cn(
                // Estilos para la insignia: posicionada en la esquina inferior derecha, redonda y con un borde.
                "absolute right-0 bottom-0 flex items-center justify-center overflow-hidden rounded-full border-2 border-background bg-background",
                badgeClassName
              )
            }
            style={{
              width: badgeSize,
              height: badgeSize,
              // El `transform` mueve la insignia ligeramente hacia afuera para un mejor efecto visual.
              transform: "translate(15%, 15%)"
            }
            }
          >
            {/* La imagen de la insignia */}
            <img
              alt="Badge"
              className="h-full w-full object-cover"
              height={badgeSize}
              src={badgeImageUrl}
              width={badgeSize}
            />
          </div>
        )}
    </div>
  )
}