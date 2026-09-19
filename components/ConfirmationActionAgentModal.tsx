"use client";

// Chantier E (agent applicatif, voir plan-agent-applicatif-clovis.md).
// Rendu de la fenêtre de confirmation, pilotée par
// lib/contexteConfirmationAction.tsx. Reprend la même convention que
// CompteRequisModal.tsx : ouverture animée / fermeture instantanée via
// useFermetureAnimee, fermeture au clavier (Echap = refus, jamais une
// acceptation implicite).

import { useEffect } from "react";
import { Bouton } from "@/components/Bouton";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import { useConfirmationAction } from "@/lib/contexteConfirmationAction";

export function ConfirmationActionAgentModal() {
  const { demandeEnCours, repondre } = useConfirmationAction();
  const { enSortie, demarrerFermeture } = useFermetureAnimee();

  const refuser = () => demarrerFermeture(() => repondre(false));
  const accepter = () => demarrerFermeture(() => repondre(true));

  useEffect(() => {
    if (!demandeEnCours) return;
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") refuser();
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demandeEnCours]);

  if (!demandeEnCours) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4">
      <div
        className={`w-full max-w-sm rounded-cgpt-carte bg-dj-surface p-6 shadow-xl ${
          enSortie ? "" : "animate-cgpt-entree-modal"
        }`}
      >
        <p className="text-sm font-semibold text-dj-texte">Classinus veut effectuer une action</p>
        <p className="mt-2 text-sm text-dj-texte-muet">{demandeEnCours.description}</p>
        <div className="mt-5 flex justify-end gap-3">
          <Bouton variante="fantome" onClick={refuser}>
            Refuser
          </Bouton>
          <Bouton variante="primaire" onClick={accepter}>
            Autoriser
          </Bouton>
        </div>
      </div>
    </div>
  );
}
