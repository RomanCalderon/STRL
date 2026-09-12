> Part of [plan README](README.md). Controllers may use this to reject scope creep. Implementers do not open this file.

## Out of scope

- Promoting `fix/load-time-performance` to production
- Auto-activating the live map after first paint / idle
- CSS-only map placeholder while Maps JS still loads in the background
- Putting lat/lng (or the server key) on the static-map image URL
- Drawing all city pins onto the Static Maps URL
- Preconnect/prefetch to `maps.googleapis.com` / Maps fonts on first load
- `next/image` or `/_next/image` for session-gated photos or the map poster
- AVIF or content-negotiated image formats
- Re-doing list windowing or loading more than 20 thumbs up front
- Naive server paging of the city place index
- Deferring `notes` or `formattedAddress` off the index (that breaks client search)
- Dropping `cityId` from `PlaceIndex` (PlaceDetail city/area editors need it before the card fetch)
- Rewriting `AppShell` into a server shell + many islands beyond lazy `AddPlace` / `PlaceDetail`
- Map clustering, Mapbox/MapLibre, pin size changes
- Switching off Neon HTTP
- Broad Neon/query tuning (clean reports do not show server time as the limiter)
- Live Google or Lighthouse in CI
- Auth, seed CLI, Settings, city deletion, or visual polish unrelated to load
- Speculative upgrades other than adding `sharp@0.35.3`
