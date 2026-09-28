@echo off
echo ========================================================
echo   Seeding MediSentinel Synthetic Hospital Database
echo ========================================================
cd /d "%~dp0\.."
backend\venv\Scripts\python.exe scripts\generate_synthetic_data.py
pause
