import { describe, expect, it, vi } from "vitest";
import { loadPlacePhoto, placeIdFromPhotoName } from "./load-place-photo";
import type { PlaceDetails, PlacesPort } from "./places-types";

const jpeg = {
  bytes: new Uint8Array([1, 2, 3]),
  contentType: "image/jpeg",
};

const details = {
  placeId: "ChIJ1",
  name: "Books",
  lat: 30,
  lng: -97,
  formattedAddress: "Austin",
  addressComponents: [],
  primaryType: "book_store",
  rating: 4,
  googleMapsUri: "https://maps.google.com",
  photoName: "places/ChIJ1/photos/FRESH",
  authorAttributions: [{ displayName: "Ada", uri: null }],
} satisfies PlaceDetails;

function placesStub(overrides: Partial<PlacesPort>): PlacesPort {
  return {
    autocomplete: async () => [],
    textSearch: async () => [],
    getDetails: async () => details,
    fetchPhoto: async () => jpeg,
    ...overrides,
  };
}

describe("placeIdFromPhotoName", () => {
  it("reads the Google place id from a Places photo resource name", () => {
    expect(
      placeIdFromPhotoName("places/ChIJ1/photos/AAA"),
    ).toBe("ChIJ1");
  });

  it("rejects names that are not Places photo resources", () => {
    expect(placeIdFromPhotoName("places/ChIJ1")).toBeNull();
    expect(placeIdFromPhotoName("not-a-photo")).toBeNull();
  });
});

describe("loadPlacePhoto", () => {
  it("returns the first photo when the stored name still works", async () => {
    const getDetails = vi.fn(async () => details);
    const photo = await loadPlacePhoto({
      photoName: "places/ChIJ1/photos/AAA",
      maxHeightPx: 160,
      places: placesStub({ getDetails }),
    });
    expect(photo).toEqual(jpeg);
    expect(getDetails).not.toHaveBeenCalled();
  });

  it("refetches Place Details and persists a fresh name after an expired photo", async () => {
    const persistFreshName = vi.fn(async () => {});
    const fetchPhoto = vi
      .fn<PlacesPort["fetchPhoto"]>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(jpeg);
    const photo = await loadPlacePhoto({
      photoName: "places/ChIJ1/photos/AAA",
      maxHeightPx: 160,
      places: placesStub({ fetchPhoto }),
      persistFreshName,
    });
    expect(photo).toEqual(jpeg);
    expect(fetchPhoto).toHaveBeenNthCalledWith(1, "places/ChIJ1/photos/AAA", {
      maxHeightPx: 160,
    });
    expect(fetchPhoto).toHaveBeenNthCalledWith(2, "places/ChIJ1/photos/FRESH", {
      maxHeightPx: 160,
    });
    expect(persistFreshName).toHaveBeenCalledWith(
      "ChIJ1",
      "places/ChIJ1/photos/FRESH",
      [{ displayName: "Ada", uri: null }],
    );
  });

  it("still returns bytes when persisting the fresh name fails", async () => {
    const photo = await loadPlacePhoto({
      photoName: "places/ChIJ1/photos/AAA",
      maxHeightPx: 160,
      places: placesStub({
        fetchPhoto: vi
          .fn<PlacesPort["fetchPhoto"]>()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(jpeg),
      }),
      persistFreshName: async () => {
        throw new Error("db down");
      },
    });
    expect(photo).toEqual(jpeg);
  });

  it("returns null when Details has no newer photo name", async () => {
    const photo = await loadPlacePhoto({
      photoName: "places/ChIJ1/photos/AAA",
      maxHeightPx: 160,
      places: placesStub({
        fetchPhoto: async () => null,
        getDetails: async () => ({ ...details, photoName: "places/ChIJ1/photos/AAA" }),
      }),
    });
    expect(photo).toBeNull();
  });
});
