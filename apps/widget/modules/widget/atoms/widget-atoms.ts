import { atom } from "jotai";
import { WidgetScreen } from "../types";
import { atomFamily, atomWithStorage } from "jotai/utils";
import { CONTACT_SESSION_KEY } from "../constants";
import { Id } from "@workspace/backend/_generated/dataModel";

// Basic widget state atoms

// ScreenAtom es el estado que solo puede contener valores de tpo WidgetScreen
export const screenAtom = atom<WidgetScreen>("loading");      // valor por defecto de "auth"

// errorMessageAtom es el estado que solo puede contener un mensaje de error como string
export const errorMessageAtom = atom<string | null>(null); // valor por defecto null

// loadingMessageAtom es el estado que nos dice cual es el mensaje de carga actual
export const loadignMessageAtom = atom<string | null>(null); // valor por defecto null

// Estado para almacenar el ID de la organización
export const organizationIdAtom = atom<string | null>(null); // valor por defecto null

// Organization-scoped contact session atom
// En lugar de tener un solo átomo, tienes una función que te permite obtener o crear 
// un átomo específico pasándole un parámetro.
export const contactSessionIdAtomFamily = atomFamily(
  (organizationId: string) => {
    return atomWithStorage<Id<"contactSessions"> | null>(`${CONTACT_SESSION_KEY}_${organizationId}`, null)
  })

// Estado para almacenar el ID de la conversación
export const conversationIdAtom = atom<Id<"conversations"> | null>(null);