# Windows dev tooling

## Local build & test

```powershell
# Build, sign with auto-generated per-machine dev cert
tools\windows\build-local.ps1

# Build + sign + install + launch
tools\windows\build-local.ps1 -Install -Run

# Replace an existing install (data-protected)
tools\windows\build-local.ps1 -Install -ForceUninstall -BackupData -Run

# Uninstall only (data-protected)
tools\windows\build-local.ps1 -Uninstall -BackupData

# Skip Gradle rebuild — just resign + install the most recent MSI
tools\windows\build-local.ps1 -InstallOnly -Install -Run

# Skip signing entirely (Windows will warn about an unknown publisher)
tools\windows\build-local.ps1 -NoSign
```

See `apps/windows/README.md` for the full developer guide, including
how local builds relate to CI signed builds and the GitHub Releases
rolling-main channel.

## What's in this folder

- `build-local.ps1` — the local build script. See file header for full flag docs.
- `dev-cert/` — auto-generated per-machine self-signed PFX exports. **Gitignored.**
  Each machine gets its own cert in `Cert:\CurrentUser\My`; the PFX in this folder
  is just a file-system round-trip for `signtool`.
