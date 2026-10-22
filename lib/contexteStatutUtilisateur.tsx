"use client";

// 26/09/2026, demande Bourama : correctif après un premier retour sur le
// réglage "Es-tu prof ?" (voir BureauAccueil.tsx et
// SectionPageBureau.tsx). Bourama a signalé deux problèmes :
//  1) le menu des pages voisines / les onglets mobile de Bureau
//     continuaient à lister les 3 sections prof-only même quand
//     est_professeur est à false (ils ne lisaient pas ce réglage) ;
//  2) chaque composant qui avait besoin de savoir (BureauAccueil,
//     ParametresPreferences) rappelait GET /moi/statut lui-même à
//     chaque montage -- un aller-retour réseau à chaque clic/écran pour
//     une valeur qui ne change presque jamais. "on le vérifie une fois
//     en arrière-plan quand il ouvre l'appli [...] on garde ça, point."
//
// Ce fichier centralise donc UNE lecture par session d'appli (montée
// dans components/AppShell.tsx, comme lib/contexteMinuteurs.tsx et les
// autres contextes globaux) : tout composant qui a besoin de
// est_professeur lit ce contexte au lieu de rappeler l'API. La valeur
// n'est réenregistrée que par une action explicite de l'utilisateur
// (definirEstProfesseur, appelé depuis BureauAccueil ou
// ParametresPreferences), jamais reluе automatiquement ensuite.

import { createContext, useCallback, useEffect, useState } from "react";
import { obtenirMonStatut, enregistrerMonProfil } from "@/lib/api";
import { hydraterModelePrefere } from "@/lib/modeleActif";
import { aChoisiLocale, definirLocale, obtenirLocale, type Locale } from "@/lib/i18n/locale";

export type ValeurStatutUtilisateur = {
  /** true tant que la lecture initiale (une seule, au tout premier montage) n'est pas revenue. */
  chargement: boolean;
  /** null = jamais répondu à "Es-tu prof ?" (ou visiteur sans compte). */
  estProfesseur: boolean | null;
  /** false tant que la session n'a pas été vérifiée, ou pour un visiteur sans compte. */
  connecte: boolean;
  /** Enregistre la réponse (optimiste, revient en arrière si l'écriture échoue). */
  definirEstProfesseur: (valeur: boolean) => Promise<void>;
  // 27/09/2026, chantier "traduction erreurs execution" : même
  // convention que estProfesseur ci-dessus -- null = jamais répondu
  // (question posée au premier clic sur "Traduire", voir
  // SortieExecutionCode.tsx).
  /** null = jamais choisi de langue cible pour la traduction des erreurs. */
  langueCibleErreurs: string | null;
  /** null/false = traduction à la demande seulement, true = automatique. */
  traductionAutoErreurs: boolean | null;
  definirLangueCibleErreurs: (valeur: string) => Promise<void>;
  definirTraductionAutoErreurs: (valeur: boolean) => Promise<void>;
  // 22/10/2026, demande Bourama : la langue de l'interface vit dans
  // Paramètres (plus de pastille FR/EN flottante) et sur le compte.
  /** Change la langue tout de suite sur l'appareil, puis l'enregistre sur le compte (et aligne la langue des erreurs). */
  definirLangueInterface: (valeur: Locale) => Promise<void>;
};

/** Langue des erreurs d'exécution alignée sur la langue de l'interface. */
const LANGUE_ERREURS_PAR_LOCALE: Record<Locale, string> = { fr: "Français", en: "Anglais" };

export const ContexteStatutUtilisateur = createContext<ValeurStatutUtilisateur>({
  chargement: true,
  estProfesseur: null,
  connecte: false,
  definirEstProfesseur: async () => {},
  langueCibleErreurs: null,
  traductionAutoErreurs: null,
  definirLangueCibleErreurs: async () => {},
  definirTraductionAutoErreurs: async () => {},
  definirLangueInterface: async () => {},
});

export function useFournirStatutUtilisateur(): ValeurStatutUtilisateur {
  const [chargement, setChargement] = useState(true);
  const [estProfesseur, setEstProfesseur] = useState<boolean | null>(null);
  const [connecte, setConnecte] = useState(false);
  const [langueCibleErreurs, setLangueCibleErreurs] = useState<string | null>(null);
  const [traductionAutoErreurs, setTraductionAutoErreurs] = useState<boolean | null>(null);

  // Bug corrigé le 26/09/2026 (remonté par Bourama : "j'ai l'impression
  // qu'il demande à chaque fois") : la première version dépendait du
  // `connecte` calculé séparément par AppShell.tsx (lui-même déterminé de
  // façon async par supabase.auth.getSession(), voir plus haut dans ce
  // fichier). `connecte` vaut `false` à la fois "pas encore vérifié" et
  // "vraiment pas de compte" -- ambiguïté déjà présente ailleurs dans
  // AppShell (ex. le flag `natif`), tolérée là où elle ne cause qu'un
  // flash discret. Ici elle causait : chargement passait à false une
  // première fois pendant que connecte valait encore faussement false
  // (branche "pas de compte"), PUIS connecte devenait vrai un instant
  // après -- une fenêtre où estProfesseur valait encore null (vraie
  // lecture pas encore relancée) s'ouvrait, affichant la question "Es-tu
  // prof ?" par erreur avant de se corriger. Vérifié en base : la
  // réponse était bien enregistrée (false), seul l'affichage clignotait.
  //
  // Correctif : un seul appel, indépendant de `connecte` externe --
  // GET /moi/statut échoue de lui-même (401) pour un visiteur sans
  // compte (voir le catch ci-dessous), pas besoin de le deviner avant.
  useEffect(() => {
    let annule = false;
    obtenirMonStatut()
      .then((s) => {
        if (annule) return;
        setEstProfesseur(s.est_professeur);
        setLangueCibleErreurs(s.langue_cible_erreurs);
        setTraductionAutoErreurs(s.traduction_auto_erreurs);
        // 15/10/2026 : le dernier modèle choisi, retrouvé sur n'importe quel appareil.
        hydraterModelePrefere(s.modele_prefere);
        // 22/10/2026 : la langue du compte l'emporte sur celle de l'appareil.
        // Compte sans langue : on n'enregistre que si la personne en avait
        // déjà choisi une sur cet appareil (jamais le simple français par défaut).
        if (s.langue_interface) {
          if (s.langue_interface !== obtenirLocale()) definirLocale(s.langue_interface);
        } else if (aChoisiLocale()) {
          enregistrerMonProfil({ langue_interface: obtenirLocale() }).catch(() => {});
        }
        setConnecte(true);
      })
      .catch(() => {
        // Visiteur sans compte (401) ou lecture en échec : reste sur
        // connecte=false, estProfesseur=null (traité comme "tout
        // afficher", jamais bloquant -- voir BureauAccueil.tsx et
        // SectionPageBureau.tsx).
      })
      .finally(() => {
        if (!annule) setChargement(false);
      });
    return () => {
      annule = true;
    };
  }, []);

  const definirEstProfesseur = useCallback(async (valeur: boolean) => {
    const precedent = estProfesseur;
    setEstProfesseur(valeur); // optimiste
    try {
      await enregistrerMonProfil({ est_professeur: valeur });
    } catch (e) {
      setEstProfesseur(precedent);
      throw e;
    }
  }, [estProfesseur]);

  const definirLangueCibleErreurs = useCallback(async (valeur: string) => {
    const precedent = langueCibleErreurs;
    setLangueCibleErreurs(valeur); // optimiste
    try {
      await enregistrerMonProfil({ langue_cible_erreurs: valeur });
    } catch (e) {
      setLangueCibleErreurs(precedent);
      throw e;
    }
  }, [langueCibleErreurs]);

  const definirTraductionAutoErreurs = useCallback(async (valeur: boolean) => {
    const precedent = traductionAutoErreurs;
    setTraductionAutoErreurs(valeur); // optimiste
    try {
      await enregistrerMonProfil({ traduction_auto_erreurs: valeur });
    } catch (e) {
      setTraductionAutoErreurs(precedent);
      throw e;
    }
  }, [traductionAutoErreurs]);

  const definirLangueInterface = useCallback(async (valeur: Locale) => {
    definirLocale(valeur); // immédiat sur l'appareil, même sans compte
    if (!connecte) return;
    const langueErreursPrecedente = langueCibleErreurs;
    setLangueCibleErreurs(LANGUE_ERREURS_PAR_LOCALE[valeur]); // optimiste
    try {
      await enregistrerMonProfil({
        langue_interface: valeur,
        langue_cible_erreurs: LANGUE_ERREURS_PAR_LOCALE[valeur],
      });
    } catch (e) {
      setLangueCibleErreurs(langueErreursPrecedente);
      throw e;
    }
  }, [connecte, langueCibleErreurs]);

  return {
    chargement,
    estProfesseur,
    connecte,
    definirEstProfesseur,
    langueCibleErreurs,
    traductionAutoErreurs,
    definirLangueCibleErreurs,
    definirTraductionAutoErreurs,
    definirLangueInterface,
  };
}
