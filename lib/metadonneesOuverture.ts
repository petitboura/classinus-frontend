import type { Metadata } from "next";
import {
  obtenirComportementPublic,
  obtenirDossierCataloguePublic,
  obtenirEntreeBibliothequePublique,
} from "@/lib/api";
import { ErreurApi } from "@/lib/erreurs";
import { PARAMETRES_OUVERTURE } from "@/lib/ouvertureParUrl";

// 18/10/2026, demande Bourama : un lien de partage d'un élément public
// ouvre l'appli sur l'aperçu de l'élément (voir lib/ouvertureParUrl.ts).
// Les écrans d'arrivée (/bibliotheque/publique et /skills-publics) sont
// des écrans de l'appli, pas des pages dédiées : ce fichier leur donne
// le titre et la description de l'élément ouvert pour que l'aperçu du lien
// partagé (WhatsApp, Google...) reste aussi parlant qu'avec les anciennes
// pages (textes repris à l'identique de ces pages).
//
// Côté serveur uniquement (generateMetadata). Jamais d'erreur levée : un
// aperçu de lien qui échoue ne doit pas faire échouer l'écran, on renvoie
// alors simplement les métadonnées par défaut.

type ParametresPage = Record<string, string | string[] | undefined>;

function premiereValeur(valeur: string | string[] | undefined): string | null {
  const v = Array.isArray(valeur) ? valeur[0] : valeur;
  return v && v.length > 0 ? v : null;
}

// L'export statique mobile (build:capacitor) n'a ni serveur ni adresse
// variable : lire les paramètres d'adresse y casse le build (constaté le
// 18/09/2026 sur les anciennes pages, voir app/(app)/bibliotheque/[id]).
// L'appli mobile n'a de toute façon pas d'aperçu de lien à produire.
function exportStatiqueMobile(): boolean {
  return process.env.CAPACITOR_BUILD === "true";
}

export async function metadonneesBibliothequePublique(parametres: ParametresPage): Promise<Metadata> {
  if (exportStatiqueMobile()) return {};
  const idFichier = premiereValeur(parametres[PARAMETRES_OUVERTURE.fichier]);
  const idDossier = premiereValeur(parametres[PARAMETRES_OUVERTURE.dossier]);

  try {
    if (idFichier) {
      const entree = await obtenirEntreeBibliothequePublique(idFichier);
      return {
        title: `${entree.nom} · Bibliothèque Classinus`,
        description: entree.description || `Document partagé sur la bibliothèque publique de Classinus : ${entree.nom}.`,
        openGraph: { title: entree.nom, description: entree.description || undefined, type: "article" },
      };
    }
    if (idDossier) {
      const dossier = await obtenirDossierCataloguePublic(idDossier);
      return {
        title: `${dossier.nom} · Bibliothèque Classinus`,
        description: dossier.description || `Dossier de la bibliothèque publique Classinus : ${dossier.nom}.`,
        openGraph: { title: dossier.nom, description: dossier.description || undefined, type: "article" },
      };
    }
  } catch (e) {
    if (e instanceof ErreurApi && e.statusCode === 404) {
      return { title: `${idFichier ? "Document" : "Dossier"} introuvable · Bibliothèque Classinus` };
    }
  }
  return {};
}

export async function metadonneesSkillsPublics(parametres: ParametresPage): Promise<Metadata> {
  if (exportStatiqueMobile()) return {};
  const idSkill = premiereValeur(parametres[PARAMETRES_OUVERTURE.skill]);
  if (!idSkill) return {};

  try {
    const skill = await obtenirComportementPublic(idSkill);
    return {
      title: `${skill.nom} · Skills Classinus`,
      description: skill.description || `Skill publique partagée sur Classinus : ${skill.nom}.`,
      openGraph: { title: skill.nom, description: skill.description || undefined, type: "article" },
    };
  } catch (e) {
    if (e instanceof ErreurApi && e.statusCode === 404) {
      return { title: "Skill introuvable · Skills Classinus" };
    }
  }
  return {};
}
