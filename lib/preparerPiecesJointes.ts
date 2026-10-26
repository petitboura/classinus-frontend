// Extrait de components/chat/ChatIA.tsx le 03/10/2026 (demande Bourama : bouton « + »
// du canal en direct) pour que le chat et le canal préparent leurs pièces jointes
// exactement de la même façon : même envoi vers le serveur, mêmes blocs de texte
// ajoutés au message ([Image jointe : ...], [Document joint : ...], etc.).
// Le contenu des commentaires est inchangé, seule la place du code a bougé.

import { uploaderImageChat, uploaderDocumentChat, uploaderMediaChat } from "@/lib/api";

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
      const { texte: texteDocument, tronque, lisible, url: urlDocument, url_apercu: urlApercu } = await uploaderDocumentChat(fichier);
      const lienDocument = urlDocument ? `\n[Lien réel du fichier : ${urlDocument}]` : "";
      // Aperçu PDF (25/07) : lien séparé, volontairement en .pdf --
      // FichierChip.tsx détecte l'extension et affiche automatiquement
      // le visualiseur PDF intégré pour ce lien, sans aucun changement
      // nécessaire dans FichierChip.tsx lui-même (voir core/conversion_pdf.py).
      const lienApercu = urlApercu ? `\n[Aperçu visuel du fichier (PDF) : ${urlApercu}]` : "";
      // Fichier accepté mais dont le contenu n'a pas pu être lu (binaire
      // inconnu, ancien format sans conversion) : le serveur le garde, et
      // le modèle est prévenu pour l'expliquer à l'étudiant au lieu de
      // croire qu'il a lu quelque chose.
      if (!lisible) {
        return {
          texteBloc: `\n\n[Document joint : ${fichier.name} (illisible)]\nLe contenu de ce fichier n'a pas pu être lu, seul son nom est connu.${lienDocument}`,
        };
      }
      return {
        texteBloc: `\n\n[Document joint : ${fichier.name}${tronque ? " (tronqué)" : ""}]\n${texteDocument}${lienDocument}${lienApercu}`,
      };
    })
  );
}
