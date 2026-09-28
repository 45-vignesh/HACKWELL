from datetime import datetime, date
from typing import Dict, Any, List, Tuple, Optional
from sqlalchemy.orm import Session
from app.models.entities import Medicine, Ward, Inventory, TrustStatus

class ValidationResult:
    def __init__(
        self,
        is_valid: bool,
        status: TrustStatus,
        message: str,
        errors: Optional[List[str]] = None,
        warnings: Optional[List[str]] = None
    ):
        self.is_valid = is_valid
        self.status = status
        self.message = message
        self.errors = errors or []
        self.warnings = warnings or []

class InventoryValidator:
    """
    Hospital Data Governance & Validation Engine.
    Prevents invalid, untrusted, or corrupted operational data from entering the database
    and reaching autonomous AI decision agents.
    """

    @staticmethod
    def validate_stock_update(
        db: Session,
        inventory_id: int,
        new_stock: int,
        reason: Optional[str] = None,
        override_warning: bool = False
    ) -> ValidationResult:
        """
        Validates manual stock adjustment on existing operational inventory item.
        """
        inv = db.query(Inventory).filter(Inventory.id == inventory_id).first()
        if not inv:
            return ValidationResult(
                is_valid=False,
                status=TrustStatus.REJECTED,
                message="Inventory item not found.",
                errors=["Inventory record does not exist in hospital database."]
            )

        errors: List[str] = []
        warnings: List[str] = []

        # 1. Non-negative check
        if new_stock < 0:
            errors.append(f"Current stock cannot be negative (submitted: {new_stock}).")

        # 2. Reason requirement
        trimmed_reason = (reason or "").strip()
        if not trimmed_reason:
            errors.append("A documented reason is mandatory for manual stock adjustments.")

        if errors:
            return ValidationResult(
                is_valid=False,
                status=TrustStatus.REJECTED,
                message="Stock adjustment rejected due to data validation violations.",
                errors=errors
            )

        # 3. Abnormal Jump Detection (Fluctuation Check)
        old_stock = inv.current_stock
        stock_diff = abs(new_stock - old_stock)
        percent_change = (stock_diff / max(old_stock, 1)) * 100.0

        if stock_diff >= 500 or (old_stock > 10 and percent_change >= 100.0):
            warning_msg = (
                f"Large stock change detected ({old_stock} -> {new_stock}, Δ {stock_diff} units / {percent_change:.1f}%). "
                "Please verify the physical inventory and provide a detailed reason."
            )
            warnings.append(warning_msg)

            # If user has not confirmed override with reason
            if not override_warning:
                return ValidationResult(
                    is_valid=True,
                    status=TrustStatus.WARNING,
                    message=warning_msg,
                    warnings=warnings
                )

        return ValidationResult(
            is_valid=True,
            status=TrustStatus.VALIDATED,
            message="Stock update validated successfully.",
            warnings=warnings
        )

    @staticmethod
    def validate_single_record(
        db: Session,
        row: Dict[str, Any],
        existing_keys: Optional[set] = None
    ) -> Dict[str, Any]:
        """
        Validates an inventory row during manual entry or CSV batch ingestion.
        Returns:
            dict containing:
                is_valid: bool
                status: str (VALIDATED, WARNING, REJECTED)
                errors: list
                warnings: list
                cleaned_data: dict
        """
        errors: List[str] = []
        warnings: List[str] = []

        med_code = str(row.get("medicine_code") or "").strip()
        ward_code = str(row.get("ward_code") or "").strip()

        med_name_input = str(row.get("medicine_name") or "").strip()
        ward_name_input = str(row.get("ward_name") or "").strip()

        if not med_code and not med_name_input:
            errors.append("Medicine code or name is required.")
        if not ward_code and not ward_name_input:
            errors.append("Ward code or name is required.")

        # Check medicine existence
        med = None
        if med_code:
            med = db.query(Medicine).filter(
                (Medicine.code.ilike(med_code)) | (Medicine.name.ilike(med_code))
            ).first()

            if not med:
                # Check known manual dataset code aliases
                alias_map = {
                    "MED-PARA": "MED-AIN-PCM-TAB",
                    "MED-CFT": "MED-ANT-CEF",
                    "MED-AZI": "MED-AZI-500",
                    "MED-OND": "MED-GIT-OND",
                    "MED-RLG": "MED-IVF-RL",
                    "MED-NS9": "MED-IVF-NS",
                    "MED-D5": "MED-IVF-D5",
                    "MED-FUR": "MED-FUR-40",
                    "MED-INS": "MED-DIA-INS",
                    "MED-HEP": "MED-HEP-5000",
                    "MED-CEFTRX": "MED-ANT-CEF",
                    "MED-PARACET": "MED-AIN-PCM-TAB",
                    "MED-DEXTR5": "MED-IVF-D5",
                    "MED-INSULIN": "MED-DIA-INS",
                    "MED-SALBUT": "MED-AIN-PCM-TAB"
                }
                target_code = alias_map.get(med_code.upper())
                if target_code:
                    med = db.query(Medicine).filter(Medicine.code == target_code).first()

        if not med and med_name_input:
            med = db.query(Medicine).filter(
                (Medicine.name.ilike(f"%{med_name_input}%")) | (Medicine.code.ilike(f"%{med_name_input}%"))
            ).first()

        if not med:
            errors.append(f"Medicine '{med_code or med_name_input}' does not exist in master formulary.")

        # Check ward existence
        ward = None
        if ward_code:
            ward = db.query(Ward).filter(
                (Ward.code.ilike(ward_code)) | (Ward.name.ilike(ward_code))
            ).first()

            if not ward:
                ward_alias_map = {
                    "EMR": "WARD-EMERG",
                    "ICU": "WARD-MICU",
                    "OPD": "WARD-OPD",
                    "PED": "WARD-PED",
                    "GEN": "WARD-GENMED",
                    "WARD-ICU": "WARD-MICU",
                    "WARD-EMERG": "WARD-EMERG",
                    "WARD-INPAT": "WARD-GENMED"
                }
                target_ward = ward_alias_map.get(ward_code.upper())
                if target_ward:
                    ward = db.query(Ward).filter(Ward.code == target_ward).first()

        if not ward and ward_name_input:
            ward = db.query(Ward).filter(
                (Ward.name.ilike(f"%{ward_name_input}%")) | (Ward.code.ilike(f"%{ward_name_input}%"))
            ).first()

        if not ward:
            errors.append(f"Ward '{ward_code or ward_name_input}' does not exist in hospital departments.")

        # Duplicate detection within batch / database
        key = (med_code.upper(), ward_code.upper())
        if existing_keys is not None:
            if key in existing_keys:
                errors.append(f"Duplicate entry detected for medicine '{med_code}' in ward '{ward_code}'.")
            else:
                existing_keys.add(key)

        # Numeric field validations
        try:
            current_stock = int(row.get("current_stock", 0))
            if current_stock < 0:
                errors.append(f"Current stock cannot be negative (value: {current_stock}).")
        except (ValueError, TypeError):
            errors.append(f"Current stock must be a valid integer.")
            current_stock = 0

        try:
            safety_stock = int(row.get("safety_stock", 30))
            if safety_stock < 0:
                errors.append("Safety stock cannot be negative.")
        except (ValueError, TypeError):
            errors.append("Safety stock must be a valid integer.")
            safety_stock = 30

        try:
            reorder_point = int(row.get("reorder_point", 50))
            if reorder_point < 0:
                errors.append("Reorder point cannot be negative.")
        except (ValueError, TypeError):
            errors.append("Reorder point must be a valid integer.")
            reorder_point = 50

        try:
            avg_daily_usage = float(row.get("avg_daily_usage", 10.0))
            if avg_daily_usage < 0:
                errors.append("Average daily usage cannot be negative.")
        except (ValueError, TypeError):
            errors.append("Average daily usage must be a valid number.")
            avg_daily_usage = 10.0

        # Date validations
        expiry_date_str = str(row.get("expiry_date") or "").strip()
        received_date_str = str(row.get("received_date") or "").strip()

        parsed_exp = None
        parsed_rec = None

        if expiry_date_str:
            try:
                parsed_exp = datetime.strptime(expiry_date_str, "%Y-%m-%d").date()
            except ValueError:
                errors.append(f"Invalid expiry date format: '{expiry_date_str}'. Expected YYYY-MM-DD.")

        if received_date_str:
            try:
                parsed_rec = datetime.strptime(received_date_str, "%Y-%m-%d").date()
            except ValueError:
                errors.append(f"Invalid received date format: '{received_date_str}'. Expected YYYY-MM-DD.")

        if parsed_exp and parsed_rec:
            if parsed_exp < parsed_rec:
                errors.append(f"Expiry date ({parsed_exp}) cannot be earlier than received date ({parsed_rec}).")

        # Abnormal value warnings
        if med and ward:
            existing_inv = db.query(Inventory).filter(
                Inventory.medicine_id == med.id,
                Inventory.ward_id == ward.id
            ).first()
            if existing_inv and existing_inv.current_stock > 0:
                old_s = existing_inv.current_stock
                if current_stock >= old_s * 2 or abs(current_stock - old_s) >= 500:
                    warnings.append(
                        f"Abnormal stock jump: current stock {old_s} changing to {current_stock} "
                        f"(change of {abs(current_stock - old_s)} units)."
                    )

        if current_stock > 2000:
            warnings.append(f"Abnormally high current stock ({current_stock} units). Potential data entry scale error.")

        if current_stock == 0:
            warnings.append("Stock entered as 0 (complete stockout condition).")

        # Determine trust status
        if errors:
            status = TrustStatus.REJECTED.value
            is_valid = False
        elif warnings:
            status = TrustStatus.WARNING.value
            is_valid = True
        else:
            status = TrustStatus.VALIDATED.value
            is_valid = True

        return {
            "is_valid": is_valid,
            "status": status,
            "medicine_code": med_code,
            "medicine_id": med.id if med else None,
            "medicine_name": med.name if med else row.get("medicine_name", med_code),
            "ward_code": ward_code,
            "ward_id": ward.id if ward else None,
            "ward_name": ward.name if ward else row.get("ward_name", ward_code),
            "current_stock": current_stock,
            "safety_stock": safety_stock,
            "reorder_point": reorder_point,
            "avg_daily_usage": avg_daily_usage,
            "batch_number": row.get("batch_number"),
            "expiry_date": parsed_exp.strftime("%Y-%m-%d") if parsed_exp else None,
            "received_date": parsed_rec.strftime("%Y-%m-%d") if parsed_rec else None,
            "errors": errors,
            "warnings": warnings
        }

    @staticmethod
    def validate_csv_batch(
        db: Session,
        rows: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Validates an entire batch of inventory rows.
        Categorizes each row into VALID, WARNING, or REJECTED.
        """
        total = len(rows)
        valid_rows = []
        warnings_list = []
        errors_list = []

        existing_keys = set()

        for idx, row in enumerate(rows):
            result = InventoryValidator.validate_single_record(db, row, existing_keys)
            result["row_number"] = idx + 1

            if result["status"] == TrustStatus.REJECTED.value:
                errors_list.append(result)
            elif result["status"] == TrustStatus.WARNING.value:
                warnings_list.append(result)
                valid_rows.append(result)
            else:
                valid_rows.append(result)

        return {
            "total_records": total,
            "valid_count": len(valid_rows),
            "warning_count": len(warnings_list),
            "rejected_count": len(errors_list),
            "valid_rows": valid_rows,
            "warnings": warnings_list,
            "errors": errors_list
        }
