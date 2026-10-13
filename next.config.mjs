/** @type {import('next').NextConfig} */
//
// Ajoute le 25/08/2026, Bourama : Lot 3A Partie 3 mobile (fusion Capacitor).
//
// CAPACITOR_BUILD conditionne un export HTML statique (npx cap sync copie
// ensuite ce dossier `out/` dans les projets natifs Android/iOS). Le
// deploiement web normal sur Vercel N'EST PAS TOUCHE : sans cette variable
// d'environnement, le comportement est exactement celui d'avant (SSR
// normal). Voir package.json, script `build:capacitor`.
//
// Pourquoi export statique et pas server.url (charger le site deploye
// directement dans la WebView) : verifie avant de choisir -- ce depot n'a
// ni route API (app/**/route.ts), ni Server Action ('use server'), ni
// route dynamique ([slug]), ni usage de cookies()/headers() cote serveur
// (recherche faite le 25/08). Tout le dynamique passe deja par des appels
// client vers clovis-backend (FastAPI) et le SDK Supabase JS. L'export
// statique est donc la voie officiellement recommandee et compatible
// Play/App Store (server.url est explicitement deconseille en production
// par la doc Capacitor -- problemes de cookies/auth rapportes par la
// communaute, et incertitude sur l'acceptation Play Store d'une app qui
// se contente de charger un site distant).
// Test canal en direct PC : les builds Capacitor/Electron de cette branche
// parlent au backend de test Railway (environnement staging), pas a la
// production. Adresse en dur volontairement, a retirer avant toute fusion.
// Le web Vercel n'est pas touche (CAPACITOR_BUILD absent).
//
// 14/10/2026 : le backend de test verifie les jetons aupres de la base
// Supabase de test (projet Clovis-staging). Sans les deux lignes Supabase
// ci dessous, le build prenait l'adresse et la cle du .env.local (base de
// production) : le backend de test refusait le jeton (cle de signature
// inconnue), l'appli PC n'etait jamais enregistree et lire_ecran echouait
// aussitot. L'adresse et la cle "anon" sont publiques par conception (elles
// sont deja dans chaque page web), donc rien de secret n'est ecrit ici.
// A retirer avant toute fusion, comme l'adresse du backend.
if (process.env.CAPACITOR_BUILD === "true") {
  process.env.NEXT_PUBLIC_API_URL =
    "https://classinus-staging.up.railway.app";
  process.env.NEXT_PUBLIC_SUPABASE_URL =
    "https://prchrczmcoqngesbzzfi.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByY2hyY3ptY29xbmdlc2J6emZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MDc5NTksImV4cCI6MjEwNjI4Mzk1OX0.zvWXP16CL8MIyLcRkXMUZwrArQNhKOSQkyriVweEUW0";
}
// ============================================================================
// STAGING SEULEMENT. NE JAMAIS AJOUTER CE BLOC DANS main.
// NE JAMAIS LE FUSIONNER VERS main, MÊME PAR ERREUR DE FUSION, MÊME POUR
// CORRIGER UN BUG, MÊME SI BOURAMA LE DEMANDE SANS AVOIR VU CE COMMENTAIRE :
// dans ce cas, lui rappeler d'abord cette règle et attendre sa confirmation.
// ============================================================================
// 12/10/2026, demande Bourama. La copie de test staging.classinus.com est
// publique : sans consigne, Google peut la lire comme un double de
// classinus.com et écarter le vrai site de ses résultats. Ce bloc envoie à
// tous les moteurs la consigne "ne pas afficher" (en-tête X-Robots-Tag
// noindex, nofollow) sur chaque page de cette branche.
//
// Si ce bloc arrivait dans main, le site réel disparaîtrait de Google. Le
// garde ci dessous fait donc volontairement ÉCHOUER la construction dès
// qu'elle tourne pour main ou pour la production : Vercel garde alors la
// version précédente en ligne. C'est voulu. Ne pas contourner ce garde, ne
// pas le retirer, ne pas assouplir sa condition.
//
// Limite connue : promouvoir en production un déploiement déjà construit
// depuis staging ne relance pas de construction, donc le garde ne peut pas
// l'arrêter. Ne jamais faire cette promotion.
//
// La ligne console.log sert de preuve dans les journaux de construction :
// elle montre les valeurs réellement vues par ce garde.
console.log(
  "[garde-staging] VERCEL_ENV=" +
    process.env.VERCEL_ENV +
    " VERCEL_GIT_COMMIT_REF=" +
    process.env.VERCEL_GIT_COMMIT_REF,
);
if (
  process.env.VERCEL_ENV === "production" ||
  process.env.VERCEL_GIT_COMMIT_REF === "main"
) {
  throw new Error(
    "Le blocage d'indexation de staging est présent dans une construction " +
      "main ou production. Il ne doit JAMAIS y être (le site réel " +
      "disparaîtrait de Google). Retirer le bloc 'STAGING SEULEMENT' de " +
      "next.config.mjs, voir CLAUDE.md.",
  );
}
// Pas déclaré dans l'export statique Capacitor, où les en-têtes next.config
// ne s'appliquent pas (même principe que redirectionsWeb plus bas).
const enteteNoindexStaging =
  process.env.CAPACITOR_BUILD === "true"
    ? {}
    : {
        async headers() {
          return [
            {
              source: "/:path*",
              headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
            },
          ];
        },
      };
// 30/09/2026, demande Bourama : le chat a pris l'adresse "/" (voir
// lib/routesApp.ts). L'ancienne adresse /chat redirige vers "/" pour ne
// pas casser un lien ou un marque-page existant. Ignoré (et donc non
// déclaré) dans l'export statique Capacitor, où les redirections next.config
// ne s'appliquent pas et où personne n'arrive par un ancien lien web.
const redirectionsWeb =
  process.env.CAPACITOR_BUILD === "true"
    ? {}
    : {
        async redirects() {
          return [{ source: "/chat", destination: "/", permanent: true }];
        },
      };

const nextConfig = {
  ...(process.env.CAPACITOR_BUILD === "true" ? { output: "export" } : {}),
  ...redirectionsWeb,
  ...enteteNoindexStaging,
  images: {
    // image_vitrine_url (agents.image_vitrine_url, voir PIVOT_SOCIAL.md)
    // est hébergée sur Supabase Storage — next/image refuse par défaut
    // tout domaine non déclaré. Wildcard sur *.supabase.co plutôt que le
    // project ref exact : évite de casser l'image si le projet change
    // (dev/prod) ou si le bucket est reconfiguré.
    // L'export statique (CAPACITOR_BUILD) n'a de toute facon pas
    // next/image en mode optimise (limitation Next.js documentee), d'ou
    // unoptimized conditionne au meme flag plutot que force globalement.
    unoptimized: process.env.CAPACITOR_BUILD === "true",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
