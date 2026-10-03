// Compilation unique du code C# utilise par les scripts PowerShell (03/10/2026,
// demande Bourama : la lecture de l'ecran et les clics etaient tres lents).
//
// Avant : chaque lecture et chaque clic lancait un PowerShell qui recompilait
// tout le code C# (plusieurs secondes a chaque fois). Maintenant : le code est
// compile une seule fois, range dans un fichier .dll du dossier temporaire
// (nom lie au contenu du code, donc un code modifie ne reprend jamais un vieux
// fichier), puis simplement charge aux fois suivantes.
//
// Filet de securite : si le fichier ne peut pas etre lu ou ecrit (acces
// refuse, fichier en cours d'ecriture par un autre processus), le script
// retombe sur la compilation directe d'avant, donc le comportement reste le
// meme, seulement plus lent.
import { createHash } from "node:crypto";

export function blocCompilationUnique(nomType: string, codeCsharp: string): string {
  if (!/^[A-Za-z0-9_]+$/.test(nomType)) throw new Error("Nom de type invalide");
  const empreinte = createHash("sha256").update(codeCsharp).digest("hex").slice(0, 16);
  return `
$dossierTmp = [System.IO.Path]::GetTempPath()
$dllFinale = Join-Path $dossierTmp 'classinus-natif-${empreinte}.dll'
$codeCs = @'
${codeCsharp}
'@
if (Test-Path -LiteralPath $dllFinale) { try { Add-Type -Path $dllFinale } catch { } }
if (-not ('${nomType}' -as [type])) {
  try {
    $dllTmp = Join-Path $dossierTmp ('classinus-natif-${empreinte}-' + [guid]::NewGuid().ToString('N') + '.dll')
    Add-Type -TypeDefinition $codeCs -OutputAssembly $dllTmp
    if (-not ('${nomType}' -as [type])) { Add-Type -Path $dllTmp }
    $copie = $dllFinale + '.' + [guid]::NewGuid().ToString('N')
    try {
      Copy-Item -LiteralPath $dllTmp -Destination $copie -ErrorAction Stop
      Move-Item -LiteralPath $copie -Destination $dllFinale -ErrorAction Stop
    } catch { try { Remove-Item -LiteralPath $copie -ErrorAction SilentlyContinue } catch { } }
    try { Remove-Item -LiteralPath $dllTmp -ErrorAction SilentlyContinue } catch { }
  } catch { }
}
if (-not ('${nomType}' -as [type])) { Add-Type -TypeDefinition $codeCs }
`;
}
