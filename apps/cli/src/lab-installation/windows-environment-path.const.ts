/**
 * Where a Windows user's own `PATH` is kept.
 *
 * An environment on Windows lives in the registry and not in any file a shell reads on the way up,
 * which is why nothing written into a startup file reaches cmd.exe or PowerShell. This is the key an
 * install adds its directory to, and it is what the operator is told was changed.
 */
export const WINDOWS_ENVIRONMENT_KEY = "HKCU\\Environment";

/** What separates one entry of `PATH` from the next on Windows. */
export const WINDOWS_PATH_SEPARATOR = ";";

/** How long to wait on a window that is not answering before giving up on telling it. */
export const SETTING_CHANGE_TIMEOUT_MS = 5000;

/**
 * Reads the user's `PATH` out of the registry, and says what kind of value it was found as.
 *
 * `DoNotExpandEnvironmentNames` is the whole point of reading it here rather than through
 * `[Environment]::GetEnvironmentVariable`, which hands back a value with every `%VAR%` in it already
 * expanded. Writing that back would bake one machine's answers into the operator's environment
 * permanently, and they would never be told it happened.
 *
 * The kind travels with it for the same reason. A `PATH` stored as `REG_EXPAND_SZ` and written back
 * as `REG_SZ` keeps every character it had and stops expanding any of them, which breaks whichever
 * of the operator's entries was written with a variable in it.
 */
export const READ_WINDOWS_PATH = `
$ErrorActionPreference = 'Stop'
$key = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Environment', $false)
$value = ''
$kind = 'ExpandString'
if ($null -ne $key) {
    if ($key.GetValueNames() -contains 'Path') {
        $value = $key.GetValue('Path', '', [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
        $kind = $key.GetValueKind('Path')
    }
    $key.Close()
}
[Console]::Out.Write((ConvertTo-Json -Compress @{ path = "$value"; kind = "$kind" }))
`;

/**
 * Writes the user's `PATH` back, then tells the desktop that it changed.
 *
 * The value arrives in the environment rather than in the script because a `PATH` holds whatever
 * characters the operator's own entries hold, and none of them should have to survive being quoted
 * into a command line.
 *
 * Without the broadcast the registry is right and nothing knows it: Explorer hands every terminal it
 * starts the environment it cached at login, so a new window would keep answering with the old
 * `PATH` until the operator logged out. `WM_SETTINGCHANGE` is what makes "open a new terminal" true.
 */
export const WRITE_WINDOWS_PATH = `
$ErrorActionPreference = 'Stop'
$key = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey('Environment', $true)
$key.SetValue('Path', $env:OPENLAB_WINDOWS_PATH, [Microsoft.Win32.RegistryValueKind]$env:OPENLAB_WINDOWS_PATH_KIND)
$key.Close()

Add-Type -Namespace OpenLab -Name Desktop -MemberDefinition @'
[DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam,
    uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);
'@

$answered = [UIntPtr]::Zero
[void][OpenLab.Desktop]::SendMessageTimeout([IntPtr]0xffff, 0x1A, [UIntPtr]::Zero, 'Environment', 2,
    ${SETTING_CHANGE_TIMEOUT_MS}, [ref]$answered)
`;

/** How the new value and its kind reach the script that writes them. */
export const WindowsPathVariable = {
    VALUE: "OPENLAB_WINDOWS_PATH",
    KIND: "OPENLAB_WINDOWS_PATH_KIND"
} as const;

/**
 * The two kinds a `PATH` is ever found stored as.
 *
 * Anything else the registry might answer with is written back as the expandable one, which is what
 * Windows itself creates a `PATH` as. A value with no `%` in it behaves the same either way, so this
 * costs an operator nothing and spares them a kind the registry would refuse.
 */
export const WindowsPathKind = {
    EXPANDABLE: "ExpandString",
    PLAIN: "String"
} as const;

export type WindowsPathKind = (typeof WindowsPathKind)[keyof typeof WindowsPathKind];
