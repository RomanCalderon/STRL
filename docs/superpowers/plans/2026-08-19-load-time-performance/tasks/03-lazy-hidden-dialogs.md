> Required prior reads: [overview.md](../overview.md), [global-constraints.md](../global-constraints.md).  
> Do not open `README.md` or other task files.

### Task 3: Lazy-load AddPlace and PlaceDetail

**Files:**
- Modify: `src/components/app-shell.tsx`
- Modify: `src/components/app-shell.test.tsx` (only if a test starts failing on the loading gap; prefer `findBy*` which already exists)
- Test: `src/components/app-shell.test.tsx`, plus a source guard in `src/components/app-shell.lazy.test.ts`

**Interfaces:**
- Consumes: Current `AppShellActions`, `AddPlace`, `PlaceDetail`, `Toast`, `BrowseApp`
- Produces: `AppShell` still exports the same function and props. `AddPlace` and `PlaceDetail` load via `next/dynamic` named exports and mount only when `adding` / `selected` is set. `Toast` and `BrowseApp` stay static imports. Optimistic add/update/city/filter/toast behavior is unchanged.

Do not rewrite `AppShell` into a server component. Do not lazy-load `BrowseApp`, `MapView`, or `Toast`. Do not change server actions.

- [ ] **Step 1: Write the failing tests**

`src/components/app-shell.lazy.test.ts` (node project, matches `src/**/*.test.ts`):

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./app-shell.tsx", import.meta.url),
  "utf8",
);

describe("AppShell code splitting", () => {
  it("does not statically import AddPlace or PlaceDetail", () => {
    expect(source).not.toMatch(/import\s*\{[^}]*AddPlace[^}]*\}\s*from\s*["']\.\/add-place["']/);
    expect(source).not.toMatch(/import\s*\{[^}]*PlaceDetail[^}]*\}\s*from\s*["']\.\/place-detail["']/);
  });

  it("loads AddPlace and PlaceDetail through next/dynamic", () => {
    expect(source).toMatch(/from\s*["']next\/dynamic["']/);
    expect(source).toMatch(/import\(["']\.\/add-place["']\)/);
    expect(source).toMatch(/import\(["']\.\/place-detail["']\)/);
  });
});
```

Existing `src/components/app-shell.test.tsx` already clicks **Add place** and opens a list row. Those must keep passing. If a test uses `getByRole("dialog")` immediately after click without `await`, switch that assertion to `findByRole` so the dynamic import can resolve. Do not weaken the add/open/toast cases.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/app-shell.lazy.test.ts src/components/app-shell.test.tsx`

Expected: FAIL — `app-shell.lazy.test.ts` still sees static `import { AddPlace }` / `import { PlaceDetail }`. `app-shell.test.tsx` should still PASS on this step.

- [ ] **Step 3: Write minimal implementation**

In `src/components/app-shell.tsx`, remove:

```ts
import { AddPlace } from "./add-place";
import { PlaceDetail } from "./place-detail";
```

Keep `import { BrowseApp } from "./browse-app"` and `import { Toast } from "./toast"`.

Add:

```ts
import dynamic from "next/dynamic";

const AddPlace = dynamic(() =>
  import("./add-place").then((mod) => ({ default: mod.AddPlace })),
);
const PlaceDetail = dynamic(() =>
  import("./place-detail").then((mod) => ({ default: mod.PlaceDetail })),
);
```

Leave the JSX as:

```tsx
{adding ? (
  <AddPlace
    currentCityId={payload.city?.id ?? null}
    searchPlaces={props.searchPlaces}
    addPlace={props.addPlace}
    onClose={() => setAdding(false)}
    onSaved={handleSaved}
  />
) : null}
{selected ? (
  <PlaceDetail
    key={selected.id}
    place={selected}
    cardStatus={cardStatus}
    cities={payload.cities}
    areas={payload.areas}
    updatePlace={props.updatePlace}
    deletePlace={props.deletePlace}
    movePlace={async (id, toCityId) => {
      const result = await props.movePlace(id, toCityId);
      if (!result.ok && result.existingPlaceId) {
        void openExistingPlace(result.existingPlaceId, toCityId);
      }
      return result;
    }}
    createArea={async (cityId, name) => {
      const result = await props.createArea(cityId, name);
      if (result.ok) {
        setPayload((prev) => {
          const exists = prev.areas.some((a) => a.id === result.area.id);
          const areas = exists
            ? prev.areas.map((a) => (a.id === result.area.id ? result.area : a))
            : [...prev.areas, result.area];
          return { ...prev, areas };
        });
      }
      return result;
    }}
    onClose={() => {
      selectedIdRef.current = null;
      setSelected(null);
    }}
    onChanged={(place) => {
      void handleChanged(place);
    }}
    onDeleted={(id) => {
      setPayload((prev) => ({
        ...prev,
        places: prev.places.filter((p) => p.id !== id),
      }));
      selectedIdRef.current = null;
      setSelected(null);
    }}
    onError={setToast}
  />
) : null}
```

Do not wrap with an extra `Suspense` unless a test fails looking for the dialog; `next/dynamic` already provides one. Do not pass `ssr: false` unless jsdom cannot render the overlay — default SSR is required by Next docs for Client Components inside this island.

- [ ] **Step 4: Run tests and collect bundle evidence**

Run: `npx vitest run src/components/app-shell.lazy.test.ts src/components/app-shell.test.tsx src/components/browse-app.test.tsx`

Expected: PASS.

Run: `npm run typecheck`

Expected: PASS.

Run: `npm run build`

Expected: PASS. In the build output / `.next` client stats, `add-place` and `place-detail` must appear as their **own** chunks, not as a static import graph from the first browse client file. Record the `/` First Load JS number in the commit body only if the build prints it; do not invent a KiB savings figure.

If `next/dynamic` in jsdom breaks `app-shell.test.tsx` (dialog never appears), add to those tests:

```ts
expect(await screen.findByRole("heading", { name: "New Cafe" })).toBeInTheDocument();
```

(they already `await findByRole` on the add path). For the list-open test, change `expect(screen.getByRole("heading", { name: "Slant of Light Books" }))` to `findByRole` if it flakes.

- [ ] **Step 5: Commit**

```bash
git add src/components/app-shell.tsx src/components/app-shell.test.tsx src/components/app-shell.lazy.test.ts
MSGFILE=$(mktemp)
cat > "$MSGFILE" <<'EOF'
Lazy-load add and detail overlays until they open

* Import `AddPlace` and `PlaceDetail` with `next/dynamic`
* Keep `BrowseApp` and `Toast` on the first client graph
EOF
bash ~/.cursor/skills/commit/commit-no-trailer.sh "$MSGFILE"
rm "$MSGFILE"
```

`git add` `app-shell.test.tsx` only if it changed.
