"use client";

import { useMemo, useState } from "react";
import { FileCode } from "lucide-react";
import hljs from "@/lib/coloration";
import { BlocExpansible } from "./BlocExpansible";
import { CarteFichierLecteur } from "./CarteFichierLecteur";
import { useLecteurDisponible, type ContenuLecteur } from "@/lib/lecteurLateral";
import { estOrigineDeConfiance } from "@/lib/originesFiables";

// Extensions de code reconnues -> langage highlight.js. Un fichier de
// code livré seul (voir le fix backend generation_code.py, 2026-07-20 :
// un .py seul n'est plus forcé dans un .zip) s'ouvre dans le lecteur à côté
// du chat quand il existe (page du chat, voir VoletLecteur.tsx), et se
// déroule dans le fil au clic (voir BlocExpansible.tsx) partout ailleurs.
//
// 20/09/2026, demande Bourama : "md" n'est plus dans cette liste. Un
// fichier .md passait ici (texte brut, police à chasse fixe, lignes jamais
// coupées donc défilement sur le côté) AVANT d'atteindre le lecteur de
// texte formaté de FichierChip.tsx (vrais titres et tableaux, boutons
// Formaté/Brut, Brut qui coupe les lignes) : ce dernier n'était donc jamais
// utilisé pour les .md venant de notre stockage. Sans "md" ici,
// estFichierCodeAffichable() répond faux et le fichier tombe sur
// FichierChip, dans BulleMessage.tsx comme dans RenduMarkdownAutonome.tsx.
const LANGAGE_PAR_EXTENSION: Record<string, string> = {
  py: "python", js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
  html: "xml", css: "css", sh: "bash", bash: "bash", sql: "sql", java: "java", c: "c",
  cpp: "cpp", go: "go", rs: "rust", php: "php", rb: "ruby", yml: "yaml", yaml: "yaml",
  toml: "ini",
};

/** Langage highlight.js d'une extension de code (py, ts...), ou null si ce n'est pas du code. */
export function langageDeCode(extension: string | null | undefined): string | null {
  const ext = (extension || "").toLowerCase();
  return ext && ext in LANGAGE_PAR_EXTENSION ? LANGAGE_PAR_EXTENSION[ext] : null;
}

/** HTML coloré d'un code source. Même rendu dans le fil (FichierCode) et dans le lecteur (ContenuCode.tsx). */
export function colorierCode(contenu: string, langage: string): string {
  try {
    return hljs.getLanguage(langage) ? hljs.highlight(contenu, { language: langage }).value : hljs.highlightAuto(contenu).value;
  } catch {
    return contenu.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
  }
}

export function extensionCode(href: string): string | null {
  const match = href.split("?")[0].match(/\.([a-zA-Z0-9]+)$/);
  const ext = match?.[1]?.toLowerCase();
  return ext && ext in LANGAGE_PAR_EXTENSION ? ext : null;
}

// 17/09/2026, demande Bourama ("un type de lien qui se transforme en
// fichier html") : extensionCode() ci-dessus ne regarde QUE l'extension
// dans l'URL, jamais son origine -- n'importe quel lien web externe se
// terminant par .html (fréquent, beaucoup de sites l'utilisent encore),
// .md, .py, etc. était donc affiché comme un fichier de code Classinus à
// dérouler (markup brut, souvent illisible), au lieu d'un aperçu de site
// normal. Restreint à notre propre stockage (comme estOrigineDeConfiance
// dans FichierChip.tsx et estNoteTexteBibliotheque dans NoteTexteChip.tsx,
// dupliqué volontairement ici -- convention du projet, pas de dépendance
// croisée entre petits composants) : un vrai fichier de code généré par
// Classinus vient toujours de ce stockage ; un lien externe, même en .html,
// retombe désormais sur le comportement normal (LinkPreview) dans
// BulleMessage.tsx.
// 18/09/2026 : stockage migré de Supabase vers R2 (clovis-backend,
// core/stockage_r2.py) -- NEXT_PUBLIC_API_URL ajouté comme origine de
// confiance en plus de Supabase (anciens fichiers non migrés).
export function estFichierCodeAffichable(href: string): boolean {
  return extensionCode(href) !== null && estOrigineDeConfiance(href);
}

// Ce que le lecteur affiche pour un fichier de code. Partagé avec l'ouverture
// automatique en fin de réponse (premierContenuReponse.ts) : mêmes champs, même
// identifiant, donc la carte indique bien "Ouvert à droite".
export function contenuLecteurCode(href: string, nom: string): ContenuLecteur {
  const extension = extensionCode(href) || "";
  return {
    genre: "fichier",
    id: `fichier:${href}`,
    titre: nom,
    url: href,
    extension,
    typeMime: null,
    sousTitre: extension,
    icone: FileCode,
    telechargeable: true,
  };
}

export function FichierCode({ href, nom }: { href: string; nom: string }) {
  const [contenu, setContenu] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(false);

  const extension = extensionCode(href) || "";
  const langage = LANGAGE_PAR_EXTENSION[extension] || "plaintext";

  const html = useMemo(() => (contenu ? colorierCode(contenu, langage) : ""), [contenu, langage]);
  // Page du chat : une carte ouvre le code dans le lecteur à côté de la conversation.
  const lecteurAuVolet = useLecteurDisponible();

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

  if (lecteurAuVolet) {
    return (
      <CarteFichierLecteur
        nom={nom}
        sousTitre={extension}
        Icone={FileCode}
        contenu={contenuLecteurCode(href, nom)}
      />
    );
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
          <pre className="overflow-x-auto whitespace-pre rounded-lg bg-[var(--dj-fond)] px-4 py-3 font-code text-[13px] leading-relaxed">
            <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
          </pre>
        ) : null
      }
    />
  );
}
