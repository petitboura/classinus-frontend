"use client";

import Link from "next/link";
import { estCleSection } from "@/lib/cleSections";
import { useFenetres } from "@/lib/contexteFenetres";
import { RACCOURCIS_CHAT_BUREAU, RACCOURCIS_CHAT_MOBILE } from "@/lib/raccourcisChat";

// 01/10/2026, demande Bourama : raccourcis directs vers des sous-sections
// utiles sur l'écran vide du chat (listes dans lib/raccourcisChat.ts,
// une par appareil). Deux formes, un seul composant :
// - "bureau" (PC) : petits rectangles arrondis (icône + nom) sous la
//   barre de saisie, dans la même famille de forme qu'elle mais plus
//   petits, ni pilule ronde ni carré, sur une seule ligne et répartis en
//   colonnes égales pour que le premier et le dernier touchent les bords
//   de la barre. Un clic ouvre la sous-section en fenêtre flottante par-dessus
//   le chat (même mécanisme que le rail, voir lib/contexteFenetres.tsx),
//   sans quitter la page.
// - "mobile" : une liste, une ligne par raccourci, placée AU-DESSUS de la
//   barre de saisie (qui reste collée en bas, avec le clavier). Chaque
//   icône est centrée sur la même verticale que le bouton "+" de la barre
//   (cellule de 44px comme ce bouton, décalée de la bordure et du
//   remplissage de la barre, voir BarreDeSaisie.tsx), le nom juste à côté.
//   Elle se replie en douceur quand `visible` passe à false (quand
//   l'étudiant clique pour écrire, la barre monte au milieu).
// Ce sont de vrais liens (<Link href>), donc lisibles par les moteurs de
// recherche et ouvrables dans un nouvel onglet, comme les autres liens.
type Props = {
  variante: "bureau" | "mobile";
  // Mobile seulement : faux quand l'étudiant écrit, la liste est alors repliée.
  visible?: boolean;
};

// Bordure (1px) + remplissage horizontal (px-3 = 0.75rem) de la barre mobile :
// décalage qui aligne la cellule d'icône sur celle du bouton "+".
const DECALAGE_ALIGNEMENT_PLUS = "pl-[calc(1px+0.75rem)]";

export function RaccourcisChat({ variante, visible = true }: Props) {
  const { ouvrir } = useFenetres();

  if (variante === "bureau") {
    return (
      <nav aria-label="Raccourcis" className="mt-3 hidden w-full grid-flow-col auto-cols-fr gap-1.5 md:grid">
        {RACCOURCIS_CHAT_BUREAU.map(({ id, label, href, Icone }) => (
          <Link
            key={id}
            href={href}
            onClick={(e) => {
              // Clic simple : fenêtre flottante. Ctrl/Cmd/clic molette gardent
              // le comportement de lien (nouvel onglet), comme tout lien.
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !estCleSection(href)) return;
              e.preventDefault();
              ouvrir(href);
            }}
            className="inline-flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-dj-bordure bg-dj-surface px-2 py-1.5 text-xs text-dj-texte-muet transition-colors hover:border-dj-bordure-forte hover:text-dj-texte"
          >
            <Icone size={14} aria-hidden className="flex-shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </nav>
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
