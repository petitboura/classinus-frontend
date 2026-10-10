"use client";

import { useEffect, useState } from "react";
import { appelerApi } from "@/lib/api";
import { ErreurApi } from "@/lib/erreurs";
import { creerMemoireElements } from "@/lib/memoireElementsRiches";

// Fichier hébergé sur un site externe : le navigateur ne peut pas le charger
// lui-même (CORS), donc l'aperçu et le téléchargement échouent. On demande au
// backend un lien de relais signé (voir api/fichiers_externes.py), qui sert le
// fichier depuis notre domaine avec les requêtes partielles. Le lien expire au
// bout d'une heure côté serveur : on le garde un peu moins longtemps en mémoire.
const VALIDITE_MS = 50 * 60 * 1000;

type Entree = { url: string | null; connexionRequise: boolean; expire: number };
const memoire = creerMemoireElements<Entree>();
const enCours = new Map<string, Promise<Resultat>>();

type Resultat = { url: string | null; connexionRequise: boolean };

function lireMemoire(href: string): Resultat | undefined {
  const entree = memoire.lire(href);
  if (!entree) return undefined;
  if (Date.now() > entree.expire) {
    memoire.effacer(href);
    return undefined;
  }
  return { url: entree.url, connexionRequise: entree.connexionRequise };
}

function demanderLien(href: string): Promise<Resultat> {
  const deja = enCours.get(href);
  if (deja) return deja;
  const requete = appelerApi("/api/fichiers-externes/lien", { method: "POST", body: JSON.stringify({ url: href }) })
    .then((reponse): Resultat => ({ url: typeof reponse?.url === "string" ? (reponse.url as string) : null, connexionRequise: false }))
    .catch((e): Resultat => ({ url: null, connexionRequise: e instanceof ErreurApi && e.code === "CONNEXION_REQUISE" }))
    .then((resultat) => {
      // Un échec est gardé moins longtemps (le site distant peut revenir) et une
      // demande de connexion encore moins (la personne peut se connecter juste après).
      const duree = resultat.url ? VALIDITE_MS : resultat.connexionRequise ? 5 * 1000 : 60 * 1000;
      memoire.ecrire(href, { ...resultat, expire: Date.now() + duree });
      return resultat;
    })
    .finally(() => enCours.delete(href));
  enCours.set(href, requete);
  return requete;
}

// `actif` : seulement pour un fichier externe d'un type connu. Renvoie le lien à
// utiliser (relais si disponible, sinon l'adresse d'origine, comme avant) et si
// la demande est encore en cours.
export function useLienRelaisExterne(
  href: string,
  actif: boolean
): { href: string; enAttente: boolean; connexionRequise: boolean } {
  const [etat, setEtat] = useState<({ cle: string } & Resultat) | null>(() => {
    if (!actif) return null;
    const connu = lireMemoire(href);
    return connu === undefined ? null : { cle: href, ...connu };
  });

  useEffect(() => {
    if (!actif) return;
    const connu = lireMemoire(href);
    if (connu !== undefined) {
      setEtat({ cle: href, ...connu });
      return;
    }
    let annule = false;
    demanderLien(href).then((resultat) => {
      if (!annule) setEtat({ cle: href, ...resultat });
    });
    return () => {
      annule = true;
    };
  }, [href, actif]);

  if (!actif) return { href, enAttente: false, connexionRequise: false };
  if (!etat || etat.cle !== href) return { href, enAttente: true, connexionRequise: false };
  return { href: etat.url ?? href, enAttente: false, connexionRequise: etat.connexionRequise };
}
