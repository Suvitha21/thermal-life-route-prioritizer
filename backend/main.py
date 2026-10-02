"""
FastAPI REST API Server for Remaining Thermal Life Route Prioritiser

Implements all required REST endpoints with Pydantic request/response validation,
CORS middleware, robust error handling, and multi-vehicle routing orchestration.
"""

import sys
from typing import List, Dict, Any, Optional
from dataclasses import asdict
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.services.shipment_service import shipment_service
from backend.models import (
    ShipmentBase,
    ThermalLifeResponse,
    PrioritizedShipmentDetail,
    RoutePlanResponse,
    RouteComparisonResponse,
    OverrideRequest,
    OverrideRecord,
    SummaryResponse,
    HealthResponse,
    EdgeCaseAlert,
    DeliveryVerificationResponse,
)

app = FastAPI(
    title="Remaining Thermal Life Route Prioritiser API",
    description=(
        "Decision-support simulation API for prioritizing raw milk collection routes "
        "based on remaining thermal life, thermal buffer, and operational constraints."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Clean JSON response for HTTPExceptions without leaking stack traces."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": True, "detail": exc.detail, "status": exc.status_code},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unexpected server errors."""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": True, "detail": "Internal server processing error", "status": 500},
    )


# 1. Root & Health Check
@app.get("/", tags=["System"])
def root():
    return {
        "service": "Remaining Thermal Life Route Prioritiser",
        "status": "online",
        "version": "1.0.0",
        "documentation": "/docs",
        "disclaimer": "Academic simulation estimate only — not a certified food-safety model.",
    }


@app.get("/health", response_model=HealthResponse, tags=["System"])
def get_health():
    """System health check and loaded shipment verification."""
    shipments = shipment_service.get_all_raw_shipments()
    overrides = shipment_service.get_all_overrides()
    return HealthResponse(
        status="healthy",
        service="Remaining Thermal Life Route Prioritiser",
        total_shipments_loaded=len(shipments),
        version="1.0.0",
        simulation_mode=True,
        active_overrides_count=len(overrides),
    )


# 2. Shipments
@app.get("/shipments", response_model=List[ShipmentBase], tags=["Shipments"])
def get_all_shipments():
    """Returns all raw canonical simulated milk shipments."""
    return shipment_service.get_all_raw_shipments()


@app.get("/shipments/{shipment_id}", response_model=ShipmentBase, tags=["Shipments"])
def get_single_shipment(shipment_id: str):
    """Returns a single raw shipment by its ID."""
    shipment = shipment_service.get_shipment_by_id(shipment_id)
    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment '{shipment_id}' not found in canonical dataset",
        )
    return shipment


# 3. Thermal Analysis
@app.get("/thermal-analysis", response_model=List[ThermalLifeResponse], tags=["Thermal Analysis"])
def get_all_thermal_analysis():
    """Returns calculated remaining thermal life and buffer analysis for all shipments."""
    return shipment_service.get_all_thermal_evaluations()


@app.get("/thermal-analysis/{shipment_id}", response_model=ThermalLifeResponse, tags=["Thermal Analysis"])
@app.get("/thermal-life/{shipment_id}", response_model=ThermalLifeResponse, include_in_schema=False)
def get_single_thermal_analysis(shipment_id: str):
    """Calculates thermal degradation, remaining hours, buffer, and risk for a specific shipment."""
    eval_res = shipment_service.evaluate_shipment(shipment_id)
    if not eval_res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment '{shipment_id}' not found for thermal evaluation",
        )
    return asdict(eval_res)


# 4. Risk Summary & KPI Aggregates
@app.get("/risk-summary", response_model=SummaryResponse, tags=["Risk & Analytics"])
@app.get("/summary", response_model=SummaryResponse, tags=["Risk & Analytics"])
def get_summary_kpis():
    """Aggregated dashboard KPIs, risk distribution, deliverability gain, and telemetry metrics."""
    return shipment_service.get_summary()


# 5. Priority Queue
@app.get("/priority-queue", tags=["Prioritization"])
@app.get("/priority/queue", tags=["Prioritization"], include_in_schema=False)
def get_priority_queue():
    """Returns the priority-ranked collection queue with deterministic scores and actions."""
    return shipment_service.get_priority_queue()


# 6. Baseline Route
@app.get("/route/baseline", response_model=RoutePlanResponse, tags=["Routing"])
@app.get("/baseline-route", response_model=RoutePlanResponse, include_in_schema=False)
def get_baseline_route():
    """Generates traditional distance/time-only baseline route ignoring remaining thermal life."""
    plan = shipment_service.get_baseline_route()
    return asdict(plan)


# 7. Proposed Route
@app.get("/route/proposed", response_model=RoutePlanResponse, tags=["Routing"])
@app.get("/proposed-route", response_model=RoutePlanResponse, include_in_schema=False)
def get_proposed_route():
    """Generates thermal-life-aware proposed collection route with multi-vehicle scheduling."""
    plan = shipment_service.get_proposed_route()
    return asdict(plan)


# 8. Route Comparison
@app.get("/route/comparison", response_model=RouteComparisonResponse, tags=["Routing"])
@app.get("/route-comparison", response_model=RouteComparisonResponse, include_in_schema=False)
def get_route_comparison():
    """Compares baseline vs proposed routes across spoilage reduction and trade-offs."""
    comp = shipment_service.get_route_comparison()
    return asdict(comp)


# 9. Delivery Verification
@app.get("/delivery-results", response_model=DeliveryVerificationResponse, tags=["Delivery"])
@app.get("/delivery/results", response_model=DeliveryVerificationResponse, include_in_schema=False)
def get_delivery_results():
    """Delivery verification report showing arrival feasibility and thermal margin per stop."""
    return shipment_service.get_delivery_results()


# 10. Edge Case Alerts
@app.get("/edge-case-alerts", response_model=List[EdgeCaseAlert], tags=["Edge Cases"])
@app.get("/edge-cases", response_model=List[EdgeCaseAlert], include_in_schema=False)
def get_edge_case_alerts():
    """Operational fallback alerts for missing sensors, missing locations, exhausted items, and breaches."""
    return shipment_service.get_edge_case_alerts()


# 11. Manual Override
@app.post("/override", response_model=OverrideRecord, tags=["Manual Override"])
@app.post("/manual-override", response_model=OverrideRecord, include_in_schema=False)
def apply_manual_override(req: OverrideRequest):
    """
    Submits an authorised operator manual priority override.
    Maintains an immutable audit log record on disk.
    """
    try:
        record = shipment_service.apply_override(req)
        return record
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@app.get("/overrides", response_model=List[OverrideRecord], tags=["Manual Override"])
@app.get("/override-audit", response_model=List[OverrideRecord], include_in_schema=False)
@app.get("/overrides/audit", response_model=List[OverrideRecord], include_in_schema=False)
def get_override_audit():
    """Retrieves complete historical audit log of all operator manual overrides."""
    return shipment_service.get_all_overrides()


@app.post("/overrides/reset", tags=["Manual Override"])
@app.delete("/overrides", tags=["Manual Override"], include_in_schema=False)
def reset_manual_overrides():
    """Resets all active operator overrides back to pure algorithmic scheduling."""
    return shipment_service.reset_overrides()


def run_server(host: str = "127.0.0.1", port: int = 8000):
    import uvicorn
    print(f"==================================================")
    print(f"Remaining Thermal Life Route Prioritiser FastAPI Server")
    print(f"Listening on http://{host}:{port}")
    print(f"Interactive Swagger Docs: http://{host}:{port}/docs")
    print(f"==================================================")
    uvicorn.run("backend.main:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    run_server()
