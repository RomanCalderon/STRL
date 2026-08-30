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
