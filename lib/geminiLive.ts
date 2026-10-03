"use client";

import { supabase } from "./supabase";
import { appelerApiStream } from "./api";
import { ajouterTourDirect, lireEtatConversation, type IdMessage } from "./conversationPartagee";

// Le modèle vocal, l'adresse de connexion, les consignes, la phrase d'accueil et la
// description de l'outil ne sont plus écrits ici : ils viennent du serveur avec le
// jeton (voir core/gemini_live_config.py côté backend), pour pouvoir les changer
// sans toucher à ce fichier.
type ReponseToken = {
  token: string;
  model: string;
  url: string;
  consignes: string;
  accueil: string;
  description_outil: string;
  relance_attente: string;
  annonce_reponse: string;
  annonce_bulle: string;
  delai_relance_secondes: number;
  relances_max: number;
  description_outil_silence: string;
  description_outil_reveil: string;
  proactivite: boolean;
};
type OptionsGeminiLive = {
  conversationId: string;
  surEtat?: (etat: "connexion" | "connecte" | "ecoute" | "reponse" | "travail" | "silence" | "erreur" | "ferme") => void;
  surErreur?: (message: string) => void;
  // La voix est un interprète : elle transmet la demande à Classinus par cette
  // fonction et reçoit en retour sa réponse écrite. Sans elle, chemin direct.
  surDemande?: (question: string) => Promise<string>;
};

// Niveaux sonores instantanés entre 0 et 1 : la voix de l'étudiant (micro) et
// celle de Classinus (haut parleur). Lus à chaque image par l'onde à l'écran.
export type NiveauxVoix = { entree: number; sortie: number };

export type SessionGeminiLive = {
  niveaux: () => NiveauxVoix;
  fermer: () => void;
  interrompre: () => void;
  // Réponse écrite de Clovis à un message tapé dans le chat : la voix en dit l'essentiel.
  annoncerReponse: (texte: string) => void;
  // Canal en direct : lit à voix haute un message de la bulle de Classinus.
  direMessageBulle: (texte: string) => void;
};

const NOM_OUTIL_CLOVIS = "demander_a_clovis";
// Silence décidé par la voix elle même : elle appelle ces deux outils, le navigateur
// applique sa décision (il jette tout son qui arrive tant que le silence dure).
const NOM_OUTIL_SILENCE = "se_taire";
const NOM_OUTIL_REVEIL = "reprendre_la_parole";

function declarerOutilSansParametre(name: string, description: string) {
  return { name, description };
}

function declarerOutilClovis(description: string) {
  return {
    name: NOM_OUTIL_CLOVIS,
    description,
    parameters: {
      type: "OBJECT",
      properties: {
        question: { type: "STRING", description: "La demande de l étudiant, transmise fidèlement avec ses propres mots." },
      },
      required: ["question"],
    },
  };
}

// Chemin direct vers Classinus, sans passer par le chat affiché : utilisé seulement
// quand aucun chat n'est ouvert pour recevoir la demande.
export async function demanderAClovisDirectement(question: string, conversationId: string): Promise<string> {
  let reponseClovis = "";
  let idUser: IdMessage | null = null;
  let idAssistant: IdMessage | null = null;
  // Suite de la conversation, pas un nouveau départ : historique et parent_id
  // viennent de l'état partagé (voir lib/conversationPartagee.ts).
  const etat = lireEtatConversation(conversationId);
  await appelerApiStream("/api/chat", { message: question, agent_id: "clovis", historique: etat.historique, conversation_id: conversationId, parent_id: etat.dernierMessageId, longueur_reponse: "moyenne", canal_en_direct: true, fuseau_horaire: Intl.DateTimeFormat().resolvedOptions().timeZone }, (evenement) => {
    if (evenement?.type === "reponse" && typeof evenement.texte === "string") reponseClovis += evenement.texte;
    else if (evenement?.type === "meta") {
      idUser = evenement.message_id_user ?? idUser;
      idAssistant = evenement.message_id_assistant ?? idAssistant;
    }
  });
  ajouterTourDirect(conversationId, question, reponseClovis, idUser, idAssistant);
  return reponseClovis;
}

function base64VersInt16(base64: string): Int16Array {
  const binaire = atob(base64);
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i += 1) octets[i] = binaire.charCodeAt(i);
  return new Int16Array(octets.buffer);
}

function int16VersBase64(samples: Int16Array): string {
  const octets = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength);
  let resultat = "";
  const taille = 0x8000;
  for (let i = 0; i < octets.length; i += taille) {
    resultat += String.fromCharCode(...octets.subarray(i, Math.min(i + taille, octets.length)));
  }
  return btoa(resultat);
}

function convertirFloat32EnPcm16(input: Float32Array, sampleRate: number): Int16Array {
  const ratio = sampleRate / 16000;
  const longueur = Math.max(1, Math.floor(input.length / ratio));
  const sortie = new Int16Array(longueur);
  for (let i = 0; i < longueur; i += 1) {
    const position = i * ratio;
    const gauche = Math.floor(position);
    const fraction = position - gauche;
    const a = input[Math.min(gauche, input.length - 1)] ?? 0;
    const b = input[Math.min(gauche + 1, input.length - 1)] ?? a;
    const valeur = a + (b - a) * fraction;
    sortie[i] = Math.max(-32768, Math.min(32767, Math.round(valeur * 32767)));
  }
  return sortie;
}

function creerLecteurAudio(contexte: AudioContext, sortie: AudioNode) {
  let prochainDebut = contexte.currentTime;
  const sources = new Set<AudioBufferSourceNode>();
  return {
    jouer(pcm: Int16Array) {
      if (!pcm.length) return;
      const buffer = contexte.createBuffer(1, pcm.length, 24000);
      const canal = buffer.getChannelData(0);
      for (let i = 0; i < pcm.length; i += 1) canal[i] = pcm[i] / 32768;
      const source = contexte.createBufferSource();
      source.buffer = buffer;
      source.connect(sortie);
      prochainDebut = Math.max(prochainDebut, contexte.currentTime);
      source.start(prochainDebut);
      prochainDebut += buffer.duration;
      sources.add(source);
      source.onended = () => sources.delete(source);
    },
    interrompre() {
      for (const source of sources) { try { source.stop(); } catch {} }
      sources.clear();
      prochainDebut = contexte.currentTime;
    },
  };
}

async function obtenirToken(): Promise<ReponseToken> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Connecte-toi pour utiliser le canal vocal.");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL est requis.");
  const reponse = await fetch(apiUrl + "/api/gemini-live/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
  });
  if (!reponse.ok) throw new Error("Impossible d initialiser le canal vocal.");
  return reponse.json();
}

export async function ouvrirGeminiLive(options: OptionsGeminiLive): Promise<SessionGeminiLive> {
  const signalerEtat = options.surEtat ?? (() => {});
  // On retient l'état courant : les nouvelles de patience ne partent jamais
  // pendant que la voix parle déjà.
  let etatCourant = "connexion";
  // Vrai tant que l'étudiant a demandé à la voix de se taire : elle continue d'entendre
  // (c'est elle qui décide quand reparler) mais rien de ce qu'elle dit n'est joué.
  let silencieux = false;
  // Nombre de demandes en cours chez Classinus : tant qu'il y en a, la voix est
  // en mode "travail" (l'onde respire) dès qu'elle ne parle plus.
  let demandesEnCours = 0;
  const etat = (nouvelEtat: Parameters<typeof signalerEtat>[0]) => {
    const horsSilence = nouvelEtat === "ferme" || nouvelEtat === "erreur" || nouvelEtat === "connexion" || nouvelEtat === "connecte";
    const etatFinal = silencieux && !horsSilence ? "silence" : nouvelEtat === "ecoute" && demandesEnCours > 0 ? "travail" : nouvelEtat;
    etatCourant = etatFinal;
    signalerEtat(etatFinal);
  };
  etat("connexion");
  const token = await obtenirToken();
  if (!token.model || !token.url) throw new Error("Impossible d initialiser le canal vocal.");
  const outilClovis = declarerOutilClovis(token.description_outil);
  const outilSilence = declarerOutilSansParametre(NOM_OUTIL_SILENCE, token.description_outil_silence);
  const outilReveil = declarerOutilSansParametre(NOM_OUTIL_REVEIL, token.description_outil_reveil);

  const entree = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  const contexteEntree = new AudioContext();
  const contexteSortie = new AudioContext({ sampleRate: 24000 });
  await contexteEntree.resume();
  await contexteSortie.resume();
  // La connexion est ouverte seulement ici, après le micro et le son, pour que les écouteurs
  // (ouverture, messages, fermeture) soient posés avant toute annonce de Google.
  const websocket = new WebSocket(token.url + "?access_token=" + encodeURIComponent(token.token));
  // Deux analyseurs pour mesurer le niveau sonore en direct : micro et haut parleur.
  const analyseurSortie = contexteSortie.createAnalyser();
  analyseurSortie.fftSize = 512;
  analyseurSortie.connect(contexteSortie.destination);
  const lecteur = creerLecteurAudio(contexteSortie, analyseurSortie);
  const source = contexteEntree.createMediaStreamSource(entree);
  const analyseurEntree = contexteEntree.createAnalyser();
  analyseurEntree.fftSize = 512;
  source.connect(analyseurEntree);
  const tamponEntree = new Uint8Array(analyseurEntree.fftSize);
  const tamponSortie = new Uint8Array(analyseurSortie.fftSize);
  const mesurerNiveau = (analyseur: AnalyserNode, tampon: Uint8Array<ArrayBuffer>): number => {
    analyseur.getByteTimeDomainData(tampon);
    let somme = 0;
    for (let i = 0; i < tampon.length; i += 1) {
      const v = (tampon[i] - 128) / 128;
      somme += v * v;
    }
    return Math.min(1, Math.sqrt(somme / tampon.length) * 4);
  };
  const niveaux = (): NiveauxVoix =>
    ferme ? { entree: 0, sortie: 0 } : { entree: mesurerNiveau(analyseurEntree, tamponEntree), sortie: mesurerNiveau(analyseurSortie, tamponSortie) };
  const processeur = contexteEntree.createScriptProcessor(4096, 1, 1);
  const silence = contexteEntree.createGain();
  silence.gain.value = 0;
  let ferme = false;
  let connecte = false;
  const minuteursRelance = new Set<ReturnType<typeof setInterval>>();
  let pret = false;
  let erreurSignalee = false;

  const nettoyer = () => {
    if (ferme) return;
    ferme = true;
    minuteursRelance.forEach((minuteur) => clearInterval(minuteur));
    minuteursRelance.clear();
    processeur.disconnect(); source.disconnect(); analyseurEntree.disconnect(); analyseurSortie.disconnect(); silence.disconnect();
    entree.getTracks().forEach((track) => track.stop());
    lecteur.interrompre();
    void contexteEntree.close(); void contexteSortie.close();
    if (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING) websocket.close();
    etat("ferme");
  };

  const interrompre = () => {
    lecteur.interrompre();
    if (websocket.readyState === WebSocket.OPEN) websocket.send(JSON.stringify({ realtimeInput: { activityEnd: {} } }));
  };

  // Tout ce que la voix doit lire à voix haute en dehors d'une demande faite à
  // l'oral passe par cette file, un message à la fois : la réponse écrite à un
  // message tapé dans le chat, et les messages de la bulle du canal en direct.
  // Si la voix parle déjà, ou si un message précédent n'est pas fini d'être lu,
  // le suivant attend son tour au lieu de couper la phrase en cours.
  const annoncesEnAttente: { consigne: string; texte: string }[] = [];
  let annonceEnCours = false;
  // Un même texte n'est jamais lu deux fois de suite (ex. la même réponse
  // affichée à la fois dans le chat et dans la bulle).
  const dernieresAnnonces: string[] = [];
  const dejaDit = (texte: string) => dernieresAnnonces.includes(texte);
  const retenirAnnonce = (texte: string) => {
    dernieresAnnonces.push(texte);
    if (dernieresAnnonces.length > 6) dernieresAnnonces.shift();
  };
  const lireProchaineAnnonce = () => {
    if (ferme || !pret || silencieux || annonceEnCours || etatCourant === "reponse" || websocket.readyState !== WebSocket.OPEN) return;
    const prochaine = annoncesEnAttente.shift();
    if (!prochaine) return;
    annonceEnCours = true;
    websocket.send(JSON.stringify({ realtimeInput: { text: `${prochaine.consigne}\n\n${prochaine.texte}` } }));
  };
  const ajouterAnnonce = (consigne: string | undefined, texte: string) => {
    const propre = texte.trim();
    if (ferme || !pret || silencieux || !propre || !consigne?.trim() || websocket.readyState !== WebSocket.OPEN) return;
    if (dejaDit(propre) || annoncesEnAttente.some((a) => a.texte === propre)) return;
    retenirAnnonce(propre);
    annoncesEnAttente.push({ consigne, texte: propre });
    lireProchaineAnnonce();
  };
  // Réponse écrite de Classinus à un message que l'étudiant a tapé dans le chat :
  // la voix la lit en entier, avec la consigne venue du serveur.
  const annoncerReponse = (texte: string) => ajouterAnnonce(token.annonce_reponse, texte);
  // Message affiché dans la bulle de Classinus (canal en direct).
  const direMessageBulle = (texte: string) => ajouterAnnonce(token.annonce_bulle, texte);

  // Texte envoyé en temps réel (le canal accepte le texte dans realtimeInput,
  // clientContent n'étant prévu que pour l'historique initial).
  const saluer = () => {
    if (!token.accueil.trim() || websocket.readyState !== WebSocket.OPEN) return;
    websocket.send(JSON.stringify({ realtimeInput: { text: token.accueil } }));
  };

  // Pendant que Classinus travaille, la voix ne reste jamais muette : à intervalle
  // régulier (réglages venus du serveur), on lui rappelle de donner un mot de
  // patience, sauf si elle parle déjà. Renvoie la fonction qui arrête ces rappels.
  const demarrerRelances = () => {
    const delai = token.delai_relance_secondes * 1000;
    if (!token.relance_attente?.trim() || !(delai > 0) || !(token.relances_max > 0)) return () => {};
    let envoyees = 0;
    const minuteur = setInterval(() => {
      if (ferme || websocket.readyState !== WebSocket.OPEN) return;
      if (envoyees >= token.relances_max) { clearInterval(minuteur); minuteursRelance.delete(minuteur); return; }
      if (etatCourant === "reponse" || silencieux) return;
      envoyees += 1;
      websocket.send(JSON.stringify({ realtimeInput: { text: token.relance_attente } }));
    }, delai);
    minuteursRelance.add(minuteur);
    return () => { clearInterval(minuteur); minuteursRelance.delete(minuteur); };
  };

  // Gemini 3.8 Live exécute les outils en mode asynchrone : la voix peut donc
  // continuer à parler pendant que Classinus travaille. WHEN_IDLE fait annoncer le
  // résultat dès qu'elle a fini sa phrase en cours, sans la couper.
  const reponseOutil = (appel: { id: string; name: string }, contenu: Record<string, string>) => ({
    id: appel.id,
    name: appel.name,
    response: { ...contenu, scheduling: "WHEN_IDLE" },
  });

  websocket.onopen = () => {
    connecte = true;
    websocket.send(JSON.stringify({
      setup: {
        model: "models/" + token.model,
        generationConfig: { responseModalities: ["AUDIO"] },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction: { parts: [{ text: token.consignes }] },
        tools: [{ functionDeclarations: [outilClovis, outilSilence, outilReveil] }],
        // Écoute sélective : la voix choisit de ne pas répondre à ce qui ne lui est pas adressé.
        // Réglable côté serveur (GEMINI_LIVE_PROACTIVITE) si le modèle vocal ne l'accepte pas.
        ...(token.proactivite ? { proactivity: { proactiveAudio: true } } : {}),
      },
    }));
    etat("connecte");
  };

  websocket.onmessage = async (event) => {
    let message: any;
    try {
      // Google peut envoyer ses messages en binaire (Blob) : on les convertit en texte avant de les lire.
      const brut = event.data instanceof Blob ? await event.data.text() : event.data;
      message = JSON.parse(brut);
    } catch {
      return;
    }
    if (message.setupComplete && !pret) { pret = true; etat("ecoute"); saluer(); }
    const serveur = message.serverContent;
    if (serveur?.modelTurn?.parts) {
      for (const part of serveur.modelTurn.parts) {
        if (silencieux) continue;
        if (part.inlineData?.data) { lecteur.jouer(base64VersInt16(part.inlineData.data)); etat("reponse"); }
      }
    }
    if (message.toolCall?.functionCalls) {
      const functionResponses = [];
      for (const appel of message.toolCall.functionCalls) {
        // Silence demandé par l'étudiant, décidé par la voix : plus un son, plus d'annonce
        // en attente. SILENT : le résultat est noté sans qu'elle réponde « d'accord ».
        if (appel.name === NOM_OUTIL_SILENCE) {
          silencieux = true;
          lecteur.interrompre();
          annoncesEnAttente.length = 0;
          annonceEnCours = false;
          etat("ecoute");
          functionResponses.push({ id: appel.id, name: appel.name, response: { result: "Silence en cours.", scheduling: "SILENT" } });
          continue;
        }
        // L'étudiant s'adresse de nouveau à la voix : elle peut parler et traiter sa demande.
        if (appel.name === NOM_OUTIL_REVEIL) {
          silencieux = false;
          etat("ecoute");
          functionResponses.push(reponseOutil(appel, { result: "Tu peux parler de nouveau." }));
          continue;
        }
        // Pendant le silence, aucune demande n'est envoyée à Classinus.
        if (silencieux && appel.name === NOM_OUTIL_CLOVIS) {
          functionResponses.push({ id: appel.id, name: appel.name, response: { result: "Silence demandé : ne rien dire.", scheduling: "SILENT" } });
          continue;
        }
        if (appel.name !== NOM_OUTIL_CLOVIS) {
          functionResponses.push(reponseOutil(appel, { error: "Outil inconnu." }));
          continue;
        }
        const question = typeof appel.args?.question === "string" ? appel.args.question.trim() : "";
        if (!question) {
          functionResponses.push(reponseOutil(appel, { error: "La demande est vide." }));
          continue;
        }
        const arreterRelances = demarrerRelances();
        demandesEnCours += 1;
        if (etatCourant !== "reponse") etat("travail");
        try {
          const reponseClovis = options.surDemande ? await options.surDemande(question) : await demanderAClovisDirectement(question, options.conversationId);
          functionResponses.push(reponseOutil(appel, { result: reponseClovis || "Classinus n a pas renvoyé de réponse textuelle." }));
        } catch (e) {
          functionResponses.push(reponseOutil(appel, { error: e instanceof Error ? e.message : "Erreur lors de l appel à Classinus." }));
        } finally {
          arreterRelances();
          demandesEnCours = Math.max(0, demandesEnCours - 1);
          if (demandesEnCours === 0 && etatCourant === "travail") etat("ecoute");
        }
      }
      if (websocket.readyState === WebSocket.OPEN) websocket.send(JSON.stringify({ toolResponse: { functionResponses } }));
    }
    // L'étudiant a pris la parole pendant que la voix parlait : Gemini arrête sa
    // génération et le signale ici. Le son déjà reçu (envoyé en avance, plus vite
    // que la lecture) doit être coupé tout de suite, sinon la voix finit sa phrase
    // puis répond seulement après.
    if (serveur?.interrupted) {
      lecteur.interrompre();
      etat("ecoute");
    }
    if (serveur?.turnComplete) {
      etat("ecoute");
      annonceEnCours = false;
      lireProchaineAnnonce();
    }
  };

  websocket.onerror = () => {
    if (ferme || erreurSignalee) return;
    erreurSignalee = true;
    options.surErreur?.("Le canal vocal Gemini a rencontré une erreur.");
  };
  websocket.onclose = (evenement) => {
    if (ferme) return;
    connecte = false;
    if (!erreurSignalee) {
      erreurSignalee = true;
      console.warn("Canal vocal interrompu, code " + evenement.code + (evenement.reason ? ", raison : " + evenement.reason : ""));
      options.surErreur?.("Le canal vocal s'est interrompu.");
    }
    nettoyer();
  };

  processeur.onaudioprocess = (event) => {
    if (!connecte || !pret || ferme || websocket.readyState !== WebSocket.OPEN) return;
    const pcm = convertirFloat32EnPcm16(event.inputBuffer.getChannelData(0), contexteEntree.sampleRate);
    if (!pcm.length) return;
    websocket.send(JSON.stringify({ realtimeInput: { audio: { data: int16VersBase64(pcm), mimeType: "audio/pcm;rate=16000" } } }));
  };
  source.connect(processeur); processeur.connect(silence); silence.connect(contexteEntree.destination);
  return { niveaux, fermer: nettoyer, interrompre, annoncerReponse, direMessageBulle };
}