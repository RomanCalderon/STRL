import { describe, expect, it } from "vitest";
import { transcodePhoto } from "./photo-transcode";

const PNG_1x1 = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADElEQVQImWP4z8AAAAMBAQCc479ZAAAAAElFTkSuQmCC",
    "base64",
  ),
);

function isWebp(bytes: Uint8Array): boolean {
  const ascii = String.fromCharCode(...bytes.slice(0, 12));
  return ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP";
}

describe("transcodePhoto", () => {
  it("encodes a PNG thumb as webp", async () => {
    const out = await transcodePhoto(PNG_1x1, "image/png", "thumb");
    expect(out.contentType).toBe("image/webp");
    expect(isWebp(out.bytes)).toBe(true);
  });

  it("encodes a hero at the hero quality path as webp", async () => {
    const out = await transcodePhoto(PNG_1x1, "image/png", "hero");
    expect(out.contentType).toBe("image/webp");
    expect(isWebp(out.bytes)).toBe(true);
  });

  it("returns original bytes when the payload is not an image", async () => {
    const bytes = new Uint8Array([0, 1, 2, 3]);
    const out = await transcodePhoto(bytes, "application/octet-stream", "thumb");
    expect(out).toEqual({ bytes, contentType: "application/octet-stream" });
  });

  it("returns original bytes for unsupported svg", async () => {
    const bytes = new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>");
    const out = await transcodePhoto(bytes, "image/svg+xml", "thumb");
    expect(out.contentType).toBe("image/svg+xml");
    expect(out.bytes).toEqual(bytes);
  });

  it("returns original bytes when raster bytes are malformed", async () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0x00, 0x01]);
    const out = await transcodePhoto(bytes, "image/jpeg", "thumb");
    expect(out).toEqual({ bytes, contentType: "image/jpeg" });
  });
});
