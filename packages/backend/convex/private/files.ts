import { ConvexError, v } from "convex/values";
import { action } from "../_generated/server";
import {
  contentHashFromArrayBuffer,
  EntryId,
  guessMimeTypeFromContents,
  guessMimeTypeFromExtension,
  vEntryId,
} from '@convex-dev/rag'
import { extractTextContent } from "../lib/extractTextContent";
import rag from "../system/ai/rag";
import { Id } from "../_generated/dataModel";

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
 *  procesarlos para extraer su contenido de texto, 
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

    // 2. Determinar el tipo MIME y almacenar el archivo en Convex Storage
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
