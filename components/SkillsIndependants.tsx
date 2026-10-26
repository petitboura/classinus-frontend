"use client";
import { useEffect, useRef, useState } from "react";
import { listerSkillsIndependants, obtenirSkillIndependant, enregistrerSkillIndependant, supprimerSkillIndependant, importerSkillZip, type SkillIndependant } from "@/lib/api";
import { ecouterDonneesModifiees } from "@/lib/evenementsDonnees";
import { messageErreur } from "@/lib/erreurs";
import { Skeleton } from "@/components/Skeleton";
import { appliquerEntete, lireEntete } from "@/lib/enteteSkill";
import { ApercuSkillMd, BasculeFormatBrut } from "@/components/ApercuSkillMd";
import { LigneNomSkill } from "@/components/EnteteSkillModifiable";

type FichierEdition = { chemin: string; contenu: string };

const CHEMIN_PRINCIPAL = "SKILL.md";
// Les fichiers markdown s'ouvrent en aperçu formaté, avec un bouton Brut pour les éditer.
const estMarkdown = (chemin: string) => /\.(md|markdown)$/i.test(chemin);
// Le SKILL.md d'un nouveau skill naît avec son en-tête, aligné sur Nom et Description.
const fichiersInitiaux = (): FichierEdition[] => [{ chemin: CHEMIN_PRINCIPAL, contenu: appliquerEntete("", "", "") }];

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
  const [vueBrute, setVueBrute] = useState(false);
  const [actif, setActif] = useState(true);
  const [erreur, setErreur] = useState("");
  const [busy, setBusy] = useState(false);
  // La page montre d'abord la liste des skills ; un clic sur un skill (ou Nouveau skill) ouvre l'éditeur.
  const [vue, setVue] = useState<"liste" | "editeur">("liste");
  const [zipEnCours, setZipEnCours] = useState(false);
  const champZip = useRef<HTMLInputElement>(null);
  const enregistre = useRef(empreinte("", "", true, fichiersInitiaux()));
  const modifie = empreinte(nom, description, actif, fichiers) !== enregistre.current;

  async function charger() {
    try { setListe(await listerSkillsIndependants()); }
    catch (e) { setErreur(messageErreur(e)); }
    finally { setChargementListe(false); }
  }
  useEffect(() => { void charger(); }, []);
  // Quand l'IA crée ou modifie un skill depuis le chat, la liste se met à jour toute seule.
  useEffect(() => ecouterDonneesModifiees("skills", () => { void charger(); }), []);

  // Nom et Description font foi : l'en-tête du SKILL.md les suit toujours.
  function changerNom(valeur: string) {
    setNom(valeur);
    setFichiers(old => old.map(f => f.chemin === CHEMIN_PRINCIPAL ? { ...f, contenu: appliquerEntete(f.contenu, valeur, description) } : f));
  }
  function changerDescription(valeur: string) {
    setDescription(valeur);
    setFichiers(old => old.map(f => f.chemin === CHEMIN_PRINCIPAL ? { ...f, contenu: appliquerEntete(f.contenu, nom, valeur) } : f));
  }
  // Et inversement : si l'en-tête est modifié à la main, les champs suivent.
  function changerContenu(valeur: string) {
    setFichiers(old => old.map(f => f.chemin === fichierActif ? { ...f, contenu: valeur } : f));
    if (fichierActif !== CHEMIN_PRINCIPAL) return;
    const entete = lireEntete(valeur);
    if (entete.nom !== undefined && entete.nom !== nom) setNom(entete.nom);
    if (entete.description !== undefined && entete.description !== description) setDescription(entete.description);
  }

  function abandonnerModifications() {
    return !modifie || window.confirm("Tu as des modifications non enregistrées. Les abandonner ?");
  }

  function charge(id: string | null, n: string, d: string, a: boolean, f: FichierEdition[]) {
    setVueEditeur(v => v + 1);
    setSelection(id); setNom(n); setDescription(d); setActif(a); setFichiers(f);
    setFichierActif(f.find(x => x.chemin === CHEMIN_PRINCIPAL)?.chemin ?? f[0]?.chemin ?? CHEMIN_PRINCIPAL);
    setNouveauChemin(""); setErreur(""); setVueBrute(false);
    enregistre.current = empreinte(n, d, a, f);
  }

  async function ouvrir(id: string) {
    if (ouverture) return;
    setOuverture(id); setErreur("");
    try {
      const s = await obtenirSkillIndependant(id);
      charge(id, s.nom, s.description || "", s.actif, (s.fichiers || []).map(f => ({ chemin: f.chemin, contenu: f.contenu || "" })));
      setVue("editeur");
    } catch (e) { setErreur(messageErreur(e)); }
    finally { setOuverture(null); }
  }

  function nouveau() {
    charge(null, "", "", true, fichiersInitiaux());
    setVue("editeur");
  }

  // Retour à la liste : demande confirmation s'il reste des modifications non enregistrées.
  function retourListe() {
    if (!abandonnerModifications()) return;
    charge(null, "", "", true, fichiersInitiaux());
    setVue("liste");
    void charger();
  }

  async function envoyerZip(fichier: File | undefined) {
    if (!fichier || zipEnCours) return;
    setZipEnCours(true); setErreur("");
    try {
      const cree = await importerSkillZip(fichier);
      await charger();
      await ouvrir(cree.id);
    } catch (e) { setErreur(messageErreur(e)); }
    finally { setZipEnCours(false); if (champZip.current) champZip.current.value = ""; }
  }

  async function sauver() {
    setBusy(true);
    try {
      const aEnregistrer = fichiers.map(f => f.chemin === CHEMIN_PRINCIPAL ? { ...f, contenu: appliquerEntete(f.contenu, nom, description) } : f);
      const s = await enregistrerSkillIndependant({ nom, description, actif, fichiers: aEnregistrer }, selection || undefined);
      setSelection(s.id);
      setFichiers(aEnregistrer);
      enregistre.current = empreinte(nom, description, actif, aEnregistrer);
      setErreur("");
      await charger();
    } catch (e) { setErreur(messageErreur(e)); }
    finally { setBusy(false); }
  }

  async function supprimer() {
    if (!selection || !window.confirm("Supprimer ce skill et ses fichiers ?")) return;
    setBusy(true);
    try { await supprimerSkillIndependant(selection); charge(null, "", "", true, fichiersInitiaux()); setVue("liste"); await charger(); }
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
    setFichierActif(chemin); setVueBrute(true); setNouveauChemin(""); setErreur("");
  }

  const contenuActif = fichiers.find(f => f.chemin === fichierActif)?.contenu ?? "";
  const champ = "rounded border border-dj-bordure bg-transparent p-2 transition-colors focus:border-dj-bordure-forte focus:outline-none";
  const bouton = "rounded-lg px-3 py-2 text-sm transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-50";
  return <section className="flex min-w-0 flex-col gap-4">
    {erreur && <p role="alert" className="animate-dj-fade-in-rapide rounded-lg border border-red-500/40 p-3 text-sm text-red-600">{erreur}</p>}
    {vue === "liste" ? <div key="liste" className="flex min-w-0 animate-dj-fade-in-rapide flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Skills et fichiers</h2>
          <p className="text-sm text-dj-texte-muet">Crée des skills avec leurs fichiers et leurs dossiers, ou envoie-les dans un zip.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={champZip} type="file" accept=".zip,application/zip,application/x-zip-compressed" className="hidden" onChange={e => void envoyerZip(e.target.files?.[0])} />
          <button type="button" disabled={zipEnCours} onClick={() => champZip.current?.click()} className={`border border-dj-bordure ${bouton}`}>{zipEnCours ? "Envoi du zip…" : "Envoyer un zip"}</button>
          <button type="button" onClick={nouveau} className={`bg-dj-primaire text-white ${bouton}`}>Nouveau skill</button>
        </div>
      </header>
      <div className="flex min-w-0 flex-col" aria-busy={chargementListe}>
        {chargementListe && [0, 1, 2, 3].map(i => <Skeleton key={i} className="my-1 h-5 w-2/3" />)}
        {!chargementListe && liste.length === 0 && <p className="animate-dj-fade-in-rapide text-sm text-dj-texte-muet">Aucun skill pour le moment.</p>}
        {!chargementListe && liste.map(s => <button key={s.id} type="button" disabled={!!ouverture} onClick={() => void ouvrir(s.id)} className={`block w-full animate-dj-fade-in-rapide truncate py-2 text-left text-sm transition-colors hover:text-dj-primaire disabled:cursor-wait ${s.actif ? "" : "text-dj-texte-muet"} ${ouverture === s.id ? "opacity-60" : ""}`}>{s.nom}</button>)}
      </div>
    </div> : <div key="editeur" className="flex min-w-0 animate-dj-fade-in-rapide flex-col gap-4">
      <div>
        <button type="button" onClick={retourListe} className="text-sm text-dj-texte-muet transition-colors hover:text-dj-texte">← Retour aux skills</button>
      </div>
      <div key={vueEditeur} className="min-w-0 animate-dj-fade-in-rapide">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1 basis-56"><LigneNomSkill nom={nom} onNom={changerNom} /></div>
          {selection && <button type="button" disabled={busy} onClick={() => void supprimer()} className="flex-shrink-0 text-sm text-red-600 transition-opacity hover:underline disabled:opacity-50">Supprimer</button>}
          <button type="button" role="switch" aria-checked={actif} aria-label={actif ? "Skill actif" : "Skill désactivé"} title={actif ? "Skill actif" : "Skill désactivé"} onClick={() => setActif(a => !a)} className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 ${actif ? "bg-dj-accent-1" : "bg-dj-inactif"}`}>
            <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${actif ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:h-[70vh] md:min-h-[440px] md:max-h-[860px] md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="flex min-h-0 flex-col rounded border border-dj-bordure p-2">
            <h3 className="mb-2 text-sm font-semibold">Fichiers et dossiers</h3>
            <div className="min-h-0 flex-1 overflow-y-auto">{fichiers.map(f => <button key={f.chemin} type="button" onClick={() => { setFichierActif(f.chemin); setVueBrute(false); }} className={`mb-1 block w-full truncate rounded px-2 py-1 text-left text-xs transition-colors hover:bg-dj-surface-haute ${f.chemin === fichierActif ? "bg-dj-surface-haute" : ""}`}>{f.chemin}</button>)}</div>
            <input value={nouveauChemin} onChange={e => setNouveauChemin(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); ajouterFichier(); } }} placeholder="dossier/fichier.md" className={`mt-3 w-full text-xs ${champ}`} />
            <button type="button" onClick={ajouterFichier} className="mt-2 rounded border border-dj-bordure px-2 py-1 text-xs transition-colors hover:bg-dj-surface-haute">Ajouter un fichier</button>
          </div>
          <div className="flex h-[65vh] min-h-[360px] min-w-0 flex-col md:h-auto md:min-h-0">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-xs text-dj-texte-muet">{fichierActif}</p>
              {estMarkdown(fichierActif) && <BasculeFormatBrut vueBrute={vueBrute} onChanger={setVueBrute} />}
            </div>
            <div key={`${fichierActif}-${vueBrute && estMarkdown(fichierActif) ? "brut" : "formate"}`} className="min-h-0 flex-1 animate-dj-fade-in-rapide">
              {estMarkdown(fichierActif) && !vueBrute
                ? <div className="h-full overflow-y-auto rounded border border-dj-bordure p-4"><ApercuSkillMd contenu={contenuActif} vide="Ce fichier est vide. Passe en Brut pour écrire." edition={fichierActif === CHEMIN_PRINCIPAL ? { description, onDescription: changerDescription } : undefined} /></div>
                : <textarea value={contenuActif} onChange={e => changerContenu(e.target.value)} className={`h-full w-full resize-none p-3 font-mono text-sm ${champ}`} spellCheck={false} />}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" disabled={busy || !modifie} onClick={() => void sauver()} className="rounded bg-dj-primaire px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50">{busy ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
      </div>
    </div>}
  </section>;
}
