"use client";
import { useEffect, useRef, useState } from "react";
import { listerSkillsIndependants, obtenirSkillIndependant, enregistrerSkillIndependant, supprimerSkillIndependant, type SkillIndependant } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";
import { CaseACocher } from "@/components/CaseACocher";
import { Skeleton } from "@/components/Skeleton";

type FichierEdition = { chemin: string; contenu: string };

const CHEMIN_PRINCIPAL = "SKILL.md";
const MODELE_PRINCIPAL = "---\nname: nouveau-skill\ndescription: Description\n---\n\n";
const fichiersInitiaux = (): FichierEdition[] => [{ chemin: CHEMIN_PRINCIPAL, contenu: MODELE_PRINCIPAL }];

// Empreinte de ce qui est enregistrable : sert à savoir s'il y a des modifications non enregistrées.
const empreinte = (nom: string, description: string, actif: boolean, fichiers: FichierEdition[]) =>
  JSON.stringify([nom, description, actif, fichiers.map(f => [f.chemin, f.contenu])]);

export function SkillsIndependants() {
  const [liste, setListe] = useState<SkillIndependant[]>([]);
  const [chargementListe, setChargementListe] = useState(true);
  const [ouverture, setOuverture] = useState<string | null>(null);
  const [vueEditeur, setVueEditeur] = useState(0);
  const [selection, setSelection] = useState<string | null>(null);
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [fichiers, setFichiers] = useState<FichierEdition[]>(fichiersInitiaux);
  const [nouveauChemin, setNouveauChemin] = useState("");
  const [fichierActif, setFichierActif] = useState(CHEMIN_PRINCIPAL);
  const [actif, setActif] = useState(true);
  const [erreur, setErreur] = useState("");
  const [busy, setBusy] = useState(false);
  const enregistre = useRef(empreinte("", "", true, fichiersInitiaux()));
  const modifie = empreinte(nom, description, actif, fichiers) !== enregistre.current;

  async function charger() {
    try { setListe(await listerSkillsIndependants()); }
    catch (e) { setErreur(messageErreur(e)); }
    finally { setChargementListe(false); }
  }
  useEffect(() => { void charger(); }, []);

  function abandonnerModifications() {
    return !modifie || window.confirm("Tu as des modifications non enregistrées. Les abandonner ?");
  }

  function charge(id: string | null, n: string, d: string, a: boolean, f: FichierEdition[]) {
    setVueEditeur(v => v + 1);
    setSelection(id); setNom(n); setDescription(d); setActif(a); setFichiers(f);
    setFichierActif(f.find(x => x.chemin === CHEMIN_PRINCIPAL)?.chemin ?? f[0]?.chemin ?? CHEMIN_PRINCIPAL);
    setNouveauChemin(""); setErreur("");
    enregistre.current = empreinte(n, d, a, f);
  }

  async function ouvrir(id: string) {
    if (id === selection || ouverture || !abandonnerModifications()) return;
    setOuverture(id); setErreur("");
    try {
      const s = await obtenirSkillIndependant(id);
      charge(id, s.nom, s.description || "", s.actif, (s.fichiers || []).map(f => ({ chemin: f.chemin, contenu: f.contenu || "" })));
    } catch (e) { setErreur(messageErreur(e)); }
    finally { setOuverture(null); }
  }

  function nouveau(forcer = false) {
    if (!forcer && !abandonnerModifications()) return;
    charge(null, "", "", true, fichiersInitiaux());
  }

  async function sauver() {
    setBusy(true);
    try {
      const s = await enregistrerSkillIndependant({ nom, description, actif, fichiers }, selection || undefined);
      setSelection(s.id);
      enregistre.current = empreinte(nom, description, actif, fichiers);
      setErreur("");
      await charger();
    } catch (e) { setErreur(messageErreur(e)); }
    finally { setBusy(false); }
  }

  async function supprimer() {
    if (!selection || !window.confirm("Supprimer ce skill et ses fichiers ?")) return;
    setBusy(true);
    try { await supprimerSkillIndependant(selection); nouveau(true); await charger(); }
    catch (e) { setErreur(messageErreur(e)); }
    finally { setBusy(false); }
  }

  function ajouterFichier() {
    const chemin = nouveauChemin.trim();
    if (!chemin || chemin.startsWith("/") || chemin.includes("\\") || chemin.split("/").some(p => !p || p === "." || p === "..") || fichiers.some(f => f.chemin === chemin)) {
      setErreur("Ce chemin n'est pas valide ou existe déjà.");
      return;
    }
    setFichiers(old => [...old, { chemin, contenu: "" }]);
    setFichierActif(chemin); setNouveauChemin(""); setErreur("");
  }

  const champ = "rounded border border-dj-bordure bg-transparent p-2 transition-colors focus:border-dj-bordure-forte focus:outline-none";
  return <section className="flex min-w-0 flex-col gap-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold">Skills et fichiers</h2>
        <p className="text-sm text-dj-texte-muet">Crée des skills avec leurs fichiers et leurs dossiers.</p>
      </div>
      <button type="button" onClick={() => nouveau()} className="rounded-lg bg-dj-primaire px-3 py-2 text-sm text-white transition-opacity hover:opacity-90">Nouveau skill</button>
    </header>
    {erreur && <p role="alert" className="animate-dj-fade-in-rapide rounded-lg border border-red-500/40 p-3 text-sm text-red-600">{erreur}</p>}
    <div className="grid min-w-0 gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="rounded-xl border border-dj-bordure p-3">
        <h3 className="mb-2 text-sm font-semibold">Mes skills ({liste.length})</h3>
        {chargementListe && <div className="flex flex-col gap-2" aria-busy="true">{[0, 1, 2].map(i => <Skeleton key={i} className="h-11 rounded-lg" />)}</div>}
        {!chargementListe && liste.length === 0 && <p className="animate-dj-fade-in-rapide text-sm text-dj-texte-muet">Aucun skill pour le moment.</p>}
        {!chargementListe && liste.map(s => <button key={s.id} type="button" disabled={!!ouverture} onClick={() => void ouvrir(s.id)} className={`mb-1 block w-full animate-dj-fade-in-rapide rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-dj-surface-haute disabled:cursor-wait ${s.id === selection ? "bg-dj-surface-haute" : ""} ${s.id === ouverture ? "opacity-60" : ""}`}>
          <span className="block truncate">{s.nom}</span><span className="block truncate text-xs text-dj-texte-muet">{s.description}</span>
        </button>)}
      </aside>
      <div key={vueEditeur} className="min-w-0 animate-dj-fade-in-rapide rounded-xl border border-dj-bordure p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">Nom<input value={nom} onChange={e => setNom(e.target.value)} className={champ} /></label>
          <label className="flex flex-col gap-1 text-sm">Description<input value={description} onChange={e => setDescription(e.target.value)} className={champ} /></label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm"><CaseACocher checked={actif} onChange={setActif} />Actif</label>
        <div className="mt-4 grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="rounded border border-dj-bordure p-2">
            <h3 className="mb-2 text-sm font-semibold">Fichiers et dossiers</h3>
            {fichiers.map(f => <button key={f.chemin} type="button" onClick={() => setFichierActif(f.chemin)} className={`mb-1 block w-full truncate rounded px-2 py-1 text-left text-xs transition-colors hover:bg-dj-surface-haute ${f.chemin === fichierActif ? "bg-dj-surface-haute" : ""}`}>{f.chemin}</button>)}
            <input value={nouveauChemin} onChange={e => setNouveauChemin(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); ajouterFichier(); } }} placeholder="dossier/fichier.md" className={`mt-3 w-full text-xs ${champ}`} />
            <button type="button" onClick={ajouterFichier} className="mt-2 rounded border border-dj-bordure px-2 py-1 text-xs transition-colors hover:bg-dj-surface-haute">Ajouter un fichier</button>
          </div>
          <div className="min-w-0">
            <p className="mb-2 truncate text-xs text-dj-texte-muet">{fichierActif}</p>
            <textarea value={fichiers.find(f => f.chemin === fichierActif)?.contenu ?? ""} onChange={e => setFichiers(old => old.map(f => f.chemin === fichierActif ? { ...f, contenu: e.target.value } : f))} className={`min-h-[260px] w-full p-3 font-mono text-sm sm:min-h-[350px] ${champ}`} spellCheck={false} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          {selection && <button type="button" disabled={busy} onClick={() => void supprimer()} className="rounded border border-red-500/40 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-500/10 disabled:opacity-50">Supprimer</button>}
          <button type="button" disabled={busy || !modifie} onClick={() => void sauver()} className="rounded bg-dj-primaire px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50">{busy ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
      </div>
    </div>
  </section>;
}
