"use client";

import { useOuvrirChatAvecTexte } from "@/lib/contexteChat";

type Suggestion = {
  id: string;
  label: string;
  message: string;
  appareil: "tous" | "pc" | "telephone";
};

const SUGGESTIONS: Suggestion[] = [
  {
    id: "pdf-livres",
    label: "Trouver des livres et PDF",
    message: "Recherche des livres, articles et PDF sur ce sujet dans les bibliothèques en ligne de Classinus, puis présente-moi les sources et les liens accessibles.",
    appareil: "tous",
  },
  {
    id: "fiches",
    label: "Créer une fiche de révision",
    message: "À partir du cours ou du document que je te donne, crée une fiche de révision structurée et claire, puis prépare-la dans un format téléchargeable adapté.",
    appareil: "tous",
  },
  {
    id: "qcm",
    label: "Me tester avec un QCM",
    message: "Crée un QCM interactif à partir de mon cours. Laisse-moi répondre aux questions, puis affiche la correction avec une explication pour chaque réponse.",
    appareil: "tous",
  },
  {
    id: "configuration",
    label: "Configurer Classinus",
    message: "Aide-moi à créer une configuration personnelle pour Classinus avec des règles, procédures et un style de réponse adaptés à ma façon de travailler.",
    appareil: "tous",
  },
  {
    id: "minuteur",
    label: "Lancer une session de concentration",
    message: "Aide-moi à préparer une session de concentration avec un minuteur et une durée adaptée à mon travail, puis indique-moi comment activer le contrôle de session disponible dans Classinus.",
    appareil: "tous",
  },
  {
    id: "animations",
    label: "Créer une animation MP4",
    message: "Crée une animation pédagogique pour visualiser cette notion, avec des commandes de lecture, puis prépare-la en vidéo MP4 téléchargeable.",
    appareil: "pc",
  },
  {
    id: "python",
    label: "Exécuter du Python dans le chat",
    message: "Prépare un exemple Python lié à mon problème et exécute-le directement dans le chat si le code est pris en charge. Montre-moi le résultat et explique ce qu'il démontre.",
    appareil: "pc",
  },
  {
    id: "dossier-telephone",
    label: "Retrouver un fichier sur mon téléphone",
    message: "Aide-moi à retrouver un document dans les dossiers de mon téléphone auxquels j'ai autorisé Classinus à accéder.",
    appareil: "telephone",
  },
  {
    id: "temps-ecran",
    label: "Consulter mon temps d'écran",
    message: "Aide-moi à consulter mon temps d'écran sur Android et à comprendre quelles applications prennent le plus de temps.",
    appareil: "telephone",
  },
  {
    id: "ne-pas-deranger",
    label: "Préparer le mode Ne pas déranger",
    message: "Aide-moi à configurer une session de concentration sur mon téléphone et à activer Ne pas déranger pendant la durée choisie.",
    appareil: "telephone",
  },
];

function CarteSuggestion({
  suggestion,
  onChoisir,
}: {
  suggestion: Suggestion;
  onChoisir: (message: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChoisir(suggestion.message)}
      className="shrink-0 rounded-full border border-dj-bordure bg-dj-surface px-3.5 py-2 text-sm text-dj-texte-muet transition-colors hover:border-dj-bordure-forte hover:text-dj-texte focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dj-accent"
      aria-label={`Préparer le message : ${suggestion.label}`}
    >
      {suggestion.label}
    </button>
  );
}

export function SuggestionsCapacitesChat() {
  const ouvrirChatAvecTexte = useOuvrirChatAvecTexte();
  const pc = SUGGESTIONS.filter((s) => s.appareil === "tous" || s.appareil === "pc");
  const telephone = SUGGESTIONS.filter((s) => s.appareil === "tous" || s.appareil === "telephone");

  return (
    <section aria-label="Exemples de demandes Classinus" className="w-full min-w-0">
      <p className="mb-2 text-center text-xs text-dj-texte-muet">Essaie une fonction de Classinus</p>

      <div className="relative hidden w-full overflow-hidden md:block">
        <div
          className="flex w-max gap-2 py-1 [animation:classinus-suggestions-defilement_42s_linear_infinite] hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]"
          style={{
            maskImage: "linear-gradient(to right, transparent, black 4%, black 96%, transparent)",
            WebkitMaskImage: "linear-gradient(to right, transparent, black 4%, black 96%, transparent)",
          }}
        >
          {[...pc, ...pc].map((suggestion, index) => (
            <CarteSuggestion
              key={`${suggestion.id}-${index}`}
              suggestion={suggestion}
              onChoisir={ouvrirChatAvecTexte}
            />
          ))}
        </div>
      </div>

      <div
        className="relative w-full overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden"
        style={{
          maskImage: "linear-gradient(to right, transparent, black 5%, black 95%, transparent)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 5%, black 95%, transparent)",
        }}
      >
        <div className="flex w-max gap-2 py-1 [animation:classinus-suggestions-defilement-mobile_36s_linear_infinite] hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]">
          {[...telephone, ...telephone].map((suggestion, index) => (
            <CarteSuggestion
              key={`${suggestion.id}-mobile-${index}`}
              suggestion={suggestion}
              onChoisir={ouvrirChatAvecTexte}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes classinus-suggestions-defilement {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes classinus-suggestions-defilement-mobile {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          div[class*="classinus-suggestions-defilement"] { animation: none; }
        }
      `}</style>
    </section>
  );
}
