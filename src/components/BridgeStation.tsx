import React, { useState, useEffect } from 'react';
import { Waypoint, InterSystemMessage, SimulationEvent } from '../types';
import RadarScreen from './RadarScreen';
import MapChart from './MapChart';
import { 
  Compass, 
  Wind, 
  Eye, 
  Waves, 
  Send, 
  Navigation, 
  MessageSquare, 
  AlertTriangle,
  History,
  Check,
  Radio
} from 'lucide-react';

interface BridgeStationProps {
  waypoints: Waypoint[];
  currentWaypointIndex: number;
  voyageStarted: boolean;
  onToggleVoyage: () => void;
  onAddWaypoint: (name: string, lat: number, lng: number) => void;
  onRemoveWaypoint: (id: string) => void;
  onUpdateWaypoint?: (id: string, lat: number, lng: number) => void;
  vesselPercentAlongLeg: number;
  messages: InterSystemMessage[];
  onSendMessage: (sender: 'bridge', receiver: 'engine' | 'admin' | 'all', content: string) => void;
  activeAlarms: SimulationEvent[];
  onTriggerEvent: (event: Partial<SimulationEvent>) => void;
  shipSpeed: number;
  trainingMode?: boolean;
  weather: { windSpeed: number; seaCondition: string; visibility: number };
}

export default function BridgeStation({
  waypoints,
  currentWaypointIndex,
  voyageStarted,
  onToggleVoyage,
  onAddWaypoint,
  onRemoveWaypoint,
  onUpdateWaypoint,
  vesselPercentAlongLeg,
  messages,
  onSendMessage,
  activeAlarms,
  onTriggerEvent,
  shipSpeed,
  trainingMode = false,
  weather,
}: BridgeStationProps) {
  const [commsTarget, setCommsTarget] = useState<'engine' | 'admin' | 'all'>('engine');
  const [commsText, setCommsText] = useState('');
  
  // Compute live vessel coordinates based on leg percentage
  const getLiveGPS = () => {
    if (waypoints.length === 0) return { lat: 36.85, lng: -76.30 };
    const currentWp = waypoints[Math.min(currentWaypointIndex, waypoints.length - 1)];
    
    if (!voyageStarted || currentWaypointIndex >= waypoints.length - 1) {
      return { lat: currentWp.lat, lng: currentWp.lng };
    }

    const nextWp = waypoints[currentWaypointIndex + 1];
    const fraction = vesselPercentAlongLeg / 100;

    // Drifting coordinates slight offset noise for realism
    const noiseLat = (Math.random() - 0.5) * 0.002;
    const noiseLng = (Math.random() - 0.5) * 0.002;

    const lat = currentWp.lat + (nextWp.lat - currentWp.lat) * fraction + noiseLat;
    const lng = currentWp.lng + (nextWp.lng - currentWp.lng) * fraction + noiseLng;

    return { lat, lng };
  };

  const gps = getLiveGPS();
  const nextWaypoint = waypoints[Math.min(currentWaypointIndex + 1, waypoints.length - 1)];

  const handleSendComms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commsText.trim()) return;
    onSendMessage('bridge', commsTarget, commsText);
    setCommsText('');
  };

  const handleQuickComms = (template: string) => {
    onSendMessage('bridge', commsTarget, template);
  };

  // Filter messages relevant to Bridge (either sent by bridge or received by bridge)
  const bridgeMessages = messages.filter(
    m => m.sender === 'bridge' || m.receiver === 'bridge' || m.receiver === 'all'
  );

  // Script scenario and sync chal state
  const [activeTab, setActiveTab] = useState<'speak' | 'code'>('speak');
  const [scriptScenario, setScriptScenario] = useState<'routine' | 'reduced_vis' | 'engine_rpm' | 'port_arrival'>('routine');
  const [syncKeyword, setSyncKeyword] = useState('');
  const [syncStatus, setSyncStatus] = useState<'empty' | 'valid' | 'invalid'>('empty');

  // Compute live SMCP roleplay script
  const getGeneratedScript = () => {
    const roundedSpeed = shipSpeed.toFixed(1);
    const latStr = gps.lat.toFixed(4);
    const lngStr = Math.abs(gps.lng).toFixed(4);
    const nextName = nextWaypoint ? nextWaypoint.name : 'HAMILTON PORT';
    
    switch (scriptScenario) {
      case 'routine':
        return `SECURE BRIDGE WATCH • NORFOLK SATELLITE HUB / BERMUDA RECEPTION • THIS IS M/V ATLANTIC STAR. REPORTING VOYAGE PROGRESS ON LEG #${currentWaypointIndex + 1}. COMMITTED TO OCEAN ROUTE. PRESENT TELEMETRY SPEED BY GPS IS ${roundedSpeed} KNOTS. COORDINATES: LAT ${latStr}°N / LNG ${lngStr}°W. AUTOPILOT ENGAGED. HEADING STEADY. STANDING BY ON VHF CH 16. OVER.`;
      case 'reduced_vis':
        return `SECURITE • SECURITE • SECURITE • ALL STATIONS. THIS IS CONTAINER VESSEL M/V ATLANTIC STAR. WATCHSTANDERS ENCOUNTERING REDUCED METEOROLOGICAL VISIBILITY INDEX AT LAT ${latStr}°N / LNG ${lngStr}°W. LOOKOUT WATCH CONSOLE DEPLOYED AND AIR SIGNALS ACTIVE. MEASURED WIND SPEED IS ${weather.windSpeed} KNOTS WITH ${weather.seaCondition.toUpperCase()}. OUT.`;
      case 'engine_rpm':
        return `BRIDGE TO ENGINE COMPARTMENT • CHIEF ENGINEER, THIS IS THE OFFICER ON WATCH. REQUESTING SPEED VERIFICATION. TO COMPLY WITH OPTIMAL ETA AND WIND LOAD CONSTRAINTS, RECOMMEND ADJUSTING POWER SYNCS TO ${voyageStarted ? 680 : 380} RPM. ECHO SOUNDER MEASURING RECONCILED DEPTH OF ${shipSpeed > 0 ? (24.8 + Math.random()).toFixed(1) : '15.4'} METERS. PLEASE SUBMIT PROPULSION STATUS LOG. OVER.`;
      case 'port_arrival':
        return `SECURITE • BERMUDA PORT RADIO • THIS IS AUTOMATED BULK CARRIER M/V ATLANTIC STAR [Callsign: STAR-ST-95]. STANDING AT LAT ${latStr}°N / LNG ${lngStr}°W, APPROACHING PORT POINT [${nextName}]. REQUESTING CARGO DESK DECLARATION CONFIRMATION AND QUARANTINE SURVEY ARRANGEMENTS. MARITIME CADETS STANDING BY. OUT.`;
      default:
        return '';
    }
  };

  const handleBroadcastScript = () => {
    const script = getGeneratedScript();
    onSendMessage('bridge', commsTarget, script);
  };

  const latestIncoming = messages
    .filter(m => m.sender !== 'bridge')
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
    // Reset sync status when a new message arrives
    setSyncStatus('empty');
    setSyncKeyword('');
  }, [latestIncoming?.id]);

  return (
    <div className="space-y-5 animate-fade-in" id="bridge-station-container">
      {trainingMode && (
        <div className="bg-amber-500/10 border border-amber-500/45 p-4 rounded-xl flex items-start gap-3 text-xs text-amber-200 animate-slide-in" id="training-bridge-alert">
          <span className="text-base">🎓</span>
          <div>
            <strong className="uppercase font-display tracking-wider block mb-1 text-amber-400">Bridge Watchkeeping & ECDIS Cadet Guide</strong>
            You are now in the Bridge Operations control hub. In this system you configure the electronic chart waypoints, read depth logs, monitor radar sweeps, and maintain VHF communication with the engine. Acknowledge engine alarms immediately or report course alterations to secure vessel safety parameters.
          </div>
        </div>
      )}

      {/* Ship Digital Telemetry Header Gauges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="glass-panel p-3 rounded-lg border-l-4 border-l-cyan-400">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">VESSEL SPEED</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-display font-bold text-cyan-300 text-glow-cyan" id="metric-speed">
              {shipSpeed.toFixed(1)}
            </span>
            <span className="text-xs text-slate-400 font-mono">KTS</span>
          </div>
          <span className="text-[9px] text-emerald-400 font-mono mt-0.5 block">
            {voyageStarted ? '▲ COMMANDED' : '▰ PROP STANDBY'}
          </span>
        </div>

        <div className="glass-panel p-3 rounded-lg border-l-4 border-l-emerald-500">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">GYRO HEADING</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-display font-bold text-emerald-400 text-glow-green" id="metric-heading">
              {voyageStarted ? '124.5' : '000.0'}
            </span>
            <span className="text-xs text-slate-400 font-mono">° / TRUE</span>
          </div>
          <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">STEERING PORT LOG</span>
        </div>

        <div className="glass-panel p-3 rounded-lg border-l-4 border-l-amber-500">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">GPS POSITION</span>
          <div className="mt-1 font-mono text-slate-200">
            <div className="text-sm font-semibold tracking-wider text-glow-orange" id="metric-gps-lat">
              {gps.lat.toFixed(5)}° N
            </div>
            <div className="text-sm font-semibold tracking-wider text-glow-orange" id="metric-gps-lng">
              {Math.abs(gps.lng).toFixed(4)}° W
            </div>
          </div>
        </div>

        <div className="glass-panel p-3 rounded-lg border-l-4 border-l-indigo-500">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">NEXT STATION</span>
          <div className="truncate text-xs font-semibold text-indigo-300 mt-1" id="metric-next-waypoint">
            {nextWaypoint ? nextWaypoint.name : 'HARBOR FINAL'}
          </div>
          <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">
            {nextWaypoint ? `${nextWaypoint.lat.toFixed(2)}N / ${Math.abs(nextWaypoint.lng).toFixed(2)}W` : 'TERMINAL DOCK'}
          </span>
        </div>

        <div className="glass-panel p-3 rounded-lg border-l-4 border-l-purple-500">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">ECHO SOUNDER</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-display font-semibold text-purple-300" id="metric-echo-depth">
              {shipSpeed > 0 ? (24.8 + Math.random() * 2).toFixed(1) : '15.4'}
            </span>
            <span className="text-xs text-slate-400 font-mono">DBT (M)</span>
          </div>
          <span className="text-[9px] text-emerald-400 font-mono mt-0.5 block">UNDER-KEEL SAFE</span>
        </div>

        <div className="glass-panel p-3 rounded-lg border-l-4 border-l-rose-500">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">COMMUNICATION STATUS</span>
          <div className="text-xs font-semibold text-rose-300 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
            TRANSCEIVER ON
          </div>
          <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">CHANNEL 16 GUARDED</span>
        </div>
      </div>

      {/* Main Bridge Layout: ECDIS Left, Radar & Comms Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* ECDIS Map takes 2 columns spacing */}
        <div className="lg:col-span-2">
          <MapChart
            waypoints={waypoints}
            currentWaypointIndex={currentWaypointIndex}
            voyageStarted={voyageStarted}
            onToggleVoyage={onToggleVoyage}
            onAddWaypoint={onAddWaypoint}
            onRemoveWaypoint={onRemoveWaypoint}
            onUpdateWaypoint={onUpdateWaypoint}
            vesselPercentAlongLeg={vesselPercentAlongLeg}
          />
        </div>

        {/* Tactical Radar Screen (1 Column) */}
        <div className="lg:col-span-1">
          <RadarScreen />
        </div>
      </div>

      {/* Secondary Row: Weather Station Left, Intercom Terminal Right */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* MET / Weather Sensor Console */}
        <div className="glass-panel p-4 rounded-xl flex flex-col justify-between">
          <div>
            <h4 className="font-display text-sm font-semibold text-cyan-400 flex items-center gap-1.5 uppercase mb-3">
              <Compass className="w-4 h-4 text-cyan-500" />
              Meteorological Panel
            </h4>

            <div className="space-y-3.5">
              <div className="flex items-center justify-between p-2.5 rounded bg-slate-900/60 border border-marine-800/80">
                <div className="flex items-center gap-2">
                  <Wind className="w-4 h-4 text-sky-400" />
                  <span className="text-xs text-slate-300 font-sans">Anemometer Wind</span>
                </div>
                <span className="text-sm font-mono font-bold text-white shadow-[0_0_8px_rgba(56,189,248,0.2)]">
                  {weather.windSpeed} KTS
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-slate-900/60 border border-marine-800/80">
                <div className="flex items-center gap-2">
                  <Waves className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-slate-300 font-sans">Sea Condition</span>
                </div>
                <span className="text-sm font-sans font-semibold text-white">
                  {weather.seaCondition}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-slate-900/60 border border-marine-800/80">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-300 font-sans">Visual Visibility</span>
                </div>
                <span className="text-sm font-mono font-bold text-emerald-300">
                  {weather.visibility} NM
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-marine-800/80 pt-3 flex justify-between items-center text-[10px] text-slate-500 font-mono">
            <span>BARO: 1012.4 hPa (STABLE)</span>
            <span>TEMP: 19.5 °C</span>
          </div>
        </div>

        {/* Bridge Comms Console */}
        <div className="glass-panel p-4 rounded-xl md:col-span-2 flex flex-col justify-between">
          <div>
            <h4 className="font-display text-sm font-semibold text-cyan-400 flex items-center gap-1.5 uppercase mb-3 text-glow-cyan">
              <MessageSquare className="w-4 h-4 text-cyan-500 animate-pulse" />
              Bridge watch transceiver & VHF center
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Radio Log Stream with Alignment challenge card underneath */}
              <div className="flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 mb-1 flex items-center gap-1">
                    <History className="w-3 h-3 text-cyan-500" /> Transceiver Buffer [Channel 16 Active]
                  </span>
                  <div className="bg-slate-950/90 rounded border border-marine-800 p-2.5 h-36 overflow-y-auto space-y-2 font-mono text-[11px] leading-relaxed">
                    {bridgeMessages.length > 0 ? (
                      bridgeMessages.map(m => {
                        const isOutgoing = m.sender === 'bridge';
                        return (
                          <div key={m.id} className="border-b border-marine-900/50 pb-1.5">
                            <div className="flex justify-between text-[10px]">
                              <span className={isOutgoing ? 'text-cyan-400 font-bold' : 'text-amber-400 font-bold'}>
                                {isOutgoing ? 'OUTGOING ➤' : 'INCOMING ◀'} {m.sender.toUpperCase()}
                              </span>
                              <span className="text-slate-500">{m.timestamp}</span>
                            </div>
                            <p className="text-slate-200 mt-0.5 whitespace-pre-line">{m.content}</p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-slate-600 text-center py-8 italic">No active radio traffic</div>
                    )}
                  </div>
                </div>

                {/* Live Synchronized Intercom Alignment challenge */}
                <div className="mt-3 p-2.5 bg-slate-950 border border-marine-850 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                      VHF Channel Sync Challenge
                    </span>
                    <span className="text-[8.5px] font-mono bg-marine-900 px-1 text-slate-400 rounded">
                      CLASSROOM TEAM PLAY
                    </span>
                  </div>

                  {latestIncoming ? (
                    <div className="mt-2 space-y-2">
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Your desk partner posted to the active frequency from <strong className="text-amber-400 uppercase">{latestIncoming.sender} STATION</strong>: "What word is heard in your channel log?"
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
                          className="flex-1 bg-slate-900 border border-marine-700/60 rounded px-2 py-1 text-[10.5px] font-mono text-white focus:outline-none focus:border-cyan-500"
                        />
                        <button
                          type="submit"
                          className="bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 font-mono text-[10.5px] px-2.5 py-1 rounded border border-cyan-800/50 hover:text-white cursor-pointer transition-colors"
                        >
                          Verify Match
                        </button>
                      </form>

                      {syncStatus === 'valid' && (
                        <div className="text-[10.5px] text-emerald-400 font-mono flex items-center gap-1.5 bg-emerald-950/20 px-2 py-1 rounded border border-emerald-900/40 animate-fade-in">
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>✦ System synchronized! Channels aligned with teammate.</span>
                        </div>
                      )}
                      {syncStatus === 'invalid' && (
                        <div className="text-[10.5px] text-rose-400 font-mono flex items-center gap-1.5 bg-rose-950/20 px-2 py-1 rounded border border-rose-900/40 animate-fade-in">
                          <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                          <span>✕ Word not found in stream. Read the log!</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 text-[10px] text-slate-500 italic leading-normal">
                      Waiting for incoming telemetry logs from other terminals. Tell your Engine or Admin teammate to transmit!
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Telephony Script Generator & Manual Composers Panel */}
              <div className="flex flex-col justify-between space-y-2">
                {/* Mode Selector Tabs */}
                <div className="flex gap-1.5 border-b border-marine-800 pb-1.5">
                  <button
                    onClick={() => setActiveTab('speak')}
                    className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded tracking-wider transition-colors cursor-pointer ${
                      activeTab === 'speak'
                        ? 'bg-cyan-900/50 text-white border border-cyan-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🗣 VHF Script Generator
                  </button>
                  <button
                    onClick={() => setActiveTab('code')}
                    className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded tracking-wider transition-colors cursor-pointer ${
                      activeTab === 'code'
                        ? 'bg-cyan-900/50 text-white border border-cyan-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ⌨ Manual Broadcast
                  </button>
                </div>

                {activeTab === 'speak' ? (
                  <div className="space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[9.5px] font-mono uppercase text-slate-400 block mb-1">
                        Select watchkeeping roleplay context:
                      </span>
                      <select
                        value={scriptScenario}
                        onChange={e => setScriptScenario(e.target.value as any)}
                        className="w-full bg-slate-900 border border-marine-700/60 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                      >
                        <option value="routine">Routine Watch progress report (SMCP)</option>
                        <option value="reduced_vis">Heavy precipitation / Reduced visibility lookout</option>
                        <option value="engine_rpm">Inter-system request (Engine RPM sync)</option>
                        <option value="port_arrival">Pre-arrival Port Control calling (Hamilton)</option>
                      </select>
                    </div>

                    <div className="bg-slate-950 p-2 text-[10px] font-mono border border-marine-850 rounded text-slate-300 leading-normal max-h-24 overflow-y-auto">
                      <strong className="text-cyan-400 block mb-0.5">READ SCRIP THEATRICS:</strong>
                      "{getGeneratedScript()}"
                    </div>

                    <div className="flex gap-1.5 pt-1">
                      <select
                        value={commsTarget}
                        onChange={e => setCommsTarget(e.target.value as any)}
                        className="bg-slate-900 border border-marine-700/60 text-[10.5px] rounded px-2 py-1 text-slate-300 focus:outline-none font-mono"
                      >
                        <option value="engine">To: Engine</option>
                        <option value="admin">To: Office</option>
                        <option value="all">To: All Stations</option>
                      </select>
                      <button
                        onClick={handleBroadcastScript}
                        className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold font-sans text-xs rounded py-1.5 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" /> Broadcast to Channel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 flex-1 flex flex-col justify-between">
                    <form onSubmit={handleSendComms} className="space-y-2">
                      <div className="flex gap-2">
                        <select
                          value={commsTarget}
                          onChange={e => setCommsTarget(e.target.value as any)}
                          className="bg-slate-900 border border-marine-700/60 text-xs rounded px-2 py-1 text-slate-300 focus:outline-none"
                        >
                          <option value="engine">To: Engine Room</option>
                          <option value="admin">To: Admin/Commercial</option>
                          <option value="all">To: All Stations</option>
                        </select>

                        <div className="flex-1 flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Type intercom transmission..."
                            value={commsText}
                            onChange={e => setCommsText(e.target.value)}
                            className="flex-1 bg-slate-900/80 border border-marine-700/60 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                            id="input-bridge-comms"
                          />
                          <button
                            type="submit"
                            className="bg-cyan-600 hover:bg-cyan-500 p-1.5 rounded text-slate-950 font-bold flex items-center justify-center shrink-0 cursor-pointer"
                            id="btn-bridge-send-comms"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </form>

                    {/* Templates Grid */}
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-mono text-slate-400 block">VHF Quick phrases</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => handleQuickComms("Requesting machinery check before voyage start.")}
                          className="text-[10px] text-left text-slate-300 bg-marine-800/40 hover:bg-marine-700/60 border border-marine-700/40 rounded px-2 py-1 truncate cursor-pointer text-glow-hover-cyan"
                        >
                          🗣 Request machinery check
                        </button>
                        <button
                          onClick={() => handleQuickComms("Draft manifest finalized. Sailing underway.")}
                          className="text-[10px] text-left text-slate-300 bg-marine-800/40 hover:bg-marine-700/60 border border-marine-700/40 rounded px-2 py-1 truncate cursor-pointer text-glow-hover-cyan"
                        >
                          🗣 Passage Commenced
                        </button>
                        <button
                          onClick={() => handleQuickComms("Station 1 to Station 2: Speed adjusted to 15.2 knots.")}
                          className="text-[10px] text-left text-slate-300 bg-marine-800/40 hover:bg-marine-700/60 border border-marine-700/40 rounded px-2 py-1 truncate cursor-pointer text-glow-hover-cyan"
                        >
                          🗣 Adjusting speed
                        </button>
                        <button
                          onClick={() => handleQuickComms("Approaching waypoint. Lookout watch doubled.")}
                          className="text-[10px] text-left text-slate-300 bg-marine-800/40 hover:bg-marine-700/60 border border-marine-700/40 rounded px-2 py-1 truncate cursor-pointer text-glow-hover-cyan"
                        >
                          🗣 Lookout watch active
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
