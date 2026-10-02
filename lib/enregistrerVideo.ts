import { telechargerContenuLocal } from "@/lib/telecharger";

// Enregistrement vidéo d'UN élément de la page (le widget interactif ou
// l'animation), pour le télécharger en fichier.
//
// Méthode : capture de l'onglet courant par le navigateur, recadrée sur
// l'élément (fonction "Region Capture" de Chrome et Edge). Le navigateur
// demande la permission de partager l'onglet à chaque enregistrement, on ne
// peut pas l'éviter. Rien n'est envoyé au serveur : la vidéo est fabriquée et
// remise au téléchargement dans le navigateur.
//
// Limites voulues (décision de Bourama, 30/09/2026) : ordinateur seulement.
// Téléphone, appli Android et navigateurs sans recadrage (Firefox, Safari)
// n'ont pas le bouton : enregistrementVideoPossible() renvoie false.

interface CropTargetStatique {
  fromElement(element: Element): Promise<unknown>;
}
type PisteRognable = MediaStreamTrack & { cropTo(cible: unknown): Promise<void> };

function cropTargetDisponible(): CropTargetStatique | null {
  if (typeof window === "undefined") return null;
  const brut = (window as unknown as { CropTarget?: CropTargetStatique }).CropTarget;
  return brut ?? null;
}

export function enregistrementVideoPossible(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  if (typeof MediaRecorder === "undefined") return false;
  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== "function") return false;
  if (!cropTargetDisponible()) return false;
  // Écran tactile principal (téléphone, tablette) : pas de bouton.
  if (window.matchMedia("(pointer: coarse)").matches) return false;
  return true;
}

// Préfère le MP4 (lisible partout, y compris sur téléphone pour le partager),
// sinon WebM.
function choisirFormat(): { mime: string; extension: string } {
  const candidats = [
    { mime: "video/mp4;codecs=avc1", extension: "mp4" },
    { mime: "video/mp4", extension: "mp4" },
    { mime: "video/webm;codecs=vp9", extension: "webm" },
    { mime: "video/webm;codecs=vp8", extension: "webm" },
    { mime: "video/webm", extension: "webm" },
  ];
  for (const c of candidats) {
    if (MediaRecorder.isTypeSupported(c.mime)) return c;
  }
  return { mime: "", extension: "webm" };
}

export type ErreurEnregistrement = "refuse" | "surface" | "technique";

export class ErreurVideo extends Error {
  constructor(public type: ErreurEnregistrement, message: string) {
    super(message);
  }
}

export interface EnregistrementEnCours {
  // Demande l'arrêt. Le résultat arrive par "fini".
  arreter: () => void;
  // Résolu quand l'enregistrement est terminé (par arreter(), ou parce que
  // l'utilisateur a coupé le partage depuis la barre du navigateur).
  fini: Promise<{ blob: Blob; extension: string } | null>;
}

export async function demarrerEnregistrement(cible: HTMLElement): Promise<EnregistrementEnCours> {
  const CropTarget = cropTargetDisponible();
  if (!CropTarget) throw new ErreurVideo("technique", "recadrage indisponible");

  // Le widget doit être visible à l'écran pendant qu'on le filme.
  cible.scrollIntoView({ block: "center", behavior: "auto" });

  let flux: MediaStream;
  try {
    const cropTarget = await CropTarget.fromElement(cible);
    const options = {
      video: { frameRate: 30 },
      audio: false,
      // Propose directement l'onglet courant dans la fenêtre de permission.
      preferCurrentTab: true,
      selfBrowserSurface: "include",
    } as DisplayMediaStreamOptions;
    flux = await navigator.mediaDevices.getDisplayMedia(options);

    const piste = flux.getVideoTracks()[0] as PisteRognable | undefined;
    if (!piste) throw new ErreurVideo("technique", "aucune piste vidéo");
    // Si la personne a choisi une autre fenêtre ou tout l'écran, on ne peut
    // pas recadrer sur le widget : on coupe proprement.
    const surface = piste.getSettings().displaySurface;
    if (surface && surface !== "browser") {
      flux.getTracks().forEach((p) => p.stop());
      throw new ErreurVideo("surface", "il faut partager l'onglet courant");
    }
    await piste.cropTo(cropTarget);
  } catch (e) {
    if (e instanceof ErreurVideo) throw e;
    if (e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "AbortError")) {
      throw new ErreurVideo("refuse", "partage refusé");
    }
    throw new ErreurVideo("technique", e instanceof Error ? e.message : "erreur inconnue");
  }

  const format = choisirFormat();
  const enregistreur = new MediaRecorder(flux, {
    ...(format.mime ? { mimeType: format.mime } : {}),
    videoBitsPerSecond: 4_000_000,
  });
  const morceaux: Blob[] = [];
  enregistreur.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) morceaux.push(ev.data);
  };

  const fini = new Promise<{ blob: Blob; extension: string } | null>((resolve) => {
    enregistreur.onstop = () => {
      flux.getTracks().forEach((p) => p.stop());
      const blob = new Blob(morceaux, { type: format.mime.split(";")[0] || "video/webm" });
      resolve(blob.size > 0 ? { blob, extension: format.extension } : null);
    };
    enregistreur.onerror = () => {
      flux.getTracks().forEach((p) => p.stop());
      resolve(null);
    };
  });

  // Bouton "Arrêter le partage" de la barre du navigateur.
  flux.getVideoTracks()[0].addEventListener("ended", () => {
    if (enregistreur.state !== "inactive") enregistreur.stop();
  });

  enregistreur.start(1000);

  return {
    arreter: () => {
      if (enregistreur.state !== "inactive") enregistreur.stop();
    },
    fini,
  };
}

export async function telechargerVideo(nomBase: string, resultat: { blob: Blob; extension: string }): Promise<boolean> {
  try {
    await telechargerContenuLocal(`${nomBase}.${resultat.extension}`, resultat.blob, resultat.blob.type || "video/webm");
    return true;
  } catch (e) {
    console.error("[telechargerVideo] échec :", e);
    return false;
  }
}
