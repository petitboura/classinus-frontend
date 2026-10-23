import type { Metadata } from "next";
import Link from "next/link";
import { MiseEnPageDecouvrirPersonnaliser } from "@/components/EnTeteDecouvrirPersonnaliser";

export const metadata: Metadata = {
  title: "Applications connectées Classinus : Google Workspace, Microsoft, Netlify, Render et Cloudflare",
  description:
    "Relie tes comptes externes à Classinus avec ton autorisation, consulte l'état de chaque connexion et retire l'accès quand tu veux. Google Drive reste distinct des autres services Google Workspace. Microsoft Graph MCP Enterprise est en préversion et limité à certaines lectures d’annuaire.",
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
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Tu peux relier GitHub, Notion, Google Drive, Gmail, Google Docs, Google Sheets, Google Slides, Google Calendar, Google Chat, Google Classroom, Google People, Microsoft MCP Enterprise, Netlify, Render et Cloudflare, ainsi que Higgsfield, Vercel, Railway et Supabase. Chaque service Google Workspace a son propre MCP ; Google Drive reste séparé. Ces serveurs sont en préversion développeur : il faut rejoindre le <a href="https://developers.google.com/workspace/preview" target="_blank" rel="noreferrer" className="underline">programme Google Workspace Developer Preview</a>, activer les APIs et services MCP dans Google Cloud, puis suivre le <a href="https://developers.google.com/workspace/guides/configure-mcp-servers" target="_blank" rel="noreferrer" className="underline">guide officiel de configuration</a>. Google précise qu’une intégration utilisant des fonctions en préversion ne doit pas être proposée à des utilisateurs hors de son domaine/entreprise avant autorisation explicite de Google ou disponibilité générale.</p>
      </section>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Autres serveurs MCP</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Tavily utilise une clé API configurée côté serveur. Netlify demande un jeton personnel que Classinus vérifie auprès de son API officielle et stocke côté serveur. Microsoft Graph MCP Enterprise est en préversion, nécessite une application Entra et se limite à certaines lectures d’annuaire. Render et Cloudflare utilisent leurs serveurs MCP hébergés. Classinus expose également son propre serveur MCP distant pour Claude : <span className="font-mono">https://api.classinus.com/mcp/espace</span>. Tu trouveras les étapes de configuration dans <Link className="underline" href="/connecter-claude">le guide Claude</Link>.</p>
      </section>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Connecter une application</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Ouvre Personnaliser puis Applications connectées. Pour les services OAuth, choisis l’application et autorise Classinus sur le site du fournisseur. Pour Netlify, colle un jeton personnel dans sa carte et valide-le ; Classinus le vérifie avant de l’enregistrer. Le menu du chat sert à choisir les outils que l’agent est autorisé à utiliser. Chaque ligne indique l'état de la connexion : Connecté, Non connecté, Reconnexion nécessaire ou Statut indisponible.</p>
      </section>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Retirer l'accès</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Un bouton de déconnexion est disponible pour chaque application connectée. Classinus supprime alors les jetons qu’il conserve. Pour Netlify, cela ne révoque pas le jeton dans Netlify : révoque-le aussi dans les paramètres Netlify si tu veux couper définitivement son accès.</p>
      </section>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Pour les développeurs : Classinus comme client MCP</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Classinus se connecte aux serveurs MCP distants en Streamable HTTP, avec OAuth/PKCE lorsque le fournisseur le permet. Google Workspace nécessite d’activer les APIs MCP concernées et de configurer le client OAuth. Microsoft Graph MCP Enterprise nécessite les permissions Entra appropriées. Le serveur MCP Netlify officiel étant local (stdio), Classinus propose un pont interne basé sur l’API REST officielle et un jeton personnel par utilisateur. L'adresse de retour OAuth est https://classinus.com/oauth/retour.</p>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Les jetons sont stockés séparément pour chaque utilisateur et chaque fournisseur, et ne sont jamais partagés entre comptes.</p>
      </section>
    </MiseEnPageDecouvrirPersonnaliser>
  );
}
