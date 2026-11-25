import type { Metadata } from "next";
import { PageUsageDecouvrir } from "@/components/PageUsageDecouvrir";
import { USAGES_DECOUVRIR } from "@/lib/usagesDecouvrir";

// Tout le contenu vient de lib/usagesPlateformeDecouvrir.ts, partagé avec
// /llms.txt et les données structurées : une seule source, jamais de texte
// recopié ici.
const usage = USAGES_DECOUVRIR.find((u) => u.slug === "documents")!;

export const metadata: Metadata = {
  title: usage.titrePage,
  description: usage.description,
};

export default function PageDecouvrirUsageDocuments() {
  return <PageUsageDecouvrir usage={usage} />;
}
