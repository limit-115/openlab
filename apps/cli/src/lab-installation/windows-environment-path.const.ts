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

/**
 * How long to wait on one window that is not answering before giving up on telling it.
 *
 * Per window, not for the broadcast: Windows documents the total as this multiplied by the number
 * of top-level windows, and gives five seconds across three unresponsive windows as its own example
 * of a fifteen-second delay. A desktop has dozens. A window that is answering replies at once and
 * never reaches this, so the only thing a smaller number costs is the patience of a window that
 * would have answered between one second and five — and the only thing a larger one buys is minutes
 * of an install that has already finished its work sitting there saying nothing.
 */
export const SETTING_CHANGE_TIMEOUT_MS = 1000;

/**
 * What the script answers with when the `PATH` it was asked to replace is no longer the one it was
 * given. Anything else non-zero is a failure to write at all.
 */
export const PATH_CHANGED_UNDER_US = 3;

/** How many times a write is rebuilt on what it finds before the conflict is called permanent. */
export const WRITE_ATTEMPTS = 3;

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
 * Writes the user's `PATH` back if it is still the one the new value was built from, then tells the
 * desktop that it changed.
 *
 * The value arrives in the environment rather than in the script because a `PATH` holds whatever
 * characters the operator's own entries hold, and none of them should have to survive being quoted
 * into a command line.
 *
 * It is read once more and compared before anything is written. A `PATH` is read, changed and put
 * back, and another installer writing between those two moments would otherwise be undone by a
 * value that never knew about it — silently, and to an operator's environment rather than to
 * anything they could put back. Comparing here is not a lock, and a write can still land between
 * this comparison and the line under it; what it does is turn the common case of that race from a
 * lost entry into an answer the caller can act on.
 *
 * Without the broadcast the registry is right and nothing knows it: Explorer hands every terminal it
 * starts the environment it cached at login, so a new window would keep answering with the old
 * `PATH` until the operator logged out. `WM_SETTINGCHANGE` is what makes "open a new terminal" true.
 */
export const WRITE_WINDOWS_PATH = `
$ErrorActionPreference = 'Stop'
$key = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey('Environment', $true)

$now = ''
if ($key.GetValueNames() -contains 'Path') {
    $now = $key.GetValue('Path', '', [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
}
if ("$now" -ne $env:OPENLAB_WINDOWS_PATH_BEFORE) {
    $key.Close()
    exit ${PATH_CHANGED_UNDER_US}
}

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

/** How the new value, its kind, and the one it was built from reach the script that writes them. */
export const WindowsPathVariable = {
    VALUE: "OPENLAB_WINDOWS_PATH",
    KIND: "OPENLAB_WINDOWS_PATH_KIND",
    BEFORE: "OPENLAB_WINDOWS_PATH_BEFORE"
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
