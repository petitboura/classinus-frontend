"use client";

import { supabase } from "./supabase";
import { appelerApiStream } from "./api";

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
};
type OptionsGeminiLive = {
  conversationId: string;
  surEtat?: (etat: "connexion" | "connecte" | "ecoute" | "reponse" | "erreur" | "ferme") => void;
  surErreur?: (message: string) => void;
  // La voix est un interprète : elle transmet la demande à Clovis par cette
  // fonction et reçoit en retour sa réponse écrite. Sans elle, chemin direct.
  surDemande?: (question: string) => Promise<string>;
};

export type SessionGeminiLive = {
  fermer: () => void;
  interrompre: () => void;
  envoyerTexte: (texte: string) => void;
};

const NOM_OUTIL_CLOVIS = "demander_a_clovis";

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

// Chemin direct vers Clovis, sans passer par le chat affiché : utilisé seulement
// quand aucun chat n'est ouvert pour recevoir la demande.
export async function demanderAClovisDirectement(question: string, conversationId: string): Promise<string> {
  let reponseClovis = "";
  await appelerApiStream("/api/chat", { message: question, agent_id: "clovis", historique: [], conversation_id: conversationId, longueur_reponse: "moyenne", canal_en_direct: true, fuseau_horaire: Intl.DateTimeFormat().resolvedOptions().timeZone }, (evenement) => {
    if (evenement?.type === "reponse" && typeof evenement.texte === "string") reponseClovis += evenement.texte;
  });
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

function creerLecteurAudio(contexte: AudioContext) {
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
      source.connect(contexte.destination);
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
  const etat = options.surEtat ?? (() => {});
  etat("connexion");
  const token = await obtenirToken();
  if (!token.model || !token.url) throw new Error("Impossible d initialiser le canal vocal.");
  const outilClovis = declarerOutilClovis(token.description_outil);

  const entree = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  const contexteEntree = new AudioContext();
  const contexteSortie = new AudioContext({ sampleRate: 24000 });
  await contexteEntree.resume();
  await contexteSortie.resume();
  // La connexion est ouverte seulement ici, après le micro et le son, pour que les écouteurs
  // (ouverture, messages, fermeture) soient posés avant toute annonce de Google.
  const websocket = new WebSocket(token.url + "?access_token=" + encodeURIComponent(token.token));
  const lecteur = creerLecteurAudio(contexteSortie);
  const source = contexteEntree.createMediaStreamSource(entree);
  const processeur = contexteEntree.createScriptProcessor(4096, 1, 1);
  const silence = contexteEntree.createGain();
  silence.gain.value = 0;
  let ferme = false;
  let connecte = false;
  let pret = false;
  let erreurSignalee = false;

  const nettoyer = () => {
    if (ferme) return;
    ferme = true;
    processeur.disconnect(); source.disconnect(); silence.disconnect();
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

  const envoyerTexte = (texte: string) => {
    if (!texte.trim() || websocket.readyState !== WebSocket.OPEN) return;
    websocket.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text: texte.trim() }] }], turnComplete: true } }));
  };

  // Texte envoyé en temps réel (le canal accepte le texte dans realtimeInput,
  // clientContent n'étant prévu que pour l'historique initial).
  const saluer = () => {
    if (!token.accueil.trim() || websocket.readyState !== WebSocket.OPEN) return;
    websocket.send(JSON.stringify({ realtimeInput: { text: token.accueil } }));
  };

  websocket.onopen = () => {
    connecte = true;
    websocket.send(JSON.stringify({
      setup: {
        model: "models/" + token.model,
        generationConfig: { responseModalities: ["AUDIO"] },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction: { parts: [{ text: token.consignes }] },
        tools: [{ functionDeclarations: [outilClovis] }],
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
        if (part.inlineData?.data) { lecteur.jouer(base64VersInt16(part.inlineData.data)); etat("reponse"); }
      }
    }
    if (message.toolCall?.functionCalls) {
      const functionResponses = [];
      for (const appel of message.toolCall.functionCalls) {
        if (appel.name !== NOM_OUTIL_CLOVIS) {
          functionResponses.push({ id: appel.id, name: appel.name, response: { error: "Outil inconnu." } });
          continue;
        }
        const question = typeof appel.args?.question === "string" ? appel.args.question.trim() : "";
        if (!question) {
          functionResponses.push({ id: appel.id, name: appel.name, response: { error: "La demande est vide." } });
          continue;
        }
        try {
          const reponseClovis = options.surDemande ? await options.surDemande(question) : await demanderAClovisDirectement(question, options.conversationId);
          functionResponses.push({ id: appel.id, name: appel.name, response: { result: reponseClovis || "Clovis n a pas renvoyé de réponse textuelle." } });
        } catch (e) {
          functionResponses.push({ id: appel.id, name: appel.name, response: { error: e instanceof Error ? e.message : "Erreur lors de l appel à Clovis." } });
        }
      }
      if (websocket.readyState === WebSocket.OPEN) websocket.send(JSON.stringify({ toolResponse: { functionResponses } }));
    }
    if (serveur?.turnComplete) etat("ecoute");
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
  return { fermer: nettoyer, interrompre, envoyerTexte };
}