"use client";

import { supabase } from "./supabase";
import { appelerApiStream } from "./api";

const MODELE_GEMINI_LIVE = "gemini-3.8-live";
const URL_GEMINI_LIVE = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained";

type ReponseToken = { token: string; model: string };
type OptionsGeminiLive = {
  conversationId: string;
  surEtat?: (etat: "connexion" | "connecte" | "ecoute" | "reponse" | "erreur" | "ferme") => void;
  surErreur?: (message: string) => void;
};

export type SessionGeminiLive = {
  fermer: () => void;
  interrompre: () => void;
  envoyerTexte: (texte: string) => void;
};

const OUTIL_CLOVIS = {
  name: "demander_a_clovis",
  description: "Envoie la demande de l étudiant au cerveau principal de Classinus, Clovis. Utilise cet outil pour toute vraie demande pédagogique, question, recherche, calcul ou action. Gemini Live est seulement l interface vocale.",
  parameters: {
    type: "OBJECT",
    properties: {
      question: { type: "STRING", description: "Demande de l étudiant à transmettre à Clovis." },
    },
    required: ["question"],
  },
};

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
  if (token.model !== MODELE_GEMINI_LIVE) throw new Error("Modèle Gemini Live inattendu.");

  const entree = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  const contexteEntree = new AudioContext();
  const contexteSortie = new AudioContext({ sampleRate: 24000 });
  await contexteEntree.resume();
  await contexteSortie.resume();
  // La connexion est ouverte seulement ici, après le micro et le son, pour que les écouteurs
  // (ouverture, messages, fermeture) soient posés avant toute annonce de Google.
  const websocket = new WebSocket(URL_GEMINI_LIVE + "?access_token=" + encodeURIComponent(token.token));
  const lecteur = creerLecteurAudio(contexteSortie);
  const source = contexteEntree.createMediaStreamSource(entree);
  const processeur = contexteEntree.createScriptProcessor(4096, 1, 1);
  const silence = contexteEntree.createGain();
  silence.gain.value = 0;
  let ferme = false;
  let connecte = false;
  let pret = false;
  let erreurSignalee = false;
  // Diagnostic temporaire : étapes atteintes et derniers messages de Google.
  const etapes: string[] = [];
  const messagesGoogle: string[] = [];
  let audioRecu = false;
  let minuteurDiagnostic: ReturnType<typeof setTimeout> | null = null;
  const resumeDiagnostic = () => "Étapes atteintes : " + (etapes.join(", ") || "aucune") + ". Derniers messages de Google : " + (messagesGoogle.slice(-4).join(" ; ") || "aucun") + ".";

  const nettoyer = () => {
    if (ferme) return;
    ferme = true;
    if (minuteurDiagnostic) clearTimeout(minuteurDiagnostic);
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
    if (websocket.readyState !== WebSocket.OPEN) return;
    etapes.push("salutation envoyée");
    websocket.send(JSON.stringify({ realtimeInput: { text: "La voix vient de s'activer. Dis seulement à voix haute et en quelques mots : Je t'écoute." } }));
  };

  websocket.onopen = () => {
    connecte = true;
    etapes.push("connexion Google ouverte");
    websocket.send(JSON.stringify({
      setup: {
        model: "models/" + MODELE_GEMINI_LIVE,
        generationConfig: { responseModalities: ["AUDIO"] },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction: { parts: [{ text: "Tu es l interface vocale temps réel de Classinus. Pour toute demande réelle de l étudiant, utilise obligatoirement demander_a_clovis. Clovis est le cerveau principal : il possède la mémoire, les outils et les connaissances de Classinus. Après sa réponse, lis-la naturellement à voix haute. Pour une salutation très courte, tu peux répondre directement." }] },
        tools: [{ functionDeclarations: [OUTIL_CLOVIS] }],
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
      messagesGoogle.push("message illisible (" + (event.data instanceof Blob ? "binaire" : typeof event.data) + ")");
      return;
    }
    messagesGoogle.push(Object.keys(message).join("+") + (message.error ? " " + JSON.stringify(message.error).slice(0, 200) : ""));
    if (message.setupComplete && !pret) { pret = true; etapes.push("session prête"); etat("ecoute"); saluer(); }
    const serveur = message.serverContent;
    if (serveur?.modelTurn?.parts) {
      for (const part of serveur.modelTurn.parts) {
        if (part.inlineData?.data) {
          if (!audioRecu) { audioRecu = true; etapes.push("son reçu"); }
          lecteur.jouer(base64VersInt16(part.inlineData.data)); etat("reponse");
        }
      }
    }
    if (message.toolCall?.functionCalls) {
      const functionResponses = [];
      for (const appel of message.toolCall.functionCalls) {
        if (appel.name !== OUTIL_CLOVIS.name) {
          functionResponses.push({ id: appel.id, name: appel.name, response: { error: "Outil inconnu." } });
          continue;
        }
        const question = typeof appel.args?.question === "string" ? appel.args.question.trim() : "";
        if (!question) {
          functionResponses.push({ id: appel.id, name: appel.name, response: { error: "La demande est vide." } });
          continue;
        }
        try {
          let reponseClovis = "";
          await appelerApiStream("/api/chat", { message: question, agent_id: "clovis", historique: [], conversation_id: options.conversationId, longueur_reponse: "moyenne", canal_en_direct: true, fuseau_horaire: Intl.DateTimeFormat().resolvedOptions().timeZone }, (evenement) => {
            if (evenement?.type === "reponse" && typeof evenement.texte === "string") reponseClovis += evenement.texte;
          });
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
      options.surErreur?.("Le canal vocal s'est interrompu. Code " + evenement.code + (evenement.reason ? ", raison : " + evenement.reason : "") + ". " + resumeDiagnostic());
    }
    nettoyer();
  };

  processeur.onaudioprocess = (event) => {
    if (!connecte || !pret || ferme || websocket.readyState !== WebSocket.OPEN) return;
    const pcm = convertirFloat32EnPcm16(event.inputBuffer.getChannelData(0), contexteEntree.sampleRate);
    if (!pcm.length) return;
    websocket.send(JSON.stringify({ realtimeInput: { audio: { data: int16VersBase64(pcm), mimeType: "audio/pcm;rate=16000" } } }));
  };
  minuteurDiagnostic = setTimeout(() => {
    if (ferme || audioRecu || erreurSignalee) return;
    options.surErreur?.("Diagnostic voix : aucun son reçu après 8 secondes. " + resumeDiagnostic());
  }, 8000);
  source.connect(processeur); processeur.connect(silence); silence.connect(contexteEntree.destination);
  return { fermer: nettoyer, interrompre, envoyerTexte };
}