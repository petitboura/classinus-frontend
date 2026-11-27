"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { BoutonCopierLien } from "./BoutonCopierLien";
import { ContenuFichierApercu, typeApercu } from "./ContenuFichierApercu";

// Fenêtre d'aperçu des sources citées et des liens qui veulent sortir de l'app
// (26/08, retour de Bourama : le clic sur "Ouvrir à cet endroit" faisait sortir
// de l'app. Ouvrir le PDF ou l'audio brut dans un nouvel onglet, en comptant
// sur le fragment d'URL #page= ou #t= pour se positionner, ne marche pas de
// façon fiable : le lecteur du système ou l'app externe ignore souvent ce
// fragment, surtout en PWA et sur mobile). Ce composant affiche donc le fichier
// directement DANS Classinus, avec un vrai contrôle de la page ou de l'instant.
// Monté UNE SEULE FOIS (voir VisionneurGlobalRacine.tsx), piloté par un simple
// CustomEvent "clovis:ouvrir-position" qui évite de faire passer des props entre
// SourcesBulle.tsx (puce d'extrait) et BulleMessage.tsx (citation inline), deux
// arbres de composants différents.
//
// 27/08/2026 (demande de Bourama : que tout reste en popup interne, même les
// sites) : ce visionneur ne se limite pas au PDF et à l'audio positionnés, il
// choisit l'aperçu de TOUT type de source. Le choix de l'aperçu vit maintenant
// dans ContenuFichierApercu.tsx, partagé avec le volet à côté du chat.
//
// 27/11/2026 : sur la page du chat, un volet à côté de la conversation prend le
// relais (voir lib/lecteurLateral.ts et VoletLecteur.tsx). Cette fenêtre ne
// s'ouvre alors plus, elle reste le comportement partout ailleurs (chat flottant
// sur une autre page, fenêtre de superposition du PC).

import { DetailOuverturePosition, EVENEMENT_OUVRIR_POSITION } from "./visionneurPositionEvenement";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import { ouvrirDansLecteur } from "@/lib/lecteurLateral";

export function VisionneurPositionGlobal() {
  const [detail, setDetail] = useState<DetailOuverturePosition | null>(null);
  // 02/09, demande de Bourama : plein écran pour le lecteur PDF (web, mobile web,
  // mobile natif), même logique que VisionneuseBibliotheque.tsx (calque CSS pur,
  // pas la Fullscreen API du navigateur, absente sur Safari iOS et dans les
  // webviews natives Capacitor).
  const [pleinEcran, setPleinEcran] = useState(false);
  // 01/09/2026 (Bourama : "plein de boutons qui se ferment et s'ouvrent brut") :
  // entrée et sortie animées, même mécanisme que le reste de l'app (voir
  // lib/useFermetureAnimee.ts).
  const { enSortie, demarrerFermeture } = useFermetureAnimee();

  const fermer = useCallback(() => demarrerFermeture(() => setDetail(null)), [demarrerFermeture]);

  useEffect(() => {
    function onOuvrir(e: Event) {
      const demande = (e as CustomEvent<DetailOuverturePosition>).detail;
      // Page du chat : le volet à côté de la conversation affiche le fichier.
      const identifiant = `${demande.url}#${demande.positionType ?? ""}${demande.positionValeur ?? ""}`;
      if (ouvrirDansLecteur({ genre: "fichier", id: identifiant, ...demande })) return;
      setPleinEcran(false);
      setDetail(demande);
    }
    window.addEventListener(EVENEMENT_OUVRIR_POSITION, onOuvrir);
    return () => window.removeEventListener(EVENEMENT_OUVRIR_POSITION, onOuvrir);
  }, []);

  useEffect(() => {
    if (!detail) return;
    function onEchap(e: KeyboardEvent) {
      if (e.key === "Escape") fermer();
    }
    window.addEventListener("keydown", onEchap);
    return () => window.removeEventListener("keydown", onEchap);
  }, [detail, fermer]);

  if (!detail) return null;

  const t = typeApercu(detail);
  // 11/10/2026, demande de Bourama : le cadre était toujours à 85 % de la
  // hauteur de l'écran, même pour une simple carte de site (cadre presque vide).
  // Les contenus dont la taille est connue tout de suite (carte de site, image,
  // audio, fichier non prévisualisable) laissent le cadre suivre leur taille,
  // avec un maximum de 85 % et un défilement au delà. PDF, Word, Excel, texte et
  // markdown gardent la hauteur fixe : ils se chargent après l'ouverture (le
  // cadre sauterait) et le lecteur PDF a besoin d'une hauteur définie.
  const tailleAuto = t.estAudio || t.estImage || t.estSiteWeb || t.estLien || t.estNonPrevisualisable;
  const largeurAuto = tailleAuto && !t.estImage;

  return (
    <div
      className={`fixed inset-0 z-[170] flex items-center justify-center bg-black/60 ${pleinEcran ? "" : "p-4"} ${
        enSortie ? "opacity-0 transition-opacity duration-150 ease-in" : "animate-dj-fade-in-rapide"
      }`}
      onClick={pleinEcran ? undefined : fermer}
    >
      <div
        className={`flex flex-col border-dj-bordure bg-dj-fond shadow-2xl ${
          pleinEcran
            ? "h-full w-full rounded-none border-0"
            : `${tailleAuto ? "max-h-[85vh]" : "h-[85vh]"} w-full ${largeurAuto ? "max-w-lg" : "max-w-2xl"} rounded-cgpt-bouton border`
        } ${enSortie ? "animate-cgpt-sortie-modal" : "animate-cgpt-entree-modal"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-dj-bordure px-4 py-3">
          <p className="min-w-0 truncate pr-3 text-sm font-medium text-dj-texte">{detail.titre}</p>
          <div className="flex shrink-0 items-center gap-1.5">
            {/* Copier le lien (11/10/2026, demande de Bourama : tous les types, pas
                seulement la carte de site, qui a déjà le sien sous la carte). */}
            {!(t.estSiteWeb || t.estLien) && <BoutonCopierLien href={detail.url} variante="texte" />}
            {t.estPdf && (
              <button
                type="button"
                onClick={() => setPleinEcran((v) => !v)}
                aria-label={pleinEcran ? "Quitter le plein écran" : "Plein écran"}
                title={pleinEcran ? "Quitter le plein écran" : "Plein écran"}
                className="rounded-full p-1 text-dj-texte-muet transition-colors hover:text-dj-texte"
              >
                {pleinEcran ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            )}
            <button
              type="button"
              onClick={fermer}
              className="rounded-full p-1 text-dj-texte-muet transition-colors hover:text-dj-texte"
              title="Fermer"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className={`min-h-0 overflow-auto ${tailleAuto ? "" : "flex-1"}`}>
          <ContenuFichierApercu detail={detail} />
        </div>
      </div>
    </div>
  );
}
