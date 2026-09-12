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
