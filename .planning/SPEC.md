# NER Logistics & Accessibility Intelligence Platform (Prototype)

## 1. Core Concept
A web-based AI-powered Logistics platform for India's North-Eastern Region (NER). It acts as a predictive intelligence layer combining weather, geospatial, and historical data to assess route accessibility.

**Technical Note**: We are building a highly credible prototype. The backend uses simulated data, but the API contracts are structured exactly like a production system so mock logic can be swapped with real ML models later.

## 2. The "Killer Flow" (Demo Narrative)
The demo focuses on one end-to-end scenario: **Route → Risk → Disruption → Reroute → Alert**

1. **Select Route**: User selects origin/destination on the NER map.
2. **Initial Route Analysis**: System calculates Distance, ETA, Accessibility, and Risk (e.g., 🟢 Risk: 24/100).
3. **Disruption Event Occurs**: Simulate heavy rainfall + road incident.
4. **AI Reassesses**: Risk score jumps (e.g., 🔴 Risk: 84/100). The system explicitly explains why.
5. **Dynamic Route Optimization**: System evaluates alternatives.
6. **ETA Recalculation**: System selects Route B and updates arrival time.
7. **Real-Time Alert**: Driver receives a notification.
8. **Dashboard Update**: Map segments turn red, vehicle path switches to the safer alternative.

## 3. Constraints
- **Tech Stack**: React + Vite + Tailwind + Leaflet (Frontend) | FastAPI + Python (Backend).
- **Infrastructure**: No heavy DBs (PostGIS) or real ML models yet. Use static JSON/Python logic on the backend.
- **Terminology**: Always use "Disruption Risk Estimation", never "Landslide Prediction".
