// 19/09/2026, demande Bourama : dans Classinus, rien ne doit être accessible
// sans compte, sauf une page d'élément partagé ouverte par son lien.
// Cette liste dit quelles routes sont des pages d'élément partagé. Toute
// autre route du groupe (app) exige un compte, voir components/AppShell.tsx
// (garde posée une seule fois pour toutes les pages, pour qu'une page
// ajoutée plus tard soit protégée d'office au lieu d'être oubliée).
//
// Les six routes bibliotheque, dossiers et skills (version publique et
// version perso) sont celles que produit lienPartage() dans
// components/ButtonPartager.tsx. La fiche établissement s'y ajoute : c'est
// une page à URL propre, indexable par Google (chantier "Classinus ouvert",
// lot C, voir app/(app)/etablissements/[id]/page.tsx).
//
// Volontairement absentes : les listes (/bibliotheque, /dossiers,
// /skills, /etablissements) et /signalements/[id], qui restent réservées
// aux comptes.
//
// Pour ouvrir un nouveau type de page partagée, il suffit de l'ajouter ici.

import { PAGES_FILLES_BIBLIOTHEQUE } from "./routesBibliotheque";

// Mots qui, placés seuls après la racine, désignent une page de liste et
// jamais l'identifiant d'un élément : "perso" (racine/perso/<id>) et les
// pages filles de la Bibliothèque (19/09/2026, demande Bourama : la
// Bibliothèque fonctionne comme Personnaliser Clovis, voir
// lib/routesBibliotheque.ts). Sans cette liste, /bibliotheque/publique
// aurait été prise pour un document partagé et serait devenue ouverte à
// tout le monde. Lue depuis la source unique des routes de la
// Bibliothèque, pour qu'une page fille ajoutée là soit réservée d'office.
const MOTS_RESERVES = new Set<string>([
  "perso",
  ...PAGES_FILLES_BIBLIOTHEQUE.map((route) => route.split("/").pop() as string),
]);

// Racine de route (premier segment) et présence d'une version perso
// (racine/perso/<id>) en plus de la version publique (racine/<id>).
// Une Map (et non un objet simple) pour qu'un segment comme "constructor"
// ne soit jamais pris pour une racine valide.
const PAGES_ELEMENT_PARTAGE = new Map<string, { aVersionPerso: boolean }>([
  ["bibliotheque", { aVersionPerso: true }],
  ["dossiers", { aVersionPerso: true }],
  ["skills", { aVersionPerso: true }],
  ["etablissements", { aVersionPerso: false }],
]);

/** Vrai si le chemin est une page d'élément partagé, consultable sans compte. */
export function estPageElementPartage(chemin: string): boolean {
  const [racine, ...reste] = chemin.split("/").filter(Boolean);
  const regle = PAGES_ELEMENT_PARTAGE.get(racine);
  if (!regle) return false;

  // racine/<id> : un mot réservé seul n'est jamais un identifiant.
  if (reste.length === 1) return !MOTS_RESERVES.has(reste[0]);
  // racine/perso/<id>
  if (reste.length === 2) return regle.aVersionPerso && reste[0] === "perso";
  return false;
}
