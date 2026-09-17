"use client";

import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CompteRequisModal } from "@/components/CompteRequisModal";

// 16/09/2026, demande Bourama : sur les pages publiques (fichier/dossier
// partagés), il faut aussi une suggestion "créer un compte" : mais en
// suggestion seulement, jamais en blocage de ce qui ne dépend pas d'un
// compte (voir la page elle-même, le téléchargement : ça reste ouvert à
// tout visiteur). Seul ce qui dépend réellement d'un compte (Ajouter à
// ma bibliothèque, Activer une skill) continue de le demander au moment
// de l'action : inchangé, voir CTACompteRequis dans ActionsFichierPublic/
// ActionsDossierPublic/ActionsSkillPublic.
//
// Différence avec CTACompteRequis : celui-ci REMPLACE tout un bloc quand
// une action a échoué faute de compte (409/401 déjà survenu). Celui-ci
// est une simple ligne discrète, affichée par anticipation dès qu'on sait
// que le visiteur n'est pas connecté (véritable check de session, pas une
// erreur), à côté du contenu : jamais à sa place.
export function SuggestionCompte({ texte }: { texte: string }) {
  const [connecte, setConnecte] = useState<boolean | null>(null);
  const [ouverte, setOuverte] = useState(false);

  useEffect(() => {
    let annule = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!annule) setConnecte(!!session);
    });
    return () => {
      annule = true;
    };
  }, []);

  if (connecte !== false) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-dj-bordure bg-dj-surface-haute px-3.5 py-2.5">
      <p className="text-xs text-dj-texte-muet">{texte}</p>
      <button
        onClick={() => setOuverte(true)}
        className="flex flex-shrink-0 items-center gap-1 rounded-lg bg-dj-accent-1 px-2.5 py-1 text-xs font-semibold text-[#1a0f06] transition-colors hover:bg-dj-accent-2"
      >
        <UserPlus size={12} />
        Créer un compte
      </button>
      {ouverte && <CompteRequisModal texte={texte} onFerme={() => setOuverte(false)} />}
    </div>
  );
}
