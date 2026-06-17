import React, { useState } from 'react';
import { Waypoint } from '../types';
import { Anchor, Play, Pause, Plus, Trash2, Map, Compass, Navigation, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface MapChartProps {
  waypoints: Waypoint[];
  currentWaypointIndex: number;
  voyageStarted: boolean;
  onToggleVoyage: () => void;
  onAddWaypoint: (name: string, lat: number, lng: number) => void;
  onRemoveWaypoint: (id: string) => void;
  onUpdateWaypoint?: (id: string, lat: number, lng: number) => void;
  vesselPercentAlongLeg: number; // 0 to 100
}

export default function MapChart({
  waypoints,
  currentWaypointIndex,
  voyageStarted,
  onToggleVoyage,
  onAddWaypoint,
  onRemoveWaypoint,
  onUpdateWaypoint,
  vesselPercentAlongLeg,
}: MapChartProps) {
  const [newWaypointName, setNewWaypointName] = useState('');
  const [newLat, setNewLat] = useState('32.30');
  const [newLng, setNewLng] = useState('-64.75');

  // Map Navigation & Drag state
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggedWaypointId, setDraggedWaypointId] = useState<string | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{ x: number; y: number; lat: number; lng: number } | null>(null);

  // SVG coordinate mapper
  // Translate GPS (lat: 31 ~ 38, lng: -77 ~ -63) to SVG viewbox coords (x: 0 ~ 800, y: 0 ~ 450)
  const mapGPS = (lat: number, lng: number) => {
    const minLat = 31.0;
    const maxLat = 38.0;
    const minLng = -77.0;
    const maxLng = -63.0;

    const width = 800;
    const height = 450;

    // Normalised positions
    const pctX = (lng - minLng) / (maxLng - minLng);
    // Latitudes go top-to-bottom in SVG
    const pctY = 1 - (lat - minLat) / (maxLat - minLat);

    return {
      x: Math.round(pctX * width),
      y: Math.round(pctY * height),
    };
  };

  const handleAddWaypointSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWaypointName.trim()) return;
    const latNum = parseFloat(newLat);
    const lngNum = parseFloat(newLng);
    if (!isNaN(latNum) && !isNaN(lngNum)) {
      onAddWaypoint(newWaypointName, latNum, lngNum);
      setNewWaypointName('');
      setSelectedCoords(null);
    }
  };

  // Coordinates of the vessel
  const getVesselCoords = () => {
    if (waypoints.length === 0) return { x: 400, y: 225 };
    if (!voyageStarted || currentWaypointIndex >= waypoints.length) {
      // Park at the current waypoint
      const idx = Math.min(currentWaypointIndex, waypoints.length - 1);
      return mapGPS(waypoints[idx].lat, waypoints[idx].lng);
    }

    // Interpolate between current index and next index
    const startWaypoint = waypoints[currentWaypointIndex];
    const endWaypoint = waypoints[Math.min(currentWaypointIndex + 1, waypoints.length - 1)];

    const startCoords = mapGPS(startWaypoint.lat, startWaypoint.lng);
    const endCoords = mapGPS(endWaypoint.lat, endWaypoint.lng);

    const fact = vesselPercentAlongLeg / 100;
    return {
      x: startCoords.x + (endCoords.x - startCoords.x) * fact,
      y: startCoords.y + (endCoords.y - startCoords.y) * fact,
    };
  };

  const vesselCoords = getVesselCoords();

  // Mouse drag to pan map 
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    if (target.closest('.waypoint-handle') || target.closest('button')) {
      return;
    }
    setIsPanning(true);
    setPanStart({
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    } else if (draggedWaypointId && onUpdateWaypoint) {
      const rect = e.currentTarget.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      const clickX = (rawX / rect.width) * 800;
      const clickY = (rawY / rect.height) * 450;

      // Translate viewBox coords back to Geo coords depending on zoom/pan
      const geoX = (clickX - pan.x) / zoom;
      const geoY = (clickY - pan.y) / zoom;

      // Translate back to Lat / Lng
      const pctX = geoX / 800;
      const pctY = 1 - (geoY / 450);

      const minLat = 31.0;
      const maxLat = 38.0;
      const minLng = -77.0;
      const maxLng = -63.0;

      let calcLat = (pctY * (maxLat - minLat)) + minLat;
      let calcLng = (pctX * (maxLng - minLng)) + minLng;
      
      calcLat = Math.min(Math.max(calcLat, minLat), maxLat);
      calcLng = Math.min(Math.max(calcLng, minLng), maxLng);

      onUpdateWaypoint(draggedWaypointId, calcLat, calcLng);
    }
  };

  const handleMouseUpOrLeave = () => {
    setIsPanning(false);
    setDraggedWaypointId(null);
  };

  // Touch triggers for mobile compatibility:
  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    if (target.closest('.waypoint-handle') || target.closest('button')) {
      return;
    }
    if (e.touches.length === 1) {
      setIsPanning(true);
      setPanStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (isPanning && e.touches.length === 1) {
      setPan({
        x: e.touches[0].clientX - panStart.x,
        y: e.touches[0].clientY - panStart.y,
      });
    } else if (draggedWaypointId && onUpdateWaypoint && e.touches.length === 1) {
      const rect = e.currentTarget.getBoundingClientRect();
      const rawX = e.touches[0].clientX - rect.left;
      const rawY = e.touches[0].clientY - rect.top;
      const clickX = (rawX / rect.width) * 800;
      const clickY = (rawY / rect.height) * 450;

      const geoX = (clickX - pan.x) / zoom;
      const geoY = (clickY - pan.y) / zoom;

      const pctX = geoX / 800;
      const pctY = 1 - (geoY / 450);

      const minLat = 31.0;
      const maxLat = 38.0;
      const minLng = -77.0;
      const maxLng = -63.0;

      let calcLat = (pctY * (maxLat - minLat)) + minLat;
      let calcLng = (pctX * (maxLng - minLng)) + minLng;
      
      calcLat = Math.min(Math.max(calcLat, minLat), maxLat);
      calcLng = Math.min(Math.max(calcLng, minLng), maxLng);

      onUpdateWaypoint(draggedWaypointId, calcLat, calcLng);
    }
  };

  // Click handler to select target coords & plot waypoint
  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning || draggedWaypointId) return;

    const target = e.target as SVGElement;
    if (target.closest('.waypoint-handle') || target.closest('button')) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    const clickX = (rawX / rect.width) * 800;
    const clickY = (rawY / rect.height) * 450;

    // Convert to un-transformed coordinates
    const geoX = (clickX - pan.x) / zoom;
    const geoY = (clickY - pan.y) / zoom;

    const pctX = geoX / 800;
    const pctY = 1 - (geoY / 450);

    const minLat = 31.0;
    const maxLat = 38.0;
    const minLng = -77.0;
    const maxLng = -63.0;

    const calcLat = (pctY * (maxLat - minLat)) + minLat;
    const calcLng = (pctX * (maxLng - minLng)) + minLng;

    if (calcLat >= minLat && calcLat <= maxLat && calcLng >= minLng && calcLng <= maxLng) {
      setSelectedCoords({
        x: geoX,
        y: geoY,
        lat: calcLat,
        lng: calcLng,
      });

      setNewLat(calcLat.toFixed(2));
      setNewLng(calcLng.toFixed(2));
      setNewWaypointName(`WAYPOINT-${waypoints.length + 1}`);
    }
  };

  const handleMapDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    e.preventDefault();
    const target = e.target as SVGElement;
    if (target.closest('.waypoint-handle') || target.closest('button')) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    const clickX = (rawX / rect.width) * 800;
    const clickY = (rawY / rect.height) * 450;

    // Convert to un-transformed coordinates
    const geoX = (clickX - pan.x) / zoom;
    const geoY = (clickY - pan.y) / zoom;

    const pctX = geoX / 800;
    const pctY = 1 - (geoY / 450);

    const minLat = 31.0;
    const maxLat = 38.0;
    const minLng = -77.0;
    const maxLng = -63.0;

    const calcLat = (pctY * (maxLat - minLat)) + minLat;
    const calcLng = (pctX * (maxLng - minLng)) + minLng;

    if (calcLat >= minLat && calcLat <= maxLat && calcLng >= minLng && calcLng <= maxLng) {
      const label = `WAYPOINT-${waypoints.length + 1}`;
      onAddWaypoint(label, calcLat, calcLng);
      setSelectedCoords(null);
    }
  };

  const getTooltipStyle = () => {
    if (!selectedCoords) return {};
    const screenX = selectedCoords.x * zoom + pan.x;
    const screenY = selectedCoords.y * zoom + pan.y;
    
    const pctLeft = (screenX / 800) * 100;
    const pctTop = (screenY / 450) * 100;
    
    return {
      left: `${pctLeft}%`,
      top: `${pctTop - 3}%`,
      transform: 'translate(-50%, -100%)',
    };
  };

  return (
    <div className="glass-panel p-4 rounded-xl flex flex-col xl:flex-row gap-5 h-full">
      {/* ECDIS Map Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-display text-sm font-semibold text-cyan-400 flex items-center gap-1.5 uppercase">
            <Map className="w-4 h-4 text-cyan-500" />
            Electronic Chart Display (ECDIS)
          </h4>
          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
            <span>GRID: Mercator Projection</span>
            <span>SCALE {zoom === 1.0 ? '1:5,000,000' : `1:${Math.round(5000000 / zoom).toLocaleString()}`}</span>
          </div>
        </div>

        {/* The SVG Nautical Chart */}
        <div className="relative border border-cyan-500/20 rounded-lg overflow-hidden bg-marine-950/90 flex-1 min-h-[340px] touch-none">
          {/* Legend absolute badges */}
          <div className="absolute top-2 left-2 bg-marine-900/90 backdrop-blur border border-marine-800 rounded p-2 text-[10px] font-mono text-slate-350 pointer-events-none z-10 leading-relaxed shadow-lg">
            <div><span className="text-emerald-400 font-bold mr-1">●</span> Ship Waypoints (Passed)</div>
            <div><span className="text-rose-400 font-bold mr-1">●</span> Active Route Waypoints</div>
            <div><span className="text-amber-500 font-bold mr-1">--</span> Predefined Passage Plan</div>
            <div><span className="text-cyan-500 font-bold mr-1">■</span> Deepwater Corridor</div>
            <div className="mt-1 pt-1 border-t border-marine-800 text-[9px] text-cyan-400">
              🖱 Drag map or click Arrow controls to Pan<br />
              ⚓ Drag nodes to change track coords<br />
              ⚡ Double-click map to plot a Waypoint instantly!
            </div>
          </div>

          {/* Floating Zoom / Pan controls */}
          <div className="absolute right-3.5 bottom-3.5 flex flex-col gap-1.5 z-10">
            {/* View Pan Directional Pad */}
            <div className="bg-marine-900/90 backdrop-blur border border-cyan-500/30 rounded-xl p-1.5 flex flex-col items-center gap-1 shadow-2xl">
              <span className="text-[7.5px] font-bold font-mono text-cyan-500/80 uppercase mb-0.5 select-none text-center">Pan View</span>
              <button
                onClick={() => setPan(prev => ({ ...prev, y: prev.y + 60 }))}
                className="w-7 h-7 rounded bg-slate-950 hover:bg-marine-800 text-cyan-400 hover:text-white border border-cyan-500/20 hover:border-cyan-400 flex items-center justify-center transition-all cursor-pointer shadow-md"
                title="Pan Up"
                type="button"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setPan(prev => ({ ...prev, x: prev.x + 60 }))}
                  className="w-7 h-7 rounded bg-slate-950 hover:bg-marine-800 text-cyan-400 hover:text-white border border-cyan-500/20 hover:border-cyan-400 flex items-center justify-center transition-all cursor-pointer shadow-md"
                  title="Pan Left"
                  type="button"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPan(prev => ({ ...prev, x: prev.x - 60 }))}
                  className="w-7 h-7 rounded bg-slate-950 hover:bg-marine-800 text-cyan-400 hover:text-white border border-cyan-500/20 hover:border-cyan-400 flex items-center justify-center transition-all cursor-pointer shadow-md"
                  title="Pan Right"
                  type="button"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                onClick={() => setPan(prev => ({ ...prev, y: prev.y - 60 }))}
                className="w-7 h-7 rounded bg-slate-950 hover:bg-marine-800 text-cyan-400 hover:text-white border border-cyan-500/20 hover:border-cyan-400 flex items-center justify-center transition-all cursor-pointer shadow-md"
                title="Pan Down"
                type="button"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-px bg-cyan-500/20 my-1"></div>

            <button
              onClick={() => setZoom(prev => Math.min(prev + 0.5, 4.0))}
              className="w-8 h-8 rounded-lg bg-marine-900/90 hover:bg-marine-850 text-cyan-400 hover:text-white border border-cyan-500/30 hover:border-cyan-400 flex items-center justify-center font-bold text-base transition-all shadow-[0_0_10px_rgba(6,182,212,0.15)] cursor-pointer"
              title="Zoom In"
              type="button"
            >
              ＋
            </button>
            <button
              onClick={() => setZoom(prev => {
                const nextZ = Math.max(prev - 0.5, 1.0);
                if (nextZ === 1.0) setPan({ x: 0, y: 0 }); // snap home on min zoom
                return nextZ;
              })}
              className="w-8 h-8 rounded-lg bg-marine-900/90 hover:bg-marine-850 text-cyan-400 hover:text-white border border-cyan-500/30 hover:border-cyan-400 flex items-center justify-center font-bold text-base transition-all shadow-[0_0_10px_rgba(6,182,212,0.15)] cursor-pointer"
              title="Zoom Out"
              type="button"
            >
              －
            </button>
            <button
              onClick={() => {
                setZoom(1.0);
                setPan({ x: 0, y: 0 });
              }}
              className="w-8 h-8 rounded-lg bg-marine-900/90 hover:bg-marine-850 text-cyan-400 hover:text-white border border-cyan-500/30 hover:border-cyan-400 flex items-center justify-center font-semibold text-[9px] uppercase tracking-tighter transition-all shadow-[0_0_10px_rgba(6,182,212,0.15)] cursor-pointer"
              title="Reset Zoom & Pan"
              type="button"
            >
              Reset
            </button>
            <button
              onClick={() => {
                const sCoords = getVesselCoords();
                const targetZoom = Math.max(zoom, 1.8);
                setZoom(targetZoom);
                setPan({
                  x: 400 - sCoords.x * targetZoom,
                  y: 225 - sCoords.y * targetZoom,
                });
              }}
              className="w-8 h-8 rounded-lg bg-marine-900/90 hover:bg-marine-850 text-cyan-400 hover:text-white border border-cyan-500/30 hover:border-cyan-400 flex items-center justify-center transition-all shadow-[0_0_10px_rgba(6,182,212,0.15)] cursor-pointer"
              title="Center on Atlantic Star"
              type="button"
            >
              <Navigation className="w-3.5 h-3.5 text-cyan-400 rotate-45" />
            </button>
          </div>

          {/* Map floating target cursor details popup */}
          {selectedCoords && (
            <div 
              style={getTooltipStyle()} 
              className="absolute z-20 bg-slate-900 border-2 border-rose-500 rounded-lg p-2.5 shadow-2xl w-44 font-mono text-xs text-white"
            >
              <div className="flex justify-between items-center gap-4 mb-1 border-b border-rose-950 pb-1.5">
                <span className="text-rose-400 font-bold tracking-wider text-[10px]">📍 RADIAL TARGET</span>
                <button 
                  onClick={() => setSelectedCoords(null)} 
                  className="text-slate-400 hover:text-white font-bold cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>
              <div className="text-[10px] text-slate-350 space-y-0.5 leading-tight">
                <div>LAT: <span className="text-cyan-300 font-bold">{selectedCoords.lat.toFixed(4)}°N</span></div>
                <div>LNG: <span className="text-cyan-300 font-bold">{Math.abs(selectedCoords.lng).toFixed(4)}°W</span></div>
              </div>
              
              <div className="mt-2 flex gap-1 bg-slate-950 p-1 rounded border border-slate-800">
                <input
                  type="text"
                  placeholder="NAME"
                  value={newWaypointName}
                  onChange={(e) => setNewWaypointName(e.target.value)}
                  className="w-16 bg-transparent text-white text-[10px] focus:outline-none px-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    const label = newWaypointName.trim() || `WAYPOINT-${waypoints.length + 1}`;
                    onAddWaypoint(label, selectedCoords.lat, selectedCoords.lng);
                    setSelectedCoords(null);
                  }}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-[9px] uppercase transition-colors rounded px-1.5 py-0.5 shrink-0 flex items-center gap-0.5 cursor-pointer"
                >
                  PLOT <Plus className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          )}

          {/* The Live Interactive Vector Layer */}
          <svg 
            viewBox="0 0 800 450" 
            className={`w-full h-full select-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUpOrLeave}
            onClick={handleMapClick}
            onDoubleClick={handleMapDoubleClick}
          >
            {/* Zoom / Pan Group */}
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Sea Grid Background lines */}
              <g stroke="rgba(6, 182, 212, 0.05)" strokeWidth="0.75">
                {Array.from({ length: 17 }).map((_, i) => (
                  <line key={`v-${i}`} x1={i * 50} y1="0" x2={i * 50} y2="450" />
                ))}
                {Array.from({ length: 10 }).map((_, i) => (
                  <line key={`h-${i}`} x1="0" y1={i * 50} x2="800" y2={i * 50} />
                ))}
              </g>

              {/* Depth Contours & Landmasses */}
              {/* Coastline US (Left extreme) */}
              <path d="M 0,-10 L 80,40 L 70,120 L 95,200 L 40,280 L 60,350 L 30,460 L 0,460 Z" fill="rgba(24, 45, 87, 0.4)" stroke="rgba(34, 211, 238, 0.15)" strokeWidth="2" />
              
              {/* Shallow shoals / coral reef (Safe buffer contour) */}
              <path d="M 0,20 L 110,60 L 100,150 L 120,225 L 80,310 L 100,380 L 60,460" fill="none" stroke="rgba(6, 182, 212, 0.2)" strokeDasharray="4,8" strokeWidth="1.5" />
              
              {/* Bermuda Island (Bottom right sector) */}
              <path d="M 690,320 L 710,305 L 725,315 L 715,335 L 695,330 Z" fill="rgba(110, 100, 70, 0.5)" stroke="rgba(196, 181, 140, 0.4)" strokeWidth="1.5" />
              <text x="690" y="295" fill="rgb(167, 139, 250)" fontSize="10" className="font-sans font-semibold tracking-wide">BERMUDA IS.</text>
              
              {/* Coastal City Port Label */}
              <text x="15" y="140" fill="rgba(148, 163, 184, 0.8)" fontSize="10" className="font-sans">NORFOLK PORT</text>

               {/* Latitude Grid Coordinate Ticks */}
               <g fill="rgba(6, 182, 212, 0.22)" fontSize="8" fontFamily="monospace" className="pointer-events-none opacity-60">
                 <text x="5" y="45" textAnchor="start">37.0° N</text>
                 <line x1="0" y1="45" x2="10" y2="45" stroke="rgba(6, 182, 212, 0.15)" strokeWidth="1" />
                 <text x="5" y="109" textAnchor="start">36.0° N</text>
                 <line x1="0" y1="109" x2="10" y2="109" stroke="rgba(6, 182, 212, 0.15)" strokeWidth="1" />
                 <text x="5" y="173" textAnchor="start">35.0° N</text>
                 <line x1="0" y1="173" x2="10" y2="173" stroke="rgba(6, 182, 212, 0.15)" strokeWidth="1" />
                 <text x="5" y="238" textAnchor="start">34.0° N</text>
                 <line x1="0" y1="238" x2="10" y2="238" stroke="rgba(6, 182, 212, 0.15)" strokeWidth="1" />
                 <text x="5" y="302" textAnchor="start">33.0° N</text>
                 <line x1="0" y1="302" x2="10" y2="302" stroke="rgba(6, 182, 212, 0.15)" strokeWidth="1" />
                 <text x="5" y="366" textAnchor="start">32.0° N</text>
                 <line x1="0" y1="366" x2="10" y2="366" stroke="rgba(6, 182, 212, 0.15)" strokeWidth="1" />
                 <text x="5" y="431" textAnchor="start">31.0° N</text>
                 <line x1="0" y1="431" x2="10" y2="431" stroke="rgba(6, 182, 212, 0.15)" strokeWidth="1" />
               </g>

               {/* Bottom Axis Longitude Ticks */}
               <g fill="rgba(6, 182, 212, 0.22)" fontSize="8" fontFamily="monospace" className="pointer-events-none opacity-60">
                 <text x="57" y="442" textAnchor="middle">76.0° W</text>
                 <line x1="57" y1="440" x2="57" y2="446" stroke="rgba(6, 182, 212, 0.15)" strokeWidth="1" />
                 <text x="171" y="442" textAnchor="middle">74.0° W</text>
                 <line x1="171" y1="440" x2="171" y2="446" stroke="rgba(6, 182, 212, 0.15)" strokeWidth="1" />
                 <text x="285" y="442" textAnchor="middle">72.0° W</text>
                 <line x1="285" y1="440" x2="285" y2="446" stroke="rgba(6, 182, 212, 0.15)" strokeWidth="1" />
                 <text x="400" y="442" textAnchor="middle">70.0° W</text>
                 <line x1="400" y1="440" x2="400" y2="446" stroke="rgba(6, 182, 212, 0.15)" strokeWidth="1" />
                 <text x="514" y="442" textAnchor="middle">68.0° W</text>
                 <line x1="514" y1="440" x2="514" y2="446" stroke="rgba(6, 182, 212, 0.15)" strokeWidth="1" />
                 <text x="628" y="442" textAnchor="middle">66.0° W</text>
                 <line x1="628" y1="440" x2="628" y2="446" stroke="rgba(6, 182, 212, 0.15)" strokeWidth="1" />
                 <text x="742" y="442" textAnchor="middle">64.0° W</text>
                 <line x1="742" y1="440" x2="742" y2="446" stroke="rgba(6, 182, 212, 0.15)" strokeWidth="1" />
               </g>

               {/* Nautical Compass Rose (Extremely faint backdrop) */}
               <g transform="translate(580, 150)" className="pointer-events-none opacity-15">
                 <circle r="36" fill="none" stroke="rgba(34, 211, 238, 0.25)" strokeWidth="1" />
                 <polygon points="0,-32 3,0 0,2 -3,0" fill="rgba(34, 211, 238, 0.4)" stroke="rgba(34, 211, 238, 0.5)" strokeWidth="0.5" />
                 <polygon points="0,32 3,0 0,-2 -3,0" fill="rgba(30, 41, 59, 0.5)" stroke="rgba(34, 211, 238, 0.2)" strokeWidth="0.5" />
                 <polygon points="32,0 0,3 -2,0 0,-3" fill="rgba(30, 41, 59, 0.5)" stroke="rgba(34, 211, 238, 0.2)" strokeWidth="0.5" />
                 <polygon points="-32,0 0,3 2,0 0,-3" fill="rgba(30, 41, 59, 0.5)" stroke="rgba(34, 211, 238, 0.2)" strokeWidth="0.5" />
                 {/* Compass Letters */}
                 <text x="0" y="-36" fill="#22d3ee" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="monospace">N</text>
                 <text x="0" y="41" fill="rgba(34, 211, 238, 0.4)" fontSize="7" textAnchor="middle" fontFamily="monospace">S</text>
                 <text x="40" y="2" fill="rgba(34, 211, 238, 0.4)" fontSize="7" textAnchor="middle" fontFamily="monospace">E</text>
                 <text x="-42" y="2" fill="rgba(34, 211, 238, 0.4)" fontSize="7" textAnchor="middle" fontFamily="monospace">W</text>
               </g>

               {/* Cape Hatteras Lighthouse (Static, very quiet) */}
               <g transform="translate(88, 173)" className="pointer-events-none">
                 <circle r="3" fill="#eab308" stroke="#000" strokeWidth="0.75" />
                 <text x="8" y="3" fill="rgba(203, 213, 225, 0.65)" fontSize="8" fontWeight="semibold" fontFamily="monospace">HATTERAS LT</text>
               </g>

               {/* Bermuda St. Davids Lighthouse (Static, very quiet) */}
               <g transform="translate(705, 320)" className="pointer-events-none">
                 <circle r="3" fill="#eab308" stroke="#000" strokeWidth="0.75" />
                 <text x="-80" y="3" fill="rgba(203, 213, 225, 0.65)" fontSize="8" fontWeight="semibold" fontFamily="monospace">ST DAVIDS LT</text>
               </g>

              {/* Shallow patch shoal (Middle Atlantic - Caution Area) */}
              <path d="M 330,120 Q 380,110 410,130 T 450,180 Q 400,210 350,190 Z" fill="rgba(239, 68, 68, 0.05)" stroke="rgba(239, 68, 68, 0.2)" strokeWidth="1.5" />
              <text x="360" y="160" fill="rgba(239, 68, 68, 0.4)" fontSize="9" className="font-sans italic">Hazard: Shallow Shoal</text>

              {/* Shipping Corridor Lines */}
              <line x1="120" y1="200" x2="680" y2="320" stroke="rgba(6, 182, 212, 0.08)" strokeWidth="10" strokeLinecap="round" />

              {/* Passage Plan Waypoint Connection Lines (Legs) */}
              {waypoints.length > 1 && (
                <polyline
                  points={waypoints.map(w => {
                    const c = mapGPS(w.lat, w.lng);
                    return `${c.x},${c.y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="rgba(244, 63, 94, 0.6)"
                  strokeWidth="2.5"
                  strokeDasharray="4,4"
                />
              )}

              {/* Selected coordinate radial indicator on map */}
              {selectedCoords && (
                <g transform={`translate(${selectedCoords.x}, ${selectedCoords.y})`}>
                  <circle r="14" fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3,3" className="animate-spin-slow" />
                  <line x1="-8" y1="0" x2="8" y2="0" stroke="#f43f5e" strokeWidth="1.2" />
                  <line x1="0" y1="-8" x2="0" y2="8" stroke="#f43f5e" strokeWidth="1.2" />
                  <circle r="2.5" fill="#f43f5e" className="animate-pulse" />
                </g>
              )}

              {/* Render Waypoint Circles and Labels */}
              {waypoints.map((w, index) => {
                const c = mapGPS(w.lat, w.lng);
                const isActive = index === currentWaypointIndex;
                const isReached = index < currentWaypointIndex;
                
                let markerColor = 'rgba(148, 163, 184, 0.8)'; // pending grey
                if (isActive) markerColor = '#fb7185'; // active rose
                if (isReached) markerColor = '#34d399'; // reached emerald

                return (
                  <g 
                    key={w.id} 
                    className="waypoint-handle cursor-move group"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDraggedWaypointId(w.id);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      setDraggedWaypointId(w.id);
                    }}
                  >
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r={isActive ? "7.5" : "5.5"}
                      fill={markerColor}
                      stroke="#030816"
                      strokeWidth="2"
                      className="group-hover:fill-rose-400 group-hover:scale-125 transition-all duration-200"
                    />
                    {isActive && (
                      <circle
                        cx={c.x}
                        cy={c.y}
                        r="13"
                        fill="none"
                        stroke="#fb7185"
                        strokeWidth="1"
                        className="animate-ping"
                        style={{ transformOrigin: `${c.x}px ${c.y}px` }}
                      />
                    )}
                    <text
                      x={c.x + 9}
                      y={c.y + 3.5}
                      fill={isActive ? "#fb7185" : "lightgrey"}
                      fontSize="9.5"
                      fontWeight={isActive ? "bold" : "600"}
                      className="font-mono bg-slate-900 drop-shadow-[0_1.5px_2.5px_rgba(0,0,0,0.9)] pointer-events-none"
                    >
                      {w.name} ({w.lat.toFixed(1)}N, {Math.abs(w.lng).toFixed(1)}W)
                    </text>
                  </g>
                );
              })}

              {/* The Ship Vessel Icon */}
              {waypoints.length > 0 && (
                <g
                  transform={`translate(${vesselCoords.x}, ${vesselCoords.y})`}
                  className="transition-transform duration-1000 ease-out"
                >
                  {/* Ship halo glowing ring */}
                  <circle r="14" fill="none" stroke="#22d3ee" strokeWidth="1" className="opacity-40 animate-pulse" />
                  
                  {/* Visual arrow pointing towards next waypoint */}
                  <polygon
                    points="0,-8 5,6 0,3 -5,6"
                    fill="#22d3ee"
                    stroke="#030816"
                    strokeWidth="1.5"
                    className="shadow-lg"
                  />
                  
                  {/* Vessel mini label */}
                  <text y="-11" fill="#22d3ee" textAnchor="middle" fontSize="8" fontWeight="bold" className="font-mono text-glow-cyan bg-slate-950/80 px-1 py-0.5 rounded">
                    M/V ATLANTIC STAR
                  </text>
                </g>
              )}
            </g>
          </svg>
        </div>
      </div>

      {/* Route List & Leg Planning Control Pane */}
      <div className="w-full xl:w-80 flex flex-col justify-between border-t xl:border-t-0 xl:border-l border-marine-700/60 pt-4 xl:pt-0 xl:pl-5">
        <div>
          {/* Main Action Controllers */}
          <div className="flex gap-2.5 mb-4">
            <button
              id="btn-toggle-voyage"
              onClick={onToggleVoyage}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
                voyageStarted
                  ? 'bg-amber-500 text-slate-950 border border-amber-400 font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:bg-amber-400'
                  : 'bg-emerald-500 text-slate-950 border border-emerald-400 font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:bg-emerald-400'
              }`}
            >
              {voyageStarted ? (
                <>
                  <Pause className="w-4 h-4 fill-current" /> Standby (Pause)
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current animate-pulse" /> Initiate Passage
                </>
              )}
            </button>
          </div>

          {/* List of Route Waypoints */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">PASSAGE PASS list</span>
              <span className="text-[10px] text-cyan-400 font-mono font-semibold bg-cyan-950/40 px-1.5 py-0.5 rounded">
                {waypoints.length} Waypoints
              </span>
            </div>
            
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {waypoints.map((w, index) => {
                const isActive = index === currentWaypointIndex;
                const isReached = index < currentWaypointIndex;

                return (
                  <div
                    key={w.id}
                    id={`waypoint-item-${w.id}`}
                    className={`flex items-center justify-between p-2 rounded border text-xs font-mono transition-colors ${
                      isActive
                        ? 'bg-rose-950/40 border-rose-800 text-rose-200'
                        : isReached
                        ? 'bg-emerald-950/20 border-emerald-900/60 text-emerald-300'
                        : 'bg-marine-900/40 border-marine-700/40 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-[10px] text-slate-500">#{index + 1}</span>
                      <span className="font-semibold truncate max-w-[100px]">{w.name}</span>
                      <span className="text-[9px] text-slate-500 font-normal">
                        ({w.lat.toFixed(1)}N, {Math.abs(w.lng).toFixed(0)}W)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isReached && <span className="text-[9px] text-emerald-400 font-semibold bg-emerald-950/80 px-1 py-0.5 rounded">PASSED</span>}
                      {isActive && <span className="text-[9px] text-rose-400 font-bold bg-rose-950/80 px-1 py-0.5 rounded animate-pulse">SAILING</span>}
                      
                      {/* Only allow removing if not reached yet and not the active index, to keep demo bulletproof */}
                      {!isReached && !isActive && waypoints.length > 2 && (
                        <button
                          onClick={() => onRemoveWaypoint(w.id)}
                          className="text-slate-500 hover:text-red-400 p-0.5 cursor-pointer"
                          title="Delete Waypoint"
                          id={`btn-del-waypoint-${w.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form to add waypoints */}
          <form onSubmit={handleAddWaypointSubmit} className="space-y-2.5 border-t border-marine-800/80 pt-3">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono block">Plot Intermediate Node</span>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 font-mono block">LATITUDE (N)</label>
                <input
                  type="number"
                  step="0.01"
                  min="31.0"
                  max="38.0"
                  value={newLat}
                  onChange={(e) => setNewLat(e.target.value)}
                  className="w-full bg-slate-900/80 border border-marine-700/60 rounded px-2.5 py-1 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                  id="input-wp-lat"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-mono block">LONGITUDE (W)</label>
                <input
                  type="number"
                  step="0.01"
                  min="-77.0"
                  max="-63.0"
                  value={newLng}
                  onChange={(e) => setNewLng(e.target.value)}
                  className="w-full bg-slate-900/80 border border-marine-700/60 rounded px-2.5 py-1 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                  id="input-wp-lng"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Waypoint Label (e.g. STRAIT-2)"
                value={newWaypointName}
                onChange={(e) => setNewWaypointName(e.target.value)}
                className="flex-1 bg-slate-900/80 border border-marine-700/60 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                id="input-wp-name"
              />
              <button
                type="submit"
                className="bg-cyan-600 hover:bg-cyan-500 p-1.5 rounded border border-cyan-400/30 flex items-center justify-center shrink-0 cursor-pointer animate-pulse"
                id="btn-add-wp-form"
              >
                <Plus className="w-4 h-4 text-slate-950 font-bold" />
              </button>
            </div>
            
            <p className="text-[9px] text-slate-550 italic mt-1 leading-normal">
              💡 Hint: click anywhere on the nautical map chart to spot GPS coordinates accurately, then double click or click "PLOT" in the hover target badge to set it directly.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
