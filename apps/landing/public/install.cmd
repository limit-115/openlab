@echo off
:: OpenLab installer for Windows, for a plain command prompt.
::
::     curl -fsSL https://openlab.bot/install.cmd -o install.cmd && install.cmd && del install.cmd
::
:: A command prompt has no way to verify a download or read a manifest, and writing one here would
:: mean a second installer to keep honest. So this hands straight over to install.ps1, which is the
:: one that does the work. PowerShell ships with every supported Windows, so nothing is installed to
:: make this possible.
::
:: This entry point takes no options: a script piped into `iex` has no parameters to receive them.
:: Anyone who needs one runs install.ps1 directly, which is what its own help describes.
setlocal

if "%OPENLAB_RELEASES_URL%"=="" set "OPENLAB_RELEASES_URL=https://github.com/limit-115/openlab/releases"

where powershell >nul 2>&1
if errorlevel 1 (
    echo.
    echo error: This installer needs Windows PowerShell and cannot find it.
    exit /b 1
)

:: -NoProfile so an operator's own profile cannot change what an install does, and -ExecutionPolicy
:: Bypass for this one process only, which is what lets the script run on a default Windows without
:: changing a machine-wide setting on the operator's behalf.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ErrorActionPreference='Stop'; iex (irm '%OPENLAB_RELEASES_URL%/latest/download/install.ps1')"

exit /b %ERRORLEVEL%
