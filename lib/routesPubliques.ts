// 19/09/2026, demande Bourama : dans Clovis, rien ne doit être accessible
// sans compte, sauf une page d'élément partagé ouverte par son lien.
// Cette liste dit quelles routes sont des pages d'élément partagé. Toute
// autre route du groupe (app) exige un compte, voir components/AppShell.tsx
// (garde posée une seule fois pour toutes les pages, pour qu'une page
// ajoutée plus tard soit protégée d'office au lieu d'être oubliée).
//
// Les six routes bibliotheque, dossiers et skills (version publique et
// version perso) sont celles que produit lienPartage() dans
// components/ButtonPartager.tsx. La fiche établissement s'y ajoute : c'est
// une page à URL propre, indexable par Google (chantier "Clovis ouvert",
// lot C, voir app/(app)/etablissements/[id]/page.tsx).
//
// Volontairement absentes : les listes (/bibliotheque, /dossiers,
// /skills, /etablissements) et /signalements/[id], qui restent réservées
// aux comptes.
//
// Pour ouvrir un nouveau type de page partagée, il suffit de l'ajouter ici.

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

  // racine/<id> : le mot "perso" seul n'est jamais un identifiant.
  if (reste.length === 1) return reste[0] !== "perso";
  // racine/perso/<id>
  if (reste.length === 2) return regle.aVersionPerso && reste[0] === "perso";
  return false;
}
