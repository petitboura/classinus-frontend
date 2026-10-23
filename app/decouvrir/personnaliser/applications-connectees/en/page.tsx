import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { ROUTES_DECOUVRIR } from "@/lib/routesDecouvrir";

// Version anglaise de la page Applications connectées (23/10/2026, demande
// Bourama), pour l'examen de Classinus comme client MCP par Vercel. Les autres
// pages /decouvrir restent en français : cette page vit donc hors du registre
// des sous-pages (sectionsDecouvrir.tsx), qui alimenterait la navigation
// française, et son adresse est ajoutée à la main dans app/sitemap.ts.
export const metadata: Metadata = {
  title: "Classinus connected apps: link GitHub, Notion, Vercel, Railway and Supabase",
  description:
    "Link your external accounts to Classinus with your consent, check the state of each connection and remove access at any time. Classinus connects to the MCP servers of Vercel, Railway, Supabase and Higgsfield.",
  alternates: {
    canonical: ROUTES_DECOUVRIR.personnaliser.applicationsConnecteesEn,
    languages: {
      fr: ROUTES_DECOUVRIR.personnaliser.applicationsConnectees,
      en: ROUTES_DECOUVRIR.personnaliser.applicationsConnecteesEn,
    },
  },
};

export default function PageDecouvrirPersonnaliserApplicationsConnecteesEn() {
  return (
    <main lang="en" className="mx-auto max-w-2xl">
      <Link href={ROUTES_DECOUVRIR.personnaliser.applicationsConnectees} hrefLang="fr" className="flex items-center gap-1 text-xs font-medium text-dj-texte-muet hover:text-dj-texte hover:underline">
        <ChevronLeft size={14} />
        Version française
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold text-dj-texte">Connected apps</h1>
      <p className="mt-4 text-base leading-relaxed text-dj-texte">
        Classinus can work with your external accounts to help you with your projects: reading code, finding pages or managing services. Each app is linked with your own account, and only if you allow it.
      </p>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Available apps</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">You can link GitHub, Notion, Higgsfield, Vercel, Railway and Supabase. For Higgsfield, Vercel, Railway and Supabase, Classinus uses their official MCP server.</p>
      </section>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Connect an app</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Open Customize (Personnaliser) then Connected apps (Applications connectées), or use the apps menu in the chat message bar. Choose the app, approve access on the provider's website, and you are brought back to Classinus. Each row shows the state of the connection: Connected, Not connected, Reconnection needed or Status unavailable.</p>
      </section>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Remove access</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">A disconnect button is available for every connected app. The authorization saved by Classinus is then deleted. If access has expired or was revoked at the provider, Classinus offers to reconnect.</p>
      </section>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">For developers: Classinus as an MCP client</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Classinus connects to remote MCP servers over Streamable HTTP. Authorization uses OAuth with PKCE (S256 method) and the resource parameter. When the server announces Dynamic Client Registration, Classinus registers itself under the name Classinus; otherwise an OAuth application registered with the provider is used. The OAuth redirect URI is https://classinus.com/oauth/retour.</p>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Tokens are stored separately for each user and each provider, and are never shared between accounts.</p>
      </section>
    </main>
  );
}
