# Load-time performance — Implementation Plan

**Spec / diagnosis:** [2026-08-16-bop-design.md](../../specs/2026-08-16-bop-design.md), [2026-08-17-bop-ui-polish.md](../../specs/2026-08-17-bop-ui-polish.md), prior browse load-time tree `docs/superpowers/plans/2026-08-18-browse-load-time/`. Clean Lighthouse comparison: `/Users/roman/.cursor/projects/Users-roman-Documents-repos-bop/canvases/lighthouse-clean-runs-comparison.canvas.tsx`.

**Handoff:** `/tmp/bop-load-time-performance-planning-handoff.md`. This tree implements those resolutions; it does not restate the full audit.

## Required reading order

1. [overview.md](overview.md) — goal, architecture, file map, locked decisions, target interfaces
2. [global-constraints.md](global-constraints.md) — binding rules for every task
3. [deferred.md](deferred.md) — do not implement (controllers only)
4. Tasks in dependency order (see index). Implementers read only `overview.md`, `global-constraints.md`, and their own task file.

## Task index

| # | Title | Path | Depends on |
|---|---|---|---|
| 1 | Static map poster; live Maps only on intent | [tasks/01-map-poster-on-intent.md](tasks/01-map-poster-on-intent.md) | — |
| 2 | Transcode proxied photos to WebP | [tasks/02-webp-photo-proxy.md](tasks/02-webp-photo-proxy.md) | — |
| 3 | Lazy-load AddPlace and PlaceDetail | [tasks/03-lazy-hidden-dialogs.md](tasks/03-lazy-hidden-dialogs.md) | — |
| 4 | Drop unused `placeId` from the city index | [tasks/04-compact-place-index.md](tasks/04-compact-place-index.md) | — |
| 5 | Repeatable Lighthouse verification | [tasks/05-lighthouse-verify.md](tasks/05-lighthouse-verify.md) | 1, 2, 3, 4 |

## Waves

- **Wave A (parallel):** Tasks 1, 2, and 3 (map poster, photo WebP, lazy dialogs). Task 4 may also run in parallel if it does not edit `map-view.test.tsx` fixtures that task 1 is rewriting; if both land together, rebase the `PlaceIndex` fixture so task 1 keeps `placeId` until task 4 removes it from the type.
- **Wave B:** Task 4 after Wave A if typecheck conflicts appear (`PlaceIndex` shape).
- **Wave C:** Task 5 on a preview of the merged branch.

Prefer serial SDD in index order (1 → 2 → 3 → 4 → 5) to avoid fixture clashes. Parallelism is allowed, not required.

## Acceptance mapping

| Requirement | Task |
|---|---|
| Server-visible map poster is the initial LCP candidate; Maps tile is not | 1, 5 |
| Interactive Maps loads only after Explore map | 1, 5 |
| Static Maps key stays on the server; cityId-only poster URL | 1 |
| Poster/paper + Explore map if Static Maps or live Maps fails; CLS stays 0 | 1, 5 |
| Proxied thumbs/heroes transcode to WebP (60 / 80); original bytes on failure | 2 |
| `Cache-Control: private, max-age=86400` on photo and static-map routes | 1, 2 |
| `AddPlace` / `PlaceDetail` not in the first client graph; behavior preserved | 3 |
| Full city index still filterable including notes; `placeId` only on cards | 4 |
| TBT &lt; 200 ms; CLS = 0; simulated LCP materially below 7.77 s; image bytes drop toward ~258 KiB savings | 5 |
| No production promotion, paging, AVIF, `next/image` for gated media, auto-live map | [deferred.md](deferred.md) |

## Author self-review

- **Spec coverage:** Handoff P0 (Maps LCP) is task 1. P1 thumbnails is task 2. P1 hydration/unused first-party JS is task 3. P2 payload is task 4 (field trim only; paging deferred because filters need the full index). Verification protocol and numeric gates are task 5 / this README. Operator enablement for Maps Static API is below, not a code task.
- **Placeholder scan:** Task files name exact paths, `npx vitest run …` commands, expected fail/pass, and the commit helper. No TBD / “handle edge cases” / “similar to Task N”.
- **Type consistency:** `mapPosterSrc`, `loadStaticMapBytes`, `PHOTO_WEBP_QUALITY`, `transcodePhoto`, `photoSizeFromMaxHeight`, `PlaceIndex` without `placeId`, `PlaceCardFields.placeId`, and `next/dynamic` `AddPlace` / `PlaceDetail` match `overview.md`. Task 1’s MapView fixture still includes `placeId` so it typechecks before task 4.

## Post-impl operator asks

1. In the existing Google Cloud project, enable **Maps Static API**.
2. Add Maps Static API to the **server** key restriction list (`GOOGLE_PLACES_SERVER_KEY`). Do not put that key in client env, HTML, or referrer-restricted browser keys.
3. Confirm the browser Maps JS key (`NEXT_PUBLIC_GOOGLE_MAPS_KEY`) remains HTTP-referrer restricted for interactive Explore map.
4. After Wave C, a human should load `/` signed-in: map slot shows a city poster (or paper if Static Maps is not enabled yet), list is usable, Explore map reveals pins, add/detail overlays still work.
