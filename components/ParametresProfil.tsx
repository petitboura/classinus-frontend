"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { appelerApiFichier, lireMonProfil, enregistrerMonProfil, obtenirMonStatut } from "@/lib/api";
import { messageErreur, ErreurApi } from "@/lib/erreurs";
import { Skeleton } from "./Skeleton";
import { CTACompteRequis } from "./CTACompteRequis";

// 19/09/2026, demande Bourama : ancien écran "profil" d'EspaceParametres.tsx
// (vue interne), devenu sa propre page (/parametres/profil). Contenu et
// logique inchangés, juste sorti de l'ancien état `vue`.
type ProfilMoi = {
  user_id: string;
  nom_affiche: string;
  bio: string;
  avatar_url: string | null;
};

export function ParametresProfil() {
  const [chargement, setChargement] = useState(true);
  const [sansCompte, setSansCompte] = useState(false);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);

  const [profil, setProfil] = useState<ProfilMoi | null>(null);
  const [nomAffiche, setNomAffiche] = useState("");
  const [bio, setBio] = useState("");

  // 18/09/2026, chantier "profil contributeur bibliotheque publique",
  // étape 11 : bio/nom/photo visibles par un visiteur externe (voir
  // GET /api/profiles/{user_id}) seulement si ce réglage est actif.
  const [profilPublicActif, setProfilPublicActif] = useState(false);
  const [enregistrementProfilPublic, setEnregistrementProfilPublic] = useState(false);
  const [messageProfilPublic, setMessageProfilPublic] = useState<string | null>(null);
  // Partie 7 (06/09/2026, plan confiance pédagogique, Point 3) : null =
  // jamais répondu, ne vient pas de ProfilMoi (public, voir
  // api/profiles.py::ProfilPublic -- volontairement absent de ce modèle
  // pour ne jamais l'exposer sur un profil public), lu séparément via
  // GET /api/profiles/moi/statut.
  const [estMajeur, setEstMajeur] = useState<boolean | null>(null);
  const [enregistrementMajeur, setEnregistrementMajeur] = useState(false);
  const [erreurMajeur, setErreurMajeur] = useState<string | null>(null);

  const [enregistrementProfil, setEnregistrementProfil] = useState(false);
  const [messageProfil, setMessageProfil] = useState<string | null>(null);
  const [erreurProfil, setErreurProfil] = useState<string | null>(null);

  const [uploadEnCours, setUploadEnCours] = useState(false);
  const [erreurAvatar, setErreurAvatar] = useState<string | null>(null);
  const inputFichierRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    lireMonProfil()
      .then((p: ProfilMoi & { profil_public?: boolean }) => {
        setProfil(p);
        setNomAffiche(p.nom_affiche || "");
        setBio(p.bio || "");
        setProfilPublicActif(!!p.profil_public);
      })
      .catch((e) => {
        if (e instanceof ErreurApi && e.statusCode === 401) {
          setSansCompte(true);
        } else {
          setErreurChargement(messageErreur(e));
        }
      })
      .finally(() => setChargement(false));
    obtenirMonStatut()
      .then((s) => setEstMajeur(s.est_majeur))
      .catch(() => {
        // Silencieux : ce champ reste modifiable même si cette lecture
        // échoue (juste sans présélection de la réponse déjà donnée).
      });
  }, []);

  async function enregistrerProfil() {
    setEnregistrementProfil(true);
    setErreurProfil(null);
    setMessageProfil(null);
    try {
      await enregistrerMonProfil({ nom_affiche: nomAffiche.trim(), bio: bio.trim() });
      setMessageProfil("Profil enregistré.");
    } catch (e) {
      setErreurProfil(messageErreur(e));
    } finally {
      setEnregistrementProfil(false);
    }
  }

  async function changerAvatar(fichier: File) {
    setUploadEnCours(true);
    setErreurAvatar(null);
    try {
      const { url } = await appelerApiFichier("/api/uploads/image", fichier);
      await enregistrerMonProfil({ avatar_url: url });
      setProfil((p) => (p ? { ...p, avatar_url: url } : p));
    } catch (e) {
      setErreurAvatar(messageErreur(e));
    } finally {
      setUploadEnCours(false);
    }
  }

  async function basculerProfilPublic(nouvelleValeur: boolean) {
    if (nouvelleValeur === profilPublicActif) return;
    setProfilPublicActif(nouvelleValeur); // optimiste
    setEnregistrementProfilPublic(true);
    setMessageProfilPublic(null);
    try {
      await enregistrerMonProfil({ profil_public: nouvelleValeur });
      setMessageProfilPublic(
        nouvelleValeur
          ? "Ton profil est désormais visible sur les éléments publics que tu ajoutes."
          : "Ton profil n'est plus visible publiquement.",
      );
    } catch (e) {
      setProfilPublicActif(!nouvelleValeur);
      setMessageProfilPublic(messageErreur(e));
    } finally {
      setEnregistrementProfilPublic(false);
    }
  }

  async function choisirMajeur(valeur: boolean) {
    if (valeur === estMajeur) return;
    const precedent = estMajeur;
    setEstMajeur(valeur); // optimiste
    setEnregistrementMajeur(true);
    setErreurMajeur(null);
    try {
      await enregistrerMonProfil({ est_majeur: valeur });
    } catch (e) {
      setEstMajeur(precedent);
      setErreurMajeur(messageErreur(e));
    } finally {
      setEnregistrementMajeur(false);
    }
  }

  if (sansCompte) {
    return <CTACompteRequis texte="Crée un compte pour gérer ton profil et tes préférences." />;
  }

  if (chargement) {
    return (
      <div className="flex flex-col gap-4 rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-4" aria-hidden>
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 flex-shrink-0 rounded-full" />
          <Skeleton className="h-3.5 w-28 rounded" />
        </div>
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    );
  }

  if (erreurChargement) {
    return <p className="text-sm text-[var(--dj-erreur)]">{erreurChargement}</p>;
  }

  const libelleProfil = nomAffiche || "Mon compte";

  return (
    <div className="flex flex-col gap-4 rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-4">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => inputFichierRef.current?.click()}
          disabled={uploadEnCours}
          aria-label="Changer la photo de profil"
          className="group relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border border-dj-bordure bg-dj-surface-haute disabled:opacity-60"
        >
          {profil?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- avatar_url vient de Supabase Storage
            <img src={profil.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-lg font-bold text-dj-texte-muet">
              {libelleProfil.trim().charAt(0).toUpperCase()}
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
            <Camera size={18} className={uploadEnCours ? "animate-pulse" : ""} />
          </span>
        </button>
        <input
          ref={inputFichierRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const fichier = e.target.files?.[0];
            if (fichier) changerAvatar(fichier);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputFichierRef.current?.click()}
          disabled={uploadEnCours}
          className="text-sm font-medium text-dj-texte-muet hover:text-dj-texte hover:underline disabled:opacity-50"
        >
          {uploadEnCours ? "Envoi…" : "Changer la photo"}
        </button>
      </div>
      {erreurAvatar && <p className="text-sm text-[var(--dj-erreur)]">{erreurAvatar}</p>}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="nom-affiche" className="text-sm font-medium text-dj-texte">
          Nom affiché
        </label>
        <input
          id="nom-affiche"
          type="text"
          value={nomAffiche}
          onChange={(e) => setNomAffiche(e.target.value)}
          placeholder="Ton nom"
          className="w-full rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-bordure-forte"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="bio" className="text-sm font-medium text-dj-texte">
          Bio
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          placeholder="Quelques mots sur toi (optionnel)."
          className="w-full resize-y rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-bordure-forte"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-dj-texte">Âge</span>
        <p className="text-xs leading-relaxed text-dj-texte-muet">
          Sert uniquement à adapter la protection prévue pour les mineurs (mode unique par conversation, accès réservé
          aux codes reçus d'un professeur ou établissement). Jamais affiché publiquement.
        </p>
        <div className="mt-1 flex gap-2">
          <button
            type="button"
            onClick={() => choisirMajeur(true)}
            disabled={enregistrementMajeur}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
              estMajeur === true
                ? "border-dj-accent-1 bg-dj-accent-1/10 text-dj-texte"
                : "border-dj-bordure bg-dj-surface-haute text-dj-texte-muet hover:bg-dj-surface"
            }`}
          >
            J'ai 18 ans ou plus
          </button>
          <button
            type="button"
            onClick={() => choisirMajeur(false)}
            disabled={enregistrementMajeur}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
              estMajeur === false
                ? "border-dj-accent-1 bg-dj-accent-1/10 text-dj-texte"
                : "border-dj-bordure bg-dj-surface-haute text-dj-texte-muet hover:bg-dj-surface"
            }`}
          >
            J'ai moins de 18 ans
          </button>
        </div>
        {erreurMajeur && <p className="text-sm text-[var(--dj-erreur)]">{erreurMajeur}</p>}
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-dj-bordure pt-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-dj-texte">Profil public</span>
          <span className="text-xs text-dj-texte-muet">
            Ta photo, ton nom et ta bio deviennent visibles sur les fichiers, dossiers et skills que tu publies.
            Obligatoire pour pouvoir commenter. Sans ça, tu restes anonyme sur la bibliothèque publique.
          </span>
        </div>
        <button
          role="switch"
          aria-checked={profilPublicActif}
          onClick={() => basculerProfilPublic(!profilPublicActif)}
          disabled={enregistrementProfilPublic}
          className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            profilPublicActif ? "bg-dj-accent-1" : "bg-dj-inactif"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              profilPublicActif ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      {messageProfilPublic && <span className="text-sm text-dj-texte-muet">{messageProfilPublic}</span>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={enregistrerProfil}
          disabled={enregistrementProfil}
          className="rounded-cgpt-bouton bg-dj-accent-1 px-5 py-2 text-sm font-bold text-[#1A0D02] transition-colors hover:bg-dj-accent-2 disabled:opacity-50"
        >
          {enregistrementProfil ? "Enregistrement…" : "Enregistrer"}
        </button>
        {messageProfil && <span className="text-sm text-dj-texte-muet">{messageProfil}</span>}
      </div>
      {erreurProfil && <p className="text-sm text-[var(--dj-erreur)]">{erreurProfil}</p>}
    </div>
  );
}
