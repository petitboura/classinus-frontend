"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Check,
  Code2,
  Copy,
  Eye,
  File as IconeFichier,
  Film,
  Image as IconeImage,
  Loader2,
  Maximize2,
  Minimize2,
  Music,
  X,
} from "lucide-react";
import {
  ContenuLecteur,
  LARGEUR_LECTEUR_DEFAUT,
  LARGEUR_LECTEUR_MIN,
  allerALImage,
  ecrireLargeurLecteur,
  enregistrerHoteLecteur,
  fermerLecteur,
  lireLargeurLecteur,
  useContenuLecteur,
  useDeuxColonnes,
} from "@/lib/lecteurLateral";
import { useFermetureAuRetour } from "@/lib/contexteRetour";
import { telecharger } from "@/lib/telecharger";
import { copierVersBibliothequePersonnelle } from "@/lib/api";
import { IconeTelechargement, classeEtatTelechargement } from "@/components/EtatTelechargement";
import { useEtatTelechargement } from "@/lib/etatTelechargements";
import { TelechargerCopierModal } from "@/components/TelechargerCopierModal";
import { estFichierMarkdown } from "@/components/VisionneuseBibliotheque";
import { BoutonCopierLien } from "./BoutonCopierLien";
import { LecteurMedia } from "./LecteurMedia";
import { ContenuImagesLecteur } from "./ContenuImagesLecteur";

// Lecteur à côté du chat (27/11/2026, demande de Bourama : comme Claude,
// ChatGPT et Gemini, le fichier ouvert pousse le chat et s'affiche à côté, et
// on l'agrandit en tirant la barre).
//
// Un seul volet pour tous les contenus : PDF, livres, Word, Excel, PowerPoint,
// texte, markdown, images (avec galerie), audio et vidéo. Ce qui s'affiche vit
// dans lib/lecteurLateral.ts ; ce composant n'est monté que par ChatSection.tsx
// (la page du chat). Là où il n'est pas monté, les anciennes fenêtres restent.
//
// Trois présentations du même contenu :
//   1. ordinateur : colonne à droite du chat, largeur réglable (mémorisée) ;
//   2. plein écran (bouton, ordinateur) : calque sur toute la fenêtre ;
//   3. téléphone ou fenêtre étroite (moins de 1024 px) : pas la place pour deux
//      colonnes, calque plein écran avec une flèche de retour vers le chat (le
//      bouton retour du téléphone aussi).
//
// Le calque est monté par un portail dans <body>, comme PleinEcranApercu.tsx :
// un parent animé (transform) recadrerait sinon un "position: fixed".
//
// z-[160] : même niveau que PleinEcranApercu, sous la couche de l'agent
// (voir lib/couchesAgent.ts, jamais au dessus de COUCHE_MAX_APPLICATION).

// Le contenu des fichiers charge react-pdf et la liseuse : seulement à l'ouverture
// d'un fichier, jamais au rendu serveur ni au chargement de la page du chat.
const ContenuFichierApercu = dynamic(() => import("./ContenuFichierApercu").then((m) => m.ContenuFichierApercu), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <Loader2 size={20} className="animate-spin text-dj-texte-muet" />
    </div>
  ),
});

// Doit rester synchronisée avec la durée de la transition de largeur et de fondu.
const DUREE_TRANSITION_MS = 280;
// La zone qui sert à tirer la barre est superposée au bord du volet (aucune bande
// visible) : la barre de défilement du chat touche le lecteur.
const LARGEUR_POIGNEE = 0;
const LARGEUR_ZONE_TIREE = 8;
// Le chat garde toujours au moins cette largeur quand on élargit le volet.
const LARGEUR_CHAT_MIN = 340;
const PAS_CLAVIER = 24;

const classeBouton =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-dj-texte-muet transition-colors hover:text-dj-texte";

function titreDe(c: ContenuLecteur): string {
  if (c.genre === "images") return c.liste[c.index]?.alt || "Image";
  return c.titre;
}

function sousTitreDe(c: ContenuLecteur): string {
  if (c.genre === "images") return c.liste.length > 1 ? `Image ${c.index + 1} sur ${c.liste.length}` : "Image";
  if (c.genre === "media") return c.media === "video" ? "Vidéo" : "Audio";
  return c.sousTitre ?? "";
}

function IconeDe({ contenu }: { contenu: ContenuLecteur }) {
  if (contenu.genre === "images") return <IconeImage size={18} />;
  if (contenu.genre === "media") return contenu.media === "video" ? <Film size={18} /> : <Music size={18} />;
  const Icone = contenu.icone ?? IconeFichier;
  return <Icone size={18} />;
}

function estMarkdown(c: ContenuLecteur): boolean {
  return c.genre === "fichier" && c.typeMime !== "text/uri-list" && estFichierMarkdown(c.titre, c.typeMime || "");
}

export function VoletLecteur() {
  // Se déclare comme hôte : tant que ce composant est monté, ouvrirDansLecteur() réussit.
  useEffect(() => enregistrerHoteLecteur(), []);

  const contenu = useContenuLecteur();
  const deuxColonnes = useDeuxColonnes();

  // `rendu` est ce qui est affiché : il garde le dernier contenu le temps de la
  // transition de sortie, alors que `contenu` (le store) est déjà revenu à null.
  const [rendu, setRendu] = useState<ContenuLecteur | null>(null);
  const [deploye, setDeploye] = useState(false);
  const [pleinEcran, setPleinEcran] = useState(false);
  const [largeur, setLargeur] = useState(() =>
    typeof window === "undefined" ? LARGEUR_LECTEUR_DEFAUT : lireLargeurLecteur()
  );
  const [glisse, setGlisse] = useState(false);
  const [vueBruteMarkdown, setVueBruteMarkdown] = useState(false);
  const [texteMarkdown, setTexteMarkdown] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);
  const [modalTelechargementOuverte, setModalTelechargementOuverte] = useState(false);
  const racineRef = useRef<HTMLElement | null>(null);
  const largeurRef = useRef(largeur);
  largeurRef.current = largeur;

  useEffect(() => {
    if (contenu) {
      setRendu(contenu);
      // Déploiement une image plus tard : la largeur part de 0 puis glisse, sans apparition brute.
      let second = 0;
      const premier = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => setDeploye(true));
      });
      return () => {
        cancelAnimationFrame(premier);
        cancelAnimationFrame(second);
      };
    }
    setDeploye(false);
    // Le plein écran se défait à la fin du fondu : sinon le calque sauterait
    // en colonne au milieu de la fermeture.
    const minuteur = setTimeout(() => {
      setRendu(null);
      setPleinEcran(false);
    }, DUREE_TRANSITION_MS);
    return () => clearTimeout(minuteur);
  }, [contenu]);

  // Un autre fichier : le Formaté/Brut et le texte copié repartent à zéro.
  const identifiant = rendu?.id ?? null;
  useEffect(() => {
    setVueBruteMarkdown(false);
    setTexteMarkdown(null);
    setCopie(false);
  }, [identifiant]);

  // Le chat ne doit jamais passer sous sa largeur minimale : à l'ouverture (une
  // largeur mémorisée sur un grand écran peut être trop large ici) et quand la
  // fenêtre rétrécit. La largeur du volet recule du dépassement.
  useEffect(() => {
    function ajusterAuChat() {
      const volet = racineRef.current;
      const chat = volet?.previousElementSibling as HTMLElement | null;
      if (!volet || !chat) return;
      const trop = LARGEUR_CHAT_MIN - chat.offsetWidth;
      if (trop > 0) setLargeur((l) => Math.max(LARGEUR_LECTEUR_MIN, l - trop));
    }
    window.addEventListener("resize", ajusterAuChat);
    // Mesure une fois la transition d'ouverture terminée, quand le chat a sa largeur finale.
    const minuteur = deploye ? setTimeout(ajusterAuChat, DUREE_TRANSITION_MS + 40) : undefined;
    return () => {
      window.removeEventListener("resize", ajusterAuChat);
      if (minuteur) clearTimeout(minuteur);
    };
  }, [deploye]);

  const fermer = useCallback(() => fermerLecteur(), []);

  // Calque sur toute la fenêtre : téléphone, fenêtre étroite, ou plein écran demandé sur ordinateur.
  const surcouche = !deuxColonnes || pleinEcran;

  // Bouton retour du téléphone, du navigateur et d'Android : ferme le lecteur au
  // lieu de quitter la page (même pile que PanneauFlottant.tsx).
  useFermetureAuRetour(surcouche && !!contenu, fermer);

  useEffect(() => {
    if (!surcouche || !rendu) return;
    function surTouche(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (pleinEcran && deuxColonnes) setPleinEcran(false);
      else fermer();
    }
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [surcouche, rendu, pleinEcran, deuxColonnes, fermer]);

  // Même téléchargement que les autres aperçus : avec la copie vers la
  // bibliothèque quand elle est possible, directement sinon.
  const cibleTelechargement = (() => {
    if (!rendu) return null;
    if (rendu.genre === "images") {
      const image = rendu.liste[rendu.index];
      return image ? { url: image.src, nom: image.alt || "image", surCopie: image.surCopie } : null;
    }
    if (rendu.genre === "media") return { url: rendu.url, nom: rendu.titre, surCopie: undefined };
    if (!rendu.telechargeable) return null;
    const surCopie =
      rendu.surCopie ??
      (rendu.idBibliothequePublique ? () => copierVersBibliothequePersonnelle(rendu.idBibliothequePublique!) : undefined);
    return { url: rendu.url, nom: rendu.titre, surCopie };
  })();
  const etatTelechargement = useEtatTelechargement(cibleTelechargement?.url);

  function copierTexte() {
    if (!texteMarkdown) return;
    navigator.clipboard.writeText(texteMarkdown).then(() => {
      setCopie(true);
      setTimeout(() => setCopie(false), 1500);
    });
  }

  function demarrerRedimensionnement(e: React.PointerEvent) {
    const volet = racineRef.current;
    const chat = volet?.previousElementSibling as HTMLElement | null;
    if (!volet || !chat) return;
    e.preventDefault();
    const departX = e.clientX;
    const departLargeur = largeurRef.current;
    // Largeur maximale : tout l'espace du chat, sauf son minimum.
    const maximum = Math.max(
      LARGEUR_LECTEUR_MIN,
      chat.offsetWidth + volet.offsetWidth - LARGEUR_CHAT_MIN - LARGEUR_POIGNEE
    );
    setGlisse(true);
    function bouger(ev: PointerEvent) {
      const prochaine = Math.min(maximum, Math.max(LARGEUR_LECTEUR_MIN, departLargeur + (departX - ev.clientX)));
      // Lue à la fin du glissement : la ref est à jour même si le rendu n'a pas encore eu lieu.
      largeurRef.current = prochaine;
      setLargeur(prochaine);
    }
    function finir() {
      window.removeEventListener("pointermove", bouger);
      window.removeEventListener("pointerup", finir);
      window.removeEventListener("pointercancel", finir);
      setGlisse(false);
      ecrireLargeurLecteur(largeurRef.current);
    }
    window.addEventListener("pointermove", bouger);
    window.addEventListener("pointerup", finir);
    window.addEventListener("pointercancel", finir);
  }

  function surToucheRedimensionnement(e: React.KeyboardEvent) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const sens = e.key === "ArrowLeft" ? 1 : -1;
    const volet = racineRef.current;
    const chat = volet?.previousElementSibling as HTMLElement | null;
    const maximum = volet && chat
      ? Math.max(LARGEUR_LECTEUR_MIN, chat.offsetWidth + volet.offsetWidth - LARGEUR_CHAT_MIN - LARGEUR_POIGNEE)
      : LARGEUR_LECTEUR_DEFAUT;
    const prochaine = Math.min(maximum, Math.max(LARGEUR_LECTEUR_MIN, largeurRef.current + sens * PAS_CLAVIER));
    setLargeur(prochaine);
    ecrireLargeurLecteur(prochaine);
  }

  if (!rendu) return null;

  const titre = titreDe(rendu);
  const sousTitre = sousTitreDe(rendu);
  const avecCopierLien =
    rendu.genre === "fichier" && !rendu.telechargeable && rendu.typeMime !== "text/uri-list" && !!(rendu.typeMime || rendu.positionType);

  const entete = (
    <div className="flex shrink-0 items-center gap-2 border-b border-dj-bordure px-3 py-2.5">
      {surcouche && !deuxColonnes && (
        <button type="button" onClick={fermer} aria-label="Retour à la conversation" title="Retour à la conversation" className={classeBouton}>
          <ArrowLeft size={16} />
        </button>
      )}
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-dj-accent-1/15 text-dj-accent-1-texte">
        <IconeDe contenu={rendu} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-dj-texte">{titre}</p>
        {sousTitre && <p className="truncate text-[11px] text-dj-texte-muet">{sousTitre}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {estMarkdown(rendu) && (
          <>
            <button
              type="button"
              onClick={() => setVueBruteMarkdown(false)}
              aria-label="Formaté"
              title="Formaté"
              className={`${classeBouton} ${!vueBruteMarkdown ? "text-dj-texte" : ""}`}
            >
              <Eye size={16} />
            </button>
            <button
              type="button"
              onClick={() => setVueBruteMarkdown(true)}
              aria-label="Brut"
              title="Brut"
              className={`${classeBouton} ${vueBruteMarkdown ? "text-dj-texte" : ""}`}
            >
              <Code2 size={16} />
            </button>
            {texteMarkdown && (
              <button type="button" onClick={copierTexte} aria-label="Copier" title="Copier" className={classeBouton}>
                {copie ? <Check size={16} /> : <Copy size={16} />}
              </button>
            )}
          </>
        )}
        {avecCopierLien && <BoutonCopierLien href={rendu.url} variante="texte" />}
        {cibleTelechargement && (
          <button
            type="button"
            onClick={() =>
              cibleTelechargement.surCopie
                ? setModalTelechargementOuverte(true)
                : void telecharger(cibleTelechargement.url, cibleTelechargement.nom)
            }
            aria-label="Télécharger"
            title="Télécharger"
            className={`${classeBouton} ${classeEtatTelechargement(etatTelechargement)}`}
          >
            <IconeTelechargement href={cibleTelechargement.url} size={16} />
          </button>
        )}
        {deuxColonnes && (
          <button
            type="button"
            onClick={() => setPleinEcran((v) => !v)}
            aria-label={pleinEcran ? "Quitter le plein écran" : "Plein écran"}
            title={pleinEcran ? "Quitter le plein écran" : "Plein écran"}
            className={classeBouton}
          >
            {pleinEcran ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        )}
        <button type="button" onClick={fermer} aria-label="Fermer le lecteur" title="Fermer le lecteur" className={classeBouton}>
          <X size={16} />
        </button>
      </div>
    </div>
  );

  const corps = (
    // data-lecteur-lateral : les aperçus à hauteur fixe dans le fil (Word, Excel,
    // PowerPoint : 75vh) prennent ici toute la hauteur du volet.
    <div data-lecteur-lateral="" className="relative min-h-0 flex-1">
      <div
        key={rendu.id}
        className="absolute inset-0 animate-dj-fade-in overflow-y-auto overflow-x-hidden font-lecture text-[16px] leading-relaxed"
      >
        {rendu.genre === "fichier" ? (
          <ContenuFichierApercu
            key={rendu.id}
            detail={rendu}
            markdownPilote={{ vueBrute: vueBruteMarkdown, surTexteCharge: setTexteMarkdown }}
          />
        ) : rendu.genre === "images" ? (
          <ContenuImagesLecteur liste={rendu.liste} index={rendu.index} surChoisir={allerALImage} />
        ) : (
          <div key={rendu.id} className="flex h-full items-center justify-center p-4">
            <div className="w-full max-w-xl">
              <LecteurMedia href={rendu.url} type={rendu.media} />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const modaleTelechargement = modalTelechargementOuverte && cibleTelechargement && (
    <TelechargerCopierModal
      titre={cibleTelechargement.nom}
      surCopie={cibleTelechargement.surCopie}
      surTelechargement={() => telecharger(cibleTelechargement.url, cibleTelechargement.nom)}
      hrefTelechargement={cibleTelechargement.url}
      onFermer={() => setModalTelechargementOuverte(false)}
    />
  );

  if (surcouche) {
    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        data-contenant-flottant=""
        onClick={(e) => e.stopPropagation()}
        className={`fixed inset-0 z-[160] flex flex-col bg-dj-fond pb-[var(--safe-bottom)] pt-[var(--safe-top)] text-dj-texte transition-opacity duration-200 ease-out ${
          deploye ? "opacity-100" : "opacity-0"
        }`}
      >
        {entete}
        {corps}
        {modaleTelechargement}
      </div>,
      document.body
    );
  }

  return (
    <aside
      ref={racineRef}
      aria-label={titre}
      data-contenant-flottant=""
      className="relative flex min-h-0 shrink-0 overflow-hidden bg-dj-fond"
      style={{
        width: deploye ? largeur + LARGEUR_POIGNEE : 0,
        // Pendant le glissement de la barre, la largeur suit le doigt sans retard.
        transition: glisse ? "none" : `width ${DUREE_TRANSITION_MS}ms cubic-bezier(.25,.8,.35,1)`,
      }}
    >
      {/* Barre à tirer pour élargir ou rétrécir. Un double clic remet la largeur d'origine. */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Redimensionner le lecteur"
        aria-valuenow={largeur}
        aria-valuemin={LARGEUR_LECTEUR_MIN}
        tabIndex={0}
        onPointerDown={demarrerRedimensionnement}
        onKeyDown={surToucheRedimensionnement}
        onDoubleClick={() => {
          setLargeur(LARGEUR_LECTEUR_DEFAUT);
          ecrireLargeurLecteur(LARGEUR_LECTEUR_DEFAUT);
        }}
        className="absolute inset-y-0 left-0 z-10 cursor-col-resize outline-none"
        style={{ width: LARGEUR_ZONE_TIREE, touchAction: "none" }}
      />
      {/* Largeur fixe à l'intérieur : le contenu ne se recalcule pas pendant que le volet glisse. */}
      <div className="flex min-h-0 shrink-0 flex-col border-l border-dj-bordure bg-dj-surface" style={{ width: largeur }}>
        {entete}
        {corps}
      </div>
      {/* Pendant le glissement, un voile capte la souris : sans lui, un aperçu en iframe (Word, Excel) l'avalerait. */}
      {glisse && <div className="fixed inset-0 z-[160] cursor-col-resize" />}
      {modaleTelechargement}
    </aside>
  );
}
