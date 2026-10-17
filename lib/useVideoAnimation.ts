"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormatVideo } from "@/components/chat/animation/styleRenduVideo";
import {
  annulerRenduVideo,
  demanderRenduVideo,
  lireRenduVideo,
  telechargerVideoRendue,
} from "@/lib/apiRenduVideoAnimation";
import { ErreurApi, messageErreur } from "@/lib/erreurs";
import { telechargerContenuLocal } from "@/lib/telecharger";
import { textesVideoAnimation } from "@/lib/textesVideoAnimation";

// Création et téléchargement de la vidéo d'une animation (07/10/2026, demande
// Bourama). Le serveur fabrique la vidéo (voir lib/apiRenduVideoAnimation.ts) :
// ce hook envoie la demande, suit l'avancement, puis télécharge le fichier.
//
// Tout l'état est ici et non dans le bouton : BlocExpansible recrée sa barre
// d'actions à chaque rendu, ce qui démonterait un état local (même raison que
// pour le bouton Filmer du widget, voir BoutonFilmerWidget.tsx).
export type EtatVideoAnimation = "repos" | "envoi" | "rendu" | "telechargement" | "ok" | "echec";

const INTERVALLE_SUIVI_MS = 1000;
// Coupures de réseau passagères tolérées pendant le suivi avant d'abandonner.
const ECHECS_SUIVI_TOLERES = 3;
const RETOUR_OK_MS = 2500;
const RETOUR_ECHEC_MS = 7000;

function attendre(ms: number): Promise<void> {
  return new Promise((resolu) => setTimeout(resolu, ms));
}

export function useVideoAnimation(construireDocument: (format: FormatVideo) => string | null) {
  const [etat, setEtat] = useState<EtatVideoAnimation>("repos");
  const [format, setFormat] = useState<FormatVideo | null>(null);
  const [progression, setProgression] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const idRef = useRef<string | null>(null);
  const annuleRef = useRef(false);
  const monteRef = useRef(true);
  const retourRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actifRef = useRef(false);

  function programmerRetour(delai: number) {
    if (retourRef.current) clearTimeout(retourRef.current);
    retourRef.current = setTimeout(() => {
      if (!monteRef.current) return;
      setEtat("repos");
      setFormat(null);
      setMessage(null);
    }, delai);
  }

  const lancer = useCallback(
    async (formatDemande: FormatVideo) => {
      if (actifRef.current) return;
      const document_ = construireDocument(formatDemande);
      if (document_ === null) return;

      actifRef.current = true;
      annuleRef.current = false;
      idRef.current = null;
      if (retourRef.current) clearTimeout(retourRef.current);
      setFormat(formatDemande);
      setProgression(0);
      setMessage(null);
      setEtat("envoi");

      try {
        const travail = await demanderRenduVideo(document_, formatDemande);
        idRef.current = travail.id;
        if (annuleRef.current) {
          annulerRenduVideo(travail.id).catch(() => {});
          return;
        }
        setEtat("rendu");

        let echecsSuivi = 0;
        for (;;) {
          await attendre(INTERVALLE_SUIVI_MS);
          if (annuleRef.current) return;
          let suivi;
          try {
            suivi = await lireRenduVideo(travail.id);
            echecsSuivi = 0;
          } catch (e) {
            // Un travail introuvable ou refusé ne reviendra pas : on arrête.
            if (e instanceof ErreurApi && e.statusCode < 500 && e.statusCode !== 429) throw e;
            if (++echecsSuivi >= ECHECS_SUIVI_TOLERES) throw e;
            continue;
          }
          if (annuleRef.current) return;
          setProgression(suivi.progression);
          if (suivi.statut === "echec") {
            throw new ErreurApi(200, suivi.message_erreur ?? "", suivi.code_erreur);
          }
          if (suivi.statut === "annule") return;
          if (suivi.statut === "pret") break;
        }

        setEtat("telechargement");
        const blob = await telechargerVideoRendue(travail.id);
        if (annuleRef.current) return;
        await telechargerContenuLocal(textesVideoAnimation().nomFichier(formatDemande), blob, "video/mp4");
        // Le fichier est chez l'utilisateur : le serveur peut l'oublier.
        annulerRenduVideo(travail.id).catch(() => {});
        if (!monteRef.current) return;
        setEtat("ok");
        programmerRetour(RETOUR_OK_MS);
      } catch (e) {
        if (!monteRef.current || annuleRef.current) return;
        console.error("[videoAnimation] échec :", e);
        setMessage(messageErreur(e));
        setEtat("echec");
        programmerRetour(RETOUR_ECHEC_MS);
      } finally {
        actifRef.current = false;
      }
    },
    [construireDocument],
  );

  const annuler = useCallback(() => {
    if (!actifRef.current) return;
    annuleRef.current = true;
    if (idRef.current) annulerRenduVideo(idRef.current).catch(() => {});
    setEtat("repos");
    setFormat(null);
    setProgression(0);
  }, []);

  // Si le bloc disparaît en plein rendu (autre conversation, page quittée), le
  // serveur n'a plus de raison de le terminer.
  useEffect(() => {
    monteRef.current = true;
    return () => {
      monteRef.current = false;
      annuleRef.current = true;
      if (retourRef.current) clearTimeout(retourRef.current);
      if (actifRef.current && idRef.current) annulerRenduVideo(idRef.current).catch(() => {});
    };
  }, []);

  return { etat, format, progression, message, lancer, annuler };
}
