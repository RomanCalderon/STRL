> Required prior reads: [overview.md](../overview.md), [global-constraints.md](../global-constraints.md).  
> Do not open `README.md` or other task files.

### Task 4: Drop unused `placeId` from the city index

**Files:**
- Modify: `src/lib/places-types.ts`
- Modify: `src/actions/browse.ts`
- Modify: `src/actions/browse.test.ts`
- Modify: `src/components/app-shell.tsx` (`toIndex`)
- Modify: `src/components/app-shell.test.tsx` (`toIndexPlace` / payload.places)
- Modify: `src/components/browse-app.test.tsx` (payload.places)
- Test: `src/actions/browse.test.ts`, `src/lib/filters.test.ts`, `src/components/app-shell.test.tsx`, `src/components/browse-app.test.tsx`

**Interfaces:**
- Consumes: Current `PlaceIndex` (still has `placeId`), `getBrowsePayloadWithDeps`, `getPlaceCardWithDeps`, `filterPlaces`
- Produces: `PlaceIndex` **without** `placeId`. `PlaceCardFields` **gains** `placeId`. `BrowsePlace` still has `placeId`. `hasCardFields` unchanged. City select in `getBrowsePayloadWithDeps` omits `places.placeId`. `cityId`, `notes`, and `formattedAddress` stay on the index.

Do not page the index. Do not drop `cityId` (PlaceDetail city/area editors use it on index rows). Do not drop notes. Mutations still return full `BrowsePlace` including `placeId`.

If a test file types a `PlaceIndex` / `payload.places[]` object with `placeId`, remove that property. Standalone `BrowsePlace` fixtures **keep** `placeId`. `map-view.test.tsx` / `place-list.test.tsx` / `place-detail.test.tsx` use `BrowsePlace` or extra fields — extra `placeId` on a `BrowsePlace` is still valid.

- [ ] **Step 1: Write the failing tests**

Add to `src/actions/browse.test.ts` inside the existing city-index describe (next to “keeps notes on the city index…”):

```ts
  it("omits Google placeId from the city index and keeps it on the card", async () => {
    const { db, client } = await createTestDb();
    const inserted = await insertPlace(db, {
      details: austin,
      notes: "quiet stacks",
      cityPolicy: { type: "seed" },
    });
    expect(inserted.ok).toBe(true);
    if (!inserted.ok) return;
    const payload = await getBrowsePayloadWithDeps(db, "user-1", null);
    expect(payload.places[0]).not.toHaveProperty("placeId");
    expect(Object.keys(payload.places[0]!).sort()).toEqual(
      [
        "areaId",
        "areaName",
        "cityId",
        "extraTags",
        "formattedAddress",
        "id",
        "lat",
        "lng",
        "name",
        "notes",
        "photoName",
        "type",
      ].sort(),
    );
    const json = JSON.stringify(
      Array.from({ length: 150 }, (_, i) => ({
        ...payload.places[0],
        id: `p${i}`,
        name: `Place ${i}`,
      })),
    );
    expect(json.length).toBeLessThan(80_000);
    const card = await getPlaceCardWithDeps(db, inserted.place.id);
    expect(card?.placeId).toBe(austin.placeId);
    await client.close();
  });
```

Do **not** weaken `src/lib/filters.test.ts`. After this task, `npx vitest run src/lib/filters.test.ts` must still pass: query `"quiet"` matches notes.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/actions/browse.test.ts src/lib/filters.test.ts`

Expected: FAIL — `payload.places[0]` still has `placeId`.

- [ ] **Step 3: Write minimal implementation**

`src/lib/places-types.ts` — replace `PlaceIndex` / `PlaceCardFields` with the types in overview.md (`placeId` only on `PlaceCardFields`). Keep `hasCardFields` as:

```ts
export function hasCardFields(
  place: PlaceIndex | BrowsePlace,
): place is BrowsePlace {
  return "googleMapsUrl" in place && "authorAttributions" in place;
}
```

`src/actions/browse.ts` — remove `placeId: places.placeId` from the joined select and from the `browsePlaces` map. `getPlaceCardWithDeps` still sets `placeId: full.placeId`.

`src/components/app-shell.tsx` — `toIndex` must not copy `placeId`:

```ts
function toIndex(place: PlaceIndex | BrowsePlace): PlaceIndex {
  return {
    id: place.id,
    name: place.name,
    lat: place.lat,
    lng: place.lng,
    formattedAddress: place.formattedAddress,
    cityId: place.cityId,
    areaId: place.areaId,
    areaName: place.areaName,
    type: place.type,
    extraTags: place.extraTags,
    notes: place.notes,
    photoName: place.photoName,
  };
}
```

`src/components/app-shell.test.tsx` — `toIndexPlace` drops `placeId` the same way.

`src/components/browse-app.test.tsx` — remove `placeId` from both objects in `payload.places`.

If `npm run typecheck` reports other `PlaceIndex` object literals with `placeId`, remove it there too. Do not add `placeId` back onto the index type to silence tests.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/actions/browse.test.ts src/lib/filters.test.ts src/components/app-shell.test.tsx src/components/browse-app.test.tsx src/components/place-list.test.tsx src/components/map-view.test.tsx src/components/place-detail.test.tsx`

Expected: PASS. Then `npm run typecheck`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/places-types.ts src/actions/browse.ts src/actions/browse.test.ts src/components/app-shell.tsx src/components/app-shell.test.tsx src/components/browse-app.test.tsx
MSGFILE=$(mktemp)
cat > "$MSGFILE" <<'EOF'
Drop Google place ids from the city index payload

* Keep `placeId` on card fields returned by `getPlaceCard`
* Leave notes, address, and cityId on the index for search and the sheet
EOF
bash ~/.cursor/skills/commit/commit-no-trailer.sh "$MSGFILE"
rm "$MSGFILE"
```

`git add` any other fixture files typecheck required you to change.
