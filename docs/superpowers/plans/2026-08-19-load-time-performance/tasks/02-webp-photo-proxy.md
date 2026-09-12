> Required prior reads: [overview.md](../overview.md), [global-constraints.md](../global-constraints.md).  
> Do not open `README.md` or other task files.

### Task 2: Transcode proxied photos to WebP

**Files:**
- Create: `src/lib/photo-transcode.ts`
- Create: `src/lib/photo-transcode.test.ts`
- Modify: `src/lib/photo-url.ts`
- Modify: `src/lib/photo-url.test.ts`
- Modify: `src/app/api/photos/route.ts`
- Modify: `src/app/api/photos/route.test.ts`
- Modify: `package.json` / `package-lock.json` via `npm install sharp@0.35.3`
- Test: `src/lib/photo-transcode.test.ts`, `src/lib/photo-url.test.ts`, `src/app/api/photos/route.test.ts`

**Interfaces:**
- Consumes: `PHOTO_MAX_HEIGHT`, `parsePhotoMaxHeight`, `PhotoSize`, `createPlacesClient().fetchPhoto`, `getAllowedSession`
- Produces: `PHOTO_WEBP_QUALITY` and `photoSizeFromMaxHeight` on `src/lib/photo-url.ts`; `transcodePhoto(bytes, contentType, size)` on `src/lib/photo-transcode.ts`. Thumb and hero URLs stay `/api/photos?name=…&h=160|800`. Successful transcode responses are `content-type: image/webp` with `cache-control: private, max-age=86400`.

Do not add AVIF. Do not read `Accept`. Do not use `next/image`. Do not change list windowing. Do not set `runtime = "edge"`. If sharp cannot decode the bytes, return the original bytes and original content type.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/photo-url.test.ts` (extend the existing import of `parsePhotoMaxHeight` / `placePhotoSrc`):

```ts
import { parsePhotoMaxHeight, photoSizeFromMaxHeight, placePhotoSrc } from "./photo-url";
```

```ts
describe("photoSizeFromMaxHeight", () => {
  it("maps the thumb bucket and treats everything else as hero", () => {
    expect(photoSizeFromMaxHeight(160)).toBe("thumb");
    expect(photoSizeFromMaxHeight(800)).toBe("hero");
    expect(photoSizeFromMaxHeight(4800)).toBe("hero");
  });
});
```

`src/lib/photo-transcode.test.ts` — 1×1 PNG fixture (no `sharp` import in this file):

```ts
import { describe, expect, it } from "vitest";
import { transcodePhoto } from "./photo-transcode";

const PNG_1x1 = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAD0lEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
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
```

Update `src/app/api/photos/route.test.ts`. Keep the 401/403 tests. Change the allowlisted tests so they expect WebP after a PNG/JPEG upstream, original type when transcode cannot run, and 404 when `fetchPhoto` returns null:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/session", () => ({
  getAllowedSession: vi.fn(),
}));

const fetchPhoto = vi.hoisted(() =>
  vi.fn(async () => ({
    bytes: Uint8Array.from(
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAD0lEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
        "base64",
      ),
    ),
    contentType: "image/png",
  })),
);

vi.mock("@/lib/places", () => ({
  createPlacesClient: () => ({
    fetchPhoto,
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
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAD0lEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
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
```

Keep the existing `place-list.test.tsx` assertion that thumbs still request `h=160`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/photo-url.test.ts src/lib/photo-transcode.test.ts src/app/api/photos/route.test.ts`

Expected: FAIL — `photoSizeFromMaxHeight` / `transcodePhoto` missing; allowlisted photo test still expects `image/jpeg`.

- [ ] **Step 3: Install sharp and write minimal implementation**

Run: `npm install sharp@0.35.3`

Expected: `package.json` lists `"sharp": "0.35.3"` (or `^0.35.3` if npm writes the caret). Do not add other packages.

`src/lib/photo-url.ts` — next to `PHOTO_MAX_HEIGHT` add:

```ts
export const PHOTO_WEBP_QUALITY = {
  thumb: 60,
  hero: 80,
} as const;

export function photoSizeFromMaxHeight(height: number): PhotoSize {
  return height === PHOTO_MAX_HEIGHT.thumb ? "thumb" : "hero";
}
```

`src/lib/photo-transcode.ts`:

```ts
import sharp from "sharp";
import { PHOTO_WEBP_QUALITY, type PhotoSize } from "./photo-url";

const RASTER = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);

export async function transcodePhoto(
  bytes: Uint8Array,
  contentType: string,
  size: PhotoSize,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const normalized = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!RASTER.has(normalized)) {
    return { bytes, contentType };
  }
  try {
    const out = await sharp(bytes)
      .rotate()
      .webp({ quality: PHOTO_WEBP_QUALITY[size] })
      .toBuffer();
    return { bytes: new Uint8Array(out), contentType: "image/webp" };
  } catch {
    return { bytes, contentType };
  }
}
```

`src/app/api/photos/route.ts`:

```ts
import { parsePhotoMaxHeight, photoSizeFromMaxHeight } from "@/lib/photo-url";
import { transcodePhoto } from "@/lib/photo-transcode";
import { createPlacesClient } from "@/lib/places";
import { getAllowedSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getAllowedSession();
  if (!session.ok) {
    return new Response("Forbidden", {
      status: session.reason === "unauthenticated" ? 401 : 403,
    });
  }
  const url = new URL(request.url);
  const name = url.searchParams.get("name");
  if (!name || !name.startsWith("places/")) {
    return new Response("Bad request", { status: 400 });
  }
  const maxHeightPx = parsePhotoMaxHeight(url.searchParams.get("h"));
  const photo = await createPlacesClient(
    process.env.GOOGLE_PLACES_SERVER_KEY ?? "",
  ).fetchPhoto(name, { maxHeightPx });
  if (!photo) return new Response("Not found", { status: 404 });
  const encoded = await transcodePhoto(
    photo.bytes,
    photo.contentType,
    photoSizeFromMaxHeight(maxHeightPx),
  );
  return new Response(Buffer.from(encoded.bytes), {
    headers: {
      "content-type": encoded.contentType,
      "cache-control": "private, max-age=86400",
    },
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/photo-url.test.ts src/lib/photo-transcode.test.ts src/app/api/photos/route.test.ts src/components/place-list.test.tsx src/components/place-detail.test.tsx`

Expected: PASS. Then `npm run typecheck`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/photo-url.ts src/lib/photo-url.test.ts src/lib/photo-transcode.ts src/lib/photo-transcode.test.ts src/app/api/photos/route.ts src/app/api/photos/route.test.ts
MSGFILE=$(mktemp)
cat > "$MSGFILE" <<'EOF'
Transcode proxied place photos to WebP

* Encode thumbs at quality 60 and heroes at 80 via `sharp`
* Keep `/api/photos` private cache headers and pass through undecodable bytes
EOF
bash ~/.cursor/skills/commit/commit-no-trailer.sh "$MSGFILE"
rm "$MSGFILE"
```
