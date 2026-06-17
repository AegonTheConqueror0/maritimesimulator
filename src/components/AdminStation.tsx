import React, { useState } from 'react';
import { CargoItem, InterSystemMessage, CrewMember, EmailMessage } from '../types';
import { 
  FileText, 
  Users, 
  Inbox, 
  Package, 
  Send, 
  Plus, 
  Trash2, 
  Download, 
  Mail, 
  Check, 
  AlertCircle,
  Radio,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';

interface AdminStationProps {
  messages: InterSystemMessage[];
  onSendMessage: (sender: 'admin', receiver: 'bridge' | 'engine' | 'all', content: string) => void;
  cargoItems: CargoItem[];
  onAddCargo: (cargo: Omit<CargoItem, 'id'>) => void;
  onRemoveCargo: (id: string) => void;
  shipSpeed: number;
  voyageStarted: boolean;
  currentWaypointIndex: number;
  totalWaypointsCount: number;
  trainingMode?: boolean;
}

export default function AdminStation({
  messages,
  onSendMessage,
  cargoItems,
  onAddCargo,
  onRemoveCargo,
  shipSpeed,
  voyageStarted,
  currentWaypointIndex,
  totalWaypointsCount,
  trainingMode = false,
}: AdminStationProps) {
  // Cargo helper inputs
  const [cargoType, setCargoType] = useState('Electronics (Dry)');
  const [cargoWeight, setCargoWeight] = useState('22.4');
  const [cargoDest, setCargoDest] = useState('HAMILTON HARBOR');
  const [cargoStatus, setCargoStatus] = useState<'Pending' | 'Loaded' | 'In Transit' | 'Stowed' | 'Discharged'>('Loaded');

  // Intercom inputs
  const [commsTarget, setCommsTarget] = useState<'bridge' | 'engine' | 'all'>('bridge');
  const [commsText, setCommsText] = useState('');

  // Script scenario and sync state
  const [activeTab, setActiveTab] = useState<'speak' | 'code'>('speak');
  const [scriptScenario, setScriptScenario] = useState<'routine' | 'customs' | 'quarantine' | 'stores'>('routine');
  const [syncKeyword, setSyncKeyword] = useState('');
  const [syncStatus, setSyncStatus] = useState<'empty' | 'valid' | 'invalid'>('empty');

  const getGeneratedScript = () => {
    switch (scriptScenario) {
      case 'routine':
        return `ADMINISTRATION OFFICE • GLOBAL SATCOM COMMENCEMENT • THIS IS PURSER BROWN COMPILING WATCH LOGS. COMMERCIAL MANIFEST REGISTERED WITH ${cargoItems.length} ACTIVE DISPLACEMENT CARGO SUBMISSIONS. CARGO DECK SECURE FOR OCEAN TRANSIT TO HAMILTON. HEALTH DECLARATION SUBMITTED. STANDING BY. OUT.`;
      case 'customs':
        return `OFFICE TRANSCEIVER • CUSTOMS PORT DECLARATION • PRE-FILING COMPLIANCE COMPLETE FOR M/V ATLANTIC STAR. MANIFEST RECONCILED WITH CUSTOMS OFFICE EXCISE REGISTERS. PILOT BOARDING ADVICE CONFIRMED FOR ARRIVAL CHANNEL DOCKING. SEAVIEW AND LAND BOUNDARIES SECURE. OVER.`;
      case 'quarantine':
        return `ALL UNITS • PORT HEALTH CONTROL COMMS • MEDICAL INSPECTION DECLARED STABLE. PORT BIO-SECURITY WATCHSTANDERS REPORT ZERO DISCREPANCIES WITH SHIP WATCH RECORDS. VACCINATION SURVEY LOGS APPROVED. SEAWAY SANITATION CERTIFICATE EXTENDED ON BOARD. OVER.`;
      case 'stores':
        return `ADMIN STATION • SUPERINTENDENT WATCH • SHIPS VICTUALS AND COLD ROLLS STOWED AT 100%. CO₂ FIRE SUPPRESSION CYLINDERS LEVEL VERIFIED SYNCED. FRESH WATER PROVISIONS RECORDED AT NORMAL CAPACITY. CREW STATIONS WELL FOUND. STANDING BY FOR OCEAN START. OUT.`;
      default:
        return '';
    }
  };

  const handleBroadcastScript = () => {
    const script = getGeneratedScript();
    onSendMessage('admin', commsTarget, script);
  };

  const latestIncoming = messages
    .filter(m => m.sender !== 'admin')
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

  React.useEffect(() => {
    setSyncStatus('empty');
    setSyncKeyword('');
  }, [latestIncoming?.id]);

  // Local persistent list of simulated final reports generated
  const [savedReports, setSavedReports] = useState<Array<{ id: string; title: string; timestamp: string; body: string }>>([
    {
      id: 'REP-001',
      title: 'Arrival Draft Survey Norfolk',
      timestamp: '2026-06-15 08:30',
      body: 'Survey complete. Forward draft: 10.4m, Aft draft: 10.8m. Displacement: 42,500 MT. Fuel at survey: 1,320.4 MT.'
    }
  ]);

  const [activeReportPreview, setActiveReportPreview] = useState<{ title: string; body: string } | null>(null);

  // Email state
  const [emails, setEmails] = useState<EmailMessage[]>([
    {
      id: 'mail-001',
      sender: 'FLEET OPERATIONS HQ (NORFOLK)',
      subject: 'Voyage Tasking Order #904',
      body: 'To M/V ATLANTIC STAR Command:\n\nYou are authorized to proceed on voyage to Hamilton, Bermuda. Ensure ETA is met. Check fuel conservation patterns to limit emissions. Report any machinery issues immediately.',
      timestamp: '2026-06-15 14:10',
      read: true
    },
    {
      id: 'mail-002',
      sender: 'BERMUDA PORT CONTROL',
      subject: 'Customs & Manifest Submission Request',
      body: 'Attention Admin Officer: Please supply the full stowed cargo manifest at least 24 hours prior to entering territorial waters. Failure to declaration hazardous cargo can trigger delay orders.',
      timestamp: '2026-06-15 17:45',
      read: false
    },
    {
      id: 'mail-003',
      sender: 'CHIEF MEDICAL OFFICER',
      subject: 'Health Declaration confirmation',
      body: 'Crew checklist submitted. All 18 crew members cleared for customs entry. Yellow fever vaccines verified.',
      timestamp: '2026-06-16 01:05',
      read: false
    }
  ]);

  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(emails[0]);

  // Crew state
  const [crew, setCrew] = useState<CrewMember[]>([
    { id: '1', name: 'CAPT. ELENA ROSTOVA', rank: 'Master Mariner', status: 'On Duty' },
    { id: '2', name: 'MATE LIAM O\'CONNOR', rank: 'Chief Officer', status: 'On Duty' },
    { id: '3', name: 'ENG. KENJI TANAKA', rank: 'Chief Engineer', status: 'On Duty' },
    { id: '4', name: 'ENG. SARAH WILLIAMS', rank: 'Second Engineer', status: 'Standby' },
    { id: '5', name: 'OFF. MATTHEW BROWN', rank: 'Admin / Purser', status: 'On Duty' },
    { id: '6', name: 'STEWARD ALEX CHEN', rank: 'Chief Cook', status: 'Off Duty' },
  ]);

  // Actions
  const handleAddCargoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prefix = 'MSKU';
    const randNum1 = Math.floor(Math.random() * 900000) + 100000;
    const randCheck = Math.floor(Math.random() * 9);
    const containerId = `${prefix}-${randNum1}-${randCheck}`;

    onAddCargo({
      containerId,
      type: cargoType,
      weight: parseFloat(cargoWeight) || 12.0,
      destination: cargoDest,
      status: cargoStatus,
    });
  };

  const handleToggleCrewStatus = (id: string) => {
    setCrew(prev => 
      prev.map(c => {
        if (c.id === id) {
          const statuses: CrewMember['status'][] = ['On Duty', 'Off Duty', 'Standby'];
          const currentIndex = statuses.indexOf(c.status);
          const nextIndex = (currentIndex + 1) % statuses.length;
          return { ...c, status: statuses[nextIndex] };
        }
        return c;
      })
    );
  };

  const handleReadEmail = (email: EmailMessage) => {
    setSelectedEmail(email);
    setEmails(prev => 
      prev.map(e => (e.id === email.id ? { ...e, read: true } : e))
    );
  };

  const handleSendComms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commsText.trim()) return;
    onSendMessage('admin', commsTarget, commsText);
    setCommsText('');
  };

  const handleQuickComms = (phrase: string) => {
    onSendMessage('admin', commsTarget, phrase);
  };

  // Compile Report Previews
  const generateOpsReport = () => {
    const totalTons = cargoItems.reduce((acc, curr) => acc + curr.weight, 0);
    const text = `DAILY VESSEL OPERATIONS REPORT\n==============================\nVESSEL: M/V ATLANTIC STAR\nSTATUS: ${voyageStarted ? 'IN Passage' : 'STANDBY'}\nSPEED: ${shipSpeed.toFixed(1)} KTS\nCOORDINATES: DR Passage-Grip active\nCARGO ONBOARD: ${cargoItems.length} Containers (${totalTons.toFixed(1)} MT)\nROUTE PROGRESS: Leg ${currentWaypointIndex}/${totalWaypointsCount} completed.\nFUEL REMAINING: ~1,270 MT\n==============================\nSUBTERRANEAN ENCRYPTION GENERATOR SECURE.`;
    setActiveReportPreview({
      title: 'Daily Operations Report (Compiled)',
      body: text
    });
  };

  const generateCargoSummaryReport = () => {
    const totalTons = cargoItems.reduce((acc, curr) => acc + curr.weight, 0);
    const countsByType = cargoItems.reduce((acc: Record<string, number>, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {});
    
    let breakDownText = '';
    Object.entries(countsByType).forEach(([name, count]) => {
      breakDownText += ` - ${name}: ${count} Units\n`;
    });

    const text = `CARGO MANIFEST SUMMARY REPORT\n==============================\nTOTAL CONTAINER COUNT: ${cargoItems.length}\nTOTAL CARGO WEIGHT: ${totalTons.toFixed(1)} METRIC TONS\n\nBREAKDOWN BY CLASS:\n${breakDownText || " - Empty Voyage State\n"}\nMANIFEST STATUS: Verified and safe for sea.`;
    setActiveReportPreview({
      title: 'Cargo Manifest Summary',
      body: text
    });
  };

  const generateProgressReport = () => {
    const text = `VOYAGE VOYAGE PROGRESS REPORT\n==============================\nORIGIN: PORT NORFOLK, USA\nDESTINATION: HAMILTON HARBOR, BERMUDA\nPASSAGE COMMENCEMENT: Active underway\nCOMPLETED LEG VALUE: ${currentWaypointIndex} out of ${totalWaypointsCount} waypoints.\nETA CONFIDENCE: 98.4% (Weather nominal)\n\nLog checked at current simulated timestamp.`;
    setActiveReportPreview({
      title: 'Voyage Transit Progress Report',
      body: text
    });
  };

  const handleSaveReport = () => {
    if (!activeReportPreview) return;
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 16);
    const newReport = {
      id: `REP-${Math.floor(Math.random() * 900) + 100}`,
      title: activeReportPreview.title,
      timestamp,
      body: activeReportPreview.body
    };

    setSavedReports(prev => [newReport, ...prev]);
    onSendMessage('admin', 'all', `📝 System Memo: Saved and filed document "${activeReportPreview.title}" onto main shipping logs.`);
    setActiveReportPreview(null);
  };

  const handleSendReportByEmail = () => {
    if (!activeReportPreview) return;
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 16);
    const newEmail: EmailMessage = {
      id: `mail-${Math.floor(Math.random() * 90000)}`,
      sender: 'Purser / Administrative Console',
      subject: `FWD: ${activeReportPreview.title}`,
      body: activeReportPreview.body,
      timestamp,
      read: true
    };
    setEmails(prev => [newEmail, ...prev]);
    setSelectedEmail(newEmail);
    onSendMessage('admin', 'bridge', `📧 Email transmission dispatched with filed report: ${activeReportPreview.title}`);
    setActiveReportPreview(null);
  };

  // Filter communications
  const adminMessages = messages.filter(
    m => m.sender === 'admin' || m.receiver === 'admin' || m.receiver === 'all'
  );

  return (
    <div className="space-y-5 animate-fade-in" id="admin-station-container">
      {trainingMode && (
        <div className="bg-amber-500/10 border border-amber-500/45 p-4 rounded-xl flex items-start gap-3 text-xs text-amber-200 animate-slide-in" id="training-admin-alert">
          <span className="text-base">🎓</span>
          <div>
            <strong className="uppercase font-display tracking-wider block mb-1 text-amber-400">Commercial Operations & Shipping Administration Cadet Guide</strong>
            You are now in the ship's administration office. The Purser/Superintendent prepares official customs certifications, manages satellite emails from shipowners, lists safety credentials for crew members, and logs stowed Hazmat, Dry, or Reefer containers on the stowed manifest. Ensure all drafts match standard load weights before departing!
          </div>
        </div>
      )}
      
      {/* Top Section Layout: Cargo Manifest on the Left (takes 2 col), Crew on the Right (takes 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Cargo Manifest management Grid Panel */}
        <div className="glass-panel p-4 rounded-xl lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-display text-sm font-semibold text-cyan-400 flex items-center gap-1.5 uppercase">
                <Package className="w-4 h-4 text-cyan-500" />
                Commercial Cargo Manifest
              </h4>
              <span className="text-[10px] font-mono bg-cyan-950/40 text-cyan-300 border border-cyan-800/60 px-2 py-0.5 rounded">
                Manifest Count: {cargoItems.length} | Load: {cargoItems.reduce((a,c) => a + c.weight, 0).toFixed(1)} MT
              </span>
            </div>

            {/* Cargo Table */}
            <div className="overflow-x-auto border border-marine-800/80 rounded bg-slate-950/60 max-h-56 overflow-y-auto mb-4">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-marine-900 border-b border-marine-800 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="p-2">CONTAINER ID</th>
                    <th className="p-2">CARGO TYPE</th>
                    <th className="p-2 text-right">WEIGHT (MT)</th>
                    <th className="p-2">DESTINATION</th>
                    <th className="p-2 text-center">STATUS</th>
                    <th className="p-2 text-center">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-marine-900 text-slate-200">
                  {cargoItems.length > 0 ? (
                    cargoItems.map(item => (
                      <tr key={item.id} className="hover:bg-marine-800/20" id={`cargo-row-${item.id}`}>
                        <td className="p-2 font-semibold text-cyan-300">{item.containerId}</td>
                        <td className="p-2 truncate max-w-[120px]" title={item.type}>{item.type}</td>
                        <td className="p-2 text-right text-emerald-400">{item.weight.toFixed(1)}</td>
                        <td className="p-2 truncate max-w-[120px]">{item.destination}</td>
                        <td className="p-2 text-center">
                          <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-sans font-bold ${
                            item.status === 'Loaded' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' :
                            item.status === 'In Transit' ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse' :
                            item.status === 'Discharged' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                            'bg-slate-900 text-slate-400 border border-slate-800'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <button
                            id={`btn-del-cargo-${item.id}`}
                            onClick={() => onRemoveCargo(item.id)}
                            className="text-slate-500 hover:text-red-400 font-sans transition-colors p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-600 italic">No containers declared on manifest</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Cargo Form inline */}
          <form onSubmit={handleAddCargoSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-2 border-t border-marine-800 pt-3">
            <div className="md:col-span-1.5">
              <label className="text-[9px] text-slate-500 font-mono block uppercase">CARGO CATEGORY</label>
              <select
                value={cargoType}
                onChange={e => setCargoType(e.target.value)}
                className="w-full bg-slate-900 text-slate-300 border border-marine-700/60 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-cyan-500"
                id="select-cargo-type"
              >
                <option value="Electronics (Dry)">Electronics (Dry)</option>
                <option value="Heavy Machinery (NVO)">Heavy Machinery (NVO)</option>
                <option value="Refrigerated Food (Reefer)">Refrigerated Food (Reefer)</option>
                <option value="Chemical Grade A (Hazmat)">Chemical Grade A (Hazmat)</option>
                <option value="Agricultural Grains">Agricultural Grains</option>
              </select>
            </div>

            <div>
              <label className="text-[9px] text-slate-500 font-mono block uppercase">NET TONS</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="35.0"
                value={cargoWeight}
                onChange={e => setCargoWeight(e.target.value)}
                className="w-full bg-slate-900 text-white border border-marine-700/60 rounded px-2.5 py-1 text-xs font-mono focus:outline-none"
                id="input-cargo-weight"
              />
            </div>

            <div className="md:col-span-1.5">
              <label className="text-[9px] text-slate-500 font-mono block uppercase">DISCHARGE PORT</label>
              <input
                type="text"
                value={cargoDest}
                onChange={e => setCargoDest(e.target.value)}
                className="w-full bg-slate-900 text-white border border-marine-700/60 rounded px-2.5 py-1 text-xs focus:outline-none"
                id="input-cargo-dest"
              />
            </div>

            <div>
              <label className="text-[9px] text-slate-500 font-mono block uppercase">VOYAGE STAGE</label>
              <select
                value={cargoStatus}
                onChange={e => setCargoStatus(e.target.value as any)}
                className="w-full bg-slate-900 text-slate-300 border border-marine-700/60 rounded px-2.5 py-1 text-xs focus:outline-none"
                id="select-cargo-status"
              >
                <option value="Pending">Pending</option>
                <option value="Loaded">Loaded</option>
                <option value="In Transit">In Transit</option>
                <option value="Stowed">Stowed</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-cyan-600 hover:bg-cyan-500 py-1 rounded text-xs font-bold text-slate-950 flex items-center justify-center gap-1 border border-cyan-400/30"
                id="btn-add-cargo"
              >
                <Plus className="w-4 h-4 text-slate-950 font-bold" /> Add Container
              </button>
            </div>
          </form>
        </div>

        {/* Crew Manifest Side Column (1 col) */}
        <div className="glass-panel p-4 rounded-xl flex flex-col justify-between">
          <div>
            <h4 className="font-display text-sm font-semibold text-cyan-400 flex items-center gap-1.5 uppercase mb-2">
              <Users className="w-4 h-4 text-cyan-500" />
              Primary Crew List
            </h4>
            <p className="text-[11px] text-slate-400 mb-2.5">
              Roleplay: Click duty indicators to toggle crew rotations during drills.
            </p>

            <div className="space-y-1.5">
              {crew.map(member => (
                <div
                  key={member.id}
                  id={`crew-item-${member.id}`}
                  className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-marine-800/80 text-xs font-mono"
                >
                  <div>
                    <span className="font-semibold text-slate-200">{member.name}</span>
                    <span className="text-[9px] text-slate-500 block truncate">{member.rank}</span>
                  </div>

                  <button
                    id={`btn-crew-status-${member.id}`}
                    onClick={() => handleToggleCrewStatus(member.id)}
                    className={`text-[9px] font-sans font-bold uppercase px-2 py-0.5 rounded border transition-colors ${
                      member.status === 'On Duty'
                        ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400'
                        : member.status === 'Off Duty'
                        ? 'bg-red-950/40 border-red-800 text-red-400'
                        : 'bg-amber-955/40 border-amber-800 text-amber-400'
                    }`}
                  >
                    {member.status}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono border-t border-marine-800 pt-2.5 mt-3 text-right">
            SHIP COMPLEMENT: 18 SEAFARERS
          </div>
        </div>

      </div>

      {/* Middle Interactive Zone: Simulation Email Engine (2 cols) & Reports Deck (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Immersive Email Client */}
        <div className="glass-panel p-4 rounded-xl lg:col-span-2 flex flex-col md:flex-row gap-4 h-[300px]" id="email-client">
          
          {/* Email Inbox Sidebar */}
          <div className="w-full md:w-64 border-r md:border-r-0 md:border-r border-marine-800 pr-0 md:pr-4 flex flex-col justify-between h-full">
            <div>
              <h5 className="text-[11px] font-sans font-bold text-cyan-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <Inbox className="w-3.5 h-3.5" /> SATCOM Satellite Inbox
              </h5>
              <div className="space-y-1.5 overflow-y-auto h-[220px] pr-1">
                {emails.map(mail => {
                  const isSelected = selectedEmail?.id === mail.id;
                  return (
                    <button
                      key={mail.id}
                      id={`email-item-${mail.id}`}
                      onClick={() => handleReadEmail(mail)}
                      className={`w-full text-left p-2 rounded transition-all flex flex-col border ${
                        isSelected
                          ? 'bg-cyan-950/40 border-cyan-800 text-white shadow-[0_0_8px_rgba(6,182,212,0.1)]'
                          : 'bg-slate-900/40 border-marine-850 text-slate-400 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className={`text-[9px] font-sans truncate font-semibold uppercase ${!mail.read ? 'text-cyan-300 font-bold' : 'text-slate-400'}`}>
                          {!mail.read && <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full inline-block mr-1"></span>}
                          {mail.sender}
                        </span>
                        <span className="text-[8px] font-mono text-slate-500 whitespace-nowrap">{mail.timestamp.split(' ')[1]}</span>
                      </div>
                      <span className={`text-xs font-semibold truncate w-full mt-0.5 ${!mail.read ? 'text-white font-bold' : 'text-slate-300'}`}>{mail.subject}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Email Viewer Pane */}
          <div className="flex-1 flex flex-col justify-between h-full bg-slate-950/80 rounded border border-marine-800/60 p-3 overflow-y-auto">
            {selectedEmail ? (
              <div className="flex flex-col justify-between h-full text-xs font-mono" id="email-detail">
                <div className="space-y-2 border-b border-marine-800/80 pb-2 mb-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">FROM: <strong className="text-cyan-400">{selectedEmail.sender}</strong></span>
                    <span className="text-slate-500">{selectedEmail.timestamp}</span>
                  </div>
                  <div>
                    <h6 className="text-[12px] font-bold text-white text-glow-cyan">{selectedEmail.subject}</h6>
                  </div>
                </div>

                <div className="flex-1 text-slate-300 text-[11.5px] leading-relaxed whitespace-pre-wrap">
                  {selectedEmail.body}
                </div>

                <div className="border-t border-marine-800/80 pt-2.5 mt-3 flex justify-between items-center text-[10px] text-slate-500">
                  <span>SATLINK FEED STABLE (V-V-HF)</span>
                  <span className="flex items-center gap-1 inline-block text-emerald-400">
                    <Check className="w-3 h-3 text-emerald-400" /> Secure Message
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-500 text-xs">
                <Mail className="w-10 h-10 text-slate-700 mx-auto mb-2 opacity-50" />
                Select a satellite mail to read transmissions
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Maritime Reports Deck (1 col) */}
        <div className="glass-panel p-4 rounded-xl flex flex-col justify-between h-[300px]">
          <div>
            <h4 className="font-display text-sm font-semibold text-cyan-400 flex items-center gap-1.5 uppercase mb-2">
              <FileText className="w-4 h-4 text-cyan-500" />
              Shipping Logs / Reports
            </h4>
            <p className="text-[11px] text-slate-400 mb-3 block">
              Generate training reports to send to Fleet HQ or file locally.
            </p>

            <div className="space-y-1.5 font-mono">
              <button
                onClick={generateOpsReport}
                className="w-full text-left text-xs bg-slate-900 border border-marine-700/60 hover:bg-marine-800/50 rounded p-2 text-cyan-300 font-semibold text-glow-cyan"
                id="btn-gen-ops-rep"
              >
                ⚡ Generate Daily Operations
              </button>
              <button
                onClick={generateCargoSummaryReport}
                className="w-full text-left text-xs bg-slate-900 border border-marine-700/60 hover:bg-marine-800/50 rounded p-2 text-emerald-300 font-semibold text-glow-green"
                id="btn-gen-cargo-rep"
              >
                📦 Generate Cargo Summary
              </button>
              <button
                onClick={generateProgressReport}
                className="w-full text-left text-xs bg-slate-900 border border-marine-700/60 hover:bg-marine-800/50 rounded p-2 text-indigo-300 font-semibold"
                id="btn-gen-progress-rep"
              >
                🌐 Generate Voyage progress
              </button>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono border-t border-marine-800 pt-2 italic text-left">
            * Generated logs persist until final docking.
          </div>
        </div>

      </div>

      {/* Report Popover Panel / Active Preview Editor */}
      {activeReportPreview && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="report-preview-modal">
          <div className="glass-panel max-w-xl w-full rounded-2xl overflow-hidden p-5 shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-marine-805 pb-3">
              <h5 className="font-display font-semibold text-cyan-400 text-glow-cyan text-sm uppercase">
                {activeReportPreview.title}
              </h5>
              <button
                onClick={() => setActiveReportPreview(null)}
                className="text-slate-400 hover:text-white font-sans font-bold text-sm"
                id="btn-close-report-modal"
              >
                ✕ Close
              </button>
            </div>

            <pre className="bg-slate-950 p-4 rounded border border-marine-800 font-mono text-[11px] leading-relaxed text-slate-200 overflow-y-auto max-h-80 white-space-pre-wrap">
              {activeReportPreview.body}
            </pre>

            <div className="flex gap-3 justify-end border-t border-marine-800 pt-3">
              <button
                onClick={handleSaveReport}
                className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold border border-emerald-400/30 text-xs px-4 py-2 rounded flex items-center gap-1.5"
                id="btn-save-report"
              >
                <Download className="w-3.5 h-3.5" /> File Document Locally
              </button>
              <button
                onClick={handleSendReportByEmail}
                className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold border border-cyan-400/30 text-xs px-4 py-2 rounded flex items-center gap-1.5"
                id="btn-email-report"
              >
                <Send className="w-3.5 h-3.5" /> Send to satcom Inbox
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Communications drawer Footer */}
      <div className="glass-panel p-4 rounded-xl flex flex-col justify-between">
        <div>
          <h4 className="font-display text-sm font-semibold text-cyan-400 flex items-center gap-1.5 uppercase mb-3 text-glow-cyan">
            <MessageSquare className="w-4 h-4 text-cyan-500 animate-pulse" />
            Office Admin Intercom & Satellite VHF
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Logs channel */}
            <div className="flex flex-col justify-between">
              <div>
                <span className="text-[9px] uppercase font-mono text-slate-400 mb-1 block">
                  Office Satellite Log
                </span>
                <div className="bg-slate-950/90 rounded border border-marine-800 p-2.5 h-24 overflow-y-auto space-y-1.5 font-mono text-[10px]">
                  {adminMessages.length > 0 ? (
                    adminMessages.map(m => {
                      const isOutgoing = m.sender === 'admin';
                      return (
                        <div key={m.id} className="border-b border-marine-900/50 pb-1.5">
                          <span className={isOutgoing ? 'text-cyan-400 font-bold' : 'text-amber-400 font-bold'}>
                            {isOutgoing ? 'OUTGOING ➤' : 'INCOMING ◀'} {m.sender.toUpperCase()}:
                          </span>{' '}
                          <span className="text-slate-200 whitespace-pre-line">{m.content}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-slate-600 text-center py-7 italic">No satellite transmissions recorded</div>
                  )}
                </div>
              </div>
            </div>

            {/* Interactive Alignment Sync Box */}
            <div className="bg-slate-950 p-3 rounded border border-marine-850 text-[10px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-cyan-400 font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                    <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                    Intercom Sync Challenge
                  </span>
                  <span className="text-[8px] bg-marine-900 px-1.5 text-slate-400 rounded">
                    VERIFY LOGS
                  </span>
                </div>

                {latestIncoming ? (
                  <div className="mt-1.5 space-y-1.5">
                    <p className="text-[9.5px] text-slate-400 leading-tight">
                      Teammate on <strong className="text-amber-400 uppercase">{latestIncoming.sender} STATION</strong> broadcasted. Verify logs: "In what word does the channel sync?"
                    </p>
                    
                    <form onSubmit={checkSyncChallenge} className="flex gap-1.5">
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
                    Waiting for incoming telemetry. Ask your Bridge or Engine desk to broadcast.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mode Selector Tab & Admin Telephony Prompt */}
          <div className="border-t border-marine-800/80 pt-3 mt-3">
            <div className="flex gap-2 mb-2.5">
              <button
                type="button"
                onClick={() => setActiveTab('speak')}
                className={`text-[9.5px] font-mono uppercase px-2.5 py-0.5 rounded tracking-wider cursor-pointer ${
                  activeTab === 'speak'
                    ? 'bg-cyan-900/50 text-white border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🗣 Admin Radio Script
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`text-[9.5px] font-mono uppercase px-2.5 py-0.5 rounded tracking-wider cursor-pointer ${
                  activeTab === 'code'
                    ? 'bg-cyan-900/50 text-white border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ⌨ Manual Administrative Output
              </button>
            </div>

            {activeTab === 'speak' ? (
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[9px] font-mono uppercase text-slate-400 block mb-0.5">Roleplay prompt context:</span>
                    <select
                      value={scriptScenario}
                      onChange={e => setScriptScenario(e.target.value as any)}
                      className="w-full bg-slate-900 border border-marine-700/60 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="routine">Routine manifest status report</option>
                      <option value="customs">Bermuda Customs Port clearance</option>
                      <option value="quarantine">Quarantine & crew health filing</option>
                      <option value="stores">Ships provisions & victuals check</option>
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
                      <option value="engine">To: Engine Room</option>
                      <option value="all">To: All Stations</option>
                    </select>
                  </div>
                </div>

                <div className="bg-slate-950 p-2.5 text-[10px] font-mono border border-marine-850 rounded text-slate-350 leading-relaxed max-h-20 overflow-y-auto">
                  <strong className="text-cyan-400 block mb-0.5">PURSER SCI-SOP VHF TRANSMISSION BROADCAST:</strong>
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
                <div className="flex flex-col justify-between space-y-2">
                  <form onSubmit={handleSendComms} className="flex gap-1.5">
                    <select
                      value={commsTarget}
                      onChange={e => setCommsTarget(e.target.value as any)}
                      className="bg-slate-900 border border-marine-700/60 text-xs rounded px-2 py-1 text-slate-300 focus:outline-none"
                    >
                      <option value="bridge">To: Bridge</option>
                      <option value="engine">To: Engine Room</option>
                      <option value="all">To: All Stations</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Transmit administrative query..."
                      value={commsText}
                      onChange={e => setCommsText(e.target.value)}
                      className="flex-1 bg-slate-900/80 border border-marine-700/60 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                      id="input-admin-comms"
                    />
                    <button
                      type="submit"
                      className="bg-cyan-600 hover:bg-cyan-500 p-1.5 rounded text-slate-950 font-bold flex items-center justify-center shrink-0 cursor-pointer"
                      id="btn-admin-send-comms"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>

                  {/* Quick choices */}
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-mono text-slate-500 uppercase shrink-0">templates:</span>
                    <div className="flex flex-wrap gap-1 leading-none">
                      <button
                        onClick={() => handleQuickComms("Cargo operations complete. Manifest stowed.")}
                        className="text-[9.5px] text-slate-300 bg-marine-800/40 hover:bg-marine-700/60 border border-marine-700/40 rounded px-1.5 py-0.5 cursor-pointer"
                      >
                        🗣 Cargo Complete
                      </button>
                      <button
                        onClick={() => handleQuickComms("Port quarantine cleared. Manifest submitted.")}
                        className="text-[9.5px] text-slate-300 bg-marine-800/40 hover:bg-marine-700/60 border border-marine-700/40 rounded px-1.5 py-0.5 cursor-pointer"
                      >
                        🗣 Port Cleared
                      </button>
                      <button
                        onClick={() => handleQuickComms("Draft limits survey complete. Under-keel safe.")}
                        className="text-[9.5px] text-slate-300 bg-marine-800/40 hover:bg-marine-700/60 border border-marine-700/40 rounded px-1.5 py-0.5 cursor-pointer"
                      >
                        🗣 Draft Checked
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
