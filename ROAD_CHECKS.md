# Road and minimap verification

Updated 20 October 2026.

- Fixed the `lane` substring matching building objects named `Plane`.
- Country Woods uses verified asphalt, bridge decks and checkered start/finish surfaces. Raised bridge roofs are excluded. Increased map span from 520 to 1400 so car-sized vehicles fit its passages.
- Rocky Pass includes three previously omitted checkered finish meshes.
- Laguna Seca span increased from 900 to 1800. The previous scale gave one overhead structure approximately 1.1 metres of clearance above the track.
- Collision boxes follow road pitch/roll, and low kerbs no longer count as tall walls. Buildings and barriers remain solid.
- Minimap caches the real drivable triangle geometry, then draws a position/direction marker. It does not display an invented circuit.

## Checks

`npm test`: 33 passed. Syntax checks and production build passed.

`node scripts/check-road-network.mjs` samples the actual GLBs on a 1.5 metre grid, checks car-sized swept movement between neighboring samples, and checks that each circuit's connected road surrounds its infield. All three circuit checks passed. Small isolated samples on boundaries/decorative parts are not treated as alternative routes.

Browser spot checks confirmed forward driving works and the minimap renders Rocky Pass correctly. This is not a manual full-lap test of every car/map combination.

These checks cover local movement. Multiplayer still requires separate validation of server-side terrain and collision behavior.
