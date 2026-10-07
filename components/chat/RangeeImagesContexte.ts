import { createContext } from "react";

// Images affichées dans une même rangée défilable du message : chacune sait
// ainsi quelles sont ses voisines, pour que l'aperçu plein écran permette de
// passer de l'une à l'autre.
export type ImageDeRangee = { src: string; alt?: string };

export const ContexteRangeeImages = createContext<ImageDeRangee[] | null>(null);
