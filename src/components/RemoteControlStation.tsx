import React, { useState } from 'react';
import { 
  Radio, 
  Settings2, 
  AlertOctagon, 
  Send, 
  Anchor, 
  Wind, 
  Sun, 
  Database, 
  Users, 
  CheckCircle, 
  RefreshCw, 
  HelpCircle,
  Sparkles,
  Flame,
  Volume2,
  Trash2,
  Lock,
  Plus
} from 'lucide-react';
import { InterSystemMessage, SimulationEvent, CargoItem, Waypoint } from '../types';

interface RemoteControlStationProps {
  roomId: string;
  setRoomId: (id: string) => void;
  syncStatus: 'syncing' | 'synced' | 'offline';
  voyageStarted: boolean;
  onToggleVoyage: () => void;
  currentWaypointIndex: number;
  waypoints: Waypoint[];
  onSkipWaypoint: () => void;
  onResetSimulation: () => void;
  
  // Weather state & setters
  weather: { windSpeed: number; seaCondition: string; visibility: number };
  onUpdateWeather: (w: Partial<{ windSpeed: number; seaCondition: string; visibility: number }>) => void;
  
  // Engine state & setters
  engine: {
    state: 'off' | 'running' | 'emergency';
    rpm: number;
    temp: number;
    fuelCapacity: number;
    fuelFlowRate: number;
    genLoad: number;
    coolingFlow: number;
  };
  onUpdateEngine: (e: Partial<{
    state: 'off' | 'running' | 'emergency';
    rpm: number;
    temp: number;
    fuelCapacity: number;
    fuelFlowRate: number;
    genLoad: number;
    coolingFlow: number;
  }>) => void;
  
  // Checklists
  engineChecklist: Array<{ id: string; text: string; checked: boolean }>;
  onUpdateEngineChecklist: (checklist: Array<{ id: string; text: string; checked: boolean }>) => void;
  
  // Active Alarms & Actions
  activeAlarms: SimulationEvent[];
  onTriggerDrillSpecific: (index: number) => void;
  onClearAllDrills: () => void;
  drillOptions: Omit<SimulationEvent, 'id' | 'timestamp' | 'acknowledged'>[];
  
  // Messages & VHF
  messages: InterSystemMessage[];
  onSendMessage: (sender: 'remote', receiver: 'bridge' | 'engine' | 'admin' | 'all', content: string) => void;
  
  // Cargo & Administration
  cargoItems: CargoItem[];
  onAddCargo: (cargo: Omit<CargoItem, 'id'>) => void;
  onRemoveCargo: (id: string) => void;
}

export default function RemoteControlStation({
  roomId,
  setRoomId,
  syncStatus,
  voyageStarted,
  onToggleVoyage,
  currentWaypointIndex,
  waypoints,
  onSkipWaypoint,
  onResetSimulation,
  
  weather,
  onUpdateWeather,
  
  engine,
  onUpdateEngine,
  
  engineChecklist,
  onUpdateEngineChecklist,
  
  activeAlarms,
  onTriggerDrillSpecific,
  onClearAllDrills,
  drillOptions,
  
  messages,
  onSendMessage,
  
  cargoItems,
  onAddCargo,
  onRemoveCargo,
}: RemoteControlStationProps) {
  // Local Remote Intercom State
  const [remoteSender, setRemoteSender] = useState<'remote' | 'authority' | 'coastguard'>('remote');
  const [remoteTarget, setRemoteTarget] = useState<'bridge' | 'engine' | 'admin' | 'all'>('all');
  const [remoteText, setRemoteText] = useState('');
  
  // Custom Cargo inputs
  const [newContainerId, setNewContainerId] = useState('MEDU-' + Math.floor(100000 + Math.random() * 900000) + '-9');
  const [newCargoType, setNewCargoType] = useState('General Goods (Dry)');
  const [newCargoWeight, setNewCargoWeight] = useState(18.5);
  const [newCargoDest, setNewCargoDest] = useState('HAMILTON TERMINAL');

  const handleSendCustomMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remoteText.trim()) return;
    
    // Choose appropriate sender tag for roleplay
    let senderName = 'remote';
    if (remoteSender === 'authority') senderName = 'PORT CONTROL';
    if (remoteSender === 'coastguard') senderName = 'RESCUE COORD/COAST GUARD';
    
    onSendMessage(remoteSender as any, remoteTarget, `📡 [${senderName.toUpperCase()} VHF TRANSMISSION]: ${remoteText}`);
    setRemoteText('');
  };

  const handleCreateCargo = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCargo({
      containerId: newContainerId,
      type: newCargoType,
      weight: newCargoWeight,
      destination: newCargoDest,
      status: 'Loaded'
    });
    setNewContainerId('MEDU-' + Math.floor(100000 + Math.random() * 900000) + '-9');
  };

  // Derive counts and lists
  const completedChecks = engineChecklist.filter(c => c.checked).length;
  const checklistPercent = Math.round((completedChecks / engineChecklist.length) * 100);

  // Quick hazard templates
  const triggerCustomIncident = (title: string, desc: string, system: 'bridge' | 'engine' | 'admin', lvl: 'warning' | 'critical') => {
    // We search the drillIndex from options or mock-trigger one
    const foundIdx = drillOptions.findIndex(d => d.title.toLowerCase().includes(title.toLowerCase()));
    if (foundIdx !== -1) {
      onTriggerDrillSpecific(foundIdx);
    } else {
      // Direct post via remote broadcast
      onSendMessage('remote', 'all', `🚨 MANUAL HAZARD INJECTED BY CONTROLLER: [${title}] in ${system.toUpperCase()} system. Details: ${desc}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-300 font-sans" id="remote-control-station">
      
      {/* HEADER BANNER OF THE CONTROLLER DECK */}
      <div className="bg-cyan-950/20 border border-cyan-800/40 rounded-xl p-5 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-cyan-400/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-cyan-500 rounded-xl flex items-center justify-center border border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] animate-pulse">
              <Settings2 className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-900 border border-cyan-600 text-white tracking-wider">
                  MASTER CONTROLLER
                </span>
                <span className="text-xs text-slate-400 font-mono">Real-time Satellite Sync</span>
              </div>
              <h2 className="font-display font-black text-xl text-white tracking-widest uppercase mt-0.5">
                Instructor & Simulator Remote Control Deck
              </h2>
            </div>
          </div>

          <div className="bg-slate-950 px-4 py-2 rounded-lg border border-marine-800 flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[8px] uppercase font-bold">Simulation Room:</span>
              <input 
                type="text" 
                value={roomId} 
                onChange={e => setRoomId(e.target.value)}
                className="bg-transparent text-white border-b border-cyan-800 hover:border-cyan-500 focus:border-cyan-400 focus:outline-none w-28 text-center text-xs font-bold uppercase"
              />
            </div>
            <div>
              <span className="text-slate-500 block text-[8px] uppercase font-bold">Sync Status:</span>
              <span className="flex items-center gap-1.5 font-bold">
                <span className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500 animate-pulse'}`}></span>
                {syncStatus === 'synced' && <span className="text-emerald-400">ONLINE</span>}
                {syncStatus === 'syncing' && <span className="text-amber-400">SYNCING</span>}
                {syncStatus === 'offline' && <span className="text-rose-500 font-mono">OFFLINE</span>}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* COL 1: MASTER GLOBAL CONTROLS & WEATHER OVERRIDES */}
        <div className="space-y-6">
          
          {/* Box 1: Voyage Master Override */}
          <div className="glass-panel p-4 rounded-xl border border-marine-800 bg-marine-900/60 font-sans space-y-4">
            <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-marine-800 pb-2">
              <Anchor className="w-4 h-4 text-cyan-500" />
              Voyage Management
            </h3>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onToggleVoyage}
                className={`py-2 px-3 rounded text-xs font-bold font-sans tracking-wide uppercase cursor-pointer transition-colors ${
                  voyageStarted 
                    ? 'bg-rose-900 hover:bg-rose-800 text-rose-100 border border-rose-700/50' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950'
                }`}
              >
                {voyageStarted ? '⏹ STOP VOYAGE' : '▶ START VOYAGE'}
              </button>
              
              <button
                onClick={onSkipWaypoint}
                disabled={!voyageStarted}
                className="bg-slate-950 hover:bg-marine-900 text-cyan-400 border border-marine-800 rounded text-xs font-mono py-2 px-3 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ⏭ SKIP LEG
              </button>
            </div>

            <div className="bg-slate-950 p-2.5 rounded border border-marine-850 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Voyage Status:</span>
                <span className={voyageStarted ? 'text-emerald-400 font-bold' : 'text-slate-400 font-bold'}>
                  {voyageStarted ? 'SAILING TRANSIT' : 'PORT STANDBY'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Leg:</span>
                <span className="text-white font-bold">
                  Leg #{currentWaypointIndex + 1} of {waypoints.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sector Origin:</span>
                <span className="text-slate-350">{waypoints[currentWaypointIndex]?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Next Destination:</span>
                <span className="text-cyan-400 font-bold">
                  {waypoints[Math.min(currentWaypointIndex + 1, waypoints.length - 1)]?.name}
                </span>
              </div>
            </div>

            <button
              onClick={onResetSimulation}
              className="w-full bg-red-950/40 hover:bg-red-900/50 text-rose-300 hover:text-white border border-red-900/60 text-xs font-sans font-bold py-2 rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> RESET ENTIRE SIMULATOR RUN
            </button>
          </div>

          {/* Box 2: Weather & Environmental Overrides */}
          <div className="glass-panel p-4 rounded-xl border border-marine-800 bg-marine-900/60 space-y-4">
            <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-marine-800 pb-2">
              <Wind className="w-4 h-4 text-cyan-500 animate-pulse" />
              Dynamic Weather Force Overrides
            </h3>

            <div className="space-y-3.5">
              
              {/* Wind Speed Override */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">Wind Intensity:</span>
                  <strong className="text-cyan-400">{weather.windSpeed} KTS</strong>
                </div>
                <input
                  type="range"
                  min="2"
                  max="60"
                  value={weather.windSpeed}
                  onChange={e => onUpdateWeather({ windSpeed: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              {/* Sea Condition Override */}
              <div>
                <span className="text-xs font-mono text-slate-400 block mb-1">Sea Condition Designation:</span>
                <select
                  value={weather.seaCondition}
                  onChange={e => onUpdateWeather({ seaCondition: e.target.value })}
                  className="w-full bg-slate-950 border border-marine-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Calm (Mirror like)">Smooth Sea (Calm / Mirror glassy)</option>
                  <option value="Light chop">Light ripple (Force 2-3)</option>
                  <option value="Moderate swell">Moderate swells (Oceanic wave index 2.5m)</option>
                  <option value="Rough sea state">Rough sea corridors (Force 6-7)</option>
                  <option value="Very rough / Gale">Gale warning (Force 9, 6-meter breaking peaks)</option>
                  <option value="Hurricane Force Typhoon">Severe Hurricane Typhoon (12m extreme seas)</option>
                </select>
              </div>

              {/* Visibility Override */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">Radar & Visual Visibility range:</span>
                  <strong className="text-amber-500">{weather.visibility} NM</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  step="0.5"
                  value={weather.visibility}
                  onChange={e => onUpdateWeather({ visibility: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* Quick Environmental Templates */}
              <div className="pt-2 border-t border-marine-850 text-[10px] space-y-1">
                <span className="text-slate-500 font-mono uppercase block">Quick Presets:</span>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => onUpdateWeather({ windSpeed: 5, seaCondition: 'Calm (Mirror like)', visibility: 20 })}
                    className="bg-slate-950 border border-marine-800 rounded px-2 py-0.5 text-[9px] hover:text-white hover:bg-marine-900 transition-colors cursor-pointer"
                  >
                    ☀️ Sunny Calm
                  </button>
                  <button
                    onClick={() => onUpdateWeather({ windSpeed: 24, seaCondition: 'Rough sea state', visibility: 6 })}
                    className="bg-slate-950 border border-marine-800 rounded px-2 py-0.5 text-[9px] hover:text-white hover:bg-marine-900 transition-colors cursor-pointer"
                  >
                    💨 Heavy Swells
                  </button>
                  <button
                    onClick={() => onUpdateWeather({ windSpeed: 38, seaCondition: 'Very rough / Gale', visibility: 1.2 })}
                    className="bg-slate-950 border border-marine-800 rounded px-2 py-0.5 text-[9px] hover:text-white hover:bg-marine-900 transition-colors cursor-pointer animate-pulse text-amber-400"
                  >
                    🌁 Heavy Fog / Gale
                  </button>
                  <button
                    onClick={() => onUpdateWeather({ windSpeed: 55, seaCondition: 'Hurricane Force Typhoon', visibility: 0.4 })}
                    className="bg-slate-950 border border-red-900/60 rounded px-2 py-0.5 text-[9px] hover:text-white hover:bg-red-950/20 text-rose-400 transition-colors cursor-pointer font-bold"
                  >
                    🌀 extreme typhoon
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COL 2: TELEMETRY DRILL DRILL INJECTORS */}
        <div className="space-y-6">
          
          {/* Box 3: Student Action & Checklist Monitoring */}
          <div className="glass-panel p-4 rounded-xl border border-marine-800 bg-marine-900/60 space-y-3.5">
            <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-marine-800 pb-2">
              <Users className="w-4 h-4 text-cyan-500" />
              Live Student Cadet Watch Status
            </h3>

            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between items-center text-xs font-mono mb-1">
                  <span className="text-slate-400">Engine Room Checklist Progress:</span>
                  <span className="text-cyan-400 font-bold">{completedChecks}/{engineChecklist.length} ({checklistPercent}%)</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 border border-marine-850 overflow-hidden">
                  <div 
                    className="bg-cyan-500 h-full transition-all duration-500" 
                    style={{ width: `${checklistPercent}%` }}
                  ></div>
                </div>
              </div>

              {/* Checklist items dynamic status */}
              <div className="bg-slate-950/80 rounded border border-marine-850 p-2 text-[10px] font-mono divide-y divide-marine-900">
                {engineChecklist.map((item) => (
                  <div key={item.id} className="flex justify-between py-1 items-center">
                    <span className="text-slate-400 truncate pr-2">{item.text}</span>
                    <span className={`font-bold shrink-0 ${item.checked ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {item.checked ? '✓ CLEARED' : '⏱ OPEN'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-1.5 pt-1 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => onUpdateEngineChecklist(engineChecklist.map(c => ({...c, checked: true})))}
                  className="flex-1 bg-cyan-950/50 hover:bg-cyan-900/50 border border-cyan-800/40 py-1 rounded text-cyan-400 cursor-pointer"
                >
                  ✓ Complete All Checks
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateEngineChecklist(engineChecklist.map(c => ({...c, checked: false})))}
                  className="flex-1 bg-slate-900 border border-marine-800 py-1 rounded text-slate-500 cursor-pointer"
                >
                  ✕ Reset Checklists
                </button>
              </div>
            </div>
          </div>

          {/* Box 4: Emergency Incident & Drill Manual Trigger */}
          <div className="glass-panel p-4 rounded-xl border border-marine-800 bg-marine-900/60 space-y-4">
            <div className="flex items-center justify-between border-b border-marine-800 pb-2">
              <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-500 animate-pulse" />
                Inject Emergency Incidents
              </h3>
              
              <button
                onClick={onClearAllDrills}
                className="text-[9px] font-mono bg-emerald-950/50 hover:bg-emerald-950 border border-emerald-800 text-emerald-400 px-2 py-0.5 rounded transition"
              >
                Clear Alarms
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase text-slate-500 block">Deploy pre-programmed cadet incidents:</span>
              <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
                {drillOptions.map((drill, idx) => {
                  let alertIndicator = '🟠';
                  let strokeColor = 'border-marine-800 bg-slate-950/80 hover:bg-marine-900/80 text-slate-300';
                  if (drill.level === 'critical') {
                    alertIndicator = '🔴';
                    strokeColor = 'border-red-950 bg-red-950/10 hover:bg-red-950/20 text-rose-200';
                  }

                  // Check if this incident is already active/firing
                  const isCurrentlyInjected = activeAlarms.some(a => a.title === drill.title);

                  return (
                    <button
                      key={idx}
                      onClick={() => onTriggerDrillSpecific(idx)}
                      disabled={isCurrentlyInjected}
                      className={`text-left p-1.5 rounded border text-[10.5px] font-mono flex items-center justify-between transition-all cursor-pointer ${strokeColor} ${
                        isCurrentlyInjected ? 'opacity-40 cursor-not-allowed border-dashed' : ''
                      }`}
                    >
                      <div className="truncate pr-1.5">
                        <span className="mr-1">{alertIndicator}</span>
                        <span className="font-bold uppercase text-[9px] opacity-60">[{drill.system.toUpperCase()}]</span>{' '}
                        <span>{drill.title}</span>
                      </div>
                      <span className="text-[8px] bg-marine-900/80 text-slate-400 px-1 py-0.5 rounded shrink-0">
                        {isCurrentlyInjected ? 'ACTIVE' : 'FIRE'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Direct System Overheating Drills */}
              <div className="pt-3 border-t border-marine-850 space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Direct Real-Time Telemetry Spikes:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      onUpdateEngine({ temp: 114, state: 'emergency' });
                      triggerCustomIncident('Engine Cylinder Jacket Overheat', 'A sudden cooling loss causes Cylinder head 4 temperature to surge to 114 degrees Celcius. Students: open seawater pumps!', 'engine', 'critical');
                    }}
                    className="bg-red-900/40 hover:bg-red-900/60 border border-red-700/60 rounded p-1 text-[10px] font-mono text-rose-200 cursor-pointer text-center"
                  >
                    🔥 Overheat Engine (114°C)
                  </button>
                  
                  <button
                    onClick={() => {
                      onUpdateEngine({ rpm: 0, state: 'off' });
                      triggerCustomIncident('Engine Emergency Trip Stop', 'Main engine tripped automatically on low lube oil pressure. Propellers stopped spinning. Speed collapsing.', 'engine', 'critical');
                    }}
                    className="bg-slate-950 hover:bg-marine-900 border border-cyan-800/50 rounded p-1 text-[10px] font-mono text-cyan-400 cursor-pointer text-center"
                  >
                    🔌 Engine Trip (0 RPM)
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* COL 3: RADIOS, INTERCOM INJECT, AND CARGO MANIFESTS */}
        <div className="space-y-6">
          
          {/* Box 5: Live Intercom Watch & Controller Radio Voice */}
          <div className="glass-panel p-4 rounded-xl border border-marine-800 bg-marine-900/60 space-y-4">
            <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-marine-800 pb-2">
              <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
              Watch frequency Monitoring & Controller Voice
            </h3>

            <div className="space-y-3">
              {/* VHF Stream */}
              <div>
                <span className="text-[9px] uppercase font-mono text-slate-500 mb-1 block">Live Radio Channel Log (Filtered)</span>
                <div className="bg-slate-950/90 rounded border border-marine-850 p-2 h-28 overflow-y-auto space-y-1 font-mono text-[9.5px]">
                  {messages.length > 0 ? (
                    messages.map(m => {
                      let tagColor = 'text-cyan-400';
                      if (m.sender === 'engine') tagColor = 'text-amber-400';
                      if (m.sender === 'admin') tagColor = 'text-purple-400';
                      if (m.sender === 'remote') tagColor = 'text-rose-400 font-extrabold';
                      
                      return (
                        <div key={m.id} className="border-b border-marine-900/50 pb-1 leading-tight">
                          <span className={tagColor}>
                            [{m.timestamp}] {m.sender.toUpperCase()} → {m.receiver.toUpperCase()}:
                          </span>{' '}
                          <span className="text-slate-200">{m.content}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-slate-600 text-center py-8 italic">No satellite communications active.</div>
                  )}
                </div>
              </div>

              {/* Form to dispatch master controller voice */}
              <form onSubmit={handleSendCustomMessage} className="space-y-2 pt-1 border-t border-marine-850">
                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Disguise Voice As:</span>
                    <select
                      value={remoteSender}
                      onChange={e => setRemoteSender(e.target.value as any)}
                      className="w-full bg-slate-950 border border-marine-800 rounded px-1.5 py-1 text-white text-[10px] focus:outline-none"
                    >
                      <option value="remote">Simulator Controller</option>
                      <option value="authority">Bermuda Port Authority</option>
                      <option value="coastguard">Coast Guard Rescue Centre</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-0.5">VHF Broadcast Target:</span>
                    <select
                      value={remoteTarget}
                      onChange={e => setRemoteTarget(e.target.value as any)}
                      className="w-full bg-slate-950 border border-marine-800 rounded px-1.5 py-1 text-white text-[10px] focus:outline-none"
                    >
                      <option value="all">To: All Student Stations</option>
                      <option value="bridge">To: Bridge Watch only</option>
                      <option value="engine">To: Engine Watch only</option>
                      <option value="admin">To: Office Admin only</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-1">
                  <input
                    type="text"
                    value={remoteText}
                    onChange={e => setRemoteText(e.target.value)}
                    placeholder="Type VHF vocal transmission to inject..."
                    className="flex-1 bg-slate-950 border border-marine-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    className="bg-cyan-600 hover:bg-cyan-500 border border-cyan-500 text-slate-950 rounded px-2.5 flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Box 6: Custom Cargo manifest injector */}
          <div className="glass-panel p-4 rounded-xl border border-marine-800 bg-marine-900/60 space-y-4">
            <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-marine-800 pb-2">
              <Database className="w-4 h-4 text-cyan-500" />
              Stowed Shipping Cargo Manifest Controls
            </h3>

            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1.5">Create and stow brand new slot container:</span>
              <form onSubmit={handleCreateCargo} className="space-y-2 text-[10px] font-mono">
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Container ID:</span>
                    <input
                      type="text"
                      value={newContainerId}
                      onChange={e => setNewContainerId(e.target.value)}
                      className="w-full bg-slate-950 border border-marine-800 rounded px-1.5 py-1 text-white"
                      required
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Classification Weight (MT):</span>
                    <input
                      type="number"
                      step="0.1"
                      value={newCargoWeight}
                      onChange={e => setNewCargoWeight(parseFloat(e.target.value))}
                      className="w-full bg-slate-950 border border-marine-800 rounded px-1.5 py-1 text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Contents Cargo Category:</span>
                    <select
                      value={newCargoType}
                      onChange={e => setNewCargoType(e.target.value)}
                      className="w-full bg-slate-950 border border-marine-800 rounded px-1.5 py-1 text-white text-[9.5px]"
                    >
                      <option value="General Goods (Dry)">Electronics / Dry Goods</option>
                      <option value="Refrigerated Food (Reefer)">Reefer Cold Chain Food</option>
                      <option value="Chemical Grade A (Hazmat)">Hazmat Chemicals (Class 4)</option>
                      <option value="Volatile Ordnance (Hazmat)">Explosives / Ordnance (Class 1)</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Discharge Destination:</span>
                    <input
                      type="text"
                      value={newCargoDest}
                      onChange={e => setNewCargoDest(e.target.value)}
                      className="w-full bg-slate-950 border border-marine-800 rounded px-1.5 py-1 text-white"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold font-sans py-1.5 rounded transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Stow Container onto Ship Manifest
                </button>
              </form>

              {/* Dynamic current Cargo Manifest Count inside simulator */}
              <div className="mt-3 bg-slate-950 p-2 rounded border border-marine-850 flex items-center justify-between text-[10.5px] font-mono">
                <span className="text-slate-400">Current stowed roster count:</span>
                <span className="text-white font-bold">{cargoItems.length} Containers stowed</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
