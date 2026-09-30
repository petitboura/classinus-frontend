// Lot V du chantier "canal en direct sort de l'appli" (voir
// plan-canal-en-direct-pc.md et plan-canal-en-direct-pc-lot-v.md).
//
// Decision Bourama (28/09/2026) : Clovis doit voir ce qu'il y a dans la
// fenetre au premier plan du PC, en TEXTE, jamais en image (une capture lue
// par la vision du modele coute beaucoup trop cher). On interroge donc
// UI Automation, l'API Windows utilisee par les lecteurs d'ecran : pour
// chaque element de la fenetre elle donne son nom, son type, sa valeur, son
// etat et sa position.
//
// Mise en oeuvre : un petit script PowerShell lance depuis ce processus.
// Aucun module natif a compiler (contrairement a nut-js, voir le README du
// paquet), et Bourama a deja valide qu'un script PowerShell fonctionne sur
// sa machine. Le script ne modifie rien : lecture seule.
//
// Les limites (nombre d'elements, longueurs, delai) viennent du backend, qui
// les envoie avec chaque demande (voir core/outils_action_agent_pc.py) :
// elles ne sont reglees qu'a cet endroit. Les valeurs ci dessous ne servent
// que si une demande n'en fournit pas.

import { execFile } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

export interface LimitesLectureEcran {
  nbMaxElements: number;
  nbMaxFenetres: number;
  longueurMaxNom: number;
  longueurMaxValeur: number;
  profondeurMax: number;
  delaiMaxMs: number;
}

const LIMITES_PAR_DEFAUT: LimitesLectureEcran = {
  nbMaxElements: 120,
  nbMaxFenetres: 15,
  longueurMaxNom: 80,
  longueurMaxValeur: 400,
  profondeurMax: 25,
  delaiMaxMs: 6000,
};

// Nombre maximal de noeuds parcourus, tous types confondus (les elements
// ecartes comptent aussi) : evite qu'une fenetre tres dense fasse tourner le
// script jusqu'au delai maximal.
const FACTEUR_NOEUDS_PARCOURUS = 25;

// Marge ajoutee au delai interne du script avant que ce processus ne
// l'arrete de force (demarrage de PowerShell et compilation du code C#).
const MARGE_DEMARRAGE_MS = 8000;

// Taille maximale de la sortie du script, en octets.
const TAILLE_MAX_SORTIE_OCTETS = 4 * 1024 * 1024;

export interface ElementLu {
  type: string;
  nom: string;
  valeur: string | null;
  valeur_masquee: boolean;
  etats: string[];
  x: number;
  y: number;
  // Coin haut gauche de l'element, en pixels d'ecran.
  gauche: number;
  haut: number;
  // Taille de l'element en pixels d'ecran (pour entourer, souligner, surligner).
  largeur: number;
  hauteur: number;
  // "menu ouvert" pour un element d'un menu, menu contextuel ou liste deroulante
  // ouvert par la fenetre (fenetre a part) ; absent pour la fenetre elle-meme.
  zone?: string;
}

export interface LectureFenetre {
  titre_fenetre_active: string | null;
  application: string | null;
  // Vrai si la fenetre au premier plan est une fenetre de Classinus
  // lui meme (fenetre principale) : rien n'est lu, l'IA
  // doit utiliser lire_page.
  fenetre_classinus: boolean;
  fenetres_ouvertes: string[];
  elements: ElementLu[];
  coupe: boolean;
  mode: "uia" | "titre_seul";
  // Vrai si un menu, menu contextuel ou liste deroulante est ouvert au-dessus de la fenetre.
  menu_ouvert?: boolean;
  // Vrai si la lecture du texte long (documents, champs multilignes) a fait
  // planter Windows et a ete abandonnee : les elements sont la, mais leur
  // texte long n'est pas lu.
  texte_long_ignore?: boolean;
}

// Echec de la lecture : plantage = le processus PowerShell s'est arrete
// brutalement sans rien renvoyer (ex. violation d'acces memoire de Windows,
// code 3221225477), ce qu'aucun try/catch du script ne peut intercepter.
export interface ErreurLecture {
  erreur: string;
  plantage?: boolean;
}

function entierBorne(valeur: unknown, defaut: number, min: number, max: number): number {
  const n = Number(valeur);
  if (!Number.isFinite(n)) return defaut;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export function limitesDepuisParametres(parametres: Record<string, unknown>): LimitesLectureEcran {
  const d = LIMITES_PAR_DEFAUT;
  return {
    nbMaxElements: entierBorne(parametres.nb_max_elements, d.nbMaxElements, 1, 1000),
    nbMaxFenetres: entierBorne(parametres.nb_max_fenetres, d.nbMaxFenetres, 0, 100),
    longueurMaxNom: entierBorne(parametres.longueur_max_nom, d.longueurMaxNom, 10, 500),
    longueurMaxValeur: entierBorne(parametres.longueur_max_valeur, d.longueurMaxValeur, 10, 5000),
    profondeurMax: entierBorne(parametres.profondeur_max, d.profondeurMax, 1, 60),
    delaiMaxMs: entierBorne(parametres.delai_max_ms, d.delaiMaxMs, 500, 30000),
  };
}

// Code C# compile a la volee par PowerShell (Add-Type) : appels Win32 pour
// trouver la fenetre au premier plan et lister les fenetres ouvertes, comme
// le ferait Alt+Tab (fenetres visibles, sans proprietaire, ni fenetres
// d'outil, ni fenetres "cloaked" des applications UWP suspendues, ni le
// bureau). Ecrit pour le compilateur de Windows PowerShell 5.1 (C# 5) :
// pas de declaration "out" en ligne.
const CODE_CSHARP = `
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
[StructLayout(LayoutKind.Sequential)] public struct PtUia { public int X; public int Y; }
// Interfaces COM de UI Automation (uiautomationclient.h du SDK Windows). Seul l'ORDRE des
// methodes compte (table virtuelle) : les methodes inutilisees sont des emplacements vides.
[ComImport, Guid("30cbe57d-d9d0-452a-ab13-7ac5ac4825ee"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IUia {
  void M0(); void M1(); void M2();
  void ElementFromHandle(IntPtr hwnd, out IUiaElement element);
  void ElementFromPoint(PtUia pt, out IUiaElement element);
}
[ComImport, Guid("d22108aa-8ac5-49a5-837b-37bbb3d7591e"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IUiaElement {
  void M0(); void M1(); void M2(); void M3(); void M4(); void M5(); void M6(); void M7(); void M8(); void M9();
  void M10(); void M11(); void M12();
  void GetCurrentPattern(int patternId, [MarshalAs(UnmanagedType.IUnknown)] out object pattern);
}
[ComImport, Guid("32eba289-3583-42c9-9c59-3b6d9a1e9b6a"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IUiaTextPattern {
  void M0(); void M1(); void M2();
  void GetVisibleRanges(out IUiaTextRangeArray ranges);
}
[ComImport, Guid("ce4ae76a-e717-4c98-81ea-47371d028eb6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IUiaTextRangeArray {
  void GetLength(out int length);
  void GetElement(int index, out IUiaTextRange range);
}
[ComImport, Guid("a543cc6a-f4ae-494b-8239-c814481187a8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IUiaTextRange {
  void M0(); void M1(); void M2(); void M3(); void M4(); void M5(); void M6(); void M7(); void M8();
  void GetText(int maxLength, [MarshalAs(UnmanagedType.BStr)] out string text);
}
public static class LectureTexteCom {
  // Le wrapper .NET de UI Automation (TextPatternRange.GetText) plante Windows PowerShell avec
  // une violation d'acces sous Windows 11 : le texte est lu par l'API COM native a la place.
  // Renvoie null si l'element n'expose pas de texte ou si la lecture echoue.
  public static string Lire(IntPtr hwnd, int x, int y, int maxCar) {
    try {
      IUia uia = (IUia)Activator.CreateInstance(Type.GetTypeFromCLSID(new Guid("ff48dba4-60ef-4201-aa87-54103eef594e")));
      IUiaElement el = null;
      if (hwnd != IntPtr.Zero) { uia.ElementFromHandle(hwnd, out el); }
      else { PtUia pt = new PtUia(); pt.X = x; pt.Y = y; uia.ElementFromPoint(pt, out el); }
      if (el == null) return null;
      object obj = null;
      el.GetCurrentPattern(10014, out obj);
      IUiaTextPattern tp = obj as IUiaTextPattern;
      if (tp == null) return null;
      IUiaTextRangeArray plages = null;
      tp.GetVisibleRanges(out plages);
      if (plages == null) return null;
      int n = 0;
      plages.GetLength(out n);
      StringBuilder sb = new StringBuilder();
      int restant = maxCar;
      for (int i = 0; i < n && restant > 0; i++) {
        IUiaTextRange r = null;
        plages.GetElement(i, out r);
        if (r == null) continue;
        string t = null;
        r.GetText(restant, out t);
        if (!string.IsNullOrEmpty(t)) { if (sb.Length > 0) sb.Append(' '); sb.Append(t); restant -= t.Length; }
      }
      return sb.ToString();
    } catch (Exception) { return null; }
  }
}
public static class LectureFenetres {
  delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr h, uint cmd);
  [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr h, int index);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowTextW(IntPtr h, StringBuilder s, int max);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassNameW(IntPtr h, StringBuilder s, int max);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr h, int attr, out int value, int size);
  public static string Titre(IntPtr h) { StringBuilder sb = new StringBuilder(512); GetWindowTextW(h, sb, sb.Capacity); return sb.ToString(); }
  public static string Classe(IntPtr h) { StringBuilder sb = new StringBuilder(256); GetClassNameW(h, sb, sb.Capacity); return sb.ToString(); }
  // Les anciens fournisseurs WinForms exposent parfois un champ secret comme Pane.
  public static bool MotDePasse(IntPtr h) {
    string c = Classe(h);
    bool edit = c.Equals("Edit", StringComparison.OrdinalIgnoreCase) || c.StartsWith("WindowsForms10.EDIT.", StringComparison.OrdinalIgnoreCase);
    return edit && (GetWindowLong(h, -16) & 0x20) != 0;
  }
  public static uint Pid(IntPtr h) { uint p; GetWindowThreadProcessId(h, out p); return p; }
  // Menus, menus contextuels et listes deroulantes ouverts par la fenetre cible : ce sont des
  // fenetres a part, absentes de l'arbre de la fenetre au premier plan. Seules celles placees
  // AU-DESSUS de la fenetre cible dans l'ordre d'affichage sont retenues.
  public static List<IntPtr> Annexes(IntPtr cible, uint pidCible, uint pidClassinus, IntPtr superposition) {
    List<IntPtr> liste = new List<IntPtr>();
    EnumWindows(delegate(IntPtr h, IntPtr l) {
      if (h == cible) return false;
      if (h == superposition || !IsWindowVisible(h) || IsIconic(h)) return true;
      uint p = Pid(h);
      if (p == pidClassinus) return true;
      int cache;
      if (DwmGetWindowAttribute(h, 14, out cache, 4) == 0 && cache != 0) return true;
      string c = Classe(h);
      if (c != "#32768") {
        if (p != pidCible) return true;
        bool annexe = (GetWindowLong(h, -20) & 0x80) != 0 || GetWindow(h, 4) != IntPtr.Zero || Titre(h).Length == 0
          || c.IndexOf("Popup", StringComparison.OrdinalIgnoreCase) >= 0 || c == "ComboLBox";
        if (!annexe) return true;
      }
      if (liste.Count < 6) liste.Add(h);
      return true;
    }, IntPtr.Zero);
    return liste;
  }
  public static List<IntPtr> Ouvertes() {
    List<IntPtr> liste = new List<IntPtr>();
    EnumWindows(delegate(IntPtr h, IntPtr l) {
      if (!IsWindowVisible(h) || IsIconic(h)) return true;
      if (GetWindow(h, 4) != IntPtr.Zero) return true;
      if ((GetWindowLong(h, -20) & 0x80) != 0) return true;
      int cache;
      if (DwmGetWindowAttribute(h, 14, out cache, 4) == 0 && cache != 0) return true;
      if (Titre(h).Length == 0) return true;
      string c = Classe(h);
      if (c == "Progman" || c == "WorkerW") return true;
      liste.Add(h);
      return true;
    }, IntPtr.Zero);
    return liste;
  }
}
`;

// Exportee pour pouvoir verifier la syntaxe du script hors de Windows.
export function construireScript(limites: LimitesLectureEcran, pidClassinus: number, handleSuperposition = "0", activerFenetre = false, lireTexteLong = true): string {
  if (!/^\d+$/.test(handleSuperposition)) throw new Error("Handle de superposition invalide");
  const nbMaxNoeuds = limites.nbMaxElements * FACTEUR_NOEUDS_PARCOURUS;
  // Les seules valeurs inserees dans le script sont des entiers deja
  // bornes par entierBorne : aucune chaine venue de l'exterieur.
  return `
$ErrorActionPreference = 'Stop'
# Sans console (processus lance en arriere plan, fenetre masquee), regler l'encodage de la
# console leve "Le handle est invalide" AVANT le bloc try : le script s'arretait sans rien
# renvoyer. On ne s'appuie donc plus sur l'encodage : la sortie est du JSON 100 % ASCII.
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }
function Sortir($objet) {
  $json = $objet | ConvertTo-Json -Depth 6 -Compress
  $ascii = [regex]::Replace($json, '[^\\x00-\\x7F]', { param($m) ('\\u{0:x4}' -f [int][char]$m.Value) })
  [Console]::Out.Write($ascii)
}
$nbMaxElements = ${limites.nbMaxElements}
$nbMaxFenetres = ${limites.nbMaxFenetres}
$longueurMaxNom = ${limites.longueurMaxNom}
$longueurMaxValeur = ${limites.longueurMaxValeur}
$profondeurMax = ${limites.profondeurMax}
$delaiMaxMs = ${limites.delaiMaxMs}
$nbMaxNoeuds = ${nbMaxNoeuds}
$pidClassinus = ${pidClassinus}
$lireTexteLong = ${lireTexteLong ? "$true" : "$false"}
$handleSuperposition = [IntPtr]([long]${handleSuperposition})

try {
  Add-Type -AssemblyName UIAutomationClient
  Add-Type -AssemblyName UIAutomationTypes
  Add-Type -TypeDefinition @'
${CODE_CSHARP}
'@
  # Sans cela, Windows peut renvoyer des coordonnees mises a l'echelle
  # (ecran regle a 125 % ou 150 %) qui ne correspondent plus a celles de la
  # souris : les clics tomberaient a cote.
  [void][LectureFenetres]::SetProcessDPIAware()

  $script:coupe = $false
  $script:noeuds = 0
  $script:zoneCourante = $null
  $script:elements = New-Object System.Collections.Generic.List[object]
  $resultat = [ordered]@{
    titre_fenetre_active = $null
    application = $null
    fenetre_classinus = $false
    fenetres_ouvertes = @()
    elements = $script:elements
    coupe = $false
    mode = 'titre_seul'
  }

  $fg = [LectureFenetres]::GetForegroundWindow()
  # Une demande dans Classinus ou dans sa barre flottante lui donne le focus.
  # lire_ecran sert aux applications externes : retrouver la première fenêtre
  # externe dans l'ordre Z, sans activer ni masquer de fenêtre pour une lecture.
  if (($handleSuperposition -ne [IntPtr]::Zero -and $fg -eq $handleSuperposition) -or
      [LectureFenetres]::Pid($fg) -eq $pidClassinus) {
    foreach ($h in [LectureFenetres]::Ouvertes()) {
      if ($h -ne $handleSuperposition -and [LectureFenetres]::Pid($h) -ne $pidClassinus) { $fg = $h; break }
    }
  }
  if ($fg -eq [IntPtr]::Zero) {
    throw "Aucune fenêtre disponible sous la superposition."
  }

  if (${activerFenetre ? "$true" : "$false"}) {
    if ([LectureFenetres]::Pid($fg) -eq $pidClassinus -or $fg -eq $handleSuperposition) {
      throw "Aucune fenêtre externe disponible pour cette action."
    }
    if (-not [LectureFenetres]::SetForegroundWindow($fg)) { throw "Impossible de rendre le focus à la fenêtre cible." }
    Sortir $resultat
    exit 0
  }

  $pidFg = [LectureFenetres]::Pid($fg)
  $resultat.titre_fenetre_active = [LectureFenetres]::Titre($fg)
  try { $resultat.application = (Get-Process -Id $pidFg).ProcessName } catch { }

  $titres = New-Object System.Collections.Generic.List[string]
  foreach ($h in [LectureFenetres]::Ouvertes()) {
    if ($h -eq $fg) { continue }
    if ([LectureFenetres]::Pid($h) -eq $pidClassinus) { continue }
    if ($titres.Count -ge $nbMaxFenetres) { break }
    $t = [LectureFenetres]::Titre($h)
    if (-not $titres.Contains($t)) { $titres.Add($t) }
  }
  $resultat.fenetres_ouvertes = $titres.ToArray()

  if ($pidFg -eq $pidClassinus) {
    $resultat.fenetre_classinus = $true
    Sortir $resultat
    exit 0
  }

  $types = @{
    Text = 'texte'; Button = 'bouton'; SplitButton = 'bouton'; Edit = 'champ'; Document = 'document'
    CheckBox = 'case à cocher'; RadioButton = 'choix'; ComboBox = 'liste'; Hyperlink = 'lien'
    ListItem = "élément de liste"; MenuItem = 'menu'; TabItem = 'onglet'; TreeItem = "élément d'arbre"
    DataItem = "élément de tableau"
    Pane = 'zone'; Group = 'groupe'; Custom = 'élément'
  }
  $typesAvecValeur = @('Edit', 'Document', 'ComboBox')

  $AE = [System.Windows.Automation.AutomationElement]
  $cr = New-Object System.Windows.Automation.CacheRequest
  foreach ($p in @($AE::NameProperty, $AE::ControlTypeProperty, $AE::BoundingRectangleProperty,
                   $AE::IsOffscreenProperty, $AE::IsPasswordProperty, $AE::IsEnabledProperty, $AE::NativeWindowHandleProperty)) { $cr.Add($p) }
  foreach ($p in @([System.Windows.Automation.ValuePattern]::Pattern,
                   [System.Windows.Automation.TogglePattern]::Pattern,
                   [System.Windows.Automation.ExpandCollapsePattern]::Pattern,
                   [System.Windows.Automation.SelectionItemPattern]::Pattern)) { $cr.Add($p) }
  $cr.TreeFilter = [System.Windows.Automation.Automation]::ControlViewCondition
  $marcheur = [System.Windows.Automation.TreeWalker]::ControlViewWalker
  $chrono = [System.Diagnostics.Stopwatch]::StartNew()

  function Couper($texte, $max) {
    if ($null -eq $texte) { return '' }
    $texte = ($texte -replace '\\s+', ' ').Trim()
    if ($texte.Length -gt $max) { return $texte.Substring(0, $max).TrimEnd() + '…' }
    return $texte
  }

  function LireValeur($el, $typeCle) {
    $obj = $null
    $valeur = ''
    try {
      if ($el.TryGetCachedPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$obj)) {
        $valeur = [string]$obj.Cached.Value
      }
    } catch { }
    if ($lireTexteLong -and [string]::IsNullOrWhiteSpace($valeur) -and ($typeCle -eq 'Edit' -or $typeCle -eq 'Document')) {
      # Lecture du texte par l'API COM native (le wrapper .NET plante sous Windows 11).
      try {
        $r = $el.Cached.BoundingRectangle
        $t = [LectureTexteCom]::Lire([IntPtr]$el.Cached.NativeWindowHandle, [int]($r.X + $r.Width / 2), [int]($r.Y + $r.Height / 2), $longueurMaxValeur)
        if ($null -ne $t) { $valeur = $t }
      } catch { }
    }
    return $valeur
  }

  function LireEtats($el) {
    $etats = @()
    $obj = $null
    try { if (-not $el.Cached.IsEnabled) { $etats += 'désactivé' } } catch { }
    try {
      if ($el.TryGetCachedPattern([System.Windows.Automation.TogglePattern]::Pattern, [ref]$obj)) {
        if ($obj.Cached.ToggleState -eq 'On') { $etats += 'coché' } elseif ($obj.Cached.ToggleState -eq 'Off') { $etats += 'non coché' }
      }
    } catch { }
    try {
      $obj = $null
      if ($el.TryGetCachedPattern([System.Windows.Automation.ExpandCollapsePattern]::Pattern, [ref]$obj)) {
        if ($obj.Cached.ExpandCollapseState -eq 'Expanded') { $etats += 'déplié' } elseif ($obj.Cached.ExpandCollapseState -eq 'Collapsed') { $etats += 'replié' }
      }
    } catch { }
    try {
      $obj = $null
      if ($el.TryGetCachedPattern([System.Windows.Automation.SelectionItemPattern]::Pattern, [ref]$obj)) {
        if ($obj.Cached.IsSelected) { $etats += 'sélectionné' }
      }
    } catch { }
    return $etats
  }

  function Visiter($el, $profondeur, $nomParent) {
    if ($script:coupe) { return }
    if ($chrono.ElapsedMilliseconds -gt $delaiMaxMs -or $script:noeuds -ge $nbMaxNoeuds -or $script:elements.Count -ge $nbMaxElements) {
      $script:coupe = $true
      return
    }
    $script:noeuds++

    if ($el.Cached.IsOffscreen) { return }

    $typeCle = ($el.Cached.ControlType.ProgrammaticName -replace '^ControlType\\.', '')
    # Certains fournisseurs hérités ne renseignent ni ControlType ni IsPassword.
    # Garder leurs noms visibles, mais protéger aussi les champs Win32 ES_PASSWORD.
    $masquee = $el.Cached.IsPassword
    $handle = [IntPtr]$el.Cached.NativeWindowHandle
    if ($handle -ne [IntPtr]::Zero -and [LectureFenetres]::MotDePasse($handle)) { $masquee = $true }
    $nom = $(if ($masquee) { '' } else { Couper $el.Cached.Name $longueurMaxNom })
    $nomTransmis = $nomParent
    $rect = $el.Cached.BoundingRectangle

    if ($types.ContainsKey($typeCle) -and -not $rect.IsEmpty) {
      $valeur = ''
      if ($typesAvecValeur -contains $typeCle) {
        if (-not $masquee) { $valeur = Couper (LireValeur $el $typeCle) $longueurMaxValeur }
      }
      $doublon = ($typeCle -eq 'Text' -and $nom -ne '' -and $nom -eq $nomParent)
      if (-not $doublon -and ($nom -ne '' -or $valeur -ne '' -or $masquee)) {
        $element = [ordered]@{
          type = $types[$typeCle]
          nom = $nom
          valeur = $(if ($valeur -ne '') { $valeur } else { $null })
          valeur_masquee = $masquee
          etats = @(LireEtats $el)
          x = [int]($rect.X + $rect.Width / 2)
          y = [int]($rect.Y + $rect.Height / 2)
          gauche = [int]$rect.X
          haut = [int]$rect.Y
          largeur = [int]$rect.Width
          hauteur = [int]$rect.Height
        }
        if ($script:zoneCourante) { $element.zone = $script:zoneCourante }
        $script:elements.Add($element)
        if ($nom -ne '') { $nomTransmis = $nom }
      }
    }

    if ($profondeur -ge $profondeurMax) { return }
    $enfant = $marcheur.GetFirstChild($el, $cr)
    while ($null -ne $enfant) {
      Visiter $enfant ($profondeur + 1) $nomTransmis
      if ($script:coupe) { return }
      $enfant = $marcheur.GetNextSibling($enfant, $cr)
    }
  }

  # Menus et listes ouverts par la fenetre : lus en premier, car ils sont au-dessus et ce sont
  # eux que l'etudiant voit apres un clic sur un bouton de menu.
  $menuOuvert = $false
  foreach ($annexe in [LectureFenetres]::Annexes($fg, [uint32]$pidFg, [uint32]$pidClassinus, $handleSuperposition)) {
    if ($script:coupe) { break }
    $avantAnnexe = $script:elements.Count
    try {
      $script:zoneCourante = 'menu ouvert'
      Visiter ($AE::FromHandle($annexe).GetUpdatedCache($cr)) 0 ''
    } catch { } finally { $script:zoneCourante = $null }
    if ($script:elements.Count -gt $avantAnnexe) { $menuOuvert = $true }
  }
  $resultat.menu_ouvert = $menuOuvert

  $racine = $AE::FromHandle($fg).GetUpdatedCache($cr)
  Visiter $racine 0 ''

  $resultat.coupe = $script:coupe
  if ($script:elements.Count -gt 0) { $resultat.mode = 'uia' }
  Sortir $resultat
} catch {
  Sortir @{ erreur = [string]$_.Exception.Message }
}
`;
}

function normaliserTableau<T>(valeur: unknown): T[] {
  if (Array.isArray(valeur)) return valeur as T[];
  if (valeur === null || valeur === undefined) return [];
  return [valeur as T];
}

function chaineOuNull(valeur: unknown): string | null {
  return typeof valeur === "string" ? valeur : null;
}

/**
 * Lit, en texte, la fenetre au premier plan (voir l'en-tete de ce fichier).
 * Renvoie {erreur} si la lecture est impossible (autre systeme que
 * Windows, PowerShell absent ou bloque, delai depasse, sortie illisible) :
 * l'appelant decide alors du repli.
 */
function lireUneFois(
  parametres: Record<string, unknown>,
  handleSuperposition: string,
  activerFenetre: boolean,
  lireTexteLong: boolean
): Promise<LectureFenetre | ErreurLecture> {
  if (process.platform !== "win32") {
    return Promise.resolve({ erreur: "La lecture de l'écran n'est disponible que sous Windows." });
  }

  const limites = limitesDepuisParametres(parametres);
  const script = construireScript(limites, process.pid, handleSuperposition, activerFenetre, lireTexteLong);

  // Le script est ecrit dans un fichier temporaire plutot que passe en -EncodedCommand :
  // le script encode approche la limite de 32 767 caracteres d'une ligne de commande
  // Windows, et un fichier evite aussi tout probleme d'encodage (BOM UTF-8 pour que
  // Windows PowerShell 5.1 lise correctement les accents).
  const fichierScript = join(tmpdir(), `classinus-lecture-${process.pid}-${randomBytes(6).toString("hex")}.ps1`);
  try {
    writeFileSync(fichierScript, "\uFEFF" + script, "utf8");
  } catch (e) {
    return Promise.resolve({
      erreur: `Lecture de l'écran impossible : écriture du script temporaire impossible (${e instanceof Error ? e.message : String(e)})`,
    });
  }
  const nettoyer = () => {
    try {
      unlinkSync(fichierScript);
    } catch {
      // deja supprime ou inaccessible : sans consequence
    }
  };

  return new Promise((resolve) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", fichierScript],
      {
        windowsHide: true,
        timeout: limites.delaiMaxMs + MARGE_DEMARRAGE_MS,
        maxBuffer: TAILLE_MAX_SORTIE_OCTETS,
        encoding: "utf8",
      },
      (erreur, sortie, sortieErreur) => {
        nettoyer();
        if (erreur && !sortie) {
          // Le message natif de Node contient tout le script encode (illisible, tres long) :
          // on ne garde que le code de sortie, le signal et le texte d'erreur de PowerShell.
          const detailErreur = String(sortieErreur ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
          const e = erreur as NodeJS.ErrnoException & { killed?: boolean; signal?: string | null };
          resolve({
            erreur:
              `Lecture de l'écran impossible : PowerShell a échoué (code ${String(e.code)}, signal ${String(e.signal ?? "aucun")}, ` +
              `arrêt forcé ${e.killed ? "oui" : "non"})` +
              (detailErreur ? ` : ${detailErreur}` : " sans message"),
            // Un arrêt forcé (délai dépassé) n'est pas un plantage : relancer doublerait l'attente.
            plantage: !e.killed,
          });
          return;
        }
        let brut: unknown;
        try {
          brut = JSON.parse(String(sortie).replace(/^\uFEFF/, "").trim());
        } catch {
          resolve({
            erreur: "Lecture de l'écran impossible : réponse illisible.",
            plantage: String(sortie ?? "").trim() === "",
          });
          return;
        }
        if (typeof brut !== "object" || brut === null) {
          resolve({ erreur: "Lecture de l'écran impossible : réponse inattendue." });
          return;
        }
        const r = brut as Record<string, unknown>;
        if (typeof r.erreur === "string") {
          resolve({ erreur: `Lecture de l'écran impossible : ${r.erreur}` });
          return;
        }
        resolve({
          titre_fenetre_active: chaineOuNull(r.titre_fenetre_active),
          application: chaineOuNull(r.application),
          fenetre_classinus: r.fenetre_classinus === true,
          fenetres_ouvertes: normaliserTableau<string>(r.fenetres_ouvertes).filter((t) => typeof t === "string"),
          elements: normaliserTableau<Record<string, unknown>>(r.elements).map((e) => ({
            type: String(e.type ?? ""),
            nom: String(e.nom ?? ""),
            valeur: chaineOuNull(e.valeur),
            valeur_masquee: e.valeur_masquee === true,
            etats: normaliserTableau<string>(e.etats).filter((s) => typeof s === "string"),
            x: Number(e.x) || 0,
            y: Number(e.y) || 0,
            gauche: Number(e.gauche) || 0,
            haut: Number(e.haut) || 0,
            largeur: Number(e.largeur) || 0,
            hauteur: Number(e.hauteur) || 0,
            ...(typeof e.zone === "string" ? { zone: e.zone } : {}),
          })),
          menu_ouvert: r.menu_ouvert === true,
          coupe: r.coupe === true,
          mode: r.mode === "uia" ? "uia" : "titre_seul",
        });
      }
    );
  });
}

/**
 * Filet de securite : lit d'abord normalement. Si PowerShell s'arrete
 * brutalement sans rien renvoyer (plantage de Windows dans la lecture du
 * texte long d'un document ou d'un champ), la lecture est relancee UNE fois
 * sans cette partie : Clovis recoit alors au moins la structure de la fenetre
 * (boutons, menus, champs courts, titres) au lieu de rien. Le resultat porte
 * alors texte_long_ignore = true. Pas de relance apres un delai depasse.
 */
export async function lireFenetreAuPremierPlan(
  parametres: Record<string, unknown>,
  handleSuperposition = "0",
  activerFenetre = false
): Promise<LectureFenetre | { erreur: string }> {
  const premiere = await lireUneFois(parametres, handleSuperposition, activerFenetre, true);
  if (!("erreur" in premiere)) return premiere;
  // activerFenetre ne lit aucun texte : rien a retirer, on ne relance pas.
  if (!premiere.plantage || activerFenetre) return { erreur: premiere.erreur };

  const seconde = await lireUneFois(parametres, handleSuperposition, activerFenetre, false);
  if ("erreur" in seconde) {
    return { erreur: `${premiere.erreur} | Nouvel essai sans lecture du texte long : ${seconde.erreur}` };
  }
  return { ...seconde, texte_long_ignore: true };
}
