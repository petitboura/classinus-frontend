"use client";

// Page bambara (16/11/2026, demande de Bourama) : envoie la parole transcrite à l'IA de Classinus et
// suit le flux pour montrer ce qui compte à l'écran (outils en cours, vidéos, images). Même route que
// le mode vocal bambara (lib/geminiLive.ts : demanderAClovisDirectement), avec `client` = `page_bambara` :
// le serveur ne propose alors que la recherche, la génération visuelle et la mémoire, répond en
// bambara oral et garde l'effort de réflexion au plus faible. La réflexion n'est jamais montrée.

import { appelerApiStream } from "./api";
import { ajouterTourDirect, lireEtatConversation, type IdMessage } from "./conversationPartagee";
import {
  extraireVisuelsDuTexte,
  visuelsDepuisFichiers,
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
};

export async function demanderPageBambara(question: string, conversationId: string, rappels: RappelsPageBambara): Promise<string> {
  let reponse = "";
  let idUser: IdMessage | null = null;
  let idAssistant: IdMessage | null = null;
  const enCours = new Map<string, string>();
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
          if (typeof evenement.texte === "string") reponse += evenement.texte;
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
        case "images":
          rappels.surVisuels(visuelsDepuisImages(evenement.images));
          break;
        case "videos":
          rappels.surVisuels(visuelsDepuisVideos(evenement.videos));
          break;
        case "fichiers_generes":
          rappels.surVisuels(visuelsDepuisFichiers(evenement.fichiers));
          break;
        default:
          // raisonnement, outil_resultat, sources, ressources_ui... : rien à montrer à quelqu'un qui ne lit pas.
          break;
      }
    }
  );
  enCours.clear();
  publierOutils();
  rappels.surVisuels(extraireVisuelsDuTexte(reponse));
  ajouterTourDirect(conversationId, question, reponse, idUser, idAssistant);
  return reponse;
}
