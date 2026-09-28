import logging
from datetime import date, datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple, Set
import pandas as pd
from sqlalchemy.orm import Session
from app.data.mimic.mimic_reader import MIMICReader
from app.data.mimic.mimic_mapper import MIMICMapper

logger = logging.getLogger(__name__)

class MIMICUsageAggregator:
    """
    Safely extracts and aggregates medication events from MIMIC-IV demo files into
    daily medication usage histories.
    STRICT PRIVACY POLICY: Patient identifiers (subject_id, hadm_id) are never
    persisted or exposed; events are aggregated strictly into (medicine_id, date, quantity_used, source).
    """

    ADMIN_EVENTS = [
        "Administered",
        "Started",
        "Restarted",
        "Confirmed",
        "Applied",
        "Infiltration"
    ]

    def __init__(
        self,
        reader: MIMICReader,
        mapper: MIMICMapper,
        days_window: int = 180,
        target_end_date: Optional[date] = None
    ):
        self.reader = reader
        self.mapper = mapper
        if days_window is None or days_window <= 0:
            days_window = 180
        self.days_window = int(days_window)
        self.target_end_date = target_end_date or date.today()
        self._unique_source_drugs: Set[str] = set()
        self.last_metrics: Dict[str, Any] = {}

    def aggregate_daily_usage(
        self,
        target_end_date: Optional[date] = None,
        days_window: Optional[int] = None
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Processes EMAR and Prescriptions tables, maps medications, and aggregates daily usage.
        Maps the contiguous multi-year de-identified patient timeline onto the active
        operational evaluation window ending at `target_end_date` (defaults to today).
        """
        if target_end_date is None:
            target_end_date = self.target_end_date or date.today()
        if days_window is None or days_window <= 0:
            days_window = self.days_window
        days_window = int(days_window)

        metrics: Dict[str, Any] = {
            "records_read": 0,
            "records_used": 0,
            "records_skipped": 0,
            "unique_medicines_mapped": set(),
            "unique_raw_drugs_seen": set(),
            "date_range_start": None,
            "date_range_end": None,
            "total_daily_records": 0
        }

        # 1. Read EMAR administrations
        logger.info("Reading EMAR administration records...")
        emar_df = self.reader.read_table(
            "emar",
            usecols=["charttime", "medication", "event_txt"]
        )
        metrics["records_read"] += len(emar_df)

        emar_valid = emar_df[
            emar_df["medication"].notnull() &
            emar_df["charttime"].notnull() &
            emar_df["event_txt"].isin(self.ADMIN_EVENTS)
        ].copy()

        metrics["records_used"] += len(emar_valid)
        metrics["records_skipped"] += (len(emar_df) - len(emar_valid))

        # 2. Read Prescriptions for continuous IV fluids and scheduled oral orders
        logger.info("Reading Prescriptions records for continuous fluids and scheduled orders...")
        presc_df = self.reader.read_table(
            "prescriptions",
            usecols=["starttime", "drug", "dose_val_rx", "doses_per_24_hrs"]
        )
        metrics["records_read"] += len(presc_df)

        presc_valid = presc_df[
            presc_df["drug"].notnull() &
            presc_df["starttime"].notnull()
        ].copy()

        metrics["records_used"] += len(presc_valid)
        metrics["records_skipped"] += (len(presc_df) - len(presc_valid))

        # Extract timestamps
        emar_valid["ts"] = pd.to_datetime(emar_valid["charttime"], errors="coerce")
        emar_valid = emar_valid[emar_valid["ts"].notnull()].copy()
        emar_valid["raw_date"] = emar_valid["ts"].dt.date

        presc_valid["ts"] = pd.to_datetime(presc_valid["starttime"], errors="coerce")
        presc_valid = presc_valid[presc_valid["ts"].notnull()].copy()
        presc_valid["raw_date"] = presc_valid["ts"].dt.date

        # 3. Create a stable, ordered date-mapping table to anchor MIMIC timeline into operational window
        all_raw_dates = sorted(list(set(emar_valid["raw_date"].unique()).union(set(presc_valid["raw_date"].unique()))))
        if not all_raw_dates:
            logger.warning("No valid dates found in MIMIC dataset.")
            return [], metrics

        # Map each distinct chronological date modulo days_window
        date_to_target_date: Dict[date, date] = {}
        for idx, r_date in enumerate(all_raw_dates):
            day_slot = idx % days_window
            target_date = target_end_date - timedelta(days=(days_window - 1 - day_slot))
            date_to_target_date[r_date] = target_date

        # 4. Map medications and aggregate daily quantities
        daily_buckets: Dict[Tuple[int, date, str], Dict[str, Any]] = {}

        # A. Process EMAR bedside administrations (source = 'MIMIC')
        for _, row in emar_valid.iterrows():
            raw_drug = str(row["medication"])
            metrics["unique_raw_drugs_seen"].add(raw_drug)
            raw_d = row["raw_date"]

            mapping = self.mapper.map_medication(raw_drug)
            if not mapping["matched"]:
                continue

            med_id = mapping["medicine_id"]
            metrics["unique_medicines_mapped"].add(med_id)

            target_date = date_to_target_date.get(raw_d)
            if not target_date:
                continue

            source = "MIMIC"
            key = (med_id, target_date, source)

            if key not in daily_buckets:
                daily_buckets[key] = {
                    "medicine_id": med_id,
                    "date": target_date,
                    "quantity_used": 0.0,
                    "source": source,
                    "source_record_count": 0
                }

            # Standard unit administration (1 vial, ampoule, tablet, or unit)
            daily_buckets[key]["quantity_used"] += 1.0
            daily_buckets[key]["source_record_count"] += 1

        # B. Process Prescriptions for continuous IV fluids and high-volume orders (source = 'DERIVED')
        fluid_codes = ["MED-IVF-NS", "MED-IVF-RL", "MED-IVF-D5"]
        for _, row in presc_valid.iterrows():
            raw_drug = str(row["drug"])
            metrics["unique_raw_drugs_seen"].add(raw_drug)
            raw_d = row["raw_date"]

            mapping = self.mapper.map_medication(raw_drug)
            if not mapping["matched"] or mapping["medicine_code"] not in fluid_codes:
                continue

            med_id = mapping["medicine_id"]
            metrics["unique_medicines_mapped"].add(med_id)

            target_date = date_to_target_date.get(raw_d)
            if not target_date:
                continue

            source = "DERIVED"  # Derived from in-hospital prescription orders
            key = (med_id, target_date, source)

            if key not in daily_buckets:
                daily_buckets[key] = {
                    "medicine_id": med_id,
                    "date": target_date,
                    "quantity_used": 0.0,
                    "source": source,
                    "source_record_count": 0
                }

            doses = row["doses_per_24_hrs"]
            qty = float(doses) if pd.notnull(doses) and doses > 0 else 1.0
            daily_buckets[key]["quantity_used"] += qty
            daily_buckets[key]["source_record_count"] += 1

        # Round quantities for clean precision
        for item in daily_buckets.values():
            item["quantity_used"] = round(item["quantity_used"], 1)

        # Convert to list and sort by medicine_id and date
        aggregated_list = list(daily_buckets.values())
        aggregated_list.sort(key=lambda x: (x["medicine_id"], x["date"]))

        metrics["total_daily_records"] = len(aggregated_list)
        if aggregated_list:
            metrics["date_range_start"] = min(r["date"] for r in aggregated_list).strftime("%Y-%m-%d")
            metrics["date_range_end"] = max(r["date"] for r in aggregated_list).strftime("%Y-%m-%d")

        self._unique_source_drugs = set(metrics["unique_raw_drugs_seen"])
        self.last_metrics = metrics

        logger.info(
            f"MIMIC aggregation complete: {len(aggregated_list)} daily usage records "
            f"across {len(metrics['unique_medicines_mapped'])} medicines."
        )

        return aggregated_list, metrics

    def aggregate_all(
        self,
        target_end_date: Optional[date] = None,
        days_window: Optional[int] = None
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Executes complete medication extraction and daily aggregation across MIMIC tables.
        Alias for aggregate_daily_usage.
        """
        return self.aggregate_daily_usage(
            target_end_date=target_end_date,
            days_window=days_window
        )

    def get_unique_source_drugs(self) -> List[str]:
        """
        Returns sorted list of unique raw medication names extracted from MIMIC tables.
        """
        if self._unique_source_drugs:
            return sorted(list(self._unique_source_drugs))

        drugs: Set[str] = set()
        try:
            emar_df = self.reader.read_table("emar", usecols=["medication"])
            drugs.update(emar_df["medication"].dropna().astype(str).unique())
        except Exception as e:
            logger.warning(f"Could not extract drugs from emar: {e}")

        try:
            presc_df = self.reader.read_table("prescriptions", usecols=["drug"])
            drugs.update(presc_df["drug"].dropna().astype(str).unique())
        except Exception as e:
            logger.warning(f"Could not extract drugs from prescriptions: {e}")

        self._unique_source_drugs = drugs
        return sorted(list(self._unique_source_drugs))
