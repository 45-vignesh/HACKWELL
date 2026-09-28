from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.forecasting.forecast_service import ForecastService
from app.agents.state import AgentState, AgentStepLog

class ForecastAgent:
    """
    Forecast Agent: Invokes ML/Prophet models to predict demand over 7, 14, and 30-day horizons.
    Calculates precise day-by-day stock depletion, exact stockout date, and confidence scores.
    """

    @staticmethod
    def run(state: AgentState, db: Session) -> Dict[str, Any]:
        med_id = state.get("medicine_id")
        ward_id = state.get("ward_id")
        now_iso = datetime.utcnow().isoformat()

        timeline: List[AgentStepLog] = state.get("timeline_logs", [])
        messages: List[str] = state.get("agent_messages", [])

        if not med_id or not ward_id:
            timeline.append(AgentStepLog(
                timestamp=now_iso,
                agent="Forecast Agent",
                action="SKIP_FORECAST",
                detail="Skipped forecast: Target medicine or ward not specified.",
                severity="INFO"
            ))
            return {"timeline_logs": timeline}

        # Run 14-day demand forecast (force refresh if an emergency surge is active)
        force_refresh = "surge" in state.get("trigger_event", "").lower() or "outbreak" in state.get("trigger_event", "").lower()
        fc_res = ForecastService.forecast_demand(db, med_id, ward_id, horizon_days=14, force_refresh=force_refresh)

        fc_dict = {
            "medicine_id": fc_res.medicine_id,
            "medicine_name": fc_res.medicine_name,
            "ward_id": fc_res.ward_id,
            "ward_name": fc_res.ward_name,
            "total_predicted_demand": fc_res.total_predicted_demand,
            "expected_daily_demand": fc_res.expected_daily_demand,
            "estimated_stockout_days": fc_res.estimated_stockout_days,
            "estimated_stockout_date": fc_res.estimated_stockout_date,
            "confidence_score": fc_res.confidence_score,
            "mape_score": fc_res.mape_score,
            "risk_level": fc_res.risk_level.value,
            "model_used": fc_res.model_used,
            "forecast_points": [p.dict() for p in fc_res.forecast_points]
        }

        timeline.append(AgentStepLog(
            timestamp=now_iso,
            agent="Forecast Agent",
            action="GENERATE_ML_FORECAST",
            detail=(
                f"Generated 14-day forecast using {fc_res.model_used}. "
                f"Projected demand: {fc_res.total_predicted_demand} units ({fc_res.expected_daily_demand} units/day). "
                f"Estimated stockout in {fc_res.estimated_stockout_days} days (MAPE: {fc_res.mape_score}%)."
            ),
            severity="CRITICAL" if fc_res.risk_level.value == "HIGH" else "INFO"
        ))

        messages.append(
            f"Forecast Agent: Demand projected at {fc_res.expected_daily_demand} units/day. "
            f"Stockout expected in {fc_res.estimated_stockout_days} days."
        )

        return {
            "demand_forecast": fc_dict,
            "estimated_stockout_days": fc_res.estimated_stockout_days,
            "stockout_risk": fc_res.risk_level.value,
            "timeline_logs": timeline,
            "agent_messages": messages
        }
