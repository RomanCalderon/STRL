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
