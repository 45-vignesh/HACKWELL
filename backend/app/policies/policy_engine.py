from typing import Dict, Any, Tuple
from app.config import settings
from app.models.entities import CriticalityLevel, RiskLevel, ActionType

class PolicyEngine:
    """
    Deterministic governance engine that assigns risk tiers and determines
    whether human pharmacist approval is mandatory prior to execution.
    """

    @staticmethod
    def evaluate_purchase_order(
        medicine_criticality: CriticalityLevel,
        quantity: int,
        estimated_cost: float,
        stockout_days: float
    ) -> Tuple[RiskLevel, bool, str]:
        """
        Evaluates a Purchase Order proposal.
        Returns (risk_level, approval_required, justification)
        """
        # Threshold 1: Value threshold (> ₹10,000 by default)
        if estimated_cost >= settings.HIGH_RISK_PO_THRESHOLD:
            return (
                RiskLevel.HIGH,
                True,
                f"Financial commitment ₹{estimated_cost:,.2f} exceeds high-risk threshold (₹{settings.HIGH_RISK_PO_THRESHOLD:,.2f}). Human pharmacist review mandatory."
            )

        # Threshold 2: Critical medicine with imminent stockout
        if medicine_criticality == CriticalityLevel.CRITICAL and stockout_days <= settings.CRITICAL_STOCKOUT_DAYS_THRESHOLD:
            return (
                RiskLevel.HIGH,
                True,
                f"Critical life-saving medicine facing imminent stock-out in {stockout_days:.1f} days. Mandatory clinical governance sign-off."
            )

        # Threshold 3: Medium value
        if estimated_cost >= 2000.0 or medicine_criticality in [CriticalityLevel.CRITICAL, CriticalityLevel.HIGH]:
            return (
                RiskLevel.MEDIUM,
                False,
                f"Medium-scale replenishment (₹{estimated_cost:,.2f}). Autonomous execution permitted under standard protocol."
            )

        # Low risk: routine minor refill
        return (
            RiskLevel.LOW,
            False,
            f"Low-value routine procurement (₹{estimated_cost:,.2f}). Auto-approved."
        )

    @staticmethod
    def evaluate_stock_transfer(
        medicine_criticality: CriticalityLevel,
        quantity: int,
        from_ward_remaining_stock: int,
        from_ward_safety_stock: int
    ) -> Tuple[RiskLevel, bool, str]:
        """
        Evaluates a Stock Transfer proposal.
        Ensures donor ward safety stock is never compromised.
        """
        # Rule 1: Violation of donor ward safety stock
        if from_ward_remaining_stock < from_ward_safety_stock:
            return (
                RiskLevel.HIGH,
                True,
                f"Safety stock hazard: Transfer leaves source ward with {from_ward_remaining_stock} units, below safety threshold {from_ward_safety_stock}. Requires pharmacist clinical sign-off."
            )

        # Rule 2: Large quantity transfer
        if quantity >= settings.HIGH_RISK_TRANSFER_QUANTITY:
            return (
                RiskLevel.HIGH,
                True,
                f"High-volume inter-departmental transfer ({quantity} units exceeds limit of {settings.HIGH_RISK_TRANSFER_QUANTITY}). Requires authorization."
            )

        # Rule 3: Critical medicine
        if medicine_criticality == CriticalityLevel.CRITICAL and quantity > 50:
            return (
                RiskLevel.MEDIUM,
                False,
                f"Critical medicine rebalance ({quantity} units) with verified surplus headroom in source ward. Auto-approved."
            )

        return (
            RiskLevel.LOW,
            False,
            f"Routine safe transfer ({quantity} units). Auto-executed."
        )

    @staticmethod
    def evaluate_expiry_waste(
        days_to_expiry: int,
        quantity_at_risk: int,
        estimated_loss: float
    ) -> Tuple[RiskLevel, str]:
        """
        Evaluates expiry waste risk for Waste Guard Agent.
        """
        if days_to_expiry <= 30:
            return (
                RiskLevel.HIGH,
                f"CRITICAL EXPIRY: {quantity_at_risk} units expire in {days_to_expiry} days! Estimated potential loss: ₹{estimated_loss:,.2f}. Urgent FEFO distribution required."
            )
        elif days_to_expiry <= 90:
            return (
                RiskLevel.MEDIUM,
                f"NEAR EXPIRY WARNING: {quantity_at_risk} units expire in {days_to_expiry} days. Value at risk: ₹{estimated_loss:,.2f}. Prioritize in dispensing queues."
            )
        else:
            return (
                RiskLevel.LOW,
                f"Stock within healthy expiration window ({days_to_expiry} days)."
            )
