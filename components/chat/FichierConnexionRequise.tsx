"use client";

import { useState } from "react";
import { LogIn, File } from "lucide-react";
import { CompteRequisModal } from "@/components/CompteRequisModal";

// Fichier d'un site externe vu par un visiteur sans compte : le relais du backend
// (voir lib/useLienRelaisExterne.ts) n'est délivré qu'aux personnes connectées. Au
// lieu d'un aperçu cassé ou d'une erreur, la carte invite à se connecter ; le clic
// ouvre la fenêtre "Compte requis" de l'appli.
export function FichierConnexionRequise({
  nom,
  sousTitre,
  Icone = File,
}: {
  nom: string;
  sousTitre: string;
  Icone?: typeof File;
}) {
  const [ouverte, setOuverte] = useState(false);
  return (
    <>
      <button
        onClick={() => setOuverte(true)}
        className="my-2 flex w-fit max-w-full animate-dj-fade-in items-center gap-3 rounded-xl border border-dj-bordure bg-dj-surface px-3 py-2.5 text-left transition-colors hover:border-dj-bordure-forte"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-dj-surface-haute text-dj-texte">
          <Icone size={16} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm text-dj-texte">{nom}</span>
          <span className="block text-[11px] text-dj-texte-muet">{sousTitre}</span>
          <span className="block text-[11px] text-dj-texte-muet">Connecte-toi pour ouvrir ce fichier</span>
        </span>
        <LogIn size={14} className="ml-1 shrink-0 text-dj-texte-muet" />
      </button>
      {ouverte && (
        <CompteRequisModal texte="Crée un compte ou connecte-toi pour ouvrir ce fichier." onFerme={() => setOuverte(false)} />
      )}
    </>
  );
}
