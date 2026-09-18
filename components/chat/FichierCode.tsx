"use client";

import { useMemo, useState } from "react";
import { FileCode } from "lucide-react";
import hljs from "@/lib/coloration";
import { BlocExpansible } from "./BlocExpansible";

// Extensions de code reconnues -> langage highlight.js. Un fichier de
// code livré seul (voir le fix backend generation_code.py, 2026-07-20 :
// un .py seul n'est plus forcé dans un .zip) se déroule dans le fil au
// clic (voir BlocExpansible.tsx) -- plus de panneau latéral, retiré à la
// demande de Bourama.
const LANGAGE_PAR_EXTENSION: Record<string, string> = {
  py: "python", js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
  html: "xml", css: "css", sh: "bash", bash: "bash", sql: "sql", java: "java", c: "c",
  cpp: "cpp", go: "go", rs: "rust", php: "php", rb: "ruby", yml: "yaml", yaml: "yaml",
  md: "markdown", toml: "ini",
};

export function extensionCode(href: string): string | null {
  const match = href.split("?")[0].match(/\.([a-zA-Z0-9]+)$/);
  const ext = match?.[1]?.toLowerCase();
  return ext && ext in LANGAGE_PAR_EXTENSION ? ext : null;
}

// 17/09/2026, demande Bourama ("un type de lien qui se transforme en
// fichier html") : extensionCode() ci-dessus ne regarde QUE l'extension
// dans l'URL, jamais son origine -- n'importe quel lien web externe se
// terminant par .html (fréquent, beaucoup de sites l'utilisent encore),
// .md, .py, etc. était donc affiché comme un fichier de code Clovis à
// dérouler (markup brut, souvent illisible), au lieu d'un aperçu de site
// normal. Restreint à notre propre stockage (comme estOrigineDeConfiance
// dans FichierChip.tsx et estNoteTexteBibliotheque dans NoteTexteChip.tsx,
// dupliqué volontairement ici -- convention du projet, pas de dépendance
// croisée entre petits composants) : un vrai fichier de code généré par
// Clovis vient toujours de ce stockage ; un lien externe, même en .html,
// retombe désormais sur le comportement normal (LinkPreview) dans
// BulleMessage.tsx.
// 18/09/2026 : stockage migré de Supabase vers R2 (clovis-backend,
// core/stockage_r2.py) -- NEXT_PUBLIC_API_URL ajouté comme origine de
// confiance en plus de Supabase (anciens fichiers non migrés).
function estOrigineDeConfiance(href: string): boolean {
  const urlSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const urlApi = process.env.NEXT_PUBLIC_API_URL;
  const originesFiables = [urlSupabase, urlApi].filter(Boolean).map((u) => {
    try {
      return new URL(u as string).origin;
    } catch {
      return null;
    }
  });
  try {
    return originesFiables.includes(new URL(href).origin);
  } catch {
    return false;
  }
}

export function estFichierCodeAffichable(href: string): boolean {
  return extensionCode(href) !== null && estOrigineDeConfiance(href);
}

export function FichierCode({ href, nom }: { href: string; nom: string }) {
  const [contenu, setContenu] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(false);

  const extension = extensionCode(href) || "";
  const langage = LANGAGE_PAR_EXTENSION[extension] || "plaintext";

  const html = useMemo(() => {
    if (!contenu) return "";
    try {
      return hljs.getLanguage(langage) ? hljs.highlight(contenu, { language: langage }).value : hljs.highlightAuto(contenu).value;
    } catch {
      return contenu.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
    }
  }, [contenu, langage]);

  async function charger() {
    setChargement(true);
    try {
      const reponse = await fetch(href);
      if (!reponse.ok) throw new Error();
      setContenu(await reponse.text());
    } catch {
      setErreur(true);
    } finally {
      setChargement(false);
    }
  }

  return (
    <BlocExpansible
      titre={nom}
      icone={FileCode}
      sousTitre={extension}
      chargement={chargement}
      texteACopier={contenu || undefined}
      hrefTelechargement={href}
      onPremiereOuverture={charger}
      enfant={
        erreur ? (
          <p className="px-1 py-4 text-center text-xs text-dj-texte-muet">Aperçu indisponible, utilise Télécharger.</p>
        ) : contenu !== null ? (
          <pre className="overflow-x-auto rounded-lg bg-[var(--dj-fond)] px-4 py-3 font-mono text-[13px] leading-relaxed">
            <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
          </pre>
        ) : null
      }
    />
  );
}
