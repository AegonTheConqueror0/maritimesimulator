import React, { useState, useEffect } from 'react';
import { InterSystemMessage, SimulationEvent } from '../types';
import { 
  Zap, 
  Droplet, 
  Thermometer, 
  Gauge, 
  Send, 
  History, 
  CheckSquare, 
  ShieldAlert,
  Play,
  Square,
  AlertOctagon,
  Wrench,
  Check,
  Radio,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';

interface EngineStationProps {
  messages: InterSystemMessage[];
  onSendMessage: (sender: 'engine', receiver: 'bridge' | 'admin' | 'all', content: string) => void;
  activeAlarms: SimulationEvent[];
  onAcknowledgeAlarm: (alarmId: string) => void;
  shipSpeed: number;
  voyageStarted: boolean;
  trainingMode?: boolean;
  
  // Synced states
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
  
  engineChecklist: Array<{ id: string; text: string; checked: boolean }>;
  onUpdateEngineChecklist: (checklist: Array<{ id: string; text: string; checked: boolean }>) => void;
}

export default function EngineStation({
  messages,
  onSendMessage,
  activeAlarms,
  onAcknowledgeAlarm,
  shipSpeed,
  voyageStarted,
  trainingMode = false,
  engine,
  onUpdateEngine,
  engineChecklist,
  onUpdateEngineChecklist,
}: EngineStationProps) {
  // Map local variables to read directly from props
  const engineState = engine.state;
  const rpm = engine.rpm;
  const temp = engine.temp;
  const fuelCapacity = engine.fuelCapacity;
  const fuelFlowRate = engine.fuelFlowRate;
  const genLoad = engine.genLoad;
  const coolingFlow = engine.coolingFlow;
  const checklist = engineChecklist;
  
  // Intercom state
  const [commsTarget, setCommsTarget] = useState<'bridge' | 'admin' | 'all'>('bridge');
  const [commsText, setCommsText] = useState('');

  // Script scenario and sync chal state
  const [activeTab, setActiveTab] = useState<'speak' | 'code'>('speak');
  const [scriptScenario, setScriptScenario] = useState<'routine' | 'heavy_load' | 'overheat' | 'maintenance'>('routine');
  const [syncKeyword, setSyncKeyword] = useState('');
  const [syncStatus, setSyncStatus] = useState<'empty' | 'valid' | 'invalid'>('empty');

  // Compute live SMCP engine roleplay script
  const getGeneratedScript = () => {
    switch (scriptScenario) {
      case 'routine':
        return `ENGINE MONITOR WATCH • MAIN PROPULSION RUNNING • THIS IS CHIEF ENGINEER TANAKA ON DUTY. PROPULSION DIESEL NOMINAL AT ${rpm} RPM. EXHAUST TEMPERATURE STABLE AT ${temp}°C. AUXILIARY GENERATOR LOAD REGULATED AT ${genLoad}%. TOTAL REMAINING HEAVY FUEL OIL CAPACITY STOWED AT ${fuelCapacity.toFixed(1)} TONS. MACHINES SECURE. OVER.`;
      case 'heavy_load':
        return `ENGINE STATION • FULL RANGE VOYAGE PASSAGE UNDERWAY • MAIN DISPLACEMENT IN TRANSIT. PROPULSION COUPLING RECONCILED AT SEA COMPLIANCE SPEED. FUEL FLOW REGISTERED AT ${fuelFlowRate.toFixed(1)} TONS/HR. SYSTEM OUTLET COOLING PUMP FLOW PRODUCING ${coolingFlow} LPM. POWER LINE SYNCHRONIZED. STANDING BY. OUT.`;
      case 'overheat':
        return `PAN-PAN • PAN-PAN • PAN-PAN • BRIDGE WATCH, THIS IS ENGINE COMPARTMENT COMMAND. EMERGENCY TRANSMISSION. CRITICAL TEMPERATURE ENCOUNTERED ON CYLINDER JACKET. WE MEASURED A THERMAL SPIKE REACHING ${temp}°C WITH SEAWATER COOLING PRESSURE REDUCED. REQUESTING REDUCTION OF VESSEL SPEED COMMAND AT ONCE. OVER.`;
      case 'maintenance':
        return `ENGINE DESK • MAINTENANCE PLAN COMPLETE • PRIMARY SURVEY CHECKLIST CLEAR. STARTING AIR RECEIVER REPRESSURE STABLE. AIR VENT PRESSURE VALVES OPERATED, AUXILIARY HEAVY FUEL SEPARATOR WATER DOCK DRAINED. WE SECURE TO RESPOND. READY FOR SEA VOYAGE START. OUT.`;
      default:
        return '';
    }
  };

  const handleBroadcastScript = () => {
    const script = getGeneratedScript();
    onSendMessage('engine', commsTarget, script);
  };

  const latestIncoming = messages
    .filter(m => m.sender !== 'engine')
    .slice(-1)[0];

  const checkSyncChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!latestIncoming) return;
    const word = syncKeyword.trim().toLowerCase();
    if (word.length < 3) {
      setSyncStatus('invalid');
      return;
    }
    const contentLower = latestIncoming.content.toLowerCase();
    if (contentLower.includes(word)) {
      setSyncStatus('valid');
    } else {
      setSyncStatus('invalid');
    }
  };

  useEffect(() => {
    setSyncStatus('empty');
    setSyncKeyword('');
  }, [latestIncoming?.id]);

  // Handle engine state transitions from parent
  const handleStartEngine = () => {
    onUpdateEngine({ state: 'running' });
    onSendMessage('engine', 'bridge', "🚨 Propulsion control online. Starting main marine diesel generators.");
  };

  const handleStopEngine = () => {
    onUpdateEngine({ state: 'off' });
    onSendMessage('engine', 'bridge', "⚙️ Propulsion machinery stopped. Transferring to auxiliary hotel power.");
  };

  const handleEmergencyShutdown = () => {
    onUpdateEngine({ state: 'emergency' });
    onSendMessage('engine', 'all', "🚨 EMERGENCY POWER DOWN INITIATED FROM ENGINE ROOM CONSOLE!");
  };

  const handleToggleChecklist = (id: string) => {
    const updated = checklist.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    onUpdateEngineChecklist(updated);
  };

  const handleSendReport = () => {
    const reportText = `[ENGINE CONSOLE STATS] STATUS: ${engineState.toUpperCase()} | RPM: ${rpm} | CORE TEMP: ${temp}°C | FUEL CAP: ${fuelCapacity.toFixed(1)} MT | GEN LOAD: ${genLoad}% | STATUS SAFE`;
    onSendMessage('engine', commsTarget, reportText);
  };

  const handleSendCommsMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commsText.trim()) return;
    onSendMessage('engine', commsTarget, commsText);
    setCommsText('');
  };

  // Get active alarms matching engine station
  const engineAlarms = activeAlarms.filter(a => a.system === 'engine');

  // Filter messages relevant to Engine
  const engineMessages = messages.filter(
    m => m.sender === 'engine' || m.receiver === 'engine' || m.receiver === 'all'
  );

  return (
    <div className="space-y-5 animate-fade-in" id="engine-station-container">
      {trainingMode && (
        <div className="bg-amber-500/10 border border-amber-500/45 p-4 rounded-xl flex items-start gap-3 text-xs text-amber-200 animate-slide-in" id="training-engine-alert">
          <span className="text-base">🎓</span>
          <div>
            <strong className="uppercase font-display tracking-wider block mb-1 text-amber-400">Power Management (PMS) & Propulsion Cadet Guide</strong>
            You are now in the Engine Control Room (ECR). The duty engineer monitors Main Engine lubrication coolant temperature, fuel flow rates, and active electrical load generators. High exhaust heat or drop in oil pressure triggers system alarms — ensure you check auxiliary pumps immediately and maintain generators synchronized to prevent shipboard blackouts.
          </div>
        </div>
      )}
      
      {/* Alarms bar banner if active */}
      {engineAlarms.filter(a => !a.acknowledged).length > 0 && (
        <div className="bg-red-950/80 border border-red-500 rounded-lg p-3 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <AlertOctagon className="w-6 h-6 text-red-500 text-glow-red shrink-0" />
            <div>
              <span className="text-xs uppercase font-sans tracking-widest text-[#ef4444] font-bold">CRITICAL MACHINERY FAULT ALERT</span>
              <p className="text-xs text-red-200">
                {engineAlarms.filter(a => !a.acknowledged)[0].title}: {engineAlarms.filter(a => !a.acknowledged)[0].description}
              </p>
            </div>
          </div>
          <button
            onClick={() => onAcknowledgeAlarm(engineAlarms.filter(a => !a.acknowledged)[0].id)}
            className="bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold px-3.5 py-1.5 rounded transition-all shadow-[0_0_10px_rgba(239,68,68,0.5)] border border-red-400"
            id="btn-ack-engine-fault"
          >
            ACKNOWLEDGE ALARM
          </button>
        </div>
      )}

      {/* Interactive Marine Gauges HUD */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* RPM Dial Panel */}
        <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-around min-h-[170px]">
          <div className="text-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">MAIN SHAFT ROTATION</span>
            <span className="font-display text-sm font-bold text-cyan-400 uppercase">Propulsion RPM</span>
          </div>

          {/* Semicircular RPM Gauge */}
          <div className="relative w-28 h-14 flex items-end justify-center mb-1 overflow-hidden">
            <div className="absolute inset-0 border-t-8 border-x-8 border-marine-800 rounded-t-full"></div>
            {/* Dynamic circular fill */}
            <div 
              style={{ transform: `rotate(${(rpm / 900) * 180}deg)` }}
              className="absolute inset-0 border-t-8 border-x-8 border-cyan-400/80 rounded-t-full origin-bottom transition-transform duration-700 ease-out"
            ></div>
            <div className="absolute font-mono text-xl font-bold text-white text-glow-cyan z-10 bottom-0" id="gauge-rpm">
              {rpm}
            </div>
          </div>

          <div className="text-[10px] font-mono text-slate-500">
            MAX CONT RATE: 900 RPM
          </div>
        </div>

        {/* Core Temperature Meter */}
        <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-around min-h-[170px]">
          <div className="text-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">CYLINDER HEAD TEMPERATURE</span>
            <span className="font-display text-sm font-semibold text-orange-400 uppercase">Cylinder Temp</span>
          </div>

          <div className="w-full flex items-center justify-center gap-3">
            <Thermometer className="w-6 h-6 text-orange-400" />
            <div className="flex-1 max-w-[120px]">
              <div className="w-full bg-marine-950 border border-marine-800 h-4 rounded-full overflow-hidden p-0.5">
                <div 
                  style={{ width: `${Math.min(100, (temp / 115) * 100)}%` }}
                  className={`h-full rounded-full transition-all duration-1000 ${
                    temp > 95 ? 'bg-red-500 text-glow-red animate-pulse' : temp > 80 ? 'bg-orange-500 text-glow-orange' : 'bg-emerald-500 text-glow-green'
                  }`}
                ></div>
              </div>
              <div className="flex justify-between text-[8px] font-mono text-slate-500 mt-1">
                <span>30°C</span>
                <span>Normal: 85°C</span>
                <span>115°C</span>
              </div>
            </div>
            <span className="text-sm font-mono font-bold text-white tracking-wide" id="gauge-temp">
              {temp}°C
            </span>
          </div>

          <div className="text-[10px] font-mono text-slate-500">
            HI-TEMP FAULT LIMIT: 95°C
          </div>
        </div>

        {/* Generator Load Meter */}
        <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-around min-h-[170px]">
          <div className="text-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">MAIN GENERATOR BUSBAR</span>
            <span className="font-display text-sm font-semibold text-indigo-400 uppercase">Power Board load</span>
          </div>

          <div className="w-full flex items-center justify-center gap-3">
            <Zap className="w-5 h-5 text-indigo-400" />
            <div className="flex-1 max-w-[120px]">
              <div className="w-full bg-marine-950 border border-marine-800 h-4 rounded-full overflow-hidden p-0.5">
                <div 
                  style={{ width: `${genLoad}%` }}
                  className={`h-full rounded-full transition-all duration-500 ${
                    genLoad > 90 ? 'bg-red-500 animate-pulse' : genLoad > 75 ? 'bg-orange-400' : 'bg-indigo-500'
                  }`}
                ></div>
              </div>
              <div className="flex justify-between text-[8px] font-mono text-slate-500 mt-1">
                <span>0%</span>
                <span>Max: 100%</span>
              </div>
            </div>
            <span className="text-sm font-mono font-bold text-white shrink-0" id="gauge-power-load">
              {genLoad}%
            </span>
          </div>

          <div className="text-[10px] font-mono text-slate-500">
            GRID FREQUENCY: 60.0 Hz
          </div>
        </div>

        {/* Fuel Capacity depletion metrics */}
        <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-around min-h-[170px]">
          <div className="text-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">CURRENT BUNKERS / MFO</span>
            <span className="font-display text-sm font-semibold text-emerald-400 uppercase">Fuel reserves</span>
          </div>

          <div className="text-center">
            <span className="text-xl font-mono font-semibold text-glow-green text-white" id="gauge-fuel-total">
              {fuelCapacity.toFixed(1)} MT
            </span>
            <div className="text-[10px] font-mono text-emerald-300 mt-1" id="gauge-fuel-flow">
              ★ FLOW: {fuelFlowRate.toFixed(1)} MT/HR
            </div>
          </div>

          <div className="text-[10px] font-mono text-slate-500">
            DENSITY: 0.941 KG/L (15°C)
          </div>
        </div>

      </div>

      {/* Machinery Dashboard Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Machinery Control Center buttons */}
        <div className="glass-panel p-4 rounded-xl flex flex-col justify-between">
          <div>
            <h4 className="font-display text-sm font-semibold text-cyan-400 flex items-center gap-1.5 uppercase mb-3">
              <Gauge className="w-4 h-4 text-cyan-500" />
              Main Engine Control Chest
            </h4>

            <div className="space-y-2.5">
              <button
                id="btn-engine-start"
                onClick={handleStartEngine}
                disabled={engineState === 'running'}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-semibold uppercase border transition-all ${
                  engineState === 'running'
                    ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 border-emerald-500 text-slate-950 hover:bg-emerald-500 font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                }`}
              >
                <Play className="w-4 h-4 fill-current" /> Ignite propulsion (Start Engine)
              </button>

              <button
                id="btn-engine-stop"
                onClick={handleStopEngine}
                disabled={engineState === 'off'}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-semibold uppercase border transition-all ${
                  engineState === 'off'
                    ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-amber-600 border-amber-500 text-slate-950 hover:bg-amber-500 font-bold'
                }`}
              >
                <Square className="w-4 h-4 fill-current" /> Stand down propulsion (Stop Engine)
              </button>

              <button
                id="btn-engine-emergency"
                onClick={handleEmergencyShutdown}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg text-xs font-bold uppercase bg-red-600 hover:bg-red-500 text-white border border-red-500 shadow-[0_0_16px_rgba(239,68,68,0.3)] animate-pulse"
              >
                <AlertOctagon className="w-4 h-4 fill-current" /> EMERGENCY SHUTDOWN (TRIP VALVE)
              </button>
            </div>
          </div>

          <div className="text-[10px] font-mono text-slate-500 border-t border-marine-800 pt-3 mt-4">
            * Warning: Emergency shutdowns bypass cooling cooling pump sequence. Requires manual lubrication cycle later.
          </div>
        </div>

        {/* Interactive Maintenance Tasks checklist for Classroom Play */}
        <div className="glass-panel p-4 rounded-xl flex flex-col justify-between" id="checklist-panel">
          <div>
            <h4 className="font-display text-sm font-semibold text-cyan-400 flex items-center gap-1.5 uppercase mb-2">
              <Wrench className="w-4 h-4 text-cyan-500" />
              Propulsion Maintenance Plan
            </h4>
            <p className="text-[11px] text-slate-400 mb-2.5 leading-normal">
              Students: Complete these checks during alerts to clear faults or verify readiness.
            </p>

            <div className="space-y-2">
              {checklist.map(item => (
                <button
                  key={item.id}
                  id={`checklist-item-${item.id}`}
                  onClick={() => handleToggleChecklist(item.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded border text-[11px] font-mono text-left transition-colors ${
                    item.checked
                      ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300'
                      : 'bg-slate-900/60 border-marine-850 text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  <CheckSquare className={`w-3.5 h-3.5 ${item.checked ? 'text-emerald-400 fill-emerald-950/50' : 'text-slate-500'}`} />
                  <span className={item.checked ? 'line-through decoration-emerald-500/50' : ''}>
                    {item.text}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3.5 pt-2 border-t border-marine-800/80 flex justify-between items-center">
            <span className="text-[10px] font-mono text-slate-500">
              Completed {checklist.filter(c => c.checked).length}/5 checks
            </span>
            <button
              onClick={() => onUpdateEngineChecklist(checklist.map(c => ({...c, checked: false})))}
              className="text-[9px] text-cyan-400 hover:text-white"
              id="btn-reset-checks"
            >
              Reset Guide
            </button>
          </div>
        </div>

        {/* Engine room communication & reports drawer */}
        <div className="glass-panel p-4 rounded-xl flex flex-col justify-between">
          <div>
            <h4 className="font-display text-sm font-semibold text-cyan-400 flex items-center gap-1.5 uppercase mb-3 text-glow-cyan">
              <MessageSquare className="w-4 h-4 text-cyan-500 animate-pulse" />
              Technical Intercom & VHF frequency
            </h4>

            <div className="space-y-4">
              {/* Radio Log Stream with Alignment check card underneath */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] uppercase font-mono text-slate-400 mb-1 block">
                      Propulsion Frequency Log
                    </span>
                    <div className="bg-slate-950/90 rounded border border-marine-800 p-2 h-24 overflow-y-auto space-y-1.5 font-mono text-[10px]">
                      {engineMessages.length > 0 ? (
                        engineMessages.map(m => {
                          const isOutgoing = m.sender === 'engine';
                          return (
                            <div key={m.id} className="border-b border-marine-900/50 pb-1">
                              <span className={isOutgoing ? 'text-cyan-400 font-bold' : 'text-amber-400 font-bold'}>
                                {isOutgoing ? 'OUTGOING ➤' : 'INCOMING ◀'} {m.sender.toUpperCase()}:
                              </span>{' '}
                              <span className="text-slate-200 whitespace-pre-line">{m.content}</span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-slate-600 text-center py-5 italic">No machinery transmissions</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Interactive Alignment Sync Box */}
                <div className="bg-slate-950 p-2.5 rounded border border-marine-850 text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-400 font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                      <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                      Intercom Sync Challenge
                    </span>
                    <span className="text-[8px] bg-marine-900 px-1 text-slate-400 rounded">
                      VERIFY LOGS
                    </span>
                  </div>

                  {latestIncoming ? (
                    <div className="mt-1 space-y-1.5">
                      <p className="text-[9.5px] text-slate-400 leading-tight">
                        Teammate on <strong className="text-amber-400 uppercase">{latestIncoming.sender} STATION</strong> broadcasted. Verify logs: "In what word does the channel sync?"
                      </p>
                      
                      <form onSubmit={checkSyncChallenge} className="flex gap-1">
                        <input
                          type="text"
                          placeholder="Type any word from the last message..."
                          value={syncKeyword}
                          onChange={e => {
                            setSyncKeyword(e.target.value);
                            setSyncStatus('empty');
                          }}
                          className="flex-1 bg-slate-900 border border-marine-700/60 rounded px-1.5 py-0.5 text-[9.5px] font-mono text-white focus:outline-none focus:border-cyan-500"
                        />
                        <button
                          type="submit"
                          className="bg-cyan-950 hover:bg-cyan-900 text-cyan-300 font-mono text-[9px] px-2 py-0.5 rounded border border-cyan-800/50 transition-colors cursor-pointer"
                        >
                          Verify
                        </button>
                      </form>

                      {syncStatus === 'valid' && (
                        <div className="text-[9px] text-emerald-400 font-mono flex items-center gap-1 bg-emerald-950/20 px-1 rounded border border-emerald-900/40 animate-fade-in">
                          <Check className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                          <span>✦ Sync confirmed! Stations aligned.</span>
                        </div>
                      )}
                      {syncStatus === 'invalid' && (
                        <div className="text-[9px] text-rose-400 font-mono flex items-center gap-1 bg-rose-950/20 px-1 rounded border border-rose-900/40 animate-fade-in">
                          <AlertTriangle className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                          <span>✕ Word mismatch. Check the log screen!</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 text-[9px] text-slate-500 italic leading-tight">
                      Waiting for incoming telemetry. Ask your Bridge or Admin desk to broadcast.
                    </div>
                  )}
                </div>
              </div>

              {/* Mode Selector Tab & Engine Telephony Prompt */}
              <div className="border-t border-marine-800/80 pt-2">
                <div className="flex gap-1.5 mb-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('speak')}
                    className={`text-[9.5px] font-mono uppercase px-2 py-0.5 rounded tracking-wider cursor-pointer ${
                      activeTab === 'speak'
                        ? 'bg-cyan-900/50 text-white border border-cyan-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🗣 Engineer Radio Script
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('code')}
                    className={`text-[9.5px] font-mono uppercase px-2 py-0.5 rounded tracking-wider cursor-pointer ${
                      activeTab === 'code'
                        ? 'bg-cyan-900/50 text-white border border-cyan-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ⌨ Manual Technical Output
                  </button>
                </div>

                {activeTab === 'speak' ? (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <span className="text-[9px] font-mono uppercase text-slate-400 block mb-0.5">Roleplay prompt context:</span>
                        <select
                          value={scriptScenario}
                          onChange={e => setScriptScenario(e.target.value as any)}
                          className="w-full bg-slate-900 border border-marine-700/60 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none"
                        >
                          <option value="routine">Routine propulsion status report</option>
                          <option value="heavy_load">Sustained full-bore sea passage</option>
                          <option value="overheat">PAN-PAN thermal machinery alert</option>
                          <option value="maintenance">Maintenance and starting readiness</option>
                        </select>
                      </div>

                      <div>
                        <span className="text-[9px] font-mono uppercase text-slate-400 block mb-0.5">VHF transceiver destination:</span>
                        <select
                          value={commsTarget}
                          onChange={e => setCommsTarget(e.target.value as any)}
                          className="w-full bg-slate-900 border border-marine-700/60 text-xs rounded px-2 py-1 text-slate-300 focus:outline-none"
                        >
                          <option value="bridge">To: Bridge Watch</option>
                          <option value="admin">To: Office Admin</option>
                          <option value="all">To: All Stations</option>
                        </select>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-2 text-[10px] font-mono border border-marine-850 rounded text-slate-350 leading-relaxed max-h-20 overflow-y-auto">
                      <strong className="text-cyan-400 block mb-0.5">READ SCRIPT TO YOUR TEAM:</strong>
                      "{getGeneratedScript()}"
                    </div>

                    <button
                      type="button"
                      onClick={handleBroadcastScript}
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold font-sans text-xs rounded py-1.5 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Send className="w-3 h-3" /> Transmit Generated Script over Freq
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Compose report */}
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-1.5">
                        <select
                          value={commsTarget}
                          onChange={e => setCommsTarget(e.target.value as any)}
                          className="bg-slate-900 border border-marine-700/60 text-xs rounded px-1.5 py-1 text-slate-400 focus:outline-none"
                        >
                          <option value="bridge">To: Bridge</option>
                          <option value="admin">To: Office</option>
                          <option value="all">To: All Stations</option>
                        </select>

                        <button
                          onClick={handleSendReport}
                          type="button"
                          className="flex-1 bg-indigo-900/60 hover:bg-indigo-800 text-[10px] font-mono text-indigo-300 border border-indigo-700/50 rounded py-1 transition-colors cursor-pointer"
                          id="btn-engine-report"
                        >
                          📝 Dispatch Tech Report
                        </button>
                      </div>

                      <form onSubmit={handleSendCommsMsg} className="flex gap-1.5 pt-1">
                        <input
                          type="text"
                          placeholder="Type technical transmission..."
                          value={commsText}
                          onChange={e => setCommsText(e.target.value)}
                          className="flex-1 bg-slate-900/80 border border-marine-700/60 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                          id="input-engine-comms"
                        />
                        <button
                          type="submit"
                          className="bg-cyan-600 hover:bg-cyan-500 p-1.5 rounded text-slate-950 font-bold flex items-center justify-center shrink-0 cursor-pointer"
                          id="btn-engine-send-comms"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="text-[9px] font-mono text-slate-500 mt-2">
            AUX AUX: SECURE | REEFER BUS #4 ACTIVE LOAD (28.4 AMPS)
          </div>
        </div>

      </div>
    </div>
  );
}
