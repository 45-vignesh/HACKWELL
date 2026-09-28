@echo off
echo ========================================================
echo   Running MediSentinel System Diagnostic Health Check
echo ========================================================
cd /d "%~dp0\.."
backend\venv\Scripts\python.exe scripts\check_system.py
pause
