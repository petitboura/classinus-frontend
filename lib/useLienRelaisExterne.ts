"use client";

import { useEffect, useState } from "react";
import { appelerApi } from "@/lib/api";
import { creerMemoireElements } from "@/lib/memoireElementsRiches";

// Fichier hébergé sur un site externe : le navigateur ne peut pas le charger
// lui-même (CORS), donc l'aperçu et le téléchargement échouent. On demande au
// backend un lien de relais signé (voir api/fichiers_externes.py), qui sert le
// fichier depuis notre domaine avec les requêtes partielles. Le lien expire au
// bout d'une heure côté serveur : on le garde un peu moins longtemps en mémoire.
const VALIDITE_MS = 50 * 60 * 1000;

type Entree = { url: string | null; expire: number };
const memoire = creerMemoireElements<Entree>();
const enCours = new Map<string, Promise<string | null>>();

function lireMemoire(href: string): string | null | undefined {
  const entree = memoire.lire(href);
  if (!entree) return undefined;
  if (Date.now() > entree.expire) {
    memoire.effacer(href);
    return undefined;
  }
  return entree.url;
}

function demanderLien(href: string): Promise<string | null> {
  const deja = enCours.get(href);
  if (deja) return deja;
  const requete = appelerApi("/api/fichiers-externes/lien", { method: "POST", body: JSON.stringify({ url: href }) })
    .then((reponse) => (typeof reponse?.url === "string" ? (reponse.url as string) : null))
    .catch(() => null)
    .then((url) => {
      // Un échec est gardé moins longtemps : le site distant peut revenir.
      memoire.ecrire(href, { url, expire: Date.now() + (url ? VALIDITE_MS : 60 * 1000) });
      return url;
    })
    .finally(() => enCours.delete(href));
  enCours.set(href, requete);
  return requete;
}

// `actif` : seulement pour un fichier externe d'un type connu. Renvoie le lien à
// utiliser (relais si disponible, sinon l'adresse d'origine, comme avant) et si
// la demande est encore en cours.
export function useLienRelaisExterne(href: string, actif: boolean): { href: string; enAttente: boolean } {
  const [etat, setEtat] = useState<{ cle: string; url: string | null } | null>(() => {
    if (!actif) return null;
    const connu = lireMemoire(href);
    return connu === undefined ? null : { cle: href, url: connu };
  });

  useEffect(() => {
    if (!actif) return;
    const connu = lireMemoire(href);
    if (connu !== undefined) {
      setEtat({ cle: href, url: connu });
      return;
    }
    let annule = false;
    demanderLien(href).then((url) => {
      if (!annule) setEtat({ cle: href, url });
    });
    return () => {
      annule = true;
    };
  }, [href, actif]);

  if (!actif) return { href, enAttente: false };
  if (!etat || etat.cle !== href) return { href, enAttente: true };
  return { href: etat.url ?? href, enAttente: false };
}
