import { UserRound, SlidersHorizontal, Lock, HelpCircle, Info, Smartphone, Accessibility } from "lucide-react";
import { ROUTES_PARAMETRES } from "./routesParametres";
import { construireGroupe, type SectionDeGroupe } from "./groupeSections";

// 19/09/2026, demande Bourama : Paramètres fonctionne comme Personnaliser
// Clovis/Bibliothèque/Bureau/Concentration (voir lib/routesParametres.ts et
// lib/groupeSections.tsx). Ne couvre que les 7 écrans de contenu -- Exporter
// mes données / Se déconnecter / Supprimer mon compte restent des actions
// sur la page d'accueil (components/ParametresAccueil.tsx), pas des pages.
export const SECTIONS_PARAMETRES: SectionDeGroupe[] = [
  {
    href: ROUTES_PARAMETRES.profil,
    label: "Profil",
    description: "Photo, nom, bio et âge",
    Icone: UserRound,
  },
  {
    href: ROUTES_PARAMETRES.preferences,
    label: "Préférences",
    description: "Thème et relances proactives de Classinus",
    Icone: SlidersHorizontal,
  },
  {
    href: ROUTES_PARAMETRES.confidentialite,
    label: "Confidentialité et sécurité",
    description: "Changer le mot de passe de ton compte",
    Icone: Lock,
  },
  {
    href: ROUTES_PARAMETRES.aide,
    label: "Aide et support",
    description: "Poser une question à Classinus et comprendre chaque section",
    Icone: HelpCircle,
  },
  {
    href: ROUTES_PARAMETRES.aPropos,
    label: "À propos",
    description: "CGU, droit d'auteur, politique de confidentialité",
    Icone: Info,
  },
  {
    href: ROUTES_PARAMETRES.capacitesTelephone,
    label: "Capacités du téléphone",
    description: "Connecteur Notion, mise à jour, nom de l'appareil",
    Icone: Smartphone,
  },
  {
    href: ROUTES_PARAMETRES.accessibilite,
    label: "Accessibilité",
    description: "Autoriser Classinus à lire et agir dans les apps choisies",
    Icone: Accessibility,
  },
];

// Valeur à passer au prop `groupe` de SectionPage sur chaque page fille.
export function groupeParametres() {
  return construireGroupe("Paramètres", ROUTES_PARAMETRES.accueil, SECTIONS_PARAMETRES);
}
