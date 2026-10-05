"use client";

// Créé le 03/10/2026 (demande Bourama) : boutons Réglages et Utilitaires du canal en
// direct, les mêmes que dans la barre de saisie du chat et partagés avec elle.
//
// - Réglages : le composant BoutonReglages du chat, tel quel. Modèle et longueur sont
//   ceux de lib/reglagesProchainMessage.ts (communs avec la barre de saisie) ; mode
//   pédagogique, mode ressources et code enseignant sont enregistrés côté serveur pour
//   la conversation, donc communs aussi (voir lib/diffusionReglagesConversation.ts).
// - Utilitaires : même liste que la barre de saisie (agent autorisé), limitée à ceux
//   que le canal sait exécuter. Les autres (formule, forcer une recherche web) n'y
//   sont pas, voir ControlesInteractionCanal.tsx.

import { useContext, useEffect, useRef, useState } from "react";
import { Check, SlidersHorizontal } from "lucide-react";
import { BoutonReglages } from "@/components/chat/barre/BoutonReglages";
import { useReglagesPedagogiques } from "@/components/chat/barre/useReglagesPedagogiques";
import { useModeActif } from "@/components/chat/barre/useModeActif";
import { ContexteChat } from "@/lib/contexteChat";
import { conversationActive } from "@/lib/conversationPartagee";
import { useOutilsRegistre } from "@/lib/outils";
import { useReglagesProchainMessage } from "@/lib/useReglagesProchainMessage";
import { definirEffortProchainMessage, definirLongueurProchainMessage, definirModeleProchainMessage } from "@/lib/reglagesProchainMessage";

const CLASSE_ROND =
  "flex h-10 w-10 items-center justify-center rounded-full border border-dj-bordure bg-dj-surface text-dj-texte-muet shadow-lg";

export function BoutonReglagesCanal({ conversationId }: { conversationId: string | null }) {
  const ctxChat = useContext(ContexteChat);
  const reglages = useReglagesProchainMessage();
  // Les messages du canal partent sur la conversation active (celle du chat quand il est à
  // l'écran, voir lib/conversationPartagee.ts), pas sur l'identifiant propre du canal. Les
  // réglages enregistrés côté serveur doivent viser cette même conversation. L'identifiant
  // du canal ne sert que de repli quand aucune conversation active n'existe.
  const conversationVisee = conversationActive() ?? conversationId;
  const pedagogie = useReglagesPedagogiques(conversationVisee ?? undefined);
  const modeActif = useModeActif(conversationVisee ?? undefined);
  return (
    <div className="flex h-10 items-center">
      <BoutonReglages
        variante="bureau"
        ancrage="gauche"
        modelesDisponibles={ctxChat?.agent?.modeles_disponibles ?? []}
        modeleSelectionne={reglages.modeleId}
        onModeleChange={definirModeleProchainMessage}
        longueur={reglages.longueur}
        onLongueurChange={definirLongueurProchainMessage}
        effort={reglages.effort}
        onEffortChange={definirEffortProchainMessage}
        eleveChoisitMode={modeActif.eleveChoisitMode}
        pedagogie={pedagogie}
        modeActif={modeActif}
      />
    </div>
  );
}

export type ActionUtilitaireCanal = { executer: () => void; occupe?: boolean };

export function BoutonUtilitairesCanal({ actions }: { actions: Record<string, ActionUtilitaireCanal> }) {
  const ctxChat = useContext(ContexteChat);
  const { outils } = useOutilsRegistre();
  const [ouvert, setOuvert] = useState(false);
  const conteneurRef = useRef<HTMLDivElement>(null);
  const autorises = ctxChat?.outilsActifsAgent?.actions_locales ?? [];
  const entrees = outils
    .filter((o) => o.onglet === "utilitaires" && o.nom in actions && autorises.includes(o.nom))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));

  useEffect(() => {
    if (!ouvert) return;
    function surClicExterieur(e: MouseEvent) {
      if (!conteneurRef.current?.contains(e.target as Node)) setOuvert(false);
    }
    document.addEventListener("mousedown", surClicExterieur);
    return () => document.removeEventListener("mousedown", surClicExterieur);
  }, [ouvert]);

  // Comme dans la barre de saisie : rien à afficher si l'agent n'autorise aucun utilitaire.
  if (entrees.length === 0) return null;

  return (
    <div ref={conteneurRef} data-agent-superposition="true" className="relative">
      <button
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        aria-label="Choisir un utilitaire"
        title="Choisir un utilitaire"
        className={`${CLASSE_ROND} transition-colors ${ouvert ? "text-dj-accent-1-texte" : "hover:text-dj-texte"}`}
      >
        <SlidersHorizontal size={18} />
      </button>
      <div
        className={
          "absolute bottom-full left-0 z-20 mb-2 max-h-64 w-56 max-w-[calc(100vw-2rem)] origin-bottom-left overflow-y-auto rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-1 shadow-lg transition-all duration-150 ease-cgpt-doux " +
          (ouvert ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-1 scale-95 opacity-0")
        }
      >
        {entrees.map(({ nom, label, Icone }) => {
          const action = actions[nom];
          return (
            <button
              key={nom}
              onClick={() => {
                setOuvert(false);
                action.executer();
              }}
              disabled={action.occupe}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-xs text-dj-texte transition-colors hover:bg-dj-surface-haute disabled:opacity-60"
            >
              <Icone size={14} />
              <span className="flex-1">{label}</span>
              {action.occupe && <Check size={13} className="opacity-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
