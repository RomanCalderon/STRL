import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/session", () => ({
  getAllowedSession: vi.fn(),
}));

const fetchPhoto = vi.hoisted(() =>
  vi.fn(async (): Promise<{ bytes: Uint8Array; contentType: string } | null> => ({
    bytes: Uint8Array.from(
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADElEQVQImWP4z8AAAAMBAQCc479ZAAAAAElFTkSuQmCC",
        "base64",
      ),
    ),
    contentType: "image/png",
  })),
);

vi.mock("@/lib/places", () => ({
  createPlacesClient: () => ({
    fetchPhoto,
    getDetails: async () => null,
  }),
}));

import { getAllowedSession } from "@/lib/session";

describe("GET /api/photos", () => {
  beforeEach(() => {
    vi.mocked(getAllowedSession).mockResolvedValue({
      ok: true,
      user: { id: "u1", email: "ada@x.com", name: "Ada" },
    });
    fetchPhoto.mockReset();
    fetchPhoto.mockResolvedValue({
      bytes: Uint8Array.from(
        Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADElEQVQImWP4z8AAAAMBAQCc479ZAAAAAElFTkSuQmCC",
          "base64",
        ),
      ),
      contentType: "image/png",
    });
  });

  it("returns 401 without a session", async () => {
    vi.mocked(getAllowedSession).mockResolvedValue({
      ok: false,
      reason: "unauthenticated",
    });
    const res = await GET(
      new Request("http://localhost/api/photos?name=places/x/photos/y"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for a signed-in email that is not invited", async () => {
    vi.mocked(getAllowedSession).mockResolvedValue({
      ok: false,
      reason: "not_invited",
    });
    const res = await GET(
      new Request("http://localhost/api/photos?name=places/x/photos/y"),
    );
    expect(res.status).toBe(403);
  });

  it("returns webp for an allowlisted session", async () => {
    const res = await GET(
      new Request("http://localhost/api/photos?name=places/x/photos/y"),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/webp");
    expect(res.headers.get("cache-control")).toBe("private, max-age=86400");
    expect(fetchPhoto).toHaveBeenCalledWith("places/x/photos/y", {
      maxHeightPx: 800,
    });
  });

  it("forwards a thumb height to Places", async () => {
    const res = await GET(
      new Request("http://localhost/api/photos?name=places/x/photos/y&h=160"),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/webp");
    expect(fetchPhoto).toHaveBeenCalledWith("places/x/photos/y", {
      maxHeightPx: 160,
    });
  });

  it("returns 404 when upstream has no photo", async () => {
    fetchPhoto.mockResolvedValueOnce(null);
    const res = await GET(
      new Request("http://localhost/api/photos?name=places/x/photos/y"),
    );
    expect(res.status).toBe(404);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("forwards original bytes when transcode cannot run", async () => {
    fetchPhoto.mockResolvedValueOnce({
      bytes: new Uint8Array([0, 1, 2]),
      contentType: "application/octet-stream",
    });
    const res = await GET(
      new Request("http://localhost/api/photos?name=places/x/photos/y&h=160"),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/octet-stream");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([0, 1, 2]));
  });
});
