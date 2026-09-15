import { describe, expect, it, vi } from "vitest";
import {
  STATIC_MAP_CITY_ZOOM,
  STATIC_MAP_FALLBACK,
  STATIC_MAP_SIZE,
  buildStaticMapUrl,
  fallbackStaticMapBytes,
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

describe("fallbackStaticMapBytes", () => {
  it("returns a paper-styled SVG poster", () => {
    const result = fallbackStaticMapBytes();
    const svg = new TextDecoder().decode(result.bytes);
    expect(result.contentType).toBe("image/svg+xml");
    expect(svg).toContain("<svg");
    expect(svg).toContain("#efe6d6");
    expect(svg).toContain("#c45c26");
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
