import { alerts as sampleAlerts, stations as sampleStations, users as sampleUsers } from '../data/sampleData';
import type { Alert, RangeKey, Reading, Station, StationStatus } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;
const JWT_TOKEN = import.meta.env.VITE_JWT_TOKEN as string | undefined;
const FIREBASE_DATABASE_URL = import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined;
const FIREBASE_DATABASE_SECRET = import.meta.env.VITE_FIREBASE_DATABASE_SECRET as string | undefined;
const FIREBASE_STATIONS_PATH = (import.meta.env.VITE_FIREBASE_STATIONS_PATH as string | undefined) ?? 'stations';
const FIREBASE_READINGS_PATH = (import.meta.env.VITE_FIREBASE_READINGS_PATH as string | undefined) ?? 'readings';
const FIREBASE_ALERTS_PATH = (import.meta.env.VITE_FIREBASE_ALERTS_PATH as string | undefined) ?? 'alerts';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const INSTALLATION_DATE = '2026-06-05';

interface SupabaseStationRow {
  id: string;
  name: string;
  location: string;
  status: string | null;
  battery: number | null;
  signal: number | null;
  last_upload: string | null;
}

interface SupabaseReadingRow {
  id: number;
  station_id: string;
  altitude: number | null;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  rain: boolean | number | string | null;
  rainfall: number | null;
  light: boolean | number | string | null;
  wind_speed: number | null;
  wind_direction: number | null;
  wind_direction_pct: number | null;
  irradiance: number | null;
  created_at: string;
}

type FirebaseValue = string | number | boolean | null | FirebaseObject | FirebaseValue[];
interface FirebaseObject {
  [key: string]: FirebaseValue;
}

interface FirebaseReading {
  timestamp?: string;
  created_at?: string;
  time?: string;
  altitude?: number | string;
  temperature?: number | string;
  humidity?: number | string;
  pressure?: number | string;
  rainfall?: number | string;
  rain?: number | string | boolean;
  light?: boolean;
  windSpeed?: number | string;
  wind_speed?: number | string;
  windDirection?: number | string;
  wind_direction?: number | string;
  wind_direction_pct?: number | string;
  irradiance?: number | string;
}

interface FirebaseStation {
  id?: string;
  name?: string;
  location?: string;
  latitude?: number | string;
  longitude?: number | string;
  lat?: number | string;
  lng?: number | string;
  altitude?: number | string;
  temperature?: number | string;
  humidity?: number | string;
  pressure?: number | string;
  rainfall?: number | string;
  rain?: number | string | boolean;
  light?: boolean;
  windSpeed?: number | string;
  wind_speed?: number | string;
  windDirection?: number | string;
  wind_direction?: number | string;
  wind_direction_pct?: number | string;
  irradiance?: number | string;
  coordinates?: [number, number];
  installationDate?: string;
  installedDate?: string;
  installed_date?: string;
  status?: string;
  battery?: number | string;
  signal?: number | string;
  memory?: number | string;
  communication?: Station['communication'];
  owner?: string;
  lastCommunication?: string;
  last_communication?: string;
  lastMaintenance?: string;
  last_maintenance?: string;
  lastUpload?: string;
  last_upload?: string;
  current?: FirebaseReading;
  history?: Record<string, FirebaseReading> | FirebaseReading[];
  readings?: Record<string, FirebaseReading> | FirebaseReading[];
}

interface FirebaseAlert {
  id?: string;
  stationId?: string;
  station_id?: string;
  title?: string;
  type?: Alert['type'];
  severity?: Alert['severity'];
  timestamp?: string;
  created_at?: string;
  resolved?: boolean;
}

async function request<T>(path: string): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('No API configured');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(JWT_TOKEN ? { Authorization: `Bearer ${JWT_TOKEN}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function firebaseRequest<T>(path: string): Promise<T> {
  if (!FIREBASE_DATABASE_URL) {
    throw new Error('No Firebase Realtime Database configured');
  }

  const cleanBase = FIREBASE_DATABASE_URL.replace(/\/$/, '');
  const cleanPath = path.replace(/^\/|\/$/g, '');
  const authQuery = FIREBASE_DATABASE_SECRET ? `?auth=${encodeURIComponent(FIREBASE_DATABASE_SECRET)}` : '';
  const response = await fetch(`${cleanBase}/${cleanPath}.json${authQuery}`);

  if (!response.ok) {
    throw new Error(`Firebase request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function supabaseRequest<T>(path: string): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('No Supabase project configured');
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function normalizeStatus(status: string | null): StationStatus {
  if (status === 'offline' || status === 'warning' || status === 'online') return status;
  return 'online';
}

function mapReading(row: SupabaseReadingRow): Reading {
  const rainfall = Number(row.rainfall ?? 0);
  const windDirection = Number(row.wind_direction ?? row.wind_direction_pct ?? 0);
  return {
    timestamp: row.created_at,
    altitude: Number(row.altitude ?? 0),
    temperature: Number(row.temperature ?? 0),
    humidity: Number(row.humidity ?? 0),
    pressure: Number(row.pressure ?? 0),
    rain: booleanFrom(row.rain, rainfall > 0),
    rainfall,
    light: booleanFrom(row.light, Number(row.irradiance ?? 0) > 0),
    windSpeed: Number(row.wind_speed ?? 0),
    windDirection,
    windDirectionLabel: '---',
    windDirectionPct: Number(row.wind_direction_pct ?? windDirection),
    irradiance: Number(row.irradiance ?? 0),
  };
}

function fallbackStationDetails(id: string) {
  return sampleStations.find((station) => station.id === id) ?? sampleStations[0];
}

function numberFrom(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function booleanFrom(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    const cleanValue = value.trim().toLowerCase();
    if (cleanValue === 'true') return true;
    if (cleanValue === 'false') return false;
    const numberValue = Number(cleanValue);
    if (Number.isFinite(numberValue)) return numberValue > 0;
  }
  return fallback;
}

function recordValues<T>(value: Record<string, T> | T[] | null | undefined): Array<T & { id?: string }> {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item, index) => ({ ...item, id: String(index) }));
  return Object.entries(value).map(([id, item]) => ({ ...item, id }));
}

function isSingleFirebaseStation(value: unknown): value is FirebaseStation {
  if (!value || Array.isArray(value) || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return ['temperature', 'humidity', 'pressure', 'rain', 'rainfall', 'wind_direction', 'wind_direction_pct', 'altitude'].some((key) => key in record);
}

function mapFirebaseReading(reading: FirebaseReading): Reading {
  const timestamp = reading.timestamp ?? reading.created_at ?? reading.time ?? new Date().toISOString();
  const rain = booleanFrom(reading.rain, numberFrom(reading.rainfall) > 0);
  const light = booleanFrom(reading.light, numberFrom(reading.irradiance) > 0);
  const windDirectionValue = reading.windDirection ?? reading.wind_direction;
  const windDirection = numberFrom(windDirectionValue ?? reading.wind_direction_pct);
  const windDirectionLabel = typeof windDirectionValue === 'string' && !Number.isFinite(Number(windDirectionValue)) ? windDirectionValue : '---';
  return {
    timestamp,
    altitude: numberFrom(reading.altitude),
    temperature: numberFrom(reading.temperature),
    humidity: numberFrom(reading.humidity),
    pressure: numberFrom(reading.pressure),
    rain,
    rainfall: rain ? numberFrom(reading.rainfall, 1) : 0,
    light,
    windSpeed: numberFrom(reading.windSpeed ?? reading.wind_speed),
    windDirection,
    windDirectionLabel,
    windDirectionPct: numberFrom(reading.wind_direction_pct, windDirection),
    irradiance: light ? numberFrom(reading.irradiance, 1000) : 0,
  };
}

function sortReadings(readings: Reading[]) {
  return readings.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

function readingsForStation(stationId: string, station: FirebaseStation, allReadings: FirebaseObject | FirebaseReading[] | null) {
  const stationReadings = station.history ?? station.readings;
  if (stationReadings) return sortReadings(recordValues(stationReadings).map(mapFirebaseReading));

  if (Array.isArray(allReadings)) {
    return sortReadings(
      allReadings
        .filter((reading) => (reading as FirebaseReading & { stationId?: string; station_id?: string }).stationId === stationId || (reading as FirebaseReading & { stationId?: string; station_id?: string }).station_id === stationId)
        .map(mapFirebaseReading),
    );
  }

  const stationBucket = allReadings?.[stationId] as Record<string, FirebaseReading> | FirebaseReading[] | undefined;
  return sortReadings(recordValues(stationBucket).map(mapFirebaseReading));
}

function normalizeCommunication(value: unknown, status: StationStatus): Station['communication'] {
  if (value === 'excellent' || value === 'stable' || value === 'degraded' || value === 'lost') return value;
  return status === 'offline' ? 'lost' : status === 'warning' ? 'degraded' : 'stable';
}

async function getFirebaseStations(): Promise<Station[]> {
  const [stationPayload, readingPayload] = await Promise.all([
    firebaseRequest<Record<string, FirebaseStation> | FirebaseStation[] | FirebaseStation>(FIREBASE_STATIONS_PATH),
    firebaseRequest<FirebaseObject | FirebaseReading[] | null>(FIREBASE_READINGS_PATH).catch(() => null),
  ]);
  const stations = isSingleFirebaseStation(stationPayload) ? [{ ...stationPayload, id: stationPayload.id ?? 'weather-station' }] : recordValues(stationPayload);
  if (!stations.length) {
    throw new Error('No Firebase stations found');
  }

  return stations.map((row) => {
    const id = row.id ?? `station-${Date.now()}`;
    const fallback = fallbackStationDetails(id);
    const history = readingsForStation(id, row, readingPayload);
    const directReading = mapFirebaseReading(row);
    const current = row.current ? mapFirebaseReading({ ...row, ...row.current }) : history[history.length - 1] ?? directReading ?? fallback.current;
    const status = normalizeStatus(row.status ?? null);
    const latitude = numberFrom(row.latitude ?? row.lat, fallback.coordinates[0]);
    const longitude = numberFrom(row.longitude ?? row.lng, fallback.coordinates[1]);

    return {
      id,
      name: row.name ?? fallback.name,
      location: row.location ?? fallback.location,
      coordinates: row.coordinates ?? [latitude, longitude],
      installationDate: row.installationDate ?? row.installedDate ?? row.installed_date ?? INSTALLATION_DATE,
      status,
      battery: numberFrom(row.battery, fallback.battery),
      signal: numberFrom(row.signal, fallback.signal),
      memory: numberFrom(row.memory, fallback.memory),
      communication: normalizeCommunication(row.communication, status),
      owner: row.owner ?? fallback.owner,
      lastCommunication: row.lastCommunication ?? row.last_communication ?? row.lastUpload ?? row.last_upload ?? current.timestamp,
      lastMaintenance: row.lastMaintenance ?? row.last_maintenance ?? INSTALLATION_DATE,
      lastUpload: row.lastUpload ?? row.last_upload ?? current.timestamp,
      current,
      history: history.length ? history : fallback.history,
    };
  });
}

async function getSupabaseStations(): Promise<Station[]> {
  const [stationRows, readingRows] = await Promise.all([
    supabaseRequest<SupabaseStationRow[]>('stations?select=*&order=id.asc'),
    supabaseRequest<SupabaseReadingRow[]>('readings?select=*&order=created_at.asc&limit=500'),
  ]);

  return stationRows.map((row) => {
    const fallback = fallbackStationDetails(row.id);
    const history = readingRows.filter((reading) => reading.station_id === row.id).map(mapReading);
    const current = history[history.length - 1] ?? fallback.current;
    const status = normalizeStatus(row.status);

    return {
      id: row.id,
      name: row.name,
      location: row.location,
      coordinates: fallback.coordinates,
      installationDate: fallback.installationDate,
      status,
      battery: Number(row.battery ?? fallback.battery),
      signal: Number(row.signal ?? fallback.signal),
      memory: fallback.memory,
      communication: status === 'offline' ? 'lost' : Number(row.signal ?? 100) < 50 ? 'degraded' : 'stable',
      owner: fallback.owner,
      lastCommunication: row.last_upload ?? current.timestamp,
      lastMaintenance: fallback.lastMaintenance,
      lastUpload: row.last_upload ?? current.timestamp,
      current,
      history: history.length ? history : fallback.history,
    };
  });
}

export async function getStations(): Promise<Station[]> {
  try {
    return await getFirebaseStations();
  } catch {
    // Continue to Supabase/FastAPI/sample fallback below.
  }

  try {
    return await getSupabaseStations();
  } catch {
    // Continue to FastAPI/sample fallback below.
  }

  try {
    return await request<Station[]>('/stations');
  } catch {
    return sampleStations;
  }
}

export async function getStationHistory(stationId: string, range: RangeKey) {
  const limit = range === '24h' ? 24 : range === '7d' ? 168 : 500;
  try {
    const station = await firebaseRequest<FirebaseStation>(`${FIREBASE_STATIONS_PATH}/${stationId}`).catch(() => null);
    const readings = await firebaseRequest<FirebaseObject | FirebaseReading[] | null>(`${FIREBASE_READINGS_PATH}/${stationId}`).catch(() => null);
    const stationReadings = readings as Record<string, FirebaseReading> | FirebaseReading[] | null;
    const history = station ? readingsForStation(stationId, station, readings) : sortReadings(recordValues(stationReadings).map(mapFirebaseReading));
    if (history.length) return history.slice(-limit);
  } catch {
    // Continue to Supabase/FastAPI/sample fallback below.
  }

  try {
    const readings = await supabaseRequest<SupabaseReadingRow[]>(
      `readings?select=*&station_id=eq.${stationId}&order=created_at.desc&limit=${limit}`,
    );
    return readings.reverse().map(mapReading);
  } catch {
    // Continue to FastAPI/sample fallback below.
  }

  try {
    return await request<Station['history']>(`/stations/${stationId}/readings/history?range=${range}`);
  } catch {
    return sampleStations.find((station) => station.id === stationId)?.history ?? [];
  }
}

export async function getAlerts(): Promise<Alert[]> {
  try {
    const alerts = await firebaseRequest<Record<string, FirebaseAlert> | FirebaseAlert[]>(FIREBASE_ALERTS_PATH);
    return recordValues(alerts).map((alert) => ({
      id: alert.id ?? `alert-${Date.now()}`,
      stationId: alert.stationId ?? alert.station_id ?? sampleStations[0].id,
      title: alert.title ?? 'Station notification',
      type: alert.type ?? 'sensor',
      severity: alert.severity ?? 'info',
      timestamp: alert.timestamp ?? alert.created_at ?? new Date().toISOString(),
      resolved: Boolean(alert.resolved),
    }));
  } catch {
    // Continue to FastAPI/sample fallback below.
  }

  try {
    return await request<Alert[]>('/alerts');
  } catch {
    return sampleAlerts;
  }
}

export async function getSystemAnalytics() {
  try {
    const stations = await getFirebaseStations();
    const today = new Date().toISOString().slice(0, 10);
    return {
      totalStations: stations.length,
      activeStations: stations.filter((station) => station.status === 'online').length,
      offlineStations: stations.filter((station) => station.status === 'offline').length,
      totalUsers: sampleUsers.length,
      dataUploadsToday: stations.flatMap((station) => station.history).filter((reading) => reading.timestamp.startsWith(today)).length,
      systemUptime: 'Live via Firebase',
    };
  } catch {
    // Continue to Supabase/FastAPI/sample fallback below.
  }

  try {
    const [stationRows, readingRows] = await Promise.all([
      supabaseRequest<SupabaseStationRow[]>('stations?select=id,status'),
      supabaseRequest<SupabaseReadingRow[]>('readings?select=id,created_at&order=created_at.desc&limit=1000'),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    return {
      totalStations: stationRows.length,
      activeStations: stationRows.filter((station) => normalizeStatus(station.status) === 'online').length,
      offlineStations: stationRows.filter((station) => normalizeStatus(station.status) === 'offline').length,
      totalUsers: sampleUsers.length,
      dataUploadsToday: readingRows.filter((reading) => reading.created_at.startsWith(today)).length,
      systemUptime: 'Live via Supabase',
    };
  } catch {
    // Continue to FastAPI/sample fallback below.
  }

  try {
    return await request<Record<string, number | string>>('/system/analytics');
  } catch {
    return {
      totalStations: sampleStations.length,
      activeStations: sampleStations.filter((station) => station.status === 'online').length,
      offlineStations: sampleStations.filter((station) => station.status === 'offline').length,
      totalUsers: sampleUsers.length,
      dataUploadsToday: 284,
      systemUptime: '99.92%',
    };
  }
}

export const polling = {
  fast: Number(import.meta.env.VITE_FAST_POLL_MS ?? 30000),
  slow: Number(import.meta.env.VITE_SLOW_POLL_MS ?? 300000),
};
