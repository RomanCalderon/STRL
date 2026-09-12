> Required prior reads: [overview.md](../overview.md), [global-constraints.md](../global-constraints.md).  
> Do not open `README.md` or other task files.

### Task 1: Static map poster; live Maps only on intent

**Files:**
- Create: `src/lib/map-poster-url.ts`
- Create: `src/lib/map-poster-url.test.ts`
- Create: `src/lib/static-map.ts`
- Create: `src/lib/static-map.test.ts`
- Create: `src/app/api/maps/static/route.ts`
- Create: `src/app/api/maps/static/route.test.ts`
- Modify: `src/components/map-view.tsx`
- Modify: `src/components/map-view.test.tsx`
- Modify: `src/app/(browse)/page.tsx`
- Test: `src/lib/map-poster-url.test.ts`, `src/lib/static-map.test.ts`, `src/app/api/maps/static/route.test.ts`, `src/components/map-view.test.tsx`

**Interfaces:**
- Consumes: `BrowsePayload["city"]`, `PlaceIndex[]`, `bopMapStyle` from `src/lib/map-style.ts`, `getAllowedSession`, `db` + `cities`, `MapSlotPlaceholder`, existing `MapCanvas` export
- Produces: `mapPosterSrc(cityId: string): string`; `buildStaticMapUrl`, `staticMapStyleParams`, `loadStaticMapBytes` as in overview.md; `GET /api/maps/static?cityId=`; `MapView` that does **not** import `map-canvas` until Explore map; page `preload` of the poster

Do not change `pinAppearance`. Do not auto-load Maps on mount or idle. Do not put any API key in the poster `src`. Do not pass lat/lng query params on `/api/maps/static`.

- [ ] **Step 1: Write the failing URL and Static Maps tests**

`src/lib/map-poster-url.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mapPosterSrc } from "./map-poster-url";

describe("mapPosterSrc", () => {
  it("encodes the city id on the session-gated static map route", () => {
    expect(mapPosterSrc("c1")).toBe("/api/maps/static?cityId=c1");
    expect(mapPosterSrc("a/b")).toBe("/api/maps/static?cityId=a%2Fb");
  });
});
```

`src/lib/static-map.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import {
  STATIC_MAP_CITY_ZOOM,
  STATIC_MAP_FALLBACK,
  STATIC_MAP_SIZE,
  buildStaticMapUrl,
  loadStaticMapBytes,
  staticMapStyleParams,
} from "./static-map";

describe("buildStaticMapUrl", () => {
  it("points at Static Maps with the city center and fake key as a query param only", () => {
    const url = new URL(
      buildStaticMapUrl({
        lat: 30.27,
        lng: -97.74,
        zoom: STATIC_MAP_CITY_ZOOM,
        apiKey: "server-test-key",
      }),
    );
    expect(url.origin + url.pathname).toBe(
      "https://maps.googleapis.com/maps/api/staticmap",
    );
    expect(url.searchParams.get("center")).toBe("30.27,-97.74");
    expect(url.searchParams.get("zoom")).toBe("12");
    expect(url.searchParams.get("size")).toBe(
      `${STATIC_MAP_SIZE.width}x${STATIC_MAP_SIZE.height}`,
    );
    expect(url.searchParams.get("scale")).toBe("2");
    expect(url.searchParams.get("format")).toBe("jpg");
    expect(url.searchParams.get("key")).toBe("server-test-key");
    expect(url.searchParams.getAll("style").length).toBeGreaterThan(0);
  });
});

describe("staticMapStyleParams", () => {
  it("encodes paper geometry without hash prefixes", () => {
    const styles = staticMapStyleParams();
    expect(styles.some((s) => s.includes("color:0xefe6d6"))).toBe(true);
    expect(styles.some((s) => s.includes("#"))).toBe(false);
    expect(styles.some((s) => s.includes("feature:poi") && s.includes("visibility:off"))).toBe(
      true,
    );
  });
});

describe("loadStaticMapBytes", () => {
  it("returns 400 for a blank city id", async () => {
    const result = await loadStaticMapBytes({
      cityId: "  ",
      getCity: async () => ({ centerLat: 1, centerLng: 2 }),
      fetchMap: vi.fn(),
      apiKey: "server-test-key",
    });
    expect(result).toEqual({ ok: false, status: 400 });
  });

  it("returns 404 when the city is missing", async () => {
    const result = await loadStaticMapBytes({
      cityId: "missing",
      getCity: async () => null,
      fetchMap: vi.fn(),
      apiKey: "server-test-key",
    });
    expect(result).toEqual({ ok: false, status: 404 });
  });

  it("fetches the styled static map for a city center", async () => {
    const fetchMap = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      expect(url.searchParams.get("center")).toBe("30.27,-97.74");
      expect(url.searchParams.get("key")).toBe("server-test-key");
      return new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      });
    });
    const result = await loadStaticMapBytes({
      cityId: "c1",
      getCity: async () => ({ centerLat: 30.27, centerLng: -97.74 }),
      fetchMap,
      apiKey: "server-test-key",
    });
    expect(result).toEqual({
      ok: true,
      bytes: new Uint8Array([1, 2, 3]),
      contentType: "image/jpeg",
    });
    expect(fetchMap).toHaveBeenCalledOnce();
  });

  it("uses the continental fallback when the city has no center", async () => {
    const fetchMap = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      expect(url.searchParams.get("center")).toBe(
        `${STATIC_MAP_FALLBACK.lat},${STATIC_MAP_FALLBACK.lng}`,
      );
      expect(url.searchParams.get("zoom")).toBe(String(STATIC_MAP_FALLBACK.zoom));
      return new Response(new Uint8Array([9]), {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      });
    });
    const result = await loadStaticMapBytes({
      cityId: "c1",
      getCity: async () => ({ centerLat: null, centerLng: null }),
      fetchMap,
      apiKey: "server-test-key",
    });
    expect(result.ok).toBe(true);
  });

  it("returns 502 when Google does not return an image", async () => {
    const result = await loadStaticMapBytes({
      cityId: "c1",
      getCity: async () => ({ centerLat: 30.27, centerLng: -97.74 }),
      fetchMap: vi.fn(async () => new Response("denied", { status: 403 })),
      apiKey: "server-test-key",
    });
    expect(result).toEqual({ ok: false, status: 502 });
  });
});
```

`src/app/api/maps/static/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/session", () => ({
  getAllowedSession: vi.fn(),
}));

const loadStaticMapBytes = vi.hoisted(() => vi.fn());

vi.mock("@/lib/static-map", () => ({
  loadStaticMapBytes,
}));

vi.mock("@/db", () => ({ db: {} }));

import { getAllowedSession } from "@/lib/session";

describe("GET /api/maps/static", () => {
  beforeEach(() => {
    vi.stubEnv("GOOGLE_PLACES_SERVER_KEY", "server-test-key");
    loadStaticMapBytes.mockReset();
  });

  it("returns 401 without a session", async () => {
    vi.mocked(getAllowedSession).mockResolvedValue({
      ok: false,
      reason: "unauthenticated",
    });
    const res = await GET(new Request("http://localhost/api/maps/static?cityId=c1"));
    expect(res.status).toBe(401);
    expect(loadStaticMapBytes).not.toHaveBeenCalled();
  });

  it("returns 403 for a signed-in email that is not invited", async () => {
    vi.mocked(getAllowedSession).mockResolvedValue({
      ok: false,
      reason: "not_invited",
    });
    const res = await GET(new Request("http://localhost/api/maps/static?cityId=c1"));
    expect(res.status).toBe(403);
  });

  it("returns image bytes and private cache headers", async () => {
    vi.mocked(getAllowedSession).mockResolvedValue({
      ok: true,
      user: { id: "u1", email: "ada@x.com", name: "Ada" },
    });
    loadStaticMapBytes.mockResolvedValue({
      ok: true,
      bytes: new Uint8Array([1, 2, 3]),
      contentType: "image/jpeg",
    });
    const res = await GET(new Request("http://localhost/api/maps/static?cityId=c1"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("cache-control")).toBe("private, max-age=86400");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    expect(loadStaticMapBytes).toHaveBeenCalledWith(
      expect.objectContaining({
        cityId: "c1",
        apiKey: "server-test-key",
      }),
    );
  });

  it("maps helper failures to HTTP status", async () => {
    vi.mocked(getAllowedSession).mockResolvedValue({
      ok: true,
      user: { id: "u1", email: "ada@x.com", name: "Ada" },
    });
    loadStaticMapBytes.mockResolvedValue({ ok: false, status: 404 });
    const res = await GET(new Request("http://localhost/api/maps/static?cityId=nope"));
    expect(res.status).toBe(404);
  });
});
```

The response body must be image bytes only. The helper receives `apiKey: "server-test-key"`; that string must not appear in HTML or in `mapPosterSrc`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/map-poster-url.test.ts src/lib/static-map.test.ts src/app/api/maps/static/route.test.ts`

Expected: FAIL — modules / `GET` not found.

- [ ] **Step 3: Write minimal static-map implementation**

`src/lib/map-poster-url.ts` — `mapPosterSrc` exactly as in overview.md (no `server-only`).

`src/lib/static-map.ts`:

```ts
import "server-only";
import { bopMapStyle } from "@/lib/map-style";

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

export function staticMapStyleParams(): string[] {
  return bopMapStyle.map((rule) => {
    const parts: string[] = [];
    if (rule.featureType) parts.push(`feature:${rule.featureType}`);
    if (rule.elementType) parts.push(`element:${rule.elementType}`);
    for (const styler of rule.stylers ?? []) {
      for (const [key, value] of Object.entries(styler)) {
        if (key === "color" && typeof value === "string") {
          parts.push(`color:0x${value.replace("#", "")}`);
        } else if (typeof value === "string" || typeof value === "number") {
          parts.push(`${key}:${value}`);
        }
      }
    }
    return parts.join("|");
  });
}

export function buildStaticMapUrl(opts: {
  lat: number;
  lng: number;
  zoom: number;
  apiKey: string;
}): string {
  const url = new URL("https://maps.googleapis.com/maps/api/staticmap");
  url.searchParams.set("center", `${opts.lat},${opts.lng}`);
  url.searchParams.set("zoom", String(opts.zoom));
  url.searchParams.set("size", `${STATIC_MAP_SIZE.width}x${STATIC_MAP_SIZE.height}`);
  url.searchParams.set("scale", String(STATIC_MAP_SIZE.scale));
  url.searchParams.set("maptype", "roadmap");
  url.searchParams.set("format", "jpg");
  url.searchParams.set("key", opts.apiKey);
  for (const style of staticMapStyleParams()) {
    url.searchParams.append("style", style);
  }
  return url.toString();
}

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
> {
  const cityId = opts.cityId.trim();
  if (!cityId) return { ok: false, status: 400 };
  const city = await opts.getCity(cityId);
  if (!city) return { ok: false, status: 404 };
  const lat = city.centerLat ?? STATIC_MAP_FALLBACK.lat;
  const lng = city.centerLng ?? STATIC_MAP_FALLBACK.lng;
  const zoom =
    city.centerLat != null && city.centerLng != null
      ? STATIC_MAP_CITY_ZOOM
      : STATIC_MAP_FALLBACK.zoom;
  const url = buildStaticMapUrl({ lat, lng, zoom, apiKey: opts.apiKey });
  let res: Response;
  try {
    res = await opts.fetchMap(url);
  } catch {
    return { ok: false, status: 502 };
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok || !contentType.startsWith("image/")) {
    return { ok: false, status: 502 };
  }
  return {
    ok: true,
    bytes: new Uint8Array(await res.arrayBuffer()),
    contentType,
  };
}
```

`src/app/api/maps/static/route.ts`:

```ts
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cities } from "@/db/schema";
import { loadStaticMapBytes } from "@/lib/static-map";
import { getAllowedSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getAllowedSession();
  if (!session.ok) {
    return new Response("Forbidden", {
      status: session.reason === "unauthenticated" ? 401 : 403,
    });
  }
  const cityId = new URL(request.url).searchParams.get("cityId") ?? "";
  const result = await loadStaticMapBytes({
    cityId,
    getCity: async (id) => {
      const rows = await db
        .select({
          centerLat: cities.centerLat,
          centerLng: cities.centerLng,
        })
        .from(cities)
        .where(eq(cities.id, id))
        .limit(1);
      return rows[0] ?? null;
    },
    fetchMap: fetch,
    apiKey: process.env.GOOGLE_PLACES_SERVER_KEY ?? "",
  });
  if (!result.ok) {
    return new Response("Not found", { status: result.status });
  }
  return new Response(Buffer.from(result.bytes), {
    headers: {
      "content-type": result.contentType,
      "cache-control": "private, max-age=86400",
    },
  });
}
```

Use status text `"Forbidden"` / `"Not found"` / `"Bad request"` consistently with `src/app/api/photos/route.ts` if you prefer `"Bad request"` for 400 — tests only assert numeric status.

- [ ] **Step 4: Run static-map tests to verify they pass**

Run: `npx vitest run src/lib/map-poster-url.test.ts src/lib/static-map.test.ts src/app/api/maps/static/route.test.ts`

Expected: PASS.

- [ ] **Step 5: Write the failing MapView tests**

Replace `src/components/map-view.test.tsx` with:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MapView } from "./map-view";
import type { PlaceIndex } from "@/lib/places-types";

vi.mock("./map-canvas", () => ({
  MapCanvas: () => <div data-testid="map-canvas" />,
}));

const place: PlaceIndex = {
  id: "p1",
  placeId: "ChIJ1",
  name: "Slant of Light Books",
  lat: 30.27,
  lng: -97.74,
  formattedAddress: "Austin",
  cityId: "c1",
  areaId: null,
  areaName: null,
  type: "book store",
  extraTags: [],
  notes: "",
  photoName: null,
};

const city = { id: "c1", name: "Austin", centerLat: 30.27, centerLng: -97.74 };

describe("MapView", () => {
  it("shows a high-priority poster and does not load Maps JS on mount", async () => {
    render(
      <MapView
        city={city}
        places={[place]}
        markerIds={["p1"]}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByTestId("map-slot")).toBeInTheDocument();
    const poster = screen.getByTestId("map-poster");
    expect(poster).toHaveAttribute("src", "/api/maps/static?cityId=c1");
    expect(poster).toHaveAttribute("fetchPriority", "high");
    expect(poster).toHaveAttribute("loading", "eager");
    expect(poster).toHaveAttribute("width", "640");
    expect(poster).toHaveAttribute("height", "640");
    expect(screen.getByRole("button", { name: "Explore map" })).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByTestId("map-canvas")).not.toBeInTheDocument();
  });

  it("loads the map canvas after Explore map", async () => {
    const user = userEvent.setup();
    render(
      <MapView
        city={city}
        places={[place]}
        markerIds={["p1"]}
        onSelect={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Explore map" }));
    await waitFor(() => {
      expect(screen.getByTestId("map-canvas")).toBeInTheDocument();
    });
  });

  it("keeps a paper slot and Explore map when there is no city", () => {
    render(
      <MapView city={null} places={[]} markerIds={[]} onSelect={() => {}} />,
    );
    expect(screen.getByTestId("map-slot")).toBeInTheDocument();
    expect(screen.queryByTestId("map-poster")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Explore map" })).toBeInTheDocument();
  });
});
```

If React 19 lowercases the DOM attribute, assert `poster.getAttribute("fetchpriority") === "high"` instead of `toHaveAttribute("fetchPriority", "high")`.

Existing `browse-app.test.tsx` / `app-shell.test.tsx` already `vi.mock("./map-view")`. Do not break those mocks.

- [ ] **Step 6: Run MapView tests to verify they fail**

Run: `npx vitest run src/components/map-view.test.tsx`

Expected: FAIL — canvas appears after mount; no poster / no Explore map.

- [ ] **Step 7: Write minimal MapView + preload implementation**

`src/components/map-view.tsx`:

```tsx
"use client";

import { useState, type ComponentType } from "react";
import { mapPosterSrc } from "@/lib/map-poster-url";
import type { BrowsePayload, PlaceIndex } from "@/lib/places-types";

type CanvasProps = {
  city: BrowsePayload["city"];
  places: PlaceIndex[];
  markerIds: string[];
  selectedPlaceId: string | null;
  onSelect: (id: string) => void;
};

export function MapView({
  city,
  places,
  markerIds,
  selectedPlaceId = null,
  onSelect,
}: {
  city: BrowsePayload["city"];
  places: PlaceIndex[];
  markerIds: string[];
  selectedPlaceId?: string | null;
  onSelect: (id: string) => void;
}) {
  const [Canvas, setCanvas] = useState<ComponentType<CanvasProps> | null>(null);
  const [posterFailed, setPosterFailed] = useState(false);

  async function explore() {
    if (Canvas) return;
    const mod = await import("./map-canvas");
    setCanvas(() => mod.MapCanvas);
  }

  return (
    <div
      data-testid="map-slot"
      className="relative h-full min-h-0 w-full overflow-hidden bg-[var(--paper)]"
    >
      {city && !posterFailed ? (
        // Session-gated /api/maps/static cannot use next/image (optimizer has no cookies).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          data-testid="map-poster"
          src={mapPosterSrc(city.id)}
          alt=""
          width={640}
          height={640}
          fetchPriority="high"
          loading="eager"
          decoding="async"
          onError={() => setPosterFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      {Canvas ? (
        <div className="absolute inset-0">
          <Canvas
            city={city}
            places={places}
            markerIds={markerIds}
            selectedPlaceId={selectedPlaceId}
            onSelect={onSelect}
          />
        </div>
      ) : (
        <button
          type="button"
          aria-label="Explore map"
          onClick={() => void explore()}
          className="absolute inset-0 flex items-end justify-center bg-[color-mix(in_srgb,var(--ink)_0%,transparent)] pb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ink)]"
        >
          <span className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm text-[var(--paper)] shadow-sm">
            Explore map
          </span>
        </button>
      )}
    </div>
  );
}
```

Remove the mount `useEffect` import of `map-canvas`. Leave `map-canvas.tsx` as-is (error boundary, `NEXT_PUBLIC_GOOGLE_MAPS_KEY` only inside `APIProvider`).

`src/app/(browse)/page.tsx` — after `getBrowsePayloadWithDeps`, before return:

```ts
import { preload } from "react-dom";
import { mapPosterSrc } from "@/lib/map-poster-url";

// inside HomePage, after `const initial = …`:
if (initial.city) {
  preload(mapPosterSrc(initial.city.id), { as: "image", fetchPriority: "high" });
}
```

- [ ] **Step 8: Run MapView and browse tests to verify they pass**

Run: `npx vitest run src/components/map-view.test.tsx src/components/browse-app.test.tsx src/components/app-shell.test.tsx src/lib/map-poster-url.test.ts src/lib/static-map.test.ts src/app/api/maps/static/route.test.ts`

Expected: PASS. Then `npm run typecheck`. Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/map-poster-url.ts src/lib/map-poster-url.test.ts src/lib/static-map.ts src/lib/static-map.test.ts src/app/api/maps/static/route.ts src/app/api/maps/static/route.test.ts src/components/map-view.tsx src/components/map-view.test.tsx src/app/\(browse\)/page.tsx
MSGFILE=$(mktemp)
cat > "$MSGFILE" <<'EOF'
Show a static map poster until the user explores

* Proxy Google Static Maps through `/api/maps/static` with the server key
* Load `@vis.gl/react-google-maps` only after Explore map
EOF
bash ~/.cursor/skills/commit/commit-no-trailer.sh "$MSGFILE"
rm "$MSGFILE"
```
