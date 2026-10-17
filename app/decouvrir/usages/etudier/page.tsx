import type { Metadata } from "next";
import { PageUsageDecouvrir } from "@/components/PageUsageDecouvrir";
import { USAGES_DECOUVRIR } from "@/lib/usagesDecouvrir";

// Chantier "visibilité auprès des IA" (11/10/2026, demande Bourama). Tout le
// contenu vient de lib/usagesDecouvrir.ts, partagé avec /llms.txt et les
// données structurées : une seule source, jamais de texte recopié ici.
const usage = USAGES_DECOUVRIR.find((u) => u.slug === "etudier")!;

export const metadata: Metadata = {
  title: usage.titrePage,
  description: usage.description,
};

export default function PageDecouvrirUsageEtudier() {
  return <PageUsageDecouvrir usage={usage} />;
}
