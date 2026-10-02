"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Lock, X, Sparkles, AlignLeft, GraduationCap, BookOpen, KeyRound } from "lucide-react";
import { LigneReglage } from "./LigneReglage";
import {
  type LongueurReponse,
  NIVEAUX_LONGUEUR,
  LABELS_LONGUEUR,
  PERSONAS,
  MODES_SOURCE,
  ORDRE_DISTRIBUTEURS_AFFICHAGE,
  LABELS_DISTRIBUTEUR,
} from "./reglagesReponse";
import type { EtatModeActif } from "./useModeActif";
import type { EtatReglagesPedagogiques } from "./useReglagesPedagogiques";

type LigneId = "modele" | "longueur" | "persona" | "source" | "code";

// Un choix d'une ligne dépliée : le choix actuel est marqué d'une coche et de
// la couleur d'accent.
function Choix({
  actif,
  onClick,
  grand,
  desactive = false,
  sous,
  children,
}: {
  actif: boolean;
  onClick: () => void;
  grand: boolean;
  desactive?: boolean;
  sous?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desactive}
      aria-pressed={actif}
      className={
        "flex w-full items-center justify-between gap-2 rounded-xl text-left transition-colors hover:bg-dj-surface-haute disabled:cursor-not-allowed disabled:opacity-60 " +
        (grand ? "px-3 py-2.5 text-sm " : "px-2 py-1.5 text-xs ") +
        (actif ? "text-dj-accent-1-texte" : "text-dj-texte")
      }
    >
      <span className="min-w-0">
        <span className="block truncate">{children}</span>
        {sous && <span className="block truncate text-xs text-dj-texte-muet">{sous}</span>}
      </span>
      {actif && <Check size={grand ? 14 : 13} className="flex-shrink-0" />}
    </button>
  );
}

/**
 * Bouton "Réglages" de la barre de saisie (01/10/2026, refonte de la barre) :
 * un seul bouton qui regroupe tous les réglages de réponse. Au clic il ouvre
 * une liste de lignes (Modèle, Longueur de réponse, Mode pédagogique, Modes
 * ressources, Code enseignant), chacune avec son icône. Une ligne déplie ses
 * choix juste en dessous, avec le choix actuel marqué. Une seule ligne est
 * dépliée à la fois : en ouvrir une replie l'autre.
 *
 * Sur PC une ligne se déplie au survol ET au clic. Sur mobile, au simple
 * appui. Le raccourci clavier "/" (champ vide, PC) ouvre directement le
 * bouton, sans déplier de ligne.
 *
 * Deux instances existent dans BarreDeSaisie (variante "bureau" et "mobile",
 * une seule visible selon la largeur d'écran) : chacune garde son propre état
 * d'ouverture, mais toutes les valeurs viennent du parent, donc restent
 * synchronisées.
 */
export function BoutonReglages({
  variante,
  modelesDisponibles,
  modeleSelectionne,
  onModeleChange,
  longueur,
  onLongueurChange,
  eleveChoisitMode,
  pedagogie,
  modeActif,
}: {
  variante: "bureau" | "mobile";
  modelesDisponibles: { modele_id: string; label: string; distributeur: string; palier: string }[];
  modeleSelectionne: string | null;
  onModeleChange?: (modeleId: string | null) => void;
  longueur: LongueurReponse;
  onLongueurChange: (valeur: LongueurReponse) => void;
  // Faux quand l'enseignant a décoché "l'élève peut choisir son mode".
  eleveChoisitMode: boolean;
  pedagogie: EtatReglagesPedagogiques;
  modeActif: EtatModeActif;
}) {
  const mobile = variante === "mobile";
  const [ouvert, setOuvert] = useState(false);
  const [ligneOuverte, setLigneOuverte] = useState<LigneId | null>(null);
  const boutonRef = useRef<HTMLButtonElement>(null);
  const panneauRef = useRef<HTMLDivElement>(null);
  // Ligne dépliée par le survol de la souris : le clic qui suit ne doit pas la
  // replier aussitôt (le survol l'a déjà ouverte).
  const ouverteParSurvolRef = useRef<LigneId | null>(null);

  const afficherModele = modelesDisponibles.length > 0;
  const afficherPersona = eleveChoisitMode;
  const afficherCode = !modeActif.chargement && modeActif.rattachements.length > 0;

  // Tout repli du panneau referme aussi la ligne dépliée.
  useEffect(() => {
    if (!ouvert) {
      setLigneOuverte(null);
      ouverteParSurvolRef.current = null;
    }
  }, [ouvert]);

  // Fermeture au clic extérieur et à la touche Echap.
  useEffect(() => {
    if (!ouvert) return;
    function gererClicExterieur(e: MouseEvent) {
      const cible = e.target as Node;
      if (panneauRef.current?.contains(cible)) return;
      if (boutonRef.current?.contains(cible)) return;
      setOuvert(false);
    }
    function gererTouche(e: KeyboardEvent) {
      if (e.key === "Escape") setOuvert(false);
    }
    document.addEventListener("mousedown", gererClicExterieur);
    document.addEventListener("keydown", gererTouche);
    return () => {
      document.removeEventListener("mousedown", gererClicExterieur);
      document.removeEventListener("keydown", gererTouche);
    };
  }, [ouvert]);

  // Raccourci "/" (PC seulement) : ouvre ou ferme le bouton, seulement si le
  // champ de texte actif est vide au moment de la frappe, pour ne jamais
  // intercepter un "/" tapé normalement dans un message (ex: une fraction
  // "3/4").
  useEffect(() => {
    if (mobile) return;
    function gererTouche(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const actif = document.activeElement;
      if (!(actif instanceof HTMLTextAreaElement)) return;
      if (actif.value !== "") return;
      e.preventDefault();
      setOuvert((v) => !v);
    }
    document.addEventListener("keydown", gererTouche);
    return () => document.removeEventListener("keydown", gererTouche);
  }, [mobile]);

  function fermer() {
    setOuvert(false);
  }

  function survoler(id: LigneId) {
    setLigneOuverte(id);
    ouverteParSurvolRef.current = id;
  }

  function basculerLigne(id: LigneId) {
    if (ouverteParSurvolRef.current === id) {
      ouverteParSurvolRef.current = null;
      return;
    }
    setLigneOuverte((precedente) => (precedente === id ? null : id));
  }

  const ligneProps = (id: LigneId) => ({
    ouverte: ligneOuverte === id,
    grand: mobile,
    onSurvol: () => survoler(id),
    onBasculer: () => basculerLigne(id),
  });

  return (
    <div className="relative flex-shrink-0">
      <button
        ref={boutonRef}
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-label="Réglages de la réponse"
        aria-haspopup="menu"
        aria-expanded={ouvert}
        title="Réglages de la réponse"
        className={
          "flex items-center gap-1 rounded-cgpt-bouton transition-colors " +
          (mobile ? "h-11 px-2.5 text-sm " : "px-1.5 py-1 text-xs ") +
          (ouvert ? "text-dj-texte" : "text-dj-texte-muet hover:text-dj-texte")
        }
      >
        Réglages
        <ChevronDown size={12} className={"transition-transform duration-200 " + (ouvert ? "rotate-180" : "")} />
      </button>

      <div
        ref={panneauRef}
        role="menu"
        aria-hidden={!ouvert}
        className={
          "z-40 border border-dj-bordure bg-dj-surface shadow-lg transition-all duration-150 ease-cgpt-doux " +
          (mobile
            ? "fixed inset-x-4 bottom-[calc(6rem+var(--safe-bottom))] flex max-h-[60vh] flex-col overflow-hidden rounded-2xl shadow-xl "
            : "dj-scroll-isole absolute bottom-full right-0 mb-2 max-h-[min(70vh,28rem)] w-64 origin-bottom-right overflow-y-auto rounded-cgpt-carte p-1 ") +
          (ouvert ? "visible translate-y-0 scale-100 opacity-100" : "invisible translate-y-1 scale-95 opacity-0")
        }
      >
        {mobile && (
          <div className="flex items-center justify-between border-b border-dj-bordure px-3 py-2">
            <span className="text-xs font-medium text-dj-texte-muet">Réglages</span>
            <button
              type="button"
              onClick={fermer}
              aria-label="Fermer"
              className="flex-shrink-0 text-dj-texte-muet hover:text-dj-texte"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className={mobile ? "overflow-y-auto p-1" : ""}>
          {afficherModele && (
            <LigneReglage Icone={Sparkles} titre="Modèle" {...ligneProps("modele")}>
              <Choix
                grand={mobile}
                actif={!modeleSelectionne}
                onClick={() => {
                  onModeleChange?.(null);
                  fermer();
                }}
              >
                Auto
              </Choix>
              {ORDRE_DISTRIBUTEURS_AFFICHAGE.filter((d) => modelesDisponibles.some((m) => m.distributeur === d)).map(
                (distributeur) => (
                  <div key={distributeur} className="mt-1">
                    <div className="px-2 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-dj-texte-muet">
                      {LABELS_DISTRIBUTEUR[distributeur] ?? distributeur}
                    </div>
                    {modelesDisponibles
                      .filter((m) => m.distributeur === distributeur)
                      .map((m) => (
                        <Choix
                grand={mobile}
                          key={m.modele_id}
                          actif={modeleSelectionne === m.modele_id}
                          onClick={() => {
                            onModeleChange?.(m.modele_id);
                            fermer();
                          }}
                        >
                          {m.label}
                        </Choix>
                      ))}
                  </div>
                )
              )}
            </LigneReglage>
          )}

          <LigneReglage Icone={AlignLeft} titre="Longueur de réponse" {...ligneProps("longueur")}>
            {NIVEAUX_LONGUEUR.map((valeur) => (
              <Choix
                grand={mobile}
                key={valeur}
                actif={longueur === valeur}
                onClick={() => {
                  onLongueurChange(valeur);
                  fermer();
                }}
              >
                {LABELS_LONGUEUR[valeur]}
              </Choix>
            ))}
          </LigneReglage>

          {afficherPersona && (
            <LigneReglage Icone={GraduationCap} titre="Mode pédagogique" {...ligneProps("persona")}>
              <Choix
                grand={mobile}
                actif={!pedagogie.persona}
                onClick={() => {
                  pedagogie.choisirPersona(null);
                  fermer();
                }}
              >
                Aucun mode
              </Choix>
              {PERSONAS.map((p) => (
                <Choix
                grand={mobile}
                  key={p.id}
                  actif={pedagogie.persona === p.id}
                  onClick={() => {
                    pedagogie.choisirPersona(p.id);
                    fermer();
                  }}
                >
                  {p.label}
                </Choix>
              ))}
            </LigneReglage>
          )}

          <LigneReglage Icone={BookOpen} titre="Modes ressources" {...ligneProps("source")}>
            <Choix
                grand={mobile}
              actif={!pedagogie.modeSource}
              onClick={() => {
                pedagogie.choisirModeSource(null);
                fermer();
              }}
            >
              Aucun
            </Choix>
            {MODES_SOURCE.map((m) => (
              <Choix
                grand={mobile}
                key={m.id}
                actif={pedagogie.modeSource === m.id}
                onClick={() => {
                  pedagogie.choisirModeSource(m.id);
                  fermer();
                }}
              >
                {m.label}
              </Choix>
            ))}
          </LigneReglage>

          {afficherCode && (
            <LigneReglage Icone={KeyRound} titre="Code enseignant" {...ligneProps("code")}>
              {modeActif.verrouille && (
                <p className="flex items-center gap-1.5 px-2 py-1 text-xs text-dj-texte-muet">
                  <Lock size={11} className="flex-shrink-0" />
                  Mode verrouillé pour cette conversation
                </p>
              )}
              {!modeActif.mineur && (
                <Choix
                grand={mobile}
                  actif={!modeActif.modeActifId && modeActif.choisi}
                  desactive={modeActif.enCours || modeActif.verrouille}
                  sous="Classinus sans code pour cette conversation"
                  onClick={() => {
                    modeActif.choisir(null);
                    fermer();
                  }}
                >
                  Aucun mode
                </Choix>
              )}
              {modeActif.rattachements.map((r) => (
                <Choix
                grand={mobile}
                  key={r.rattachement_id}
                  actif={r.rattachement_id === modeActif.modeActifId}
                  desactive={modeActif.enCours || modeActif.verrouille}
                  sous={`Reçu de ${r.proprietaire_nom}`}
                  onClick={() => {
                    modeActif.choisir(r.rattachement_id);
                    fermer();
                  }}
                >
                  {r.nom_code || r.code}
                </Choix>
              ))}
            </LigneReglage>
          )}
        </div>
      </div>
    </div>
  );
}
