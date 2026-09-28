"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, File, Folder, HardDrive, Loader2, X } from "lucide-react";
import {
  listerBibliothequePersonnelle,
  listerDossiersBibliotheque,
  type DossierBibliotheque,
  type FichierBibliothequePersonnelle,
} from "@/lib/api";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import { messageErreur } from "@/lib/erreurs";

// 26/09/2026, chantier "éditeur de code du Bureau" (demande Bourama :
// l'éditeur n'a pas d'explorateur intégré, comme Thonny -- juste
// Ouvrir/Enregistrer qui utilisent la bibliothèque privée comme système
// de fichiers). Seuls les fichiers texte/code ont un sens à ouvrir ici
// (un PDF ou une image ne s'éditent pas comme du texte).
const EXTENSIONS_OUVRABLES = new Set([
  "py", "js", "ts", "html", "htm", "css", "sh", "sql", "java", "c", "cpp",
  "go", "rs", "php", "rb", "yml", "yaml", "md", "toml", "json", "txt",
]);

function estOuvrable(fichier: FichierBibliothequePersonnelle): boolean {
  if (fichier.type_mime?.startsWith("text/")) return true;
  if (fichier.type_mime === "application/json") return true;
  const extension = fichier.nom_fichier.split(".").pop()?.toLowerCase();
  return !!extension && EXTENSIONS_OUVRABLES.has(extension);
}

export function DialogueOuvrirEditeur({
  onChoisir,
  onImporterLocal,
  onFermer,
}: {
  onChoisir: (fichier: FichierBibliothequePersonnelle, contenu: string) => void;
  // 27/09/2026, demande Bourama (retour de test) : "Ouvrir" doit aussi
  // proposer de choisir un fichier depuis l'ordinateur, pas seulement
  // depuis la bibliothèque -- lit le fichier localement (FileReader,
  // rien n'est envoyé au serveur) et le dépose directement dans
  // l'éditeur, sans passer par la bibliothèque personnelle.
  onImporterLocal: (nomFichier: string, contenu: string) => void;
  onFermer: () => void;
}) {
  const [fichiers, setFichiers] = useState<FichierBibliothequePersonnelle[]>([]);
  const [dossiers, setDossiers] = useState<DossierBibliotheque[]>([]);
  const [chargement, setChargement] = useState(true);
  const [ouvertureId, setOuvertureId] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [dossierCourantId, setDossierCourantId] = useState<string | null>(null);
  const inputLocalRef = useRef<HTMLInputElement>(null);
  const { enSortie, demarrerFermeture } = useFermetureAnimee();
  const fermer = () => demarrerFermeture(onFermer);

  async function fichierLocalChoisi(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (!fichier) return;
    try {
      const contenu = await fichier.text();
      onImporterLocal(fichier.name, contenu);
      fermer();
    } catch {
      setErreur("Impossible de lire ce fichier.");
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const [f, d] = await Promise.all([listerBibliothequePersonnelle(), listerDossiersBibliotheque()]);
        setFichiers(f.filter(estOuvrable));
        setDossiers(d);
      } catch (e) {
        setErreur(messageErreur(e));
      } finally {
        setChargement(false);
      }
    })();
  }, []);

  const dossierCourant = dossiers.find((d) => d.id === dossierCourantId) ?? null;
  // 27/09/2026, retour de test Bourama : la liste montrait tous les
  // dossiers de la bibliothèque. Un dossier n'est proposé que s'il contient
  // au moins un fichier ouvrable, directement ou dans un sous-dossier.
  const idsFichiersOuvrables = new Set(fichiers.map((f) => f.id));
  const dossierContientOuvrable = (id: string, vus: Set<string> = new Set()): boolean => {
    if (vus.has(id)) return false;
    vus.add(id);
    const d = dossiers.find((x) => x.id === id);
    if (!d) return false;
    if (d.fichier_ids.some((fid) => idsFichiersOuvrables.has(fid))) return true;
    return dossiers.some((e) => e.dossier_parent_id === id && dossierContientOuvrable(e.id, vus));
  };
  const sousDossiers = dossiers.filter(
    (d) => d.dossier_parent_id === dossierCourantId && dossierContientOuvrable(d.id)
  );
  // Un fichier "à la racine" est un fichier qui n'apparaît dans aucun
  // dossier -- même logique de dérivation que le reste de la bibliothèque
  // (fichier_ids sur chaque dossier, pas de dossier_parent_id sur le
  // fichier lui-même).
  const fichiersIci =
    dossierCourantId === null
      ? fichiers.filter((f) => !dossiers.some((d) => d.fichier_ids.includes(f.id)))
      : fichiers.filter((f) => dossierCourant?.fichier_ids.includes(f.id));

  async function choisir(fichier: FichierBibliothequePersonnelle) {
    setOuvertureId(fichier.id);
    setErreur(null);
    try {
      const reponse = await fetch(fichier.url_publique);
      if (!reponse.ok) throw new Error("Impossible de lire ce fichier.");
      const contenu = await reponse.text();
      onChoisir(fichier, contenu);
      fermer();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setOuvertureId(null);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6 ${
        enSortie ? "opacity-0 transition-opacity duration-150 ease-in" : "animate-dj-fade-in-rapide"
      }`}
      onClick={fermer}
    >
      <div
        className={`flex max-h-[85vh] w-full flex-col gap-3 overflow-y-auto rounded-t-2xl border border-dj-bordure bg-dj-surface p-5 shadow-[0_8px_40px_rgba(0,0,0,0.45)] sm:max-w-md sm:rounded-cgpt-carte ${
          enSortie ? "animate-cgpt-sortie-modal" : "animate-cgpt-entree-modal"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-dj-texte">
            {dossierCourantId !== null && (
              <button
                onClick={() => setDossierCourantId(dossierCourant?.dossier_parent_id ?? null)}
                aria-label="Dossier parent"
                className="text-dj-texte-muet hover:text-dj-texte"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            {dossierCourant ? dossierCourant.nom : "Ouvrir depuis la bibliothèque"}
          </h4>
          <button onClick={fermer} aria-label="Fermer" className="text-dj-texte-muet hover:text-dj-texte">
            <X size={16} />
          </button>
        </div>

        {erreur && <p className="text-sm text-[var(--dj-erreur)]">{erreur}</p>}

        <input ref={inputLocalRef} type="file" onChange={fichierLocalChoisi} className="hidden" />
        <button
          onClick={() => inputLocalRef.current?.click()}
          className="flex items-center gap-2 rounded-xl border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-left text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
        >
          <HardDrive size={14} className="flex-shrink-0 text-dj-texte-muet" />
          Depuis mon ordinateur
        </button>

        {chargement ? (
          <div className="flex justify-center py-6">
            <Loader2 size={20} className="animate-spin text-dj-texte-muet" />
          </div>
        ) : sousDossiers.length === 0 && fichiersIci.length === 0 ? (
          <p className="text-sm text-dj-texte-muet">Aucun fichier texte ou code ici pour l&apos;instant.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {sousDossiers.map((d) => (
              <button
                key={d.id}
                onClick={() => setDossierCourantId(d.id)}
                className="flex items-center gap-2 rounded-xl border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-left text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
              >
                <Folder size={14} className="flex-shrink-0 text-dj-texte-muet" />
                <span className="min-w-0 flex-1 truncate">{d.nom}</span>
              </button>
            ))}
            {fichiersIci.map((f) => (
              <button
                key={f.id}
                onClick={() => choisir(f)}
                disabled={ouvertureId !== null}
                className="flex items-center gap-2 rounded-xl border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-left text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte disabled:opacity-50"
              >
                <File size={14} className="flex-shrink-0 text-dj-texte-muet" />
                <span className="min-w-0 flex-1 truncate">{f.nom_fichier}</span>
                {ouvertureId === f.id && <Loader2 size={14} className="flex-shrink-0 animate-spin" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
