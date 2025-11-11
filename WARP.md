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
  - Fetches allowed ticket definitions from `GET /auth/config` and displays their labels
  - Opens Zupass (configurable URL) and provides a textarea to paste a serialized proof (PCD)
  - Auto-verifies if a `pcd` query param is present (for future redirect/deeplink flows)
  - Sends `{ pcd: string }` via POST to `/auth/verify`
- **Config File** (`src/lib/server/zupass.json`):
  - JSON array of allowed ticket/PCD definitions; never exposed to client bundle
  - Each entry has: `id`, `label`, `type` (currently only `eddsa-ticket-pcd` supported)
  - Matching via `zuauthPolicy` (preferred) or `match` (local fallback):
    - `zuauthPolicy`: evaluated by `@pcd/zuauth` if installed; supports arbitrary issuer keys, event IDs, product IDs, revocation checks, etc.
    - `match`: local matcher by `issuerPublicKey`, `event`, `productId` (arrays; case-insensitive for event/product, normalized for keys)
  - Hosts can define custom issuers/tickets without needing upstream Zupass slug assignment
- **Server Verification** (`src/routes/auth/verify/+server.js`):
  - Verifies an EdDSA Ticket PCD using `@pcd/eddsa-ticket-pcd` (dynamic import)
  - Evaluates PCD against all config entries; accepts on first match (zuauth policy or local matcher)
  - On success, sets `zupass_session` (HMAC-signed if `ZUPASS_SESSION_SECRET` is set) and returns `{ ok: true }`
  - Includes a development-only fallback parser if the dependency is not installed
- **Session Cookie**:
  - httpOnly, sameSite=lax, secure in production, 1-day maxAge
  - HMAC-SHA256 signed when `ZUPASS_SESSION_SECRET` is set (required in production)
  - Minimal payload: `{ user: { attendee }, matched: { id, type, event } }`
- **Route Protection**:
  - `src/routes/+layout.server.js`: redirects to `/login` when `zupass_session` is missing (except on `/login`)
  - `src/hooks.server.js`: verifies signature (if secret set), parses session, populates `event.locals.user` and `event.locals.matched`; deletes invalid cookies

### Configuration

Calendar and public settings via environment variables (`.env.sample`):

- `PUBLIC_CACHE_DIR` – Cache directory path (default `.cache`)
- `PUBLIC_CACHE_FILE` – Cache filename (default `calendar.json`)
- `PUBLIC_CACHE_TIME` – Cache TTL in milliseconds (default 600000 = 10min)
- `PUBLIC_CALENDAR_URLS` – JSON array of calendars with `{url, color, name}` (must be valid .ICS URLs)
- `PUBLIC_SIGNUP_LINK_PATTERNS` – JSON array of URL patterns to search for in event descriptions
- `PUBLIC_ZUPASS_PASSPORT_URL` – Base URL to open Zupass (default `https://zupass.org`)

Auth configuration:

- `ZUPASS_SESSION_SECRET` – HMAC secret for session cookie signing (server-only; required in production; generate with `openssl rand -base64 32`)
- `src/lib/server/zupass.json` – Array of allowed ticket definitions (see Authentication section above)

Quickstart:

- Copy `.env.sample` to `.env`
- Set `ZUPASS_SESSION_SECRET` for production (optional in dev)
- Edit `src/lib/server/zupass.json` to define allowed ticket types (by default includes a sample ETHBERLIN04 entry)
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
│   │   ├── +page.svelte       # Zupass login UI (fetches /auth/config, shows labels, paste PCD, auto-verify)
│   │   ├── +page.server.js    # Legacy server action (may be unused)
│   │   └── +page.js           # Present in repo; not central to auth
│   ├── auth/
│   │   ├── config/+server.js  # GET /auth/config – Returns {entries:[{id,label}]} for login UI
│   │   └── verify/+server.js  # POST /auth/verify – Zupass proof verification and signed session cookie
│   └── feed/
│       ├── ical/+server.js    # GET /feed/ical – Returns .ICS format
│       └── json/+server.js    # GET /feed/json – Returns JSON format
├── lib/
│   ├── server/
│   │   ├── zupass.json        # Allowed ticket/PCD definitions (server-only; never bundled to client)
│   │   ├── zupassConfig.js    # Config loader, validator, public projection
│   │   ├── session.js         # Session cookie utilities (serialize, parse, HMAC signing)
│   │   └── policy/
│   │       └── evaluator.js   # PCD field extraction, zuauth adapter, local matcher
│   ├── fetchCalendar.js       # Fetches, parses, caches .ICS feeds
│   ├── stores.js              # Legacy persisted stores (id, groups)
│   ├── CalendarLegend.svelte  # Legend UI component
│   └── AddToCalendar.svelte   # Export event to user's calendar
├── hooks.server.js            # Verifies signature, parses zupass_session into event.locals.user/.matched
└── app.html                   # HTML template
```

## Zupass Endpoints

### GET /auth/config

- Returns allowed ticket labels for the login UI
- Response: `{ "entries": [{"id":"...", "label":"..."},...] }`
- No authentication required; only exposes `id` and `label` (not policy criteria)

### POST /auth/verify

- Verifies a Zupass PCD and issues a session cookie
- Request body: `{ "pcd": "<serialized-EdDSA-Ticket-PCD>" }`
- Responses:
  - `200 { ok: true }` – sets `zupass_session` cookie (HMAC-signed if `ZUPASS_SESSION_SECRET` is set)
  - `400` – missing/invalid request body
  - `401` – invalid proof or no matching config entry
  - `500` – server config error (e.g., malformed `zupass.json`)
- Notes:
  - Uses `@pcd/eddsa-ticket-pcd` if installed (dynamic import). A dev-only fallback parser exists but should not be used in production.
  - Evaluates PCD against all entries in `src/lib/server/zupass.json` (zuauth policy or local matcher); accepts on first match.
  - Cookie: httpOnly, sameSite=lax, secure in production, 1-day maxAge.

Example (replace `<PCD>`):

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

- **Add/edit allowed tickets**: edit `src/lib/server/zupass.json` (see Authentication section for schema)
- **Login UX**: update `src/routes/login/+page.svelte`
- **Server verification**: edit `src/routes/auth/verify/+server.js` or policy evaluator in `src/lib/server/policy/evaluator.js`
- **Route protection**: `src/routes/+layout.server.js`; session parsing in `src/hooks.server.js`

### Testing the Full Flow

- Run `npm run dev`
- Navigate to `/login`; the UI will show allowed ticket labels from `/auth/config`
- Open Zupass, generate a proof for any ticket matching an entry in `zupass.json`, and paste it (or use future redirect flow)
- On success, you'll be redirected to `/` with a signed `zupass_session` cookie set

## Known Limitations & TODO Items

- Zupass client deep-link/popup flow is minimal; current UI relies on opening Zupass and pasting a PCD
- Improve error handling/UX for failed proofs
- Consider CSRF/rate-limiting for `/auth/verify`
- Legacy Semaphore stores/UI remain; may be removed or integrated
- Add tests for auth flow (unit + Playwright)
- No multi-user/permission system yet
- Calendar event syncing doesn't create/modify user calendars
