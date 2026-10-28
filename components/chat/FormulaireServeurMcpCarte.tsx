"use client";

import { useId, useState, type FormEvent } from "react";
import { CircleAlert, LoaderCircle, Plus } from "lucide-react";
import type { AuthTypeMcpPersonnalise } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";
import { traduireTexteInterface } from "@/lib/i18n/interface";
import { useLocale } from "@/lib/i18n/useLocale";
import { adresseHttps, type PropositionServeurMcp } from "@/lib/propositionServeurMcp";
import type { ValeursMcp } from "@/components/connexions/PanneauFormulaireMcp";
import { SelectPersonnalise } from "@/components/SelectPersonnalise";
import { ChampJetonServeurMcp, GuideJetonServeurMcp } from "@/components/chat/EtapeJetonServeurMcp";
import { BOUTON_PRINCIPAL, BOUTON_SECONDAIRE, CHAMP } from "@/components/chat/stylesServeurMcp";

// Formulaire d'ajout dans la carte du chat (27/10/2026, demande de Bourama : « le llm présente le
// formulaire directement dans l'interface, pas besoin d'aller dans la page »). Mêmes champs et mêmes
// règles que le panneau de l'écran Connexions (PanneauFormulaireMcp), déjà remplis avec ce que l'IA a
// trouvé. La personne peut tout corriger avant d'ajouter.
export function FormulaireServeurMcpCarte({
  proposition,
  accesConseille,
  urlOfficielle,
  lienJetonOfficiel,
  onEnregistrer,
  onRetour,
}: {
  proposition: PropositionServeurMcp;
  /** Type d'accès détecté par le sondage, sinon "none". */
  accesConseille: AuthTypeMcpPersonnalise;
  /** Adresse que le backend a confirmée comme officielle, ou null. */
  urlOfficielle: string | null;
  lienJetonOfficiel: boolean;
  onEnregistrer: (valeurs: ValeursMcp) => Promise<void>;
  onRetour: () => void;
}) {
  const locale = useLocale();
  const t = (texte: string) => traduireTexteInterface(texte, locale);
  const idNom = useId();
  const idUrl = useId();
  const [nom, setNom] = useState(proposition.nom);
  const [url, setUrl] = useState(proposition.url ?? "");
  const [authType, setAuthType] = useState<AuthTypeMcpPersonnalise>(accesConseille);
  const [jeton, setJeton] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Une adresse modifiée à la main n'est plus celle que le site officiel a confirmée.
  const adresseSaisie = adresseHttps(url);
  const serveurOfficiel = !!urlOfficielle && adresseSaisie === urlOfficielle;
  const domaineSaisi = adresseSaisie ? new URL(adresseSaisie).hostname : null;

  async function envoyer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enCours) return;
    setErreur(null);
    if (!nom.trim()) { setErreur(t("Saisis un nom pour ce serveur.")); return; }
    if (!adresseSaisie) { setErreur(t("Saisis une URL HTTPS valide.")); return; }
    if (authType === "bearer" && !jeton.trim()) { setErreur(t("Un jeton est nécessaire pour ce mode d'authentification.")); return; }
    setEnCours(true);
    try {
      await onEnregistrer({ nom: nom.trim(), url: adresseSaisie, authType, token: authType === "bearer" ? jeton.trim() : null });
      setJeton("");
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setEnCours(false);
    }
  }

  return (
    <form onSubmit={(e) => void envoyer(e)} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={idNom} className="text-sm font-semibold text-dj-texte">{t("Nom du serveur")}</label>
        <input id={idNom} value={nom} onChange={(e) => setNom(e.target.value)} maxLength={80} required className={CHAMP} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={idUrl} className="text-sm font-semibold text-dj-texte">{t("URL HTTPS du serveur MCP")}</label>
        <input id={idUrl} type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://mcp.exemple.com/mcp" maxLength={2048} required className={CHAMP} />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-semibold text-dj-texte">{t("Authentification")}</p>
        <SelectPersonnalise
          valeur={authType}
          onChange={(v) => { setAuthType(v as AuthTypeMcpPersonnalise); setJeton(""); }}
          options={[
            { id: "none", label: t("Aucune authentification") },
            { id: "bearer", label: t("Jeton Bearer") },
            { id: "oauth", label: t("OAuth automatique (si compatible)") },
          ]}
          placeholder={t("Choisir une authentification")}
        />
      </div>
      {authType === "bearer" && (
        <div className="flex flex-col gap-3">
          {proposition.jeton && <GuideJetonServeurMcp jeton={proposition.jeton} lienOfficiel={lienJetonOfficiel} />}
          <ChampJetonServeurMcp valeur={jeton} onChange={setJeton} serveurOfficiel={serveurOfficiel} domaine={domaineSaisi} />
        </div>
      )}
      {authType === "oauth" && (
        <p className="text-xs leading-5 text-dj-texte-muet">{t("Après l'ajout, tu autorises l'accès sur le site de l'outil. Tu n'as rien à copier.")}</p>
      )}
      {erreur && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-[var(--dj-erreur)]/30 p-3 text-sm text-[var(--dj-erreur)]">
          <CircleAlert size={16} className="mt-0.5 shrink-0" /><span className="min-w-0 break-words">{erreur}</span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={enCours} className={BOUTON_PRINCIPAL}>
          {enCours ? <LoaderCircle size={13} className="animate-spin" /> : <Plus size={13} />}{enCours ? t("Ajout…") : t("Ajouter le serveur")}
        </button>
        <button type="button" onClick={onRetour} disabled={enCours} className={BOUTON_SECONDAIRE}>{t("Retour")}</button>
      </div>
    </form>
  );
}
