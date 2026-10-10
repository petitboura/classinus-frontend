"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronRight, ChevronUp, BrainCog } from "lucide-react";

// Affiche le raisonnement interne du modèle -- consomme les événements SSE
// {"type": "raisonnement", "texte": "..."} que core/main.py:_agent_groq
// émet désormais (voir kwargs_reasoning/reasoning_format="parsed"), pour
// les modèles de la cascade qui font réellement du raisonnement (voir
// MODELES_AVEC_REASONING_EFFORT côté backend). Avant ce fix (24/07), ce
// raisonnement existait déjà côté modèle mais n'était ni capturé ni
// affiché.
//
// Demande Bourama (24/07) : reprendre le principe de Claude.ai -- nom de
// l'agent affiché pendant la réflexion ("{nomAgent} réfléchit..."), bulle
// qui se replie automatiquement (mais reste consultable) une fois la
// réponse commencée, plutôt que d'être jetée.
//
// Règles d'ouverture (10/10/2026, demande Bourama) :
// 1. Une fois que des outils ont commencé à être utilisés (outilsCommences),
//    la bulle ne s'ouvre jamais seule : elle reste repliée et ne se déplie
//    que si la personne clique.
// 2. Si la personne ferme la bulle, elle ne se rouvre plus jamais seule.
// 3. Dès que la réflexion se termine, la bulle se referme, même si la
//    personne l'avait fermée puis rouverte pendant la réflexion. Elle reste
//    ensuite consultable d'un clic.
export function RaisonnementBulle({
  nomAgent,
  texte,
  enCours,
  outilsCommences = false,
}: {
  nomAgent: string;
  texte: string;
  enCours: boolean;
  outilsCommences?: boolean;
}) {
  // Ouverte d'emblée seulement pour une première réflexion en direct, avant
  // tout outil. Un message rechargé depuis l'historique démarre replié.
  const [ouvert, setOuvert] = useState(enCours && !outilsCommences);
  // Vrai dès que la personne a fermé la bulle elle même (clic sur l'en tête
  // ou sur le bouton flottant). Ne repasse jamais à faux.
  const fermeeParPersonneRef = useRef(false);
  const enCoursPrecedentRef = useRef(enCours);

  // Ouverture et fermeture automatiques, uniquement sur un changement de
  // enCours : début de réflexion (ouvre si les règles 1 et 2 le permettent)
  // ou fin de réflexion (referme, règle 3).
  useEffect(() => {
    const etaitEnCours = enCoursPrecedentRef.current;
    enCoursPrecedentRef.current = enCours;
    if (enCours && !etaitEnCours) {
      if (!outilsCommences && !fermeeParPersonneRef.current) setOuvert(true);
    } else if (!enCours && etaitEnCours) {
      setOuvert(false);
    }
  }, [enCours, outilsCommences]);

  function basculer() {
    if (ouvert) fermeeParPersonneRef.current = true;
    setOuvert(!ouvert);
  }

  // Bouton flottant "replier" (04/10/2026, demande Bourama) : une réflexion
  // dépliée est souvent très longue, remonter tout en haut pour la fermer
  // est pénible. Le bouton reste collé en bas de l'écran pendant qu'on lit
  // (voir l'ancre sticky en bas du composant).
  // - PC (appareil qui sait survoler) : visible au survol de la bulle.
  // - Téléphone/tablette (pas de survol) : visible quand la ligne du haut
  //   n'est plus à l'écran, donc quand c'est réellement utile.
  const enteteRef = useRef<HTMLButtonElement>(null);
  const [peutSurvoler, setPeutSurvoler] = useState(false);
  const [survol, setSurvol] = useState(false);
  const [enteteHorsEcran, setEnteteHorsEcran] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const maj = () => setPeutSurvoler(mq.matches);
    maj();
    mq.addEventListener("change", maj);
    return () => mq.removeEventListener("change", maj);
  }, []);

  // Surveille la ligne du haut seulement tant que la réflexion est dépliée.
  useEffect(() => {
    const entete = enteteRef.current;
    if (!ouvert || !entete || typeof IntersectionObserver === "undefined") {
      setEnteteHorsEcran(false);
      return;
    }
    const observateur = new IntersectionObserver(([entree]) => setEnteteHorsEcran(!entree.isIntersecting));
    observateur.observe(entete);
    return () => observateur.disconnect();
  }, [ouvert]);

  if (!texte) return null;

  const boutonFlottantVisible = ouvert && (peutSurvoler ? survol : enteteHorsEcran);

  function replierEtRevenirEnHaut() {
    fermeeParPersonneRef.current = true;
    setOuvert(false);
    setSurvol(false);
    // La ligne du haut est AU DESSUS de ce qui se replie : sa position ne
    // bouge pas pendant l'animation, on peut donc l'y ramener tout de suite
    // pour que la personne ne se retrouve pas perdue plus bas dans le chat.
    const reduireMouvement = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    enteteRef.current?.scrollIntoView({ behavior: reduireMouvement ? "auto" : "smooth", block: "nearest" });
  }

  return (
    <div
      className="my-1.5 max-w-[80%] animate-dj-fade-in"
      onMouseEnter={() => setSurvol(true)}
      onMouseLeave={() => setSurvol(false)}
    >
      <button
        ref={enteteRef}
        onClick={basculer}
        className="flex items-center gap-1.5 text-[13px] text-dj-texte-muet transition-colors hover:text-dj-texte"
      >
        <BrainCog size={13} className={enCours ? "animate-pulse text-dj-texte-muet" : ""} />
        <span
          className={
            enCours
              ? "animate-dj-shimmer bg-dj-shimmer-texte bg-[length:200%_100%] bg-clip-text text-transparent"
              : ""
          }
        >
          {enCours ? `${nomAgent} réfléchit...` : `Raisonnement de ${nomAgent}`}
        </span>
        {ouvert ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      </button>
      {/* Glissement fluide (26/07, retour Bourama : le repliement était
          "brut", sans transition) -- astuce grid-template-rows 0fr/1fr :
          anime la hauteur sans connaître le contenu à l'avance
          (contrairement à max-height, qui doit deviner une valeur). */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          ouvert ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mt-1.5 whitespace-pre-wrap border-l-2 border-dj-bordure pb-9 pl-3 text-[13px] italic leading-relaxed text-dj-texte-muet">
            {texte}
          </div>
        </div>
      </div>
      {/* Ancre sticky de hauteur 0, DERNIER enfant du bloc : elle reste à sa
          place naturelle (fin de la réflexion) quand la fin est visible, et
          se colle à 12px du bas de l'écran tant que la réflexion déborde
          sous l'écran, donc le bouton "suit" la lecture sans calcul de
          position. Doit rester HORS du conteneur overflow-hidden ci-dessus
          (un parent overflow-hidden casserait le sticky). */}
      {ouvert && (
        <div className="pointer-events-none sticky bottom-3 z-10 h-0">
          <button
            type="button"
            onClick={replierEtRevenirEnHaut}
            aria-label="Replier le raisonnement"
            title="Replier le raisonnement"
            tabIndex={boutonFlottantVisible ? 0 : -1}
            className={`absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border border-dj-bordure bg-dj-fond text-dj-texte-muet shadow-md transition-all duration-200 ease-out hover:text-dj-texte focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dj-bordure ${
              boutonFlottantVisible
                ? "pointer-events-auto translate-y-0 opacity-100"
                : "pointer-events-none translate-y-2 opacity-0"
            }`}
          >
            <ChevronUp size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
