> Required prior reads: [overview.md](../overview.md), [global-constraints.md](../global-constraints.md).  
> Do not open `README.md` or other task files.

### Task 5: Repeatable Lighthouse verification

**Files:**
- None required. Do not add a repo markdown file. Do not change product code unless a gate fails and the fix belongs in an earlier task (then stop and send that task back).

**Interfaces:**
- Consumes: Preview deployment of this branch (same commit as implementation). Clean-run protocol below.
- Produces: A three-run median table compared to the clean baseline. No commit unless a documented script is added; this task should not need one.

Baseline (three clean Incognito runs, extensions disabled, storage cleared; reports named `feat/bop-v1` but they are commit `005fda3`, which this branch started from):

| Metric | Median baseline |
|---|---|
| Performance score | 71 |
| Simulated FCP | 1.73 s |
| Simulated LCP | 7.77 s |
| Speed Index | 4.29 s |
| TBT | 142 ms |
| CLS | 0 |
| Observed LCP | 2.53 s |
| Transfer | ~1,003 KiB / 54 requests |

Do not compare against the obsolete 1,105 ms TBT number (extension-contaminated).

- [ ] **Step 1: Confirm the preview is this branch**

Use the current `fix/load-time-performance` preview (or deploy one). Record the URL. Confirm the deployment commit matches `git rev-parse HEAD` after tasks 1–4.

- [ ] **Step 2: Run three clean Lighthouse passes**

For each run:

1. Chrome Incognito (or a dedicated clean profile).
2. Extensions disabled.
3. Storage cleared for the origin (cookies, cache, service workers).
4. Sign in if the preview is allowlist-gated, then hard-reload so the browse document is a cold load with an authenticated session.
5. Do **not** click Explore map before Lighthouse finishes. The point is first-load LCP without Maps JS.
6. Run Lighthouse: Performance, mobile emulation, same settings as the baseline reports in `/Users/roman/Documents/projects/lol/stroll/lighthouse-reports/`.

Save three JSON reports with distinct names.

- [ ] **Step 3: Compare medians to the gates**

Compute medians across the three runs. **Pass** only if all of these hold:

- TBT median **< 200 ms** (baseline 142 ms; do not trade TBT for LCP).
- CLS **= 0** in every run.
- Simulated LCP median is **materially below 7.77 s** (not a 0.1 s blip; look for a drop that tracks removing the Maps-tile discovery wait).
- The LCP element is **not** a Google Maps tile (`maps.googleapis.com` / `khms*` / 256×256 map tile). Expected LCP: the static map poster (`/api/maps/static`) or another first-party element (header, poster, list).
- Image transfer is **closer to the ~258 KiB indicated savings** than the baseline ~385 KiB image bytes. If WebP landed, list thumbs should be `image/webp` in the network log.
- First load must **not** download Maps JS (`maps.googleapis.com/maps/api/js`) until Explore map. Confirm the Lighthouse/network trace for the unclicked load has no Maps JS / Maps fonts.

Do **not** claim a specific performance score target. Score may still sit in the 70s if the document stays ~130 KiB; that is acceptable if LCP and Maps-tile gates pass.

- [ ] **Step 4: Targeted regression commands**

Run: `npm run lint && npm run typecheck && npm test && npm run build`

Expected: all PASS. This is the code gate; Step 3 is the field gate.

- [ ] **Step 5: If a gate fails**

- Maps tile still LCP, or Maps JS on first load → task 1 (poster not in HTML, or `map-canvas` still imports on mount).
- Images still ~80 KiB JPEGs → task 2 (route not transcoding, or `h=160` not used).
- TBT jumps above 200 ms → task 3 (lazy load missing) or accidental eager Maps.
- CLS ≠ 0 → map slot lost `h-full min-h-0` / grid sizing.
- Filters miss notes → task 4 went too far.

Fix in that task’s files with a new failing test. Do not pile unrelated changes into this verification task.

- [ ] **Step 6: Commit**

No commit if no files changed. If you add a tiny operator note, do not put secrets in it.
