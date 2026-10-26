import type { Metadata } from "next";
import { MiseEnPageDecouvrirPersonnaliser } from "@/components/EnTeteDecouvrirPersonnaliser";

export const metadata: Metadata = {
  title: "Applications connectées Classinus : relier GitHub, Notion, Vercel, Railway, Supabase et tes serveurs MCP",
  description:
    "Relie GitHub, Notion, Vercel, Railway, Supabase ou Higgsfield à ton compte Classinus, ajoute tes propres serveurs MCP et retire leurs autorisations quand tu veux.",
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
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Tu peux relier GitHub, Notion, Higgsfield, Vercel, Railway, Supabase, Microsoft MCP Enterprise, Netlify, Render et Cloudflare, ou ajouter un serveur MCP personnalisé utilisant HTTPS. Google Drive n’est pas proposé dans les interfaces de connexion pour le moment. Pour Higgsfield, Vercel, Railway, Supabase, Render et Cloudflare, Classinus passe par leur serveur MCP officiel. Microsoft MCP Enterprise est en préversion, nécessite une application Entra et se limite à certaines lectures d’annuaire.</p>
      </section>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Connecter une application</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Ouvre Personnaliser puis Applications connectées, ou utilise le menu des applications dans la barre de saisie du chat. Choisis l'application, valide l'autorisation sur le site du fournisseur, puis tu es ramené dans Classinus. Chaque ligne indique l'état de la connexion : Connecté, Non connecté, Reconnexion nécessaire ou Statut indisponible.</p>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Tu peux aussi laisser le chat te proposer la connexion. Si ta demande relève d'un service que tu n'as pas encore connecté (par exemple déployer un site sur Vercel), Classinus ne répond pas que cela n'existe pas : il affiche dans la conversation la même carte que dans Applications connectées. Clique sur Connecter, valide l'autorisation, tu reviens dans la même conversation, puis le bouton Utiliser pour ça demande à Classinus de reprendre ta demande avec ce service. Classinus sait aussi quels services et quels serveurs MCP tu as connectés, activés ou désactivés. Quand Higgsfield existe en deux versions, celle de ton compte passe en premier, sauf si tu demandes celle de Classinus.</p>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Netlify fonctionne avec un jeton personnel : depuis Personnaliser, colle-le dans sa carte. Classinus le vérifie auprès de Netlify avant de l'enregistrer.</p>
      </section>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Serveurs MCP personnalisés</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Dans Personnaliser puis Applications connectées, indique le nom et l'URL HTTPS de ton serveur. Classinus teste l'accès et découvre les outils exposés. Tu peux choisir aucune authentification, un jeton Bearer ou OAuth automatique lorsque le serveur prend en charge la découverte OAuth et l'enregistrement dynamique. Les jetons sont conservés côté serveur.</p>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Tu peux tester les outils, désactiver le serveur, modifier ses paramètres ou supprimer sa configuration. Les outils des serveurs personnalisés demandent une confirmation avant chaque exécution et les adresses locales ou privées sont refusées.</p>
      </section>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Retirer l'accès</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Un bouton de déconnexion est disponible pour chaque application connectée. L'autorisation enregistrée par Classinus est alors supprimée. Si l'accès a expiré ou a été révoqué chez le fournisseur, Classinus te propose de te reconnecter.</p>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Pour Netlify, la déconnexion ne révoque pas le jeton chez Netlify : révoque-le aussi dans les paramètres de Netlify pour couper définitivement son accès.</p>
      </section>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Pour les développeurs : Classinus comme client MCP</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Classinus se connecte aux serveurs MCP distants en Streamable HTTP. L'autorisation utilise OAuth avec PKCE (méthode S256) et le paramètre resource. Quand le serveur annonce l'enregistrement dynamique de client, Classinus s'enregistre sous le nom Classinus ; sinon, une application OAuth enregistrée chez le fournisseur est utilisée. L'adresse de retour OAuth est https://classinus.com/oauth/retour.</p>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Les jetons sont stockés séparément pour chaque utilisateur et chaque fournisseur, et ne sont jamais partagés entre comptes.</p>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Le serveur MCP officiel de Netlify est local (stdio) : Classinus passe donc par un pont interne basé sur l'API officielle de Netlify et un jeton personnel par utilisateur.</p>
      </section>
    </MiseEnPageDecouvrirPersonnaliser>
  );
}
