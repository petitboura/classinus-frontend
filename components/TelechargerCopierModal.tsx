"use client";

import { useRef, useState } from "react";
import { X, Download, Loader2 } from "lucide-react";
import { CaseACocher } from "./CaseACocher";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import { messageErreur } from "@/lib/erreurs";
import { useEtatTelechargement, useSuiviParBouton } from "@/lib/etatTelechargements";
import { textesTelechargement } from "@/lib/textesTelechargement";

// Créé le 13/09/2026, demande Bourama : "Copier dans ma bibliothèque" et
// "Télécharger" utilisaient la même icône (Download) à plusieurs endroits
// (carte fichier de la bibliothèque publique, barre de sélection multiple,
// aperçu, carte fichier du chat), ce qui les rendait indiscernables au
// premier coup d'œil. Remplacé par CE bouton unique partout où l'un des
// deux apparaissait : au clic, une fenêtre centrée avec deux cases à
// cocher indépendantes -- "Ajouter à ma bibliothèque" et "Téléchargement
// réel" -- et un bouton Valider qui déclenche les actions cochées (les
// deux si les deux sont cochées).
//
// 10/10/2026, demande Bourama : la fenêtre montre aussi l'avancement du
// téléchargement en pourcentage et, s'il échoue, reste ouverte avec le
// message d'erreur et un bouton "Réessayer". Elle suit le téléchargement par
// `hrefTelechargement` (la même adresse que celle passée à telecharger()).
//
// `surCopie` n'est fourni que là où "copier chez moi" a un sens
// (bibliothèque publique, ou un fichier du chat identifié comme venant
// de la bibliothèque publique) -- absent, sa case n'apparaît pas et seul
// le téléchargement réel est proposé.
export function TelechargerCopierModal({
  titre,
  surCopie,
  surTelechargement,
  hrefTelechargement,
  onFermer,
}: {
  titre: string;
  surCopie?: () => Promise<void>;
  // Renvoie false quand le téléchargement a échoué (voir lib/telecharger.ts).
  surTelechargement?: () => Promise<boolean | void> | boolean | void;
  hrefTelechargement?: string;
  onFermer: () => void;
}) {
  const [perso, setPerso] = useState(false);
  const [reel, setReel] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  // Si le téléchargement échoue après la copie, "Réessayer" ne copie pas une seconde fois.
  const copieFaite = useRef(false);
  const etatTelechargement = useEtatTelechargement(hrefTelechargement);
  useSuiviParBouton(hrefTelechargement);
  const t = textesTelechargement();
  const { enSortie, demarrerFermeture } = useFermetureAnimee();
  const fermer = () => demarrerFermeture(onFermer);

  async function valider() {
    if (!perso && !reel) return;
    setEnCours(true);
    setErreur(null);
    try {
      if (perso && surCopie && !copieFaite.current) {
        await surCopie();
        copieFaite.current = true;
      }
      if (reel && surTelechargement) {
        const reussi = await surTelechargement();
        if (reussi === false) {
          // Le message précis est affiché depuis l'état du téléchargement ;
          // la fenêtre reste ouverte pour pouvoir réessayer.
          setErreur(hrefTelechargement ? null : t.erreurReseau);
          return;
        }
      }
      fermer();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm ${
        enSortie ? "opacity-0 transition-opacity duration-150 ease-in" : "animate-dj-fade-in-rapide"
      }`}
      onClick={fermer}
    >
      <div
        className={`flex w-full max-w-sm flex-col gap-4 rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-5 shadow-[0_8px_40px_rgba(0,0,0,0.45)] ${
          enSortie ? "animate-cgpt-sortie-modal" : "animate-cgpt-entree-modal"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <h4 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-dj-texte">
            <Download size={15} className="shrink-0" />
            <span className="truncate">{titre}</span>
          </h4>
          <button onClick={fermer} className="shrink-0 text-dj-texte-muet hover:text-dj-texte">
            <X size={16} />
          </button>
        </div>

        {erreur && <p className="text-sm text-[var(--dj-erreur)]">{erreur}</p>}
        {etatTelechargement?.statut === "echec" && etatTelechargement.erreur && (
          <p role="alert" className="text-sm text-[var(--dj-erreur)]">
            {etatTelechargement.erreur}
          </p>
        )}

        <div className="flex flex-col gap-2.5">
          {surCopie && (
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-dj-texte">
              <CaseACocher checked={perso} onChange={setPerso} disabled={enCours} />
              Ajouter à ma bibliothèque
            </label>
          )}
          {surTelechargement && (
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-dj-texte">
              <CaseACocher checked={reel} onChange={setReel} disabled={enCours} />
              Téléchargement réel
            </label>
          )}
        </div>

        <button
          onClick={valider}
          disabled={enCours || (!perso && !reel)}
          className="flex items-center justify-center gap-1.5 rounded-cgpt-bouton bg-dj-accent-1 px-4 py-2 text-sm font-semibold text-[#1a0f06] transition-colors duration-200 ease-cgpt-doux hover:bg-dj-accent-2 disabled:opacity-50"
        >
          {enCours && <Loader2 size={14} className="animate-spin" />}
          {etatTelechargement?.statut === "encours"
            ? etatTelechargement.pourcentage === null
              ? t.preparation
              : t.pourcentage(etatTelechargement.pourcentage)
            : etatTelechargement?.statut === "echec"
              ? t.reessayer
              : "Valider"}
        </button>
        {etatTelechargement?.statut === "encours" && (
          <span className="-mt-2 block h-1 w-full overflow-hidden rounded-full bg-dj-bordure">
            <span
              className={`block h-full rounded-full bg-dj-accent-1 transition-[width] duration-200 ease-out ${
                etatTelechargement.pourcentage === null ? "w-1/3 animate-pulse" : ""
              }`}
              style={etatTelechargement.pourcentage === null ? undefined : { width: `${etatTelechargement.pourcentage}%` }}
            />
          </span>
        )}
      </div>
    </div>
  );
}
