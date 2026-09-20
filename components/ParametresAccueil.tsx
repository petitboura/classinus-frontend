"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, SlidersHorizontal, Lock, HelpCircle, Info, Trash2, Download, Smartphone, Accessibility, LogOut, type LucideIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { lireMonProfil, supprimerMonCompte, exporterMesDonnees } from "@/lib/api";
import { messageErreur, ErreurApi } from "@/lib/erreurs";
import { Skeleton } from "./Skeleton";
import { CTACompteRequis } from "./CTACompteRequis";
import { ROUTES_PARAMETRES } from "@/lib/routesParametres";

// 19/09/2026, demande Bourama : Paramètres fonctionne maintenant comme
// Personnaliser Classinus/Bibliothèque/Bureau/Concentration -- cette page
// d'accueil ne garde que ce qui n'est PAS une vraie page fille : la carte
// de profil (résumé, l'écran complet est /parametres/profil) et les 3
// actions (Exporter mes données, Se déconnecter, Supprimer mon compte),
// qui exécutent quelque chose plutôt que d'afficher un contenu. Les 7
// autres lignes viennent de lib/sectionsParametres.tsx et sont de vraies
// adresses (Link), plus des boutons qui changeaient juste `vue` en
// interne (ancien composant EspaceParametres.tsx, supprimé).
//
// Pas de ListeSections.tsx générique ici : cette page mélange des lignes
// de navigation avec une carte de profil différente et des lignes
// d'action -- LigneLien/LigneAction ci-dessous reprennent exactement le
// même visuel (mêmes classes) que l'ancien LigneListe.

type ProfilMoi = {
  user_id: string;
  nom_affiche: string;
  bio: string;
  avatar_url: string | null;
};

function Liste({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-cgpt-carte border border-dj-bordure bg-dj-surface">
      <div className="divide-y divide-dj-bordure">{children}</div>
    </div>
  );
}

function LigneLien({ icone: Icone, titre, sousTitre, href }: { icone: LucideIcon; titre: string; sousTitre?: string; href: string }) {
  return (
    <Link href={href} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-dj-surface-haute">
      <Icone size={18} className="flex-shrink-0 text-dj-texte-muet" />
      <div className="flex-1 overflow-hidden">
        <div className="truncate text-sm text-dj-texte">{titre}</div>
        {sousTitre && <div className="truncate text-xs text-dj-texte-muet">{sousTitre}</div>}
      </div>
      <ChevronRight size={16} className="flex-shrink-0 text-dj-texte-muet" />
    </Link>
  );
}

function LigneAction({
  icone: Icone,
  titre,
  sousTitre,
  onClick,
  danger = false,
}: {
  icone: LucideIcon;
  titre: string;
  sousTitre?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-dj-surface-haute">
      <Icone size={18} className={danger ? "flex-shrink-0 text-[var(--dj-erreur)]" : "flex-shrink-0 text-dj-texte-muet"} />
      <div className="flex-1 overflow-hidden">
        <div className={`truncate text-sm ${danger ? "text-[var(--dj-erreur)]" : "text-dj-texte"}`}>{titre}</div>
        {sousTitre && <div className="truncate text-xs text-dj-texte-muet">{sousTitre}</div>}
      </div>
      {!danger && <ChevronRight size={16} className="flex-shrink-0 text-dj-texte-muet" />}
    </button>
  );
}

export function ParametresAccueil() {
  const router = useRouter();

  const [chargement, setChargement] = useState(true);
  const [sansCompte, setSansCompte] = useState(false);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);
  const [profil, setProfil] = useState<ProfilMoi | null>(null);

  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  const [exportEnCours, setExportEnCours] = useState(false);
  const [erreurExport, setErreurExport] = useState<string | null>(null);
  const [erreurSuppression, setErreurSuppression] = useState<string | null>(null);

  useEffect(() => {
    lireMonProfil()
      .then((p: ProfilMoi) => setProfil(p))
      .catch((e) => {
        if (e instanceof ErreurApi && e.statusCode === 401) {
          setSansCompte(true);
        } else {
          setErreurChargement(messageErreur(e));
        }
      })
      .finally(() => setChargement(false));
  }, []);

  async function handleExporterMesDonnees() {
    if (!window.confirm("Télécharger une copie de toutes tes données Classinus ?")) return;

    setExportEnCours(true);
    setErreurExport(null);
    try {
      await exporterMesDonnees();
    } catch (e) {
      setErreurExport(messageErreur(e));
    } finally {
      setExportEnCours(false);
    }
  }

  async function seDeconnecter() {
    if (!window.confirm("Se déconnecter de Classinus ?")) return;

    await supabase.auth.signOut();
    window.location.href = "/connexion";
  }

  async function confirmerSuppressionCompte() {
    // Double confirmation (05/09/2026, demande Bourama : "la suppression
    // même doit demander deux fois") -- un premier window.confirm ici,
    // puis la saisie "SUPPRIMER" ci-dessous, pour cette action seule.
    if (!window.confirm("Supprimer définitivement ton compte Classinus ?")) return;

    const saisie = window.prompt(
      'Cette action est définitive : ton profil, tes IA, tes commentaires et tout ce qui t\'appartient sur Classinus seront supprimés. Tape "SUPPRIMER" pour confirmer.'
    );
    if (saisie !== "SUPPRIMER") return;

    setSuppressionEnCours(true);
    setErreurSuppression(null);
    try {
      await supprimerMonCompte();
      await supabase.auth.signOut();
      router.push("/");
    } catch (e) {
      setErreurSuppression(messageErreur(e));
      setSuppressionEnCours(false);
    }
  }

  if (sansCompte) {
    return <CTACompteRequis texte="Crée un compte pour gérer ton profil et tes préférences." />;
  }

  if (chargement) {
    return (
      <div className="flex flex-col gap-4" aria-hidden>
        <div className="flex w-full items-center gap-3 rounded-cgpt-carte border border-dj-bordure bg-dj-surface px-4 py-3.5">
          <Skeleton className="h-11 w-11 flex-shrink-0 rounded-full border border-dj-bordure" />
          <div className="flex-1 overflow-hidden">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-28 rounded" />
              <Skeleton className="h-2.5 w-20 rounded" />
            </div>
          </div>
          <Skeleton className="h-4 w-4 flex-shrink-0 rounded" />
        </div>

        <div className="overflow-hidden rounded-cgpt-carte border border-dj-bordure bg-dj-surface">
          <div className="divide-y divide-dj-bordure">
            {["w-24", "w-44", "w-28", "w-16"].map((largeur, i) => (
              <div key={i} className="flex w-full items-center gap-3 px-4 py-3">
                <Skeleton className="h-[18px] w-[18px] flex-shrink-0 rounded" />
                <div className="flex-1 overflow-hidden">
                  <Skeleton className={`h-3.5 ${largeur} rounded`} />
                </div>
                <Skeleton className="h-4 w-4 flex-shrink-0 rounded" />
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-cgpt-carte border border-dj-bordure bg-dj-surface">
          <div className="divide-y divide-dj-bordure">
            <div className="flex w-full items-center gap-3 px-4 py-3">
              <Skeleton className="h-[18px] w-[18px] flex-shrink-0 rounded" />
              <div className="flex-1 overflow-hidden">
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-36 rounded" />
                  <Skeleton className="h-2.5 w-32 rounded" />
                </div>
              </div>
              <Skeleton className="h-4 w-4 flex-shrink-0 rounded" />
            </div>
            <div className="flex w-full items-center gap-3 px-4 py-3">
              <Skeleton className="h-[18px] w-[18px] flex-shrink-0 rounded" />
              <div className="flex-1 overflow-hidden">
                <Skeleton className="h-3.5 w-24 rounded" />
              </div>
              <Skeleton className="h-4 w-4 flex-shrink-0 rounded" />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-cgpt-carte border border-dj-bordure bg-dj-surface">
          <div className="flex w-full items-center gap-3 px-4 py-3">
            <Skeleton className="h-[18px] w-[18px] flex-shrink-0 rounded" />
            <div className="flex-1 overflow-hidden">
              <Skeleton className="h-3.5 w-28 rounded" />
            </div>
            <Skeleton className="h-4 w-4 flex-shrink-0 rounded" />
          </div>
        </div>

        <div className="overflow-hidden rounded-cgpt-carte border border-dj-bordure bg-dj-surface">
          <div className="flex w-full items-center gap-3 px-4 py-3">
            <Skeleton className="h-[18px] w-[18px] flex-shrink-0 rounded" />
            <div className="flex-1 overflow-hidden">
              <Skeleton className="h-3.5 w-32 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (erreurChargement) {
    return <p className="text-sm text-[var(--dj-erreur)]">{erreurChargement}</p>;
  }

  const libelleProfil = profil?.nom_affiche || "Mon compte";

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={ROUTES_PARAMETRES.profil}
        className="flex w-full items-center gap-3 rounded-cgpt-carte border border-dj-bordure bg-dj-surface px-4 py-3.5 text-left transition-colors hover:bg-dj-surface-haute"
      >
        <span className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-full border border-dj-bordure bg-dj-surface-haute">
          {profil?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- avatar_url vient de Supabase Storage
            <img src={profil.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-base font-bold text-dj-texte-muet">
              {libelleProfil.trim().charAt(0).toUpperCase()}
            </span>
          )}
        </span>
        <div className="flex-1 overflow-hidden">
          <div className="truncate text-sm font-medium text-dj-texte">{libelleProfil}</div>
          <div className="truncate text-xs text-dj-texte-muet">Photo, nom, bio</div>
        </div>
        <ChevronRight size={16} className="flex-shrink-0 text-dj-texte-muet" />
      </Link>

      <Liste>
        <LigneLien icone={SlidersHorizontal} titre="Préférences" href={ROUTES_PARAMETRES.preferences} />
        <LigneLien icone={Lock} titre="Confidentialité et sécurité" href={ROUTES_PARAMETRES.confidentialite} />
        <LigneLien icone={HelpCircle} titre="Aide et support" href={ROUTES_PARAMETRES.aide} />
        <LigneLien icone={Info} titre="À propos" href={ROUTES_PARAMETRES.aPropos} />
      </Liste>

      {/* Groupe "Capacités du téléphone" + Accessibilité (26/08/2026,
          décision Bourama, voir /areas/clovis.md) -- plugins natifs
          Capacitor sans écran jusqu'ici. Chaque carte/écran gère déjà son
          propre état "disponible seulement sur mobile" (usePluginNatif),
          donc rien à faire ici pour le web. */}
      <Liste>
        <LigneLien icone={Smartphone} titre="Capacités du téléphone" sousTitre="Connecteurs, mise à jour, nom de l'appareil" href={ROUTES_PARAMETRES.capacitesTelephone} />
        <LigneLien icone={Accessibility} titre="Accessibilité" href={ROUTES_PARAMETRES.accessibilite} />
      </Liste>

      <Liste>
        <LigneAction
          icone={Download}
          titre={exportEnCours ? "Export en cours…" : "Exporter mes données"}
          sousTitre="Télécharger une copie de tout ce que Classinus sait sur toi"
          onClick={handleExporterMesDonnees}
        />
      </Liste>
      {erreurExport && <p className="text-sm text-[var(--dj-erreur)]">{erreurExport}</p>}

      <Liste>
        <LigneAction icone={LogOut} titre="Se déconnecter" onClick={seDeconnecter} />
      </Liste>

      <Liste>
        <LigneAction
          icone={Trash2}
          titre={suppressionEnCours ? "Suppression…" : "Supprimer mon compte"}
          onClick={confirmerSuppressionCompte}
          danger
        />
      </Liste>
      {erreurSuppression && <p className="text-sm text-[var(--dj-erreur)]">{erreurSuppression}</p>}
    </div>
  );
}
