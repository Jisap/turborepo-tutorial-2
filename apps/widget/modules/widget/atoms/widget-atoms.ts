import { atom } from "jotai";
import { WidgetScreen } from "../types";

// Basic widget state atoms
// Atom es el estado que solo puede contener valores de tpo WidgetScreen

export const screenAtom = atom<WidgetScreen>("auth"); // valor por defecto de "auth"


