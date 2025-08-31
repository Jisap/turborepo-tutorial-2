import { generateText } from 'ai'
import type { StorageActionWriter } from 'convex/server'
import { assert } from 'convex-helpers'
import { Id } from '../_generated/dataModel'
import { google } from '@ai-sdk/google';

/**
 * Define los modelos de IA de Google Gemini a utilizar para cada tipo de tarea.
 * - `image`: Modelo rápido para OCR y descripción de imágenes.
 * - `pdf`: Modelo más potente (Pro) para analizar la estructura compleja de PDFs.
 * - `html`: Modelo rápido para limpiar y convertir contenido HTML a Markdown.
 */
const AI_MODELS = {
  // Image prompt: OCR (documents) + description (photos)
  image: google.chat("gemini-1.5-flash-latest"),
  // PDF prompt: converting structured documents into text
  pdf: google.chat("gemini-1.5-pro-latest"),
  // HTML prompt: transform content → markdown (fast, lightweight)
  html: google.chat("gemini-1.5-flash-latest"),
} as const;

/**
 * Lista de tipos MIME de imágenes soportados para la extracción de texto.
 */
const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

/**
 * Instrucciones de sistema (system prompts) para guiar el comportamiento de los modelos de IA.
 * Cada prompt está diseñado para una tarea específica.
 */
const SYSTEM_PROMPTS = {
  image: "You turn images into text. If it is a photo of a document, transcribe it. If it is not a document, describe it.",
  pdf: "You transform PDF files into text.",
  html: "You transform content into markdown."
};

/**
 * Define la estructura de los argumentos para la función de extracción.
 */
export type ExtractTextContentArgs = {
  storageId: Id<"_storage">;
  filename: string;
  bytes?: ArrayBuffer;
  mimeType: string;
};

/**
 * Función principal que extrae el contenido de texto de un archivo almacenado.
 * Actúa como un despachador que elige el método de extracción correcto
 * basándose en el tipo MIME del archivo.
 * @param ctx - El contexto de la acción de Convex, con acceso al almacenamiento.
 * @param args - Los argumentos que incluyen el ID de almacenamiento, nombre y tipo del archivo.
 * @returns Una promesa que se resuelve con el texto extraído del archivo.
 */
export async function extractTextContent(
  ctx: { storage: StorageActionWriter },
  args: ExtractTextContentArgs
): Promise<string> {

  const { storageId, filename, bytes, mimeType } = args;
  const url = await ctx.storage.getUrl(storageId);                         
  assert(url, "Failed to get storage URL");

  // Enruta a la función de extracción apropiada según el tipo MIME.
  if (SUPPORTED_IMAGE_TYPES.some((type) => type === mimeType)) {
    return extractImageText(url)
  }

  if (mimeType.toLowerCase().includes("pdf")) {
    return extractPdfText(url, mimeType, filename);
  }

  if (mimeType.toLowerCase().includes("text")) {
    return extractTextFileContent(ctx, storageId, bytes, mimeType);
  }

  throw new Error(`Unsupportes MIME type: ${mimeType}`);

};

/**
 * Extrae texto de archivos de tipo 'text/*' (ej. text/plain, text/html).
 * Para texto plano, lo devuelve directamente.
 * Para otros tipos (como HTML), usa un modelo de IA para limpiarlo y convertirlo a Markdown.
 * @param ctx - Contexto de la acción.
 * @param storageId - ID del archivo en el almacenamiento.
 * @param bytes - Contenido del archivo como ArrayBuffer (opcional).
 * @param mimeType - Tipo MIME del archivo.
 * @returns El contenido de texto extraído.
 */
async function extractTextFileContent(
  ctx: { storage: StorageActionWriter },
  storageId: Id<"_storage">,
  bytes: ArrayBuffer | undefined,
  mimeType: string
): Promise<string> {

  // Obtiene los bytes del archivo si no se proveyeron.
  const arrayBuffer = bytes || (await (await ctx.storage.get(storageId))?.arrayBuffer());

  if (!arrayBuffer) throw new Error("Failed to get file content");

  // Decodifica los bytes a una cadena de texto.
  const text = new TextDecoder().decode(arrayBuffer);

  // Si no es texto plano, usa IA para convertirlo a Markdown.
  if (mimeType.toLowerCase() !== "text/plain") {
    const result = await generateText({
      model: AI_MODELS.html,
      system: SYSTEM_PROMPTS.html,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text },
            {
              type: "text",
              text: "Extract the text and print it in a markdown format without explaining that you'll do so."
            }
          ]
        }
      ]
    });
    return result.text;
  }
  return text;
};

/**
 * Extrae texto de un archivo PDF usando un modelo de IA multimodal.
 * El modelo de IA procesa el archivo directamente desde su URL.
 * @param url - La URL pública del archivo PDF.
 * @param mimeType - El tipo MIME del archivo.
 * @param filename - El nombre del archivo.
 * @returns El texto extraído del PDF.
 */
async function extractPdfText(
  url: string,
  mimeType: string,
  filename: string
): Promise<string> {
  const result = await generateText({
    model: AI_MODELS.pdf,
    system: SYSTEM_PROMPTS.pdf,
    messages: [
      {
        role: "user",
        content: [
          { type: "file", data: new URL(url), mimeType, filename },
          {
            type: "text",
            text: "Extract the text from the PDF and print it without explaining you'll do so.",
          }

        ]
      }
    ]
  });
  return result.text;
};

/**
 * Extrae texto de una imagen (OCR) o la describe usando un modelo de IA con capacidad de visión.
 * El modelo procesa la imagen directamente desde su URL.
 * @param url - La URL pública de la imagen.
 * @returns El texto transcrito o la descripción de la imagen.
 */
async function extractImageText(url: string): Promise<string> {
  const result = await generateText({
    model: AI_MODELS.image,
    system: SYSTEM_PROMPTS.image,
    messages: [
      {
        role: "user",
        content: [{ type: "image", image: new URL(url) }]
      }
    ]
  });

  return result.text;

};