import type { Metadata } from "next";
import { MiseEnPageDecouvrirPersonnaliser } from "@/components/EnTeteDecouvrirPersonnaliser";

export const metadata: Metadata = {
  title: "Applications connectées Classinus : relier GitHub, Notion, Vercel, Railway et Supabase",
  description:
    "Relie tes comptes externes à Classinus avec ton autorisation, consulte l'état de chaque connexion et retire l'accès quand tu veux. Classinus se connecte aux serveurs MCP de Vercel, Railway, Supabase et Higgsfield.",
};

export default function PageDecouvrirPersonnaliserApplicationsConnectees() {
  return (
    <MiseEnPageDecouvrirPersonnaliser>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Applications connectées</h1>
      <p className="mt-4 text-base leading-relaxed text-dj-texte">
        Classinus peut travailler avec tes comptes externes pour t'aider sur tes projets : consulter du code, retrouver des pages ou gérer des services. Chaque application est reliée avec ton propre compte, uniquement si tu l'autorises.
      </p>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Applications disponibles</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Tu peux relier GitHub, Notion, Higgsfield, Vercel, Railway, Supabase, Microsoft MCP Enterprise, Netlify, Render et Cloudflare. Google Drive n’est pas proposé dans les interfaces de connexion pour le moment. Pour Higgsfield, Vercel, Railway, Supabase, Render et Cloudflare, Classinus passe par leur serveur MCP officiel. Microsoft MCP Enterprise est en préversion, nécessite une application Entra et se limite à certaines lectures d’annuaire.</p>
      </section>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Connecter une application</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Ouvre Personnaliser puis Applications connectées, ou utilise le menu des applications dans la barre de saisie du chat. Choisis l'application, valide l'autorisation sur le site du fournisseur, puis tu es ramené dans Classinus. Chaque ligne indique l'état de la connexion : Connecté, Non connecté, Reconnexion nécessaire ou Statut indisponible.</p>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Netlify fonctionne avec un jeton personnel : depuis Personnaliser, colle-le dans sa carte. Classinus le vérifie auprès de Netlify avant de l'enregistrer.</p>
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
