# c-rat-o — Archive Pest Monitoring App

**Status:** Draft v0.1
**Author context:** Specification drafted from stakeholder brief, 2026-08-24
**Working name:** c-rat-o (CALL Archive Trap-o?) — rename if there's a real name.

## 1. Purpose

c-rat-o tracks insect pest activity in physical archive spaces using sticky
traps ("Blunder traps"). It replaces ad-hoc paper/spreadsheet logging with a
structured tool for recording trap checks, visualising where activity is
concentrated, and producing reports that justify treatment decisions.

The first deployment is the **CALL collection archive** (two rooms, one with
an unsealed external door — a likely pest entry point). The system must be
reusable for other sites with different room/trap layouts (e.g. a library)
without code changes.

## 2. Users

Single-user tool, no authentication. Whoever is physically walking the
archive checking traps uses **Data Input** mode; the same person (or a
manager) uses **Reporting** and **Admin** modes as needed. No role separation
is enforced — modes are just different views of the same app.

Primary devices: iPad (used while walking the archive, touch input) and
desktop (used for reporting/admin, mouse+keyboard). No native app — a
responsive web app covers both.

## 3. Core Concepts & Data Model

```
Site
 └─ Room (id, name, notes, floorplan reference)
     └─ Trap Location (fixed ID e.g. "R1-T3", position on room map)
         └─ Trap Placement (a physical trap installed at a location for a period)
             └─ Trap Check (an inspection event)
                 └─ Observation (species, lifecycle stage, count)
```

### 3.1 Site
Only one Site is active per deployment, but the data model is site-scoped so
the same app/config schema works for CALL, a library, etc. A Site owns a set
of Rooms.

### 3.2 Room
- `id`, `name` (e.g. "Room 1"), free-text `notes` (e.g. "has unsealed
  external door")
- A simple shape definition for the map view (see §6.4) — dimensions or a
  background image, plus placed trap markers.

### 3.3 Trap Location
- Fixed human-readable ID: `{Room}-T{n}` (e.g. `R1-T1`, `R2-T4`), assigned
  when the location is created and **never reused**, even if the physical
  trap is later removed from that spot.
- `x, y` coordinates on the room map (percentage-based, so the map scales
  responsively).
- When a trap location is moved it gets a new ID.
- A trap location may be retired and then may become active again.
- `status`: active / retired.

### 3.4 Trap Placement (relocation handling — see open question OQ-1)
A Trap Location's physical trap can be swapped for a fresh one repeatedly.
Rather than overwrite history, each physical trap-in-place is a
**Placement**: `date_set`, `date_replaced` (nullable while active), and the
`trap_location_id` it belongs to. This means:
- "Date trap set" / "date trap replaced" from the brief map to
  `date_set`/`date_replaced` on the Placement.

### 3.5 Trap Check
An inspection visit to a trap:
- `trap_location_id`
- `date_checked`
- if changing a trap placement, enter `date_set`/`date_replaced`
- `observations[]` — zero or more Observation records
- `notes` — free text
- `photos[]` — zero or more photo attachments
- Recording a Trap Check with an empty `observations[]` is valid and
  meaningful (nothing caught since last check).

### 3.6 Observation
One row per species+stage combination found in a single Trap Check:
- `species_id`
- `lifecycle_stage` (egg / larva-nymph / pupa / adult — see §3.8)
- `quantity` (integer ≥ 1)

### 3.7 Species (Insect Type)
Admin-managed, pre-populated list, extensible from Data Input too:
- `common_name`, `scientific_name` (optional), `category` (optional, e.g.
  "beetle", "silverfish", "psocid"), `notes`.


### 3.8 Lifecycle Stage
A fixed, admin-editable global list. Default: `Egg`, `Larva/Nymph`, `Pupa`,
`Adult`. Kept as one shared list across all species rather than per-species,
to keep reporting simple (see OQ-2 if this needs to vary by species).

### 3.9 Season
Admin-defined named date ranges used for seasonal reporting, e.g. "Wet
Season 2026" = 2026-11-01–2027-04-30. Seasons can repeat annually or be
one-off; overlapping seasons are allowed (reports just group by whichever
season(s) a date falls into).

## 4. Mode 1 — Data Input

### 4.1 Log a trap check
Flow: pick Room → pick Trap Location (or scan/tap on the map) → see current
Placement (or start a new one if none active) → enter:
- Date checked (defaults to today)
- If starting a new placement: date set
- If retiring this placement: date replaced
- Add one or more Observations: species (typeahead over the pre-populated
  list, with an inline "add new species" shortcut), lifecycle stage,
  quantity
- Free-text notes
- Photo(s) of the trap/insects (device camera or file picker)
- Save

### 4.2 Add a species inline
From the species picker, "add new" opens a minimal form (common name
required, everything else optional) and immediately selects the new species
for the current observation — no need to leave Data Input mode / go to
Admin.

### 4.3 Trap map view
A visual layout of each room (from Admin's room-configuration, §6.4) showing
trap markers. Markers are colour/badge-coded by recency, so a user can see at a glance which traps need attention. 
Colours indicate whether a trap has been changed in the last month. A green trap was changed in the last month. Amber hasn't been changed in two months. Red for traps that haven't been changed in over two months.
Tapping a marker jumps into the log-a-check flow for that trap.

### 4.4 History view
Per trap, a reverse-chronological list of past checks (date, species/counts
summary, notes, photo thumbnails) for quick reference while standing at that
trap.

## 5. Mode 2 — Reporting

All reports are filterable by: date range / season, room, trap location,
species, lifecycle stage. Views:

- **All traps, given period** — totals by species and stage across the
  whole site.
- **Per trap** — full catch history for one trap location.
- **Per room** — aggregated across all traps in a room, useful for
  comparing Room 1 (unsealed door) vs Room 2.
- **Seasonal comparison** — catch volumes and species mix per defined
  Season, to spot seasonal pest pressure.
- **Lifecycle prevalence by season** — for a selected season (or comparing
  seasons), what proportion of catches are eggs/larvae/pupae/adults, as a
  proxy for breeding activity vs incidental wandering adults.

Reports can cascade, so user can see report for a particular trap in a particular season etc.

### 5.1 Charts
- Bar chart: catch count by species (filterable by room/trap/date range)
- Stacked bar or line: catch volume over time, stacked by lifecycle stage
- Heatmap-style overlay on the room map: trap markers sized/coloured by
  catch volume in the selected period
- Pie/donut: lifecycle stage mix for a selected season

### 5.2 Export
Reports should be exportable (CSV for raw data, and/or print-to-PDF via
browser print styles) so they can be attached to a treatment request or
shared with facilities/conservation staff.

## 6. Mode 3 — Admin

No auth gate — just a separate area of the UI (e.g. a nav tab), since this
is a single-user tool.

### 6.1 Trap locations
- Add a Trap Location to a Room (auto-assigns next sequential ID for that
  room, e.g. adding a 5th trap to Room 2 → `R2-T5`).
- Relocate (move x,y within the room) — gets a new location ID.
- Retire a Trap Location (stops it appearing in Data Input's active list,
  keeps it in historic reports). Trap locations can be reactivated.

### 6.2 Seasons
CRUD on named date ranges (§3.9).

### 6.3 Species list
CRU on species (§3.7). No need for deactivation/deletion, species records persist.

### 6.4 Room / layout configuration
This is what makes the app portable to a new site (e.g. a library):
- Define Rooms for the Site (name, notes).
- Define each Room's layout: choose a simple shape (rectangle with
  configurable aspect ratio).
- Place Trap Location markers on the layout by clicking/dragging — this
  sets the `x,y` used by the map views in §4.3 and §5.1.
- The whole Site configuration (rooms, layout, trap locations, species
  list, seasons) is exportable/importable as a single JSON file, so setting
  up a new deployment for another location is "import a config" rather than
  "reconfigure by hand" — and doubles as a config backup.

## 7. Technical Approach

### 7.1 Constraints recap
- Minimal tech, static hosting via **GitHub Pages** (no server, no backend
  API, no database server).
- Single user, no login.
- Must work well on iPad (touch) and desktop (mouse/keyboard).
- All functions must have tests.

### 7.2 Proposed stack
- Static single-page app: **Vite + TypeScript**, with a lightweight UI
  framework (**Svelte** or **Preact**) — small bundle size, fast on iPad
  Safari, easy to unit test. (Plain TS with no framework is also viable if
  even less tooling is preferred — flagging as a choice, not locking it in.)
- Charts: a lightweight charting lib (e.g. **Chart.js**) or hand-rolled SVG
  for the small set of chart types in §5.1.
- Data persistence: **browser storage on-device** (IndexedDB, via a thin
  wrapper) since GitHub Pages can't run a database. This is the biggest
  architectural implication of the constraints — see §7.3.
- Deployment: GitHub Actions workflow building the Vite app and publishing
  `dist/` to the `gh-pages` branch / Pages source.
- Testing: **Vitest** for unit tests (data model, aggregation/report
  calculations, storage layer) and component tests; consider **Playwright**
  for a handful of end-to-end smoke tests (log a check, view a report)
  since the brief asks for tests on all functions.

### 7.3 Data persistence & sync
A static GitHub Pages site has no server, so "the data" has to live
somewhere client-side:
- **IndexedDB in the browser** holds all Trap Checks, photos (as blobs),
  species, config, etc. This works offline and is the natural default.
- **Trade-off:** data entered on the iPad in the archive stays on that
  iPad's browser storage — it does not automatically appear on the desktop
  used for reporting, and clearing browser data/cache loses it.
- **Mitigation built into the spec:** a manual **Export/Import** (JSON +
  photo blobs, or a zip) lets the user move data between devices and take
  backups. This is workable for a low-frequency, single-user workflow (walk
  the archive, then export and load into the reporting device weekly) but
  is manual.
- **Optional automation:** §7.6 below adds a Google Drive sync option that
  automates this same export/import bundle instead of moving files by hand.
  It's still push/pull on request, not real-time — see §9.


### 7.4 Offline support
Because the archive is a physical space that may have poor wifi, the app
should work as an **offline-capable PWA** (service worker caching the app
shell, IndexedDB for data) so Data Input mode works with no connectivity,
which fits naturally with the on-device storage model in §7.3.

### 7.5 Photos
Stored as blobs in IndexedDB, downscaled on capture to keep storage
reasonable (iPad Safari IndexedDB has practical size limits). Included in
the export/import bundle. Not uploaded anywhere externally.

### 7.6 Google Drive sync (optional)

Automates §7.3's export/import bundle over the user's own Google Drive
instead of manual file transfer, while keeping the "no backend" constraint —
it's a client-side OAuth flow plus direct calls to the Drive REST API, no
server of ours involved.

- **Auth**: Google Identity Services (GIS) token flow, scope
  `drive.file` — the app can only see/modify files it created itself, never
  the rest of the user's Drive. Tokens are session-only (not persisted); the
  user reconnects each session (or when the ~1hr token expires).
- **Storage shape**: one file, `c-rat-o-backup.json`, inside a `c-rat-o`
  folder in the user's Drive (both created on first use), holding the exact
  same bundle `exportBundle()` already produces (all data + photos as
  base64) — found by name via `drive.file`'s search scope, not a fixed ID. A
  file found at the Drive root from before folder support existed is moved
  into the folder automatically rather than duplicated.
- **Sync model**: manual **Push** / **Pull**, not automatic or real-time.
  Push writes the full local state to Drive (creating the file on first use,
  updating it after); Pull downloads and replaces all local state, same as
  the manual Import already does.
- **Conflict guard**: before a Push, the app compares the Drive file's
  `modifiedTime` against the timestamp this device last synced. If Drive has
  moved on since (i.e. another device pushed in between), the user is
  warned before an overwrite is allowed, rather than silently clobbering it.
  This is a guard, not real merging — see the accepted trade-off in §9.
- **Setup**: one OAuth client ID is created once by whoever deploys the app
  (not by each end user) and baked into the build as `VITE_GOOGLE_CLIENT_ID`,
  so users just click "Sign in with Google" — no per-user Cloud Console
  setup, no API key, no client secret. To create it: Google Cloud Console →
  APIs & Services → Credentials → Create Credentials → OAuth client ID →
  Application type "Web application" → add the deployed site's URL (e.g.
  `https://benfoley.github.io`) under "Authorized JavaScript origins" → set
  `VITE_GOOGLE_CLIENT_ID` as a GitHub Actions repo secret (read by
  [deploy.yml](.github/workflows/deploy.yml)) or in a local `.env.local` for
  dev. If it's never set, the UI falls back to asking each user for their
  own client ID instead (same flow as before), so the app still works
  unconfigured.
- **Trade-off**: an unverified Google OAuth app is capped at ~100 total
  authorized users across everyone using that one client ID. Past that,
  Google requires app verification (proof of domain ownership, a privacy
  policy, and review, since `drive.file` is a restricted scope). The
  per-user-client-ID fallback avoids this cap — each person's usage counts
  against their own quota — at the cost of a manual setup step for them.

## 8. Non-functional requirements

- **Responsive/touch-friendly**: usable one-handed on iPad while standing
  next to a trap; also usable with mouse+keyboard on desktop.
- **No auth**: mode switching only, no login screen.
- **Resilient to interruption**: data input form should not lose in-progress
  entries on accidental navigation (autosave draft).
- **Portable configuration**: a second site's entire setup should be
  loadable via config import (§6.4) with zero code changes.
- **Testable**: business logic (ID assignment, placement/check history,
  report aggregation, season-matching, CSV export) implemented as pure
  functions with unit test coverage; storage layer covered by tests against
  a fake/in-memory IndexedDB.

## 9. Out of scope (v1)

- User accounts, permissions, multi-user concurrent editing.
- Automated species identification from photos.
- Real-time push notifications/reminders for trap check schedules.
- Cross-device *real-time* sync — §7.6's Drive sync is manual push/pull,
  not automatic or live.
- Treatment/action tracking beyond reporting (e.g. no workflow for logging
  pesticide application, contractor visits, etc., unless requested).

## 10. Open questions

None

## 11. Suggested phased build

1. Data model + IndexedDB storage layer + unit tests.
2. Admin: room/trap/species/season config (needed before Data Input is
   usable).
3. Data Input: log checks, trap map, history view.
4. Reporting: filters, tables, then charts.
5. Export/import (config + full data backup).
6. PWA/offline polish, iPad UX pass, GitHub Actions deploy pipeline.
7. Optional: Google Drive sync (§7.6).
