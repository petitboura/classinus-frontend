"use client";

import { useId, useState, type FormEvent } from "react";
import { CircleAlert, ExternalLink, LoaderCircle, PlugZap, TriangleAlert } from "lucide-react";
import { messageErreur } from "@/lib/erreurs";
import { traduireTexteInterface } from "@/lib/i18n/interface";
import { useLocale } from "@/lib/i18n/useLocale";
import { hoteAffiche, type PropositionServeurMcp } from "@/lib/propositionServeurMcp";
import { BOUTON_PRINCIPAL, BOUTON_SECONDAIRE, CHAMP } from "@/components/chat/stylesServeurMcp";

// Étape du jeton dans la carte du serveur MCP proposé par l'IA (27/10/2026, demande de Bourama).
// Le jeton ne passe jamais par le chat : il est tapé ici, envoyé directement au compte Classinus de la
// personne, et l'IA ne le voit jamais. Les étapes et le lien viennent de l'IA ; le lien est affiché
// avec son nom de domaine, et un avertissement le suit quand le backend ne l'a pas reconnu comme
// officiel (un faux lien pourrait récupérer le jeton).

// Étapes écrites par l'IA, avec le lien vers la page du jeton.
export function GuideJetonServeurMcp({
  jeton,
  lienOfficiel,
}: {
  jeton: PropositionServeurMcp["jeton"];
  lienOfficiel: boolean;
}) {
  const locale = useLocale();
  const t = (texte: string) => traduireTexteInterface(texte, locale);
  const lien = jeton?.lien ?? null;
  const etapes = jeton?.etapes ?? [];
  return (
    <div className="flex flex-col gap-2.5">
      {etapes.length > 0 ? (
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm leading-6 text-dj-texte-muet marker:text-dj-texte-muet">
          {etapes.map((etape, i) => <li key={i} className="pl-1">{etape}</li>)}
        </ol>
      ) : (
        <p className="text-sm leading-6 text-dj-texte-muet">{t("Cherche dans les paramètres de ton compte, rubrique clés d'accès, jetons ou API.")}</p>
      )}
      {lien ? (
        <a href={lien} target="_blank" rel="noopener noreferrer" className={BOUTON_SECONDAIRE + " self-start"}>
          <ExternalLink size={13} />{t("Ouvrir la page du jeton")} <span className="font-normal text-dj-texte-muet">({hoteAffiche(lien)})</span>
        </a>
      ) : (
        <p className="text-xs leading-5 text-dj-texte-muet">{t("Je n'ai pas trouvé de lien direct vers cette page. Passe par le site officiel.")}</p>
      )}
      {lien && !lienOfficiel && (
        <p className="flex items-start gap-2 text-xs leading-5 text-dj-texte-muet">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" />
          <span>{t("Ce lien ne vient pas du site officiel. Vérifie l'adresse avant de t'y connecter.")}</span>
        </p>
      )}
    </div>
  );
}

// Champ du jeton avec la promesse faite à la personne : l'IA ne le voit jamais.
export function ChampJetonServeurMcp({
  valeur,
  onChange,
  serveurOfficiel,
  domaine,
  obligatoire = true,
  placeholder,
}: {
  valeur: string;
  onChange: (valeur: string) => void;
  serveurOfficiel: boolean;
  domaine: string | null;
  obligatoire?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  const locale = useLocale();
  const t = (texte: string) => traduireTexteInterface(texte, locale);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-dj-texte">{t("Ton jeton d'accès")}</label>
      <input
        id={id}
        type="password"
        autoComplete="off"
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t("Colle ton jeton ici")}
        maxLength={4096}
        required={obligatoire}
        className={CHAMP}
      />
      <p className="text-xs leading-5 text-dj-texte-muet">
        {t("L'IA ne lit pas ce que tu colles ici et ne le voit jamais. Le jeton est gardé côté serveur pour ton compte et sert seulement à te connecter à ce serveur.")}
      </p>
      {!serveurOfficiel && (
        <p className="flex items-start gap-2 text-xs leading-5 text-dj-texte-muet">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" />
          <span>{t("Ton jeton sera envoyé à ce serveur, qui n'est pas confirmé comme le site officiel. Ne le colle que si tu fais confiance à ce site.")}{domaine ? ` (${domaine})` : ""}</span>
        </p>
      )}
    </div>
  );
}

// Étape complète : guide puis champ, puis validation. L'erreur de l'ajout s'affiche ici, là où la
// personne a tapé son jeton.
export function EtapeJetonServeurMcp({
  domaine,
  serveurOfficiel,
  lienOfficiel,
  jeton,
  onValider,
  onRetour,
}: {
  domaine: string | null;
  serveurOfficiel: boolean;
  lienOfficiel: boolean;
  jeton: PropositionServeurMcp["jeton"];
  onValider: (jeton: string) => Promise<void>;
  onRetour: () => void;
}) {
  const locale = useLocale();
  const t = (texte: string) => traduireTexteInterface(texte, locale);
  const [valeur, setValeur] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valeur.trim() || enCours) return;
    setErreur(null);
    setEnCours(true);
    try {
      await onValider(valeur.trim());
      setValeur("");
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setEnCours(false);
    }
  }

  return (
    <form onSubmit={(e) => void envoyer(e)} className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-dj-texte">{t("Ce serveur demande un jeton d'accès.")}</p>
      <GuideJetonServeurMcp jeton={jeton} lienOfficiel={lienOfficiel} />
      <ChampJetonServeurMcp valeur={valeur} onChange={setValeur} serveurOfficiel={serveurOfficiel} domaine={domaine} />
      {erreur && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-[var(--dj-erreur)]/30 p-3 text-sm text-[var(--dj-erreur)]">
          <CircleAlert size={16} className="mt-0.5 shrink-0" /><span className="min-w-0 break-words">{erreur}</span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={enCours || !valeur.trim()} className={BOUTON_PRINCIPAL}>
          {enCours ? <LoaderCircle size={13} className="animate-spin" /> : <PlugZap size={13} />}{enCours ? t("Connexion…") : t("Valider")}
        </button>
        <button type="button" onClick={onRetour} disabled={enCours} className={BOUTON_SECONDAIRE}>{t("Retour")}</button>
      </div>
    </form>
  );
}
