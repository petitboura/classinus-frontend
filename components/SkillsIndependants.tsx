"use client";
import { useEffect, useState } from "react";
import { listerSkillsIndependants, obtenirSkillIndependant, enregistrerSkillIndependant, supprimerSkillIndependant, type SkillIndependant } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";
import { CaseACocher } from "@/components/CaseACocher";

export function SkillsIndependants() {
  const [liste, setListe] = useState<SkillIndependant[]>([]);
  const [selection, setSelection] = useState<string | null>(null);
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [fichiers, setFichiers] = useState<{ chemin: string; contenu: string }[]>([{ chemin: "SKILL.md", contenu: "---\nname: nouveau-skill\ndescription: Description\n---\n\n" }]);
  const [nouveauChemin, setNouveauChemin] = useState("");
  const [contenuNouveau, setContenuNouveau] = useState("");
  const [fichierActif, setFichierActif] = useState("SKILL.md");
  const [actif, setActif] = useState(true);
  const [erreur, setErreur] = useState("");
  const [busy, setBusy] = useState(false);
  async function charger() { try { setListe(await listerSkillsIndependants()); } catch (e) { setErreur(messageErreur(e)); } }
  useEffect(() => { void charger(); }, []);
  async function ouvrir(id: string) {
    try {
      const s = await obtenirSkillIndependant(id);
      setSelection(id); setNom(s.nom); setDescription(s.description || ""); setActif(s.actif);
      setFichiers((s.fichiers || []).map(f => ({ chemin: f.chemin, contenu: f.contenu || "" })));
      setFichierActif(s.fichiers?.[0]?.chemin || "SKILL.md");
    } catch (e) { setErreur(messageErreur(e)); }
  }
  function nouveau() { setSelection(null); setNom(""); setDescription(""); setActif(true); setFichiers([{ chemin: "SKILL.md", contenu: "---\nname: nouveau-skill\ndescription: Description\n---\n\n" }]); }
  async function sauver() {
    setBusy(true);
    try { const s = await enregistrerSkillIndependant({ nom, description, actif, fichiers }, selection || undefined); setSelection(s.id); await charger(); setErreur(""); }
    catch (e) { setErreur(messageErreur(e)); } finally { setBusy(false); }
  }
  async function supprimer() {
    if (!selection || !window.confirm("Supprimer ce skill et ses fichiers ?")) return;
    setBusy(true); try { await supprimerSkillIndependant(selection); nouveau(); await charger(); } catch (e) { setErreur(messageErreur(e)); } finally { setBusy(false); }
  }
  return <section className="flex min-w-0 flex-col gap-4">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Skills et fichiers</h2><p className="text-sm text-dj-texte-muet">Gestion autonome, indépendante de Configuration.</p></div><button type="button" onClick={nouveau} className="rounded-lg bg-dj-primaire px-3 py-2 text-sm text-white">Nouveau skill</button></header>
    {erreur && <p role="alert" className="rounded-lg border border-red-500/40 p-3 text-sm text-red-600">{erreur}</p>}
    <div className="grid min-w-0 gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="rounded-xl border border-dj-bordure p-3"><h3 className="mb-2 text-sm font-semibold">Mes skills ({liste.length})</h3>{liste.length === 0 && <p className="text-sm text-dj-texte-muet">Aucun skill migré ou créé.</p>}{liste.map(s => <button key={s.id} onClick={() => void ouvrir(s.id)} className="mb-1 block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-dj-surface-haute"><span className="block truncate">{s.nom}</span><span className="block truncate text-xs text-dj-texte-muet">{s.description}</span></button>)}</aside>
      <div className="min-w-0 rounded-xl border border-dj-bordure p-4"><div className="grid gap-3 sm:grid-cols-2"><label className="flex flex-col gap-1 text-sm">Nom<input value={nom} onChange={e => setNom(e.target.value)} className="rounded border border-dj-bordure bg-transparent p-2" /></label><label className="flex flex-col gap-1 text-sm">Description<input value={description} onChange={e => setDescription(e.target.value)} className="rounded border border-dj-bordure bg-transparent p-2" /></label></div>
      <label className="mt-3 flex items-center gap-2 text-sm"><CaseACocher checked={actif} onChange={setActif} />Actif</label>
      <div className="mt-4 grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]"><div className="rounded border border-dj-bordure p-2"><h3 className="mb-2 text-sm font-semibold">Fichiers et dossiers</h3>{fichiers.map(f => <button key={f.chemin} type="button" onClick={() => setFichierActif(f.chemin)} className="mb-1 block w-full truncate rounded px-2 py-1 text-left text-xs hover:bg-dj-surface-haute">{f.chemin}</button>)}<input value={nouveauChemin} onChange={e => setNouveauChemin(e.target.value)} placeholder="dossier/fichier.md" className="mt-3 w-full rounded border border-dj-bordure bg-transparent p-2 text-xs"/><button type="button" onClick={() => { if (!nouveauChemin || nouveauChemin.startsWith("/") || nouveauChemin.split("/").some(p => !p || p === "..") || fichiers.some(f => f.chemin === nouveauChemin)) { setErreur("Chemin invalide ou déjà utilisé."); return; } setFichiers(old => [...old, { chemin: nouveauChemin, contenu: contenuNouveau }]); setFichierActif(nouveauChemin); setNouveauChemin(""); setContenuNouveau(""); setErreur(""); }} className="mt-2 rounded border border-dj-bordure px-2 py-1 text-xs">Ajouter un fichier</button></div>
      <div className="min-w-0"><p className="mb-2 truncate text-xs text-dj-texte-muet">{fichierActif}</p><textarea value={fichiers.find(f => f.chemin === fichierActif)?.contenu || ""} onChange={e => { setFichiers(old => old.map(f => f.chemin === fichierActif ? { ...f, contenu: e.target.value } : f)); }} className="min-h-[350px] w-full rounded border border-dj-bordure bg-transparent p-3 font-mono text-sm" spellCheck={false}/></div></div>
      <div className="mt-4 flex justify-end gap-2">{selection && <button type="button" disabled={busy} onClick={() => void supprimer()} className="rounded border border-red-500/40 px-3 py-2 text-sm text-red-600">Supprimer</button>}<button type="button" disabled={busy} onClick={() => void sauver()} className="rounded bg-dj-primaire px-4 py-2 text-sm text-white">{busy ? "Enregistrement…" : "Enregistrer"}</button></div>
      </div>
    </div>
  </section>;
}
