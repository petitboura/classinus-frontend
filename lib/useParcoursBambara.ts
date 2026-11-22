"use client";

// Page bambara (22/11/2026, demande de Bourama) : le parcours d'inscription vocal. Aucune lecture, que des voix et
// des images. Une voix demande le nom, la personne le dit, il est transcrit (Soloni), elle réécoute sa voix et
// la voix de Classinus qui dit ce nom (la synthèse vocale, pour entendre ce que ça donnera quand c'est Classinus qui le dira).
// Puis un choix visuel femme ou homme, puis une présentation facultative parlée. À chaque étape une voix explique
// quoi faire. Ces phrases ne sont pas dans le code : elles viennent de Supabase (lib/parcoursBambara.ts) et sont
// lues par la synthèse vocale. Une phrase absente est simplement sautée.

import { useCallback, useEffect, useRef, useState } from "react";
import { messageDepuisEnregistrement, messageDepuisTampons, type MessageAudioBambara } from "./audioMessageBambara";
import { listerTextesParcoursBambara, type CleTexteParcours, type GenreProfil, type TextesParcours } from "./parcoursBambara";
import { synthetiserVoixBambara, transcrireVoixBambara } from "./voixBambaraApi";
import { creerLecteurBambara, type LecteurBambara } from "./voixBambaraLecture";
import { ouvrirMicro, type Micro, type ReperesParole } from "./voixBambaraMicro";


export type EtapeParcours = "nom" | "genre" | "presentation" | "fin";
/** consigne : la voix explique. ecoute : le micro attend la parole. traitement : transcription en cours. pret : le résultat est là. */
export type PhaseParcours = "consigne" | "ecoute" | "traitement" | "pret";

type Options = {
  /** Crée le profil sur le serveur. Renvoie false s'il a refusé ou n'a pas répondu. */
  creer: (nom: string, genre: GenreProfil, presentation: string | null) => Promise<boolean>;
  /** Le parcours est fini : le profil existe et est choisi. */
  surTermine: () => void;
};

const NOMBRE_ETAPES: Record<EtapeParcours, number> = { nom: 0, genre: 1, presentation: 2, fin: 3 };

export function numeroEtapeParcours(etape: EtapeParcours): number {
  return NOMBRE_ETAPES[etape];
}

export function useParcoursBambara({ creer, surTermine }: Options) {
  const [etape, setEtape] = useState<EtapeParcours>("nom");
  const [phase, setPhase] = useState<PhaseParcours>("consigne");
  const [nom, setNom] = useState("");
  const [voixNom, setVoixNom] = useState<MessageAudioBambara | null>(null);
  const [voixClassinus, setVoixClassinus] = useState<MessageAudioBambara | null>(null);
  const [genre, setGenre] = useState<GenreProfil | null>(null);
  const [presentation, setPresentation] = useState("");
  const [voixPresentation, setVoixPresentation] = useState<MessageAudioBambara | null>(null);
  const [enLecture, setEnLecture] = useState<string | null>(null);
  const [niveau, setNiveau] = useState(0);
  const [microRefuse, setMicroRefuse] = useState(false);
  const [enregistrement, setEnregistrement] = useState<"attente" | "en_cours" | "echec">("attente");

  const contexteRef = useRef<AudioContext | null>(null);
  const lecteurRef = useRef<LecteurBambara | null>(null);
  const microRef = useRef<Micro | null>(null);
  const textesRef = useRef<Promise<TextesParcours>>(Promise.resolve({}));
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  // Chaque changement d'étape ou de reprise change la séquence : ce qui était en cours dans l'ancienne s'arrête de lui même.
  const sequenceRef = useRef(0);
  const fermeRef = useRef(false);
  const etapeRef = useRef<EtapeParcours>("nom");
  const nomRef = useRef("");
  const genreRef = useRef<GenreProfil | null>(null);
  const presentationRef = useRef("");
  const surTermineRef = useRef(surTermine);
  surTermineRef.current = surTermine;
  const creerRef = useRef(creer);
  creerRef.current = creer;

  const arreterSons = useCallback(() => {
    lecteurRef.current?.interrompre();
    const source = sourceRef.current;
    sourceRef.current = null;
    if (source) {
      source.onended = null;
      try { source.stop(); } catch { /* déjà arrêtée */ }
    }
  }, []);

  const dire = useCallback(async (cle: CleTexteParcours, sequence: number) => {
    const textes = await textesRef.current;
    const texte = textes[cle];
    if (!texte || fermeRef.current || sequence !== sequenceRef.current) return;
    try {
      await lecteurRef.current?.lire([texte]);
    } catch {
      // La voix ne répond pas : l'étape continue sans consigne, les images suffisent.
    }
  }, []);

  const jouerTampon = useCallback((tampon: AudioBuffer, sequence: number) => {
    return new Promise<void>((resoudre) => {
      const contexte = contexteRef.current;
      if (!contexte || fermeRef.current || sequence !== sequenceRef.current) return resoudre();
      const source = contexte.createBufferSource();
      source.buffer = tampon;
      source.connect(contexte.destination);
      sourceRef.current = source;
      source.onended = () => {
        if (sourceRef.current === source) sourceRef.current = null;
        resoudre();
      };
      source.start();
    });
  }, []);

  const traiterParoleRef = useRef<(audio: Blob, mime: string, reperes: ReperesParole) => void>(() => {});

  /** Ouvre l'écoute : le micro attend que la personne parle et la prise de parole arrive dans traiterParole. */
  const ecouter = useCallback(async () => {
    const contexte = contexteRef.current;
    if (!contexte || fermeRef.current) return;
    try {
      if (!microRef.current) {
        microRef.current = await ouvrirMicro({
          contexte,
          surEnregistrement: (audio, mime, reperes) => traiterParoleRef.current(audio, mime, reperes),
        });
      }
      if (fermeRef.current) return;
      if (contexte.state === "suspended") await contexte.resume().catch(() => {});
      setMicroRefuse(false);
      setPhase("ecoute");
      microRef.current.ecouter();
    } catch {
      setMicroRefuse(true);
      setPhase("ecoute");
    }
  }, []);

  traiterParoleRef.current = async (audio, mime, reperes) => {
    const contexte = contexteRef.current;
    const sequence = sequenceRef.current;
    const etapeCourante = etapeRef.current;
    if (!contexte || fermeRef.current || (etapeCourante !== "nom" && etapeCourante !== "presentation")) return;
    microRef.current?.pause();
    setPhase("traitement");
    try {
      const transcription = transcrireVoixBambara(audio, mime);
      transcription.catch(() => {});
      const message = await messageDepuisEnregistrement(contexte, audio, reperes.debutMs, reperes.finMs);
      const texte = await transcription;
      if (fermeRef.current || sequence !== sequenceRef.current) return;
      if (!texte) {
        // Rien de compris (bruit) : on se remet à écouter.
        void ecouter();
        return;
      }
      if (etapeCourante === "presentation") {
        presentationRef.current = texte;
        setPresentation(texte);
        setVoixPresentation(message);
        setPhase("pret");
        return;
      }
      const nomPropre = texte.trim().slice(0, 60);
      nomRef.current = nomPropre;
      setNom(nomPropre);
      setVoixNom(message);
      setVoixClassinus(null);
      setPhase("pret");
      // La voix de Classinus dit le nom : la personne entend ce que ça donnera. Puis la consigne de réécoute.
      const brut = await synthetiserVoixBambara(nomPropre);
      const tampon = await contexte.decodeAudioData(brut);
      if (fermeRef.current || sequence !== sequenceRef.current) return;
      setVoixClassinus(messageDepuisTampons([tampon]));
      await jouerTampon(tampon, sequence);
      await dire("nom_reecoute", sequence);
    } catch {
      if (fermeRef.current || sequence !== sequenceRef.current) return;
      // Le serveur n'a pas répondu : on se remet à écouter, la personne peut redire.
      void ecouter();
    }
  };

  // Ouverture : le contexte audio est créé tout de suite (le toucher qui ouvre le parcours autorise le son), les phrases se chargent, puis la première consigne.
  useEffect(() => {
    fermeRef.current = false;
    const Contexte = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const contexte = new Contexte();
    contexteRef.current = contexte;
    lecteurRef.current = creerLecteurBambara(contexte, (texte) => synthetiserVoixBambara(texte));
    textesRef.current = listerTextesParcoursBambara().catch(() => ({}));
    const sequence = sequenceRef.current;
    void (async () => {
      await dire("nom_demande", sequence);
      if (!fermeRef.current && sequence === sequenceRef.current) await ecouter();
    })();
    return () => {
      fermeRef.current = true;
      sequenceRef.current += 1;
      arreterSons();
      microRef.current?.fermer();
      microRef.current = null;
      void contexte.close().catch(() => {});
    };
    // Une seule ouverture : le parcours se monte puis se démonte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Le niveau sonore du micro fait respirer le grand bouton pendant l'écoute.
  useEffect(() => {
    if (phase !== "ecoute") {
      setNiveau(0);
      return;
    }
    const minuteur = setInterval(() => setNiveau(microRef.current?.niveau() ?? 0), 90);
    return () => clearInterval(minuteur);
  }, [phase]);

  const changerEtape = useCallback(
    (suivante: EtapeParcours) => {
      sequenceRef.current += 1;
      arreterSons();
      microRef.current?.pause();
      setEnLecture(null);
      etapeRef.current = suivante;
      setEtape(suivante);
      setPhase("consigne");
      return sequenceRef.current;
    },
    [arreterSons]
  );

  /** Le nom est bon : étape du genre. */
  const validerNom = useCallback(() => {
    if (!nomRef.current) return;
    const sequence = changerEtape("genre");
    void dire("genre_demande", sequence);
  }, [changerEtape, dire]);

  /** Redire le nom (ou la présentation) : on repart à l'écoute, sans reposer la question. */
  const refaire = useCallback(() => {
    sequenceRef.current += 1;
    arreterSons();
    setEnLecture(null);
    if (etapeRef.current === "nom") {
      nomRef.current = "";
      setNom("");
      setVoixNom(null);
      setVoixClassinus(null);
    } else {
      presentationRef.current = "";
      setPresentation("");
      setVoixPresentation(null);
    }
    void ecouter();
  }, [arreterSons, ecouter]);

  /** Un choix visuel : le genre est retenu, puis on passe à la présentation. */
  const choisirGenre = useCallback(
    (choix: GenreProfil) => {
      genreRef.current = choix;
      setGenre(choix);
      const sequence = changerEtape("presentation");
      void (async () => {
        await dire("presentation_demande", sequence);
        if (!fermeRef.current && sequence === sequenceRef.current) await ecouter();
      })();
    },
    [changerEtape, dire, ecouter]
  );

  /** Réécoute la consigne de l'étape en cours. */
  const reecouterConsigne = useCallback(() => {
    const cle: CleTexteParcours = etapeRef.current === "nom" ? "nom_demande" : etapeRef.current === "genre" ? "genre_demande" : "presentation_demande";
    sequenceRef.current += 1;
    const sequence = sequenceRef.current;
    arreterSons();
    microRef.current?.pause();
    setEnLecture(null);
    void (async () => {
      await dire(cle, sequence);
      if (!fermeRef.current && sequence === sequenceRef.current && (etapeRef.current === "nom" || etapeRef.current === "presentation")) {
        await ecouter();
      }
    })();
  }, [arreterSons, dire, ecouter]);

  /** Enregistre le profil (avec ou sans présentation), puis la voix dit la fin et le parcours se ferme. */
  const terminer = useCallback(
    async (avecPresentation: boolean) => {
      const genreChoisi = genreRef.current;
      if (!nomRef.current || !genreChoisi) return;
      const sequence = changerEtape("fin");
      setEnregistrement("en_cours");
      const reussi = await creerRef.current(nomRef.current, genreChoisi, avecPresentation ? presentationRef.current || null : null);
      if (fermeRef.current) return;
      if (!reussi) {
        setEnregistrement("echec");
        return;
      }
      setEnregistrement("attente");
      await dire("fin", sequence);
      if (!fermeRef.current) surTermineRef.current();
    },
    [changerEtape, dire]
  );

  return {
    etape,
    phase,
    nom,
    voixNom,
    voixClassinus,
    genre,
    presentation,
    voixPresentation,
    enLecture,
    changerLecture: setEnLecture,
    niveau,
    microRefuse,
    enregistrement,
    validerNom,
    refaire,
    choisirGenre,
    reecouterConsigne,
    terminer,
    reessayerMicro: ecouter,
  };
}
