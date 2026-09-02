; MakeFullSetup.nsi
;
; Copies files necessary to do a "full" Timanthes installation.
; This includes the .NET Framework 1.1 installer, the PDN installer,
; and a Setup.exe "bootstrapper" taken from the VS 2k3 Bootstrapper
; Plugin. This "bootstrapper" is designed to basically do this:
;
;   if (.NET is not installed)
;   {
;       execute dotnetfx.exe
;   }
;   execute normal installer
;  
; After the PDN setup completes, the temp files will be deleted.

;--------------------------------

; The name of the installer
Name "Timanthes Full Setup SFX"

; The default installation directory
InstallDir $TEMP\PdnSetup

SilentInstall silent

VIAddVersionKey ProductName "Timanthes Full Setup"
VIAddVersionKey ProductVersion "2.3.0.0"
VIAddVersionKey FileVersion "2.3.0.0"
VIAddVersionKey LegalCopyright "Copyright © 2004-2006 Lars Verhoeff, Rick Brewster, Tom Jackson, Michael Kelsey, Brandon Ortiz, Craig Taylor, Chris Trevino, and Luke Walker. Portions Copyright © 2004, 2005 Microsoft Corporation. All Rights Reserved."
VIAddVersionKey FileDescription "Installs .NET Framework 1.1 and Timanthes."
VIProductVersion "2.3.0.0"

; The file to write
!ifdef Debug
  OutFile "..\Setup\Debug\PaintDotNetFull.exe"
!else
  OutFile "..\Setup\Release\PaintDotNetFull.exe"
!endif 

;--------------------------------

; Pages

;Page directory
;Page instfiles

;--------------------------------

; The stuff to install
Section "" ;No components page, name is not important
    
  ; Set output path to the installation directory.
  SetOutPath $INSTDIR
  
  ; Put file there
!ifdef Debug
  File ..\Setup\Debug\PaintDotNet.msi
!else
  File ..\Setup\Release\PaintDotNet.msi
!endif
  
  File Bootstrap\Setup.exe
  File Bootstrap\Settings.ini
  File ..\..\programs\dotnetfx.exe
  File Bootstrap\Config.ini

  ExecWait Setup.exe

  Delete $INSTDIR\Config.ini
  Delete $INSTDIR\dotnetfx.exe
  Delete $INSTDIR\Settings.ini
  Delete $INSTDIR\Setup.exe
  Delete $INSTDIR\PaintDotNet.msi
  RMDir $INSTDIR
  
SectionEnd ; end the section