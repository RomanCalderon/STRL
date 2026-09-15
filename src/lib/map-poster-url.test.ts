import { describe, expect, it } from "vitest";
import { mapPosterSrc } from "./map-poster-url";

describe("mapPosterSrc", () => {
  it("encodes the city id on the session-gated static map route", () => {
    expect(mapPosterSrc("c1")).toBe("/api/maps/static?cityId=c1");
    expect(mapPosterSrc("a/b")).toBe("/api/maps/static?cityId=a%2Fb");
  });
});
