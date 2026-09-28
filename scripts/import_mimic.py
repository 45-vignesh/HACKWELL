"""
Repeatable CLI Ingestion Script for MIMIC-IV Clinical Database Demo.
Imports medication data, maps to MediSentinel formulary, aggregates daily usage,
and populates PostgreSQL database with data quality logging and idempotent deduplication.

Usage:
    python scripts/import_mimic.py [--data-dir PATH] [--days 180]
"""

import sys
import argparse
import logging
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.data.mimic.importer import run_import

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import MIMIC-IV Clinical Database Demo into MediSentinel")
    parser.add_argument("--data-dir", type=str, default=None, help="Path to MIMIC hosp directory")
    parser.add_argument("--days", type=int, default=180, help="Days window for historical daily usage")
    args = parser.parse_args()

    run_import(data_dir=args.data_dir, days_window=args.days)
