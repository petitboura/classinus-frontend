import type { Metadata } from "next";

// Page d'arrivée d'un lien de parrainage. Elle ne doit pas être indexée : chaque lien est personnel,
// et les moteurs de recherche n'ont rien à y faire.
export const metadata: Metadata = {
  title: "Invitation Classinus",
  description: "Un ami t'invite sur Classinus. Crée ton compte gratuitement et génère tes propres images.",
  robots: { index: false, follow: false },
};

export default function LayoutInvitation({ children }: { children: React.ReactNode }) {
  return children;
}
