"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { IconeFournisseur } from "./IconeFournisseur";
import { ORDRE_DISTRIBUTEURS_AFFICHAGE, LABELS_DISTRIBUTEUR } from "./barre/reglagesReponse";

type ModeleDisponible = { modele_id: string; label: string; distributeur: string; palier: string };

/**
 * Bouton du modèle, en haut au milieu du chat (14/10/2026, demande Bourama). Il montre
 * le nom du modèle actif avec l'icône de son fournisseur. Il n'y a plus de choix "Auto"
 * (15/10/2026) : le modèle actif est toujours un vrai modèle, voir lib/modeleActif.ts.
 * Au clic il déplie la liste de tous les modèles, groupés par
 * fournisseur dans le même ordre que partout ailleurs (reglagesReponse.ts).
 *
 * Il remplace la ligne "Modèle" du bouton Réglages de la barre de saisie. Les données
 * (liste, modèle choisi) et le stockage du choix (lib/reglagesProchainMessage.ts)
 * sont ceux d'avant : seul l'endroit où l'on choisit change. Les modèles pas encore
 * ouverts (modelesBientot, envoyés par le backend) sont montrés grisés avec la mention
 * Bientôt, à la suite des modèles utilisables de leur fournisseur. Le canal en direct garde,
 * lui, la ligne Modèle dans son propre bouton Réglages.
 *
 * Se ferme au clic extérieur, à la touche Echap et après un choix. L'ouverture et la
 * fermeture glissent et s'estompent, jamais d'affichage brut.
 */
export function SelecteurModeleHaut({
  modelesDisponibles,
  modelesBientot = [],
  modeleSelectionne,
  onModeleChange,
}: {
  modelesDisponibles: ModeleDisponible[];
  // Modèles montrés grisés avec la mention Bientôt, jamais choisissables.
  modelesBientot?: ModeleDisponible[];
  // Modèle actif déjà résolu (lib/modeleActif.ts), toujours présent dans la liste.
  modeleSelectionne: string | null;
  onModeleChange: (modeleId: string) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const idListe = useId();
  const racineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    function gererClicExterieur(e: MouseEvent) {
      if (racineRef.current?.contains(e.target as Node)) return;
      setOuvert(false);
    }
    function gererTouche(e: KeyboardEvent) {
      if (e.key === "Escape") setOuvert(false);
    }
    document.addEventListener("mousedown", gererClicExterieur);
    document.addEventListener("keydown", gererTouche);
    return () => {
      document.removeEventListener("mousedown", gererClicExterieur);
      document.removeEventListener("keydown", gererTouche);
    };
  }, [ouvert]);

  // Même règle que la ligne Modèle de Réglages : sans liste, pas de bouton.
  if (modelesDisponibles.length === 0) return null;

  const modeleActif = modelesDisponibles.find((m) => m.modele_id === modeleSelectionne) ?? null;

  function choisir(modeleId: string) {
    onModeleChange(modeleId);
    setOuvert(false);
  }

  return (
    <div ref={racineRef} className="pointer-events-auto relative">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={ouvert}
        aria-controls={idListe}
        className="flex max-w-[70vw] items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium text-dj-texte transition-colors hover:bg-dj-surface-haute"
      >
        <IconeFournisseur distributeur={modeleActif?.distributeur ?? null} />
        <span className="truncate">{modeleActif?.label ?? ""}</span>
        <ChevronDown
          size={14}
          className={"flex-shrink-0 text-dj-texte-muet transition-transform duration-200 " + (ouvert ? "rotate-180" : "")}
        />
      </button>

      <AnimatePresence>
        {ouvert && (
          <div className="absolute left-1/2 top-full z-30 mt-1 w-72 max-w-[calc(100vw-2rem)] -translate-x-1/2">
            <motion.div
              id={idListe}
              role="listbox"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="max-h-[min(24rem,60vh)] overflow-y-auto rounded-2xl border border-dj-bordure bg-dj-surface p-1 shadow-lg">
              {ORDRE_DISTRIBUTEURS_AFFICHAGE.filter(
                (d) => modelesDisponibles.some((m) => m.distributeur === d) || modelesBientot.some((m) => m.distributeur === d)
              ).map(
                (distributeur) => (
                  <div key={distributeur} className="mt-1">
                    <div className="px-2.5 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-dj-texte-muet">
                      {LABELS_DISTRIBUTEUR[distributeur] ?? distributeur}
                    </div>
                    {modelesDisponibles
                      .filter((m) => m.distributeur === distributeur)
                      .map((m) => (
                        <OptionModele
                          key={m.modele_id}
                          actif={modeleSelectionne === m.modele_id}
                          distributeur={m.distributeur}
                          onClick={() => choisir(m.modele_id)}>
                          {m.label}
                        </OptionModele>
                      ))}
                    {modelesBientot
                      .filter((m) => m.distributeur === distributeur)
                      .map((m) => (
                        <OptionModele key={m.modele_id} actif={false} bientot distributeur={m.distributeur} onClick={() => {}}>
                          {m.label}
                        </OptionModele>
                      ))}
                  </div>
                )
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OptionModele({
  actif,
  bientot = false,
  distributeur,
  onClick,
  children,
}: {
  actif: boolean;
  // Modèle pas encore ouvert : grisé, non cliquable, avec la mention Bientôt.
  bientot?: boolean;
  distributeur: string | null;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={actif}
      aria-disabled={bientot}
      disabled={bientot}
      onClick={onClick}
      className={
        "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] transition-colors " +
        (bientot ? "cursor-not-allowed text-dj-texte-muet " : "hover:bg-dj-surface-haute ") +
        (actif ? "text-dj-accent-1-texte" : bientot ? "" : "text-dj-texte")
      }>
      <span className={bientot ? "opacity-50" : ""}>
        <IconeFournisseur distributeur={distributeur} />
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {bientot && (
        <span className="flex-shrink-0 rounded-full bg-dj-surface-haute px-2 py-0.5 text-[10px] font-medium text-dj-texte-muet">
          Bientôt
        </span>
      )}
      {actif && <Check size={14} className="flex-shrink-0" />}
    </button>
  );
}
