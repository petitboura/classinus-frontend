import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { LIGNE_TRAIT_ICONE_18, TRAIT_ICONE_SECTION } from "@/lib/styleLignes";

// Liste des sous-sections d'une section (Bureau, Bibliothèque, Concentration,
// Personnaliser Classinus). Lignes à nu, sans carte ni flèche, séparées par un
// trait qui commence après l'icône (voir lib/styleLignes.ts).
export function ListeSections({
  sections,
}: {
  sections: { href: string; label: string; description: string; Icone: LucideIcon }[];
}) {
  return (
    <div className="flex flex-col">
      {sections.map((s) => (
        <Link
          key={s.href}
          href={s.href}
          className={`flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-dj-surface-haute ${LIGNE_TRAIT_ICONE_18}`}
        >
          <s.Icone size={18} strokeWidth={TRAIT_ICONE_SECTION} className="flex-shrink-0 text-dj-texte-muet" />
          <div className="flex-1 overflow-hidden">
            <div className="truncate text-sm font-semibold text-dj-texte">{s.label}</div>
            <div className="truncate text-xs text-dj-texte-muet">{s.description}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
