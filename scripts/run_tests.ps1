# Executes full pytest test suite for backend, forecasting, agents and simulation
$Root = Split-Path -Parent $PSScriptRoot
Set-Location "$Root\backend"
& "$Root\backend\venv\Scripts\python.exe" -m pytest tests/test_api_endpoints.py -v
