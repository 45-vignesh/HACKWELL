import re
import logging
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.entities import Medicine
from app.data.mimic.mimic_normalizer import MIMICNormalizer

logger = logging.getLogger(__name__)

class MIMICMapper:
    """
    Clinically grounded mapping engine connecting MIMIC medication terms to existing MediSentinel medicines.
    Enforces deterministic matching with explicit confidence levels, preserving clinical distinctions
    (e.g., IV Infusion vs Oral Tablets) while maintaining strict unmapped reporting for non-formulary items.
    """

    # Primary Clinical Equivalence Rules: (Core Normalized Keywords, Form/Dosage Hints) -> Medicine Code
    RULES = [
        # IV Fluids
        {
            "code": "MED-IVF-NS",
            "keywords": ["sodium chloride", "normal saline"],
            "required_qualifiers": ["0.9%", "0.9"],
            "method": "SYNONYM",
            "confidence": 1.0
        },
        {
            "code": "MED-IVF-RL",
            "keywords": ["lactated ringers", "ringers lactate", "compound sodium lactate"],
            "required_qualifiers": [],
            "method": "SYNONYM",
            "confidence": 1.0
        },
        {
            "code": "MED-IVF-D5",
            "keywords": ["dextrose", "iso-osmotic dextrose"],
            "required_qualifiers": ["5%", "5"],
            "method": "SYNONYM",
            "confidence": 1.0
        },

        # Antibiotics
        {
            "code": "MED-ANT-CEF",
            "keywords": ["ceftriaxone"],
            "required_qualifiers": [],
            "method": "EXACT",
            "confidence": 1.0
        },
        {
            "code": "MED-ANT-MER",
            "keywords": ["meropenem"],
            "required_qualifiers": [],
            "method": "EXACT",
            "confidence": 1.0
        },
        {
            "code": "MED-ANT-AMX",
            "keywords": ["amoxicillin clavulanic acid", "amoxicillin-clavulanic acid", "co-amoxiclav", "amoxicillin and clavulanate"],
            "required_qualifiers": [],
            "method": "SYNONYM",
            "confidence": 0.95
        },

        # Emergency & Resuscitation
        {
            "code": "MED-EMG-EPI",
            "keywords": ["epinephrine", "adrenaline"],
            "disqualifiers": ["norepinephrine", "noradrenaline"],
            "required_qualifiers": [],
            "method": "EXACT",
            "confidence": 1.0
        },
        {
            "code": "MED-EMG-NOR",
            "keywords": ["norepinephrine", "noradrenaline"],
            "required_qualifiers": [],
            "method": "EXACT",
            "confidence": 1.0
        },
        {
            "code": "MED-EMG-ATR",
            "keywords": ["atropine"],
            "required_qualifiers": [],
            "method": "EXACT",
            "confidence": 1.0
        },
        {
            "code": "MED-EMG-HYD",
            "keywords": ["hydrocortisone"],
            "disqualifiers": ["cream", "rectal"],
            "required_qualifiers": [],
            "method": "EXACT",
            "confidence": 0.95
        },

        # Analgesics & Antipyretics
        {
            "code": "MED-AIN-PCM-IV",
            "keywords": ["acetaminophen", "paracetamol"],
            "required_qualifiers": ["iv", "infusion", "1000mg", "1000 mg"],
            "method": "FORMULATION_SPECIFIC",
            "confidence": 0.95
        },
        {
            "code": "MED-AIN-PCM-TAB",
            "keywords": ["acetaminophen", "paracetamol", "tylenol"],
            "disqualifiers": ["iv", "infusion"],
            "required_qualifiers": [],
            "method": "SYNONYM",
            "confidence": 0.90
        },

        # Endocrine & Diabetes
        {
            "code": "MED-DIA-INS",
            "keywords": ["insulin human regular", "insulin regular", "insulin"],
            "disqualifiers": ["glargine", "lispro", "aspart", "detemir"],
            "required_qualifiers": [],
            "method": "EXACT",
            "confidence": 0.95
        },

        # Gastrointestinal
        {
            "code": "MED-GIT-PAN",
            "keywords": ["pantoprazole", "protonix"],
            "required_qualifiers": [],
            "method": "EXACT",
            "confidence": 1.0
        },
        {
            "code": "MED-GIT-OND",
            "keywords": ["ondansetron", "zofran"],
            "required_qualifiers": [],
            "method": "EXACT",
            "confidence": 1.0
        },
    ]

    def __init__(self, db: Session):
        self.db = db
        self.medicine_cache: Dict[str, Medicine] = {}
        self._load_medicines()

    def _load_medicines(self):
        """
        Pre-caches active MediSentinel medicine records by code and name.
        """
        all_meds = self.db.query(Medicine).all()
        for m in all_meds:
            self.medicine_cache[m.code] = m

    def map_medication(self, raw_name: str) -> Dict[str, Any]:
        """
        Attempts to map a raw MIMIC medication string to an existing MediSentinel Medicine.
        Returns mapping metadata with confidence score.
        """
        norm = MIMICNormalizer.normalize(raw_name)
        clean = norm["clean_name"]
        core = norm["core_drug"]

        for rule in self.RULES:
            # Check disqualifiers
            disqualifiers = rule.get("disqualifiers", [])
            if any(dq in clean for dq in disqualifiers):
                continue

            # Check primary keywords
            matches_keyword = any(kw in clean or kw in core for kw in rule["keywords"])
            if not matches_keyword:
                continue

            # Check required qualifiers (e.g. '0.9%' or 'IV')
            qualifiers = rule.get("required_qualifiers", [])
            if qualifiers:
                if not any(q in clean for q in qualifiers):
                    continue

            # Matched! Retrieve cached Medicine
            med = self.medicine_cache.get(rule["code"])
            if med:
                return {
                    "matched": True,
                    "medicine_id": med.id,
                    "medicine_code": med.code,
                    "medicine_name": med.name,
                    "source_name": raw_name,
                    "normalized_name": core,
                    "mapping_method": rule["method"],
                    "confidence": rule["confidence"],
                    "status": "MAPPED" if rule["confidence"] >= 0.85 else "LOW_CONFIDENCE"
                }

        # No match found - classify safely as unmapped
        return {
            "matched": False,
            "medicine_id": None,
            "medicine_code": None,
            "medicine_name": None,
            "source_name": raw_name,
            "normalized_name": core,
            "mapping_method": "UNMAPPED",
            "confidence": 0.0,
            "status": "UNMAPPED"
        }

    def generate_mapping_report(self, unique_names: List[str]) -> Dict[str, Any]:
        """
        Builds a comprehensive report of Mapped, Low-Confidence, and Unmapped medications.
        """
        report: Dict[str, Any] = {
            "total_evaluated": len(unique_names),
            "mapped_count": 0,
            "unmapped_count": 0,
            "low_confidence_count": 0,
            "mapped": [],
            "unmapped": [],
            "low_confidence": []
        }

        for name in unique_names:
            m = self.map_medication(name)
            if m["status"] == "MAPPED":
                report["mapped_count"] += 1
                report["mapped"].append(m)
            elif m["status"] == "LOW_CONFIDENCE":
                report["low_confidence_count"] += 1
                report["low_confidence"].append(m)
            else:
                report["unmapped_count"] += 1
                report["unmapped"].append(m)

        return report
