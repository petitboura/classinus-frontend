"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, GraduationCap } from "lucide-react";

// Sélecteur de persona pédagogique (partie 8 des specs indépendantes,
// volet étudiant ScholarFlow AI, 14/09/2026). Bouton + panneau flottant,
// même pattern visuel que le sélecteur de modèle et le sélecteur de
// longueur juste à côté dans BarreDeSaisie.tsx (bouton+panneau, fermeture
// au clic extérieur) -- pas réinventé pour rester cohérent avec le style
// déjà établi de la toolbar.
//
// ATTENTION NOM : à ne pas confondre avec SelecteurModeActif.tsx, qui
// gère le rattachement enseignant/code de classe actif sur une
// conversation -- un concept totalement différent (voir aussi
// core/mode_actif_conversation.py côté backend). Ce composant-ci gère le
// persona pédagogique (Socratique/Professeur/Tuteur/Examinateur), mêmes
// clés que MODES_PEDAGOGIQUES côté backend (core/profils_agents.py,
// partie 1), pour rester direct à brancher une fois la partie 9
// (stockage backend) prête.
//
// ÉTAT LOCAL TEMPORAIRE (explicitement permis par la partie 8 en
// attendant la partie 9) : pas de persistance ici, pas d'appel réseau --
// le choix ne survit pas à un rechargement de page pour l'instant.
// onPersonaChange permet au parent de lire le choix sans que ce
// composant ait besoin de connaître conversationId ni l'API.
//
// Aucune valeur par défaut choisie : le texte backend note explicitement
// que le mode par défaut est une décision en attente, à trancher avant
// le branchement réel (voir commit ce405c3, clovis-backend) -- persona
// commence donc à `null` ("Aucun mode" affiché), jamais présélectionné.
//
// Raccourci clavier "/" (même action que le bouton, aucune bascule
// automatique décidée par l'IA -- voir REGLE_BASCULE_MODE_PEDAGOGIQUE
// côté backend) : ouvre le même panneau, seulement si le textarea actif
// est vide au moment de la frappe, pour ne jamais intercepter un "/"
// tapé normalement dans un message (ex: une fraction "3/4").

const PERSONAS: { id: string; label: string }[] = [
  { id: "socratique", label: "Socratique" },
  { id: "professeur", label: "Professeur" },
  { id: "tuteur", label: "Tuteur" },
  { id: "examinateur", label: "Examinateur" },
];

export function SelecteurPersonaPedagogique({
  onPersonaChange,
}: {
  onPersonaChange?: (persona: string | null) => void;
}) {
  const [persona, setPersona] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const boutonRef = useRef<HTMLButtonElement>(null);
  const panneauRef = useRef<HTMLDivElement>(null);

  function choisir(id: string | null) {
    setPersona(id);
    onPersonaChange?.(id);
    setOuvert(false);
  }

  // Fermeture au clic extérieur -- même pattern que le sélecteur de
  // modèle/longueur dans BarreDeSaisie.tsx.
  useEffect(() => {
    if (!ouvert) return;
    function gererClicExterieur(e: MouseEvent) {
      const cible = e.target as Node;
      if (panneauRef.current?.contains(cible)) return;
      if (boutonRef.current?.contains(cible)) return;
      setOuvert(false);
    }
    document.addEventListener("mousedown", gererClicExterieur);
    return () => document.removeEventListener("mousedown", gererClicExterieur);
  }, [ouvert]);

  // Raccourci "/" -- voir note en tête de fichier.
  useEffect(() => {
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
  }, []);

  const labelActif = PERSONAS.find((p) => p.id === persona)?.label ?? "Aucun mode";

  return (
    <div className="relative">
      <button
        ref={boutonRef}
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-label="Choisir le mode pédagogique"
        className={
          "flex items-center gap-1 rounded-md px-1 py-0.5 text-xs transition-colors " +
          (ouvert ? "text-dj-texte" : "text-dj-texte-muet hover:text-dj-texte")
        }
      >
        <GraduationCap size={12} />
        {labelActif}
        <ChevronDown size={12} />
      </button>
      <div
        ref={panneauRef}
        className={
          "absolute bottom-full left-0 z-20 mb-2 w-48 origin-bottom-left overflow-hidden rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-1 shadow-lg transition-all duration-150 ease-cgpt-doux " +
          (ouvert
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-1 scale-95 opacity-0")
        }
      >
        <button
          type="button"
          onClick={() => choisir(null)}
          className={
            "flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-xs transition-colors hover:bg-dj-surface-haute " +
            (!persona ? "text-dj-accent-1-texte" : "text-dj-texte")
          }
        >
          Aucun mode
          {!persona && <Check size={13} />}
        </button>
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => choisir(p.id)}
            className={
              "flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-xs transition-colors hover:bg-dj-surface-haute " +
              (persona === p.id ? "text-dj-accent-1-texte" : "text-dj-texte")
            }
          >
            {p.label}
            {persona === p.id && <Check size={13} />}
          </button>
        ))}
      </div>
    </div>
  );
}
