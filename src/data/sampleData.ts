import type { Alert, PlatformUser, Reading, Station } from '../types';

const now = new Date('2026-06-05T10:20:00+05:30');

const windDirections = [45, 62, 80, 95, 110, 125, 140, 150];

function makeHistory(seed: number): Reading[] {
  return Array.from({ length: 36 }, (_, index) => {
    const hoursBack = 35 - index;
    const t = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);
    const wave = Math.sin((index + seed) / 4);
    const rainBurst = index % (8 + seed) === 0 ? 2.5 + seed * 0.4 : Math.max(0, wave * 0.9);

    return {
      timestamp: t.toISOString(),
      temperature: Number((25 + seed + wave * 4 + index * 0.03).toFixed(1)),
      humidity: Math.round(62 + wave * 12 + seed * 2),
      pressure: Number((1008 + seed * 1.5 + Math.cos(index / 5) * 4).toFixed(1)),
      rainfall: Number(rainBurst.toFixed(1)),
      windSpeed: Number((3.5 + seed * 0.5 + Math.abs(Math.cos(index / 3)) * 2.2).toFixed(1)),
      windDirection: windDirections[(index + seed) % windDirections.length],
      irradiance: Math.max(0, Math.round(760 + Math.sin(index / 5) * 230 - (hoursBack > 20 ? 500 : 0))),
    };
  });
}

const histories = [makeHistory(0), makeHistory(1), makeHistory(2), makeHistory(3)];

export const stations: Station[] = [
  {
    id: 'hyd-farm-01',
    name: 'Hyderabad Farm Node',
    location: 'Hyderabad, India',
    coordinates: [17.385, 78.4867],
    installationDate: '2026-06-05',
    status: 'online',
    battery: 86,
    signal: 91,
    memory: 38,
    communication: 'excellent',
    owner: 'Agriculture Research Team',
    lastCommunication: '2026-06-05T10:18:00+05:30',
    lastMaintenance: '2026-06-05',
    lastUpload: '2026-06-05T10:15:00+05:30',
    current: histories[0][35],
    history: histories[0],
  },
  {
    id: 'uav-test-02',
    name: 'UAV Corridor Station',
    location: 'Rangareddy, India',
    coordinates: [17.2403, 78.4294],
    installationDate: '2026-06-05',
    status: 'warning',
    battery: 42,
    signal: 64,
    memory: 57,
    communication: 'degraded',
    owner: 'UAV Operations',
    lastCommunication: '2026-06-05T10:05:00+05:30',
    lastMaintenance: '2026-06-05',
    lastUpload: '2026-06-05T10:00:00+05:30',
    current: histories[1][35],
    history: histories[1],
  },
  {
    id: 'ens-lab-03',
    name: 'Enschede Research Mast',
    location: 'Enschede, Netherlands',
    coordinates: [52.2215, 6.8937],
    installationDate: '2026-06-05',
    status: 'online',
    battery: 74,
    signal: 82,
    memory: 44,
    communication: 'stable',
    owner: 'Environmental Monitoring',
    lastCommunication: '2026-06-05T06:47:00Z',
    lastMaintenance: '2026-06-05',
    lastUpload: '2026-06-05T06:45:00Z',
    current: histories[2][35],
    history: histories[2],
  },
  {
    id: 'ridge-04',
    name: 'Remote Ridge Station',
    location: 'Western Ghats, India',
    coordinates: [10.0889, 77.0595],
    installationDate: '2026-06-05',
    status: 'offline',
    battery: 18,
    signal: 8,
    memory: 72,
    communication: 'lost',
    owner: 'Smart Infrastructure',
    lastCommunication: '2026-06-05T08:41:00+05:30',
    lastMaintenance: '2026-06-05',
    lastUpload: '2026-06-05T08:40:00+05:30',
    current: histories[3][35],
    history: histories[3],
  },
];

export const alerts: Alert[] = [
  {
    id: 'a-001',
    stationId: 'ridge-04',
    title: 'Communication failure detected',
    type: 'communication',
    severity: 'critical',
    timestamp: '2026-06-05T08:48:00+05:30',
    resolved: false,
  },
  {
    id: 'a-002',
    stationId: 'uav-test-02',
    title: 'Battery below operator threshold',
    type: 'battery',
    severity: 'warning',
    timestamp: '2026-06-05T09:40:00+05:30',
    resolved: false,
  },
  {
    id: 'a-003',
    stationId: 'hyd-farm-01',
    title: 'Rain probability increasing',
    type: 'weather',
    severity: 'info',
    timestamp: '2026-06-05T10:01:00+05:30',
    resolved: true,
  },
];

export const users: PlatformUser[] = [
  { id: 'u1', name: 'Anika Rao', username: 'anika', email: 'anika@example.com', password: 'Weather@2026', role: 'Admin', status: 'active', stationAccess: ['all'] },
  { id: 'u2', name: 'Vikram Sen', username: 'vikram', email: 'vikram@example.com', password: 'Weather@2026', role: 'Operator', status: 'active', stationAccess: ['hyd-farm-01', 'uav-test-02'] },
  { id: 'u3', name: 'Mila Bosch', username: 'mila', email: 'mila@example.com', password: 'Weather@2026', role: 'User', status: 'active', stationAccess: ['ens-lab-03'] },
  { id: 'u4', name: 'Ravi Kumar', username: 'ravi', email: 'ravi@example.com', password: 'Weather@2026', role: 'User', status: 'suspended', stationAccess: ['ridge-04'] },
];
