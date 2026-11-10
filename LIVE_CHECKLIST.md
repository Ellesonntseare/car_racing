# REDLINE — live checklist

Updated 21 October 2026. Work resumed at the user's request.

- [x] Ordinary ground and shoulders driveable; real walls, trunks and steep ledges remain solid.
- [x] Country Woods invisible foliage-card road blockers fixed.
- [x] Complete physical laps credited on Laguna Seca, Country Woods and Rocky Pass.
- [x] Three consecutive Bentley laps per map without blocked or invalid frames.
- [x] Steering deadzone, wall sliding and smooth NOS momentum transitions implemented.
- [x] Physics-driven AI, ordered checkpoints, shortcut rejection and richer ghost replay implemented.
- [x] Multiplayer loading barrier, shared server-owned NOS and appearance/tuning synchronization implemented.
- [x] Timestamp-based remote vehicle interpolation implemented.
- [x] Garage reflections, resource cleanup and grounded parked cars implemented.
- [x] Sound preference restored and saved; leftover multiplayer tracking cleared on exit.
- [x] All 81 automated tests pass.
- [x] Final syntax checks and production build pass.
- [x] Backend restarted with current protocol; frontend restored at localhost:5180.
- [x] Fresh live two-player WebSocket/proxy verification passed: loading barrier, countdown, shared NOS, appearance and snapshots.
- [x] Eight-player network tests passed: snapshot intervals 47ms median / 48ms p95.
- [ ] Visual garage, camera, solo grid and two-client browser checks.

Browser verification is blocked because local browser control is disabled in Work settings. Automated lap proofs and network tests do not replace visual checks or multiplayer testing across separate devices.

Preview: http://localhost:5180/

Later additions: competitive online results, reconnect/account persistence, broader graphics quality settings, progression, and relocating NOS spawn sites during a match. NOS currently respawns at distributed road-center sites on timers.
