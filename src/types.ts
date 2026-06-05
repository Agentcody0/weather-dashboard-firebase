export type Role = 'User' | 'Operator' | 'Admin';
export type StationStatus = 'online' | 'offline' | 'warning';
export type RangeKey = '24h' | '7d' | '30d' | 'custom';

export interface Reading {
  timestamp: string;
  temperature: number;
  humidity: number;
  pressure: number;
  rainfall: number;
  windSpeed: number;
  windDirection: number;
  irradiance: number;
}

export interface Station {
  id: string;
  name: string;
  location: string;
  coordinates: [number, number];
  installationDate: string;
  status: StationStatus;
  battery: number;
  signal: number;
  memory: number;
  communication: 'excellent' | 'stable' | 'degraded' | 'lost';
  owner: string;
  lastCommunication: string;
  lastMaintenance: string;
  lastUpload: string;
  current: Reading;
  history: Reading[];
}

export interface Alert {
  id: string;
  stationId: string;
  title: string;
  type: 'sensor' | 'battery' | 'communication' | 'weather';
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
  resolved: boolean;
}

export interface PlatformUser {
  id: string;
  name: string;
  username: string;
  email: string;
  password: string;
  role: Role;
  status: 'active' | 'suspended';
  stationAccess: string[];
}
