import { ROUTES_DECOUVRIR } from "./routesDecouvrir";

// Chantier SEO/AEO de Classinus (26/09/2026, demande Bourama). Contenu
// des cartes affichées sur la page mère générale (/decouvrir) et sur la
// page mère Bibliothèque (/decouvrir/bibliotheque) : chacune liste et
// pointe vers ses pages filles, pour que Google puisse construire des
// sous liens (comme pour le concurrent Softriver, déclencheur du
// chantier). Textes factuels, jamais commerciaux (refus explicite de
// Bourama d'un ton "page de vente").
export type CarteDecouvrir = {
  slug: string;
  href: string;
  titre: string;
  description: string;
};

// Une seule section traitée pour l'instant (Bibliothèque, choisie par
// Bourama comme "la plus attirante"). Les prochaines sections
// (Bureau, Personnaliser Classinus, Concentration, Établissements,
// Utiliser Classinus dans Claude) rejoindront cette liste au fil des
// prochains chantiers, sans changer la page qui l'affiche.
export const SECTIONS_DECOUVRIR: CarteDecouvrir[] = [
  {
    slug: "bibliotheque",
    href: ROUTES_DECOUVRIR.bibliotheque.accueil,
    titre: "Bibliothèque",
    description: "Tes documents personnels, le catalogue partagé par tous les élèves, et les dossiers de ton téléphone.",
  },
];

// Les trois volets de la Bibliothèque, textes validés par Bourama le
// 25/09/2026 (description = celle du document de contexte remis à cette
// date, texteComplet reprise mot pour mot dans le contenu de chaque page
// fille, voir app/decouvrir/bibliotheque/*/page.tsx).
export const SOUS_PAGES_DECOUVRIR_BIBLIOTHEQUE: CarteDecouvrir[] = [
  {
    slug: "perso",
    href: ROUTES_DECOUVRIR.bibliotheque.perso,
    titre: "Bibliothèque personnelle",
    description: "Reste dans ton programme : Classinus y navigue et agit comme toi, toujours dans le cadre de tes documents.",
  },
  {
    slug: "publique",
    href: ROUTES_DECOUVRIR.bibliotheque.publique,
    titre: "Bibliothèque publique",
    description: "Le catalogue partagé par tous les élèves : fouille, partage, note les ressources et consulte les profils.",
  },
  {
    slug: "telephone",
    href: ROUTES_DECOUVRIR.bibliotheque.telephone,
    titre: "Dossiers du téléphone",
    description: "Sur l'appli mobile, plus besoin d'uploader tes fichiers un par un : Classinus explore tes dossiers directement.",
  },
];
