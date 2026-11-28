"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Download, Maximize2, X } from "lucide-react";
import { Skeleton } from "@/components/Skeleton";
import { PleinEcranApercu } from "./PleinEcranApercu";
import { PALETTES } from "@/lib/paletteIframe";
import { adresseImageSvg, appliquerThemeSvg, preparerSvg, type SvgPrepare } from "@/lib/preparerSvg";
import { telechargerContenuLocal } from "@/lib/telecharger";
import { textesSvg } from "@/lib/textesSvg";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import { useLocale } from "@/lib/i18n/useLocale";
import { useTheme } from "@/lib/useTheme";

// Rend un bloc ```svg du markdown : un dessin vectoriel écrit par le modèle
// (schéma libre, illustration, figure qui ne rentre ni dans mermaid, ni dans
// geometrie, ni dans chart). Avant ce composant, un SVG ne s'affichait qu'en
// l'enfermant dans un widget html déplié au clic.
//
// Le dessin est affiché comme une image, jamais injecté dans la page (voir
// lib/preparerSvg.ts pour le nettoyage et les couleurs du thème). Le modèle
// écrit ses couleurs avec les variables du thème (var(--dj-texte), var(--dj-a)
// et les autres, les mêmes que le widget) : elles sont résolues ici, et le
// dessin suit le thème clair ou sombre sans être redemandé.
//
// Affichage sans cadre (décision du 02/11/2026 pour les éléments du chat) : le
// dessin repose directement sur le fond du chat. Il garde sa taille naturelle,
// n'est jamais étiré, et sa hauteur est plafonnée pour qu'un grand dessin ne
// prenne pas tout l'écran. Un appui l'ouvre en plein écran.
//
// Pendant que le modèle écrit, le code est incomplet : on n'essaie de le lire
// qu'une fois la balise de fin arrivée, ou quand le texte s'est arrêté de
// changer depuis 500 ms. Un échec à ce moment là est une vraie erreur.
const DELAI_TEXTE_ARRETE_MS = 500;
const COTE_MAX_PNG_PX = 4096;

function nomFichierSur(titre: string | null, repli: string): string {
  const base = (titre || "").replace(/[^a-z0-9-_]+/gi, "_").replace(/^_+|_+$/g, "");
  return base || repli;
}

export function DessinSvg({ code }: { code: string }) {
  const locale = useLocale();
  const t = textesSvg(locale);
  const { resolu: theme } = useTheme();
  const { enSortie, demarrerFermeture } = useFermetureAnimee();

  const [prepare, setPrepare] = useState<SvgPrepare | null>(null);
  const [erreur, setErreur] = useState(false);
  const [telecharge, setTelecharge] = useState(false);
  const [pleinEcran, setPleinEcran] = useState(false);

  useEffect(() => {
    const complet = /<\/svg\s*>\s*$/i.test(code.trim());
    const delai = setTimeout(
      () => {
        const resultat = preparerSvg(code);
        setPrepare(resultat);
        setErreur(resultat === null);
      },
      complet ? 0 : DELAI_TEXTE_ARRETE_MS
    );
    return () => clearTimeout(delai);
  }, [code]);

  const adresse = useMemo(
    () => (prepare ? adresseImageSvg(appliquerThemeSvg(prepare.svg, theme)) : null),
    [prepare, theme]
  );

  if (!prepare || !adresse) {
    if (erreur) {
      return <div className="my-3 text-xs text-[var(--dj-erreur)]">{t.invalide}</div>;
    }
    return (
      <div className="my-3" role="status" aria-label={t.construction}>
        <Skeleton className="h-[220px] w-full rounded-xl" />
      </div>
    );
  }

  const description = prepare.titre || t.descriptionParDefaut;

  async function telechargerPng() {
    if (!prepare || !adresse) return;
    try {
      const image = new Image();
      await new Promise<void>((ok, ko) => {
        image.onload = () => ok();
        image.onerror = () => ko(new Error("image SVG non chargée"));
        image.src = adresse;
      });
      // Deux fois la taille naturelle pour rester net, sans dépasser la limite des navigateurs.
      const facteur = Math.min(2, COTE_MAX_PNG_PX / Math.max(prepare.largeur, prepare.hauteur));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(prepare.largeur * facteur));
      canvas.height = Math.max(1, Math.round(prepare.hauteur * facteur));
      const contexte = canvas.getContext("2d");
      if (!contexte) return;
      // Un fond plein : un PNG transparent à texte clair serait illisible sur une page blanche.
      contexte.fillStyle = PALETTES[theme].fond;
      contexte.fillRect(0, 0, canvas.width, canvas.height);
      contexte.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/png"));
      if (!blob) return;
      await telechargerContenuLocal(`${nomFichierSur(prepare.titre, t.nomFichierParDefaut)}.png`, blob, "image/png");
      setTelecharge(true);
      setTimeout(() => setTelecharge(false), 1500);
    } catch (e) {
      console.warn("Téléchargement du dessin SVG impossible :", e);
    }
  }

  return (
    <div className="group/nu my-3 animate-dj-fade-in">
      <div className="mb-1 flex items-center justify-end gap-1">
        <button
          onClick={() => setPleinEcran(true)}
          aria-label={t.agrandir}
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-dj-texte-muet transition-opacity hover:text-dj-texte focus-visible:!opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/nu:opacity-100"
        >
          <Maximize2 size={12} />
        </button>
        <button
          onClick={() => void telechargerPng()}
          aria-label={t.telechargerLibelle}
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-dj-texte-muet transition-opacity hover:text-dj-texte focus-visible:!opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/nu:opacity-100"
        >
          {telecharge ? (
            <>
              <Check size={12} /> {t.telecharge}
            </>
          ) : (
            <>
              <Download size={12} /> {t.telecharger}
            </>
          )}
        </button>
      </div>
      <button
        type="button"
        onClick={() => setPleinEcran(true)}
        aria-label={t.agrandir}
        className="mx-auto block max-w-full cursor-zoom-in"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={adresse}
          alt={description}
          draggable={false}
          className="block h-auto w-auto max-h-[min(70vh,480px)] max-w-full"
        />
      </button>

      {pleinEcran && (
        <PleinEcranApercu
          titre={t.titrePleinEcran}
          onFerme={() => demarrerFermeture(() => setPleinEcran(false))}
          enSortie={enSortie}
          entete={
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] uppercase tracking-wide text-dj-texte-muet">{t.titrePleinEcran}</span>
              <button
                onClick={() => demarrerFermeture(() => setPleinEcran(false))}
                aria-label={t.fermer}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-dj-texte-muet hover:text-dj-texte"
              >
                <X size={14} /> {t.fermer}
              </button>
            </div>
          }
        >
          <div className="min-h-0 flex-1 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={adresse} alt={description} draggable={false} className="h-full w-full object-contain" />
          </div>
        </PleinEcranApercu>
      )}
    </div>
  );
}
