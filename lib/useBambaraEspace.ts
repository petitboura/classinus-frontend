"use client";

// Page bambara (18/11/2026, demande de Bourama) : tout ce que la page garde pour la personne. Les profils du
// compte et celui qui est choisi, les conversations de l'historique et les vidéos et images gardées. Chaque
// profil a son propre historique et ses propres éléments gardés ; sans profil choisi, ils vont dans un espace
// commun du compte. Les échecs du serveur sont silencieux : la page reste utilisable sans rien montrer.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  creerProfilBambara,
  garderBambara,
  listerConversationsBambara,
  listerGardesBambara,
  listerProfilsBambara,
  retirerGardeBambara,
  type ConversationBambara,
  type GardeBambara,
  type ProfilBambara,
} from "./bambaraEspace";
import type { VisuelBambara } from "./pageBambaraVisuels";

const CLE_PROFIL_CHOISI = "classinus.bambara.profil";

function lireProfilChoisi(): string | null {
  try {
    return window.localStorage.getItem(CLE_PROFIL_CHOISI);
  } catch {
    return null;
  }
}

function ecrireProfilChoisi(id: string | null) {
  try {
    if (id) window.localStorage.setItem(CLE_PROFIL_CHOISI, id);
    else window.localStorage.removeItem(CLE_PROFIL_CHOISI);
  } catch {
    // Stockage du navigateur indisponible (navigation privée) : le choix reste valable jusqu'au rechargement.
  }
}

export function useBambaraEspace(actif: boolean) {
  const [profils, setProfils] = useState<ProfilBambara[]>([]);
  const [profilId, setProfilId] = useState<string | null>(null);
  const [gardes, setGardes] = useState<GardeBambara[]>([]);
  const [conversations, setConversations] = useState<ConversationBambara[] | null>(null);
  // Une réponse du serveur qui arrive après un changement de profil est ignorée.
  const generationRef = useRef(0);
  const profilIdRef = useRef<string | null>(null);
  profilIdRef.current = profilId;

  // Les profils du compte, puis celui qui était choisi la dernière fois s'il existe encore.
  useEffect(() => {
    if (!actif) return;
    let annule = false;
    void listerProfilsBambara()
      .then((liste) => {
        if (annule) return;
        setProfils(liste);
        const memorise = lireProfilChoisi();
        if (memorise && liste.some((p) => p.id === memorise)) setProfilId(memorise);
        else if (memorise) ecrireProfilChoisi(null);
      })
      .catch(() => undefined);
    return () => {
      annule = true;
    };
  }, [actif]);

  // Les éléments gardés du profil choisi : ils servent à montrer quels cœurs sont pleins.
  useEffect(() => {
    if (!actif) return;
    const generation = (generationRef.current += 1);
    setGardes([]);
    void listerGardesBambara(profilId)
      .then((liste) => {
        if (generation === generationRef.current) setGardes(liste);
      })
      .catch(() => undefined);
  }, [actif, profilId]);

  const choisirProfil = useCallback((id: string | null) => {
    ecrireProfilChoisi(id);
    setConversations(null);
    setProfilId(id);
  }, []);

  /** Crée un profil et le choisit. Renvoie false si le serveur l'a refusé ou n'a pas répondu. */
  const creerProfil = useCallback(
    async (nom: string, prenom: string): Promise<boolean> => {
      try {
        const profil = await creerProfilBambara(nom, prenom);
        setProfils((precedents) => [...precedents, profil]);
        choisirProfil(profil.id);
        return true;
      } catch {
        return false;
      }
    },
    [choisirProfil]
  );

  const chargerConversations = useCallback(() => {
    const profil = profilIdRef.current;
    setConversations(null);
    void listerConversationsBambara(profil)
      .then((liste) => {
        if (profil === profilIdRef.current) setConversations(liste);
      })
      .catch(() => {
        if (profil === profilIdRef.current) setConversations([]);
      });
  }, []);

  const gardeDeUrl = useCallback((url: string) => gardes.find((g) => g.url === url) ?? null, [gardes]);

  /** Garde l'élément s'il ne l'est pas, le retire sinon. Le cœur change tout de suite, le serveur suit. */
  const basculerGarde = useCallback(
    (visuel: VisuelBambara) => {
      const profil = profilIdRef.current;
      const existante = gardes.find((g) => g.url === visuel.url);
      if (existante) {
        setGardes((precedents) => precedents.filter((g) => g.url !== visuel.url));
        void retirerGardeBambara(existante.id).catch(() => {
          setGardes((precedents) => (precedents.some((g) => g.url === existante.url) ? precedents : [existante, ...precedents]));
        });
        return;
      }
      const provisoire: GardeBambara = {
        id: "provisoire:" + visuel.url,
        genre: visuel.genre,
        url: visuel.url,
        titre: visuel.titre,
        miniature: visuel.miniature ?? null,
        id_video: visuel.idVideo ?? null,
      };
      setGardes((precedents) => [provisoire, ...precedents]);
      void garderBambara(profil, visuel)
        .then((reelle) => {
          if (profil !== profilIdRef.current) return;
          setGardes((precedents) => precedents.map((g) => (g.id === provisoire.id ? reelle : g)));
        })
        .catch(() => {
          setGardes((precedents) => precedents.filter((g) => g.id !== provisoire.id));
        });
    },
    [gardes]
  );

  return {
    profils,
    profilId,
    choisirProfil,
    creerProfil,
    gardes,
    gardeDeUrl,
    basculerGarde,
    conversations,
    chargerConversations,
  };
}

export type EspaceBambara = ReturnType<typeof useBambaraEspace>;
