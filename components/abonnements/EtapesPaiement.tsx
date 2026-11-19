"use client";

import { useMemo } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { CaseACocher } from "@/components/CaseACocher";
import { SelectPersonnalise, type OptionMenu } from "@/components/SelectPersonnalise";
import { CODES_PAYS, nomDuPays } from "@/lib/listeAttente";

// Les cinq écrans du parcours de paiement de la page Abonnements (19/11/2026, demande de Bourama).
// Chaque écran ne fait qu'afficher et prévenir le parent ; la logique est dans ParcoursPaiement.tsx.
// Tous les textes viennent du serveur (clés attente_pay_* et attente_moyen_*), jamais écrits ici.

export type Traduire = (cle: string, valeurs?: Record<string, string | number>) => string;
export type EtapeParcours = "legal" | "connexion" | "moyen" | "formulaire" | "merci";

const BOUTON_PRINCIPAL =
  "inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-dj-accent-1 px-5 py-3 text-base font-bold text-[#1A0D02] transition-colors hover:bg-dj-accent-2 disabled:cursor-not-allowed disabled:opacity-50";
const BOUTON_TEXTE = "text-sm font-medium text-dj-texte-muet transition-colors hover:text-dj-texte";
const TITRE_ECRAN = "text-xl font-bold text-dj-texte";
const TITRE_CHAMP = "text-sm font-semibold text-dj-texte-muet";

export function EtapeLegal({
  t,
  nom,
  prix,
  consentement,
  onConsentement,
  onContinuer,
}: {
  t: Traduire;
  nom: string;
  prix: number;
  consentement: boolean;
  onConsentement: (v: boolean) => void;
  onContinuer: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className={TITRE_ECRAN}>{t("attente_pay_legal_titre")}</h2>
      <p className="text-base text-dj-texte-muet">{t("attente_pay_legal_intro", { nom, prix })}</p>
      <label className="flex cursor-pointer items-start gap-2.5">
        <span className="mt-1">
          <CaseACocher checked={consentement} onChange={onConsentement} />
        </span>
        <span className="text-base text-dj-texte">{t("attente_pay_consentement")}</span>
      </label>
      <div className="flex flex-col gap-1 text-sm">
        <a href="/cgu" target="_blank" rel="noopener noreferrer" className="w-fit text-dj-accent-1 underline">
          {t("attente_pay_lien_cgu")}
        </a>
        <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="w-fit text-dj-accent-1 underline">
          {t("attente_pay_lien_confidentialite")}
        </a>
      </div>
      <button type="button" onClick={onContinuer} disabled={!consentement} className={BOUTON_PRINCIPAL}>
        {t("attente_pay_continuer")}
      </button>
    </div>
  );
}

export function EtapeConnexion({
  t,
  onCreerCompte,
  onSeConnecter,
  onRetour,
}: {
  t: Traduire;
  onCreerCompte: () => void;
  onSeConnecter: () => void;
  onRetour: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className={TITRE_ECRAN}>{t("attente_pay_connexion_titre")}</h2>
      <p className="text-base text-dj-texte-muet">{t("attente_pay_connexion_detail")}</p>
      <button type="button" onClick={onCreerCompte} className={BOUTON_PRINCIPAL}>
        {t("attente_pay_creer_compte")}
      </button>
      <button type="button" onClick={onSeConnecter} className={`${BOUTON_TEXTE} self-center`}>
        {t("attente_pay_se_connecter")}
      </button>
      <button type="button" onClick={onRetour} className={`${BOUTON_TEXTE} self-start`}>
        {t("attente_pay_retour")}
      </button>
    </div>
  );
}

export function EtapeMoyen({
  t,
  moyens,
  moyen,
  onMoyen,
  onContinuer,
  onRetour,
}: {
  t: Traduire;
  moyens: string[];
  moyen: string;
  onMoyen: (id: string) => void;
  onContinuer: () => void;
  onRetour: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className={TITRE_ECRAN}>{t("attente_pay_moyen_titre")}</h2>
      <div role="radiogroup" className="flex flex-col gap-2">
        {moyens.map((id) => {
          const choisi = moyen === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={choisi}
              onClick={() => onMoyen(id)}
              className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left text-base font-semibold transition-colors ${
                choisi
                  ? "border-dj-accent-1 bg-dj-surface-haute text-dj-texte"
                  : "border-dj-bordure text-dj-texte hover:bg-dj-surface-haute"
              }`}
            >
              {t(`attente_moyen_${id}`)}
              {choisi && <Check size={18} className="text-dj-accent-1" />}
            </button>
          );
        })}
      </div>
      <button type="button" onClick={onContinuer} disabled={!moyen} className={BOUTON_PRINCIPAL}>
        {t("attente_pay_continuer")}
      </button>
      <button type="button" onClick={onRetour} className={`${BOUTON_TEXTE} self-start`}>
        {t("attente_pay_retour")}
      </button>
    </div>
  );
}

export function EtapeFormulaire({
  t,
  locale,
  pays,
  onPays,
  whatsapp,
  onWhatsapp,
  envoi,
  erreur,
  onValider,
  onRetour,
}: {
  t: Traduire;
  locale: string;
  pays: string;
  onPays: (v: string) => void;
  whatsapp: string;
  onWhatsapp: (v: string) => void;
  envoi: boolean;
  erreur: string | null;
  onValider: () => void;
  onRetour: () => void;
}) {
  const optionsPays: OptionMenu[] = useMemo(
    () =>
      CODES_PAYS.map((code) => ({ id: code, label: nomDuPays(code, locale) })).sort((a, b) =>
        a.label.localeCompare(b.label, locale),
      ),
    [locale],
  );
  const valide = pays !== "" && whatsapp.replace(/\D/g, "").length >= 6 && !envoi;

  return (
    <div className="flex flex-col gap-4">
      <h2 className={TITRE_ECRAN}>{t("attente_pay_form_titre")}</h2>
      <p className="text-base text-dj-texte-muet">{t("attente_pay_form_detail")}</p>
      <div className="flex flex-col gap-1.5">
        <span className={TITRE_CHAMP}>{t("attente_pay_pays_label")}</span>
        <SelectPersonnalise options={optionsPays} valeur={pays} onChange={onPays} placeholder="" />
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={TITRE_CHAMP}>{t("attente_pay_whatsapp_label")}</span>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={32}
          value={whatsapp}
          onChange={(e) => onWhatsapp(e.target.value)}
          className="rounded-lg border border-dj-bordure bg-dj-surface px-3 py-2.5 text-base text-dj-texte outline-none transition-colors focus:border-dj-accent-1"
        />
      </label>
      {erreur && <p className="text-sm text-[var(--dj-erreur)]">{erreur}</p>}
      <button type="button" onClick={onValider} disabled={!valide} className={BOUTON_PRINCIPAL}>
        {envoi && <LoaderCircle size={14} className="animate-spin" />}
        {t("attente_pay_envoyer")}
      </button>
      <button type="button" onClick={onRetour} disabled={envoi} className={`${BOUTON_TEXTE} self-start`}>
        {t("attente_pay_retour")}
      </button>
    </div>
  );
}

export function EtapeMerci({ t, nom, onFermer }: { t: Traduire; nom: string; onFermer: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-dj-bordure bg-dj-surface-haute text-dj-succes">
        <Check size={20} />
      </span>
      <h2 className={TITRE_ECRAN}>{t("attente_pay_merci_titre")}</h2>
      <p className="text-base text-dj-texte-muet">{t("attente_pay_merci_detail", { nom })}</p>
      <button type="button" onClick={onFermer} className={BOUTON_PRINCIPAL}>
        {t("attente_pay_fermer")}
      </button>
    </div>
  );
}
