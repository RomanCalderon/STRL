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
