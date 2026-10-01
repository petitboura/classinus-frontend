import { createClient } from "@supabase/supabase-js";
import type { LockFunc } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const cleAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !cleAnon) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont requis (voir .env.local.example)."
  );
}

// Capacitor/Android ne fournit pas toujours Web Locks. On conserve donc un
// mutex asynchrone local, mais contrairement à l'ancien "lock" (qui appelait
// fn() immédiatement), les appels sont réellement sérialisés. Cela évite
// que deux refresh/getSession concurrents manipulent la même session.
// Le mutex est volontairement local à cette WebView : il ne prétend pas
// synchroniser plusieurs onglets/appareils, ce qui n'est pas son rôle.
let queueVerrou: Promise<void> = Promise.resolve();

const verrouEnMemoire: LockFunc = async (_nom, _delaiAcquisition, fn) => {
  const precedent = queueVerrou;
  let liberer!: () => void;
  queueVerrou = new Promise<void>((resolve) => {
    liberer = resolve;
  });

  await precedent;
  try {
    return await fn();
  } finally {
    liberer();
  }
};

export const supabase = createClient(url, cleAnon, {
  auth: {
    lock: verrouEnMemoire,
  },
});

// Correctif 29/09/2026 : la fenetre de SUPERPOSITION Electron
// (app/agent-superposition) charge aussi ce fichier, donc ouvrait sa propre
// connexion au canal agent. Quand Clovis demandait a lire la page, cette
// connexion repondait la premiere avec son propre contenu (curseur, bulle,
// boutons flottants, barre de saisie) au lieu de la vraie page Classinus.
// Cette fenetre n'est qu'un miroir (voir lib/superpositionElectron.ts) :
// elle n'ouvre AUCUNE connexion, seule la fenetre principale le fait.
// Meme detection que public/dj-anti-flash-theme.js.
const dansFenetreSuperposition =
  typeof window !== "undefined" && window.location.pathname.indexOf("/agent-superposition") === 0;

if (typeof window !== "undefined" && !dansFenetreSuperposition) {
  import("./canalTempsReel").then(({ initialiserCanalTempsReel }) => {
    initialiserCanalTempsReel();
  });
  import("./canalAgentApplicatif").then(({ initialiserCanalAgentApplicatif }) => {
    initialiserCanalAgentApplicatif();
  });
}

if (typeof window !== "undefined") {
  import("@capacitor/core").then(({ Capacitor, registerPlugin }) => {
    if (!Capacitor.isNativePlatform()) return;
    // La superposition Electron n'est qu'un miroir : ni pont natif, ni canal.
    if (dansFenetreSuperposition) return;
    console.log("PontNatif (JS): plateforme native detectee, initialisation du pont.");

    import("./canalTempsReel").then(({ enregistrerPluginDossiers, initialiserCanalTempsReel }) => {
      enregistrerPluginDossiers(registerPlugin);
      // Le plugin natif peut être enregistré après le premier appel
      // d'initialisation du canal. Relancer l'initialisation ici permet de
      // récupérer l'identité appareil sans jamais ouvrir une connexion
      // native sous la clé vide.
      initialiserCanalTempsReel();
    });

    const PontNatif = registerPlugin<{
      enregistrerToken(options: { token: string; apiUrl?: string }): Promise<void>;
      deconnexion(): Promise<void>;
      rattraperActionsEnAttente(): Promise<{ traitees: number }>;
    }>("PontNatif");

    let dejaRattrape = false;

    supabase.auth.onAuthStateChange((event, session) => {
      console.log(`PontNatif (JS): onAuthStateChange event=${event}, session=${session ? "presente" : "absente"}`);
      if (session?.access_token) {
        PontNatif.enregistrerToken({ token: session.access_token, apiUrl: process.env.NEXT_PUBLIC_API_URL })
          .then(() => console.log("PontNatif (JS): enregistrerToken OK"))
          .catch((e) => console.warn("PontNatif (JS): echec enregistrerToken", e));
        if (!dejaRattrape) {
          dejaRattrape = true;
          PontNatif.rattraperActionsEnAttente()
            .then((r) => console.log(`PontNatif (JS): rattraperActionsEnAttente OK, ${r.traitees} action(s)`))
            .catch((e) => console.warn("PontNatif (JS): echec rattraperActionsEnAttente", e));
        }
      } else if (event === "SIGNED_OUT") {
        PontNatif.deconnexion().catch(() => {});
        dejaRattrape = false;
      }
    });
  });
}
