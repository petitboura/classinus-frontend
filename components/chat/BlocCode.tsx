"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Check, Download, Maximize2, Minimize2, Play, Square, X } from "lucide-react";
import hljs from "@/lib/coloration";
import { PleinEcranApercu } from "./PleinEcranApercu";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import { telechargerContenuLocal } from "@/lib/telecharger";
import { BlocLarge } from "./BlocLarge";
import { FormulaireValeursPrealables, SortieExecutionCode } from "./SortieExecutionCode";
import { useExecutionPython } from "@/lib/useExecutionPython";

// Rendu des blocs ```lang ... ``` "code réel" du markdown (les langages
// spéciaux -- mermaid/chart/carte/html -- sont interceptés un niveau plus
// haut, dans le composant `pre` custom de BulleMessage.tsx, et ne
// passent jamais par ici).
//
// Coloration syntaxique : highlight.js appelé directement sur le texte
// brut (pas via un plugin rehype dans la chaîne ReactMarkdown) -- un
// plugin rehype réécrirait l'AST du <code> en spans AVANT que ce
// composant ne le reçoive, ce qui casserait deux choses : la détection
// du langage un niveau au-dessus (mermaid/chart/carte ont besoin du
// texte source intact) et le bouton copier (qui a besoin du texte brut,
// pas du HTML coloré). En gardant le texte brut jusqu'ici, les deux
// restent simples.
//
// Téléchargement/plein écran ajoutés le 2026-07-23 (demande de Bourama :
// même niveau de fonctionnalités qu'un fichier livré seul, voir
// FichierCode.tsx/BlocExpansible.tsx -- mais PAS le même composant : un
// bloc de code inline s'affiche directement dans le texte, jamais replié
// derrière un clic comme un fichier joint). Contrairement à un fichier
// généré, il n'y a pas d'URL Supabase ici, juste le texte brut du bloc --
// voir lib/telecharger.ts::telechargerContenuLocal pour le chemin de
// téléchargement (natif Android via MediaStore, replis web/iOS).
//
// 26/09/2026, demande Bourama : le bouton Exécuter était en haut du bloc
// alors que le résultat apparaît en bas, hors du champ visible sur un
// bloc un peu long -- deux correctifs, repris du pattern déjà en place
// dans BlocExpansible.tsx (aperçus de documents) :
//   - Un clic sur Exécuter fait défiler jusqu'au résultat (resultatRef).
//   - Les boutons d'action ont maintenant aussi une version rail sticky
//     (icônes seules), qui "suit" tant qu'on scrolle dans le bloc de code
//     + son résultat -- exactement le même mécanisme que BlocExpansible
//     (rangée du haut visible -> rail masqué ; rangée du haut sortie du
//     champ -> rail apparaît, révélé au survol desktop / tap mobile).
const EXTENSION_PAR_LANGAGE: Record<string, string> = {
  python: "py", javascript: "js", typescript: "ts", xml: "html", css: "css",
  bash: "sh", sql: "sql", java: "java", c: "c", cpp: "cpp", go: "go",
  rust: "rs", php: "php", ruby: "rb", yaml: "yml", markdown: "md", ini: "toml",
  json: "json",
};

// Langages exécutables avec le bouton Exécuter (Python seulement pour l'instant).
const LANGAGES_PYTHON = new Set(["python", "py", "python3"]);

export function BlocCode({ langage, code }: { langage: string; code: string }) {
  const executable = LANGAGES_PYTHON.has((langage || "").toLowerCase());
  const execution = useExecutionPython(code);
  const [copie, setCopie] = useState(false);
  const [pleinEcran, setPleinEcran] = useState(false);
  const { enSortie, demarrerFermeture } = useFermetureAnimee();

  // Rangée du haut (boutons avec texte) visible ou non -- pilote le rail
  // sticky ci-dessous. N'existe que hors plein écran (l'en-tête du plein
  // écran est déjà fixe dans PleinEcranApercu, voir plus bas).
  const topRowRef = useRef<HTMLDivElement | null>(null);
  const [hautVisible, setHautVisible] = useState(true);

  useEffect(() => {
    const cible = topRowRef.current;
    if (!cible) return;
    const observateur = new IntersectionObserver(([entree]) => setHautVisible(entree.isIntersecting), {
      threshold: 0,
    });
    observateur.observe(cible);
    return () => observateur.disconnect();
  }, [pleinEcran]);

  // Sur mobile il n'y a pas de :hover -- un tap dans la zone du code/
  // résultat bascule la visibilité du rail, qui se recache tout seul
  // après un délai (même logique que BlocExpansible.tsx).
  const [railActifTactile, setRailActifTactile] = useState(false);
  const delaiRailRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function basculerRailTactile() {
    if (hautVisible) return;
    setRailActifTactile((v) => {
      const prochain = !v;
      if (delaiRailRef.current) clearTimeout(delaiRailRef.current);
      if (prochain) {
        delaiRailRef.current = setTimeout(() => setRailActifTactile(false), 3000);
      }
      return prochain;
    });
  }

  useEffect(() => {
    return () => {
      if (delaiRailRef.current) clearTimeout(delaiRailRef.current);
    };
  }, []);

  // Zone du résultat -- cible du défilement automatique déclenché par
  // lancerExecution() ci-dessous.
  const resultatRef = useRef<HTMLDivElement | null>(null);

  const html = useMemo(() => {
    try {
      if (langage && hljs.getLanguage(langage)) {
        return hljs.highlight(code, { language: langage }).value;
      }
      return hljs.highlightAuto(code).value;
    } catch {
      // Langage non reconnu ou code encore incomplet (streaming) -- on
      // affiche le texte échappé tel quel plutôt que de planter.
      return code.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
    }
  }, [langage, code]);

  function copier() {
    navigator.clipboard.writeText(code).then(() => {
      setCopie(true);
      setTimeout(() => setCopie(false), 1500);
    });
  }

  // 12/09/2026, Bourama : vrai téléchargement système sur Android
  // (MediaStore.Downloads + notification) au lieu du <a download> web
  // ci-dessus, qui ne fait rien dans l'appli -- voir lib/telecharger.ts.
  function telecharger() {
    const extension = EXTENSION_PAR_LANGAGE[langage] || "txt";
    telechargerContenuLocal(`code.${extension}`, code, "text/plain;charset=utf-8");
  }

  // Bouton Agrandir/Rétrécir partagé entre vue inline et plein écran
  // (BoutonsActions, plus bas) -- seule la fermeture (Rétrécir depuis le
  // plein écran) doit passer par l'animation, pas l'ouverture.
  function basculerPleinEcran() {
    if (pleinEcran) demarrerFermeture(() => setPleinEcran(false));
    else setPleinEcran(true);
  }

  // 26/09/2026 : lance l'exécution ET fait défiler jusqu'au résultat.
  // Double requestAnimationFrame pour laisser React monter/mettre à jour
  // le contenu de resultatRef avant de calculer sa position (un seul rAF
  // arrive parfois avant la peinture du nouvel état).
  function lancerExecution() {
    execution.executer();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resultatRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    });
  }

  const blocPre = (
    <pre className="overflow-x-auto px-4 py-3 font-mono text-[13px] leading-relaxed">
      <code
        className={`hljs language-${langage || "plaintext"}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </pre>
  );

  // Barre d'actions -- réutilisée telle quelle en haut du bloc (avecTexte),
  // dans le rail sticky (icônes seules) et dans l'en-tête plein écran.
  // Même pattern que BoutonsActions dans BlocExpansible.tsx.
  function BoutonsActions({ avecTexte }: { avecTexte: boolean }) {
    const classe = avecTexte
      ? "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-dj-texte-muet transition-colors hover:text-dj-texte"
      : "flex h-8 w-8 items-center justify-center rounded-lg border border-dj-bordure bg-dj-surface-haute text-dj-texte-muet hover:text-dj-texte";
    const classeExecuter = avecTexte
      ? "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-dj-accent-1-texte transition-colors hover:opacity-80"
      : "flex h-8 w-8 items-center justify-center rounded-lg border border-dj-bordure bg-dj-surface-haute text-dj-accent-1-texte hover:opacity-80";
    return (
      <>
        {executable && (
          <button
            onClick={execution.enCours ? execution.arreter : lancerExecution}
            aria-label={execution.enCours ? "Arrêter l'exécution" : "Exécuter le code"}
            className={classeExecuter}
          >
            {execution.enCours ? <Square size={avecTexte ? 12 : 14} /> : <Play size={avecTexte ? 12 : 14} />}
            {avecTexte && (execution.enCours ? "Arrêter" : "Exécuter")}
          </button>
        )}
        <button onClick={copier} aria-label="Copier le code" className={classe}>
          {copie ? <Check size={avecTexte ? 12 : 14} /> : <Copy size={avecTexte ? 12 : 14} />}
          {avecTexte && (copie ? "Copié" : "Copier")}
        </button>
        <button onClick={telecharger} aria-label="Télécharger le code" className={classe}>
          <Download size={avecTexte ? 12 : 14} />
          {avecTexte && "Télécharger"}
        </button>
        <button onClick={basculerPleinEcran} aria-label={pleinEcran ? "Rétrécir" : "Agrandir"} className={classe}>
          {pleinEcran ? <Minimize2 size={avecTexte ? 12 : 14} /> : <Maximize2 size={avecTexte ? 12 : 14} />}
          {avecTexte && (pleinEcran ? "Rétrécir" : "Agrandir")}
        </button>
      </>
    );
  }

  const sortieExecution = executable ? (
    execution.invitesPrealables ? (
      <FormulaireValeursPrealables
        invites={execution.invitesPrealables}
        onValider={execution.lancerAvecValeursPrealables}
        onAnnuler={execution.annulerValeursPrealables}
      />
    ) : (
      <SortieExecutionCode
        etat={execution.etat}
        lignes={execution.lignes}
        images={execution.images}
        erreur={execution.erreur}
        inviteSaisie={execution.inviteSaisie}
        enCours={execution.enCours}
        onRepondreSaisie={execution.repondreSaisie}
        onEffacer={execution.effacer}
      />
    )
  ) : null;

  if (pleinEcran) {
    return (
      <PleinEcranApercu
        titre={langage || "texte"}
        onFerme={() => demarrerFermeture(() => setPleinEcran(false))}
        enSortie={enSortie}
        entete={
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] uppercase tracking-wide text-dj-texte-muet">
              {langage || "texte"}
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <BoutonsActions avecTexte />
              <button
                onClick={() => demarrerFermeture(() => setPleinEcran(false))}
                aria-label="Fermer"
                className="flex items-center gap-1.5 rounded-lg border border-dj-bordure px-2.5 py-1.5 text-xs text-dj-texte-muet hover:text-dj-texte"
              >
                <X size={14} /> Fermer
              </button>
            </div>
          </div>
        }
      >
        <div className="min-h-0 flex-1 overflow-auto">
          {blocPre}
          <div ref={resultatRef}>{sortieExecution}</div>
        </div>
      </PleinEcranApercu>
    );
  }

  // Rail sticky (icônes seules) -- mutuellement exclusif avec la rangée
  // du haut, invisible par défaut, révélé au survol (desktop) ou au tap
  // (mobile, railActifTactile). Ne se démonte jamais (juste opacity).
  const railVisible = !hautVisible && railActifTactile;
  const classeRail = `flex flex-col gap-1.5 transition-opacity duration-200 ${
    hautVisible
      ? "opacity-0 pointer-events-none"
      : railVisible
        ? "opacity-100 pointer-events-auto"
        : "opacity-0 pointer-events-none group-hover/rail:opacity-100 group-hover/rail:pointer-events-auto"
  }`;

  return (
    <BlocLarge className="dj-bloc-code group/code relative my-3 animate-dj-fade-in rounded-xl border border-dj-bordure bg-[var(--dj-fond)]">
      <div ref={topRowRef} className="flex items-center justify-between overflow-hidden rounded-t-xl border-b border-dj-bordure px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wide text-dj-texte-muet">
          {langage || "texte"}
        </span>
        <div className="flex items-center gap-2">
          <BoutonsActions avecTexte />
        </div>
      </div>

      {/* 26/09/2026 -- overflow-hidden ICI (pas sur BlocLarge au-dessus) :
          Bourama a remonté que le rail sticky ne bougeait jamais, restait
          planté en haut. Cause : tout ancêtre avec un overflow différent
          de visible (même overflow-hidden, même sans jamais scroller
          lui-même) désactive position:sticky pour ses descendants -- ils
          se calent sur CET ancêtre-là plutôt que sur le vrai scroll de la
          page. L'ancien overflow-hidden était sur BlocLarge, juste
          au-dessus, ancêtre direct du rail -- déplacé ici, sur un wrapper
          qui ne contient plus que blocPre+résultat (pas le rail), pour
          garder les coins arrondis en bas sans casser le sticky. */}
      <div className="group/rail relative" onClick={basculerRailTactile}>
        <div className="pointer-events-none absolute inset-0 z-10 flex justify-end">
          <div className={`sticky top-2 mr-1 self-start ${classeRail}`} onClick={(e) => e.stopPropagation()}>
            <BoutonsActions avecTexte={false} />
          </div>
        </div>
        <div className="overflow-hidden rounded-b-xl">
          {blocPre}
          <div ref={resultatRef}>{sortieExecution}</div>
        </div>
      </div>
    </BlocLarge>
  );
}
