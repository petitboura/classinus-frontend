"use client";

import { useState } from "react";
import { AlertTriangle, Check, ChevronDown, X } from "lucide-react";
import { traduireTexteInterface } from "@/lib/i18n/interface";
import { useLocale } from "@/lib/i18n/useLocale";

function formaterValeur(valeur: unknown): string {
  if (typeof valeur === "string") return valeur;
  if (valeur === null || valeur === undefined) return "";
  try {
    return JSON.stringify(valeur, null, 2);
  } catch {
    return String(valeur);
  }
}

export function ConfirmationOutil({
  nomLisible,
  nomOutil,
  agentNom,
  arguments: args,
  enAttente,
  onConfirmer,
  onAnnuler,
}: {
  nomLisible: string;
  nomOutil?: string;
  agentNom?: string | null;
  arguments: Record<string, unknown>;
  enAttente: boolean;
  onConfirmer: () => void;
  onAnnuler: () => void;
}) {
  const locale = useLocale();
  const t = (texte: string) => traduireTexteInterface(texte, locale);
  const [detailsOuverts, setDetailsOuverts] = useState(false);

  // Les détails techniques (nom exact de l'outil, paramètres) restent accessibles
  // mais repliés : la phrase du haut suffit pour décider.
  const entrees: [string, string][] = [
    ...(nomOutil ? ([[t("Outil"), nomOutil]] as [string, string][]) : []),
    ...Object.entries(args).map(([cle, valeur]) => [cle, formaterValeur(valeur)] as [string, string]),
  ];

  return (
    <div className="my-2 max-w-[80%] animate-dj-fade-in rounded-xl border border-dj-bordure-forte bg-dj-surface p-3.5">
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-dj-accent-1-texte" />
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm text-dj-texte">
            <span className="font-semibold">{agentNom || "Classinus"}</span> {t("veut faire ceci")}
            {locale === "en" ? ":" : " :"} <span className="font-semibold">{nomLisible}</span>. {t("Confirmer ?")}
          </p>
          {entrees.length > 0 && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setDetailsOuverts((ouvert) => !ouvert)}
                aria-expanded={detailsOuverts}
                className="flex items-center gap-1 text-xs text-dj-texte-muet transition-colors hover:text-dj-texte"
              >
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-200 ${detailsOuverts ? "rotate-180" : ""}`}
                />
                {detailsOuverts ? t("Masquer les détails") : t("Voir les détails")}
              </button>
              <div
                className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                  detailsOuverts ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="mt-1.5 max-h-48 space-y-1 overflow-y-auto rounded-lg bg-dj-fond/60 p-2 text-[12px] text-dj-texte-muet">
                    {entrees.map(([cle, valeur]) => (
                      <div key={cle} className="min-w-0">
                        <span className="text-dj-texte-muet">{cle} :</span>{" "}
                        <span className="whitespace-pre-wrap break-words text-dj-texte">{valeur}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={onConfirmer}
              disabled={enAttente}
              className="flex items-center gap-1.5 rounded-lg bg-dj-accent-1 px-3 py-1.5 text-xs font-semibold text-[#1A0D02] disabled:opacity-50"
            >
              <Check size={13} /> {t("Confirmer")}
            </button>
            <button
              onClick={onAnnuler}
              disabled={enAttente}
              className="flex items-center gap-1.5 rounded-lg border border-dj-bordure px-3 py-1.5 text-xs text-dj-texte-muet hover:text-dj-texte disabled:opacity-50"
            >
              <X size={13} /> {t("Annuler")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
