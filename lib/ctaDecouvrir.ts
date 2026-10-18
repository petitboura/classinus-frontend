import { ROUTES_APP } from "./routesApp";
import { ROUTES_BIBLIOTHEQUE } from "./routesBibliotheque";
import { ROUTES_BUREAU } from "./routesBureau";
import { ROUTES_CONCENTRATION } from "./routesConcentration";
import { ROUTES_DECOUVRIR } from "./routesDecouvrir";
import { ROUTES_PERSONNALISER } from "./routesPersonnaliser";
import { GROUPES_RAIL, trouverSection } from "./groupesRail";

// Chantier SEO/AEO de Classinus (18/10/2026, demande Bourama). Les pages
// /decouvrir n'avaient aucun bouton d'action : un visiteur qui lit une page
// n'avait nulle part où aller pour essayer. Chaque page affiche maintenant,
// sous son contenu (components/CtaDecouvrir.tsx) :
//   1. toujours un bouton vers le chat ;
//   2. un bouton vers la section de l'appli dont parle la page, seulement
//      quand la page parle d'une section. La page mère /decouvrir, la page des
//      usages, Thonny et les pages d'usage qui touchent plusieurs sections
//      n'ont donc que le bouton du chat.
//
// Les adresses viennent des fichiers de routes et les noms de section de
// lib/groupesRail.ts (les mêmes listes que le rail de l'appli), jamais
// recopiés ici : un nom ou une adresse changés dans l'appli suivent tout seuls.
// Pour qu'une nouvelle page parle d'une section, il suffit d'ajouter sa ligne
// dans APPLI_PAR_PAGE_DECOUVRIR.

/** Bouton du chat, affiché sous toutes les pages /decouvrir. */
export const CTA_CHAT_DECOUVRIR = {
  href: ROUTES_APP.chat,
  libelle: "Essayer Classinus dans le chat",
} as const;

export type CtaSectionDecouvrir = { href: string; libelle: string };

// Page /decouvrir -> adresse de la section de l'appli dont elle parle.
const APPLI_PAR_PAGE_DECOUVRIR: Record<string, string> = {
  [ROUTES_DECOUVRIR.bibliotheque.accueil]: ROUTES_BIBLIOTHEQUE.accueil,
  [ROUTES_DECOUVRIR.bibliotheque.perso]: ROUTES_BIBLIOTHEQUE.perso,
  [ROUTES_DECOUVRIR.bibliotheque.publique]: ROUTES_BIBLIOTHEQUE.publique,
  [ROUTES_DECOUVRIR.bibliotheque.telephone]: ROUTES_BIBLIOTHEQUE.telephone,
  [ROUTES_DECOUVRIR.personnaliser.accueil]: ROUTES_PERSONNALISER.accueil,
  [ROUTES_DECOUVRIR.personnaliser.mesSkills]: ROUTES_PERSONNALISER.comportements,
  [ROUTES_DECOUVRIR.personnaliser.skillsPublics]: ROUTES_PERSONNALISER.skillsPublics,
  [ROUTES_DECOUVRIR.personnaliser.memoire]: ROUTES_PERSONNALISER.memoire,
  [ROUTES_DECOUVRIR.concentration.accueil]: ROUTES_CONCENTRATION.accueil,
  [ROUTES_DECOUVRIR.concentration.session]: ROUTES_CONCENTRATION.session,
  [ROUTES_DECOUVRIR.concentration.tempsEcran]: ROUTES_CONCENTRATION.tempsEcran,
  [ROUTES_DECOUVRIR.bureau.accueil]: ROUTES_BUREAU.accueil,
  [ROUTES_DECOUVRIR.bureau.programme]: ROUTES_BUREAU.programme,
  [ROUTES_DECOUVRIR.bureau.codes]: ROUTES_BUREAU.codes,
  [ROUTES_DECOUVRIR.bureau.entrerCode]: ROUTES_BUREAU.entrerCode,
  [ROUTES_DECOUVRIR.bureau.audit]: ROUTES_BUREAU.audit,
  [ROUTES_DECOUVRIR.bureau.signalements]: ROUTES_BUREAU.signalements,
  [ROUTES_DECOUVRIR.bureau.editeur]: ROUTES_BUREAU.editeur,
  [ROUTES_DECOUVRIR.bureau.configuration]: ROUTES_BUREAU.configuration,
  // Trouver des PDF : la page parle de la bibliothèque personnelle et du
  // catalogue partagé, une seule section de l'appli.
  [ROUTES_DECOUVRIR.usages.pdf]: ROUTES_BIBLIOTHEQUE.accueil,
};

function sansSlashFinal(chemin: string): string {
  return chemin.length > 1 ? chemin.replace(/\/+$/, "") : chemin;
}

/**
 * Bouton vers la section de l'appli dont parle la page /decouvrir `chemin`,
 * ou null si la page ne parle pas d'une section (alors seul le chat est proposé).
 */
export function ctaSectionDecouvrir(chemin: string): CtaSectionDecouvrir | null {
  const href = APPLI_PAR_PAGE_DECOUVRIR[sansSlashFinal(chemin)];
  if (!href) return null;

  const groupe = GROUPES_RAIL.find((g) => g.href === href);
  if (groupe) return { href, libelle: `Ouvrir ${groupe.label}` };

  const section = trouverSection(href);
  if (section) return { href, libelle: `Ouvrir ${section.label} dans ${section.groupe.label}` };

  return null;
}
