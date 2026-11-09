"use client";

import { Images } from "lucide-react";
import { Skeleton } from "@/components/Skeleton";
import { useMonParrainage } from "@/lib/useMonParrainage";

/**
 * Crédits d'images restants, affichés dans les fenêtres de génération d'image (une image coûte un crédit).
 * Information facultative : si la lecture échoue, rien n'est affiché, le serveur refuse de toute façon une image
 * sans crédit. Le nombre vient du serveur, jamais d'une valeur écrite ici (le solde de départ se règle en base).
 */
export function CreditsImagesHiggsfield() {
  const { resume, charge, enErreur } = useMonParrainage();
  if (enErreur) return null;
  if (!resume) return charge ? <Skeleton className="h-7 w-40 rounded-full" /> : null;

  const n = resume.solde;
  // Un seul texte par état, pour que la traduction le retrouve en entier (lib/i18n/interface.ts).
  const texte = n <= 0 ? "Plus d'images disponibles" : `${n} image${n > 1 ? "s" : ""} restante${n > 1 ? "s" : ""}`;

  return (
    <span
      key={n}
      className={`inline-flex w-fit animate-dj-fade-in-rapide items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
        n <= 0 ? "border-red-200 bg-red-50 text-red-700" : "border-dj-bordure bg-dj-surface text-dj-texte"
      }`}
    >
      <Images className="h-3.5 w-3.5" aria-hidden />
      {texte}
    </span>
  );
}
