"use client";

// Page bambara (16/11/2026, demande de Bourama) : envoie la parole transcrite à l'IA de Classinus et
// suit le flux pour montrer ce qui compte à l'écran (outils en cours, vidéos, images). C'est l'IA qui choisit quelles
// images et quelles vidéos s'affichent (demande de Bourama, 19/11/2026) : celles qu'elle écrit dans sa réponse. Les
// résultats de recherche qu'elle ne cite pas ne sont pas montrés ; ils servent seulement à compléter ceux qu'elle cite
// (miniature, titre). Une exception (22/11/2026, demande de Bourama) : pendant une recherche d'images ou de vidéos, le
// serveur envoie des blocs `bloc_media`, chacun déjà trié par un petit LLM dès qu'une source a répondu ; ils sont montrés
// tout de suite, sans attendre la fin de la réponse. Les images qu'elle crée elle-même (outil generer_image) sont toujours
// montrées. Même route que
// le mode vocal bambara (lib/geminiLive.ts : demanderAClovisDirectement), avec `client` = `page_bambara` :
// le serveur ne propose alors que la recherche, la génération visuelle et la mémoire, répond en
// bambara oral et garde l'effort de réflexion au plus faible. La réflexion n'est jamais montrée.

import { appelerApiStream } from "./api";
import { ajouterTourDirect, lireEtatConversation, type IdMessage } from "./conversationPartagee";
import {
  extraireVisuelsDuTexte,
  visuelsDepuisBloc,
  visuelsDepuisFichiersGeneres,
  visuelsDepuisImages,
  visuelsDepuisVideos,
  type VisuelBambara,
} from "./pageBambaraVisuels";

/** Valeur envoyée avec chaque message de la page : le serveur y reconnaît la page bambara. */
export const CLIENT_PAGE_BAMBARA = "page_bambara";

export type RappelsPageBambara = {
  /** Noms des outils en cours, à chaque changement (liste vide quand plus aucun ne travaille). */
  surOutilsEnCours: (noms: string[]) => void;
  /** Nouveaux visuels à montrer, dès qu'ils sont connus. */
  surVisuels: (visuels: VisuelBambara[]) => void;
  /** Texte de la réponse écrit jusqu'ici, à chaque morceau reçu (seulement pour une demande écrite). */
  surTexte?: (texteCumule: string) => void;
};

export async function demanderPageBambara(question: string, conversationId: string, rappels: RappelsPageBambara): Promise<string> {
  let reponse = "";
  let idUser: IdMessage | null = null;
  let idAssistant: IdMessage | null = null;
  const enCours = new Map<string, string>();
  // Images et vidéos trouvées par la recherche, par adresse : jamais montrées d'office, seulement si l'IA les cite.
  const candidats = new Map<string, VisuelBambara>();
  const publierOutils = () => rappels.surOutilsEnCours([...enCours.values()]);
  let sansId = 0;

  const etat = lireEtatConversation(conversationId);
  await appelerApiStream(
    "/api/chat",
    {
      message: question,
      agent_id: "clovis",
      historique: etat.historique,
      conversation_id: conversationId,
      parent_id: etat.dernierMessageId,
      longueur_reponse: "courte",
      fuseau_horaire: Intl.DateTimeFormat().resolvedOptions().timeZone,
      client: CLIENT_PAGE_BAMBARA,
      // Le serveur force « none » de toute façon pour cette page ; on l'annonce aussi ici.
      effort_reflexion: "none",
    },
    (evenement) => {
      switch (evenement?.type) {
        case "reponse":
          if (typeof evenement.texte === "string") {
            reponse += evenement.texte;
            rappels.surTexte?.(reponse);
          }
          break;
        case "meta":
          idUser = evenement.message_id_user ?? idUser;
          idAssistant = evenement.message_id_assistant ?? idAssistant;
          break;
        case "statut": {
          const cle = evenement.id_appel ?? `sans-id-${sansId++}`;
          enCours.set(String(cle), String(evenement.nom_outil ?? ""));
          publierOutils();
          break;
        }
        case "statut_termine": {
          if (evenement.id_appel != null) enCours.delete(String(evenement.id_appel));
          else if (enCours.size > 0) enCours.delete([...enCours.keys()].pop() as string);
          publierOutils();
          break;
        }
        case "bloc_media": {
          // Déjà trié par le serveur : montré tout de suite. Gardé aussi dans les candidats, pour que le titre et la
          // miniature complètent un visuel que l'IA citerait ensuite dans sa réponse.
          const visuels = visuelsDepuisBloc(evenement);
          for (const visuel of visuels) candidats.set(visuel.url, visuel);
          if (visuels.length > 0) rappels.surVisuels(visuels);
          break;
        }
        case "images":
          for (const visuel of visuelsDepuisImages(evenement.images)) candidats.set(visuel.url, visuel);
          break;
        case "videos":
          for (const visuel of visuelsDepuisVideos(evenement.videos)) candidats.set(visuel.url, visuel);
          break;
        case "fichiers_generes":
          // Seul l'outil qui crée l'image compte : le serveur annonce aussi comme « fichier généré » les miniatures et
          // images d'une recherche, qui ne doivent jamais s'afficher d'office.
          rappels.surVisuels(visuelsDepuisFichiersGeneres(evenement.nom_outil, evenement.fichiers));
          break;
        default:
          // raisonnement, outil_resultat, sources, ressources_ui... : rien à montrer à quelqu'un qui ne lit pas.
          break;
      }
    }
  );
  enCours.clear();
  publierOutils();
  // Seuls les visuels que l'IA a écrits dans sa réponse sont montrés, avec les détails de la recherche quand elle les a.
  rappels.surVisuels(extraireVisuelsDuTexte(reponse).map((visuel) => candidats.get(visuel.url) ?? visuel));
  ajouterTourDirect(conversationId, question, reponse, idUser, idAssistant);
  return reponse;
}
