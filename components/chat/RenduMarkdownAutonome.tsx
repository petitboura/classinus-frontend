"use client";

// Créé le 19/09/2026, Bourama : la bulle de dialogue du canal en direct
// (components/BulleDialogueAgent.tsx) doit être formatée EXACTEMENT comme
// une réponse du chat : pas seulement gras/italique/liens, mais aussi
// titres, listes, tableaux, code coloré, formules LaTeX, schémas
// (mermaid, graphiques, cartes, géométrie), fiches, QCM, widgets,
// images, fichiers, médias et aperçus de liens.
//
// Ce module reprend le rendu markdown de components/chat/BulleMessage.tsx
// (mêmes plugins remark/rehype, mêmes composants pour chaque bloc), mais
// hors de tout état propre à un message du chat : pas de sources
// numérotées (donc pas de pastilles de citation), pas de mode questions
// groupées, pas d'animation mot par mot. BulleMessage.tsx n'est pas
// modifié (seul un `export` a été ajouté sur ses utilitaires) pour ne
// jamais risquer une régression dans le chat.

import { isValidElement, memo, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
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
import { Skeleton } from "../Skeleton";
import { PLUGINS_REHYPE, PLUGINS_REMARK, normaliserLatex, texteBrut } from "./BulleMessage";

// Même chargement à la demande que dans BulleMessage.tsx : recharts ne
// sert que si le texte contient réellement un bloc ```chart.
const GraphiqueDonnees = dynamic(() => import("./GraphiqueDonnees").then((m) => m.GraphiqueDonnees), {
  ssr: false,
  loading: () => <Skeleton className="h-[260px] w-full rounded-xl border border-dj-bordure" />,
});

const COMPOSANTS_MARKDOWN = {
  pre({ children }: { children?: ReactNode }) {
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
        return <QCMInteractif code={code} />;
      case "question":
        // Aucune réponse ne peut partir d'ici (pas de conversation du chat
        // derrière la bulle) : affichée verrouillée, comme une question
        // déjà répondue.
        return <QuestionInteractive code={code} dejaRepondu />;
      case "fiche":
        return <FicheRevision code={code} />;
      case "widget":
      case "html":
        return <WidgetSandbox code={code} />;
      default:
        return <BlocCode langage={langage} code={code} />;
    }
  },
  code({ children }: { children?: ReactNode }) {
    return (
      <code className="rounded bg-dj-surface-haute px-1.5 py-0.5 font-mono text-[13px] text-dj-texte">{children}</code>
    );
  },
  img({ src, alt }: { src?: string | Blob; alt?: string }) {
    return <ImageMessage src={typeof src === "string" ? src : undefined} alt={alt} />;
  },
  table({ children }: { children?: ReactNode }) {
    return <TableauMessage>{children}</TableauMessage>;
  },
  a({ href, children }: { href?: string; children?: ReactNode }) {
    if (!href) return <>{children}</>;
    const media = typeMedia(href);
    if (media) return <LecteurMedia href={href} type={media} />;
    if (estNoteTexteBibliotheque(href)) return <NoteTexteChip href={href} nom={texteBrut(children) || href} />;
    if (estFichierCodeAffichable(href)) return <FichierCode href={href} nom={texteBrut(children) || href} />;
    if (extensionFichier(href)) return <FichierChip href={href} nom={texteBrut(children) || href} />;
    if (/^https?:\/\//i.test(href)) return <LinkPreview href={href} texteLien={texteBrut(children) || href} />;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-dj-texte-muet underline hover:text-dj-texte">
        {children}
      </a>
    );
  },
};

// Mêmes classes de mise en forme que le conteneur markdown du chat
// (BulleMessage.tsx) : listes, paragraphes, titres.
const CLASSES_CONTENEUR =
  "dj-markdown font-lecture [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 last:[&_p]:mb-0 [&_h1]:font-lecture [&_h1]:font-semibold [&_h1]:tracking-[-0.01em] [&_h1]:text-dj-texte [&_h1]:text-xl [&_h1]:mb-2 [&_h1]:mt-3 [&_h2]:font-lecture [&_h2]:font-semibold [&_h2]:tracking-[-0.01em] [&_h2]:text-dj-texte [&_h2]:text-lg [&_h2]:mb-2 [&_h2]:mt-3 [&_h3]:font-lecture [&_h3]:font-semibold [&_h3]:tracking-[-0.01em] [&_h3]:text-dj-texte [&_h3]:text-base [&_h3]:mb-1.5 [&_h3]:mt-2";

export const RenduMarkdownAutonome = memo(function RenduMarkdownAutonome({
  texte,
  className = "",
}: {
  texte: string;
  className?: string;
}) {
  return (
    <div className={`${CLASSES_CONTENEUR} ${className}`}>
      <ReactMarkdown remarkPlugins={PLUGINS_REMARK} rehypePlugins={PLUGINS_REHYPE} components={COMPOSANTS_MARKDOWN}>
        {normaliserLatex(texte)}
      </ReactMarkdown>
    </div>
  );
});
