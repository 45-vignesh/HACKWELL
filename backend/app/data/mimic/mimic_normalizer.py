import re
from typing import Dict, Any, Tuple, Optional

class MIMICNormalizer:
    """
    Normalizes raw clinical medication strings into standardized canonical forms.
    Strips brand suffixes, packaging noise, punctuation, and extracts dosage/route tokens.
    """

    # Common packaging and administration noise patterns
    CLEANUP_REGEXES = [
        re.compile(r"\(excel bag\)", re.IGNORECASE),
        re.compile(r"\(mini bag plus\)", re.IGNORECASE),
        re.compile(r"\(self administering medication\)", re.IGNORECASE),
        re.compile(r"\(immediate release\)", re.IGNORECASE),
        re.compile(r"\(dilaudid\)", re.IGNORECASE),
        re.compile(r"\(glucophage\)", re.IGNORECASE),
        re.compile(r"\(rectal\)", re.IGNORECASE),
        re.compile(r"\(oral\)", re.IGNORECASE),
        re.compile(r"flush", re.IGNORECASE),
        re.compile(r"inhalation soln", re.IGNORECASE),
        re.compile(r"syringe u-\d+", re.IGNORECASE),
    ]

    # Dosage strength patterns (e.g. 1000mg/100ml, 500mg, 0.9%, 5%, 1mg/ml, 1:1000)
    DOSAGE_REGEX = re.compile(
        r"(\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|iu|meq|%|unit(?:s)?)(?:/\d+(?:\.\d+)?\s*(?:ml|mg|l))?|\d+:\d+)",
        re.IGNORECASE
    )

    # Route / form keywords
    FORM_PATTERNS = ["injection", "infusion", "iv", "tab", "tablet", "cap", "capsule", "suspension", "cream", "odt", "solution", "elixir", "drop"]

    @classmethod
    def clean_raw_string(cls, name: str) -> str:
        """
        Performs lowercase, whitespace, and bracket cleaning.
        """
        if not name or not isinstance(name, str):
            return ""

        text = name.strip()
        for rx in cls.CLEANUP_REGEXES:
            text = rx.sub("", text)

        # Replace non-alphanumeric (except %, /) with single space
        text = re.sub(r"[^\w\s%/\.\-]", " ", text)
        text = re.sub(r"\s+", " ", text).strip().lower()
        return text

    @classmethod
    def extract_dosage_and_form(cls, name: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Extracts dosage string and administration form from raw text.
        """
        dosage_match = cls.DOSAGE_REGEX.search(name)
        dosage = dosage_match.group(0).strip().lower() if dosage_match else None

        lower_name = name.lower()
        detected_form = None
        for form in cls.FORM_PATTERNS:
            if re.search(r"\b" + form + r"\b", lower_name):
                detected_form = form
                break

        return dosage, detected_form

    @classmethod
    def normalize(cls, raw_name: str) -> Dict[str, Any]:
        """
        Converts a raw medication string into a standardized dictionary:
        {
            'raw_name': raw_name,
            'clean_name': clean_name,
            'core_drug': core_drug,
            'dosage': dosage,
            'form': form
        }
        """
        cleaned = cls.clean_raw_string(raw_name)
        dosage, form = cls.extract_dosage_and_form(raw_name)

        # Strip dosage from core drug name
        core = cleaned
        if dosage:
            core = core.replace(dosage, "")
        if form:
            core = re.sub(r"\b" + form + r"\b", "", core)

        # Remove salt suffixes that often vary across databases
        salts = ["sodium", "sulfate", "tartrate", "bitartrate", "hcl", "hydrochloride", "succinate", "na succ.", "monohydrate", "trihydrate"]
        for s in salts:
            core = re.sub(r"\b" + re.escape(s) + r"\b", "", core)

        core = re.sub(r"\s+", " ", core).strip()

        return {
            "raw_name": raw_name,
            "clean_name": cleaned,
            "core_drug": core,
            "dosage": dosage,
            "form": form
        }
