// Page bambara : exécute la logique pure qui choisit quoi montrer et vérifie le branchement.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const lire = (chemin) => readFile(new URL(chemin, import.meta.url), "utf8");
const source = await lire("../lib/pageBambaraVisuels.ts");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const m = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));

// Vidéos YouTube écrites par l'IA : trouvées une seule fois, avec leur miniature.
const t1 = "Voici.\nhttps://www.youtube.com/watch?v=abcdefghijk\nEt encore https://youtu.be/abcdefghijk.";
const v1 = m.extraireVisuelsDuTexte(t1);
assert.equal(v1.length, 1);
assert.equal(v1[0].genre, "video");
assert.equal(v1[0].idVideo, "abcdefghijk");
assert.equal(v1[0].miniature, "https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg");

// Images : markdown et lien direct, sans doublon entre les deux.
const t2 = "![chat](https://exemple.org/chat.png)\nhttps://exemple.org/chat.png\nhttps://exemple.org/chien.jpg?x=1";
const v2 = m.extraireVisuelsDuTexte(t2);
assert.deepEqual(v2.map((v) => v.url), ["https://exemple.org/chat.png", "https://exemple.org/chien.jpg?x=1"]);
assert.ok(v2.every((v) => v.genre === "image"));

// Un lien ordinaire n'est pas un visuel, un texte vide non plus.
assert.deepEqual(m.extraireVisuelsDuTexte("Voir https://exemple.org/page"), []);
assert.deepEqual(m.extraireVisuelsDuTexte(""), []);

// Fichiers générés : seules les images et vidéos sont gardées.
const f = m.visuelsDepuisFichiers([{ url: "https://x.org/a.png" }, { url: "https://x.org/b.mp4" }, { url: "https://x.org/c.pdf" }]);
assert.deepEqual(f.map((v) => v.genre), ["image", "video"]);

// Listes du serveur : visuels créés, entrées sans adresse ignorées.
assert.equal(m.visuelsDepuisImages([{ url: "https://x.org/i.jpg", titre: "i" }, { url: "" }]).length, 1);
const vs = m.visuelsDepuisVideos([{ url: "https://www.youtube.com/watch?v=zzzzzzzzzzz", titre: "v" }]);
assert.equal(vs[0].idVideo, "zzzzzzzzzzz");

// Fusion : jamais deux fois le même visuel.
assert.equal(m.fusionnerVisuels(v1, m.extraireVisuelsDuTexte(t1)).length, 1);
assert.equal(m.fusionnerVisuels(v1, v2).length, 3);

// Visuels pendant que la réponse s'écrit (23/11/2026, demande de Bourama) : une adresse n'est lue qu'une fois fermée par un
// espace ou un retour à la ligne, jamais à moitié écrite ; à tout moment, ce qui est montré fait partie du résultat final.
assert.deepEqual(m.extraireVisuelsStables("Voici https://youtu.be/abcdefghijk"), [], "adresse pas encore fermée");
assert.equal(m.extraireVisuelsStables("Voici https://youtu.be/abcdefghijk ").length, 1, "adresse fermée par un espace");
assert.deepEqual(m.extraireVisuelsStables("![mon chat](https://exemple.org/chat.png)"), [], "image markdown pas encore fermée par un espace");
const imageFermee = m.extraireVisuelsStables("![mon chat](https://exemple.org/chat.png)\n");
assert.equal(imageFermee.length, 1);
assert.equal(imageFermee[0].titre, "mon chat", "le texte alternatif de l'image est gardé");
assert.deepEqual(m.extraireVisuelsStables("![mon chat](https://exemple.org/chat.png"), [], "image markdown coupée");
assert.deepEqual(m.extraireVisuelsStables(""), []);
for (const texte of [t1, t2, "Regarde ![un chat](https://exemple.org/chat.png) puis https://exemple.org/chien.jpg?w=300&h=200 voilà."]) {
  const finaux = new Set(m.extraireVisuelsDuTexte(texte).map((v) => v.id));
  const vus = new Set();
  for (let i = 0; i <= texte.length; i += 1) {
    for (const visuel of m.extraireVisuelsStables(texte.slice(0, i))) {
      assert.ok(finaux.has(visuel.id), "un visuel montré en cours d'écriture est dans le résultat final : " + visuel.url + " (au caractère " + i + ")");
      vus.add(visuel.id);
    }
  }
  assert.ok(vus.size > 0, "au moins un visuel apparaît avant la fin de la réponse");
}

// Conversation : modifier un tour ne touche jamais aux autres tours ni à la liste d'origine.
const toursDepart = [{ id: "a", question: "", texte: "", visuels: [] }, { id: "b", question: "q", texte: "t", visuels: [] }];
const toursApres = m.modifierTour(toursDepart, "a", (t) => ({ ...t, texte: "x" }));
assert.equal(toursApres[0].texte, "x");
assert.equal(toursApres[1], toursDepart[1]);
assert.equal(toursDepart[0].texte, "");
assert.equal(m.modifierTour(toursDepart, "inconnu", (t) => ({ ...t, texte: "y" })).every((t) => t.texte !== "y"), true);

// Effet de construction selon l'outil en cours.
assert.equal(m.effetPourOutil("generer_image"), "creation");
assert.equal(m.effetPourOutil("rechercher_image"), "images");
assert.equal(m.effetPourOutil("rechercher_video"), "videos");
assert.equal(m.effetPourOutil("tavily_search"), "recherche");
assert.equal(m.effetPourOutil("memoire_lire"), null);
assert.equal(m.effetPourOutil(undefined), null);
assert.deepEqual(m.effetsActifs(["tavily_search", "generer_image"]), ["creation", "recherche"]);
assert.deepEqual(m.effetsActifs(["rechercher_image", "rechercher_video", "generer_image", "rechercher_image"]), ["creation", "videos", "images"]);
assert.deepEqual(m.effetsActifs(["memoire_lire", "tavily_search"]), ["recherche"]);
assert.deepEqual(m.effetsActifs(["memoire_lire"]), []);
assert.deepEqual(m.effetsActifs([]), []);
// Un effet déjà montré reste jusqu'à ce que ses résultats soient là (22/11/2026).
const aucun = new Set();
assert.deepEqual(m.effetsAffiches([], ["videos"], aucun, true), ["videos"]);
assert.deepEqual(m.effetsAffiches([], ["videos"], new Set(["video"]), true), []);
assert.deepEqual(m.effetsAffiches([], ["images", "creation"], new Set(["image"]), false), []);
assert.deepEqual(m.effetsAffiches([], ["recherche"], aucun, false), ["recherche"]);
assert.deepEqual(m.effetsAffiches([], ["recherche"], aucun, true), []);
assert.deepEqual(m.effetsAffiches(["videos"], ["creation"], new Set(["video"]), false), ["creation", "videos"]);

// Branchement : le client est annoncé, la réflexion jamais montrée, la page n'a ni texte ni menu.
const [api, page, client] = await Promise.all([
  lire("../lib/pageBambara.ts"),
  lire("../app/bambara/page.tsx"),
  lire("../components/bambara/PageBambaraClient.tsx"),
]);
assert.match(api, /CLIENT_PAGE_BAMBARA = "page_bambara"/);
assert.match(api, /client: CLIENT_PAGE_BAMBARA/);
assert.doesNotMatch(api, /case "raisonnement"/);
assert.doesNotMatch(api, /canal_en_direct/);
assert.match(page, /ssr: false/);
assert.match(client, /ouvrirVoixBambara/);
assert.match(client, /demanderPageBambara/);
assert.doesNotMatch(client, /ChatIA|BarreDeSaisie|BulleMessage/);

// Écriture : un petit bouton clavier ouvre un champ, la demande écrite passe par le même appel que la parole,
// le texte se montre au fur et à mesure et la réponse est lue à voix haute par la voix bambara.
const [ecriture, champ] = await Promise.all([
  lire("../lib/useEcritureBambara.ts"),
  lire("../components/bambara/ChampEcritureBambara.tsx"),
]);
assert.match(api, /surTexte\?\.\(reponse\)/);
assert.match(ecriture, /demanderPageBambara\(question/);
assert.match(ecriture, /creerLecteurBambara/);
assert.match(ecriture, /synthetiserVoixBambara/);
assert.match(ecriture, /voix\.disponible/);
assert.match(client, /useEcritureBambara/);
assert.match(client, /ChampEcritureBambara/);
assert.match(client, /Keyboard/);
assert.match(client, /champOuvert/);
assert.match(champ, /enterKeyHint="send"/);
assert.match(champ, /isComposing/);
// Noir et blanc seulement (demande de Bourama, 18/11/2026) : aucune couleur d'accent, d'erreur ou en dur
// dans la page. Les couleurs viennent de .bb-page (noir et blanc qui s'inversent selon le thème).
const css = await lire("../components/bambara/bambara.css");
const [carte, effet] = await Promise.all([
  lire("../components/bambara/CarteVisuelBambara.tsx"),
  lire("../components/bambara/EffetConstruction.tsx"),
]);
const sansCommentaires = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
const bulleAudio = await lire("../components/bambara/BulleAudioBambara.tsx");
const texteReplie = await lire("../components/bambara/TexteReplieBambara.tsx");
for (const [nom, texte] of [["PageBambaraClient", client], ["ChampEcritureBambara", champ], ["CarteVisuelBambara", carte], ["EffetConstruction", effet], ["BulleAudioBambara", bulleAudio], ["TexteReplieBambara", texteReplie]]) {
  assert.doesNotMatch(sansCommentaires(texte), /dj-(accent|erreur|bordure-forte)|#[0-9a-fA-F]{3,8}\b|rgba?\(|bg-black\/|text-white/, nom + " : couleur interdite");
}
const cssCode = sansCommentaires(css);
assert.doesNotMatch(cssCode, /--dj-(erreur|accent-2|bordure-forte)/);
const hexAutorises = new Set(["#ffffff", "#000000"]);
for (const hex of cssCode.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []) assert.ok(hexAutorises.has(hex.toLowerCase()), "bambara.css : couleur " + hex + " interdite");
assert.doesNotMatch(cssCode, /rgba?\(|hsla?\(/);
assert.match(client, /bb-page/);

// Mise en page du 18/11/2026 (demande de Bourama) : la bulle, le champ et le micro flottent par dessus le contenu,
// le clavier se pose par dessus au lieu de pousser la page, et les images et vidéos sont de petites rangées
// défilantes comme dans le chat, jamais de grandes cartes empilées.
const [rangees, decalage, layout] = await Promise.all([
  lire("../components/bambara/RangeesVisuelsBambara.tsx"),
  lire("../lib/useDecalageClavier.ts"),
  lire("../app/bambara/layout.tsx"),
]);
assert.match(layout, /interactiveWidget: "overlays-content"/);
assert.match(client, /useDecalageClavier/);
assert.match(client, /RangeesVisuelsBambara/);
// Plus de bulle en haut à droite (demande de Bourama du 22/11/2026).
assert.doesNotMatch(client, /OndeVoix/);
assert.doesNotMatch(client, /absolute inset-x-0 top-0/);
assert.match(client, /absolute inset-x-0 bottom-0/);
assert.doesNotMatch(client, /flex-col"\s*\n?\s*style=\{\{\s*\n?\s*paddingTop/);
assert.match(decalage, /visualViewport/);
// Effet conversation (18/11/2026) : chaque demande s'ajoute à la suite, rien n'efface les tours précédents.
assert.match(client, /demarrerTour/);
assert.match(client, /tours\.map/);
assert.doesNotMatch(client, /setVisuels|setTexteReponse/);
// Seul le bouton « + » (nouvelle conversation) vide les tours, jamais une nouvelle demande.
assert.equal((client.match(/setTours\(\[\]\)/g) ?? []).length, 1);
assert.match(client, /const nouvelleConversation = useCallback\(\(\) => \{[\s\S]*?setTours\(\[\]\);/);
assert.match(ecriture, /avantEnvoi\(question\)/);
// Le visionneur d'images glisse entre deux images au lieu de changer d'un coup (22/11/2026).
assert.match(await lire("../components/chat/VisionneuseImage.tsx"), /drag=\{plusieurs \? "x" : false\}/);
// Résultats comme chez Google (22/11/2026) : images en rangées de hauteur égale (.bb-rangees-images), vidéos en
// grille d'une colonne sur petit écran et de 2 colonnes sur grand écran, jamais de défilement de côté.
assert.match(rangees, /bb-rangees-images/);
assert.match(rangees, /grid-cols-1/);
assert.match(rangees, /md:grid-cols-2/);
assert.match(css, /\.bb-rangees-images \{[^}]*flex-wrap: wrap/);
assert.doesNotMatch(rangees, /overflow-x-auto/);
assert.doesNotMatch(carte, /snap-start|shrink-0/);
assert.match(rangees, /VisionneuseImage/);
assert.doesNotMatch(carte, /max-h-\[62vh\]|w-full rounded-2xl/);

// Messages audio (19/11/2026, demande de Bourama) : comme sur WhatsApp, la parole de la personne et la voix de
// Classinus deviennent des messages audio réécoutables. Logique pure : WAV, durée, barres, durée affichée.
const srcAudio = await lire("../lib/audioMessageBambara.ts");
const jsAudio = ts.transpileModule(srcAudio, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const a = await import("data:text/javascript;base64," + Buffer.from(jsAudio).toString("base64"));
const seconde = new Float32Array(8000).map((_, i) => Math.sin(i / 10) * 0.5);
const msg = a.messageDepuisMono(seconde, 8000);
assert.equal(msg.dureeMs, 1000);
assert.equal(msg.pics.length, a.NOMBRE_PICS);
assert.ok(msg.pics.every((p) => p >= 0 && p <= 1));
assert.equal(Math.max(...msg.pics), 1);
assert.equal(msg.blob.type, "audio/wav");
assert.equal(msg.blob.size, 44 + 8000 * 2);
const entete = Buffer.from(await msg.blob.arrayBuffer());
assert.equal(entete.toString("ascii", 0, 4), "RIFF");
assert.equal(entete.toString("ascii", 8, 12), "WAVE");
assert.equal(entete.readUInt32LE(24), 8000);
assert.equal(entete.readUInt32LE(40), 8000 * 2);
assert.equal(a.messageDepuisMono(new Float32Array(0), 8000), null);
assert.deepEqual(a.calculerPics(new Float32Array(100)), new Array(a.NOMBRE_PICS).fill(0));
assert.equal(a.formaterDuree(7400), "0:07");
assert.equal(a.formaterDuree(65000), "1:05");
assert.equal(a.formaterDuree(-5), "0:00");
// Retirer un tour (parole sans rien de compris) ne touche pas aux autres.
const unTour = (id) => ({ id, question: "", texte: "", visuels: [] });
const restants = m.retirerTour([unTour("a"), unTour("b")], "a");
assert.deepEqual(restants.map((t) => t.id), ["b"]);
assert.equal(m.retirerTour([unTour("a")], "inconnu").length, 1);

// Branchement : la bulle est dans la page, à droite pour la personne et à gauche pour Classinus, une seule joue à la fois,
// le micro se met en pause pendant une réécoute et la réponse attend la fin de la réécoute pour être lue.
const [voixBambara, micro, lecture] = await Promise.all([
  lire("../lib/voixBambara.ts"),
  lire("../lib/voixBambaraMicro.ts"),
  lire("../lib/voixBambaraLecture.ts"),
]);
assert.match(client, /BulleAudioBambara/);
assert.match(client, /cote="droite"/);
assert.match(client, /cote="gauche"/);
assert.match(client, /audioQuestion/);
assert.match(client, /audioReponse/);
assert.match(client, /suspendreEcoute/);
assert.match(client, /reprendreEcoute/);
assert.match(client, /attendreFinMessage/);
assert.match(bulleAudio, /<audio/);
assert.match(bulleAudio, /idEnLecture/);
assert.match(voixBambara, /surParole\?\.\(/);
assert.match(voixBambara, /surParoleVide\?\.\(\)/);
assert.match(voixBambara, /surReponseAudio\?\.\(/);
assert.match(voixBambara, /suspendreEcoute/);
assert.match(micro, /reperes/);
assert.match(lecture, /surTampon\?\.\(tampon\)/);
assert.match(ecriture, /surAudio\?\.\(idTour/);
assert.match(ecriture, /avantLecture/);

// Ordre et texte replié (19/11/2026, demande de Bourama) : dans chaque message le vocal est en haut, puis le texte replié sur
// une seule ligne (jamais plus), même pour une demande parlée ; un toucher le déplie.
assert.match(texteReplie, /truncate/);
assert.match(texteReplie, /aria-expanded/);
assert.match(texteReplie, /ResizeObserver/);
assert.ok(client.indexOf('tour.id + ":reponse"') < client.indexOf("<TexteReplieBambara texte={tour.texte}"), "le vocal de la réponse est avant son texte");
assert.ok(client.indexOf("<TexteReplieBambara texte={tour.texte}") < client.indexOf("<RangeesVisuelsBambara"), "le texte replié est avant les visuels");
// Aucun texte dans la bulle de la personne qui parle ; le texte de l'assistant n'est pas enfermé dans une case,
// il ne change pas de mise en forme déplié, et sa flèche pointe vers la droite quand il est replié.
assert.doesNotMatch(client, /TexteReplieBambara texte=\{tour\.question\}/);
assert.doesNotMatch(texteReplie, /border|backgroundColor|rounded/);
assert.match(texteReplie, /ChevronRight/);
assert.match(texteReplie, /rotate\(90deg\)/);
// Les miniatures de vidéos YouTube et les images d'une recherche ne s'affichent jamais toutes seules : le serveur les
// annonce comme « fichiers générés », seul l'outil qui crée vraiment l'image est montré.
const miniatures = [{ url: "https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg" }, { url: "https://exemple.org/photo.png" }];
for (const outil of ["rechercher_video", "rechercher_image", "tavily_search", "lire_video", "memoire_lire", undefined]) {
  assert.deepEqual(m.visuelsDepuisFichiersGeneres(outil, miniatures), []);
}
assert.equal(m.visuelsDepuisFichiersGeneres("generer_image", [{ url: "https://x.org/creation.png" }]).length, 1);
assert.match(api, /visuelsDepuisFichiersGeneres\(evenement\.nom_outil/);
assert.doesNotMatch(api, /surVisuels\(visuelsDepuisFichiers\(/);
// C'est l'IA qui choisit les images et vidéos montrées : les résultats de recherche ne s'affichent jamais d'office.
assert.doesNotMatch(api, /surVisuels\(visuelsDepuisImages/);
assert.doesNotMatch(api, /surVisuels\(visuelsDepuisVideos/);
assert.match(api, /candidats\.get\(visuel\.url\)/);
assert.match(api, /extraireVisuelsDuTexte\(reponse\)/);
assert.match(api, /extraireVisuelsStables\(reponse\)/, "les visuels s'affichent pendant que la réponse s'écrit");
assert.match(api, /\.filter\(\(visuel\) => !montres\.has\(visuel\.id\)\)/, "un visuel déjà montré n'est pas rappelé");
assert.match(client, /texte: nettoyerPourVoix\(reponse\)/);
assert.match(client, /bullePreparee/);
assert.match(bulleAudio, /enPreparation/);

console.log("Page bambara : toutes les vérifications passent.");

// Boutons du haut, profils, historique et gardés (18/11/2026) : le branchement de la page.
const pageClient = await lire("../components/bambara/PageBambaraClient.tsx");
const barreHaut = await lire("../components/bambara/BarreHautBambara.tsx");
const hookEspace = await lire("../lib/useBambaraEspace.ts");
assert.match(pageClient, /<BarreHautBambara/, "la rangée de boutons est dans la page");
assert.match(pageClient, /garde=\{gardeUi\}/, "les cartes reçoivent le cœur");
assert.match(pageClient, /garderPremierMessage\(question, null\)/, "le premier message écrit est gardé");
// Le premier vocal (jusqu'à 2 Mo) n'est plus envoyé en même temps que la réponse (23/11/2026, demande de Bourama) : il est
// gardé avec sa transcription mais ne part qu'à la fin du tour, avant tout autre premier message ou changement de conversation.
assert.match(pageClient, /mettreEnAttentePremierMessage\(question, audioParoleRef\.current\)/, "le premier vocal est gardé avec sa transcription");
assert.doesNotMatch(pageClient, /garderPremierMessage\(question, audioParoleRef\.current\)/, "le premier vocal ne part plus pendant la réponse");
assert.match(pageClient, /surFinTour: \(\) => \{\s*envoyerPremierMessageEnAttente\(\);/, "le premier vocal part à la fin du tour parlé");
assert.match(pageClient, /envoyerPremierMessageEnAttente\(\);\s*garderPremierMessage\(question, null\)/, "un premier message écrit ne passe pas devant un vocal en attente");
assert.match(pageClient, /const nouvelleConversation = useCallback\(\(\) => \{\s*\/\/[^\n]*\n\s*envoyerPremierMessageEnAttente\(\)/, "le « + » envoie d'abord le premier message en attente");
assert.match(pageClient, /if \(!toursFinisRef\.current\.has\(idTour\)\) return;/, "les sons du tour ne partent qu'une fois le tour fini");
assert.match(pageClient, /surFinTour: finirTour/, "la demande écrite finit son tour aussi");
assert.match(pageClient, /alimenter\(cumule\)/, "la voix reçoit le texte à mesure qu'il arrive");
assert.match(pageClient, /conversationIdRef\.current = nouvelIdentifiant\(\)/, "le « + » ouvre une nouvelle conversation");
assert.match(barreHaut, /nouveauProfil[\s\S]*nouvelleConversation[\s\S]*historique[\s\S]*gardes/, "ordre des boutons : profil, +, historique, gardés");
assert.match(hookEspace, /listerGardesBambara\(profilId\)/, "les gardés suivent le profil choisi");
for (const code of ["BAMBARA_PROFIL_NOM_INVALIDE", "BAMBARA_TROP_DE_PROFILS", "BAMBARA_PROFIL_INTROUVABLE", "BAMBARA_CONVERSATION_INVALIDE", "BAMBARA_CONVERSATION_INTROUVABLE", "BAMBARA_MESSAGE_VIDE", "BAMBARA_AUDIO_INVALIDE", "BAMBARA_GARDE_INVALIDE", "BAMBARA_INDISPONIBLE"]) {
  const erreurs = await lire("../lib/erreurs.ts");
  assert.equal((erreurs.match(new RegExp("^\\s+" + code + ":", "gm")) ?? []).length, 2, code + " en français et en anglais");
}
console.log("page bambara : boutons du haut vérifiés");
