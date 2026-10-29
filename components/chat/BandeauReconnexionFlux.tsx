"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";
import { abonnerReconnexionFlux, reconnexionFluxEnCours } from "@/lib/repriseFluxChat";
import { textesReconnexionFlux } from "@/lib/textesReconnexionFlux";
import { useLocale } from "@/lib/i18n/useLocale";

// Ajouté le 28/10/2026 (demande de Bourama : une connexion perturbée ne doit plus faire perdre le
// travail). Affiché tant que la lecture de la réponse tente de se rattacher au travail qui continue
// sur le serveur (lib/repriseFluxChat.ts). Disparaît tout seul au retour de la connexion.
export function BandeauReconnexionFlux() {
  const locale = useLocale();
  const t = textesReconnexionFlux(locale);
  const enCours = useSyncExternalStore(abonnerReconnexionFlux, reconnexionFluxEnCours, () => false);
  if (!enCours) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="my-1.5 flex w-fit max-w-full items-center gap-2 rounded-lg border border-dj-accent-2/40 bg-dj-accent-2/10 px-3 py-2 text-[13px] text-dj-texte"
    >
      <WifiOff size={16} className="shrink-0 text-dj-accent-2" />
      <span className="min-w-0">{t.message}</span>
    </div>
  );
}
