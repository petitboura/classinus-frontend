import Link from "next/link";
import { headers } from "next/headers";
import { Download, ShieldCheck, ExternalLink } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Bouton } from "@/components/Bouton";
import { QrTelechargerPc } from "@/components/QrTelechargerPc";
import { EtapesInstallation } from "@/components/PanneauInstallation";
import { InstallationAndroid } from "@/components/InstallationAndroid";
import { detecterAppareil, recupererDerniereReleasePc } from "@/lib/telechargementPc";

// Page publique d'installation de Classinus. Composant serveur : la branche affichée dépend de l'appareil, lu dans
// le User-Agent, et l'installeur Windows est lu dans la dernière publication GitHub (lib/telechargementPc.ts).
//
// Quatre branches : Windows (installeur de l'appli PC), Android et iPhone (installation depuis le navigateur, PWA),
// autres ordinateurs (Mac, Linux : pas d'installeur, QR pour le téléphone).
//
// Depuis le 25/11/2026 (demande de Bourama), l'appli APK est abandonnée : la page ne la propose plus.

function formatTaille(octets: number): string {
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

export default async function PageTelecharger() {
  // headers() est incompatible avec l'export statique (build:capacitor) :
  // son seul appel fait planter tout l'export, constaté le 11/09/2026,
  // malgré le commentaire plus haut qui supposait une exclusion via
  // next.config.mjs -- cette exclusion n'existe pas réellement dans ce
  // dépôt. Repli neutre (branche PC) le temps du build : cette page n'a
  // de toute façon aucun sens depuis l'app native elle-même (c'est la
  // page qui explique comment télécharger l'app).
  const userAgent = process.env.CAPACITOR_BUILD === "true" ? "" : headers().get("user-agent") || "";
  const appareil = detecterAppareil(userAgent);
  const estAndroid = appareil === "android";
  const estIOS = appareil === "ios";
  const estWindows = appareil === "windows";

  const releasePc = estWindows ? await recupererDerniereReleasePc() : null;
  const urlPage = `${process.env.NEXT_PUBLIC_APP_URL}/telecharger`;

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-16">
      <div className="w-full max-w-lg animate-dj-fade-up">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <Logo taille={32} sansFond />
          <span className="font-display text-lg font-bold tracking-tight text-dj-texte">Classinus</span>
        </div>

        <div className="rounded-2xl border border-dj-bordure bg-dj-surface p-6 shadow-[0_2px_24px_rgba(0,0,0,0.35)]">
          {estAndroid ? (
            <>
              <h1 className="font-display text-xl font-bold text-dj-texte">Installer Classinus sur Android</h1>
              <p className="mt-2 text-sm text-dj-texte-muet">
                Pas de fichier à télécharger : Classinus s&apos;installe directement depuis ton navigateur.
              </p>
            </>
          ) : estWindows ? (
            <>
              <h1 className="font-display text-xl font-bold text-dj-texte">Télécharger Classinus pour Windows</h1>
              <p className="mt-2 text-sm text-dj-texte-muet">
                L&apos;application de bureau s&apos;installe en un clic, sans droits administrateur, et se
                met à jour toute seule ensuite.
              </p>
            </>
          ) : estIOS ? (
            <>
              <h1 className="font-display text-xl font-bold text-dj-texte">Installer Classinus sur iPhone / iPad</h1>
              <p className="mt-2 text-sm text-dj-texte-muet">
                Pas de fichier à télécharger sur iOS : Classinus s&apos;installe directement depuis Safari.
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-xl font-bold text-dj-texte">
                L&apos;application de bureau n&apos;existe que pour Windows
              </h1>
              <p className="mt-2 text-sm text-dj-texte-muet">
                Pour l&apos;instant, Classinus s&apos;installe sur Windows, Android et iPhone. Scanne ce code
                avec ton téléphone pour accéder au téléchargement.
              </p>
            </>
          )}

          <div className="mt-5 rounded-xl border border-dj-bordure bg-dj-surface-haute p-4">
            {estAndroid ? (
              <InstallationAndroid />
            ) : estWindows ? (
              releasePc ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-sm font-medium text-dj-texte">Version {releasePc.version}</span>
                      <span className="block text-xs text-dj-texte-muet">
                        Windows &middot; {formatTaille(releasePc.tailleOctets)}
                      </span>
                    </div>
                  </div>
                  <a href={releasePc.urlTelechargement} data-lien-libre className="mt-4 block">
                    <Bouton className="flex w-full items-center justify-center gap-2">
                      <Download size={16} />
                      Télécharger pour Windows
                    </Bouton>
                  </a>
                  {releasePc.urlNotes && (
                    <Link
                      href={releasePc.urlNotes}
                      className="mt-3 flex items-center justify-center gap-1.5 text-xs text-dj-texte-muet hover:text-dj-texte hover:underline"
                    >
                      Voir les notes de version
                      <ExternalLink size={12} />
                    </Link>
                  )}
                </>
              ) : (
                <p className="text-sm text-dj-texte-muet">
                  L&apos;installeur Windows n&apos;est pas disponible au téléchargement pour le moment.
                  Réessaie dans quelques minutes.
                </p>
              )
            ) : estIOS ? (
              <EtapesInstallation ios />
            ) : (
              <QrTelechargerPc url={urlPage} />
            )}
          </div>

          {estWindows && releasePc && (
            <div className="mt-5 flex items-start gap-2.5 text-xs text-dj-texte-muet">
              <ShieldCheck size={15} className="mt-0.5 flex-shrink-0" />
              <div>
                <p>
                  Windows peut afficher un message{" "}
                  <span className="text-dj-texte">« Windows a protégé votre ordinateur »</span> au premier
                  lancement, parce que l&apos;installeur n&apos;est pas encore signé. C&apos;est normal : clique sur{" "}
                  <span className="text-dj-texte">« Informations complémentaires »</span> puis sur{" "}
                  <span className="text-dj-texte">« Exécuter quand même »</span> pour continuer.
                </p>
                <p className="mt-2">
                  Une fois installée, l&apos;application vérifie elle-même si une mise à jour est disponible.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
