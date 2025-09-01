"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Badge } from "@workspace/ui/components/badge";
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger";
import { Button } from "@workspace/ui/components/button";
import { usePaginatedQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import type { PublicFile } from "@workspace/backend/private/files";
import {
  FileIcon,
  MoreHorizontalIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";
import { DeleteFileDialog } from "../components/delete-file-dialog";
import { UploadDialog } from "../components/upload-dialog";

/**
 * FilesView es el componente principal para mostrar y gestionar la base de conocimiento.
 * Renderiza una tabla con los archivos subidos, permite añadir nuevos archivos y eliminarlos.
 * Implementa scroll infinito para cargar los archivos de forma paginada.
 */

export const FilesView = () => {

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);             // Estado para controlar la visibilidad del diálogo de subida de archivos.
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);             // Estado para controlar la visibilidad del diálogo de eliminación.
  const [selectedFile, setSelectedFile] = React.useState<PublicFile | null>(   // Estado para almacenar el archivo que el usuario ha seleccionado para eliminar.
    null
  );

  // Hook de Convex para obtener la lista paginada de archivos desde el backend.
  // Llama a la query `api.private.files.list`.
  // `initialNumItems: 10` indica que se cargarán 10 items en la primera petición.
  const files = usePaginatedQuery(
    api.private.files.list,
    {},
    { initialNumItems: 10 }
  );

  /**
   * Manejador que se activa al hacer clic en el botón de eliminar de un archivo.
   * Almacena el archivo seleccionado en el estado y abre el diálogo de confirmación.
   * @param file - El archivo que se va a eliminar.
   */
  const handleDeleteClick = (file: PublicFile) => {
    setSelectedFile(file);
    setDeleteDialogOpen(true);
  };

  /**
   * Callback que se ejecuta después de que un archivo ha sido eliminado con éxito.
   * Limpia el estado del archivo seleccionado.
   */
  const onFileDeleted = () => {
    setSelectedFile(null);
  };

  // Hook personalizado que abstrae la lógica del scroll infinito.
  // Recibe el estado de la paginación de Convex y devuelve controles y estado.
  const {
    canLoadMore,
    handleLoadMore,
    isLoadingFirstPage,
    isLoadingMore,
    topElementRef,
  } = useInfiniteScroll({
    status: files.status,
    loadMore: files.loadMore,
    loadSize: 10,
  });

  return (
    <>
      {/* Diálogo para subir archivos. Se controla con el estado `uploadDialogOpen`. */}
      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />

      {/* Diálogo para confirmar la eliminación. Se controla con `deleteDialogOpen`. */}
      <DeleteFileDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        file={selectedFile}
        onDeleted={onFileDeleted}
      />

      {/* Contenedor principal de la vista */}
      <div className="flex min-h-screen flex-col bg-muted p-8">
        <div className="mx-auto w-full max-w-screen-lg">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-4xl">Knowledge Base</h1>
            <p className="text-muted-foreground">
              Upload and manage documents for your AI assistant
            </p>
          </div>

          {/* Contenedor de la tabla con borde y fondo */}
          <div className="mt-8 rounded-lg border bg-background">
            <div className="flex items-center justify-end border-b px-6 py-4">
              <Button onClick={() => setUploadDialogOpen(true)}>
                <PlusIcon />
                Add new
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6 py-4 font-medium">Name</TableHead>
                  <TableHead className="px-6 py-4 font-medium">Type</TableHead>
                  <TableHead className="px-6 py-4 font-medium">Size</TableHead>
                  <TableHead className="px-6 py-4 font-medium">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {(() => {
                  // Muestra un mensaje de carga mientras se obtiene la primera página.
                  if (isLoadingFirstPage) {
                    return (
                      <TableRow>
                        <TableCell className="h-24 text-center" colSpan={4}>
                          Loading files...
                        </TableCell>
                      </TableRow>
                    );
                  }

                  // Muestra un mensaje si no hay archivos.
                  if (files.results.length === 0) {
                    return (
                      <TableRow>
                        <TableCell className="h-24 text-center" colSpan={4}>
                          No files found.
                        </TableCell>
                      </TableRow>
                    );
                  }

                  // Mapea y renderiza cada archivo en una fila de la tabla.
                  return files.results.map((file) => (
                    <TableRow className="hover:bg-muted/50" key={file.id}>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <FileIcon />
                          {file.name}
                        </div>
                      </TableCell>

                      <TableCell className="px-6 py-4">
                        <Badge variant="outline" className="uppercase">
                          {file.type}
                        </Badge>
                      </TableCell>

                      <TableCell className="px-6 py-4 text-muted-foreground">
                        {file.size}
                      </TableCell>

                      <TableCell className="px-6 py-4">
                        {/* Menú desplegable para las acciones de cada archivo */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              className="size-8 p-0"
                              size="sm"
                              variant="ghost"
                            >
                              <MoreHorizontalIcon />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteClick(file)}
                            >
                              <TrashIcon className="size-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>

            {/* Renderiza el trigger de scroll infinito solo si no está cargando y hay resultados */}
            {!isLoadingFirstPage && files.results.length > 0 && (
              <div className="border-t">
                <InfiniteScrollTrigger
                  canLoadMore={canLoadMore}
                  isLoadingMore={isLoadingMore}
                  onLoadMore={handleLoadMore}
                  ref={topElementRef}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};