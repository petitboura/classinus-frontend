"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Globe } from "lucide-react";
import { DrapeauPays } from "@/components/abonnements/DrapeauPays";
import { FlottantAncre } from "@/components/FlottantAncre";
import { nomDuPays } from "@/lib/listeAttente";
import {
  PAYS_TELEPHONE,
  affichageIndicatif,
  nettoyerSaisie,
  numeroApresChoixPays,
  partieLocale,
  paysDepuisNumero,
  paysParCode,
} from "@/lib/paysTelephone";
import type { CoteFlottant } from "@/lib/placementFlottant";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";

// Champ de numéro de téléphone façon formulaire classique (19/11/2026, demande de Bourama) : un sélecteur
// de pays (drapeau et indicatif) à gauche, la zone du numéro à droite. L'indicatif ne se lit qu'une fois,
// dans le sélecteur : la zone ne montre que le numéro. Choisir un pays met son indicatif dans le numéro
// complet gardé par le parent ; écrire un indicatif (+221...) dans la zone fait apparaître le pays tout
// seul et l'indicatif passe dans le sélecteur. Les pays et leurs indicatifs sont dans lib/paysTelephone.ts. La liste s'ouvre avec FlottantAncre et ne contient aucun
// <select> natif (règle du dépôt, voir CLAUDE.md).

const COTES_LISTE: CoteFlottant[] = ["bas", "haut"];

function sansAccents(texte: string): string {
  return texte.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

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

  const [recherche, setRecherche] = useState("");
  const rechercheRef = useRef<HTMLInputElement>(null);

  // Le nom est cherché en français et en anglais, sans accents ni majuscules, et l'indicatif aussi.
  const options = useMemo(
    () =>
      PAYS_TELEPHONE.map((p) => ({
        ...p,
        nom: nomDuPays(p.code, locale),
        cherche: sansAccents(`${nomDuPays(p.code, "fr")} ${nomDuPays(p.code, "en")} ${affichageIndicatif(p)} +${p.indicatif}`),
      })).sort((a, b) => a.nom.localeCompare(b.nom, locale)),
    [locale],
  );
  const visibles = useMemo(() => {
    const q = sansAccents(recherche.trim());
    return q === "" ? options : options.filter((o) => o.cherche.includes(q));
  }, [options, recherche]);

  // La zone de recherche prend le curseur à l'ouverture de la liste, pour pouvoir écrire tout de suite.
  useEffect(() => {
    if (ouvert) rechercheRef.current?.focus();
  }, [ouvert]);

  const choisi = paysParCode(pays);

  function ouvrirListe() {
    setRecherche("");
    setOuvert(true);
  }

  function choisirPays(code: string) {
    onNumero(numeroApresChoixPays(numero, pays, code));
    onPays(code);
    fermer();
    saisieRef.current?.focus();
  }

  // La zone ne montre que le numéro : l'indicatif du pays choisi est déjà dans le sélecteur.
  const affiche = choisi ? (partieLocale(numero, choisi.indicatif) ?? numero) : numero;

  function surSaisie(brut: string) {
    const saisie = nettoyerSaisie(brut);
    if (choisi && !saisie.startsWith("+")) {
      // Un numéro tapé avec un pays choisi : c'est la suite de son indicatif.
      onNumero(`+${choisi.indicatif} ${saisie}`);
      return;
    }
    // Sans pays choisi, des chiffres seuls sont un indicatif international qu'on laisse commencer par +.
    const international = saisie === "" || saisie.startsWith("+") ? saisie : `+${saisie}`;
    if (international === "") {
      onNumero("");
      onPays("");
      return;
    }
    const trouve = paysDepuisNumero(international, pays);
    const local = trouve ? partieLocale(international, trouve.indicatif) : null;
    onNumero(trouve && local !== null ? `+${trouve.indicatif} ${local}` : international);
    onPays(trouve?.code ?? "");
  }

  return (
    <div ref={ancreRef} className="relative">
      <div className="flex items-stretch rounded-lg border border-dj-bordure bg-dj-surface transition-colors focus-within:border-dj-accent-1">
        <button
          type="button"
          aria-label={libellePays}
          aria-haspopup="listbox"
          aria-expanded={ouvert}
          onClick={() => (ouvert ? fermer() : ouvrirListe())}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-l-lg border-r border-dj-bordure px-3 py-2.5 text-base text-dj-texte transition-colors hover:bg-dj-surface-haute"
        >
          {choisi ? (
            <>
              <DrapeauPays code={choisi.code} />
              <span>{affichageIndicatif(choisi)}</span>
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
          value={affiche}
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
          <input
            ref={rechercheRef}
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && visibles.length > 0) {
                e.preventDefault();
                choisirPays(visibles[0].code);
              } else if (e.key === "Escape") {
                // Échap ferme seulement la liste, pas toute la fenêtre de paiement.
                e.stopPropagation();
                fermer();
              }
            }}
            placeholder={libellePays}
            aria-label={libellePays}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="sticky top-0 z-10 mb-1 w-full rounded-md border border-dj-bordure bg-dj-surface px-2.5 py-1.5 text-base text-dj-texte outline-none transition-colors placeholder:text-dj-texte-muet focus:border-dj-accent-1"
          />
          {visibles.map((o) => (
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
              <DrapeauPays code={o.code} />
              <span className="min-w-0 flex-1 truncate">{o.nom}</span>
              <span className="flex-shrink-0 text-xs text-dj-texte-muet">{affichageIndicatif(o)}</span>
            </button>
          ))}
        </FlottantAncre>
      )}
    </div>
  );
}
