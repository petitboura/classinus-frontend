import type { LucideIcon } from "lucide-react";
import { IconePython } from "@/components/icons/IconePython";
import { IconeJavascript } from "@/components/icons/IconeJavascript";
import { IconeTypescript } from "@/components/icons/IconeTypescript";
import { IconeBash } from "@/components/icons/IconeBash";

// Logos des langages que l'outil Exécution de code peut lancer (24/10/2026,
// demande Bourama : le logo du langage se pose en petit badge sur l'icône Play
// de la ligne d'outil). Le backend envoie le langage de l'appel dans le champ
// "langage" des événements d'outil (core/domaines_affichage.py), seulement pour
// l'action run_code. Ajouter un langage : un composant dans components/icons,
// une ligne ici, et la même valeur dans le backend.
//
// Les noms affichés sont des noms propres identiques dans toutes les langues de
// l'interface : ils servent d'infobulle sur le badge.
const LANGAGES: Record<string, { Icone: LucideIcon; nom: string }> = {
  python: { Icone: IconePython, nom: "Python" },
  javascript: { Icone: IconeJavascript, nom: "JavaScript" },
  typescript: { Icone: IconeTypescript, nom: "TypeScript" },
  bash: { Icone: IconeBash, nom: "Bash" },
};

/** Logo et nom du langage, ou null si on n'a rien pour ce langage (aucun badge dans ce cas). */
export function logoPourLangage(langage: string | undefined): { Icone: LucideIcon; nom: string } | null {
  if (!langage) return null;
  return LANGAGES[langage.trim().toLowerCase()] ?? null;
}

/**
 * Lit le champ "langage" d'un événement d'outil reçu du backend : une chaîne non
 * vide, sinon undefined (rien à afficher). Tolère un champ absent ou mal formé,
 * l'affichage ne doit jamais casser pour ça.
 */
export function lireLangage(valeur: unknown): string | undefined {
  return typeof valeur === "string" && valeur.trim() !== "" ? valeur.trim().toLowerCase() : undefined;
}
