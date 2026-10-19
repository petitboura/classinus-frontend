"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { CTA_CHAT_DECOUVRIR, ctaSectionDecouvrir } from "@/lib/ctaDecouvrir";

// Chantier SEO/AEO de Classinus (18/10/2026, demande Bourama). Les mêmes deux
// boutons que components/CtaDecouvrir.tsx (chat, et section quand la page en
// parle), mais en haut de page et en icônes seules, sans texte. L'icône du
// bouton de section est celle de la section dans l'appli (lib/groupesRail.ts).
// Sans texte visible, chaque bouton garde un nom accessible (aria-label) et une
// info-bulle (title) pour les lecteurs d'écran et le survol à la souris.
// Composant client pour la même raison que CtaDecouvrir : le layout ne connaît
// pas l'adresse de la page. Rendu aussi dans le HTML du serveur.
const CLASSES_BOUTON =
  "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-200 active:scale-[.96]";

export function CtaDecouvrirIcones() {
  const chemin = usePathname();
  const section = chemin ? ctaSectionDecouvrir(chemin) : null;

  return (
    <nav aria-label="Essayer Classinus" className="flex flex-shrink-0 items-center gap-2">
      {section && (
        <Link
          href={section.href}
          {...(section.externe ? { target: "_blank", rel: "noreferrer" } : {})}
          aria-label={section.libelle}
          title={section.libelle}
          className={`${CLASSES_BOUTON} border border-dj-bordure bg-dj-surface text-dj-texte hover:border-dj-bordure-forte hover:bg-dj-surface-haute`}
        >
          <section.Icone size={18} aria-hidden="true" />
        </Link>
      )}
      <Link
        href={CTA_CHAT_DECOUVRIR.href}
        aria-label={CTA_CHAT_DECOUVRIR.libelle}
        title={CTA_CHAT_DECOUVRIR.libelle}
        className={`${CLASSES_BOUTON} bg-dj-accent-1 text-[#1A0D02] hover:bg-dj-accent-2`}
      >
        <MessageCircle size={18} aria-hidden="true" />
      </Link>
    </nav>
  );
}
