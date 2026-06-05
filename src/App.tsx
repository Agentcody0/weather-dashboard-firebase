import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CloudSun,
  Compass,
  Database,
  Gauge,
  Home,
  KeyRound,
  Lock,
  Map as MapIcon,
  Moon,
  Radio,
  RefreshCw,
  Settings,
  Shield,
  SlidersHorizontal,
  Sun,
  ThermometerSun,
  Users,
  Wind,
  Wrench,
} from 'lucide-react';
import { divIcon } from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getAlerts, getStations, getSystemAnalytics, polling } from './services/api';
import type { Alert, PlatformUser, RangeKey, Role, Station } from './types';
import { formatDateTime, getTrend, statusClass } from './utils/weather';
import { stations as sampleStations, users as sampleUsers } from './data/sampleData';

const navByRole: Record<Role, string[]> = {
  User: ['Overview', 'Live Weather', 'Analytics', 'Forecast', 'Stations', 'Map', 'Station Details', 'Alerts', 'About'],
  Operator: ['Overview', 'Live Weather', 'Analytics', 'Forecast', 'Stations', 'Map', 'Station Details', 'Alerts', 'Control', 'Health', 'Diagnostics', 'Maintenance', 'Users', 'Access', 'About'],
  Admin: [
    'Overview',
    'Live Weather',
    'Analytics',
    'Forecast',
    'Stations',
    'Map',
    'Station Details',
    'Alerts',
    'Control',
    'Health',
    'Diagnostics',
    'Maintenance',
    'Users',
    'Station Admin',
    'Access',
    'System',
    'About',
  ],
};

const navIcons: Record<string, typeof Home> = {
  Overview: Home,
  'Live Weather': Activity,
  Analytics: BarChart3,
  Forecast: CloudSun,
  Stations: Radio,
  Map: MapIcon,
  'Station Details': Database,
  Alerts: AlertTriangle,
  Control: SlidersHorizontal,
  Health: Gauge,
  Diagnostics: Wrench,
  Maintenance: Wrench,
  Users,
  'Station Admin': Settings,
  Access: KeyRound,
  System: Shield,
  About: Users,
};

const demoCredentials = {
  username: 'LogixAir1',
  password: 'LogixAir1',
};

const userStorageKey = 'weather-dashboard-users';

function loadStoredUsers() {
  try {
    const stored = window.localStorage.getItem(userStorageKey);
    if (!stored) return sampleUsers;
    const parsed = JSON.parse(stored) as PlatformUser[];
    return Array.isArray(parsed) && parsed.length ? parsed : sampleUsers;
  } catch {
    return sampleUsers;
  }
}

const roleThemes: Record<Role, { header: string; accent: string; soft: string; label: string }> = {
  User: {
    header: 'bg-brand-blue',
    accent: 'border-brand-blue text-brand-blue dark:border-sky-500 dark:text-sky-300',
    soft: 'bg-brand-fog dark:bg-slate-900',
    label: 'Monitoring workspace',
  },
  Operator: {
    header: 'bg-emerald-700',
    accent: 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300',
    soft: 'bg-emerald-50 dark:bg-emerald-950/30',
    label: 'Station operations workspace',
  },
  Admin: {
    header: 'bg-slate-900',
    accent: 'border-amber-500 text-amber-700 dark:border-amber-300 dark:text-amber-300',
    soft: 'bg-amber-50 dark:bg-amber-950/30',
    label: 'Administration workspace',
  },
};

const teamMembers = [
  { serial: 1, team: 1, name: 'V.S.S. Vasanth', registerNumber: 'BL.EN.U4ELC24037' },
  { serial: 2, team: 1, name: 'Mihir Pasupuleti', registerNumber: 'AM.SC.U4CSE23340' },
  { serial: 3, team: 1, name: 'Parshw Akkappa Khatagalli', registerNumber: 'BL.EN.U4ECE24140' },
  { serial: 4, team: 1, name: 'Arjun P', registerNumber: 'BL.EN.U4ECE24006' },
  { serial: 5, team: 1, name: 'Vijay Surya S', registerNumber: 'BL.EN.U4ECE23158' },
  { serial: 6, team: 2, name: 'PARVATHI B NAIR', registerNumber: 'BL.EN.U4ELC24026' },
  { serial: 7, team: 2, name: 'Kothinti Harshitha', registerNumber: 'BL.SC.U4CSE24022' },
  { serial: 8, team: 2, name: 'Molleti Sri Sai Sreeja', registerNumber: 'BL.SC.U4CSE24029' },
  { serial: 9, team: 2, name: 'K S L Shivali Meghana', registerNumber: 'BL.EN.U4EEE24018' },
  { serial: 10, team: 2, name: 'Sure Mahitha', registerNumber: 'BL.EN.U4ECE23146' },
  { serial: 11, team: 3, name: 'Keshetty Vishal', registerNumber: 'BL.EN.U4ECE24030' },
  { serial: 12, team: 3, name: 'T Lohita', registerNumber: 'BL.EN.U4ECE24053' },
  { serial: 13, team: 3, name: 'Benazir K', registerNumber: 'BL.EN.U4EEE24011' },
  { serial: 14, team: 3, name: 'Kerubakar B', registerNumber: 'BL.EN.U4ELC24019' },
  { serial: 15, team: 3, name: 'P Vineeth Anand', registerNumber: 'BL.SC.U4ECE23032' },
  { serial: 16, team: 3, name: 'Chinmay', registerNumber: 'BL.EN.U4ELC24043' },
];

function App() {
  const [dark, setDark] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [role, setRole] = useState<Role>('Admin');
  const [page, setPage] = useState('Overview');
  const [range, setRange] = useState<RangeKey>('24h');
  const [stations, setStations] = useState<Station[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, number | string>>({});
  const [activeStationId, setActiveStationId] = useState('hyd-farm-01');
  const [manualRefreshKey, setManualRefreshKey] = useState(0);
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>(loadStoredUsers);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  useEffect(() => {
    window.localStorage.setItem(userStorageKey, JSON.stringify(platformUsers));
  }, [platformUsers]);

  useEffect(() => {
    let alive = true;

    const loadFastData = async () => {
      const [stationData, alertData] = await Promise.all([getStations(), getAlerts()]);
      if (!alive) return;
      setStations(stationData);
      setAlerts(alertData);
      if (!stationData.some((station) => station.id === activeStationId)) {
        setActiveStationId(stationData[0]?.id ?? '');
      }
    };

    const loadSlowData = async () => {
      const systemData = await getSystemAnalytics();
      if (alive) setAnalytics({ ...systemData, totalUsers: platformUsers.length });
    };

    loadFastData();
    loadSlowData();
    const fastTimer = window.setInterval(loadFastData, polling.fast);
    const slowTimer = window.setInterval(loadSlowData, polling.slow);

    return () => {
      alive = false;
      window.clearInterval(fastTimer);
      window.clearInterval(slowTimer);
    };
  }, [activeStationId, manualRefreshKey, platformUsers.length]);

  const activeStation = stations.find((station) => station.id === activeStationId) ?? stations[0];
  const visibleNav = navByRole[role];
  const roleTheme = roleThemes[role];

  useEffect(() => {
    if (!visibleNav.includes(page)) setPage('Overview');
  }, [page, visibleNav]);

  const chartData = useMemo(() => {
    const history = activeStation?.history ?? [];
    const size = range === '24h' ? 24 : range === '7d' ? 32 : range === '30d' ? 36 : 18;
    return history.slice(-size).map((reading) => ({
      ...reading,
      rainValue: reading.rain ? 1 : 0,
      lightValue: reading.light ? 1 : 0,
      time: new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(reading.timestamp)),
    }));
  }, [activeStation, range]);

  if (!authenticated) {
    return <LoginPage dark={dark} setDark={setDark} users={platformUsers} setRole={setRole} onLogin={() => setAuthenticated(true)} />;
  }

  if (!activeStation) {
    return (
      <div className="min-h-screen bg-brand-fog p-8 text-brand-ink">
        <p className="font-semibold">Loading Team 3 Dashboard Model...</p>
        <button
          onClick={() => {
            setStations(sampleStations);
            setActiveStationId(sampleStations[0].id);
          }}
          className="mt-4 rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-sky"
        >
          Open demo dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <Header role={role} dark={dark} setDark={setDark} onLogout={() => setAuthenticated(false)} />
      <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[250px_1fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-3 shadow-panel dark:border-slate-800 dark:bg-slate-900">
          <div className={`mb-3 rounded-md border px-3 py-3 text-sm font-semibold ${roleTheme.soft} ${roleTheme.accent}`}>
            Signed in as {role}
          </div>
          <nav className="grid gap-1">
            {visibleNav.map((item) => {
              const Icon = navIcons[item] ?? Home;
              return (
                <button
                  key={item}
                  onClick={() => setPage(item)}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition ${
                    page === item ? `${roleTheme.soft} ${roleTheme.accent}` : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item}
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0">
          <RoleBanner role={role} />
          <Toolbar station={activeStation} stations={stations} onStationChange={setActiveStationId} role={role} />
          {page === 'Overview' && <Overview station={activeStation} alerts={alerts} stations={stations} role={role} />}
          {page === 'Live Weather' && <LiveWeather station={activeStation} role={role} />}
          {page === 'Analytics' && <Analytics station={activeStation} chartData={chartData} range={range} setRange={setRange} />}
          {page === 'Forecast' && <Forecast station={activeStation} />}
          {page === 'Stations' && <StationMonitoring stations={stations} activeStationId={activeStation.id} setActiveStationId={setActiveStationId} role={role} />}
          {page === 'Map' && <MapView stations={stations} setActiveStationId={setActiveStationId} role={role} />}
          {page === 'Station Details' && <StationDetails station={activeStation} chartData={chartData} role={role} />}
          {page === 'Alerts' && <Alerts alerts={alerts} stations={stations} role={role} />}
          {page === 'Control' && <ControlPanel station={activeStation} onRefresh={() => setManualRefreshKey((value) => value + 1)} />}
          {page === 'Health' && <Health station={activeStation} />}
          {page === 'Diagnostics' && <Diagnostics station={activeStation} />}
          {page === 'Maintenance' && <Maintenance station={activeStation} />}
          {page === 'Users' && <UserManagement users={platformUsers} setUsers={setPlatformUsers} />}
          {page === 'Station Admin' && <StationAdmin stations={stations} />}
          {page === 'Access' && <AccessControl />}
          {page === 'System' && <SystemAnalytics analytics={analytics} />}
          {page === 'About' && <AboutSection />}
        </section>
      </main>
      <LandingSection />
      <Footer />
    </div>
  );
}

function LoginPage({ dark, setDark, users, setRole, onLogin }: { dark: boolean; setDark: (value: boolean) => void; users: PlatformUser[]; setRole: (role: Role) => void; onLogin: () => void }) {
  const [selectedRole, setSelectedRole] = useState<Role>('User');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const selectedTheme = roleThemes[selectedRole];

  const submitLogin = () => {
    if (username === demoCredentials.username && password === demoCredentials.password) {
      setRole(selectedRole);
      onLogin();
      return;
    }

    const account = users.find((user) => user.status === 'active' && (user.username === username.trim() || user.email === username.trim()) && user.password === password);
    if (account) {
      setRole(account.role);
      onLogin();
      return;
    }

    setError('Invalid username or password.');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-white/10 bg-brand-blue text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <BrandBlock />
          <button
            onClick={() => setDark(!dark)}
            aria-label="Toggle theme"
            title="Toggle theme"
            className="grid h-10 w-10 place-items-center rounded-md bg-white/10 hover:bg-white/20"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>
      <main className="mx-auto grid min-h-[calc(100vh-72px)] max-w-7xl items-center gap-8 px-4 py-8 lg:grid-cols-[1fr_460px]">
        <section>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-blue">Off-Grid IoT Weather Platform</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight md:text-5xl">Team 3 Dashboard Model</h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            A modern dashboard model for remote weather stations with live readings, analytics, map monitoring, operator controls, admin access, alerts, and Firebase-ready cloud updates.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {(['User', 'Operator', 'Admin'] as Role[]).map((roleOption) => (
              <button
                key={roleOption}
                onClick={() => setSelectedRole(roleOption)}
                className={`rounded-lg border p-4 text-left shadow-panel transition hover:-translate-y-0.5 ${
                  selectedRole === roleOption
                    ? `${roleThemes[roleOption].soft} ${roleThemes[roleOption].accent}`
                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                <Shield className="mb-3 h-5 w-5" />
                <strong>{roleOption} Sign In</strong>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {roleOption === 'User' ? 'Monitoring access' : roleOption === 'Operator' ? 'Station control access' : 'Full admin access'}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className={`rounded-lg border bg-white p-6 shadow-panel dark:bg-slate-900 ${selectedTheme.accent}`}>
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-md bg-brand-fog text-brand-blue dark:bg-slate-800 dark:text-sky-300">
              <Lock className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold">{selectedRole} Dashboard Login</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Select a role, then sign in.</p>
            </div>
          </div>
          <label className="text-sm font-semibold" htmlFor="username">Username</label>
          <input
            id="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="mt-2 w-full rounded-md border border-slate-200 bg-transparent px-3 py-3 dark:border-slate-700"
          />
          <label className="mt-4 block text-sm font-semibold" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submitLogin();
            }}
            className="mt-2 w-full rounded-md border border-slate-200 bg-transparent px-3 py-3 dark:border-slate-700"
          />
          {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
          <button onClick={submitLogin} className={`mt-5 w-full rounded-md px-5 py-3 font-semibold text-white hover:opacity-90 ${selectedTheme.header}`}>
            Open {selectedRole} Dashboard
          </button>
        </section>
      </main>
      <AboutSection />
      <Footer />
    </div>
  );
}

function BrandBlock() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-md bg-white text-xl font-black text-brand-blue">T3</div>
      <div>
        <p className="text-xl font-semibold tracking-wide">Team 3 Dashboard Model</p>
        <p className="text-xs text-sky-100">Off-Grid IoT Weather Intelligence</p>
      </div>
    </div>
  );
}

function Header({ role, dark, setDark, onLogout }: { role: Role; dark: boolean; setDark: (value: boolean) => void; onLogout: () => void }) {
  const theme = roleThemes[role];

  return (
    <header className={`sticky top-0 z-20 border-b border-white/10 text-white shadow-lg ${theme.header}`}>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <BrandBlock />
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-white/25 bg-white/10 px-3 py-2 text-sm font-semibold">{role}</span>
          <button onClick={onLogout} className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-brand-blue hover:bg-sky-50">Logout</button>
          <button
            onClick={() => setDark(!dark)}
            aria-label="Toggle theme"
            title="Toggle theme"
            className="grid h-10 w-10 place-items-center rounded-md bg-white/10 hover:bg-white/20"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}

function RoleBanner({ role }: { role: Role }) {
  const theme = roleThemes[role];
  const details = {
    User: 'Focused on weather monitoring, station comparison, forecasts, maps, and alert visibility.',
    Operator: 'Adds station control, health monitoring, diagnostics, maintenance logs, and field actions.',
    Admin: 'Adds user management, station administration, access control, and complete system analytics.',
  };

  return (
    <div className={`mb-5 rounded-lg border p-4 shadow-panel ${theme.soft} ${theme.accent}`}>
      <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide">{theme.label}</p>
          <h2 className="text-2xl font-bold">{role} Dashboard</h2>
        </div>
        <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">{details[role]}</p>
      </div>
    </div>
  );
}

function Toolbar({ station, stations, onStationChange, role }: { station: Station; stations: Station[]; onStationChange: (id: string) => void; role: Role }) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Active station</p>
        <h1 className="text-2xl font-bold">{station.name}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{station.location}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select value={station.id} onChange={(event) => onStationChange(event.target.value)} className="rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700">
          {stations.map((item) => (
            <option key={item.id} value={item.id} className="text-slate-900">
              {item.name}
            </option>
          ))}
        </select>
        {role !== 'User' && <span className="rounded-md bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800">Updated {formatDateTime(station.lastUpload)}</span>}
      </div>
    </div>
  );
}

function modelReadingRows(reading: Station['current']) {
  return [
    ['altitude', reading.altitude],
    ['humidity', reading.humidity],
    ['light', String(reading.light)],
    ['pressure', reading.pressure],
    ['rain', String(reading.rain)],
    ['temperature', reading.temperature],
    ['wind_direction', reading.windDirectionLabel],
    ['wind_direction_pct', reading.windDirectionPct],
  ] as const;
}

function visibleAlertsForRole(alerts: Alert[], role: Role) {
  return role === 'User' ? alerts.filter((alert) => alert.type === 'weather' || alert.type === 'sensor') : alerts;
}

function Overview({ station, alerts, stations, role }: { station: Station; alerts: Alert[]; stations: Station[]; role: Role }) {
  const reading = station.current;
  const visibleAlerts = visibleAlertsForRole(alerts, role);
  const cards = [
    ['altitude', reading.altitude, Compass, 'Model output'],
    ['humidity', reading.humidity, CloudSun, 'Model output'],
    ['light', String(reading.light), Sun, 'Model output'],
    ['pressure', reading.pressure, Gauge, 'Model output'],
    ['rain', String(reading.rain), BarChart3, 'Model output'],
    ['temperature', reading.temperature, ThermometerSun, 'Model output'],
    ['wind_direction', reading.windDirectionLabel, Wind, 'Model output'],
    ['wind_direction_pct', reading.windDirectionPct, Compass, 'Model output'],
  ] as const;

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon, caption]) => (
          <MetricCard key={label} label={label} value={value} caption={caption} Icon={Icon} />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Panel title="Station Network">
          <div className="grid gap-3 md:grid-cols-3">
            <Summary label="Total stations" value={stations.length} />
            <Summary label="Online" value={stations.filter((item) => item.status === 'online').length} />
            <Summary label="Active alerts" value={visibleAlerts.filter((alert) => !alert.resolved).length} />
          </div>
        </Panel>
        <AlertList alerts={visibleAlerts.slice(0, 3)} stations={stations} compact />
      </div>
    </div>
  );
}

function MetricCard({ label, value, caption, Icon }: { label: string; value: string | number; caption: string; Icon: typeof Home }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel transition hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
        <span className="grid h-10 w-10 place-items-center rounded-md bg-brand-fog text-brand-blue dark:bg-slate-800 dark:text-sky-300">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{caption}</p>
    </div>
  );
}

function LiveWeather({ station, role }: { station: Station; role: Role }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <Panel title="Real-Time Sensor Stream">
        <div className="grid gap-4 sm:grid-cols-2">
          {modelReadingRows(station.current).map(([label, value]) => (
            <div key={label} className="flex items-center justify-between rounded-md bg-slate-100 px-4 py-3 dark:bg-slate-800">
              <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Station Link">
        <StatusRow label="Station status" value={station.status} />
        {role !== 'User' && (
          <>
            <StatusRow label="Battery status" value={`${station.battery}%`} />
            <StatusRow label="Communication" value={station.communication} />
            <StatusRow label="Last update" value={formatDateTime(station.lastUpload)} />
          </>
        )}
      </Panel>
    </div>
  );
}

function Analytics({ chartData, range, setRange }: { station: Station; chartData: Station['history']; range: RangeKey; setRange: (range: RangeKey) => void }) {
  const ranges: RangeKey[] = ['24h', '7d', '30d', 'custom'];
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-2">
        {ranges.map((item) => (
          <button key={item} onClick={() => setRange(item)} className={`rounded-md px-4 py-2 text-sm font-semibold ${range === item ? 'bg-brand-blue text-white' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'}`}>
            {item === 'custom' ? 'Custom range' : `Last ${item}`}
          </button>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartPanel title="Altitude Trend" data={chartData} dataKey="altitude" color="#475569" unit="" />
        <ChartPanel title="Temperature Trend" data={chartData} dataKey="temperature" color="#0b79b7" unit="°C" />
        <ChartPanel title="Humidity Trend" data={chartData} dataKey="humidity" color="#1fb879" unit="%" />
        <ChartPanel title="Pressure Trend" data={chartData} dataKey="pressure" color="#64748b" unit="" />
        <BarPanel title="Rain State" data={chartData} dataKey="rainValue" color="#00598c" unit="state" />
        <BarPanel title="Light State" data={chartData} dataKey="lightValue" color="#f59e0b" unit="state" />
        <ChartPanel title="Wind Direction %" data={chartData} dataKey="windDirectionPct" color="#14b8a6" unit="" />
      </div>
    </div>
  );
}

function Forecast({ station }: { station: Station }) {
  const trends = [
    ['Temperature', getTrend(station.history, 'temperature')],
    ['Humidity', getTrend(station.history, 'humidity')],
    ['Pressure', getTrend(station.history, 'pressure')],
    ['Wind direction %', getTrend(station.history, 'windDirectionPct')],
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <Panel title="Current Conditions">
        <div className="grid gap-4 sm:grid-cols-3">
          <Summary label="temperature" value={station.current.temperature} />
          <Summary label="rain" value={String(station.current.rain)} />
          <Summary label="light" value={String(station.current.light)} />
        </div>
        <p className="mt-5 rounded-md bg-brand-fog p-4 text-sm leading-6 text-brand-ink dark:bg-slate-800 dark:text-slate-100">
          Short-term local prediction uses the basic model output only: rain is currently {String(station.current.rain)}, light is currently {String(station.current.light)}, and temperature is near {station.current.temperature}.
        </p>
      </Panel>
      <Panel title="Trend Indicators">
        <div className="grid gap-3">
          {trends.map(([label, trend]) => (
            <div key={label} className="flex items-center justify-between rounded-md bg-slate-100 px-4 py-3 dark:bg-slate-800">
              <span>{label}</span>
              <strong className={trend === 'rising' || trend === 'increasing' ? 'text-emerald-600' : trend === 'decreasing' ? 'text-amber-500' : 'text-slate-500'}>{trend}</strong>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function StationMonitoring({ stations, activeStationId, setActiveStationId, role = 'Admin' }: { stations: Station[]; activeStationId: string; setActiveStationId: (id: string) => void; role?: Role }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {stations.map((station) => (
        <button key={station.id} onClick={() => setActiveStationId(station.id)} className={`rounded-lg border p-4 text-left shadow-panel transition hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900 ${activeStationId === station.id ? 'border-brand-blue bg-brand-fog dark:border-sky-500' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold">{station.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{station.location}</p>
            </div>
            <StatusPill status={station.status} />
          </div>
          {role === 'User' ? (
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Summary label="temperature" value={station.current.temperature} />
              <Summary label="rain" value={String(station.current.rain)} />
              <Summary label="humidity" value={station.current.humidity} />
              <Summary label="light" value={String(station.current.light)} />
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <Summary label="Battery" value={`${station.battery}%`} />
              <Summary label="Signal" value={`${station.signal}%`} />
              <Summary label="Wind" value={`${station.current.windSpeed} m/s`} />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

function MapView({ stations, setActiveStationId, role }: { stations: Station[]; setActiveStationId: (id: string) => void; role: Role }) {
  const center: [number, number] = stations[0]?.coordinates ?? [17.385, 78.4867];

  return (
    <Panel title="Interactive Station Map">
      <div className="h-[520px] overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
        <MapContainer center={center} zoom={4} scrollWheelZoom className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {stations.map((station) => (
            <Marker
              key={station.id}
              position={station.coordinates}
              icon={divIcon({
                className: '',
                html: `<span class="station-marker station-marker-${station.status}"></span>`,
                iconSize: [22, 22],
                iconAnchor: [11, 11],
              })}
              eventHandlers={{ click: () => setActiveStationId(station.id) }}
            >
              <Popup>
                <strong>{station.name}</strong>
                <br />
                {station.location}
                <br />
                temperature: {station.current.temperature}, humidity: {station.current.humidity}, rain: {String(station.current.rain)}
                {role !== 'User' && (
                  <>
                    <br />
                    Last comm: {formatDateTime(station.lastCommunication)}
                  </>
                )}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </Panel>
  );
}

function StationDetails({ station, chartData, role }: { station: Station; chartData: Station['history']; role: Role }) {
  return (
    <div className="grid gap-5">
      <Panel title={station.name}>
        {role === 'User' ? (
          <div className="grid gap-4 md:grid-cols-4">
            <Summary label="Location" value={station.location} />
            <Summary label="Status" value={station.status} />
            {modelReadingRows(station.current).map(([label, value]) => (
              <Summary key={label} label={label} value={value} />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-4">
            <Summary label="Location" value={station.location} />
            <Summary label="Installed" value={station.installationDate} />
            <Summary label="Battery" value={`${station.battery}%`} />
            <Summary label="Connectivity" value={station.communication} />
            <Summary label="Last maintenance" value={station.lastMaintenance} />
            <Summary label="Last upload" value={formatDateTime(station.lastUpload)} />
            <Summary label="Owner" value={station.owner} />
            <Summary label="Status" value={station.status} />
          </div>
        )}
      </Panel>
      <ChartPanel title="Station Historical Temperature" data={chartData} dataKey="temperature" color="#00598c" unit="" />
    </div>
  );
}

function ControlPanel({ station, onRefresh }: { station: Station; onRefresh: () => void }) {
  const [activityLog, setActivityLog] = useState<string[]>([
    `${formatDateTime(station.lastUpload)} - Station ready for commands.`,
  ]);
  const controls = [
    ['Refresh Latest Data', Activity, 'Latest Firebase reading refreshed'],
    ['Restart Station', RefreshCw, 'Remote restart command sent'],
    ['Reset Sensors', SlidersHorizontal, 'Sensor recalibration started'],
  ] as const;

  const runControl = (label: string, message: string) => {
    if (label === 'Refresh Latest Data') onRefresh();
    const timestamp = formatDateTime(new Date().toISOString());
    setActivityLog((items) => [`${timestamp} - ${message} for ${station.name}.`, ...items].slice(0, 5));
  };

  return (
    <Panel title={`Station Control Panel: ${station.name}`}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {controls.map(([label, Icon, message]) => (
          <button key={label} onClick={() => runControl(label, message)} className="flex items-center justify-center gap-2 rounded-md bg-brand-blue px-4 py-4 font-semibold text-white hover:bg-brand-sky">
            <Icon className="h-5 w-5" />
            {label}
          </button>
        ))}
      </div>
      <div className="mt-5 grid gap-2">
        {activityLog.map((item) => (
          <div key={item} className="rounded-md bg-slate-100 px-4 py-3 text-sm dark:bg-slate-800">{item}</div>
        ))}
      </div>
    </Panel>
  );
}

function Health({ station }: { station: Station }) {
  return (
    <Panel title="Station Health Monitoring">
      <div className="grid gap-4 md:grid-cols-2">
        <Progress label="Battery percentage" value={station.battery} />
        <Progress label="Signal strength" value={station.signal} />
        <Progress label="Memory usage" value={station.memory} />
        <Progress label="Sensor status" value={station.status === 'offline' ? 20 : station.status === 'warning' ? 68 : 96} />
      </div>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Last communication: {formatDateTime(station.lastCommunication)}</p>
    </Panel>
  );
}

function Diagnostics({ station }: { station: Station }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Sensor Diagnostics">
        {['Temperature probe calibrated', 'Humidity sensor healthy', 'Pressure module nominal', 'Rain gauge bucket cleared', 'Irradiance sensor aligned'].map((item) => (
          <StatusRow key={item} label={item} value={station.status === 'offline' ? 'check required' : 'ok'} />
        ))}
      </Panel>
      <Panel title="Communication & Error Logs">
        {['Firebase heartbeat accepted', 'Payload received in Realtime Database', 'Dashboard credentials valid', station.communication === 'lost' ? 'LTE modem connection timeout' : 'No critical errors'].map((item, index) => (
          <div key={item} className="rounded-md bg-slate-100 px-4 py-3 text-sm dark:bg-slate-800">
            {formatDateTime(new Date(Date.now() - index * 900000).toISOString())} - {item}
          </div>
        ))}
      </Panel>
    </div>
  );
}

function Maintenance({ station }: { station: Station }) {
  return (
    <Panel title="Maintenance Logs">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="text-slate-500 dark:text-slate-400">
            <tr><th className="py-2">Date</th><th>Activity</th><th>Technician</th><th>Status</th></tr>
          </thead>
          <tbody>
            {[
              [station.lastMaintenance, 'Solar panel inspection and enclosure cleaning', 'Operator Team', 'Complete'],
              ['2026-04-16', 'Wind vane calibration', 'Field Engineer', 'Complete'],
              ['2026-03-28', 'Battery health audit', 'Maintenance Desk', station.battery < 30 ? 'Follow-up' : 'Complete'],
            ].map((row) => (
              <tr key={row.join('-')} className="border-t border-slate-200 dark:border-slate-800">
                {row.map((cell) => <td key={cell} className="py-3">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Alerts({ alerts, stations, role }: { alerts: Alert[]; stations: Station[]; role: Role }) {
  return <AlertList alerts={visibleAlertsForRole(alerts, role)} stations={stations} />;
}

function UserManagement({ users, setUsers }: { users: PlatformUser[]; setUsers: (users: PlatformUser[] | ((current: PlatformUser[]) => PlatformUser[])) => void }) {
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? '');
  const [mode, setMode] = useState<'add' | 'assign' | null>(null);
  const [notice, setNotice] = useState('Select a user, then choose an action.');
  const [newUser, setNewUser] = useState({ name: '', username: '', email: '', password: '', role: 'User' as Role, stationAccess: 'hyd-farm-01' });
  const [roleDraft, setRoleDraft] = useState<Role>('User');
  const selectedUser = users.find((user) => user.id === selectedUserId);

  useEffect(() => {
    setSelectedUserId((current) => (users.some((user) => user.id === current) ? current : users[0]?.id ?? ''));
  }, [users]);

  const addUser = () => {
    const usernameDraft = newUser.username.trim();
    if (!newUser.name.trim() || !usernameDraft || !newUser.email.trim() || !newUser.password) {
      setNotice('Enter name, username, email, and password before adding a user.');
      return;
    }

    if (users.some((user) => user.username.toLowerCase() === usernameDraft.toLowerCase() || user.email.toLowerCase() === newUser.email.trim().toLowerCase())) {
      setNotice('That username or email already exists.');
      return;
    }

    const user: PlatformUser = {
      id: `u-${Date.now()}`,
      name: newUser.name.trim(),
      username: usernameDraft,
      email: newUser.email.trim(),
      password: newUser.password,
      role: newUser.role,
      status: 'active',
      stationAccess: newUser.stationAccess.split(',').map((item) => item.trim()).filter(Boolean),
    };
    setUsers((items) => [...items, user]);
    setSelectedUserId(user.id);
    setNewUser({ name: '', username: '', email: '', password: '', role: 'User', stationAccess: 'hyd-farm-01' });
    setMode(null);
    setNotice(`${user.name} was added. Username: ${user.username}`);
  };

  const deleteUser = () => {
    if (!selectedUser) {
      setNotice('Select a user to delete.');
      return;
    }

    setUsers((items) => items.filter((user) => user.id !== selectedUser.id));
    const nextUser = users.find((user) => user.id !== selectedUser.id);
    setSelectedUserId(nextUser?.id ?? '');
    setNotice(`${selectedUser.name} was deleted.`);
  };

  const resetPassword = () => {
    if (!selectedUser) {
      setNotice('Select a user to reset their password.');
      return;
    }

    const nextPassword = `Weather@${new Date().getFullYear()}`;
    setUsers((items) => items.map((user) => (user.id === selectedUser.id ? { ...user, password: nextPassword } : user)));
    setNotice(`Temporary password generated for ${selectedUser.name}: ${nextPassword}`);
  };

  const assignRole = () => {
    if (!selectedUser) {
      setNotice('Select a user to assign a role.');
      return;
    }

    setUsers((items) => items.map((user) => (user.id === selectedUser.id ? { ...user, role: roleDraft } : user)));
    setMode(null);
    setNotice(`${selectedUser.name} is now assigned the ${roleDraft} role.`);
  };

  const toggleSuspension = () => {
    if (!selectedUser) {
      setNotice('Select a user to suspend or reactivate.');
      return;
    }

    const nextStatus = selectedUser.status === 'active' ? 'suspended' : 'active';
    setUsers((items) => items.map((user) => (user.id === selectedUser.id ? { ...user, status: nextStatus } : user)));
    setNotice(`${selectedUser.name} is now ${nextStatus}.`);
  };

  return (
    <Panel title="User Management">
      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setMode(mode === 'add' ? null : 'add')} className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-sky">Add user</button>
        <button onClick={deleteUser} className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-sky">Delete user</button>
        <button onClick={resetPassword} className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-sky">Reset password</button>
        <button onClick={() => { setMode(mode === 'assign' ? null : 'assign'); setRoleDraft(selectedUser?.role ?? 'User'); }} className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-sky">Assign role</button>
        <button onClick={toggleSuspension} className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-sky">{selectedUser?.status === 'suspended' ? 'Reactivate account' : 'Suspend account'}</button>
      </div>
      <p className="mb-4 rounded-md bg-brand-fog px-4 py-3 text-sm font-medium text-brand-ink dark:bg-slate-800 dark:text-slate-100">{notice}</p>
      {mode === 'add' && (
        <div className="mb-4 grid gap-3 rounded-md border border-slate-200 p-4 dark:border-slate-800 md:grid-cols-4">
          <input value={newUser.name} onChange={(event) => setNewUser({ ...newUser, name: event.target.value })} placeholder="Name" className="rounded-md border border-slate-200 bg-transparent px-3 py-2 dark:border-slate-700" />
          <input value={newUser.username} onChange={(event) => setNewUser({ ...newUser, username: event.target.value })} placeholder="Login username" className="rounded-md border border-slate-200 bg-transparent px-3 py-2 dark:border-slate-700" />
          <input value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} placeholder="Email" className="rounded-md border border-slate-200 bg-transparent px-3 py-2 dark:border-slate-700" />
          <input value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} placeholder="Password" className="rounded-md border border-slate-200 bg-transparent px-3 py-2 dark:border-slate-700" />
          <select value={newUser.role} onChange={(event) => setNewUser({ ...newUser, role: event.target.value as Role })} className="rounded-md border border-slate-200 bg-transparent px-3 py-2 dark:border-slate-700">
            {(['User', 'Operator', 'Admin'] as Role[]).map((role) => <option key={role} className="text-slate-900">{role}</option>)}
          </select>
          <input value={newUser.stationAccess} onChange={(event) => setNewUser({ ...newUser, stationAccess: event.target.value })} placeholder="Access ids" className="rounded-md border border-slate-200 bg-transparent px-3 py-2 dark:border-slate-700" />
          <button onClick={addUser} className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 md:col-span-2">Save user</button>
        </div>
      )}
      {mode === 'assign' && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-slate-200 p-4 dark:border-slate-800">
          <span className="text-sm font-semibold">Role for {selectedUser?.name ?? 'selected user'}</span>
          <select value={roleDraft} onChange={(event) => setRoleDraft(event.target.value as Role)} className="rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700">
            {(['User', 'Operator', 'Admin'] as Role[]).map((role) => <option key={role} className="text-slate-900">{role}</option>)}
          </select>
          <button onClick={assignRole} className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">Apply role</button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[840px] text-left text-sm">
          <thead className="text-slate-500 dark:text-slate-400"><tr><th className="py-2">Select</th><th>Name</th><th>Username</th><th>Email</th><th>Role</th><th>Status</th><th>Access</th></tr></thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} onClick={() => setSelectedUserId(user.id)} className={`cursor-pointer border-t border-slate-200 dark:border-slate-800 ${selectedUserId === user.id ? 'bg-brand-fog dark:bg-slate-800' : ''}`}>
                <td className="py-3"><input type="radio" checked={selectedUserId === user.id} onChange={() => setSelectedUserId(user.id)} className="h-4 w-4 accent-brand-blue" /></td>
                <td className="font-semibold">{user.name}</td><td>{user.username}</td><td>{user.email}</td><td>{user.role}</td><td>{user.status}</td><td>{user.stationAccess.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function StationAdmin({ stations }: { stations: Station[] }) {
  const [managedStations, setManagedStations] = useState(stations);
  const [selectedStationId, setSelectedStationId] = useState(stations[0]?.id ?? '');
  const [stationMode, setStationMode] = useState<'add' | 'owner' | 'settings' | null>(null);
  const [stationNotice, setStationNotice] = useState('Select a station, then choose a management action.');
  const [stationDraft, setStationDraft] = useState({ name: '', location: '', owner: 'Operations Team' });
  const [ownerDraft, setOwnerDraft] = useState('');
  const [communicationDraft, setCommunicationDraft] = useState<Station['communication']>('stable');
  const selectedStation = managedStations.find((station) => station.id === selectedStationId);

  useEffect(() => {
    setManagedStations(stations);
    setSelectedStationId((current) => (stations.some((station) => station.id === current) ? current : stations[0]?.id ?? ''));
  }, [stations]);

  const addStation = () => {
    if (!stationDraft.name.trim() || !stationDraft.location.trim()) {
      setStationNotice('Enter a station name and location before adding it.');
      return;
    }

    const station: Station = {
      ...(managedStations[0] ?? stations[0]),
      id: stationDraft.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `station-${Date.now()}`,
      name: stationDraft.name.trim(),
      location: stationDraft.location.trim(),
      owner: stationDraft.owner.trim() || 'Operations Team',
      status: 'online',
      communication: 'stable',
      battery: 100,
      signal: 88,
      memory: 22,
      coordinates: [17.385, 78.4867],
      lastCommunication: new Date().toISOString(),
      lastUpload: new Date().toISOString(),
      installationDate: '2026-06-05',
      lastMaintenance: '2026-06-05',
    };
    setManagedStations((items) => [...items, station]);
    setSelectedStationId(station.id);
    setStationDraft({ name: '', location: '', owner: 'Operations Team' });
    setStationMode(null);
    setStationNotice(`${station.name} was added.`);
  };

  const removeStation = () => {
    if (!selectedStation) {
      setStationNotice('Select a station to remove.');
      return;
    }

    setManagedStations((items) => items.filter((station) => station.id !== selectedStation.id));
    const nextStation = managedStations.find((station) => station.id !== selectedStation.id);
    setSelectedStationId(nextStation?.id ?? '');
    setStationNotice(`${selectedStation.name} was removed from this admin view.`);
  };

  const assignOwner = () => {
    if (!selectedStation || !ownerDraft.trim()) {
      setStationNotice('Select a station and enter an owner.');
      return;
    }

    setManagedStations((items) => items.map((station) => (station.id === selectedStation.id ? { ...station, owner: ownerDraft.trim() } : station)));
    setStationMode(null);
    setStationNotice(`${selectedStation.name} is now owned by ${ownerDraft.trim()}.`);
  };

  const configureStation = () => {
    if (!selectedStation) {
      setStationNotice('Select a station to configure.');
      return;
    }

    setManagedStations((items) => items.map((station) => (station.id === selectedStation.id ? { ...station, communication: communicationDraft } : station)));
    setStationMode(null);
    setStationNotice(`${selectedStation.name} communication setting changed to ${communicationDraft}.`);
  };

  return (
    <Panel title="Station Management">
      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setStationMode(stationMode === 'add' ? null : 'add')} className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-sky">Add weather station</button>
        <button onClick={removeStation} className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-sky">Remove weather station</button>
        <button onClick={() => { setStationMode(stationMode === 'owner' ? null : 'owner'); setOwnerDraft(selectedStation?.owner ?? ''); }} className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-sky">Assign ownership</button>
        <button onClick={() => { setStationMode(stationMode === 'settings' ? null : 'settings'); setCommunicationDraft(selectedStation?.communication ?? 'stable'); }} className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-sky">Configure settings</button>
      </div>
      <p className="mb-4 rounded-md bg-brand-fog px-4 py-3 text-sm font-medium text-brand-ink dark:bg-slate-800 dark:text-slate-100">{stationNotice}</p>
      {stationMode === 'add' && (
        <div className="mb-4 grid gap-3 rounded-md border border-slate-200 p-4 dark:border-slate-800 md:grid-cols-4">
          <input value={stationDraft.name} onChange={(event) => setStationDraft({ ...stationDraft, name: event.target.value })} placeholder="Station name" className="rounded-md border border-slate-200 bg-transparent px-3 py-2 dark:border-slate-700" />
          <input value={stationDraft.location} onChange={(event) => setStationDraft({ ...stationDraft, location: event.target.value })} placeholder="Location" className="rounded-md border border-slate-200 bg-transparent px-3 py-2 dark:border-slate-700" />
          <input value={stationDraft.owner} onChange={(event) => setStationDraft({ ...stationDraft, owner: event.target.value })} placeholder="Owner" className="rounded-md border border-slate-200 bg-transparent px-3 py-2 dark:border-slate-700" />
          <button onClick={addStation} className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">Save station</button>
        </div>
      )}
      {stationMode === 'owner' && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-slate-200 p-4 dark:border-slate-800">
          <input value={ownerDraft} onChange={(event) => setOwnerDraft(event.target.value)} placeholder="Owner name" className="rounded-md border border-slate-200 bg-transparent px-3 py-2 dark:border-slate-700" />
          <button onClick={assignOwner} className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">Apply owner</button>
        </div>
      )}
      {stationMode === 'settings' && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-slate-200 p-4 dark:border-slate-800">
          <select value={communicationDraft} onChange={(event) => setCommunicationDraft(event.target.value as Station['communication'])} className="rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700">
            {(['excellent', 'stable', 'degraded', 'lost'] as Station['communication'][]).map((value) => <option key={value} className="text-slate-900">{value}</option>)}
          </select>
          <button onClick={configureStation} className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">Save settings</button>
        </div>
      )}
      <StationMonitoring stations={managedStations} activeStationId={selectedStationId} setActiveStationId={setSelectedStationId} />
    </Panel>
  );
}

function AccessControl() {
  const initialPermissions = useMemo(
    () => Object.fromEntries((['User', 'Operator', 'Admin'] as Role[]).map((role) => [role, new Set(navByRole[role].slice(0, 8))])) as Record<Role, Set<string>>,
    [],
  );
  const [permissions, setPermissions] = useState(initialPermissions);

  const togglePermission = (role: Role, permission: string) => {
    setPermissions((current) => {
      const next = new Set(current[role]);
      if (next.has(permission)) next.delete(permission);
      else next.add(permission);
      return { ...current, [role]: next };
    });
  };

  return (
    <Panel title="Access Control">
      <div className="grid gap-4 md:grid-cols-3">
        {(['User', 'Operator', 'Admin'] as Role[]).map((role) => (
          <div key={role} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <h3 className="font-bold">{role} permissions</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{permissions[role].size} enabled</p>
            {navByRole[role].slice(0, 8).map((permission) => (
              <label key={permission} className="mt-3 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={permissions[role].has(permission)} onChange={() => togglePermission(role, permission)} className="h-4 w-4 accent-brand-blue" />
                {permission}
              </label>
            ))}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function SystemAnalytics({ analytics }: { analytics: Record<string, number | string> }) {
  const entries = [
    ['Total stations', analytics.totalStations],
    ['Active stations', analytics.activeStations],
    ['Offline stations', analytics.offlineStations],
    ['Total users', analytics.totalUsers],
    ['Data uploads today', analytics.dataUploadsToday],
    ['System uptime', analytics.systemUptime],
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {entries.map(([label, value]) => <MetricCard key={label} label={String(label)} value={String(value ?? '-')} caption="Platform metric" Icon={Database} />)}
    </div>
  );
}

function ChartPanel({ title, data, dataKey, color, unit }: { title: string; data: Station['history']; dataKey: string; color: string; unit: string }) {
  return (
    <Panel title={title}>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`${dataKey}Gradient`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => [`${value} ${unit}`, title]} />
            <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} fill={`url(#${dataKey}Gradient)`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

function BarPanel({ title, data, dataKey, color, unit }: { title: string; data: Station['history']; dataKey: string; color: string; unit: string }) {
  return (
    <Panel title={title}>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => [`${value} ${unit}`, title]} />
            <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

function AlertList({ alerts, stations, compact = false }: { alerts: Alert[]; stations: Station[]; compact?: boolean }) {
  return (
    <Panel title={compact ? 'Dashboard Notifications' : 'Alert History Panel'}>
      <div className="grid gap-3">
        {alerts.map((alert) => {
          const station = stations.find((item) => item.id === alert.stationId);
          return (
            <div key={alert.id} className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/70">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{alert.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{station?.name} - {formatDateTime(alert.timestamp)}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-bold ${alert.severity === 'critical' ? 'bg-red-100 text-red-700' : alert.severity === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>{alert.severity}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="rounded-md bg-slate-100 p-3 dark:bg-slate-800">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 break-words text-lg font-bold">{value}</p>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-md bg-slate-100 px-4 py-3 dark:bg-slate-800">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <strong className="text-right">{value}</strong>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      <span className={`h-2 w-2 rounded-full ${statusClass(status)}`} />
      {status}
    </span>
  );
}

function Progress({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm"><span>{label}</span><strong>{value}%</strong></div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-full rounded-full ${value < 30 ? 'bg-red-500' : value < 65 ? 'bg-amber-400' : 'bg-brand-mint'}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function LandingSection() {
  return (
    <section className="border-t border-slate-200 bg-white py-10 dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-blue">Public Home Page</p>
          <h2 className="mt-2 text-3xl font-bold">Team 3 Dashboard Model for weather-critical operations</h2>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Monitor distributed weather stations, analyze trends, respond to maintenance needs, and prepare for agriculture, research, UAV operations, environmental monitoring, and smart infrastructure missions.</p>
          <button className="mt-5 rounded-md bg-brand-blue px-5 py-3 font-semibold text-white hover:bg-brand-sky">Dashboard Active</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {['Agriculture', 'Research', 'Environmental Monitoring', 'UAV Operations', 'Smart Infrastructure', 'Cloud-ready Firebase integration'].map((feature) => (
            <div key={feature} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <h3 className="font-bold">{feature}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Live telemetry, alerts, analytics, and role-based workflows.</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section className="border-t border-slate-200 bg-slate-50 py-10 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-5 flex flex-col justify-between gap-2 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-blue">About</p>
            <h2 className="text-3xl font-bold">Team Members</h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Complete member list from the attached image, from Vasanth to Chinmay.</p>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-panel dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-brand-blue text-white">
              <tr>
                <th className="px-4 py-3">S.No</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Register Number</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member) => (
                <tr key={member.registerNumber} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-4 py-3 font-semibold">{member.serial}</td>
                  <td className="px-4 py-3">{member.team}</td>
                  <td className="px-4 py-3 font-semibold">{member.name}</td>
                  <td className="px-4 py-3">{member.registerNumber}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-brand-blue text-white">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[1fr_auto_auto] md:items-end">
        <div>
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-white font-black text-brand-blue">T3</div>
            <span className="text-2xl font-semibold tracking-wide">Team 3 Dashboard Model</span>
          </div>
          <p className="mt-6 text-sm">Copyright 2026 Team 3. All rights reserved.</p>
        </div>
        <div className="text-sm font-semibold leading-7">
          <p>Hyderabad, India</p>
          <p>Enschede, Netherlands</p>
        </div>
        <div className="border-white/70 md:border-l md:pl-5">
          {['Technology', 'Company', 'Careers', 'Contact us'].map((item) => <p key={item} className="text-lg leading-8">{item}</p>)}
        </div>
      </div>
    </footer>
  );
}

export default App;
