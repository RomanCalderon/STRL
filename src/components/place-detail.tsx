"use client";

import { Suspense, use, useEffect, useId, useState } from "react";
import { placePhotoSrc } from "@/lib/photo-url";
import { hasCardFields, type BrowsePlace, type PlaceIndex } from "@/lib/places-types";
import { CloseIcon } from "./icons";
import {
  SHEET_ATTR_SLOT_CLASS,
  SHEET_DIALOG_CLASS,
  SHEET_INNER_CLASS,
  SHEET_MAPS_CLASS,
  SHEET_MAPS_SLOT_CLASS,
  SHEET_PHOTO_CLASS,
  SHEET_PHOTO_SLOT_CLASS,
  SHEET_RATING_SLOT_CLASS,
  SHEET_SCRIM_CLASS,
} from "./place-sheet-chrome";
import { PlacePhotoFallback } from "./place-sheet-fallback";

const ring =
  "transition-[color,box-shadow,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sheet)]";

const heroPromises = new Map<string, Promise<void>>();

function preloadHero(src: string): Promise<void> {
  const cached = heroPromises.get(src);
  if (cached) return cached;
  const next = new Promise<void>((resolve) => {
    if (typeof Image === "undefined") {
      resolve();
      return;
    }
    const img = new Image();
    const done = () => resolve();
    img.onload = done;
    img.onerror = done;
    img.src = src;
    if (
      img.complete ||
      (typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent))
    ) {
      done();
    }
  });
  heroPromises.set(src, next);
  return next;
}

function PlaceHeroImage({ photoName }: { photoName: string }) {
  const src = placePhotoSrc(photoName, "hero");
  use(preloadHero(src));
  const [broken, setBroken] = useState(false);
  if (broken) {
    return <div className={SHEET_PHOTO_SLOT_CLASS} />;
  }
  return (
    // Session-gated /api/photos cannot use next/image (optimizer has no cookies).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={SHEET_PHOTO_CLASS}
      onError={() => setBroken(true)}
    />
  );
}

function PlaceHero({ photoName }: { photoName: string | null }) {
  if (!photoName) {
    return <div className={SHEET_PHOTO_SLOT_CLASS} />;
  }
  return (
    <Suspense fallback={<PlacePhotoFallback />}>
      <PlaceHeroImage photoName={photoName} />
    </Suspense>
  );
}

export function PlaceDetail({
  place,
  cardStatus,
  titleId: titleIdProp,
  embedded = false,
  cities,
  areas,
  updatePlace,
  deletePlace,
  movePlace,
  createArea,
  onClose,
  onChanged,
  onDeleted,
  onError,
}: {
  place: PlaceIndex | BrowsePlace;
  cardStatus: "pending" | "ready";
  titleId?: string;
  embedded?: boolean;
  cities: { id: string; name: string }[];
  areas: { id: string; name: string }[];
  updatePlace: (
    id: string,
    patch: {
      notes?: string;
      extraTags?: string[];
      type?: string | null;
      areaId?: string | null;
      cityId?: string;
    },
  ) => Promise<{ ok: true; place: BrowsePlace } | { ok: false; message: string }>;
  deletePlace: (id: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  movePlace: (
    id: string,
    toCityId: string,
  ) => Promise<
    | { ok: true; place: BrowsePlace }
    | { ok: false; message: string; existingPlaceId?: string }
  >;
  createArea: (
    cityId: string,
    name: string,
  ) => Promise<
    | { ok: true; area: { id: string; name: string } }
    | { ok: false; message: string }
  >;
  onClose: () => void;
  onChanged: (place: BrowsePlace) => void;
  onDeleted: (id: string) => void;
  onError: (message: string) => void;
}) {
  const generatedTitleId = useId();
  const titleId = titleIdProp ?? generatedTitleId;
  const [draftFor, setDraftFor] = useState(place.id);
  const [notes, setNotes] = useState(place.notes);
  const [tags, setTags] = useState(place.extraTags.join(", "));
  const [type, setType] = useState(place.type ?? "");
  if (place.id !== draftFor) {
    setDraftFor(place.id);
    setNotes(place.notes);
    setTags(place.extraTags.join(", "));
    setType(place.type ?? "");
  }
  const attribution =
    hasCardFields(place) && place.authorAttributions.length
      ? place.authorAttributions
          .map((a) => a.displayName)
          .filter(Boolean)
          .join(", ")
      : "";
  const rating =
    hasCardFields(place) && place.rating != null ? place.rating : null;
  const mapsUrl = hasCardFields(place) ? place.googleMapsUrl : "";
  const fieldClass = `${ring} mt-1 w-full rounded-lg border border-stone-300 bg-[var(--paper)] p-2`;

  async function saveEdits() {
    const res = await updatePlace(place.id, {
      notes,
      extraTags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      type: type || null,
    });
    if (res.ok) onChanged(res.place);
    else onError(res.message);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const body = (
        <div className={SHEET_INNER_CLASS}>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={onClose}
            className="absolute left-1/2 top-2 z-10 h-1 w-9 -translate-x-1/2 rounded-full bg-white/80 shadow-sm md:hidden"
          />
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className={`${ring} absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--sheet)_88%,white)] shadow-sm hover:bg-[var(--sheet)]`}
          >
            <CloseIcon className="h-4 w-4" />
          </button>
          <PlaceHero photoName={place.photoName} />
          <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <p className={SHEET_ATTR_SLOT_CLASS}>
              {attribution ? `Photo: ${attribution}` : "\u00a0"}
            </p>
            <h2 id={titleId} className="mt-2 text-xl font-semibold text-balance">
              {place.name}
            </h2>
            <p className={SHEET_RATING_SLOT_CLASS}>
              {rating != null ? `${rating} ★` : "\u00a0"}
            </p>
            {place.formattedAddress ? (
              <p className="mt-1 text-sm leading-relaxed">{place.formattedAddress}</p>
            ) : null}
            <div className={SHEET_MAPS_SLOT_CLASS}>
              {cardStatus === "pending" ? (
                <button
                  type="button"
                  aria-busy="true"
                  aria-label="Open in Google Maps"
                  className={`${ring} ${SHEET_MAPS_CLASS}`}
                  disabled
                >
                  Open in Google Maps
                </button>
              ) : mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`${ring} ${SHEET_MAPS_CLASS}`}
                >
                  Open in Google Maps
                </a>
              ) : null}
            </div>
            <form
              className="mt-4 flex flex-col gap-3"
              onSubmit={async (event) => {
                event.preventDefault();
                await saveEdits();
              }}
            >
              <label className="block text-sm">
                Notes
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className={`${fieldClass} min-h-20 leading-relaxed`}
                />
              </label>
              <label className="block text-sm">
                Extra tags
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="block text-sm">
                Type
                <input
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="block text-sm">
                Area
                <select
                  defaultValue={place.areaId ?? ""}
                  onChange={async (e) => {
                    const res = await updatePlace(place.id, {
                      areaId: e.target.value || null,
                    });
                    if (res.ok) onChanged(res.place);
                    else onError(res.message);
                  }}
                  className={fieldClass}
                >
                  <option value="">None</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className={`${ring} self-start text-sm underline`}
                onClick={async () => {
                  const name = window.prompt("New area");
                  if (!name) return;
                  const created = await createArea(place.cityId, name);
                  if (!created.ok) return onError(created.message);
                  const res = await updatePlace(place.id, { areaId: created.area.id });
                  if (res.ok) onChanged(res.place);
                  else onError(res.message);
                }}
              >
                New area
              </button>
              <label className="block text-sm">
                City
                <select
                  defaultValue={place.cityId}
                  onChange={async (e) => {
                    const res = await movePlace(place.id, e.target.value);
                    if (res.ok) onChanged(res.place);
                    else onError(res.message);
                  }}
                  className={fieldClass}
                >
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className={`${ring} rounded-full bg-[var(--ink)] px-4 py-3 text-[var(--paper)] hover:opacity-90`}
              >
                Save
              </button>
            </form>
            <div className="mt-8 border-t border-stone-300 pt-6">
              <button
                type="button"
                className={`${ring} text-sm text-red-700 hover:text-red-800`}
                onClick={async () => {
                  const res = await deletePlace(place.id);
                  if (res.ok) onDeleted(place.id);
                  else onError(res.message);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
  );

  if (embedded) return body;

  return (
    <>
      <button
        type="button"
        aria-label="Dismiss"
        className={SHEET_SCRIM_CLASS}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={SHEET_DIALOG_CLASS}
      >
        {body}
      </div>
    </>
  );
}
