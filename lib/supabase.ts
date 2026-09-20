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

if (typeof window !== "undefined") {
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
    console.log("PontNatif (JS): plateforme native detectee, initialisation du pont.");

    import("./canalTempsReel").then(({ enregistrerPluginDossiers }) => {
      enregistrerPluginDossiers(registerPlugin);
    });

    const PontNatif = registerPlugin<{
      enregistrerToken(options: { token: string }): Promise<void>;
      deconnexion(): Promise<void>;
      rattraperActionsEnAttente(): Promise<{ traitees: number }>;
    }>("PontNatif");

    let dejaRattrape = false;

    supabase.auth.onAuthStateChange((event, session) => {
      console.log(`PontNatif (JS): onAuthStateChange event=${event}, session=${session ? "presente" : "absente"}`);
      if (session?.access_token) {
        PontNatif.enregistrerToken({ token: session.access_token })
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
