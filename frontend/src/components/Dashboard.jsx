import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Map as MapIcon, 
  LayoutDashboard,
  Route,
  Truck,
  AlertTriangle,
  Bell,
  Activity,
  ServerCrash,
  Play,
  CheckCircle,
  RotateCcw,
  Lock,
  Layers,
  ShieldAlert,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Configurable API base URL: defaults to relative '/api' for Vercel full-stack deployment
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

// ---------------------------------------------------------
// CUSTOM ICONS (Enterprise Style)
// ---------------------------------------------------------
const originIcon = new L.divIcon({ className: 'custom-marker', html: '<div class="h-3 w-3 bg-blue-500 rounded-full border-2 border-slate-900 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>', iconSize: [12, 12], iconAnchor: [6, 6] });
const destIcon = new L.divIcon({ className: 'custom-marker', html: '<div class="h-3 w-3 bg-emerald-500 rounded-full border-2 border-slate-900 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>', iconSize: [12, 12], iconAnchor: [6, 6] });

const getVehicleIcon = (status) => new L.divIcon({
  className: 'custom-vehicle',
  html: `<div class="h-4 w-4 rounded-[3px] border border-slate-900 shadow-[0_0_10px_rgba(0,0,0,0.6)] flex items-center justify-center transform rotate-45 ${status === 'IN TRANSIT' ? 'bg-blue-500' : status === 'MONITORING' ? 'bg-amber-500' : status === 'AT RISK' ? 'bg-rose-500' : 'bg-slate-500'}"><div class="h-1.5 w-1.5 border-t-[1.5px] border-r-[1.5px] border-white transform -rotate-45 mb-[1px] ml-[1px]"></div></div>`,
  iconSize: [16, 16], iconAnchor: [8, 8]
});

const getIncidentIcon = (severity) => new L.divIcon({
  className: 'custom-incident',
  html: `<div class="h-5 w-5 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-lg text-[10px] font-bold text-slate-900 pb-[1px] ${severity === 'HIGH' ? 'bg-rose-500' : severity === 'MEDIUM' ? 'bg-amber-500' : 'bg-yellow-400'}">!</div>`,
  iconSize: [20, 20], iconAnchor: [10, 10]
});

// ---------------------------------------------------------
// SIMULATED DATA SETS (Phase 2 & 3)
// ---------------------------------------------------------
const INITIAL_VEHICLES = [
  { id: 'TRK-102', lat: 26.1100, lng: 91.7500, speed: '42 km/h', route: 'Route A', eta: '3h 20m', risk: 24, status: 'IN TRANSIT' },
  { id: 'TRK-108', lat: 25.9500, lng: 91.8000, speed: '38 km/h', route: 'Route A', eta: '1h 45m', risk: 24, status: 'IN TRANSIT' },
  { id: 'TRK-114', lat: 25.8000, lng: 91.8500, speed: '29 km/h', route: 'Route A', eta: '0h 50m', risk: 45, status: 'MONITORING' },
  { id: 'TRK-121', lat: 26.0500, lng: 91.6000, speed: '0 km/h',  route: 'Route B (Eastern Bypass)', eta: 'Standby', risk: 12, status: 'STANDBY' },
  { id: 'TRK-127', lat: 25.8500, lng: 91.5000, speed: '41 km/h', route: 'Route B (Eastern Bypass)', eta: '2h 10m', risk: 15, status: 'IN TRANSIT' },
  { id: 'TRK-131', lat: 25.6500, lng: 91.6500, speed: '36 km/h', route: 'Route B (Eastern Bypass)', eta: '0h 40m', risk: 18, status: 'IN TRANSIT' }
];

const SIMULATED_INCIDENTS = [
  { id: 1, lat: 25.9200, lng: 91.8200, type: 'Heavy Rainfall', severity: 'HIGH', desc: 'Active weather system causing reduced visibility and slick surfaces.' },
  { id: 2, lat: 25.7500, lng: 91.8800, type: 'Road Obstruction', severity: 'MEDIUM', desc: 'Minor debris reported on highway shoulder.' },
  { id: 3, lat: 26.0000, lng: 91.5500, type: 'Traffic Slowdown', severity: 'LOW', desc: 'Congestion near toll plaza.' },
  { id: 4, lat: 25.5500, lng: 91.8500, type: 'Infrastructure Issue', severity: 'HIGH', desc: 'Bridge expansion joint requires inspection.' },
  { id: 5, lat: 25.8800, lng: 91.4500, type: 'Reduced Visibility', severity: 'MEDIUM', desc: 'Dense fog patches reported.' }
];

const RISK_ZONES = [
  { id: 'z1', center: [25.9000, 91.8500], radius: 12000, level: 'HIGH', color: '#EF4444' },
  { id: 'z2', center: [25.7000, 91.8500], radius: 8000, level: 'MONITOR', color: '#F59E0B' },
  { id: 'z3', center: [25.8000, 91.5500], radius: 15000, level: 'LOW', color: '#10B981' }
];

// ---------------------------------------------------------
// HELPER COMPONENTS
// ---------------------------------------------------------
const SmoothCounter = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(24);

  useEffect(() => {
    if (displayValue === value) return;
    const duration = 500; // ms to reach new value
    const frames = 20;
    const step = (value - displayValue) / frames;
    let currentFrame = 0;

    const interval = setInterval(() => {
      currentFrame++;
      setDisplayValue(prev => {
        const next = Math.round(prev + step);
        if (currentFrame >= frames) {
          clearInterval(interval);
          return value;
        }
        return next;
      });
    }, duration / frames);

    return () => clearInterval(interval);
  }, [value]);

  return <>{displayValue}</>;
};

const NavButton = ({ icon: Icon, active, onClick }) => (
  <button onClick={onClick} className={`p-2.5 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>
    <Icon size={20} strokeWidth={active ? 2.5 : 2} />
  </button>
);

const MapController = ({ routes, resetCamera }) => {
  const map = useMap();
  useEffect(() => {
    if (routes?.Route_A?.coordinates?.length > 0) {
      const bounds = L.latLngBounds(routes.Route_A.coordinates);
      if (routes?.Route_B?.coordinates?.length > 0) bounds.extend(L.latLngBounds(routes.Route_B.coordinates));
      map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 1.5 });
    } else {
      map.fitBounds(L.latLngBounds([[24.5, 89.5], [26.5, 93.5]]), { animate: false });
    }
  }, [routes, map]);
  
  useEffect(() => {
    if (resetCamera > 0 && routes?.Route_A?.coordinates?.length > 0) {
      map.fitBounds(L.latLngBounds(routes.Route_A.coordinates), { padding: [50, 50], animate: true, duration: 1.5 });
    }
  }, [resetCamera, map, routes]);
  return null;
};

// ---------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------
const Dashboard = () => {
  const [panelState, setPanelState] = useState('OPERATIONS_CENTER'); 
  const [activeNav, setActiveNav] = useState('dashboard');
  
  // Phase 1/3: State Machine
  const [demoState, setDemoState] = useState('NORMAL'); 
  const [riskScore, setRiskScore] = useState(24);
  const [aiLog, setAiLog] = useState('');
  
  // Phase 3: Alerts & UI States
  const [alerts, setAlerts] = useState([]);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isRiskExplainOpen, setIsRiskExplainOpen] = useState(false);

  // Phase 2: Map Data & Toggles
  const [vehicles, setVehicles] = useState(INITIAL_VEHICLES);
  const [layers, setLayers] = useState({ riskZones: true, vehicles: true, incidents: true });

  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [routes, setRoutes] = useState({ Route_A: null, Route_B: null, Route_C: null });
  const [resetCamera, setResetCamera] = useState(0);

  // Fetch Routes
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const endpoint = API_BASE_URL.endsWith('/api') ? `${API_BASE_URL}/routes` : `${API_BASE_URL}/api/routes`;
        const routesRes = await axios.get(endpoint);
        setRoutes(routesRes.data);
      } catch (error) {
        console.error("API Error:", error); setHasError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchRoutes();
  }, []);

  // Phase 2: Lightweight Vehicle Movement Simulator
  useEffect(() => {
    const movementInterval = setInterval(() => {
      setVehicles(prev => prev.map(v => {
        if (v.status === 'IN TRANSIT') {
          return { ...v, lat: v.lat - 0.0003, lng: v.lng - 0.0001 };
        }
        return v;
      }));
    }, 2000);
    return () => clearInterval(movementInterval);
  }, []);

  // Phase 1 -> Phase 2 Sync: Reroute all affected vehicles dynamically
  useEffect(() => {
    if (demoState === 'ACCEPTED') {
      setVehicles(prev => prev.map((v, index) => {
        // If the vehicle is trapped on Route A, migrate it to Route B
        if (v.route === 'Route A') {
          return { 
            ...v, 
            route: 'Route B (Eastern Bypass)', 
            eta: '3h 45m', 
            risk: 28, 
            status: 'IN TRANSIT',
            // Shift coordinates East to visually snap them onto the green Route B polyline
            // The index math ensures the trucks space out and don't stack on top of each other
            lng: 92.05 + (index * 0.03), 
            lat: 25.95 - (index * 0.12)
          };
        }
        return v;
      }));
    }
  }, [demoState]);

  const addAlert = (severity, title, desc) => {
    setAlerts(prev => [{ id: Date.now(), severity, title, desc }, ...prev].slice(0, 5));
  };

  const startDisruptionScenario = () => {
    setDemoState('TRIGGERED');
    addAlert('HIGH', 'Route A accessibility at risk', 'SIMULATED');
    addAlert('MEDIUM', 'Heavy rainfall scenario active', 'SIMULATED');
    
    setTimeout(() => {
      setDemoState('REASSESSING');
      const riskSteps = [38, 56, 71, 84];
      let stepIdx = 0;
      const interval = setInterval(() => {
        if (stepIdx < riskSteps.length) { setRiskScore(riskSteps[stepIdx]); stepIdx++; } 
        else { clearInterval(interval); setDemoState('RECOMMENDING'); }
      }, 500);
    }, 1500);
  };

  const acceptAlternateRoute = () => {
    setDemoState('ACCEPTED');
    addAlert('SUCCESS', 'Route B accepted as alternate', 'Driver alert simulated');
  };

  const fullReset = () => {
    setDemoState('NORMAL');
    setRiskScore(24);
    setVehicles(INITIAL_VEHICLES);
    setAlerts([]);
    setIsAlertOpen(false);
    setIsRiskExplainOpen(false);
    setPanelState('OPERATIONS_CENTER');
    setActiveNav('dashboard');
    setResetCamera(prev => prev + 1);
  };

  const toggleLayer = (layer) => setLayers(prev => ({ ...prev, [layer]: !prev[layer] }));

  const renderSignalBar = (label, level, widthClass, colorClass) => (
    <div className="mb-2">
      <div className="flex justify-between text-[10px] mb-1">
        <span className="text-slate-400">{label}</span>
        <span className={`font-bold tracking-wider ${colorClass}`}>{level}</span>
      </div>
      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${colorClass} bg-current opacity-80 ${widthClass}`}></div>
      </div>
    </div>
  );

  // --- RIGHT PANEL RENDERING (Phase 3) ---
  const renderOperationsCenter = () => (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <LayoutDashboard size={14} className="text-blue-500" /> Regional Operations Center
          </h2>
          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-500"></span> Demo / Simulation Data
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-green-900/20 border border-green-800/50 px-2.5 py-1 rounded-full">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-[9px] font-bold text-green-400 uppercase tracking-widest">Live</span>
        </div>
      </div>

      {demoState === 'NORMAL' && (
        <div className="space-y-4">
          <div className="bg-[#131b2b] border border-slate-800 p-4 rounded-xl">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-4">Regional Operations</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="font-mono text-2xl font-bold text-slate-200">12</div>
                <div className="text-[9px] text-slate-400 uppercase tracking-widest">Active Vehicles</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-bold text-slate-200">08</div>
                <div className="text-[9px] text-slate-400 uppercase tracking-widest">Monitored Routes</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-bold text-amber-500">02</div>
                <div className="text-[9px] text-slate-400 uppercase tracking-widest">Active Incidents</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-bold text-blue-400">01</div>
                <div className="text-[9px] text-slate-400 uppercase tracking-widest">Route Under<br/>Observation</div>
              </div>
            </div>
          </div>

          <div className="bg-[#131b2b] border border-slate-800 p-4 rounded-xl flex justify-between items-center">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Regional Risk</div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xl font-bold text-green-400">32<span className="text-xs text-slate-500">/100</span></span>
              <span className="text-[10px] font-bold text-green-400 bg-green-950/50 px-2 py-0.5 rounded border border-green-900/50">LOW</span>
            </div>
          </div>

          <div className="bg-slate-800/30 border border-slate-700/50 p-4 rounded-xl">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">Active Alerts</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500"></div> 1 Route Alert
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div> 1 Weather Signal
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button onClick={startDisruptionScenario} className="w-full py-3.5 rounded-lg text-[11px] font-bold tracking-widest uppercase bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 flex items-center justify-center gap-2 transition-all hover:border-amber-500/50 hover:text-amber-400">
              <Play size={14} /> Run Disruption Scenario
            </button>
          </div>
        </div>
      )}

      {(demoState === 'TRIGGERED' || demoState === 'REASSESSING') && (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-amber-900/20 border border-amber-800/50 py-3 px-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-amber-500 animate-pulse" />
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Scenario Mode Active</span>
            </div>
          </div>
          
          <div className="bg-rose-950/20 border border-rose-900/40 p-6 rounded-xl text-center shadow-lg relative overflow-hidden">
            {/* Ambient Danger Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-rose-500/10 blur-3xl rounded-full"></div>
            
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-2 font-bold flex items-center justify-center gap-2">
              <Activity size={14} className={demoState === 'REASSESSING' ? 'animate-spin text-rose-400' : 'text-slate-500'} /> 
              System Reassessing Risk
            </div>

            {/* THE BIG ANIMATED NUMBER */}
            <div className="font-mono text-6xl font-bold text-rose-500 my-4 tracking-tighter drop-shadow-[0_0_15px_rgba(244,63,94,0.4)]">
              <SmoothCounter value={riskScore} />
              <span className="text-2xl text-rose-800 font-medium">/100</span>
            </div>

            <div className="text-xs font-bold uppercase tracking-widest mb-6">
              <span className={riskScore >= 70 ? 'text-rose-500' : 'text-amber-500'}>
                {riskScore >= 70 ? 'High Risk' : 'Elevated Risk'}
              </span>
            </div>
            
            <div className="bg-[#0a0f18] rounded-lg p-3 border border-slate-800 relative z-10 text-left">
               <div className="flex items-center gap-2 text-[10px] font-mono text-blue-400 mb-2">
                 <Activity size={12} className="animate-spin" /> {aiLog || 'Initializing AI Models...'}
               </div>
               <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                 <div className="h-full bg-blue-500 transition-all duration-500 ease-out" style={{ width: `${(riskScore / 84) * 100}%` }}></div>
               </div>
            </div>
          </div>
        </div>
      )}

      {demoState === 'RECOMMENDING' && (
        <div className="animate-in slide-in-from-right-4 fade-in duration-500">
          
          {/* A. RISK INTELLIGENCE CARD */}
          <div className="bg-rose-950/20 border border-rose-900/40 p-4 rounded-xl mb-4">
            <div className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-3">Disruption Risk Estimation</div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-sm font-bold text-slate-200">ROUTE A</div>
                <div className="text-[10px] text-rose-400 font-bold uppercase mt-1">High Risk</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-2xl font-bold text-rose-500 leading-none">84<span className="text-sm text-slate-500">/100</span></div>
              </div>
            </div>
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-rose-900/40">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest">Accessibility</span>
              <span className="text-[10px] font-bold text-rose-500 bg-rose-950/50 px-2 py-0.5 rounded border border-rose-900/50">AT RISK</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest">Confidence in Current<br/>Risk Classification</span>
              <span className="font-mono text-lg font-bold text-blue-400">87%</span>
            </div>
            <div className="text-[9px] text-slate-500 italic mt-2 text-right">
              Based on available environmental, geospatial and incident signals.
            </div>
          </div>

          {/* B. CONTRIBUTING SIGNALS */}
          <div className="bg-[#131b2b] border border-slate-800 p-4 rounded-xl mb-4">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">Contributing Signals</div>
            {renderSignalBar('Heavy Rainfall', 'HIGH', 'w-[90%]', 'text-rose-500')}
            {renderSignalBar('Terrain Exposure', 'HIGH', 'w-[85%]', 'text-rose-500')}
            {renderSignalBar('Recent Road Incident', 'HIGH', 'w-[75%]', 'text-rose-500')}
            {renderSignalBar('Historical Disruption', 'MEDIUM', 'w-[50%]', 'text-amber-500')}
            {renderSignalBar('Road Condition', 'MEDIUM', 'w-[40%]', 'text-amber-500')}
          </div>

          {/* D. WHY DID RISK INCREASE? */}
          <div className="bg-[#131b2b] border border-slate-800 rounded-xl overflow-hidden mb-6">
            <button 
              onClick={() => setIsRiskExplainOpen(!isRiskExplainOpen)} 
              className="w-full p-3 flex justify-between items-center bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Why did risk increase?</span>
              {isRiskExplainOpen ? <ChevronUp size={14} className="text-slate-400"/> : <ChevronDown size={14} className="text-slate-400"/>}
            </button>
            {isRiskExplainOpen && (
              <div className="p-4 border-t border-slate-800 space-y-3 bg-[#0a0f18]/50">
                <div>
                  <div className="text-[10px] font-bold text-slate-300 uppercase mb-1">Weather</div>
                  <div className="text-[10px] text-slate-500">Heavy rainfall increases disruption exposure along the corridor.</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-300 uppercase mb-1">Terrain</div>
                  <div className="text-[10px] text-slate-500">Mountainous terrain increases vulnerability to weather-related road disruption.</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-300 uppercase mb-1">Recent Incident</div>
                  <div className="text-[10px] text-slate-500">A simulated road incident was introduced near the route.</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-300 uppercase mb-1">Historical Pattern</div>
                  <div className="text-[10px] text-slate-500">Historical disruption information contributes to the current assessment.</div>
                </div>
                <div className="pt-2 mt-2 border-t border-slate-800 text-[9px] text-slate-500 italic text-center">
                  RIDGE combines multiple signals to estimate current route disruption risk.
                </div>
              </div>
            )}
          </div>

          {/* E. ROUTE COMPARISON */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Alternative Route Identified</div>
            
            <div className="bg-[#131b2b] border border-slate-800 p-3 rounded-lg mb-2 opacity-70">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <div className="text-xs font-bold text-slate-300">Route A</div>
                  <div className="text-[8px] text-slate-500 uppercase tracking-widest">Primary Route</div>
                </div>
                <span className="text-[9px] font-bold text-rose-500 bg-rose-950/30 px-2 py-0.5 rounded border border-rose-900/30">AT RISK</span>
              </div>
              <div className="flex justify-between items-end text-xs text-slate-400">
                <div className="space-x-3"><span>120 km</span><span>3h 20m</span></div>
                <div className="text-rose-500 font-bold font-mono">84 / 100 <span className="text-[9px] font-sans">HIGH RISK</span></div>
              </div>
            </div>

            <div className="bg-green-950/20 border-2 border-green-800/50 p-4 rounded-lg relative">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <div className="text-sm font-bold text-slate-200">Route B (Eastern Bypass)</div>
                  <div className="text-[9px] text-green-400 uppercase tracking-widest mt-0.5">Alternative Route</div>
                </div>
                <span className="text-[9px] font-bold text-green-400 bg-green-900/30 px-2 py-0.5 rounded border border-green-800/50">ACCESSIBLE</span>
              </div>
              <div className="flex justify-between items-end text-sm text-slate-300 mb-4">
                <div className="space-x-4"><span>135 km</span><span className="font-bold">3h 45m</span></div>
                <div className="text-green-400 font-bold font-mono">28 / 100 <span className="text-[9px] font-sans">LOW RISK</span></div>
              </div>
              <div className="flex gap-2 mb-4">
                <span className="text-[10px] text-amber-500 bg-amber-950/30 px-2 py-1 rounded border border-amber-900/30">+25 min ETA</span>
                <span className="text-[10px] text-green-400 bg-green-950/30 px-2 py-1 rounded border border-green-900/30">Lower estimated disruption risk</span>
              </div>
              <button onClick={acceptAlternateRoute} className="w-full py-3 rounded-lg text-[10px] font-bold tracking-widest uppercase bg-green-600 hover:bg-green-500 text-white flex items-center justify-center transition-transform hover:scale-[1.02] shadow-[0_0_15px_rgba(22,163,74,0.15)]">
                Accept Alternate Route
              </button>
              <button className="w-full mt-2 py-2 text-[10px] font-bold text-slate-500 hover:text-slate-300 uppercase tracking-widest transition-colors">
                Keep Current Route
              </button>
            </div>
          </div>
        </div>
      )}

      {demoState === 'ACCEPTED' && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 fade-in duration-500">
          <div className="bg-green-900/20 border border-green-800/50 p-4 rounded-xl flex flex-col items-center text-center mb-4">
            <CheckCircle size={24} className="text-green-500 mb-2" />
            <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest mb-1">Route Updated</span>
            <span className="text-[9px] text-slate-400 italic">Driver notification simulated</span>
          </div>
          
          <div className="bg-[#131b2b] border border-slate-800 p-5 rounded-xl">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-4">Active Route</div>
            <div className="flex justify-between items-center mb-3 border-b border-slate-800/80 pb-3">
              <span className="text-sm font-semibold text-slate-200">Route B (Eastern Bypass)</span>
              <span className="text-[9px] font-bold text-green-400 bg-green-900/30 px-2 py-0.5 rounded border border-green-800">ACCESSIBLE</span>
            </div>
            <div className="flex justify-between items-end pt-2">
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">ETA</div>
                <div className="font-mono text-xl font-bold text-blue-400">3h 45m</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Risk Score</div>
                <div className="font-mono text-xl font-bold text-green-400">28<span className="text-xs text-slate-500">/100</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-screen w-full bg-[#0a0f18] text-slate-100 font-sans overflow-hidden">
      {/* HEADER */}
      <header className="h-[60px] bg-[#0d131f] border-b border-slate-800/80 flex items-center justify-between px-5 shrink-0 z-20">
        <div className="flex items-center gap-3.5">
          <MapIcon className="text-blue-500" size={22} />
          <div className="flex flex-col">
            <h1 className="text-sm font-bold tracking-widest text-slate-100 uppercase">RIDGE</h1>
            <span className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">REGIONAL INTELLIGENCE & GEOSPATIAL EFFICIENCY</span>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest hidden md:block mr-6">
            REGIONAL OPERATIONS CENTER
          </div>

          <div className="relative mr-4">
            <button 
              onClick={() => setIsAlertOpen(!isAlertOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors ${alerts.length > 0 ? 'bg-amber-900/30 border-amber-800/50 text-amber-500' : 'bg-slate-800/50 border-slate-700/50 text-slate-400'}`}
            >
              <Bell size={12} className={alerts.length > 0 && !isAlertOpen ? 'animate-bounce' : ''} />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                {alerts.length > 0 ? `${alerts.length} Alerts` : '0 Alerts'}
              </span>
            </button>
            
            {isAlertOpen && (
              <div className="absolute top-full mt-2 right-0 w-72 bg-[#0d131f] border border-slate-700 rounded-xl shadow-2xl z-[1000] overflow-hidden">
                <div className="p-3 border-b border-slate-800 bg-[#131b2b] flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alert Center</span>
                  <button onClick={() => setAlerts([])} className="text-[9px] text-slate-500 hover:text-slate-300 uppercase">Clear All</button>
                </div>
                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                  {alerts.length === 0 ? (
                    <div className="p-6 text-center text-[10px] text-slate-500 uppercase tracking-widest">No active alerts</div>
                  ) : (
                    alerts.map(alert => (
                      <div key={alert.id} className="p-3 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                            alert.severity === 'HIGH' ? 'bg-rose-950/50 text-rose-500 border-rose-900/50' : 
                            alert.severity === 'MEDIUM' ? 'bg-amber-950/50 text-amber-500 border-amber-900/50' :
                            'bg-green-950/50 text-green-500 border-green-900/50'
                          }`}>
                            {alert.severity}
                          </span>
                          <span className="text-[10px] font-bold text-slate-200 truncate">{alert.title}</span>
                        </div>
                        <div className="text-[9px] text-slate-500 italic ml-[42px]">{alert.desc}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 bg-[#131b2b] border border-slate-800 px-3 py-1.5 rounded-full">
            <div className={`h-2 w-2 rounded-full animate-pulse ${hasError ? 'bg-rose-500' : 'bg-green-500'}`}></div>
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{hasError ? 'SYSTEM OFFLINE' : 'SYSTEM OPERATIONAL'}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* NAV */}
        <nav className="w-[72px] bg-[#0d131f] border-r border-slate-800/80 flex flex-col items-center py-6 gap-5 shrink-0 z-10">
          <NavButton icon={LayoutDashboard} active={activeNav === 'dashboard'} onClick={() => setActiveNav('dashboard')} />
          <div className="mt-auto mb-2 flex flex-col gap-5 items-center">
            <div className="w-10 border-t border-slate-800/80 mb-1"></div>
            <button onClick={fullReset} className="p-2.5 rounded-xl transition-all text-slate-500 hover:text-white hover:bg-slate-700 bg-[#131b2b] border border-slate-800 shadow-sm flex flex-col items-center gap-1">
              <RotateCcw size={16} strokeWidth={2.5} />
              <span className="text-[8px] font-bold uppercase tracking-widest">Reset</span>
            </button>
          </div>
        </nav>

        {/* MAP PANEL */}
        <main className="flex-1 relative z-0 bg-[#060a11]">
          {/* Phase 2: Floating Data Layers Control */}
          <div className="absolute top-4 right-4 z-[1000] bg-[#0d131f]/90 backdrop-blur-sm border border-slate-700/80 rounded-xl p-3 shadow-lg">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Layers size={12}/> Data Layers</div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input type="checkbox" checked={layers.riskZones} onChange={() => toggleLayer('riskZones')} className="accent-blue-500"/> Risk Zones
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input type="checkbox" checked={layers.vehicles} onChange={() => toggleLayer('vehicles')} className="accent-blue-500"/> Fleet Telemetry
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input type="checkbox" checked={layers.incidents} onChange={() => toggleLayer('incidents')} className="accent-blue-500"/> Incident Reports
              </label>
            </div>
          </div>

          {/* Phase 2: Floating Map Legend */}
          <div className="absolute bottom-4 right-4 z-[1000] bg-[#0d131f]/90 backdrop-blur-sm border border-slate-700/80 rounded-xl p-4 shadow-lg w-48">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-700/50 pb-2">Map Legend</div>
            <div className="space-y-3">
              <div>
                <div className="text-[9px] text-slate-500 font-bold uppercase mb-1">Route Status</div>
                <div className="flex items-center gap-2 text-[10px] text-slate-300"><div className="h-2 w-2 rounded-full bg-green-500"></div> Accessible</div>
                <div className="flex items-center gap-2 text-[10px] text-slate-300 mt-1"><div className="h-2 w-2 rounded-full bg-amber-500"></div> Monitor</div>
                <div className="flex items-center gap-2 text-[10px] text-slate-300 mt-1"><div className="h-2 w-2 rounded-full bg-rose-500"></div> High Risk</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-500 font-bold uppercase mb-1">Vehicles</div>
                <div className="flex items-center gap-2 text-[10px] text-slate-300"><div className="h-2 w-2 rounded-[2px] bg-blue-500"></div> In Transit</div>
              </div>
            </div>
          </div>

          <MapContainer className="h-full w-full" zoomControl={false} attributionControl={false}>
            <MapController routes={routes} resetCamera={resetCamera} />
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}" />
            
            {/* Phase 2: RISK ZONES */}
            {layers.riskZones && RISK_ZONES.map(zone => (
              <Circle key={zone.id} center={zone.center} radius={zone.radius} pathOptions={{ color: zone.color, fillColor: zone.color, fillOpacity: 0.1, weight: 1 }} />
            ))}

            {/* ROUTE A */}
            {routes.Route_A && (
              <Polyline 
                key={`route-a-${demoState}`}
                positions={routes.Route_A.coordinates} 
                color={demoState === 'NORMAL' ? "#10B981" : demoState === 'ACCEPTED' ? "#991B1B" : "#EF4444"} 
                weight={demoState === 'ACCEPTED' ? 3 : 5} 
                dashArray={demoState === 'ACCEPTED' ? "5, 10" : "0"} 
                opacity={demoState === 'ACCEPTED' ? 0.4 : 1} 
                pathOptions={{ className: (demoState === 'TRIGGERED' || demoState === 'REASSESSING') ? 'animate-pulse' : '' }}
              />
            )}

            {/* ROUTE B */}
            {routes.Route_B && (demoState === 'RECOMMENDING' || demoState === 'ACCEPTED') && (
              <Polyline 
                key={`route-b-${demoState}`}
                positions={routes.Route_B.coordinates} 
                color="#10B981" 
                weight={demoState === 'RECOMMENDING' ? 4 : 5} 
                dashArray={demoState === 'RECOMMENDING' ? "8, 8" : "0"} 
                opacity={demoState === 'RECOMMENDING' ? 0.7 : 1} 
              />
            )}

            {/* SCENARIO MARKER */}
            {(demoState === 'TRIGGERED' || demoState === 'REASSESSING' || demoState === 'RECOMMENDING') && routes.Route_A && (
               <Circle center={routes.Route_A.coordinates[Math.floor(routes.Route_A.coordinates.length / 2)]} pathOptions={{ color: '#EF4444', fillColor: '#EF4444', fillOpacity: 0.4 }} radius={8000} className="animate-pulse" />
            )}

            {/* SIMULATED VEHICLES */}
            {layers.vehicles && vehicles.map(vehicle => {
              // Calculate real-time dynamic risk for Route A vehicles during the crisis
              const isAffected = vehicle.route === 'Route A' && (demoState === 'TRIGGERED' || demoState === 'REASSESSING' || demoState === 'RECOMMENDING');
              const currentRisk = isAffected ? Math.max(vehicle.risk, riskScore) : vehicle.risk;
              const currentStatus = isAffected && currentRisk >= 70 ? 'AT RISK' : vehicle.status;
              const isHalted = currentStatus === 'AT RISK';

              return (
                <Marker key={vehicle.id} position={[vehicle.lat, vehicle.lng]} icon={getVehicleIcon(currentStatus)}>
                  <Popup className="bg-slate-900 border-slate-800">
                    <div className="font-sans min-w-[150px]">
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 border-b border-slate-200 pb-1">Vehicle Telemetry</div>
                      
                      <div className="font-mono text-sm font-bold text-slate-800 mb-2">
                        {vehicle.id} 
                        <span className={`text-[9px] px-1 py-0.5 rounded ml-1 font-bold ${isHalted ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-blue-100 text-blue-800'}`}>
                          {currentStatus}
                        </span>
                      </div>
                      
                      <div className="text-xs text-slate-600 flex justify-between mb-1">
                        <span>Speed:</span> 
                        <strong className={isHalted ? 'text-rose-600' : ''}>{isHalted ? '0 km/h (HALTED)' : vehicle.speed}</strong>
                      </div>
                      
                      <div className="text-xs text-slate-600 flex justify-between mb-1">
                        <span>Route:</span> 
                        <strong>{vehicle.route}</strong>
                      </div>
                      
                      <div className="text-xs text-slate-600 flex justify-between mb-1">
                        <span>ETA:</span> 
                        <strong className={isHalted ? 'text-rose-600' : ''}>{isHalted ? 'DELAYED' : vehicle.eta}</strong>
                      </div>
                      
                      <div className="text-xs text-slate-600 flex justify-between mb-2">
                        <span>Risk:</span> 
                        <strong className={isHalted ? 'text-rose-600 font-bold text-sm' : ''}>{currentRisk}/100</strong>
                      </div>
                      
                      <div className="text-[8px] text-slate-400 italic text-right">Demo / simulated</div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Phase 2: SIMULATED INCIDENTS */}
            {layers.incidents && SIMULATED_INCIDENTS.map(inc => (
              <Marker key={inc.id} position={[inc.lat, inc.lng]} icon={getIncidentIcon(inc.severity)}>
                <Popup>
                  <div className="font-sans min-w-[160px]">
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 border-b border-slate-200 pb-1">Incident Report</div>
                    <div className="text-xs font-bold text-slate-800 mb-1">{inc.type}</div>
                    <div className="text-[10px] font-bold mb-2 p-1 text-center rounded bg-slate-100 text-slate-700 border border-slate-300">Severity: {inc.severity}</div>
                    <div className="text-xs text-slate-600 mb-2 leading-tight">{inc.desc}</div>
                    <div className="text-[8px] text-slate-400 italic text-right">Status: SIMULATED</div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* ORIGIN/DEST MARKERS */}
            {routes.Route_A && routes.Route_A.coordinates.length > 0 && (
              <>
                <Marker position={routes.Route_A.coordinates[0]} icon={originIcon} />
                <Marker position={routes.Route_A.coordinates[routes.Route_A.coordinates.length - 1]} icon={destIcon} />
              </>
            )}
          </MapContainer>
        </main>

        {/* RIGHT PANEL */}
        <aside className="w-[380px] bg-[#0d131f] border-l border-slate-800/80 flex flex-col shrink-0 z-10 p-6 overflow-y-auto">
          {loading ? (
             <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-500">
               <Activity className="animate-spin text-blue-500" size={24} /> 
               <span className="text-xs font-medium uppercase tracking-widest">Connecting to NER Servers...</span>
             </div>
          ) : panelState === 'OPERATIONS_CENTER' ? (
             renderOperationsCenter()
          ) : null}
        </aside>
      </div>
    </div>
  );
};

export default Dashboard;
