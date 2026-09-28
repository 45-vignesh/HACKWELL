import os
import gzip
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Generator
import pandas as pd

logger = logging.getLogger(__name__)

class MIMICReader:
    """
    Stream-oriented, memory-efficient reader for MIMIC-IV Clinical Database Demo hosp tables.
    Reads .csv.gz files using chunking and column projection to minimize RAM footprint.
    """

    DEFAULT_SEARCH_PATHS = [
        Path(r"D:\hackwell\datasets\mimic-iv-clinical-database-demo-2.2\hosp"),
        Path(r"D:\hackwell\datasets\mimic-iv-clinical-database-demo-2.2"),
        Path(r"D:\hackwell\datasets\mimic-iv-demo-2.2\hosp"),
        Path(r"D:\hackwell\datasets\mimic-iv-demo-2.2"),
        Path(r"C:\Users\DELL\Downloads\mimic-iv-clinical-database-demo-2.2\mimic-iv-clinical-database-demo-2.2\hosp"),
        Path(r"C:\Users\DELL\Downloads\mimic-iv-clinical-database-demo-2.2\mimic-iv-clinical-database-demo-2.2"),
        Path(r"C:\Users\DELL\Downloads\mimic-iv-demo-2.2\hosp"),
        Path(r"C:\Users\DELL\Downloads\mimic-iv-demo-2.2"),
    ]

    EXPECTED_TABLES = [
        "emar",
        "emar_detail",
        "prescriptions",
        "pharmacy",
        "admissions",
        "transfers",
    ]

    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = self.resolve_data_dir(data_dir)
        logger.info(f"MIMICReader initialized with directory: {self.data_dir}")

    @classmethod
    def resolve_data_dir(cls, user_path: Optional[str] = None) -> Path:
        """
        Locates the directory containing the hosp .csv.gz files.
        Checks user_path, MIMIC_DATA_DIR environment variable, and DEFAULT_SEARCH_PATHS.
        """
        candidates: List[Path] = []
        if user_path:
            p = Path(user_path)
            candidates.extend([p, p / "hosp", p / "mimic-iv-clinical-database-demo-2.2" / "hosp"])

        env_dir = os.environ.get("MIMIC_DATA_DIR")
        if env_dir:
            ep = Path(env_dir)
            candidates.extend([ep, ep / "hosp"])

        try:
            from app.config import settings
            if hasattr(settings, "MIMIC_DATA_DIR") and settings.MIMIC_DATA_DIR:
                sp = Path(settings.MIMIC_DATA_DIR)
                candidates.extend([sp, sp / "hosp"])
        except Exception:
            pass

        candidates.extend(cls.DEFAULT_SEARCH_PATHS)

        for candidate in candidates:
            if candidate.exists() and candidate.is_dir():
                # Check if at least emar.csv.gz or prescriptions.csv.gz exists
                if (candidate / "emar.csv.gz").exists() or (candidate / "prescriptions.csv.gz").exists():
                    return candidate.resolve()
                # Check if nested hosp directory exists
                if (candidate / "hosp" / "emar.csv.gz").exists():
                    return (candidate / "hosp").resolve()

        raise FileNotFoundError(
            "Could not locate MIMIC-IV Clinical Database Demo files. "
            "Please ensure the dataset is located at Downloads/mimic-iv-clinical-database-demo-2.2/ "
            "or copied into D:\\hackwell\\datasets\\mimic-iv-demo-2.2\\"
        )

    def get_table_path(self, table_name: str) -> Path:
        """
        Returns the resolved file path for a table (.csv.gz or .csv).
        """
        clean_name = table_name.replace(".csv.gz", "").replace(".csv", "")
        gz_path = self.data_dir / f"{clean_name}.csv.gz"
        if gz_path.exists():
            return gz_path
        csv_path = self.data_dir / f"{clean_name}.csv"
        if csv_path.exists():
            return csv_path
        raise FileNotFoundError(f"Table file '{table_name}' not found in {self.data_dir}")

    def list_available_files(self) -> Dict[str, Dict[str, Any]]:
        """
        Inspects directory and returns metadata for each expected table.
        """
        meta = {}
        for tbl in self.EXPECTED_TABLES:
            try:
                p = self.get_table_path(tbl)
                size_bytes = p.stat().st_size
                meta[tbl] = {
                    "found": True,
                    "path": str(p),
                    "size_bytes": size_bytes,
                    "size_mb": round(size_bytes / (1024 * 1024), 2),
                }
            except FileNotFoundError:
                meta[tbl] = {"found": False, "path": None, "size_bytes": 0, "size_mb": 0}
        return meta

    def read_table(
        self,
        table_name: str,
        usecols: Optional[List[str]] = None,
        nrows: Optional[int] = None,
        chunksize: Optional[int] = None
    ) -> Any:
        """
        Reads a table into a DataFrame or DataFrame chunk iterator.
        """
        path = self.get_table_path(table_name)
        return pd.read_csv(
            path,
            usecols=usecols,
            nrows=nrows,
            chunksize=chunksize,
            low_memory=False
        )

    def count_rows(self, table_name: str) -> int:
        """
        Fast line count without loading the whole table into memory.
        """
        path = self.get_table_path(table_name)
        if str(path).endswith(".gz"):
            with gzip.open(path, "rt", encoding="utf-8", errors="ignore") as f:
                return sum(1 for _ in f) - 1
        else:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                return sum(1 for _ in f) - 1
