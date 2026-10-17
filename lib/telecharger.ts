"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";
import { definirEtatTelechargement, lireEtatTelechargement } from "@/lib/etatTelechargements";
import { textesTelechargement } from "@/lib/textesTelechargement";

type PluginTelechargement = {
  depuisUrl(options: { url: string; nom: string }): Promise<{ id: string }>;
  depuisContenuLocal(options: { base64: string; nom: string; typeMime: string }): Promise<{ succes: boolean }>;
};

const Telechargement = registerPlugin<PluginTelechargement>("Telechargement");

function blobVersBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onloadend = () => resolve((lecteur.result as string).split(",")[1] ?? "");
    lecteur.onerror = () => reject(lecteur.error);
    lecteur.readAsDataURL(blob);
  });
}

async function telechargerViaPartageNatif(blob: Blob, nom: string) {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);
  const base64 = await blobVersBase64(blob);
  const { uri } = await Filesystem.writeFile({ path: nom, data: base64, directory: Directory.Cache });
  await Share.share({ files: [uri], dialogTitle: nom });
}

function telechargerViaBlobWeb(blob: Blob, nom: string) {
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nom;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function estAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

// Échec d'un téléchargement, avec une catégorie stable pour choisir le message
// affiché (jamais de texte technique montré tel quel à l'utilisateur).
type InfosTelechargement = { nom: string; relancer: () => void };

type CategorieEchec = "reseau" | "incomplet" | "introuvable" | "acces" | "serveur";

class ErreurTelechargement extends Error {
  constructor(readonly categorie: CategorieEchec, detail?: string) {
    super(detail ?? categorie);
  }
}

function categorieDepuisStatut(statut: number): CategorieEchec {
  if (statut === 404 || statut === 410) return "introuvable";
  if (statut === 401 || statut === 403) return "acces";
  if (statut >= 500) return "serveur";
  return "reseau";
}

function messageEchec(categorie: CategorieEchec): string {
  const t = textesTelechargement();
  switch (categorie) {
    case "introuvable":
      return t.erreurIntrouvable;
    case "acces":
      return t.erreurAcces;
    case "serveur":
      return t.erreurServeur;
    case "incomplet":
      return t.erreurIncomplet;
    default:
      return t.erreurReseau;
  }
}

function categorieDepuisErreur(e: unknown): CategorieEchec {
  return e instanceof ErreurTelechargement ? e.categorie : "reseau";
}

function signalerProgression(cle: string, pourcentage: number | null, infos: InfosTelechargement) {
  definirEtatTelechargement(cle, { statut: "encours", pourcentage, erreur: null, ...infos });
}

// Lit le fichier au fil de l'arrivée des octets pour pouvoir annoncer le
// pourcentage. La taille totale vient de Content-Length ; si le fichier est
// compressé en route (Content-Encoding), cette taille n'est plus celle des
// octets reçus : on affiche alors une barre indéterminée plutôt qu'un faux
// pourcentage. Un fichier reçu incomplet est un échec, jamais un succès.
async function recupererAvecProgression(href: string, cle: string, infos: InfosTelechargement): Promise<Blob> {
  let reponse: Response;
  try {
    reponse = await fetch(href);
  } catch {
    throw new ErreurTelechargement("reseau");
  }
  if (!reponse.ok) throw new ErreurTelechargement(categorieDepuisStatut(reponse.status), `HTTP ${reponse.status}`);

  const typeMime = reponse.headers.get("content-type") ?? "";
  const compresse = !!reponse.headers.get("content-encoding");
  const total = compresse ? 0 : Number(reponse.headers.get("content-length")) || 0;

  if (!reponse.body) {
    try {
      return await reponse.blob();
    } catch {
      throw new ErreurTelechargement("reseau");
    }
  }

  const lecteur = reponse.body.getReader();
  const morceaux: BlobPart[] = [];
  let recu = 0;
  try {
    for (;;) {
      const { done, value } = await lecteur.read();
      if (done) break;
      if (value) {
        morceaux.push(value as BlobPart);
        recu += value.length;
        if (total > 0) signalerProgression(cle, Math.min(99, Math.floor((recu / total) * 100)), infos);
      }
    }
  } catch {
    throw new ErreurTelechargement("incomplet");
  }
  if (total > 0 && recu < total) throw new ErreurTelechargement("incomplet");
  return new Blob(morceaux, { type: typeMime });
}

// 20/09/2026, demande Bourama : un lien de téléchargement télécharge, il
// ne sort JAMAIS de l'appli. Avant, le dernier repli (fetch impossible)
// ouvrait le fichier dans un nouvel onglet, c'est ce qui faisait quitter
// le site. Ce repli est supprimé : si rien ne fonctionne, l'échec est
// signalé à l'utilisateur, jamais de sortie de l'appli.
//
// 10/10/2026, demande Bourama : le bouton ne donnait aucun retour pendant le
// téléchargement (on croyait qu'il ne marchait pas) et un échec n'était que
// journalisé. Chaque téléchargement est maintenant suivi dans
// lib/etatTelechargements.ts (pourcentage, réussite, échec avec message), et
// la fonction renvoie false seulement si le téléchargement a échoué.
// Elle ne lève jamais d'exception : les appelants qui ne lisent pas le
// résultat restent valables, l'état affiché sur le bouton suffit. Un second
// clic pendant un téléchargement en cours renvoie true (ce n'est pas un échec).
//
// `cle` identifie le téléchargement pour les boutons qui le suivent (par
// défaut l'adresse du fichier). Un second clic pendant qu'un téléchargement
// de la même clé est en cours est ignoré, pour ne pas le relancer en double.
export async function telecharger(href: string, nom: string, options: { cle?: string } = {}): Promise<boolean> {
  const t = textesTelechargement();
  const cle = options.cle ?? href;

  const infos: InfosTelechargement = { nom, relancer: () => void telecharger(href, nom, options) };

  if (!href) {
    console.error("[telecharger] URL vide");
    definirEtatTelechargement(cle || nom, { statut: "echec", pourcentage: null, erreur: t.erreurUrlVide, ...infos });
    return false;
  }

  // Déjà en cours pour ce fichier : ce n'est pas un échec, on ne relance pas.
  if (lireEtatTelechargement(cle)?.statut === "encours") return true;
  signalerProgression(cle, null, infos);

  if (estAndroid()) {
    try {
      await Telechargement.depuisUrl({ url: href, nom });
      definirEtatTelechargement(cle, { statut: "reussi", pourcentage: 100, erreur: null, ...infos });
      return true;
    } catch (e) {
      console.error("[telecharger] téléchargement Android échoué :", e);
    }
  }

  if (Capacitor.isNativePlatform()) {
    try {
      await telechargerViaPartageNatif(await recupererAvecProgression(href, cle, infos), nom);
      definirEtatTelechargement(cle, { statut: "reussi", pourcentage: 100, erreur: null, ...infos });
      return true;
    } catch (e) {
      console.error("[telecharger] échec partage natif :", e);
    }
  }

  try {
    telechargerViaBlobWeb(await recupererAvecProgression(href, cle, infos), nom);
    definirEtatTelechargement(cle, { statut: "reussi", pourcentage: 100, erreur: null, ...infos });
    return true;
  } catch (e) {
    console.error("[telecharger] échec téléchargement web :", e);
    definirEtatTelechargement(cle, {
      statut: "echec",
      pourcentage: null,
      erreur: messageEchec(categorieDepuisErreur(e)),
      ...infos,
    });
    return false;
  }
}

export async function telechargerContenuLocal(
  nom: string,
  contenu: string | Blob,
  typeMime = "application/octet-stream"
) {
  const blob = typeof contenu === "string" ? new Blob([contenu], { type: typeMime }) : contenu;

  if (estAndroid()) {
    try {
      const base64 = await blobVersBase64(blob);
      await Telechargement.depuisContenuLocal({
        base64,
        nom,
        typeMime: blob.type || typeMime,
      });
      return;
    } catch (e) {
      console.error("[telechargerContenuLocal] téléchargement Android échoué :", e);
    }
  }

  if (Capacitor.isNativePlatform()) {
    try {
      await telechargerViaPartageNatif(blob, nom);
      return;
    } catch (e) {
      console.error("[telechargerContenuLocal] échec partage natif :", e);
    }
  }

  telechargerViaBlobWeb(blob, nom);
}
