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
