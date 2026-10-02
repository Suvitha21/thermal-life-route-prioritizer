# Remaining Thermal Life Route Prioritiser for Dairy Milk Collection

> **College Center of Excellence (CoE) Project Prototype — Phase 2 Release**  
> *“Solving Route Planning Ignores Remaining Thermal Life in Dairy Company Collecting Milk from Small Producers”*

---

## 1. Problem Statement

In dairy cold chain logistics across emerging and regional dairy belts, collection vehicles collect raw milk from numerous smallholder dairy farmers. Conventional route planning systems strictly optimize conventional physical transport objectives:
- Shortest travel distance
- Lowest travel time
- Minimizing number of pickup stops

**The Critical Flaw:** Conventional route planning completely ignores the **remaining thermal life** of raw milk shipments. Different milk shipments experience disparate rates of thermal degradation due to:
- Varied ambient temperature exposure history at producer collection points
- Disparate packaging and container insulation performance (e.g. uninsulated jugs vs. vacuum-insulated bulk tanks)
- Initial thermal budget hours from milking time
- Multi-stop transit delays across rural road networks

When collection vehicles prioritize purely by shortest distance, highly degraded or warm milk batches waiting at distant farms are postponed to late afternoon runs, causing irreversible bacterial acidification, spoilage, curdling, and severe financial losses for smallholder farmers.

---

## 2. Proposed Solution

The **Remaining Thermal Life Route Prioritiser** is a full-stack decision-support prototype that dynamically prioritizes raw milk collection routes based on:
1. Hourly thermal degradation rate calculations based on temperature exposure and packaging insulation
2. Remaining thermal life estimation
3. Direct and cumulative **thermal buffer margins** ($\text{Remaining Life} - \text{Travel Time}$)
4. Real-time risk classification and arrival feasibility verification
5. Explainable dispatch rankings with authorized manual operator override capabilities and disk-persisted audit trails
6. Multi-objective trade-off evaluation balancing **Objective A (Thermal Safety & Spoilage Prevention)** against **Objective B (Fleet Operational Efficiency & Travel Cost)**

By dispatching vehicles to rescue milk batches with tight thermal margins first, the proposed system saves at-risk batches before expiration while allowing well-chilled, insulated batches with ample thermal buffers to be collected safely in subsequent legs.

---

## 3. Academic Simulation Disclaimer

> [!IMPORTANT]
> **SIMULATION TRANSPARENCY DISCLAIMER:**  
> The thermal-life calculation is a transparent simulation estimate using assumed temperature exposure and packaging-performance factors. It is an engineering decision-support prototype for an academic demonstration and **is NOT a scientifically validated microbiological shelf-life or food-safety prediction model**.

---

## 4. System Architecture

```
                                  CANONICAL DATASET
                             (data/shipments.json / .csv)
                                          │
                                          ▼
                              THERMAL LIFE SIMULATION
                           (algorithms/thermal_life.py)
                     - Hourly degradation consumption
                     - Remaining thermal life (hours)
                     - Thermal buffer after travel
                     - Centralized 4-Tier Risk Classification
                     - Thermal exhaustion detection (0.0h)
                                          │
                                          ▼
                             ROUTE PRIORITIZATION ENGINE
                          (algorithms/route_prioritizer.py)
                     - Explainable Priority Scoring (0-100)
                     - Baseline Route (Distance/Time Only)
                     - Proposed Route (Thermal-Life-Aware)
                     - Multi-Vehicle Fleet Route Scheduling (3 Trucks)
                     - Pareto Trade-Off Analysis (Safety vs. Transit)
                                          │
                 ┌────────────────────────┴────────────────────────┐
                 ▼                                                 ▼
         FASTAPI REST BACKEND                             NEXT.js FRONTEND
          (backend/main.py)                              (frontend/app/page.tsx)
    - /health                                       - Summary KPI Cards
    - /shipments & /shipments/{id}                  - Risk Distribution Matrix
    - /thermal-analysis & /{id}                     - Route Strategy Comparison
    - /priority-queue                               - Interactive Priority Table
    - /route/baseline & /route/proposed             - SVG Temperature Degradation Chart
    - /route/comparison                             - "Why Prioritized?" Explainability
    - /delivery-results                             - Interactive Offline Sim Toggle
    - /edge-case-alerts                             - Authorized Manual Override Modal
    - /override & /overrides (audit)                - 6-Stage Dedicated Workflow Views
```

---

## 5. Technology Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons
- **Backend:** Python 3.11, FastAPI, Uvicorn, Pydantic v2 schemas, REST JSON endpoints
- **Data:** Canonical 28-shipment JSON & CSV datasets (`data/shipments.json`, `data/shipments.csv`)
- **Persistence:** JSON disk storage for manual override audit records (`data/override_audit.json`)
- **Algorithms:** Deterministic rule-based thermal degradation and dispatch scheduling
- **Testing:** Pytest automated test suite (31 unit, edge-case, and API integration tests)
- **Startup:** Zero-dependency Windows launcher (`start_project.bat`)

---

## 6. Data Model (28 Canonical Records)

Each shipment record in `data/shipments.json` and `data/shipments.csv` contains:

| Field Name | Type | Description | Example |
|---|---|---|---|
| `shipment_id` | String | Unique batch identifier | `"SHIP-003"` |
| `producer_id` | String | Smallholder farmer ID | `"PROD-103"` |
| `milk_quantity_litres` | Float | Milk volume collected | `90.0` |
| `temperature_history` | Float[] \| null | Hourly °C temperature logs | `[4.2, 5.1, 5.8, 6.4]` |
| `packaging_type` | String | Container insulation category | `"Uninsulated Jug"` |
| `packaging_performance`| Float | Rating between 0.0 and 1.0 | `0.40` |
| `distance_km` | Float \| null | Road distance to depot | `42.0` |
| `travel_time_minutes` | Float \| null | Direct vehicle transit duration | `80.0` |
| `number_of_stops` | Integer | Intermediate pickup stops | `4` |
| `maximum_safe_temperature_c` | Float | Temperature limit threshold | `6.0` |
| `initial_thermal_life_hours` | Float | Initial thermal budget at milking | `10.0` |

---

## 7. Thermal Life Simulation Model & Formulas

The core model is implemented in `algorithms/thermal_life.py` with configurable simulation constants:
- $\text{Baseline Temperature } (T_{\text{base}}) = 4.0^\circ\text{C}$
- $\text{Default Max Safe Temperature } (T_{\text{max}}) = 6.0^\circ\text{C}$
- $\text{Reading Interval } (\Delta t) = 1.0\text{ hour}$

### Step-by-Step Calculation:
1. **Temperature Ratio:**
   $$\text{temperature\_ratio} = \max\left(0.5, \frac{T}{T_{\text{base}}}\right)$$
2. **Packaging Multiplier:**
   $$\text{packaging\_multiplier} = \max\left(1.0, 2.0 - \text{packaging\_performance}\right)$$
3. **Hourly Thermal-Life Consumption:**
   $$\text{hourly\_consumption} = \Delta t \times \text{temperature\_ratio} \times \text{packaging\_multiplier}$$
4. **Total Consumed Thermal Life:**
   $$\text{total\_consumed} = \sum \text{hourly\_consumption}$$
5. **Remaining Thermal Life:**
   $$\text{remaining\_thermal\_life} = \max\left(0.0, \text{initial\_thermal\_life\_hours} - \text{total\_consumed}\right)$$
6. **Thermal Buffer After Travel:**
   $$\text{travel\_time\_hours} = \frac{\text{travel\_time\_minutes}}{60}$$
   $$\text{thermal\_buffer} = \text{remaining\_thermal\_life} - \text{travel\_time\_hours}$$

### Centralized 4-Tier Risk Classification:
- **CRITICAL:** $\text{thermal\_buffer} \le 0$ OR $\text{remaining\_life} \le 0$ OR $T_{\text{latest}} \ge T_{\text{max}} + 1.0^\circ\text{C}$
- **HIGH:** $\text{thermal\_buffer} \le 1.0\text{ hr}$ OR $T_{\text{latest}} \ge T_{\text{max}}$
- **MEDIUM:** $\text{thermal\_buffer} \le 3.0\text{ hrs}$
- **LOW:** $\text{thermal\_buffer} > 3.0\text{ hrs}$
- **MANUAL REVIEW:** Triggered when temperature telemetry or location telemetry is unavailable or corrupted.

---

## 8. Baseline vs. Proposed Route Strategies

### Baseline Strategy (Traditional):
- Sorts shipments strictly by nearest-neighbor distance and shortest travel time.
- Completely ignores thermal degradation and remaining thermal life.

### Proposed Strategy (Thermal-Life-Aware):
- Prioritizes shipments based on:
  1. Operator manual overrides
  2. Rescuable urgent batches ($0.0 < \text{thermal\_buffer} \le 3.5\text{h}$)
  3. Rescuable safe batches ($\text{thermal\_buffer} > 3.5\text{h}$)
  4. Telemetry review items
  5. Exhausted / quarantine items
- Resolves simultaneous expiry conflicts deterministically: higher milk volume first, then shorter travel time, then shipment ID.
- Simulates realistic 3-truck collection fleet dispatches, evaluating whether each shipment arrives before its thermal life expires.

---

## 9. Competing Objectives & Pareto Trade-Off Analysis

The system quantitatively models and reports two competing logistical objectives:

- **Objective A: Thermal Safety & Spoilage Prevention:**
  - Goal: Minimize raw milk bacterial degradation and financial loss by collecting at-risk batches before thermal expiry.
  - Result: Proposed routing reduces expired shipments from 11 down to 5 (saving **6 additional batches**, preserving **990 Litres** of raw milk, boosting on-time delivery from **59.3%** to **81.5%**).

- **Objective B: Fleet Operational Efficiency:**
  - Goal: Minimize vehicle fuel consumption, road mileage, and total fleet travel time.
  - Result: Baseline routing achieves 1,361.0 minutes and 696.0 km by visiting closest stops first. The proposed thermal-aware routing requires 1,415.4 minutes (+54.4 min / +4.0%) and 723.8 km (+27.8 km / +4.0%) in detour travel.

**Pareto Conclusion:** Neither objective is unilaterally superior. The system empowers dairy operators to visualize the exact measured trade-off: a **4.0% detour investment** rescues **+22.2% more milk** before thermal expiry.

---

## 10. Operational Fallback Modes & Edge Cases

The system robustly handles all 15+ operational edge cases without crashing:

1. **Missing Temperature Sensor Telemetry (`SHIP-027`):**
   - Sensor status: `UNAVAILABLE`
   - Risk: `MANUAL_REVIEW`
   - Action: `PRIORITIZE` (dispatch driver with handheld calibrated probe thermometer)
   - Zero temperature fabrication.

2. **Missing Location Telemetry (`SHIP-028`):**
   - Feasibility: `UNKNOWN`
   - Risk: `MANUAL_REVIEW`
   - Action: `MONITOR` (driver manual odometer check)
   - Zero fake coordinates or fabricated travel times.

3. **Offline / Store-and-Forward Mode:**
   - Interactive toggle button in dashboard Header.
   - When offline, dashboard operates seamlessly using embedded canonical dataset with local state persistence.
   - Manual overrides are queued locally and synchronized when online.

4. **Thermal Life Exhaustion (`SHIP-006`, `SHIP-009`, `SHIP-013`, `SHIP-021`):**
   - `is_thermal_exhausted = True`
   - Risk: `CRITICAL`
   - Action: `COLLECT NOW` (quarantine protocol on arrival; mandatory acidity and alcohol testing).

5. **Temperature Limit Breach (`SHIP-003`, etc.):**
   - Latest temperature exceeds $6.0^\circ\text{C}$ safe threshold.
   - Flagged as temperature breach with elevated priority score.

6. **Simultaneous Expiry Conflict:**
   - Deterministic tie-breaker prioritizes larger volume first to minimize milk loss, followed by travel time and ID.

---

## 11. Authorized Manual Override & Persistent Audit Trail

Operators can manually elevate or adjust any shipment's dispatch priority:
- Form fields: New Priority Score (0–100), Assigned Action, Operator Identifier, Operational Justification Reason.
- Audit Record Schema: `audit_id`, `shipment_id`, `original_priority_score`, `original_action`, `new_priority_score`, `new_action`, `reason`, `operator_id`, `timestamp`.
- Storage: Persisted to disk in `data/override_audit.json`.
- Live Impact: Overridden shipments are marked with `[OPERATOR OVERRIDE]` badges and elevated in the proposed queue without erasing original calculated values.

---

## 12. API Endpoints Reference

| Method | Endpoint | Description | Response Model |
|---|---|---|---|
| `GET` | `/health` | Health check & loaded shipment verification | `HealthResponse` |
| `GET` | `/shipments` | Returns all 28 canonical shipment records | `List[ShipmentBase]` |
| `GET` | `/shipments/{id}` | Returns raw details for a specific shipment | `ShipmentBase` |
| `GET` | `/thermal-analysis` | Thermal life, buffer, and risk for all shipments | `List[ThermalLifeResponse]` |
| `GET` | `/thermal-analysis/{id}` | Thermal evaluation for a single shipment | `ThermalLifeResponse` |
| `GET` | `/summary` | Aggregated KPIs, risk counts, and gain | `SummaryResponse` |
| `GET` | `/priority-queue` | Dynamic collection queue with scores & reasons | `List[PrioritizedShipmentDetail]` |
| `GET` | `/route/baseline` | Traditional distance/time-only baseline plan | `RoutePlanResponse` |
| `GET` | `/route/proposed` | Thermal-life-aware proposed route plan | `RoutePlanResponse` |
| `GET` | `/route/comparison` | Side-by-side comparison & trade-offs | `RouteComparisonResponse` |
| `GET` | `/delivery-results` | Delivery verification status for every stop | `DeliveryVerificationResponse` |
| `GET` | `/edge-case-alerts` | Structured operational fallback alerts | `List[EdgeCaseAlert]` |
| `POST`| `/override` | Submits authorized manual priority override | `OverrideRecord` |
| `GET` | `/overrides` | Retrieves disk-persisted audit trail | `List[OverrideRecord]` |
| `POST`| `/overrides/reset` | Clears active overrides for demo reset | `Dict[str, Any]` |

Interactive Swagger documentation is available at `http://127.0.0.1:8000/docs`.

---

## 13. Frontend Workflow & Views

The Next.js frontend provides a comprehensive 6-stage operational workflow:
1. **Overview Dashboard (`/`):** KPI summary cards, risk distribution, edge-case alert banners, priority table, side-by-side comparison matrix, shipment detail modal, manual override modal.
2. **Data Explorer (`/data`):** Searchable, filterable table of all 28 producer shipments with sorting by volume, distance, and telemetry status.
3. **Thermal Analysis (`/thermal-analysis`):** Step-by-step mathematical model degradation flow, interactive shipment picker, and SVG temperature chart.
4. **Thermal Risk (`/risk`):** Risk breakdown across Critical, High, Medium, Low, and Manual Review tiers.
5. **Priority Queue (`/priority`):** Live dispatch queue with override action buttons and toggleable historical audit log table.
6. **Route Planning (`/route`):** Side-by-side KPI matrix, multi-vehicle dispatch timelines, and competing objectives trade-off panel.
7. **Delivery Verification (`/delivery`):** Cumulative arrival verification checking whether each truck arrives before milk expires.

---

## 14. Execution & Setup Instructions

### QUICK START — WINDOWS (One-Click Launch)
1. Double-click `start_project.bat` in the project root directory.
2. The launcher automatically detects the Python interpreter, starts the FastAPI backend (port 8000), starts the Next.js frontend (port 3000), and opens `http://localhost:3000` in your default browser.
3. Keep the terminal windows open while using the application.

### Manual Startup

#### 1. Running the FastAPI Backend
```powershell
# From project root using pyembed:
& "pyembed\python.exe" backend\main.py
# Or with standard python:
python backend/main.py
```
FastAPI server starts on `http://127.0.0.1:8000` (Swagger docs at `/docs`).

#### 2. Running the Next.js Frontend
```powershell
cd frontend
npm run dev
```
Open `http://localhost:3000`.

#### 3. Running Automated Tests
```powershell
# From project root using pyembed:
& "pyembed\python.exe" -m pytest tests/ -v
# Or with standard python:
pytest tests/ -v
```

---

## 15. PHASE 2 IMPLEMENTATION EVIDENCE

### Benchmark & Routing Results (Canonical Dataset)

| Metric | Traditional Baseline | Proposed Thermal-Aware | Measured Impact |
|---|---|---|---|
| **Total Shipments Evaluated** | 28 shipments (27 feasible) | 28 shipments (27 feasible) | Complete dataset coverage |
| **Delivered Before Expiry** | 16 shipments (59.3%) | 22 shipments (81.5%) | **+6 shipments rescued (+22.2%)** |
| **Expired Shipments in Transit** | 11 shipments (40.7%) | 5 shipments (18.5%) | **-54.5% spoilage reduction** |
| **Rescued Milk Volume** | — | 990.0 Litres preserved | High-value batches saved |
| **Total Fleet Travel Time** | 1,361.0 minutes (22.68h) | 1,415.4 minutes (23.59h) | +54.4 min (+4.0% detour trade-off) |
| **Total Fleet Road Distance** | 696.0 km | 723.8 km | +27.8 km (+4.0% detour trade-off) |
| **Collection Fleet Size** | 3 multi-stop vehicles | 3 multi-stop vehicles | Realistic schedule simulation |
| **Telemetry Fallback Items** | 2 items (SHIP-027, SHIP-028) | 2 items flagged for review | No crashes; zero data invention |

### Automated Test Suite Execution
- **31 of 31 automated tests passed (100% success rate)**:
  - 15 FastAPI endpoint integration tests (`tests/test_api.py`)
  - 16 thermal life calculation, risk classification, and edge-case unit tests (`tests/test_thermal_life.py`)
- **Frontend Production Build**: `npm run build` compiled 10/10 routes statically with zero TypeScript or lint errors.

### Manual Override Audit Record Example (`data/override_audit.json`)
```json
{
  "audit_id": "OVR-8489081A",
  "shipment_id": "SHIP-007",
  "original_priority_score": 14.5,
  "original_action": "NORMAL",
  "new_priority_score": 96.0,
  "new_action": "COLLECT NOW",
  "reason": "Compressor malfunction reported by dairy farmer.",
  "operator_id": "DISPATCH-OPERATOR-1",
  "timestamp": "2026-10-02T08:45:59"
}
```

---

## 16. Limitations & Future Scope

1. **Static Telemetry Log Files:** In future production phases, IoT Bluetooth/cellular temperature dataloggers can stream live temperature curves via MQTT.
2. **Dynamic Traffic Integration:** The prototype models road transit duration from simulated operational logs. Future work can integrate live map routing APIs.
3. **Multi-Compartment Tankers:** Advanced compartmentalized thermal modeling where each tanker compartment has independent thermal retention.
