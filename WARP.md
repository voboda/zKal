# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**zKal** is a freedom-respecting group calendar server that aggregates multiple .ICS feeds and provides a web UI and programmatic access to events. Authentication uses Zupass proofs to verify membership in a configured event (e.g., ETHBERLIN04) without revealing user data.

**Status**: Proof-of-concept for ethBerlin04 (not production-ready)

## Commands

### Development
- `npm run dev` – Start development server with hot reload (Vite + SvelteKit)
- `npm run build` – Build for production (uses Node adapter)
- `npm run preview` – Preview production build

### Testing
- `npm test` – Run all tests (integration + unit)
- `npm run test:unit` – Run unit tests with Vitest (`src/**/*.{test,spec}.{js,ts}`)
- `npm run test:integration` – Run Playwright integration tests (`tests/test.js`)
- For a single test: `npm run test:unit -- src/path/to/file.test.js`

### Code Quality
- `npm run lint` – Check formatting and linting (Prettier + ESLint)
- `npm run format` – Auto-fix formatting and linting

## Architecture & Key Concepts

### Tech Stack
- **Framework**: SvelteKit 2.x (Node adapter for containerized deployment)
- **Frontend**: Svelte 4.x with `@event-calendar` for UI
- **Backend**: Node.js with SvelteKit server-side functions
- **Authentication**: Zupass Ticket PCD + server-side verification (legacy Semaphore code may remain in stores/UI)
- **Calendar Parsing**: ical.js (parses .ICS feeds)
- **Styling**: Pico CSS (minimal framework)

### Data Flow
1. **Event Aggregation** (`src/lib/fetchCalendar.js`):
   - Fetches multiple .ICS calendar feeds defined in `PUBLIC_CALENDAR_URLS` env var
   - Parses events using ical.js, extracts summary, description, dates, attendees, and signup links
   - Caches results to `.cache/calendar.json` (TTL configurable via `PUBLIC_CACHE_TIME`, default 600s)
   - Extracts signup links from descriptions using `PUBLIC_SIGNUP_LINK_PATTERNS` (Meetup, lu.ma, etc.)

2. **Feed Endpoints**:
   - `/feed/json` – Returns parsed events as JSON (consumed by frontend)
   - `/feed/ical` – Regenerates .ICS format with custom X- headers (calendar name, color, attendees, signup link)

3. **Frontend** (`src/routes/+page.svelte`):
   - Loads events via `src/routes/+page.js` (server-side load function)
   - Transforms event data for `@event-calendar` (date parsing, color mapping)
   - Displays month/week/day/list views with event details in modal
   - Includes AddToCalendar component for exporting individual events

4. **Auth Flow**:
   - User visits `/login` and obtains a Zupass proof for the required event
   - Client sends serialized PCD to `/auth/verify` (server)
   - Server verifies proof and sets `zupass_session` httpOnly cookie
   - `+layout.server.js` redirects unauthenticated users to `/login`
   - `hooks.server.js` parses the session into `event.locals.user`

### State Management
- **Session**: httpOnly cookie `zupass_session` set by server after verification; parsed into `event.locals.user` in `src/hooks.server.js`.
- **Persistent Stores** (`src/lib/stores.js`): legacy stores (`id`, `groups`) persisted via `svelte-persisted-store`; may be superseded by Zupass session.

### Authentication (Zupass)
- **Login UI** (`src/routes/login/+page.svelte`):
  - Opens Zupass (configurable URL) and provides a textarea to paste a serialized proof (PCD)
  - Auto-verifies if a `pcd` query param is present (for future redirect/deeplink flows)
  - Sends `{ pcd: string }` via POST to `/auth/verify`
- **Server Verification** (`src/routes/auth/verify/+server.js`):
  - Verifies an EdDSA Ticket PCD using `@pcd/eddsa-ticket-pcd` (dynamic import)
  - Ensures the proof’s event matches `PUBLIC_ZUPASS_EVENT_SLUG`
  - On success, sets `zupass_session` and returns `{ ok: true }`
  - Includes a development-only fallback parser if the dependency is not installed
- **Route Protection**:
  - `src/routes/+layout.server.js`: redirects to `/login` when `zupass_session` is missing (except on `/login`)
  - `src/hooks.server.js`: populates `event.locals.user` from the session

### Configuration
All configuration via environment variables (see `.env.sample`):
- `PUBLIC_CACHE_DIR` – Cache directory path (default `.cache`)
- `PUBLIC_CACHE_FILE` – Cache filename (default `calendar.json`)
- `PUBLIC_CACHE_TIME` – Cache TTL in milliseconds (default 600000 = 10min)
- `PUBLIC_CALENDAR_URLS` – JSON array of calendars with `{url, color, name}` (must be valid .ICS URLs)
- `PUBLIC_SIGNUP_LINK_PATTERNS` – JSON array of URL patterns to search for in event descriptions
- `PUBLIC_ZUPASS_PASSPORT_URL` – Base URL to open Zupass (default `https://zupass.org`)
- `PUBLIC_ZUPASS_EVENT_SLUG` – Required event/ticket group identifier (e.g., `ETHBERLIN04`), used by server verification

Quickstart:
- Copy `.env.sample` to `.env`, set `PUBLIC_ZUPASS_EVENT_SLUG`, and optionally `PUBLIC_ZUPASS_PASSPORT_URL`
- Install dependencies: `npm install` (ensure `@pcd/eddsa-ticket-pcd` is installed)
- Start dev: `npm run dev`

### Directory Structure (Excluding node_modules)
```
src/
├── routes/
│   ├── +page.svelte           # Home/calendar view (main UI)
│   ├── +page.js               # Data loading for calendar UI
│   ├── +layout.server.js      # Auth guard (redirects unauthenticated users to /login)
│   ├── login/
│   │   ├── +page.svelte       # Zupass login UI (open Zupass / paste PCD / auto-verify)
│   │   ├── +page.server.js    # Legacy server action (may be unused)
│   │   └── +page.js           # Present in repo; not central to auth
│   ├── auth/
│   │   └── verify/+server.js  # POST /auth/verify – Zupass proof verification and session cookie
│   └── feed/
│       ├── ical/+server.js    # GET /feed/ical – Returns .ICS format
│       └── json/+server.js    # GET /feed/json – Returns JSON format
├── lib/
│   ├── fetchCalendar.js       # Fetches, parses, caches .ICS feeds
│   ├── stores.js              # Legacy persisted stores (id, groups)
│   ├── CalendarLegend.svelte  # Legend UI component
│   └── AddToCalendar.svelte   # Export event to user's calendar
├── hooks.server.js            # Parses zupass_session into event.locals.user
└── app.html                   # HTML template
```

## Zupass Server Verification Endpoint
- Route: `POST /auth/verify`
- Request body: `{ "pcd": "<serialized-EdDSA-Ticket-PCD>" }`
- Responses:
  - `200 { ok: true }`
  - `400` – missing/invalid request body
  - `401` – invalid proof or mismatched event
  - `500` – server misconfiguration (e.g., `PUBLIC_ZUPASS_EVENT_SLUG` not set)
- Notes:
  - Uses `@pcd/eddsa-ticket-pcd` if installed (dynamic import). A dev-only fallback parser exists but should not be used in production.
  - Sets `zupass_session` (httpOnly, sameSite=lax, secure in production).

Example (replace <PCD>):
```
curl -sS -X POST http://localhost:5173/auth/verify \
  -H 'content-type: application/json' \
  -d '{"pcd":"<PCD>"}'
```

## Common Development Tasks

### Adding a New Calendar Source
1. Update `.env` `PUBLIC_CALENDAR_URLS` with new .ICS URL, color, and name
2. The cache will refresh automatically on next request (or immediately if TTL expired)
3. Test with `npm run dev` and verify events appear in the calendar

### Debugging Event Parsing
- Check `.cache/calendar.json` to inspect parsed event data
- Use `npm run dev` and browser DevTools to inspect network requests to `/feed/json`
- The `eyes` package provides detailed logging in `fetchCalendar.js` for troubleshooting

### Modifying Authentication
- Update `src/routes/login/+page.svelte` for login UX
- Server verification lives in `src/routes/auth/verify/+server.js`
- Route protection is in `src/routes/+layout.server.js`; session parsing in `src/hooks.server.js`

### Testing the Full Flow
- Run `npm run dev`
- Navigate to `/login`, open Zupass, generate a proof for `PUBLIC_ZUPASS_EVENT_SLUG`, and paste it (or use future redirect flow)
- On success, you’ll be redirected to `/` with a `zupass_session` cookie set

## Known Limitations & TODO Items
- Zupass client deep-link/popup flow is minimal; current UI relies on opening Zupass and pasting a PCD
- Improve error handling/UX for failed proofs
- Consider CSRF/rate-limiting for `/auth/verify`
- Legacy Semaphore stores/UI remain; may be removed or integrated
- Add tests for auth flow (unit + Playwright)
- No multi-user/permission system yet
- Calendar event syncing doesn't create/modify user calendars
