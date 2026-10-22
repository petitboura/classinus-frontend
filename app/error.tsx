"use client";

import { useEffect } from "react";
import { textesPagesErreur } from "@/lib/textesPagesErreur";

type PropsErreur = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Limite les erreurs de rendu à la page concernée et donne à l'utilisateur
 * un moyen clair de relancer l'affichage sans exposer les détails techniques.
 */
export default function ErrorPage({ error, reset }: PropsErreur) {
  const textes = textesPagesErreur();

  useEffect(() => {
    // Le détail reste dans la console pour le diagnostic, jamais dans l'interface.
    console.error("Erreur de rendu dans Classinus :", error);
  }, [error]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-dj-fond px-6 py-8 font-sans text-dj-texte">
      <section className="w-full max-w-[460px]">
        <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-dj-texte-muet">
          Classinus
        </p>
        <h1 className="mb-3 text-2xl font-semibold leading-tight sm:text-3xl">
          {textes.pageTitre}
        </h1>
        <p role="alert" aria-live="assertive" className="mb-3 leading-relaxed text-dj-texte-muet">
          {textes.pageProbleme}
        </p>
        <p className="mb-6 leading-relaxed text-dj-texte-muet">
          {textes.verifierAvantRefaire}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-cgpt-bouton border border-dj-bordure bg-dj-surface-haute px-[22px] py-3 text-sm font-semibold text-dj-texte transition-colors duration-200 hover:border-dj-bordure-forte hover:bg-dj-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dj-accent-1"
        >
          {textes.reessayer}
        </button>
      </section>
    </main>
  );
}
