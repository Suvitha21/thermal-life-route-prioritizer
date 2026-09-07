"""
REST API Server for Remaining Thermal Life Route Prioritiser

Implements all required REST endpoints with JSON serialization,
CORS headers, error handling, and multi-threaded request processing.
"""

import json
import sys
from http.server import HTTPServer, ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from dataclasses import asdict
from typing import Dict, Any

from backend.services.shipment_service import shipment_service
from backend.models import OverrideRequest


class APIServerHandler(BaseHTTPRequestHandler):
    def _set_cors_headers(self, status_code: int = 200, content_type: str = "application/json"):
        self.send_response(status_code)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_OPTIONS(self):
        """Handle CORS pre-flight requests."""
        self._set_cors_headers(200)

    def _send_json(self, data: Any, status_code: int = 200):
        self._set_cors_headers(status_code)
        json_bytes = json.dumps(data, indent=2).encode("utf-8")
        self.wfile.write(json_bytes)

    def _send_error(self, message: str, status_code: int = 400):
        self._send_json({"error": True, "detail": message, "status": status_code}, status_code)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")
        if not path:
            path = "/"

        try:
            # 1. /health
            if path == "/health":
                shipments = shipment_service.get_all_raw_shipments()
                self._send_json({
                    "status": "healthy",
                    "service": "Remaining Thermal Life Route Prioritiser",
                    "total_shipments_loaded": len(shipments),
                    "version": "1.0.0",
                    "simulation_mode": True,
                })
                return

            # 2. /shipments
            if path == "/shipments":
                self._send_json(shipment_service.get_all_raw_shipments())
                return

            # 3. /shipments/{shipment_id}
            if path.startswith("/shipments/"):
                parts = path.split("/")
                if len(parts) == 3:
                    shipment_id = parts[2]
                    shipment = shipment_service.get_shipment_by_id(shipment_id)
                    if shipment:
                        self._send_json(shipment)
                    else:
                        self._send_error(f"Shipment '{shipment_id}' not found", 404)
                    return

            # 4. /thermal-life/{shipment_id}
            if path.startswith("/thermal-life/"):
                parts = path.split("/")
                if len(parts) == 3:
                    shipment_id = parts[2]
                    eval_res = shipment_service.evaluate_shipment(shipment_id)
                    if eval_res:
                        self._send_json(asdict(eval_res))
                    else:
                        self._send_error(f"Shipment '{shipment_id}' not found", 404)
                    return

            # 5. /route/baseline
            if path == "/route/baseline":
                plan = shipment_service.get_baseline_route()
                self._send_json(asdict(plan))
                return

            # 6. /route/proposed":
            if path == "/route/proposed":
                plan = shipment_service.get_proposed_route()
                self._send_json(asdict(plan))
                return

            # 7. /route/comparison
            if path == "/route/comparison":
                comparison = shipment_service.get_route_comparison()
                self._send_json(asdict(comparison))
                return

            # 8. /overrides
            if path == "/overrides":
                self._send_json(shipment_service.get_all_overrides())
                return

            # 9. /summary
            if path == "/summary":
                summary = shipment_service.get_summary()
                self._send_json(asdict(summary))
                return

            # Not Found
            self._send_error(f"Endpoint '{path}' not found", 404)

        except Exception as e:
            self._send_error(f"Internal server error: {str(e)}", 500)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")

        try:
            # 1. /override
            if path == "/override":
                content_len = int(self.headers.get("Content-Length", 0))
                if content_len == 0:
                    self._send_error("Request body is empty", 400)
                    return
                body = self.rfile.read(content_len).decode("utf-8")
                data = json.loads(body)

                if "shipment_id" not in data or "overridden_priority_score" not in data:
                    self._send_error("Missing required fields: shipment_id, overridden_priority_score", 400)
                    return

                req = OverrideRequest(
                    shipment_id=data["shipment_id"],
                    overridden_priority_score=float(data["overridden_priority_score"]),
                    overridden_action=data.get("overridden_action", "COLLECT NOW"),
                    reason=data.get("reason", "Operator Manual Override"),
                )

                record = shipment_service.apply_override(req)
                self._send_json(asdict(record), 200)
                return

            self._send_error(f"Endpoint '{path}' not found for POST", 404)

        except ValueError as e:
            self._send_error(str(e), 404)
        except Exception as e:
            self._send_error(f"Internal server error: {str(e)}", 500)

    def log_message(self, format, *args):
        """Custom clean logging."""
        sys.stderr.write(f"[API] {self.address_string()} - {format % args}\n")


def run_server(host: str = "127.0.0.1", port: int = 8000):
    server_address = (host, port)
    httpd = ThreadingHTTPServer(server_address, APIServerHandler)
    print(f"==================================================")
    print(f"Remaining Thermal Life Route Prioritiser API Server")
    print(f"Listening on http://{host}:{port}")
    print(f"==================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        httpd.server_close()


if __name__ == "__main__":
    run_server()
