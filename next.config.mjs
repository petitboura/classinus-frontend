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
// Cible de TEST pour l'appli PC (canal en direct), uniquement sur demande.
// Par defaut, un build Capacitor/Electron utilise les variables normales
// (.env.local, ou celles du workflow OTA .github/workflows/ota.yml) : c'est
// la production. Pour viser le backend de test Railway et la base Supabase de
// test (projet Clovis-staging), lancer `npm run build:capacitor:test`, qui
// ajoute CLASSINUS_CIBLE_TEST=true. Sans cette variable, rien ci dessous ne
// s'applique, donc une publication OTA depuis main ne peut jamais viser le
// staging. L'adresse et la cle "anon" Supabase sont publiques par conception
// (elles sont deja dans chaque page web), rien de secret n'est ecrit ici.
// Le web Vercel n'est pas touche (CAPACITOR_BUILD absent).
if (
  process.env.CAPACITOR_BUILD === "true" &&
  process.env.CLASSINUS_CIBLE_TEST === "true"
) {
  process.env.NEXT_PUBLIC_API_URL =
    "https://classinus-staging.up.railway.app";
  process.env.NEXT_PUBLIC_SUPABASE_URL =
    "https://prchrczmcoqngesbzzfi.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByY2hyY3ptY29xbmdlc2J6emZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MDc5NTksImV4cCI6MjEwNjI4Mzk1OX0.zvWXP16CL8MIyLcRkXMUZwrArQNhKOSQkyriVweEUW0";
}
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
          return [
            { source: "/chat", destination: "/", permanent: true },
            { source: "/decouvrir/accueil", destination: "/decouvrir/usages", permanent: true },
          ];
        },
      };

const nextConfig = {
  ...(process.env.CAPACITOR_BUILD === "true" ? { output: "export" } : {}),
  ...redirectionsWeb,
  // Heure de construction (millisecondes), lue par lib/miseAJourOta.ts pour
  // savoir si un bundle OTA publié est plus récent que le code qui tourne.
  // Le workflow .github/workflows/ota.yml la fixe lui-même pour qu'elle soit
  // identique dans le bundle et dans latest.json ; à défaut (build local de
  // l'APK), on prend l'heure du build.
  env: {
    NEXT_PUBLIC_BUILD_TIME: process.env.NEXT_PUBLIC_BUILD_TIME || String(Date.now()),
  },
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
