// Types, validation et formatage partagés pour le bloc ```question du
// markdown -- même famille que ```qcm (QCMInteractif.tsx) et ```fiche
// (FicheRevision.tsx). Ajouté le 15/09/2026 (demande Bourama, chantier
// "question riche dans le chat", Lot 2 des specs indépendantes).
//
// Regroupé ici (plutôt que dans QuestionInteractive.tsx) pour être
// importable à la fois par QuestionInteractive.tsx (rendu standalone) et
// QuestionMultiChamps.tsx (rendu d'un champ imbriqué), sans dépendance
// circulaire entre les deux composants.
//
// Schéma JSON couvrant les 8 types validés par Bourama (voir
// specs-question-riche.md, "Schéma JSON commun").

export type QuestionChoixUnique = {
  question: string;
  type: "choix_unique";
  choix: string[];
  autre?: boolean;
};

export type QuestionChoixMultiple = {
  question: string;
  type: "choix_multiple";
  choix: string[];
  autre?: boolean;
};

export type QuestionTexte = {
  question: string;
  type: "texte";
  format?: "court" | "long";
};

export type QuestionOuiNon = {
  question: string;
  type: "oui_non";
};

export type QuestionEchelle = {
  question: string;
  type: "echelle";
  min: number;
  max: number;
  labels?: { min?: string; max?: string };
};

export type QuestionClassement = {
  question: string;
  type: "classement";
  elements: string[];
};

export type QuestionDate = {
  question: string;
  type: "date";
  granularite?: "date" | "heure" | "date_heure";
};

// Les 7 types utilisables seuls ou imbriqués dans multi_champs (jamais de
// multi_champs imbriqué, voir specs-question-riche.md).
export type ChampSimple =
  | QuestionChoixUnique
  | QuestionChoixMultiple
  | QuestionTexte
  | QuestionOuiNon
  | QuestionEchelle
  | QuestionClassement
  | QuestionDate;

export type QuestionMultiChampsData = {
  question: string;
  type: "multi_champs";
  champs: ChampSimple[];
};

export type QuestionRiche = ChampSimple | QuestionMultiChampsData;

// État local d'édition d'un champ, une variante par type -- toujours
// initialisé "vide" (aucune présélection) pour forcer un choix explicite
// de l'étudiant, y compris sur classement où l'ordre affiché par défaut
// suit l'ordre du JSON tant qu'il n'est pas modifié.
export type ValeurChoix = { indices: number[]; autreActif: boolean; autreTexte: string };
export const valeurChoixVide: ValeurChoix = { indices: [], autreActif: false, autreTexte: "" };

export type ValeurChamp =
  | ({ champType: "choix_unique" | "choix_multiple" } & ValeurChoix)
  | { champType: "texte"; texte: string }
  | { champType: "oui_non"; reponse: "oui" | "non" | null }
  | { champType: "echelle"; valeur: number | null }
  | { champType: "classement"; ordre: number[] }
  | { champType: "date"; valeur: string };

export function valeurInitiale(champ: ChampSimple): ValeurChamp {
  switch (champ.type) {
    case "choix_unique":
    case "choix_multiple":
      return { champType: champ.type, ...valeurChoixVide };
    case "texte":
      return { champType: "texte", texte: "" };
    case "oui_non":
      return { champType: "oui_non", reponse: null };
    case "echelle":
      return { champType: "echelle", valeur: null };
    case "classement":
      return { champType: "classement", ordre: champ.elements.map((_, i) => i) };
    case "date":
      return { champType: "date", valeur: "" };
  }
}

// Un champ est-il prêt à être soumis (active le bouton Valider, ou pour
// choix_unique/oui_non l'état "cliquable") ?
export function valeurComplete(champ: ChampSimple, valeur: ValeurChamp): boolean {
  switch (champ.type) {
    case "choix_unique":
    case "choix_multiple": {
      if (valeur.champType !== champ.type) return false;
      return valeur.indices.length > 0 || (valeur.autreActif && valeur.autreTexte.trim().length > 0);
    }
    case "texte":
      return valeur.champType === "texte" && valeur.texte.trim().length > 0;
    case "oui_non":
      return valeur.champType === "oui_non" && valeur.reponse !== null;
    case "echelle":
      return valeur.champType === "echelle" && valeur.valeur !== null;
    case "classement":
      return valeur.champType === "classement";
    case "date":
      return valeur.champType === "date" && valeur.valeur.trim().length > 0;
  }
}

// Vérifie la structure minimale d'un champ (au moins 2 choix, min < max,
// au moins un élément à classer...) -- même esprit que les gardes de
// QCMInteractif.tsx/FicheRevision.tsx. Renvoie un message d'erreur, ou
// null si le champ est valide.
export function erreurStructure(champ: ChampSimple): string | null {
  switch (champ.type) {
    case "choix_unique":
    case "choix_multiple":
      if (!Array.isArray(champ.choix) || champ.choix.length < 2) {
        return "au moins deux choix sont nécessaires.";
      }
      return null;
    case "texte":
    case "oui_non":
      return null;
    case "echelle":
      if (typeof champ.min !== "number" || typeof champ.max !== "number" || champ.min >= champ.max) {
        return "un minimum et un maximum cohérents sont nécessaires.";
      }
      return null;
    case "classement":
      if (!Array.isArray(champ.elements) || champ.elements.length < 2) {
        return "au moins deux éléments sont nécessaires.";
      }
      return null;
    case "date":
      return null;
  }
}

function formaterHeureCourte(hhmm: string): string {
  const [h, m] = hhmm.split(":");
  if (!h || !m) return hhmm;
  return `${h}h${m}`;
}

// Transforme la valeur d'édition d'un champ en texte final lisible, prêt
// à être envoyé comme un message normal de l'étudiant (voir Lot 3 pour le
// branchement réel sur l'envoi). Format choisi ici, faute de format
// imposé par le schéma JSON -- signalé à Bourama, ajustable facilement.
export function formaterReponseChamp(champ: ChampSimple, valeur: ValeurChamp): string {
  switch (champ.type) {
    case "choix_unique":
    case "choix_multiple": {
      if (valeur.champType !== champ.type) return "";
      const labels = valeur.indices.map((i) => champ.choix[i]).filter((v): v is string => typeof v === "string");
      if (valeur.autreActif && valeur.autreTexte.trim()) labels.push(valeur.autreTexte.trim());
      return labels.join(", ");
    }
    case "texte":
      return valeur.champType === "texte" ? valeur.texte.trim() : "";
    case "oui_non":
      if (valeur.champType !== "oui_non" || !valeur.reponse) return "";
      return valeur.reponse === "oui" ? "Oui" : "Non";
    case "echelle": {
      if (valeur.champType !== "echelle" || valeur.valeur === null) return "";
      const n = valeur.valeur;
      if (n === champ.min && champ.labels?.min) return `${n} (${champ.labels.min})`;
      if (n === champ.max && champ.labels?.max) return `${n} (${champ.labels.max})`;
      return String(n);
    }
    case "classement": {
      if (valeur.champType !== "classement") return "";
      return valeur.ordre.map((i, position) => `${position + 1}. ${champ.elements[i]}`).join(", ");
    }
    case "date": {
      if (valeur.champType !== "date" || !valeur.valeur) return "";
      const granularite = champ.granularite ?? "date";
      if (granularite === "heure") return formaterHeureCourte(valeur.valeur);
      if (granularite === "date_heure") {
        return new Date(valeur.valeur).toLocaleString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      return new Date(`${valeur.valeur}T00:00:00`).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  }
}
