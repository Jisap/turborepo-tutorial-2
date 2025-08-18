import { atom } from "jotai";
import { WidgetScreen } from "../types";

// Basic widget state atoms

// ScreenAtom es el estado que solo puede contener valores de tpo WidgetScreen
export const screenAtom = atom<WidgetScreen>("auth");      // valor por defecto de "auth"

// errorMessageAtom es el estado que solo puede contener un mensaje de error como string
export const errorMessageAtom = atom<string | null>(null); // valor por defecto null


