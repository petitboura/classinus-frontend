"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, MessageCircle } from "lucide-react";
import { RUBRIQUES_AIDE, trouverRubriqueAide, type RubriqueAide } from "@/lib/aideSections";

// 19/09/2026, demande Bourama : ancien écran "aide" d'EspaceParametres.tsx.
// Le lien "En savoir plus" d'une bulle infotip pointait vers
// /parametres?aide=<id> -- pointe désormais vers /parametres/aide?aide=<id>
// (voir components/BoutonInfoSection.tsx), donc cette page lit toujours ce
// même paramètre pour déplier et scroller jusqu'à la bonne rubrique.

// Une rubrique de la page "Aide et support" -- repliee par defaut,
// depliee soit au clic, soit automatiquement quand on arrive via le lien
// "En savoir plus" d'une bulle infotip (?aide=<id>). Dans ce dernier cas,
// on scrolle aussi jusqu'a elle pour qu'elle soit visible sans que
// l'utilisateur ait a chercher dans la liste.
function RubriqueAideDepliable({ rubrique, ouverte, onToggle }: { rubrique: RubriqueAide; ouverte: boolean; onToggle: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ouverte) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [ouverte]);

  return (
    <div ref={ref}>
      <button
        onClick={onToggle}
        aria-expanded={ouverte}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-dj-surface-haute"
      >
        <span className="text-sm text-dj-texte">{rubrique.titre}</span>
        <ChevronRight size={16} className={`flex-shrink-0 text-dj-texte-muet transition-transform ${ouverte ? "rotate-90" : ""}`} />
      </button>
      {ouverte && <p className="animate-dj-fade-in-rapide px-4 pb-3 text-xs leading-relaxed text-dj-texte-muet">{rubrique.texteComplet}</p>}
    </div>
  );
}

export function ParametresAide() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rubriqueAideOuverte, setRubriqueAideOuverte] = useState<string | null>(null);

  useEffect(() => {
    const idRubrique = searchParams.get("aide");
    if (idRubrique && trouverRubriqueAide(idRubrique)) {
      setRubriqueAideOuverte(idRubrique);
    }
  }, [searchParams]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-4">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 rounded-lg border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:bg-dj-surface-haute"
        >
          <MessageCircle size={16} />
          Poser une question à Classinus
        </button>
      </div>
      <div>
        <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-dj-texte-muet">À propos des sections</h3>
        <div className="divide-y divide-dj-bordure rounded-cgpt-carte border border-dj-bordure bg-dj-surface">
          {RUBRIQUES_AIDE.map((rubrique) => (
            <RubriqueAideDepliable
              key={rubrique.id}
              rubrique={rubrique}
              ouverte={rubriqueAideOuverte === rubrique.id}
              onToggle={() => setRubriqueAideOuverte((actuelle) => (actuelle === rubrique.id ? null : rubrique.id))}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
