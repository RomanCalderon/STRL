# Load-time performance Implementation Plan

> Part of [plan README](README.md). Controllers start at README; implementers do not open it.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the first browse paint independent of Google Maps JS and oversized JPEG thumbnails, so median simulated LCP moves off the 7.77 s Maps-tile path without regressing TBT, CLS, or instant city filters.

**Architecture:** The reserved map slot SSR-renders a same-origin `<img>` from `/api/maps/static`. That route looks up the city center in Neon and fetches Google Static Maps with the **server** key. Interactive `@vis.gl/react-google-maps` loads only after an explicit Explore-map action. `/api/photos` transcodes Places bytes to deterministic WebP (thumb vs hero quality) via `sharp`. `AppShell` keeps owning browse state but lazy-loads `AddPlace` and `PlaceDetail`. The city index stays fully in memory for AND-filters; `placeId` moves off the index onto card fields.

**Tech Stack:** Next.js 16 App Router (Node runtime, React 19), existing Drizzle/Neon browse payload, `@vis.gl/react-google-maps` (on intent only), Google Static Maps (server-proxied), `sharp@0.35.3`, Vitest + Testing Library. Do not use `next/image` for session-gated photos or the map poster (the optimizer does not forward cookies).

## File Map

| Path | Responsibility |
|---|---|
| `src/lib/map-poster-url.ts` | Client-safe `mapPosterSrc(cityId)` |
| `src/lib/static-map.ts` | Server-only Static Maps URL + `loadStaticMapBytes` (mocked fetch in tests) |
| `src/app/api/maps/static/route.ts` | Session-gated GET; cityId → Neon center → Google → image bytes |
| `src/components/map-view.tsx` | Poster + Explore control; dynamic `map-canvas` only after click |
| `src/components/map-canvas.tsx` | Unchanged Maps JS island; still the only `@vis.gl` import |
| `src/app/(browse)/page.tsx` | `preload()` the poster URL when a city exists |
| `src/lib/photo-url.ts` | Existing size buckets; add `photoSizeFromMaxHeight` |
| `src/lib/photo-transcode.ts` | WebP encode with thumb/hero quality; passthrough on failure |
| `src/app/api/photos/route.ts` | Fetch Places photo, transcode, keep `Cache-Control: private, max-age=86400` |
| `package.json` | Add `sharp@0.35.3` (task 2) |
| `src/components/app-shell.tsx` | `next/dynamic` for `AddPlace` / `PlaceDetail`; keep `Toast` eager |
| `src/lib/places-types.ts` | `placeId` on `PlaceCardFields` only; `PlaceIndex` keeps `cityId` |
| `src/actions/browse.ts` | Stop selecting `placeId` on the city index |
| Tests listed per task | Route, lib, map-view, app-shell, browse payload |

## Design References

- Diagnosis (do not copy numbers into code): `/Users/roman/.cursor/projects/Users-roman-Documents-repos-bop/canvases/lighthouse-clean-runs-comparison.canvas.tsx`
- Prior load-time plan (already landed: idle-ish Maps split, `PlaceIndex` vs card fields, list windowing): `docs/superpowers/plans/2026-08-18-browse-load-time/`
- Product constraints: `docs/superpowers/specs/2026-08-16-bop-design.md`, `docs/superpowers/specs/2026-08-17-bop-ui-polish.md`
- Next.js (read before implementing): `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`, `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`, `node_modules/next/dist/docs/01-app/01-getting-started/12-images.md`
- Tokens: `src/app/globals.css` (`--paper`, `--ink`, `--accent`, `--sheet`, `--muted`)
- Map chrome: `src/lib/map-style.ts` (`bopMapStyle`), `src/lib/map-pins.ts` (do not change pin math)
- Commit: `~/.cursor/skills/commit/commit-no-trailer.sh` (never `git commit`)

## Locked design decisions

### P0 — Poster is the LCP candidate; live map is opt-in

`MapView` currently dynamic-imports `map-canvas` in `useEffect` on mount, so Lighthouse still picks a 256×256 Maps tile (median ~2.06 s discovery + ~35 ms download). A CSS paper slot is not enough if tiles still load without a user gesture.

**Do this:** SSR an `<img src="/api/maps/static?cityId=…">` that fills the existing grid slot (`h-full min-h-0`, phone ~40vh / desktop remaining column). `loading="eager"` and `fetchPriority="high"`. `page.tsx` calls `preload(mapPosterSrc(cityId), { as: "image", fetchPriority: "high" })`. Click/tap/keyboard on **Explore map** is the only trigger for `import("./map-canvas")`. After that click, LCP is frozen; later tiles cannot steal it.

**Do not do this:** Auto-activate after idle/FCP. Do not put `GOOGLE_PLACES_SERVER_KEY` or `NEXT_PUBLIC_GOOGLE_MAPS_KEY` in HTML, poster `src`, or comments. Do not pass user-supplied lat/lng into the static-map route (open proxy). Do not add `<link rel="preconnect">` to `maps.googleapis.com` on first load.

If Static Maps fails (API not enabled, 403, network): poster `onError` hides the img; paper slot + Explore map remain. Interactive Maps can still work via the existing browser key. List stays usable if live Maps also fails (`MapErrorBoundary` already renders `MapSlotPlaceholder`).

### Static Maps wiring

Use `process.env.GOOGLE_PLACES_SERVER_KEY` on the server only. The public Maps JS key is HTTP-referrer restricted and will not work for a Vercel origin `fetch`. Operator must enable **Maps Static API** on the same Google Cloud project and allow it on the server key’s API restriction list.

Poster image: `size=640x640`, `scale=2`, `format=jpg`, `zoom=12` when the city has a center, otherwise fallback center `{ lat: 39.8, lng: -98.6 }` at zoom 4 (same as `map-canvas` empty-city fallback). Do not encode 150 pin markers into the Static Maps URL (length limits). Pins appear on the live map.

Apply `bopMapStyle` as repeated `style=` query params (hex colors as `0xefe6d6`, no `#`).

Cache: `Cache-Control: private, max-age=86400` (session-gated, same as photos).

### P1 — WebP thumbs; higher-quality hero; no AVIF

`next/image` / `/_next/image` cannot see the allowlist cookie (already documented in `place-list.tsx`). Transcode inside `/api/photos` with `sharp@0.35.3` (current npm `sharp` at plan time; Next’s optimizer uses sharp internally but this app does not depend on it today).

| Bucket | `h` | WebP quality |
|---|---|---|
| `thumb` | 160 | 60 |
| `hero` | 800 | 80 |

Always emit `image/webp` when transcode succeeds. No `Accept` negotiation (deterministic cache). Keep `Cache-Control: private, max-age=86400`. If bytes are not a raster sharp can decode, or sharp throws, return the original bytes and original `content-type`.

Do not change `PLACE_LIST_PAGE_SIZE` / IntersectionObserver in this plan. Format first; request-count is already windowed at 20.

### P1 — Lazy hidden UI, not an AppShell rewrite

Keep `AppShell` as the client island that owns payload / selection / toast. Replace static imports of `AddPlace` and `PlaceDetail` with `next/dynamic` named exports, rendered only when `adding` / `selected` is set. Keep `Toast` and `BrowseApp` static. Do not move filter state onto the server. Do not claim exact KiB savings without `npm run build` chunk evidence.

### P2 — Compact index without paging

Client-side AND filters (including notes + address) stay instant, so the full city `places[]` stays in the payload. Do **not** naive-page the index.

Drop `placeId` from `PlaceIndex` (list, map, filters, and the sheet-before-card do not use it). Keep `cityId` on `PlaceIndex` because `PlaceDetail`’s city `<select>` and “New area” run on index rows before `getPlaceCard` returns.

`BrowsePlace` still has `placeId` via `PlaceCardFields`. Mutations and `getPlaceCard` unchanged.

## Target interfaces

### Map poster — `src/lib/map-poster-url.ts`

```ts
export function mapPosterSrc(cityId: string): string {
  return `/api/maps/static?cityId=${encodeURIComponent(cityId)}`;
}
```

### Static Maps — `src/lib/static-map.ts`

```ts
import "server-only";

export const STATIC_MAP_SIZE = {
  width: 640,
  height: 640,
  scale: 2,
} as const;

export const STATIC_MAP_CITY_ZOOM = 12;
export const STATIC_MAP_FALLBACK = {
  lat: 39.8,
  lng: -98.6,
  zoom: 4,
} as const;

export function staticMapStyleParams(): string[]; // encoded bopMapStyle rules

export function buildStaticMapUrl(opts: {
  lat: number;
  lng: number;
  zoom: number;
  apiKey: string;
}): string;

export async function loadStaticMapBytes(opts: {
  cityId: string;
  getCity: (
    id: string,
  ) => Promise<{ centerLat: number | null; centerLng: number | null } | null>;
  fetchMap: typeof fetch;
  apiKey: string;
}): Promise<
  | { ok: true; bytes: Uint8Array; contentType: string }
  | { ok: false; status: 400 | 404 | 502 }
>;
```

`GET /api/maps/static`: allowlisted session; missing/blank `cityId` → 400; unknown city → 404; Google non-OK or non-image → 502. Never put `apiKey` in the response body.

### MapView

```ts
export function MapView(props: {
  city: BrowsePayload["city"];
  places: PlaceIndex[];
  markerIds: string[];
  selectedPlaceId?: string | null;
  onSelect: (id: string) => void;
}): JSX.Element;
```

First paint (SSR + pre-click): outer `data-testid="map-slot"` sized `h-full min-h-0 w-full overflow-hidden bg-[var(--paper)]`. If `city`, render poster `<img data-testid="map-poster">`. Always render a control `aria-label="Explore map"` until live. After click, keep the poster underneath until `MapCanvas` paints; do not import `map-canvas` before click.

### Photo transcode

In `src/lib/photo-url.ts` next to `PHOTO_MAX_HEIGHT`:

```ts
export const PHOTO_WEBP_QUALITY = { thumb: 60, hero: 80 } as const;
export function photoSizeFromMaxHeight(height: number): PhotoSize;
```

In `src/lib/photo-transcode.ts`:

```ts
export async function transcodePhoto(
  bytes: Uint8Array,
  contentType: string,
  size: PhotoSize,
): Promise<{ bytes: Uint8Array; contentType: string }>;
```

### Place types — `src/lib/places-types.ts`

```ts
export type PlaceIndex = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  formattedAddress: string;
  cityId: string;
  areaId: string | null;
  areaName: string | null;
  type: string | null;
  extraTags: string[];
  notes: string;
  photoName: string | null;
};

export type PlaceCardFields = {
  placeId: string;
  rating: number | null;
  googleMapsUrl: string;
  authorAttributions: PhotoAttribution[];
};

export type BrowsePlace = PlaceIndex & PlaceCardFields;
```

`hasCardFields` stays `"googleMapsUrl" in place && "authorAttributions" in place`.

### AppShell lazy widgets

```ts
import dynamic from "next/dynamic";

const AddPlace = dynamic(() =>
  import("./add-place").then((mod) => ({ default: mod.AddPlace })),
);
const PlaceDetail = dynamic(() =>
  import("./place-detail").then((mod) => ({ default: mod.PlaceDetail })),
);
```

Render `{adding ? <AddPlace … /> : null}` and `{selected ? <PlaceDetail … /> : null}` exactly as today so the chunks load only when opened.
