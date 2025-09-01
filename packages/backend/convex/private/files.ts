import { ConvexError, v } from "convex/values";
import { action, mutation, query, QueryCtx } from "../_generated/server";
import {
  contentHashFromArrayBuffer,
  Entry,
  EntryId,
  guessMimeTypeFromContents,
  guessMimeTypeFromExtension,
  vEntry,
  vEntryId,
} from '@convex-dev/rag'
import { extractTextContent } from "../lib/extractTextContent";
import rag from "../system/ai/rag";
import { Id } from "../_generated/dataModel";
import { paginationOptsValidator } from "convex/server";

/**
 * Adivina el tipo MIME de un archivo.
 * Prioriza la detección basada en el contenido, luego por la extensión del archivo,
 * y finalmente usa un tipo genérico si no se puede determinar.
 * @param filename - El nombre del archivo.
 * @param bytes - El contenido del archivo como ArrayBuffer.
 * @returns El tipo MIME como string.
 */


function guessMimeType(filename: string, bytes: ArrayBuffer): string {
  return (
    guessMimeTypeFromContents(bytes) ||
    guessMimeTypeFromExtension(filename) ||
    'application/octet-stream'
  )
}

/**
 * Define la estructura de los metadatos que se guardarán junto con cada entrada en el sistema RAG.
 */
type EntryMetadata = {
  storageId: Id<"_storage">;
  uploadedBy: string;
  filename: string;
  category: string | null;
};

/**
 * Define la estructura de datos de un archivo que se expondrá públicamente o al frontend.
 */
export type PublicFile = {
  id: EntryId;
  name: string;
  type: string;
  size: string;
  status: "ready" | "processing" | "error";
  url: string | null;
  category?: string;
};

/**
 * Acción de Convex para añadir un nuevo archivo.
 * Su propósito principal es gestionar la subida de archivos por parte de los usuarios,
 * procesarlos para extraer su contenido de texto, 
 * y finalmente indexarlos en un sistema de Búsqueda y Generación Aumentada (RAG). 
 *
 * @param args - Argumentos que incluyen el archivo (nombre, tipo, bytes) y una categoría opcional.
 */
export const addFile = action({
  args: {
    filename: v.string(),
    mimeType: v.string(),
    bytes: v.bytes(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Autenticación y Autorización
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'Identity not found',
      })
    }

    const orgId = identity.orgId as string
    if (!orgId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'Organization not found',
      })
    }

    const {bytes, filename, category} = args

    // 2. Determinar el tipo MIME y almacenamiento del archivo en Convex Storage
    const mimeType = args.mimeType || guessMimeType(filename, bytes);
    const blob = new Blob([bytes], { type: mimeType })


    const storageId = await ctx.storage.store(blob)

    // 3. Extraer el contenido de texto del archivo
    const text = await extractTextContent(ctx, {
      storageId,
      filename,
      bytes,
      mimeType,
    });
    
    // 4. Añadir el texto y metadatos al sistema RAG
    const { entryId, created } = await rag.add(ctx, {
      // El 'namespace' es crucial para la multi-tenencia. Aisla los datos por organización.
      namespace: orgId,
      text,
      key: filename,
      title: filename,
      metadata: {
        storageId, // Importante para poder borrar el archivo físico después.
        uploadedBy: orgId, // Para saber qué organización subió el archivo.
        filename,
        category: category ?? null
      } as EntryMetadata,
      // El hash de contenido evita re-indexar archivos idénticos.
      contentHash: await contentHashFromArrayBuffer(bytes)
    });

    // 5. Manejo de duplicados
    if (!created) {
      // Si la entrada no fue creada (porque el contentHash ya existía),
      // borramos el blob que acabamos de subir para no gastar espacio.
      console.log("entry already exits, skipping upload metadata")
      await ctx.storage.delete(storageId);
    }

    return {
      url: await ctx.storage.getUrl(storageId),
      entryId
    }
  }
})

/**
 * Mutación de Convex para eliminar un archivo.
 * Se encarga de verificar la propiedad del archivo y eliminar tanto el archivo físico
 * del almacenamiento como su entrada y datos asociados del sistema RAG.
 *
 * @param args - Argumentos que incluyen el `entryId` del archivo a eliminar.
 */

export const deleteFile = mutation({
  args: {
    entryId: vEntryId, // Validador específico para IDs de entrada de RAG.
  },
  handler: async (ctx, args) => {
    // 1. Autenticación y Autorización del usuario.
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Identity not found",
      });
    }

    const orgId = identity.orgId as string;

    if (!orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization ID not found in identity",
      });
    }

    // Verificación de que el namespace de la organización existe en RAG.
    const namespace = await rag.getNamespace(ctx, {
      namespace: orgId,
    });

    if (!namespace) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid Namespace",
      });
    }

    // 2. Recuperación de la entrada del archivo desde el sistema RAG.
    const entry = await rag.getEntry(ctx, { entryId: args.entryId });

    if (!entry) {
      throw new ConvexError({
        code: "not_found",
        message: "Entry not found",
      });
    }

    // 3. Verificación de Propiedad: ¿El usuario pertenece a la misma organización que subió el archivo?
    // Esto es crucial para la seguridad y la multi-tenencia.
    if (entry.metadata?.uploadedBy !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "You do not have permission to delete this file",
      });
    }

    // 4. Eliminación del Archivo Físico: Borra el blob del almacenamiento de Convex.
    if (entry.metadata?.storageId) {
      await ctx.storage.delete(entry.metadata.storageId as Id<"_storage">);
    }

    // 5. Eliminación de la Entrada RAG: Borra el registro y los embeddings de la base de datos vectorial.
    await rag.deleteAsync(ctx, { entryId: args.entryId });
  },
});

/**
 * Query para listar los archivos de una organización, con opción de filtrar por categoría.
 */
export const list = query({
  args: {
    category: v.optional(v.string()),
    paginationOpts: paginationOptsValidator, // Validador estándar de Convex para paginación.
  },
  handler: async (ctx, args) => {
    // Autenticación y obtención del ID de la organización.
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Identity not found",
      });
    }

    // El campo org_id se añade al JWT de Convex en la configuración de Clerk.
    const orgId = identity.orgId as string;
    if (!orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found!",
      });
    }

    // Obtiene el namespace correspondiente a la organización
    const namespace = await rag.getNamespace(ctx, {
      namespace: orgId, 
    });

    // Si no hay namespace, significa que la organización no tiene archivos.
    if (!namespace) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    // Lista las entradas del RAG para el namespace de la organización.
    const results = await rag.list(ctx, {
      namespaceId: namespace.namespaceId,
      paginationOpts: args.paginationOpts,
    });

    // Convierte cada entrada de RAG a un formato público para el frontend.
    const files = await Promise.all(
      results.page.map((entry) => convertEntryToPublicFile(ctx, entry))
    );

    // Filtra los archivos por categoría si se proporciona una.
    const filteredFiles = args.category
      ? files.filter((file) => file.category === args.category)
      : files;

    // Devuelve la página de resultados filtrados y la información de paginación.
    return {
      page: filteredFiles,
      isDone: results.isDone,
      continueCursor: results.continueCursor,
    };
  },
});


// --- Helper Functions ---

/**
 * Convierte un objeto 'Entry' del sistema RAG a un objeto 'PublicFile' para el frontend.
 * @param ctx - El contexto de la query.
 * @param entry - La entrada del RAG a convertir.
 * @returns Un objeto `PublicFile` con datos simplificados.
 */

async function convertEntryToPublicFile(
  ctx: QueryCtx,
  entry: Entry
): Promise<PublicFile> {

  const metadata = entry.metadata as EntryMetadata | undefined;
  const storageId = metadata?.storageId;

  let fileSize = "unknown";

  // Obtiene el tamaño del archivo desde los metadatos del almacenamiento.
  if (storageId) {
    try {
      const storageMetadata = await ctx.db.system.get(storageId);
      if (storageMetadata) {
        fileSize = formatFileSize(storageMetadata.size);
      }
    } catch (err) {
      console.error("Error fetching storage metadata: ", err);
    }
  }

  const filename = entry.key || "Unknown";
  const extension = filename.split(".").pop()?.toLowerCase() || "txt";

  // Mapea el estado interno del RAG a un estado comprensible para la UI.
  let status: "ready" | "processing" | "error" = "error";
  if (entry.status === "ready") {
    status = "ready";
  } else if (entry.status === "pending") {
    status = "processing";
  }

  // Obtiene la URL de descarga del archivo si existe.
  const url = storageId ? await ctx.storage.getUrl(storageId) : null;
  return {
    id: entry.entryId,
    name: filename,
    type: extension,
    size: fileSize,
    status,
    url,
    category: metadata?.category || undefined,
  };
}

/**
 * Formatea un tamaño en bytes a un formato legible por humanos (B, KB, MB, GB).
 * @param bytes - El número de bytes.
 * @returns Una cadena de texto con el tamaño formateado (ej: "1.2 MB").
 */

function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }

  const k = 1024;
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${units[i]}`;
}


