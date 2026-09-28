# Launches MediSentinel React Command Center frontend on port 5173
$Root = Split-Path -Parent $PSScriptRoot
Set-Location "$Root\frontend"
npm run dev
