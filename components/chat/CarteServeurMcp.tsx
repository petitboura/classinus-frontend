"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, CircleAlert, ExternalLink, LoaderCircle, PlugZap, Plus, Server, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import {
  demarrerConnexionMcpPersonnalise,
  enregistrerMcpPersonnalise,
  listerMcpPersonnalises,
  sonderMcpPersonnalise,
  type McpPersonnalise,
  type SondageMcpPersonnalise,
} from "@/lib/api";
import { ErreurApi, messageErreur } from "@/lib/erreurs";
import { traduireTexteInterface } from "@/lib/i18n/interface";
import { useLocale } from "@/lib/i18n/useLocale";
import { invaliderRegistreOutils } from "@/lib/outils";
import { hoteAffiche, lirePropositionServeurMcp } from "@/lib/propositionServeurMcp";
import { memoriserRetourConnexion } from "@/lib/retourApresConnexion";
import type { ValeursMcp } from "@/components/connexions/PanneauFormulaireMcp";
import { CTACompteRequis } from "@/components/CTACompteRequis";
import { Skeleton } from "@/components/Skeleton";
import { EtapeJetonServeurMcp } from "@/components/chat/EtapeJetonServeurMcp";
import { FormulaireServeurMcpCarte } from "@/components/chat/FormulaireServeurMcpCarte";
import { BOUTON_PRINCIPAL, BOUTON_SECONDAIRE } from "@/components/chat/stylesServeurMcp";

// Carte du bloc ```serveurmcp``` (27/10/2026, demande de Bourama) : l'IA a trouvé un serveur MCP que
// Classinus ne connaît pas et le propose. Règle de la carte : rien n'est ajouté sans un clic de la
// personne, que l'adresse soit officielle ou non, et le jeton ne passe jamais par le chat. Le
// caractère officiel de l'adresse et le type d'accès (libre, autorisation, jeton) sont décidés par le
// backend (POST /api/mcp-personnalises/sonder), jamais par ce que l'IA affirme.

type Phase =
  | { nom: "verification" }
  | { nom: "sans_compte" }
  | { nom: "indisponible"; message: string }
  | { nom: "sans_adresse"; refus: string | null }
  | { nom: "pret"; sondage: SondageMcpPersonnalise }
  | { nom: "jeton"; sondage: SondageMcpPersonnalise }
  | { nom: "formulaire"; sondage: SondageMcpPersonnalise | null }
  | { nom: "ajoute"; serveur: McpPersonnalise; dejaLa: boolean };

// Deux adresses désignent le même serveur à l'adresse finale près ("/" ou non).
function memeAdresse(a: string, b: string): boolean {
  try {
    return new URL(a).href.replace(/\/$/, "") === new URL(b).href.replace(/\/$/, "");
  } catch {
    return false;
  }
}

function messagePourReprendre(nom: string, locale: "fr" | "en"): string {
  return locale === "en"
    ? `I added the ${nom} server. Use it for my request.`
    : `J'ai ajouté le serveur ${nom}. Utilise-le pour ma demande.`;
}

export function CarteServeurMcp({ code, onUtiliser }: { code: string; onUtiliser?: (texte: string) => void }) {
  const locale = useLocale();
  const t = (texte: string) => traduireTexteInterface(texte, locale);
  const proposition = useMemo(() => lirePropositionServeurMcp(code), [code]);
  const [phase, setPhase] = useState<Phase>({ nom: "verification" });
  const [enCours, setEnCours] = useState(false);
  const [erreurAction, setErreurAction] = useState<string | null>(null);
  const [dejaUtilise, setDejaUtilise] = useState(false);
  const numeroChargement = useRef(0);

  const url = proposition?.url ?? null;
  const siteOfficiel = proposition?.siteOfficiel ?? null;
  const lienJeton = proposition?.jeton?.lien ?? null;
  const present = !!proposition;

  // Regarde d'abord si ce serveur est déjà dans les serveurs de la personne (lecture de base, rapide),
  // puis seulement sinon le fait vérifier par Classinus.
  const charger = useCallback(async () => {
    if (!present) return;
    const numero = ++numeroChargement.current;
    setPhase({ nom: "verification" });
    setErreurAction(null);
    try {
      const { serveurs } = await listerMcpPersonnalises();
      if (numero !== numeroChargement.current) return;
      const existant = url ? (serveurs ?? []).find((s) => memeAdresse(s.url, url)) : undefined;
      if (existant) { setPhase({ nom: "ajoute", serveur: existant, dejaLa: true }); return; }
      if (!url) { setPhase({ nom: "sans_adresse", refus: null }); return; }
      const sondage = await sonderMcpPersonnalise(url, siteOfficiel, lienJeton);
      if (numero !== numeroChargement.current) return;
      setPhase({ nom: "pret", sondage });
    } catch (e) {
      if (numero !== numeroChargement.current) return;
      if (e instanceof ErreurApi && e.statusCode === 401) setPhase({ nom: "sans_compte" });
      else if (e instanceof ErreurApi && e.code === "MCP_URL_INVALIDE") setPhase({ nom: "sans_adresse", refus: messageErreur(e) });
      else setPhase({ nom: "indisponible", message: messageErreur(e) });
    }
  }, [present, url, siteOfficiel, lienJeton]);

  useEffect(() => { void charger(); return () => { numeroChargement.current++; }; }, [charger]);

  if (!proposition) return null;

  // Lève l'erreur : le formulaire ou l'étape du jeton l'affiche là où la personne agit.
  const ajouter = async (valeurs: ValeursMcp) => {
    const { serveur } = await enregistrerMcpPersonnalise({
      nom: valeurs.nom, url: valeurs.url, auth_type: valeurs.authType, token: valeurs.token,
    });
    invaliderRegistreOutils();
    setPhase({ nom: "ajoute", serveur, dejaLa: false });
  };

  // Ajout en un clic quand aucun jeton n'est à saisir (accès libre ou autorisation).
  const ajouterDepuisCarte = async (sondage: SondageMcpPersonnalise) => {
    if (sondage.acces === "bearer") { setPhase({ nom: "jeton", sondage }); return; }
    if (sondage.acces === "inconnu") return;
    setErreurAction(null);
    setEnCours(true);
    try {
      await ajouter({ nom: proposition.nom, url: sondage.url, authType: sondage.acces, token: null });
    } catch (e) {
      setErreurAction(messageErreur(e));
    } finally {
      setEnCours(false);
    }
  };

  const autoriser = async (serveur: McpPersonnalise) => {
    setErreurAction(null);
    setEnCours(true);
    try {
      const { url: adresseAutorisation } = await demarrerConnexionMcpPersonnalise(serveur.id);
      // Retour dans cette même conversation après l'autorisation sur le site de l'outil.
      memoriserRetourConnexion({ href: window.location.pathname + window.location.search, libelle: "à ta conversation" });
      window.location.assign(adresseAutorisation);
    } catch (e) {
      setErreurAction(messageErreur(e));
      setEnCours(false);
    }
  };

  const utiliser = (nom: string) => {
    if (!onUtiliser || dejaUtilise) return;
    setDejaUtilise(true);
    onUtiliser(messagePourReprendre(nom, locale));
  };

  const sondage = phase.nom === "pret" || phase.nom === "jeton" ? phase.sondage : phase.nom === "formulaire" ? phase.sondage : null;
  const domaine = sondage?.domaine ?? (url ? hoteAffiche(url) : null);
  const confirme = !!sondage && sondage.joignable && sondage.officiel;

  const phraseAcces = (acces: SondageMcpPersonnalise["acces"]) =>
    acces === "none" ? t("Accès libre, aucun jeton à copier.")
      : acces === "oauth" ? t("Tu autorises l'accès sur le site de l'outil, sans rien copier.")
      : acces === "bearer" ? t("Un jeton d'accès te sera demandé.")
      : t("Je n'ai pas pu confirmer comment se connecter à ce serveur.");

  return (
    <article className="my-3 w-full max-w-md animate-dj-fade-up rounded-2xl border border-dj-bordure bg-dj-surface p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-dj-bordure bg-dj-surface-haute text-dj-texte"><Server size={18} /></span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-dj-texte">{proposition.nom}</h3>
          {domaine && <p className="mt-0.5 truncate text-xs text-dj-texte-muet">{domaine}</p>}
          {sondage && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-dj-bordure px-2 py-0.5 text-[11px] text-dj-texte-muet">
              {confirme ? <ShieldCheck size={12} className="text-emerald-500" /> : <TriangleAlert size={12} />}
              {confirme ? t("Site officiel") : t("Non confirmé")}
            </p>
          )}
        </div>
      </div>

      <div key={phase.nom} role="status" aria-live="polite" className="mt-3 flex animate-dj-fade-in-rapide flex-col gap-3 motion-reduce:animate-none">
        {phase.nom === "verification" && (
          <div aria-busy="true" aria-label={t("Vérification du serveur")} className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-11/12 rounded" />
            <Skeleton className="h-3.5 w-2/3 rounded" />
            <Skeleton className="mt-1 h-8 w-32 rounded-lg" />
          </div>
        )}

        {phase.nom === "sans_compte" && <CTACompteRequis texte={t("Connecte-toi ou crée un compte pour ajouter un serveur MCP.")} />}

        {phase.nom === "indisponible" && (
          <>
            <p className="flex items-start gap-2 text-sm leading-6 text-dj-texte-muet"><CircleAlert size={16} className="mt-1 shrink-0" />{phase.message}</p>
            <div><button type="button" onClick={() => void charger()} className={BOUTON_SECONDAIRE}>{t("Réessayer")}</button></div>
          </>
        )}

        {phase.nom === "sans_adresse" && (
          <>
            <p className="flex items-start gap-2 text-sm leading-6 text-dj-texte-muet">
              <TriangleAlert size={16} className="mt-1 shrink-0" />
              {phase.refus ?? t("Je n'ai rien trouvé de fiable sur le site officiel pour ce serveur.")}
            </p>
            <div><button type="button" onClick={() => setPhase({ nom: "formulaire", sondage: null })} className={BOUTON_PRINCIPAL}>{t("Je le fais moi même")}</button></div>
          </>
        )}

        {phase.nom === "pret" && (
          <>
            {!phase.sondage.joignable ? (
              <p className="flex items-start gap-2 text-sm leading-6 text-dj-texte-muet"><TriangleAlert size={16} className="mt-1 shrink-0" />{t("Ce serveur ne répond pas pour l'instant.")}</p>
            ) : (
              <>
                <p className="flex items-start gap-2 text-sm leading-6 text-dj-texte-muet">
                  {phase.sondage.officiel
                    ? <><ShieldCheck size={16} className="mt-1 shrink-0 text-emerald-500" /><span>{t("Adresse trouvée sur le site officiel.")}{proposition.siteOfficiel ? ` (${hoteAffiche(proposition.siteOfficiel)})` : ""}</span></>
                    : <><TriangleAlert size={16} className="mt-1 shrink-0" />{t("Je n'ai pas pu confirmer que cette adresse vient du site officiel. Je ne peux pas garantir qu'elle est sûre.")}</>}
                </p>
                <p className="text-sm leading-6 text-dj-texte-muet">{phraseAcces(phase.sondage.acces)}</p>
              </>
            )}
            {proposition.source && (
              <a href={proposition.source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 self-start text-xs text-dj-texte-muet underline">
                <ExternalLink size={12} />{t("Source")} ({hoteAffiche(proposition.source)})
              </a>
            )}
            {erreurAction && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-[var(--dj-erreur)]/30 p-3 text-sm text-[var(--dj-erreur)]">
                <CircleAlert size={16} className="mt-0.5 shrink-0" /><span className="min-w-0 break-words">{erreurAction}</span>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {phase.sondage.joignable && phase.sondage.acces !== "inconnu" && (
                <button
                  type="button"
                  onClick={() => void ajouterDepuisCarte(phase.sondage)}
                  disabled={enCours}
                  className={phase.sondage.officiel ? BOUTON_PRINCIPAL : BOUTON_SECONDAIRE}
                >
                  {enCours ? <LoaderCircle size={13} className="animate-spin" /> : phase.sondage.officiel ? <Plus size={13} /> : <TriangleAlert size={13} />}
                  {enCours ? t("Ajout…") : phase.sondage.officiel ? t("Oui, ajoute-le") : t("Ajouter quand même")}
                </button>
              )}
              {!phase.sondage.joignable && <button type="button" onClick={() => void charger()} className={BOUTON_SECONDAIRE}>{t("Réessayer")}</button>}
              <button type="button" onClick={() => setPhase({ nom: "formulaire", sondage: phase.sondage })} disabled={enCours} className={BOUTON_SECONDAIRE}>{t("Je le fais moi même")}</button>
            </div>
          </>
        )}

        {phase.nom === "jeton" && (
          <EtapeJetonServeurMcp
            domaine={phase.sondage.domaine}
            serveurOfficiel={phase.sondage.officiel}
            lienOfficiel={phase.sondage.lien_jeton_officiel}
            jeton={proposition.jeton}
            onValider={(jeton) => ajouter({ nom: proposition.nom, url: phase.sondage.url, authType: "bearer", token: jeton })}
            onRetour={() => setPhase({ nom: "pret", sondage: phase.sondage })}
          />
        )}

        {phase.nom === "formulaire" && (
          <FormulaireServeurMcpCarte
            proposition={proposition}
            accesConseille={phase.sondage && phase.sondage.acces !== "inconnu" ? phase.sondage.acces : "none"}
            urlOfficielle={phase.sondage?.officiel ? phase.sondage.url : null}
            lienJetonOfficiel={phase.sondage?.lien_jeton_officiel ?? false}
            onEnregistrer={ajouter}
            onRetour={() => setPhase(phase.sondage ? { nom: "pret", sondage: phase.sondage } : { nom: "sans_adresse", refus: null })}
          />
        )}

        {phase.nom === "ajoute" && (() => {
          const { serveur, dejaLa } = phase;
          const aAutoriser = serveur.auth_type === "oauth" && !serveur.connecte;
          return (
            <>
              <p className="flex items-start gap-2 text-sm leading-6 text-dj-texte-muet">
                {aAutoriser || !serveur.actif ? <CircleAlert size={16} className="mt-1 shrink-0" /> : <Check size={16} className="mt-1 shrink-0 text-emerald-500" />}
                {!serveur.actif
                  ? t("Ce serveur est dans tes connexions mais désactivé. Active-le depuis l'écran Connexions.")
                  : aAutoriser
                    ? (dejaLa ? t("Ce serveur est déjà dans tes connexions. Il reste à autoriser l'accès sur le site de l'outil.") : t("Serveur ajouté. Il reste à autoriser l'accès sur le site de l'outil."))
                    : (dejaLa ? t("Ce serveur est déjà connecté. Ses outils sont disponibles.") : t("Serveur ajouté. Ses outils sont disponibles."))}
              </p>
              {erreurAction && (
                <div role="alert" className="flex items-start gap-2 rounded-xl border border-[var(--dj-erreur)]/30 p-3 text-sm text-[var(--dj-erreur)]">
                  <CircleAlert size={16} className="mt-0.5 shrink-0" /><span className="min-w-0 break-words">{erreurAction}</span>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {serveur.actif && aAutoriser && (
                  <button type="button" onClick={() => void autoriser(serveur)} disabled={enCours} className={BOUTON_PRINCIPAL}>
                    {enCours ? <LoaderCircle size={13} className="animate-spin" /> : <PlugZap size={13} />}
                    {enCours ? t("Connexion…") : `${t("Autoriser sur")} ${hoteAffiche(serveur.url)}`}
                  </button>
                )}
                {serveur.actif && !aAutoriser && onUtiliser && (
                  <button type="button" onClick={() => utiliser(serveur.nom)} disabled={dejaUtilise} className={BOUTON_PRINCIPAL}>
                    <Sparkles size={13} />{dejaUtilise ? t("Demande envoyée") : t("Utiliser pour ça")}
                  </button>
                )}
              </div>
            </>
          );
        })()}
      </div>
    </article>
  );
}
