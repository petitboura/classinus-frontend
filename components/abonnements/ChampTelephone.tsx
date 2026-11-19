"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Globe } from "lucide-react";
import { FlottantAncre } from "@/components/FlottantAncre";
import { nomDuPays } from "@/lib/listeAttente";
import {
  PAYS_TELEPHONE,
  drapeauDuPays,
  nettoyerSaisie,
  numeroApresChoixPays,
  paysDepuisNumero,
  paysParCode,
} from "@/lib/paysTelephone";
import type { CoteFlottant } from "@/lib/placementFlottant";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";

// Champ de numéro de téléphone façon formulaire classique (19/11/2026, demande de Bourama) : un sélecteur
// de pays (drapeau et indicatif) à gauche, la zone du numéro à droite. Choisir un pays met son indicatif
// dans le numéro ; écrire un indicatif (+221...) fait apparaître le pays tout seul. Les pays et leurs
// indicatifs sont dans lib/paysTelephone.ts. La liste s'ouvre avec FlottantAncre et ne contient aucun
// <select> natif (règle du dépôt, voir CLAUDE.md).

const COTES_LISTE: CoteFlottant[] = ["bas", "haut"];

export function ChampTelephone({
  locale,
  pays,
  onPays,
  numero,
  onNumero,
  libellePays,
}: {
  locale: string;
  /** Code du pays choisi (ex. "SN"), ou "" tant qu'aucun pays n'est reconnu. */
  pays: string;
  onPays: (code: string) => void;
  /** Numéro complet, indicatif compris (ex. "+221 771234567"). */
  numero: string;
  onNumero: (valeur: string) => void;
  /** Texte lu par les lecteurs d'écran pour le sélecteur de pays. */
  libellePays: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const ancreRef = useRef<HTMLDivElement>(null);
  const listeRef = useRef<HTMLDivElement | null>(null);
  const saisieRef = useRef<HTMLInputElement>(null);
  const { enSortie, demarrerFermeture } = useFermetureAnimee();
  const fermer = () => demarrerFermeture(() => setOuvert(false));

  const ouvertRef = useRef(ouvert);
  useEffect(() => {
    ouvertRef.current = ouvert;
  }, [ouvert]);

  useEffect(() => {
    function surClicExterieur(e: MouseEvent) {
      if (!ouvertRef.current) return;
      const cible = e.target as Node;
      if (ancreRef.current?.contains(cible) || listeRef.current?.contains(cible)) return;
      fermer();
    }
    document.addEventListener("mousedown", surClicExterieur);
    return () => document.removeEventListener("mousedown", surClicExterieur);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fermer est stable via demarrerFermeture, l'état ouvert est lu via ouvertRef
  }, []);

  const options = useMemo(
    () =>
      PAYS_TELEPHONE.map((p) => ({ ...p, nom: nomDuPays(p.code, locale) })).sort((a, b) =>
        a.nom.localeCompare(b.nom, locale),
      ),
    [locale],
  );

  const choisi = paysParCode(pays);

  function choisirPays(code: string) {
    onNumero(numeroApresChoixPays(numero, pays, code));
    onPays(code);
    fermer();
    saisieRef.current?.focus();
  }

  function surSaisie(brut: string) {
    let valeur = nettoyerSaisie(brut);
    // Un numéro tapé sans + : avec un pays choisi, c'est la suite de son indicatif ; sans pays, c'est un
    // indicatif international qu'on laisse commencer par +.
    if (valeur !== "" && !valeur.startsWith("+")) {
      valeur = choisi ? `+${choisi.indicatif} ${valeur}` : `+${valeur}`;
    }
    onNumero(valeur);
    if (valeur.startsWith("+")) onPays(paysDepuisNumero(valeur, pays)?.code ?? "");
  }

  return (
    <div ref={ancreRef} className="relative">
      <div className="flex items-stretch rounded-lg border border-dj-bordure bg-dj-surface transition-colors focus-within:border-dj-accent-1">
        <button
          type="button"
          aria-label={libellePays}
          aria-haspopup="listbox"
          aria-expanded={ouvert}
          onClick={() => (ouvert ? fermer() : setOuvert(true))}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-l-lg border-r border-dj-bordure px-3 py-2.5 text-base text-dj-texte transition-colors hover:bg-dj-surface-haute"
        >
          {choisi ? (
            <>
              <span aria-hidden className="text-lg leading-none">
                {drapeauDuPays(choisi.code)}
              </span>
              <span>+{choisi.indicatif}</span>
            </>
          ) : (
            <Globe size={18} className="text-dj-texte-muet" />
          )}
          <ChevronDown size={14} className="text-dj-texte-muet" />
        </button>
        <input
          ref={saisieRef}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={32}
          value={numero}
          onChange={(e) => surSaisie(e.target.value)}
          className="min-w-0 flex-1 rounded-r-lg bg-transparent px-3 py-2.5 text-base text-dj-texte outline-none"
        />
      </div>

      {(ouvert || enSortie) && (
        <FlottantAncre
          ancreRef={ancreRef}
          innerRef={listeRef}
          cotes={COTES_LISTE}
          memeLargeurQueAncre
          role="listbox"
          className={`max-h-64 rounded-lg border border-dj-bordure bg-dj-surface-haute p-1 shadow-lg ${
            enSortie ? "animate-cgpt-sortie-modal" : "animate-cgpt-entree-modal"
          }`}
        >
          {options.map((o) => (
            <button
              key={o.code}
              type="button"
              role="option"
              aria-selected={o.code === pays}
              onClick={() => choisirPays(o.code)}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-dj-surface ${
                o.code === pays ? "text-dj-accent-1-texte" : "text-dj-texte"
              }`}
            >
              <span aria-hidden className="text-base leading-none">
                {drapeauDuPays(o.code)}
              </span>
              <span className="min-w-0 flex-1 truncate">{o.nom}</span>
              <span className="flex-shrink-0 text-xs text-dj-texte-muet">+{o.indicatif}</span>
            </button>
          ))}
        </FlottantAncre>
      )}
    </div>
  );
}
