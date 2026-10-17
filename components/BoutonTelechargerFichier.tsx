"use client";

import { telecharger } from "@/lib/telecharger";
import { useEtatTelechargement } from "@/lib/etatTelechargements";
import {
  BarreProgressionTelechargement,
  IconeTelechargement,
  LibelleTelechargement,
  MessageEchecTelechargement,
  classeEtatTelechargement,
} from "@/components/EtatTelechargement";

// Créé le 12/09/2026, demande Bourama : le vrai téléchargement système
// (lib/telecharger.ts) a besoin d'un onClick, donc d'un composant client
// -- extrait à part pour rester utilisable depuis une page Server
// Component (ex. app/(app)/bibliotheque/[id]/page.tsx, volontairement
// pas "use client" pour le SEO) sans convertir toute la page.
//
// 10/10/2026, demande Bourama : le bouton affiche maintenant l'avancement
// en pourcentage, passe en rouge avec "Échec, réessayer" si le
// téléchargement échoue (un clic relance), et le message d'erreur s'affiche
// dessous.
export function BoutonTelechargerFichier({
  url,
  nom,
  className = "",
}: {
  url: string;
  nom: string;
  className?: string;
}) {
  const etat = useEtatTelechargement(url);
  return (
    <span className="flex flex-shrink-0 flex-col items-stretch gap-1">
      <button
        type="button"
        onClick={() => void telecharger(url, nom)}
        disabled={etat?.statut === "encours"}
        className={
          "flex flex-shrink-0 items-center justify-center gap-1.5 rounded-cgpt-bouton bg-dj-accent-1 px-4 py-2 text-sm font-semibold text-[#1a0f06] transition-colors duration-200 ease-cgpt-doux hover:bg-dj-accent-2 " +
          classeEtatTelechargement(etat) +
          " " +
          className
        }
      >
        <IconeTelechargement href={url} size={15} />
        <LibelleTelechargement href={url} defaut="Télécharger" />
      </button>
      <BarreProgressionTelechargement href={url} />
      <MessageEchecTelechargement href={url} className="max-w-[16rem] text-right" />
    </span>
  );
}
