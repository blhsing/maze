const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const statusText = document.querySelector("#statusText");
const playerHud = [
  {
    label: document.querySelector("#player1Label"),
    state: document.querySelector("#player1State"),
    effects: document.querySelector("#player1Effects"),
  },
  {
    label: document.querySelector("#player2Label"),
    state: document.querySelector("#player2State"),
    effects: document.querySelector("#player2Effects"),
  },
  {
    label: document.querySelector("#player3Label"),
    state: document.querySelector("#player3State"),
    effects: document.querySelector("#player3Effects"),
  },
];
for (const hud of playerHud) {
  hud.card = hud.label.closest(".player-card");
}
const iceTimer = document.querySelector("#iceTimer");
const overlay = document.querySelector("#overlay");
const overlayTitle = overlay.querySelector("h1");
const startBtn = document.querySelector("#startBtn");
const restartBtn = document.querySelector("#restartBtn");
const playerCountSelect = document.querySelector("#playerCountSelect");
const playerModeSelects = [
  document.querySelector("#player1ModeSelect"),
  document.querySelector("#player2ModeSelect"),
  document.querySelector("#player3ModeSelect"),
];
const aiDifficultySelect = document.querySelector("#aiDifficultySelect");

const LOGICAL_COLS = 15;
const LOGICAL_ROWS = 10;
const COLS = LOGICAL_COLS * 3 + 1;
const ROWS = LOGICAL_ROWS * 3 + 1;
const WALL = 1;
const FLOOR = 0;
const PLAYER_RADIUS = 0.35;
const PLAYER_SPINACH_SCALE = 1.65;
const ITEM_DRAW_SCALE = 0.86;
const ITEM_PICKUP_RADIUS = 0.82;
const DRUNK_SECONDS = 6;
const FREEZE_SECONDS = 5;
const REVIVE_RADIUS = 0.86;
const REVIVE_SPINACH_SECONDS = 2;
const SETTINGS_KEY = "mazeEscapeSettings";
const AI_DIFFICULTIES = {
  easy: {
    speed: 0.82,
    thinkInterval: 0.58,
    dangerRadius: 2.2,
    dangerWeight: 1.25,
    itemRadius: 2.4,
    rescueRadius: 3.2,
    lookAhead: 2,
    noise: 0.22,
  },
  normal: {
    speed: 0.98,
    thinkInterval: 0.32,
    dangerRadius: 3.1,
    dangerWeight: 1.7,
    itemRadius: 4.2,
    rescueRadius: 5.5,
    lookAhead: 3,
    noise: 0.08,
  },
  hard: {
    speed: 1.13,
    thinkInterval: 0.16,
    dangerRadius: 4.2,
    dangerWeight: 2.25,
    itemRadius: 6.2,
    rescueRadius: 9,
    lookAhead: 4,
    noise: 0,
  },
};
const PLAYER_SPECS = [
  {
    id: 1,
    label: "P1",
    controlText: "WASD",
    color: "#f2c24b",
    start: { x: 1.55, y: 1.55 },
    controls: { up: ["w", "W"], down: ["s", "S"], left: ["a", "A"], right: ["d", "D"] },
  },
  {
    id: 2,
    label: "P2",
    controlText: "方向鍵",
    color: "#60a5fa",
    start: { x: 2.3, y: 1.55 },
    controls: { up: ["ArrowUp"], down: ["ArrowDown"], left: ["ArrowLeft"], right: ["ArrowRight"] },
  },
  {
    id: 3,
    label: "P3",
    controlText: "IJKL",
    color: "#f472b6",
    start: { x: 1.55, y: 2.3 },
    controls: { up: ["i", "I"], down: ["k", "K"], left: ["j", "J"], right: ["l", "L"] },
  },
];
const keys = new Set();
const touchDirs = new Set();

let maze;
let cellSize;
let offsetX;
let offsetY;
let players;
let exitCell;
let holes;
let items;
let state = "ready";
let lastTime = 0;
let pulse = 0;

function makeMaze() {
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(WALL));
  const visited = Array.from({ length: LOGICAL_ROWS }, () => Array(LOGICAL_COLS).fill(false));
  const stack = [{ x: 0, y: 0 }];
  visited[0][0] = true;
  carveRoom(grid, 0, 0);

  while (stack.length) {
    const current = stack[stack.length - 1];
    const dirs = shuffle([
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ]);
    const nextDir = dirs.find((dir) => {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;
      return nx >= 0 && nx < LOGICAL_COLS && ny >= 0 && ny < LOGICAL_ROWS && !visited[ny][nx];
    });

    if (!nextDir) {
      stack.pop();
      continue;
    }

    const nx = current.x + nextDir.x;
    const ny = current.y + nextDir.y;
    carveRoom(grid, nx, ny);
    carveConnector(grid, current, { x: nx, y: ny });
    visited[ny][nx] = true;
    stack.push({ x: nx, y: ny });
  }

  for (let y = 0; y < LOGICAL_ROWS; y++) {
    for (let x = 0; x < LOGICAL_COLS; x++) {
      if (x < LOGICAL_COLS - 1 && Math.random() < 0.08) carveConnector(grid, { x, y }, { x: x + 1, y });
      if (y < LOGICAL_ROWS - 1 && Math.random() < 0.08) carveConnector(grid, { x, y }, { x, y: y + 1 });
    }
  }

  return grid;
}

function carveRoom(grid, logicalX, logicalY) {
  const x = 1 + logicalX * 3;
  const y = 1 + logicalY * 3;
  grid[y][x] = FLOOR;
  grid[y][x + 1] = FLOOR;
  grid[y + 1][x] = FLOOR;
  grid[y + 1][x + 1] = FLOOR;
}

function carveConnector(grid, from, to) {
  const x = 1 + from.x * 3;
  const y = 1 + from.y * 3;
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (dx === 1) {
    grid[y][x + 2] = FLOOR;
    grid[y + 1][x + 2] = FLOOR;
  } else if (dx === -1) {
    grid[y][x - 1] = FLOOR;
    grid[y + 1][x - 1] = FLOOR;
  } else if (dy === 1) {
    grid[y + 2][x] = FLOOR;
    grid[y + 2][x + 1] = FLOOR;
  } else if (dy === -1) {
    grid[y - 1][x] = FLOOR;
    grid[y - 1][x + 1] = FLOOR;
  }
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function resetGame(runNow = false) {
  if (runNow) saveSettings();
  syncSetupVisibility();
  maze = makeMaze();
  exitCell = farthestCell({ x: 1, y: 1 });
  maze[exitCell.y][exitCell.x] = FLOOR;
  players = PLAYER_SPECS.slice(0, currentPlayerCount()).map((spec, index) => makePlayer(spec, index));
  const cells = openCells();
  holes = makeHoles(cells.slice(0, 7));
  items = makeItems(cells.slice(7, 32));
  state = runNow ? "playing" : "ready";
  lastTime = performance.now();
  overlay.classList.toggle("hidden", runNow);
  statusText.textContent = runNow ? "逃跑中" : "準備";
  updateHud();
  draw();
}

function makePlayer(spec, index) {
  return {
    id: spec.id,
    label: spec.label,
    controlText: spec.controlText,
    color: spec.color,
    controls: spec.controls,
    isAi: playerModeSelects[index]?.value === "ai",
    x: spec.start.x,
    y: spec.start.y,
    radius: PLAYER_RADIUS,
    spinach: 0,
    carrot: 0,
    poop: 0,
    drunk: 0,
    state: "active",
    aiThink: 0,
    aiPath: [],
    aiTarget: null,
  };
}

function currentPlayerCount() {
  const value = Number(playerCountSelect?.value || 3);
  return Math.max(1, Math.min(3, value));
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    if (saved.playerCount) playerCountSelect.value = String(Math.max(1, Math.min(3, Number(saved.playerCount))));
    if (Array.isArray(saved.playerModes)) {
      saved.playerModes.forEach((mode, index) => {
        if (playerModeSelects[index] && ["human", "ai"].includes(mode)) {
          playerModeSelects[index].value = mode;
        }
      });
    }
    if (saved.aiDifficulty && AI_DIFFICULTIES[saved.aiDifficulty]) {
      aiDifficultySelect.value = saved.aiDifficulty;
    }
  } catch {
    localStorage.removeItem(SETTINGS_KEY);
  }
  syncSetupVisibility();
}

function saveSettings() {
  const settings = {
    playerCount: currentPlayerCount(),
    playerModes: playerModeSelects.map((select) => select.value),
    aiDifficulty: aiDifficultySelect.value,
  };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Some browser privacy modes disable localStorage for file pages.
  }
}

function syncSetupVisibility() {
  const count = currentPlayerCount();
  const title = `${count}人迷宮逃生`;
  overlayTitle.textContent = title;
  document.title = title;
  playerModeSelects.forEach((select, index) => {
    const enabled = index < count;
    select.closest("label").hidden = !enabled;
    playerHud[index].card.hidden = !enabled;
  });
  playerHud.forEach((hud, index) => {
    const spec = PLAYER_SPECS[index];
    const mode = playerModeSelects[index].value === "ai" ? `AI ${aiDifficultyText()}` : spec.controlText;
    hud.label.textContent = `${spec.label} ${mode}`;
    if (index >= count) {
      hud.state.textContent = "-";
      hud.effects.textContent = "未加入";
    }
  });
}

function aiDifficultyText() {
  const labels = {
    easy: "簡單",
    normal: "普通",
    hard: "困難",
  };
  return labels[aiDifficultySelect.value] || labels.normal;
}

function farthestCell(start) {
  const distances = bfs(start);
  let best = start;
  let bestDistance = -1;
  for (let y = 1; y < ROWS - 1; y++) {
    for (let x = 1; x < COLS - 1; x++) {
      if (maze[y][x] === FLOOR && distances[y][x] > bestDistance) {
        best = { x, y };
        bestDistance = distances[y][x];
      }
    }
  }
  return best;
}

function bfs(start) {
  const distances = Array.from({ length: ROWS }, () => Array(COLS).fill(-1));
  const queue = [start];
  distances[start.y][start.x] = 0;
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i];
    for (const next of neighbors(cell)) {
      if (distances[next.y][next.x] === -1) {
        distances[next.y][next.x] = distances[cell.y][cell.x] + 1;
        queue.push(next);
      }
    }
  }
  return distances;
}

function neighbors(cell) {
  return [
    { x: cell.x + 1, y: cell.y },
    { x: cell.x - 1, y: cell.y },
    { x: cell.x, y: cell.y + 1 },
    { x: cell.x, y: cell.y - 1 },
  ].filter(({ x, y }) => x >= 0 && x < COLS && y >= 0 && y < ROWS && maze[y][x] === FLOOR);
}

function openCells() {
  const cells = [];
  for (let y = 1; y < ROWS - 1; y++) {
    for (let x = 1; x < COLS - 1; x++) {
      if (maze[y][x] === FLOOR && distance({ x, y }, { x: 1, y: 1 }) > 8 && distance({ x, y }, exitCell) > 3) {
        cells.push({ x, y });
      }
    }
  }
  return shuffle(cells);
}

function makeHoles(cells) {
  return cells.map((cell, index) => ({
    x: cell.x + 0.5,
    y: cell.y + 0.5,
    radius: 0.3,
    speed: 1.08 + index * 0.025,
    recalc: 0,
    path: [],
    stunned: 0,
    frozen: 0,
  }));
}

function makeItems(cells) {
  const specs = [
    ...Array.from({ length: 5 }, () => "spinach"),
    ...Array.from({ length: 6 }, () => "carrot"),
    ...Array.from({ length: 6 }, () => "poop"),
    ...Array.from({ length: 4 }, () => "wine"),
    ...Array.from({ length: 4 }, () => "ice"),
  ];
  return specs.slice(0, cells.length).map((type, index) => ({
    type,
    x: cells[index].x + 0.5,
    y: cells[index].y + 0.5,
    taken: false,
    bob: Math.random() * Math.PI * 2,
  }));
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cellSize = Math.min(rect.width / COLS, rect.height / ROWS);
  offsetX = (rect.width - cellSize * COLS) / 2;
  offsetY = (rect.height - cellSize * ROWS) / 2;
  draw();
}

function gameLoop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.04);
  lastTime = now;
  pulse += dt;
  if (state === "playing") update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

function update(dt) {
  for (const player of activePlayers()) {
    player.spinach = Math.max(0, player.spinach - dt);
    player.carrot = Math.max(0, player.carrot - dt);
    player.poop = Math.max(0, player.poop - dt);
    player.drunk = Math.max(0, player.drunk - dt);
    movePlayer(player, dt);
    collectItems(player);
  }
  reviveDeadPlayers();
  moveHoles(dt);
  checkEndings();
  updateHud();
}

function activePlayers() {
  return players.filter((player) => player.state === "active");
}

function deadPlayers() {
  return players.filter((player) => player.state === "dead");
}

function movePlayer(player, dt) {
  const intent = player.isAi ? aiInputVector(player, dt) : inputVector(player);
  if (player.drunk > 0) {
    intent.x *= -1;
    intent.y *= -1;
  }
  const len = Math.hypot(intent.x, intent.y) || 1;
  const boost = player.carrot > 0 ? 1.55 : 1;
  const drag = player.poop > 0 ? 0.55 : 1;
  const aiSpeed = player.isAi ? currentAiConfig().speed : 1;
  const speed = 4.25 * boost * drag * aiSpeed;
  const vx = (intent.x / len) * speed * dt;
  const vy = (intent.y / len) * speed * dt;
  if (intent.x !== 0) player.x = slide(player, player.x, player.y, vx, 0).x;
  if (intent.y !== 0) player.y = slide(player, player.x, player.y, 0, vy).y;
}

function inputVector(player) {
  const left = hasPressed(player.controls.left) || (player.id === 1 && touchDirs.has("left"));
  const right = hasPressed(player.controls.right) || (player.id === 1 && touchDirs.has("right"));
  const up = hasPressed(player.controls.up) || (player.id === 1 && touchDirs.has("up"));
  const down = hasPressed(player.controls.down) || (player.id === 1 && touchDirs.has("down"));
  const vector = {
    x: Number(right) - Number(left),
    y: Number(down) - Number(up),
  };
  return vector;
}

function hasPressed(keyList) {
  return keyList.some((key) => keys.has(key));
}

function currentAiConfig() {
  return AI_DIFFICULTIES[aiDifficultySelect?.value] || AI_DIFFICULTIES.normal;
}

function aiInputVector(player, dt) {
  const config = currentAiConfig();
  const currentCell = entityCell(player);
  player.aiThink -= dt;

  if (player.aiThink <= 0 || !player.aiTarget || reachedTargetCell(player, player.aiTarget)) {
    player.aiTarget = chooseAiTarget(player, config);
    player.aiPath = pathTo(currentCell, player.aiTarget);
    player.aiThink = config.thinkInterval * (0.8 + Math.random() * 0.4);
  }

  while (
    player.aiPath.length > 1 &&
    player.aiPath[1].x === currentCell.x &&
    player.aiPath[1].y === currentCell.y
  ) {
    player.aiPath.shift();
  }

  if (
    player.aiPath.length &&
    (player.aiPath[0].x !== currentCell.x || player.aiPath[0].y !== currentCell.y)
  ) {
    player.aiPath = pathTo(currentCell, player.aiTarget);
  }

  const next = player.aiPath[1] || player.aiTarget || currentCell;
  const vector = {
    x: next.x + 0.5 - player.x,
    y: next.y + 0.5 - player.y,
  };
  const repel = holeRepelVector(player, config);
  vector.x += repel.x;
  vector.y += repel.y;

  if (config.noise > 0) {
    vector.x += (Math.random() - 0.5) * config.noise;
    vector.y += (Math.random() - 0.5) * config.noise;
  }

  return vector;
}

function chooseAiTarget(player, config) {
  if (player.spinach <= 0 && nearestHoleDistance(player.x, player.y) < config.dangerRadius) {
    return bestEscapeCell(player, config);
  }

  const fallen = nearestDeadPlayer(player, config.rescueRadius);
  if (fallen) return entityCell(fallen);

  const item = nearestUsefulItem(player, config.itemRadius);
  if (item) return entityCell(item);

  return { x: exitCell.x, y: exitCell.y };
}

function nearestDeadPlayer(player, radius) {
  let nearest = null;
  let nearestDistance = Infinity;
  for (const fallen of deadPlayers()) {
    const currentDistance = Math.hypot(player.x - fallen.x, player.y - fallen.y);
    if (currentDistance <= radius && currentDistance < nearestDistance) {
      nearest = fallen;
      nearestDistance = currentDistance;
    }
  }
  return nearest;
}

function nearestUsefulItem(player, radius) {
  const usefulTypes = new Set(["spinach", "carrot", "ice"]);
  let nearest = null;
  let nearestDistance = Infinity;
  for (const item of items) {
    if (item.taken || !usefulTypes.has(item.type)) continue;
    const currentDistance = Math.hypot(player.x - item.x, player.y - item.y);
    if (currentDistance <= radius && currentDistance < nearestDistance) {
      nearest = item;
      nearestDistance = currentDistance;
    }
  }
  return nearest;
}

function bestEscapeCell(player, config) {
  const origin = entityCell(player);
  let best = origin;
  let bestScore = -Infinity;

  for (let y = origin.y - config.lookAhead; y <= origin.y + config.lookAhead; y++) {
    for (let x = origin.x - config.lookAhead; x <= origin.x + config.lookAhead; x++) {
      if (x < 0 || x >= COLS || y < 0 || y >= ROWS || maze[y][x] !== FLOOR) continue;
      const path = pathTo(origin, { x, y });
      const holeDistance = nearestHoleDistance(x + 0.5, y + 0.5);
      const exitDistance = distance({ x, y }, exitCell);
      const score = holeDistance * 2.2 - path.length * 0.22 - exitDistance * 0.025;
      if (score > bestScore) {
        best = { x, y };
        bestScore = score;
      }
    }
  }

  return best;
}

function holeRepelVector(player, config) {
  if (player.spinach > 0) return { x: 0, y: 0 };

  const vector = { x: 0, y: 0 };
  for (const hole of holes) {
    const dx = player.x - hole.x;
    const dy = player.y - hole.y;
    const d = Math.hypot(dx, dy) || 0.01;
    if (d > config.dangerRadius) continue;
    const freezeScale = hole.frozen > 0 ? 0.55 : 1;
    const strength = ((config.dangerRadius - d) / config.dangerRadius) * config.dangerWeight * freezeScale;
    vector.x += (dx / d) * strength;
    vector.y += (dy / d) * strength;
  }
  return vector;
}

function nearestHoleDistance(x, y) {
  let best = Infinity;
  for (const hole of holes) {
    best = Math.min(best, Math.hypot(x - hole.x, y - hole.y));
  }
  return best;
}

function reachedTargetCell(player, target) {
  return target && Math.hypot(player.x - (target.x + 0.5), player.y - (target.y + 0.5)) < 0.3;
}

function entityCell(entity) {
  return {
    x: Math.floor(entity.x),
    y: Math.floor(entity.y),
  };
}

function slide(player, x, y, dx, dy) {
  const radius = player.radius;
  const nx = x + dx;
  const ny = y + dy;
  const samples = [
    { x: nx - radius, y: ny - radius },
    { x: nx + radius, y: ny - radius },
    { x: nx - radius, y: ny + radius },
    { x: nx + radius, y: ny + radius },
  ];
  if (samples.every((point) => isFloor(point.x, point.y))) return { x: nx, y: ny };
  return { x, y };
}

function isFloor(x, y) {
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  return cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS && maze[cy][cx] === FLOOR;
}

function collectItems(player) {
  for (const item of items) {
    if (item.taken || Math.hypot(player.x - item.x, player.y - item.y) > ITEM_PICKUP_RADIUS) continue;
    item.taken = true;
    if (item.type === "spinach") player.spinach = 7;
    if (item.type === "carrot") player.carrot = 6;
    if (item.type === "poop") player.poop = 5;
    if (item.type === "wine") player.drunk = DRUNK_SECONDS;
    if (item.type === "ice") freezeNearestHole(player);
  }
}

function reviveDeadPlayers() {
  for (const rescuer of activePlayers()) {
    for (const fallen of deadPlayers()) {
      if (Math.hypot(rescuer.x - fallen.x, rescuer.y - fallen.y) > REVIVE_RADIUS) continue;
      fallen.state = "active";
      fallen.spinach = REVIVE_SPINACH_SECONDS;
      fallen.carrot = 0;
      fallen.poop = 0;
      fallen.drunk = 0;
      fallen.x = rescuer.x;
      fallen.y = rescuer.y;
    }
  }
}

function moveHoles(dt) {
  for (const hole of holes) {
    if (hole.frozen > 0) {
      hole.frozen = Math.max(0, hole.frozen - dt);
      continue;
    }
    if (hole.stunned > 0) {
      hole.stunned -= dt;
      continue;
    }
    const targetPlayer = nearestActivePlayer(hole);
    if (!targetPlayer) continue;
    const target = { x: Math.floor(targetPlayer.x), y: Math.floor(targetPlayer.y) };
    hole.recalc -= dt;
    if (hole.recalc <= 0) {
      hole.path = pathTo({ x: Math.floor(hole.x), y: Math.floor(hole.y) }, target);
      hole.recalc = 0.28 + Math.random() * 0.16;
    }
    const next = hole.path[1] || target;
    const tx = next.x + 0.5;
    const ty = next.y + 0.5;
    const dx = tx - hole.x;
    const dy = ty - hole.y;
    const len = Math.hypot(dx, dy);
    if (len > 0.02) {
      const step = Math.min(len, hole.speed * dt);
      hole.x += (dx / len) * step;
      hole.y += (dy / len) * step;
    }
  }
}

function nearestActivePlayer(from) {
  let nearest = null;
  let nearestDistance = Infinity;
  for (const player of activePlayers()) {
    const currentDistance = Math.hypot(player.x - from.x, player.y - from.y);
    if (currentDistance < nearestDistance) {
      nearest = player;
      nearestDistance = currentDistance;
    }
  }
  return nearest;
}

function freezeNearestHole(player) {
  let nearest = null;
  let nearestDistance = Infinity;
  for (const hole of holes) {
    const currentDistance = Math.hypot(player.x - hole.x, player.y - hole.y);
    if (currentDistance < nearestDistance) {
      nearest = hole;
      nearestDistance = currentDistance;
    }
  }
  if (!nearest) return;
  nearest.frozen = FREEZE_SECONDS;
  nearest.stunned = 0;
  nearest.recalc = 0;
  nearest.path = [];
}

function pathTo(start, target) {
  if (!isFloor(start.x + 0.5, start.y + 0.5) || !isFloor(target.x + 0.5, target.y + 0.5)) return [start];
  const cameFrom = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  const queue = [start];
  cameFrom[start.y][start.x] = start;
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i];
    if (cell.x === target.x && cell.y === target.y) break;
    for (const next of neighbors(cell)) {
      if (!cameFrom[next.y][next.x]) {
        cameFrom[next.y][next.x] = cell;
        queue.push(next);
      }
    }
  }
  if (!cameFrom[target.y][target.x]) return [start];
  const path = [target];
  let current = target;
  while (current.x !== start.x || current.y !== start.y) {
    current = cameFrom[current.y][current.x];
    path.push(current);
  }
  return path.reverse();
}

function checkEndings() {
  for (const hole of holes) {
    for (const player of activePlayers()) {
      const hit = Math.hypot(player.x - hole.x, player.y - hole.y) < hole.radius + player.radius * 0.95;
      if (!hit) continue;
      if (player.spinach > 0) {
        const dx = hole.x - player.x || 0.01;
        const dy = hole.y - player.y || 0.01;
        const len = Math.hypot(dx, dy);
        const pushedX = hole.x + (dx / len) * 0.9;
        const pushedY = hole.y + (dy / len) * 0.9;
        if (isFloor(pushedX, pushedY)) {
          hole.x = pushedX;
          hole.y = pushedY;
        }
        hole.stunned = 1.15;
        hole.recalc = 0;
        hole.path = [];
      } else {
        player.state = "dead";
        player.spinach = 0;
        player.carrot = 0;
        player.poop = 0;
        player.drunk = 0;
      }
    }
  }

  for (const player of activePlayers()) {
    if (Math.hypot(player.x - (exitCell.x + 0.5), player.y - (exitCell.y + 0.5)) < 0.62) {
      player.state = "escaped";
      player.x = exitCell.x + 0.5;
      player.y = exitCell.y + 0.5;
      player.spinach = 0;
      player.carrot = 0;
      player.poop = 0;
      player.drunk = 0;
    }
  }

  const activeCount = activePlayers().length;
  const escapedCount = players.filter((player) => player.state === "escaped").length;
  if (activeCount === 0 && escapedCount > 0) {
    state = "won";
    statusText.textContent = escapedCount === players.length ? "全部逃出去了" : "倖存者逃出去了";
    overlayTitle.textContent = escapedCount === players.length ? "全部逃出去了" : "倖存者逃出去了";
    startBtn.textContent = "再玩一次";
    overlay.classList.remove("hidden");
  } else if (activeCount === 0) {
    state = "dead";
    statusText.textContent = "全員掉下去了";
    overlayTitle.textContent = "全員掉下去了";
    startBtn.textContent = "再逃一次";
    overlay.classList.remove("hidden");
  }
}

function updateHud() {
  iceTimer.textContent = Math.max(0, ...holes.map((hole) => hole.frozen)).toFixed(1);
  players.forEach((player, index) => {
    playerHud[index].state.textContent = playerStatus(player);
    playerHud[index].effects.textContent = playerEffects(player);
  });
  if (state === "playing") {
    const escapedCount = players.filter((player) => player.state === "escaped").length;
    const deadCount = players.filter((player) => player.state === "dead").length;
    statusText.textContent = `逃出 ${escapedCount} / 陣亡 ${deadCount}`;
  }
}

function playerStatus(player) {
  if (state === "ready") return "準備";
  if (player.state === "escaped") return "逃出";
  if (player.state === "dead") return "陣亡";
  if (player.drunk > 0) return "反向中";
  if (player.spinach > 0) return "長大中";
  if (player.carrot > 0) return "加速中";
  if (player.poop > 0) return "變慢中";
  return "逃跑中";
}

function playerEffects(player) {
  if (state === "ready") return player.isAi ? `AI ${aiDifficultyText()}` : `人類 ${player.controlText}`;
  if (player.state === "escaped") return "已到出口";
  if (player.state === "dead") return "碰到即可復活";

  const effects = [];
  if (player.spinach > 0) effects.push(`菠菜 ${player.spinach.toFixed(1)}`);
  if (player.carrot > 0) effects.push(`蘿蔔 ${player.carrot.toFixed(1)}`);
  if (player.poop > 0) effects.push(`大便 ${player.poop.toFixed(1)}`);
  if (player.drunk > 0) effects.push(`酒杯 ${player.drunk.toFixed(1)}`);
  return effects.length ? effects.join(" / ") : "無效果";
}

function draw() {
  if (!maze || !cellSize) return;
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.fillStyle = "#111418";
  ctx.fillRect(0, 0, rect.width, rect.height);
  drawMaze();
  drawExit();
  for (const item of items) drawItem(item);
  for (const hole of holes) drawHole(hole);
  for (const player of players) drawPlayer(player);
}

function drawMaze() {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const px = offsetX + x * cellSize;
      const py = offsetY + y * cellSize;
      if (maze[y][x] === WALL) {
        ctx.fillStyle = "#3e4a4f";
        ctx.fillRect(px, py, cellSize + 0.5, cellSize + 0.5);
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.fillRect(px + 2, py + 2, cellSize - 4, 2);
      } else {
        ctx.fillStyle = "#d8cfae";
        ctx.fillRect(px, py, cellSize + 0.5, cellSize + 0.5);
        if ((x + y) % 2 === 0) {
          ctx.fillStyle = "rgba(80, 71, 55, 0.08)";
          ctx.fillRect(px + cellSize * 0.22, py + cellSize * 0.22, cellSize * 0.08, cellSize * 0.08);
        }
      }
    }
  }
}

function drawExit() {
  const x = toPx(exitCell.x + 0.5);
  const y = toPy(exitCell.y + 0.5);
  const pulseSize = 1 + Math.sin(pulse * 6) * 0.08;
  const r = cellSize * 0.72;
  ctx.fillStyle = "rgba(244, 241, 231, 0.28)";
  ctx.beginPath();
  ctx.arc(x, y, r * pulseSize, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#34d399";
  ctx.fillRect(x - r * 0.64, y - r * 0.64, r * 1.28, r * 1.28);

  ctx.strokeStyle = "#f4f1e7";
  ctx.lineWidth = Math.max(2, cellSize * 0.12);
  ctx.strokeRect(x - r * 0.64, y - r * 0.64, r * 1.28, r * 1.28);

  ctx.fillStyle = "#0d2f23";
  ctx.font = `700 ${Math.max(10, cellSize * 0.42)}px "Microsoft JhengHei", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("出口", x, y - r * 0.16);

  ctx.fillStyle = "#f4f1e7";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.28, y + r * 0.24);
  ctx.lineTo(x + r * 0.22, y + r * 0.24);
  ctx.lineTo(x + r * 0.22, y + r * 0.06);
  ctx.lineTo(x + r * 0.48, y + r * 0.32);
  ctx.lineTo(x + r * 0.22, y + r * 0.58);
  ctx.lineTo(x + r * 0.22, y + r * 0.4);
  ctx.lineTo(x - r * 0.28, y + r * 0.4);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#0d2f23";
  ctx.lineWidth = Math.max(1, cellSize * 0.05);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.78, -0.15 * Math.PI, 1.15 * Math.PI);
  ctx.stroke();
}

function drawPlayer(player) {
  const x = toPx(player.x);
  const y = toPy(player.y);
  const scale = player.spinach > 0 ? PLAYER_SPINACH_SCALE + Math.sin(pulse * 9) * 0.05 : 1;
  const r = cellSize * player.radius * scale;
  ctx.globalAlpha = player.state === "dead" ? 0.48 : 1;
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  if (player.spinach > 0) {
    ctx.strokeStyle = "#62c45f";
    ctx.lineWidth = Math.max(3, r * 0.18);
    ctx.beginPath();
    ctx.arc(x, y, r + ctx.lineWidth * 0.6, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.arc(x - r * 0.32, y - r * 0.18, r * 0.12, 0, Math.PI * 2);
  ctx.arc(x + r * 0.32, y - r * 0.18, r * 0.12, 0, Math.PI * 2);
  ctx.fill();

  if (player.state === "dead") {
    ctx.strokeStyle = "#111418";
    ctx.lineWidth = Math.max(2, r * 0.16);
    ctx.beginPath();
    ctx.moveTo(x - r * 0.36, y + r * 0.28);
    ctx.lineTo(x + r * 0.36, y - r * 0.28);
    ctx.moveTo(x + r * 0.36, y + r * 0.28);
    ctx.lineTo(x - r * 0.36, y - r * 0.28);
    ctx.stroke();
  } else if (player.state === "escaped") {
    ctx.strokeStyle = "#0d2f23";
    ctx.lineWidth = Math.max(2, r * 0.16);
    ctx.beginPath();
    ctx.moveTo(x - r * 0.36, y + r * 0.03);
    ctx.lineTo(x - r * 0.1, y + r * 0.32);
    ctx.lineTo(x + r * 0.42, y - r * 0.28);
    ctx.stroke();
  } else {
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = Math.max(2, r * 0.13);
    ctx.beginPath();
    ctx.arc(x, y + r * 0.04, r * 0.42, 0.12 * Math.PI, 0.88 * Math.PI);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  if (player.state === "dead") {
    ctx.strokeStyle = "#f4f1e7";
    ctx.lineWidth = Math.max(2, cellSize * 0.06);
    ctx.beginPath();
    ctx.arc(x, y, r * (1.55 + Math.sin(pulse * 7) * 0.08), 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#f4f1e7";
    ctx.font = `700 ${Math.max(10, cellSize * 0.32)}px "Microsoft JhengHei", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("救", x, y + r * 1.45);
  }
  ctx.fillStyle = "#111418";
  ctx.strokeStyle = "#f4f1e7";
  ctx.lineWidth = Math.max(2, cellSize * 0.05);
  ctx.font = `700 ${Math.max(10, cellSize * 0.34)}px "Microsoft JhengHei", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeText(player.label, x, y - r * 1.55);
  ctx.fillText(player.label, x, y - r * 1.55);
}

function drawHole(hole) {
  const x = toPx(hole.x);
  const y = toPy(hole.y);
  const r = cellSize * hole.radius * (1 + Math.sin(pulse * 8 + hole.x) * 0.07);
  if (hole.frozen > 0) {
    ctx.fillStyle = "rgba(125, 211, 252, 0.34)";
    ctx.strokeStyle = "#e0f7ff";
    ctx.lineWidth = Math.max(2, cellSize * 0.08);
    ctx.beginPath();
    roundedRectPath(ctx, x - r * 1.35, y - r * 1.35, r * 2.7, r * 2.7, r * 0.35);
    ctx.fill();
    ctx.stroke();
  }
  const gradient = ctx.createRadialGradient(x, y, r * 0.15, x, y, r * 1.45);
  gradient.addColorStop(0, "#000000");
  gradient.addColorStop(0.55, "#0b0b0e");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = hole.frozen > 0 ? "#7dd3fc" : hole.stunned > 0 ? "#8be28a" : "#2d2d34";
  ctx.lineWidth = Math.max(2, cellSize * 0.08);
  ctx.beginPath();
  ctx.arc(x, y, r, pulse * 4, pulse * 4 + Math.PI * 1.55);
  ctx.stroke();
}

function drawItem(item) {
  if (item.taken) return;
  const x = toPx(item.x);
  const y = toPy(item.y) + Math.sin(pulse * 4 + item.bob) * cellSize * 0.05;
  const s = cellSize * ITEM_DRAW_SCALE;

  if (item.type === "spinach") {
    ctx.fillStyle = "#2f944f";
    ctx.beginPath();
    ctx.ellipse(x - s * 0.13, y, s * 0.22, s * 0.38, -0.75, 0, Math.PI * 2);
    ctx.ellipse(x + s * 0.13, y, s * 0.22, s * 0.38, 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#d7f2c2";
    ctx.lineWidth = Math.max(1, s * 0.04);
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.32);
    ctx.lineTo(x, y - s * 0.28);
    ctx.stroke();
  }

  if (item.type === "carrot") {
    ctx.fillStyle = "#ef6f2d";
    ctx.beginPath();
    ctx.moveTo(x - s * 0.22, y - s * 0.22);
    ctx.lineTo(x + s * 0.24, y);
    ctx.lineTo(x - s * 0.22, y + s * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#4fac58";
    ctx.fillRect(x - s * 0.34, y - s * 0.16, s * 0.18, s * 0.32);
  }

  if (item.type === "poop") {
    ctx.fillStyle = "#7a4b2a";
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.16, s * 0.34, s * 0.18, 0, 0, Math.PI * 2);
    ctx.ellipse(x, y - s * 0.02, s * 0.25, s * 0.16, 0, 0, Math.PI * 2);
    ctx.ellipse(x + s * 0.06, y - s * 0.18, s * 0.14, s * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (item.type === "wine") {
    ctx.strokeStyle = "#f4f1e7";
    ctx.lineWidth = Math.max(2, s * 0.07);
    ctx.beginPath();
    ctx.moveTo(x - s * 0.2, y - s * 0.3);
    ctx.lineTo(x + s * 0.2, y - s * 0.3);
    ctx.lineTo(x + s * 0.12, y + s * 0.05);
    ctx.quadraticCurveTo(x, y + s * 0.18, x - s * 0.12, y + s * 0.05);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = "#b91c1c";
    ctx.beginPath();
    ctx.moveTo(x - s * 0.13, y - s * 0.03);
    ctx.quadraticCurveTo(x, y + s * 0.1, x + s * 0.13, y - s * 0.03);
    ctx.lineTo(x + s * 0.1, y + s * 0.03);
    ctx.quadraticCurveTo(x, y + s * 0.14, x - s * 0.1, y + s * 0.03);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#f4f1e7";
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.16);
    ctx.lineTo(x, y + s * 0.34);
    ctx.moveTo(x - s * 0.18, y + s * 0.34);
    ctx.lineTo(x + s * 0.18, y + s * 0.34);
    ctx.stroke();
  }

  if (item.type === "ice") {
    const g = ctx.createLinearGradient(x - s * 0.34, y - s * 0.34, x + s * 0.34, y + s * 0.34);
    g.addColorStop(0, "#e0f7ff");
    g.addColorStop(0.52, "#7dd3fc");
    g.addColorStop(1, "#38bdf8");
    ctx.fillStyle = g;
    ctx.strokeStyle = "#f4fbff";
    ctx.lineWidth = Math.max(2, s * 0.06);
    ctx.beginPath();
    roundedRectPath(ctx, x - s * 0.34, y - s * 0.34, s * 0.68, s * 0.68, s * 0.1);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
    ctx.lineWidth = Math.max(1, s * 0.04);
    ctx.beginPath();
    ctx.moveTo(x - s * 0.2, y - s * 0.04);
    ctx.lineTo(x + s * 0.05, y - s * 0.22);
    ctx.moveTo(x - s * 0.08, y + s * 0.2);
    ctx.lineTo(x + s * 0.22, y + s * 0.02);
    ctx.stroke();
  }
}

function roundedRectPath(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
}

function toPx(x) {
  return offsetX + x * cellSize;
}

function toPy(y) {
  return offsetY + y * cellSize;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

const controlKeys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "]);

document.addEventListener("keydown", (event) => {
  if (event.target?.tagName === "SELECT") return;
  if (controlKeys.has(event.key)) event.preventDefault();
  keys.add(event.key);
  if (event.key === " " && state !== "playing") resetGame(true);
}, { capture: true });

document.addEventListener("keyup", (event) => {
  if (event.target?.tagName === "SELECT") return;
  if (controlKeys.has(event.key)) event.preventDefault();
  keys.delete(event.key);
}, { capture: true });

for (const button of document.querySelectorAll(".touch-btn")) {
  const dir = button.dataset.dir;
  const press = (event) => {
    event.preventDefault();
    touchDirs.add(dir);
  };
  const release = (event) => {
    event.preventDefault();
    touchDirs.delete(dir);
  };
  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointerleave", release);
  button.addEventListener("pointercancel", release);
}

for (const select of [playerCountSelect, aiDifficultySelect, ...playerModeSelects]) {
  select.addEventListener("change", () => {
    syncSetupVisibility();
    saveSettings();
    if (state === "ready") resetGame(false);
  });
}

startBtn.addEventListener("click", () => {
  overlayTitle.textContent = `${currentPlayerCount()}人迷宮逃生`;
  startBtn.textContent = "開始";
  resetGame(true);
});

restartBtn.addEventListener("click", () => resetGame(true));
window.addEventListener("resize", resizeCanvas);

loadSettings();
resetGame(false);
resizeCanvas();
requestAnimationFrame(gameLoop);
