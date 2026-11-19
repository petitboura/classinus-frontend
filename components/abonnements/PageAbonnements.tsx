"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, LoaderCircle } from "lucide-react";
import { CaseACocher } from "@/components/CaseACocher";
import { CompteRequisModal } from "@/components/CompteRequisModal";
import { SelectPersonnalise, type OptionMenu } from "@/components/SelectPersonnalise";
import { Skeleton } from "@/components/Skeleton";
import { CartePalierListeAttente } from "@/components/chat/CartePalierListeAttente";
import { CapacitesParCategorie } from "@/components/abonnements/CapacitesParCategorie";
import { ErreurApi, messageErreur } from "@/lib/erreurs";
import { obtenirLocale } from "@/lib/i18n/locale";
import {
  CODES_PAYS,
  MODELE_PAGE_DIRECTE,
  lireConfigListeAttente,
  nomDuPays,
  noterEtapeListeAttente,
  remplirTexte,
  seDesinscrireListeAttente,
  sInscrireListeAttente,
  sourceListeAttente,
  type ConfigListeAttente,
  type Profil,
} from "@/lib/listeAttente";

// Page des abonnements (18/11/2026, demande de Bourama). Avant, la liste d'attente s'ouvrait dans une
// fenêtre avec son propre défilement ; c'est maintenant une vraie page, ouverte quand la personne clique
// sur un modèle grisé du sélecteur (adresse /abonnements?modele=...&nom=...). Un visiteur sans compte
// peut la voir ; le compte n'est demandé qu'au moment de rejoindre la liste. Aucun paiement n'est pris.
// Paliers, profils et tous les textes viennent du serveur (Supabase), en français et en anglais : rien
// n'est écrit en dur ici. Voir api/liste_attente.py côté backend.

const BOUTON_PRINCIPAL =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-dj-accent-1 px-5 py-3 text-base font-bold text-[#1A0D02] transition-colors hover:bg-dj-accent-2 disabled:cursor-not-allowed disabled:opacity-50";
const BOUTON_SECONDAIRE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-dj-bordure px-4 py-3 text-base font-semibold text-dj-texte transition-colors hover:bg-dj-surface-haute disabled:opacity-50";
const TITRE_CHAMP = "text-sm font-semibold text-dj-texte-muet sm:text-base";

type Etat = "formulaire" | "deja_inscrit" | "merci" | "desinscrit";

export function PageAbonnements() {
  const router = useRouter();
  const parametres = useSearchParams();
  const modeleId = parametres.get("modele") || MODELE_PAGE_DIRECTE;
  const modeleLabel = parametres.get("nom") || "";
  const locale = obtenirLocale();

  const [config, setConfig] = useState<ConfigListeAttente | null>(null);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);
  const [etat, setEtat] = useState<Etat>("formulaire");
  const [palier, setPalier] = useState<number | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [pays, setPays] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [consentement, setConsentement] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [compteRequis, setCompteRequis] = useState(false);

  useEffect(() => {
    noterEtapeListeAttente("formulaire_ouvert", modeleId, locale);
    let actif = true;
    lireConfigListeAttente()
      .then((c) => {
        if (!actif) return;
        setConfig(c);
        // Une seule liste d'attente : la personne est déjà inscrite quel que soit le modèle cliqué.
        if (c.inscription) {
          setPalier(c.inscription.palier_prix);
          setProfil(c.inscription.profil);
          setEtat("deja_inscrit");
        }
      })
      .catch((e) => {
        if (actif) setErreurChargement(messageErreur(e));
      });
    return () => {
      actif = false;
    };
    // Une seule ouverture par modèle : la page est remontée quand l'adresse change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeleId]);

  // Texte de la langue choisie, sinon le français, sinon rien (jamais une clé brute à l'écran).
  const t = useMemo(() => {
    return (cle: string, valeurs: Record<string, string | number> = {}) => {
      const texte = config?.textes[locale]?.[cle] ?? config?.textes.fr?.[cle] ?? "";
      return remplirTexte(texte, { modele: modeleLabel, ...valeurs });
    };
  }, [config, locale, modeleLabel]);

  const optionsPays: OptionMenu[] = useMemo(
    () =>
      CODES_PAYS.map((code) => ({ id: code, label: nomDuPays(code, locale) })).sort((a, b) =>
        a.label.localeCompare(b.label, locale),
      ),
    [locale],
  );

  const peutValider = palier !== null && profil !== null && consentement && !envoi;

  // Retour au chat (ou à la page d'où la personne vient). Sans historique, on revient à l'accueil.
  function revenir() {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/");
  }

  async function valider() {
    if (palier === null || profil === null) return;
    setEnvoi(true);
    setErreur(null);
    try {
      await sInscrireListeAttente({
        modele_id: modeleId,
        palier_prix: palier,
        profil,
        consentement,
        pays: pays || null,
        whatsapp: whatsapp.trim() || null,
        langue: locale,
        source: sourceListeAttente(),
      });
      setEtat("merci");
    } catch (e) {
      // Un visiteur sans compte voit la fenêtre "Compte requis" au lieu d'une erreur technique.
      if (e instanceof ErreurApi && e.code === "CONNEXION_REQUISE") setCompteRequis(true);
      else setErreur(messageErreur(e));
    } finally {
      setEnvoi(false);
    }
  }

  async function desinscrire() {
    setEnvoi(true);
    setErreur(null);
    try {
      await seDesinscrireListeAttente();
      setEtat("desinscrit");
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnvoi(false);
    }
  }

  const libelleRetour = t("attente_retour") || (locale === "en" ? "Back" : "Retour");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-6 pt-6 sm:px-6 sm:pt-10">
      <header className="flex flex-col gap-4">
        <button
          type="button"
          onClick={revenir}
          className="-ml-2 inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1.5 text-base font-medium text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
        >
          <ArrowLeft size={18} />
          {libelleRetour}
        </button>

        <div className="flex flex-col gap-3">
          {modeleLabel && (
            <span className="w-fit max-w-full truncate rounded-full border border-dj-bordure bg-dj-surface-haute px-3 py-1 text-sm font-semibold text-dj-texte-muet">
              {modeleLabel}
            </span>
          )}
          <h1 className="text-3xl font-bold text-dj-texte sm:text-4xl">
            {config ? t("attente_titre") : <Skeleton className="h-8 w-64 rounded" />}
          </h1>
          {config && etat === "formulaire" && <p className="max-w-2xl text-base text-dj-texte sm:text-lg">{t("attente_intro")}</p>}
        </div>
      </header>

      {erreurChargement && <p className="text-base text-[var(--dj-erreur)]">{erreurChargement}</p>}

      {!config && !erreurChargement && (
        <div className="flex flex-col gap-4" aria-hidden>
          <Skeleton className="h-4 w-full max-w-2xl rounded" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      )}

      {config && etat === "formulaire" && (
        <div className="flex animate-dj-fade-in-rapide flex-col gap-8 motion-reduce:animate-none">
          <p className="rounded-lg border border-dj-bordure bg-dj-surface-haute px-4 py-3 text-sm font-medium text-dj-texte sm:text-base">
            {t("attente_aucun_paiement")}
          </p>

          <section role="radiogroup" aria-label={t("attente_palier_label")} className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-dj-texte sm:text-2xl">{t("attente_palier_label")}</h2>
            <div className="grid gap-4 pt-2 md:grid-cols-3">
              {config.paliers.map((p) => (
                <CartePalierListeAttente
                  key={p.prix_usd}
                  palier={p}
                  choisi={palier === p.prix_usd}
                  onChoisir={() => setPalier(p.prix_usd)}
                  t={t}
                />
              ))}
            </div>
          </section>

          <CapacitesParCategorie t={t} locale={locale} modeles={config.modeles ?? []} />

          <section className="flex flex-col gap-5 rounded-2xl border border-dj-bordure p-4 sm:p-6">
            <fieldset className="flex flex-col gap-2">
              <legend className={`mb-1 ${TITRE_CHAMP}`}>{t("attente_profil_label")}</legend>
              <div className="flex flex-wrap gap-2">
                {config.profils.map((p) => {
                  const choisi = profil === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      role="radio"
                      aria-checked={choisi}
                      onClick={() => setProfil(p)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors sm:text-base ${
                        choisi
                          ? "border-dj-accent-1 bg-dj-accent-1 text-[#1A0D02]"
                          : "border-dj-bordure text-dj-texte hover:bg-dj-surface-haute"
                      }`}
                    >
                      {t(`attente_profil_${p}`)}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <span className={TITRE_CHAMP}>{t("attente_pays_label")}</span>
                <SelectPersonnalise options={optionsPays} valeur={pays} onChange={setPays} placeholder="" />
              </div>
              <label className="flex flex-col gap-1.5">
                <span className={TITRE_CHAMP}>{t("attente_whatsapp_label")}</span>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={32}
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="rounded-lg border border-dj-bordure bg-dj-surface px-3 py-2.5 text-base text-dj-texte outline-none transition-colors focus:border-dj-accent-1"
                />
              </label>
            </div>

            <label className="flex cursor-pointer items-start gap-2.5">
              <span className="mt-0.5">
                <CaseACocher checked={consentement} onChange={setConsentement} />
              </span>
              <span className="text-sm text-dj-texte sm:text-base">{t("attente_consentement")}</span>
            </label>
            <p className="text-sm text-dj-texte-muet">{t("attente_donnees")}</p>

            {erreur && <p className="text-sm text-[var(--dj-erreur)] sm:text-base">{erreur}</p>}
          </section>

          {/* Barre collée en bas de la page : le prix choisi et le bouton restent toujours visibles. */}
          <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-between gap-3 border-t border-dj-bordure bg-dj-surface px-4 py-3 sm:-mx-6 sm:px-6">
            <span className="min-w-0 truncate text-sm font-medium text-dj-texte-muet sm:text-base">
              {palier !== null ? t("attente_palier_prix", { prix: palier }) : ""}
            </span>
            <button type="button" onClick={valider} disabled={!peutValider} className={BOUTON_PRINCIPAL}>
              {envoi && <LoaderCircle size={14} className="animate-spin" />}
              {t("attente_valider")}
            </button>
          </div>
        </div>
      )}

      {config && etat === "deja_inscrit" && (
        <div className="flex max-w-xl animate-dj-fade-in-rapide flex-col gap-4 motion-reduce:animate-none">
          <p className="text-base text-dj-texte sm:text-lg">
            {t("attente_deja_inscrit", { prix: palier ?? "", nom: palier === null ? "" : t(`attente_palier_nom_${palier}`) })}
          </p>
          <p className="text-sm text-dj-texte-muet sm:text-base">{t("attente_aucun_paiement")}</p>
          {erreur && <p className="text-sm text-[var(--dj-erreur)]">{erreur}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setEtat("formulaire")} disabled={envoi} className={BOUTON_PRINCIPAL}>
              {t("attente_modifier")}
            </button>
            <button type="button" onClick={desinscrire} disabled={envoi} className={BOUTON_SECONDAIRE}>
              {envoi && <LoaderCircle size={14} className="animate-spin" />}
              {t("attente_desinscrire")}
            </button>
          </div>
        </div>
      )}

      {config && (etat === "merci" || etat === "desinscrit") && (
        <div className="flex max-w-xl animate-dj-fade-in-rapide flex-col items-start gap-3 motion-reduce:animate-none">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-dj-bordure bg-dj-surface-haute text-dj-succes">
            <Check size={20} />
          </span>
          {etat === "merci" ? (
            <>
              <p className="text-lg font-bold text-dj-texte">{t("attente_merci_titre")}</p>
              <p className="text-base text-dj-texte-muet">{t("attente_merci_detail")}</p>
            </>
          ) : (
            <p className="text-base text-dj-texte">{t("attente_desinscrit")}</p>
          )}
          <button type="button" onClick={revenir} className={BOUTON_SECONDAIRE}>
            {t("attente_fermer")}
          </button>
        </div>
      )}

      {compteRequis && (
        <CompteRequisModal
          texte={t("attente_connexion_requise") || undefined}
          onFerme={() => setCompteRequis(false)}
        />
      )}
    </div>
  );
}
