"use client";

import { Check } from "lucide-react";
import { traduireTexteInterface } from "@/lib/i18n/interface";
import { useLocale } from "@/lib/i18n/useLocale";

// Messages écrits pendant que Classinus travaillait (26/11/2026, demande de Bourama). Ils s'affichent
// tout de suite sous la réponse en cours, comme une bulle de l'utilisateur, avec la mention
// "Pris en compte" quand le serveur les a mis dans la file du tour (Classinus les lit au prochain
// aller-retour avec le modèle, sans s'arrêter). Séparés de la liste des messages : le texte de la
// réponse en cours est écrit dans le DERNIER message, rien ne doit s'insérer après lui.

export type MessagePendantTourAffiche = {
  id: string;
  texte: string;
  // envoi : la route n'a pas encore répondu. pris : dans la file du tour.
  // attente : le tour est fini, le message partira comme un message normal.
  etat: "envoi" | "pris" | "attente";
};

export function MessagesPendantTour({ messages }: { messages: MessagePendantTourAffiche[] }) {
  const locale = useLocale();
  const t = (texte: string) => traduireTexteInterface(texte, locale);
  if (messages.length === 0) return null;
  return (
    <>
      {messages.map((m) => (
        <div key={m.id} className="flex animate-dj-fade-in flex-col items-end">
          <div className="max-w-[80%] whitespace-pre-wrap break-words rounded-cgpt-carte bg-dj-surface px-4 py-2.5 text-[15px] text-dj-texte">
            {m.texte}
          </div>
          <span className="mt-1 flex items-center gap-1 px-1 text-xs text-dj-texte-muet" aria-live="polite">
            {m.etat === "pris" ? (
              <>
                <Check size={12} strokeWidth={1.75} />
                {t("Pris en compte, Classinus le lira en route")}
              </>
            ) : m.etat === "attente" ? (
              t("Sera envoyé dès que la réponse est terminée")
            ) : (
              t("Envoi…")
            )}
          </span>
        </div>
      ))}
    </>
  );
}
