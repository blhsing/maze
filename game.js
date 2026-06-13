const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const statusText = document.querySelector("#statusText");
const spinachTimer = document.querySelector("#spinachTimer");
const carrotTimer = document.querySelector("#carrotTimer");
const poopTimer = document.querySelector("#poopTimer");
const wineTimer = document.querySelector("#wineTimer");
const iceTimer = document.querySelector("#iceTimer");
const overlay = document.querySelector("#overlay");
const startBtn = document.querySelector("#startBtn");
const restartBtn = document.querySelector("#restartBtn");

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
const keys = new Set();
const touchDirs = new Set();

let maze;
let cellSize;
let offsetX;
let offsetY;
let player;
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
  maze = makeMaze();
  exitCell = farthestCell({ x: 1, y: 1 });
  maze[exitCell.y][exitCell.x] = FLOOR;
  player = {
    x: 1.7,
    y: 1.7,
    radius: PLAYER_RADIUS,
    spinach: 0,
    carrot: 0,
    poop: 0,
    drunk: 0,
  };
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
  player.spinach = Math.max(0, player.spinach - dt);
  player.carrot = Math.max(0, player.carrot - dt);
  player.poop = Math.max(0, player.poop - dt);
  player.drunk = Math.max(0, player.drunk - dt);

  movePlayer(dt);
  collectItems();
  moveHoles(dt);
  checkEndings();
  updateHud();
}

function movePlayer(dt) {
  const intent = inputVector();
  const len = Math.hypot(intent.x, intent.y) || 1;
  const boost = player.carrot > 0 ? 1.55 : 1;
  const drag = player.poop > 0 ? 0.55 : 1;
  const speed = 4.25 * boost * drag;
  const vx = (intent.x / len) * speed * dt;
  const vy = (intent.y / len) * speed * dt;
  if (intent.x !== 0) player.x = slide(player.x, player.y, vx, 0).x;
  if (intent.y !== 0) player.y = slide(player.x, player.y, 0, vy).y;
}

function inputVector() {
  const left = keys.has("ArrowLeft") || keys.has("a") || keys.has("A") || touchDirs.has("left");
  const right = keys.has("ArrowRight") || keys.has("d") || keys.has("D") || touchDirs.has("right");
  const up = keys.has("ArrowUp") || keys.has("w") || keys.has("W") || touchDirs.has("up");
  const down = keys.has("ArrowDown") || keys.has("s") || keys.has("S") || touchDirs.has("down");
  const vector = {
    x: Number(right) - Number(left),
    y: Number(down) - Number(up),
  };
  if (player.drunk > 0) {
    vector.x *= -1;
    vector.y *= -1;
  }
  return vector;
}

function slide(x, y, dx, dy) {
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

function collectItems() {
  for (const item of items) {
    if (item.taken || Math.hypot(player.x - item.x, player.y - item.y) > ITEM_PICKUP_RADIUS) continue;
    item.taken = true;
    if (item.type === "spinach") player.spinach = 7;
    if (item.type === "carrot") player.carrot = 6;
    if (item.type === "poop") player.poop = 5;
    if (item.type === "wine") player.drunk = DRUNK_SECONDS;
    if (item.type === "ice") freezeNearestHole();
  }
}

function moveHoles(dt) {
  const target = { x: Math.floor(player.x), y: Math.floor(player.y) };
  for (const hole of holes) {
    if (hole.frozen > 0) {
      hole.frozen = Math.max(0, hole.frozen - dt);
      continue;
    }
    if (hole.stunned > 0) {
      hole.stunned -= dt;
      continue;
    }
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

function freezeNearestHole() {
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
      state = "dead";
      statusText.textContent = "掉下去了";
      overlay.querySelector("h1").textContent = "掉下去了";
      startBtn.textContent = "再逃一次";
      overlay.classList.remove("hidden");
    }
  }

  if (Math.hypot(player.x - (exitCell.x + 0.5), player.y - (exitCell.y + 0.5)) < 0.48) {
    state = "won";
    statusText.textContent = "逃出去了";
    overlay.querySelector("h1").textContent = "逃出去了";
    startBtn.textContent = "再玩一次";
    overlay.classList.remove("hidden");
  }
}

function updateHud() {
  spinachTimer.textContent = player.spinach.toFixed(1);
  carrotTimer.textContent = player.carrot.toFixed(1);
  poopTimer.textContent = player.poop.toFixed(1);
  wineTimer.textContent = player.drunk.toFixed(1);
  iceTimer.textContent = Math.max(0, ...holes.map((hole) => hole.frozen)).toFixed(1);
  if (state === "playing") {
    if (player.drunk > 0) statusText.textContent = "反向中";
    else if (player.spinach > 0) statusText.textContent = "長大中";
    else if (player.carrot > 0) statusText.textContent = "加速中";
    else if (player.poop > 0) statusText.textContent = "變慢中";
    else if (holes.some((hole) => hole.frozen > 0)) statusText.textContent = "冰凍中";
    else statusText.textContent = "逃跑中";
  }
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
  drawPlayer();
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

function drawPlayer() {
  const x = toPx(player.x);
  const y = toPy(player.y);
  const scale = player.spinach > 0 ? PLAYER_SPINACH_SCALE + Math.sin(pulse * 9) * 0.05 : 1;
  const r = cellSize * player.radius * scale;
  ctx.fillStyle = player.spinach > 0 ? "#62c45f" : "#f2c24b";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.arc(x - r * 0.32, y - r * 0.18, r * 0.12, 0, Math.PI * 2);
  ctx.arc(x + r * 0.32, y - r * 0.18, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = Math.max(2, r * 0.13);
  ctx.beginPath();
  ctx.arc(x, y + r * 0.04, r * 0.42, 0.12 * Math.PI, 0.88 * Math.PI);
  ctx.stroke();
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
  if (controlKeys.has(event.key)) event.preventDefault();
  keys.add(event.key);
  if (event.key === " " && state !== "playing") resetGame(true);
}, { capture: true });

document.addEventListener("keyup", (event) => {
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

startBtn.addEventListener("click", () => {
  overlay.querySelector("h1").textContent = "迷宮逃生";
  startBtn.textContent = "開始";
  resetGame(true);
});

restartBtn.addEventListener("click", () => resetGame(true));
window.addEventListener("resize", resizeCanvas);

resetGame(false);
resizeCanvas();
requestAnimationFrame(gameLoop);
