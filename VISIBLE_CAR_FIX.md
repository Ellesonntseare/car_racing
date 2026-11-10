# REDLINE — Invisible car & driving-camera update

## Symptoms addressed

- Laguna Seca track renders but the selected car is not visible.
- The view can be occluded by imported road surfaces or begin near paddocks/tents rather than a racing lane.
- Some downloaded car GLBs contain an oversized showroom/floor backdrop that makes the car model tiny after automatic normalization.

## Improvements

1. **Vehicle GLB validation:** inspects visible meshes and dimensions after import; reports invalid or nearly flat car geometry instead of quietly claiming the car is ready.
2. **Vehicle-only scaling:** removes obvious oversized showroom/backdrop objects from the vehicle scene before calculating game-world dimensions. The real vehicle geometry and materials remain.
3. **Better road sampling:** evaluates points on actual upward-facing road triangles when looking for a start position, instead of relying primarily on bounding-box centers (which may be in the paddock on a looping circuit).
4. **Chase-camera clearance:** adjusts camera height for the road behind the car and attempts to remove track-surface obstruction between the camera and the vehicle.
5. **Diagnostics:** press **F8** while running the game to see the selected GLB filename, imported visible-mesh count, vehicle size, road mesh chosen for spawning, vehicle/camera location, and projected coordinates. Press F8 again to hide.

## Install

1. Completely close previous REDLINE command windows, especially if they still occupy ports **5180** or **3001**.
2. Unzip the new build and run `START_REDLINE.bat` from the extracted project folder.
3. The startup script remains configured to use `C:\Users\elles\Downloads\Car Racing`; this path may contain nested folders.
4. Open `http://localhost:5180`, choose Laguna Seca, and select **START DRIVING**.
5. Press **F8** to display runtime asset/camera diagnostics. If the car is still missing, send a screenshot of the F8 overlay and the **Console** tab in Chrome DevTools (F12). 
6. Confirm the Ferrari file is found by visiting `http://localhost:5180/api/assets/status` and looking for `1989_ferrari_f40_competizione.glb` with `"available":true`. A file existing on disk does not guarantee it can be rendered by your GPU, so the F8 output matters.

## Important limitations

The downloaded 3D models are not included in the ZIP. The source-code changes passed six unit tests and Node syntax validation, but the actual GLBs are only on your Windows PC. We cannot guarantee the correct Laguna Seca starting coordinate or visual result without inspecting the asset geometry in the running browser. This update is designed to improve automatic placement and make the remaining cause observable. If the track GLB has no distinct asphalt geometry or material, it may require manual spawn-coordinate calibration.
