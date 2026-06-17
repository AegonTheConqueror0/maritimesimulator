import React, { useState, useEffect } from 'react';
import { Target, ShieldAlert, Crosshair, HelpCircle } from 'lucide-react';

interface RadarTarget {
  id: string;
  name: string;
  distance: number; // nm
  bearing: number; // degrees
  speed: number; // knots
  heading: number; // degrees
  classification: 'commercial' | 'military' | 'hazard' | 'unknown';
}

export default function RadarScreen() {
  const [range, setRange] = useState<2 | 6 | 12 | 24>(12); // nautical miles
  const [selectedTarget, setSelectedTarget] = useState<RadarTarget | null>(null);
  const [targets, setTargets] = useState<RadarTarget[]>([
    { id: 'T-204', name: 'APL SENTOSA', distance: 8.2, bearing: 42, speed: 18.5, heading: 220, classification: 'commercial' },
    { id: 'T-118', name: 'OCEAN TRADER', distance: 3.4, bearing: 285, speed: 12.0, heading: 140, classification: 'commercial' },
    { id: 'T-905', name: 'USN BURKE', distance: 10.5, bearing: 160, speed: 24.1, heading: 350, classification: 'military' },
    { id: 'T-116', name: 'FISHING BLIP', distance: 1.8, bearing: 125, speed: 6.2, heading: 85, classification: 'unknown' },
  ]);

  // Keep targets slowly drifting
  useEffect(() => {
    const timer = setInterval(() => {
      setTargets(prev => 
        prev.map(t => {
          // Adjust distance and bearing slightly based on their heading
          const speedFactor = 0.01;
          const deltaX = Math.sin((t.heading * Math.PI) / 180) * (t.speed * speedFactor);
          const deltaY = Math.cos((t.heading * Math.PI) / 180) * (t.speed * speedFactor);
          
          // Re-calculate distance and bearing from center (0,0)
          // Current position in cartesian
          const currentRad = (t.bearing * Math.PI) / 180;
          const currX = Math.sin(currentRad) * t.distance;
          const currY = Math.cos(currentRad) * t.distance;
          
          const newX = currX + deltaX;
          const newY = currY + deltaY;
          
          const newDist = Math.max(0.1, Math.sqrt(newX * newX + newY * newY));
          let newBearing = Math.round((Math.atan2(newX, newY) * 180) / Math.PI);
          if (newBearing < 0) newBearing += 360;

          // If too far, wrap or regenerate
          if (newDist > 25) {
            return {
              ...t,
              distance: 15 + Math.random() * 5,
              bearing: Math.round(Math.random() * 360),
            };
          }

          return {
            ...t,
            distance: parseFloat(newDist.toFixed(2)),
            bearing: newBearing,
          };
        })
      );
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  const handleCreateContact = () => {
    const codes = ['MSK', 'CMA', 'NYK', 'COSCO', 'HPL'];
    const prefix = codes[Math.floor(Math.random() * codes.length)];
    const number = Math.floor(Math.random() * 900) + 100;
    const randomClass: RadarTarget['classification'][] = ['commercial', 'military', 'hazard', 'unknown'];
    
    const newTarget: RadarTarget = {
      id: `T-${number}`,
      name: `${prefix} ${['VANGUARD', 'CHALLENGER', 'ZEPHYR', 'NEPTUNE', 'SIRIUS'][Math.floor(Math.random() * 5)]}`,
      distance: parseFloat((3 + Math.random() * 18).toFixed(1)),
      bearing: Math.floor(Math.random() * 360),
      speed: parseFloat((8 + Math.random() * 20).toFixed(1)),
      heading: Math.floor(Math.random() * 360),
      classification: randomClass[Math.floor(Math.random() * randomClass.length)],
    };

    setTargets(prev => [...prev, newTarget]);
  };

  return (
    <div className="glass-panel p-4 rounded-xl flex flex-col gap-4 h-full" id="radar-container">
      {/* Radar Display Scope */}
      <div className="flex-1 flex flex-col items-center justify-center relative min-h-[280px]">
        <div className="absolute top-2 left-2 flex gap-1 z-10 w-full justify-between pr-4">
          <span className="text-[10px] uppercase tracking-wider text-cyan-400 bg-cyan-950/60 px-2 py-0.5 border border-cyan-800/50 rounded font-mono">
            Radar Overlay: Active
          </span>
          <span className="text-[10px] uppercase tracking-wider text-orange-400 bg-orange-950/60 px-2 py-0.5 border border-orange-800/50 rounded font-mono">
            H-UP
          </span>
        </div>

        {/* Outer Circular frame and radial markers */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 lg:w-64 lg:h-64 xl:w-72 xl:h-72 rounded-full border border-cyan-500/20 bg-slate-950/90 overflow-hidden flex items-center justify-center">
          {/* Compass Rose markings around perimeter */}
          <div className="absolute inset-0 border-[6px] border-marine-800/80 rounded-full pointer-events-none"></div>
          
          {/* Bearings display */}
          <span className="absolute top-2 text-[9px] font-mono font-medium text-cyan-400/80 pointer-events-none text-glow-cyan">000° N</span>
          <span className="absolute right-2 text-[9px] font-mono font-medium text-cyan-400/80 pointer-events-none text-glow-cyan">090° E</span>
          <span className="absolute bottom-2 text-[9px] font-mono font-medium text-cyan-400/80 pointer-events-none text-glow-cyan">180° S</span>
          <span className="absolute left-2 text-[9px] font-mono font-medium text-cyan-400/80 pointer-events-none text-glow-cyan">270° W</span>

          {/* Radial radar grid rings */}
          <div className="absolute w-4/5 h-4/5 rounded-full border border-cyan-500/10 pointer-events-none"></div>
          <div className="absolute w-3/5 h-3/5 rounded-full border border-cyan-500/15 pointer-events-none"></div>
          <div className="absolute w-2/5 h-2/5 rounded-full border border-cyan-500/10 pointer-events-none"></div>
          <div className="absolute w-1/5 h-1/5 rounded-full border border-cyan-500/20 pointer-events-none"></div>
          
          {/* Grid cross lines */}
          <div className="absolute w-full h-[1px] bg-cyan-500/10 pointer-events-none"></div>
          <div className="absolute h-full w-[1px] bg-cyan-500/10 pointer-events-none"></div>
          
          {/* Sweeper Line rotating */}
          <div className="absolute top-1/2 left-1/2 w-1/2 h-0.5 bg-gradient-to-r from-cyan-400/80 to-transparent origin-left animate-radar-sweep pointer-events-none"></div>

          {/* Own ship center blip */}
          <div className="absolute w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_8px_#10b981] z-20 pointer-events-none"></div>

          {/* Dynamic Targets plotted */}
          {targets.map(target => {
            // Check if within radar scale
            const percentDistance = (target.distance / range) * 50; // max radius is 50%
            if (percentDistance > 50) return null;

            // Cartesian coords based on bearing and radius, keeping in mind bearing 0 is straight UP
            const rad = ((target.bearing - 90) * Math.PI) / 180;
            const x = Math.cos(rad) * percentDistance;
            const y = Math.sin(rad) * percentDistance;

            const isSelected = selectedTarget?.id === target.id;
            
            // Classification colors
            let blipColor = 'bg-cyan-400 border-cyan-300 shadow-[0_0_6px_rgba(6,182,212,0.8)]';
            if (target.classification === 'military') blipColor = 'bg-indigo-400 border-indigo-300 shadow-[0_0_6px_rgba(129,140,248,0.8)]';
            if (target.classification === 'hazard') blipColor = 'bg-red-400 border-red-300 shadow-[0_0_6px_rgba(248,113,113,0.8)]';
            if (target.classification === 'unknown') blipColor = 'bg-amber-400 border-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.8)]';

            return (
              <button
                key={target.id}
                id={`radar-target-${target.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTarget(target);
                }}
                style={{
                  transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`,
                }}
                className={`absolute w-3.5 h-3.5 rounded-full border cursor-pointer hover:scale-125 transition-transform duration-200 z-10 flex items-center justify-center ${blipColor} ${
                  isSelected ? 'ring-2 ring-emerald-400 scale-125' : ''
                }`}
              >
                {/* Micro heading vector line */}
                <div 
                  style={{ transform: `rotate(${target.heading}deg)` }}
                  className="absolute w-0.5 h-5 bg-cyan-400/60 top-[-10px] pointer-events-none"
                ></div>
                <span className="absolute -bottom-3 text-[8px] font-mono text-cyan-300/85 whitespace-nowrap bg-slate-950/80 px-1 rounded border border-cyan-900/40">
                  {target.id}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Control Console / Info Bar */}
      <div className="w-full flex flex-col justify-between border-t border-marine-700/60 pt-4">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-display text-sm font-semibold text-cyan-400 flex items-center gap-1.5 uppercase">
              <Crosshair className="w-4 h-4 text-cyan-500" />
              Radar Targets
            </h4>
            <button 
              onClick={handleCreateContact}
              className="text-[10px] text-cyan-300 hover:text-white bg-cyan-900/40 hover:bg-cyan-800/60 border border-cyan-700/50 rounded px-2 py-0.5 transition-colors"
                id="btn-add-contact"
            >
              Add Contact
            </button>
          </div>

          {/* Range rings controller */}
          <div className="mb-4">
            <span className="text-[11px] font-sans text-slate-400 block mb-1.5">Range Ring Scope</span>
            <div className="grid grid-cols-4 gap-1">
              {([2, 6, 12, 24] as const).map(r => (
                <button
                  key={r}
                  id={`btn-range-${r}`}
                  onClick={() => setRange(r)}
                  className={`text-xs font-mono py-1 rounded border text-center transition-all ${
                    range === r 
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-[0_0_8px_rgba(6,182,212,0.4)]' 
                      : 'bg-marine-800/40 text-slate-300 border-marine-700/50 hover:bg-marine-700/60'
                  }`}
                >
                  {r} NM
                </button>
              ))}
            </div>
          </div>

          {/* Selected target data frame */}
          <div className="bg-marine-900/60 rounded-lg p-2.5 border border-marine-700/50">
            {selectedTarget ? (
              <div id="radar-target-details" className="text-xs font-mono space-y-1.5">
                <div className="flex justify-between items-center pb-1 border-b border-marine-700/50 mb-1">
                  <span className="text-cyan-400 font-bold">{selectedTarget.id}</span>
                  <span className="text-[10px] uppercase font-sans text-slate-400 bg-marine-800/80 px-1 py-0.5 rounded">
                    {selectedTarget.classification}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>NAME:</span>
                  <span className="text-white truncate max-w-[100px]">{selectedTarget.name}</span>
                </div>
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>RANGE:</span>
                  <span className="text-emerald-400 font-semibold">{selectedTarget.distance} NM</span>
                </div>
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>BEARING:</span>
                  <span className="text-cyan-300">{selectedTarget.bearing.toString().padStart(3, '0')}°</span>
                </div>
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>SPEED:</span>
                  <span className="text-orange-300">{selectedTarget.speed} KTS</span>
                </div>
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>HEADING:</span>
                  <span className="text-amber-300">{selectedTarget.heading.toString().padStart(3, '0')}°</span>
                </div>
                <div className="flex justify-between text-slate-300 text-[11px] border-t border-marine-700/40 pt-1 mt-1 font-sans">
                  <span>CPA / TCPA:</span>
                  <span className="text-red-400 font-semibold">1.2nm @ 3m</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs">
                <Target className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-40 animate-pulse" />
                Select radar contact target to query telemetry
              </div>
            )}
          </div>
        </div>

        {/* Warning panel footer */}
        <div className="mt-3 bg-red-950/20 border border-red-900/30 rounded p-1.5 text-[10px] text-red-300/80 flex items-start gap-1">
          <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
          <span>Keep clear of 2NM radius of unknown signals. Risk of collision.</span>
        </div>
      </div>
    </div>
  );
}
