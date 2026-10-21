"use client";

import Link from "next/link";
import { estCleSection } from "@/lib/cleSections";
import { useFenetres } from "@/lib/contexteFenetres";
import { RACCOURCIS_CHAT_BUREAU, RACCOURCIS_CHAT_MOBILE } from "@/lib/raccourcisChat";

// Sur PC, toutes les sous-sections défilent sur une seule ligne à leur
// emplacement actuel, avec un fondu aux deux bords. Sur mobile, la liste
// verticale existante reste au-dessus de la barre de saisie.
type Props = {
  variante: "bureau" | "mobile";
  visible?: boolean;
};

const DECALAGE_ALIGNEMENT_PLUS = "pl-[calc(1px+0.75rem)]";

export function RaccourcisChat({ variante, visible = true }: Props) {
  const { ouvrir } = useFenetres();

  if (variante === "bureau") {
    return (
      <div className="relative mt-3 hidden w-full min-w-0 md:block">
        <nav
          aria-label="Sous-sections"
          className="flex w-full min-w-0 gap-1.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            maskImage: "linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)",
          }}
        >
          {RACCOURCIS_CHAT_BUREAU.map(({ id, label, href, Icone }) => (
            <Link
              key={id}
              href={href}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !estCleSection(href)) return;
                e.preventDefault();
                ouvrir(href);
              }}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-dj-bordure bg-dj-surface px-2.5 py-1.5 text-xs text-dj-texte-muet transition-colors hover:border-dj-bordure-forte hover:text-dj-texte"
            >
              <Icone size={14} aria-hidden className="flex-shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <div
      aria-hidden={!visible}
      className={
        "grid transition-[grid-template-rows,opacity] duration-300 ease-cgpt-doux md:hidden " +
        (visible ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0")
      }
    >
      <nav aria-label="Raccourcis" className="min-h-0 overflow-hidden">
        <ul className="pb-2">
          {RACCOURCIS_CHAT_MOBILE.map(({ id, label, href, Icone }) => (
            <li key={id}>
              <Link
                href={href}
                tabIndex={visible ? 0 : -1}
                className={`flex h-11 items-center ${DECALAGE_ALIGNEMENT_PLUS} text-sm text-dj-texte-muet transition-colors hover:text-dj-texte`}
              >
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center">
                  <Icone size={18} aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
