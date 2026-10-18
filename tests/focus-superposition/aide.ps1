param([string]$Action, [string]$A = '', [int]$X = 0, [int]$Y = 0)
Add-Type @"
using System; using System.Runtime.InteropServices; using System.Text;
public class W {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, UIntPtr e);
}
"@
if ($Action -eq 'fg') {
  $h = [W]::GetForegroundWindow(); $s = New-Object System.Text.StringBuilder 256
  [void][W]::GetWindowText($h, $s, 256); Write-Output $s.ToString()
} elseif ($Action -eq 'touches') {
  Add-Type -AssemblyName System.Windows.Forms
  [System.Windows.Forms.SendKeys]::SendWait($A)
} elseif ($Action -eq 'clic') {
  $X = [int]$A.Split(',')[0]; $Y = [int]$A.Split(',')[1]
  [void][W]::SetCursorPos($X, $Y); Start-Sleep -Milliseconds 150
  [W]::mouse_event(0x2, 0, 0, 0, [UIntPtr]::Zero); Start-Sleep -Milliseconds 60
  [W]::mouse_event(0x4, 0, 0, 0, [UIntPtr]::Zero)
}
