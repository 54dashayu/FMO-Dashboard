param(
  [string]$ReleaseDir = "release"
)

$ErrorActionPreference = "Stop"

$artifacts = Get-ChildItem -Path $ReleaseDir -Filter "FMO-Dashboard-Windows-Desktop-*-Setup*.exe" -File

if ($artifacts.Count -eq 0) {
  Write-Error "No Windows desktop setup EXE files found in $ReleaseDir"
}

foreach ($artifact in $artifacts) {
  $signature = Get-AuthenticodeSignature -FilePath $artifact.FullName
  Write-Host "$($artifact.Name): $($signature.Status)"

  if ($signature.Status -ne "Valid") {
    if ($signature.SignerCertificate) {
      Write-Host "  Publisher: $($signature.SignerCertificate.Subject)"
      Write-Host "  Thumbprint: $($signature.SignerCertificate.Thumbprint)"
    }
    exit 1
  }
}
