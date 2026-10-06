"use client";

import { useEffect, useState } from "react";

/**
 * Version de l'appli installée sur le téléphone, lue auprès du système
 * Android ou iOS via @capacitor/app (le numéro versionName du fichier
 * android/app/build.gradle). Sert à masquer la notification "nouvelle
 * version disponible" quand l'appli est déjà à jour.
 *
 * Vaut null sur le web (pas d'appli installée, donc rien à comparer) et
 * tant que la lecture n'est pas terminée : dans les deux cas, l'appelant
 * ne masque rien, il ne décide jamais sans connaître la version.
 *
 * Import dynamique, même convention que contexteRetour.tsx : n'a aucun
 * effet sur le web et ne casse pas l'export statique.
 */
export function useVersionInstallee(): string | null {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { App } = await import("@capacitor/app");
        const info = await App.getInfo();
        if (!annule && info.version) setVersion(info.version);
      } catch {
        // Lecture impossible : on reste à null, rien n'est masqué.
      }
    })();
    return () => {
      annule = true;
    };
  }, []);

  return version;
}

/** "1.2.0-externe" ou "v1.2" deviennent [1, 2, 0] et [1, 2]. */
function chiffresDeVersion(version: string): number[] {
  return version
    .replace(/^v/i, "")
    .split("-")[0]
    .split(".")
    .map((p) => parseInt(p, 10))
    .filter((n) => !Number.isNaN(n));
}

/**
 * Vrai si `distante` est strictement plus récente que `installee`.
 * Comparaison chiffre par chiffre (1.10 est plus récent que 1.9), même
 * règle que VerificateurMiseAJour.kt, pour que la notification et le
 * bandeau de mise à jour ne se contredisent jamais.
 */
export function versionEstPlusRecente(distante: string, installee: string): boolean {
  const d = chiffresDeVersion(distante);
  const i = chiffresDeVersion(installee);
  const taille = Math.max(d.length, i.length);
  for (let k = 0; k < taille; k++) {
    const a = d[k] ?? 0;
    const b = i[k] ?? 0;
    if (a !== b) return a > b;
  }
  return false;
}
