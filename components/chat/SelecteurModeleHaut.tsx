"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Lock } from "lucide-react";
import { IconeFournisseur } from "./IconeFournisseur";
import { ORDRE_DISTRIBUTEURS_AFFICHAGE, nomDistributeur } from "./barre/reglagesReponse";
import { GroupeFournisseur } from "./barre/GroupeFournisseur";
import { obtenirLocale } from "@/lib/i18n/locale";
import { noterEtapeListeAttente } from "@/lib/listeAttente";
import { FormulaireListeAttente } from "./FormulaireListeAttente";

// libelles_bientot : l'info-bulle du verrou d'un modèle à crédit, par langue (le mot "Bientôt" n'est plus
// affiché depuis le 17/11/2026). libelles_badge : le badge devant le nom, par langue (Max pour les modèles
// frontière, groupe 1). Les deux viennent du backend, qui les lit dans Supabase (table textes_modeles_llm),
// donc ils se changent sans toucher au code.
type ModeleDisponible = {
  modele_id: string;
  label: string;
  distributeur: string;
  nom_distributeur?: string | null;
  palier: string;
  libelles_bientot?: Record<string, string>;
  groupe?: number | null;
  libelles_badge?: Record<string, string>;
};

// Dernier recours si le backend n'envoie aucun texte (ancienne version du serveur).
const LIBELLE_VERROU_PAR_DEFAUT = "Disponible avec un abonnement";

function libelleVerrou(libelles?: Record<string, string>): string {
  const locale = obtenirLocale();
  return libelles?.[locale] ?? (locale === "en" ? "Available with a plan" : libelles?.fr ?? LIBELLE_VERROU_PAR_DEFAUT);
}

// Badge devant le nom du modèle : vide quand le modèle n'en a pas.
function libelleBadge(libelles?: Record<string, string>): string {
  const locale = obtenirLocale();
  return libelles?.[locale] ?? libelles?.fr ?? "";
}

/**
 * Bouton du modèle, en haut au milieu du chat (14/10/2026, demande Bourama). Il montre
 * le nom du modèle actif avec l'icône de son fournisseur. Il n'y a plus de choix "Auto"
 * (15/10/2026) : le modèle actif est toujours un vrai modèle, voir lib/modeleActif.ts.
 * Au clic il déplie la liste de tous les modèles, groupés par
 * fournisseur dans le même ordre que partout ailleurs (reglagesReponse.ts). Chaque
 * fournisseur est une liste dépliable, dépliée par défaut (GroupeFournisseur.tsx).
 *
 * Il remplace la ligne "Modèle" du bouton Réglages de la barre de saisie. Les données
 * (liste, modèle choisi) et le stockage du choix (lib/reglagesProchainMessage.ts)
 * sont ceux d'avant : seul l'endroit où l'on choisit change. Les modèles pas encore
 * ouverts (modelesBientot, envoyés par le backend) sont montrés grisés avec un verrou
 * (et le badge Max pour les modèles frontière), à la suite des modèles utilisables de leur fournisseur. Le canal en direct garde,
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
  // Modèles à crédit montrés grisés avec un verrou, jamais choisissables.
  modelesBientot?: ModeleDisponible[];
  // Modèle actif déjà résolu (lib/modeleActif.ts), toujours présent dans la liste.
  modeleSelectionne: string | null;
  onModeleChange: (modeleId: string) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  // Modèle verrouillé sur lequel la personne a cliqué : le formulaire de la liste d'attente s'ouvre pour lui.
  const [modeleListeAttente, setModeleListeAttente] = useState<ModeleDisponible | null>(null);
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

  // Première étape de l'entonnoir de la liste d'attente : le sélecteur s'ouvre alors qu'il montre des
  // modèles Bientôt. Une note par ouverture, jamais bloquante (voir lib/listeAttente.ts).
  const aDesModelesBientot = modelesBientot.length > 0;
  useEffect(() => {
    if (ouvert && aDesModelesBientot) noterEtapeListeAttente("selecteur_ouvert", null, obtenirLocale());
  }, [ouvert, aDesModelesBientot]);

  function ouvrirListeAttente(modele: ModeleDisponible) {
    noterEtapeListeAttente("modele_grise_clique", modele.modele_id, obtenirLocale());
    setOuvert(false);
    setModeleListeAttente(modele);
  }

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
                  <GroupeFournisseur key={distributeur} libelle={nomDistributeur(distributeur, [...modelesDisponibles, ...modelesBientot])}>
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
                        <OptionModele
                          key={m.modele_id}
                          actif={false}
                          verrouille
                          libelleVerrou={libelleVerrou(m.libelles_bientot)}
                          badge={libelleBadge(m.libelles_badge)}
                          distributeur={m.distributeur}
                          onClick={() => ouvrirListeAttente(m)}>
                          {m.label}
                        </OptionModele>
                      ))}
                  </GroupeFournisseur>
                )
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {modeleListeAttente && (
        <FormulaireListeAttente
          modeleId={modeleListeAttente.modele_id}
          modeleLabel={modeleListeAttente.label}
          onFermer={() => setModeleListeAttente(null)}
        />
      )}
    </div>
  );
}

function OptionModele({
  actif,
  verrouille = false,
  libelleVerrou = LIBELLE_VERROU_PAR_DEFAUT,
  badge = "",
  distributeur,
  onClick,
  children,
}: {
  actif: boolean;
  // Modèle à crédit pas encore ouvert : grisé avec un verrou, jamais choisissable. Un clic ouvre le
  // formulaire de la liste d'attente (FormulaireListeAttente.tsx).
  verrouille?: boolean;
  // Info-bulle et nom accessible du verrou (réglés dans Supabase, voir libelleVerrou plus haut).
  libelleVerrou?: string;
  // Badge devant le nom (Max pour les modèles frontière), vide sans badge.
  badge?: string;
  distributeur: string | null;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={actif}
      onClick={onClick}
      className={
        "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] transition-colors " +
        (verrouille ? "text-dj-texte-muet hover:bg-dj-surface-haute " : "hover:bg-dj-surface-haute ") +
        (actif ? "text-dj-accent-1-texte" : verrouille ? "" : "text-dj-texte")
      }>
      <span className={verrouille ? "opacity-50" : ""}>
        <IconeFournisseur distributeur={distributeur} />
      </span>
      {badge && (
        <span className="flex-shrink-0 rounded-full bg-dj-accent-1 px-1.5 py-0.5 text-[10px] font-bold leading-none text-[#1A0D02]">
          {badge}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {verrouille && <Lock size={13} aria-label={libelleVerrou} role="img" className="flex-shrink-0 text-dj-texte-muet" />}
      {actif && <Check size={14} className="flex-shrink-0" />}
    </button>
  );
}
