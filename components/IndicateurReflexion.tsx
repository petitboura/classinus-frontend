"use client";

import { useEffect, useState } from "react";
import { traduireTexteInterface } from "@/lib/i18n/interface";
import { useLocale } from "@/lib/i18n/useLocale";
import { DUREES_ATTENTE_MS, STYLES_ATTENTE, TEXTES_ATTENTE, tirerAutre } from "@/lib/messageAttente";

// Message d'attente vivant (27/11/2026, demande Bourama) : le texte change à un
// rythme irrégulier, chaque changement prend au hasard l'un des trois styles
// (roue, lettres une par une, vague), et trois points sautillent à la suite.
// Aucun nom d'agent n'est affiché.

type Style = (typeof STYLES_ATTENTE)[number];
type Etape = { numero: number; texte: string; style: Style };

const DELAI_LETTRE_MS = { roue: 0, lettres: 38, vague: 25 } as const;
const DELAI_ENTREE_VAGUE_MS = 120;
const DELAI_SORTIE_VAGUE_MS = 18;
const DELAI_REFLET_MS = 60;
const DELAI_POINT_MS = 150;

const CLASSE_ENTREE: Record<Style, string> = {
  roue: "",
  lettres: "animate-dj-lettre-apparait",
  vague: "animate-dj-vague-entree",
};

type Etapes = { courante: Etape; precedente: Etape | null };

function etapeSuivante(actuelle?: Etape): Etape {
  return {
    numero: actuelle ? actuelle.numero + 1 : 0,
    texte: tirerAutre(TEXTES_ATTENTE, actuelle?.texte),
    style: tirerAutre(STYLES_ATTENTE, actuelle?.style),
  };
}

function Ligne({ texte, style, sortie }: { texte: string; style: Style; sortie: boolean }) {
  const lettres = Array.from(texte);
  const delaiEntree = (rang: number) =>
    style === "vague" ? DELAI_ENTREE_VAGUE_MS + rang * DELAI_LETTRE_MS.vague : rang * DELAI_LETTRE_MS[style];
  // La roue déplace la ligne entière, les deux autres styles lettre par lettre.
  const classeLigne =
    style === "roue" ? (sortie ? "animate-dj-attente-roue-sortie" : "animate-dj-attente-roue-entree") : "";
  const classeLettre = sortie ? (style === "vague" ? "animate-dj-vague-sortie" : "") : CLASSE_ENTREE[style];

  return (
    <span
      className={`absolute left-0 top-0 flex items-baseline whitespace-pre ${classeLigne} ${
        sortie ? "motion-reduce:hidden" : "motion-reduce:animate-dj-fade-in-rapide"
      }`}
    >
      {lettres.map((lettre, rang) => (
        <span
          key={rang}
          className={`inline-block motion-reduce:animate-none ${classeLettre}`}
          style={{ animationDelay: `${sortie ? rang * DELAI_SORTIE_VAGUE_MS : delaiEntree(rang)}ms` }}
        >
          <span
            className="inline-block animate-dj-lettre-reflet motion-reduce:animate-none"
            style={{ animationDelay: `${rang * DELAI_REFLET_MS}ms` }}
          >
            {lettre}
          </span>
        </span>
      ))}
      <span
        className={`inline-flex motion-reduce:animate-none ${classeLettre}`}
        style={{
          animationDelay: `${sortie ? lettres.length * DELAI_SORTIE_VAGUE_MS : delaiEntree(lettres.length)}ms`,
        }}
      >
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
      () =>
        setEtapes((avant) => ({
          precedente: avant?.courante ?? null,
          courante: etapeSuivante(avant?.courante),
        })),
      etapes ? tirerAutre<number>(DUREES_ATTENTE_MS) : 0
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
        {/* Le texte sortant suit le style du texte qui arrive. En style
            lettres, il disparaît aussitôt. */}
        {precedente && courante && courante.style !== "lettres" && (
          <Ligne
            key={`sortie-${precedente.numero}`}
            texte={traduireTexteInterface(precedente.texte, locale)}
            style={courante.style}
            sortie
          />
        )}
        {courante && (
          <Ligne
            key={courante.numero}
            texte={traduireTexteInterface(courante.texte, locale)}
            style={courante.style}
            sortie={false}
          />
        )}
      </div>
    </div>
  );
}
