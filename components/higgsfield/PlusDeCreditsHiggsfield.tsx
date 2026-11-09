"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Share2, Users } from "lucide-react";
import { messageErreur } from "@/lib/erreurs";
import { lienParrainage } from "@/lib/parrainage";
import { copierLien, ErreurPartageImage, partagerContenu } from "@/lib/partagerImage";
import { useMonParrainage } from "@/lib/useMonParrainage";
import { Skeleton } from "@/components/Skeleton";

/**
 * Écran « plus de crédits, invite tes amis » : affiché dans la fenêtre de génération quand le solde est à zéro
 * ou quand le serveur refuse une image faute de crédit. Il propose le lien de parrainage (partage du système,
 * ou copie en secours) et montre où en sont les invitations. Aucun chiffre de gain n'est écrit ici : il se règle
 * dans la base (parrainage_reglages), le texte parle donc seulement d'« images gratuites ».
 */
export function PlusDeCreditsHiggsfield() {
  const { resume, charge, enErreur, rafraichir } = useMonParrainage();
  const lien = resume ? lienParrainage(resume.code) : null;
  const [enCours, setEnCours] = useState(false);
  const [copie, setCopie] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const minuteurRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (minuteurRef.current) clearTimeout(minuteurRef.current);
    },
    []
  );

  async function partager() {
    if (!lien || enCours) return;
    setErreur(null);
    setEnCours(true);
    try {
      await partagerContenu({ mode: "lien", lien, titre: "Classinus", fichier: null });
    } catch (e) {
      setErreur(e instanceof ErreurPartageImage ? "Impossible d'ouvrir le partage ici, copie le lien à la place." : messageErreur(e));
    } finally {
      setEnCours(false);
    }
  }

  async function copier() {
    if (!lien || enCours) return;
    setErreur(null);
    const resultat = await copierLien(lien);
    if (resultat === "annule") return;
    setCopie(true);
    if (minuteurRef.current) clearTimeout(minuteurRef.current);
    minuteurRef.current = setTimeout(() => setCopie(false), 2000);
  }

  const valides = resume?.filleuls_valides ?? 0;
  const enAttente = resume?.filleuls_en_attente ?? 0;

  return (
    <div className="flex animate-dj-fade-in-rapide flex-col gap-3 rounded-xl border border-dj-bordure bg-dj-surface p-4" role="status">
      <div className="flex items-center gap-2 text-sm font-bold text-dj-texte">
        <Users className="h-4 w-4" aria-hidden /> Plus d&apos;images pour le moment
      </div>
      <p className="text-xs leading-relaxed text-dj-texte-muet">
        Invite tes amis pour en gagner d&apos;autres. Chaque ami qui s&apos;inscrit avec ton lien te rapporte des images gratuites.
      </p>

      {charge ? (
        <Skeleton className="h-9 w-48 rounded-full" />
      ) : enErreur ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-red-600">Impossible de lire ton lien de parrainage, réessaie dans un instant.</p>
          <button
            type="button"
            onClick={rafraichir}
            className="rounded-full border border-dj-bordure bg-dj-fond px-3 py-1 text-xs font-semibold text-dj-texte transition-colors hover:bg-dj-surface-haute"
          >
            Réessayer
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={partager}
            disabled={!lien || enCours}
            className="inline-flex items-center gap-1.5 rounded-full bg-dj-texte px-4 py-2 text-xs font-bold text-dj-fond transition-colors hover:bg-dj-texte/90 disabled:opacity-60"
          >
            <Share2 className="h-3.5 w-3.5" /> Partager mon lien
          </button>
          <button
            type="button"
            onClick={copier}
            disabled={!lien || enCours}
            className="inline-flex items-center gap-1.5 rounded-full border border-dj-bordure bg-dj-fond px-4 py-2 text-xs font-semibold text-dj-texte transition-colors hover:bg-dj-surface-haute disabled:opacity-60"
          >
            {copie ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copie ? "Lien copié" : "Copier le lien"}
          </button>
        </div>
      )}

      {erreur && <p className="animate-dj-fade-in-rapide text-xs font-semibold text-red-600">{erreur}</p>}

      {(valides > 0 || enAttente > 0) && (
        <div className="flex flex-col gap-0.5 text-[11px] text-dj-texte-muet">
          {valides > 0 && <span>{valides === 1 ? "1 ami inscrit" : `${valides} amis inscrits`}</span>}
          {enAttente > 0 && (
            <span>{enAttente === 1 ? "1 ami en attente de confirmation" : `${enAttente} amis en attente de confirmation`}</span>
          )}
        </div>
      )}
    </div>
  );
}
