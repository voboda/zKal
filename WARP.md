# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**zKal** is a freedom-respecting group calendar server that uses zero-knowledge proofs (Semaphore) to prove group membership without revealing user data. It's a self-hosted calendar proxy that aggregates multiple .ICS feeds (supporting gradual migration away from Google Calendar) and provides both a web UI and programmatic access to calendar events.

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
- **Authentication**: Semaphore (zero-knowledge proofs) + zuAuth + zuPass
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

### State Management
- **Persistent Stores** (`src/lib/stores.js`):
  - `id` – User's Semaphore identity (privateKey, publicKey, commitment, nullifier)
  - `groups` – Array of Semaphore groups user belongs to
  - Uses `svelte-persisted-store` for browser LocalStorage persistence

### Authentication (Work-in-Progress)
- **Login Flow** (`src/routes/login/+page.svelte`):
  - Create Semaphore Identity (commitment, nullifier, secret, trapdoor)
  - Create/join Groups and prove membership without revealing identity
  - Submit ID via form to `src/routes/login/+page.server.js` (currently validates nullifier > 0)
- **zuAuth Integration** (`src/lib/zuauth/`):
  - Configurable proof verification (ethBerlin config exists)
  - Server-side `authenticate()` function for validating zk proofs
  - Note: Currently mostly commented out / in development

### Configuration
All configuration via environment variables (see `.env.sample`):
- `PUBLIC_CACHE_DIR` – Cache directory path (default `.cache`)
- `PUBLIC_CACHE_FILE` – Cache filename (default `calendar.json`)
- `PUBLIC_CACHE_TIME` – Cache TTL in milliseconds (default 600000 = 10min)
- `PUBLIC_CALENDAR_URLS` – JSON array of calendars with `{url, color, name}` (must be valid .ICS URLs)
- `PUBLIC_SIGNUP_LINK_PATTERNS` – JSON array of URL patterns to search for in event descriptions

### Directory Structure (Excluding node_modules)
```
src/
├── routes/                    # SvelteKit file-based routing
│   ├── +page.svelte          # Home/calendar view (main UI)
│   ├── +page.js              # Data loading (transforms .ICS to calendar events)
│   ├── +layout.server.js     # Unused layout hooks
│   ├── login/
│   │   ├── +page.svelte      # Semaphore identity/group setup UI
│   │   └── +page.server.js   # Login form handler
│   ├── auth/+server.js       # zuAuth verification endpoint (commented out)
│   └── feed/
│       ├── ical/+server.js   # GET /feed/ical – Returns .ICS format
│       └── json/+server.js   # GET /feed/json – Returns JSON format
├── lib/
│   ├── fetchCalendar.js      # Core: fetches, parses, caches .ICS feeds
│   ├── stores.js             # Persistent auth state (Semaphore ID, groups)
│   ├── CalendarLegend.svelte # Legend UI component
│   ├── AddToCalendar.svelte  # Export event to user's calendar
│   └── zuauth/               # Zero-knowledge proof integration
│       ├── index.js
│       ├── server.js
│       ├── zuauth.js
│       └── configs/ethberlin.js
├── hooks.server.js           # Server hooks (currently unused)
└── app.html                  # HTML template
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
- Edit `src/routes/login/+page.svelte` for UI changes
- Edit `src/routes/login/+page.server.js` for validation logic
- Uncomment and fix `src/routes/auth/+server.js` to enable zuAuth verification

### Testing the Full Flow
- Run `npm run dev`
- Navigate to `/login` to create identity and group
- Return to `/` to see aggregated calendar
- Check network tab to see requests to `/feed/json` and response structure

## Known Limitations & TODO Items
- Authentication is incomplete (see commented zuAuth code)
- No persistent RSVP storage beyond client-side state
- No multi-user/permission system yet
- Semaphore group management is minimal
- Calendar event syncing doesn't create/modify user calendars
