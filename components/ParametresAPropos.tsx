"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenirInfosClovis, ID_ELEMENT_CLOVIS } from "@/lib/api";
import { BoutonEtoile } from "./BoutonEtoile";
import { SectionCommentairesCatalogue } from "./SectionCommentairesCatalogue";

// 19/09/2026, demande Bourama : ancien écran "a-propos" d'EspaceParametres.tsx.
export function ParametresAPropos() {
  const router = useRouter();
  const [infosClovis, setInfosClovis] = useState<{ etoilesCount: number; monEtoile: boolean } | null>(null);

  useEffect(() => {
    obtenirInfosClovis()
      .then((r) => setInfosClovis({ etoilesCount: r.etoiles_count, monEtoile: r.mon_etoile }))
      .catch(() => {
        // Silencieux : l'étoile reste juste absente, pas bloquant pour le reste de la page.
      });
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-4 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-dj-texte">Classinus</span>
          {infosClovis && (
            <BoutonEtoile
              typeElement="clovis"
              elementId={ID_ELEMENT_CLOVIS}
              count={infosClovis.etoilesCount}
              active={infosClovis.monEtoile}
              onBascule={(etoile, etoilesCount) => setInfosClovis({ monEtoile: etoile, etoilesCount })}
            />
          )}
        </div>
        <button onClick={() => router.push("/cgu")} className="w-fit text-dj-texte-muet hover:text-dj-texte hover:underline">
          Conditions générales d&apos;utilisation
        </button>
        <button onClick={() => router.push("/copyright")} className="w-fit text-dj-texte-muet hover:text-dj-texte hover:underline">
          Droit d&apos;auteur
        </button>
        <button onClick={() => router.push("/confidentialite")} className="w-fit text-dj-texte-muet hover:text-dj-texte hover:underline">
          Politique de confidentialité
        </button>
      </div>

      <SectionCommentairesCatalogue typeElement="clovis" elementId={ID_ELEMENT_CLOVIS} />
    </div>
  );
}
