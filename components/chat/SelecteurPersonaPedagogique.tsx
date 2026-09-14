"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, GraduationCap } from "lucide-react";
import { obtenirPersonaPedagogique, definirPersonaPedagogique } from "@/lib/api";

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
// BRANCHÉ AU BACKEND (14/09/2026, jonction items 1+8+9 des specs
// indépendantes) : persona chargé au montage via obtenirPersonaPedagogique
// et persisté à chaque choix via definirPersonaPedagogique
// (core/persona_pedagogique_conversation.py côté backend). Mise à jour
// optimiste immédiate, revert silencieux en cas d'échec réseau -- même
// patron que SelecteurModeActif.tsx juste à côté (choisir()).
//
// conversationId requis (comme SelecteurModeActif) : sans lui, ce
// composant garde persona à null et n'appelle jamais l'API (ex. écran
// d'accueil avant le premier message, pas encore de conversation).
//
// Aucune valeur par défaut choisie : obtenirPersonaPedagogique/
// obtenir_persona_pedagogique ne renvoient jamais de valeur implicite --
// persona commence donc à `null` ("Aucun mode" affiché) tant que rien
// n'a été chargé ou choisi, jamais présélectionné.
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
  conversationId,
  onPersonaChange,
}: {
  conversationId?: string;
  onPersonaChange?: (persona: string | null) => void;
}) {
  const [persona, setPersona] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const boutonRef = useRef<HTMLButtonElement>(null);
  const panneauRef = useRef<HTMLDivElement>(null);

  // Charge le persona déjà choisi pour cette conversation, s'il existe.
  // Un remontage (nouvelle conversation, key changée côté
  // ChatFlottant.tsx) redéclenche ce useEffect -- pas de fuite d'un
  // persona d'une conversation vers une autre.
  useEffect(() => {
    if (!conversationId) return;
    let annule = false;
    obtenirPersonaPedagogique(conversationId)
      .then((res) => {
        if (!annule) setPersona(res.persona);
      })
      .catch(() => {
        // Échec silencieux -- reste à null ("Aucun mode"), cohérent
        // avec l'absence de valeur par défaut implicite.
      });
    return () => {
      annule = true;
    };
  }, [conversationId]);

  async function choisir(id: string | null) {
    if (!conversationId || id === persona) {
      setOuvert(false);
      return;
    }
    const precedent = persona;
    setPersona(id); // optimiste, transition immédiate
    onPersonaChange?.(id);
    setOuvert(false);
    try {
      await definirPersonaPedagogique(conversationId, id);
    } catch {
      setPersona(precedent); // échec silencieux -- reprend l'affichage précédent
      onPersonaChange?.(precedent);
    }
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
