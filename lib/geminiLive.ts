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
  relance_attente: string;
  annonce_reponse: string;
  delai_relance_secondes: number;
  relances_max: number;
};
type OptionsGeminiLive = {
  conversationId: string;
  surEtat?: (etat: "connexion" | "connecte" | "ecoute" | "reponse" | "travail" | "erreur" | "ferme") => void;
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

// Chemin direct vers Classinus, sans passer par le chat affiché : utilisé seulement
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
  // Nombre de demandes en cours chez Classinus : tant qu'il y en a, la voix est
  // en mode "travail" (l'onde respire) dès qu'elle ne parle plus.
  let demandesEnCours = 0;
  const etat = (nouvelEtat: Parameters<typeof signalerEtat>[0]) => {
    const etatFinal = nouvelEtat === "ecoute" && demandesEnCours > 0 ? "travail" : nouvelEtat;
    etatCourant = etatFinal;
    signalerEtat(etatFinal);
  };
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

  // Réponse écrite de Clovis à un message que l'étudiant a tapé dans le chat :
  // la voix en dit l'essentiel, avec la consigne venue du serveur. Si elle parle
  // déjà, l'annonce attend la fin de sa phrase au lieu de la couper.
  let annonceEnAttente: string | null = null;
  const envoyerAnnonce = (texte: string) => {
    websocket.send(JSON.stringify({ realtimeInput: { text: `${token.annonce_reponse}\n\n${texte}` } }));
  };
  const annoncerReponse = (texte: string) => {
    const propre = texte.trim();
    if (ferme || !pret || !propre || !token.annonce_reponse?.trim() || websocket.readyState !== WebSocket.OPEN) return;
    if (etatCourant === "reponse") { annonceEnAttente = propre; return; }
    envoyerAnnonce(propre);
  };

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
      if (etatCourant === "reponse") return;
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
    if (serveur?.turnComplete) {
      etat("ecoute");
      if (annonceEnAttente && websocket.readyState === WebSocket.OPEN) {
        const enAttente = annonceEnAttente;
        annonceEnAttente = null;
        envoyerAnnonce(enAttente);
      }
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
  return { niveaux, fermer: nettoyer, interrompre, annoncerReponse };
}