// Connexion Google dans l'appli installée (Android et iOS).
//
// Problème corrigé (23/09/2026) : dans l'appli, le bouton Google ouvrait le
// navigateur du téléphone avec une adresse de retour de type site web. Google
// terminait donc la connexion sur le site, et l'appli n'était jamais prévenue.
//
// Ici, le retour se fait par un lien spécial qui rouvre l'appli
// (classinusmobile://connexion). L'appli reçoit le lien, en extrait la
// session, et l'utilisateur reste dans l'appli. Le site web n'utilise pas ce
// fichier : son fonctionnement reste celui de BoutonGoogle.tsx.
//
// Ce lien doit être ajouté aux adresses de retour autorisées dans Supabase
// (Authentication, URL Configuration), sinon Supabase le refuse.
import { supabase } from "@/lib/supabase";

export const LIEN_RETOUR_NATIF = "classinusmobile://connexion";

// Délai laissé au lien de retour pour arriver après la fermeture du
// navigateur, avant de considérer que l'utilisateur a annulé.
const DELAI_ANNULATION_MS = 1500;

export type ResultatConnexionNative = { ok: true } | { ok: false; erreur: string };

const MESSAGE_ERREUR = "La connexion avec Google n'a pas abouti. Réessaie.";

export async function estAppliNative(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

// Le lien de retour contient soit un code (a échanger contre une session),
// soit directement les jetons de session dans la partie après le #.
async function ouvrirSessionDepuisLien(lien: string): Promise<boolean> {
  try {
    const url = new URL(lien);
    const params = new URLSearchParams(url.hash.replace(/^#/, ""));
    const paramsRequete = url.searchParams;

    if (params.get("error") || paramsRequete.get("error")) return false;

    const code = paramsRequete.get("code");
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      return !error;
    }

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      return !error;
    }
    return false;
  } catch {
    return false;
  }
}

export async function connexionGoogleNative(): Promise<ResultatConnexionNative> {
  try {
    const [{ App }, { Browser }] = await Promise.all([
      import("@capacitor/app"),
      import("@capacitor/browser"),
    ]);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: LIEN_RETOUR_NATIF, skipBrowserRedirect: true },
    });
    if (error || !data?.url) return { ok: false, erreur: MESSAGE_ERREUR };

    return await new Promise<ResultatConnexionNative>(async (resoudre) => {
      let termine = false;
      let minuteurAnnulation: ReturnType<typeof setTimeout> | null = null;
      const ecouteurs: { remove: () => Promise<void> }[] = [];

      const finir = (resultat: ResultatConnexionNative) => {
        if (termine) return;
        termine = true;
        if (minuteurAnnulation) clearTimeout(minuteurAnnulation);
        ecouteurs.forEach((e) => e.remove().catch(() => {}));
        Browser.close().catch(() => {});
        resoudre(resultat);
      };

      ecouteurs.push(
        await App.addListener("appUrlOpen", async ({ url }) => {
          if (!url.startsWith(LIEN_RETOUR_NATIF)) return;
          if (minuteurAnnulation) clearTimeout(minuteurAnnulation);
          const reussi = await ouvrirSessionDepuisLien(url);
          finir(reussi ? { ok: true } : { ok: false, erreur: MESSAGE_ERREUR });
        })
      );

      // Navigateur fermé à la main : pas d'erreur affichée, simple annulation.
      // Le délai évite de conclure trop tôt quand le lien de retour arrive
      // juste après la fermeture.
      ecouteurs.push(
        await Browser.addListener("browserFinished", () => {
          if (termine) return;
          minuteurAnnulation = setTimeout(() => finir({ ok: false, erreur: "" }), DELAI_ANNULATION_MS);
        })
      );

      try {
        await Browser.open({ url: data.url });
      } catch {
        finir({ ok: false, erreur: MESSAGE_ERREUR });
      }
    });
  } catch {
    return { ok: false, erreur: MESSAGE_ERREUR };
  }
}
