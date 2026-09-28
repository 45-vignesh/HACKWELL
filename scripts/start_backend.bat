@echo off
echo ========================================================
echo   Starting MediSentinel FastAPI Backend Server (Port 8000)
echo ========================================================
cd /d "%~dp0\..\backend"
venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
