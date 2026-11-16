"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Check, LoaderCircle, X } from "lucide-react";
import { CadrePanneau } from "@/components/connexions/CadrePanneau";
import { CaseACocher } from "@/components/CaseACocher";
import { SelectPersonnalise, type OptionMenu } from "@/components/SelectPersonnalise";
import { Skeleton } from "@/components/Skeleton";
import { messageErreur } from "@/lib/erreurs";
import { obtenirLocale } from "@/lib/i18n/locale";
import {
  CODES_PAYS,
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

// Formulaire de la liste d'attente (16/11/2026, demande de Bourama). Il s'ouvre quand la personne
// clique sur un modèle grisé « Bientôt » du sélecteur de modèles. Aucun paiement n'est pris, et le
// formulaire le dit en haut. Paliers, profils et tous les textes viennent du serveur (Supabase), en
// français et en anglais : rien n'est écrit en dur ici. Voir api/liste_attente.py côté backend.

const BOUTON_PRINCIPAL =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-dj-accent-1 px-4 py-2.5 text-sm font-bold text-[#1A0D02] transition-colors hover:bg-dj-accent-2 disabled:cursor-not-allowed disabled:opacity-50";
const BOUTON_SECONDAIRE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-dj-bordure px-4 py-2.5 text-sm font-semibold text-dj-texte transition-colors hover:bg-dj-surface-haute disabled:opacity-50";

type Etat = "formulaire" | "deja_inscrit" | "merci" | "desinscrit";

export function FormulaireListeAttente({
  modeleId,
  modeleLabel,
  onFermer,
}: {
  modeleId: string;
  modeleLabel: string;
  onFermer: () => void;
}) {
  const titreId = useId();
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

  useEffect(() => {
    noterEtapeListeAttente("formulaire_ouvert", modeleId, locale);
    let actif = true;
    lireConfigListeAttente()
      .then((c) => {
        if (!actif) return;
        setConfig(c);
        const existante = c.inscriptions.find((i) => i.modele_id === modeleId);
        if (existante) {
          setPalier(existante.palier_prix);
          setProfil(existante.profil);
          setEtat("deja_inscrit");
        }
      })
      .catch((e) => {
        if (actif) setErreurChargement(messageErreur(e));
      });
    return () => {
      actif = false;
    };
    // Une seule ouverture par modèle : le formulaire est démonté à la fermeture.
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
      setErreur(messageErreur(e));
    } finally {
      setEnvoi(false);
    }
  }

  async function desinscrire() {
    setEnvoi(true);
    setErreur(null);
    try {
      await seDesinscrireListeAttente(modeleId);
      setEtat("desinscrit");
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <CadrePanneau titreId={titreId} onFermer={onFermer} largeur="sm:max-w-lg">
      {(fermer) => (
        <>
          <div className="flex items-start justify-between gap-3">
            <h2 id={titreId} className="text-base font-bold text-dj-texte">
              {config ? t("attente_titre") : <Skeleton className="h-5 w-48 rounded" />}
            </h2>
            <button
              type="button"
              onClick={fermer}
              aria-label={t("attente_fermer") || (locale === "en" ? "Close" : "Fermer")}
              className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
            >
              <X size={18} />
            </button>
          </div>

          {erreurChargement && <p className="text-sm text-[var(--dj-erreur)]">{erreurChargement}</p>}

          {!config && !erreurChargement && (
            <div className="flex flex-col gap-3" aria-hidden>
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          )}

          {config && etat === "formulaire" && (
            <div className="flex animate-dj-fade-in-rapide flex-col gap-4 motion-reduce:animate-none">
              <p className="text-sm text-dj-texte">{t("attente_intro")}</p>
              <p className="rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-xs font-medium text-dj-texte">
                {t("attente_aucun_paiement")}
              </p>

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-dj-texte-muet">
                  {t("attente_palier_label")}
                </legend>
                {config.paliers.map((p) => {
                  const choisi = palier === p.prix_usd;
                  return (
                    <button
                      key={p.prix_usd}
                      type="button"
                      role="radio"
                      aria-checked={choisi}
                      onClick={() => setPalier(p.prix_usd)}
                      className={`flex flex-col gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                        choisi ? "border-dj-accent-1 bg-dj-surface-haute" : "border-dj-bordure hover:bg-dj-surface-haute"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-dj-texte">{t("attente_palier_prix", { prix: p.prix_usd })}</span>
                        {choisi && <Check size={15} className="shrink-0 text-dj-accent-1-texte" />}
                      </span>
                      <span className="text-xs font-medium text-dj-texte">{t("attente_palier_credit", { credit: p.credit_usd })}</span>
                      <span className="text-xs text-dj-texte-muet">{t(`attente_palier_${p.prix_usd}`)}</span>
                    </button>
                  );
                })}
              </fieldset>

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-dj-texte-muet">
                  {t("attente_profil_label")}
                </legend>
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
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
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

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-dj-texte-muet">{t("attente_pays_label")}</span>
                  <SelectPersonnalise options={optionsPays} valeur={pays} onChange={setPays} placeholder="" />
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-dj-texte-muet">{t("attente_whatsapp_label")}</span>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={32}
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="rounded-lg border border-dj-bordure bg-dj-surface px-3 py-2 text-sm text-dj-texte outline-none transition-colors focus:border-dj-accent-1"
                  />
                </label>
              </div>

              <label className="flex cursor-pointer items-start gap-2.5">
                <span className="mt-0.5">
                  <CaseACocher checked={consentement} onChange={setConsentement} />
                </span>
                <span className="text-xs text-dj-texte">{t("attente_consentement")}</span>
              </label>
              <p className="text-xs text-dj-texte-muet">{t("attente_donnees")}</p>

              {erreur && <p className="text-xs text-[var(--dj-erreur)]">{erreur}</p>}

              <div className="flex justify-end">
                <button type="button" onClick={valider} disabled={!peutValider} className={BOUTON_PRINCIPAL}>
                  {envoi && <LoaderCircle size={14} className="animate-spin" />}
                  {t("attente_valider")}
                </button>
              </div>
            </div>
          )}

          {config && etat === "deja_inscrit" && (
            <div className="flex animate-dj-fade-in-rapide flex-col gap-4 motion-reduce:animate-none">
              <p className="text-sm text-dj-texte">{t("attente_deja_inscrit", { prix: palier ?? "" })}</p>
              <p className="text-xs text-dj-texte-muet">{t("attente_aucun_paiement")}</p>
              {erreur && <p className="text-xs text-[var(--dj-erreur)]">{erreur}</p>}
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={desinscrire} disabled={envoi} className={BOUTON_SECONDAIRE}>
                  {envoi && <LoaderCircle size={14} className="animate-spin" />}
                  {t("attente_desinscrire")}
                </button>
                <button type="button" onClick={() => setEtat("formulaire")} disabled={envoi} className={BOUTON_PRINCIPAL}>
                  {t("attente_modifier")}
                </button>
              </div>
            </div>
          )}

          {config && (etat === "merci" || etat === "desinscrit") && (
            <div className="flex animate-dj-fade-in-rapide flex-col items-center gap-3 py-4 text-center motion-reduce:animate-none">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-dj-bordure bg-dj-surface-haute text-dj-succes">
                <Check size={20} />
              </span>
              {etat === "merci" ? (
                <>
                  <p className="text-sm font-bold text-dj-texte">{t("attente_merci_titre")}</p>
                  <p className="text-xs text-dj-texte-muet">{t("attente_merci_detail")}</p>
                </>
              ) : (
                <p className="text-sm text-dj-texte">{t("attente_desinscrit")}</p>
              )}
              <button type="button" onClick={fermer} className={BOUTON_SECONDAIRE}>
                {t("attente_fermer")}
              </button>
            </div>
          )}
        </>
      )}
    </CadrePanneau>
  );
}
