# REDLINE — Fast Loading Patch

This release addresses reports of long waits for 3D cars and maps.

## Included

- No garage GLB download on home-screen startup.
- No giant map GLB download on entering or browsing Maps.
- Actual car, garage and map assets continue to be used when needed.
- Fastest asset source: `REDLINE_LOCAL_ASSET_DIR` local Windows directory. No Cloudflare round-trip.
- Optional persistent cache command: `npm run assets:cache` (core); `npm run assets:cache -- --all` (all).
- Correct support for GLB local-file HEAD and HTTP byte-range requests.
- Paint and orientation changes update the live model rather than reloading/rebuilding the car.
- Lower default render resolution and shadow cost on Android; fewer costly ground raycasts.
- Model transfer status shows progress in percent or megabytes.

## Verification

- `npm run check`: passed.
- `npm test`: six tests passed.
- Full npm install, real-model parsing, rendering, multiplayer network and Android builds have not been validated in this execution environment.
- Remote asset sizes/speeds could not be measured because `race.teamtrader.co.za` was unreachable from the build container.

## Recommended first action

In `START_REDLINE.bat` set:

```bat
set "REDLINE_LOCAL_ASSET_DIR=C:\YOUR\ACTUAL\ASSET\FOLDER"
```

Do **not** copy this example path as-is. Edit it to the directory containing your 13 `.glb` files, save, and restart both REDLINE processes. The default game port remains 5180, backend port 3001.
