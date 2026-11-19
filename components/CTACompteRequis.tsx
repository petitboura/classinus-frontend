"use client";

import { useState } from "react";
import { CompteRequisModal } from "@/components/CompteRequisModal";

// CTA "Crée un compte" réutilisable -- même pattern que celui déjà en
// place dans MesComportements.tsx (09/08 : "un visiteur sans session
// voit un CTA à la place de la liste, pas une liste vide silencieuse").
//
// Centralisé ici (refonte "Mon espace = l'app", section par section
// ouverte aux invités) pour ne pas dupliquer ce même bloc dans chacune
// des sections qui n'avaient jusqu'ici jamais géré de visiteur sans
// compte (Bibliothèque, Ma mémoire, Plugins, Audits, Programme, Codes) --
// ces sections étaient auparavant inatteignables sans compte (le clic
// sur "Mon espace" dans la sidebar interceptait la navigation).
export function CTACompteRequis({ texte }: { texte: string }) {
  const [ouverte, setOuverte] = useState(false);

  return (
    <div className="flex animate-dj-fade-in-rapide flex-col gap-2 rounded-xl border border-dj-bordure bg-dj-surface p-4">
      <p className="text-sm text-dj-texte-muet">{texte}</p>
      <button
        onClick={() => setOuverte(true)}
        className="self-start rounded-lg bg-dj-accent-1 px-3 py-1.5 text-xs font-bold text-[#1A0D02] transition-colors hover:bg-dj-accent-2"
      >
        Créer un compte
      </button>
      {ouverte && <CompteRequisModal texte={texte} onFerme={() => setOuverte(false)} />}
    </div>
  );
}
