import { CARS, MAPS } from '../assets/catalog.js';
export function createUI(){
 document.querySelector('#app').innerHTML=`
  <div id="game-shell">
   <div id="world" aria-label="Racing world"></div>
   <div class="overlay-vignette"></div>
   <header class="topbar">
    <button class="brand" data-nav="home" aria-label="REDLINE home"><span class="brand-main"><i>RED</i>LINE</span><small>STREET RACING</small></button>
    <nav class="nav" aria-label="Main menu">
     <button data-nav="home" class="selected">⌂ <span>HOME</span></button>
     <button data-nav="garage">◈ <span>GARAGE</span></button>
     <button data-nav="maps">◇ <span>MAPS</span></button>
     <button data-nav="multiplayer">♟ <span>MULTIPLAYER</span></button>
    </nav>
    <div class="profile"><span class="profile-hex">◉</span><div><strong id="profile-name">RACER</strong><small>DRIVER PROFILE</small></div><button id="audio-toggle" class="small-icon" aria-label="Toggle sound">♫</button></div>
   </header>
   <main class="ui-layer">
    <section id="page-home" class="screen home-screen" aria-label="Home">
     <div class="home-left"><div class="eyebrow">THE ROAD IS YOURS</div>
      <h1>OWN THE<br/><em>STREETS.</em></h1>
      <p>Pick your car. Find your line. Own the next lap.</p>
      <button id="quick-drive" class="action-main">▶ &nbsp; START DRIVING <span>↗</span></button>
      <button data-nav="multiplayer" class="action-secondary">◎ &nbsp; RACE WITH FRIENDS <span>→</span></button>
      <div class="home-stats"><div><b>${String(CARS.length).padStart(2,'0')}</b><small>CARS</small></div><div><b>${String(MAPS.length).padStart(2,'0')}</b><small>ROADS</small></div><div><b>04</b><small>CAMERA VIEWS</small></div></div>
       <div class="home-bottom">WASD TO DRIVE <span class="pipe">|</span> C CAMERA <span class="pipe">|</span> SHIFT NITRO</div>
     </div>
     <div class="right-caption"><span class="eyebrow">YOUR CAR</span><strong id="home-car-name">F40 COMPETIZIONE</strong><span id="home-car-brand">FERRARI</span><button data-nav="garage">ENTER GARAGE ↗</button></div>
    </section>
    <section id="page-garage" class="screen garage-screen is-hidden" aria-label="Garage">
     <div class="garage-left ui-card">
      <p class="eyebrow">YOUR COLLECTION</p><h2>THE GARAGE</h2>
      <div id="car-list" class="car-list">${CARS.map((c,i)=>`<button class="car-choice ${i===0?'active':''}" data-car="${c.id}"><span class="car-choice-num">0${i+1}</span><span><b>${c.name}</b><small>${c.maker}</small></span><span class="chevron">›</span></button>`).join('')}</div>
      <div class="garage-help">DRAG TO ORBIT 360° &nbsp; • &nbsp; SCROLL TO ZOOM</div>
     </div>
     <div class="garage-right ui-card">
      <div class="custom-header"><p class="eyebrow">YOUR BUILD</p><h3 id="garage-car-title">F40 COMPETIZIONE</h3><span class="custom-live"><i></i> IN THE GARAGE</span></div>
      <div class="custom-tabs" role="tablist" aria-label="Customization sections">
       <button id="custom-tab-style" data-custom-tab="style" class="active" role="tab" aria-selected="true" aria-controls="custom-panel-style" tabindex="0">STYLE</button>
       <button id="custom-tab-performance" data-custom-tab="performance" role="tab" aria-selected="false" aria-controls="custom-panel-performance" tabindex="-1">PERFORMANCE</button>
       <button id="custom-tab-studio" data-custom-tab="studio" role="tab" aria-selected="false" aria-controls="custom-panel-studio" tabindex="-1">STUDIO</button>
      </div>
      <div class="custom-content">
       <div id="custom-panel-style" data-custom-panel="style" class="custom-panel" role="tabpanel" aria-labelledby="custom-tab-style">
        <div class="custom-section-title"><span>01 / BODY COLOR</span><small>PAINT</small></div>
        <div id="paint-swatches" class="swatches">
         ${['#a9adb9','#eb1d34','#151a24','#1265fa','#20c8d5','#ffc247','#27272a','#7a35cd','#fbfbf8','#267f4b'].map((c,i)=>`<button data-paint="${c}" class="swatch ${i===0?'active':''}" style="--paint:${c}" aria-label="Paint color ${c}"></button>`).join('')}
        </div>
        <label class="custom-color-row" data-part-group="paint">CUSTOM COLOR <span id="paint-hex">#A9ADB9</span><input id="paint-custom" type="color" value="#a9adb9" aria-label="Custom body paint color" /></label>
        <div class="custom-section-title" data-part-group="paint"><span>02 / PAINT FINISH</span><small>SURFACE</small></div>
        <div class="custom-options" data-part-group="paint">${[['gloss','GLOSS'],['satin','SATIN'],['matte','MATTE'],['metallic','METALLIC']].map(([v,n])=>`<button data-finish="${v}">${n}</button>`).join('')}</div>
        <div class="custom-section-title" data-part-group="rim"><span>03 / RIM FINISH</span><small>WHEELS</small></div>
        <div class="custom-options" data-part-group="rim">${[['stock','ORIGINAL'],['graphite','GRAPHITE'],['chrome','CHROME'],['gold','GOLD']].map(([v,n])=>`<button data-rim="${v}">${n}</button>`).join('')}</div>
        <div class="custom-section-title" data-part-group="glass"><span>04 / WINDOW TINT</span><small>GLASS</small></div>
        <div class="custom-options" data-part-group="glass">${[['stock','CLEAR'],['smoke','SMOKE'],['limo','DARK'],['blue','BLUE']].map(([v,n])=>`<button data-glass="${v}">${n}</button>`).join('')}</div>
        <div class="custom-section-title" data-part-group="caliper"><span>05 / CALIPERS</span><small>DETAILS</small></div>
        <div class="custom-options" data-part-group="caliper">${[['stock','ORIGINAL'],['red','RED'],['yellow','YELLOW'],['blue','BLUE']].map(([v,n])=>`<button data-caliper="${v}">${n}</button>`).join('')}</div>
        <p id="part-support-note" class="custom-hint"></p>
        <button id="reset-style" class="custom-reset">↺ RESET THIS CAR'S STYLE</button>
       </div>
       <div id="custom-panel-performance" data-custom-panel="performance" class="custom-panel is-hidden" role="tabpanel" aria-labelledby="custom-tab-performance">
        <div class="custom-section-title"><span>01 / VEHICLE UPGRADES</span><small>LEVEL 0–5</small></div>
        <label class="tune-row">ENGINE <span id="engine-label">LV 0</span><input type="range" data-tune="engine" min="0" max="5" value="0" /></label>
        <label class="tune-row">HANDLING <span id="handling-label">LV 0</span><input type="range" data-tune="handling" min="0" max="5" value="0" /></label>
        <label class="tune-row">BRAKES <span id="brakes-label">LV 0</span><input type="range" data-tune="brakes" min="0" max="5" value="0" /></label>
        <div class="custom-section-title"><span>02 / PERFORMANCE</span><small>YOUR BUILD</small></div>
        <div class="car-specs"><div><strong id="stat-top">329</strong><small>TOP SPEED · KM/H</small></div><div><strong id="stat-accel">7.8</strong><small>ACCELERATION</small></div><div><strong id="stat-handling">7.7</strong><small>HANDLING</small></div></div>
        <p class="custom-hint">Take your build onto the road to feel the difference.</p>
       </div>
       <div id="custom-panel-studio" data-custom-panel="studio" class="custom-panel is-hidden" role="tabpanel" aria-labelledby="custom-tab-studio">
        <div class="custom-section-title"><span>01 / GARAGE LIGHTING</span><small>AMBIENCE</small></div>
        <div class="custom-options">${[['redline','REDLINE'],['daylight','DAYLIGHT'],['midnight','MIDNIGHT']].map(([v,n])=>`<button data-lighting="${v}">${n}</button>`).join('')}</div>
        <div class="custom-section-title"><span>02 / CAMERA</span><small>360° VIEW</small></div>
        <label class="custom-range">ZOOM <span id="zoom-value">6.4 M</span><input id="garage-zoom" type="range" min="6" max="9" step="0.1" value="6.4" /></label>
        <button id="auto-orbit" class="custom-toggle" aria-pressed="true">AUTO ORBIT <span>ON</span></button>
        <button id="rotate-model" class="minor-btn">↻ &nbsp; ROTATE 90°</button>
        <p class="custom-hint">Explore your car from every angle.</p>
       </div>
      </div>
      <div class="custom-footer"><button id="garage-test-drive" class="action-main wide">▶ &nbsp; TEST DRIVE <span>↗</span></button></div>
     </div>
     <button id="garage-view-toggle" class="garage-view-toggle" type="button">◉ &nbsp; WIDE GARAGE VIEW</button>
    </section>
    <section id="page-maps" class="screen maps-screen is-hidden" aria-label="Road selection">
     <div class="maps-left ui-card"><p class="eyebrow">EXPLORE THE WORLD // ${String(MAPS.length).padStart(2,'0')} LOCATIONS</p><h2>CHOOSE YOUR<br/><em>ROAD.</em></h2>
      <div id="map-list" class="map-list">${MAPS.map((m,i)=>`<button data-map="${m.id}" class="map-choice ${i===0?'active':''}"><span class="map-index">0${i+1}</span><span><b>${m.name}</b><small>${m.kind} // ${m.climate}</small></span><span>↗</span></button>`).join('')}</div>
     </div>
     <div class="map-info ui-card"><p class="eyebrow">SELECTED DESTINATION</p><h2 id="map-title">${MAPS[0].name.toUpperCase()}</h2><p id="map-detail">${MAPS[0].detail}</p>
      <div class="map-tags"><span id="map-kind">${MAPS[0].kind.toUpperCase()}</span><span id="map-climate">${MAPS[0].climate.toUpperCase()}</span></div>
      <div class="best-lap-heading">BEST LAPS <small>THIS ROAD</small></div>
      <div id="best-lap-board" class="best-lap-board" aria-live="polite"></div>
      <button id="map-race" class="action-main wide">🏁 &nbsp; RACE · 3 LAPS <span>↗</span></button>
      <button id="map-drive" class="action-secondary wide">▶ &nbsp; FREE DRIVE <span>↗</span></button>
     </div>
    </section>
    <section id="page-multiplayer" class="screen multiplayer-screen is-hidden" aria-label="Multiplayer lobby">
     <div class="multi-left ui-card"><p class="eyebrow">ONLINE RACING</p><h2>RACE<br/><em>TOGETHER.</em></h2>
      <div class="mode-tabs"><button id="tab-create" class="active">CREATE ROOM</button><button id="tab-join">JOIN ROOM</button></div>
      <label>PLAYER NAME<input id="player-name" maxlength="22" value="Racer" autocomplete="nickname"/></label>
      <label>ROOM CODE<input id="room-code" maxlength="12" placeholder="MY-RACE-01" autocomplete="off"/></label>
      <p class="tiny-copy">You choose the code. Share it with friends to join from separate devices.</p>
      <button id="room-action" class="action-main wide">CREATE ROOM <span>↗</span></button>
      <div class="multiplayer-note">Up to eight drivers on the same road.</div>
     </div>
     <div class="multi-right ui-card"><div class="room-title"><div><span class="eyebrow">PRIVATE LOBBY</span><h3 id="lobby-code">NOT CONNECTED</h3></div><div id="lobby-status" class="pill">OFFLINE</div></div>
      <div id="lobby-players" class="lobby-players"><div class="empty-state">Your crew will appear here.</div></div>
      <div class="lobby-actions"><button id="ready-button" class="minor-btn" disabled>✓ I'M READY</button><button id="start-session" class="action-main" disabled>START SESSION <span>↗</span></button><button id="leave-room" class="minor-btn" disabled>LEAVE</button></div>
      <div id="chat-log" class="chat-log" role="log" aria-label="Room chat" aria-live="polite"><div class="system-chat">No messages yet.</div></div>
      <form id="chat-form" class="chat-box"><input id="chat-input" maxlength="180" placeholder="Message your teammates…" aria-label="Message your teammates"/><button type="submit" aria-label="Send message">➤</button></form>
     </div>
    </section>
    <section id="page-drive" class="screen drive-screen is-hidden" aria-label="Driving">
     <div class="race-top-left"><span id="drive-mode-label" class="eyebrow">FREE DRIVE</span><strong id="hud-map">${MAPS[0].name.toUpperCase()}</strong><span id="hud-session">THE ROAD IS OPEN</span></div>
     <div class="minimap-panel"><span>ROAD MAP <small>N ↑</small></span><canvas id="minimap" aria-label="Map of the actual roads with your car position and direction"></canvas></div>
     <div id="lap-panel" class="lap-panel is-hidden"><span>LAP <b id="hud-lap">00:00.00</b></span><span>BEST <b id="hud-best">--:--.--</b></span><span>CHECKPOINT <b id="hud-checkpoint">1 / 4</b></span><small id="lap-status">FOLLOW THE CHECKPOINTS</small></div>
     <div id="race-panel" class="race-panel is-hidden"><span>RACE · 3 LAPS</span><strong id="race-position">1 / 3</strong><div><b id="race-laps">LAP 1 / 3</b><b id="race-time">00:00.00</b></div><small id="race-order">YOU</small></div>
     <div class="race-top-right"><span id="hud-camera">CHASE CAMERA</span><button id="camera-btn" aria-label="Switch camera">◉ &nbsp; CAMERA</button><button id="respawn-btn" aria-label="Respawn car">↻ &nbsp; RESET</button><button id="pause-btn" aria-label="Pause">Ⅱ &nbsp; MENU</button></div>
     <div class="speedo"><small id="drive-direction">DRIVE</small><strong><span id="speed-number">0</span><small>KM/H</small></strong><div class="gear-readout"><span id="hud-gear">1</span><span id="hud-rpm">850 RPM</span></div><div class="nitro-progress"><span id="nitro-progress-bar"></span></div><label>NITRO <span id="nitro-number">100%</span></label></div>
     <div id="countdown" class="countdown is-hidden" role="status" aria-live="assertive">3</div>
     <div class="controls controls-left" role="group" aria-label="Mobile steering"><button data-control="left" class="steer-btn" aria-label="Steer left">❮</button><button data-control="right" class="steer-btn" aria-label="Steer right">❯</button></div>
     <div class="controls controls-right" role="group" aria-label="Mobile driving controls"><button data-control="drift" class="drift-btn">DRIFT</button><button data-control="nitro" class="nitro-btn">⚡ NITRO</button><button data-control="brake" class="pedal brake-btn" aria-label="Brake or hold to reverse">BRAKE / R</button><button data-control="throttle" class="pedal accelerate-btn" aria-label="Accelerate">ACCEL</button></div>
     <div id="desktop-tip">W / ↑ Accelerate &nbsp; S / ↓ Brake / Reverse &nbsp; A D Steer &nbsp; SPACE Drift &nbsp; SHIFT Nitro &nbsp; C Camera &nbsp; R Respawn</div>
    </section>
   </main>
   <div id="load-alert" role="status" class="load-alert"><span class="load-wheel"></span><span id="load-message">Preparing your car…</span></div>
   <div id="toast" aria-live="polite" class="toast is-hidden"></div>
   <div id="pause-modal" class="modal is-hidden" role="dialog" aria-modal="true" aria-labelledby="pause-title" tabindex="-1"><div class="modal-inner"><p class="eyebrow">DRIVE SESSION</p><h2 id="pause-title">PAUSED</h2><button id="resume-game" class="action-main wide">RESUME DRIVE</button><button id="exit-drive" class="action-secondary wide">BACK TO GARAGE</button></div></div>
   <div id="race-result" class="modal is-hidden" role="dialog" aria-modal="true" aria-labelledby="race-result-title" aria-describedby="race-result-time" tabindex="-1"><div class="modal-inner race-result-inner"><p class="eyebrow">RACE COMPLETE</p><h2 id="race-result-title">FINISHED</h2><p id="race-result-time">00:00.00</p><div id="race-result-order"></div><button id="race-again" class="action-main wide">RACE AGAIN</button><button id="race-to-maps" class="action-secondary wide">CHOOSE ROAD</button></div></div>
   <div id="rotate-tip">↻ BEST EXPERIENCED IN LANDSCAPE</div>
  </div>`;
}
