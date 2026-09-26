import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { EcranAutonome } from "@/components/EcranAutonome";

// Chantier SEO/AEO de Classinus (26/09/2026, demande Bourama). En tête
// partagé par toute la famille de pages publiques de présentation
// /decouvrir/... : juste le logo (retour à l'accueil), aucun chrome
// applicatif (barre du bas, menu) puisque ces pages sont faites pour un
// visiteur qui ne connaît pas encore Classinus, avant tout compte.
//
// EcranAutonome comme les autres écrans hors AppShell (cgu,
// confidentialite, connexion...) : sans lui, la barre système du
// téléphone (encoche, geste du bas) peut recouvrir le contenu sur
// l'appli native, voir components/EcranAutonome.tsx.
export default function LayoutDecouvrir({ children }: { children: ReactNode }) {
  return (
    <EcranAutonome className="min-h-screen bg-dj-fond">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-8">
        <Link href="/" className="flex w-fit items-center gap-2.5">
          <Logo taille={28} />
          <span className="font-display text-base font-bold tracking-tight text-dj-texte">Classinus</span>
        </Link>
        <div className="mt-8 animate-dj-fade-up">{children}</div>
      </div>
    </EcranAutonome>
  );
}
