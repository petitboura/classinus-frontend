"use client";

// Minuteurs du chat (20/09/2026, demande Bourama) : état global des
// minuteurs de l'étudiant, partagé par tout l'app (monté dans
// components/AppShell.tsx).
//
// Ce qui vit ici, et rien d'autre :
//  - la liste des minuteurs, relue depuis le serveur au montage, au retour
//    au premier plan, toutes les 45 s, et dès que Clovis en lance/modifie/
//    arrête un (événement "minuteurs", voir lib/evenementsDonnees.ts) ;
//  - les actions de l'étudiant (lancer, ajouter/retirer du temps, arrêter) ;
//  - la prise en charge de la FIN d'un minuteur : à zéro, on demande au
//    serveur de la prendre en charge (une seule fois, même si l'appli est
//    ouverte à plusieurs endroits), puis on met la fin en file d'attente
//    pour que le chat ouvert envoie à Clovis un message automatique
//    invisible (voir components/chat/ChatIA.tsx).
//
// Le temps qui défile à l'écran N'EST PAS ici : chaque affichage le
// calcule lui même (voir lib/useSecondeCourante.ts), pour que le chat ne
// se redessine pas à chaque seconde.
//
// Tant qu'aucun chat n'est ouvert, la fin n'est PAS prise en charge : le
// serveur envoie alors une notification (core/minuteurs.py) et la fin sera
// prise en charge à l'ouverture du chat.

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { messageErreur } from "@/lib/erreurs";
import { ecouterDonneesModifiees } from "@/lib/evenementsDonnees";
import {
  ajusterMinuteur,
  arreterMinuteur,
  DELAI_RETRAIT_ARRETE_MS,
  DELAI_RETRAIT_TERMINE_MS,
  lancerMinuteur,
  listerMinuteurs,
  terminerMinuteur,
  type Minuteur,
} from "@/lib/minuteurs";

const INTERVALLE_RELECTURE_MS = 45_000;
const DELAI_EFFACEMENT_ERREUR_MS = 4000;
const DELAI_NOUVEL_ESSAI_FIN_MS = 1500;

export type ValeurMinuteurs = {
  minuteurs: Minuteur[];
  /** Horloge du serveur moins horloge de l'appareil, en ms. */
  decalageMs: number;
  /** Nombre de fins de minuteur prises en charge et pas encore envoyées à Clovis. */
  nbFinsEnAttente: number;
  erreur: string | null;
  lancer: (dureeSecondes: number, options?: { titre?: string; conversationId?: string }) => Promise<void>;
  ajuster: (id: string, deltaSecondes: number) => Promise<void>;
  arreter: (id: string) => Promise<void>;
  /** Retire et renvoie la prochaine fin à transmettre à Clovis, ou null. */
  prendreFinEnAttente: () => Minuteur | null;
  /** Un chat s'ouvre : renvoie la fonction à appeler quand il se ferme. */
  enregistrerChat: () => () => void;
};

export const ContexteMinuteurs = createContext<ValeurMinuteurs | null>(null);

export function useFournirMinuteurs(connecte: boolean): ValeurMinuteurs {
  const [minuteurs, setMinuteurs] = useState<Minuteur[]>([]);
  const [decalageMs, setDecalageMs] = useState(0);
  const [nbFinsEnAttente, setNbFinsEnAttente] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  const [nbChatsOuverts, setNbChatsOuverts] = useState(0);

  const finsEnAttenteRef = useRef<Minuteur[]>([]);
  const dejaPrisEnCharge = useRef<Set<string>>(new Set());
  const delaisEnCours = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const delaiErreur = useRef<ReturnType<typeof setTimeout> | null>(null);

  const planifier = useCallback((action: () => void, delaiMs: number) => {
    const id = setTimeout(() => {
      delaisEnCours.current.delete(id);
      action();
    }, delaiMs);
    delaisEnCours.current.add(id);
  }, []);

  useEffect(() => {
    const delais = delaisEnCours.current;
    return () => {
      delais.forEach((id) => clearTimeout(id));
      delais.clear();
      if (delaiErreur.current) clearTimeout(delaiErreur.current);
    };
  }, []);

  const signalerErreur = useCallback((e: unknown) => {
    setErreur(messageErreur(e));
    if (delaiErreur.current) clearTimeout(delaiErreur.current);
    delaiErreur.current = setTimeout(() => setErreur(null), DELAI_EFFACEMENT_ERREUR_MS);
  }, []);

  const charger = useCallback(async () => {
    const avant = Date.now();
    try {
      const reponse = await listerMinuteurs();
      const apres = Date.now();
      const serveurMs = Date.parse(reponse.maintenant);
      // Milieu de l'aller retour : meilleure estimation de l'instant où le
      // serveur a lu son horloge.
      if (!Number.isNaN(serveurMs)) setDecalageMs(serveurMs - (avant + apres) / 2);
      setMinuteurs((prec) => {
        const ids = new Set(reponse.minuteurs.map((m) => m.id));
        // Le serveur ne renvoie que les minuteurs en cours : on garde les
        // terminés/arrêtés affichés localement le temps de leur sortie.
        return [...reponse.minuteurs, ...prec.filter((m) => m.statut !== "en_cours" && !ids.has(m.id))];
      });
    } catch {
      // Une lecture ratée (réseau coupé...) laisse la liste telle quelle,
      // elle sera relue au prochain déclenchement : rien à montrer.
    }
  }, []);

  // Chargement, retour au premier plan, relecture régulière, et rafraîchissement
  // demandé quand Clovis agit sur un minuteur.
  useEffect(() => {
    if (!connecte) {
      setMinuteurs([]);
      return;
    }
    void charger();
    const surVisibilite = () => {
      if (document.visibilityState === "visible") void charger();
    };
    document.addEventListener("visibilitychange", surVisibilite);
    window.addEventListener("focus", surVisibilite);
    const retirerEcoute = ecouterDonneesModifiees("minuteurs", () => void charger());
    const relecture = setInterval(surVisibilite, INTERVALLE_RELECTURE_MS);
    return () => {
      document.removeEventListener("visibilitychange", surVisibilite);
      window.removeEventListener("focus", surVisibilite);
      retirerEcoute();
      clearInterval(relecture);
    };
  }, [connecte, charger]);

  const marquerFini = useCallback(
    (minuteur: Minuteur) => {
      // secondes_restantes : le serveur donne le temps restant au moment de l'arrêt, affiché figé le temps de la sortie.
      setMinuteurs((prec) =>
        prec.map((m) => (m.id === minuteur.id ? { ...m, statut: minuteur.statut, secondes_restantes: minuteur.secondes_restantes } : m))
      );
      planifier(
        () => setMinuteurs((prec) => prec.filter((m) => m.id !== minuteur.id)),
        minuteur.statut === "termine" ? DELAI_RETRAIT_TERMINE_MS : DELAI_RETRAIT_ARRETE_MS
      );
    },
    [planifier]
  );

  const prendreEnChargeFin = useCallback(
    async (minuteur: Minuteur) => {
      if (dejaPrisEnCharge.current.has(minuteur.id)) return;
      dejaPrisEnCharge.current.add(minuteur.id);
      try {
        const reponse = await terminerMinuteur(minuteur.id);
        if (reponse.minuteur.statut === "en_cours") {
          // Le serveur le voit encore un peu avant zéro (horloge de
          // l'appareil légèrement en avance) : on retente juste après.
          dejaPrisEnCharge.current.delete(minuteur.id);
          planifier(() => void charger(), DELAI_NOUVEL_ESSAI_FIN_MS);
          return;
        }
        if (reponse.a_traiter) {
          finsEnAttenteRef.current = [...finsEnAttenteRef.current, reponse.minuteur];
          setNbFinsEnAttente(finsEnAttenteRef.current.length);
        }
        marquerFini(reponse.minuteur);
      } catch {
        // Sera retenté au prochain déclenchement (relecture, retour au
        // premier plan) : ne jamais perdre une fin à cause d'un réseau coupé.
        dejaPrisEnCharge.current.delete(minuteur.id);
      }
    },
    [charger, marquerFini, planifier]
  );

  // Réveil à l'instant exact où le prochain minuteur arrive à zéro, et
  // seulement si un chat est ouvert pour recevoir la suite.
  useEffect(() => {
    if (nbChatsOuverts === 0) return;
    const enCours = minuteurs.filter((m) => m.statut === "en_cours" && !dejaPrisEnCharge.current.has(m.id));
    if (enCours.length === 0) return;
    const maintenant = () => Date.now() + decalageMs;
    const prochaineFin = Math.min(...enCours.map((m) => Date.parse(m.fin_prevue)));
    const delai = Math.max(0, prochaineFin - maintenant());
    const id = setTimeout(() => {
      for (const m of enCours) {
        if (Date.parse(m.fin_prevue) <= maintenant()) void prendreEnChargeFin(m);
      }
    }, delai);
    return () => clearTimeout(id);
  }, [minuteurs, decalageMs, nbChatsOuverts, prendreEnChargeFin]);

  const lancer = useCallback(
    async (dureeSecondes: number, options?: { titre?: string; conversationId?: string }) => {
      try {
        const reponse = await lancerMinuteur({
          duree_secondes: dureeSecondes,
          titre: options?.titre ?? null,
          conversation_id: options?.conversationId ?? null,
        });
        setMinuteurs((prec) => [...prec.filter((m) => m.id !== reponse.minuteur.id), reponse.minuteur]);
        void charger();
      } catch (e) {
        signalerErreur(e);
      }
    },
    [charger, signalerErreur]
  );

  const ajuster = useCallback(
    async (id: string, deltaSecondes: number) => {
      try {
        const reponse = await ajusterMinuteur(id, deltaSecondes);
        setMinuteurs((prec) => prec.map((m) => (m.id === id ? reponse.minuteur : m)));
      } catch (e) {
        signalerErreur(e);
        void charger();
      }
    },
    [charger, signalerErreur]
  );

  const arreter = useCallback(
    async (id: string) => {
      try {
        const reponse = await arreterMinuteur(id);
        marquerFini(reponse.minuteur);
      } catch (e) {
        signalerErreur(e);
        void charger();
      }
    },
    [charger, marquerFini, signalerErreur]
  );

  const prendreFinEnAttente = useCallback((): Minuteur | null => {
    const [premiere, ...reste] = finsEnAttenteRef.current;
    if (!premiere) return null;
    finsEnAttenteRef.current = reste;
    setNbFinsEnAttente(reste.length);
    return premiere;
  }, []);

  const enregistrerChat = useCallback(() => {
    setNbChatsOuverts((n) => n + 1);
    return () => setNbChatsOuverts((n) => Math.max(0, n - 1));
  }, []);

  return useMemo(
    () => ({
      minuteurs,
      decalageMs,
      nbFinsEnAttente,
      erreur,
      lancer,
      ajuster,
      arreter,
      prendreFinEnAttente,
      enregistrerChat,
    }),
    [minuteurs, decalageMs, nbFinsEnAttente, erreur, lancer, ajuster, arreter, prendreFinEnAttente, enregistrerChat]
  );
}
