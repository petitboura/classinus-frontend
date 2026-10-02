"use client";

// Liste des conversations de l'historique du chat (01/10/2026, demande
// Bourama : plein ecran, epingler, renommer, supprimer, et ne pas tout
// charger d'un coup). Partagee par le popup de la barre de gauche, la vue
// plein ecran, le tiroir mobile et le mini chat, pour que tous se
// comportent pareil. Lit les donnees et les actions dans ContexteChat
// (lib/contexteChat.tsx) ; le parent ne fournit que ce qui depend de
// l'ecran (quelle conversation est ouverte, quoi faire au clic).

import { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Clock, MoreHorizontal, Pencil, Pin, PinOff, Trash2, X } from "lucide-react";
import { ContexteChat, type FilConversation } from "@/lib/contexteChat";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";

const LONGUEUR_MAX_TITRE = 80;
// Distance (px) avant la fin de la liste a laquelle on charge deja la suite,
// pour que le defilement ne bute jamais sur un vide.
const MARGE_CHARGEMENT_PX = 160;
const LARGEUR_MENU_PX = 192;
const HAUTEUR_MENU_PX = 140;

function cleFil(fil: FilConversation): string {
  return fil.conversation_id ?? "legacy";
}

type PropsListe = {
  conversationActiveId?: string | null;
  onSelectionner: (fil: FilConversation) => void;
  // Appelee apres une suppression reussie (le parent remet par exemple le
  // chat sur une nouvelle conversation si c'etait celle qui etait ouverte).
  onSupprimee?: (fil: FilConversation) => void;
  // "pleinEcran" : lignes plus grandes, colonne centree.
  variante?: "popup" | "pleinEcran";
  // Classes du conteneur qui defile (hauteur max, bordures...).
  className?: string;
};

export function ListeHistorique({
  conversationActiveId,
  onSelectionner,
  onSupprimee,
  variante = "popup",
  className = "",
}: PropsListe) {
  const ctx = useContext(ContexteChat);
  const historique = ctx?.historique ?? [];
  const aPlus = ctx?.historiqueAPlus ?? false;
  const chargementPlus = ctx?.chargementPlusHistorique ?? false;
  const erreurPlus = ctx?.erreurPlusHistorique ?? false;
  const erreurAction = ctx?.erreurActionHistorique ?? null;
  const chargerPlus = ctx?.chargerPlusHistorique;

  const racineRef = useRef<HTMLDivElement>(null);
  const sentinelleRef = useRef<HTMLDivElement>(null);
  // A chaque ouverture de la liste : Recents deplie, Epingles plie.
  const [epinglesOuverts, setEpinglesOuverts] = useState(false);
  const [recentsOuverts, setRecentsOuverts] = useState(true);

  // Epingles : dans l'ordre recu (le plus recemment epingle en premier).
  // Recents : toujours du plus recemment actif au plus ancien, meme apres
  // un desepinglage ou l'ajout local d'une nouvelle conversation.
  const epingles = historique.filter((f) => f.epingle);
  const recents = historique
    .filter((f) => !f.epingle)
    .sort((a, b) => Date.parse(b.derniere_activite) - Date.parse(a.derniere_activite));

  // Charge la page suivante quand le bas de la liste approche (defilement
  // progressif). La liste elle-meme est le conteneur observe. Rien a
  // charger tant que la section Recents est pliee (sentinelle absente).
  useEffect(() => {
    const racine = racineRef.current;
    const sentinelle = sentinelleRef.current;
    if (!racine || !sentinelle || !recentsOuverts || !aPlus || erreurPlus || !chargerPlus) return;
    const observateur = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((e) => e.isIntersecting)) void chargerPlus();
      },
      { root: racine, rootMargin: `0px 0px ${MARGE_CHARGEMENT_PX}px 0px` }
    );
    observateur.observe(sentinelle);
    return () => observateur.disconnect();
    // historique.length : apres chaque page recue la sentinelle est
    // observee a nouveau (elle est deja visible si la liste reste courte).
  }, [recentsOuverts, aPlus, erreurPlus, chargerPlus, historique.length]);

  const grand = variante === "pleinEcran";

  function rendreLignes(fils: FilConversation[]) {
    return fils.map((fil) => (
      <LigneFil
        key={cleFil(fil)}
        fil={fil}
        estActive={fil.conversation_id === conversationActiveId}
        grand={grand}
        onSelectionner={onSelectionner}
        onSupprimee={onSupprimee}
      />
    ));
  }

  return (
    <div ref={racineRef} className={`dj-scroll-isole overflow-y-auto ${className}`}>
      {erreurAction && (
        <p role="alert" className="animate-dj-fade-in-rapide px-2.5 pb-1.5 pt-1 text-xs text-red-500">
          {erreurAction}
        </p>
      )}

      {epingles.length > 0 && (
        <SectionPliable
          Icone={Pin}
          titre="Épinglés"
          nombre={epingles.length}
          ouverte={epinglesOuverts}
          onBasculer={() => setEpinglesOuverts((v) => !v)}
          grand={grand}
        >
          {rendreLignes(epingles)}
        </SectionPliable>
      )}

      <SectionPliable
        Icone={Clock}
        titre="Récents"
        ouverte={recentsOuverts}
        onBasculer={() => setRecentsOuverts((v) => !v)}
        grand={grand}
      >
        {rendreLignes(recents)}
        {aPlus && (
          <div ref={sentinelleRef} className="py-1">
            {chargementPlus && <SqueletteLignes grand={grand} />}
            {erreurPlus && (
              <button
                onClick={() => void chargerPlus?.()}
                className="w-full rounded-lg px-2.5 py-2 text-center text-sm text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
              >
                Impossible de charger la suite. Réessayer
              </button>
            )}
          </div>
        )}
      </SectionPliable>
    </div>
  );
}

type PropsSection = {
  Icone: typeof Pin;
  titre: string;
  nombre?: number;
  ouverte: boolean;
  onBasculer: () => void;
  grand: boolean;
  children: React.ReactNode;
};

// Section repliable de la liste (Epingles, Recents). Le contenu n'est
// monte que quand la section est ouverte : une section pliee ne coute rien.
function SectionPliable({ Icone, titre, nombre, ouverte, onBasculer, grand, children }: PropsSection) {
  return (
    <div>
      <button
        onClick={onBasculer}
        aria-expanded={ouverte}
        className={`group flex w-full items-center gap-2 rounded-lg px-2.5 text-left font-medium text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte ${
          grand ? "min-h-10 text-sm" : "min-h-8 text-xs"
        }`}
      >
        <Icone size={grand ? 16 : 14} className="flex-shrink-0" />
        <span className="uppercase tracking-wide">{titre}</span>
        {nombre !== undefined && <span className="text-xs font-normal opacity-70">{nombre}</span>}
        <ChevronDown size={14} className={`ml-auto flex-shrink-0 transition-transform duration-200 ${ouverte ? "rotate-180" : ""}`} />
      </button>
      {ouverte && <div className="animate-dj-fade-in-rapide">{children}</div>}
    </div>
  );
}

// Lignes fantomes animees pendant le chargement de la page suivante.
function SqueletteLignes({ grand }: { grand: boolean }) {
  return (
    <div aria-hidden className="space-y-1 px-1">
      {[70, 52, 62].map((largeur, i) => (
        <div key={i} className={`flex items-center ${grand ? "h-11" : "h-9"}`}>
          <div className="h-3 animate-pulse rounded bg-dj-surface-haute" style={{ width: `${largeur}%` }} />
        </div>
      ))}
    </div>
  );
}

type PropsLigne = {
  fil: FilConversation;
  estActive: boolean;
  grand: boolean;
  onSelectionner: (fil: FilConversation) => void;
  onSupprimee?: (fil: FilConversation) => void;
};

type ModeLigne = "normal" | "renommer" | "confirmerSuppression";

function LigneFil({ fil, estActive, grand, onSelectionner, onSupprimee }: PropsLigne) {
  const ctx = useContext(ContexteChat);
  const [mode, setMode] = useState<ModeLigne>("normal");
  const [titreSaisi, setTitreSaisi] = useState(fil.titre);
  const [menu, setMenu] = useState<{ haut: number; gauche: number } | null>(null);
  const boutonMenuRef = useRef<HTMLButtonElement>(null);
  const champRef = useRef<HTMLInputElement>(null);
  const { enSortie: menuEnSortie, demarrerFermeture: fermerMenuAnime } = useFermetureAnimee();

  useEffect(() => {
    if (mode === "renommer") {
      champRef.current?.focus();
      champRef.current?.select();
    }
  }, [mode]);

  function ouvrirMenu() {
    const bouton = boutonMenuRef.current;
    if (!bouton) return;
    const r = bouton.getBoundingClientRect();
    const gauche = Math.max(8, Math.min(r.right - LARGEUR_MENU_PX, window.innerWidth - LARGEUR_MENU_PX - 8));
    // Bascule vers le haut quand il n'y a pas la place en dessous.
    const haut = r.bottom + 4 + HAUTEUR_MENU_PX > window.innerHeight ? r.top - HAUTEUR_MENU_PX - 4 : r.bottom + 4;
    setMenu({ haut: Math.max(8, haut), gauche });
  }

  const fermerMenu = useCallback(
    (apres?: () => void) => {
      fermerMenuAnime(() => {
        setMenu(null);
        apres?.();
      });
    },
    [fermerMenuAnime]
  );

  // Les trois actions changent la liste tout de suite (voir ContexteChat) :
  // la ligne n'attend jamais le serveur.
  function basculerEpingle() {
    ctx?.epinglerFil(fil, !fil.epingle);
  }

  function validerRenommage() {
    const titre = titreSaisi.replace(/\s+/g, " ").trim();
    if (!ctx || !titre) return;
    setMode("normal");
    if (titre !== fil.titre) ctx.renommerFil(fil, titre);
  }

  function confirmerSuppression() {
    ctx?.supprimerFil(fil);
    onSupprimee?.(fil);
  }

  const hauteur = grand ? "min-h-11" : "min-h-9";
  const texte = grand ? "text-base" : "text-sm";

  if (mode === "renommer") {
    return (
      <div className="px-1 py-0.5">
        <div className="flex items-center gap-1">
          <input
            ref={champRef}
            value={titreSaisi}
            maxLength={LONGUEUR_MAX_TITRE}
            onChange={(e) => setTitreSaisi(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") validerRenommage();
              if (e.key === "Escape") {
                e.stopPropagation();
                setMode("normal");
              }
            }}
            aria-label="Nouveau titre de la conversation"
            className={`min-w-0 flex-1 rounded-lg border border-dj-bordure bg-dj-fond px-2.5 py-1.5 ${texte} text-dj-texte outline-none transition-colors focus:border-dj-texte-muet`}
          />
          <button
            onClick={validerRenommage}
            disabled={!titreSaisi.trim()}
            aria-label="Valider le titre"
            className="rounded-lg p-1.5 text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte disabled:opacity-40"
          >
            <Check size={18} />
          </button>
          <button
            onClick={() => {
              setMode("normal");
            }}
            aria-label="Annuler"
            className="rounded-lg p-1.5 text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (mode === "confirmerSuppression") {
    return (
      <div className="animate-dj-fade-in-rapide rounded-lg bg-dj-surface-haute px-2.5 py-2">
        <p className={`${texte} text-dj-texte`}>Supprimer définitivement cette conversation ?</p>
        <p className="truncate pt-0.5 text-xs text-dj-texte-muet">{fil.titre}</p>
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={confirmerSuppression}
            className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Supprimer
          </button>
          <button
            onClick={() => {
              setMode("normal");
            }}
            className="rounded-lg px-3 py-1.5 text-sm text-dj-texte-muet transition-colors hover:bg-dj-surface hover:text-dj-texte"
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        className={`group flex items-center rounded-lg transition-colors hover:bg-dj-surface-haute ${hauteur} ${
          menu ? "bg-dj-surface-haute" : ""
        }`}
      >
        <button
          onClick={() => !estActive && onSelectionner(fil)}
          disabled={estActive}
          className={`flex min-w-0 flex-1 items-center gap-1.5 truncate px-2.5 py-2 text-left ${texte} ${
            estActive ? "text-dj-accent-1-texte" : "text-dj-texte"
          }`}
        >
          <span className="truncate">
            {estActive ? "● " : ""}
            {fil.titre}
          </span>
        </button>
        <button
          ref={boutonMenuRef}
          onClick={() => (menu ? fermerMenu() : ouvrirMenu())}
          aria-label="Options de la conversation"
          aria-haspopup="menu"
          aria-expanded={menu !== null}
          title="Options"
          // Sur ordinateur le bouton apparait au survol de la ligne ; sur
          // ecran tactile (pas de survol) il reste toujours visible.
          className={`mr-1 flex-shrink-0 rounded-md p-1 text-dj-texte-muet transition-[opacity,color,background-color] hover:bg-dj-surface hover:text-dj-texte focus-visible:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 ${
            menu ? "!opacity-100 text-dj-texte" : ""
          }`}
        >
          <MoreHorizontal size={16} strokeWidth={2.25} />
        </button>
      </div>
      {menu && (
        <MenuFil
          position={menu}
          enSortie={menuEnSortie}
          epingle={Boolean(fil.epingle)}
          onFermer={() => fermerMenu()}
          onEpingler={() => fermerMenu(basculerEpingle)}
          onRenommer={() =>
            fermerMenu(() => {
              setTitreSaisi(fil.titre);
              setMode("renommer");
            })
          }
          onSupprimer={() =>
            fermerMenu(() => {
              setMode("confirmerSuppression");
            })
          }
        />
      )}
    </div>
  );
}

type PropsMenu = {
  position: { haut: number; gauche: number };
  enSortie: boolean;
  epingle: boolean;
  onFermer: () => void;
  onEpingler: () => void;
  onRenommer: () => void;
  onSupprimer: () => void;
};

// Menu des trois points. Rendu dans document.body : la liste est dans un
// conteneur qui defile et qui rognerait un menu positionne a l'interieur.
function MenuFil({ position, enSortie, epingle, onFermer, onEpingler, onRenommer, onSupprimer }: PropsMenu) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [monte, setMonte] = useState(false);
  useLayoutEffect(() => setMonte(true), []);

  useEffect(() => {
    function surPointeur(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onFermer();
    }
    function surTouche(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onFermer();
      }
    }
    // Le menu est positionne en fixe : si la liste defile ou la fenetre
    // change de taille, il ne suivrait plus sa ligne, donc on le ferme.
    window.addEventListener("pointerdown", surPointeur, true);
    window.addEventListener("keydown", surTouche, true);
    window.addEventListener("scroll", onFermer, true);
    window.addEventListener("resize", onFermer);
    return () => {
      window.removeEventListener("pointerdown", surPointeur, true);
      window.removeEventListener("keydown", surTouche, true);
      window.removeEventListener("scroll", onFermer, true);
      window.removeEventListener("resize", onFermer);
    };
  }, [onFermer]);

  if (!monte) return null;

  const classeItem =
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-dj-surface-haute disabled:opacity-50";

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{ position: "fixed", top: position.haut, left: position.gauche, width: LARGEUR_MENU_PX }}
      className={`z-[170] rounded-xl border border-dj-bordure bg-dj-surface p-1 shadow-lg ${
        enSortie ? "animate-cgpt-sortie-modal" : "animate-dj-fade-in-rapide"
      }`}
    >
      <button role="menuitem" onClick={onEpingler} className={`${classeItem} text-dj-texte`}>
        {epingle ? <PinOff size={16} /> : <Pin size={16} />}
        {epingle ? "Désépingler" : "Épingler"}
      </button>
      <button role="menuitem" onClick={onRenommer} className={`${classeItem} text-dj-texte`}>
        <Pencil size={16} />
        Renommer
      </button>
      <button role="menuitem" onClick={onSupprimer} className={`${classeItem} text-red-500`}>
        <Trash2 size={16} />
        Supprimer
      </button>
    </div>,
    document.body
  );
}
