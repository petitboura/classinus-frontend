"use client";

import "./globals.css";
import { useEffect } from "react";

type PropsErreurGlobale = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Dernier recours si une erreur empêche notamment le layout racine de s'afficher.
 * Ce composant fournit lui-même html/body et ne révèle pas les détails internes.
 */
export default function ErreurGlobale({ error, reset }: PropsErreurGlobale) {
  useEffect(() => {
    console.error("Erreur globale dans Classinus :", error);
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ margin: 0 }}>
        <main
          role="main"
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxSizing: "border-box",
            padding: "24px",
            background: "var(--dj-fond, #f8f7f4)",
            color: "var(--dj-texte, #202020)",
            fontFamily: "var(--font-work-sans, system-ui, sans-serif)",
          }}
        >
          <section style={{ width: "100%", maxWidth: "460px" }}>
            <p style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--dj-texte-muet, #666)" }}>
              Classinus
            </p>
            <h1 style={{ margin: "0 0 12px", fontSize: "clamp(24px, 4vw, 32px)", lineHeight: 1.2, fontWeight: 600 }}>
              Classinus a rencontré un problème
            </h1>
            <p role="alert" aria-live="assertive" style={{ margin: "0 0 12px", lineHeight: 1.6, color: "var(--dj-texte-muet, #444)" }}>
              L’application n’a pas pu afficher cet écran correctement.
            </p>
            <p style={{ margin: "0 0 24px", lineHeight: 1.6, color: "var(--dj-texte-muet, #444)" }}>
              Vérifie l’état de ta dernière action avant de la refaire : elle a peut-être déjà été effectuée.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                minHeight: "44px",
                padding: "10px 18px",
                border: "1px solid var(--dj-bordure, #bdbdbd)",
                borderRadius: "12px",
                background: "var(--dj-surface-haute, #e8e8e8)",
                color: "var(--dj-texte, #202020)",
                font: "inherit",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Réessayer
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
