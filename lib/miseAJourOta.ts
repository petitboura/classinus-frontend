// Mise à jour OTA de l'appli installée (Capacitor) : le code web de l'appli
// peut être remplacé sans réinstaller l'APK.
//
// Mode manuel du plugin @capgo/capacitor-updater (autoUpdate désactivé dans
// capacitor.config.ts) : c'est ce fichier qui décide quand télécharger.
//
// Déroulé à chaque ouverture de l'appli installée :
//   1. notifyAppReady : confirme que le bundle en cours démarre bien. Sans cet
//      appel, le plugin revient tout seul à la version précédente.
//   2. Si le plugin a annulé une mise à jour, on retient sa version pour ne
//      jamais la retélécharger en boucle.
//   3. Lecture de latest.json (publié par .github/workflows/ota.yml).
//   4. Si le bundle publié est plus récent que celui qui tourne, compatible
//      avec cet APK et jamais échoué : téléchargement en arrière-plan, puis
//      activation à la prochaine ouverture (next, jamais de rechargement
//      brutal pendant que la personne utilise l'appli).
//
// Aucun effet sur le web : tout est derrière Capacitor.isNativePlatform() et
// les imports sont dynamiques (même convention que lib/versionInstallee.ts),
// donc l'export statique et le site Vercel ne changent pas.
//
// Silencieux par conception : aucune erreur n'est montrée à la personne, une
// mise à jour manquée sera simplement retentée à l'ouverture suivante.

type CapacitorUpdaterApi = typeof import("@capgo/capacitor-updater").CapacitorUpdater;

type InfosOta = {
  version: string;
  url: string;
  sha256: string;
  versionNativeMin: number;
  heureBuild: number;
};

// Adresse de latest.json. Surchargeable par NEXT_PUBLIC_OTA_LATEST_URL (voir
// .env.local.example), cette valeur sert de repli pour que l'APK construit en
// local fonctionne sans configuration supplémentaire.
const URL_LATEST_PAR_DEFAUT =
  "https://raw.githubusercontent.com/petitboura/classinus-updates/main/latest.json";

const CLE_VERSIONS_ECHOUEES = "classinus:ota:versions-echouees";
const NOMBRE_MAX_ECHECS_RETENUS = 20;

function lireInfos(brut: unknown): InfosOta | null {
  if (!brut || typeof brut !== "object") return null;
  const o = brut as Record<string, unknown>;
  if (typeof o.version !== "string" || o.version.length === 0) return null;
  if (typeof o.url !== "string" || !o.url.startsWith("https://")) return null;
  if (typeof o.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(o.sha256)) return null;
  if (typeof o.versionNativeMin !== "number" || !Number.isInteger(o.versionNativeMin)) return null;
  if (typeof o.heureBuild !== "number" || !Number.isFinite(o.heureBuild)) return null;
  return {
    version: o.version,
    url: o.url,
    sha256: o.sha256,
    versionNativeMin: o.versionNativeMin,
    heureBuild: o.heureBuild,
  };
}

function lireVersionsEchouees(): string[] {
  try {
    const brut = window.localStorage.getItem(CLE_VERSIONS_ECHOUEES);
    const liste = brut ? JSON.parse(brut) : [];
    return Array.isArray(liste) ? liste.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function retenirEchec(version: string): void {
  try {
    const liste = lireVersionsEchouees();
    if (liste.includes(version)) return;
    liste.push(version);
    window.localStorage.setItem(
      CLE_VERSIONS_ECHOUEES,
      JSON.stringify(liste.slice(-NOMBRE_MAX_ECHECS_RETENUS))
    );
  } catch {
    // Stockage indisponible : au pire une version échouée sera retentée.
  }
}

async function preparerMiseAJour(CapacitorUpdater: CapacitorUpdaterApi): Promise<void> {
  // Heure de construction du code qui tourne en ce moment, injectée au build
  // (voir next.config.mjs). Sans elle, impossible de savoir si le bundle
  // publié est plus récent : on ne fait rien.
  const heureBuildLocale = Number(process.env.NEXT_PUBLIC_BUILD_TIME);
  if (!Number.isFinite(heureBuildLocale)) return;

  const urlLatest = process.env.NEXT_PUBLIC_OTA_LATEST_URL || URL_LATEST_PAR_DEFAUT;
  const reponse = await fetch(urlLatest, { cache: "no-store" });
  if (!reponse.ok) return;

  const infos = lireInfos(await reponse.json());
  if (!infos) return;

  // Pas plus récent que le code qui tourne : rien à faire. Ce test empêche
  // aussi de revenir en arrière quand un nouvel APK embarque un code plus
  // récent que le dernier bundle publié.
  if (infos.heureBuild <= heureBuildLocale) return;

  if (lireVersionsEchouees().includes(infos.version)) return;

  // Ce bundle exige un APK plus récent que celui installé.
  const { App } = await import("@capacitor/app");
  const natif = await App.getInfo();
  const buildNatif = Number.parseInt(natif.build, 10);
  if (!Number.isFinite(buildNatif) || buildNatif < infos.versionNativeMin) return;

  const { bundle: courant } = await CapacitorUpdater.current();
  if (courant.version === infos.version) return;

  const { bundles } = await CapacitorUpdater.list();
  const dejaTelecharge = bundles.find((b) => b.version === infos.version && b.status !== "error");
  const bundle =
    dejaTelecharge ??
    (await CapacitorUpdater.download({
      url: infos.url,
      version: infos.version,
      checksum: infos.sha256,
    }));

  await CapacitorUpdater.next({ id: bundle.id });
}

export async function lancerMiseAJourOta(): Promise<void> {
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return;

  const { CapacitorUpdater } = await import("@capgo/capacitor-updater");

  // Toujours en premier : le plugin annule le bundle en cours si cet appel
  // n'arrive pas dans les 10 secondes après le démarrage.
  try {
    await CapacitorUpdater.notifyAppReady();
  } catch {
    // Plugin absent de cet APK (ancienne version) : rien à faire.
    return;
  }

  try {
    const echec = await CapacitorUpdater.getFailedUpdate();
    if (echec?.bundle?.version) retenirEchec(echec.bundle.version);
  } catch {
    // Information facultative.
  }

  try {
    await preparerMiseAJour(CapacitorUpdater);
  } catch {
    // Pas de connexion ou service indisponible : on retentera à la prochaine ouverture.
  }
}
