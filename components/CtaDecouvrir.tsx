"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, MessageCircle } from "lucide-react";
import { CTA_CHAT_DECOUVRIR, ctaSectionDecouvrir } from "@/lib/ctaDecouvrir";

// Chantier SEO/AEO de Classinus (18/10/2026, demande Bourama). Boutons posés
// sous le contenu de toute page /decouvrir, depuis app/decouvrir/layout.tsx :
// un seul endroit au lieu de les ajouter dans chacune des pages. Le bouton du
// chat est toujours là ; celui de la section n'apparaît que si la page parle
// d'une section (règle et table dans lib/ctaDecouvrir.ts).
//
// Composant client UNIQUEMENT parce qu'un layout ne connaît pas l'adresse de la
// page affichée (même raison que DonneesPageDecouvrir.tsx). Il est tout de même
// rendu dans le HTML du serveur, donc les liens sont lisibles par un robot qui
// n'exécute pas de JavaScript. usePathname n'a pas besoin de <Suspense>.
//
// Aucun état de chargement : tout est connu dès le rendu, il n'y a donc pas de
// skeleton à prévoir. Il apparaît avec le contenu de la page (animation du
// layout), jamais de façon brute.
export function CtaDecouvrir() {
  const chemin = usePathname();
  const section = chemin ? ctaSectionDecouvrir(chemin) : null;

  return (
    <nav
      aria-label="Essayer Classinus"
      className="mt-12 flex flex-col items-stretch gap-3 border-t border-dj-bordure pt-6 sm:flex-row sm:items-center sm:justify-center"
    >
      <Link
        href={CTA_CHAT_DECOUVRIR.href}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-dj-accent-1 px-5 py-3 text-sm font-semibold text-[#1A0D02] transition-all duration-200 hover:bg-dj-accent-2 active:scale-[.98]"
      >
        <MessageCircle size={16} aria-hidden="true" />
        {CTA_CHAT_DECOUVRIR.libelle}
      </Link>

      {section && (
        <Link
          href={section.href}
          className="group inline-flex items-center justify-center gap-2 rounded-xl border border-dj-bordure bg-dj-surface px-5 py-3 text-sm font-semibold text-dj-texte transition-all duration-200 hover:border-dj-bordure-forte hover:bg-dj-surface-haute active:scale-[.98]"
        >
          {section.libelle}
          <ArrowRight
            size={16}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      )}
    </nav>
  );
}
