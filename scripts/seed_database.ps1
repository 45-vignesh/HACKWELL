# Seeds synthetic hospital dataset (15 medicines, 5 wards, 180 days history, suppliers, batches)
$Root = Split-Path -Parent $PSScriptRoot
& "$Root\backend\venv\Scripts\python.exe" "$Root\scripts\generate_synthetic_data.py"
