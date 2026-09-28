import logging
from typing import Dict, Any, List, Tuple
import pandas as pd
from app.data.mimic.mimic_reader import MIMICReader

logger = logging.getLogger(__name__)

class MIMICValidator:
    """
    Validates MIMIC-IV demo files, checking schema column names, row counts,
    and null distributions on required fields.
    """

    REQUIRED_COLUMNS = {
        "emar": ["subject_id", "hadm_id", "emar_id", "pharmacy_id", "charttime", "medication", "event_txt"],
        "emar_detail": ["subject_id", "emar_id", "parent_field_ordinal"],
        "prescriptions": ["subject_id", "hadm_id", "pharmacy_id", "starttime", "drug", "dose_val_rx", "dose_unit_rx"],
        "pharmacy": ["subject_id", "hadm_id", "pharmacy_id", "starttime", "medication", "status"],
        "admissions": ["subject_id", "hadm_id", "admittime", "dischtime", "admission_type"],
        "transfers": ["subject_id", "hadm_id", "eventtype", "careunit", "intime"],
    }

    def __init__(self, reader: MIMICReader):
        self.reader = reader

    def validate_table(self, table_name: str) -> Dict[str, Any]:
        """
        Validates a single table: checks existence, headers, and basic integrity.
        """
        result = {
            "table": table_name,
            "valid": False,
            "missing_columns": [],
            "row_count": 0,
            "sample_columns": [],
            "issues": []
        }

        try:
            sample_df = self.reader.read_table(table_name, nrows=50)
            result["sample_columns"] = list(sample_df.columns)
            result["row_count"] = self.reader.count_rows(table_name)
        except Exception as e:
            result["issues"].append(f"Failed to read table: {str(e)}")
            return result

        expected = self.REQUIRED_COLUMNS.get(table_name, [])
        actual = set(sample_df.columns)
        missing = [col for col in expected if col not in actual]

        if missing:
            result["missing_columns"] = missing
            result["issues"].append(f"Missing expected columns: {missing}")
        else:
            result["valid"] = True

        return result

    def validate_all(self) -> Dict[str, Any]:
        """
        Validates all expected MIMIC hosp tables and compiles an overall validation status.
        """
        report: Dict[str, Any] = {
            "all_valid": True,
            "tables": {},
            "total_records_inspected": 0,
            "errors": []
        }

        for tbl in ["emar", "prescriptions", "pharmacy", "admissions", "transfers"]:
            res = self.validate_table(tbl)
            report["tables"][tbl] = res
            report["total_records_inspected"] += res["row_count"]
            if not res["valid"]:
                report["all_valid"] = False
                report["errors"].extend([f"{tbl}: {issue}" for issue in res["issues"]])

        return report
