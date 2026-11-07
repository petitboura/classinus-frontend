import type { EffetHiggsfield } from "@/lib/effetsHiggsfield";
import type { FamilleHiggsfield } from "@/lib/higgsfieldGeneration";

// Message préécrit pour faire une génération Higgsfield dans le chat, quand le formulaire Générer
// ne suffit pas. Le message part de la phrase de l'effet et y ajoute ce que la personne
// a déjà saisi dans le formulaire, pour qu'elle ne perde rien en changeant de voie.
// Il reste en français comme les phrases du catalogue : Classinus répond dans la langue de la personne.

const MODELE_MARKETING_STUDIO = "Marketing Studio";
const PREFIXE_ID_MARKETING = "marketing-";

/** Titre proposé par défaut dans le formulaire : le nom de l'effet, sans le préfixe Genjutsu. */
export function titreParDefaut(effet: EffetHiggsfield): string {
  return effet.nom.replace(/^Genjutsu ·\s*/, "").slice(0, 80);
}

/** Ce que la personne a saisi dans le formulaire au moment où elle choisit le chat. */
export type SaisieFormulaireHiggsfield = {
  famille: FamilleHiggsfield;
  titre: string;
  prompt: string;
  duree: number;
  formatVideo: string;
  qualiteVideo: string;
  son: boolean;
  formatImage: string;
  qualiteImage: string;
  resolutionGenjutsu: string;
  presetId: string;
  nbVideos: number;
  nbImages: number;
};

function finirPhrase(texte: string): string {
  const net = texte.trim();
  return /[.!?]$/.test(net) ? net : `${net}.`;
}

function phraseFichiers(nbVideos: number, nbImages: number): string {
  const morceaux: string[] = [];
  if (nbVideos > 0) morceaux.push(`${nbVideos} vidéo${nbVideos > 1 ? "s" : ""}`);
  if (nbImages > 0) morceaux.push(`${nbImages} image${nbImages > 1 ? "s" : ""}`);
  if (morceaux.length === 0) return "Je n'ai encore rien joint : dis-moi ce qu'il te faut pour commencer.";
  return `J'ai déjà joint ${morceaux.join(" et ")} à ce message.`;
}

/** Phrase de départ d'un effet du catalogue (Genjutsu, viral, Soul), écrite à partir de ce que l'effet est vraiment. */
function phraseEffet(effet: EffetHiggsfield): string {
  const nomCourt = effet.nom.replace(/^(Genjutsu|Soul) ·\s*/, "");
  if (effet.badge === "Genjutsu") {
    const action =
      effet.modele === "hf_mult_replace_object"
        ? "remplace le sujet de ma vidéo par le personnage de mon image de référence"
        : "transfère le mouvement de ma vidéo de référence sur mon image";
    return `Applique l'effet Genjutsu « ${nomCourt} » : ${action} (modèle Higgsfield ${effet.modele}).`;
  }
  if (effet.modele === "soul_2") {
    const style = effet.styleId ? `, style_id ${effet.styleId}` : "";
    return `Génère un portrait avec le style Soul « ${nomCourt} » de Higgsfield (modèle soul_2${style}).`;
  }
  return `Applique l'effet Higgsfield « ${effet.nom} » sur ma vidéo : ${effet.description}`;
}

/** Phrase de départ d'un preset Marketing Studio, dont le catalogue n'a pas de phrase écrite d'avance. */
function phraseMarketingStudio(effet: EffetHiggsfield): string {
  const genre = effet.type === "image" ? "une image" : "une vidéo";
  const categorie = effet.style ? ` (catégorie ${effet.style})` : "";
  const idPreset = effet.id.startsWith(PREFIXE_ID_MARKETING) ? effet.id.slice(PREFIXE_ID_MARKETING.length) : "";
  const reference = idPreset ? ` Identifiant du preset : ${idPreset}.` : "";
  return `Crée ${genre} avec le preset Marketing Studio « ${effet.nom} » de Higgsfield${categorie}.${reference}`;
}

function phraseOptions(saisie: SaisieFormulaireHiggsfield): string {
  if (saisie.famille === "video") {
    return `Options : ${saisie.duree} s, format ${saisie.formatVideo}, qualité ${saisie.qualiteVideo}, ${saisie.son ? "avec son" : "sans son"}.`;
  }
  if (saisie.famille === "image") {
    return `Options : format ${saisie.formatImage}, qualité ${saisie.qualiteImage}.`;
  }
  const preset = saisie.presetId.trim() ? ` Identifiant du preset : ${saisie.presetId.trim()}.` : "";
  return `Options : résolution ${saisie.resolutionGenjutsu}.${preset}`;
}

/**
 * Construit le message à déposer dans le chat. Sans `saisie` (cas des presets Marketing Studio, qui n'ont
 * pas de formulaire), le message se limite à la phrase de l'effet et à une invitation à fournir le nécessaire.
 */
export function messageChatHiggsfield(effet: EffetHiggsfield, saisie?: SaisieFormulaireHiggsfield): string {
  const estMarketingStudio = effet.modele === MODELE_MARKETING_STUDIO;
  const base = estMarketingStudio ? phraseMarketingStudio(effet) : phraseEffet(effet);
  const lignes: string[] = [finirPhrase(base)];

  if (!saisie) {
    lignes.push("Dis-moi ce dont tu as besoin pour commencer.");
    return lignes.join("\n");
  }

  const titre = saisie.titre.trim();
  if (titre && titre !== titreParDefaut(effet)) lignes.push(`Titre : ${titre}.`);
  const description = saisie.prompt.trim();
  if (description) lignes.push(`Ma description : ${finirPhrase(description)}`);
  lignes.push(phraseOptions(saisie));
  lignes.push(phraseFichiers(saisie.nbVideos, saisie.nbImages));
  return lignes.join("\n");
}
