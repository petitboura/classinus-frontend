"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { lireChampsEntete } from "@/lib/enteteSkill";
import { EnteteSkillModifiable } from "@/components/EnteteSkillModifiable";

// Même rendu du corps que le reste de l'app (classes dj-markdown des aperçus de skills).
const CLASSES_MARKDOWN =
  "dj-markdown [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 last:[&_p]:mb-0 [&_hr]:my-4 [&_hr]:border-dj-bordure [&_strong]:text-dj-texte " +
  "[&_h1]:font-lecture [&_h1]:font-semibold [&_h1]:tracking-[-0.01em] [&_h1]:text-dj-texte [&_h1]:text-xl [&_h1]:mb-2 [&_h1]:mt-3 " +
  "[&_h2]:font-lecture [&_h2]:font-semibold [&_h2]:tracking-[-0.01em] [&_h2]:text-dj-texte [&_h2]:text-lg [&_h2]:mb-2 [&_h2]:mt-3 " +
  "[&_h3]:font-lecture [&_h3]:font-semibold [&_h3]:tracking-[-0.01em] [&_h3]:text-dj-texte [&_h3]:text-base [&_h3]:mb-1.5 [&_h3]:mt-2";

const ETIQUETTE = "text-xs font-medium uppercase tracking-wide text-dj-texte-muet";

/** Bouton double Formaté / Brut, même style que la fenêtre des textes collés. */
export function BasculeFormatBrut({ vueBrute, onChanger }: { vueBrute: boolean; onChanger: (brut: boolean) => void }) {
  const classe = (actif: boolean) =>
    `rounded-md px-2.5 py-1 text-xs transition-colors duration-200 ${actif ? "bg-dj-surface-haute text-dj-texte" : "text-dj-texte-muet hover:text-dj-texte"}`;
  return (
    <div className="flex gap-1" role="tablist" aria-label="Affichage du fichier">
      <button type="button" role="tab" aria-selected={!vueBrute} onClick={() => onChanger(false)} className={classe(!vueBrute)}>Formaté</button>
      <button type="button" role="tab" aria-selected={vueBrute} onClick={() => onChanger(true)} className={classe(vueBrute)}>Brut</button>
    </div>
  );
}

/**
 * Aperçu formaté d'un fichier markdown. Quand le fichier commence par un en-tête
 * (SKILL.md) : le nom à côté du mot Nom, la description sous le mot Description en
 * texte plus petit et dans une autre police, sans cadre et sur toute la largeur,
 * puis les autres champs, puis le corps en markdown.
 */
export type EditionEntete = { nom: string; description: string; onNom: (v: string) => void; onDescription: (v: string) => void };

export function ApercuSkillMd({ contenu, vide = "Rien à afficher pour l'instant.", edition }: { contenu: string; vide?: string; edition?: EditionEntete }) {
  const lu = useMemo(() => lireChampsEntete(contenu), [contenu]);
  const corps = (lu ? lu.corps : contenu).trim();
  const nom = lu?.champs.find(c => c.cle === "name")?.valeur ?? "";
  const description = lu?.champs.find(c => c.cle === "description")?.valeur ?? "";
  const autres = (lu?.champs ?? []).filter(c => c.cle !== "name" && c.cle !== "description" && c.valeur !== "");
  const aEntete = !!edition || (!!lu && (nom !== "" || description !== "" || autres.length > 0));
  if (!aEntete && !corps) return <p className="text-sm text-dj-texte-muet">{vide}</p>;
  return (
    <div className="flex min-w-0 flex-col gap-4 break-words">
      {aEntete && (
        <div className="flex flex-col gap-3">
          {edition ? (
            <EnteteSkillModifiable nom={edition.nom} description={edition.description} onNom={edition.onNom} onDescription={edition.onDescription} />
          ) : (
            <>
              {nom && (
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className={ETIQUETTE}>Nom</span>
                  <span className="text-base font-semibold text-dj-texte">{nom}</span>
                </p>
              )}
              {description && (
                <div className="flex flex-col gap-1">
                  <span className={ETIQUETTE}>Description</span>
                  <p className="w-full whitespace-pre-line font-lecture text-sm leading-relaxed text-dj-texte-muet">{description}</p>
                </div>
              )}
            </>
          )}
          {autres.map(c => (
            <div key={c.cle} className="flex flex-col gap-1">
              <span className={ETIQUETTE}>{c.cle}</span>
              <p className="w-full whitespace-pre-line font-lecture text-sm leading-relaxed text-dj-texte-muet">{c.valeur}</p>
            </div>
          ))}
        </div>
      )}
      {aEntete && corps && <hr className="border-dj-bordure" />}
      {corps && (
        <div className={CLASSES_MARKDOWN}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeSanitize, defaultSchema]]}>{corps}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

/** Aperçu avec son bouton Formaté / Brut, Formaté par défaut. Brut montre le texte tel quel. */
export function ApercuSkillMdAvecBascule({ contenu }: { contenu: string }) {
  const [brut, setBrut] = useState(false);
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <BasculeFormatBrut vueBrute={brut} onChanger={setBrut} />
      <div key={brut ? "brut" : "formate"} className="animate-dj-fade-in-rapide">
        {brut
          ? <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-dj-texte">{contenu}</pre>
          : <ApercuSkillMd contenu={contenu} />}
      </div>
    </div>
  );
}
