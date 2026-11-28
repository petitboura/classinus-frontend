"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import { ExternalLink } from "lucide-react";
import { LinkPreview } from "./LinkPreview";
import { BoutonCopierLien } from "./BoutonCopierLien";
import { VisionneurPdf } from "@/components/VisionneurPdf";
import {
  TYPES_MIME_OFFICE,
  estTypeTexteLisible,
  estFichierMarkdown,
  ContenuTexte,
  ContenuMarkdown,
  ContenuOffice,
  ContenuNonPrevisualisable,
} from "@/components/VisionneuseBibliotheque";
import { ouvrirSiteExterieur } from "@/lib/liensSortants";
import { langageDeCode } from "./FichierCode";
import { ContenuCode } from "./ContenuCode";

// 27/11/2026 : le choix de l'aperçu selon le type d'un fichier (PDF, livre,
// image, Office, markdown, texte, audio, carte de site) vivait entièrement dans
// VisionneurPositionGlobal.tsx. Il est extrait ici pour que la fenêtre des
// sources citées et le nouveau volet à côté du chat (VoletLecteur.tsx) affichent
// exactement les mêmes aperçus, sans logique copiée.
//
// ATTENTION : ce fichier importe react-pdf (via VisionneurPdf), qui touche des
// API du navigateur dès l'import. Il ne doit JAMAIS être
// importé statiquement par un composant rendu côté serveur : toujours via
// next/dynamic({ ssr: false }), comme le font VisionneurPositionGlobal.tsx et
// VoletLecteur.tsx.

// La liseuse (EPUB, MOBI) est lourde : chargée seulement à l'ouverture d'un livre,
// comme dans FichierChip.tsx. Ce fichier est monté à la racine de l'app.
const VisionneurLivre = dynamic(() => import("@/components/VisionneurLivre").then((m) => m.VisionneurLivre), {
  ssr: false,
});

export type ApercuFichier = {
  url: string;
  titre: string;
  positionType?: "page" | "timestamp" | null;
  positionValeur?: number | null;
  typeMime?: string | null;
  titreDuModele?: string;
  descriptionLien?: string;
  /** Extension connue par ailleurs (epub, mobi...), quand le type MIME manque. */
  extension?: string | null;
};

/** Classe un fichier dans l'un des aperçus disponibles. Un seul à la fois est vrai. */
export function typeApercu(detail: ApercuFichier) {
  const typeMime = detail.typeMime || "";
  const extension = (detail.extension || "").toLowerCase();
  const estLivre = extension === "epub" || extension === "mobi";
  const estImage = typeMime.startsWith("image/");
  const estAudio = typeMime.startsWith("audio/") || detail.positionType === "timestamp";
  const estPdf = typeMime === "application/pdf" || detail.positionType === "page" || extension === "pdf";
  const estOffice = TYPES_MIME_OFFICE.has(typeMime);
  const estLien = typeMime === "text/uri-list";
  // Code source (py, js, ts, html...) : reconnu par l'extension, celle donnée ou
  // celle du nom du fichier (une pièce jointe n'a souvent qu'un type MIME générique).
  const extensionDuNom = detail.titre.includes(".") ? detail.titre.split(".").pop() : null;
  const extensionCodeFichier = extension || (extensionDuNom || "").toLowerCase();
  const estCode =
    !estLien && !estPdf && !estLivre && !estImage && !estAudio && !estOffice && langageDeCode(extensionCodeFichier) !== null;
  const estMarkdown = !estLien && !estCode && estFichierMarkdown(detail.titre, typeMime);
  const estTexte = !estLien && !estCode && !estMarkdown && estTypeTexteLisible(typeMime);
  // Aucun type MIME du tout : pas un fichier de bibliothèque, donc une source
  // web (résultat de recherche), affichée en carte de site, jamais en iframe.
  const estSiteWeb = !detail.typeMime && !estPdf && !estAudio && !estLivre && !estCode;
  const estNonPrevisualisable = !(
    estAudio || estPdf || estLivre || estImage || estOffice || estCode || estMarkdown || estTexte || estSiteWeb || estLien
  );
  return {
    extensionCodeFichier,
    estCode,
    estLivre,
    estImage,
    estAudio,
    estPdf,
    estOffice,
    estLien,
    estMarkdown,
    estTexte,
    estSiteWeb,
    estNonPrevisualisable,
  };
}

function LecteurAudioPosition({ url, debutSecondes }: { url: string; debutSecondes: number }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <audio
        ref={audioRef}
        src={url}
        controls
        autoPlay
        className="w-full max-w-md"
        onLoadedMetadata={() => {
          if (audioRef.current) audioRef.current.currentTime = debutSecondes;
        }}
      />
      <p className="text-sm text-dj-texte-muet">
        Lecture démarrée à {Math.floor(debutSecondes / 60)}:{String(debutSecondes % 60).padStart(2, "0")}
      </p>
    </div>
  );
}

// Image de bibliothèque citée en source (pas de position page ou instant) :
// même rendu simple qu'un aperçu plein cadre, cohérent avec VisionneuseBibliotheque.tsx.
function VisionneurImage({ url, titre }: { url: string; titre: string }) {
  return (
    // Source dynamique (bucket Supabase), pas un asset local optimisable.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={titre} className="mx-auto min-h-[12rem] max-h-[75vh] w-auto object-contain" />
  );
}

// Carte de site pour une source qui n'a PAS de type MIME, donc pas un fichier de
// bibliothèque mais un résultat de recherche web. Jamais d'iframe forcée (la
// quasi totalité des sites la refusent, voir LinkPreview.tsx) : aperçu Open
// Graph et bouton explicite pour sortir si l'utilisateur le veut vraiment.
function CarteSiteExterne({
  url,
  titre,
  titreDuModele,
  descriptionLien,
}: {
  url: string;
  titre: string;
  titreDuModele?: string;
  descriptionLien?: string;
}) {
  return (
    // data-apercu-actif : GardienLiensSortants.tsx laisse la carte inerte ici,
    // la seule sortie est le bouton "Ouvrir le site" ci dessous.
    <div className="p-5" data-apercu-actif>
      <LinkPreview href={url} texteLien={titre} titreDuModele={titreDuModele} descriptionLien={descriptionLien} detaille sansBoutonCopier />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => ouvrirSiteExterieur(url)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
        >
          <ExternalLink size={13} /> Ouvrir le site
        </button>
        <BoutonCopierLien href={url} variante="texte" />
      </div>
    </div>
  );
}

export function ContenuFichierApercu({
  detail,
  markdownPilote,
}: {
  detail: ApercuFichier;
  /** Fourni par le volet : la vue Formaté ou Brut et le texte chargé vivent dans
   * son en-tête (le texte chargé sert aussi au bouton Copier du code). Sans cette
   * prop, le markdown garde son bandeau interne. */
  markdownPilote?: { vueBrute: boolean; surTexteCharge: (texte: string) => void };
}) {
  const t = typeApercu(detail);

  if (t.estAudio) return <LecteurAudioPosition url={detail.url} debutSecondes={detail.positionValeur ?? 0} />;
  if (t.estPdf) {
    return <VisionneurPdf url={detail.url} page={detail.positionType === "page" ? detail.positionValeur ?? 1 : 1} />;
  }
  if (t.estLivre) {
    return <VisionneurLivre url={detail.url} nom={detail.titre} extension={(detail.extension || "").toLowerCase()} />;
  }
  if (t.estImage) return <VisionneurImage url={detail.url} titre={detail.titre} />;
  if (t.estOffice) return <ContenuOffice href={detail.url} titre={detail.titre} />;
  if (t.estCode) {
    return (
      <ContenuCode href={detail.url} extension={t.extensionCodeFichier} onTexteCharge={markdownPilote?.surTexteCharge} />
    );
  }
  if (t.estMarkdown) {
    return markdownPilote ? (
      <ContenuMarkdown
        href={detail.url}
        masquerEntete
        vueBrute={markdownPilote.vueBrute}
        onTexteCharge={markdownPilote.surTexteCharge}
      />
    ) : (
      <ContenuMarkdown href={detail.url} />
    );
  }
  if (t.estTexte) return <ContenuTexte href={detail.url} />;
  if (t.estSiteWeb || t.estLien) {
    return (
      <CarteSiteExterne
        url={detail.url}
        titre={detail.titre}
        titreDuModele={detail.titreDuModele}
        descriptionLien={detail.descriptionLien}
      />
    );
  }
  return <ContenuNonPrevisualisable href={detail.url} nom={detail.titre} />;
}
