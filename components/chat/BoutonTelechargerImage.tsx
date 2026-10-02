"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Download, Loader2 } from "lucide-react";
import { ATTRIBUT_EXCLURE_EXPORT } from "@/lib/telechargerImageElement";

// Bouton "Télécharger" des éléments riches (fiches, diagrammes, graphiques du
// code). Même apparence discrète que celui de GraphiqueDonnees.tsx et
// SchemaGeometrique.tsx. Le travail d'export est passé en paramètre : la
// fonction renvoie true si le fichier a bien été produit, false sinon, pour
// afficher un vrai retour à l'utilisateur au lieu d'un faux succès.
type Etat = "repos" | "encours" | "ok" | "echec";

export function BoutonTelechargerImage({
  exporter,
  libelleAria,
}: {
  exporter: () => Promise<boolean>;
  libelleAria: string;
}) {
  const [etat, setEtat] = useState<Etat>("repos");
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    };
  }, []);

  async function cliquer() {
    if (etat === "encours") return;
    setEtat("encours");
    const reussi = await exporter();
    setEtat(reussi ? "ok" : "echec");
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => setEtat("repos"), reussi ? 1500 : 2500);
  }

  return (
    <button
      type="button"
      {...{ [ATTRIBUT_EXCLURE_EXPORT]: "true" }}
      onClick={cliquer}
      disabled={etat === "encours"}
      aria-label={libelleAria}
      className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-dj-texte-muet transition-colors hover:text-dj-texte disabled:opacity-70"
    >
      {etat === "encours" ? (
        <>
          <Loader2 size={12} className="animate-spin" /> Préparation
        </>
      ) : etat === "ok" ? (
        <>
          <Check size={12} /> Téléchargé
        </>
      ) : etat === "echec" ? (
        <>
          <AlertCircle size={12} /> Échec, réessaie
        </>
      ) : (
        <>
          <Download size={12} /> Télécharger
        </>
      )}
    </button>
  );
}
