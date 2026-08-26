# c-rat-o

Archive pest monitoring app — see [SPEC.md](./SPEC.md) for the full specification.

Tracks insect pest activity from sticky traps ("Blunder traps") placed around
a physical archive, with data entry, reporting/charts, and an admin
configuration interface for rooms, trap layouts, species and seasons.

Client-side only (no backend): data lives in the browser's IndexedDB, with
export/import for backups and moving data between devices.

## Development

```bash
npm install
npm run dev
```

## Testing

```bash
npx vitest run       # unit tests
npx vitest            # watch mode
npm run check          # svelte-check type checking
```

## Building / deploying

```bash
npm run build
```

Pushing to `main` runs the tests and deploys `dist/` to GitHub Pages via
[.github/workflows/deploy.yml](./.github/workflows/deploy.yml). Enable Pages
for the repo under Settings → Pages → Source: "GitHub Actions".

### Google Drive sync (optional)

Set a `VITE_GOOGLE_CLIENT_ID` repo secret (Settings → Secrets and variables →
Actions) so users can sign in to Drive sync without any setup of their own —
see [SPEC.md §7.6](./SPEC.md) for how to create the OAuth client ID. For
local development, copy `.env.example` to `.env.local` and fill it in. Left
unset, the app falls back to asking each user for their own client ID.

## Project structure

- `src/lib/*.ts` — data model, storage (IndexedDB via `idb`), and business
  logic (trap labelling, relocation, lifecycle-status colouring, season
  matching, report aggregation, CSV/JSON export). All covered by unit tests
  in `src/lib/*.test.ts`.
- `src/lib/components/*.svelte` — UI for the three modes: Data Input,
  Reporting, Admin.
