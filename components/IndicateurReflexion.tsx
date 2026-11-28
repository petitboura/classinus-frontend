"use client";

import { useEffect, useState } from "react";
import { traduireTexteInterface } from "@/lib/i18n/interface";
import { useLocale } from "@/lib/i18n/useLocale";
import { dureeAttenteAleatoireMs, TEXTES_ATTENTE, texteAttenteSuivant } from "@/lib/messageAttente";

// Message d'attente vivant (27/11/2026, demande Bourama). Depuis le 28/11/2026 (demande Bourama), le
// texte change plus lentement (de 2 à 5 secondes, au hasard) et avec une seule animation, la même que la roue
// des outils : la nouvelle ligne monte de 5 px en apparaissant, l'ancienne monte de 5 px en
// s'estompant. Trois points sautillent toujours à la suite du texte. Aucun nom d'agent n'est affiché.

type Etape = { numero: number; texte: string };
type Etapes = { courante: Etape; precedente: Etape | null };

const DELAI_POINT_MS = 150;

function Ligne({ texte, classe, sortie }: { texte: string; classe: string; sortie: boolean }) {
  return (
    <span
      className={`absolute left-0 top-0 flex items-baseline whitespace-pre ${classe} ${
        sortie ? "motion-reduce:hidden" : "motion-reduce:animate-dj-fade-in-rapide"
      }`}
    >
      {texte}
      <span className="inline-flex">
        {[0, 1, 2].map((point) => (
          <span
            key={point}
            className="inline-block animate-cgpt-point-reflexion motion-reduce:animate-none"
            style={{ animationDelay: `${point * DELAI_POINT_MS}ms` }}
          >
            .
          </span>
        ))}
      </span>
    </span>
  );
}

export function IndicateurReflexion() {
  const locale = useLocale();
  // Vide au tout premier rendu : le tirage au hasard se fait seulement dans le
  // navigateur, pour que le serveur et le navigateur affichent la même chose.
  const [etapes, setEtapes] = useState<Etapes | null>(null);

  useEffect(() => {
    const minuteur = window.setTimeout(
      () => {
        // Le tirage se fait ici et non dans la fonction de setEtapes : elle peut être appelée deux
        // fois par React, ce qui ferait avancer le sac de deux textes pour un seul affiché.
        const texte = texteAttenteSuivant();
        setEtapes((avant) => ({
          precedente: avant?.courante ?? null,
          courante: { numero: avant ? avant.courante.numero + 1 : 0, texte },
        }));
      },
      etapes ? dureeAttenteAleatoireMs() : 0
    );
    return () => window.clearTimeout(minuteur);
  }, [etapes]);

  const courante = etapes?.courante;
  const precedente = etapes?.precedente;

  return (
    // w-full : les lignes animées sont posées en absolu et ne donnent aucune
    // largeur. Dans la colonne d'un message (items-start), le bloc se réduirait
    // à zéro et rien ne serait visible.
    <div className="my-1 w-full text-[13px] text-dj-texte-muet">
      {/* Les lecteurs d'écran entendent une seule annonce, pas chaque changement. */}
      <span role="status" className="sr-only">
        {traduireTexteInterface(TEXTES_ATTENTE[0], locale)}
      </span>
      <div aria-hidden="true" className="relative h-6 overflow-hidden leading-6">
        {precedente && (
          <Ligne
            key={`sortie-${precedente.numero}`}
            texte={traduireTexteInterface(precedente.texte, locale)}
            classe="animate-dj-roue-fondu-sortie"
            sortie
          />
        )}
        {courante && (
          <Ligne
            key={courante.numero}
            texte={traduireTexteInterface(courante.texte, locale)}
            classe={precedente ? "animate-dj-roue-fondu-entree" : "animate-dj-fade-in-rapide"}
            sortie={false}
          />
        )}
      </div>
    </div>
  );
}
