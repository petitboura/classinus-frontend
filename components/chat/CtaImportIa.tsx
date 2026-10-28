"use client";
import { useEffect, useState } from "react";
import type { CibleImportIa } from "@/lib/api";
import { traduireTexteInterface } from "@/lib/i18n/interface";
import { useLocale } from "@/lib/i18n/useLocale";
import { ImportDepuisAutreIA } from "@/components/ImportDepuisAutreIA";

// 27/10/2026, demande Bourama : un CTA posé juste au-dessus de la barre de saisie du chat, avec un bouton
// pour l'enlever. Il ouvre le même import que les pages Mémoire, Skills et Configuration (voir
// components/ImportDepuisAutreIA.tsx), au choix de l'utilisateur. Une fois enlevé, il ne revient pas :
// les boutons des pages restent le moyen de le retrouver.

const CLE_FERME = "classinus-cta-import-ia-ferme";
const CIBLES: { cible: CibleImportIa; libelle: string }[] = [
  { cible: "memoire", libelle: "Ma mémoire" },
  { cible: "skills", libelle: "Mes skills" },
  { cible: "configuration", libelle: "Ma configuration" },
];

function dejaFerme(): boolean {
  try {
    return localStorage.getItem(CLE_FERME) === "1";
  } catch {
    return false;
  }
}

export function CtaImportIa() {
  const locale = useLocale();
  const t = (texte: string) => traduireTexteInterface(texte, locale);
  // Caché tant que la préférence n'est pas lue : évite un clignotement au chargement.
  const [visible, setVisible] = useState(false);
  const [deplie, setDeplie] = useState(false);
  const [cible, setCible] = useState<CibleImportIa>("memoire");

  useEffect(() => { setVisible(!dejaFerme()); }, []);

  function enlever() {
    setVisible(false);
    try {
      localStorage.setItem(CLE_FERME, "1");
    } catch {
      // Stockage indisponible : le bandeau reviendra au prochain chargement, sans gravité.
    }
  }

  return (
    <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-cgpt-doux ${visible ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`} aria-hidden={!visible}>
      <div className="min-h-0 overflow-hidden">
        <section aria-label={t("Importer depuis une autre IA")} className="mb-2 rounded-2xl border border-dj-bordure bg-dj-surface px-3 py-2">
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
              <div className="flex flex-col gap-3 pt-3">
                <div className="flex flex-wrap gap-2" role="group" aria-label={t("Que veux-tu importer ?")}>
                  {CIBLES.map((c) => (
                    <button
                      key={c.cible}
                      type="button"
                      aria-pressed={cible === c.cible}
                      onClick={() => setCible(c.cible)}
                      className={`rounded-full border px-3 py-1 text-sm transition-colors ${cible === c.cible ? "border-dj-bordure-forte bg-dj-surface-haute text-dj-texte" : "border-dj-bordure text-dj-texte-muet hover:text-dj-texte"}`}
                    >
                      {t(c.libelle)}
                    </button>
                  ))}
                </div>
                {deplie && <ImportDepuisAutreIA key={cible} cible={cible} ouvertParDefaut sansBouton />}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
