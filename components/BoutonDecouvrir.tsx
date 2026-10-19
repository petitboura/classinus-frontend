"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Compass } from "lucide-react";
import { estPageChat } from "@/lib/routesApp";
import { ROUTES_DECOUVRIR } from "@/lib/routesDecouvrir";
import { TRAIT_ICONE_SECTION } from "@/lib/styleLignes";

// Chantier SEO/AEO de Classinus (18/10/2026, demande Bourama). Bouton unique
// vers la page générale /decouvrir, en haut à droite sur tous les écrans de
// l'appli SAUF le chat plein écran.
//
// Position : à gauche du bouton horloge des minuteurs (components/chat/
// minuteurs/LanceurMinuteur.tsx : fixed right-11, 1.75rem de large), avec le
// même alignement vertical. Sans compte connecté, ni la cloche ni l'horloge ne
// sont montées (BoutonNotifications.tsx, DockMinuteurs.tsx dans AppShell) : le
// bouton prend alors la place la plus à droite pour ne pas laisser de trou.
//
// Le chemin de l'écran actuel est transmis en ?depuis=, comme le fait déjà
// BoutonInfoSection.tsx : le bouton retour des pages /decouvrir ramène alors
// exactement ici (voir lib/depuisDecouvrir.ts).
//
// Apparition et disparition animées (fondu) : le bouton disparaît quand on
// entre dans le chat et revient quand on en sort, jamais de façon brute.
export function BoutonDecouvrir({ connecte }: { connecte: boolean }) {
  const pathname = usePathname();
  const visible = !estPageChat(pathname);
  const href = pathname ? `${ROUTES_DECOUVRIR.accueil}?depuis=${encodeURIComponent(pathname)}` : ROUTES_DECOUVRIR.accueil;

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          key="bouton-decouvrir"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className={`fixed top-[calc(0.625rem+var(--safe-top,0px))] z-40 ${connecte ? "right-[4.75rem]" : "right-2"}`}
        >
          <Link
            href={href}
            aria-label="Découvrir Classinus"
            title="Découvrir Classinus"
            className="flex h-7 w-7 items-center justify-center rounded-full text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
          >
            <Compass size={16} strokeWidth={TRAIT_ICONE_SECTION} aria-hidden="true" />
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
