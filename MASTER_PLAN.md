# REDLINE — Premium 3D Street Racing Game
## Updated AI Master Prompt + Full Development, UI & Android Plan — v2.0

> **Updated:** 19 October 2026  
> **Purpose:** Give a coding AI one clear specification, build order, asset-ingestion process, and screen-by-screen design language.  
> **Project status:** **SPECIFICATION / DESIGN REFERENCES ONLY** — screens below are generated concept art, not working game screens. This document does not claim the code, real assets, multiplayer, or APK already exist.  
> **Targets:** Desktop web, Android web, installable Android APK and AAB; shared gameplay logic and real multiplayer.  
> **Garage instruction:** **THE USER ALREADY OWNS / HAS DOWNLOADED A GARAGE 3D MODEL. IMPORT THAT MODEL; DO NOT INVENT OR REPLACE THE GARAGE ENVIRONMENT.**  
> **Asset instruction:** User is downloading cars, maps, nitro and other assets. The coding AI must inspect the **actual supplied files** before selecting dependencies or rebuilding anything.

> **How to use:** Supply this `.md` to your coding AI. Optionally provide the companion `REDLINE_UPDATED_PLAN_AND_UI_REFERENCES.zip`, whose `references/ui/` folder contains six screen mockups matching the descriptions here. The text remains usable by itself without that ZIP. All mockups are **visual direction**, not flat images to paste over gameplay.

---

# PART A — THE NON-NEGOTIABLE GAME BRIEF

## 1. Vision and quality bar

Build **REDLINE**, a cinematic 3D street-racing game with believable cars, high-speed arcade-simulation handling, first-person cockpit POV, neon city roads, multiplayer, nitro speed boosts, interactive car customization, and a premium full-screen interface.

The experience must be a **game, not a dashboard or animated website**. Players should be able to launch the game, select a real 3D car, drive it on a complete track, use boosts, finish a race, and see a legitimate result. Do not claim to have shipped features that are only mockups.

**Visual direction:** Detailed PBR car paint and glass, realistic road surfaces, lighting, shadows, engine audio, smoke, sparks and convincing animations. Aim for a commercially polished *indie-scale* production. AAA console visual fidelity cannot be guaranteed on low-end Android devices or in WebViews; prioritize scalable quality without misleading claims.

**Design principles:**
1. One exceptional playable racing experience before many incomplete modes.
2. Real appropriately licensed `.glb` / `.gltf` assets, not primitive vehicles or random cubes.
3. Responsive driving and stable framerate before heavier effects.
4. Android and touch usability must be tested from the first milestone.
5. Cross-platform multiplayer must involve genuinely separate devices.
6. No copying trademarked car logos, proprietary racing maps, or copyrighted game content without licenses.

## 2. Core player experience

### Cameras and POV
- **Cockpit POV:** Driver-seat camera with real interior, steering wheel animation, dashboard, road visibility, instrument illumination, subtle camera response to suspension and braking.
- **Chase:** Smooth adjustable third-person camera behind the vehicle.
- **Hood:** Low forward-facing camera above the bonnet.
- **Bumper:** Road-level camera emphasizing speed.
- **Cinematic replay:** Post-race highlights in a later phase.
- Camera switching must work via keyboard/controller and a **large Android on-screen button**; cameras must avoid clipping through the car.

### Driveable environments
- **Neon City (first map):** Dense night-time city loop with roads that actually connect, signage, traffic lights, bridges, tunnels, working collision, intersections, roadside props, reflective surfaces and landmarks.
- **Coastal Highway:** Ocean vistas, bridges, cliffs, winding coastal routes.
- **Mountain Pass:** Elevation, tight curves, forest sections, tunnels.
- **Desert Expressway:** Fast straightaways, interchanges, service stops, industrial outskirts.
- Later: Free-roam routes, AI traffic, day/night variation, rain, fog, weather-dependent grip and police pursuit.
- Use licensed modular environments and well-authored road splines; a real-world map download is **not** automatically a legal or game-ready 3D level.

### Driving and physics
- Engine power, gears, acceleration, braking, steering, friction, tire grip, handbrake, drifting, wheel slip, weight transfer, suspension, impact response, speed-sensitive steering and tuned arcade realism.
- Different cars must handle differently (weight, power, wheelbase, suspension, tire setup).
- Dedicated vehicle simulation fixed timestep, separate from variable-rate rendering.
- No cars hovering, skating sideways without friction, passing through barriers or rotating as one rigid unanimated model.

### Speed power-ups
| Mechanic | Gameplay effect | Required feedback |
|---|---|---|
| Nitro | Burst of acceleration/top-end assistance, consuming energy | Flames, sound, FOV, HUD drain |
| Drift recharge | Earn nitro through controlled drifting | Meter fill, drift score |
| Near-miss recharge | Earn nitro from close clean passes | Pop-up, sound cue |
| Slipstream | Speed benefit while safely following a lead car | Wind streaks, HUD indicator |
| Perfect shift | Small bonus for well-timed manual shifts | Gear flash, engine response |
| Overdrive | Rare short high-power mode with cooldown | Unique effects and clear timer |
| Pickup boost | Optional arcade-only collectible boosts | 3D pickup VFX and authoritative collection |

Power-ups must change actual physics/game state, have cooldowns or resource costs, and be **validated by the multiplayer server**. Offer a rules toggle for races without arcade boosts.

### Garage and tuning
- Interactive 3D showroom: orbit, zoom, inspect, compare, preview changes, save presets.
- Visual: paint, pearlescent/metallic/matte finishes, wheels, spoiler, bumpers/body kits where the selected asset supports interchangeable meshes, headlights, tint, exhaust, neon, ride height, wraps/decals.
- Performance: engine, turbo, transmission, brakes, tires, weight, suspension and nitro capacity.
- Live stat bars: speed, acceleration, handling, braking and nitro; stat changes must come from actual tuning values rather than cosmetic UI.
- Changes appear immediately on the car and persist to the player's account.
- If a source model is not modular, **do not fake** body-part replacement; use compatible upgrade kits or source/create a modular model.

### Modes and progression
- **Launch modes:** Free Drive, Sprint Race, Circuit Race, Time Attack, private multiplayer rooms.
- **Later modes:** Drift score attack, drag racing, public matchmaking, ranked races, police pursuit.
- Player profiles, saved garage, vehicle unlocks, race rewards, personal bests, leaderboards and race history.
- Virtual progression only initially. No paid loot boxes, real-money economy or payment infrastructure in the first release.

### Presentation
- Full-screen animated 3D title screen showcasing the selected car (no generic SaaS navigation).
- High-quality animated race countdown, minimap, KM/H speedometer, RPM/gear, nitro meter, lap, position, timers, checkpoints and race results.
- Cinematic garage, animated map selection, multiplayer lobby, clean settings and short transitions.
- Engine RPM layers, transmission shifts, turbo spool, tire squeal, wet-road ambience, nitro and collision sounds, all licensed.

---

# PART A.2 — AUTHORITATIVE UI/UX SCREEN DESIGN SPECIFICATION (NEW)

## Design source-of-truth and reference images

The following six concept art mockups were created for REDLINE in the design conversation. The AI must faithfully translate their **visual hierarchy, cinematic styling, layout patterns and controls** into **real working 3D scenes plus interactive HTML/Canvas HUD**, not use screenshots as a background that merely looks clickable.

| Screen ID | Design mockup in companion ZIP | What must genuinely work |
|---|---|---|
| `home` | [`references/ui/01-home.png`](references/ui/01-home.png) | Navigate, launch local race, open multiplayer, garage, settings |
| `multiplayer` | [`references/ui/02-multiplayer.png`](references/ui/02-multiplayer.png) | Room create/join, player-picked codes, ready state, map/mode, real online race |
| `maps` | [`references/ui/03-maps.png`](references/ui/03-maps.png) | Choose an actually available map, route, time/weather and race mode |
| `race-cockpit` | [`references/ui/04-race-cockpit-touch-hud.png`](references/ui/04-race-cockpit-touch-hud.png) | First-person driving with functioning car interior, instrument cluster and touch HUD |
| `race-chase` | [`references/ui/05-race-chase.png`](references/ui/05-race-chase.png) | Third-person follow camera with same authentic race state, touch HUD and opponents |
| `garage` | [`references/ui/06-garage.png`](references/ui/06-garage.png) | Render the USER'S supplied garage model, inspect car, modify parts, save, test drive |

**Reference priority:** (1) working user-supplied assets and licensing; (2) the screen structure below; (3) concept image composition; (4) practical responsive adaptation. A concept can show decorative numbers, fictional scenery and features not yet released; **never treat these as real game content until implemented and validated**. For example, mockup player names/credits/levels/lap times/map area are illustrative only. Do not copy trademarked vehicle badges from pictures into shipped 3D assets unless permitted.

### Shared design system: REDLINE visual DNA

- Mood: premium underground street-racing, futuristic but believable, rain-soaked neon at night, black charcoal glass panels, red active/primary actions, blue/cyan telemetry, occasional violet/purple reflections.
- Identity: REDLINE logotype with italic performance-racing aesthetic and high-contrast navigation; use original safe branding assets. No generic SaaS landing page, no default Bootstrap-style cards.
- Main display: actual continuously rendered 3D world/car or optimized video alternative **only for optional menu ambience**; interactive game scenes always use actual 3D.
- Presentation: restrained bloom, realistic PBR car lacquer, concrete/glass reflections, spotlight rigs, camera dolly/orbit, short animated transitions. Heavy FX can be reduced on Android.
- Menus: legible labels, strong spacing, active section indicator, clear hover/focus/pressed/disabled states, controller-friendly navigation.
- UI: small, deliberate chrome framing; use semantic UI controls and accessible names despite custom visuals.
- Responsiveness: desktop 16:9 screenshots are **reference only**; on Android landscape screens, keep the gameplay camera unobstructed, collapse side panels, simplify decoration, and honor cutouts/gesture insets. No horizontal scroll to access a primary action.
- Cross-screen state: player's car, paint/parts, selected map, room options, currencies (when implemented), graphics/audio preferences and login status must stay consistent when navigating.
- Performance: do not run multiple hidden WebGL contexts for menu, garage and driving simultaneously. Reuse/suspend scene renderers, unload unused models/textures and profile transitions for memory leaks.
- Distinguish **real 3D assets** from illustrations: concept mockups are not texture sheets, road meshes, UI sprite packs, or evidence that specific vehicles, buildings, or multiplayer gameplay are implemented.

## Screen 01 — HOME / TITLE SCREEN

**Visual layout:** A single premium 3D tuned sports car sits across the central-right composition, in a wet neon-lit city/garage entrance setting. REDLINE logo top-left; profile, level and virtual currency indicators upper-right (omit unfinished data rather than fabricate accounts). A vertical left-hand primary menu uses large red highlighted **PLAY** and muted secondary actions. Small event cards can sit across the bottom; subtle character/camera animation creates a cinematic feel.

**Primary menu:** `PLAY`, `MULTIPLAYER`, `GARAGE`, `CUSTOMIZE` (opens garage Visuals directly), `CAREER` (when playable) and `SETTINGS`. Keep the same language and ordering as the visual reference where practical. `PLAY` flows to mode/map selection, then starts a real race; `MULTIPLAYER` opens the live room browser/creator; `GARAGE` shows the already-imported garage model.

**Interaction:** Render the **player-selected car model**, not a generic car unrelated to the owned garage. On Android a narrow landscape layout can use a vertically compact menu or horizontally scrollable selection strip, but PLAY must be obvious and immediately tappable. Do not show fake daily challenges or timed events; hide or mark them *not available* until server logic exists.

**Implementation gate:** Navigate to an actual local race, return home and navigate to an asset-backed garage on both desktop and Android. Focus/hover/touch states and Back behavior must work.

## Screen 02 — MULTIPLAYER / ROOM LOBBY

**Visual layout:** Three sections in a high-end racing warehouse: compact settings panel left, **real 3D lineup of each joined player's current car** across center, user/player list with ready/ping/chat on right, prominent START RACE at bottom only when allowed. The concept shows multiple cars with neon paint/underglow and a city backdrop; actual room data drives them.

**Room creation:** player sets **own custom room code**, room title, public/private toggle, max players (start with up to 8), map, mode, lap count, weather/time, traffic, vehicle collisions and nitro/power-ups. Validate normalized case, length, allowed characters, uniqueness, reserved/inappropriate codes, host permission and duplicate requests server-side. Disallow creating a room with a code already in use; explain conflicts and allow editing, not silent override.

**Room joining:** enter host-specified code, see status and clear error messages for full/private/unknown/finished rooms. Room ID can be internal; **visible room code is player-supplied**, not forcibly random. Party membership and ready state must be synchronized via Colyseus.

**Lobby:** actual players are shown only when connected; car previews reflect saved builds; race host controls settings and can start with rules-compliant ready players (host may choose stricter all-ready setting). Chat, if included, has rate limiting and mute/report controls; it is not required for initial first playable multiplayer milestone. Keep profile/avatar mockups as optional styling, not verified real users.

**Start and result:** verify countdown consistency and server validation of lap progress, boosts and placing. Host leaves => deterministic reassignment or graceful room shutdown/recovery; reconnects need clear UI. Never use bots/fake names to pretend people connected.

**Android adaptation:** stepwise `Join | Create` layout with tabbed `Players | Room settings | Map` and one large ready/start action; car preview can rotate single-selected players rather than drawing 8 at once. Text input must stay clear of software keyboard.

**Implementation gate:** two separate people/devices create/join chosen code, synchronize selected cars and ready state, start a race, see each other move and receive the same final result.

## Screen 03 — MAPS / TRACK SELECT

**Visual layout:** Narrow vertical list of destinations on left (with thumbnails), **large actively selected 3D location preview** to center/right, map details and route choices, row of time-of-day/weather presets, **SELECT MAP** in lower-right. In the mockup Neon City is selected with rain at night; the screenshots of highways and other areas are *visual aspirations*, not existing geometry.

**Core maps to build in order:** Neon City first, Coastal Highway second, Mountain Pass third, Desert Expressway fourth. Concept-only additional cards — Industrial Zone, Countryside, Snow Valley, Harbor District — remain **future designs**, not promised playable launch content. Hide/lock with honest labels until real, tested world assets exist; do not represent a thumbnail as a built map.

**Map data per approved track:** stable ID, installed content manifest, preview image or small optimized 3D scene, permitted race modes, route/road spline(s), spawn grid, physics collision, checkpoints, lap count support, weather/time presets, memory/download size, platform availability, unlock requirements if applicable. Map surface-area and collectible counts must be calculated from data, not invented for UI.

**User flow:** choose destination -> route (Circuit / Sprint / Free Drive where available) -> time/weather (only supported presets) -> race settings -> commit selection; keep player's selection on return. In multiplayer the room host chooses/locks options or uses honest map voting rules.

**Android adaptation:** show a swipeable map carousel, compact track details, expandable route/weather drawers and a persistent bottom SELECT MAP action. Lazy-load thumbnails/previews and unload 3D maps not in play.

**Implementation gate:** selecting a route changes the actual track that loads into playable physics with correct spawn and checkpoints, and Android never tries to load every large map at once.

## Screen 04 — RACE / FIRST-PERSON COCKPIT POV

**Visual layout:** Real race viewed from the driver's seat, hands/driver model on the wheel only if safely rigged, complete detailed interior, dashboard gauge cluster in foreground, neon rainy city visible through windscreen, center mirror where performance permits. HUD overlay: position/leaderboard upper left, lap/time/progress/challenges upper right, navigation minimap lower left, speed/RPM/gear/nitro near vehicle instruments, power-ups lower right.

**Camera/animation:** position camera by driver-eye anchor in the source car, model steering turns with player input, avoid clipping/dashboard blocking road, subtle physical sway tied to suspension, optional look-left/right. Rear mirror may render a secondary camera at **limited update rate** on strong devices; on Android a simpler low-resolution reflection or disabled mirror may be preferable. Driver hands, shift animations and dashboards must be animated from actual inputs, not prerecorded unrelated loops.

**Touch control addition:** The user specifically requested **HUD touch controls at bottom-left in the cockpit concept**. Put distinct left/right steering buttons **under the minimap**, plus brake and throttle pedals beneath or beside them as the aspect ratio allows; ensure no overlap with steering wheel, relevant road scene, or the nitro/turbo/power controls at lower-right. Keep pause and camera swap visible but compact. On Android, make steering and throttle simultaneous multi-touch work without a stuck-input bug.

**Illustrative HUD data in mockup** such as `243 KM/H`, `3 / 8`, `2/3` and `48%` must come from the real car state and race server, never hard-coded. Hide progress/challenges in Free Drive. Nitro/repair/shield/turbo icons must represent implemented abilities; unimplemented icons should be absent/disabled, not fake functional controls.

**Implementation gate:** cockpit camera and both steering/brake/throttle/nitro work on physical Android while the live speedometer, steering animation and leaderboard accurately follow gameplay.

## Screen 05 — RACE / THIRD-PERSON CHASE POV

**Visual layout:** The camera follows a heavily customized real 3D car from behind at street level. Opponent cars ahead have server-updated racing labels/positions; dramatic city lights reflect on wet road. HUD stays consistent with cockpit view but **moves key telemetry to lower right**: big speedometer with actual KM/H and gear, nitro at lower right, route minimap lower left, lap and goals upper right, ranking upper left. Touchable arrow/pedal controls live where fingers reach on Android.

**Camera:** dynamically follows chassis with configurable distance and height; damp camera motion independently from rigid-body wheel collisions; widen FOV under nitro and smooth recenters after drifting. Prevent walls and bridges from clipping into camera; use ray/sweep collision management and camera occlusion handling.

**Consistency:** camera toggle does **not restart race, reset speed, lose steering inputs or duplicate players**. All cameras show same opponent data and race state. Cars have moving wheels, brake lights, tire smoke, exhaust flame and licensed audio; scale effects according to preset.

**Android adaptation:** physical controls in lower corners, optional auto-accelerate disabled by default unless player enables it, large contextual camera button, uncluttered minimap and speed dial, vibration only with permission/device capability.

**Implementation gate:** cockpit <-> chase switches instantly during a real race on Android, maintaining game state and stable measured frame timing.

## Screen 06 — GARAGE / VISUALS / PERFORMANCE (USER-SUPPLIED 3D MODEL)

**CRITICAL: The user already has a GARAGE 3D MODEL.** The screenshot is for **UI layout, light mood and camera composition only**. The AI **must not invent a new garage, replace the user's walls, change its architectural proportions, add fictional openings, or substitute a screenshot as a 3D garage**. Wait for/locate the user-provided file and texture dependencies; ask for its exact path if not available to the coding agent. Integrate the existing model as the **authoritative garage scene**.

**Visual layout:** Main focus is the player's real car **inside the existing model**, on an actual platform/floor area as permitted by geometry. Left navigation lists Visuals, Performance, Paint, Wheels, Body Kit, Spoiler, Decals, Lighting, Tune, Test Drive. On right, show paint finish/swatch selector, wheel previews, body-part choices and performance comparison. Bottom strip displays car identity and live speed/acceleration/handling/braking/nitro stats with Apply, Reset, Test Drive controls. Use REDLINE's neon red and black styling without hiding the car behind giant panels.

**Required model-integration workflow:**
1. List/inventory provided garage FBX/BLEND/GLB/GLTF, object names, texture directories and license; **do not assume the model has been uploaded** merely because the user says they own it.
2. Open the supplied scene in Blender and record world-scale, origin, walls, floor elevation, room bounds, light points, exit/door possibilities **from actual mesh inspection**. Do not invent dimensions.
3. Verify rights to use/bundle the specific garage asset. Convert/repair to a **GLB** for runtime while preserving architecture and visual identity. Fix textures, normal maps and material references.
4. Build the car spawn/showcase location inside a physically clear part of the room; keep car aligned to actual floor. If a rotating platform doesn't exist, **orbit the camera around the stationary car**, or ask before changing the environment. Do not add permanent structural geometry without permission.
5. Keep environment lighting close to reference mood using **light rigs and postprocessing**, without changing geometry; separate desktop vs Android light/texture settings.
6. Integrate a selected real 3D car model, verify body/wheel mesh hierarchy, replace only parts that are compatible, and show instant visual previews. Persist the saved configuration and restore it on reload/sign-in.
7. Enter Test Drive by loading an actual racetrack with the customized car's saved physics, not by driving through a sealed garage wall or teleporting into an invented outdoor parking lot.
8. Profile draw calls, triangles, shader cost, texture memory, light/shadow cost and orbit performance on Android. Create LOD/mobile textures derived from the same licensed scene if needed.

**Menu logic:** Paint updates material channels without repainting glass/tires; wheels need consistent axes/radius/collider config; body kits must fit the base car; stats must be calculated from upgrade values; Reset reverts to last saved configuration with confirmation if unsaved changes; Apply saves valid build; Test Drive uses that build.

**Android adaptation:** preserve a large center car preview; let left navigation collapse to icon+label rail or a bottom tab bar, move right settings into swipeable sheets, use touch orbit/pinch zoom, avoid text too small to read. Display heavy garage effects in High graphics only.

**Implementation gate:** the real **provided garage model** renders on PC and Android; user can rotate view, repaint, install at least one licensed/compatible wheel or body option, save, return and test drive with the changed car. If no modular model exists yet, show only actually supported options and report missing parts.

## Navigation / state / input contract (all screens)

| From | Action | Destination | State to carry |
|---|---|---|---|
| Home | PLAY | Map / race setup | selected car, current profile |
| Home | GARAGE or CUSTOMIZE | Garage | selected car, current build |
| Home | MULTIPLAYER | Multiplayer setup | profile, car build, network status |
| Maps | SELECT MAP | race setup / race lobby | map ID, route, weather, mode |
| Multiplayer | join/create code | room lobby | validated code and server room ID |
| Multiplayer room | START RACE | synchronized race | car build, map config, server start timestamp |
| Any race | Camera | same race / alternate camera | **same race simulation state** |
| Garage | APPLY | garage with saved build | valid build persisted |
| Garage | TEST DRIVE | single-player practice | saved/preview approved build |
| Race result | REMATCH / HOME | same race / home | server result, car and preferences |

**Do not implement UX as unrelated disconnected pages.** Route transitions must be real, pause/resume must preserve physics state, Android Back must not abruptly kill race without confirmation, and async asset loading must show actual progress/error/retry.

## Responsive HUD acceptance criteria

- Landscape Android 16:9 through tall ~20:9 screen ratios; include notches/cutouts and navigation gesture insets.
- Use pointer events with capture and per-touch mapping, not mouse-only logic; handle simultaneous steer+accelerate+nitro, release on `pointercancel`, focus loss, game pause and device rotation.
- Steering buttons may be continuous (hold), accelerator/brake analog via touch pressure/drag only if robust; otherwise stable digital throttle/steer is preferable to unreliable pseudo-analog.
- Touch target aim **at least roughly 48 physical-equivalent CSS px** (responsive scaling); configurable button placement/opacity and left-handed preference.
- Controls should sit above the bottom safe-area inset, not behind Android gesture handles.
- Maintain safe typography/contrast over neon scenery (scrims or outlines), with a compact mode for weak phones and reduced HUD clutter.
- Controller/keyboard and touch may coexist, but no stale input states after switching devices.
- FPS and memory comparisons must include HUD on/off and native Android WebView build vs mobile Chrome.

---

# PART B — TECHNICAL DECISIONS AND ANDROID STRATEGY

## 3. Single codebase, three delivery formats

**Recommended practical stack:**

| Layer | Recommended choice | Why |
|---|---|---|
| Language | **TypeScript** | Maintainable shared game logic and type-safe protocols |
| Project build | **Vite** | Fast game iteration and production bundling |
| 3D renderer | **Three.js WebGLRenderer** | Browser-based 3D using broad WebGL 2 support |
| Asset format | **glTF 2.0 / GLB**, PBR materials | Efficient standardized asset pipeline |
| Physics | **Rapier 3D JavaScript/WASM**, ray-cast vehicle controller | Vehicle suspension, grip, rigid bodies and collision |
| UI | HTML/CSS or small React UI layer over a Three.js canvas | Fast menus/HUD without re-rendering the 3D scene through UI state |
| Multiplayer | **Node.js + TypeScript + Colyseus** | Real rooms, match coordination, state sync, reconnects |
| Data | **PostgreSQL** with an ORM; Redis later if scale requires it | Persistent accounts, garages and race results |
| Authentication | Established auth library/service with secure server-side sessions or tokens | Avoid homegrown password handling |
| Hosting | HTTPS site/CDN + WSS-enabled multiplayer API | Browser and Android crossplay |
| Android app | **Capacitor + Android Studio** | Installs the shared web game in an Android app shell and packages APK/AAB |
| Design tooling | **Blender**, glTF optimization tools, image/texture compression | Prepare real assets for phones |
| Testing | Vitest, Playwright for menus, multiplayer integration tests, physical-device FPS checks | Verifiable quality |

**Important tradeoff:** Capacitor uses an Android WebView for this game. It does **not** magically provide native Unreal/Unity performance. Real performance must be measured in Chrome *and* the installed Android app. If the target phone cannot maintain acceptable framerates after optimizing, consider a dedicated native game-engine version as a separately budgeted migration—not an undocumented change of stack.

### Required Android deliverables
1. Responsive Android browser version, usable without a keyboard.
2. Installable **debug APK** during development.
3. Signed **release APK** for direct distribution and **AAB** for eventual Play Store submission.
4. App icon, splash screen, landscape orientation, safe-area handling and system Back behavior.
5. On-screen steering (left/right or configurable virtual wheel), throttle, brake/reverse, handbrake, nitro, camera swap and pause.
6. Configurable touch-button size, position, opacity, and sensitivity; optional tilt steering and controller support.
7. Adaptive mobile graphics settings; motion blur, heavy bloom and reflections should be disabled or reduced by default on weaker phones.
8. Background/resume recovery, handling of incoming calls and loss of audio focus, thermal throttling and low-memory behavior.
9. Secure WSS networking, permission minimization, and explicit error messages when offline.
10. Crossplay: Android app vs Android browser vs desktop browser using the **same server and room code**.

**Offline rule:** Practice/Time Attack can work offline after assets are available. Accounts, online races and leaderboards require connectivity. Do not pretend online functionality works offline.

### Example development path for Android packaging

Once the web client is functional and built:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

Configure the actual Vite output directory as Capacitor's `webDir` (usually `dist`), then use Android Studio/Gradle for APK and AAB builds. Validate the installed application on real hardware. The commands above are a starting point, **not evidence that the Android game is already tested**.

### Performance targets (targets, not guarantees)
- Desktop: target **60 FPS** on a reasonable supported gaming PC.
- Mid-range Android: target **30 FPS minimum during racing**, seeking 60 FPS where feasible.
- Graphics presets: **Low / Balanced / High / Ultra (if capable)**, with automatic first-run selection.
- Dynamic pixel ratio scaling, constrained postprocessing, clustered/limited lights, shadows scaled by preset.
- Compressed meshes/textures (Meshopt/Draco where appropriate, **KTX2** for textures), instancing, LOD, frustum culling, batched draw calls, map chunk streaming and asset reuse.
- Limit peak GPU memory, loading time and bundle size with **measured budgets** from device testing. Record GPU time, draw calls, triangles, memory, load times and frame-time percentiles before claiming optimization.
- Prefer shipped low-resolution assets for basic play, with optional higher-quality asset packs on suitable devices and networks.
- Do not promise every phone can match a premium PC render.

---

# PART C — ASSET-FIRST IMPLEMENTATION

## 4. Real 3D asset procurement and conversion

**Critical rule:** The AI must not draw a car out of primitive blocks and call it a finished vehicle. Before building the driving slice, obtain **one legal, high-quality car asset**, **one road/environment kit**, and audio/effects resources that can be included in the project.

**Potential research sources** (verify the license for **each asset**): Sketchfab downloadable models, Poly Haven for HDRIs/textures/environment materials, Blender community assets, and other legitimate asset marketplaces. Never assume that every free-to-view model is free to redistribute, modify or bundle in a game. Do not scrape paid content, bypass paywalls or ship unlicensed brand marks.

### Mandatory asset manifest
Maintain `docs/ASSET_LICENSES.md` with:

| Field | Record |
|---|---|
| File/path | Relative path of shipped asset |
| Asset title / author | Exact public creator attribution |
| Source | Original download/product URL |
| License | License type and link to exact terms |
| Redistribution | Whether bundling in a game is permitted |
| Attribution | Mandatory credit text where applicable |
| Edits | Blender changes, texture changes, mesh split |
| Technical | GLB size, texture resolution, LOD variants |

If any asset cannot be verified for use, reject it and find an alternative.

### Car acceptance checklist
A candidate car is only approved when it has:
- Convincing proportions, working PBR materials and realistic windshield/window treatment.
- Separated and pivot-correct wheels that can rotate and steer.
- Adequate body meshes for headlights, brake lights and effects attachment.
- Usable cockpit/interior **for cockpit POV**, or a documented separate legal interior solution.
- Acceptable poly count, texture sizes, LOD options and Android measured performance.
- Coordinate system, scale, wheel radius, collision proxy and bounding box checked in Blender.
- Proper license and source recorded in the manifest.

### Environment checklist
- Source or model connected road meshes with correct tangents, width, height, curb edges and drivable collision surfaces.
- Build a **closed test route with working checkpoints** before creating a giant open world.
- Use detailed building facades, signs, lamp posts, barriers, trees, tunnels and traffic props with LODs and collision only where needed.
- Provide road markings, junctions, minimap path data, starting grid, respawn locations and sensible shortcuts/obstacle blockers.
- Do not confuse real geospatial map data with prebuilt realistic 3D art: street topology alone will not provide buildings, lighting, road materials or game collisions.

### Asset ingestion pipeline
`download legally -> verify license -> inspect in Blender -> repair pivots/scale -> split modular meshes -> build collision proxy -> LODs -> bake/material optimize -> glTF/GLB -> compression -> test on PC & Android -> add to manifest`

## 4A. Integrating the user's OWN downloaded assets (new)

**Do not go shopping for duplicates before inspecting the files already downloaded by the user.** The user has said they are downloading map packs, car models, nitro/VFX and already has a garage model. At drafting time, their raw asset files **have not been examined as part of this document**; all compatibility/license claims must be verified after the files are supplied.

### First message/command for the implementation agent

1. Inventory the actual provided directory/ZIP files, without modifying originals. Generate a machine-readable manifest: filename, type, byte size, Blender import success, textures/animations, mesh count, triangles, available LODs, physical dimensions, wheels/interior, source URL and license status.
2. Classify each item: `car-playable`, `car-traffic`, `garage-existing`, `map-road`, `environment-prop`, `nitro-vfx`, `audio`, `driver-avatar`, `unverified`.
3. Flag missing dependency files, notably external textures/rigs, and ask for them by name. An `.fbx` alone may not contain its texture images.
4. Rank suitability for PC vs Android, budget heavy textures, and test one converted GLB in browser and Android WebView **before bulk conversion**.
5. **Preserve original garage source** and user files; convert copies only. Store original assets in a separate source archive (if permitted) and optimize runtime packages.
6. For a supplied `.blend` or `.fbx`, use Blender batch export when possible, review winding/tangents, pivots and shader conversions in runtime, and only claim success after seeing correct texture renders.
7. The user chooses what downloaded assets belong in the build; do not replace an asset with an unrelated AI-generated placeholder when parsing fails.

### Android budgets (initial tuning ranges; measure and revise)

| Item | Initial engineering guidance | Verify by |
|---|---|---|
| Hero race car | Keep visually detailed with optimized textures, LODs and separated wheels | Real phone FPS, GPU time and visual inspection |
| Opponent/traffic | Lower poly/material variants, simplified interiors, instance where possible | 8-car race performance |
| Garage | Preserve the user's room model, produce mobile KTX2 textures and lightmap/baked-light variants where feasible | Garage orbit and memory test |
| City | Stream road/city chunks; optimize distant skyline and dynamic lights | Sustained races and thermal test |
| Nitro VFX | Small/pooled GPU-friendly particles, rate-limited emission, scalable intensity | Effects on/off frame-time delta |
| Map previews | Small stills or cached renders, do not load complete map into each card | Fast switching on phone |

Avoid hard-coded universal per-model polygon limits: a target useful on one GPU may be inappropriate on another. Log evidence and preserve optional high-quality desktop assets without forcing their download on Android.

### Suggested local asset directories

```text
asset-source/user-provided/garage/          # Preserve source copies and licenses
asset-source/user-provided/cars/
asset-source/user-provided/maps/
asset-source/user-provided/nitro-vfx/
asset-source/user-provided/audio/
apps/client/public/assets/vehicles/         # Optimized game-ready GLBs
apps/client/public/assets/environments/
apps/client/public/assets/garage/
apps/client/public/assets/effects/
apps/client/public/assets/audio/
apps/client/public/assets/maps/
references/ui/                               # Six original UI design references
```

Do not commit massive originals or restricted-redistribution assets to a public Git repo. Use Git LFS or an appropriately secured asset store, with legal redistribution checks and reproducible import scripts where needed.

---

# PART D — MULTIPLAYER AND DATA DESIGN

## 5. Real multiplayer, not synchronized screenshots

### Starting multiplayer scope
- One authoritative race room hosting **up to 8 human racers initially**; expand toward 12 only after latency and server-load testing.
- Player-chosen short room code, collision-safe and unique among active rooms.
- Public/private toggle, join by code, lobby ready state, car preview, track vote, host controls and a synchronized countdown.
- Cross-platform sessions involving at least one Android device and one PC.

### Server authority and networking
- The **server** owns the race state, player identity, start time, checkpoints, laps, finish order, nitro energy, pickups and final results.
- Clients send **driver inputs** (steer, throttle, brake, handbrake, nitro, gear), not untrusted claims such as `I finished first` or `my speed is 900 km/h`.
- Simulate/tune authoritative vehicle motion at a fixed timestep; publish appropriately throttled state snapshots. Client-side input prediction and reconciliation require careful correction because vehicle physics may not reproduce identically across devices.
- Interpolate remote player positions and rotations, use bounded correction for local prediction, and test under delay, packet loss and reconnection.
- Validate room codes, input limits, impossible speed/teleports, checkpoint sequence and cooldowns; rate-limit traffic.
- Require TLS for login/API and **WSS** for public multiplayer. Do not embed database secrets or privileged credentials in the Android app.

### Persistent server records
- `users`: id, display name, account status, created timestamp.
- `cars`: approved car catalog, upgrades, base physics/statistics.
- `owned_cars`: player ownership and save slots.
- `car_builds`: cosmetics, fitted parts, tuning, versioned presets.
- `race_results`: room, mode, track, participants, validated results, timestamps.
- `leaderboards`: verified seasonal/best-time records.
- `economy_ledger`: auditable virtual rewards/purchases, never trusting client-submitted totals.

Start without unnecessary personal data. Include account deletion, export/delete policy, access control, backups and no chat/voice recording unless later deliberately specified.

### Hosting
For local development, run web client and Colyseus backend on the PC. To race across the internet, deploy behind a secure public HTTPS/WSS endpoint or a carefully configured domain/tunnel, with server uptime and access controls. Do not treat `localhost` as reachable by someone else's Android phone over the internet.

---

# PART E — THE AI'S EXACT BUILD ORDER

## 6. Development phases and gates

The AI should implement **one phase at a time**, run the checks below and report the exact files changed, screenshots/recordings or tests, limitations, and the next phase. A phase is complete only when it passes its *exit gate*.

### PHASE 0 — Repository, feasibility and asset proof
**Actions**
1. Create TypeScript monorepo with `apps/client`, `apps/server`, `apps/android` (the Capacitor Android project may live under the client instead), `packages/shared`, `assets`, `docs`, and `tests`.
2. Choose and validate the versions of Three.js, Rapier, Colyseus, Vite, Capacitor and Android build dependencies against current official docs.
3. Select one realistic legal car GLB with an interior and separated wheels, one city-road kit, one HDRI, and basic car audio. Create the license manifest.
4. Set up camera, asset loader and 3D preview that renders on PC web **and a real Android phone**.
5. Inventory the user-downloaded cars/maps/nitro and **existing garage model**; report which files are still missing and do not substitute fictional assets.
6. Set up Git, linting, formatting, type-checking, smoke tests and a reproducible README.

**Deliverable:** Running web scene and Android debug install showing the **real textured car**.  
**Gate:** No fake placeholder cars; asset attribution recorded; Android rendering works and FPS is measured.

### PHASE 1 — Single-car driving vertical slice
**Actions**
1. Load the car with correctly oriented wheels and chassis collider.
2. Implement Rapier ray-cast car controller, acceleration, steering, tire grip, suspension, braking, drifting and handbrake.
3. Create a finished short neon-city circuit with collidable road, barriers, corners, tunnels/landmarks and clear start/finish lines.
4. Add cockpit/chase/hood/bumper camera modes and speed-dependent camera effects.
5. Add working digital speedometer (KM/H), RPM, gear, reset car, pause, quality settings and basic audio.
6. Add keyboard and mobile touch controls, **including bottom-left steering arrows and brake/throttle pedals from the cockpit mockup**, landscape safe areas, pointer cancellation and button input retention under multitouch.
7. Match the functional cockpit and chase HUD from Part A.2 without hard-coded fake telemetry.

**Deliverable:** One complete playable drive on web + Android APK.  
**Gate:** Car accelerates, turns, brakes, drifts, collides, resets and completes laps; camera switching and all Android driving controls work; minimum mobile target verified on a physical device.

### PHASE 2 — Nitro, race rules and polish
**Actions**
1. Add nitro energy with server-compatible state model, acceleration effect, UI bar and flame/VFX/audio feedback.
2. Implement drift, near-miss and slipstream charge logic; add cooldowns and maximum energy limits.
3. Build lap/checkpoint validation, countdown, wrong-way detection, race timer, finish result and restart.
4. Add race start/end camera sequences, improved materials/lighting, collision particles and audio layering.
5. Build automated tests for lap rules, energy accounting, reset positions and upgrade math.

**Deliverable:** Complete local Sprint/Circuit/Time Attack loop.  
**Gate:** Start -> race -> finish -> result -> restart works repeatedly; speed boost genuinely changes velocity and cannot produce uncontrolled physics.

### PHASE 3 — Premium interface and interactive garage
**Actions**
1. Translate `01-home.png` and `03-maps.png` into functional home and map-selection screens (never flat screenshot overlays).
2. Import the **user-provided existing 3D garage model** and use `06-garage.png` only as UI/lighting reference. Build drag-to-orbit and pinch/scroll zoom, categorized upgrades and immediate visual preview **without inventing new garage architecture**.
3. Integrate paint, tint, supported wheel kits, lighting, body mods and decals from asset-compatible meshes.
4. Connect performance upgrades to handling/acceleration/braking physics and live stat comparisons.
5. Implement local guest profile and save schema; ensure presets can migrate to accounts later.

**Deliverable:** Functional premium garage and unified menu flow.  
**Gate:** Car customization persists after reload, affects real gameplay, and can be used entirely on a phone without clipping or tiny buttons.

### PHASE 4 — Genuine online multiplayer
**Actions**
1. Start Colyseus room server with unique player-chosen codes and robust duplicate/race handling.
2. Implement room creation, room join, lobby ready status, car selection, track voting and race countdown matching `02-multiplayer.png`, with player-chosen codes and **only genuinely connected players**.
3. Add server validation of driving inputs, position snapshots, race checkpoints, nitro and finishing order.
4. Interpolate opponent cars and reconcile local car gracefully; prevent obvious movement hacks.
5. Handle reconnect, disconnect, room host departure, inactive rooms and room cleanup.
6. Test a two-device race: **Android phone + separate desktop client**; expand toward 8 participants after stability.

**Deliverable:** Human-vs-human racing on a real shared server.  
**Gate:** Both players can see each other drive, race correctly, finish, and receive the same validated positions; high latency doesn't permanently break the room.

### PHASE 5 — Accounts, progression and backend hardening
**Actions**
1. Implement secure sign-in, guest upgrade path, persistent PostgreSQL models, garages, builds, race history and rewards.
2. Make server validate earned currency, unlocks, tuning limits and leaderboard submissions.
3. Add profile and multiplayer statistics; sensible moderation/reporting tools for user-chosen room codes/usernames.
4. Implement database migrations, secrets management, rate limits, logs, backups and account deletion.
5. Verify that an Android user can sign in, customize a car, log out, reinstall (with correct account), and recover their garage.

**Deliverable:** Persistent, secure player progression.  
**Gate:** Server-side saves and race results survive restart; unauthorized clients cannot edit other users' cars or rewards.

### PHASE 6 — Additional maps, modes and richer world
**Actions**
1. Add the Coast, Mountain and Desert maps with the same road/collision/checkpoint/LOD standards as Neon City.
2. Add Free Roam with sensible spawn/reset logic and streamable map regions.
3. Add AI traffic where performance allows and safe player/non-player collision behavior.
4. Add optional rain/fog/day-night profiles with traction changes and graphics scaling.
5. Add Drift Challenge, Drag Racing and optional police pursuit only after core races are stable.

**Deliverable:** Multiple distinct, functioning maps/modes.  
**Gate:** Each map has a complete driveable route, AI/traffic does not block racing unexpectedly, and phones remain playable.

### PHASE 7 — Android release and cross-platform QA
**Actions**
1. Package release APK and Play Store-ready AAB; assign unique application ID and version codes.
2. Configure landscape, immersive full-screen, icon, splash, lifecycle/pause/resume and Android Back.
3. Tune device-class presets, dynamic quality and touch control mapping; handle graphics context loss and reconnection.
4. Test on at least one lower-powered, one mid-range and one higher-powered Android device, plus PC browsers.
5. Profile thermal throttling over sustained play, network switching, offline starts, asset loading, update/reinstall behavior, and memory consumption.
6. Produce installation steps, release notes and reproducible build instructions. Verify current Play policy/SDK requirements at release time.

**Deliverable:** Reproducible Android APK/AAB and browser release candidates.  
**Gate:** App launches and completes races on each supported test device; Android/desktop crossplay passes; no critical crashes, inaccessible buttons or missing assets.

### PHASE 8 — Final polish and release readiness
**Actions**
1. Fix critical gameplay, camera, shader and multiplayer bugs and reduce loading time.
2. Improve animation timing, audio mixing, accessibility, UI readability, recovery from failures and tutorials.
3. Audit assets/licenses/attribution, user data handling and exposed endpoints.
4. Create gameplay footage, screenshots, clean configuration examples and known-limitations document.
5. Freeze feature scope and verify regression suite before release.

**Deliverable:** Finished release build with honest release notes and evidence of testing.  
**Gate:** Complete smoke test passes and no P0/P1 known defects; remaining compromises documented.

## 6A. Screen implementation sequence aligned with the game phases (new)

The six screens must become one coherent UI system in this order:

1. **Phase 0:** collect and validate downloaded cars/maps/nitro and the user's garage; establish `references/ui/` and implementation acceptance snapshots; mobile shell must render a 3D car.
2. **Phase 1:** functional `race-cockpit` and `race-chase` screens with actual HUD values; implement lower-left steering and brake/throttle pedals and bottom-right nitro/camera/pause touch targets. Add camera switching and simple Home -> Play flow.
3. **Phase 2:** wire nitro VFX and real physics; race position/laps/timer/minimap objective panels only when the data exists. Implement race results and restart without faking scores.
4. **Phase 3:** implement full premium `home`, `maps` and `garage`; use the existing supplied 3D garage; persist car paint and one approved compatible part. Do not show future nonfunctioning actions as implemented.
5. **Phase 4:** implement actual `multiplayer` rooms, player-picked room codes, synchronization, real connected player 3D cars and host/ready/race flow.
6. **Phases 5–6:** integrate profile data, rewards and extra maps/modes only when backend/data/world content exists.
7. **Phases 7–8:** tune each screen for APK/WebView, gamepad, portrait-rotation recovery (landscape preferred), accessibility, mobile graphics and thermal behavior; compare visual references, perform full input/navigation QA.

**Screen sign-off:** capture actual screenshots from running code in desktop and physical Android at matching camera positions when possible, compare against design references, and report non-shippable pieces honestly. Screenshots of concept art are never accepted as proof of implementation.

## 7. First playable build — exact minimal scope

**Do not build all three maps first.** The AI must first prove that the technology, assets and Android target work by shipping:
- One licensed premium car with cockpit and separated wheels.
- One polished connected Neon City circuit with proper collision.
- Rapier driving: throttle, braking, steering, drift/handbrake and vehicle reset.
- Chase and cockpit camera at minimum; hood and bumper immediately afterward.
- Touch controls and desktop controls, working nitro, speedometer, RPM/gear and lap counter.
- Vite web build and Android APK, both verified on actual devices.
- A brief report with screenshots, measured FPS and asset licenses.

Only then expand to garage and multiplayer. This ordering minimizes the risk of delivering a huge but visually empty, non-playable project.

---

# PART F — FILES, ENGINEERING RULES AND QA

## 8. Suggested repository layout

```text
redline/
├── apps/
│   ├── client/                     # TypeScript + Vite + Three.js
│   │   ├── src/
│   │   │   ├── engine/             # Render loop, scene, loading, shaders
│   │   │   ├── vehicles/           # Controllers, physics, stats, upgrades
│   │   │   ├── cameras/            # POV/chase/hood/bumper
│   │   │   ├── tracks/             # Road paths, checkpoints, map loading
│   │   │   ├── effects/            # Nitro, sparks, tire smoke
│   │   │   ├── audio/
│   │   │   ├── input/              # Keyboard/gamepad/touch
│   │   │   ├── multiplayer/
│   │   │   ├── garage/
│   │   │   ├── ui/
│   │   │   ├── screens/
│   │   │   └── main.ts
│   │   └── public/assets/
│   └── server/                     # Colyseus + auth + game validation
│       └── src/
│           ├── rooms/
│           ├── simulation/
│           ├── services/
│           ├── database/
│           └── index.ts
├── android/                        # Capacitor Android wrapper/project
├── packages/
│   └── shared/                     # Network messages, car/race schemas
├── asset-source/                   # Source artwork (if redistribution allowed)
├── references/ui/                  # Concept art (visual reference ONLY)
├── docs/
│   ├── ASSET_LICENSES.md
│   ├── ARCHITECTURE.md
│   ├── ANDROID_BUILD.md
│   ├── GAME_DESIGN.md
│   ├── TEST_REPORT.md
│   └── RELEASE_CHECKLIST.md
├── tests/
│   ├── physics/
│   ├── multiplayer/
│   └── ui/
├── .env.example
├── package.json
└── README.md
```

The actual layout may differ if a framework needs it; keep responsibility boundaries clear. Never put everything inside one giant `main.js` file.

## 9. Test matrix

| Test | Desktop web | Android Chrome | Installed Android APK |
|---|:---:|:---:|:---:|
| Loads real 3D car and complete track | ✓ | ✓ | ✓ |
| Drives, brakes, drifts and collides | ✓ | ✓ | ✓ |
| Cockpit POV and camera switch | ✓ | ✓ | ✓ |
| Nitro visibly and physically works | ✓ | ✓ | ✓ |
| Race checkpoints, laps and results | ✓ | ✓ | ✓ |
| Garage customization persists | ✓ | ✓ | ✓ |
| Multiplayer room code and crossplay | ✓ | ✓ | ✓ |
| Graphics presets and playable FPS | ✓ | ✓ | ✓ |
| Lost connection and recovery | ✓ | ✓ | ✓ |
| Device lifecycle and orientation | N/A | ✓ | ✓ |

Test unusual aspect ratios, multi-touch, weak networks, controller disconnects, game alt-tab/resume, Android screen off/on, audio interruption, memory pressure and battery/heat.


### Additional visual + Android test cases (new)

- Home Play -> Maps -> Race -> Result -> Home end-to-end; selected car and track state persist.
- Multiplayer Create/Join with an explicitly **player-chosen** code, code conflict errors, real player list, ready sync and host control.
- Map card thumbnails do not claim unbuilt tracks are playable; selecting installed track changes real geometry and checkpoints.
- Cockpit: working dashboard, correct steering animation, no windshield camera clipping, actual mirror budget, actual live HUD.
- Android cockpit: hold **steer + accelerator + nitro** with three simultaneous fingers; stop one input and verify remaining active inputs persist.
- Android chase: hold steer/brake and switch POV, keep same velocity/player/lap; safe-area-aware HUD and camera button.
- Garage: user-owned environment loads with original room proportions preserved; compare geometry before/after export; orbit, preview, save and test drive work.
- Persistence: customized paint/wheels/stats save, load after relaunch, and synchronize between desktop/Android when account-backed.
- Settings: Low/Balanced/High graphics presets materially affect GPU work and can be switched without forcing unrelated scene reloads.
- Every preview reference belongs to `references/ui/`, not the runtime game asset cache; UI must remain operational with references removed.

## 10. Definition of done for every feature

A feature is not done until:
1. The actual code is committed to the expected repository branch.
2. All necessary non-code assets are included or downloaded via documented legal steps.
3. The feature is reachable in the game and not merely a screenshot or animated menu.
4. Its state/physics/network behavior is correct, rather than simulated visually.
5. It works on a desktop browser and is verified on an Android phone (or an explicit Android blocker is documented).
6. Automated tests pass where practical and manual reproduction steps are included.
7. The AI reports *what is complete, what is still missing and how it was tested*, without vague claims.

## 11. Risks and mitigation

| Risk | Mitigation |
|---|---|
| Licensed realistic car is not cockpit-ready | Require interior + wheel rig before accepting asset; source another car if needed |
| Android WebView bottlenecks | Physical-device testing in Phase 0; adaptive rendering, mobile asset packs; reserve possibility of native-engine port |
| Open world overwhelms download/memory | Ship one polished track first; separate map bundles, LODs, scene streaming |
| Multiplayer desynchronizes | Server-authoritative validation, fixed simulation, bounded prediction/interpolation and network tests |
| Complex cosmetics don't fit asset | Source modular car kits; define compatible upgrades per vehicle |
| Assets create copyright problems | Maintain license manifest; reject unauthorized assets and brands |
| AI generates superficial progress | Phase exit gates, proof-of-play videos, tests and file-level change reports |
| Home server isn't reachable externally | Use secure public DNS/WSS endpoint or verified tunnel; test off-LAN |

---

# PART G — COPY/PASTE MASTER PROMPT FOR THE CODING AI

> Paste the entire instruction block below into a coding agent that has access to the project, terminal, asset folders, Android build tools and (when authorized) the Git repository. **Give it this whole `.md` file as the authoritative specification.**

```text
You are the technical director, game designer, 3D pipeline engineer, frontend engineer,
Android engineer, network engineer and QA lead for REDLINE, a premium original 3D
street-racing game.

READ THE ATTACHED REDLINE_AI_GAME_MASTER_PLAN_UPDATED.md IN FULL. Treat EVERY PART
(including PART A.2 screen design, PART C user assets, PART E milestones and PART F QA)
as authoritative implementation requirements.

YOUR TASK:
Implement REDLINE as a genuinely playable game for desktop browsers, Android browsers,
and an installable Android APK/AAB from one maintainable TypeScript game codebase.
Use Three.js, Rapier 3D, Vite, Colyseus, a secure persistent backend and Capacitor,
unless a technically necessary deviation is clearly explained and documented.

THE GAME MUST INCLUDE:
- Premium, properly licensed realistic 3D cars with detailed interiors and moving wheels.
- First-person cockpit POV, chase, hood and bumper cameras.
- Dense, beautiful, connected 3D streets and maps, starting with a real Neon City circuit.
- Satisfying steering, acceleration, braking, drifting, suspension and collisions.
- Working nitro, boost recharge, optional overdrive/slipstream/perfect shifts.
- A cinematic full-screen racing-game UI, speedometer, RPM, gears, checkpoints and laps.
- A live 3D garage using the USER-SUPPLIED garage model (do not invent/replace
  the garage architecture), with visual changes and meaningful performance upgrades.
- Genuine cross-platform online multiplayer, player-chosen room codes, lobbies,
  synchronized starts, server-validated driving/race rules and real results.
- Accounts, saved vehicles and later additional maps and game modes.
- Six specific screen designs: Home, Multiplayer, Maps, Cockpit Race, Chase Race,
  Garage. Recreate as functional UI plus 3D; concepts are not game screenshots.
- Android cockpit HUD with steering buttons and brake/throttle pedals at bottom-left,
  nitro/camera/pause at appropriate finger-friendly safe-area positions.
- ANDROID-FIRST UX: touch controls, landscape full screen, adjustable graphics,
  real device performance testing, debug APK and signed release APK/AAB.

MANDATORY WORKFLOW:
1. Read repository/files and identify current state before editing anything.
2. Follow Phase 0, then Phase 1, then each later phase in the plan, sequentially.
3. FIRST inventory the user-downloaded cars, maps, nitro, textures and garage
   model; verify what is physically present and CHECK EACH LICENSE.
4. Never use primitive/car-shaped blocks or flat empty worlds as final assets.
   NEVER invent a replacement garage when the user has supplied a 3D one.
5. Build one outstanding playable race before adding many maps or empty menus.
6. Run TypeScript checks/tests, build web client and test Android at each milestone.
7. Keep modules separated, comments purposeful and project setup reproducible.
8. Write actual runnable code and include all required file changes; no pseudocode.
9. Verify multiplayer using at least two real clients, including Android vs desktop.
10. Do not simulate servers, opponents, online races, accounts or purchases.
11. Match supplied `references/ui/` pictures as direction while implementing
    functional screen navigation, actual 3D models and real telemetry; no fake UIs.
12. Produce truthful progress reports with changed files, test commands/results,
    physical-device results, screenshots/recordings and known blockers.
13. Do not expose secrets, violate licensing terms or publish anything without approval.

START NOW WITH PHASE 0: inspect all user-supplied asset folders, including their
existing garage, cars, maps and nitro; list missing files, verify licensing; establish
the monorepo and choose compatible libraries; convert and preview a legal cockpit-ready
car and road kit on desktop and a physical Android debug app. Then execute Phase 1 to build the first genuinely playable
high-quality race. Do not skip exit gates or prematurely claim the whole game done.

THE SUCCESS CRITERION IS A REAL RACING GAME — NOT A RACING-THEMED WEBSITE.
```

---

# PART H — REFERENCE DOCUMENTATION

Consult the current official documentation when implementing; versions and Android toolchain requirements change.

- [Three.js WebGL Renderer](https://threejs.org/docs/pages/WebGLRenderer)
- [Three.js glTF loader](https://threejs.org/docs/pages/GLTFLoader)
- [Three.js KTX2 compressed textures](https://threejs.org/docs/pages/KTX2Loader.html)
- [Rapier JavaScript vehicle controller](https://rapier.rs/docs/user_guides/javascript/vehicle_controller/)
- [Colyseus authoritative multiplayer](https://docs.colyseus.io/)
- [Colyseus room state synchronization](https://docs.colyseus.io/state)
- [Capacitor installation and platform workflow](https://capacitorjs.com/docs/getting-started)
- [Capacitor Android tooling requirements](https://capacitorjs.com/docs/getting-started/environment-setup)
- [Android developer documentation](https://developer.android.com/)

**Important:** This is a game specification and AI work order, not proof that code, playable maps, imported 3D assets, multiplayer, APK/AAB or UI already exist. The six artwork files are high-level concept references. The user's actual downloaded assets must be checked separately and their garage model must be preserved.
