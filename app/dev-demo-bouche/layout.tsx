import type { Metadata } from "next";

// Écran interne de test des voix bambara : jamais indexé, jamais partagé.
export const metadata: Metadata = {
  title: "Bambara voice test",
  robots: { index: false, follow: false },
};

export default function LayoutDemoBouche({ children }: { children: React.ReactNode }) {
  return children;
}
