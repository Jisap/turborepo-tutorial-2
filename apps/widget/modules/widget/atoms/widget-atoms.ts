import { atom } from "jotai";
import { WidgetScreen } from "../types";

// Basic widget state atoms

// ScreenAtom es el estado que solo puede contener valores de tpo WidgetScreen
export const screenAtom = atom<WidgetScreen>("loading");      // valor por defecto de "auth"

// errorMessageAtom es el estado que solo puede contener un mensaje de error como string
export const errorMessageAtom = atom<string | null>(null); // valor por defecto null

// loadingMessageAtom es el estado que nos dice cual es el mensaje de carga actual
export const loadignMessageAtom = atom<string | null>(null); // valor por defecto null

// Estado para almacenar el ID de la organización
export const organizationIdAtom = atom<string | null>(null); // valor por defecto null