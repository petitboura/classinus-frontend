"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";

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

// 20/09/2026, demande Bourama : un lien de téléchargement télécharge, il
// ne sort JAMAIS de l'appli. Avant, le dernier repli (fetch impossible)
// ouvrait le fichier dans un nouvel onglet, c'est ce qui faisait quitter
// le site. Ce repli est supprimé : si rien ne fonctionne, l'échec est
// simplement journalisé, jamais de sortie de l'appli.
export async function telecharger(href: string, nom: string): Promise<void> {
  if (!href) {
    console.error("[telecharger] URL vide");
    return;
  }

  if (estAndroid()) {
    try {
      await Telechargement.depuisUrl({ url: href, nom });
      return;
    } catch (e) {
      console.error("[telecharger] téléchargement Android échoué :", e);
    }
  }

  if (Capacitor.isNativePlatform()) {
    try {
      const reponse = await fetch(href);
      if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
      await telechargerViaPartageNatif(await reponse.blob(), nom);
      return;
    } catch (e) {
      console.error("[telecharger] échec partage natif :", e);
    }
  }

  try {
    const reponse = await fetch(href);
    if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
    telechargerViaBlobWeb(await reponse.blob(), nom);
  } catch (e) {
    console.error("[telecharger] échec téléchargement web :", e);
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
