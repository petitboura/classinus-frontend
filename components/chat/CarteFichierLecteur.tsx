"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { ouvrirDansLecteur, useFichierOuvert, type ContenuLecteur } from "@/lib/lecteurLateral";

// Carte d'un fichier ouvrable dans le lecteur à côté du chat. Même gabarit que la
// puce repliée de BlocExpansible.tsx. Tant que ce fichier est celui affiché dans
// le lecteur, la ligne du dessous l'indique ("Ouvert à droite").
//
// Partagée par les fichiers du chat (FichierChip.tsx), le code (FichierCode.tsx) et
// les notes de la bibliothèque (NoteTexteChip.tsx) : une seule carte, un seul aspect.
export function CarteFichierLecteur({
  nom,
  sousTitre,
  Icone,
  contenu,
}: {
  nom: string;
  sousTitre: string;
  Icone: LucideIcon;
  contenu: ContenuLecteur;
}) {
  const ouvert = useFichierOuvert(contenu.id);
  return (
    <button
      type="button"
      onClick={() => ouvrirDansLecteur(contenu)}
      aria-pressed={ouvert}
      className="my-2 flex w-full max-w-sm animate-dj-fade-in items-center gap-3 rounded-xl border border-dj-bordure bg-dj-surface p-3 text-left transition-colors hover:border-dj-bordure-forte"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-dj-surface-haute text-dj-texte">
        <Icone size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-dj-texte">{nom}</span>
        <span
          className={`block text-[11px] transition-colors duration-200 ${
            ouvert ? "text-dj-accent-1-texte" : "uppercase text-dj-texte-muet"
          }`}
        >
          {ouvert ? "Ouvert à droite" : sousTitre}
        </span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-dj-texte-muet" />
    </button>
  );
}
