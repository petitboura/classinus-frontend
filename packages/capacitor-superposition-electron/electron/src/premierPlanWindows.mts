// Cree le 18/10/2026, demande de Bourama : quand l'etudiant a fini d'ecrire dans la superposition,
// la fenetre qui etait devant doit reprendre la main pour de bon. Sous Windows, rendre la
// superposition non activable ne suffit pas toujours : avec certaines applications (par exemple
// celles basees sur Chromium) aucune fenetre ne se retrouve devant et il faut recliquer dessus.
//
// Principe : juste avant que la superposition prenne le clavier, on note quelle fenetre est devant ;
// quand l'ecriture se termine et que la superposition est encore devant, on remet cette fenetre
// devant. Aucun module natif : un petit programme PowerShell reste allume et repond a deux
// commandes par ligne (lire la fenetre devant, remettre une fenetre devant). Il est lance une fois,
// pour ne payer le temps de compilation qu'au demarrage.
//
// Ne fait strictement rien hors de Windows.
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

const SCRIPT_POWERSHELL = String.raw`
$ErrorActionPreference = 'SilentlyContinue'
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class PremierPlan {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint depuis, uint vers, bool attacher);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
}
"@
function Remettre($h) {
  if (-not ([PremierPlan]::IsWindow($h) -and [PremierPlan]::IsWindowVisible($h))) { return 'invalide' }
  if ([PremierPlan]::IsIconic($h)) { [void][PremierPlan]::ShowWindow($h, 9) }
  [void][PremierPlan]::SetForegroundWindow($h)
  if ([PremierPlan]::GetForegroundWindow() -eq $h) { return 'direct' }
  $pidFg = [uint32]0
  $pidCible = [uint32]0
  $threadFg = [PremierPlan]::GetWindowThreadProcessId([PremierPlan]::GetForegroundWindow(), [ref]$pidFg)
  $threadCible = [PremierPlan]::GetWindowThreadProcessId($h, [ref]$pidCible)
  $moi = [PremierPlan]::GetCurrentThreadId()
  [void][PremierPlan]::AttachThreadInput($moi, $threadCible, $true)
  if ($threadFg -ne 0) { [void][PremierPlan]::AttachThreadInput($moi, $threadFg, $true) }
  [void][PremierPlan]::BringWindowToTop($h)
  [void][PremierPlan]::SetForegroundWindow($h)
  [void][PremierPlan]::AttachThreadInput($moi, $threadCible, $false)
  if ($threadFg -ne 0) { [void][PremierPlan]::AttachThreadInput($moi, $threadFg, $false) }
  if ([PremierPlan]::GetForegroundWindow() -eq $h) { return 'attache' }
  return 'echec'
}
[Console]::Out.WriteLine('pret')
while (($ligne = [Console]::In.ReadLine()) -ne $null) {
  $morceaux = $ligne.Split(' ')
  if ($morceaux[0] -eq 'devant') {
    [Console]::Out.WriteLine('devant ' + [PremierPlan]::GetForegroundWindow().ToInt64())
  } elseif ($morceaux[0] -eq 'remettre') {
    $h = [IntPtr][int64]$morceaux[1]
    [Console]::Out.WriteLine('remis ' + (Remettre $h))
  }
}
`;

// Delai maximum d'attente d'une reponse : l'ecriture ne doit jamais attendre ce programme.
const DELAI_REPONSE_MS = 400;

export interface GardePremierPlan {
  demarrer(): void;
  memoriser(poigneeSuperposition: number): Promise<void>;
  restaurer(): Promise<boolean>;
  dernierResultat(): string;
  fenetreMemorisee(): number;
  arreter(): void;
}

export function poigneeFenetre(tampon: Buffer): number {
  return tampon.length >= 8 ? Number(tampon.readBigUInt64LE(0)) : tampon.readUInt32LE(0);
}

export function creerGardePremierPlan(plateforme: string = process.platform): GardePremierPlan {
  let processus: ChildProcessWithoutNullStreams | null = null;
  let pret = false;
  let tampon = "";
  let memorisee = 0;
  let dernierResultat = "aucun";
  // Reponses attendues dans l'ordre : chaque ligne recue sert la plus ancienne demande.
  const attentes: Array<{ prefixe: string; resoudre: (ligne: string | null) => void; minuteur: ReturnType<typeof setTimeout> }> = [];

  function traiterLigne(ligne: string): void {
    if (ligne === "pret") { pret = true; return; }
    const attente = attentes.shift();
    if (!attente) return;
    clearTimeout(attente.minuteur);
    attente.resoudre(ligne.startsWith(attente.prefixe) ? ligne : null);
  }

  function demander(commande: string, prefixe: string): Promise<string | null> {
    return new Promise((resoudre) => {
      if (!processus || !pret || !processus.stdin.writable) { resoudre(null); return; }
      const minuteur = setTimeout(() => {
        const position = attentes.findIndex((a) => a.minuteur === minuteur);
        if (position >= 0) attentes.splice(position, 1);
        resoudre(null);
      }, DELAI_REPONSE_MS);
      attentes.push({ prefixe, resoudre, minuteur });
      processus.stdin.write(commande + "\n");
    });
  }

  return {
    demarrer() {
      if (plateforme !== "win32" || processus) return;
      try {
        const encode = Buffer.from(SCRIPT_POWERSHELL, "utf16le").toString("base64");
        processus = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encode], { windowsHide: true });
        processus.stdout.setEncoding("utf8");
        processus.stdout.on("data", (morceau: string) => {
          tampon += morceau;
          let fin = tampon.indexOf("\n");
          while (fin >= 0) {
            traiterLigne(tampon.slice(0, fin).trim());
            tampon = tampon.slice(fin + 1);
            fin = tampon.indexOf("\n");
          }
        });
        processus.stdin.on("error", () => { /* programme ferme : on continue sans lui */ });
        processus.on("error", () => { processus = null; pret = false; });
        processus.on("exit", () => { processus = null; pret = false; });
      } catch {
        processus = null;
      }
    },
    async memoriser(poigneeSuperposition) {
      memorisee = 0;
      const reponse = await demander("devant", "devant ");
      if (!reponse) return;
      const poignee = Number(reponse.slice("devant ".length));
      if (Number.isFinite(poignee) && poignee > 0 && poignee !== poigneeSuperposition) memorisee = poignee;
    },
    fenetreMemorisee() { return memorisee; },
    dernierResultat() { return dernierResultat; },
    async restaurer() {
      const cible = memorisee;
      memorisee = 0;
      if (!cible) return false;
      const reponse = await demander(`remettre ${cible}`, "remis ");
      dernierResultat = reponse ?? "sans reponse";
      return reponse === "remis direct" || reponse === "remis attache";
    },
    arreter() {
      try { processus?.stdin.end(); processus?.kill(); } catch { /* deja arrete */ }
      processus = null;
      pret = false;
    },
  };
}
