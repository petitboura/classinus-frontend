import type { LucideIcon } from "lucide-react";
import { IconeYoutube } from "@/components/icons/IconeYoutube";
import { IconeInternetArchive } from "@/components/icons/IconeInternetArchive";
import { IconeArxiv } from "@/components/icons/IconeArxiv";
import { IconeHal } from "@/components/icons/IconeHal";
import { API_URL } from "@/lib/api";

// Vrais logos des sites et sources que les outils du chat peuvent viser
// (21/10/2026, demande Bourama : la ligne d'un outil montre le logo du site
// concerné, jamais celui de l'outil lui-même, comme Tavily). Le backend envoie
// les noms de domaine visés par chaque appel (champ "domaines" des événements
// d'outil, core/domaines_affichage.py) ; cette table dit pour lesquels on a un
// vrai fichier de logo. Tout autre domaine (une page quelconque lue par Tavily,
// Gallica, OpenAlex, Project Gutenberg, Zenodo...) montre l'icône que le site
// publie lui-même, voir components/chat/LogoSite.tsx.
//
// Ajouter un logo : un composant dans components/icons, une ligne ici. Un
// domaine couvre ses sous-domaines (export.arxiv.org, theses.hal.science).
const LOGOS: { domaines: string[]; Icone: LucideIcon }[] = [
  { domaines: ["youtube.com", "youtu.be"], Icone: IconeYoutube },
  { domaines: ["archive.org"], Icone: IconeInternetArchive },
  { domaines: ["arxiv.org"], Icone: IconeArxiv },
  { domaines: ["hal.science", "hal.archives-ouvertes.fr"], Icone: IconeHal },
];

/** Normalise un nom de domaine : minuscules, sans espaces ni "www.". */
export function normaliserDomaine(domaine: string): string {
  return domaine.trim().toLowerCase().replace(/^www\./, "");
}

/**
 * Adresse de l'icône publiée par un site, demandée au serveur de Classinus (29/10/2026).
 * Le serveur répond 404 quand le site n'a pas d'icône, ce qui laisse la lettre de secours
 * (components/LogoDeSite.tsx). Ne jamais appeler directement le service d'icônes de Google
 * depuis l'écran : il envoie un globe générique que rien ne permet de reconnaître.
 */
export function urlLogoSite(domaine: string): string {
  return `${API_URL}/api/logos-sites/${encodeURIComponent(normaliserDomaine(domaine))}`;
}

/** Vrai logo du site, ou null si on n'en a pas (le repli est l'icône publiée par le site). */
export function logoPourDomaine(domaine: string): LucideIcon | null {
  const d = normaliserDomaine(domaine);
  if (!d) return null;
  for (const logo of LOGOS) {
    for (const connu of logo.domaines) {
      if (d === connu || d.endsWith(`.${connu}`)) return logo.Icone;
    }
  }
  return null;
}

/**
 * Lit le champ "domaines" d'un événement d'outil reçu du backend : un tableau
 * de noms de domaine non vides, sinon undefined (rien à afficher). Tolère un
 * champ absent ou mal formé, l'affichage ne doit jamais casser pour ça.
 */
export function listeDomaines(valeur: unknown): string[] | undefined {
  if (!Array.isArray(valeur)) return undefined;
  const domaines = valeur.filter((d): d is string => typeof d === "string" && d.trim() !== "");
  return domaines.length > 0 ? domaines : undefined;
}
