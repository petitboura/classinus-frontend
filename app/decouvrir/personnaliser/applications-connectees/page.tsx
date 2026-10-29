import type { Metadata } from "next";
import { MiseEnPageDecouvrirPersonnaliser } from "@/components/EnTeteDecouvrirPersonnaliser";

export const metadata: Metadata = {
  title: "Applications connectées Classinus : relier GitHub, Notion, Railway, Supabase et tes serveurs MCP",
  description:
    "Relie GitHub, Notion, Railway, Supabase ou Higgsfield à ton compte Classinus, ajoute tes propres serveurs MCP et retire leurs autorisations quand tu veux.",
};

export default function PageDecouvrirPersonnaliserApplicationsConnectees() {
  return (
    <MiseEnPageDecouvrirPersonnaliser>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Applications connectées</h1>
      <p className="mt-4 text-base leading-relaxed text-dj-texte">
        Classinus peut travailler avec tes comptes externes pour t'aider sur tes projets. En plus des services intégrés, tu peux ajouter un serveur MCP distant compatible et autoriser son accès à ton compte.
      </p>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Applications disponibles</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Tu peux relier GitHub, Notion, Higgsfield, Railway, Supabase et Render, ou ajouter un serveur MCP personnalisé utilisant HTTPS. Google Drive n’est pas proposé dans les interfaces de connexion pour le moment. Pour Higgsfield, Railway, Supabase et Render, Classinus passe par leur serveur MCP officiel.</p>
      </section>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Connecter une application</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Ouvre Personnaliser puis Applications connectées, ou utilise le menu des applications dans la barre de saisie du chat. Choisis l'application, valide l'autorisation sur le site du fournisseur, puis tu es ramené dans Classinus. Chaque ligne indique l'état de la connexion : Connecté, Non connecté, Reconnexion nécessaire ou Statut indisponible.</p>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Tu peux aussi laisser le chat te proposer la connexion. Si ta demande relève d'un service que tu n'as pas encore connecté (par exemple déployer un site sur Railway), Classinus ne répond pas que cela n'existe pas : il affiche dans la conversation la même carte que dans Applications connectées. Clique sur Connecter, valide l'autorisation, tu reviens dans la même conversation, puis le bouton Utiliser pour ça demande à Classinus de reprendre ta demande avec ce service. Classinus sait aussi quels services et quels serveurs MCP tu as connectés, activés ou désactivés. Quand Higgsfield existe en deux versions, celle de ton compte passe en premier, sauf si tu demandes celle de Classinus.</p>
      </section>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Serveurs MCP personnalisés</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Dans Personnaliser puis Applications connectées, indique le nom et l'URL HTTPS de ton serveur. Classinus teste l'accès et découvre les outils exposés. Tu peux choisir aucune authentification, un jeton Bearer ou OAuth automatique lorsque le serveur prend en charge la découverte OAuth et l'enregistrement dynamique. Les jetons sont conservés côté serveur.</p>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Tu peux aussi demander à Classinus d'ajouter un serveur MCP pour toi, avec le bouton Le faire avec Classinus ou en le disant dans le chat. Si l'outil n'existe pas encore chez Classinus, il cherche son serveur officiel sur le site de l'éditeur et te présente une carte dans la conversation. La carte indique si l'adresse vient bien du site officiel ; sinon elle te prévient et tu décides. Classinus n'ajoute jamais rien sans ton clic : Oui, ajoute-le, ou Ajouter quand même. Si un jeton est nécessaire, la carte te guide pas à pas jusqu'à la page où le créer, puis te montre un champ où le coller : l'IA ne lit pas ce jeton et ne le voit jamais. Si le serveur propose l'autorisation en un clic, tu l'autorises toi-même sur le site de l'outil, sans rien copier. Tu peux aussi remplir le formulaire toi-même, directement dans la carte. Chaque serveur MCP personnalisé montre le logo du site du serveur, dans Applications connectées, dans la carte proposée par le chat et à côté de ses outils dans la conversation. Si le site n'a pas d'icône, Classinus affiche la première lettre du nom en majuscule, et deux lettres ou plus quand deux de tes serveurs commencent pareil. Classinus n'affiche jamais d'icône générique à la place du logo : c'est soit le vrai logo du site, soit la lettre. Les petits logos qui accompagnent les outils dans la conversation suivent la même règle, avec la première lettre du nom du site.</p>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Tu peux tester les outils, désactiver le serveur, modifier ses paramètres ou supprimer sa configuration. Les outils des serveurs personnalisés demandent une confirmation avant chaque exécution et les adresses locales ou privées sont refusées.</p>
      </section>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Retirer l'accès</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Un bouton de déconnexion est disponible pour chaque application connectée. L'autorisation enregistrée par Classinus est alors supprimée. Si l'accès a expiré ou a été révoqué chez le fournisseur, Classinus te propose de te reconnecter.</p>
      </section>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Pour les développeurs : Classinus comme client MCP</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Classinus se connecte aux serveurs MCP distants en Streamable HTTP. L'autorisation utilise OAuth avec PKCE (méthode S256) et le paramètre resource. Quand le serveur annonce l'enregistrement dynamique de client, Classinus s'enregistre sous le nom Classinus ; sinon, une application OAuth enregistrée chez le fournisseur est utilisée. L'adresse de retour OAuth est https://classinus.com/oauth/retour.</p>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Les jetons sont stockés séparément pour chaque utilisateur et chaque fournisseur, et ne sont jamais partagés entre comptes.</p>
      </section>
    </MiseEnPageDecouvrirPersonnaliser>
  );
}
