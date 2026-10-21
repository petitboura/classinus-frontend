"use client";

import { useEffect, useState } from "react";
import { messageErreur as messageErreurGlobale } from "./erreurs";

/**
 * 26/08/2026, Bourama : Lot 3B Partie 3 mobile : construction des interfaces
 * pour les plugins Capacitor sans UI (ControleSession, Connecteurs, MiseAJour,
 * Dossiers, Accessibilite). Chacun a besoin du même point de départ : savoir
 * si on tourne dans l'app mobile (Capacitor.isNativePlatform()) et, si oui,
 * obtenir le plugin natif enregistré : même pattern que celui déjà utilisé
 * pour PontNatif dans lib/supabase.ts, centralisé ici pour ne pas le
 * dupliquer dans chacun des 5 écrans.
 *
 * `natif` vaut `null` tant que la vérification n'est pas terminée (évite un
 * flash "indisponible" avant que Capacitor ait répondu), `false` sur le web
 * classique (Vercel), `true` dans l'app.
 *
 * Ne décide de rien sur l'emplacement de ces écrans dans la navigation :
 * chaque composant reste autonome et gère lui-même son propre état
 * "disponible seulement sur mobile", pour pouvoir être branché n'importe où
 * (web ou mobile) sans casser.
 */
export function usePluginNatif<T extends object>(nomPlugin: string) {
  const [natif, setNatif] = useState<boolean | null>(null);
  const [plugin, setPlugin] = useState<T | null>(null);

  useEffect(() => {
    let annule = false;
    import("@capacitor/core").then(({ Capacitor, registerPlugin }) => {
      if (annule) return;
      const estNatif = Capacitor.isNativePlatform();
      setNatif(estNatif);
      if (estNatif) {
        setPlugin(registerPlugin<T>(nomPlugin));
      }
    });
    return () => {
      annule = true;
    };
  }, [nomPlugin]);

  return { natif, plugin };
}

/**
 * Traduit les erreurs des plugins natifs avant de les afficher dans les
 * paramètres et les cartes de l'application. Certains plugins renvoient
 * des messages anglais ou des détails internes de la plateforme.
 */
export function messageErreurPlugin(e: unknown): string {
  if (!(e instanceof Error) || !e.message) {
    return "Classinus n’a pas pu terminer cette action. Réessaie dans un instant.";
  }

  const message = e.message.toLowerCase();
  if (/\bpermission(?:s)?\b.*\b(?:denied|not granted|blocked|refused|missing)\b|\b(?:not authorized|unauthorized|authorization denied)\b|\b(?:autorisation|permission)(?:s)?\b.*\b(?:refusée?|non accordée?|bloquée?|manquante?)\b/.test(message)) {
    return "L’autorisation nécessaire a été refusée. Vérifie les permissions de Classinus dans les paramètres de ton appareil, puis réessaie.";
  }
  if (/not implemented|not supported on (?:the )?(?:web|android|ios|this platform)|not available on (?:the )?(?:web|android|ios|this platform)|only available on (?:android|ios)|unsupported platform|no such plugin|plugin(?:\s+[\w-]+){0,3}\s+(?:not found|unavailable|does not exist)/.test(message)) {
    return "Cette fonction n’est pas disponible dans cette version de Classinus ou sur cette plateforme.";
  }
  if (/^(?:java\.|android\.|kotlin\.|com\.getcapacitor\.|org\.apache\.cordova\.|error invoking\b|pluginexception\b|nativepluginerror\b)/i.test(message)) {
    return "Classinus n’a pas pu exécuter cette fonction sur cet appareil. Vérifie les autorisations nécessaires, puis réessaie. Si le problème persiste, mets à jour Classinus.";
  }

  return messageErreurGlobale(e);
}
