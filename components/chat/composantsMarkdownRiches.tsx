"use client";

// Composants qui affichent les éléments riches d'un message (fichier, aperçu
// de lien, code, diagramme, fiche, question interactive, QCM...).
//
// Sortis de BulleMessage.tsx le 23/09/2026. Cause du bug "les éléments
// disparaissent et réapparaissent pendant la génération" : ReactMarkdown
// prend ces fonctions comme type de composant. Dès que l'objet change de
// référence, React démonte puis remonte tous les éléments riches, qui
// repartent de zéro (chargement, réponse cochée, aperçu ouvert perdus). Il
// était recréé à chaque morceau de texte reçu, car il dépendait de valeurs
// qui changent tout le temps (fonction de réponse recréée à chaque rendu par
// ChatIA, nombre de questions du message...).
//
// Ici, l objet COMPOSANTS_MARKDOWN est créé une seule fois pour toute la vie
// de l'application et ne change jamais. Les valeurs qui varient passent par
// des contextes : un contexte qui change remet à jour les composants sans
// jamais les démonter.
import { createContext, isValidElement, useContext, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { BlocCode } from "./BlocCode";
import { Mermaid } from "./Mermaid";
import { CarteMessage } from "./CarteMessage";
import { SchemaGeometrique } from "./SchemaGeometrique";
import { QCMInteractif } from "./QCMInteractif";
import { QuestionInteractive } from "./QuestionInteractive";
import { FicheRevision } from "./FicheRevision";
import { WidgetSandbox } from "./WidgetSandbox";
import { ImageMessage } from "./ImageMessage";
import { TableauMessage } from "./TableauMessage";
import { FichierChip, extensionFichier } from "./FichierChip";
import { FichierCode, estFichierCodeAffichable } from "./FichierCode";
import { LecteurMedia, typeMedia } from "./LecteurMedia";
import { NoteTexteChip, estNoteTexteBibliotheque } from "./NoteTexteChip";
import { LinkPreview } from "./LinkPreview";
import { ouvrirPosition } from "./visionneurPositionEvenement";
import { texteBrut } from "./texteBrut";
import { Skeleton } from "../Skeleton";
import type { EntreeReponseGroupee } from "@/lib/questionsGroupees";

// Chargé à la demande (pas en haut du bundle du chat) : recharts ne sert
// que si le message contient effectivement un bloc ```chart, et son
// ResponsiveContainer ne rend rien d'utile côté serveur de toute façon
// (mesures de pixels réelles nécessaires), donc ssr:false.
const GraphiqueDonnees = dynamic(() => import("./GraphiqueDonnees").then((m) => m.GraphiqueDonnees), {
  ssr: false,
  loading: () => <Skeleton className="h-[260px] w-full rounded-xl border border-dj-bordure" />,
});

export type SourceAplatie = {
  numero: number;
  titre: string;
  url: string;
  extrait?: string;
  url_extrait?: string;
  reperage?: string;
  position_type?: "page" | "timestamp";
  position_valeur?: number;
  type_mime?: string | null;
};

// Tout ce qui varie d'un rendu à l'autre et dont les éléments riches ont
// besoin. Fourni par BulleMessage.tsx.
export type EtatRenduBulle = {
  conversationId?: string;
  onRepondreQuestion?: (texteFinal: string) => void;
  questionDejaRepondue?: boolean;
  reponsesGroupeesEnvoyees: boolean;
  modeQuestionsGroupees: boolean;
  enregistrerReponseGroupee: (code: string, entree: EntreeReponseGroupee | null) => void;
  sourcesAplaties: SourceAplatie[];
  estUtilisateur: boolean;
};

export const ContexteRenduBulle = createContext<EtatRenduBulle | null>(null);

function PreMarkdown({ children }: { children?: ReactNode }) {
  const etat = useContext(ContexteRenduBulle);

  const enfant = Array.isArray(children) ? children[0] : children;
  if (!isValidElement(enfant)) return <pre>{children}</pre>;

  const props = enfant.props as { className?: string; children?: ReactNode };
  const langage = (props.className || "").replace("language-", "").trim();
  const code = texteBrut(props.children).replace(/\n$/, "");

  switch (langage) {
    case "mermaid":
      return <Mermaid definition={code} />;
    case "chart":
      return <GraphiqueDonnees code={code} />;
    case "carte":
      return <CarteMessage code={code} />;
    case "geometrie":
      return <SchemaGeometrique code={code} />;
    case "qcm":
      return <QCMInteractif code={code} conversationId={etat?.conversationId} />;
    case "question":
      return (
        <QuestionInteractive
          code={code}
          onReponse={etat?.onRepondreQuestion}
          dejaRepondu={!!(etat?.questionDejaRepondue || etat?.reponsesGroupeesEnvoyees)}
          modeGroupe={!!etat?.modeQuestionsGroupees}
          onChangementGroupe={(entree) => etat?.enregistrerReponseGroupee(code, entree)}
        />
      );
    case "fiche":
      return <FicheRevision code={code} />;
    case "widget":
    case "html":
      return <WidgetSandbox code={code} />;
    default:
      return <BlocCode langage={langage} code={code} />;
  }
}

function CodeMarkdown({ children }: { children?: ReactNode }) {
  return (
    <code className="rounded bg-dj-surface-haute px-1.5 py-0.5 font-mono text-[13px] text-dj-texte">
      {children}
    </code>
  );
}

function ImgMarkdown({ src, alt }: { src?: string | Blob; alt?: string }) {
  return <ImageMessage src={typeof src === "string" ? src : undefined} alt={alt} />;
}

function TableMarkdown({ children }: { children?: ReactNode }) {
  return <TableauMessage>{children}</TableauMessage>;
}

function LienMarkdown({ href, children }: { href?: string; children?: ReactNode }) {
  const etat = useContext(ContexteRenduBulle);
  if (!href) return <>{children}</>;

  const matchCitation = /^citation:(\d+)$/.exec(href);
  if (matchCitation) {
    const numero = parseInt(matchCitation[1], 10);
    const source = etat?.sourcesAplaties.find((s) => s.numero === numero);
    if (!source) {
      return <span className="text-dj-accent-1-texte">{children}</span>;
    }
    const libelle = source.reperage ? `${source.titre}, ${source.reperage}` : source.titre;
    return (
      <button
        type="button"
        onClick={() =>
          ouvrirPosition({
            url: source.url,
            titre: libelle,
            positionType: source.position_type,
            positionValeur: source.position_valeur,
            typeMime: source.type_mime,
          })
        }
        title={libelle}
        className="mx-0.5 rounded border border-dj-bordure px-1.5 py-0.5 align-middle text-[11px] font-medium text-dj-accent-1-texte no-underline hover:underline"
      >
        {libelle}
      </button>
    );
  }

  const media = typeMedia(href);
  if (media) return <LecteurMedia href={href} type={media} />;
  if (estNoteTexteBibliotheque(href)) {
    return <NoteTexteChip href={href} nom={texteBrut(children) || href} />;
  }
  if (estFichierCodeAffichable(href)) {
    return <FichierCode href={href} nom={texteBrut(children) || href} />;
  }
  if (extensionFichier(href)) {
    return <FichierChip href={href} nom={texteBrut(children) || href} />;
  }
  if (/^https?:\/\//i.test(href)) {
    return <LinkPreview href={href} texteLien={texteBrut(children) || href} compact={!!etat?.estUtilisateur} />;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-dj-texte-muet underline hover:text-dj-texte"
    >
      {children}
    </a>
  );
}

// Créé une seule fois et jamais recréé : c'est ce qui garde chaque élément
// riche monté pendant toute la génération du message.
export const COMPOSANTS_MARKDOWN = {
  pre: PreMarkdown,
  code: CodeMarkdown,
  img: ImgMarkdown,
  table: TableMarkdown,
  a: LienMarkdown,
};
