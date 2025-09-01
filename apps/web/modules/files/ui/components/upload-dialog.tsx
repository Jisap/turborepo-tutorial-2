"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Label } from "@workspace/ui/components/label";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {                                                        // Componente personalizado para arrastrar y soltar archivos
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@workspace/ui/components/dropzone";
import { useAction } from "convex/react";                       // Hook de Convex para ejecutar acciones del backend
import { api } from "@workspace/backend/_generated/api";


interface UploadDialogProps {                // Define las props que el componente de diálogo acepta
  open: boolean;                             // Controla si el diálogo está abierto o cerrado
  onOpenChange: (open: boolean) => void;     // Función para cambiar el estado de `open`
  onFileUploaded?: () => void;               // Callback opcional que se ejecuta cuando un archivo se ha subido con éxito
}

/**
 * UploadDialog es un componente modal que permite a los usuarios subir un documento,
 * asignarle una categoría y, opcionalmente, un nombre de archivo personalizado.
 */
export const UploadDialog = ({
  onOpenChange,
  open,
  onFileUploaded,
}: UploadDialogProps) => {
  
  const addFile = useAction(api.private.files.addFile);                           // Hook de Convex para obtener la acción `addFile` del backend.

  
  const [uploadedFiles, setUploadedFiles] = React.useState<File[]>([]);           // Estado para almacenar el archivo que el usuario ha seleccionado.
  const [isUploading, setIsUploading] = React.useState(false);                    // Estado para controlar si la subida está en curso y deshabilitar controles.
  const [uploadForm, setUploadForm] = React.useState({                            // Estado para el formulario, conteniendo la categoría y el nombre del archivo.
    category: "",
    filename: "",
  });

  /**
   * Se ejecuta cuando un archivo es soltado en el Dropzone.
   * Almacena el archivo y autocompleta el nombre si no se ha escrito uno.
   * @param acceptedFiles - Array de archivos aceptados por el Dropzone.
   */

  const handleFileDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];                                                 // Solo se permite subir un archivo a la vez.
    if (file) {                                                                    // Si hay un archivo, lo almacenamos en el estado.
      setUploadedFiles([file]);
      
      if (!uploadForm.filename) {                                                  // Si el campo de nombre de archivo está vacío, lo rellenamos con el nombre original.
        setUploadForm((prev) => ({ ...prev, filename: file.name }));
      }
    }
  };

  /**
   * Resetea el estado del formulario y cierra el diálogo.
   * Se usa al cancelar o al completar la subida.
   */

  const handleCancel = () => {
    onOpenChange(false);
    setUploadedFiles([]);
    setUploadForm({
      category: "",
      filename: "",
    });
  };

  /**
   * Gestiona el proceso de subida del archivo.
   * Lee el archivo, llama a la acción de Convex y maneja el estado de carga.
   */
  
  const handleUpload = async () => {
    setIsUploading(true);
    try {
      const blob = uploadedFiles[0];                                              // Obtenemos el archivo subido.
      if (!blob) {                                                                // Si no hay archivo, no hacemos nada.
        return; 
      }
      
      const filename = uploadForm.filename || blob.name;                          // Usa el nombre del formulario o el nombre original del archivo.

      
      await addFile({                                                             // Llama a la acción del backend con los datos necesarios.
        bytes: await blob.arrayBuffer(),
        filename,
        mimeType: blob.type || "text/plain",
        category: uploadForm.category,
      });

      onFileUploaded?.();                                                         // Ejecuta el callback opcional.
      handleCancel();                                                             // Resetea y cierra el diálogo.
    } catch (err) {
      console.error("Error al subir el archivo:", err);
    } finally {
      setIsUploading(false); // Finaliza el estado de carga.
    }
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        // Evita que el diálogo se cierre mientras se sube un archivo.
        if (!isUploading) {
          open ? onOpenChange(open) : handleCancel();
        }
      }}
      open={open}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload documents to your knowledge base for AI-powered search and
            retrieval
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Campo para la categoría del documento */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              className="w-full"
              id="category"
              placeholder="e.g., Documentation, Support, Product"
              type="text"
              disabled={isUploading}
              value={uploadForm.category}
              onChange={(e) =>
                setUploadForm((prev) => ({ ...prev, category: e.target.value }))
              }
            />
          </div>

          {/* Campo opcional para el nombre del archivo */}
          <div className="space-y-2">
            <Label htmlFor="filename">
              Filename{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              className="w-full"
              id="filename"
              placeholder="Override default filename"
              type="text"
              disabled={isUploading}
              value={uploadForm.filename}
              onChange={(e) =>
                setUploadForm((prev) => ({ ...prev, filename: e.target.value }))
              }
            />
          </div>

          {/* Componente para arrastrar y soltar archivos */}
          <Dropzone
            accept={{
              "application/pdf": [".pdf"],
              "text/csv": [".csv"],
              "text/plain": [".txt"],
              // Soporte para archivos de MS Word
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                [".docx"],
            }}
            disabled={isUploading}
            maxFiles={1} // Solo permite subir un archivo a la vez
            onDrop={handleFileDrop}
            src={uploadedFiles}
          >
            <DropzoneEmptyState />
            <DropzoneContent />
          </Dropzone>
        </div>

        <DialogFooter>
          <Button
            disabled={isUploading}
            onClick={handleCancel}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={
              // El botón de subir se activa solo si hay un archivo y una categoría.
              uploadedFiles.length === 0 || isUploading || !uploadForm.category
            }
            onClick={handleUpload}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
