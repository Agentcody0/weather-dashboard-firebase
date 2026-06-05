import type { Reading } from '../types';

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function cardinalDirection(degrees: number) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.round(degrees / 45) % 8];
}

export function getTrend(readings: Reading[], key: keyof Omit<Reading, 'timestamp'>) {
  const recent = readings.slice(-6);
  const first = recent[0]?.[key] ?? 0;
  const last = recent[recent.length - 1]?.[key] ?? 0;
  const delta = Number(last) - Number(first);
  if (Math.abs(delta) < 0.6) return 'stable';
  return delta > 0 ? 'rising' : 'decreasing';
}

export function statusClass(status: string) {
  if (status === 'online' || status === 'excellent' || status === 'stable') return 'bg-emerald-500';
  if (status === 'warning' || status === 'degraded') return 'bg-amber-400';
  return 'bg-red-500';
}
