Unicode true
ManifestDPIAware true

!ifndef SOURCE_DIR
  !error "SOURCE_DIR is required"
!endif

!ifndef OUTPUT_EXE
  !define OUTPUT_EXE "FMO-Dashboard-Windows-Portable.exe"
!endif

!ifndef ICON_FILE
  !define ICON_FILE "src-tauri\icons\icon.ico"
!endif

!ifndef APP_VERSION
  !define APP_VERSION "1.0.0"
!endif

Name "FMO仪表盘"
OutFile "${OUTPUT_EXE}"
Icon "${ICON_FILE}"
InstallDir "$LOCALAPPDATA\FMO-Dashboard-Portable"
RequestExecutionLevel user
Caption "FMO仪表盘 v${APP_VERSION}"
BrandingText "FMO仪表盘 v${APP_VERSION}"
CompletedText "FMO仪表盘已启动"
SilentInstall silent
SetCompressor /SOLID lzma
ShowInstDetails nevershow
AutoCloseWindow true

VIProductVersion "${APP_VERSION}.0"
VIAddVersionKey /LANG=2052 "ProductName" "FMO仪表盘"
VIAddVersionKey /LANG=2052 "CompanyName" "BH1JSS"
VIAddVersionKey /LANG=2052 "FileDescription" "FMO仪表盘 Windows 便携启动器"
VIAddVersionKey /LANG=2052 "FileVersion" "${APP_VERSION}"
VIAddVersionKey /LANG=2052 "ProductVersion" "${APP_VERSION}"
VIAddVersionKey /LANG=2052 "LegalCopyright" "MIT License"

Section "FMO仪表盘 Portable"
  SetOutPath "$INSTDIR"
  RMDir /r "$INSTDIR"
  SetOutPath "$INSTDIR"
  File /r "${SOURCE_DIR}\*.*"

  DetailPrint "FMO仪表盘 v${APP_VERSION}"
  DetailPrint "正在准备便携运行环境..."
  DetailPrint "正在加载本地服务..."
  Exec '"$SYSDIR\wscript.exe" "$INSTDIR\start-windows-hidden.vbs"'
SectionEnd
