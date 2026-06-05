# Team 3 Dashboard Model

A modern React + TypeScript + Tailwind dashboard for remote IoT weather stations. It ships with realistic sample data, role-based dashboard views, charting, station monitoring, alerts, operator-managed logins, and a Firebase-ready API client.

## Demo sign in

The opening screen lets you choose one of three roles:

- User
- Operator
- Admin

All three demo sign-ins use:

- Username: `LogixAir1`
- Password: `LogixAir1`

Operators and admins can also open the `Users` page to add real dashboard logins with a username, password, role, and station access list. Those demo accounts are saved in the browser's local storage.

## Run locally

```bash
npm install
npm run dev
```

## Build for Vercel

```bash
npm run build
```

Push this folder to GitHub and import the repository into Vercel. Vercel will detect the Vite app automatically.

## Firebase integration

Create `.env.local` from `.env.example`:

```bash
VITE_FIREBASE_API_KEY=your-web-api-key
VITE_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
VITE_FIREBASE_STATIONS_PATH=stations
VITE_FIREBASE_READINGS_PATH=readings
VITE_FIREBASE_ALERTS_PATH=alerts
VITE_API_BASE_URL=https://your-fastapi-domain.com
VITE_JWT_TOKEN=your-jwt-token
VITE_FAST_POLL_MS=300000
VITE_SLOW_POLL_MS=1200000
```

The dashboard reads Firebase Realtime Database data first, then falls back to Supabase/FastAPI/sample data if Firebase is not configured or a request fails.

Expected Firebase nodes are configurable:

- `stations`
- `readings`
- `alerts`

Station records can include fields like `name`, `location`, `latitude`, `longitude`, `status`, `battery`, `signal`, `lastUpload`, `current`, and `history`. Reading records can include `timestamp`, `temperature`, `humidity`, `pressure`, `rainfall`, `windSpeed`, `windDirection`, and `irradiance`.

## Optional FastAPI fallback

The dashboard can also use these optional API endpoints:

- `GET /stations`
- `GET /stations/{stationId}/readings/current`
- `GET /stations/{stationId}/readings/history?range=24h|7d|30d`
- `GET /alerts`
- `GET /system/analytics`

If no Firebase or API base URL is provided, the app uses bundled sample data. Fast polling defaults to 5 minutes and slow polling defaults to 20 minutes.
