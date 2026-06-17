import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Waypoint, InterSystemMessage, SimulationEvent, CargoItem } from './types';
import BridgeStation from './components/BridgeStation';
import EngineStation from './components/EngineStation';
import AdminStation from './components/AdminStation';
import RemoteControlStation from './components/RemoteControlStation';
import { db } from './lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { 
  Compass, 
  Settings2, 
  FileText, 
  Radio, 
  Anchor, 
  Ship, 
  AlertTriangle,
  Monitor,
  AlertOctagon,
  Volume2,
  VolumeX,
  Clock,
  CheckCircle,
  HelpCircle,
  Sparkles,
  RefreshCw
} from 'lucide-react';

// Predefined route waypoints (Norfolk to Bermuda)
const INITIAL_WAYPOINTS: Waypoint[] = [
  { id: 'wp-1', name: 'NORFOLK PORT', lat: 36.8500, lng: -76.3000, reached: true },
  { id: 'wp-2', name: 'CHESAPEAKE DELTA', lat: 36.3500, lng: -74.9000, reached: false },
  { id: 'wp-3', name: 'SHELF EDGE CORRIDOR', lat: 35.1000, lng: -71.5000, reached: false },
  { id: 'wp-4', name: 'SARGASSO DEEP SEA', lat: 33.6000, lng: -67.8000, reached: false },
  { id: 'wp-5', name: 'BERMUDA REEF EDGE', lat: 32.5500, lng: -65.2000, reached: false },
  { id: 'wp-6', name: 'HAMILTON TERMINAL', lat: 32.3000, lng: -64.7500, reached: false },
];

// Web Audio API Sound Synthesizer for Authentic Marine Shipboard Alarms
function playAlarmSound(type: 'critical' | 'warn' | 'acknowledge' | 'radar_beep') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);

    if (type === 'critical') {
      // Powerful, sweeping marine diesel engine / bridge distress warble
      // Double oscillators pulsing at slightly offset frequencies for a rich, ominous ring
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      
      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      
      osc1.frequency.setValueAtTime(580, ctx.currentTime);
      osc2.frequency.setValueAtTime(583, ctx.currentTime);
      
      // Pitch modulation sweep (Whoop-Whoop)
      osc1.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.3);
      osc2.frequency.linearRampToValueAtTime(885, ctx.currentTime + 0.3);
      osc1.frequency.linearRampToValueAtTime(580, ctx.currentTime + 0.6);
      osc2.frequency.linearRampToValueAtTime(583, ctx.currentTime + 0.6);

      masterGain.gain.setValueAtTime(0.0, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.05);
      masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);

      osc1.connect(masterGain);
      osc2.connect(masterGain);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.6);
      osc2.stop(ctx.currentTime + 0.6);

    } else if (type === 'warn') {
      // Classic steady sonar sonar/sub-horn double-ping
      const osc = ctx.createOscillator();
      const bandpass = ctx.createBiquadFilter();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 600;
      bandpass.Q.value = 1.0;

      masterGain.gain.setValueAtTime(0.0, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.02);
      masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc.connect(bandpass);
      bandpass.connect(masterGain);

      osc.start();
      osc.stop(ctx.currentTime + 0.45);

    } else if (type === 'acknowledge') {
      // Clear, uplifting dual-tone digital chime confirming system restoration
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      
      osc1.type = 'sine';
      osc2.type = 'sine';
      
      // Beautiful major third chord (C5 - E5)
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5

      masterGain.gain.setValueAtTime(0.0, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.02);
      masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

      osc1.connect(masterGain);
      osc2.connect(masterGain);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.6);
      osc2.stop(ctx.currentTime + 0.6);

    } else if (type === 'radar_beep') {
      // High frequency precise tactical screen beep/click
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);

      masterGain.gain.setValueAtTime(0.0, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 0.01);
      masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.connect(masterGain);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    }
  } catch (err) {
    console.debug("Web Audio API warning:", err);
  }
}

export default function App() {
  const [activeStation, setActiveStation] = useState<'overview' | 'bridge' | 'engine' | 'admin' | 'remote'>('overview');
  const [trainingMode, setTrainingMode] = useState(false);
  
  // Firestore sync room state
  const [roomId, setRoomId] = useState('CLASSROOM_A');
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced' | 'offline'>('offline');

  // Simulation control state
  const [voyageStarted, setVoyageStarted] = useState(false);
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState(0);
  const [waypoints, setWaypoints] = useState<Waypoint[]>(INITIAL_WAYPOINTS);
  const [vesselPercentAlongLeg, setVesselPercentAlongLeg] = useState(0);
  const [shipSpeed, setShipSpeed] = useState(0.0);
  const [autoDrillsEnabled, setAutoDrillsEnabled] = useState(false);
  const [audioSiren, setAudioSiren] = useState(true);

  // Synced weather states
  const [weather, setWeather] = useState({
    windSpeed: 14,
    seaCondition: 'Moderate swell',
    visibility: 12,
  });

  // Synced engine states
  const [engine, setEngine] = useState({
    state: 'off' as 'off' | 'running' | 'emergency',
    rpm: 0,
    temp: 32,
    fuelCapacity: 1280.5,
    fuelFlowRate: 0.0,
    genLoad: 25,
    coolingFlow: 0,
  });

  // Synced engine checklist states
  const [engineChecklist, setEngineChecklist] = useState([
    { id: 'chk-coolant', text: 'Verify Auxiliary Seawater Pumps Flow', checked: false },
    { id: 'chk-fuel', text: 'Drain Water from Heavy Fuel Separator', checked: false },
    { id: 'chk-lube', text: 'Verify Main Bearing Lube Oil Level', checked: false },
    { id: 'chk-air', text: 'Check Starting Air Receiver Pressure', checked: false },
    { id: 'chk-gens', text: 'Synchronize Generator #2 on Main Board', checked: false },
  ]);

  // Minimalist collapse states to keep classroom view distraction-free
  const [instructorPanelExpanded, setInstructorPanelExpanded] = useState(false);
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const [showIntercomBuffer, setShowIntercomBuffer] = useState(false);

  // Lists state
  const [messages, setMessages] = useState<InterSystemMessage[]>([
    {
      id: 'init-1',
      timestamp: '00:01:05',
      sender: 'admin',
      receiver: 'all',
      content: 'System Sync: Main vessel server operational. Satellite transceivers online. Ready to commence bridge operations.',
      isRead: true
    }
  ]);
  
  const [activeAlarms, setActiveAlarms] = useState<SimulationEvent[]>([]);

  const [cargoItems, setCargoItems] = useState<CargoItem[]>([
    { id: 'c-1', containerId: 'MSKU-804192-4', type: 'Electronics (Dry)', weight: 18.4, destination: 'HAMILTON HARBOR', status: 'Loaded' },
    { id: 'c-2', containerId: 'CMAU-112049-5', type: 'Refrigerated Food (Reefer)', weight: 24.1, destination: 'HAMILTON HARBOR', status: 'Loaded' },
    { id: 'c-3', containerId: 'NYKU-930411-2', type: 'Chemical Grade A (Hazmat)', weight: 12.8, destination: 'HAMILTON HARBOR', status: 'Loaded' },
  ]);

  // Firestore sync action helper
  const syncToFirestore = useCallback(async (partialState: Record<string, any>) => {
    try {
      const docRef = doc(db, 'sessions', roomId);
      await updateDoc(docRef, partialState);
    } catch (e) {
      try {
        const docRef = doc(db, 'sessions', roomId);
        await setDoc(docRef, partialState, { merge: true });
      } catch (err) {
        console.error("Firestore sync error:", err);
      }
    }
  }, [roomId]);

  // Firestore Snapshot listening session
  useEffect(() => {
    const docRef = doc(db, 'sessions', roomId);
    setSyncStatus('syncing');

    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const d = snapshot.data();
        if (d.voyageStarted !== undefined) setVoyageStarted(d.voyageStarted);
        if (d.currentWaypointIndex !== undefined) setCurrentWaypointIndex(d.currentWaypointIndex);
        if (d.vesselPercentAlongLeg !== undefined) setVesselPercentAlongLeg(d.vesselPercentAlongLeg);
        if (d.shipSpeed !== undefined) setShipSpeed(d.shipSpeed);
        if (d.autoDrillsEnabled !== undefined) setAutoDrillsEnabled(d.autoDrillsEnabled);
        if (d.trainingMode !== undefined) setTrainingMode(d.trainingMode);
        if (d.activeAlarms !== undefined) setActiveAlarms(d.activeAlarms);
        if (d.messages !== undefined) setMessages(d.messages);
        if (d.cargoItems !== undefined) setCargoItems(d.cargoItems);
        if (d.waypoints !== undefined) setWaypoints(d.waypoints);
        if (d.weather !== undefined) setWeather(d.weather);
        if (d.engine !== undefined) setEngine(d.engine);
        if (d.engineChecklist !== undefined) setEngineChecklist(d.engineChecklist);
        setSyncStatus('synced');
      } else {
        const initialSetup = {
          voyageStarted: false,
          currentWaypointIndex: 0,
          waypoints: INITIAL_WAYPOINTS,
          vesselPercentAlongLeg: 0,
          shipSpeed: 0.0,
          autoDrillsEnabled: false,
          trainingMode: false,
          activeAlarms: [],
          messages: [
            {
              id: 'init-1',
              timestamp: '00:01:05',
              sender: 'admin',
              receiver: 'all',
              content: 'System Sync: Main vessel server operational. Satellite transceivers online. Ready to commence bridge operations.',
              isRead: true
            }
          ],
          cargoItems: [
            { id: 'c-1', containerId: 'MSKU-804192-4', type: 'Electronics (Dry)', weight: 18.4, destination: 'HAMILTON HARBOR', status: 'Loaded' },
            { id: 'c-2', containerId: 'CMAU-112049-5', type: 'Refrigerated Food (Reefer)', weight: 24.1, destination: 'HAMILTON HARBOR', status: 'Loaded' },
            { id: 'c-3', containerId: 'NYKU-930411-2', type: 'Chemical Grade A (Hazmat)', weight: 12.8, destination: 'HAMILTON HARBOR', status: 'Loaded' },
          ],
          weather: {
            windSpeed: 14,
            seaCondition: 'Moderate swell',
            visibility: 12,
          },
          engine: {
            state: 'off',
            rpm: 0,
            temp: 32,
            fuelCapacity: 1280.5,
            fuelFlowRate: 0.0,
            genLoad: 25,
            coolingFlow: 0,
          },
          engineChecklist: [
            { id: 'chk-coolant', text: 'Verify Auxiliary Seawater Pumps Flow', checked: false },
            { id: 'chk-fuel', text: 'Drain Water from Heavy Fuel Separator', checked: false },
            { id: 'chk-lube', text: 'Verify Main Bearing Lube Oil Level', checked: false },
            { id: 'chk-air', text: 'Check Starting Air Receiver Pressure', checked: false },
            { id: 'chk-gens', text: 'Synchronize Generator #2 on Main Board', checked: false },
          ]
        };
        setDoc(docRef, initialSetup).then(() => {
          setSyncStatus('synced');
        }).catch(err => {
          console.error("Firebase init doc error:", err);
          setSyncStatus('offline');
        });
      }
    }, (error) => {
      console.error("Firestore listener error:", error);
      setSyncStatus('offline');
    });

    return () => unsubscribe();
  }, [roomId]);

  // Audio warning beeper simulation (virtual sound)
  const [sirenTick, setSirenTick] = useState(false);
  useEffect(() => {
    const unacknowledgedAlarms = activeAlarms.some(a => !a.acknowledged);
    if (unacknowledgedAlarms && audioSiren) {
      const audioTimer = setInterval(() => {
        setSirenTick(prev => {
          const next = !prev;
          if (next) {
            const hasCritical = activeAlarms.some(a => !a.acknowledged && a.level === 'critical');
            playAlarmSound(hasCritical ? 'critical' : 'warn');
          }
          return next;
        });
      }, 800);
      return () => clearInterval(audioTimer);
    } else {
      setSirenTick(false);
    }
  }, [activeAlarms, audioSiren]);

  // Tactical acoustic feedback when switching shipboard stations
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (audioSiren) {
      playAlarmSound('radar_beep');
    }
  }, [activeStation, audioSiren]);

  // Local physics & telemetry simulation tick
  useEffect(() => {
    const timer = setInterval(() => {
      // 1. If voyage is started, increment vessel percent along leg
      let nextPercent = vesselPercentAlongLeg;
      let nextWpIdx = currentWaypointIndex;
      let nextVoyageStarted = voyageStarted;
      let nextSpeed = shipSpeed;
      
      const hasEngineAlarm = activeAlarms.some(a => a.system === 'engine' && a.level === 'critical' && !a.acknowledged);

      if (voyageStarted) {
        // Accelerate or slow down based on alarms
        if (hasEngineAlarm) {
          nextSpeed = Math.max(4.0, parseFloat((shipSpeed - 1.5).toFixed(1)));
        } else {
          const cruiseSpeed = 16.2;
          if (shipSpeed < cruiseSpeed) {
            nextSpeed = Math.min(cruiseSpeed, parseFloat((shipSpeed + 0.8).toFixed(1)));
          } else {
            nextSpeed = cruiseSpeed;
          }
        }
        
        // Progress vessel along leg
        if (nextSpeed > 0) {
          const delta = parseFloat((nextSpeed * 0.18).toFixed(3));
          nextPercent = parseFloat((vesselPercentAlongLeg + delta).toFixed(3));
          if (nextPercent >= 100) {
            nextPercent = 0;
            const nextVal = currentWaypointIndex + 1;
            if (nextVal >= waypoints.length) {
              nextVoyageStarted = false;
              nextSpeed = 0;
            } else {
              nextWpIdx = nextVal;
            }
          }
        }
      } else {
        // Decelerate to stop
        if (shipSpeed > 0) {
          nextSpeed = Math.max(0.0, parseFloat((shipSpeed - 1.2).toFixed(1)));
        }
      }

      // 2. Compute engine heat / fuel consumption / generator load
      const nextEngine = { ...engine };
      if (engine.state === 'running') {
        const targetRpm = voyageStarted ? 720 + Math.round(nextSpeed * 10) : 380;
        
        // RPM adjust towards target
        if (engine.rpm !== targetRpm) {
          const step = engine.rpm < targetRpm ? 45 : -45;
          const val = engine.rpm + step;
          nextEngine.rpm = Math.abs(val - targetRpm) < 45 ? targetRpm : val;
        }

        // Temp target depends on RPM
        const targetTemp = 40 + Math.round((nextEngine.rpm / 800) * 45);
        const sensorSpiked = activeAlarms.some(a => a.system === 'engine' && !a.acknowledged);
        const currentTargetTemp = sensorSpiked ? 114 : targetTemp;

        if (Math.abs(engine.temp - currentTargetTemp) >= 1) {
          nextEngine.temp = parseFloat((engine.temp + (engine.temp < currentTargetTemp ? 1.2 : -0.8)).toFixed(1));
        } else {
          nextEngine.temp = currentTargetTemp;
        }

        // Fuel consumption rate
        nextEngine.fuelFlowRate = parseFloat(((nextEngine.rpm / 800) * 8.2).toFixed(2));
        nextEngine.fuelCapacity = Math.max(0.5, parseFloat((engine.fuelCapacity - (nextEngine.fuelFlowRate / 3600)).toFixed(4)));

        // Cooling pump matches RPM
        const targetFlow = 650 + Math.round((nextEngine.rpm / 800) * 200);
        if (engine.coolingFlow !== targetFlow) {
          nextEngine.coolingFlow = engine.coolingFlow < targetFlow ? Math.min(targetFlow, engine.coolingFlow + 50) : Math.max(targetFlow, engine.coolingFlow - 50);
        }

        // Generator load
        const baseGen = voyageStarted ? 78 : 45;
        const fluc = Math.round((Math.random() - 0.5) * 4);
        nextEngine.genLoad = Math.max(10, Math.min(95, baseGen + fluc));

      } else if (engine.state === 'off') {
        if (engine.rpm > 0) {
          nextEngine.rpm = Math.max(0, Math.round(engine.rpm * 0.7));
        }
        if (engine.temp > 32) {
          nextEngine.temp = parseFloat((engine.temp - 0.4).toFixed(1));
        }
        if (engine.coolingFlow > 0) {
          nextEngine.coolingFlow = Math.max(0, Math.round(engine.coolingFlow * 0.6));
        }
        nextEngine.fuelFlowRate = 0;
        nextEngine.genLoad = Math.max(15, engine.genLoad - 1);
      } else {
        // emergency trim State
        nextEngine.rpm = 0;
        nextEngine.coolingFlow = 0;
        nextEngine.fuelFlowRate = 0;
        nextEngine.genLoad = 10;
        if (engine.temp > 32) {
          nextEngine.temp = parseFloat((engine.temp - 0.8).toFixed(1));
        }
      }

      // 3. Weather drift slightly
      const nextWeather = { ...weather };
      if (Math.random() > 0.8) {
        const deltaWind = Math.round((Math.random() - 0.5) * 2);
        nextWeather.windSpeed = Math.max(2, Math.min(weather.windSpeed + deltaWind, 60));
        let cond = 'Moderate swell';
        if (nextWeather.windSpeed < 8) cond = 'Calm (Smooth)';
        else if (nextWeather.windSpeed < 18) cond = 'Moderate swell';
        else if (nextWeather.windSpeed < 28) cond = 'Rough sea state';
        else if (nextWeather.windSpeed < 38) cond = 'Very rough / Gale';
        else cond = 'Severe Storm';
        nextWeather.seaCondition = cond;
      }

      // Update state local variables
      setVesselPercentAlongLeg(nextPercent);
      setCurrentWaypointIndex(nextWpIdx);
      setVoyageStarted(nextVoyageStarted);
      setShipSpeed(nextSpeed);
      setEngine(nextEngine);
      setWeather(nextWeather);

      // Handle waypoint arrival alerts local messaging
      if (nextWpIdx !== currentWaypointIndex && nextPercent === 0) {
        const arrivalId = 'wp-a-' + Date.now();
        const wpName = waypoints[nextWpIdx]?.name || 'HAMILTON';
        const nowTimeStr = new Date().toLocaleTimeString();
        
        setMessages(prev => {
          const arrMsg = {
            id: arrivalId,
            timestamp: nowTimeStr,
            sender: 'bridge' as const,
            receiver: 'all' as const,
            content: `⚓ Voyage Checkpoint: Passed waypoint [${waypoints[currentWaypointIndex]?.name}]. Steering adjusted to cross leg #${nextWpIdx + 1} towards [${wpName}].`,
            isRead: false
          };
          const updated = [arrMsg, ...prev];
          syncToFirestore({
            messages: updated,
            currentWaypointIndex: nextWpIdx,
            vesselPercentAlongLeg: 0,
            voyageStarted: nextVoyageStarted,
            shipSpeed: nextSpeed,
            engine: nextEngine,
            weather: nextWeather
          });
          return updated;
        });
      }

      // Write continuous telemetry changes to Firestore periodically
      const nowMs = Date.now();
      if (activeStation !== 'overview' && Math.floor(nowMs / 1000) % 3 === 0) {
        syncToFirestore({
          vesselPercentAlongLeg: nextPercent,
          currentWaypointIndex: nextWpIdx,
          voyageStarted: nextVoyageStarted,
          shipSpeed: nextSpeed,
          engine: nextEngine,
          weather: nextWeather
        });
      }

    }, 1000);

    return () => clearInterval(timer);
  }, [vesselPercentAlongLeg, currentWaypointIndex, voyageStarted, shipSpeed, engine, weather, activeStation, activeAlarms, waypoints, syncToFirestore]);

  // Automatic drill/simulation event generator (Runs every 50 seconds if autoDrillsEnabled)
  useEffect(() => {
    if (!autoDrillsEnabled) return;

    const timer = setInterval(() => {
      triggerRandomDrill();
    }, 50000);

    return () => clearInterval(timer);
  }, [autoDrillsEnabled]);

  // Handler to dispatch inter-system transmissions
  const handleSendMessage = useCallback((sender: 'bridge' | 'engine' | 'admin' | 'remote', receiver: 'bridge' | 'engine' | 'admin' | 'all', content: string) => {
    const nowTime = new Date().toLocaleTimeString();
    const newMsg: InterSystemMessage = {
      id: Math.random().toString(),
      timestamp: nowTime,
      sender,
      receiver,
      content,
      isRead: false,
    };

    setMessages(prev => {
      const nextMsgs = [newMsg, ...prev];
      syncToFirestore({ messages: nextMsgs });
      return nextMsgs;
    });
  }, [syncToFirestore]);

  // System drill trigger definitions
  const drillOptions: Omit<SimulationEvent, 'id' | 'timestamp' | 'acknowledged'>[] = [
    {
      title: 'Dense Fog Bank Warning',
      description: 'Regional weather radar warns of a heavy fog corridor with visibility degraded under 1.5 nautical miles.',
      system: 'bridge',
      level: 'warning'
    },
    {
      title: 'High-Speed Crossing Target',
      description: 'ARPA anti-collision system reports a container vessel crossing path from the Starboard side with CPA 0.4NM.',
      system: 'bridge',
      level: 'critical'
    },
    {
      title: 'Primary GPS Signal Loss',
      description: 'Intermittent marine satellite communication interruption. Navigation fallback to local dead reckoning active.',
      system: 'bridge',
      level: 'critical'
    },
    {
      title: 'Auxiliary Generator Fault',
      description: 'Generator #3 reports high winding temperature. Grid load shifting to emergency diesel battery circuit.',
      system: 'engine',
      level: 'warning'
    },
    {
      title: 'Cylinder Jacket Exhaust Leak',
      description: 'Exhaust gas thermometer spiking on Cylinder Head #4. Lubricant lube oil pressure drops below 2.4 bar.',
      system: 'engine',
      level: 'critical'
    },
    {
      title: 'Water-in-Fuel Purge Alarm',
      description: 'Water filtration separator chamber 100% full. Engine fuel supply requires manual separator drainage.',
      system: 'engine',
      level: 'critical'
    },
    {
      title: 'Hazmat Packing Discrepancy',
      description: 'Bermuda customs database flags HazMat class code manifest discrepancy on container NYKU-930411-2.',
      system: 'admin',
      level: 'warning'
    },
    {
      title: 'Quarantine Health Declaration Missing',
      description: 'Port authority requesting physical medical logs verification for 18 crew complement before terminal entry approval.',
      system: 'admin',
      level: 'warning'
    },
    {
      title: 'Carrier Company Route Deviation Info',
      description: 'Satellite email dispatch from Carrier HQ warning of high port harbor congestion in Canada. Preparing optional itinerary.',
      system: 'admin',
      level: 'warning'
    }
  ];

  const triggerDrillSpecific = (index: number) => {
    const base = drillOptions[index];
    const drillId = 'drill-' + Date.now() + '-' + index + '-' + Math.random().toString(36).substring(2, 9);
    const nowTime = new Date().toLocaleTimeString();
    
    const newAlarm: SimulationEvent = {
      ...base,
      id: drillId,
      timestamp: nowTime,
      acknowledged: false
    };

    const nextAlarms = [...activeAlarms, newAlarm];
    setActiveAlarms(nextAlarms);

    const nowTimeStr = new Date().toLocaleTimeString();
    const newMsg: InterSystemMessage = {
      id: 'msg-alert-' + Date.now(),
      timestamp: nowTimeStr,
      sender: 'remote',
      receiver: 'all',
      content: `🚨 EMERGENCY DRILL TRIGGERED: [${base.title}] in ${base.system.toUpperCase()} Station. Description: ${base.description}`,
      isRead: false
    };

    const nextMsgs = [newMsg, ...messages];
    setMessages(nextMsgs);

    syncToFirestore({
      activeAlarms: nextAlarms,
      messages: nextMsgs
    });
  };

  const triggerRandomDrill = () => {
    const randIdx = Math.floor(Math.random() * drillOptions.length);
    triggerDrillSpecific(randIdx);
  };

  const handleAcknowledgeAlarm = (alarmId: string) => {
    if (audioSiren) {
      playAlarmSound('acknowledge');
    }
    const nextAlarms = activeAlarms.map(alarm => {
      if (alarm.id === alarmId) {
        return { ...alarm, acknowledged: true };
      }
      return alarm;
    });
    const matchedAlarm = activeAlarms.find(a => a.id === alarmId);
    
    const nowTimeStr = new Date().toLocaleTimeString();
    const ackMsg: InterSystemMessage = {
      id: 'msg-ack-' + Date.now(),
      timestamp: nowTimeStr,
      sender: matchedAlarm ? matchedAlarm.system : 'admin',
      receiver: 'all',
      content: `✓ Drill/Alarm Acknowledged: Crew Member rectified and checked [${matchedAlarm?.title || 'System Alert'}]. Alarm silenced.`,
      isRead: false
    };

    const nextMsgs = [ackMsg, ...messages];
    setActiveAlarms(nextAlarms);
    setMessages(nextMsgs);
    
    syncToFirestore({
      activeAlarms: nextAlarms,
      messages: nextMsgs
    });
  };

  const handleClearAllDrills = () => {
    if (audioSiren) {
      playAlarmSound('acknowledge');
    }
    const nowTimeStr = new Date().toLocaleTimeString();
    const clearMsg: InterSystemMessage = {
      id: 'msg-clear-' + Date.now(),
      timestamp: nowTimeStr,
      sender: 'admin',
      receiver: 'all',
      content: "🟢 System Diagnostics: Instructors cleared all active emergency simulation drills. Fleet reporting normal condition.",
      isRead: false
    };
    const nextMsgs = [clearMsg, ...messages];
    setActiveAlarms([]);
    setMessages(nextMsgs);
    
    syncToFirestore({
      activeAlarms: [],
      messages: nextMsgs
    });
  };

  const handleAddWaypointGlobal = (name: string, lat: number, lng: number) => {
    const newWp: Waypoint = {
      id: 'wp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
      name: name.toUpperCase(),
      lat,
      lng,
      reached: false
    };

    const nextWps = [...waypoints];
    if (nextWps.length > 1) {
      nextWps.splice(nextWps.length - 1, 0, newWp);
    } else {
      nextWps.push(newWp);
    }

    const nowTimeStr = new Date().toLocaleTimeString();
    const msg: InterSystemMessage = {
      id: 'msg-wp-add-' + Date.now(),
      timestamp: nowTimeStr,
      sender: 'bridge',
      receiver: 'all',
      content: `🗺 Route Updated: New passage waypoint plotted at coord [${lat.toFixed(4)}N, ${Math.abs(lng).toFixed(4)}W] - ${name.toUpperCase()}.`,
      isRead: false
    };

    const nextMsgs = [msg, ...messages];
    setWaypoints(nextWps);
    setMessages(nextMsgs);

    syncToFirestore({
      waypoints: nextWps,
      messages: nextMsgs
    });
  };

  const handleRemoveWaypointGlobal = (id: string) => {
    const nextWps = waypoints.filter(w => w.id !== id);
    const nowTimeStr = new Date().toLocaleTimeString();
    const msg: InterSystemMessage = {
      id: 'wp-rem-' + Date.now(),
      timestamp: nowTimeStr,
      sender: 'bridge',
      receiver: 'all',
      content: `🗺 Route Updated: Deleted inactive waypoint [ID: ${id}] from current voyage plan.`,
      isRead: false
    };
    const nextMsgs = [msg, ...messages];
    
    setWaypoints(nextWps);
    setMessages(nextMsgs);
    
    syncToFirestore({
      waypoints: nextWps,
      messages: nextMsgs
    });
  };

  const handleUpdateWaypointGlobal = (id: string, lat: number, lng: number) => {
    const nextWps = waypoints.map(w => (w.id === id ? { ...w, lat, lng } : w));
    setWaypoints(nextWps);
    syncToFirestore({ waypoints: nextWps });
  };

  const handleToggleVoyageGlobal = () => {
    const nextVoyage = !voyageStarted;
    const nowTimeStr = new Date().toLocaleTimeString();
    const msg: InterSystemMessage = {
      id: 'msg-voy-' + Date.now(),
      timestamp: nowTimeStr,
      sender: 'bridge',
      receiver: 'all',
      content: nextVoyage 
        ? "🚢 PROPULSION INSTRUCTIONS: Voyage passages started. Main marine diesel engines humming, bringing vessel up to cruising speed index." 
        : "⚓ PROPULSION INSTRUCTIONS: Passage paused. Vessel holding geographic station position. Core engines set to standby.",
      isRead: false
    };
    const nextMsgs = [msg, ...messages];
    
    setVoyageStarted(nextVoyage);
    setMessages(nextMsgs);
    
    syncToFirestore({
      voyageStarted: nextVoyage,
      messages: nextMsgs
    });
  };

  const handleAddCargoGlobal = (item: Omit<CargoItem, 'id'>) => {
    const newItem: CargoItem = {
      ...item,
      id: 'cargo-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)
    };
    const nextCargo = [...cargoItems, newItem];
    const nowTimeStr = new Date().toLocaleTimeString();
    const msg: InterSystemMessage = {
      id: 'msg-cargo-' + Date.now(),
      timestamp: nowTimeStr,
      sender: 'admin',
      receiver: 'all',
      content: `📦 Manifest Update: Stowed Container ${newItem.containerId} (${newItem.type}, ${newItem.weight} Tons) onto hatch bay deck.`,
      isRead: false
    };
    const nextMsgs = [msg, ...messages];
    
    setCargoItems(nextCargo);
    setMessages(nextMsgs);
    
    syncToFirestore({
      cargoItems: nextCargo,
      messages: nextMsgs
    });
  };

  const handleRemoveCargoGlobal = (id: string) => {
    const match = cargoItems.find(c => c.id === id);
    const nextCargo = cargoItems.filter(c => c.id !== id);
    
    if (match) {
      const nowTimeStr = new Date().toLocaleTimeString();
      const msg: InterSystemMessage = {
        id: 'msg-cargo-rem-' + Date.now(),
        timestamp: nowTimeStr,
        sender: 'admin',
        receiver: 'all',
        content: `📦 Manifest Update: Discharged Container ${match.containerId} from shipping register.`,
        isRead: false
      };
      const nextMsgs = [msg, ...messages];
      setCargoItems(nextCargo);
      setMessages(nextMsgs);
      syncToFirestore({
        cargoItems: nextCargo,
        messages: nextMsgs
      });
    } else {
      setCargoItems(nextCargo);
      syncToFirestore({ cargoItems: nextCargo });
    }
  };

  const handleUpdateWeatherGlobal = (partial: Partial<typeof weather>) => {
    const nextWeather = { ...weather, ...partial };
    setWeather(nextWeather);
    syncToFirestore({ weather: nextWeather });
  };

  const handleUpdateEngineGlobal = (partial: Partial<typeof engine>) => {
    const nextEngine = { ...engine, ...partial };
    setEngine(nextEngine);
    syncToFirestore({ engine: nextEngine });
  };

  const handleUpdateEngineChecklistGlobal = (nextChecklist: typeof engineChecklist) => {
    setEngineChecklist(nextChecklist);
    syncToFirestore({ engineChecklist: nextChecklist });
  };

  const handleResetSimulationGlobal = () => {
    const nowTimeStr = new Date().toLocaleTimeString();
    const resetMsg: InterSystemMessage = {
      id: 'reset-' + Date.now(),
      timestamp: nowTimeStr,
      sender: 'remote' as const,
      receiver: 'all' as const,
      content: '⚡ SIMULATION MASTER RESET: All departments and vessel configurations restored to dock standby values. Engine cooled and fuel refilled.',
      isRead: false
    };

    const initialSetup = {
      voyageStarted: false,
      currentWaypointIndex: 0,
      waypoints: INITIAL_WAYPOINTS,
      vesselPercentAlongLeg: 0,
      shipSpeed: 0.0,
      autoDrillsEnabled: false,
      trainingMode: false,
      activeAlarms: [],
      messages: [resetMsg],
      cargoItems: [
        { id: 'c-1', containerId: 'MSKU-804192-4', type: 'Electronics (Dry)', weight: 18.4, destination: 'HAMILTON HARBOR', status: 'Loaded' },
        { id: 'c-2', containerId: 'CMAU-112049-5', type: 'Refrigerated Food (Reefer)', weight: 24.1, destination: 'HAMILTON HARBOR', status: 'Loaded' },
        { id: 'c-2', containerId: 'NYKU-930411-2', type: 'Chemical Grade A (Hazmat)', weight: 12.8, destination: 'HAMILTON HARBOR', status: 'Loaded' }
      ],
      weather: {
        windSpeed: 14,
        seaCondition: 'Moderate swell',
        visibility: 12,
      },
      engine: {
        state: 'off' as const,
        rpm: 0,
        temp: 32,
        fuelCapacity: 1280.5,
        fuelFlowRate: 0.0,
        genLoad: 25,
        coolingFlow: 0,
      },
      engineChecklist: [
        { id: 'chk-coolant', text: 'Verify Auxiliary Seawater Pumps Flow', checked: false },
        { id: 'chk-fuel', text: 'Drain Water from Heavy Fuel Separator', checked: false },
        { id: 'chk-lube', text: 'Verify Main Bearing Lube Oil Level', checked: false },
        { id: 'chk-air', text: 'Check Starting Air Receiver Pressure', checked: false },
        { id: 'chk-gens', text: 'Synchronize Generator #2 on Main Board', checked: false },
      ]
    };

    setVoyageStarted(false);
    setCurrentWaypointIndex(0);
    setWaypoints(INITIAL_WAYPOINTS);
    setVesselPercentAlongLeg(0);
    setShipSpeed(0);
    setAutoDrillsEnabled(false);
    setActiveAlarms([]);
    setMessages([resetMsg]);
    setCargoItems(initialSetup.cargoItems as any);
    setWeather(initialSetup.weather);
    setEngine(initialSetup.engine);
    setEngineChecklist(initialSetup.engineChecklist);

    syncToFirestore(initialSetup);
  };

  const handleSkipWaypointRemote = () => {
    if (!voyageStarted) return;
    const nextIdx = currentWaypointIndex + 1;
    if (nextIdx < waypoints.length) {
      setCurrentWaypointIndex(nextIdx);
      setVesselPercentAlongLeg(0);
      
      const nowTimeStr = new Date().toLocaleTimeString();
      const msg: InterSystemMessage = {
        id: 'msg-skip-' + Date.now(),
        timestamp: nowTimeStr,
        sender: 'remote',
        receiver: 'all',
        content: `✦ INSTRUCTOR ACTION: Voyage passage advanced. Ship bypassed current Leg. advanced to coordinator waypoint [${waypoints[nextIdx].name}].`,
        isRead: false
      };

      const nextMsgs = [msg, ...messages];
      setMessages(nextMsgs);

      syncToFirestore({
        currentWaypointIndex: nextIdx,
        vesselPercentAlongLeg: 0,
        messages: nextMsgs
      });
    }
  };

  // Derive counts for badge indicators
  const unacknowledgedAlarmsCount = activeAlarms.filter(a => !a.acknowledged).length;

  return (
    <div className="min-h-screen bg-marine-950 text-slate-300 font-sans selection:bg-cyan-500 selection:text-slate-900 pb-12 maritime-grid">
      
      {/* Dynamic Sound Alert simulation Banner (Classroom Visual Buzzer) */}
      {sirenTick && (
        <div className="bg-red-600 text-slate-950 py-2.5 px-4 font-display font-bold text-center uppercase tracking-widest flex items-center justify-center gap-3 animate-pulse border-b border-red-500 z-50 relative">
          <Volume2 className="w-5 h-5 text-slate-950 animate-bounce" />
          <span>⚠ STATIONS ATTENTION: CRITICAL UNACKNOWLEDGED INCIDENT ALARM BUZZING ⚠</span>
          <Volume2 className="w-5 h-5 text-slate-950 animate-bounce" />
        </div>
      )}

      {/* Main App Bar / Tech Nav Header */}
      <header className="border-b border-marine-800 bg-marine-900/95 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col lg:flex-row items-center justify-between gap-4">
          
          {/* Logo & Clock Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)] shrink-0">
              <Ship className="w-6 h-6 text-slate-950 animate-pulse" />
            </div>
            <div>
              <h1 className="font-display font-black text-sm md:text-base tracking-wider text-white uppercase flex items-center gap-2">
                Integrated Ship Operations Simulator
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" /> TIME: 14:22:08
                </span>
                <span>• Vessel: M/V Atlantic Star</span>
                <span>• IMO: 9412036</span>
                <span>• Destination: Rotterdam</span>
              </div>
            </div>
          </div>

          {/* Master Station Selectors */}
          <div className="flex items-center gap-3">
            {activeStation === 'overview' ? (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-cyan-950/40 border border-cyan-800/40 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <span className="text-[11px] font-mono tracking-wider text-cyan-400 uppercase font-bold">Simulator Ready: Select A Role Below</span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="px-3.5 py-1.5 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono font-bold uppercase flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-slate-400">ROLE WATCH ACTIVE:</span>
                  <span className="text-white">
                    {activeStation === 'bridge' && '🚢 Officer of the Watch'}
                    {activeStation === 'engine' && '⚙️ Marine Engineer'}
                    {activeStation === 'admin' && '📋 Ship Administrator'}
                    {activeStation === 'remote' && '🎛️ Simulation Live Remote'}
                  </span>
                </div>
                
                <button
                  id="tab-overview"
                  onClick={() => setActiveStation('overview')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-950 hover:bg-red-900 border border-red-800/80 rounded-lg text-xs font-bold uppercase text-red-400 transition-all duration-200 cursor-pointer"
                >
                  ← Exit Watch / Change Role
                </button>
              </div>
            )}
          </div>

          {/* Quick Stats Badges & Training Switch */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Highly Prominent Cadet Training Mode Switch */}
            <button
              id="btn-toggle-training-mode"
              onClick={() => setTrainingMode(!trainingMode)}
              className={`text-xs font-mono font-bold px-3 py-2 rounded-lg border flex items-center gap-1.5 transition-all duration-300 ${
                trainingMode 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/65 shadow-[0_0_12px_rgba(245,158,11,0.25)] animate-pulse' 
                  : 'bg-marine-900 text-slate-500 border-marine-800 hover:text-slate-300'
              }`}
              title="Toggle Cadet Information Overlays and step-by-step shipboard guidance"
            >
              <HelpCircle className={`w-4 h-4 ${trainingMode ? 'text-amber-400 animate-spin-slow' : 'text-slate-500'}`} />
              {trainingMode ? '📐 TRAINING FEEDBACK: ON' : '📐 TRAINING FEEDBACK: OFF'}
            </button>

            <button
              title="Silence siren audio"
              onClick={() => setAudioSiren(prev => !prev)}
              className={`p-2 rounded-lg border transition-all ${
                audioSiren ? 'bg-red-950/40 text-red-400 border-red-900/60' : 'bg-marine-900 text-slate-500 border-marine-800'
              }`}
              id="btn-toggle-siren-sound"
            >
              {audioSiren ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {unacknowledgedAlarmsCount > 0 && (
              <span className="text-[11px] font-mono font-bold bg-red-600 text-slate-950 px-2.5 py-2 rounded-lg animate-bounce flex items-center gap-1 uppercase shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 fill-current" /> {unacknowledgedAlarmsCount} FAULTS
              </span>
            )}
          </div>

        </div>
      </header>

      {/* Main Workspace Body wrapper */}
      <main className="max-w-7xl mx-auto px-4 mt-6">
        
        {/* COLLAPSIBLE INSTRUCTOR / COMMAND DRILLS PANEL (Only shown on overview and remote watch stations) */}
        {(activeStation === 'overview' || activeStation === 'remote') && (
          !instructorPanelExpanded ? (
            <div className="p-3 rounded-xl border border-cyan-800/35 bg-cyan-950/15 mb-6 flex items-center justify-between gap-4 text-xs font-mono shadow-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                <span className="text-cyan-400 font-bold">🏫 INSTRUCTOR CONTROL DECK</span>
                <span className="text-slate-500 hidden sm:inline">• Incident and alarm drill generators are quiet</span>
              </div>
              <button
                onClick={() => setInstructorPanelExpanded(true)}
                className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-cyan-400 hover:text-slate-950 hover:bg-cyan-400 border border-cyan-500/30 hover:border-cyan-400 rounded-lg transition-all duration-200 cursor-pointer"
              >
                ⚙️ Open Simulator Drill Engine
              </button>
            </div>
          ) : (
            <section className="glass-panel p-4 rounded-xl border-l-4 border-l-cyan-500 mb-6 bg-cyan-950/20 shadow-lg relative" id="instructor-drill-panel">
              <button
                onClick={() => setInstructorPanelExpanded(false)}
                className="absolute top-3.5 right-3.5 text-[10px] font-mono font-bold text-slate-400 hover:text-white transition-colors bg-slate-950 hover:bg-marine-800 border border-marine-800 hover:border-slate-600 px-2 py-1 rounded-lg cursor-pointer"
                title="Close instructor panel"
              >
                ✕ Collapse Deck
              </button>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pr-32">
                <div className="flex items-start gap-2.5">
                  <div className="bg-cyan-900/40 border border-cyan-700/50 p-2 rounded-lg mt-0.5">
                    <Settings2 className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-xs tracking-wider text-cyan-300 uppercase flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      Active Training Controller (Instructor Deck)
                    </h3>
                    <p className="text-xs text-slate-400 leading-normal">
                      Toggle scheduled emergency events or manually fire ship-wide alarms to test student response and radio updates:
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setAutoDrillsEnabled(prev => !prev)}
                    className={`text-[10px] font-mono font-bold px-3 py-1.5 rounded transition bg-slate-900/80 border ${
                      autoDrillsEnabled 
                        ? 'text-cyan-400 border-cyan-500 bg-cyan-950/40 shadow-[0_0_8px_rgba(6,182,212,0.15)]' 
                        : 'text-slate-400 border-marine-800 hover:border-cyan-800'
                    }`}
                    id="btn-toggle-autodrill"
                  >
                    {autoDrillsEnabled ? '⚙ AUTO DRILLS: BUSY' : '⚙ SCHEDULER: OFF'}
                  </button>

                  <button
                    onClick={handleClearAllDrills}
                    className="text-[10px] font-mono font-bold text-emerald-400 hover:text-emerald-300 border border-emerald-900/60 hover:bg-emerald-950/30 px-3 py-1.5 rounded transition"
                    id="btn-clear-all-drills"
                  >
                    🟢 CLEAR ALL INCIDENTS
                  </button>
                </div>
              </div>

              {/* Drill manual trigger hot-buttons */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-1.5 mt-3.5 pt-3 border-t border-marine-850">
                {drillOptions.map((drill, idx) => {
                  let btnColor = 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800/80';
                  if (drill.level === 'critical') btnColor = 'bg-red-950/30 hover:bg-red-900/30 text-rose-300 border-red-900/40';
                  
                  return (
                    <button
                      key={idx}
                      id={`btn-trigger-drill-${idx}`}
                      onClick={() => triggerDrillSpecific(idx)}
                      className={`text-[9.5px] font-mono text-left p-1.5 rounded border transition-all truncate ${btnColor}`}
                      title={`${drill.title}: ${drill.description}`}
                    >
                      <span className="font-bold opacity-60">[{drill.system.substring(0,3).toUpperCase()}]</span> {drill.title}
                    </button>
                  );
                })}
              </div>
            </section>
          )
        )}

        {/* Global Alarm Diagnostic Summary Bar */}
        {activeAlarms.length > 0 && (
          <div className="glass-panel p-3 rounded-xl border border-rose-955/40 bg-rose-950/10 mb-6 flex flex-col gap-2">
            <span className="text-[10px] font-mono uppercase font-bold text-rose-400 tracking-wider flex items-center gap-1">
              <AlertOctagon className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              Active System Faults & Drills Register (Students: Rectify and Acknowledge)
            </span>
            <div className="flex flex-wrap gap-2">
              {activeAlarms.map(a => (
                <div
                  key={a.id}
                  id={`alarm-status-${a.id}`}
                  className={`flex items-center gap-2 px-2.5 py-1 rounded text-xs border ${
                    a.acknowledged
                      ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-300'
                      : 'bg-red-950/50 border-red-800/80 text-rose-300 animate-pulse'
                  }`}
                >
                  <span className="text-[9px] font-bold uppercase font-mono tracking-widest bg-slate-950/50 px-1 py-0.5 rounded">
                    {a.system}
                  </span>
                  <span className="font-semibold">{a.title}</span>
                  {!a.acknowledged ? (
                    <button
                      onClick={() => handleAcknowledgeAlarm(a.id)}
                      className="text-[9px] bg-red-600 hover:bg-red-500 text-slate-950 font-bold px-1.5 py-0.5 rounded border border-red-400 transition-colors"
                      id={`btn-ack-alarm-${a.id}`}
                    >
                      ACK
                    </button>
                  ) : (
                    <span className="text-[9px] text-emerald-400 font-bold">✓ HANDLED</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RENDER ACTIVE SCREEN WORKSPACE */}
        <section className="mb-8 font-sans">
          
          {/* Active Work Panel Switch Container */}
          {activeStation === 'overview' && (
            <div className="space-y-8 animate-fade-in" id="overview-station-dashboard">
              
              {/* Cadet Training Simulator Core Introduction Box */}
              <div className="glass-panel p-6 rounded-xl border border-marine-800 bg-marine-900/65 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-cyan-400 font-bold bg-cyan-950/80 px-2.5 py-1 rounded border border-cyan-800/60 inline-block mb-3">
                      ⚓ Training Command Hub & Watchkeeping Entry Portal
                    </span>
                    <h2 className="font-display text-2xl font-black text-white tracking-tight uppercase">
                      Integrated Ship Operations Simulator
                    </h2>
                    <p className="text-sm text-slate-300 mt-2 max-w-4xl leading-relaxed">
                      Welcome to the academic ship simulation console. Select your role on watch below to begin operating the corresponding terminal dashboard. In accordance with maritime training practice, you will only see the telemetry, controls, and communications for the duty watch station you are simulated to be in charge of.
                    </p>
                  </div>
                  <div className="bg-marine-950 p-4 rounded-lg border border-marine-800 shrink-0 w-full md:w-auto">
                    <p className="text-[10px] text-slate-500 uppercase font-mono font-bold">Active Ship Status</p>
                    <div className="text-xs text-slate-300 mt-1 font-mono space-y-1">
                      <div>STATE: <span className="text-emerald-400 font-bold">{voyageStarted ? 'SAILING' : 'STATION STANDBY'}</span></div>
                      <div>DRAFT (FWD/AFT): <span className="text-white">10.4m / 10.8m</span></div>
                      <div>DISPLACEMENT: <span className="text-cyan-400">42,500 MT</span></div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300 leading-relaxed">
                  <span className="font-bold uppercase tracking-wider block mb-1">⏱ Training Officer Onboarding Instructions:</span>
                  Choose your simulation watch assignment below. If you are a first-time cadet, toggle <strong className="text-white bg-amber-500/40 px-1 py-0.5 rounded">📐 TRAINING FEEDBACK: ON</strong> in the top header to enable visual system guidelines, device descriptions, and active regulatory definitions across all departments.
                </div>
              </div>

              {/* Selection Panels: The Three Core Department Simulation Stations */}
              <div id="simulation-role-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Panel 1: Bridge Operations */}
                <div className="glass-panel rounded-xl border border-marine-800 bg-marine-900/85 p-5 flex flex-col justify-between hover:border-cyan-500/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] relative group">
                  <div className="absolute top-3 right-3 text-xs font-mono text-cyan-500/40 font-bold tracking-widest uppercase">
                    SYS-01
                  </div>
                  <div>
                    <div className="flex items-center gap-3 border-b border-marine-800 pb-3 mb-4">
                      <div className="w-10 h-10 bg-cyan-500/10 text-cyan-400 rounded-lg flex items-center justify-center border border-cyan-500/20 shadow-inner">
                        <Compass className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider">Bridge Operations System</h3>
                        <span className="text-[9px] font-mono text-slate-400 uppercase">ECDIS, Navigation & Watchkeeping</span>
                      </div>
                    </div>

                    <div className="space-y-4 font-sans">
                      <div>
                        <h4 className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-widest mb-1.5">What is simulated?</h4>
                        <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside pl-0.5">
                          <li>Ship navigation</li>
                          <li>Voyage planning</li>
                          <li>Radar monitoring</li>
                          <li>Collision avoidance</li>
                          <li>Bridge watchkeeping</li>
                          <li>Communication with other departments</li>
                        </ul>
                      </div>

                      <div className="pt-2.5 border-t border-marine-850">
                        <h4 className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-widest mb-1.5">Personnel in charge:</h4>
                        <div className="flex flex-wrap gap-1">
                          {['Deck Cadet', 'Officer of the Watch', 'Third Officer', 'Second Officer', 'Chief Officer', 'Master'].map(p => (
                            <span key={p} className="text-[9px] bg-slate-950 font-mono text-slate-300 border border-slate-800/80 px-1.5 py-0.5 rounded">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-marine-850 font-sans">
                    <button
                      id="btn-goto-bridge-from-ov"
                      onClick={() => setActiveStation('bridge')}
                      className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(6,182,212,0.2)] hover:scale-[1.02]"
                    >
                      🚢 Simulate as Officer of the Watch
                    </button>
                    {trainingMode && (
                      <p className="text-[9.5px] text-slate-500 font-mono mt-2 text-center">
                        Launches nautical ECDIS charts, collision vectors & speed throttle indicators.
                      </p>
                    )}
                  </div>
                </div>

                {/* Panel 2: Engine Room Operations */}
                <div className="glass-panel rounded-xl border border-marine-800 bg-marine-900/85 p-5 flex flex-col justify-between hover:border-amber-500/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] relative group">
                  <div className="absolute top-3 right-3 text-xs font-mono text-amber-500/40 font-bold tracking-widest uppercase text-sans">
                    SYS-02
                  </div>
                  <div>
                    <div className="flex items-center gap-3 border-b border-marine-800 pb-3 mb-4">
                      <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-lg flex items-center justify-center border border-amber-500/20 shadow-inner">
                        <Settings2 className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider">Engine Room Operations System</h3>
                        <span className="text-[9px] font-mono text-slate-400 uppercase">Power Automation & Diesel Machinery</span>
                      </div>
                    </div>

                    <div className="space-y-4 font-sans">
                      <div>
                        <h4 className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-widest mb-1.5">What is simulated?</h4>
                        <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside pl-0.5">
                          <li>Main engine monitoring</li>
                          <li>Auxiliary machinery monitoring</li>
                          <li>Alarm management</li>
                          <li>Fuel and cooling system supervision</li>
                          <li>Machinery reporting</li>
                        </ul>
                      </div>

                      <div className="pt-2.5 border-t border-marine-850">
                        <h4 className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-widest mb-1.5">Personnel in charge:</h4>
                        <div className="flex flex-wrap gap-1">
                          {['Engine Cadet', 'Fourth Engineer', 'Third Engineer', 'Second Engineer', 'Chief Engineer'].map(p => (
                            <span key={p} className="text-[9px] bg-slate-950 font-mono text-slate-300 border border-slate-800/80 px-1.5 py-0.5 rounded">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-marine-850 font-sans">
                    <button
                      id="btn-goto-engine-from-ov"
                      onClick={() => setActiveStation('engine')}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(245,158,11,0.2)] hover:scale-[1.02]"
                    >
                      ⚙️ Simulate as Marine Engineer
                    </button>
                    {trainingMode && (
                      <p className="text-[9.5px] text-slate-500 font-mono mt-2 text-center">
                        Launches fuel cooling pumps flow control, diesel cylinders check and generators PMS.
                      </p>
                    )}
                  </div>
                </div>

                {/* Panel 3: Commercial & Administration */}
                <div className="glass-panel rounded-xl border border-marine-800 bg-marine-900/85 p-5 flex flex-col justify-between hover:border-purple-500/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] relative group">
                  <div className="absolute top-3 right-3 text-xs font-mono text-purple-500/40 font-bold tracking-widest uppercase text-sans">
                    SYS-03
                  </div>
                  <div>
                    <div className="flex items-center gap-3 border-b border-marine-800 pb-3 mb-4">
                      <div className="w-10 h-10 bg-purple-500/10 text-purple-400 rounded-lg flex items-center justify-center border border-purple-500/20 shadow-inner">
                        <FileText className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider">Commercial & Administration</h3>
                        <span className="text-[9px] font-mono text-slate-400 uppercase">Cargo Stowing, Noon Logs & Manifests</span>
                      </div>
                    </div>

                    <div className="space-y-4 font-sans">
                      <div>
                        <h4 className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-widest mb-1.5">What is simulated?</h4>
                        <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside pl-0.5">
                          <li>Cargo management</li>
                          <li>Voyage reporting</li>
                          <li>Documentation</li>
                          <li>Crew records</li>
                          <li>Ship administration</li>
                          <li>Communication with company office</li>
                        </ul>
                      </div>

                      <div className="pt-2.5 border-t border-marine-850">
                        <h4 className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-widest mb-1.5">Personnel in charge:</h4>
                        <div className="flex flex-wrap gap-1">
                          {['Chief Officer', 'Master', 'Ship Administrator', 'Operations Officer', 'Cargo Officer'].map(p => (
                            <span key={p} className="text-[9px] bg-slate-950 font-mono text-slate-300 border border-slate-800/80 px-1.5 py-0.5 rounded">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-marine-850 font-sans">
                    <button
                      id="btn-goto-admin-from-ov"
                      onClick={() => setActiveStation('admin')}
                      className="w-full py-3 bg-purple-650 hover:bg-purple-550 text-white font-bold text-xs uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(168,85,247,0.3)] hover:scale-[1.02]"
                    >
                      📋 Simulate as Ship Administrator
                    </button>
                    {trainingMode && (
                      <p className="text-[9.5px] text-slate-500 font-mono mt-2 text-center">
                        Launches container stowage manifests, fleet communications and Noon operations reports.
                      </p>
                    )}
                  </div>
                </div>

              </div>

              {/* Panel 4: Remote Sim Control Station (Instructor Panel) */}
              <div className="glass-panel rounded-xl border border-dashed border-cyan-800/80 bg-marine-955/90 p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-cyan-400 transition-all duration-300 hover:shadow-[0_0_22px_rgba(6,182,212,0.15)] relative group animate-fade-in">
                <div className="absolute top-3 right-3 text-xs font-mono text-cyan-400 font-bold tracking-widest uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                  GLOBAL CLOUD INTERLOCK
                </div>
                <div className="space-y-2 max-w-2xl text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-cyan-950/80 text-cyan-400 rounded-lg flex items-center justify-center border border-cyan-500/30">
                      <Settings2 className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">Multi-Device Live Instructor Remote</h3>
                      <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest block font-bold">Classroom Synchronization System Port</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    Trigger synchronized emergency drills on individual student laptops, override engine telemetry rates, feed live wind speed values, bypass voyage legs/waypoints, and review cargo manifests live. Connects other devices using the room key below.
                  </p>
                </div>
                <div className="w-full md:w-auto shrink-0 flex flex-col sm:flex-row md:flex-col gap-2.5 min-w-[280px]">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                        placeholder="ROOM_KEY"
                        className="w-full bg-slate-950 text-xs font-mono px-3 py-2 border border-cyan-900/60 rounded-lg text-white font-bold tracking-widest focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                    <span className="bg-cyan-950/85 border border-cyan-800 text-[10px] text-cyan-400 font-mono px-3 py-2 rounded-lg font-black tracking-wider flex items-center shrink-0">
                      {syncStatus === 'synced' ? '● SYNCED' : syncStatus === 'syncing' ? '🔃' : '● OFFLINE'}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveStation('remote')}
                    className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_14px_rgba(6,182,212,0.3)] hover:scale-[1.02]"
                  >
                    🎛 Enter Instructor Control Panel
                  </button>
                </div>
              </div>

              {/* Collapsible Cadet Knowledge Base & Roleplay Guide */}
              {!showKnowledgeBase ? (
                <div className="text-center pt-2">
                  <button
                    onClick={() => setShowKnowledgeBase(true)}
                    className="px-4 py-2.5 text-xs font-mono font-bold text-slate-400 hover:text-cyan-400 bg-slate-900/60 hover:bg-marine-900/80 border border-marine-800 hover:border-cyan-500/35 rounded-lg transition-all duration-200 cursor-pointer shadow-sm"
                  >
                    📚 Open Cadets Knowledge Base & Classroom Roleplay Guide
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950 p-5 rounded-xl border border-marine-800 relative animate-fade-in">
                  <button
                    onClick={() => setShowKnowledgeBase(false)}
                    className="absolute top-3 right-3 text-[10px] font-mono font-bold text-slate-500 hover:text-slate-300 transition-colors border border-marine-850 hover:border-slate-700 px-2 py-1 rounded cursor-pointer"
                  >
                    ✕ Hide Guide
                  </button>
                  <div>
                    <h4 className="font-display font-bold text-sm text-cyan-400 uppercase tracking-wider mb-2.5 flex items-center gap-1">
                      <HelpCircle className="w-4 h-4 text-cyan-500" /> Maritime Cadets Knowledge Base
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 text-xs">
                      <div className="p-2 border border-marine-850 bg-marine-900/35 rounded">
                        <strong className="text-white block font-mono">ECDIS:</strong>
                        Electronic Chart Display & Information System. Combines GPS position plotting with marine charting.
                      </div>
                      <div className="p-2 border border-marine-850 bg-marine-900/35 rounded">
                        <strong className="text-white block font-mono">AIS Receiver:</strong>
                        Automatic Identification System. Broadcasts digital ship particulars, course, speed, and name to surrounding vessels.
                      </div>
                      <div className="p-2 border border-marine-850 bg-marine-900/35 rounded">
                        <strong className="text-white block font-mono">PMS Automation:</strong>
                        Power Management System. Automatically manages diesel generators synchronizations and grid load shifts.
                      </div>
                      <div className="p-2 border border-marine-850 bg-marine-900/35 rounded">
                        <strong className="text-white block font-mono">Cargo Manifest:</strong>
                        Detailed inventory sheet recording stowed containers, weight categories, safety classes, and destination port.
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col justify-between">
                    <div>
                      <h4 className="font-display font-bold text-sm text-amber-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-400" /> Co-Op Classroom Roleplay Guide
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        In a classroom setting, students should split tasks: One acting as <strong>Commanding Officer / Mate</strong> on the Bridge, another acting as <strong>Duty Engineer</strong> monitoring heat loads in the Engine room, and a third acting as <strong>Admin Purser</strong> logging manifests. Use the intercom messenger below to request RPM syncs and coordinate logs!
                      </p>
                    </div>
                    <div className="mt-4 p-2.5 bg-marine-900 border border-marine-800 rounded flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase">SYS_SATCOM: Inter-system ship data link synced across all terminals</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Master Intercom buffer block inside overview pages */}
              {!showIntercomBuffer ? (
                <div className="text-center pt-2">
                  <button
                    onClick={() => setShowIntercomBuffer(true)}
                    className="px-4 py-2.5 text-xs font-mono font-bold text-slate-400 hover:text-cyan-400 bg-slate-900/60 hover:bg-marine-900/80 border border-marine-800 hover:border-cyan-500/35 rounded-lg transition-all duration-200 cursor-pointer shadow-sm"
                  >
                    💬 Open Live Satellite Intercom Feed
                  </button>
                </div>
              ) : (
                <div className="glass-panel p-4 rounded-xl border border-marine-800 bg-[#040e24]/70 mt-6 relative animate-fade-in">
                  <button
                    onClick={() => setShowIntercomBuffer(false)}
                    className="absolute top-3 right-3 text-[10px] font-mono font-bold text-slate-400 hover:text-white transition-colors border border-marine-800 hover:border-slate-600 px-2 py-1 rounded cursor-pointer"
                  >
                    ✕ Hide Buffer
                  </button>
                  <h4 className="font-display text-sm font-semibold text-cyan-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-cyan-500" />
                    M/V Atlantic Star - Unified Satellite Intercom Buffer (Shared Feed)
                  </h4>

                  <div className="bg-slate-950/90 rounded border border-marine-800/80 p-3 h-52 overflow-y-auto space-y-2.5 font-mono text-xs">
                    {messages.map(m => {
                      let badgeColor = 'bg-cyan-900/30 border-cyan-800 text-cyan-300';
                      if (m.sender === 'engine') badgeColor = 'bg-amber-900/30 border-amber-800 text-amber-300';
                      if (m.sender === 'admin') badgeColor = 'bg-purple-900/40 border-purple-800 text-purple-300';

                      return (
                        <div key={m.id} className="border-b border-marine-900/40 pb-2" id={`over-msg-${m.id}`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-sans font-bold uppercase px-2 py-0.5 rounded border ${badgeColor}`}>
                                {m.sender.toUpperCase()} STATION
                              </span>
                              <span className="text-slate-500">➤ TRANSMISSION TO: {m.receiver.toUpperCase()}</span>
                            </div>
                            <span className="text-[10px] text-slate-600 font-normal">{m.timestamp}</span>
                          </div>
                          <p className="text-slate-200 pl-1">{m.content}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}

          {activeStation === 'bridge' && (
            <BridgeStation
              waypoints={waypoints}
              currentWaypointIndex={currentWaypointIndex}
              voyageStarted={voyageStarted}
              onToggleVoyage={handleToggleVoyageGlobal}
              onAddWaypoint={handleAddWaypointGlobal}
              onRemoveWaypoint={handleRemoveWaypointGlobal}
              onUpdateWaypoint={handleUpdateWaypointGlobal}
              vesselPercentAlongLeg={vesselPercentAlongLeg}
              messages={messages}
              onSendMessage={handleSendMessage}
              activeAlarms={activeAlarms}
              onTriggerEvent={triggerDrillSpecific as any}
              shipSpeed={shipSpeed}
              trainingMode={trainingMode}
              weather={weather}
            />
          )}

          {activeStation === 'engine' && (
            <EngineStation
              messages={messages}
              onSendMessage={handleSendMessage}
              activeAlarms={activeAlarms}
              onAcknowledgeAlarm={handleAcknowledgeAlarm}
              shipSpeed={shipSpeed}
              voyageStarted={voyageStarted}
              trainingMode={trainingMode}
              engine={engine}
              onUpdateEngine={handleUpdateEngineGlobal}
              engineChecklist={engineChecklist}
              onUpdateEngineChecklist={handleUpdateEngineChecklistGlobal}
            />
          )}

          {activeStation === 'admin' && (
            <AdminStation
              messages={messages}
              onSendMessage={handleSendMessage}
              cargoItems={cargoItems}
              onAddCargo={handleAddCargoGlobal}
              onRemoveCargo={handleRemoveCargoGlobal}
              shipSpeed={shipSpeed}
              voyageStarted={voyageStarted}
              currentWaypointIndex={currentWaypointIndex}
              totalWaypointsCount={waypoints.length}
              trainingMode={trainingMode}
            />
          )}

          {activeStation === 'remote' && (
            <RemoteControlStation
              roomId={roomId}
              setRoomId={setRoomId}
              syncStatus={syncStatus}
              voyageStarted={voyageStarted}
              onToggleVoyage={handleToggleVoyageGlobal}
              currentWaypointIndex={currentWaypointIndex}
              waypoints={waypoints}
              onSkipWaypoint={handleSkipWaypointRemote}
              onResetSimulation={handleResetSimulationGlobal}
              weather={weather}
              onUpdateWeather={handleUpdateWeatherGlobal}
              engine={engine}
              onUpdateEngine={handleUpdateEngineGlobal}
              engineChecklist={engineChecklist}
              onUpdateEngineChecklist={handleUpdateEngineChecklistGlobal}
              activeAlarms={activeAlarms}
              onTriggerDrillSpecific={triggerDrillSpecific}
              onClearAllDrills={handleClearAllDrills}
              drillOptions={drillOptions}
              messages={messages}
              onSendMessage={handleSendMessage}
              cargoItems={cargoItems}
              onAddCargo={handleAddCargoGlobal}
              onRemoveCargo={handleRemoveCargoGlobal}
            />
          )}

        </section>

      </main>

      {/* Simulator footer */}
      <footer className="mt-12 text-center text-[11px] text-slate-500 font-mono tracking-wide max-w-7xl mx-auto px-4 pt-4 border-t border-marine-900/60 flex flex-col md:flex-row justify-between items-center gap-2">
        <span>© 2026 THREE-SYSTEM MARITIME SIMULATION DECK • ACADEMIC CLASS DEMO EDITION</span>
        <span className="flex items-center gap-1.5"><Anchor className="w-3.5 h-3.5 text-cyan-600" /> STAND BY CHANNEL 16 • SYSTEM READY</span>
      </footer>

    </div>
  );
}
