# Development watcher and generated output

The normal Vite development server excludes local agent scratch under `.claude/` and generated output under `balance/reports/` from file watching, alongside the existing save-data and backup exclusions. Source, public assets, balance scripts and tracked baselines remain watched. The disk-save endpoint, loading-frame plugin and source-tree full-reload policy are unchanged.

Files in excluded directories remain readable and statically servable. Live edits there no longer trigger HMR **or watcher-driven transformed-module cache invalidation**. A manually refreshed report page may still use a cached transformed module; restart Vite after editing such modules, or use the existing standalone report viewer/build workflow. Generated outputs must not become imported live source inputs without revisiting this boundary.

## Local evidence, 2026-10-16 UTC

One fixed A1/B1/B2/A2 course compared reports watching enabled/disabled/disabled/enabled, with `.claude` ignored in all four. Both arms used the same four owned empty environment files, source/HTML/report fixtures and real configuration. The empty files remove the installed watcher's known premature-ready path for missing environment inputs; the course does not measure ordinary absent-env startup. No caches were cleared: A1 was ambient-cache, not guaranteed cold, and order/scheduling effects remain possible.

| Course | Reports watched | Create-to-ready ms | Native watch calls | Native watch ms | Edit-to-reload and capture ms |
| --- | --- | ---: | ---: | ---: | ---: |
| A1 | yes | 68912.274 | 83365 | 56482.020 | 206.218 |
| B1 | no | 2672.569 | 3771 | 2156.030 | 123.184 |
| B2 | no | 2681.934 | 3771 | 2151.710 | 123.752 |
| A2 | yes | 68625.060 | 83365 | 56673.625 | 221.804 |

A had 79,594 report watch registrations; B had zero. Exact non-report inventories matched at the ready event, after listen and after HMR, within and across all four courses. Resolved configuration fingerprints matched after subtracting only the reports exclusion. Each course served the actual source module and math dependency, observed a real WebSocket full-reload and changed DOM state after the owned source edit, and served the same exact 56-byte raw report marker over HTTP. All eight owned processes closed with exit code zero, without force. Source/index pins and owned-file cleanup passed; watcher errors, diagnostic faults and cleanup errors were zero.

The native watch meter was enabled in both arms; bookkeeping took about 1,041 ms in A and 47 ms in B, separate from native-call time. These measurements establish this checkout's generated-report watcher cost under the controlled setup. They do not quantify the separate `.claude` exclusion, prove gameplay throughput/capacity, or promise the same timing elsewhere. Earlier failed setup courses remain preserved; no passing retry replaced them.

Immutable local experiment: `.claude/native-dev-watch-audit.local.work/reports-abba-v1`, run `2026-10-16T01-22-19-273Z-131036`. Manifest SHA256: `37cda04e34fd7a54c8b57f5c9c27a8d9dbf8de5184d997e055a1aecc6beb0811`. Summary receipt SHA256: `4969736dd794421b7b29dbd7140638ea095edc3ec1d0c2b4f9b3a352e892d302`. Per-course receipts and bounded metrics are retained with the reviewed candidate.

## Verification boundaries

`npx tsx balance/check_devwatchconfig.ts` resolves the ordinary development configuration without inline watch options and checks exact ignores plus retained plugins/profiling header. It is configuration regression coverage, not browser or performance acceptance. The local real-browser course provides separate evidence for the equivalent ignore override; installed config and hosted regression still require verification after integration.

The save-order probe has an independent fixture-only `server.watch = null` setup so a source-tree crawl cannot consume its request lifetime. All original endpoint assertions, body/sequence ordering, deadlines and error paths remain unchanged. That fixture is not evidence about normal dev-server watching. Historical source readers retain exact predecessor views and original assertions/archives. No roster, save protocol, keep-alive timeout, retry policy or gameplay budget changes.
