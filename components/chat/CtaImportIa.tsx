"use client";
import { useEffect, useState } from "react";
import { traduireTexteInterface } from "@/lib/i18n/interface";
import { useLocale } from "@/lib/i18n/useLocale";
import { ImportDepuisAutreIA } from "@/components/ImportDepuisAutreIA";

// 27/10/2026, demande Bourama : un CTA posé juste au-dessus de la barre de saisie du chat, avec un bouton
// pour l'enlever. Il fait le même import que les boutons des pages Mémoire, Skills et Configuration (voir
// components/ImportDepuisAutreIA.tsx).
// 29/10/2026, demande Bourama : sans cadre, collé au haut de la barre de saisie. Enlevé par la croix, il
// reste caché pour la conversation en cours seulement et revient à chaque nouvelle conversation (le chat
// est remonté avec key={conversationId}). Il disparaît pour de bon après NB_ENLEVEMENTS_MAX enlèvements.

const CLE_ENLEVEMENTS = "classinus-cta-import-ia-enlevements";
const NB_ENLEVEMENTS_MAX = 10;

function lireEnlevements(): number {
  try {
    const n = Number.parseInt(localStorage.getItem(CLE_ENLEVEMENTS) ?? "0", 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function CtaImportIa() {
  const locale = useLocale();
  const t = (texte: string) => traduireTexteInterface(texte, locale);
  // Caché tant que la préférence n'est pas lue : évite un clignotement au chargement.
  const [visible, setVisible] = useState(false);
  const [deplie, setDeplie] = useState(false);

  useEffect(() => { setVisible(lireEnlevements() < NB_ENLEVEMENTS_MAX); }, []);

  function enlever() {
    setVisible(false);
    try {
      localStorage.setItem(CLE_ENLEVEMENTS, String(lireEnlevements() + 1));
    } catch {
      // Stockage indisponible : le bandeau reviendra à la prochaine conversation, sans gravité.
    }
  }

  return (
    <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-cgpt-doux ${visible ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`} aria-hidden={!visible}>
      <div className="min-h-0 overflow-hidden">
        <section aria-label={t("Importer depuis une autre IA")} className="px-3 pb-1 pt-1">
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 text-sm text-dj-texte-muet">{t("Tu viens d'une autre IA ? Retrouve ici ta mémoire, tes skills et ta configuration.")}</p>
            <button type="button" aria-expanded={deplie} onClick={() => setDeplie((v) => !v)} className="shrink-0 rounded-lg border border-dj-bordure px-3 py-1.5 text-sm transition-colors hover:border-dj-bordure-forte">
              {deplie ? t("Réduire") : t("Importer")}
            </button>
            <button type="button" aria-label={t("Enlever ce bandeau")} onClick={enlever} className="shrink-0 rounded-lg px-2 py-1.5 text-sm text-dj-texte-muet transition-colors hover:text-dj-texte">
              ✕
            </button>
          </div>
          <div className={`grid transition-[grid-template-rows] duration-300 ease-cgpt-doux ${deplie ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
            <div className="min-h-0 overflow-hidden">
              <div className="pt-3">{deplie && <ImportDepuisAutreIA origine="chat" ouvertParDefaut sansBouton />}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
