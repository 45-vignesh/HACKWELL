@echo off
echo ========================================================
echo   Setting Up MediSentinel Complete Database & MIMIC-IV Data
echo ========================================================
cd /d "%~dp0\.."

echo [1/2] Seeding operational synthetic inventory and wards...
backend\venv\Scripts\python.exe scripts\generate_synthetic_data.py

echo.
echo [2/2] Ingesting and aggregating MIMIC-IV Clinical Database Demo...
backend\venv\Scripts\python.exe scripts\import_mimic.py

echo.
echo ========================================================
echo   MediSentinel Data Setup Complete!
echo ========================================================
pause
