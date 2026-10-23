"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, LoaderCircle, Search, ShieldCheck } from "lucide-react";
import { SelectPersonnalise } from "@/components/SelectPersonnalise";
import { appelerApi } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";

type ModePermission = "autoriser" | "demander" | "refuser";
type CategorieOutil = "lecture" | "modification" | "generation" | "mixte" | "operation" | "indisponible";
type OutilPermission = {
  nom: string; label: string; application: string; description: string;
  description_technique?: string; categorie: CategorieOutil; mode: ModePermission; disponible: boolean;
};
const MODES: { valeur: ModePermission; label: string }[] = [
  { valeur: "demander", label: "Demander à chaque utilisation" },
  { valeur: "autoriser", label: "Toujours autoriser" },
  { valeur: "refuser", label: "Toujours refuser" },
];
const CATEGORIES: Record<CategorieOutil, string> = {
  lecture: "Lecture et recherche", modification: "Modification ou action",
  generation: "Génération", mixte: "Lecture et actions", operation: "Opération",
  indisponible: "Non disponible actuellement",
};
const OPTIONS_CATEGORIES: { valeur: CategorieOutil; label: string }[] = [
  { valeur: "lecture", label: CATEGORIES.lecture },
  { valeur: "modification", label: CATEGORIES.modification },
  { valeur: "generation", label: CATEGORIES.generation },
  { valeur: "mixte", label: CATEGORIES.mixte },
  { valeur: "operation", label: CATEGORIES.operation },
  { valeur: "indisponible", label: CATEGORIES.indisponible },
];

export function GestionPermissionsOutils() {
  const [outils, setOutils] = useState<OutilPermission[]>([]);
  const [recherche, setRecherche] = useState("");
  const [filtreApplication, setFiltreApplication] = useState("toutes");
  const [filtreMode, setFiltreMode] = useState("tous");
  const [filtreCategorie, setFiltreCategorie] = useState("toutes");
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let actif = true;
    appelerApi("/api/outils/permissions")
      .then((reponse: { outils: OutilPermission[] }) => { if (actif) setOutils(reponse.outils); })
      .catch((e) => { if (actif) setErreur(messageErreur(e)); })
      .finally(() => { if (actif) setChargement(false); });
    return () => { actif = false; };
  }, []);

  const applications = useMemo(
    () => [...new Set(outils.map((outil) => outil.application))].sort((a, b) => a.localeCompare(b, "fr")),
    [outils]
  );
  const outilsFiltres = useMemo(() => {
    const requete = recherche.trim().toLocaleLowerCase("fr");
    return outils.filter((outil) => {
      const texte = [outil.label, outil.nom, outil.application, outil.description].join(" ").toLocaleLowerCase("fr");
      return (!requete || texte.includes(requete))
        && (filtreApplication === "toutes" || outil.application === filtreApplication)
        && (filtreMode === "tous" || outil.mode === filtreMode)
        && (filtreCategorie === "toutes" || outil.categorie === filtreCategorie);
    });
  }, [outils, recherche, filtreApplication, filtreMode, filtreCategorie]);

  async function changerMode(outil: OutilPermission, mode: ModePermission) {
    if (enCours) return;
    setEnCours(outil.nom);
    setErreur(null);
    setMessage(null);
    try {
      await appelerApi("/api/outils/permissions/" + encodeURIComponent(outil.nom), {
        method: "PUT", body: JSON.stringify({ mode }),
      });
      setOutils((anciens) => anciens.map((item) => item.nom === outil.nom ? { ...item, mode } : item));
      setMessage("Règle enregistrée pour « " + outil.label + " ».");
    } catch (e) { setErreur(messageErreur(e)); }
    finally { setEnCours(null); }
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck size={22} className="mt-0.5 shrink-0 text-dj-texte-muet" />
          <div className="flex min-w-0 flex-col gap-2">
            <h2 className="text-base font-semibold text-dj-texte">Décider outil par outil</h2>
            <p className="text-sm leading-6 text-dj-texte-muet">
              Les choix sont enregistrés sur ton compte et contrôlés par le serveur avant chaque appel de Clovis.
              Un outil sans règle enregistrée demande une confirmation à chaque utilisation.
            </p>
            <p className="text-sm leading-6 text-dj-texte-muet">
              « Demander à chaque utilisation » conserve la confirmation ponctuelle. « Toujours autoriser » autorise
              aussi les actions normalement sensibles de cet outil sans nouvelle confirmation : choisis cette option
              uniquement si tu acceptes ses effets. « Toujours refuser » retire l’outil des possibilités de Clovis.
            </p>
          </div>
        </div>
      </section>
      {erreur && <div role="alert" className="flex items-start gap-2 rounded-xl border border-[var(--dj-erreur)] p-3 text-sm text-[var(--dj-erreur)]"><AlertCircle size={18} className="mt-0.5 shrink-0" /><span>{erreur}</span></div>}
      {message && !erreur && <div role="status" className="flex items-start gap-2 rounded-xl border border-dj-bordure p-3 text-sm text-dj-texte"><Check size={18} className="mt-0.5 shrink-0" /><span>{message}</span></div>}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <label className="relative min-w-0 sm:min-w-[240px] sm:flex-1">
          <span className="sr-only">Rechercher un outil</span>
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dj-texte-muet" />
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un outil, une application…"
            className="w-full rounded-xl border border-dj-bordure bg-dj-surface py-2.5 pl-9 pr-3 text-sm text-dj-texte outline-none focus:ring-2 focus:ring-dj-bordure" />
        </label>
        <label className="min-w-0 sm:w-52">
          <span className="sr-only">Filtrer par application</span>
          <SelectPersonnalise
            valeur={filtreApplication}
            onChange={setFiltreApplication}
            options={[
              { id: "toutes", label: "Toutes les applications" },
              ...applications.map((application) => ({ id: application, label: application })),
            ]}
          />
        </label>
        <label className="min-w-0 sm:w-60">
          <span className="sr-only">Filtrer par autorisation</span>
          <SelectPersonnalise
            valeur={filtreMode}
            onChange={setFiltreMode}
            options={[
              { id: "tous", label: "Toutes les règles" },
              ...MODES.map((mode) => ({ id: mode.valeur, label: mode.label })),
            ]}
          />
        </label>
        <label className="min-w-0 sm:w-52">
          <span className="sr-only">Filtrer par catégorie ou type d’action</span>
          <SelectPersonnalise
            valeur={filtreCategorie}
            onChange={setFiltreCategorie}
            options={[
              { id: "toutes", label: "Toutes les catégories" },
              ...OPTIONS_CATEGORIES.map((categorie) => ({ id: categorie.valeur, label: categorie.label })),
            ]}
          />
        </label>
      </div>
      <p className="text-sm text-dj-texte-muet" aria-live="polite">
        {chargement ? "Chargement du catalogue disponible…" : outilsFiltres.length + " outil(s) affiché(s) sur " + outils.length + "."}
      </p>

      {chargement ? (
        <div className="flex items-center gap-2 py-8 text-sm text-dj-texte-muet"><LoaderCircle size={18} className="animate-spin" /> Récupération des outils disponibles…</div>
      ) : outilsFiltres.length === 0 ? (
        <div className="rounded-cgpt-carte border border-dj-bordure p-6 text-sm text-dj-texte-muet">Aucun outil ne correspond à cette recherche. Vérifie aussi les filtres sélectionnés.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {outilsFiltres.map((outil) => (
            <article key={outil.nom} className="rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className="text-sm font-semibold text-dj-texte">{outil.label}</h3>
                    <span className={"text-xs " + (outil.categorie === "modification" ? "text-[var(--dj-attention)]" : "text-dj-texte-muet")}>{CATEGORIES[outil.categorie]}</span>
                    {!outil.disponible && <span className="text-xs text-dj-texte-muet">Règle conservée</span>}
                  </div>
                  <p className="text-xs text-dj-texte-muet">{outil.application} · <code>{outil.nom}</code></p>
                  <p className="text-sm leading-6 text-dj-texte-muet">{outil.description}</p>
                  {outil.description_technique && <details className="text-sm text-dj-texte-muet">
                    <summary className="cursor-pointer py-1">Détails fournis par le connecteur</summary>
                    <p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-dj-surface-haute p-3 text-xs leading-5">{outil.description_technique}</p>
                  </details>}
                </div>
                <div className="w-full shrink-0 sm:w-64">
                  <label className="mb-1.5 block text-xs font-medium text-dj-texte-muet">Autorisation</label>
                  <div role="group" aria-label={"Autorisation pour " + outil.label}>
                    <SelectPersonnalise
                      valeur={outil.mode}
                      onChange={(valeur) => void changerMode(outil, valeur as ModePermission)}
                      options={MODES.map((mode) => ({ id: mode.valeur, label: mode.label }))}
                    />
                  </div>
                  {enCours === outil.nom && <p className="mt-2 flex items-center gap-1.5 text-xs text-dj-texte-muet"><LoaderCircle size={14} className="animate-spin" /> Enregistrement…</p>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
