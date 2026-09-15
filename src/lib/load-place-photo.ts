import type { PhotoAttribution, PlacesPort } from "./places-types";

export function placeIdFromPhotoName(photoName: string): string | null {
  const match = /^places\/([^/]+)\/photos\/.+$/.exec(photoName);
  return match?.[1] ?? null;
}

export async function loadPlacePhoto(opts: {
  photoName: string;
  maxHeightPx: number;
  places: PlacesPort;
  persistFreshName?: (
    placeId: string,
    photoName: string,
    authorAttributions: PhotoAttribution[],
  ) => Promise<void>;
}): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const first = await opts.places.fetchPhoto(opts.photoName, {
    maxHeightPx: opts.maxHeightPx,
  });
  if (first) return first;

  const placeId = placeIdFromPhotoName(opts.photoName);
  if (!placeId) return null;

  const details = await opts.places.getDetails(placeId);
  if (!details?.photoName || details.photoName === opts.photoName) return null;

  const second = await opts.places.fetchPhoto(details.photoName, {
    maxHeightPx: opts.maxHeightPx,
  });
  if (!second) return null;

  try {
    await opts.persistFreshName?.(
      placeId,
      details.photoName,
      details.authorAttributions,
    );
  } catch {
    // Still return bytes; stale names can refresh again next request.
  }
  return second;
}
