// Créé le 19/10/2026, demande Bourama : proposer l'installeur Windows de
// l'appli PC sur la page /telecharger et dans la barre latérale.
//
// Source unique pour trois choses partagées par la page (composant serveur),
// le bandeau et la barre latérale (composants client) :
// - quel appareil est en train de regarder (à partir du User-Agent) ;
// - où l'installeur est publié ;
// - comment retrouver le bon fichier dans la dernière release.
//
// Aucune dépendance au navigateur ici : ce module est importé aussi bien
// côté serveur que côté client.

export type AppareilTelechargement = "android" | "ios" | "windows" | "pc";

// "windows" = navigateur sur Windows (seul système pour lequel l'appli PC
// existe). "pc" = tout autre ordinateur (Mac, Linux...), sans installeur.
// Windows Phone n'existe plus et ne doit pas tomber dans "windows".
export function detecterAppareil(userAgent: string): AppareilTelechargement {
  if (/Android/i.test(userAgent)) return "android";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  if (/Windows/i.test(userAgent) && !/Windows Phone/i.test(userAgent)) return "windows";
  return "pc";
}

// Dépôt public où le workflow publier-pc.yml publie l'installeur, et d'où
// l'appli installée lit ses mises à jour (voir
// electron/electron-builder.config.js, section publish : les deux doivent
// toujours désigner le même dépôt).
export const DEPOT_RELEASES_PC = "petitboura/classinus-updates-pc";

export const URL_DERNIERE_RELEASE_PC = `https://api.github.com/repos/${DEPOT_RELEASES_PC}/releases/latest`;

type AssetGitHub = { name: string; browser_download_url: string; size: number };

export type ReleasePc = {
  version: string;
  urlTelechargement: string;
  tailleOctets: number;
  urlNotes: string | null;
};

type ReponseReleaseGitHub = {
  tag_name?: string;
  html_url?: string;
  assets?: AssetGitHub[];
};

// L'installeur s'appelle Classinus-Setup-X.Y.Z.exe. Les releases contiennent
// aussi des fichiers que l'on ne veut pas servir (latest.yml, .blockmap,
// utilisés seulement par la mise à jour automatique) : on prend donc
// explicitement le fichier qui finit par .exe.
export function extraireReleasePc(reponse: ReponseReleaseGitHub | null): ReleasePc | null {
  if (!reponse || !Array.isArray(reponse.assets) || !reponse.tag_name) return null;
  const installeur = reponse.assets.find((a) => a.name.toLowerCase().endsWith(".exe"));
  if (!installeur) return null;
  return {
    version: reponse.tag_name.replace(/^pc-v/, "").replace(/^v/, ""),
    urlTelechargement: installeur.browser_download_url,
    tailleOctets: installeur.size,
    urlNotes: reponse.html_url ?? null,
  };
}

// Côté serveur uniquement (appelé par la page). Cache court, comme la lecture
// de l'APK : la page reflète une nouvelle publication en environ une minute
// sans taper l'API GitHub à chaque visite. Une erreur réseau ou une release
// absente donne null : la page affiche alors un message clair, jamais d'erreur.
export async function recupererDerniereReleasePc(): Promise<ReleasePc | null> {
  try {
    const reponse = await fetch(URL_DERNIERE_RELEASE_PC, { next: { revalidate: 60 } });
    if (!reponse.ok) return null;
    return extraireReleasePc(await reponse.json());
  } catch {
    return null;
  }
}
