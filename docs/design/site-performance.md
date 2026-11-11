# Homepage loading and rendering

The landing page uses the complete live collection pools without downloading
the full database objects. `scripts/site-collection-data.mjs` projects every
field used by the rack, its emblems and tooltips from the same normalized data
that builds the database. `export-web-data.ts` emits minified `collection.json`
on every Pages build. The database exports remain unchanged. All three rack
tabs show 18 items, including after shuffling.

`page-loading.js` prepares the collection up to 1,200px before it enters the
viewport (400px with data saving or a very slow connection). Native anchor
navigation also triggers preparation. The rack reserves space before data
arrives and offers a retry on failure. Field-guide data waits for opening,
pointer intent or keyboard focus. The current three class choices warm near
their section, at low image priority, with at most six retained warm images;
speculative class warming is disabled for constrained connections.

Vocations continue to import only after deliberate disclosure, and unrevealed
secret artwork is never prefetched. A closing animated disclosure counts as
closed for image loading; reversing it resumes the current class's selection.

Memory paintings retain their CSS image fallback until their first successful
render. WebGL contexts and texture uploads wait until near the viewport and
visible disclosure, while animation draws require actual visibility. Geometry
and image cropping update on resize/source changes rather than on every frame.
The canvas still extends beyond the image on every edge and stays within its
existing one-million-pixel drawing budget.

The full-page atmosphere remains alive throughout scrolling. It pauses when
the document is hidden or the cinema covers it, then resumes at the beginning
of the shatter. Elapsed-time motion and a 60fps ceiling prevent faster monitors
from accelerating the effect. Memory painting drift retains its 20fps cap.
The cinema owns a single shatter context even if skipped before preparation;
shader failures release their partial contexts. Data-saving visits warm the
theater on interaction intent instead of speculatively at idle.

## Measured baseline

Same local HTTP server, installed Electron, 1440×1000 viewport, cold page,
2.2 seconds after load, no scrolling. External fonts and the trailer are
excluded to isolate landing-page resources. These are **uncompressed source
bytes**, not a CDN transfer measurement or a claim about all visitors' timing.
Class selection and viewport can change image requests.

| Measure | Before (`125dee4`) | After |
| --- | ---: | ---: |
| Initial local resources | 12,238,407 bytes | 921,143 bytes |
| Initial JSON data | 11,384,703 bytes | 61,998 bytes |
| Initial painting contexts | 5 | 1 |
| Full collection data | 11,219,986 bytes | 603,126 bytes |

This removes about 92.5% of initial source bytes and 99.5% of initial JSON.
The complete collection payload is about 94.6% smaller. Content is prepared
before its section enters view; it cannot guarantee zero waiting after an
instant deep link or on an unavailable network.

A controlled run with text compression, 4 Mbit/s throughput and 100ms latency
painted its first content at 472ms and prepared the collection in 1.3 seconds
while still 600px below the viewport. This also excludes external fonts and the
trailer; it is a repeatable local test, not field telemetry.

## Verification

Generate current data with `npm run export-web-data`, then run:

```text
npm run check
node --test scripts/test-site-*.mjs
npx electron scripts/check-site-performance.cjs
npx electron scripts/check-site-gothic.cjs
npx electron scripts/check-site-memory.cjs
npx electron scripts/check-site-vocations.cjs
npx electron scripts/check-site-world.cjs
npx electron scripts/check-site-disclosures.cjs
```

The performance harness enforces startup budgets, loading ahead of scrolling,
18 items after each shuffle, hidden-content isolation, idle offscreen effects,
deep-link failure/retry, cinema coverage, and immediate skipping. Its test film
is generated in memory; browser profiles use the shared automatic cleanup.
