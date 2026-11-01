"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { listerAutorisationsOutils, retirerAutorisationOutil, type AutorisationOutil } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";
import { traduireTexteInterface } from "@/lib/i18n/interface";
import { useLocale } from "@/lib/i18n/useLocale";

// Actions que la personne a autorisées pour de bon avec « Toujours autoriser » dans le chat.
// `filtre` choisit celles de l'application dont le panneau est ouvert. Rien ne s'affiche
// tant qu'il n'y en a aucune, pour ne pas alourdir le panneau.
export function ActionsToujoursAutorisees({ filtre }: { filtre: (autorisation: AutorisationOutil) => boolean }) {
  const locale = useLocale();
  const t = (texte: string) => traduireTexteInterface(texte, locale);
  const [liste, setListe] = useState<AutorisationOutil[]>([]);
  const [retrait, setRetrait] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      const { autorisations } = await listerAutorisationsOutils();
      setListe(autorisations);
    } catch {
      // Panneau sans cette section : la connexion elle-même reste utilisable.
      setListe([]);
    }
  }, []);

  useEffect(() => { void charger(); }, [charger]);

  async function retirer(cle: string) {
    setErreur(null);
    setRetrait(cle);
    try {
      await retirerAutorisationOutil(cle);
      setListe((avant) => avant.filter((a) => a.cle !== cle));
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setRetrait(null);
    }
  }

  const visibles = liste.filter(filtre);
  if (visibles.length === 0 && !erreur) return null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dj-bordure p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-dj-texte"><ShieldCheck size={14} />{t("Actions toujours autorisées")}</p>
      <p className="text-xs leading-5 text-dj-texte-muet">{t("Ces actions ne demandent plus ta confirmation. Retire-en une pour qu'elle te la redemande.")}</p>
      {erreur && <p role="alert" className="text-xs text-[var(--dj-erreur)]">{erreur}</p>}
      <ul className="flex flex-col gap-1.5">
        {visibles.map((a) => (
          <li key={a.cle} className="flex items-center justify-between gap-2">
            <span className="min-w-0 break-words text-sm text-dj-texte">{a.nom_lisible || a.cle}</span>
            <button
              type="button"
              onClick={() => void retirer(a.cle)}
              disabled={retrait !== null}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-dj-bordure px-2.5 py-1 text-xs font-semibold text-dj-texte transition-colors hover:bg-dj-surface-haute disabled:opacity-50"
            >
              {retrait === a.cle && <LoaderCircle size={12} className="animate-spin" />}
              {retrait === a.cle ? t("Retrait…") : t("Retirer")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
