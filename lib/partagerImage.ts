import { Capacitor } from "@capacitor/core";
import { obtenirLocale } from "@/lib/i18n/locale";

// Partage d'une image générée : la personne choisit d'envoyer le lien, l'image, ou les deux.
// Le lien est son lien de parrainage (lib/parrainage.ts) : c'est ce qui fait venir de nouveaux inscrits.
//
// Trois façons de partager, dans cet ordre :
// 1. Appli mobile (Capacitor) : le plugin de partage du système, comme lib/telecharger.ts.
// 2. Navigateur avec navigator.share (téléphone, Chrome, Edge, Safari récents). Pour envoyer une image,
//    navigator.canShare doit confirmer que le fichier peut partir (recommandation de web.dev).
// 3. Sinon : copie du lien dans le presse papier (« copier le lien » en secours).
//
// Le texte qui accompagne le partage n'est pas affiché dans la page : il part dans l'application choisie.
// Il n'est donc pas traduit par la couche d'interface et existe ici en français et en anglais.

export type ModePartage = "lien" | "image" | "les-deux";
/** "partage" : la fenêtre du système s'est refermée sur un envoi. "copie" : le lien est dans le presse papier. */
export type ResultatPartage = "partage" | "copie" | "annule";

type RaisonErreurPartage = "image_indisponible" | "partage_impossible";

/** Erreur attendue (pas un bug) : l'écran la traduit en phrase claire et propose le lien à la place. */
export class ErreurPartageImage extends Error {
  constructor(readonly raison: RaisonErreurPartage) {
    super(raison);
    this.name = "ErreurPartageImage";
  }
}

const TEXTES_INVITATION = {
  fr: "Regarde l'image que j'ai créée avec Classinus ! Rejoins Classinus avec mon lien et crée tes propres images gratuitement.",
  en: "Look at the image I made with Classinus! Join Classinus with my link and create your own images for free.",
} as const;

function texteInvitation(): string {
  return TEXTES_INVITATION[obtenirLocale()];
}

// Boîte de secours du navigateur : son texte n'est pas dans la page, donc pas traduit par la couche d'interface.
const TEXTES_COPIE_MANUELLE = { fr: "Copie ce lien :", en: "Copy this link:" } as const;

type NavigateurPartage = Navigator & {
  share?: (donnees: ShareData) => Promise<void>;
  canShare?: (donnees: ShareData) => boolean;
};

function estAnnulation(e: unknown): boolean {
  if (e instanceof DOMException && e.name === "AbortError") return true;
  return e instanceof Error && /cancel|abort/i.test(`${e.name} ${e.message}`);
}

/** Nom de fichier propre (sans accents ni symboles) avec l'extension du vrai type de l'image. */
function nomFichierImage(titre: string, type: string): string {
  const extension = type === "image/jpeg" ? "jpg" : type === "image/webp" ? "webp" : "png";
  const base = titre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 _-]/g, "")
    .trim()
    .slice(0, 60);
  return `${base || "classinus"}.${extension}`;
}

/**
 * Prépare le fichier de l'image pour le partage. À lancer dès que la personne ouvre le choix de partage :
 * le téléchargement doit être fini avant le tap final, sinon certains navigateurs refusent d'ouvrir la fenêtre
 * de partage (elle doit suivre de près un geste de la personne).
 * Lève ErreurPartageImage("image_indisponible") si l'image ne peut pas être lue par le navigateur.
 */
export async function preparerImagePourPartage(url: string, titre: string): Promise<File> {
  let reponse: Response;
  try {
    reponse = await fetch(url);
  } catch {
    throw new ErreurPartageImage("image_indisponible");
  }
  if (!reponse.ok) throw new ErreurPartageImage("image_indisponible");
  let blob: Blob;
  try {
    blob = await reponse.blob();
  } catch {
    throw new ErreurPartageImage("image_indisponible");
  }
  const type = blob.type.startsWith("image/") ? blob.type : "image/png";
  return new File([blob], nomFichierImage(titre, type), { type });
}

/** Vrai si ce navigateur sait envoyer ce fichier (ou si on est dans l'appli mobile, qui le sait toujours). */
export function peutPartagerFichier(fichier: File): boolean {
  if (Capacitor.isNativePlatform()) return true;
  if (typeof navigator === "undefined") return false;
  const nav = navigator as NavigateurPartage;
  return typeof nav.share === "function" && typeof nav.canShare === "function" && nav.canShare({ files: [fichier] });
}

function fichierVersBase64(fichier: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onloadend = () => resolve((lecteur.result as string).split(",")[1] ?? "");
    lecteur.onerror = () => reject(lecteur.error);
    lecteur.readAsDataURL(fichier);
  });
}

async function partagerDansAppliMobile(mode: ModePartage, lien: string, titre: string, fichier: File | null): Promise<ResultatPartage> {
  const { Share } = await import("@capacitor/share");
  try {
    if (mode === "lien") {
      await Share.share({ title: titre, text: texteInvitation(), url: lien, dialogTitle: titre });
      return "partage";
    }
    if (!fichier) throw new ErreurPartageImage("image_indisponible");
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { uri } = await Filesystem.writeFile({
      path: fichier.name,
      data: await fichierVersBase64(fichier),
      directory: Directory.Cache,
    });
    await Share.share({
      title: titre,
      ...(mode === "les-deux" ? { text: `${texteInvitation()}\n${lien}` } : {}),
      files: [uri],
      dialogTitle: titre,
    });
    return "partage";
  } catch (e) {
    if (e instanceof ErreurPartageImage) throw e;
    if (estAnnulation(e)) return "annule";
    throw new ErreurPartageImage("partage_impossible");
  }
}

/**
 * Ouvre la fenêtre de partage du système avec le contenu choisi.
 * Renvoie "partage" quand elle s'est refermée sur un envoi, "annule" si la personne a changé d'avis.
 * Lève ErreurPartageImage si l'image ne peut pas partir ici (l'écran propose alors le lien).
 * Sur un navigateur sans partage de système, le mode "lien" copie le lien et renvoie "copie".
 */
export async function partagerContenu(options: {
  mode: ModePartage;
  lien: string;
  titre: string;
  /** Fichier prêt (preparerImagePourPartage), requis pour les modes "image" et "les-deux". */
  fichier: File | null;
}): Promise<ResultatPartage> {
  const { mode, lien, titre, fichier } = options;
  if (Capacitor.isNativePlatform()) return partagerDansAppliMobile(mode, lien, titre, fichier);

  const nav = navigator as NavigateurPartage;
  if (mode === "lien") {
    if (typeof nav.share !== "function") return copierLien(lien);
    try {
      await nav.share({ title: titre, text: texteInvitation(), url: lien });
      return "partage";
    } catch (e) {
      if (estAnnulation(e)) return "annule";
      throw new ErreurPartageImage("partage_impossible");
    }
  }

  if (!fichier || !peutPartagerFichier(fichier)) throw new ErreurPartageImage("partage_impossible");
  try {
    await nav.share!({
      title: titre,
      ...(mode === "les-deux" ? { text: `${texteInvitation()}\n${lien}` } : {}),
      files: [fichier],
    });
    return "partage";
  } catch (e) {
    if (estAnnulation(e)) return "annule";
    throw new ErreurPartageImage("partage_impossible");
  }
}

/** Copie le lien dans le presse papier. Dernier repli : la boîte du navigateur où la personne le copie elle même. */
export async function copierLien(lien: string): Promise<ResultatPartage> {
  try {
    await navigator.clipboard.writeText(lien);
    return "copie";
  } catch {
    // Même repli que components/ButtonPartager.tsx.
    return window.prompt(TEXTES_COPIE_MANUELLE[obtenirLocale()], lien) === null ? "annule" : "copie";
  }
}
