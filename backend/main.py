from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

app = FastAPI(title="NER Logistics Intelligence Platform - API")

# Add CORS middleware so the React frontend can call these endpoints
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RouteRequest(BaseModel):
    route_id: str

class RouteResponse(BaseModel):
    risk_score: int
    risk_level: str
    accessibility: str
    eta_minutes: int
    recommended_route: str
    reasons: List[str]

@app.get("/api/routes")
def get_routes():
    """
    Returns basic coordinates for a default 'Route A' and an alternative 'Route B' in the NER region.
    Coordinates are roughly around Guwahati/Shillong.
    """
    return {
        "Route_A": {
            "id": "route_A",
            "name": "Primary Route (Highway)",
            "coordinates": [
                {"lat": 26.1445, "lng": 91.7362}, # Origin - Guwahati
                {"lat": 25.8611, "lng": 91.8145}, # Midpoint (near incident)
                {"lat": 25.5788, "lng": 91.8933}  # Destination - Shillong
            ]
        },
        "Route_B": {
            "id": "route_B",
            "name": "Alternative Route B (Eastern Bypass)",
            "coordinates": [
                {"lat": 26.1445, "lng": 91.7362}, # Origin - Guwahati
                {"lat": 25.9500, "lng": 92.0800}, # Eastern detour
                {"lat": 25.7200, "lng": 92.0100}, # Mid-point bypass
                {"lat": 25.5788, "lng": 91.8933}  # Destination - Shillong
            ]
        },
        "Route_C": {
            "id": "route_C",
            "name": "Alternative Route C (Western Loop)",
            "coordinates": [
                {"lat": 26.1445, "lng": 91.7362}, # Origin - Guwahati
                {"lat": 26.0100, "lng": 91.4500}, # Western swing
                {"lat": 25.7800, "lng": 91.3800}, # Mid-point loop
                {"lat": 25.5788, "lng": 91.8933}  # Destination - Shillong
            ]
        }
    }

@app.post("/api/route/analyze", response_model=RouteResponse)
def analyze_route(request: RouteRequest):
    """
    Accepts a route ID. Returns a baseline mock response.
    """
    return RouteResponse(
        risk_score=24,
        risk_level="LOW",
        accessibility="ACCESSIBLE",
        eta_minutes=200,
        recommended_route="Route_A",
        reasons=["Clear weather", "Normal traffic"]
    )

@app.post("/api/route/simulate-disruption", response_model=RouteResponse)
def simulate_disruption(request: RouteRequest):
    """
    Accepts a route ID. Returns the disrupted response.
    """
    return RouteResponse(
        risk_score=84,
        risk_level="HIGH",
        accessibility="AT_RISK",
        eta_minutes=225,
        recommended_route="Route_B",
        reasons=["Heavy rainfall", "High slope exposure", "Recent road incident"]
    )
