"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  deposerZipImportIa,
  lireStatutImportIa,
  obtenirConfigImportIa,
  type CibleImportIa,
  type ConfigImportIa,
  type EtatImportIa,
} from "@/lib/api";
import { emettreDonneesModifieesPourOutil } from "@/lib/evenementsDonnees";
import { messageErreur } from "@/lib/erreurs";
import { traduireTexteInterface } from "@/lib/i18n/interface";
import { useLocale } from "@/lib/i18n/useLocale";
import { Skeleton } from "@/components/Skeleton";

// 27/10/2026, demande Bourama : un bouton par page (Mémoire, Skills, Configuration) et un dans le chat.
// L'utilisateur ouvre l'autre IA avec un prompt prêt, récupère un zip, le dépose ici. Le travail est
// fait côté serveur par le LLM de Classinus, comme si le zip avait été joint dans le chat : fermer la
// page ne l'arrête pas, et une notification prévient à la fin (voir core/import_depuis_autre_ia.py).
// Tous les textes, le prompt et la liste des IA viennent du serveur ou du dictionnaire de traduction.

const DELAI_SUIVI_MS = 2500;
const cleStockage = (cible: CibleImportIa) => `classinus-import-ia-${cible}`;

const TITRES: Record<CibleImportIa, string> = {
  memoire: "Importer ma mémoire depuis une autre IA",
  skills: "Importer mes skills depuis une autre IA",
  configuration: "Importer ma configuration depuis une autre IA",
};

const ETAPE_OUVRIR: Record<CibleImportIa, string> = {
  memoire: "1. Ouvre l'IA où se trouve ta mémoire. Le prompt est déjà prêt.",
  skills: "1. Ouvre l'IA où se trouvent tes skills. Le prompt est déjà prêt.",
  configuration: "1. Ouvre l'IA où se trouve ta configuration. Le prompt est déjà prêt.",
};

function lireImportEnCours(cible: CibleImportIa): string | null {
  try {
    return sessionStorage.getItem(cleStockage(cible));
  } catch {
    return null;
  }
}

function memoriserImport(cible: CibleImportIa, id: string | null) {
  try {
    if (id) sessionStorage.setItem(cleStockage(cible), id);
    else sessionStorage.removeItem(cleStockage(cible));
  } catch {
    // Stockage indisponible : le suivi reprendra simplement à zéro au prochain chargement.
  }
}

type Props = {
  cible: CibleImportIa;
  /** Panneau déjà déplié (utilisé par le bandeau du chat). */
  ouvertParDefaut?: boolean;
  /** Sans bouton de titre : le panneau reste ouvert, le parent le contrôle (bandeau du chat). */
  sansBouton?: boolean;
};

export function ImportDepuisAutreIA({ cible, ouvertParDefaut = false, sansBouton = false }: Props) {
  const locale = useLocale();
  const t = useCallback((texte: string) => traduireTexteInterface(texte, locale), [locale]);
  const [ouvert, setOuvert] = useState(ouvertParDefaut);
  const [config, setConfig] = useState<ConfigImportIa | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [indice, setIndice] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [importId, setImportId] = useState<string | null>(null);
  const [etat, setEtat] = useState<EtatImportIa | null>(null);
  const [suiviPerdu, setSuiviPerdu] = useState(false);
  const champZip = useRef<HTMLInputElement>(null);

  // Reprend le suivi d'un import commencé avant un changement de page.
  useEffect(() => {
    const id = lireImportEnCours(cible);
    if (id) {
      setImportId(id);
      setOuvert(true);
    }
  }, [cible]);

  // Prompt et liste des IA : demandés au serveur à la première ouverture, dans la langue active.
  useEffect(() => {
    if (!ouvert || config || chargement) return;
    let actif = true;
    setChargement(true);
    obtenirConfigImportIa(cible)
      .then((c) => { if (actif) setConfig(c); })
      .catch((e) => { if (actif) setErreur(messageErreur(e)); })
      .finally(() => { if (actif) setChargement(false); });
    return () => { actif = false; };
  }, [ouvert, config, chargement, cible, locale]);

  // Suivi du travail fait côté serveur.
  useEffect(() => {
    if (!importId) return;
    let actif = true;
    async function lire() {
      try {
        const e = await lireStatutImportIa(importId as string);
        if (!actif) return;
        setEtat(e);
        if (e.statut !== "en_cours") {
          memoriserImport(cible, null);
          if (cible === "skills") emettreDonneesModifieesPourOutil("gerer_skill");
          if (cible === "configuration") emettreDonneesModifieesPourOutil("gerer_configuration");
        }
      } catch {
        if (!actif) return;
        // Le serveur ne connaît plus cet import (redémarrage) : on arrête de le suivre sans rien inventer.
        memoriserImport(cible, null);
        setSuiviPerdu(true);
        setImportId(null);
      }
    }
    void lire();
    const minuteur = setInterval(() => {
      if (!etat || etat.statut === "en_cours") void lire();
    }, DELAI_SUIVI_MS);
    return () => { actif = false; clearInterval(minuteur); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importId, cible]);

  async function copierPrompt(): Promise<boolean> {
    if (!config) return false;
    try {
      await navigator.clipboard.writeText(config.prompt);
      return true;
    } catch {
      return false;
    }
  }

  async function ouvrirIa(ia: ConfigImportIa["ias"][number]) {
    setErreur("");
    if (ia.prerempli) {
      setIndice("");
    } else {
      const copie = await copierPrompt();
      setIndice(copie ? t("Prompt copié. Colle-le dans l'IA qui vient de s'ouvrir.") : t("Copie le prompt avec le bouton ci-dessous, puis colle-le dans l'IA."));
    }
    window.open(ia.url, "_blank", "noopener,noreferrer");
  }

  async function envoyerZip(fichier: File | undefined) {
    if (!fichier || envoiEnCours) return;
    setEnvoiEnCours(true);
    setErreur("");
    setSuiviPerdu(false);
    setEtat(null);
    try {
      const r = await deposerZipImportIa(cible, fichier);
      memoriserImport(cible, r.import_id);
      setImportId(r.import_id);
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnvoiEnCours(false);
      if (champZip.current) champZip.current.value = "";
    }
  }

  function recommencer() {
    memoriserImport(cible, null);
    setImportId(null);
    setEtat(null);
    setSuiviPerdu(false);
    setErreur("");
  }

  const enCours = !!importId && (!etat || etat.statut === "en_cours");
  const fini = etat?.statut === "termine";
  const echec = etat?.statut === "echec";

  return (
    <div className="min-w-0">
      {!sansBouton && (
        <button
          type="button"
          aria-expanded={ouvert}
          onClick={() => setOuvert((v) => !v)}
          className="rounded-lg border border-dj-bordure px-3 py-2 text-sm transition-colors hover:border-dj-bordure-forte"
        >
          {t(TITRES[cible])}
        </button>
      )}
      <div className={`grid transition-[grid-template-rows] duration-300 ease-cgpt-doux ${ouvert ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="min-h-0 overflow-hidden">
          <div className={`${sansBouton ? "" : "mt-3 "}flex flex-col gap-4 rounded-xl border border-dj-bordure bg-dj-surface p-4`}>
            {erreur && <p role="alert" className="animate-dj-fade-in-rapide rounded-lg border border-red-500/40 p-3 text-sm text-red-600">{erreur}</p>}

            {!importId && !fini && (
              <>
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-dj-texte">{t(ETAPE_OUVRIR[cible])}</p>
                  {chargement && <div aria-busy="true" className="flex gap-2"><Skeleton className="h-9 w-24" /><Skeleton className="h-9 w-24" /><Skeleton className="h-9 w-24" /></div>}
                  {config && (
                    <div className="flex flex-wrap gap-2 animate-dj-fade-in-rapide">
                      {config.ias.map((ia) => (
                        <button key={ia.id} type="button" onClick={() => void ouvrirIa(ia)} className="rounded-lg border border-dj-bordure px-3 py-2 text-sm transition-colors hover:border-dj-bordure-forte">
                          {ia.nom}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={async () => setIndice((await copierPrompt()) ? t("Prompt copié.") : t("Impossible de copier le prompt."))}
                        className="rounded-lg px-3 py-2 text-sm text-dj-texte-muet transition-colors hover:text-dj-texte"
                      >
                        {t("Copier le prompt")}
                      </button>
                    </div>
                  )}
                  {indice && <p className="animate-dj-fade-in-rapide text-xs text-dj-texte-muet">{indice}</p>}
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-dj-texte">{t("2. Récupère le zip qu'elle te donne, puis dépose-le ici.")}</p>
                  <div>
                    <input ref={champZip} type="file" accept=".zip,application/zip,application/x-zip-compressed" className="hidden" onChange={(e) => void envoyerZip(e.target.files?.[0])} />
                    <button type="button" disabled={envoiEnCours} onClick={() => champZip.current?.click()} className="rounded-lg bg-dj-primaire px-3 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-50">
                      {envoiEnCours ? t("Envoi du zip…") : t("Déposer le zip")}
                    </button>
                  </div>
                </div>
                {suiviPerdu && <p className="animate-dj-fade-in-rapide text-sm text-dj-texte-muet">{t("Classinus ne suit plus cet import. Vérifie la page, ou recommence si le résultat est incomplet.")}</p>}
              </>
            )}

            {enCours && (
              <div className="flex animate-dj-fade-in-rapide flex-col gap-2" aria-live="polite">
                <p className="text-sm font-medium text-dj-texte">{t("Classinus travaille sur ton import.")}</p>
                {etat?.etape && <p className="text-sm text-dj-texte-muet">{etat.etape}</p>}
                <Skeleton className="h-4 w-2/3" />
                <p className="text-xs text-dj-texte-muet">{t("Tu peux quitter cette page, tu seras prévenu à la fin.")}</p>
              </div>
            )}

            {fini && etat && (
              <div className="flex animate-dj-fade-in-rapide flex-col gap-2" aria-live="polite">
                <p className="text-sm font-medium text-dj-texte">{t("Import terminé.")}</p>
                {etat.reponse && <p className="whitespace-pre-wrap text-sm text-dj-texte-muet">{etat.reponse}</p>}
                <div><button type="button" onClick={recommencer} className="rounded-lg border border-dj-bordure px-3 py-2 text-sm transition-colors hover:border-dj-bordure-forte">{t("Faire un autre import")}</button></div>
              </div>
            )}

            {echec && (
              <div className="flex animate-dj-fade-in-rapide flex-col gap-2" aria-live="polite">
                <p className="text-sm font-medium text-dj-texte">{t("L'import s'est arrêté avant la fin.")}</p>
                <p className="text-sm text-dj-texte-muet">{t("Rien n'est perdu, tu peux réessayer.")}</p>
                <div><button type="button" onClick={recommencer} className="rounded-lg border border-dj-bordure px-3 py-2 text-sm transition-colors hover:border-dj-bordure-forte">{t("Réessayer")}</button></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
