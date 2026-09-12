import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cities } from "@/db/schema";
import { loadStaticMapBytes } from "@/lib/static-map";
import { getAllowedSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getAllowedSession();
  if (!session.ok) {
    return new Response("Forbidden", {
      status: session.reason === "unauthenticated" ? 401 : 403,
    });
  }
  const cityId = new URL(request.url).searchParams.get("cityId") ?? "";
  const result = await loadStaticMapBytes({
    cityId,
    getCity: async (id) => {
      const rows = await db
        .select({
          centerLat: cities.centerLat,
          centerLng: cities.centerLng,
        })
        .from(cities)
        .where(eq(cities.id, id))
        .limit(1);
      return rows[0] ?? null;
    },
    fetchMap: fetch,
    apiKey: process.env.GOOGLE_PLACES_SERVER_KEY ?? "",
  });
  if (!result.ok) {
    return new Response("Not found", { status: result.status });
  }
  return new Response(Buffer.from(result.bytes), {
    headers: {
      "content-type": result.contentType,
      "cache-control": "private, max-age=86400",
    },
  });
}
