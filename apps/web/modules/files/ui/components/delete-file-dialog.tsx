"use client";

import React from "react";
import { api } from "@workspace/backend/_generated/api";
import type { PublicFile } from "@workspace/backend/private/files";       // Tipos de datos, en este caso, la estructura pública de un archivo.
import { useMutation } from "convex/react";                               // Hook de Convex para ejecutar mutaciones (acciones que modifican datos) del backend.
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";


interface DeleteFileDialogProps {           // Define las props que el componente de diálogo acepta.
  open: boolean;                            // Controla si el diálogo está visible.
  onOpenChange: (open: boolean) => void;    // Función para cambiar el estado de visibilidad.
  file: PublicFile | null;                  // El archivo a eliminar, o null si no hay ninguno seleccionado.
  onDeleted?: () => void;                   // Callback opcional que se ejecuta tras una eliminación exitosa.
}

/**
 * DeleteFileDialog es un componente modal que pide al usuario confirmación
 * antes de eliminar un archivo de forma permanente.
 */

export const DeleteFileDialog = ({
  file,
  open,
  onOpenChange,
  onDeleted,
}: DeleteFileDialogProps) => {
 
  const deleteFile = useMutation(api.private.files.deleteFile);       // Hook de Convex para obtener la mutación `deleteFile` del backend. `deleteFile.isPending` se puede usar para saber si la operación está en curso.
  const [isDeleting, setIsDeleting] = React.useState(false);          // Estado local para controlar el estado de carga del botón de eliminación.

  /**
   * Maneja la lógica de eliminación del archivo.
   * Llama a la mutación de Convex y gestiona el estado de carga.
   */

  const handleDelete = async () => {
    if (!file) return;                                                 // Guarda de seguridad por si no hay archivo.

    setIsDeleting(true);                                               // Inicia el estado de carga.
    try {
      
      await deleteFile({ entryId: file.id });                          // Llama a la mutación del backend con el ID de la entrada del archivo.
      onDeleted?.();                                                   // Ejecuta el callback si existe -> Limpia el estado del archivo seleccionado.
      onOpenChange(false);                                             // Cierra el diálogo tras el éxito.
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(false);                                            // Se asegura de que el estado de carga se desactive, incluso si hay un error.
    }
  };

  return (
    <Dialog 
      onOpenChange={onOpenChange} 
      open={open}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete File</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this file? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        {/* Muestra los detalles del archivo a eliminar */}
        {file && (
          <div className="py-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="font-medium">{file.name}</p>
              <p className="text-muted-foreground text-sm">
                Type: {file.type.toUpperCase()} | Size: {file.size}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {/* Botón para cancelar la acción */}
          <Button
            disabled={isDeleting}
            onClick={() => onOpenChange(false)}
            variant="ghost"
          >
            Cancel
          </Button>
          {/* Botón para confirmar la eliminación */}
          <Button
            disabled={isDeleting}
            onClick={handleDelete}
            variant="destructive"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
