@echo off
echo ========================================================
echo   Starting MediSentinel React Command Center (Port 5173)
echo ========================================================
cd /d "%~dp0\..\frontend"
npm run dev
pause
