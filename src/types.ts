export type StationType = 'bridge' | 'engine' | 'admin' | 'overview' | 'remote';

export interface InterSystemMessage {
  id: string;
  timestamp: string;
  sender: StationType;
  receiver: 'bridge' | 'engine' | 'admin' | 'all';
  content: string;
  isRead: boolean;
}

export interface SimulationEvent {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  system: 'bridge' | 'engine' | 'admin';
  level: 'warning' | 'critical';
  acknowledged: boolean;
}

export interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  reached: boolean;
}

export interface CargoItem {
  id: string;
  containerId: string;
  type: string;
  weight: number; // in metric tons
  destination: string;
  status: 'Pending' | 'Loaded' | 'In Transit' | 'Stowed' | 'Discharged';
}

export interface CrewMember {
  id: string;
  name: string;
  rank: string;
  status: 'On Duty' | 'Off Duty' | 'Standby';
}

export interface EmailMessage {
  id: string;
  sender: string;
  subject: string;
  body: string;
  timestamp: string;
  read: boolean;
}
