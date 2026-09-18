import { supabase } from "./supabase";
import { ErreurApi, messageErreur } from "./erreurs";

// URL du backend FastAPI (voir api/main.py). En local pendant le dev :
// http://localhost:8000. Une fois déployé sur Railway : l'URL publique de
// ce service (pas encore un domaine définitif tant que djiguigne.com n'est
// pas branché — voir RAILWAY_DEPLOY.md du dépôt djiguigne-backend).
export const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL est requis (voir .env.local.example).");
}

/**
 * Construit une ErreurApi à partir d'une réponse HTTP en échec.
 *
 * AVANT (bug corrigé le 2026-07-31) : le corps JSON de la réponse était
 * pris comme texte brut et collé dans le message d'erreur affiché à
 * l'utilisateur, ex. `Erreur API 403 sur /api/agents/x : {"detail":{"code":
 * "CET_AGENT_NE_T_APPARTIENT_PAS","message":"Cet agent ne t'appartient
 * pas."}}`. Tout le travail de messages propres côté backend (voir
 * djiguigne-backend/core/erreurs.py) était donc invisible : ce JSON brut
 * atterrissait tel quel dans les <p>{erreur}</p> et les alert() du front.
 *
 * MAINTENANT : on parse le corps et on extrait proprement `code`,
 * `message` et `params` (voir erreur_api() côté backend), avec un repli
 * sur chaque format qu'on peut rencontrer :
 * - {"detail": {"code": ..., "message": ..., "params"?: {...}}}  (notre format)
 * - {"detail": [{"msg": ..., ...}, ...]}                         (422 auto FastAPI/pydantic)
 * - {"detail": "texte brut"}                                     (ancien format / lib externe)
 * - corps non-JSON ou vide                                       (erreur réseau, proxy, etc.)
 */
async function construireErreurApi(reponse: Response, chemin: string): Promise<ErreurApi> {
  const texteBrut = await reponse.text().catch(() => "");

  let corps: unknown = null;
  try {
    corps = texteBrut ? JSON.parse(texteBrut) : null;
  } catch {
    corps = null;
  }

  const detail = corps && typeof corps === "object" ? (corps as any).detail : undefined;

  if (detail && typeof detail === "object" && !Array.isArray(detail) && typeof detail.message === "string") {
    // Notre format standard (voir erreur_api() dans core/erreurs.py).
    return new ErreurApi(reponse.status, detail.message, detail.code, detail.params);
  }

  if (typeof detail === "string" && detail.trim()) {
    // Ancienne HTTPException FastAPI avec un detail texte simple.
    return new ErreurApi(reponse.status, detail);
  }

  if (Array.isArray(detail) && detail.length > 0) {
    // Erreur de validation automatique de FastAPI/pydantic (422), jamais
    // écrite pour un humain -- on ne montre pas sa structure technique.
    return new ErreurApi(reponse.status, "La requête envoyée est invalide.", "REQUETE_INVALIDE");
  }

  if (reponse.status === 401) {
    return new ErreurApi(401, "Ta session a expiré, reconnecte-toi.", "SESSION_EXPIREE");
  }

  // Corps vide/non-JSON (ex: proxy, 502/504, coupure réseau) : pas de code
  // exploitable, mais on évite au moins d'afficher du JSON brut ou "".
  return new ErreurApi(
    reponse.status,
    `Une erreur est survenue (${reponse.status}), réessaie dans un instant.`,
    "ERREUR_INCONNUE"
  );
}

/**
 * Appelle l'API avec le token Supabase de la session en cours, si elle
 * existe. N'échoue pas si personne n'est connecté : certaines routes sont
 * publiques (ex: /api/feed, /api/search) et n'ont pas besoin de token.
 */
export async function appelerApi(chemin: string, options: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const entetes = new Headers(options.headers);
  entetes.set("Content-Type", "application/json");
  if (session?.access_token) {
    entetes.set("Authorization", `Bearer ${session.access_token}`);
  }

  const reponse = await fetch(`${API_URL}${chemin}`, {
    ...options,
    headers: entetes,
  });

  if (!reponse.ok) {
    throw await construireErreurApi(reponse, chemin);
  }

  // Certaines routes (ex: POST .../rating) renvoient 204 No Content —
  // aucun corps à parser. Sans ce garde-fou, response.json() plante avec

  // "Unexpected end of JSON input" (bug remonté par Bourama, 2026-07-12,
  // sur le clic étoile de la note). content-length à "0" couvre aussi le
  // cas d'un corps vide envoyé avec un autre code que 204.
  if (reponse.status === 204 || reponse.headers.get("content-length") === "0") {
    return null;
  }

  return reponse.json();
}

/**
 * Variante streaming (Server-Sent Events) pour /api/chat -- voir
 * api/chat.py côté backend. Contrairement à appelerApi, ne parse pas
 * directement un JSON unique : appelle `surEvenement` pour chaque
 * événement reçu (mêmes types que core/main.py:chat(), voir sa
 * docstring : "statut", "statut_termine", "reponse", "confirmation_requise",
 * "meta"), au fur et à mesure du streaming.
 */
export async function appelerApiStream(
  chemin: string,
  corps: unknown,
  surEvenement: (evenement: any) => void
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const entetes = new Headers();
  entetes.set("Content-Type", "application/json");
  if (session?.access_token) {
    entetes.set("Authorization", `Bearer ${session.access_token}`);
  }

  const reponse = await fetch(`${API_URL}${chemin}`, {
    method: "POST",
    headers: entetes,
    body: JSON.stringify(corps),
  });

  if (!reponse.ok || !reponse.body) {
    throw await construireErreurApi(reponse, chemin);
  }

  const lecteur = reponse.body.getReader();
  const decodeur = new TextDecoder();
  let tampon = "";

  while (true) {
    const { done, value } = await lecteur.read();
    if (done) break;
    tampon += decodeur.decode(value, { stream: true });

    // Un événement SSE = une ligne "data: {...}", séparée par \n\n.
    const morceaux = tampon.split("\n\n");
    tampon = morceaux.pop() ?? "";

    for (const morceau of morceaux) {
      const ligne = morceau.trim();
      if (!ligne.startsWith("data:")) continue;
      const contenu = ligne.slice("data:".length).trim();
      if (contenu === "[DONE]") return;
      try {
        surEvenement(JSON.parse(contenu));
      } catch {
        // Ligne mal formée : on l'ignore plutôt que de casser tout le flux.
      }
    }
  }
}
/**
 * Ajoutée pour le fix du 2026-07-12 (champs URL image remplacés par un
 * vrai upload, voir components/ChampImage.tsx). Pas de
 * Content-Type manuel : le navigateur doit le fixer lui-même avec le
 * boundary du FormData, le mettre à la main casse l'upload.
 */
export async function appelerApiFichier(chemin: string, fichier: File) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Connecte-toi pour envoyer un fichier.");
  }

  const corps = new FormData();
  corps.append("fichier", fichier);

  const reponse = await fetch(`${API_URL}${chemin}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: corps,
  });

  if (!reponse.ok) {
    throw await construireErreurApi(reponse, chemin);
  }

  return reponse.json();
}

/**
 * Upload vers la bibliothèque d'un agent (n'importe quel type de fichier
 * + un titre) -- voir api/agents.py:uploader_fichier_bibliotheque.
 * Distincte de appelerApiFichier : celle-ci envoie un champ "titre" en
 * plus du fichier dans le FormData.
 */
export async function ajouterFichierBibliotheque(
  agentId: string,
  fichier: File,
  description: string,
  titre?: string
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Connecte-toi pour envoyer un fichier.");
  }

  const corps = new FormData();
  corps.append("fichier", fichier);
  if (titre?.trim()) corps.append("titre", titre.trim());
  corps.append("description", description);

  const reponse = await fetch(`${API_URL}/api/agents/${agentId}/bibliotheque`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: corps,
  });

  if (!reponse.ok) {
    throw await construireErreurApi(reponse, `/api/agents/${agentId}/bibliotheque`);
  }

  return reponse.json();
}

export type FichierBibliothequePersonnelle = {
  id: string;
  nom_fichier: string;
  type_mime: string;
  description: string | null;
  url_publique: string;
  created_at: string;
  statut_vectorisation?: string;
};

/**
 * Liste la bibliothèque personnelle complète (17/08 -- extrait en
 * fonction nommée pour être réutilisé par le sélecteur "Depuis ma
 * bibliothèque" des sections Documents du programme, voir
 * lib/emplacementsProgramme.ts). EspaceBibliotheque.tsx continue
 * d'appeler appelerApi("/api/bibliotheque") directement, comportement
 * inchangé -- même endpoint, juste une signature typée en plus ici.
 */
export async function listerBibliothequePersonnelle() {
  const resultat = await appelerApi("/api/bibliotheque");
  return resultat as FichierBibliothequePersonnelle[];
}

export type ResultatDiffusion = { diffuse_a: number; total_receveurs: number; echecs: string[] };
// MonRole/lireMonRole/diffuserDocumentEtablissement/diffuserLien/
// listerMesDiffusions retirés le 09/08 (demande Bourama : plus de rôle
// pour Clovis) -- voir plus bas dans ce fichier les nouvelles
// fonctions basées sur /api/agents/clovis/contenus-matiere et
// /rattachements (contenu dynamique par matière, système déjà existant
// et partagé avec Djiguignè, pas de vérification de rôle dessus).

/**
 * Progression de la vectorisation en masse d'un dossier désigné (04/09/2026,
 * voir clovis-backend/api/dossiers_designes.py::progression_dossier) --
 * destinée à la barre de progression de EspaceDossiers.tsx ("étape 5" du
 * chantier, demande Bourama). Comptage fait côté serveur, rien à calculer
 * ici, donc survit à une fermeture/réouverture de l'app.
 */
export async function obtenirProgressionDossierDesigne(dossierNom: string, plateforme: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Connecte-toi pour voir la progression.");
  }

  const params = new URLSearchParams({ dossier_nom: dossierNom, plateforme });
  const reponse = await fetch(`${API_URL}/api/dossiers-designes/progression?${params}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!reponse.ok) {
    throw await construireErreurApi(reponse, "/api/dossiers-designes/progression");
  }

  return reponse.json() as Promise<{ total: number; prets: number; en_cours: number; echecs: number; termine: boolean }>;
}

/**
 * Upload vers la bibliothèque PERSONNELLE de l'utilisateur connecté
 * (2026-08-01, nouvelle section "Mon espace" -- voir
 * api/bibliotheque_utilisateur.py:uploader_document). Même mécanique que
 * ajouterFichierBibliotheque ci-dessus, sans agentId : ces documents ne
 * sont liés à aucun agent, consultables depuis n'importe quelle
 * conversation via l'outil consulter_bibliotheque.
 */
export async function ajouterFichierBibliothequePersonnelle(fichier: File, description: string, titre?: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Connecte-toi pour envoyer un fichier.");
  }

  const corps = new FormData();
  // CORRECTIF 2026-08-27 (bug remonté par Bourama : un fichier issu d'un
  // dossier importé gardait "le nom de toutes ses mères et grand-mères
  // séparé par /" -- ex: nom_fichier = "Cours/Chimie/td1.pdf" au lieu de
  // "td1.pdf"). Cause : pour un fichier obtenu via un input
  // webkitdirectory, certains navigateurs utilisent la propriété
  // webkitRelativePath (le chemin complet) plutôt que .name comme nom de
  // fichier dans l'encodage multipart de FormData.append quand aucun 3e
  // argument n'est fourni -- ce que le backend reçoit tel quel comme
  // nom_original (voir api/bibliotheque_utilisateur.py). On force donc
  // explicitement le nom envoyé au SEUL nom de fichier (dernier segment),
  // jamais son chemin -- corrige la source, pour tous les appelants
  // (dossier importé ou fichier simple), peu importe le navigateur.
  const nomSeul = (fichier.webkitRelativePath || fichier.name).split("/").pop() || fichier.name;
  corps.append("fichier", fichier, nomSeul);
  if (titre?.trim()) corps.append("titre", titre.trim());
  corps.append("description", description);

  const reponse = await fetch(`${API_URL}/api/bibliotheque`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: corps,
  });

  if (!reponse.ok) {
    throw await construireErreurApi(reponse, "/api/bibliotheque");
  }

  return reponse.json();
}

/**
 * Ajoute un lien ou une note de texte à la bibliothèque personnelle
 * (2026-08-01, demande Bourama : "ajoute le cas des liens et du texte",
 * "pas de filtre au moment de l'upload" -- voir espace/page.tsx pour la
 * détection automatique du type). Deux fonctions séparées car les
 * payloads backend diffèrent (voir api/bibliotheque_utilisateur.py :
 * /lien attend {url, titre}, /texte attend {contenu, titre}).
 */
/**
 * Bouton "Réessayer" (03/09/2026, demande Bourama : un fichier en échec
 * de vectorisation restait affiché avec un point rouge indéfiniment --
 * voir api/bibliotheque_utilisateur.py:reessayer_vectorisation).
 */
export async function reessayerVectorisationBibliothequePersonnelle(fichierId: string) {
  return appelerApi(`/api/bibliotheque/${fichierId}/reessayer-vectorisation`, { method: "POST" });
}

export async function ajouterLienBibliothequePersonnelle(url: string, titre?: string) {
  return appelerApi("/api/bibliotheque/lien", {
    method: "POST",
    body: JSON.stringify({ url, titre: titre?.trim() || null }),
  });
}

export async function ajouterTexteBibliothequePersonnelle(contenu: string, titre?: string) {
  return appelerApi("/api/bibliotheque/texte", {
    method: "POST",
    body: JSON.stringify({ contenu, titre: titre?.trim() || null }),
  });
}

// 21/08/2026, demande Bourama : "un bibliothèque publique dans la
// section bibliothèque, tout le monde peut y ajouter des documents,
// juste en le décrivant et en donnant un nom" -- CORRECTION le même
// jour (malentendu de ma part) : nom + description accompagnent un VRAI
// fichier uploadé, ils ne le remplacent pas. Catalogue distinct de la
// bibliothèque personnelle (voir docstring backend), mais upload réel
// comme elle.
export type EntreeBibliothequePublique = {
  id: string;
  nom: string;
  description: string;
  nom_fichier: string | null;
  type_mime: string | null;
  taille_octets: number | null;
  url_publique: string | null;
  created_at: string;
  // 29/08/2026, file d'attente de vectorisation en arrière-plan : "en_attente" / "en_cours" / "pret" / "echec".
  statut_vectorisation?: string;
  // 03/09/2026, demande Bourama : 3 filtres cochables à la publication
  // (voir core/listes_bibliotheque_publique.py côté backend), optionnels.
  // 15/09/2026, demande Bourama : un fichier peut désormais avoir
  // plusieurs valeurs par filtre, colonnes passées en tableau côté
  // Supabase (même principe que les dossiers depuis le 13/09/2026).
  pays?: string[];
  niveau?: string[];
  categorie?: string[];
  // 04/09/2026, demande Bourama : 2 filtres supplémentaires, même principe.
  classe?: string[];
  specialite?: string[];
  // 15/09/2026, demande Bourama (modifier les filtres après
  // publication) : true si l'utilisateur courant est le contributeur
  // d'origine de cette entrée, pour savoir s'il faut proposer le
  // bouton "Modifier les filtres" (voir api/bibliotheque_publique.py::
  // _marquer_est_a_moi).
  est_a_moi?: boolean;
  // 17/09/2026, demande Bourama : étoiles façon GitHub sur le catalogue
  // public (fichiers/dossiers/skills), voir basculerEtoileCatalogue
  // plus bas -- une étoile par personne, seul le total compte.
  etoiles_count?: number;
  mon_etoile?: boolean;
  // 18/09/2026, chantier "profil contributeur bibliotheque publique",
  // étape 8 : id du contributeur, pour le bouton "détails" -> popup
  // profil (voir ProfilPublicModal.tsx). Soumis à profil_public côté
  // profil visé, jamais l'id d'un tiers exposé sans ce garde-fou.
  ajoute_par?: string | null;
};

// 03/09/2026, demande Bourama : filtres pays/niveau/catégorie en plus de
// la recherche texte -- voir GET /api/bibliotheque-publique côté backend.
// 04/09/2026 : + dossierId/decalage/limite pour le scroll infini (plus
// de plafond fixe côté serveur, qui cachait les fichiers les plus
// anciens dès que le catalogue dépassait 200 entrées).
export type FiltresBibliothequePublique = {
  pays?: string;
  niveau?: string;
  categorie?: string;
  // 04/09/2026, demande Bourama : 2 filtres supplémentaires, même principe.
  classe?: string;
  specialite?: string;
  dossierId?: string;
  decalage?: number;
  limite?: number;
};

// 15/09/2026, demande Bourama : filtres à la PUBLICATION d'un fichier/
// lien/texte, distinct de FiltresBibliothequePublique ci-dessus (qui
// sert à chercher/parcourir avec UNE seule valeur par filtre). Un
// fichier peut désormais recevoir PLUSIEURS valeurs par filtre, même
// principe que FiltresDossierCataloguePublic côté dossier (mais sans
// héritage, un fichier n'a jamais de descendants).
export type FiltresPublicationBibliothequePublique = {
  pays?: string[];
  niveau?: string[];
  categorie?: string[];
  classe?: string[];
  specialite?: string[];
};

// 17/09/2026, demande Bourama : étoiles façon GitHub sur le catalogue
// public -- une seule route pour les 3 types d'éléments (fichier/
// dossier/skill), voir POST /api/etoiles-catalogue-public/basculer
// côté backend. Toggle : ajoute l'étoile de cet utilisateur si elle
// n'y est pas encore, la retire sinon.
export type TypeElementCataloguePublic = "fichier" | "dossier" | "skill";

export async function basculerEtoileCatalogue(typeElement: TypeElementCataloguePublic, elementId: string) {
  const resultat = await appelerApi("/api/etoiles-catalogue-public/basculer", {
    method: "POST",
    body: JSON.stringify({ type_element: typeElement, element_id: elementId }),
  });
  return resultat as { etoile: boolean; etoiles_count: number };
}

// 18/09/2026, chantier "profil contributeur bibliotheque publique",
// étapes 6/7/9 : compteurs bruts (partages, CTA) et lecture agrégée en
// lot pour l'analytique affichée sur chaque carte. Best-effort côté
// appelant -- ces deux incréments ne doivent jamais faire échouer
// l'action utilisateur (partager/discuter avec l'IA), voir usages dans
// ButtonPartager.tsx et BoutonAvecIA.tsx.
export async function incrementerCtaCatalogue(typeElement: TypeElementCataloguePublic, elementId: string) {
  const resultat = await appelerApi("/api/compteurs-catalogue-public/cta", {
    method: "POST",
    body: JSON.stringify({ type_element: typeElement, element_id: elementId }),
  });
  return resultat as { total: number };
}

export async function incrementerPartageCatalogue(typeElement: TypeElementCataloguePublic, elementId: string) {
  const resultat = await appelerApi("/api/compteurs-catalogue-public/partages", {
    method: "POST",
    body: JSON.stringify({ type_element: typeElement, element_id: elementId }),
  });
  return resultat as { total: number };
}

export type CompteursCatalogue = {
  partages_count: number;
  etoiles_count: number;
  cta_count: number;
  enregistrements_count: number;
};

// Un seul appel pour toute une page de cartes (note performance étape
// 7 du chantier) -- jamais un appel par carte. La clé de retour est
// "type_element:id", voir core/analytique_catalogue_public.py.
export async function analytiqueCatalogueEnLot(elements: { typeElement: TypeElementCataloguePublic; id: string }[]) {
  if (elements.length === 0) return {} as Record<string, CompteursCatalogue>;
  const resultat = await appelerApi("/api/analytique-catalogue-public/lot", {
    method: "POST",
    body: JSON.stringify({ elements: elements.map((e) => ({ type_element: e.typeElement, id: e.id })) }),
  });
  return resultat as Record<string, CompteursCatalogue>;
}

// 18/09/2026, même chantier, étapes 4/8 : profil public d'un
// contributeur (bio/nom/photo), vide si la personne n'a pas activé son
// profil public -- voir GET /api/profiles/{user_id} côté backend
// (réutilise l'endpoint existant de "Mon espace", pas de nouvelle
// route). Le popup (étape 8) n'affiche que les 4 champs ci-dessous.
export type ProfilPublicContributeur = {
  user_id: string;
  nom_affiche: string;
  bio: string;
  avatar_url: string | null;
  profil_public: boolean;
};

export async function lireProfilPublicContributeur(userId: string) {
  const resultat = await appelerApi(`/api/profiles/${userId}`);
  return resultat as ProfilPublicContributeur;
}

// Commentaires sur un élément du catalogue public (étape 5/10).
export type CommentaireCatalogue = {
  id: string;
  contenu: string;
  created_at: string;
  utilisateur_id: string;
  auteur_nom: string;
  auteur_avatar_url: string | null;
};

export async function listerCommentairesCatalogue(
  typeElement: TypeElementCataloguePublic,
  elementId: string,
  decalage = 0,
  limite = 20
) {
  const resultat = await appelerApi(
    `/api/commentaires-catalogue-public/${typeElement}/${elementId}?decalage=${decalage}&limite=${limite}`
  );
  return resultat as { commentaires: CommentaireCatalogue[]; total: number };
}

export async function creerCommentaireCatalogue(
  typeElement: TypeElementCataloguePublic,
  elementId: string,
  contenu: string
) {
  const resultat = await appelerApi("/api/commentaires-catalogue-public", {
    method: "POST",
    body: JSON.stringify({ type_element: typeElement, element_id: elementId, contenu }),
  });
  return resultat as CommentaireCatalogue;
}

export async function supprimerCommentaireCatalogue(commentaireId: string) {
  return appelerApi(`/api/commentaires-catalogue-public/${commentaireId}`, { method: "DELETE" });
}

export async function listerBibliothequePublique(q?: string, filtres?: FiltresBibliothequePublique) {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());
  if (filtres?.pays?.trim()) params.set("pays", filtres.pays.trim());
  if (filtres?.niveau?.trim()) params.set("niveau", filtres.niveau.trim());
  if (filtres?.categorie?.trim()) params.set("categorie", filtres.categorie.trim());
  if (filtres?.classe?.trim()) params.set("classe", filtres.classe.trim());
  if (filtres?.specialite?.trim()) params.set("specialite", filtres.specialite.trim());
  if (filtres?.dossierId) params.set("dossier_id", filtres.dossierId);
  if (filtres?.decalage !== undefined) params.set("decalage", String(filtres.decalage));
  if (filtres?.limite !== undefined) params.set("limite", String(filtres.limite));
  const suffixe = params.toString() ? `?${params.toString()}` : "";
  const resultat = await appelerApi(`/api/bibliotheque-publique${suffixe}`);
  return resultat as EntreeBibliothequePublique[];
}

// 10/09/2026, chantier "Clovis ouvert" (demande Bourama : chaque PDF de
// la bibliothèque publique retrouvable par son nom et téléchargeable via
// un lien propre) -- détail d'une seule entrée, pour /bibliotheque/[id]
// (page publique, y compris generateMetadata côté serveur). Lance une
// ErreurApi(404) si l'entrée n'existe pas ou n'est plus publiée, voir
// GET /api/bibliotheque-publique/{entree_id} côté backend.
export async function obtenirEntreeBibliothequePublique(entreeId: string) {
  const resultat = await appelerApi(`/api/bibliotheque-publique/${entreeId}`);
  return resultat as EntreeBibliothequePublique;
}

// 11/09/2026, demande Bourama : lien de partage direct pour un fichier
// perso -- lecture seule, pour /bibliotheque/perso/[id]. Voir GET
// /api/bibliotheque/{fichier_id}/consultation côté backend.
export type FichierBibliothequeConsultation = {
  id: string;
  nom_fichier: string;
  description: string | null;
  type_mime: string | null;
  taille_octets: number | null;
  url_publique: string | null;
};

export async function obtenirFichierBibliothequeConsultation(fichierId: string) {
  const resultat = await appelerApi(`/api/bibliotheque/${fichierId}/consultation`);
  return resultat as FichierBibliothequeConsultation;
}

// 03/09/2026, demande Bourama : valeurs déjà connues de pays/niveau/
// catégorie, pour peupler les suggestions du formulaire de publication
// ET les menus des filtres de recherche -- voir GET
// /api/bibliotheque-publique/listes côté backend.
export type ListesFiltresBibliothequePublique = {
  pays: string[];
  niveaux: string[];
  categories: string[];
  // 04/09/2026, demande Bourama : 2 filtres supplémentaires, même principe.
  classes: string[];
  specialites: string[];
};

export async function listerListesFiltresBibliothequePublique() {
  return appelerApi("/api/bibliotheque-publique/listes") as Promise<ListesFiltresBibliothequePublique>;
}

export async function ajouterABibliothequePublique(
  fichier: File,
  nom?: string,
  description?: string,
  dossierId?: string,
  filtres?: FiltresPublicationBibliothequePublique,
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Connecte-toi pour envoyer un fichier.");
  }

  const corps = new FormData();
  corps.append("fichier", fichier);
  corps.append("nom", (nom || "").trim());
  corps.append("description", description || "");
  if (dossierId) corps.append("dossier_id", dossierId);
  // 15/09/2026 : plusieurs valeurs possibles par filtre, chaque
  // valeur est une entrée FormData distincte sous le même nom de champ
  // (le backend les reçoit comme une liste, voir Form(...) côté FastAPI).
  (filtres?.pays || []).forEach((v) => corps.append("pays", v));
  (filtres?.niveau || []).forEach((v) => corps.append("niveau", v));
  (filtres?.categorie || []).forEach((v) => corps.append("categorie", v));
  (filtres?.classe || []).forEach((v) => corps.append("classe", v));
  (filtres?.specialite || []).forEach((v) => corps.append("specialite", v));

  const reponse = await fetch(`${API_URL}/api/bibliotheque-publique`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: corps,
  });

  if (!reponse.ok) {
    throw await construireErreurApi(reponse, "/api/bibliotheque-publique");
  }

  return (await reponse.json()) as EntreeBibliothequePublique;
}

// 28/08/2026, demande Bourama : "le bouton + doit être comme en privé"
// -- parité texte/lien avec ajouterTexteBibliothequePersonnelle /
// ajouterLienBibliothequePersonnelle.
export async function ajouterLienBibliothequePublique(
  url: string,
  nom?: string,
  description?: string,
  dossierId?: string,
  filtres?: FiltresPublicationBibliothequePublique,
) {
  return appelerApi("/api/bibliotheque-publique/lien", {
    method: "POST",
    body: JSON.stringify({
      url,
      nom: nom || "",
      description: description || "",
      dossier_id: dossierId || "",
      pays: filtres?.pays || [],
      niveau: filtres?.niveau || [],
      categorie: filtres?.categorie || [],
      classe: filtres?.classe || [],
      specialite: filtres?.specialite || [],
    }),
  }) as Promise<EntreeBibliothequePublique>;
}

export async function ajouterTexteBibliothequePublique(
  contenu: string,
  nom?: string,
  dossierId?: string,
  filtres?: FiltresPublicationBibliothequePublique,
) {
  return appelerApi("/api/bibliotheque-publique/texte", {
    method: "POST",
    body: JSON.stringify({
      contenu,
      nom: nom || "",
      dossier_id: dossierId || "",
      pays: filtres?.pays || [],
      niveau: filtres?.niveau || [],
      categorie: filtres?.categorie || [],
      classe: filtres?.classe || [],
      specialite: filtres?.specialite || [],
    }),
  }) as Promise<EntreeBibliothequePublique>;
}

export type DossierCataloguePublic = {
  id: string;
  cree_par: string | null;
  nom: string;
  // 08/09/2026, demande Bourama : dossiers = même logique que les fichiers, description optionnelle.
  description?: string | null;
  statut: "contribution_libre" | "privee";
  dossier_parent_id: string | null;
  created_at: string;
  fichier_ids: string[];
  // 03/09/2026, demande Bourama : mêmes 3 filtres que pour un fichier.
  // 13/09/2026, demande Bourama : un dossier (uniquement -- un fichier
  // garde une seule valeur, type FiltresBibliothequePublique inchangé)
  // accepte désormais plusieurs valeurs par filtre.
  pays?: string[] | null;
  niveau?: string[] | null;
  categorie?: string[] | null;
  // 04/09/2026, demande Bourama : 2 filtres supplémentaires, même principe.
  classe?: string[] | null;
  specialite?: string[] | null;
  // 16/09/2026, demande Bourama : compte de contenu (fichiers/liens/
  // sous-dossiers), toujours présent sur obtenirDossierCataloguePublic
  // (pas sur listerDossiersCataloguePublic, voir ContenuDossierPublic
  // plus bas pour l'usage en navigation).
  contenu?: ContenuDossierPublic;
  // 13/09/2026 (suite), demande Bourama : pour chaque filtre, quelles
  // valeurs (parmi celles ci-dessus) descendent automatiquement à TOUS
  // les descendants (sous-dossiers et/ou fichiers, à n'importe quelle
  // profondeur, en plus des valeurs propres du descendant -- jamais de
  // remplacement).
  pays_heritage_sous_dossiers?: string[] | null;
  pays_heritage_fichiers?: string[] | null;
  niveau_heritage_sous_dossiers?: string[] | null;
  niveau_heritage_fichiers?: string[] | null;
  categorie_heritage_sous_dossiers?: string[] | null;
  categorie_heritage_fichiers?: string[] | null;
  classe_heritage_sous_dossiers?: string[] | null;
  classe_heritage_fichiers?: string[] | null;
  specialite_heritage_sous_dossiers?: string[] | null;
  specialite_heritage_fichiers?: string[] | null;
  // 15/09/2026, demande Bourama : les sous-dossiers ne remontaient pas
  // sur la page de consultation publique d'un dossier (/dossiers/[id]),
  // seulement ses fichiers directs. Meme forme que
  // SousDossierBibliothequeConsultation (perso), definie plus bas dans
  // ce fichier.
  sous_dossiers: SousDossierBibliothequeConsultation[];
  // 17/09/2026, demande Bourama : étoiles façon GitHub, même principe
  // que sur EntreeBibliothequePublique plus haut.
  etoiles_count?: number;
  mon_etoile?: boolean;
};

// 13/09/2026, demande Bourama : filtres d'un DOSSIER (uniquement),
// chacun avec plusieurs valeurs possibles + un réglage d'héritage par
// valeur (descend aux sous-dossiers et/ou aux fichiers) -- distinct de
// FiltresBibliothequePublique (fichiers + recherche), qui reste à une
// seule valeur par filtre, sans héritage.
export type ValeursFiltreDossier = {
  valeurs: string[];
  heritageSousDossiers: string[];
  heritageFichiers: string[];
};

export type FiltresDossierCataloguePublic = {
  pays: ValeursFiltreDossier;
  niveau: ValeursFiltreDossier;
  categorie: ValeursFiltreDossier;
  classe: ValeursFiltreDossier;
  specialite: ValeursFiltreDossier;
};

export function filtresDossierVides(): FiltresDossierCataloguePublic {
  const vide = (): ValeursFiltreDossier => ({ valeurs: [], heritageSousDossiers: [], heritageFichiers: [] });
  return { pays: vide(), niveau: vide(), categorie: vide(), classe: vide(), specialite: vide() };
}

// 13/09/2026 : reconstruit un FiltresDossierCataloguePublic à partir
// d'un DossierCataloguePublic déjà chargé (pour pré-remplir l'édition
// de ses filtres avec ses valeurs et réglages d'héritage actuels).
export function filtresDossierDepuis(d: DossierCataloguePublic): FiltresDossierCataloguePublic {
  return {
    pays: { valeurs: d.pays || [], heritageSousDossiers: d.pays_heritage_sous_dossiers || [], heritageFichiers: d.pays_heritage_fichiers || [] },
    niveau: { valeurs: d.niveau || [], heritageSousDossiers: d.niveau_heritage_sous_dossiers || [], heritageFichiers: d.niveau_heritage_fichiers || [] },
    categorie: { valeurs: d.categorie || [], heritageSousDossiers: d.categorie_heritage_sous_dossiers || [], heritageFichiers: d.categorie_heritage_fichiers || [] },
    classe: { valeurs: d.classe || [], heritageSousDossiers: d.classe_heritage_sous_dossiers || [], heritageFichiers: d.classe_heritage_fichiers || [] },
    specialite: { valeurs: d.specialite || [], heritageSousDossiers: d.specialite_heritage_sous_dossiers || [], heritageFichiers: d.specialite_heritage_fichiers || [] },
  };
}

export async function listerDossiersCataloguePublic() {
  return appelerApi("/api/bibliotheque-publique/dossiers") as Promise<DossierCataloguePublic[]>;
}

// 10/09/2026, chantier "Clovis ouvert" -- détail public d'un seul dossier
// (aucune auth requise, contrairement à listerDossiersCataloguePublic
// ci-dessus), pour /dossiers/[id] (page publique, generateMetadata côté
// serveur). Lance une ErreurApi(404) si le dossier n'existe pas, voir
// GET /api/bibliotheque-publique/dossiers/{id} côté backend.
export async function obtenirDossierCataloguePublic(dossierId: string) {
  return appelerApi(`/api/bibliotheque-publique/dossiers/${dossierId}`) as Promise<DossierCataloguePublic>;
}

// 16/09/2026, demande Bourama : "l'analytique dans l'app, combien
// d'éléments, de liens, de fichiers, de dossiers" : compte exact du
// contenu DIRECT d'un dossier (pas récursif dans ses sous-dossiers).
// Utilisée à deux endroits : obtenirDossierCataloguePublic l'inclut déjà
// (champ `contenu`) pour la page de partage ; cette fonction séparée sert
// à la bibliothèque publique en navigation (dossier actuellement ouvert),
// voir core/dossiers_catalogue_public.py::compter_contenu_dossier côté
// backend pour le détail du calcul.
export type ContenuDossierPublic = {
  nb_fichiers: number;
  nb_liens: number;
  nb_sous_dossiers: number;
  nb_elements: number;
};

export async function obtenirContenuDossierCataloguePublic(dossierId: string) {
  return appelerApi(`/api/bibliotheque-publique/dossiers/${dossierId}/contenu`) as Promise<ContenuDossierPublic>;
}

// 11/09/2026, demande Bourama : lien de partage direct pour un dossier
// perso -- lecture seule, pour /dossiers/perso/[id]. Voir GET
// /api/bibliotheque/dossiers/{dossier_id}/consultation côté backend.
export type SousDossierBibliothequeConsultation = {
  id: string;
  nom: string;
};

export type DossierBibliothequeConsultation = {
  id: string;
  nom: string;
  dossier_parent_id: string | null;
  fichiers: FichierBibliothequeConsultation[];
  sous_dossiers: SousDossierBibliothequeConsultation[];
};

export async function obtenirDossierBibliothequeConsultation(dossierId: string) {
  return appelerApi(`/api/bibliotheque/dossiers/${dossierId}/consultation`) as Promise<DossierBibliothequeConsultation>;
}

export async function creerDossierCataloguePublic(
  nom: string,
  statut: "contribution_libre" | "privee" = "contribution_libre",
  dossierParentId?: string,
  filtres?: FiltresDossierCataloguePublic,
  // 08/09/2026, demande Bourama : dossiers = même logique que les fichiers, description optionnelle.
  description?: string,
) {
  const f = filtres || filtresDossierVides();
  return appelerApi("/api/bibliotheque-publique/dossiers", {
    method: "POST",
    body: JSON.stringify({
      nom,
      description: description || "",
      statut,
      dossier_parent_id: dossierParentId || null,
      pays: f.pays.valeurs,
      niveau: f.niveau.valeurs,
      categorie: f.categorie.valeurs,
      classe: f.classe.valeurs,
      specialite: f.specialite.valeurs,
      // 13/09/2026, demande Bourama : héritage vers sous-dossiers/fichiers, par valeur.
      pays_heritage_sous_dossiers: f.pays.heritageSousDossiers,
      pays_heritage_fichiers: f.pays.heritageFichiers,
      niveau_heritage_sous_dossiers: f.niveau.heritageSousDossiers,
      niveau_heritage_fichiers: f.niveau.heritageFichiers,
      categorie_heritage_sous_dossiers: f.categorie.heritageSousDossiers,
      categorie_heritage_fichiers: f.categorie.heritageFichiers,
      classe_heritage_sous_dossiers: f.classe.heritageSousDossiers,
      classe_heritage_fichiers: f.classe.heritageFichiers,
      specialite_heritage_sous_dossiers: f.specialite.heritageSousDossiers,
      specialite_heritage_fichiers: f.specialite.heritageFichiers,
    }),
  }) as Promise<DossierCataloguePublic>;
}

export async function renommerDossierCataloguePublic(dossierId: string, nom: string) {
  return appelerApi(`/api/bibliotheque-publique/dossiers/${dossierId}`, {
    method: "PATCH",
    body: JSON.stringify({ nom }),
  });
}

// 13/09/2026, demande Bourama : les filtres d'un dossier n'étaient
// modifiables nulle part jusqu'ici -- réservé au créateur du dossier
// côté backend (même règle que renommer ci-dessus).
export async function modifierFiltresDossierCataloguePublic(dossierId: string, filtres: FiltresDossierCataloguePublic) {
  return appelerApi(`/api/bibliotheque-publique/dossiers/${dossierId}/filtres`, {
    method: "PATCH",
    body: JSON.stringify({
      pays: filtres.pays.valeurs,
      niveau: filtres.niveau.valeurs,
      categorie: filtres.categorie.valeurs,
      classe: filtres.classe.valeurs,
      specialite: filtres.specialite.valeurs,
      pays_heritage_sous_dossiers: filtres.pays.heritageSousDossiers,
      pays_heritage_fichiers: filtres.pays.heritageFichiers,
      niveau_heritage_sous_dossiers: filtres.niveau.heritageSousDossiers,
      niveau_heritage_fichiers: filtres.niveau.heritageFichiers,
      categorie_heritage_sous_dossiers: filtres.categorie.heritageSousDossiers,
      categorie_heritage_fichiers: filtres.categorie.heritageFichiers,
      classe_heritage_sous_dossiers: filtres.classe.heritageSousDossiers,
      classe_heritage_fichiers: filtres.classe.heritageFichiers,
      specialite_heritage_sous_dossiers: filtres.specialite.heritageSousDossiers,
      specialite_heritage_fichiers: filtres.specialite.heritageFichiers,
    }),
  }) as Promise<DossierCataloguePublic>;
}

// 09/09/2026, demande Bourama ("confirmation contributeurs") : pour un
// sous-dossier à contribution libre (dossier_parent_id non nul) qu'on
// n'a pas créé, supprimer/déplacer ne s'exécute plus tout de suite --
// le backend renvoie la demande créée (202, bloquée) au lieu de null
// (204, exécuté). Le dossier racine, lui, reste immédiat pour son
// créateur (comportement inchangé).
export type DemandeDossierCataloguePublic = {
  id: string;
  action: "deplacer_fichier" | "supprimer_fichier" | "deplacer_dossier" | "supprimer_dossier";
  fichier_id: string | null;
  dossier_id: string;
  dossier_destination_id: string | null;
  demandeur_id: string;
  createur_id: string;
  statut: "en_attente" | "confirmee" | "refusee";
  created_at: string;
  traite_at: string | null;
};

export async function supprimerDossierCataloguePublic(dossierId: string) {
  return appelerApi(`/api/bibliotheque-publique/dossiers/${dossierId}`, { method: "DELETE" }) as Promise<
    DemandeDossierCataloguePublic | null
  >;
}

export async function deplacerDossierCataloguePublic(dossierId: string, dossierDestinationId: string | null) {
  return appelerApi(`/api/bibliotheque-publique/dossiers/${dossierId}/deplacer`, {
    method: "POST",
    body: JSON.stringify({ dossier_destination_id: dossierDestinationId }),
  }) as Promise<DemandeDossierCataloguePublic | { id: string; dossier_parent_id: string | null }>;
}

export async function listerDemandesEnAttenteCataloguePublic() {
  return appelerApi("/api/bibliotheque-publique/dossiers/demandes") as Promise<DemandeDossierCataloguePublic[]>;
}

export async function confirmerDemandeCataloguePublic(demandeId: string) {
  return appelerApi(`/api/bibliotheque-publique/dossiers/demandes/${demandeId}/confirmer`, { method: "POST" });
}

export async function refuserDemandeCataloguePublic(demandeId: string) {
  return appelerApi(`/api/bibliotheque-publique/dossiers/demandes/${demandeId}/refuser`, { method: "POST" });
}

// Attachement d'un dossier du catalogue public à la bibliothèque perso
// (02/09/2026, demande Bourama -- backend déjà en place depuis cette
// date, core/dossiers_publics_attaches.py, mais jamais relié à aucun
// bouton côté écran jusqu'ici -- oubli identifié le 08/09/2026).
// Copie réelle + synchronisation continue : tout nouveau fichier rangé
// dans le dossier public d'origine par n'importe qui apparaît
// automatiquement dans le dossier miroir de la bibliothèque perso.
export type DossierPublicAttache = DossierCataloguePublic & { dossier_bibliotheque_id: string | null };

export async function listerDossiersPublicsAttaches() {
  return appelerApi("/api/bibliotheque-publique/dossiers/attaches") as Promise<DossierPublicAttache[]>;
}

export async function attacherDossierPublic(dossierId: string) {
  return appelerApi(`/api/bibliotheque-publique/dossiers/${dossierId}/attacher`, { method: "POST" }) as Promise<DossierPublicAttache>;
}

export async function detacherDossierPublic(dossierId: string) {
  return appelerApi(`/api/bibliotheque-publique/dossiers/${dossierId}/attacher`, { method: "DELETE" });
}

export async function rangerFichierDossierCataloguePublic(dossierId: string, fichierId: string) {
  return appelerApi(`/api/bibliotheque-publique/dossiers/${dossierId}/fichiers`, {
    method: "POST",
    body: JSON.stringify({ fichier_id: fichierId }),
  });
}

// 15/09/2026, demande Bourama (fichier attaché à plusieurs dossiers) :
// tous les dossiers dans lesquels ce fichier est déjà rangé, pour
// pré-cocher la liste à cocher (voir GererDossiersFichierModal.tsx).
export async function listerDossiersDuFichierCataloguePublic(fichierId: string) {
  const resultat = (await appelerApi(`/api/bibliotheque-publique/dossiers/fichiers/${fichierId}`)) as { dossier_ids: string[] };
  return resultat.dossier_ids;
}

export async function retirerFichierDossierCataloguePublic(dossierId: string, fichierId: string) {
  return appelerApi(`/api/bibliotheque-publique/dossiers/${dossierId}/fichiers/${fichierId}`, {
    method: "DELETE",
  }) as Promise<DemandeDossierCataloguePublic | null>;
}

export async function deplacerFichierDossierCataloguePublic(dossierId: string, fichierId: string, dossierDestinationId: string) {
  return appelerApi(`/api/bibliotheque-publique/dossiers/${dossierId}/fichiers/${fichierId}/deplacer`, {
    method: "POST",
    body: JSON.stringify({ dossier_destination_id: dossierDestinationId }),
  }) as Promise<DemandeDossierCataloguePublic | { fichier_id: string; dossier_id: string }>;
}

export async function supprimerDeBibliothequePublique(entreeId: string) {
  return appelerApi(`/api/bibliotheque-publique/${entreeId}`, { method: "DELETE" });
}

// 15/09/2026, demande Bourama : les filtres d'un fichier/lien/texte
// déjà publié peuvent désormais être modifiés (réservé au
// contributeur d'origine), même principe que PATCH
// /dossiers/{dossier_id}/filtres côté dossier. Remplace toujours
// entièrement chaque filtre par la liste fournie.
export async function modifierFiltresFichierBibliothequePublique(entreeId: string, filtres: FiltresPublicationBibliothequePublique) {
  return appelerApi(`/api/bibliotheque-publique/${entreeId}/filtres`, {
    method: "PATCH",
    body: JSON.stringify({
      pays: filtres.pays || [],
      niveau: filtres.niveau || [],
      categorie: filtres.categorie || [],
      classe: filtres.classe || [],
      specialite: filtres.specialite || [],
    }),
  }) as Promise<EntreeBibliothequePublique>;
}

/** Pendant de reessayerVectorisationBibliothequePersonnelle ci-dessus, pour la bibliothèque publique. */
export async function reessayerVectorisationBibliothequePublique(entreeId: string) {
  return appelerApi(`/api/bibliotheque-publique/${entreeId}/reessayer-vectorisation`, { method: "POST" });
}

/**
 * Upload de PLUSIEURS fichiers d'un coup vers la bibliothèque publique
 * (28/08/2026, demande Bourama). Même pattern que
 * ajouterFichiersBibliothequePersonnelle : boucle séquentielle, pas
 * d'endpoint bulk dédié côté backend. Chaque fichier reçoit son nom
 * (sans extension) comme nom de document, sans description -- voir
 * BibliothequePublique.tsx pour la raison (choix de Bourama : dans ce
 * cas précis, pas de description). Si un fichier échoue, les autres
 * continuent quand même ; l'appelant reçoit la liste des erreurs (vide
 * si tout est passé) pour les afficher.
 *
 * CORRECTIF 12/09/2026 (bug remonté par Bourama) : contrairement au cas
 * fichier unique juste au-dessus, cette fonction ne recevait jamais
 * dossierId -- un upload multiple depuis l'intérieur d'un dossier
 * finissait donc toujours "libre" dans le catalogue général, jamais
 * rangé dans le dossier ouvert. Voir aussi BibliothequePublique.tsx.
 */
export async function ajouterFichiersABibliothequePublique(
  fichiers: File[],
  onProgres?: (envoyes: number, total: number) => void,
  dossierId?: string,
) {
  const erreurs: { nom: string; erreur: string }[] = [];
  const idsAVectoriser: string[] = [];
  for (const [index, fichier] of fichiers.entries()) {
    const nomAuto = fichier.name.replace(/\.[^/.]+$/, "");
    try {
      const ligne = await ajouterABibliothequePublique(fichier, nomAuto, "", dossierId);
      if (ligne?.statut_vectorisation === "en_attente" && ligne.id) idsAVectoriser.push(ligne.id);
    } catch (e) {
      erreurs.push({ nom: fichier.name, erreur: messageErreur(e) });
    }
    onProgres?.(index + 1, fichiers.length);
  }
  return { erreurs, idsAVectoriser };
}

// Copie un fichier de la bibliothèque publique vers la bibliothèque
// personnelle de l'utilisateur connecté (25/08, demande Bourama).
// appelerApi lève déjà une ErreurApi (statusCode 401) si pas connecté --
// même pattern de gestion que ajouterABibliothequePublique.
export async function copierVersBibliothequePersonnelle(entreeId: string) {
  return appelerApi(`/api/bibliotheque/copier-depuis-publique/${entreeId}`, { method: "POST" });
}

// 13/09/2026, demande Bourama : dans le chat, une carte fichier
// (components/chat/FichierChip.tsx) ne reçoit qu'un lien -- cette fonction
// retrouve l'entrée de bibliothèque publique correspondante (id) à partir
// de cette URL, pour proposer "Ajouter à ma bibliothèque" en plus du
// téléchargement réel. Renvoie null (pas d'erreur) si l'URL ne correspond
// à aucune entrée publiée, cas normal la plupart du temps (fichier généré
// par l'IA, pas issu de la bibliothèque) -- voir lib/useEntreePubliqueParUrl.ts.
export async function entreePubliqueParUrl(url: string): Promise<{ id: string } | null> {
  try {
    return (await appelerApi(`/api/bibliotheque-publique/par-url?url=${encodeURIComponent(url)}`)) as { id: string };
  } catch (e) {
    if (e instanceof ErreurApi && e.statusCode === 404) return null;
    throw e;
  }
}

/**
 * Upload de PLUSIEURS fichiers d'un coup vers la bibliothèque personnelle
 * (2026-08-01, demande Bourama : "plusieurs upload à la fois") -- simple
 * boucle séquentielle sur ajouterFichierBibliothequePersonnelle (pas de
 * endpoint bulk dédié côté backend, inutile pour ce volume). Si un
 * fichier échoue, les autres continuent quand même ; l'appelant reçoit
 * la liste des erreurs (vide si tout est passé) pour les afficher.
 */
export async function ajouterFichiersBibliothequePersonnelle(fichiers: File[]) {
  const erreurs: { nom: string; erreur: string }[] = [];
  for (const fichier of fichiers) {
    try {
      await ajouterFichierBibliothequePersonnelle(fichier, "", "");
    } catch (e) {
      erreurs.push({ nom: fichier.name, erreur: messageErreur(e) });
    }
  }
  return erreurs;
}

/**
 * Upload d'une image jointe à un message de chat -- voir
 * components/chat/ChatIA.tsx:envoyerMessage côté appelant. Réutilise
 * appelerApiFichier (même mécanique FormData) sur le nouvel endpoint dédié
 * au chat. Renvoie l'URL publique à passer dans `image_url` du payload
 * /api/chat.
 */
export async function uploaderImageChat(fichier: File) {
  const resultat = await appelerApiFichier("/api/uploads/image-chat", fichier);
  return resultat.url as string;
}

/**
 * Extraction texte d'un document (PDF/Word/Excel) joint à un message de
 * chat -- voir api/uploads.py:uploader_document_chat. Le fichier original
 * est stocké (url) et, pour Word/Excel, converti en PDF pour aperçu
 * visuel (url_apercu, peut être null si CloudConvert indisponible/pas
 * configuré -- voir core/conversion_pdf.py côté backend). Le texte extrait
 * est injecté directement dans le message avant envoi à /api/chat.
 */
export async function uploaderDocumentChat(fichier: File) {
  const resultat = await appelerApiFichier("/api/uploads/document-chat", fichier);
  return resultat as { texte: string; tronque: boolean; url: string | null; url_apercu: string | null };
}

/**
 * Transcription d'un enregistrement audio (dictée vocale) via
 * api/uploads.py:uploader_audio_chat (Whisper/Groq). Le fichier est un
 * Blob MediaRecorder emballé en File côté BarreDeSaisie.tsx.
 */
export async function transcrireAudioChat(fichier: File) {
  const resultat = await appelerApiFichier("/api/uploads/audio-chat", fichier);
  return resultat as { texte: string; url: string | null };
}

/**
 * Traitement d'une vidéo jointe à un message de chat -- voir
 * api/uploads.py:uploader_video_chat (extraction audio via Whisper +
 * frames via ffmpeg, analysées ensuite par Gemini). Depuis le
 * 2026-07-22, la vidéo originale est aussi gardée dans la bibliothèque
 * (niveau utilisateur), pas seulement traitée puis jetée.
 */
export async function uploaderVideoChat(fichier: File) {
  const resultat = await appelerApiFichier("/api/uploads/video-chat", fichier);
  return resultat as { transcript: string; frames_base64: string[]; url: string | null };
}

/**
 * OCR ciblé formule (2026-07-26, priorité maths de Bourama) -- voir
 * api/uploads.py:extraire_formule. Contrairement à uploaderImageChat,
 * cette image ne rejoint jamais la conversation : elle sert uniquement
 * à extraire le LaTeX, ouvert ensuite dans EditeurFormule.tsx (éditable
 * avant insertion). Lève une erreur si aucune formule n'est détectée
 * (422 côté backend).
 */
export async function extraireFormuleImage(fichier: File) {
  const resultat = await appelerApiFichier("/api/uploads/extraire-formule", fichier);
  return resultat.latex as string;
}

/**
 * Registre d'affichage des outils (nom, label, icône, onglet, appli) --
 * voir api/outils_registre.py côté backend, source unique pour éviter
 * d'avoir à toucher ce dépôt à chaque nouvel outil (2026-08-15, demande
 * Bourama). Pas d'authentification requise (accessible avant connexion).
 */
export async function lireRegistreOutils() {
  return appelerApi(`/api/outils/registre`);
}

export async function lireDroitsAgent(agentId: string) {
  return appelerApi(`/api/agents/${agentId}/droits`);
}

export async function modifierDroitsAgent(
  agentId: string,
  payload: {
    outils_generation: string[];
    serveurs: string[];
    actions_locales: string[];
    informer_utilisateurs: boolean;
  }
) {
  return appelerApi(`/api/agents/${agentId}/droits`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/**
 * Outils/actions locales réellement actifs pour CET agent, côté chat --
 * endpoint public (pas besoin d'être le créateur), sert à filtrer les
 * boutons de BarreDeSaisie.tsx pour que ce que le créateur n'a pas coché
 * n'apparaisse jamais dans le chat. `outils` réutilise directement
 * lister_outils_autorises_pour_agent côté backend (même fonction que la
 * vraie requête envoyée à Groq) -- inclut donc déjà les noms d'outils
 * dérivés d'un serveur (ex. tavily_search, explorer_depot_github).
 * `actions_locales` couvre les boutons UI (préfixe "ui_") qui ne sont pas
 * des outils LLM et donc invisibles à cette fonction.
 */
export async function lireOutilsChatAgent(agentId: string) {
  return appelerApi(`/api/agents/${agentId}/outils-disponibles`) as Promise<{
    outils: string[];
    actions_locales: string[];
  }>;
}

/**
 * Statut de connexion OAuth à un service externe (ex. "github") via le
 * moteur générique -- voir connexions/oauth_generique.py côté backend.
 */
export async function statutConnexion(service: string) {
  const resultat = await appelerApi(`/api/connexions/${service}/statut`);
  return resultat as { connecte: boolean };
}

/**
 * CORRECTION (2026-07-30) : obtenirOutilsDisponibles() faisait double
 * emploi avec lireOutilsChatAgent() ci-dessus -- même endpoint, mais
 * lireOutilsChatAgent() couvre en plus les actions locales (catégorie 4,
 * boutons UI type localisation/LaTeX/dessin, ajoutées le même jour).
 * Fusionné en une seule fonction pour ne pas avoir deux sources
 * divergentes du même appel réseau.
 */

/**
 * Démarre une connexion OAuth : renvoie l'URL d'autorisation à ouvrir
 * (redirection complète, pas de popup) -- voir app/oauth/retour/page.tsx
 * pour la page qui traite le retour.
 *
 * CORRECTION (2026-07-31) : le backend renvoyait avant un statut 200 avec
 * `{url: null, erreur: "..."}` en cas d'échec (voir api/connexions.py) --
 * incohérent avec le reste de l'API et invisible pour tout code qui ne
 * pense pas à lire ce champ précis. Il lève maintenant une vraie erreur
 * (voir erreur_api() côté backend) : à catcher avec messageErreur(e),
 * comme n'importe quel autre appel API.
 */
export async function demarrerConnexion(service: string, agentId?: string) {
  const chemin = agentId
    ? `/api/connexions/${service}/demarrer?agent_id=${encodeURIComponent(agentId)}`
    : `/api/connexions/${service}/demarrer`;
  const resultat = await appelerApi(chemin);
  return resultat as { url: string };
}

/**
 * Liste les dépôts GitHub (publics et privés) de la personne connectée --
 * voir api/connexions.py:depots_github, utilisé par le sélecteur de dépôt
 * dans BarreDeSaisie.tsx. Voir demarrerConnexion ci-dessus pour la même
 * correction (vraie erreur levée plutôt que champ `erreur` dans le corps).
 */
export async function depotsGithub() {
  const resultat = await appelerApi("/api/connexions/github/depots");
  return resultat as {
    depots: { nom_complet: string; prive: boolean; description: string | null; url: string }[];
  };
}

/**
 * Cherche des pages/bases Notion visibles par la personne connectée --
 * voir api/connexions.py:pages_notion, utilisé par le sélecteur de page
 * dans BarreDeSaisie.tsx. Même correction (2026-07-31) que depotsGithub
 * ci-dessus : une vraie erreur est levée en cas d'échec.
 *
 * CORRECTION (01/08) : contrairement à depotsGithub (listing complet),
 * ceci passe désormais par l'outil MCP notion-search côté backend, qui
 * exige un texte de recherche -- sans `q`, le backend renvoie une liste
 * vide plutôt qu'un listing complet (impossible avec cet outil).
 */
export async function pagesNotion(q: string) {
  const resultat = await appelerApi(`/api/connexions/notion/pages?q=${encodeURIComponent(q)}`);
  return resultat as {
    pages: { titre: string; type: "page" | "database"; url: string }[];
  };
}

/**
 * Interroge le contenu d'une base Notion (02/08, demande Bourama : "on va
 * ajouter" query-data-sources/query-database-view) -- `url` est l'URL de la
 * base choisie dans le sélecteur (résultat de pagesNotion, type
 * "database"), `q` le texte tapé sur le 2e écran de requête. Voir
 * api/connexions.py:lignes_base_notion pour le detail (fetch de la base ->
 * data source URL -> SQL, filtre par `q` fait côté backend en Python, pas
 * une vraie clause SQL dynamique).
 */
export async function lignesBaseNotion(url: string, q: string) {
  const resultat = await appelerApi(
    `/api/connexions/notion/bases/lignes?url=${encodeURIComponent(url)}&q=${encodeURIComponent(q)}`
  );
  return resultat as {
    lignes: { titre: string; url: string | null; proprietes: Record<string, unknown> }[];
  };
}

/**
 * Crée une page Notion standalone (02/08, demande Bourama : titre + zone de
 * texte pour le contenu, pas de choix de parent dans cette itération). Voir
 * api/connexions.py:creer_page_notion -- appel MCP direct, pas de passage
 * par la confirmation OUTILS_SENSIBLES (le clic "Créer" du formulaire en
 * tient lieu).
 */
export async function creerPageNotion(titre: string, contenu: string) {
  const resultat = await appelerApi(`/api/connexions/notion/pages`, {
    method: "POST",
    body: JSON.stringify({ titre, contenu }),
  });
  return resultat as { url: string };
}

/**
 * Contenu dynamique par matière -- agent "Clovis" (06/08/2026, demande
 * Bourama). Voir djiguigne-backend/api/contenu_dynamique_matiere.py.
 * "Enseignant" et "étudiant" ici ne sont pas des rôles de compte : ce
 * sont juste les deux rôles qu'on joue sur CET agent précis en écrivant
 * du contenu ou en entrant un code -- n'importe quel compte connecté
 * peut faire les deux. Fonctions ci-dessous ajoutées le 09/08 (le bloc
 * repris tel quel de djiguigne-frontend au bootstrap du projet n'avait
 * jamais été câblé nulle part, retiré) -- toujours agent_id="clovis"
 * en dur, Clovis n'ayant qu'une seule IA (contrairement à
 * djiguigne-frontend, générique sur plusieurs agents).
 */

// Section "Mes comportements" (06/08/2026, demande Bourama : "on peut en
// mettre plusieurs hein, pas juste un") : plusieurs instructions perso
// écrites par l'étudiant, chacune ajoutée EN PLUS du system_prompt déjà
// résolu (voir core/main.py::_construire_system_prompt côté backend).
//
// NOTE (21/08/2026, demande Bourama) : le mot affiché à l'utilisateur
// est désormais "skill" ("plus connu, plus simple à expliquer et à
// reconnaître") -- mais UNIQUEMENT le texte visible. En interne (ce
// type, les fonctions ci-dessous, les routes /api/.../mes-comportements,
// les tables Supabase, les outils MCP) tout reste nommé "comportement".
// Ne pas renommer les identifiants techniques à partir de cette demande.
export type Comportement = {
  id: string;
  texte: string;
  description: string;
  nom: string;
  lien_type: string | null;
  lien_id: string | null;
  lien_libelle: string | null;
  actif: boolean;
  depuis_public: boolean;
};

export async function lireMesComportements(agentId: string) {
  const resultat = await appelerApi(`/api/agents/${agentId}/mes-comportements`);
  return resultat as Comportement[];
}

// 21/08/2026, demande Bourama : "ajoute activer et désactiver aux
// comportements" -- désactiver n'efface rien, voir le backend.
export async function activerDesactiverComportement(agentId: string, comportementId: string, actif: boolean) {
  const resultat = await appelerApi(`/api/agents/${agentId}/mes-comportements/${comportementId}/actif`, {
    method: "PATCH",
    body: JSON.stringify({ actif }),
  });
  return resultat as Comportement;
}

// 21/08/2026, demande Bourama : "je veux un onglet public... quelqu'un
// peut l'uploader et l'activer". Publier prend une copie figée du
// comportement (l'original ici n'est jamais modifié).
export async function publierComportement(agentId: string, comportementId: string) {
  return appelerApi(`/api/agents/${agentId}/mes-comportements/${comportementId}/publier`, { method: "POST" });
}

// 11/09/2026, demande Bourama : lien de partage direct pour un skill
// perso -- lecture seule, pour /skills/perso/[id]. Voir GET
// /api/agents/{agent_id}/mes-comportements/{comportement_id}/consultation
// côté backend.
export type ComportementConsultation = {
  nom: string;
  description: string;
  skill_md: string;
};

export async function obtenirComportementConsultation(agentId: string, comportementId: string) {
  const resultat = await appelerApi(`/api/agents/${agentId}/mes-comportements/${comportementId}/consultation`);
  return resultat as ComportementConsultation;
}

export type ComportementPublic = {
  id: string;
  nom: string;
  description: string;
  texte: string;
  skill_md: string;
  activations_count: number;
  est_a_moi: boolean;
  // 17/09/2026, demande Bourama : étoiles façon GitHub, même principe
  // que sur EntreeBibliothequePublique/DossierCataloguePublic.
  etoiles_count?: number;
  mon_etoile?: boolean;
};

export async function rechercherComportementsPublics(q?: string) {
  const suffixe = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
  const resultat = await appelerApi(`/api/comportements-publics${suffixe}`);
  return resultat as ComportementPublic[];
}

// 10/09/2026, chantier "Clovis ouvert" -- détail d'un seul skill public,
// pour /skills/[id] (page publique, generateMetadata côté serveur).
// Lance une ErreurApi(404) si le skill n'existe pas ou a été retiré par
// son auteur, voir GET /api/comportements-publics/{id} côté backend.
export async function obtenirComportementPublic(comportementPublicId: string) {
  const resultat = await appelerApi(`/api/comportements-publics/${comportementPublicId}`);
  return resultat as ComportementPublic;
}

export async function activerComportementPublic(comportementPublicId: string) {
  const resultat = await appelerApi(`/api/comportements-publics/${comportementPublicId}/activer`, { method: "POST" });
  return resultat as Comportement;
}

// 25/08/2026, demande Bourama : uploader directement un fichier .md dans
// le catalogue public, publié immédiatement pour tout le monde (pas de
// passage par "Mes comportements"). Même pattern fetch manuel que
// ajouterABibliothequePublique (appelerApi force le JSON, inadapté à un
// FormData).
export async function uploaderSkillPublic(fichier: File, nom: string, description?: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Connecte-toi pour envoyer un skill.");
  }

  const corps = new FormData();
  corps.append("fichier", fichier);
  corps.append("nom", nom.trim());
  corps.append("description", description || "");

  const reponse = await fetch(`${API_URL}/api/comportements-publics/uploader`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: corps,
  });

  if (!reponse.ok) {
    throw await construireErreurApi(reponse, "/api/comportements-publics/uploader");
  }

  return (await reponse.json()) as ComportementPublic;
}

// 07/09/2026, demande Bourama : l'auteur d'un skill public peut le
// retirer du catalogue (n'existait pas avant). Retrait doux côté
// backend (statut='retire'), pas une suppression -- voir
// core/comportements_etudiants.py::retirer_skill_public.
export async function retirerSkillPublic(comportementPublicId: string) {
  return appelerApi(`/api/comportements-publics/${comportementPublicId}/retirer`, { method: "POST" });
}

// nom = null/undefined -> mode "auto" (nom généré côté serveur avec le
// skill) ; sinon nom choisi par l'étudiant, gardé tel quel. lienType/
// lienId optionnels (20/08) : rattache dès la création à un emplacement
// du programme.
export async function ajouterComportement(
  agentId: string,
  texte: string,
  nom?: string | null,
  lienType?: string | null,
  lienId?: string | null
) {
  const resultat = await appelerApi(`/api/agents/${agentId}/mes-comportements`, {
    method: "POST",
    body: JSON.stringify({ texte, nom: nom || null, lien_type: lienType || null, lien_id: lienId || null }),
  });
  return resultat as Comportement;
}

// 25/08/2026, demande Bourama : uploader un fichier .md directement dans
// "Mes comportements", gardé TEL QUEL (pas de passage par l'IA -- voir
// importer_comportement_depuis_skill_md côté backend). Même pattern
// fetch manuel que uploaderSkillPublic ci-dessus.
export async function importerComportementDepuisFichier(agentId: string, fichier: File, nom: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Connecte-toi pour importer un skill.");
  }

  const corps = new FormData();
  corps.append("fichier", fichier);
  corps.append("nom", nom.trim());

  const reponse = await fetch(`${API_URL}/api/agents/${agentId}/mes-comportements/importer`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: corps,
  });

  if (!reponse.ok) {
    throw await construireErreurApi(reponse, `/api/agents/${agentId}/mes-comportements/importer`);
  }

  return (await reponse.json()) as Comportement;
}

// Attache (lienType+lienId fournis) ou détache (les deux null) un
// comportement DÉJÀ EXISTANT -- séparé de modifierComportement exprès,
// un seul emplacement à la fois (20/08/2026, demande Bourama).
export async function attacherComportement(agentId: string, comportementId: string, lienType: string | null, lienId: string | null) {
  const resultat = await appelerApi(`/api/agents/${agentId}/mes-comportements/${comportementId}/lien`, {
    method: "PATCH",
    body: JSON.stringify({ lien_type: lienType, lien_id: lienId }),
  });
  return resultat as Comportement;
}

export async function modifierComportement(agentId: string, comportementId: string, texte: string, nom?: string | null) {
  const resultat = await appelerApi(`/api/agents/${agentId}/mes-comportements/${comportementId}`, {
    method: "PATCH",
    body: JSON.stringify({ texte, nom: nom || null }),
  });
  return resultat as Comportement;
}

// 18/08/2026, demande Bourama ("les deux : édite le texte, l'impacte,
// ou tu peux l'éditer directement") : édition DIRECTE du skill généré
// (frontmatter + corps), lue/écrite à la demande (onglet dédié), sans
// passer par le texte brut. Éditer le texte régénère toujours le skill
// (via modifierComportement ci-dessus) -- ces deux chemins coexistent,
// le second écrasant le premier s'ils sont utilisés l'un après l'autre.
export async function lireSkillComportement(agentId: string, comportementId: string) {
  const resultat = await appelerApi(`/api/agents/${agentId}/mes-comportements/${comportementId}/skill`);
  return (resultat as { skill_md: string }).skill_md;
}

export async function modifierSkillComportement(agentId: string, comportementId: string, skillMd: string) {
  const resultat = await appelerApi(`/api/agents/${agentId}/mes-comportements/${comportementId}/skill`, {
    method: "PATCH",
    body: JSON.stringify({ skill_md: skillMd }),
  });
  return resultat as Comportement;
}

export async function supprimerComportement(agentId: string, comportementId: string) {
  return appelerApi(`/api/agents/${agentId}/mes-comportements/${comportementId}`, { method: "DELETE" });
}

// Utilisée par EspaceClovis.tsx pour savoir si l'onglet "Mes
// comportements" doit s'afficher -- agentId toujours "clovis" ici (plus
// de rôle, voir EspaceClovis.tsx), mais la fonction reste générique.
// Endpoint public (GET /api/agents/{id}), pas besoin d'appelerApi/auth.
// Renvoie false silencieusement si l'agent n'existe pas ou en cas
// d'erreur réseau, pour ne jamais faire planter Mon espace.
export async function sectionComportementsActivee(agentId: string): Promise<boolean> {
  try {
    const reponse = await fetch(`${API_URL}/api/agents/${agentId}`);
    if (!reponse.ok) return false;
    const data = await reponse.json();
    return !!data.section_mes_comportements;
  } catch {
    return false;
  }
}

/** Voir api/profiles.py:mettre_a_jour_mon_profil -- endpoint générique
 * partagé (upsert), utilisé ici juste pour enregistrer le nom saisi à
 * l'inscription, sans aucun rôle (09/08, remplace l'ancien
 * creerEtudiantAutonome qui écrivait aussi role="etudiant"). */
export async function mettreAJourMonProfil(nomAffiche: string) {
  return appelerApi("/api/profiles/me", {
    method: "PATCH",
    body: JSON.stringify({ nom_affiche: nomAffiche }),
  });
}

// --- Page Paramètres (22/08/2026, demande Bourama) -------------------------
//
// Réutilise entièrement les endpoints déjà en place côté backend
// (api/profiles.py) : rien de nouveau à créer côté FastAPI. Le mot de
// passe n'est PAS géré ici (voir lib/supabase.ts : "le backend FastAPI ne
// gère jamais de mot de passe", supabase.auth.updateUser() appelé
// directement depuis EspaceParametres.tsx).

/** GET /api/profiles/{user_id} avec l'id de la session en cours -- pas de
 * endpoint "GET /me" dédié côté backend, voir api/profiles.py. */
export async function lireMonProfil() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    throw new ErreurApi(401, "Connecte-toi pour voir ton profil.", "SESSION_EXPIREE");
  }
  return appelerApi(`/api/profiles/${session.user.id}`);
}

/** PATCH partiel générique (voir MettreAJourProfilPayload côté backend) --
 * distincte de mettreAJourMonProfil(nomAffiche) ci-dessus pour ne pas
 * changer sa signature existante (utilisée telle quelle à l'inscription). */
export async function enregistrerMonProfil(payload: {
  nom_affiche?: string;
  bio?: string;
  avatar_url?: string;
  notifications_proactives_actives?: boolean;
  est_majeur?: boolean;
  popup_chat_x?: number;
  popup_chat_y?: number;
  popup_chat_largeur?: number;
  popup_chat_hauteur?: number;
}) {
  return appelerApi("/api/profiles/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/** GET /api/profiles/moi/statut -- voir MonStatutReponse côté backend.
 * est_majeur : null si jamais renseigné (traité comme majeur, voir
 * core/restriction_mineur.py), boolean sinon. */
export async function obtenirMonStatut() {
  return appelerApi("/api/profiles/moi/statut") as Promise<{
    est_createur: boolean;
    est_majeur: boolean | null;
  }>;
}

/** DELETE /api/profiles/me -- voir api/profiles.py:supprimer_mon_compte
 * pour la purge complète (agents, posts, follows, profil, compte Auth). */
export async function supprimerMonCompte() {
  return appelerApi("/api/profiles/me", { method: "DELETE" });
}

/** GET /api/profiles/me/export -- voir api/profiles.py:exporter_mes_donnees.
 * Contrairement à appelerApi (qui retourne le JSON parsé pour l'utiliser
 * en mémoire), déclenche un vrai téléchargement de fichier dans le
 * navigateur : on récupère le JSON nous-mêmes puis on construit un blob
 * + un lien <a download> temporaire (fetch() seul ne fait jamais
 * apparaître la boîte de dialogue "Enregistrer sous" du navigateur,
 * même avec l'en-tête Content-Disposition renvoyé par le backend). */
export async function exporterMesDonnees() {
  const donnees = await appelerApi("/api/profiles/me/export");
  const blob = new Blob([JSON.stringify(donnees, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = `clovis_mes_donnees_${donnees.user_id ?? "export"}.json`;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  URL.revokeObjectURL(url);
}

// --- Codes de partage (14/08/2026, remplace le système matière ci-dessus,
// qui n'était de toute façon jamais lu par le chat -- voir
// core/codes_partage.py côté backend) --------------------------------------
//
// Un code peut porter, chacun optionnel et combinable : des comportements
// (18/08/2026 : sélection parmi "Mes comportements", référence vivante --
// plus un texte tapé ici, voir MesCodes.tsx), un ou plusieurs dossiers de
// bibliothèque partagés (02/09/2026, remplace partage_bibliotheque tout
// ou rien -- copie automatique à chaque ajout, sous-dossiers inclus), un
// texte libre. Vivant : modifier le code (ou un comportement/dossier
// référencé) met à jour ce que voient tous ses receveurs, pas besoin
// d'un nouveau code.

export type ComportementLie = { id: string; nom: string };
export type DossierLie = { id: string; nom: string };

export type CodePartage = {
  id: string;
  code: string;
  nom: string | null;
  comportements: ComportementLie[];
  dossiers: DossierLie[];
  texte_libre: string | null;
  actif: boolean;
  created_at: string;
  updated_at: string;
};

export type CodePartagePayload = {
  nom?: string | null;
  comportement_ids?: string[];
  dossier_ids?: string[];
  texte_libre?: string | null;
};

export async function listerMesCodes() {
  return appelerApi("/api/codes") as Promise<CodePartage[]>;
}

export async function creerCode(payload: CodePartagePayload) {
  return appelerApi("/api/codes", { method: "POST", body: JSON.stringify(payload) }) as Promise<CodePartage>;
}

export async function modifierCode(codeId: string, payload: CodePartagePayload) {
  return appelerApi(`/api/codes/${codeId}`, { method: "PATCH", body: JSON.stringify(payload) }) as Promise<CodePartage>;
}

export async function activerCode(codeId: string, actif: boolean) {
  return appelerApi(`/api/codes/${codeId}/actif`, { method: "POST", body: JSON.stringify({ actif }) }) as Promise<CodePartage>;
}

export async function supprimerCode(codeId: string) {
  return appelerApi(`/api/codes/${codeId}`, { method: "DELETE" });
}

export type RattachementCode = {
  rattachement_id: string;
  code_id: string;
  code: string;
  nom_code: string | null;
  proprietaire_id: string;
  proprietaire_nom: string;
  a_comportement: boolean;
  comportements: ComportementLie[];
  a_dossier: boolean;
  dossiers: DossierLie[];
  texte_libre: string | null;
};

/** Ce que J'AI reçu en entrant des codes d'autres utilisateurs. */
export async function listerMesRattachementsCodes() {
  return appelerApi("/api/rattachements-codes") as Promise<RattachementCode[]>;
}

/** Entre un code à 6 caractères -- reçoit tout ce que ce code porte. */
export async function entrerCodePartage(code: string) {
  return appelerApi("/api/rattachements-codes", {
    method: "POST",
    body: JSON.stringify({ code }),
  }) as Promise<{ id: string; code_id: string }>;
}

export async function retirerRattachementCode(rattachementId: string) {
  return appelerApi(`/api/rattachements-codes/${rattachementId}`, { method: "DELETE" });
}

/** 07/09/2026, demande Bourama : lecture seule du contenu d'un skill reçu
 * via un code (avant, seul le LLM pouvait le consulter). */
export async function voirSkillRecu(comportementId: string) {
  return appelerApi(`/api/rattachements-codes/comportements/${comportementId}/skill`) as Promise<{ skill_md: string }>;
}

// --- Mode actif par conversation (Partie 6, 06/09/2026, demande Bourama --
// voir Point 3 : un utilisateur peut avoir plusieurs codes rattachés en
// même temps, ce mécanisme retient lequel s'applique à la conversation
// en cours, voir api/mode_actif_conversation.py) ---------------------------

export async function obtenirModeActif(conversationId: string) {
  return appelerApi(`/api/conversations/${conversationId}/mode-actif`) as Promise<{
    rattachement_id: string | null;
    verrouille: boolean;
    // true si un choix explicite existe déjà pour cette conversation
    // (y compris "Aucun mode"), false si rien n'a jamais été choisi
    // (11/09/2026, ajout d'un vrai "Aucun mode" -- voir SelecteurModeActif.tsx).
    choisi: boolean;
  }>;
}

export async function definirModeActif(conversationId: string, rattachementId: string | null) {
  return appelerApi(`/api/conversations/${conversationId}/mode-actif`, {
    method: "PUT",
    body: JSON.stringify({ rattachement_id: rattachementId }),
  }) as Promise<{ rattachement_id: string | null }>;
}

// --- Persona pédagogique par conversation (jonction items 1+8+9 des specs
// indépendantes ScholarFlow AI, volet étudiant, 14/09/2026, demande
// Bourama -- voir api/persona_pedagogique_conversation.py). Même patron
// que le mode actif ci-dessus, mais concept totalement différent : ici
// Socratique/Professeur/Tuteur/Examinateur, pas un rattachement
// enseignant/code de classe. Volontairement pas de champ "verrouillé"
// ni "choisi" ici (pas demandé pour ce mécanisme, contrairement au mode
// actif) -- persona vaut simplement null tant que rien n'est choisi. ---

export async function obtenirPersonaPedagogique(conversationId: string) {
  return appelerApi(`/api/conversations/${conversationId}/persona-pedagogique`) as Promise<{
    persona: string | null;
  }>;
}

export async function definirPersonaPedagogique(conversationId: string, persona: string | null) {
  return appelerApi(`/api/conversations/${conversationId}/persona-pedagogique`, {
    method: "PUT",
    body: JSON.stringify({ persona }),
  }) as Promise<{ persona: string | null }>;
}

// Chantier "mode source" (voir contexte-mode-source-clovis.md), demande
// Bourama, 16/09/2026 : meme forme exacte que obtenirPersonaPedagogique/
// definirPersonaPedagogique juste au-dessus, reglage totalement
// independant (core/mode_source_conversation.py cote backend).
export async function obtenirModeSource(conversationId: string) {
  return appelerApi(`/api/conversations/${conversationId}/mode-source`) as Promise<{
    mode_source: string | null;
  }>;
}

export async function definirModeSource(conversationId: string, modeSource: string | null) {
  return appelerApi(`/api/conversations/${conversationId}/mode-source`, {
    method: "PUT",
    body: JSON.stringify({ mode_source: modeSource }),
  }) as Promise<{ mode_source: string | null }>;
}

// --- Historique des réponses QCM (item 2 + jonction "QCM complet" des
// specs indépendantes ScholarFlow AI, volet étudiant, 14/09/2026, demande
// Bourama -- voir api/historique_reponses_qcm.py). Écriture seule, appelée
// par QCMInteractif.tsx (item 3) au moment où l'étudiant sélectionne une
// réponse. reponse_choisie/reponse_correcte : index (0-based) dans
// `choix`, même convention que le format ```qcm côté backend. ------------

export async function enregistrerReponseQCM(
  conversationId: string,
  payload: {
    question: string;
    choix: string[];
    reponse_choisie: number;
    reponse_correcte: number;
    explication?: string | null;
  }
) {
  return appelerApi(`/api/conversations/${conversationId}/reponses-qcm`, {
    method: "POST",
    body: JSON.stringify(payload),
  }) as Promise<{ enregistre: boolean }>;
}

// Structure des notions et avancement (Partie 1/2 du chantier "confiance
// pédagogique", 06/09/2026 -- voir djiguigne-backend/core/programme_notions.py).
// Rattachée à un code de partage (codes_partage), pas à un rôle -- même
// principe que le reste de "Mes codes" ci-dessus. Indépendante de
// l'ancienne fonctionnalité "Programme" (supprimée le 28/08/2026).

export type StatutNotion = "a_venir" | "en_cours" | "acquis";
export type RegleComportementNotion = "bloquer" | "contourner" | "signaler";

export type Notion = {
  id: string;
  code_id: string;
  notion_parent_id: string | null;
  nom: string;
  statut: StatutNotion;
  ordre: number;
  created_at: string;
  updated_at: string;
  regle_comportement: RegleComportementNotion | null;
  consigne_llm: string | null;
};

export async function listerNotions(codeId: string) {
  return appelerApi(`/api/notions/${codeId}`) as Promise<Notion[]>;
}

export async function creerNotion(codeId: string, nom: string, notionParentId: string | null = null) {
  return appelerApi(`/api/notions/${codeId}`, {
    method: "POST",
    body: JSON.stringify({ nom, notion_parent_id: notionParentId }),
  }) as Promise<Notion>;
}

export async function renommerNotion(codeId: string, notionId: string, nom: string) {
  return appelerApi(`/api/notions/${codeId}/${notionId}/nom`, {
    method: "PATCH",
    body: JSON.stringify({ nom }),
  }) as Promise<Notion>;
}

export async function changerStatutNotion(codeId: string, notionId: string, statut: StatutNotion) {
  return appelerApi(`/api/notions/${codeId}/${notionId}/statut`, {
    method: "PATCH",
    body: JSON.stringify({ statut }),
  }) as Promise<Notion>;
}

// 08/09/2026, demande Bourama : réglable directement depuis l'onglet
// Programme (avant, `regle_comportement` n'était réglable que par l'IA
// elle-même en conversation -- voir djiguigne-backend/core/
// outils_avancement_notions.py, action "definir_regle_comportement").
export async function definirRegleNotion(codeId: string, notionId: string, regle: RegleComportementNotion | null) {
  return appelerApi(`/api/notions/${codeId}/${notionId}/regle`, {
    method: "PATCH",
    body: JSON.stringify({ regle }),
  }) as Promise<Notion>;
}

// Même demande (08/09/2026) : consigne texte libre à destination de
// l'IA, à côté de regle_comportement -- voir docstring de
// definir_consigne_llm côté backend pour l'héritage le long de
// l'arborescence.
export async function definirConsigneNotion(codeId: string, notionId: string, consigne: string | null) {
  return appelerApi(`/api/notions/${codeId}/${notionId}/consigne`, {
    method: "PATCH",
    body: JSON.stringify({ consigne }),
  }) as Promise<Notion>;
}

export async function reordonnerNotions(codeId: string, notionParentId: string | null, notionIdsOrdonnes: string[]) {
  return appelerApi(`/api/notions/${codeId}/reordonner`, {
    method: "POST",
    body: JSON.stringify({ notion_parent_id: notionParentId, notion_ids_ordonnes: notionIdsOrdonnes }),
  }) as Promise<{ ok: boolean }>;
}

export async function fusionnerNotions(codeId: string, notionSourceId: string, notionCibleId: string) {
  return appelerApi(`/api/notions/${codeId}/fusionner`, {
    method: "POST",
    body: JSON.stringify({ notion_source_id: notionSourceId, notion_cible_id: notionCibleId }),
  }) as Promise<Notion>;
}

export async function supprimerNotion(codeId: string, notionId: string) {
  return appelerApi(`/api/notions/${codeId}/${notionId}`, { method: "DELETE" });
}

/** Structure de notions PROPOSÉE depuis un document -- ne modifie rien en
 * base (voir core/generation_notions_llm.py), à valider/éditer côté
 * frontend avant de créer réellement chaque notion via creerNotion(). */
export type NotionProposee = { nom: string; enfants: NotionProposee[] };

export async function genererStructureNotions(codeId: string, fichier: File) {
  const resultat = await appelerApiFichier(`/api/notions/${codeId}/generer`, fichier);
  return resultat as { notions: NotionProposee[] };
}

export type ContenuMatiere = {
  id: string;
  matiere: string;
  system_prompt: string;
  code: string;
};

/** Les matières que J'AI écrites (mes codes à partager). */
export async function listerMesContenus() {
  return appelerApi("/api/agents/clovis/contenus-matiere") as Promise<ContenuMatiere[]>;
}

/** Crée ou met à jour (même matière = même ligne) le contenu d'une
 * matière. Le code ne change jamais après la première création. */
export async function ecrireContenuMatiere(matiere: string, systemPrompt: string) {
  return appelerApi("/api/agents/clovis/contenus-matiere", {
    method: "PUT",
    body: JSON.stringify({ matiere, system_prompt: systemPrompt }),
  }) as Promise<ContenuMatiere>;
}

export type Rattachement = {
  contenu_id: string;
  matiere: string;
  enseignant_nom: string;
  actif: boolean;
  surnom: string | null;
};

/** Les matières que J'AI débloquées en entrant un code, actives ou non. */
export async function listerMesRattachements() {
  return appelerApi("/api/agents/clovis/rattachements") as Promise<Rattachement[]>;
}

/** Entre un code à 6 caractères pour débloquer la matière correspondante. */
export async function entrerCode(code: string) {
  return appelerApi("/api/agents/clovis/rattachements", {
    method: "POST",
    body: JSON.stringify({ code }),
  }) as Promise<Rattachement>;
}

export async function renommerRattachement(contenuId: string, surnom: string) {
  return appelerApi(`/api/agents/clovis/rattachements/${contenuId}/surnom`, {
    method: "PATCH",
    body: JSON.stringify({ surnom }),
  });
}

/** Bascule quelle matière est active quand plusieurs rattachements se
 * chevauchent sur la même matière (ex: deux codes reçus pour "Maths"). */
export async function activerRattachement(contenuId: string) {
  return appelerApi(`/api/agents/clovis/rattachements/${contenuId}/activer`, { method: "PATCH" });
}

export type Receveur = {
  user_id: string;
  nom_affiche: string;
  surnom: string | null;
  actif: boolean;
};

/** Qui a entré MON code pour cette matière précise (contenu_id = un des
 * miens, voir listerMesContenus). */
export async function listerReceveurs(contenuId: string) {
  return appelerApi(`/api/agents/clovis/contenus-matiere/${contenuId}/receveurs`) as Promise<Receveur[]>;
}

/** Diffuse un fichier à tous ceux qui ont entré mon code pour ce
 * contenu_id -- ajouté à la bibliothèque personnelle de chacun, pas à
 * la base partagée de Clovis. */
export async function diffuserDocumentMatiere(
  contenuId: string,
  fichier: File,
  description: string,
  titre?: string
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Connecte-toi pour envoyer un fichier.");
  }

  const corps = new FormData();
  corps.append("fichier", fichier);
  if (titre?.trim()) corps.append("titre", titre.trim());
  corps.append("description", description);

  const chemin = `/api/agents/clovis/contenus-matiere/${contenuId}/diffuser`;
  const reponse = await fetch(`${API_URL}${chemin}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: corps,
  });

  if (!reponse.ok) {
    throw await construireErreurApi(reponse, chemin);
  }

  return reponse.json() as Promise<ResultatDiffusion>;
}

/** Pendant de diffuserDocumentMatiere pour un lien (pas de fichier, juste
 * une URL). */
export async function diffuserLienMatiere(contenuId: string, url: string, description: string, titre?: string) {
  return appelerApi(`/api/agents/clovis/contenus-matiere/${contenuId}/diffuser-lien`, {
    method: "POST",
    body: JSON.stringify({ url, titre, description }),
  }) as Promise<ResultatDiffusion>;
}

// ---------------------------------------------------------------------------
// Dossiers de la bibliothèque personnelle (22/08, demande Bourama), voir
// api/dossiers_bibliotheque.py côté backend. Un fichier peut être rangé dans
// plusieurs dossiers à la fois (fichier_ids ci-dessous est un tableau).

export type DossierBibliotheque = {
  id: string;
  nom: string;
  dossier_parent_id: string | null;
  created_at: string;
  fichier_ids: string[];
  // 07/09/2026, demande Bourama : nom du propriétaire si ce dossier est
  // en réalité un miroir reçu via un code, undefined/null sinon.
  recu_de?: string | null;
};

export async function listerDossiersBibliotheque() {
  const resultat = await appelerApi("/api/bibliotheque/dossiers");
  return resultat as DossierBibliotheque[];
}

export async function creerDossierBibliotheque(nom: string, dossierParentId?: string) {
  return appelerApi("/api/bibliotheque/dossiers", {
    method: "POST",
    body: JSON.stringify({ nom, dossier_parent_id: dossierParentId ?? null }),
  });
}

export async function renommerDossierBibliotheque(dossierId: string, nom: string) {
  return appelerApi(`/api/bibliotheque/dossiers/${dossierId}`, {
    method: "PATCH",
    body: JSON.stringify({ nom }),
  });
}

export async function supprimerDossierBibliotheque(dossierId: string) {
  return appelerApi(`/api/bibliotheque/dossiers/${dossierId}`, { method: "DELETE" });
}

export async function rangerFichierDansDossier(dossierId: string, fichierId: string) {
  return appelerApi(`/api/bibliotheque/dossiers/${dossierId}/fichiers`, {
    method: "POST",
    body: JSON.stringify({ fichier_id: fichierId }),
  });
}

export async function retirerFichierDuDossier(dossierId: string, fichierId: string) {
  return appelerApi(`/api/bibliotheque/dossiers/${dossierId}/fichiers/${fichierId}`, { method: "DELETE" });
}

// Signalements (bibliothèque publique) et contenu légal (CGU /
// copyright), 22/08, chantier "rendre la bibliothèque plus sérieuse"
// (guide Notion "Guide pour droit d'auteur").

export type TypeSignalement = "bibliotheque_publique";

export type Signalement = {
  id: string;
  type_signalement: TypeSignalement;
  bibliotheque_publique_id: string | null;
  lien_document: string;
  motif: string;
  plaignant_nom: string;
  plaignant_email: string;
  plaignant_organisation: string | null;
  declaration_honneur: boolean;
  statut: "en_attente" | "traite";
  action: "retire" | "rejete" | null;
  notes_admin: string | null;
  created_at: string;
  traite_le: string | null;
};

export type NouveauSignalement = {
  type_signalement: TypeSignalement;
  bibliotheque_publique_id?: string;
  lien_document: string;
  motif: string;
  plaignant_nom: string;
  plaignant_email: string;
  plaignant_organisation?: string;
  declaration_honneur: boolean;
};

export async function creerSignalement(payload: NouveauSignalement) {
  const resultat = await appelerApi("/api/signalements", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return resultat as Signalement;
}

export async function listerSignalements(statut?: "en_attente" | "traite") {
  const suffixe = statut ? `?statut=${statut}` : "";
  const resultat = await appelerApi(`/api/signalements${suffixe}`);
  return resultat as Signalement[];
}

export async function traiterSignalement(id: string, action: "retire" | "rejete", notesAdmin?: string) {
  const resultat = await appelerApi(`/api/signalements/${id}/traiter`, {
    method: "POST",
    body: JSON.stringify({ action, notes_admin: notesAdmin }),
  });
  return resultat as Signalement;
}

export type ContenuLegal = { cle: string; titre: string; contenu_markdown: string; updated_at: string };

export async function lireContenuLegal(cle: "cgu" | "copyright" | "confidentialite") {
  const resultat = await appelerApi(`/api/legal/${cle}`);
  return resultat as ContenuLegal;
}

// 26/08/2026, Bourama : Partie 3 mobile, temps d'écran -- contrat déjà en
// place côté backend (api/appareils_mobiles.py, core/usage_appareil_mobile.py).
// Le plugin natif TempsEcranPlugin.kt ne renvoie que les chiffres bruts, ces
// deux fonctions font le pont avec le backend (aucun client HTTP dupliqué
// côté Kotlin, voir le commentaire d'en-tête de TempsEcranPlugin.kt).
export type LigneUsage = { plateforme: string; nom_app: string; date: string; duree_secondes: number };

export async function synchroniserUsage(plateforme: "android" | "ios", entrees: { nom_app: string; date: string; duree_secondes: number }[]) {
  await appelerApi("/api/appareils-mobiles/usage", {
    method: "POST",
    body: JSON.stringify({ plateforme, entrees }),
  });
}

export async function obtenirUsage(jours = 7) {
  return (await appelerApi(`/api/appareils-mobiles/usage?jours=${jours}`)) as { usage: LigneUsage[] };
}

// 02/09/2026, Bourama : centre de notifications (bouton cloche, header,
// web + mobile). Voir api/notifications.py côté backend -- ne couvre
// que les 4 nouveaux types Clovis (rappel_echu, action_ia_terminee,
// document_recu_code, message_systeme), pas les anciens types de la
// table (follow/comment/rating/...), laissés de côté pour l'instant.
export type NotificationClovis = {
  id: number;
  // "audit_hebdomadaire_corrections" ajouté Partie 8, "correction_traitee"
  // ajouté Partie 5 (tous deux 06/09/2026, chantier "confiance
  // pédagogique") : voir core/notifications.py. "nouvelle_version_disponible"
  // ajouté 09/09/2026 (voir core/notifications_push.py::notifier_nouvelle_version_disponible).
  // "demande_confirmation_dossier_public" / "demande_dossier_public_traitee"
  // ajoutés 09/09/2026 (voir core/dossiers_catalogue_public.py) -- omis par
  // erreur à l'écriture, ajoutés en vérifiant tout avant de dire "c'est
  // fait" à Bourama.
  type:
    | "rappel_echu"
    | "action_ia_terminee"
    | "document_recu_code"
    | "message_systeme"
    | "audit_hebdomadaire_corrections"
    | "correction_traitee"
    | "nouvelle_version_disponible"
    | "demande_confirmation_dossier_public"
    | "demande_dossier_public_traitee";
  titre: string;
  contenu: string | null;
  lien: string | null;
  lu: boolean;
  created_at: string;
};

export async function listerMesNotifications() {
  const resultat = await appelerApi("/api/notifications");
  return resultat as NotificationClovis[];
}

export async function marquerNotificationLue(id: number) {
  await appelerApi(`/api/notifications/${id}/lu`, { method: "POST" });
}

export async function marquerToutesNotificationsLues() {
  await appelerApi("/api/notifications/tout-lu", { method: "POST" });
}

// Audit synthétique hebdomadaire des signalements pédagogiques
// (refonte du 10/09/2026) : voir api/audit_hebdomadaire_corrections.py.
export type SignalementNonTraite = {
  id: string;
  question_texte: string;
  reponse_texte: string;
  probleme_observe: string | null;
  created_at: string | null;
};

export type TendanceNotion = { notion_id: string; nombre: number };

export type AuditCorrections = {
  total: number;
  nouveaux_non_traites: SignalementNonTraite[];
  tendances_notions: TendanceNotion[];
};

export async function obtenirAuditCorrections() {
  return appelerApi("/api/audit-corrections/mon-audit") as Promise<AuditCorrections>;
}

// Fondations du système établissement (Partie 9, 06/09/2026) : voir
// api/etablissements.py côté backend pour les endpoints, core/etablissements.py
// pour la logique et les trois états de rattachement (suivi / demande_en_attente
// / accepte).
export type Etablissement = {
  id: string;
  nom: string;
  description: string | null;
  site_web: string | null;
  contact: string | null;
  created_at: string;
};

export type EtatRattachementEtablissement = "suivi" | "demande_en_attente" | "accepte";

export type RattachementEtablissement = {
  id: string;
  etablissement_id: string;
  utilisateur_id: string;
  etat: EtatRattachementEtablissement;
  created_at: string;
  // Présent uniquement sur listerMesRattachementsEtablissements (jointure
  // Supabase "*, etablissements(id, nom)", voir lister_mes_rattachements).
  etablissements?: { id: string; nom: string };
};

export type PublicationEtablissement = {
  id: string;
  etablissement_id: string;
  auteur_id: string;
  titre: string | null;
  contenu: string;
  visibilite: "publique" | "privee";
  statut: "valide" | "en_attente" | "refuse";
  valide_le: string | null;
  valide_par: string | null;
  created_at: string;
};

/** Section publique -- parcourable sans compte (voir lister_etablissements_publics). */
export async function listerEtablissementsPublics() {
  return appelerApi("/api/etablissements") as Promise<Etablissement[]>;
}

export async function obtenirEtablissement(etablissementId: string) {
  return appelerApi(`/api/etablissements/${etablissementId}`) as Promise<Etablissement>;
}

/** Mes rattachements (tous établissements confondus), pour savoir quel
 * bouton (Suivre / Se connecter) afficher sur chaque carte de la liste. */
export async function listerMesRattachementsEtablissements() {
  return appelerApi("/api/etablissements/mes/rattachements") as Promise<RattachementEtablissement[]>;
}

/** Action "Suivre" -- immédiate, jamais de validation requise. */
export async function suivreEtablissement(etablissementId: string) {
  return appelerApi(`/api/etablissements/${etablissementId}/suivre`, {
    method: "POST",
  }) as Promise<RattachementEtablissement>;
}

/** Action "Se connecter" -- part en demande_en_attente, doit être validée
 * par l'établissement avant de devenir un vrai rattachement (accepte). */
export async function demanderConnexionEtablissement(etablissementId: string) {
  return appelerApi(`/api/etablissements/${etablissementId}/connecter`, {
    method: "POST",
  }) as Promise<RattachementEtablissement>;
}

/** Publications validées de cet établissement -- publiques pour tout le
 * monde, privées en plus si mon rattachement est "accepte" (le backend
 * filtre déjà selon le token envoyé, rien à décider ici). */
export async function listerPublicationsEtablissement(etablissementId: string) {
  return appelerApi(`/api/etablissements/${etablissementId}/publications`) as Promise<PublicationEtablissement[]>;
}

// Corrections pédagogiques élève -> prof (Partie 4/5, chantier
// "confiance pédagogique", 06/09/2026). Voir
// api/signalements_pedagogiques.py côté backend pour le contrat complet
// -- refonte du 10/09/2026 : plus de type A/B, plus de comportement
// généré, visibilité choisie par l'élève, rattachement matière/notion.
export type StatutSignalement = "nouveau" | "discute";

export type SignalementPedagogique = {
  id: string;
  agent_id: string;
  etudiant_id: string;
  prof_id: string | null;
  conversation_id: string | null;
  question_texte: string;
  reponse_texte: string;
  contexte_conversation: { role: string; content: string }[];
  probleme_observe: string | null;
  visible_question: boolean;
  visible_reponse: boolean;
  visible_conversation: boolean;
  demande_prof_question: boolean;
  demande_prof_reponse: boolean;
  demande_prof_conversation: boolean;
  code_id: string | null;
  notion_id: string | null;
  statut: StatutSignalement;
  correction_texte: string | null;
  conversation_discussion_id: string | null;
  created_at: string;
  updated_at: string;
};

export async function signalerPedagogique(payload: {
  agent_id: string;
  conversation_id?: string | null;
  question_message_id?: number | null;
  reponse_message_id?: number | null;
  question_texte: string;
  reponse_texte: string;
  probleme_observe?: string | null;
  visible_question?: boolean;
  visible_reponse?: boolean;
  visible_conversation?: boolean;
}) {
  return appelerApi("/api/signalements-pedagogiques", {
    method: "POST",
    body: JSON.stringify(payload),
  }) as Promise<SignalementPedagogique>;
}

export async function listerMesSignalementsPedagogiques() {
  const resultat = await appelerApi("/api/signalements-pedagogiques/mes-signalements");
  return (resultat as { signalements: SignalementPedagogique[] }).signalements;
}

export async function listerSignalementsRecus(statut?: StatutSignalement) {
  const suffixe = statut ? `?statut=${statut}` : "";
  const resultat = await appelerApi(`/api/signalements-pedagogiques/recus${suffixe}`);
  return (resultat as { signalements: SignalementPedagogique[] }).signalements;
}

export async function obtenirSignalementPedagogique(signalementId: string) {
  return appelerApi(`/api/signalements-pedagogiques/${signalementId}`) as Promise<SignalementPedagogique>;
}

export async function demanderVisibiliteSignalement(signalementId: string, champs: ("question" | "reponse" | "conversation")[]) {
  return appelerApi(`/api/signalements-pedagogiques/${signalementId}/demander-visibilite`, {
    method: "POST",
    body: JSON.stringify({ champs }),
  }) as Promise<SignalementPedagogique>;
}

export async function confirmerVisibiliteSignalement(signalementId: string, reponses: Record<string, boolean>) {
  return appelerApi(`/api/signalements-pedagogiques/${signalementId}/confirmer-visibilite`, {
    method: "POST",
    body: JSON.stringify({ reponses }),
  }) as Promise<SignalementPedagogique>;
}

export async function ouvrirDiscussionSignalement(signalementId: string, conversationDiscussionId: string) {
  return appelerApi(`/api/signalements-pedagogiques/${signalementId}/ouvrir-discussion`, {
    method: "POST",
    body: JSON.stringify({ conversation_discussion_id: conversationDiscussionId }),
  }) as Promise<SignalementPedagogique>;
}

export async function rattacherSignalementPedagogique(signalementId: string, codeId: string | null, notionId: string | null) {
  return appelerApi(`/api/signalements-pedagogiques/${signalementId}/rattacher`, {
    method: "PATCH",
    body: JSON.stringify({ code_id: codeId, notion_id: notionId }),
  }) as Promise<SignalementPedagogique>;
}

export async function dupliquerSignalementPedagogique(signalementId: string) {
  return appelerApi(`/api/signalements-pedagogiques/${signalementId}/dupliquer`, {
    method: "POST",
  }) as Promise<SignalementPedagogique>;
}

export async function supprimerSignalementPedagogique(signalementId: string) {
  await appelerApi(`/api/signalements-pedagogiques/${signalementId}`, { method: "DELETE" });
}
