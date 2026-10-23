import type { Metadata } from "next";
import Link from "next/link";
import { MiseEnPageDecouvrirPersonnaliser } from "@/components/EnTeteDecouvrirPersonnaliser";
import { ROUTES_DECOUVRIR } from "@/lib/routesDecouvrir";

export const metadata: Metadata = {
  title: "Applications connectées Classinus : relier GitHub, Notion, Vercel, Railway et Supabase",
  description:
    "Relie tes comptes externes à Classinus avec ton autorisation, consulte l'état de chaque connexion et retire l'accès quand tu veux. Classinus se connecte aux serveurs MCP de Vercel, Railway, Supabase et Higgsfield.",
  alternates: {
    canonical: ROUTES_DECOUVRIR.personnaliser.applicationsConnectees,
    languages: {
      fr: ROUTES_DECOUVRIR.personnaliser.applicationsConnectees,
      en: ROUTES_DECOUVRIR.personnaliser.applicationsConnecteesEn,
    },
  },
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
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Tu peux relier GitHub, Notion, Higgsfield, Vercel, Railway et Supabase. Pour Higgsfield, Vercel, Railway et Supabase, Classinus passe par leur serveur MCP officiel.</p>
      </section>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Connecter une application</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Ouvre Personnaliser puis Applications connectées, ou utilise le menu des applications dans la barre de saisie du chat. Choisis l'application, valide l'autorisation sur le site du fournisseur, puis tu es ramené dans Classinus. Chaque ligne indique l'état de la connexion : Connecté, Non connecté, Reconnexion nécessaire ou Statut indisponible.</p>
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
      <p className="mt-6 text-sm text-dj-texte-muet">
        <Link href={ROUTES_DECOUVRIR.personnaliser.applicationsConnecteesEn} hrefLang="en" className="underline hover:text-dj-texte">
          English version
        </Link>
      </p>
    </MiseEnPageDecouvrirPersonnaliser>
  );
}
