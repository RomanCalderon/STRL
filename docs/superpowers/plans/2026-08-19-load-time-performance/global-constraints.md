> Part of [plan README](README.md).

> Every task in this plan implicitly includes these constraints.

## Global Constraints

- Browse and filter never call the Google Places API; they read Neon only.
- Places Autocomplete, Text Search, Details, Photos, and Static Maps run on the server. The server API key never ships to the browser, HTML, image URLs, or tests as a real secret (fake strings like `server-test-key` are fine).
- `"use client"` only on interactive leaves. Do not import `src/db`, `src/lib/places.ts`, `src/lib/auth.ts`, `src/lib/seed.ts`, or `src/lib/static-map.ts` into client components.
- No live Google calls in CI. Mock `fetch` / `PlacesPort` / `@vis.gl/react-google-maps`.
- Commits use `~/.cursor/skills/commit/commit-no-trailer.sh`. Never `git commit`. Never `git add .`.
- Do not commit `.env`, `.env.local`, or secrets.
- Filter semantics stay AND; type/area/tag remain single-select. Search haystack stays name, address, notes, type, area name, extra tags.
- Client-side AND filters on the current city stay instant (full city index in memory). Do not naive-page `PlaceIndex[]`.
- Phone-first layout stays: map ~40vh on phone; list ~28rem on desktop. Do not change `pinAppearance` / clustering.
- Keep list windowing (`PLACE_LIST_PAGE_SIZE`, IntersectionObserver). Photos stay `loading="lazy"` on list thumbs; the map poster is the exception (`eager` + `fetchPriority="high"`).
- Session-gated images use raw `<img>` to `/api/photos` or `/api/maps/static`. Do not switch them to `next/image`.
- Photo and static-map routes keep `Cache-Control: private, max-age=86400`.
- Loading / empty copy from polish stays for true empty, never in-flight.
- Do not set `runtime = "edge"` on photo or static-map routes (`sharp` and Node `fetch` stay on the default Node.js runtime).
- Do not add AVIF, `Accept`-based image negotiation, or a second image library besides `sharp@0.35.3`.
- Interactive Maps load only after explicit Explore-map intent. Do not restore mount/`requestIdleCallback` auto-load.
- Production promotion, unrelated UI restyles, database redesign, and unrelated dependency upgrades are out of this plan.
