// Extrait de components/chat/ChatIA.tsx le 03/10/2026 (demande Bourama : bouton « + »
// du canal en direct) pour que le chat et le canal préparent leurs pièces jointes
// exactement de la même façon : même envoi vers le serveur, mêmes blocs de texte
// ajoutés au message ([Image jointe : ...], [Document joint : ...], etc.).
// Le contenu des commentaires est inchangé, seule la place du code a bougé.

import { uploaderImageChat, uploaderDocumentChat, uploaderFichierChat, uploaderMediaChat } from "@/lib/api";
import { ErreurApi } from "@/lib/erreurs";

export type TypeFichierJoint = "image" | "document" | "video" | "audio" | "zip";

export function typeDeFichier(f: File): TypeFichierJoint {
  return f.type.startsWith("image/")
    ? "image"
    : f.type.startsWith("video/")
    ? "video"
    : f.type.startsWith("audio/")
    ? "audio"
    : f.type === "application/zip" || f.type === "application/x-zip-compressed" || f.name.toLowerCase().endsWith(".zip")
    ? "zip"
    : "document";
}

export type ResultatFichierJoint = { texteBloc: string; imageUrl?: string };

export function traiterFichiersJoints(fichiers: File[]): Promise<PromiseSettledResult<ResultatFichierJoint>[]> {
  return Promise.allSettled(
    fichiers.map(async (fichier): Promise<ResultatFichierJoint> => {
      const type = typeDeFichier(fichier);
      if (type === "image") {
        const url = await uploaderImageChat(fichier);
        // Le lien réel doit aussi être en TEXTE dans le message, pas
        // seulement envoyé à part pour l'analyse visuelle (image_url) --
        // sinon l'IA "voit" l'image via la vision mais n'a jamais son
        // adresse réelle en mémoire, et invente un lien si on la lui
        // redemande plus tard (repéré en test réel, 2026-07-23).
        return { imageUrl: url, texteBloc: `\n\n[Image jointe : ${url}]` };
      }
      if (type === "audio" || type === "video") {
        // Contrairement aux images et aux documents, une vidéo ou un audio n'est
        // pas lu à l'envoi (26/10/2026, demande Bourama) : seules ses informations
        // et son lien réel partent dans le message, et c'est le modèle qui décide
        // de le lire avec l'outil lire_media_conversation (voir
        // core/lecture_media_conversation.py côté serveur). Le chip du message
        // ne lit que le nom et le lien (BulleMessage.tsx, extraireUneBloc).
        const { url, resume } = await uploaderMediaChat(fichier);
        const marqueur = type === "audio" ? "Audio joint" : "Vidéo jointe";
        return { texteBloc: `\n\n[${marqueur} : ${fichier.name}]\nContenu non lu (${resume}).\n[Lien réel du fichier : ${url}]` };
      }
      if (type === "zip") {
        // Rien à uploader ici : le dézipage a déjà démarré dès la
        // sélection (voir BarreDeSaisie.tsx:ajouterFichiers), et le
        // job_id correspondant part directement dans zipsEnAttente
        // (voir plus bas, payload /api/chat) -- core/main.py:chat()
        // termine lui-même le travail restant et injecte le sommaire
        // côté serveur (voir core/zip_chat.py). Seul un repère textuel
        // léger est ajouté ici, pour que le chip pièce jointe survive
        // au rechargement de la page (voir BulleMessage.tsx,
        // MARQUEURS_PIECE_JOINTE) -- volontairement AUCUN contenu de
        // fichier n'est injecté dans le message visible.
        return { texteBloc: `\n\n[Archive jointe : ${fichier.name}]` };
      }
      // Document (27/10/2026, demande Bourama) : comme une vidéo ou un audio, il n'est plus
      // lu à l'envoi. Seules ses informations et son lien réel partent dans le message, et
      // c'est le modèle qui décide de le lire (lire_document_conversation) ou de le copier
      // dans l'espace d'exécution de code. Le chip du message ne lit que le nom et le lien
      // (BulleMessage.tsx, extraireUneBloc), et le texte « Contenu non lu » est ce que
      // le serveur reconnaît pour brancher l'outil (core/lecture_document_conversation.py).
      try {
        const { url, resume, url_apercu: urlApercu } = await uploaderFichierChat(fichier);
        // Aperçu PDF (25/07) : lien séparé, volontairement en .pdf, FichierChip.tsx affiche
        // automatiquement le visualiseur PDF intégré pour ce lien.
        const lienApercu = urlApercu ? `\n[Aperçu visuel du fichier (PDF) : ${urlApercu}]` : "";
        return {
          texteBloc: `\n\n[Document joint : ${fichier.name}]\nContenu non lu (${resume}).\n[Lien réel du fichier : ${url}]${lienApercu}`,
        };
      } catch (erreur) {
        // Repli pendant un déploiement : si le serveur n'a pas encore la nouvelle route
        // (404), on garde l'ancien chemin, qui lit le document à l'envoi.
        if (erreur instanceof ErreurApi && erreur.statusCode === 404) {
          return blocDocumentLuALEnvoi(fichier);
        }
        throw erreur;
      }
    })
  );
}

// Ancien chemin, gardé comme repli (voir plus haut) : le serveur extrait le texte du document
// DÈS l'envoi et ce texte part dans le message.
async function blocDocumentLuALEnvoi(fichier: File): Promise<ResultatFichierJoint> {
  const { texte: texteDocument, tronque, lisible, url: urlDocument, url_apercu: urlApercu } = await uploaderDocumentChat(fichier);
  const lienDocument = urlDocument ? `\n[Lien réel du fichier : ${urlDocument}]` : "";
  const lienApercu = urlApercu ? `\n[Aperçu visuel du fichier (PDF) : ${urlApercu}]` : "";
  if (!lisible) {
    return {
      texteBloc: `\n\n[Document joint : ${fichier.name} (illisible)]\nLe contenu de ce fichier n'a pas pu être lu, seul son nom est connu.${lienDocument}`,
    };
  }
  return {
    texteBloc: `\n\n[Document joint : ${fichier.name}${tronque ? " (tronqué)" : ""}]\n${texteDocument}${lienDocument}${lienApercu}`,
  };
}
