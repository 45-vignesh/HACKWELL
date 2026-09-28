@echo off
echo ========================================================
echo   Running MediSentinel Automated Pytest Test Suite
echo ========================================================
cd /d "%~dp0\..\backend"
venv\Scripts\python.exe -m pytest -v
pause
