import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://ridge-logistics-platform-production.up.railway.app';

import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Map as MapIcon, 
  Settings, 
  ShieldAlert,
  Activity,
  ServerCrash,
  LayoutDashboard,
  Route,
  Truck,
  AlertTriangle,
  BrainCircuit,
  Bell,
  Info,
  ArrowLeft,
  Check,
  CheckCircle2,
  X,
  Search,
  PlusCircle,
  MapPin,
  RotateCcw,
  Lock,
  Layers
} from 'lucide-react';

// ---------------------------------------------------------
// MAP MARKERS & STATIC DATA
// ---------------------------------------------------------

const originIcon = new L.divIcon({
  className: 'custom-marker',
  html: '<div class="h-3 w-3 bg-blue-500 rounded-full border-2 border-slate-900 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const destIcon = new L.divIcon({
  className: 'custom-marker',
  html: '<div class="h-3 w-3 bg-emerald-500 rounded-full border-2 border-slate-900 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const vehicleIcon = new L.divIcon({
  className: 'custom-vehicle',
  html: `
    <div class="h-4 w-4 bg-blue-500 rounded-[3px] border border-slate-900 shadow-[0_0_10px_rgba(59,130,246,0.6)] flex items-center justify-center transform rotate-45">
      <div class="h-1.5 w-1.5 border-t-[1.5px] border-r-[1.5px] border-white transform -rotate-45 mb-[1px] ml-[1px]"></div>
    </div>
  `,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const stoppedVehicleIcon = new L.divIcon({
  className: 'custom-vehicle',
  html: `
    <div class="h-4 w-4 bg-amber-500 rounded-[3px] border border-slate-900 shadow-lg flex items-center justify-center">
      <div class="h-1.5 w-1.5 bg-white rounded-sm"></div>
    </div>
  `,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const incidentWarningIcon = new L.divIcon({
  className: 'custom-incident',
  html: '<div class="h-5 w-5 bg-amber-500 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-lg text-[10px] font-bold text-slate-900 pb-[1px]">!</div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const incidentInfoIcon = new L.divIcon({
  className: 'custom-incident',
  html: '<div class="h-5 w-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-lg text-[9px]">🌧️</div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const SIMULATED_VEHICLES = [
  { id: 'TRK-102', lat: 26.11, lng: 91.75, speed: '42 km/h', route: 'Guwahati → Shillong', eta: '3h 12m', status: 'IN TRANSIT', type: 'active' },
  { id: 'TRK-408', lat: 26.25, lng: 92.05, speed: '55 km/h', route: 'Nagaon → Tezpur', eta: '1h 45m', status: 'IN TRANSIT', type: 'active' },
  { id: 'TRK-890', lat: 25.75, lng: 91.50, speed: '0 km/h', route: 'Guwahati → Tura', eta: 'Delayed', status: 'STOPPED', type: 'stopped' }
];

const SIMULATED_INCIDENTS = [
  { lat: 25.98, lng: 92.15, type: 'warning', desc: 'Road surface damage reported by PWD.' },
  { lat: 26.30, lng: 91.80, type: 'info', desc: 'Heavy Rainfall alert active.' }
];

// ---------------------------------------------------------
// HELPER COMPONENTS
// ---------------------------------------------------------

const NavButton = ({ icon: Icon, active, onClick }) => (
  <button onClick={onClick} className={`p-2.5 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>
    <Icon size={20} strokeWidth={active ? 2.5 : 2} />
  </button>
);

const AlertItem = ({ time, text, type }) => (
  <div className={`p-3.5 rounded-xl border flex gap-3 ${type === 'warning' ? 'bg-rose-900/10 border-rose-900/30' : type === 'high' ? 'bg-amber-900/10 border-amber-900/30' : 'bg-slate-800/30 border-slate-700/50'}`}>
    <div className={`mt-0.5 ${type === 'warning' ? 'text-rose-500' : type === 'high' ? 'text-amber-500' : 'text-blue-500'}`}>
      {type === 'warning' || type === 'high' ? <ShieldAlert size={16} /> : <Info size={16} />}
    </div>
    <div>
      <div className="text-[10px] font-mono text-slate-500 mb-1">{time}</div>
      <div className="text-xs text-slate-300 leading-relaxed">{text}</div>
    </div>
  </div>
);

const MapController = ({ routes, panelState, resetCamera }) => {
  const map = useMap();
  
  useEffect(() => {
    if (routes?.Route_A?.coordinates?.length > 0) {
      const bounds = L.latLngBounds(routes.Route_A.coordinates);
      if (routes?.Route_B?.coordinates?.length > 0) {
        bounds.extend(L.latLngBounds(routes.Route_B.coordinates));
      }
      if (routes?.Route_C?.coordinates?.length > 0) {
        bounds.extend(L.latLngBounds(routes.Route_C.coordinates));
      }
      map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 1.5 });
    } else {
      const nerBounds = L.latLngBounds([[24.0, 89.0], [29.5, 97.5]]);
      map.fitBounds(nerBounds, { animate: false });
    }
  }, [routes, map]);

  useEffect(() => {
    if (resetCamera > 0) {
      const nerBounds = L.latLngBounds([[24.0, 89.0], [29.5, 97.5]]);
      map.fitBounds(nerBounds, { padding: [50, 50], animate: true, duration: 1.5 });
    }
  }, [resetCamera, map]);

  return null;
};

// ---------------------------------------------------------
// MAIN DASHBOARD COMPONENT
// ---------------------------------------------------------

const Dashboard = () => {
  const [panelState, setPanelState] = useState('ROUTE_PLANNING'); 
  const [activeNav, setActiveNav] = useState('route');
  const [routingStage, setRoutingStage] = useState('IDLE'); // 'IDLE', 'RESULTS', 'DISPATCHED'
  
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [routes, setRoutes] = useState({ Route_A: null, Route_B: null, Route_C: null });
  
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [incidentSubmitted, setIncidentSubmitted] = useState(false);
  const [resetCamera, setResetCamera] = useState(0);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const routesRes = await axios.get(`${BASE_URL}/api/routes`);
        setRoutes(routesRes.data);
      } catch (error) {
        console.error("API Fetch Error:", error);
        setHasError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchRoutes();
  }, []);

  const handleSearchAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setRoutingStage('RESULTS');
      setPanelState('RESULTS');
    }, 1500); // Simulate API call to Risk Engine
  };

  const handleDispatch = () => {
    setRoutingStage('DISPATCHED');
    setPanelState('DISPATCHED');
  };

  const fullReset = () => {
    setRoutingStage('IDLE');
    setPanelState('ROUTE_PLANNING');
    setActiveNav('route');
    setIncidentSubmitted(false);
    setSelectedVehicle(null);
    setResetCamera(prev => prev + 1);
  };

  const handleVehicleClick = (vehicle) => {
    setSelectedVehicle(vehicle);
    setPanelState('VEHICLE');
    setActiveNav('vehicles');
  };

  const handleNavClick = (nav, targetPanel) => {
    setActiveNav(nav);
    setPanelState(targetPanel);
    // When switching to the Overview, clear active route lines and zoom out
    if (targetPanel === 'OVERVIEW') {
      setRoutingStage('IDLE');
      setResetCamera(prev => prev + 1);
    }
  };

  // ---------------------------------------------------------
  // RIGHT PANEL RENDERS
  // ---------------------------------------------------------
  
  const renderOverviewPanel = () => (
    <div className="flex flex-col h-full animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <LayoutDashboard size={14} className="text-blue-500" /> NER Regional Intelligence
          </h2>
          <p className="text-[10px] text-slate-600 mt-1 uppercase tracking-widest">North-Eastern Region</p>
        </div>
        <div className="flex items-center gap-1.5 bg-green-900/20 border border-green-800/50 px-2.5 py-1 rounded-full">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-[9px] font-bold text-green-400 uppercase tracking-widest">System Active</span>
        </div>
      </div>

      {/* Active Threats */}
      <div className="mb-6">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <AlertTriangle size={12} className="text-amber-500" /> Active Threats
        </h3>
        <div className="space-y-2.5">
          <div className="bg-amber-900/10 border border-amber-800/30 rounded-xl p-3.5 flex items-start gap-3">
            <span className="text-amber-400 mt-0.5">⚠️</span>
            <div>
              <div className="text-xs font-semibold text-amber-300 mb-0.5">Severe Rainfall Warning</div>
              <div className="text-[10px] text-slate-400">East Khasi Hills · Next 24h</div>
            </div>
          </div>
          <div className="bg-rose-900/10 border border-rose-800/30 rounded-xl p-3.5 flex items-start gap-3">
            <span className="text-rose-400 mt-0.5">⚠️</span>
            <div>
              <div className="text-xs font-semibold text-rose-300 mb-0.5">Landslide Vulnerability HIGH</div>
              <div className="text-[10px] text-slate-400">NH-6 Corridor · Active Monitoring</div>
            </div>
          </div>
        </div>
      </div>

      {/* Corridor Health */}
      <div className="mb-8">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Route size={12} className="text-blue-500" /> Corridor Health
        </h3>
        <div className="bg-[#131b2b] border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/80">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-xs font-semibold text-slate-200">NH-27 · Assam</div>
              <div className="text-[9px] text-slate-500">Guwahati to Jorhat</div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
              <span className="font-mono text-[10px] font-bold text-green-400">CLEAR</span>
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-xs font-semibold text-slate-200">NH-6 · Meghalaya</div>
              <div className="text-[9px] text-slate-500">Shillong Bypass</div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse"></div>
              <span className="font-mono text-[10px] font-bold text-rose-400">HIGH RISK</span>
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-xs font-semibold text-slate-200">NH-10 · Sikkim</div>
              <div className="text-[9px] text-slate-500">Gangtok Approach</div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-500"></div>
              <span className="font-mono text-[10px] font-bold text-amber-400">MODERATE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Plan a Trip CTA */}
      <div className="mt-auto">
        <button
          onClick={() => handleNavClick('route', 'ROUTE_PLANNING')}
          className="w-full py-3.5 rounded-lg text-[11px] font-bold tracking-widest uppercase bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] shadow-[0_0_15px_rgba(37,99,235,0.2)]"
        >
          <Route size={14} /> + Plan a Trip
        </button>
      </div>
    </div>
  );

  const renderRoutePlanningPanel = () => (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <h2 className="text-[11px] font-bold text-slate-400 mb-6 uppercase tracking-widest flex items-center gap-2">
        <Route size={16} className="text-blue-500" /> Route Planning
      </h2>
      
      <div className="bg-[#131b2b] border border-slate-800 p-5 rounded-xl mb-6">
          <div className="mb-4">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-2">Origin</label>
              <input type="text" value="Guwahati" readOnly className="w-full bg-[#0a0f18] border border-slate-700 rounded-lg p-3 text-sm text-slate-200 outline-none" />
          </div>
          <div className="mb-6 relative">
              <div className="absolute -top-4 left-6 h-4 w-px bg-slate-700"></div>
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-2">Destination</label>
              <input type="text" value="Shillong" readOnly className="w-full bg-[#0a0f18] border border-slate-700 rounded-lg p-3 text-sm text-slate-200 outline-none" />
          </div>
          <button 
            onClick={handleSearchAnalyze} 
            disabled={isAnalyzing}
            className="w-full py-3.5 rounded-lg text-[11px] font-bold tracking-widest uppercase bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100"
          >
              {isAnalyzing ? (
                <><Activity size={16} className="animate-spin" /> Querying Risk Engine...</>
              ) : (
                <><Search size={16} /> Search & Analyze Routes</>
              )}
          </button>
      </div>
      
      <div className="text-xs text-slate-500 text-center px-4 leading-relaxed mt-4">
        Predictive routing evaluates live weather, terrain vulnerability, and real-time incident telemetry.
      </div>
    </div>
  );

  const renderResultsPanel = () => (
    <div className="flex flex-col h-full animate-in slide-in-from-right-4 fade-in duration-500">
      <h2 className="text-[11px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2 mb-6">
        <BrainCircuit size={16} className="text-blue-500"/> Route Assessment
      </h2>

      <div className="space-y-3 mb-5">
        {/* Route A - Primary */}
        <div className="bg-rose-950/30 border border-rose-900/60 p-4 rounded-xl">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Route A (Primary Highway)</span>
            <span className="text-[9px] font-bold text-rose-500 bg-rose-950 px-2 py-0.5 rounded border border-rose-900 flex items-center gap-1">
              <X size={10}/> AVOID
            </span>
          </div>
          <div className="flex gap-4 items-center mb-2">
            <span className="font-mono text-xl font-bold text-rose-500">84<span className="text-sm text-slate-500">/100</span></span>
            <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest">HIGH RISK</span>
          </div>
          <div className="text-[10px] text-rose-300 font-medium">Reason: Heavy Rainfall Detected.</div>
        </div>

        {/* Route B - Recommended */}
        <div className="bg-[#0d1f14] border-2 border-green-600/70 p-4 rounded-xl shadow-[0_0_20px_rgba(22,163,74,0.12)] relative">
          <div className="absolute -top-3 left-4">
            <span className="text-[9px] font-bold text-green-400 bg-[#0a1810] border border-green-700/60 px-2 py-0.5 rounded-full flex items-center gap-1">
              ⭐ RECOMMENDED
            </span>
          </div>
          <div className="flex justify-between items-start mb-2 mt-1">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Route B (Western Bypass)</span>
            <span className="font-mono text-xs font-semibold text-slate-200 ml-auto font-bold">3h 45m</span>
          </div>
          <div className="flex gap-4 items-center mb-3">
            <span className="font-mono text-xl font-bold text-green-400">28<span className="text-sm text-slate-500">/100</span></span>
            <span className="text-[9px] font-bold text-green-500 uppercase tracking-widest">LOW RISK</span>
          </div>
          <button onClick={handleDispatch} className="w-full py-2.5 rounded-lg text-[10px] font-bold tracking-widest uppercase bg-green-600 hover:bg-green-500 text-white flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]">
            Dispatch via Route B
          </button>
        </div>

        {/* Route C - Sub-optimal */}
        <div className="bg-[#131b2b] border border-amber-900/40 p-3.5 rounded-xl opacity-80">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Route C (Eastern Bypass)</span>
            <span className="text-[9px] font-bold text-amber-600 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-900/50">
              SUB-OPTIMAL
            </span>
          </div>
          <div className="flex gap-3 items-center">
            <span className="font-mono text-base font-bold text-amber-500">45<span className="text-xs text-slate-500">/100</span></span>
            <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">MODERATE RISK</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDispatchedPanel = () => (
    <div className="flex flex-col h-full animate-in zoom-in-95 fade-in duration-300">
      <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-6">
        <Truck size={16} className="text-green-500"/> Live Operations (Active Tracking)
      </h2>

      <div className="bg-[#131b2b] border border-slate-800 p-5 rounded-xl mb-6">
        <div className="flex justify-between items-center text-sm mb-4">
          <span className="text-slate-400 font-medium">Active Route</span>
          <span className="font-semibold text-slate-200">Route B (Western Bypass)</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-400 font-medium">ETA</span>
          <span className="font-mono text-lg font-bold text-blue-400">3h 45m</span>
        </div>
      </div>

      <div className="bg-slate-800/40 border border-slate-700/60 p-5 rounded-xl">
        <div className="text-[10px] text-slate-400 uppercase font-semibold mb-3 tracking-wider">Vehicle Telemetry</div>
        <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-slate-400">TRK-102 Speed</span>
            <span className="font-mono text-sm text-slate-200">42 km/h</span>
        </div>
        <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Status</span>
            <span className="text-[10px] text-green-400 font-bold border border-green-800 bg-green-900/30 px-2 py-0.5 rounded">IN TRANSIT</span>
        </div>
      </div>
    </div>
  );

  const renderVehiclePanel = () => (
    <div className="flex flex-col h-full animate-in slide-in-from-right-4 fade-in duration-300">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => {setPanelState('ROUTE_PLANNING'); setActiveNav('route');}} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
          <ArrowLeft size={16}/>
        </button>
        <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Active Trip</h2>
      </div>

      <div className="bg-[#131b2b] border border-slate-800 p-6 rounded-xl mb-6">
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-900/30 border border-blue-800/50 flex items-center justify-center">
              <Truck size={20} className="text-blue-400" />
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Current User</div>
              <div className="font-mono text-xl font-bold text-slate-100">{selectedVehicle?.id}</div>
            </div>
          </div>
          <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${selectedVehicle?.type === 'active' ? 'bg-green-900/30 text-green-400 border-green-800/50' : 'bg-amber-900/30 text-amber-400 border-amber-800/50'}`}>
            {selectedVehicle?.status} {selectedVehicle?.type === 'active' ? '🟢' : '🟡'}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Speed</span>
            <span className="font-mono font-bold text-blue-400 text-lg">{selectedVehicle?.speed}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Current Route</span>
            <span className="font-semibold text-slate-200">{selectedVehicle?.route}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">ETA</span>
            <span className="font-mono font-bold text-slate-200">{selectedVehicle?.eta}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderReportIncident = () => (
    <div className="flex flex-col h-full animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => {setPanelState('ROUTE_PLANNING'); setActiveNav('route');}} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
          <ArrowLeft size={16}/>
        </button>
        <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Report Incident</h2>
      </div>

      {!incidentSubmitted ? (
        <form onSubmit={(e) => { e.preventDefault(); setIncidentSubmitted(true); }} className="flex flex-col flex-1">
          <div className="space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Incident Type</label>
              <select className="w-full bg-[#131b2b] border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500">
                <option>Road Obstruction</option>
                <option>Flooding</option>
                <option>Landslide</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Severity</label>
              <select className="w-full bg-[#131b2b] border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500">
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Location (Lat, Lng)</label>
              <input type="text" readOnly value="25.8611, 91.8145 (Auto-detected)" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-slate-400 cursor-not-allowed" />
            </div>
          </div>
          
          <div className="mt-auto pt-6 border-t border-slate-800/80">
            <button type="submit" className="w-full py-3.5 rounded-lg text-[11px] font-bold tracking-widest uppercase bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2">
              <MapPin size={16} /> Submit Intelligence
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 text-center animate-in zoom-in-95">
          <div className="h-16 w-16 bg-green-900/30 border border-green-500/50 rounded-full flex items-center justify-center mb-4">
            <Check size={32} className="text-green-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-200 mb-2">Incident Logged</h3>
          <p className="text-sm text-slate-400 mb-8 max-w-[250px] leading-relaxed">Intelligence submitted successfully. Risk engine notified for spatial reassessment.</p>
          <button onClick={() => {setIncidentSubmitted(false); setPanelState('ROUTE_PLANNING'); setActiveNav('route');}} className="px-6 py-2.5 border border-slate-600 rounded-lg text-[10px] font-bold tracking-widest uppercase text-slate-300 hover:bg-slate-800">
            Return to Planning
          </button>
        </div>
      )}
    </div>
  );

  const renderAlerts = () => (
    <div className="flex flex-col h-full animate-in slide-in-from-right-4 fade-in duration-300">
      <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-6">
        <Bell size={16} className="text-amber-500"/> Alert Center
      </h2>
      
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        <AlertItem time="14:30" text="Heavy rainfall warning issued for East Khasi Hills district for next 24 hours." type="high" />
        <AlertItem time="12:15" text="Minor traffic congestion reported at Guwahati bypass." type="info" />
        <AlertItem time="09:00" text="System initialization complete. All telemetry streams nominal." type="info" />
      </div>
    </div>
  );

  const renderComingSoon = () => (
    <div className="flex flex-col h-full items-center justify-center text-center animate-in zoom-in-95 fade-in duration-300">
      <div className="h-16 w-16 bg-slate-800/30 border border-slate-700/50 rounded-2xl flex items-center justify-center mb-6">
        <Lock size={28} className="text-slate-500" />
      </div>
      <h3 className="text-sm font-bold text-slate-300 mb-2 uppercase tracking-widest">Module Offline</h3>
      <p className="text-xs text-slate-500 max-w-[220px] leading-relaxed">This intelligence module is locked in the current prototype phase.</p>
    </div>
  );

  return (
    <div className="flex flex-col h-screen w-full bg-[#0a0f18] text-slate-100 font-sans overflow-hidden">
      
      {/* SYSTEM ERROR BANNER */}
      {hasError && (
        <div className="absolute top-0 left-0 w-full z-[2000] bg-rose-600 border-b border-rose-500 p-1.5 flex items-center justify-center gap-2 text-white text-xs font-semibold shadow-lg">
          <ServerCrash size={14} />
          System Offline: Unable to connect to NER intelligence servers.
        </div>
      )}

      {/* TOP HEADER */}
      <header className="h-[60px] bg-[#0d131f] border-b border-slate-800/80 flex items-center justify-between px-5 shrink-0 z-20">
        <div className="flex items-center gap-3.5">
          <MapIcon className="text-blue-500" size={22} />
          <div className="flex flex-col">
            <h1 className="text-sm font-bold tracking-widest text-slate-100 uppercase">
              RIDGE
            </h1>
            <span className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">Regional Intelligence &amp; Geospatial Efficiency</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#131b2b] border border-slate-800 px-3 py-1.5 rounded-full shadow-inner">
            <div className={`h-2 w-2 rounded-full animate-pulse ${hasError ? 'bg-rose-500' : 'bg-green-500'}`}></div>
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
              {hasError ? 'SYSTEM OFFLINE' : 'SYSTEM ONLINE'}
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* SLIM LEFT NAV */}
        <nav className="w-[72px] bg-[#0d131f] border-r border-slate-800/80 flex flex-col items-center py-6 gap-5 shrink-0 z-10">
          <NavButton icon={LayoutDashboard} active={activeNav === 'dashboard'} onClick={() => handleNavClick('dashboard', 'OVERVIEW')} />
          <NavButton icon={Route} active={activeNav === 'route'} onClick={() => handleNavClick('route', 'ROUTE_PLANNING')} />
          <NavButton icon={AlertTriangle} active={activeNav === 'incidents'} onClick={() => handleNavClick('incidents', 'REPORT_INCIDENT')} />
          <NavButton icon={BrainCircuit} active={activeNav === 'intelligence'} onClick={() => handleNavClick('intelligence', 'COMING_SOON')} />
          <NavButton icon={Bell} active={activeNav === 'alerts'} onClick={() => handleNavClick('alerts', 'ALERTS')} />
          
          <div className="mt-auto mb-2 flex flex-col gap-5 items-center">
            <NavButton icon={Settings} active={activeNav === 'settings'} onClick={() => handleNavClick('settings', 'COMING_SOON')} />
            
            <div className="w-10 border-t border-slate-800/80 mb-1"></div>
            <button 
              onClick={fullReset} 
              className="p-2.5 rounded-xl transition-all text-slate-500 hover:text-white hover:bg-rose-600 bg-[#131b2b] border border-slate-800 shadow-sm"
              title="Reset Prototype"
            >
              <RotateCcw size={18} strokeWidth={2.5} />
            </button>
          </div>
        </nav>

        {/* CENTER MAP PANEL (~65-70%) */}
        <main className="flex-1 relative z-0 bg-[#060a11]">
          <MapContainer className="h-full w-full" zoomControl={false} attributionControl={false}>
            <MapController routes={routes} panelState={panelState} resetCamera={resetCamera} />

            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}" />
            
            {/* THIN DOTTED GENERIC PATH (Only in Planning state) */}
            {routes.Route_A && routingStage === 'IDLE' && (
              <Polyline 
                key="route-planning"
                positions={routes.Route_A.coordinates}
                color="#3B82F6"
                weight={3}
                dashArray="5, 10"
                opacity={0.8}
                pathOptions={{ className: 'animate-pulse' }}
              />
            )}

            {/* ROUTE A - Solid Red during RESULTS, Muted Dashed Red in DISPATCHED */}
            {routes.Route_A && routingStage !== 'IDLE' && (
              <Polyline 
                key={`route-a-${routingStage}`}
                positions={routes.Route_A.coordinates} 
                color={routingStage === 'RESULTS' ? "#EF4444" : "#991B1B"} 
                weight={routingStage === 'RESULTS' ? 5 : 3}
                dashArray={routingStage === 'RESULTS' ? "0" : "5, 10"}
                opacity={routingStage === 'RESULTS' ? 1 : 0.4}
                pathOptions={{ className: 'transition-all duration-500' }}
              />
            )}

            {/* ROUTE B - Solid Green during RESULTS, Glowing Green in DISPATCHED */}
            {routes.Route_B && routingStage !== 'IDLE' && (
              <Polyline 
                key={`route-b-${routingStage}`}
                positions={routes.Route_B.coordinates} 
                color="#10B981" 
                weight={5}
                opacity={1}
                pathOptions={{ className: routingStage === 'DISPATCHED' ? 'transition-all duration-700' : 'transition-all duration-700' }}
              />
            )}

            {/* ROUTE C - Solid Amber during RESULTS, Muted Dashed Amber in DISPATCHED */}
            {routes.Route_C && routingStage !== 'IDLE' && (
              <Polyline 
                key={`route-c-${routingStage}`}
                positions={routes.Route_C.coordinates} 
                color={routingStage === 'RESULTS' ? "#F59E0B" : "#B45309"}
                weight={routingStage === 'RESULTS' ? 5 : 3}
                dashArray={routingStage === 'RESULTS' ? "0" : "5, 10"}
                opacity={routingStage === 'RESULTS' ? 1 : 0.4}
                pathOptions={{ className: 'transition-all duration-700' }}
              />
            )}

            {/* SIMULATED VEHICLES */}
            {SIMULATED_VEHICLES.map(vehicle => (
              <Marker 
                key={vehicle.id}
                position={[vehicle.lat, vehicle.lng]} 
                icon={vehicle.type === 'active' ? vehicleIcon : stoppedVehicleIcon}
                eventHandlers={{ click: () => handleVehicleClick(vehicle) }}
              >
                <Popup className="text-xs font-bold text-slate-800">{vehicle.id}</Popup>
              </Marker>
            ))}

            {/* SIMULATED INCIDENTS */}
            {SIMULATED_INCIDENTS.map((inc, i) => (
              <Marker 
                key={`inc-${i}`}
                position={[inc.lat, inc.lng]} 
                icon={inc.type === 'warning' ? incidentWarningIcon : incidentInfoIcon}
              >
                <Popup className="text-xs font-bold text-slate-800">{inc.desc}</Popup>
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
          {/* GOOGLE MAPS-STYLE FLOATING TELEMETRY OVERLAY */}
        {routingStage === 'DISPATCHED' && (
          <div className="absolute bottom-6 left-6 z-[1000] animate-in slide-in-from-bottom-4 fade-in duration-500">
            <div className="bg-[#0d131f]/95 backdrop-blur-sm border border-slate-700/80 rounded-2xl shadow-2xl p-4 min-w-[240px]">
              
              {/* Route badge */}
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-800">
                <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.7)] animate-pulse"></div>
                <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Active Navigation · Route B</span>
              </div>

              {/* Stats row */}
              <div className="flex items-end justify-between gap-4 mb-4">
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Speed</span>
                  <span className="font-mono text-2xl font-bold text-slate-100 leading-none">42</span>
                  <span className="text-[10px] text-slate-500 font-medium">km/h</span>
                </div>
                <div className="h-8 w-px bg-slate-800"></div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">ETA</span>
                  <span className="font-mono text-2xl font-bold text-blue-400 leading-none">3:45</span>
                  <span className="text-[10px] text-slate-500 font-medium">hrs remaining</span>
                </div>
                <div className="h-8 w-px bg-slate-800"></div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Distance</span>
                  <span className="font-mono text-2xl font-bold text-slate-100 leading-none">135</span>
                  <span className="text-[10px] text-slate-500 font-medium">km left</span>
                </div>
              </div>

              {/* End Trip button */}
              <button
                onClick={fullReset}
                className="w-full py-2 rounded-lg bg-rose-600/20 border border-rose-700/50 text-rose-400 text-[11px] font-bold uppercase tracking-widest hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all flex items-center justify-center gap-2"
              >
                🛑 End Trip
              </button>
            </div>
          </div>
        )}
      </main>

        {/* RIGHT PANEL (DYNAMIC 380px) */}
        <aside className="w-[380px] bg-[#0d131f] border-l border-slate-800/80 flex flex-col shrink-0 z-10 p-6 overflow-y-auto">
          {loading ? (
             <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-500">
               <Activity className="animate-spin text-blue-500" size={24} /> 
               <span className="text-xs font-medium uppercase tracking-widest">Fetching Telemetry...</span>
             </div>
          ) : panelState === 'OVERVIEW' ? (
             renderOverviewPanel()
          ) : panelState === 'ROUTE_PLANNING' ? (
             renderRoutePlanningPanel()
          ) : panelState === 'RESULTS' ? (
             renderResultsPanel()
          ) : panelState === 'DISPATCHED' ? (
             renderDispatchedPanel()
          ) : panelState === 'VEHICLE' ? (
             renderVehiclePanel()
          ) : panelState === 'REPORT_INCIDENT' ? (
             renderReportIncident()
          ) : panelState === 'ALERTS' ? (
             renderAlerts()
          ) : panelState === 'COMING_SOON' ? (
             renderComingSoon()
          ) : null}
        </aside>
      </div>
    </div>
  );
};

export default Dashboard;
