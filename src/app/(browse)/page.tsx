import { redirect } from "next/navigation";
import { preload } from "react-dom";
import { addPlace, deletePlace, movePlace, searchPlaces, updatePlace } from "@/actions/places";
import { changeCity, getBrowsePayloadWithDeps, getPlaceCard } from "@/actions/browse";
import { createArea } from "@/actions/settings";
import { AppShell } from "@/components/app-shell";
import { db } from "@/db";
import { mapPosterSrc } from "@/lib/map-poster-url";
import { getAllowedSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getAllowedSession();
  if (!session.ok && session.reason === "unauthenticated") redirect("/sign-in");
  if (!session.ok && session.reason === "not_invited") redirect("/not-invited");
  if (!session.ok) redirect("/sign-in");
  const initial = await getBrowsePayloadWithDeps(db, session.user.id, null);
  if (initial.city) {
    preload(mapPosterSrc(initial.city.id), { as: "image", fetchPriority: "high" });
  }
  return (
    <AppShell
      initial={initial}
      onCityChange={changeCity}
      getPlaceCard={getPlaceCard}
      searchPlaces={searchPlaces}
      addPlace={addPlace}
      updatePlace={updatePlace}
      deletePlace={deletePlace}
      movePlace={movePlace}
      createArea={createArea}
    />
  );
}
