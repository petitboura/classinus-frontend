"use client";

import { useEffect, useState, type FormEvent } from "react";
import { FolderPlus, Loader2, Save, X } from "lucide-react";
import {
  ajouterFichierBibliothequePersonnelle,
  creerDossierBibliotheque,
  listerDossiersBibliotheque,
  type DossierBibliotheque,
  type FichierBibliothequePersonnelle,
} from "@/lib/api";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import { messageErreur } from "@/lib/erreurs";
import { SelectPersonnalise } from "@/components/SelectPersonnalise";

// 26/09/2026, chantier "éditeur de code du Bureau" (demande Bourama : nom
// obligatoire, dossier optionnel -- comme le reste de la bibliothèque,
// jamais forcé). "Aucun dossier" range le fichier à la racine, exactement
// comme un ajout normal à la bibliothèque sans dossier_parent_id.
const AUCUN_DOSSIER = "__aucun__";
const NOUVEAU_DOSSIER = "__nouveau__";

export function DialogueEnregistrerEditeur({
  nomParDefaut,
  extension,
  contenu,
  dossierIdParDefaut,
  onEnregistre,
  onFermer,
}: {
  nomParDefaut: string;
  extension: string;
  contenu: string;
  dossierIdParDefaut?: string | null;
  onEnregistre: (fichier: FichierBibliothequePersonnelle) => void;
  onFermer: () => void;
}) {
  const [nom, setNom] = useState(nomParDefaut);
  const [dossiers, setDossiers] = useState<DossierBibliotheque[]>([]);
  const [dossierChoisi, setDossierChoisi] = useState<string>(dossierIdParDefaut || AUCUN_DOSSIER);
  const [nomNouveauDossier, setNomNouveauDossier] = useState("");
  const [chargementDossiers, setChargementDossiers] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const { enSortie, demarrerFermeture } = useFermetureAnimee();
  const fermer = () => demarrerFermeture(onFermer);

  useEffect(() => {
    (async () => {
      try {
        setDossiers(await listerDossiersBibliotheque());
      } catch (e) {
        setErreur(messageErreur(e));
      } finally {
        setChargementDossiers(false);
      }
    })();
  }, []);

  async function soumettre(e: FormEvent) {
    e.preventDefault();
    const nomPropre = nom.trim();
    if (!nomPropre) {
      setErreur("Donne un nom au fichier.");
      return;
    }
    setEnregistrement(true);
    setErreur(null);
    try {
      let dossierParentId: string | undefined;
      if (dossierChoisi === NOUVEAU_DOSSIER) {
        const nomDossierPropre = nomNouveauDossier.trim();
        if (!nomDossierPropre) throw new Error("Donne un nom au nouveau dossier.");
        const dossier = await creerDossierBibliotheque(nomDossierPropre);
        dossierParentId = dossier?.id;
      } else if (dossierChoisi !== AUCUN_DOSSIER) {
        dossierParentId = dossierChoisi;
      }

      const nomFichier = nomPropre.toLowerCase().endsWith(`.${extension}`) ? nomPropre : `${nomPropre}.${extension}`;
      const fichierBlob = new File([contenu], nomFichier, { type: "text/plain;charset=utf-8" });
      const resultat = await ajouterFichierBibliothequePersonnelle(fichierBlob, "", nomFichier, dossierParentId);
      // Le backend peut renvoyer une forme "zip déplié" pour un .zip -- ne
      // s'applique jamais ici (on envoie toujours un fichier texte unique),
      // donc resultat est bien un FichierBibliothequePersonnelle.
      onEnregistre(resultat as FichierBibliothequePersonnelle);
      fermer();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnregistrement(false);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6 ${
        enSortie ? "opacity-0 transition-opacity duration-150 ease-in" : "animate-dj-fade-in-rapide"
      }`}
      onClick={fermer}
    >
      <form
        onSubmit={soumettre}
        className={`flex w-full flex-col gap-3 rounded-t-2xl border border-dj-bordure bg-dj-surface p-5 shadow-[0_8px_40px_rgba(0,0,0,0.45)] sm:max-w-md sm:rounded-cgpt-carte ${
          enSortie ? "animate-cgpt-sortie-modal" : "animate-cgpt-entree-modal"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-dj-texte">
            <Save size={15} /> Enregistrer dans la bibliothèque
          </h4>
          <button type="button" onClick={fermer} aria-label="Fermer" className="text-dj-texte-muet hover:text-dj-texte">
            <X size={16} />
          </button>
        </div>

        {erreur && <p className="text-sm text-[var(--dj-erreur)]">{erreur}</p>}

        <label className="flex flex-col gap-1 text-xs text-dj-texte-muet">
          Nom du fichier
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="mon_script"
              className="min-w-0 flex-1 rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte"
            />
            <span className="whitespace-nowrap text-sm text-dj-texte-muet">.{extension}</span>
          </div>
        </label>

        <label className="flex flex-col gap-1 text-xs text-dj-texte-muet">
          Dossier (optionnel)
          {chargementDossiers ? (
            <Loader2 size={16} className="animate-spin text-dj-texte-muet" />
          ) : (
            <SelectPersonnalise
              options={[
                { id: AUCUN_DOSSIER, label: "Aucun dossier (racine)" },
                ...dossiers.map((d) => ({ id: d.id, label: d.nom })),
                { id: NOUVEAU_DOSSIER, label: "+ Nouveau dossier..." },
              ]}
              valeur={dossierChoisi}
              onChange={setDossierChoisi}
            />
          )}
        </label>

        {dossierChoisi === NOUVEAU_DOSSIER && (
          <label className="flex animate-dj-fade-in-rapide flex-col gap-1 text-xs text-dj-texte-muet">
            Nom du nouveau dossier
            <div className="flex items-center gap-1.5">
              <FolderPlus size={16} className="flex-shrink-0 text-dj-texte-muet" />
              <input
                autoFocus
                value={nomNouveauDossier}
                onChange={(e) => setNomNouveauDossier(e.target.value)}
                placeholder="Mes scripts"
                className="min-w-0 flex-1 rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte"
              />
            </div>
          </label>
        )}

        <button
          type="submit"
          disabled={enregistrement}
          className="mt-1 flex items-center justify-center gap-2 rounded-xl border border-dj-accent-1 bg-dj-accent-1-conteneur px-3 py-2 text-sm font-medium text-dj-accent-1-texte transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {enregistrement ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Enregistrer
        </button>
      </form>
    </div>
  );
}
