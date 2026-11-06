"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ErreurApi, messageErreur } from "@/lib/erreurs";
import { annulerHiggsfield, statutHiggsfield } from "@/lib/higgsfieldApi";
import type { EtatGeneration } from "@/lib/higgsfieldGeneration";

const INTERVALLE_VERIFICATION_MS = 5000;
const VERIFICATIONS_MAX = 96;
const PROGRESSION_DEBUT_SUIVI = 68;
const PROGRESSION_MAX_AVANT_FIN = 93;

const MESSAGE_NON_CONFIGURE = "Higgsfield n'est pas disponible pour le moment. Réessaie plus tard.";
const MESSAGE_ECHEC = "La génération a échoué. Réessaie.";
const MESSAGE_BLOQUE = "Ce contenu a été bloqué par le filtre de Higgsfield.";
const MESSAGE_ANNULEE = "Génération annulée.";

/**
 * Suivi d'une génération Higgsfield : état, progression, résultat, vérification
 * régulière du statut et annulation. Les vérifications se font l'une après l'autre
 * (jamais deux requêtes de statut en même temps) et un jeton ignore toute réponse
 * arrivée après une annulation, un nouveau suivi ou la fermeture du panneau.
 */
export function useSuiviGenerationHiggsfield() {
  const [etat, setEtat] = useState<EtatGeneration>("idle");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [resultatUrl, setResultatUrl] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [progression, setProgression] = useState(0);
  // Étape réelle renvoyée par le serveur. Une demande tout juste lancée attend son tour (valeur par défaut côté base).
  const [etape, setEtape] = useState<"attente" | "creation">("attente");
  // Vrai quand les vérifications automatiques sont épuisées alors que la génération n'est pas finie.
  const [delaiDepasse, setDelaiDepasse] = useState(false);

  const minuteurRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jetonRef = useRef(0);
  const verificationsRef = useRef(0);
  const titreRef = useRef("");

  const arreterSuivi = useCallback(() => {
    jetonRef.current += 1;
    if (minuteurRef.current) {
      clearTimeout(minuteurRef.current);
      minuteurRef.current = null;
    }
  }, []);

  useEffect(() => arreterSuivi, [arreterSuivi]);

  const definirEtape = useCallback((nouvelEtat: EtatGeneration, nouvelleProgression: number) => {
    setEtat(nouvelEtat);
    setProgression(nouvelleProgression);
  }, []);

  const echouer = useCallback((e: unknown) => {
    setErreur(messageErreur(e));
    setEtat("echec");
    setProgression(0);
  }, []);

  const demarrerSuivi = useCallback((id: string, titre: string) => {
    arreterSuivi();
    const jeton = jetonRef.current;
    verificationsRef.current = 0;
    titreRef.current = titre;
    setRequestId(id);
    setErreur(null);
    setDelaiDepasse(false);
    setEtat("en_cours");
    setEtape("attente");
    setProgression(PROGRESSION_DEBUT_SUIVI);

    const terminerAvec = (etatFinal: EtatGeneration, message: string | null) => {
      setEtat(etatFinal);
      setErreur(message);
    };

    const verifier = async () => {
      if (jeton !== jetonRef.current) return;
      verificationsRef.current += 1;
      setProgression((p) => Math.min(PROGRESSION_MAX_AVANT_FIN, p + Math.max(1, 6 - verificationsRef.current * 0.4)));

      try {
        const statut = await statutHiggsfield(id, titreRef.current);
        if (jeton !== jetonRef.current) return;
        if (statut.etape) setEtape(statut.etape);
        if (statut.etat === "terminee" && statut.url) {
          setResultatUrl(statut.url);
          setProgression(100);
          terminerAvec("terminee", null);
          return;
        }
        if (statut.etat === "echec") return terminerAvec("echec", statut.erreur || MESSAGE_ECHEC);
        if (statut.etat === "bloquee") return terminerAvec("bloquee", statut.erreur || MESSAGE_BLOQUE);
        if (statut.etat === "annulee") return terminerAvec("annulee", MESSAGE_ANNULEE);
      } catch (e: unknown) {
        if (jeton !== jetonRef.current) return;
        // Une erreur passagère de réseau ne doit pas interrompre le suivi : on réessaie à la vérification suivante.
        if (e instanceof ErreurApi && e.code === "HIGGSFIELD_NON_CONFIGURE") return terminerAvec("echec", MESSAGE_NON_CONFIGURE);
      }

      if (verificationsRef.current >= VERIFICATIONS_MAX) {
        setDelaiDepasse(true);
        return;
      }
      minuteurRef.current = setTimeout(verifier, INTERVALLE_VERIFICATION_MS);
    };

    minuteurRef.current = setTimeout(verifier, INTERVALLE_VERIFICATION_MS);
  }, [arreterSuivi]);

  const reprendreSuivi = useCallback(() => {
    if (requestId) demarrerSuivi(requestId, titreRef.current);
  }, [demarrerSuivi, requestId]);

  const annuler = useCallback(async () => {
    if (!requestId) return;
    try {
      await annulerHiggsfield(requestId);
    } catch {
      // L'annulation côté Higgsfield se fait au mieux : le suivi s'arrête de toute façon ici.
    }
    arreterSuivi();
    setDelaiDepasse(false);
    setEtat("annulee");
    setErreur(MESSAGE_ANNULEE);
  }, [arreterSuivi, requestId]);

  const reinitialiser = useCallback(() => {
    arreterSuivi();
    setEtat("idle");
    setResultatUrl(null);
    setRequestId(null);
    setErreur(null);
    setProgression(0);
    setEtape("attente");
    setDelaiDepasse(false);
  }, [arreterSuivi]);

  const effacerMessages = useCallback(() => {
    setErreur(null);
    setResultatUrl(null);
  }, []);

  return {
    etat,
    requestId,
    resultatUrl,
    erreur,
    progression,
    etape,
    delaiDepasse,
    definirEtape,
    definirErreur: setErreur,
    effacerMessages,
    echouer,
    demarrerSuivi,
    reprendreSuivi,
    annuler,
    reinitialiser,
  };
}
