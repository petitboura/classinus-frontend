"use client";

import { Monitor, Sun, Moon } from "lucide-react";
import { useTheme, type ChoixTheme } from "@/lib/useTheme";
import { TRAIT_ICONE_RAIL } from "@/lib/styleBarreLaterale";

// 17/08 (v2, thème clair/sombre) -- un seul bouton qui cycle Système ->
// Clair -> Sombre -> Système, plutôt qu'un sélecteur à 3 options séparées
// (pas la place dans la sidebar repliée, qui n'a qu'une colonne d'icônes
// de 40px). Même pattern visuel que le bouton Se déconnecter juste
// en-dessous (icône dans un carré 40x40 + LibelleRail).
const ORDRE: ChoixTheme[] = ["systeme", "clair", "sombre"];
const ICONES = { systeme: Monitor, clair: Sun, sombre: Moon };
const LIBELLES = { systeme: "Thème : système", clair: "Thème : clair", sombre: "Thème : sombre" };

export function ThemeToggle({
  LibelleRail,
  ouverte,
  mobile = false,
}: {
  LibelleRail: React.ComponentType<{ ouverte: boolean; children: React.ReactNode }>;
  ouverte: boolean;
  mobile?: boolean;
}) {
  const { choix, changerTheme } = useTheme();
  const Icone = ICONES[choix];

  const suivant = () => {
    const i = ORDRE.indexOf(choix);
    changerTheme(ORDRE[(i + 1) % ORDRE.length]);
  };

  return (
    <button
      onClick={suivant}
      aria-label={LIBELLES[choix]}
      className={`group mt-2 flex w-full items-center gap-2 rounded-xl text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte ${
        mobile ? "px-2" : ""
      }`}
    >
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
        <Icone size={18} strokeWidth={TRAIT_ICONE_RAIL} className="transition-transform duration-200 group-hover:scale-110" />
      </span>
      {mobile ? (
        <span className="text-sm">{LIBELLES[choix]}</span>
      ) : (
        <LibelleRail ouverte={ouverte}>{LIBELLES[choix]}</LibelleRail>
      )}
    </button>
  );
}
