(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const instructionOverlay = document.getElementById("instruction-overlay");
  const hud = document.getElementById("hud");
  const action = document.getElementById("main-action");
  const acceptStart = document.getElementById("accept-start");
  const held = new Set();
  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const GRAVITY = 0.62;
  const LEVEL_TIME_LIMIT = 120;
  const STORAGE_KEY = "temploSombrasSave";

  const ui = {
    title: document.getElementById("overlay-title"),
    kicker: document.getElementById("overlay-kicker"),
    copy: document.getElementById("overlay-copy"),
    controls: document.getElementById("controls"),
    guide: document.getElementById("start-guide"),
    mobileGuide: document.querySelector(".mobile-start-guide"),
    playGuide: document.getElementById("play-guide"),
    guideObjective: document.getElementById("guide-objective"),
    guideArrow: document.getElementById("guide-arrow"),
    guideDirection: document.getElementById("guide-direction-label"),
    level: document.getElementById("level-name"),
    lives: document.getElementById("lives"),
    shards: document.getElementById("shards"),
    score: document.getElementById("score"),
    timer: document.getElementById("timer"),
    timerStat: document.querySelector(".timer-stat"),
    footer: document.getElementById("footer-message")
  };

  let state = "menu";
  let levelIndex = 0;
  let player;
  let level;
  let cameraX = 0;
  let score = 0;
  let lives = 3;
  let fragments = 0;
  let completedLevels = new Set();
  let collected = new Set();
  let particles = [];
  let lastTime = 0;
  let elapsed = 0;
  let best = loadSave();

  function loadSave() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return Number.isFinite(data.best) ? data.best : 0;
    } catch (error) {
      console.warn("No se pudo leer el progreso guardado.", error);
      return 0;
    }
  }

  function saveBest() {
    best = Math.max(best, score);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ best }));
    } catch (error) {
      console.warn("No se pudo guardar el progreso.", error);
      ui.footer.textContent = "No se pudo guardar el récord en este navegador.";
    }
  }

  function newPlayer(start) {
    return { x: start.x, y: start.y, w: 25, h: 39, vx: 0, vy: 0, grounded: false, facing: 1, invulnerable: 0, dashCooldown: 0, dashTime: 0 };
  }

  function loadLevel(index) {
    levelIndex = index;
    const definition = window.GAME_LEVELS[index];
    level = {
      ...definition,
      enemies: definition.enemies.map(([x, y, range, direction]) => ({
        x, y, startX: x, range, direction, w: 28, h: 32, speed: 1.15 + index * 0.12
      }))
    };
    player = newPlayer(level.start);
    cameraX = 0;
    fragments = 0;
    collected = new Set();
    particles = [];
    elapsed = 0;
    ui.level.textContent = `${String(index + 1).padStart(2, "0")} · ${level.name}`;
    updateHud();
    updateProgress();
  }

  function updateHud() {
    ui.lives.textContent = "♥".repeat(Math.max(0, lives));
    ui.shards.textContent = `${fragments}/3`;
    ui.score.textContent = score.toLocaleString("es");
    const remaining = Math.max(0, Math.ceil(LEVEL_TIME_LIMIT - elapsed));
    ui.timer.textContent = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
    ui.timerStat.classList.toggle("warning", remaining <= 20);
  }

  function updateProgress() {
    const progress = document.getElementById("level-progress");
    document.getElementById("progress-count").textContent = `${completedLevels.size} de ${window.GAME_LEVELS.length} superados`;
    progress.innerHTML = window.GAME_LEVELS.map((item, index) => {
      const completed = completedLevels.has(index);
      const current = !completed && index === levelIndex && state !== "menu";
      const status = completed ? "Superado" : current ? "En curso" : "Pendiente";
      const className = completed ? "completed" : current ? "current" : "pending";
      return `<li class="level-step ${className}"${current ? ' aria-current="step"' : ""}>
        <span class="level-number">${completed ? "✓" : String(index + 1).padStart(2, "0")}</span>
        <span class="level-step-copy"><strong>${item.name}</strong><small>${status}</small></span>
      </li>`;
    }).join("");
  }

  function showOverlay(mode, title, copy, buttonText) {
    state = mode;
    overlay.hidden = false;
    instructionOverlay.hidden = true;
    ui.playGuide.hidden = true;
    hud.hidden = mode === "menu";
    ui.title.innerHTML = title;
    ui.copy.textContent = copy;
    ui.kicker.textContent = mode === "menu" ? "UNA AVENTURA DE PLATAFORMAS" : "TEMPLO DE LAS SOMBRAS";
    ui.controls.hidden = mode !== "menu";
    ui.guide.hidden = mode !== "menu";
    ui.mobileGuide.hidden = mode !== "menu";
    action.innerHTML = `${buttonText} <span>→</span>`;
  }

  function showInstructions() {
    state = "instructions";
    overlay.hidden = true;
    instructionOverlay.hidden = false;
    hud.hidden = true;
    ui.playGuide.hidden = true;
    acceptStart.focus();
  }

  function updatePlayGuide() {
    if (state !== "playing") {
      ui.playGuide.hidden = true;
      return;
    }
    ui.playGuide.hidden = false;
    const pendingShards = level.shards
      .map(([x], index) => ({ x, index }))
      .filter(shard => !collected.has(shard.index));
    const targetX = pendingShards.length
      ? pendingShards.reduce((nearest, shard) =>
        Math.abs(shard.x - player.x) < Math.abs(nearest.x - player.x) ? shard : nearest
      ).x
      : level.exit.x + level.exit.w / 2;
    const direction = targetX >= player.x + player.w / 2 ? 1 : -1;
    ui.guideObjective.textContent = pendingShards.length
      ? `Fragmentos ${fragments}/3`
      : "¡Portal desbloqueado!";
    ui.guideArrow.textContent = direction > 0 ? "→" : "←";
    ui.guideDirection.textContent = pendingShards.length
      ? direction > 0 ? "Busca el fragmento a la derecha" : "Busca el fragmento a la izquierda"
      : direction > 0 ? "Ve al portal a la derecha" : "Ve al portal a la izquierda";
  }

  function begin() {
    score = 0;
    lives = 3;
    completedLevels = new Set();
    loadLevel(0);
    state = "playing";
    instructionOverlay.hidden = true;
    overlay.hidden = true;
    hud.hidden = false;
    updateProgress();
    updatePlayGuide();
    lastTime = performance.now();
  }

  function retryCurrentLevel() {
    lives = 3;
    loadLevel(levelIndex);
    state = "playing";
    instructionOverlay.hidden = true;
    overlay.hidden = true;
    hud.hidden = false;
    ui.footer.textContent = `Reintentando ${level.name}. Tus niveles superados y puntos se conservan.`;
    updateProgress();
    updatePlayGuide();
    lastTime = performance.now();
  }

  function nextLevel() {
    const reward = 150 + fragments * 50 + Math.max(0, LEVEL_TIME_LIMIT - Math.floor(elapsed)) * 2;
    completedLevels.add(levelIndex);
    updateProgress();
    score += reward;
    if ((levelIndex + 1) % 2 === 0) lives = Math.min(5, lives + 1);
    updateHud();
    saveBest();
    if (levelIndex === window.GAME_LEVELS.length - 1) {
      showOverlay("victory", "Leyenda<br><em>del templo.</em>", `¡Completaste los cuatro niveles! Ganaste ${reward} puntos de recompensa en la etapa final. Puntuación: ${score.toLocaleString("es")}. Récord: ${best.toLocaleString("es")}.`, "Jugar otra vez");
      ui.kicker.textContent = "VICTORIA · EXPEDICIÓN COMPLETADA";
      ui.footer.textContent = "Las ruinas vuelven a dormir. Por ahora.";
      return;
    }
    const gotLife = (levelIndex + 1) % 2 === 0;
    showOverlay("clear", `Nivel superado<br><em>+${reward} puntos</em>`, `Desglose: 150 por completar, ${fragments * 50} por fragmentos y ${Math.max(0, LEVEL_TIME_LIMIT - Math.floor(elapsed)) * 2} por tiempo restante. ${gotLife ? "¡Recompensa especial: +1 vida!" : ""} Prepárate para ${window.GAME_LEVELS[levelIndex + 1].name}.`, "Reclamar y continuar");
    ui.kicker.textContent = `RECOMPENSA · ${level.subtitle.toUpperCase()}`;
    ui.footer.textContent = `Récord de esta expedición: ${best.toLocaleString("es")} puntos.`;
  }

  function takeDamage(cause = "hazard") {
    if ((cause !== "timeout" && player.invulnerable > 0) || state !== "playing") return;
    lives -= 1;
    updateHud();
    if (lives <= 0) {
      saveBest();
      showOverlay("gameover", "La sombra<br><em>te encontró.</em>", `Se agotaron tus vidas en el nivel ${levelIndex + 1}. Puedes reintentarlo sin volver al nivel 1. Se conservan tus niveles superados y puntos.`, `Reintentar nivel ${levelIndex + 1}`);
      ui.kicker.textContent = "FIN DE LA EXPEDICIÓN";
      return;
    }
    if (cause === "timeout") {
      loadLevel(levelIndex);
      player.invulnerable = 110;
      ui.footer.textContent = "¡Se acabó el tiempo! Perdiste una vida y el nivel se reinició.";
      return;
    }
    player = newPlayer(level.start);
    player.invulnerable = 110;
    cameraX = 0;
  }

  function overlaps(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function update(dt) {
    if (state !== "playing") return;
    elapsed += dt / 60;
    updateHud();
    if (elapsed >= LEVEL_TIME_LIMIT) {
      takeDamage("timeout");
      return;
    }
    const p = player;
    const speed = 3.4;
    const left = held.has("ArrowLeft") || held.has("KeyA");
    const right = held.has("ArrowRight") || held.has("KeyD");
    if (left) { p.vx = -speed; p.facing = -1; }
    else if (right) { p.vx = speed; p.facing = 1; }
    else p.vx *= 0.76;

    if ((held.has("Space") || held.has("ArrowUp") || held.has("KeyW")) && p.grounded) {
      p.vy = -12.8;
      p.grounded = false;
      held.delete("Space");
      held.delete("ArrowUp");
      held.delete("KeyW");
    }
    if ((held.has("KeyX") || held.has("ShiftLeft")) && p.dashCooldown <= 0) {
      p.dashTime = 9;
      p.dashCooldown = 65;
      p.vx = p.facing * 9;
      p.vy = 0;
      held.delete("KeyX");
      held.delete("ShiftLeft");
    }
    if (p.dashTime > 0) {
      p.dashTime -= 1;
      p.vx = p.facing * 9;
    } else {
      p.vy += GRAVITY;
      if (p.vy > 13) p.vy = 13;
    }
    if (p.dashCooldown > 0) p.dashCooldown -= 1;
    if (p.invulnerable > 0) p.invulnerable -= 1;

    const previousBottom = p.y + p.h;
    p.x += p.vx;
    p.x = Math.max(0, Math.min(level.width - p.w, p.x));
    p.y += p.vy;
    p.grounded = false;
    if (p.vy >= 0) {
      for (const [x, y, w, h] of level.platforms) {
        if (p.x + p.w > x && p.x < x + w && previousBottom <= y + 2 && p.y + p.h >= y && p.y + p.h <= y + h + 10) {
          p.y = y - p.h;
          p.vy = 0;
          p.grounded = true;
        }
      }
    }

    level.enemies.forEach(enemy => {
      enemy.x += enemy.direction * enemy.speed;
      if (Math.abs(enemy.x - enemy.startX) >= enemy.range) enemy.direction *= -1;
      if (overlaps(p, enemy)) takeDamage();
    });

    level.spikes.forEach(([x, y, w]) => {
      if (overlaps(p, { x: x + 4, y: y + 5, w: w - 8, h: 22 })) takeDamage();
    });

    level.shards.forEach(([x, y], index) => {
      if (!collected.has(index) && overlaps(p, { x: x - 11, y: y - 11, w: 22, h: 22 })) {
        collected.add(index);
        fragments += 1;
        score += 50;
        burst(x, y, level.color);
        updateHud();
      }
    });

    if (p.y > HEIGHT + 100) takeDamage();
    if (fragments === 3 && overlaps(p, level.exit)) nextLevel();
    cameraX += ((p.x - WIDTH * 0.36) - cameraX) * 0.09;
    cameraX = Math.max(0, Math.min(level.width - WIDTH, cameraX));
    updatePlayGuide();
    particles = particles.filter(part => part.life > 0);
    particles.forEach(part => { part.x += part.vx; part.y += part.vy; part.vy += 0.08; part.life -= 1; });
  }

  function burst(x, y, color) {
    for (let i = 0; i < 13; i++) {
      const angle = (Math.PI * 2 * i) / 13;
      particles.push({ x, y, vx: Math.cos(angle) * (1 + Math.random() * 2), vy: Math.sin(angle) * (1 + Math.random() * 2), life: 28, color });
    }
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, "#192538");
    gradient.addColorStop(0.65, "#354357");
    gradient.addColorStop(1, "#d1945d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    for (let i = 0; i < 64; i++) {
      const x = (i * 137 + 31 - cameraX * 0.025) % WIDTH;
      const y = 22 + (i * 67) % 220;
      const size = i % 9 === 0 ? 2 : 1;
      ctx.globalAlpha = 0.25 + (i % 4) * 0.1;
      ctx.fillStyle = i % 7 === 0 ? "#f3d59d" : "#e5e6df";
      ctx.fillRect((x + WIDTH) % WIDTH, y, size, size);
    }
    ctx.globalAlpha = 1;
    const sunX = 720 - cameraX * 0.04;
    const sun = ctx.createRadialGradient(sunX, 130, 8, sunX, 130, 100);
    sun.addColorStop(0, "rgba(247,204,137,.62)");
    sun.addColorStop(1, "rgba(247,204,137,0)");
    ctx.fillStyle = sun;
    ctx.fillRect(sunX - 105, 25, 210, 210);
    ctx.fillStyle = "rgba(247,204,137,.56)";
    ctx.beginPath();
    ctx.arc(sunX, 130, 31, 0, Math.PI * 2);
    ctx.fill();
    drawDunes(0.13, 315, "#526071", 54);
    drawBackgroundRuins();
    drawDunes(0.25, 390, "#454c55", 73);
    drawDunes(0.43, 447, "#343b40", 45);
  }

  function drawBackgroundRuins() {
    const offset = cameraX * 0.16;
    const worldWidth = level ? level.width : WIDTH;
    for (let worldX = -100; worldX < worldWidth + 600; worldX += 570) {
      const x = worldX - offset;
      if (x < -180 || x > WIDTH + 180) continue;
      const scale = 0.65 + ((Math.floor(worldX / 570) % 3) + 3) % 3 * 0.12;
      const baseY = 342 + (Math.floor(worldX / 570) % 2) * 17;
      drawTempleSilhouette(x, baseY, scale, "#303947");
    }
  }

  function drawTempleSilhouette(x, baseY, scale, color) {
    ctx.save();
    ctx.translate(x, baseY);
    ctx.scale(scale, scale);
    ctx.fillStyle = color;
    ctx.fillRect(-70, -7, 140, 8);
    ctx.fillRect(-55, -54, 110, 47);
    ctx.fillRect(-72, -62, 144, 9);
    ctx.fillRect(-47, -80, 94, 8);
    ctx.fillRect(-38, -101, 76, 22);
    ctx.beginPath();
    ctx.moveTo(-48, -101);
    ctx.lineTo(0, -125);
    ctx.lineTo(48, -101);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(233,184,101,.15)";
    for (let column = -42; column <= 30; column += 24) {
      ctx.fillRect(column, -48, 7, 38);
      ctx.fillRect(column - 2, -51, 11, 4);
    }
    ctx.fillRect(-9, -34, 18, 27);
    ctx.restore();
  }

  function drawDunes(factor, baseY, color, height) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, HEIGHT);
    for (let x = -30; x <= WIDTH + 30; x += 30) {
      const worldX = x + cameraX * factor;
      const y = baseY + Math.sin(worldX * 0.008) * height * 0.52 + Math.sin(worldX * 0.021) * height * 0.18;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(WIDTH, HEIGHT);
    ctx.closePath();
    ctx.fill();
  }

  function drawPlatform([x, y, w, h]) {
    const screenX = x - cameraX;
    if (screenX + w < -5 || screenX > WIDTH + 5) return;
    ctx.fillStyle = "#332e2e";
    ctx.fillRect(screenX, y, w, h);
    ctx.fillStyle = level.color;
    ctx.fillRect(screenX, y, w, 6);
    ctx.fillStyle = "rgba(255,224,173,.13)";
    for (let tile = 0; tile < w; tile += 40) {
      ctx.fillRect(screenX + tile + 3, y + 13, 2, Math.max(4, h - 19));
      ctx.fillRect(screenX + tile + 9, y + 23, Math.min(18, w - tile - 10), 2);
    }
  }

  function drawSpikes([x, y, w]) {
    const sx = x - cameraX;
    if (sx + w < 0 || sx > WIDTH) return;
    ctx.fillStyle = "#c8b5a1";
    for (let px = sx; px < sx + w - 8; px += 16) {
      ctx.beginPath();
      ctx.moveTo(px, y + 13);
      ctx.lineTo(px + 8, y - 1);
      ctx.lineTo(px + 16, y + 13);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "rgba(231,111,88,.25)";
    ctx.fillRect(sx, y + 13, w, 3);
  }

  function drawShard(x, y, index) {
    if (collected.has(index)) return;
    const sx = x - cameraX;
    const float = Math.sin(performance.now() / 260 + index) * 5;
    ctx.save();
    ctx.translate(sx, y + float);
    ctx.shadowColor = level.color;
    ctx.shadowBlur = 22;
    ctx.fillStyle = "#a7f1e2";
    ctx.beginPath();
    ctx.moveTo(0, -13); ctx.lineTo(9, 0); ctx.lineTo(0, 13); ctx.lineTo(-9, 0);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawExit() {
    const e = level.exit;
    const sx = e.x - cameraX;
    ctx.fillStyle = fragments === 3 ? "#f3c56e" : "#715d4e";
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.ellipse(sx + e.w / 2, e.y + 35, 33 + Math.sin(performance.now() / 200) * 3, 43, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = fragments === 3 ? "#f3c56e" : "#9a8371";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(sx + e.w / 2, e.y + 37, 21, 35, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = fragments === 3 ? "rgba(255,215,132,.4)" : "rgba(22,27,37,.58)";
    ctx.fillRect(sx + 8, e.y + 36, e.w - 16, 39);
    ctx.fillStyle = fragments === 3 ? "#ffe3a0" : "#b4a397";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(fragments === 3 ? "ABIERTO" : `${fragments}/3`, sx + e.w / 2, e.y + 87);
  }

  function drawPlayer() {
    const p = player;
    if (p.invulnerable > 0 && Math.floor(p.invulnerable / 5) % 2 === 0) return;
    const x = p.x - cameraX;
    const y = p.y;
    ctx.save();
    if (p.dashTime > 0) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = level.color;
      ctx.fillRect(x - p.facing * 24, y + 10, p.w, p.h - 7);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "#d6a77b";
    ctx.fillRect(x + 6, y + 4, 14, 12);
    ctx.fillStyle = "#24242b";
    ctx.fillRect(x + 5, y + 1, 16, 6);
    ctx.fillStyle = "#f3e4c9";
    ctx.fillRect(x + (p.facing > 0 ? 17 : 6), y + 9, 3, 2);
    ctx.fillStyle = "#e5d7bd";
    ctx.fillRect(x + 4, y + 16, 17, 15);
    ctx.fillStyle = "#a75045";
    ctx.fillRect(x + 4, y + 19, 17, 5);
    ctx.fillStyle = "#393845";
    const step = p.grounded && Math.abs(p.vx) > 1 ? Math.sin(performance.now() / 65) * 3 : 0;
    ctx.fillRect(x + 5, y + 30, 6, 9 + step);
    ctx.fillRect(x + 14, y + 30, 6, 9 - step);
    ctx.fillStyle = "#c39870";
    ctx.fillRect(x + 1, y + 18, 4, 13);
    ctx.fillRect(x + 21, y + 18, 4, 13);
    ctx.restore();
  }

  function drawEnemy(enemy) {
    const x = enemy.x - cameraX;
    if (x < -40 || x > WIDTH + 40) return;
    ctx.fillStyle = "#312b39";
    ctx.fillRect(x + 3, enemy.y + 9, 22, 22);
    ctx.fillStyle = "#a76166";
    ctx.fillRect(x + 7, enemy.y + 4, 15, 12);
    ctx.fillStyle = "#f7d39c";
    ctx.fillRect(x + (enemy.direction > 0 ? 16 : 8), enemy.y + 9, 3, 3);
    ctx.fillStyle = "#15151c";
    ctx.fillRect(x + 5, enemy.y + 29, 7, 4);
    ctx.fillRect(x + 17, enemy.y + 29, 7, 4);
  }

  function draw() {
    drawBackground();
    if (!level) {
      ctx.fillStyle = "rgba(20,25,34,.22)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      return;
    }
    level.platforms.forEach(drawPlatform);
    level.spikes.forEach(drawSpikes);
    drawExit();
    level.shards.forEach(([x, y], index) => drawShard(x, y, index));
    level.enemies.forEach(drawEnemy);
    particles.forEach(part => {
      ctx.globalAlpha = part.life / 28;
      ctx.fillStyle = part.color;
      ctx.fillRect(part.x - cameraX, part.y, 4, 4);
    });
    ctx.globalAlpha = 1;
    if (player) drawPlayer();
  }

  function frame(time) {
    const dt = Math.max(0, Math.min(2, (time - lastTime) / 16.67 || 1));
    lastTime = time;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function togglePause() {
    if (state === "playing") {
      showOverlay("paused", "Toma aire.<br><em>El templo espera.</em>", "Tu partida está en pausa. Cuando estés listo, vuelve a la aventura.", "Continuar");
      ui.kicker.textContent = "PAUSA";
      ui.controls.hidden = false;
    } else if (state === "paused") {
      state = "playing";
      overlay.hidden = true;
      lastTime = performance.now();
    }
  }

  action.addEventListener("click", () => {
    if (state === "menu") {
      showInstructions();
    } else if (state === "victory") {
      begin();
    } else if (state === "gameover") {
      retryCurrentLevel();
    } else if (state === "paused") {
      togglePause();
    } else if (state === "clear") {
      loadLevel(levelIndex + 1);
      state = "playing";
      overlay.hidden = true;
      updatePlayGuide();
      lastTime = performance.now();
    }
  });
  acceptStart.addEventListener("click", begin);
  document.getElementById("pause-button").addEventListener("click", togglePause);
  window.addEventListener("keydown", event => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(event.code)) event.preventDefault();
    if (event.code === "Escape") { togglePause(); return; }
    if (state === "playing" && !event.repeat) held.add(event.code);
  });
  window.addEventListener("keyup", event => held.delete(event.code));
  window.addEventListener("blur", () => held.clear());

  draw();
  requestAnimationFrame(frame);
})();
