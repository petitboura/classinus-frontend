"use client";

// Page bambara (18/11/2026, demande de Bourama) : le panneau du bouton historique. Pour chaque conversation du
// profil, son premier message seulement : le texte écrit, ou, quand la personne avait parlé, son premier vocal,
// qu'on peut réécouter comme dans la conversation. Une conversation qui commence par un vocal montre donc le vocal
// et non du texte. Le plus récent est en haut. Noir et blanc seulement (couleurs de .bb-page).

import { motion } from "framer-motion";
import { History } from "lucide-react";
import { useEffect, useState } from "react";
import { lireAudioConversationBambara, type ConversationBambara } from "@/lib/bambaraEspace";
import type { MessageAudioBambara } from "@/lib/audioMessageBambara";
import { BulleAudioBambara } from "./BulleAudioBambara";

type Props = {
  /** null tant que la liste se charge. */
  conversations: ConversationBambara[] | null;
  charger: () => void;
  idEnLecture: string | null;
  surChangerLecture: (id: string | null) => void;
  libelleEcouter: string;
  libelleMettreEnPause: string;
};

const ENTREE = { opacity: 0, y: 8 };
const ARRIVEE = { opacity: 1, y: 0 };

// La place que prendra une ligne, pour que rien ne bouge quand elle arrive.
function LignePatience() {
  return <div className="h-12 w-full animate-pulse rounded-full" style={{ backgroundColor: "var(--bb-voile)" }} />;
}

function PremierVocal({ conversation, idEnLecture, surChangerLecture, libelleEcouter, libelleMettreEnPause }: Omit<Props, "conversations" | "charger"> & { conversation: ConversationBambara }) {
  const [message, setMessage] = useState<MessageAudioBambara | null>(null);
  const [perdu, setPerdu] = useState(false);

  useEffect(() => {
    let annule = false;
    void lireAudioConversationBambara(conversation.id)
      .then((lu) => {
        if (!annule) setMessage(lu);
      })
      .catch(() => {
        if (!annule) setPerdu(true);
      });
    return () => {
      annule = true;
    };
  }, [conversation.id]);

  if (perdu) return null;
  if (!message) return <LignePatience />;
  return (
    <BulleAudioBambara
      id={"historique:" + conversation.id}
      message={message}
      cote="droite"
      idEnLecture={idEnLecture}
      surChangerLecture={surChangerLecture}
      libelleEcouter={libelleEcouter}
      libelleMettreEnPause={libelleMettreEnPause}
    />
  );
}

export function PanneauHistoriqueBambara({ conversations, charger, idEnLecture, surChangerLecture, libelleEcouter, libelleMettreEnPause }: Props) {
  // La liste est relue à chaque ouverture du panneau : elle montre toujours les conversations les plus récentes.
  useEffect(() => {
    charger();
  }, [charger]);

  if (conversations === null) {
    return (
      <div className="flex flex-col gap-3">
        <LignePatience />
        <LignePatience />
        <LignePatience />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.35 }} transition={{ duration: 0.3 }} className="flex justify-center py-6">
        <History size={40} />
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {conversations.map((conversation, index) => (
        <motion.div
          key={conversation.id}
          initial={ENTREE}
          animate={ARRIVEE}
          transition={{ duration: 0.25, ease: "easeOut", delay: Math.min(index, 8) * 0.04 }}
          className="flex w-full flex-col"
        >
          {conversation.a_audio ? (
            <PremierVocal
              conversation={conversation}
              idEnLecture={idEnLecture}
              surChangerLecture={surChangerLecture}
              libelleEcouter={libelleEcouter}
              libelleMettreEnPause={libelleMettreEnPause}
            />
          ) : (
            <p
              className="line-clamp-2 max-w-[85%] self-end whitespace-pre-line break-words rounded-2xl border px-4 py-2 font-lecture text-base leading-snug"
              style={{ borderColor: "var(--bb-trait)", backgroundColor: "var(--bb-voile)", color: "var(--bb-encre)" }}
            >
              {conversation.texte}
            </p>
          )}
        </motion.div>
      ))}
    </div>
  );
}
