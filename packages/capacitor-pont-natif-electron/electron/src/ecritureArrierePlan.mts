// Ecriture en arriere plan (12/10/2026, demande de Bourama) : Classinus doit pouvoir ecrire dans
// la fenetre qu'il vise SANS la mettre devant et SANS toucher au clavier de l'etudiant, pour ne
// pas le gener pendant qu'il travaille ailleurs.
//
// Methode : UI Automation (comme les clics de clicWindows.mts). Le champ de texte modifiable de
// la fenetre visee recoit le texte directement (ValuePattern), ajoute A LA FIN du contenu. Aucun
// focus, aucune touche, aucun mouvement de souris.
//
// Sures en cas d'echec, meme principe que les clics :
// - avant l'ecriture, tout echec (fenetre introuvable, champ absent ou ambigu, script qui
//   plante) renvoie "indisponible" : l'appelant peut alors choisir un autre moyen ;
// - des que l'ecriture commence, un fichier marqueur est pose : tout echec apres renvoie
//   "incertain" et l'appelant ne doit JAMAIS reessayer (le texte pourrait etre ecrit deux fois).
//
// Limite connue : ne marche que pour les champs que l'application laisse modifier par
// accessibilite (Bloc-notes, Word, champs classiques). Les editeurs de code modernes, les jeux
// et certaines applications ne le permettent pas : "indisponible".
import { execFile } from "node:child_process";
import { existsSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { blocCompilationUnique } from "./compilationUnique.mjs";

export type ResultatEcritureArrierePlan =
  | { statut: "effectue"; fenetre: string; application: string; ajoutes: number }
  // La fenetre visee est une application protegee (terminal, mots de passe...) : rien n'est
  // ecrit tant que l'etudiant n'a pas autorise, l'appelant redemande avec forcer = true.
  | { statut: "protegee"; fenetre: string; application: string }
  | { statut: "indisponible"; raison: string; diagnostic?: string }
  | { statut: "incertain"; raison: string };

export type ResultatActivationFenetre =
  | { statut: "effectue"; fenetre: string }
  | { statut: "indisponible"; raison: string };

// Raisons "indisponible" que l'appelant distingue. Les autres sont des echecs techniques.
export const RAISON_FENETRE_INTROUVABLE = "fenetre_introuvable";

const CODE_CSHARP = `
using System;
using System.Collections.Generic;
using System.Text;
using System.Runtime.InteropServices;
public class FenetreCible { public IntPtr H; public string Titre; public uint Pid; }
public static class EcritureCible {
  public delegate bool EnumProc(IntPtr h, IntPtr p);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr p);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr h);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int max);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h, int a, out int v, int size);
  public static List<FenetreCible> Fenetres(uint exclu) {
    List<FenetreCible> liste = new List<FenetreCible>();
    EnumWindows(delegate(IntPtr h, IntPtr p) {
      if (!IsWindowVisible(h)) return true;
      uint pid; GetWindowThreadProcessId(h, out pid);
      if (pid == exclu) return true;
      int cache; if (DwmGetWindowAttribute(h, 14, out cache, 4) == 0 && cache != 0) return true;
      int n = GetWindowTextLength(h); if (n <= 0) return true;
      StringBuilder s = new StringBuilder(n + 1); GetWindowText(h, s, s.Capacity);
      FenetreCible f = new FenetreCible(); f.H = h; f.Titre = s.ToString(); f.Pid = pid; liste.Add(f);
      return true;
    }, IntPtr.Zero);
    return liste;
  }
  public static bool Activer(IntPtr h) { if (IsIconic(h)) ShowWindow(h, 9); return SetForegroundWindow(h); }
}
`;

// Noms de programmes surs a ecrire dans un script : lettres, chiffres, "_", ".", "+", "-".
export function listeProgrammesSure(liste: readonly string[]): string[] {
  return liste.map(n => String(n).trim().toLowerCase()).filter(n => /^[a-z0-9_.+-]{1,60}$/.test(n));
}

function enBase64(texte: string): string {
  return Buffer.from(texte, "utf8").toString("base64");
}

// Debut commun aux deux scripts : sortie JSON ASCII, recherche de la fenetre visee par son titre.
const DEBUT_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
function Sortir($o) {
  $json = $o | ConvertTo-Json -Compress
  $ascii = [regex]::Replace($json, '[^\x00-\x7F]', { param($m) ('\u{0:x4}' -f [int][char]$m.Value) })
  [Console]::Out.Write($ascii)
}
function Norm($s) {
  if ($null -eq $s) { return '' }
  $d = $s.Normalize([System.Text.NormalizationForm]::FormD)
  $d = [regex]::Replace($d, '\p{Mn}', '')
  $d = $d.ToLowerInvariant()
  $d = [regex]::Replace($d, '^[\s*•●]+', '')
  $d = [regex]::Replace($d, '\s+', ' ')
  return $d.Trim()
}
`;

function blocRechercheFenetre(): string {
  return String.raw`
$voulue = Norm $cible
if ($voulue.Length -eq 0) { Sortir @{statut='indisponible'; raison='cible vide'}; return }
$candidats = New-Object System.Collections.Generic.List[object]
foreach ($w in [EcritureCible]::Fenetres([uint32]$pidClassinus)) {
  if ((Norm $w.Titre).Contains($voulue)) { $candidats.Add($w) }
}
if ($candidats.Count -gt 1) {
  $exactes = @($candidats | Where-Object { (Norm $_.Titre) -eq $voulue })
  if ($exactes.Count -eq 1) { $candidats = New-Object System.Collections.Generic.List[object]; $candidats.Add($exactes[0]) }
}
if ($candidats.Count -eq 0) { Sortir @{statut='indisponible'; raison='${RAISON_FENETRE_INTROUVABLE}'}; return }
if ($candidats.Count -gt 1) { Sortir @{statut='indisponible'; raison='plusieurs_fenetres'}; return }
$fenetre = $candidats[0]
`;
}

export function construireScriptEcriture(options: {
  cible: string;
  texte: string;
  pidClassinus: number;
  applicationsProtegees: readonly string[];
  forcer: boolean;
  marqueur: string;
}): string {
  if (!Number.isSafeInteger(options.pidClassinus)) throw new Error("Identifiant de processus invalide.");
  const protegees = listeProgrammesSure(options.applicationsProtegees).map(n => `'${n}'`).join(",");
  const marqueur = options.marqueur.replaceAll("'", "''");
  return String.raw`${DEBUT_SCRIPT}
try {
  $cible = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${enBase64(options.cible)}'))
  $texte = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${enBase64(options.texte)}'))
  $pidClassinus = ${options.pidClassinus}
  $forcer = ${options.forcer ? "$true" : "$false"}
  $protegees = @(${protegees})
  Add-Type -AssemblyName UIAutomationClient
  Add-Type -AssemblyName UIAutomationTypes
  ${blocCompilationUnique("EcritureCible", CODE_CSHARP)}
${blocRechercheFenetre()}
  $application = ''
  try { $application = [System.Diagnostics.Process]::GetProcessById([int]$fenetre.Pid).ProcessName.ToLowerInvariant() } catch { }
  if (-not $forcer -and ($protegees -contains $application)) {
    Sortir @{statut='protegee'; fenetre=$fenetre.Titre; application=$application}
    return
  }
  $AE = [System.Windows.Automation.AutomationElement]
  $racine = $AE::FromHandle($fenetre.H)
  $typeEdit = New-Object System.Windows.Automation.PropertyCondition($AE::ControlTypeProperty, [System.Windows.Automation.ControlType]::Edit)
  $typeDocument = New-Object System.Windows.Automation.PropertyCondition($AE::ControlTypeProperty, [System.Windows.Automation.ControlType]::Document)
  $condition = New-Object System.Windows.Automation.OrCondition($typeEdit, $typeDocument)
  $trouves = $racine.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition)
  $modeleValeur = [System.Windows.Automation.ValuePattern]::Pattern
  $champs = New-Object System.Collections.Generic.List[object]
  foreach ($el in $trouves) {
    try {
      if (-not $el.Current.IsEnabled -or $el.Current.IsPassword) { continue }
      $objet = $null
      if (-not $el.TryGetCurrentPattern($modeleValeur, [ref]$objet)) { continue }
      if ($objet.Current.IsReadOnly) { continue }
      $champs.Add(@{ valeur = $objet; focus = [bool]$el.Current.HasKeyboardFocus })
    } catch { }
  }
  if ($champs.Count -eq 0) { Sortir @{statut='indisponible'; raison='aucun_champ_modifiable'}; return }
  if ($champs.Count -gt 1) {
    $avecFocus = @($champs | Where-Object { $_.focus })
    if ($avecFocus.Count -ne 1) { Sortir @{statut='indisponible'; raison='plusieurs_champs'}; return }
    $champ = $avecFocus[0]
  } else { $champ = $champs[0] }
  $valeur = $champ.valeur
  $avant = [string]$valeur.Current.Value
  if ($avant.Length -gt 2000000) { Sortir @{statut='indisponible'; raison='champ_trop_long'}; return }
  $saut = [string]([char]13) + [string]([char]10)
  $ajout = [regex]::Replace($texte, '\r\n|\r|\n', $saut)
  $attendu = $avant + $ajout
  # A partir d'ici, un echec ne permet plus de reessayer : le texte pourrait deja etre ecrit.
  [System.IO.File]::WriteAllText('${marqueur}', 'execution')
  $valeur.SetValue($attendu)
  $apres = [string]$valeur.Current.Value
  # Sauts de ligne ramenes a un seul caractere des deux cotes : certains champs renvoient CRLF, d'autres LF.
  $lf = [string]([char]10)
  $mini = [regex]::Replace($apres, '\r\n|\r', $lf)
  $voulu = [regex]::Replace($ajout, '\r\n|\r', $lf)
  if (-not $mini.EndsWith($voulu)) { Sortir @{statut='incertain'; raison='Le texte ecrit en arriere plan ne correspond pas a ce qui etait attendu'}; return }
  Sortir @{statut='effectue'; fenetre=$fenetre.Titre; application=$application; ajoutes=$texte.Length}
} catch {
  if ([System.IO.File]::Exists('${marqueur}')) { Sortir @{statut='incertain'; raison='Le resultat de l ecriture en arriere plan ne peut pas etre confirme'} }
  else { Sortir @{statut='indisponible'; raison='ecriture_arriere_plan_indisponible'; diagnostic=$_.Exception.Message} }
}
`;
}

export function construireScriptActivation(cible: string, pidClassinus: number): string {
  if (!Number.isSafeInteger(pidClassinus)) throw new Error("Identifiant de processus invalide.");
  return String.raw`${DEBUT_SCRIPT}
try {
  $cible = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${enBase64(cible)}'))
  $pidClassinus = ${pidClassinus}
  ${blocCompilationUnique("EcritureCible", CODE_CSHARP)}
${blocRechercheFenetre()}
  if (-not [EcritureCible]::Activer($fenetre.H)) { Sortir @{statut='indisponible'; raison='Windows a refuse de mettre la fenetre devant'}; return }
  Sortir @{statut='effectue'; fenetre=$fenetre.Titre}
} catch {
  Sortir @{statut='indisponible'; raison='activation_indisponible'; diagnostic=$_.Exception.Message}
}
`;
}

// Lit la sortie JSON d'un script d'ecriture. Pure, testable sans Windows.
// `commence` : le fichier marqueur existe, l'ecriture a peut etre eu lieu.
export function interpreterSortieEcriture(sortie: string, commence: boolean, diagnosticErreur = ""): ResultatEcritureArrierePlan {
  const incertain: ResultatEcritureArrierePlan = { statut: "incertain", raison: "L'écriture en arrière plan n'a pas pu être confirmée" };
  const indisponible: ResultatEcritureArrierePlan = {
    statut: "indisponible",
    raison: "ecriture_arriere_plan_indisponible",
    ...(diagnosticErreur ? { diagnostic: diagnosticErreur.slice(0, 2000) } : {}),
  };
  let brut: Record<string, unknown>;
  try {
    brut = JSON.parse(String(sortie).replace(/^﻿/, "").trim());
  } catch {
    return commence ? incertain : indisponible;
  }
  const texte = (v: unknown) => (typeof v === "string" ? v : "");
  if (brut.statut === "effectue") {
    return { statut: "effectue", fenetre: texte(brut.fenetre), application: texte(brut.application), ajoutes: typeof brut.ajoutes === "number" ? brut.ajoutes : 0 };
  }
  // Dernier mot du script quand l'ecriture a commence : jamais "indisponible", pour ne rien rejouer.
  if (commence) return incertain;
  if (brut.statut === "protegee") return { statut: "protegee", fenetre: texte(brut.fenetre), application: texte(brut.application) };
  if (brut.statut === "indisponible") {
    return { statut: "indisponible", raison: texte(brut.raison) || "ecriture_arriere_plan_indisponible", ...(brut.diagnostic ? { diagnostic: texte(brut.diagnostic) } : {}) };
  }
  return indisponible;
}

export function interpreterSortieActivation(sortie: string): ResultatActivationFenetre {
  try {
    const brut = JSON.parse(String(sortie).replace(/^﻿/, "").trim()) as Record<string, unknown>;
    if (brut.statut === "effectue") return { statut: "effectue", fenetre: typeof brut.fenetre === "string" ? brut.fenetre : "" };
    return { statut: "indisponible", raison: typeof brut.raison === "string" ? brut.raison : "activation_indisponible" };
  } catch {
    return { statut: "indisponible", raison: "activation_indisponible" };
  }
}

function lancerScript(fichierScript: string, delaiMs: number): Promise<{ sortie: string; stderr: string }> {
  return new Promise(resolve => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", fichierScript],
      { windowsHide: true, timeout: delaiMs, maxBuffer: 65536, encoding: "utf8" },
      (_erreur, sortie, stderr) => resolve({ sortie: String(sortie), stderr: String(stderr) })
    );
  });
}

function nomTemporaire(prefixe: string): string {
  return join(tmpdir(), `classinus-${prefixe}-${process.pid}-${randomBytes(6).toString("hex")}`);
}

export async function ecrireEnArrierePlanWindows(options: {
  cible: string;
  texte: string;
  applicationsProtegees: readonly string[];
  forcer?: boolean;
}): Promise<ResultatEcritureArrierePlan> {
  if (process.platform !== "win32") return { statut: "indisponible", raison: "Accessibilité Windows indisponible" };
  const base = nomTemporaire("ecriture");
  const script = base + ".ps1", marqueur = base + ".action";
  try {
    writeFileSync(script, "﻿" + construireScriptEcriture({
      cible: options.cible,
      texte: options.texte,
      pidClassinus: process.pid,
      applicationsProtegees: options.applicationsProtegees,
      forcer: options.forcer === true,
      marqueur,
    }), "utf8");
  } catch {
    return { statut: "indisponible", raison: "L'écriture en arrière plan ne peut pas démarrer" };
  }
  const { sortie, stderr } = await lancerScript(script, 20000);
  const commence = existsSync(marqueur);
  const resultat = interpreterSortieEcriture(sortie, commence, stderr);
  for (const fichier of [script, marqueur]) { try { unlinkSync(fichier); } catch { /* deja supprime */ } }
  return resultat;
}

export async function activerFenetreParTitreWindows(cible: string): Promise<ResultatActivationFenetre> {
  if (process.platform !== "win32") return { statut: "indisponible", raison: "Accessibilité Windows indisponible" };
  const script = nomTemporaire("activation") + ".ps1";
  try {
    writeFileSync(script, "﻿" + construireScriptActivation(cible, process.pid), "utf8");
  } catch {
    return { statut: "indisponible", raison: "activation_indisponible" };
  }
  const { sortie } = await lancerScript(script, 12000);
  try { unlinkSync(script); } catch { /* deja supprime */ }
  return interpreterSortieActivation(sortie);
}
