// Actions UI Automation en pixels physiques, sans pilote ni mouvement de souris.
import { execFile } from "node:child_process";
import { existsSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

export type ResultatClicAccessible =
  | { statut: "effectue"; action: string }
  | { statut: "indisponible"; raison: string; diagnostic?: string }
  | { statut: "incertain"; raison: string };

export function construireScriptClic(x: number, y: number, pidClassinus: number, marqueur: string): string {
  if (![x, y, pidClassinus].every(Number.isSafeInteger)) throw new Error("Coordonnées de clic invalides.");
  const chemin = marqueur.replaceAll("'", "''");
  return `
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }
function Sortir($statut, $detail) {
  @{statut=$statut; action=$detail; raison=$detail} | ConvertTo-Json -Compress
}
try {
  Add-Type -AssemblyName UIAutomationClient
  Add-Type -AssemblyName UIAutomationTypes
  Add-Type -AssemblyName WindowsBase
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class CibleClic {
  public delegate bool EnumProc(IntPtr h, IntPtr p);
  [StructLayout(LayoutKind.Sequential)] public struct Rect { public int L,T,R,B; }
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr p);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out Rect r);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr contexte);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h, int a, out int v, int size);
  public static IntPtr Trouver(int x, int y, uint exclu) {
    IntPtr cible = IntPtr.Zero;
    EnumWindows(delegate(IntPtr h, IntPtr p) {
      uint pid; GetWindowThreadProcessId(h, out pid);
      if (pid == exclu || !IsWindowVisible(h) || IsIconic(h)) return true;
      int cache; if (DwmGetWindowAttribute(h,14,out cache,4)==0 && cache!=0) return true;
      Rect r; if (GetWindowRect(h,out r) && x>=r.L && x<r.R && y>=r.T && y<r.B) { cible=h; return false; }
      return true;
    }, IntPtr.Zero);
    return cible;
  }
}
'@
  try { [void][CibleClic]::SetProcessDpiAwarenessContext([IntPtr](-4)) } catch { [void][CibleClic]::SetProcessDPIAware() }
  $h = [CibleClic]::Trouver(${x}, ${y}, ${pidClassinus})
  if ($h -eq [IntPtr]::Zero) { Sortir 'indisponible' 'Aucune fenêtre à cet endroit'; return }
  $AE=[System.Windows.Automation.AutomationElement]
  $cache=New-Object System.Windows.Automation.CacheRequest
  foreach ($p in @($AE::BoundingRectangleProperty,$AE::IsOffscreenProperty,$AE::IsEnabledProperty,$AE::ControlTypeProperty,$AE::IsKeyboardFocusableProperty)) { $cache.Add($p) }
  foreach ($p in @([System.Windows.Automation.TogglePattern]::Pattern,[System.Windows.Automation.InvokePattern]::Pattern,[System.Windows.Automation.SelectionItemPattern]::Pattern,[System.Windows.Automation.ExpandCollapsePattern]::Pattern,[System.Windows.Automation.LegacyIAccessiblePattern]::Pattern)) { $cache.Add($p) }
  $cache.Add([System.Windows.Automation.LegacyIAccessiblePattern]::DefaultActionProperty)
  $cache.Add([System.Windows.Automation.ExpandCollapsePattern]::ExpandCollapseStateProperty)
  $cache.TreeFilter=[System.Windows.Automation.Automation]::ControlViewCondition
  $activationCache=$cache.Activate()
  $racine = $AE::FromHandle($h)
  $walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
  $file = New-Object 'System.Collections.Generic.Queue[object]'
  $file.Enqueue(@{el=$racine; profondeur=0})
  $cible=$null; $profondeur=-1; $noeuds=0
  # FromPoint identifie directement le contrôle quand la superposition
  # laisse traverser. Vérifier son appartenance à la fenêtre externe.
  $direct=[System.Windows.Automation.AutomationElement]::FromPoint([System.Windows.Point]::new(${x},${y}))
  $ancetre=$direct
  for ($i=0; $null -ne $ancetre -and $i -lt 35; $i++) {
    if ([System.Windows.Automation.Automation]::Compare($ancetre,$racine)) {
      if (![System.Windows.Automation.Automation]::Compare($direct,$racine)) { $cible=$direct; $file.Clear() }
      break
    }
    $ancetre=[System.Windows.Automation.TreeWalker]::RawViewWalker.GetParent($ancetre,$cache)
  }
  $diagnosticParcours=''
  $diagnosticType=if($null -ne $cible){$cible.Cached.ControlType.ProgrammaticName}else{'aucun'}
  while ($file.Count -gt 0 -and $noeuds -lt 1500) {
    $item=$file.Dequeue(); $noeuds++
    $el=$item.el; $niveau=$item.profondeur
    try {
      $r=$el.Cached.BoundingRectangle
      $contient= !$r.IsEmpty -and ${x} -ge $r.Left -and ${x} -lt $r.Right -and ${y} -ge $r.Top -and ${y} -lt $r.Bottom
      if ($contient -and !$el.Cached.IsOffscreen -and $niveau -gt $profondeur) { $cible=$el; $profondeur=$niveau }
      if (($contient -or $r.IsEmpty) -and $niveau -lt 30) {
        $enfant=$walker.GetFirstChild($el,$cache)
        while ($null -ne $enfant -and $noeuds+$file.Count -lt 1500) {
          $file.Enqueue(@{el=$enfant; profondeur=$niveau+1})
          $enfant=$walker.GetNextSibling($enfant,$cache)
        }
      }
    } catch { $diagnosticParcours=$_.Exception.Message }
  }
  $pattern=$null; $action=$null; $elementAction=$null
  for ($i=0; $null -ne $cible -and $i -lt 5; $i++) {
    if ([System.Windows.Automation.Automation]::Compare($cible,$racine)) { break }
    if (!$cible.Cached.IsEnabled) { Sortir 'indisponible' 'Contrôle désactivé'; return }
    foreach ($nom in @('Toggle','Invoke','SelectionItem','ExpandCollapse','LegacyIAccessible')) {
      $type = ('System.Windows.Automation.'+$nom+'Pattern') -as [type]
      $objet=$null
      if ($cible.TryGetCachedPattern($type::Pattern,[ref]$objet)) {
        if ($nom -eq 'LegacyIAccessible' -and [string]::IsNullOrWhiteSpace($objet.Cached.DefaultAction)) { continue }
        $pattern=$objet; $action=$nom; $elementAction=$cible; break
      }
    }
    if ($null -ne $action) { break }
    if ($cible.Cached.ControlType -eq [System.Windows.Automation.ControlType]::Edit -and $cible.Cached.IsKeyboardFocusable) {
      $action='Focus'; $elementAction=$cible; break
    }
    $cible=$walker.GetParent($cible,$cache)
  }
  if ($null -eq $action) {
    @{statut='indisponible'; raison='Ce contrôle ne propose pas de clic indépendant'; diagnostic=('noeuds='+$noeuds+'; cible='+$profondeur+'; type='+$diagnosticType+'; '+$diagnosticParcours)} | ConvertTo-Json -Compress
    return
  }
  # Dès cet instant, un délai ou une erreur ne permet plus de rejouer le clic.
  [System.IO.File]::WriteAllText('${chemin}','execution')
  switch ($action) {
    'Toggle' { $pattern.Toggle() }
    'Invoke' { $pattern.Invoke() }
    'SelectionItem' { $pattern.Select() }
    'ExpandCollapse' {
      if ($pattern.Cached.ExpandCollapseState -eq [System.Windows.Automation.ExpandCollapseState]::Expanded) { $pattern.Collapse() }
      else { $pattern.Expand() }
    }
    'Focus' { $elementAction.SetFocus() }
    'LegacyIAccessible' { $pattern.DoDefaultAction() }
  }
  Sortir 'effectue' $action
} catch {
  if ([System.IO.File]::Exists('${chemin}')) { Sortir 'incertain' 'Le résultat du clic indépendant ne peut pas être confirmé' }
  else { @{statut='indisponible'; raison='Le clic indépendant est indisponible pour ce contrôle'; diagnostic=$_.Exception.Message} | ConvertTo-Json -Compress }
}
`;
}

export async function cliquerParAccessibiliteWindows(point: { x: number; y: number }): Promise<ResultatClicAccessible> {
  if (process.platform !== "win32") return { statut: "indisponible", raison: "Accessibilité Windows indisponible" };
  const base = join(tmpdir(), `classinus-clic-${process.pid}-${randomBytes(6).toString("hex")}`);
  const script = base + ".ps1", marqueur = base + ".action";
  try {
    writeFileSync(script, "\uFEFF" + construireScriptClic(Math.round(point.x), Math.round(point.y), process.pid, marqueur), "utf8");
  } catch {
    return { statut: "indisponible", raison: "Le clic indépendant ne peut pas démarrer" };
  }
  return new Promise(resolve => {
    execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", script],
      { windowsHide: true, timeout: 10000, maxBuffer: 65536, encoding: "utf8" }, (_erreur, sortie, stderr) => {
        const commence = existsSync(marqueur);
        let resultat: ResultatClicAccessible = { statut: commence ? "incertain" : "indisponible", raison: "Le clic indépendant n'a pas été confirmé" };
        try {
          const brut = JSON.parse(String(sortie).replace(/^\uFEFF/, "").trim());
          if (brut.statut === "effectue" && typeof brut.action === "string") resultat = { statut: "effectue", action: brut.action };
          else if (brut.statut === "indisponible" && !commence) resultat = { statut: "indisponible", raison: String(brut.raison), ...(brut.diagnostic ? { diagnostic: String(brut.diagnostic) } : {}) };
        } catch { if (!commence) resultat = { statut: "indisponible", raison: "Le clic indépendant n'a pas démarré", diagnostic: String(stderr).slice(0, 2000) }; }
        for (const fichier of [script, marqueur]) { try { unlinkSync(fichier); } catch { } }
        resolve(resultat);
      });
  });
}
