// Mode vocal bambara : exécute la préparation du texte lu et vérifie le branchement du client.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const lire = (chemin) => readFile(new URL(chemin, import.meta.url), "utf8");
const source = await lire("../lib/voixBambaraTexte.ts");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { nettoyerPourVoix, decouperEnMorceaux, partieStable, suivreTexteVoix } = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));

// Nettoyage : rien de ce qui ne se prononce pas ne reste.
assert.equal(nettoyerPourVoix("# Titre\n\n**Gras** et *italique*"), "Titre\nGras et italique");
assert.equal(nettoyerPourVoix("- un\n- deux\n1. trois"), "un\ndeux\ntrois");
assert.equal(nettoyerPourVoix("Voir [ce site](https://exemple.org/page) ici"), "Voir ce site ici");
assert.equal(nettoyerPourVoix("Lien https://exemple.org/x fin"), "Lien fin");
assert.equal(nettoyerPourVoix("Avant\n```js\nconst a = 1;\n```\nAprès"), "Avant\nAprès");
assert.equal(nettoyerPourVoix("Bloc ouvert ```js\ncode sans fin"), "Bloc ouvert");
assert.equal(nettoyerPourVoix("| a | b |\n|---|---|\n| 1 | 2 |"), "a b\n1 2");
assert.equal(nettoyerPourVoix("Bonjour 😀 !"), "Bonjour !");
assert.equal(nettoyerPourVoix("![dessin](https://exemple.org/i.png) texte"), "texte");
assert.equal(nettoyerPourVoix(""), "");

// Page bambara de staging (25/11/2026, demande de Bourama) : la voix ne doit jamais dire « jpg » ni aucun reste de fichier ou d'adresse.
assert.equal(nettoyerPourVoix("Regarde photo.jpg très belle."), "Regarde très belle.");
assert.equal(nettoyerPourVoix("Voici l'image (chat_roux.PNG) pour toi."), "Voici l'image pour toi.");
assert.equal(nettoyerPourVoix("Image : /api/fichiers/abc123/dessin.jpeg\nVoilà."), "Image :\nVoilà.");
assert.equal(nettoyerPourVoix("Voir i.ytimg.com/vi/abcdefghijk/hqdefault.jpg ici."), "Voir ici.");
assert.equal(nettoyerPourVoix("Va sur www.exemple.org/page. Ensuite repose-toi."), "Va sur . Ensuite repose-toi.");
assert.equal(nettoyerPourVoix("[Image jointe : https://cdn.x.org/a.jpg] Le chat dort."), "Le chat dort.");
assert.equal(nettoyerPourVoix("Le chat dort. [Image jointe : https://cdn.x.org/a"), "Le chat dort.");
assert.equal(nettoyerPourVoix('<img src="a.jpg" alt="chat"> Le chat.'), "Le chat.");
assert.equal(nettoyerPourVoix("Une image jpg et une vidéo mp4 sont là."), "Une image et une vidéo sont là.");
assert.equal(nettoyerPourVoix("Le fichier .png est prêt."), "Le fichier est prêt.");
assert.equal(nettoyerPourVoix("data:image/png;base64,iVBORw0KGgo= fin"), "fin");
assert.equal(nettoyerPourVoix("Voir [https://x.org/a.jpg](https://x.org/a.jpg) ici."), "Voir ici.");
assert.equal(nettoyerPourVoix("Un lien https://x.org/page.html. Fin."), "Un lien . Fin.");
// Ce qui se dit normalement reste intact : nombres, noms, mots avec tiret bas au milieu.
assert.equal(nettoyerPourVoix("Rendez-vous à 10.30 puis 3.5 km. Le prix est 2.50."), "Rendez-vous à 10.30 puis 3.5 km. Le prix est 2.50.");
assert.equal(nettoyerPourVoix("Écoute _bien_ ceci, mot_composé reste."), "Écoute bien ceci, mot_composé reste.");
assert.equal(partieStable('Avant <img src="a.jpg'), "Avant ");
assert.equal(partieStable('Avant <img src="a.jpg"> après'), 'Avant <img src="a.jpg"> après');
assert.equal(partieStable("3 < 5 donc oui"), "3 < 5 donc oui");

// Découpage : jamais plus long que la limite, ordre et contenu conservés.
const phrases = "Première phrase. Deuxième phrase! Troisième phrase? Quatrième phrase.";
const morceaux = decouperEnMorceaux(phrases, 40);
assert.ok(morceaux.length > 1);
assert.ok(morceaux.every((m) => m.length <= 40), "chaque morceau respecte la limite");
assert.equal(morceaux.join(" "), phrases);
assert.deepEqual(decouperEnMorceaux("Court.", 600), ["Court."]);
assert.deepEqual(decouperEnMorceaux("", 600), []);
const longue = "mot ".repeat(100).trim();
const coupes = decouperEnMorceaux(longue, 50);
assert.ok(coupes.every((m) => m.length <= 50));
assert.equal(coupes.join(" "), longue);
assert.ok(decouperEnMorceaux("x".repeat(130), 50).every((m) => m.length <= 50), "mot unique trop long coupé");

// Lecture au fil de l'eau (23/11/2026, demande de Bourama) : la voix reçoit les phrases terminées pendant que le texte s'écrit.
// Partie stable : ni bloc de code ouvert, ni lien ou image markdown dont la parenthèse de fin n'est pas arrivée.
assert.equal(partieStable("Salut [le lien](https://x.org"), "Salut ");
assert.equal(partieStable("Salut [le lien](https://x.org) fin"), "Salut [le lien](https://x.org) fin");
assert.equal(partieStable("Salut ![dessin](https://x.org/i.png"), "Salut ");
assert.equal(partieStable("Avant ```js\ncode"), "Avant ");
assert.equal(partieStable("Avant ```js\ncode```\nAprès"), "Avant ```js\ncode```\nAprès");
assert.equal(partieStable("Rien de spécial."), "Rien de spécial.");

// Première phrase : rendue dès que la suivante commence, jamais deux fois, la dernière rendue à la fin même sans point.
const suite = suivreTexteVoix(600);
assert.deepEqual(suite.avancer("Bonjour."), [], "pas de suite encore : la phrase n'est pas sûre d'être finie");
assert.deepEqual(suite.avancer("Bonjour. "), []);
assert.deepEqual(suite.avancer("Bonjour. C"), ["Bonjour."]);
assert.deepEqual(suite.avancer("Bonjour. C"), [], "rien n'est dit deux fois");
assert.deepEqual(suite.avancer("Bonjour. Comment vas-tu ? Très"), ["Comment vas-tu ?"]);
assert.deepEqual(suite.finir("Bonjour. Comment vas-tu ? Très bien"), ["Très bien"]);
assert.deepEqual(suite.finir("Bonjour. Comment vas-tu ? Très bien"), [], "finir ne répète pas");

// Quelle que soit la façon dont le texte arrive, tout est dit, une seule fois, sans lien ni mise en forme prononcés.
const textes = [
  "Bonjour tout le monde. Comment vas-tu aujourd'hui ? Très bien ! Merci.",
  "Regarde. https://youtu.be/abcdefghijk\nC'est beau. Et ensuite ? Fin",
  "Voir [ce site](https://exemple.org/page) ici. Puis ![un chat](https://exemple.org/chat.png) un chat. Suite.",
  "# Titre\n\n- un\n- deux\n1. trois\nFin de la liste.",
  "Avant. ```js\nconst a = 1;\n``` Après. Fin",
  "Une seule phrase sans point final",
  "Une image à la fin https://exemple.org/photo.png",
  "Regarde photo.jpg très belle. Puis va sur www.exemple.org/page. Fin",
  "Voici (chat.png). Suite. Fin. Une image jpg et mp4. Encore",
  'Un chat <img src="a.jpg" alt="chat. beau"> dort. Fin',
];
for (const texte of textes) {
  const attendu = nettoyerPourVoix(texte).replace(/\s+/g, " ");
  for (const pas of [1, 2, 5, 17, texte.length]) {
    const lecture = suivreTexteVoix(600);
    const dits = [];
    let premierAu = -1;
    for (let i = pas; i < texte.length; i += pas) {
      const morceaux = lecture.avancer(texte.slice(0, i));
      if (morceaux.length > 0 && premierAu < 0) premierAu = i;
      dits.push(...morceaux);
    }
    const restant = lecture.finir(texte);
    dits.push(...restant);
    const dit = dits.join(" ").replace(/\s+/g, " ").trim();
    assert.equal(dit, attendu, `tout est dit une fois (pas ${pas}) : ${texte.slice(0, 30)}`);
    if (pas === 1) {
      // Les phrases sont rendues au fur et à mesure : à la fin il ne reste que la dernière, jamais tout le reste d'un coup
      // (cas d'un lien écrit après une phrase déjà rendue : le texte propre perd l'espace qui suivait cette phrase).
      const derniere = nettoyerPourVoix(texte).split(/(?<=[.!?…])\s+|\n+/u).filter(Boolean).pop();
      assert.equal(restant.join(" "), derniere, `seule la dernière phrase attend la fin : ${texte.slice(0, 30)}`);
    }
    assert.ok(!/https?:|youtu|\]\(|!\[|```|jpe?g|\.png|mp4|<img/i.test(dit), "ni lien ni mise en forme prononcés : " + dit);
  }
}
// Le point de la démarche : la première phrase part bien avant la fin du texte.
{
  const texte = textes[0];
  const lecture = suivreTexteVoix(600);
  let premierAu = -1;
  for (let i = 1; i < texte.length && premierAu < 0; i += 1) if (lecture.avancer(texte.slice(0, i)).length > 0) premierAu = i;
  assert.ok(premierAu > 0 && premierAu < texte.length / 2, "la première phrase part à la moitié du texte au plus tard, pas à la fin");
}
// Une phrase plus longue que la limite est coupée sans jamais dépasser.
{
  const lecture = suivreTexteVoix(40);
  const dits = [...lecture.avancer("mot ".repeat(30) + ". Suite"), ...lecture.finir("mot ".repeat(30) + ". Suite")];
  assert.ok(dits.every((d) => d.length <= 40), "chaque morceau respecte la limite");
}

// Branchement : le client est annoncé au serveur, la question est montée, « autre » garde la voix d'avant.
const [chat, contexte, global, dialogue, lecteur] = await Promise.all([
  lire("../components/chat/ChatIA.tsx"),
  lire("../lib/contexteVoixDirecte.tsx"),
  lire("../components/InteractionGlobale.tsx"),
  lire("../components/voix/ChoixLangueVoix.tsx"),
  lire("../lib/voixBambara.ts"),
]);
assert.equal((chat.match(/\.\.\.\(clientTourRef\.current \? \{ client: clientTourRef\.current \} : \{\}\)/g) ?? []).length, 3, "les trois envois portent le client");
assert.ok(contexte.includes('CLIENT_VOIX_BAMBARA = "voix_bambara"') || lecteur.includes('CLIENT_VOIX_BAMBARA = "voix_bambara"'));
assert.ok(contexte.includes("surDemande: (question) => demanderAClovis(question, CLIENT_VOIX_BAMBARA)"));
assert.ok(contexte.includes('langue: LangueVoix = "autre"'), "autre langue reste le défaut");
assert.ok(contexte.includes("if (canalEnDirectEstActif())"), "pas de question pendant le canal en direct");
assert.ok(global.includes("<ChoixLangueVoix />"));
assert.ok(dialogue.includes('choisirLangue?.("bambara")') && dialogue.includes('choisirLangue?.("autre")'));
assert.ok(!/ -- /.test(lecteur + dialogue + contexte), "pas de double tiret");
console.log("voix bambara : ok");
