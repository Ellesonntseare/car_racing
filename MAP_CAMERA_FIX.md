# REDLINE: Close Driving POV and Map Placement Update

## What's fixed in source

- All three catalog maps (Laguna Seca, Country Woods, Rocky Pass) are loaded one at a time. The maps menu no longer shows a pulled-back orbit view of the whole previous map.
- Starting a race switches to a **close vehicle-following camera**, not an orbital overview. It snaps to the car when the road finishes loading, rather than flying in from the previous menu camera.
- Drive cameras: close chase (default), cockpit, hood, bumper. Press **C** to cycle. View distance and fog reduce distant scenery visibility. This changes what is *shown*: it does not split a single, large GLB into downloadable map chunks.
- The road spawn search uses **road meshes and candidate road directions** for each loaded map instead of map-center coordinates. Respawn remembers the validated position. If no driveable ground is found, it reports an error rather than silently placing the car at (0, 0).
- Independent map objects beyond camera visibility can be culled; one large combined mesh still requires asset-side optimization for best Android frame rates.
- Map boundaries use the imported GLB bounds instead of assuming every level is a square.
- The car must load before driving begins; errors return you to the map menu, avoiding a blank driving screen.
- The asset backend recursively scans `.glb` files below `REDLINE_LOCAL_ASSET_DIR`, including `Cars/`, `Maps/`, `Garage/`, etc. The batch file defaults to the folder you supplied: `C:\Users\elles\Downloads\Car Racing`.
- Initial multiplayer vehicles are spawned relative to each player's detected track start rather than immediately snapping to world origin. This remains an alpha-level synchronization system, not a production anti-cheat implementation.

## IMPORTANT: Three-map audit

At the time of this camera update, I could not download or inspect the three user-hosted GLB geometries from the build environment because `https://race.teamtrader.co.za/` returned a gateway error. The map-specific runtime algorithms were implemented, **but did not count as a verified road-by-road inspection.** You can verify the files on your PC without re-uploading them:

1. Extract the ZIP. Put your downloaded GLBs anywhere under `C:\Users\elles\Downloads\Car Racing` (they may be inside different folders).
2. Double-click `CHECK_REDLINE_ASSETS.bat`. This checks **all three map GLB headers**, filename matches, mesh counts, basic road-name hints, and all six vehicle headers. It does not render them.
3. Double-click `START_REDLINE.bat`, visit `http://localhost:5180`, start a drive on **each** map, and check that the car appears on the road, faces a driveable direction and follows with the camera.
4. If a map fails road detection, note the map name and the console error (F12) and send me the result or the specific GLB; exact road anchors may need manual per-map calibration.
5. Visit `http://localhost:5180/api/assets/status` to see which expected files your local server can resolve. `source: local-folder` means local loading succeeded. If a file reports missing, extract it under the specified folder and restart the batch file.

## Compatibility notes

The game still uses the original real 3D assets. No replacement primitive cars or fake race tracks have been introduced. First-person interiors remain dependent on the quality and orientation of each supplied vehicle GLB. Camera clipping, physics and suspension remain alpha quality; proper wheel-to-ground constraints and collision geometry still need further work.
