# Launches MediSentinel FastAPI backend on port 8000
$Root = Split-Path -Parent $PSScriptRoot
Set-Location "$Root\backend"
& "$Root\backend\venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
