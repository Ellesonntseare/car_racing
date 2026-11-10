# REDLINE work checkpoint — 21 October 2026

User resumed work on 21 October after the earlier credit-saving pause. Away automation remains paused. Current progress is tracked in LIVE_CHECKLIST.md.

## Resumed verification

- Full suite now passes 81/81; final syntax checks and production build pass.
- Sound preference is restored/saved, and enabling sound starts audio on that user gesture.
- clearPeers also clears interpolation buffers for peers whose models never finished loading.
- Fresh backend and independent Vite frontend have been started; localhost:5180 remains the preview URL.
- Backend PID19308/session12734 and Vite PID14244/session70069 are independent; preserve both.
- Fresh live two-player WebSocket verification through port5180 passed loading barrier, countdown, shared NOS revision and appearance sync. 15 focused network/interpolation/settings tests passed; eight-player snapshot timing 47ms median / 48ms p95. Final backend health ok, zero test players left connected.
- Browser QA is blocked: cua reports local browser use is disabled in Work settings. Do not bypass this setting with another browser automation tool.

## Completed implementation

- NOS overspeed decays naturally after release; continuous rescaled controller deadzone.
- Ordinary terrain/shoulders enabled via road classifier ground candidates and TrackWorld ground support; steep ledges, real obstacles and missing ground remain blocked. Optional supported wall sliding.
- Confirmed invisible Woods blockers: transparent tree sprite cards replaced by verified narrow trunk collision proxies. Real fences, buildings, guardrails remain solid. Clearance audit scans 19,117 asphalt samples; Woods broad-asphalt false blockers 16 -> 0.
- Canonical RACING_ROUTES metadata, corrected Laguna cycle, centered route spawn, ordered checkpoints. AI uses RaceDriver with real throttle/brake/steering physics and swept collisions.
- Signed continuous RaceProgress; reversing across start no longer creates near-full-lap lead. LapTracker rejects shortcut/teleport laps, retains progress across finishes, saves routeVersion 2 and richer ghosts. Old route records intentionally ignored.
- Multiplayer prepare/loading/spawn/start barrier; server-owned NOS resources with resourceVersion; stale pose handling; failed room-switch membership preserved; appearance/tuning sync; stalled vehicles held; safer socket lifecycle.
- Client main.js and Game3D.js integrated with protocol, peer timestamp interpolation, safe settings parsing, dialogs/tabs keyboard handling, solo loading lock.
- Instance-owned graphics disposal, shared per-car materials, less redundant wheel hierarchy work, grounded parked cars/contact shadows, selected duplicate avoided.
- Garage PMREM reflections, player-following sun shadows, scenery-aware camera collision, slope-oriented/animated ghosts, improved cockpit offsets. Home statistics/help overlap fixed.

## Validation already completed

- Full npm suite: 80/80 passed before one additional Woods projection regression was added; new focused lap/progress suite 10/10 passed. Syntax and production build passed after integration.
- F40 physically drove and credited a lap on all maps, zero blocked/invalid frames: Laguna 150.2s, Woods 415.2s, Rocky 388.8s.
- Bentley at AI speed physically drove THREE credited laps on each map, zero blocked/invalid frames: Laguna 144.9/144.1/144.1s; Woods 404.3/403.7/403.7s; Rocky 377.7/376.8/376.9s. No teleporting.
- Network tests 7/7 passed including eight players, loading barrier and stale NOS poses. Eight-player snapshots median47ms/p95 48ms.
- Network agent read-only review found no main/Game3D protocol integration blocker.

## Remaining verification and follow-up

1. Browser QA remains blocked by Work settings. Once browser control is enabled, use a separate hidden test tab: solo grid lock/countdown, actual drive/ordinary shoulders, garage reflections/camera/grounding and two-client multiplayer prepare/start/NOS/appearance visibility. Do not disrupt the user's preview.
2. Inspect browser runtime errors and performance when available. Cross-device multiplayer remains unverified.
3. Full automated tests, syntax, build and fresh live protocol verification are complete. Avoid repeating expensive map proofs unless relevant changes warrant it.
4. Multiplayer is intentionally labelled ONLINE DRIVE. Competitive online laps/results, persistent auto-rejoin/accounts, broad progression/content and asset licensing records remain future work.

## Important context

- Project directory is not a Git repository. All changes already reside in the working files; no commits.
- Real map/car assets are in ../Car Racing. Do not remove or replace originals.
- User explicitly wants ordinary ground driveable, but solid obstacles/steep terrain blocked. Latest instruction supersedes earlier strict-road-only preference.
- User NOS rules: shared globally, animated, distributed road-center locations. Dynamic relocation after initial placement still future work (sites currently respawn on timers).
- Side preview opened via open_in_codex at localhost:5180, tab13 observed loaded and driving Country Woods.
- Existing scripts/check-full-laps.mjs now validates actual physics+LapTracker, not artificial checkpoint point traversal. Supports REDLINE_DRIVER_CAR/LAPS/SPEED/WIDTH and REDLINE_LAP_MAP.
