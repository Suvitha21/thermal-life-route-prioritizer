# Remaining Thermal Life Route Prioritiser for Dairy Milk Collection

> **College Center of Excellence (CoE) Project Prototype**  
> *“Solving Route Planning Ignores Remaining Thermal Life in Dairy Company Collecting Milk from Small Producers”*

---

## 1. Problem Statement

In dairy logistics across emerging and regional dairy belts, collection vehicles collect raw milk from numerous smallholder dairy farmers. Traditional route optimization algorithms strictly focus on conventional physical transport metrics:
- Shortest travel distance
- Lowest travel time
- Minimizing stop counts

**The Critical Flaw:** Conventional route planning completely ignores the **remaining thermal life** of raw milk shipments. Different milk shipments experience disparate rates of thermal degradation due to:
- Temperature exposure history at collection points
- Varied packaging and insulation performance (e.g., uninsulated jugs vs. vacuum-insulated bulk tanks)
- Initial thermal budget hours
- Ambient transit delays and multiple intermediate stops

When collection vehicles prioritize purely by shortest distance, highly degraded or warm milk batches waiting at distant farms are postponed to late afternoon runs, causing irreversible bacterial spoilage, curdling, and severe financial losses for smallholder farmers.

---

## 2. Proposed Solution

The **Remaining Thermal Life Route Prioritiser** is a full-stack decision-support system that dynamically prioritizes collection routes based on:
1. Hourly thermal degradation rate calculations
2. Remaining thermal life estimation
3. Direct and cumulative **thermal buffer margins** ($\text{Remaining Life} - \text{Travel Time}$)
4. Real-time risk classification and feasibility checks
5. Explainable dispatch rankings with operator manual override capabilities

By dispatching vehicles to rescue milk batches with tight thermal margins first, the proposed system saves at-risk batches before expiration while allowing well-chilled, insulated batches with ample thermal buffers to be collected safely in subsequent legs.

---

## 3. Academic Simulation Disclaimer

> [!IMPORTANT]
> **SIMULATION TRANSPARENCY DISCLAIMER:**  
> The thermal-life calculation is a transparent simulation model using assumed temperature exposure and packaging-performance factors. It is an engineering decision-support prototype for an academic demonstration and **is NOT a scientifically validated microbiological shelf-life prediction model**.

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
                    - 4-Tier Risk Classification
                                         │
                                         ▼
                            ROUTE PRIORITIZATION ENGINE
                         (algorithms/route_prioritizer.py)
                    - Explainable Priority Scoring (0-100)
                    - Baseline Route (Distance/Time Only)
                    - Proposed Route (Thermal-Life-Aware)
                    - Multi-Vehicle Fleet Route Simulation
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
         FASTAPI REST BACKEND                            NEXT.js FRONTEND
          (backend/main.py)                             (frontend/app/page.tsx)
    - /health                                       - Summary KPI Cards
    - /shipments & /shipments/{id}                  - Risk Distribution Matrix
    - /thermal-life/{id}                            - Side-by-Side Route Comparison
    - /route/baseline & /route/proposed             - Interactive Priority Table
    - /route/comparison                             - SVG Temperature Chart
    - /override & /overrides                        - "Why Prioritized?" Explainability
    - /summary                                      - Store-and-Forward Offline Resilience
```

---

## 5. Technology Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons
- **Backend:** Python 3.11, FastAPI / Threading HTTP REST Server, Pydantic / Dataclasses
- **Data:** Canonical 28-shipment JSON & CSV datasets
- **Algorithms:** Deterministic rule-based thermal degradation and dispatch scheduling (No machine learning, no paid external APIs)
- **Testing:** Pytest automated test suite (21 unit and integration tests)

---

## 6. Simulated Dataset Fields (28 Canonical Records)

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
- **MANUAL REVIEW:** Triggered when temperature telemetry or location telemetry is unavailable.

---

## 8. Route Prioritization & Comparison Logic

### Baseline Strategy (Traditional):
- Sorts shipments purely by conventional metrics: shortest travel time, shortest distance, fewest stops.
- Completely ignores thermal degradation and ambient exposure.

### Proposed Strategy (Thermal-Life-Aware):
- Prioritizes shipments based on:
  1. Operator manual overrides
  2. Rescuable urgent batches ($0.0 < \text{thermal\_buffer} \le 3.5\text{h}$)
  3. Rescuable safe batches ($\text{thermal\_buffer} > 3.5\text{h}$)
  4. Telemetry review items
  5. Exhausted / quarantine items
- Simulates realistic 3-truck collection fleet dispatches, evaluating whether each shipment is delivered before its thermal life expires.

### Key Performance Indicator (KPI):
- **Traditional Baseline Deliverable:** $59.3\%$ (16 / 27 shipments delivered before expiry; 11 expired in transit)
- **Proposed System Deliverable:** $81.5\%$ (22 / 27 shipments delivered before expiry; rescues 100% of rescuable milk)
- **Net Gain:** **$+22.2\%$ increase in milk delivered before thermal expiry** (+1,150 Litres saved).

---

## 9. Failure Modes & Edge Case Handling

The dashboard handles 4 specific edge cases with clear visual alerts and zero crashes:
1. **Case 1: Missing Temperature Sensor Data (`SHIP-027`):**
   - Displays: *“Temperature data unavailable — using last known operational state / manual review required.”*
   - Sensor status marked `UNAVAILABLE`, manual review flagged.
2. **Case 2: Missing Location / Travel-Time Data (`SHIP-028`):**
   - Displays: *“Location unavailable — route feasibility cannot be confirmed.”*
   - Feasibility marked `UNKNOWN`, excluded from automatic feasibility claims.
3. **Case 3: Backend Offline / Disconnected:**
   - Displays: *“OFFLINE — USING LOCAL SIMULATION DATA”*
   - Seamlessly uses the embedded canonical fallback dataset (`fallbackData.ts`) with local state persistence.
4. **Case 4: Thermal Life Exhausted (`SHIP-006`, `SHIP-013`, etc.):**
   - Displays: *“CRITICAL — Thermal life exhausted”* with `COLLECT NOW` quarantine action tag.

---

## 10. Authorized Operator Manual Override

Operators can manually elevate or adjust any shipment's priority:
- Records: `shipment_id`, `original_priority_score`, `new_priority_score`, `new_action`, `reason`, `timestamp`
- Updates the live proposed route ranking immediately
- Maintains an immutable audit trail accessible via `/overrides`

---

## 11. API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check & dataset status |
| `GET` | `/shipments` | Returns all 28 canonical shipment records |
| `GET` | `/shipments/{id}` | Returns raw details for a specific shipment |
| `GET` | `/thermal-life/{id}` | Evaluates thermal life, buffer, and risk classification |
| `GET` | `/route/baseline` | Computes traditional baseline route plan |
| `GET` | `/route/proposed` | Computes thermal-life-aware route plan |
| `GET` | `/route/comparison` | Computes side-by-side comparative KPI matrix |
| `POST`| `/override` | Submits an authorized manual priority override |
| `GET` | `/overrides` | Returns audit trail of all manual overrides |
| `GET` | `/summary` | Returns aggregated dashboard KPI summary |

---

## 12. Execution & Setup Instructions

### QUICK START — WINDOWS (One-Click Launch)

1. Double-click `start_project.bat` in the project root directory.
2. The launcher automatically detects Python, starts the FastAPI backend (port 8000), and starts the Next.js frontend (port 3000).
3. Your default web browser will automatically open at `http://localhost:3000`.
4. Leave the terminal windows open while using the application.

---

### Alternative Manual Startup

#### Prerequisites
- Node.js (v18+) and npm
- Python (v3.10+)

#### 1. Running the Python Backend
```powershell
# From project root
& "pyembed\python.exe" backend\main.py
# Or with standard python:
python backend/main.py
```
The REST API server will start on `http://127.0.0.1:8000`.

#### 2. Running the Next.js Frontend
```powershell
cd frontend
npm run dev
```
Open your browser at `http://localhost:3000`.

#### 3. Running Automated Tests
```powershell
& "pyembed\python.exe" -m pytest tests/ -v
# Or with standard python:
pytest tests/ -v
```

---

## 13. Limitations & Future Scope

1. **Static Temperature Logs:** In future iterations, real-time IoT BLE temperature data loggers can stream live temperature curves via MQTT/WebSockets.
2. **Dynamic Traffic Integration:** The prototype uses simulated direct travel times. Future work can incorporate real-time road traffic APIs.
3. **Multi-Compartment Tankers:** Advanced compartmentalized thermal modeling where each tanker compartment has independent thermal retention.
