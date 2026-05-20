Unicode true
ManifestDPIAware true

!ifndef SOURCE_DIR
  !error "SOURCE_DIR is required"
!endif

!ifndef OUTPUT_EXE
  !define OUTPUT_EXE "FMO-Dashboard-Windows-Portable.exe"
!endif

Name "FMO仪表盘"
OutFile "${OUTPUT_EXE}"
InstallDir "$LOCALAPPDATA\FMO-Dashboard-Portable"
RequestExecutionLevel user
SilentInstall normal
SetCompressor /SOLID lzma
ShowInstDetails nevershow
AutoCloseWindow true

VIProductVersion "0.98.0.0"
VIAddVersionKey /LANG=2052 "ProductName" "FMO仪表盘"
VIAddVersionKey /LANG=2052 "CompanyName" "BH1JSS"
VIAddVersionKey /LANG=2052 "FileDescription" "FMO仪表盘 Windows 便携启动器"
VIAddVersionKey /LANG=2052 "FileVersion" "0.98.0"
VIAddVersionKey /LANG=2052 "ProductVersion" "0.98.0"
VIAddVersionKey /LANG=2052 "LegalCopyright" "MIT License"

Section "FMO仪表盘 Portable"
  SetOutPath "$INSTDIR"
  RMDir /r "$INSTDIR"
  SetOutPath "$INSTDIR"
  File /r "${SOURCE_DIR}\*.*"

  DetailPrint "Starting FMO仪表盘..."
  Exec '"$SYSDIR\wscript.exe" "$INSTDIR\start-windows-hidden.vbs"'
SectionEnd
