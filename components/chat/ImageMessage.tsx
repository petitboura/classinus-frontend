"use client";

import { useContext, useState } from "react";
import { ImageOff, ExternalLink } from "lucide-react";
import { VisionneuseImage } from "./VisionneuseImage";
import { ContexteRangeeImages } from "./RangeeImagesContexte";
import { telecharger as telechargerFichier } from "@/lib/telecharger";

// Le title Markdown contient la page d'origine de l'image. Le badge affiche
// le favicon de ce domaine et ouvre cette page, jamais le moteur de recherche.
export function ImageMessage({
  src,
  alt,
  sourceUrl,
}: {
  src?: string;
  alt?: string;
  sourceUrl?: string;
}) {
  const [chargee, setChargee] = useState(false);
  const [enErreur, setEnErreur] = useState(false);
  const [ouverte, setOuverte] = useState(false);
  const [iconeSourceEnErreur, setIconeSourceEnErreur] = useState(false);
  const rangee = useContext(ContexteRangeeImages);
  const dansGalerie = !!rangee && rangee.length > 1;

  let pageSource: string | undefined;
  let domaineSource: string | undefined;
  if (sourceUrl) {
    try {
      const url = new URL(sourceUrl);
      if (url.protocol === "https:" || url.protocol === "http:") {
        pageSource = url.href;
        domaineSource = url.hostname.replace(/^www\\./i, "");
      }
    } catch {
      // Une URL de provenance absente ou invalide ne produit aucun badge.
    }
  }

  if (!src) return null;

  function telecharger() {
    telechargerFichier(src!, alt || "image");
  }

  const badgeSource = pageSource && domaineSource && !iconeSourceEnErreur ? (
    <a
      href={pageSource}
      target="_blank"
      rel="noopener noreferrer"
      title={"Source de l’image : " + domaineSource}
      aria-label={"Ouvrir la source de l’image : " + domaineSource}
      onClick={(event) => event.stopPropagation()}
      className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/25 bg-black/65 p-1 shadow-md backdrop-blur-sm transition-transform hover:scale-110"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- favicon du site source, domaine dynamique */}
      <img
        src={"https://www.google.com/s2/favicons?sz=32&domain=" + encodeURIComponent(domaineSource)}
        alt=""
        width={18}
        height={18}
        loading="lazy"
        decoding="async"
        onError={() => setIconeSourceEnErreur(true)}
        className="h-[18px] w-[18px] rounded-[3px]"
      />
    </a>
  ) : null;

  if (enErreur) {
    return (
      <div className="relative my-2 w-fit max-w-full">
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-fit max-w-full animate-dj-fade-in items-center gap-2.5 rounded-xl border border-dj-bordure bg-dj-surface px-3 py-2.5 no-underline text-dj-texte-muet transition-colors hover:border-dj-bordure-forte hover:text-dj-texte"
        >
          <ImageOff size={16} className="shrink-0" />
          <span className="min-w-0 truncate text-sm">{alt || "Image indisponible"}</span>
          <ExternalLink size={13} className="ml-1 shrink-0" />
        </a>
        {badgeSource}
      </div>
    );
  }

  return (
    <>
      <div className={"relative " + (dansGalerie ? "group w-full min-w-0" : "my-2 w-fit max-w-full")}>
        <button
          type="button"
          onClick={() => chargee && setOuverte(true)}
          className={
            dansGalerie
              ? "relative block aspect-[4/3] w-full overflow-hidden rounded-xl bg-dj-surface-haute"
              : "block max-h-96 overflow-hidden rounded-xl"
          }
          aria-label={alt || "Agrandir l'image"}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- image distante, URL fournie par la recherche */}
          <img
            src={src}
            alt={alt || ""}
            loading="lazy"
            decoding="async"
            onLoad={() => setChargee(true)}
            onError={() => setEnErreur(true)}
            className={
              dansGalerie
                ? "h-full w-full object-cover transition-[opacity,transform] duration-300 " +
                  (chargee ? "opacity-100 group-hover:scale-[1.02]" : "opacity-0")
                : "max-h-96 w-auto transition-opacity duration-500 " + (chargee ? "opacity-100" : "opacity-0")
            }
          />
        </button>
        {badgeSource}
      </div>

      {ouverte && (
        <VisionneuseImage
          src={src}
          alt={alt}
          onFermer={() => setOuverte(false)}
          onTelecharger={telecharger}
          liste={rangee && rangee.length > 1 ? rangee : undefined}
          indexInitial={rangee ? Math.max(0, rangee.findIndex((i) => i.src === src)) : 0}
        />
      )}
    </>
  );
}
