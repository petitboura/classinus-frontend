"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { obtenirOrigineAppareil } from "@/lib/origineAppareil";
import { adresseOuvertureAppliPc } from "@/lib/liensEntrants";
import { PARAMETRES_OUVERTURE } from "@/lib/ouvertureParUrl";

// Sur un PC, un lien https ne peut pas ouvrir une appli de bureau (contrairement
// à Android). Quand quelqu'un arrive dans le navigateur d'un PC sur un lien de
// partage (fichier, dossier ou skill public), ce bandeau propose de l'ouvrir
// dans l'appli Classinus installée, par son protocole classinus:// (voir
// lib/liensEntrants.ts). Rien ne s'affiche dans l'appli elle même, sur
// téléphone, ni sur une page sans élément partagé.
//
// Le navigateur ne dit pas si l'appli est installée : le bandeau propose donc
// aussi la page de téléchargement.

const CLE_BANDEAU_FERME = "classinus-bandeau-ouvrir-appli-ferme";

function bandeauDejaFerme(): boolean {
  try {
    return sessionStorage.getItem(CLE_BANDEAU_FERME) === "1";
  } catch {
    return false;
  }
}

export function BandeauOuvrirDansAppli() {
  const pathname = usePathname();
  const parametres = useSearchParams();
  const [concerne, setConcerne] = useState(false);
  const [ferme, setFerme] = useState(true);

  const porteUnElementPartage = Object.values(PARAMETRES_OUVERTURE).some((nom) => parametres.has(nom));
  const suiteAdresse = `${pathname}${parametres.toString() ? `?${parametres.toString()}` : ""}`;

  useEffect(() => {
    const surPcNavigateur = obtenirOrigineAppareil() === "pc_navigateur";
    setConcerne(surPcNavigateur && porteUnElementPartage);
    setFerme(bandeauDejaFerme());
  }, [porteUnElementPartage]);

  if (!concerne || ferme) return null;

  function fermer() {
    setFerme(true);
    try {
      sessionStorage.setItem(CLE_BANDEAU_FERME, "1");
    } catch {
      // Stockage indisponible : le bandeau reviendra au prochain lien, sans gravité.
    }
  }

  return (
    <div
      role="region"
      aria-label="Ouvrir dans l'appli Classinus"
      className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 animate-dj-fade-up items-center gap-3 rounded-2xl border border-dj-bordure bg-dj-surface px-4 py-3 shadow-[0_2px_24px_rgba(0,0,0,0.35)]"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-dj-texte">Ouvrir dans l&apos;appli Classinus</p>
        <Link href="/telecharger" className="text-xs text-dj-texte-muet hover:text-dj-texte hover:underline">
          Pas encore installée ? Télécharger
        </Link>
      </div>
      <a
        href={adresseOuvertureAppliPc(suiteAdresse)}
        onClick={fermer}
        className="shrink-0 rounded-cgpt-bouton bg-dj-accent-1 px-4 py-2 text-sm font-semibold text-[#1a0f06] transition-colors hover:bg-dj-accent-2"
      >
        Ouvrir
      </a>
      <button
        type="button"
        onClick={fermer}
        aria-label="Fermer"
        className="shrink-0 rounded-lg p-1 text-dj-texte-muet transition-colors hover:text-dj-texte"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
