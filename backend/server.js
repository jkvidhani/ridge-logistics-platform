const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS for all incoming origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON request bodies
app.use(express.json());

// Geospatial Route definitions matching the RIDGE Regional Operations contract
const ROUTES_DATA = {
  Route_A: {
    id: "route_A",
    name: "Primary Route (Highway)",
    coordinates: [
      { lat: 26.1445, lng: 91.7362 }, // Origin - Guwahati
      { lat: 25.8611, lng: 91.8145 }, // Midpoint (near incident)
      { lat: 25.5788, lng: 91.8933 }  // Destination - Shillong
    ]
  },
  Route_B: {
    id: "route_B",
    name: "Alternative Route B (Eastern Bypass)",
    coordinates: [
      { lat: 26.1445, lng: 91.7362 }, // Origin - Guwahati
      { lat: 25.9500, lng: 92.0800 }, // Eastern detour
      { lat: 25.7200, lng: 92.0100 }, // Mid-point bypass
      { lat: 25.5788, lng: 91.8933 }  // Destination - Shillong
    ]
  },
  Route_C: {
    id: "route_C",
    name: "Alternative Route C (Western Loop)",
    coordinates: [
      { lat: 26.1445, lng: 91.7362 }, // Origin - Guwahati
      { lat: 26.0100, lng: 91.4500 }, // Western swing
      { lat: 25.7800, lng: 91.3800 }, // Mid-point loop
      { lat: 25.5788, lng: 91.8933 }  // Destination - Shillong
    ]
  }
};

const router = express.Router();

// GET /api/routes
router.get('/routes', (req, res) => {
  res.json(ROUTES_DATA);
});

// POST /api/route/analyze
router.post('/route/analyze', (req, res) => {
  const { route_id } = req.body || {};
  res.json({
    risk_score: 24,
    risk_level: "LOW",
    accessibility: "ACCESSIBLE",
    eta_minutes: 200,
    recommended_route: route_id || "Route_A",
    reasons: ["Clear weather", "Normal traffic"]
  });
});

// POST /api/route/simulate-disruption
router.post('/route/simulate-disruption', (req, res) => {
  res.json({
    risk_score: 84,
    risk_level: "HIGH",
    accessibility: "AT_RISK",
    eta_minutes: 225,
    recommended_route: "Route_B",
    reasons: ["Heavy rainfall", "High slope exposure", "Recent road incident"]
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: "healthy",
    service: "RIDGE Logistics Intelligence Platform - Express API",
    environment: process.env.VERCEL ? "vercel-serverless" : "standalone"
  });
});

// Mount routes on both '/api' and '/' to ensure compatibility with Vercel rewrites
app.use('/api', router);
app.use('/', router);

// Handle 404 for unknown API endpoints
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found", path: req.path });
});

// Avoid calling app.listen() directly in serverless environment (Vercel)
// Only listen when executed standalone (e.g., node backend/server.js in local development)
if (require.main === module) {
  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    console.log(`[RIDGE] Express Server listening on http://127.0.0.1:${PORT}`);
  });
}

// Export the Express app instance for Vercel Serverless Functions
module.exports = app;
