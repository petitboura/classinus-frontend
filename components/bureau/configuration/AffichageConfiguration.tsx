"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import { ArrowDown, Feather, ListOrdered, Loader2, Plus, Scale, ToggleLeft, ToggleRight, UserCog } from "lucide-react";
import type { Comportement, CategorieConfiguration } from "@/lib/api";
import { lireProcedure, lireComportement } from "@/lib/formatsConfiguration";
import { texteConfiguration, texteNombreEtapes, texteAutresEtapes } from "@/lib/i18n/textesConfiguration";
import { BulleSurvol } from "@/components/BulleSurvol";
import { Skeleton } from "@/components/Skeleton";
import { ZoneCliquable } from "@/components/ZoneCliquable";

// 01/10/2026, demande Bourama : chaque catégorie a sa propre façon de
// s'afficher APRÈS création et son propre bouton d'ajout, pour que
// l'utilisateur croie à quatre choses différentes. Aucune de ces vues ne
// ressemble à la pastille des skills classiques.

type PropsElement = {
  c: Comportement;
  onOuvrir: (c: Comportement) => void;
  onToggleActif: (c: Comportement, e: MouseEvent) => void;
  // Menu des trois points propre à l'élément, construit par le parent.
  menu?: ReactNode;
};

function Bascule({ c, onToggleActif }: { c: Comportement; onToggleActif: PropsElement["onToggleActif"] }) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => onToggleActif(c, e)}
      title={texteConfiguration(c.actif ? "action.desactiver" : "action.activer")}
      className="flex flex-shrink-0 items-center text-dj-texte-muet transition-colors hover:text-dj-texte"
    >
      {c.actif ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
    </span>
  );
}

const CARTE =
  "group flex w-full flex-col gap-3 rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-4 text-left transition-colors hover:border-dj-bordure-forte hover:bg-dj-surface-haute";

// Procédure : une carte avec le nombre d'étapes et les premières étapes numérotées.
export function CarteProcedure({ c, onOuvrir, onToggleActif, menu }: PropsElement) {
  const etapes = lireProcedure(c.texte).filter(Boolean);
  const apercu = etapes.slice(0, 3);
  return (
    <ZoneCliquable onClick={() => onOuvrir(c)} title={texteConfiguration("action.ouvrir")} className={`${CARTE} ${c.actif ? "" : "opacity-50"}`}>
      <div className="flex items-center gap-2">
        <ListOrdered size={15} className="flex-shrink-0 text-dj-texte-muet" />
        <div className="min-w-0 flex-1">
          <BulleSurvol texte={c.description || c.nom} className="block truncate text-sm font-medium text-dj-texte" revelerAuClic={false}>
            {c.nom || etapes[0]}
          </BulleSurvol>
        </div>
        <span className="flex-shrink-0 rounded-full border border-dj-bordure px-2 py-0.5 text-[11px] text-dj-texte-muet">
          {texteNombreEtapes(etapes.length)}
        </span>
        <Bascule c={c} onToggleActif={onToggleActif} />
        {menu}
      </div>
      <ol className="flex flex-col gap-1.5">
        {apercu.map((e, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-dj-texte-muet">
            <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-dj-bordure text-[10px]">{i + 1}</span>
            <span className="line-clamp-1 min-w-0 flex-1 break-words">{e}</span>
          </li>
        ))}
        {etapes.length > apercu.length && <li className="pl-6 text-[11px] text-dj-texte-muet">{texteAutresEtapes(etapes.length - apercu.length)}</li>}
      </ol>
    </ZoneCliquable>
  );
}

// Règle : une simple ligne de liste, le texte de la règle lui même, sans carte.
export function LigneRegle({ c, onOuvrir, onToggleActif, menu }: PropsElement) {
  return (
    <ZoneCliquable
      onClick={() => onOuvrir(c)}
      title={texteConfiguration("action.ouvrir")}
      className={`flex w-full items-center gap-3 px-1 py-2.5 text-left transition-colors hover:bg-dj-surface-haute ${c.actif ? "" : "opacity-50"}`}
    >
      <Scale size={14} className="flex-shrink-0 text-dj-texte-muet" />
      <span className="min-w-0 flex-1 break-words text-sm text-dj-texte">{c.texte}</span>
      <Bascule c={c} onToggleActif={onToggleActif} />
        {menu}
    </ZoneCliquable>
  );
}

// Comportement : une carte avec les deux lignes "dans tel cas" puis "comporte toi ainsi".
export function CarteComportement({ c, onOuvrir, onToggleActif, menu }: PropsElement) {
  const { cas, reaction } = lireComportement(c.texte);
  return (
    <ZoneCliquable onClick={() => onOuvrir(c)} title={texteConfiguration("action.ouvrir")} className={`${CARTE} ${c.actif ? "" : "opacity-50"}`}>
      <div className="flex items-center gap-2">
        <UserCog size={15} className="flex-shrink-0 text-dj-texte-muet" />
        <div className="min-w-0 flex-1">
          <BulleSurvol texte={c.description || c.nom} className="block truncate text-sm font-medium text-dj-texte" revelerAuClic={false}>
            {c.nom || cas || reaction}
          </BulleSurvol>
        </div>
        <Bascule c={c} onToggleActif={onToggleActif} />
        {menu}
      </div>
      {cas && (
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-dj-texte-muet">{texteConfiguration("comportement.cas.libelle")}</span>
          <span className="line-clamp-2 break-words text-sm text-dj-texte">{cas}</span>
        </div>
      )}
      {cas && <ArrowDown size={14} className="text-dj-texte-muet" />}
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-dj-texte-muet">{texteConfiguration("comportement.reaction.libelle")}</span>
        <span className="line-clamp-3 break-words text-sm text-dj-texte">{reaction}</span>
      </div>
    </ZoneCliquable>
  );
}

// Style : une carte avec un extrait entre guillemets, en police de lecture.
export function CarteStyle({ c, onOuvrir, onToggleActif, menu }: PropsElement) {
  return (
    <ZoneCliquable onClick={() => onOuvrir(c)} title={texteConfiguration("action.ouvrir")} className={`${CARTE} ${c.actif ? "" : "opacity-50"}`}>
      <div className="flex items-center gap-2">
        <Feather size={15} className="flex-shrink-0 text-dj-texte-muet" />
        <div className="min-w-0 flex-1">
          <BulleSurvol texte={c.description || c.nom} className="block truncate text-sm font-medium text-dj-texte" revelerAuClic={false}>
            {c.nom || c.texte}
          </BulleSurvol>
        </div>
        <Bascule c={c} onToggleActif={onToggleActif} />
        {menu}
      </div>
      <blockquote className="line-clamp-4 break-words border-l-2 border-dj-bordure-forte pl-3 font-lecture text-sm italic text-dj-texte-muet">
        « {c.texte} »
      </blockquote>
    </ZoneCliquable>
  );
}

// Boutons d'ajout : quatre formes différentes.

export function AjoutProcedure({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex min-h-[132px] flex-col items-center justify-center gap-2 rounded-cgpt-carte border-2 border-dashed border-dj-bordure text-sm text-dj-texte-muet transition-colors hover:border-dj-bordure-forte hover:text-dj-texte"
    >
      <ListOrdered size={22} />
      {texteConfiguration("bouton.nouveau.procedure")}
    </button>
  );
}

export function AjoutComportement({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-cgpt-carte border border-dj-bordure bg-dj-surface px-4 py-3 text-left text-sm font-medium text-dj-texte transition-colors hover:border-dj-bordure-forte hover:bg-dj-surface-haute"
    >
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-dj-bordure text-dj-texte-muet">
        <UserCog size={16} />
      </span>
      <span className="flex-1">{texteConfiguration("bouton.nouveau.comportement")}</span>
      <Plus size={16} className="text-dj-texte-muet" />
    </button>
  );
}

export function AjoutStyle({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-fit items-center gap-2 rounded-full border border-dj-bordure bg-dj-surface py-1.5 pl-1.5 pr-4 text-sm font-medium text-dj-texte transition-colors hover:border-dj-bordure-forte hover:bg-dj-surface-haute"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-dj-surface-haute text-dj-texte-muet">
        <Feather size={14} />
      </span>
      {texteConfiguration("bouton.nouveau.style")}
    </button>
  );
}

// Règle : pas de bouton qui ouvre un panneau, un champ directement dans la liste.
export function AjoutRegle({ onAjouter }: { onAjouter: (texte: string) => Promise<boolean> }) {
  const [texte, setTexte] = useState("");
  const [enCours, setEnCours] = useState(false);

  async function valider() {
    const propre = texte.trim();
    if (!propre || enCours) return;
    setEnCours(true);
    try {
      if (await onAjouter(propre)) setTexte("");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            valider();
          }
        }}
        placeholder={texteConfiguration("regle.ajout.placeholder")}
        className="min-w-0 flex-1 rounded-cgpt-carte border border-dj-bordure bg-dj-surface-haute px-4 py-2.5 text-sm text-dj-texte outline-none transition-colors focus:border-dj-bordure-forte"
      />
      <button
        onClick={valider}
        disabled={enCours || !texte.trim()}
        className="flex flex-shrink-0 items-center gap-1.5 rounded-cgpt-carte border border-dj-bordure px-3 py-2.5 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte disabled:opacity-50"
      >
        {enCours ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        {texteConfiguration("regle.ajout.bouton")}
      </button>
    </div>
  );
}

// Squelettes de chargement : même forme que l'affichage final de chaque
// catégorie, pour qu'il n'y ait aucun saut quand le contenu arrive.
export function SqueletteConfiguration({ categorie }: { categorie: CategorieConfiguration }) {
  if (categorie === "regle") {
    return (
      <div className="flex flex-col gap-3" aria-hidden>
        <Skeleton className="h-10 w-full rounded-cgpt-carte border border-dj-bordure" />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8 w-full rounded-md" style={{ animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
    );
  }
  if (categorie === "comportement") {
    return (
      <div className="flex flex-col gap-3" aria-hidden>
        <Skeleton className="h-14 w-full rounded-cgpt-carte border border-dj-bordure" />
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-36 w-full rounded-cgpt-carte border border-dj-bordure" style={{ animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
    );
  }
  if (categorie === "style") {
    return (
      <div className="flex flex-col gap-4" aria-hidden>
        <Skeleton className="h-10 w-44 rounded-full border border-dj-bordure" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-32 rounded-cgpt-carte border border-dj-bordure" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2" aria-hidden>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-36 rounded-cgpt-carte border border-dj-bordure" style={{ animationDelay: `${i * 60}ms` }} />
      ))}
    </div>
  );
}
