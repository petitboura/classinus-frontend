import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, Download, ExternalLink } from "lucide-react";
import { DonneesStructurees } from "@/components/DonneesStructurees";
import { ListeQuestionsReponses, donneesFaq } from "@/components/PageUsageDecouvrir";
import { URL_TELECHARGEMENT_THONNY } from "@/lib/ctaDecouvrir";
import { ROUTES_DECOUVRIR } from "@/lib/routesDecouvrir";
import type { QuestionReponse } from "@/lib/usagesDecouvrir";

export const metadata: Metadata = {
  title: "Classinus intégré à Thonny : installation et aide au code Python",
  description:
    "Installe le plugin Thonny-Classinus : un panneau Classinus directement dans Thonny pour analyser et corriger du code Python, expliquer les erreurs et choisir un modèle d’IA.",
};

const QUESTIONS_THONNY: QuestionReponse[] = [
  {
    question: "Classinus est-il intégré directement à Thonny ?",
    reponse:
      "Oui. Le plugin thonny-classinus ajoute un panneau Classinus à droite de l’éditeur de Thonny. Tu peux poser tes questions et demander de l’aide sur ton code sans quitter ton environnement de programmation.",
  },
  {
    question: "Comment installer Classinus dans Thonny ?",
    reponse:
      "Installe d’abord Thonny 5.0 ou une version ultérieure. Dans Thonny, ouvre Outils > Gérer les plugins, recherche thonny-classinus, installe le plugin puis redémarre Thonny. Le panneau Classinus apparaîtra à droite de l’éditeur.",
  },
  {
    question: "Est-ce que mon code est envoyé automatiquement ?",
    reponse:
      "Non. Le code, la sélection, la dernière erreur et la sortie du programme ne sont transmis que lorsque tu déclenches une action qui les envoie, par exemple « Envoyer mon code » ou « Corriger mon code ». Une question ordinaire n’envoie pas automatiquement le fichier ouvert.",
  },
  {
    question: "Que peut analyser Classinus dans mon programme ?",
    reponse:
      "Lorsque tu demandes d’envoyer ton code, Classinus peut recevoir le fichier ouvert, la partie sélectionnée, la dernière erreur et la sortie du programme. Tu peux lui demander une analyse, une correction, une explication de l’erreur ou une explication de la sélection. Si le débogueur est arrêté sur une ligne, cette information est aussi transmise avec le code.",
  },
  {
    question: "Puis-je choisir le modèle d’IA utilisé dans Thonny ?",
    reponse:
      "Oui. Le bouton Modèle du panneau affiche les modèles proposés par le serveur, regroupés par fournisseur. Les modèles signalés « Bientôt » ne sont pas sélectionnables. Le menu Réglages permet aussi de choisir la longueur de réponse, l’effort, le mode pédagogique et les modes ressources.",
  },
  {
    question: "Puis-je insérer dans Thonny le code proposé par Classinus ?",
    reponse:
      "Oui. Sous les blocs de code, tu peux copier le code, l’insérer dans l’éditeur après confirmation, ou l’ouvrir dans un nouvel onglet non enregistré. Une insertion peut être annulée avec Ctrl+Z. L’exécution du programme reste contrôlée par Thonny.",
  },
  {
    question: "Puis-je joindre un document ou dicter une question ?",
    reponse:
      "Oui. Le panneau permet de joindre jusqu’à cinq fichiers : les images sont limitées à 5 Mo chacune et les documents à 15 Mo chacun. Tu peux aussi dicter une question avec le micro, puis lire la réponse à voix haute avec la voix disponible sur ton ordinateur.",
  },
  {
    question: "Mon historique Thonny est-il relié à celui du site Classinus ?",
    reponse:
      "Oui. Les conversations du panneau possèdent un identifiant et leurs messages rejoignent le même fil dans l’historique Classinus du site. Tu peux aussi consulter l’historique depuis le panneau.",
  },
];

function LienExterne({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-medium text-dj-texte underline decoration-dj-bordure underline-offset-4 hover:decoration-current"
    >
      {children}
      <ExternalLink size={13} aria-hidden="true" />
    </a>
  );
}

export default function PageDecouvrirThonny() {
  return (
    <main className="mx-auto max-w-2xl">
      <DonneesStructurees donnees={donneesFaq(QUESTIONS_THONNY)} />

      <Link
        href={ROUTES_DECOUVRIR.accueil}
        className="flex items-center gap-1 text-xs font-medium text-dj-texte-muet hover:text-dj-texte hover:underline"
      >
        <ChevronLeft size={14} />
        Découvrir Classinus
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold text-dj-texte">
        Classinus directement dans Thonny
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-dj-texte-muet">
        Thonny-Classinus est un plugin qui intègre Classinus dans Thonny : un panneau apparaît à droite de l’éditeur.
        Tu peux y discuter avec Classinus, lui demander d’analyser ou de corriger ton code Python et obtenir des
        explications sur les erreurs, sans copier manuellement ton programme dans le site web. Le plugin utilise
        ton compte Classinus et le même historique de conversations que le site.
      </p>

      <div className="mt-5">
        <a
          href={URL_TELECHARGEMENT_THONNY}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-dj-accent-1 px-5 py-3 text-sm font-semibold text-[#1A0D02] transition-all duration-200 hover:bg-dj-accent-2 active:scale-[.98]"
        >
          <Download size={16} aria-hidden="true" />
          Télécharger Thonny
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Installer le plugin</h2>
        <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-dj-texte-muet">
          <li>
            <strong className="text-dj-texte">Installer Thonny.</strong> Si Thonny n’est pas encore sur ton ordinateur,
            télécharge-le depuis le <LienExterne href="https://thonny.org/">site officiel de Thonny</LienExterne>.
            Le plugin Classinus nécessite Thonny 5.0 ou une version ultérieure.
          </li>
          <li>
            <strong className="text-dj-texte">Ouvrir le gestionnaire de plugins.</strong> Lance Thonny, puis choisis
            Outils → Gérer les plugins (Tools → Manage plug-ins si ton interface est en anglais).
          </li>
          <li>
            <strong className="text-dj-texte">Rechercher Classinus.</strong> Recherche le nom exact
            <code className="mx-1 rounded bg-dj-surface-haute px-1 py-0.5">thonny-classinus</code>, sélectionne le
            plugin et lance l’installation. Thonny installe aussi les dépendances nécessaires.
          </li>
          <li>
            <strong className="text-dj-texte">Redémarrer Thonny.</strong> Après le redémarrage, repère le panneau
            Classinus à droite de l’éditeur. Tu peux consulter la
            <LienExterne href="https://pypi.org/project/thonny-classinus/">fiche du plugin sur PyPI</LienExterne>
            ou son <LienExterne href="https://github.com/petitboura/thonny-classinus">dépôt de code</LienExterne>.
          </li>
          <li>
            <strong className="text-dj-texte">Connecter ton compte.</strong> Clique sur « Se connecter » dans le
            panneau. Ton navigateur s’ouvre pour te permettre de te connecter à Classinus ; une fois la connexion
            réussie, reviens dans Thonny.
          </li>
        </ol>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Faire analyser ton code</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">
          Tu peux poser une question libre dans le panneau, puis utiliser les actions dédiées selon ton besoin :
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-dj-texte-muet">
          <li><strong className="text-dj-texte">Envoyer mon code :</strong> transmet le fichier ouvert, la sélection, la dernière erreur et la sortie du programme pour donner du contexte à Classinus.</li>
          <li><strong className="text-dj-texte">Corriger mon code :</strong> demande une version corrigée dans un bloc Python et une explication des changements.</li>
          <li><strong className="text-dj-texte">Expliquer cette erreur :</strong> demande à Classinus d’expliquer l’erreur détectée après l’exécution du programme.</li>
          <li><strong className="text-dj-texte">Expliquer ma sélection :</strong> envoie uniquement la partie du code que tu as sélectionnée dans l’éditeur.</li>
          <li><strong className="text-dj-texte">Lignes du débogueur :</strong> si tu avances pas à pas avec le débogueur de Thonny, Classinus reçoit aussi la ligne où l’exécution est arrêtée.</li>
        </ul>
        <p className="mt-3 text-sm leading-relaxed text-dj-texte-muet">
          Rien n’est envoyé automatiquement. Le contenu du fichier et les informations d’exécution ne partent que
          lorsque tu cliques sur une action qui les transmet. Les propositions de code ne sont pas exécutées à ta
          place : tu gardes le contrôle sur l’insertion et l’exécution dans Thonny.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Choisir un modèle et régler les réponses</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">
          Le bouton Modèle, en haut du panneau, affiche les modèles que le serveur rend disponibles et les regroupe
          par fournisseur : Claude, GPT, Gemini, DeepSeek ou Grok selon l’offre en cours. La liste n’est pas fixe :
          seuls les modèles proposés par Classinus sont sélectionnables, et les modèles indiqués « Bientôt » restent
          désactivés.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-dj-texte-muet">
          Dans Réglages, tu peux choisir la longueur de la réponse, l’effort de raisonnement, un mode pédagogique
          (socratique, professeur, tuteur ou examinateur) et des modes liés aux ressources. Les options pédagogiques
          et de ressources s’appliquent à la conversation en cours, comme sur le site Classinus.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Autres outils du panneau</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-dj-texte-muet">
          <li><strong className="text-dj-texte">Insérer ou ouvrir du code :</strong> chaque bloc de code peut être copié, inséré après confirmation ou ouvert dans un nouvel onglet non enregistré. Ctrl+Z permet d’annuler une insertion.</li>
          <li><strong className="text-dj-texte">Joindre un fichier :</strong> envoie jusqu’à cinq images ou documents avec ta question (5 Mo maximum par image, 15 Mo par document).</li>
          <li><strong className="text-dj-texte">Dicter et écouter :</strong> dicte une question au micro et fais lire une réponse à voix haute. Sous Linux, la lecture vocale nécessite espeak-ng ou espeak.</li>
          <li><strong className="text-dj-texte">Historique :</strong> retrouve les conversations, épingle-les, renomme-les ou supprime-les. Les conversations du plugin correspondent aux fils de l’historique sur le site.</li>
          <li><strong className="text-dj-texte">Lignes citées :</strong> les références à une ligne dans la réponse peuvent te conduire à cette ligne dans l’éditeur ; les lignes citées peuvent aussi être surlignées.</li>
          <li><strong className="text-dj-texte">Fichiers Classinus :</strong> certains fichiers proposés par Classinus peuvent être ouverts dans un nouvel onglet Thonny, enregistrés sur ton ordinateur ou ouverts dans le navigateur.</li>
        </ul>
      </section>

      <p className="mt-8 text-sm leading-relaxed text-dj-texte-muet">
        Pour les détails techniques et les versions publiées, consulte le
        <LienExterne href="https://github.com/petitboura/thonny-classinus">dépôt Thonny-Classinus</LienExterne>.
        Pour découvrir les autres usages de Classinus, retourne au
        <Link href={ROUTES_DECOUVRIR.usages.accueil} className="ml-1 font-medium text-dj-texte underline underline-offset-4">
          guide des usages étudiants
        </Link>.
      </p>

      <ListeQuestionsReponses questions={QUESTIONS_THONNY} />
    </main>
  );
}
