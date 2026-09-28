# MEDISENTINEL — AGENTIC AI FOR HOSPITAL INVENTORY
> **Zero Stock-Outs. Zero Waste. Uninterrupted Care.**  
> *Developed for Hackwell 2.0 — Saranathan College of Engineering*

---

## 1. Problem Statement
Hospital pharmacies track critical medicine stock manually and reorder based on static, fixed min-max thresholds. Shortages, expiry waste, and emergency procurement premiums are discovered only after they compromise patient care.
* **Scale & Urgency**:
  * **323** record active drug shortages in the U.S. (ASHP Q1 2024).
  * **17%–51%** essential-medicine availability across major Indian states.
  * **$600M+** spent annually by U.S. hospitals merely managing drug shortages.
  * Stock-outs persist **4–14 weeks** in public hospitals. A missing ICU or resuscitation drug is an acute patient-safety event.
* **Limitations of Legacy ERPs**: Standard Hospital Information Systems record retrospective stock transactions but cannot forecast future consumption trajectories, fail during seasonal epidemic surges, and keep department inventories isolated in silos.

---

## 2. Proposed Solution
**MediSentinel** is an autonomous multi-agent AI command center where specialist agents continuously monitor pharmacy and ward stock 24x7, forecast demand using machine learning, balance inventory across departments, and draft purchase orders with deterministic human-in-the-loop governance.

### The Autonomous Cycle
```
   [ INGEST / SENSE ]  --> Monitor Agent gathers live ward telemetry & burn rates
           |
           v
   [    PREDICT     ]  --> Forecast Agent calculates 7, 14, 30-day demand trajectories
           |
           v
   [     DECIDE     ]  --> Orchestrator synthesizes surplus rebalance vs procurement
           |
           v
   [   ACT / GOVERN ]  --> Low-risk auto-executes; high-risk pauses for Pharmacist 1-tap sign-off
           |
           v
   [     LEARN      ]  --> Actual dispensing outcomes loop back to retrain models & policies
```

---

## 3. Five-Agent Architecture

| Agent | Core Responsibilities | Registered Tools / Methods |
| :--- | :--- | :--- |
| **Orchestrator Agent** | Stateful LangGraph supervisor. Coordinates specialist agents, resolves conflicts, enforces deterministic safety policies, and escalates high-risk operations to human approval. | `build_graph()`, `evaluate_shortage_severity()`, `governance_step()` |
| **Monitor Agent** | Continuous 24x7 telemetry of stock levels across all wards. Detects critically low thresholds (&le; 3 days), expiring batches, and consumption anomalies. | `get_inventory()`, `get_low_stock_items()`, `get_batch_details()`, `get_recent_usage()` |
| **Forecast Agent** | Analyzes 180+ days of historical dispensing to predict demand over 7, 14, and 30-day horizons. Projects exact depletion dates, confidence intervals, and MAPE scores. | `forecast_demand()`, `calculate_stockout_risk()`, `compute_depletion_curve()` |
| **Distribution Agent** | Inter-department inventory balancer. Detects surplus stock in donor wards (e.g. OPD) and formulates safe transfers to wards in deficit without violating safety stock. | `find_surplus_stock()`, `calculate_transfer_quantity()`, `evaluate_safety_stock()` |
| **Procurement Agent** | Evaluates qualified pharmaceutical suppliers on unit price, delivery lead time, and reliability scores. Generates optimized purchase orders. | `get_suppliers()`, `compare_suppliers()`, `calculate_order_quantity()`, `create_purchase_order()` |
| **Waste Guard Agent** | Enforces First-Expiry-First-Out (FEFO) dispensing protocols. Identifies slow-moving lots, calculates financial value-at-risk, and recommends rapid consumption. | `get_expiring_batches()`, `calculate_expiry_risk()`, `recommend_fefo_action()` |

---

## 4. Technology Stack
* **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts (Radar, Area, Composed, Bar charts), Axios.
* **Backend**: Python 3.13 / 3.14, FastAPI, Pydantic v2 (ConfigDict), SQLAlchemy ORM, Uvicorn.
* **Database**: PostgreSQL (with automatic zero-config SQLite fallback for instant local portability).
* **Multi-Agent Orchestration**: LangGraph stateful graph with conditional routing.
* **Forecasting Engine**: Prophet & Holt-Winters ML Seasonal Forecaster with 90% confidence bands.
* **Governance**: Deterministic 3-Tier Policy Engine (Low, Medium, High Risk).

---

## 5. Quick Start (Windows / Mac / Linux)

### Option A: One-Click Startup (Windows)
Double-click or run the scripts inside the `scripts/` directory:
1. **Seed Database**: Run `scripts\seed_database.bat` (or `scripts\seed_database.ps1`)
2. **Start Backend**: Run `scripts\start_backend.bat` (or `scripts\start_backend.ps1`) &rarr; Opens on `http://localhost:8000`
3. **Start Frontend**: Run `scripts\start_frontend.bat` (or `scripts\start_frontend.ps1`) &rarr; Opens on `http://localhost:5173`
4. **Run Test Suite**: Run `scripts\run_tests.bat` (or `scripts\run_tests.ps1`)

---

### Option B: Manual Setup

#### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Seed the high-fidelity synthetic hospital dataset
python ../scripts/generate_synthetic_data.py

# Launch FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation & Interactive Swagger UI: `http://localhost:8000/docs`

#### 2. Frontend Setup
```bash
# In a new terminal, navigate to frontend directory
cd frontend

# Install node dependencies
npm install

# Start Vite React development server
npm run dev
```
MediSentinel Command Center UI: `http://localhost:5173`

---

## 6. Primary Live Hackathon Demonstration Flow

### Hero Scenario: Monsoon Dengue Outbreak Surge
1. **Baseline State**:
   * Open the dashboard at `http://localhost:5173`.
   * Observe overall hospital health score (~85-92%), healthy stock levels in Central Store and General Wards, and the active 24x7 telemetry feed.
2. **Launch Dengue Outbreak Simulation**:
   * Click **"Dengue Surge Demo"** in the top navigation or navigate to the **Dengue Outbreak Demo** tab.
   * Click **"Run Dengue Surge Simulation"**.
3. **Observe the Autonomous Loop in Real-Time**:
   * **Sense**: Emergency Ward IV Fluid (Normal Saline 0.9%) consumption spikes 400% to **62 bottles/day**; stock collapses to **35 bottles**.
   * **Predict**: Forecast Agent models the burn rate and flags complete stockout in **1.5 days**.
   * **Decide**: Orchestrator analyzes hospital-wide inventory. Distribution Agent discovers OPD Pharmacy holds 175 bottles (+70 safe headroom); generates a **50-unit internal transfer proposal**.
   * **Procure**: Deficit persists. Procurement Agent compares 4 vetted vendors, selects optimal 1-day delivery vendor, and prepares an emergency Purchase Order for **₹18,000**.
   * **Govern**: Policy Engine classifies this commitment as **HIGH RISK** (threshold &ge; ₹10,000 and critical medicine); routes to Pharmacist Approval Center.
4. **Pharmacist 1-Tap Sign-Off**:
   * Click **"1-Tap Pharmacist Sign-Off"** (or open the **Pharmacist Approvals** tab).
   * Review the explainability rationale, cost breakdown, and click **Approve & Execute**.
   * Transfer completes, PO dispatches, and inventory levels immediately restore to safe operating levels.
   * Verify all telemetry steps in the **System Audit Ledger**.

---

## 7. Pilot Targets to be Validated

Extracted directly from Section 05 of the MediSentinel specification:
* **60%–70%** reduction in critical medicine stock-outs.
* **30%–40%** reduction in expiry wastage.
* **< 15%** Mean Absolute Percentage Error (MAPE) in demand forecasting.
* **50%** reduction in manual inventory ordering time.

---

## 8. Automated Test Suite
Run the full automated test suite verifying inventory calculations, ML forecasting curves, LangGraph orchestration, and the Dengue surge workflow:
```bash
cd backend
venv\Scripts\python -m pytest tests/test_api_endpoints.py -v
```
All tests run with 100% pass rate.
#   H A C K W E L L  
 