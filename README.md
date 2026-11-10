## Map & POV correction — 19 October 2026

See [MAP_CAMERA_FIX.md](MAP_CAMERA_FIX.md) for the full changes and verification steps. Key differences: **recursive local asset lookup** under `C:\Users\elles\Downloads\Car Racing`, **close follow/car cockpit camera only during driving** (no entire-map orbit fly-in), **road mesh detection and safe initial heading** for all three maps, **camera snap and limited visibility**, and `CHECK_REDLINE_ASSETS.bat` to check every downloaded map and car for GLB validity. No fake substitute models have been added.

The updated ZIP intentionally **does not include the actual 3D GLB assets**. The Windows batch file points at the folder you supplied; your models may be inside subfolders.

---

# REDLINE // Street Racing

**Milestone 1 — playable-source alpha, not a finished commercial game.**

This is actual source code for an indie-scale 3D driving game, not a prompt or static prototype. It is wired to **12 real `.glb` files** in the current catalog. The GLBs themselves remain in the user's asset folder or on the user's server and are **not redistributed in this project**.

> **Verification:** JS syntax checks and six unit tests passed in the authoring environment. The npm registry and direct asset host were not reachable from that environment; **npm install, browser rendering, real GLB compatibility, WebSocket multiplayer between devices, and Android builds have not yet been tested**. Run these checks on your Windows PC before expecting stable gameplay.

## FAST LOADING UPDATE — 19 October 2026

REDLINE now loads the main menu immediately, streams the selected 3D car first, and **does not download the full garage or any map just to show a menu**. The real garage loads when entering GARAGE; the full selected map loads when starting a drive. Changing the paint finish or orientation no longer reconstructs the model. Lower-cost Android rendering, fewer spawn/ground raycasts, and smaller shadow maps reduce frame stalls.

### Fastest setup: load the GLBs directly from your Windows folder

Because you are hosting the assets from the same PC, you can skip the slow Cloudflare round-trip entirely:

1. Right-click `START_REDLINE.bat` and select **Edit**.
2. Find the commented `REM set "REDLINE_LOCAL_ASSET_DIR=..."` line and replace it with, for example:

   ```bat
   set "REDLINE_LOCAL_ASSET_DIR=C:\Users\YourUser\Downloads\REDLINE_ASSETS"
   ```

3. Enter the **real folder on your own computer** that contains `1989_ferrari_f40_competizione.glb`, `garage__warehouse.glb`, and the other listed models, with the filenames matching `src/assets/catalog.js` exactly. The folder should directly contain these `.glb` files.
4. Save the batch file, close the old REDLINE terminals, then launch `START_REDLINE.bat` again.

This method reads the assets directly from your hard drive. It works even if the external asset tunnel is temporarily offline (but online multiplayer across the internet still needs a reachable backend). **The files stay on your PC and are not copied into this source ZIP.**

### Alternative: use the local Python file server

If you already started the asset folder server with `py -m http.server 8000`, you can instead put this line in `START_REDLINE.bat`:

```bat
set "ASSET_ORIGIN=http://127.0.0.1:8000"
```

This avoids the public Cloudflare tunnel, but the direct folder option above is faster. Confirm your Python server really uses port 8000 before choosing this.

### Alternative: download a persistent cache once

When you cannot point REDLINE directly at the model folder, run the following in the REDLINE directory:

```powershell
npm run assets:cache
```

This downloads the default Ferrari F40, your Garage Warehouse, and Laguna Seca **once** from `race.teamtrader.co.za`, verifies that each download has a GLB header, and stores them in the excluded `asset-cache/` folder. Restart REDLINE and the backend serves these files directly from disk, rather than downloading them over Cloudflare again. To cache all vehicles, maps and accessories, run:

```powershell
npm run assets:cache -- --all
```

**Important:** These models could be extremely large; the first download can take several minutes and consume considerable disk space. Do not run `--all` until you have enough free storage. The option `--cars` downloads only vehicles, `--maps` downloads only maps, and `--garage` downloads the garage, NOS, and driver. Browser parsing of heavyweight meshes and textures may still take time even after downloading.

**Source priority:** REDLINE reads `REDLINE_LOCAL_ASSET_DIR` first (if set and file exists), then the `asset-cache/` copy (if present), then the original HTTPS asset URL. This allows a local development PC and a remote backend to use the same project files.

**What is not yet solved:** The GLB models are not yet optimized or tested in a real browser/device. Direct local loading eliminates unnecessary network hops, but very heavy raw geometry and textures may still need mesh/texture compression and LOD versions for Android. If the status reads `ASSET LOAD FAILED`, it is an actual asset/path error, not just slow loading; run `npm run assets:check` or check the backend console.

---

## Start on Windows (quickest)

1. Download and extract the entire `REDLINE_GAME.zip`.
2. Make sure [Node.js 20.12 or newer](https://nodejs.org/) is installed.
3. Double-click **`START_REDLINE.bat`**. The first run needs internet to download npm packages.
4. In your browser, open **`http://localhost:5180/`**. Keep PowerShell / CMD open while playing.
5. Ensure `https://race.teamtrader.co.za/` stays online, because that is where the actual garage, cars, NOS, driver, and map GLBs are hosted.

Equivalent terminal commands:

```powershell
cd "C:\path\to\REDLINE_GAME"
npm install
npm run dev
```

**Port already in use?** REDLINE now defaults to port **5180** instead of 5173. To select another frontend port in PowerShell before starting the game, run `$env:REDLINE_WEB_PORT=5181`, then `npm run dev`. In CMD, run `set REDLINE_WEB_PORT=5181` and then `START_REDLINE.bat`.

**Two local services start:** Vite on port 5180 (frontend), and the REDLINE server on port 3001 (GLB proxy + rooms + vehicle simulation). The local webpage requests GLBs from `/assets/<filename>` through the backend, which makes remote files same-origin and avoids browser CORS failures.

To verify assets before driving, run `npm run assets:check`. A 404 means the source file has moved or the file name changed; a timeout can mean the Cloudflare tunnel has stopped.

### Controls

| Action | Keyboard | Controller | Android browser / APK |
|---|---|---|---|
| Accelerate | W / Up arrow | Right trigger / A | ACCEL touch pedal |
| Brake | S / Down arrow | Left trigger / B | BRAKE touch pedal |
| Steer | A/D, Left/Right | Left analog | Arrow buttons |
| Handbrake / drift | Space | L1 | DRIFT button |
| Nitro | Shift | R1 | NITRO button |
| Camera | C | On-screen camera button | Camera button |
| Respawn | R | On-screen reset | Reset button |
| Pause | Escape | On-screen menu | Menu button |

**Tip:** The 3D garage car can be rotated by dragging on the render canvas. Scroll to zoom. If the downloaded car faces sideways or backward, click **FIX MODEL ORIENTATION** in the garage.

## Current features

- **3D model sourcing:** Loads six actual hosted GLB car files and three real map GLBs, plus the exact `garage__warehouse.glb` — no procedural placeholder cars or tracks.
- **Premium dark/red UI:** Real HTML menus for Home, Garage, Maps, Private Multiplayer, and Free Drive. Responsive landscape mobile layout.
- **Solo Free Drive:** Acceleration, braking, speed-dependent steering, handbrake/drift, air resistance, nitro depletion/recharge, modeled velocity in km/h.
- **POV controls:** Smooth chase, estimated cockpit, hood and bumper cameras.
- **Map preview:** Scene normalization, mesh-based ground height sampling, basic boundary handling, and automatic spawn candidate selection.
- **Garage:** Switch among six licensed/owned models, inspect in real warehouse GLB, attempt color changes on identifiable body materials, increase three performance characteristics, save settings in localStorage.
- **Multiplayer alpha:** Real WebSocket server supports up to 8 clients per room, user-defined room codes, create/join/ready/start, text chat, synced positions using server-side vehicle simulation, model synchronization and smoothing. No fake AI racers.
- **Nitro feedback:** Blue exhaust sprites, energy meter, actual acceleration, camera-FOV change, synthetic engine audio.
- **Mobile:** Touch steering/pedals/drift/nitro/camera, controller support where available, responsive view, Capacitor Android project setup scripts.

## Known limitations and next development milestones

1. **Asset compatibility is not yet verified.** These GLBs may use unexpected orientation, dimensions, embedded animations, textures or compression; adjust transforms and optimize them after the first browser import.
2. **Track driveability is preliminary.** Imported visual map meshes are not automatically designed as drivable 3D race levels. Ground raycasts and boundary clamps exist, but guardrail/building collisions, wheel suspension, road grip/terrain categories, proper track spawns and navigation need map-by-map setup. Do not claim full physics.
3. **No lap race, win condition, checkpoints, positions or authoritative competitive timing yet.** Existing multiplayer is a genuine synchronized free-drive session, not finished ranked racing.
4. **The cockpit position is estimated.** If a specific vehicle is missing an interior, a realistic seated-driver POV requires modifying/adding a properly licensed cockpit model, animation rig and camera anchors.
5. **Car cosmetics are limited to color and stat tuning.** Spoilers, body kits, rims and decals need separately authored modular assets and compatible rigs. Color recoloring only works where source materials can be identified.
6. **Not optimized for all Android devices.** Downloaded maps/vehicles could be huge; check poly counts/textures. Compress with Draco / Meshopt and KTX2/Basis where supported; generate LODs and compressed mobile versions.
7. **Audio is synthesized as a basic working engine approximation.** Replace with appropriately licensed RPM loops, gear shifts and tire audio. Environments need effects and lighting calibration.
8. **Multiplayer security is alpha quality.** Server simulates speed/steer/nitro from input but lacks authentication, car unlock validation, authoritative terrain collision, checkpoint validation and robust reconnect. Do not deploy publicly as a production game.
9. **Licensing matters.** Brand logos, NFS-derived track names/models, custom Sketchfab/Fab assets and other third-party materials have their own rights. Confirm commercial redistribution/license terms before publishing; the repo intentionally does not embed these GLBs.

## Deploy with Cloudflare Tunnel

The user-provided **`race.teamtrader.co.za`** is currently an asset directory; the game does not overwrite it.

For a public HTTPS play URL (needed for online Android multiplayer), first build and run the combined backend:

```powershell
npm install
npm run build
npm start
```

This serves the game at `http://localhost:3001`. A Cloudflare Tunnel can expose that backend at e.g. **`https://play.teamtrader.co.za`**. Set the tunnel's origin/service target to `http://localhost:3001`. Keep the asset host at `https://race.teamtrader.co.za` online too, because the backend proxies its GLBs.

While developing, `npm run dev` is faster and runs the game at `http://localhost:5180`.

## Android: installable APK / AAB

Prerequisites: Android Studio, Android SDK, recent JDK, supported Gradle toolchain, Node.js. **Android uses the same WebGL scene and touch UI through Capacitor; it is not a separate native 3D engine.**

First, expose your combined **game** backend (not merely the asset folder) at a permanent public HTTPS address, such as `https://play.teamtrader.co.za`.

Then run `BUILD_ANDROID.bat` and enter the **game backend** URL when prompted, or:

```powershell
npm install
$env:VITE_PUBLIC_SERVER_URL="https://play.teamtrader.co.za"
npx cap add android          # only once
npm run android:landscape    # lock Android activity to landscape
npm run android:sync
npm run android:open
```

In Android Studio, **Build > Build Bundle(s) / APK(s) > Build APK(s)** for a test APK, or generate a signed AAB for Play publishing. The APK bundles the HTML/JavaScript application but **streams 3D GLBs online** from your game backend; it requires connectivity and the game backend must use HTTPS/WSS.

> A mobile app that is fully offline would require distributing optimized asset files with the APK / asset packs instead of streaming these GLBs. That is future work.

## Tests

```powershell
npm run check
npm test
npm run assets:check
npm run build
```

The first two tests require no browser or real GLBs; `assets:check` requires internet. Build validation requires dependencies. For multiplayer, open two separate browser devices against the same reachable backend, create room `REDLINE-1` from device A, join with that code from device B, mark both ready, and start.

## Project structure

```text
REDLINE_GAME/
  src/main.js               Screens and game flow
  src/style.css             Desktop + Android landscape interface
  src/ui/template.js        Screen layouts
  src/assets/catalog.js     Exact server GLB filenames
  src/engine/Game3D.js      Three.js renderer, car/map loading, cameras
  src/engine/assets.js      GLTFLoader and model normalization
  src/engine/AudioEngine.js Browser-generated engine tone
  src/shared/physics.js     Driving simulation shared with backend
  src/net/MultiplayerClient.js Client WebSocket networking
  server/index.js           HTTP/static/asset streaming/rooms
  server/room-utils.js      Validations and lobby summaries
  scripts/                  Dev launcher, diagnostics, syntax check
  public/references/        Concept mockups; not fake gameplay screenshots
  MASTER_PLAN.md            Original comprehensive game specification
  START_REDLINE.bat         Windows one-click dev start
  BUILD_ANDROID.bat         Android Studio handoff
  capacitor.config.json     Android packaging settings
```

## Recommended immediate follow-up

1. Run the project on Windows and copy the first error if asset import fails. Run `npm run assets:check` and inspect any non-200 responses.
2. Inspect one actual car and track map in Blender/glTF viewer, record orientation, wheel pivots, collision meshes, and spawn points.
3. Create curated lightweight GLBs suitable for Android and add an optimized-asset manifest.
4. Define road splines, checkpoints, lap handling, collisions and synchronized multiplayer race results.
5. Add real driver rig/animation, tire systems, performance profiles, tuning parts, terrain materials and professional vehicle audio.

## Invisible car or incorrect Laguna Seca driving view?

See [VISIBLE_CAR_FIX.md](./VISIBLE_CAR_FIX.md). Press **F8** to display the car mesh count, dimensions and track spawn in the running game. This build attempts to avoid showroom floor meshes shrinking the car and to keep the chase camera above the road.
