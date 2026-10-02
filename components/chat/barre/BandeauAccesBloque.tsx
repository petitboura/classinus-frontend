"use client";

import { Lock } from "lucide-react";

/**
 * Bandeau affiché à un mineur sans aucun code rattaché (Partie 7, 06/09/2026) :
 * l'accès au chat est bloqué (la barre de saisie est désactivée par ChatIA)
 * tant qu'il n'a pas entré le code de son professeur ou établissement. Il
 * garde la place qu'il avait avant le déplacement du sélecteur de code dans le
 * bouton Réglages (01/10/2026) : fixe en haut de l'écran sur mobile, juste
 * au-dessus de la barre de saisie sur PC.
 */
export function BandeauAccesBloque() {
  const bandeau = (
    <div className="flex items-center gap-2 rounded-cgpt-carte border border-dj-bordure bg-dj-surface px-3 py-2 text-xs text-dj-texte-muet shadow-sm animate-dj-fade-in-rapide">
      <Lock size={13} className="flex-shrink-0" />
      <span>Entre le code reçu de ton professeur ou établissement pour pouvoir discuter avec Classinus.</span>
    </div>
  );
  return (
    <>
      <div className="fixed inset-x-3 top-[calc(0.5rem+var(--safe-top,0px))] z-40 md:hidden">{bandeau}</div>
      <div className="mb-2 hidden md:flex">{bandeau}</div>
    </>
  );
}
