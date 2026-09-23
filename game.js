const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const TILE = 32;
const AS = "assets/";
const img = {};
const files = {
  tileset: "tileset.png",
  chicken: "chicken.png",
  cow: "cow.png",
  sheep: "sheep.png",
  duck: "duck.png",
  pig: "pig.png",
  walk_boy: "walk_boy.png",
  walk_girl: "walk_girl.png",
  idle_boy: "idle_boy.png",
  idle_girl: "idle_girl.png",
  windmill: "windmill.png",
  tree: "tree.png",
  house: "house.png",
  water: "water.png",
  cab0: "crops/cabbage_00.png",
  cab1: "crops/cabbage_02.png",
  cab2: "crops/cabbage_05.png",
  car0: "crops/carrot_00.png",
  car1: "crops/carrot_02.png",
  car2: "crops/carrot_05.png",
  kal0: "crops/kale_00.png",
  kal1: "crops/kale_02.png",
  kal2: "crops/kale_05.png"
};

const state = {
  screen: "select",
  gender: "boy",
  lv: 1,
  xp: 8,
  pt: 480,
  tool: "cabbage",
  keys: {},
  cam: { x: 0, y: 0 },
  time: 0,
  player: { x: 12 * TILE, y: 10 * TILE, vx: 0, vy: 0, frame: 0, moving: false },
  plots: [],
  animals: [],
  inv: { cabbage: 2, carrot: 2, kale: 1, fish: 0 }
};

function loadImages() {
  return Promise.all(
    Object.entries(files).map(([k, src]) => {
      const i = new Image();
      img[k] = i;
      return new Promise((res) => {
        i.onload = res;
        i.onerror = res;
        i.src = AS + src;
      });
    })
  );
}

function makeWorld() {
  state.plots = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 6; c++) {
      state.plots.push({
        x: (8 + c) * TILE,
        y: (7 + r) * TILE,
        locked: !(c < 3 && r < 3),
        crop: "",
        stage: 0
      });
    }
  }
  const kinds = ["chicken", "cow", "sheep", "duck", "pig", "chicken", "sheep"];
  state.animals = kinds.map((k, i) => ({
    k,
    x: 6 * TILE + i * 28,
    y: 14 * TILE + (i % 3) * 18,
    dx: Math.random() * 0.4 - 0.2,
    dy: Math.random() * 0.4 - 0.2,
    frame: 0
  }));
}

function ready(im) {
  return im && im.complete && im.naturalWidth > 0;
}

function drawTile(sx, sy, dx, dy) {
  if (!ready(img.tileset)) {
    ctx.fillStyle = "#6db23a";
    ctx.fillRect(dx, dy, TILE, TILE);
    return;
  }
  ctx.drawImage(img.tileset, sx, sy, 16, 16, dx, dy, TILE, TILE);
}

function drawWorld() {
  const cols = Math.ceil(canvas.width / TILE) + 2;
  const rows = Math.ceil(canvas.height / TILE) + 2;
  const ox = Math.floor(state.cam.x / TILE);
  const oy = Math.floor(state.cam.y / TILE);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const gx = ox + x;
      const gy = oy + y;
      const dx = gx * TILE - state.cam.x;
      const dy = gy * TILE - state.cam.y;
      const grass = (gx + gy) % 3 === 0 ? [32, 32] : [16, 16];
      drawTile(grass[0], grass[1], dx, dy);
      if (gy === 11 && gx >= 6 && gx <= 16) drawTile(176, 48, dx, dy);
    }
  }
  if (ready(img.house)) {
    ctx.drawImage(img.house, 4 * TILE - state.cam.x, 3 * TILE - state.cam.y, 192, 128);
  }
  if (ready(img.water)) {
    ctx.drawImage(img.water, 16 * TILE - state.cam.x, 4 * TILE - state.cam.y, 96, 96);
  }
  const millX = 18 * TILE - state.cam.x;
  const millY = 4 * TILE - state.cam.y;
  const mf = Math.floor(state.time / 8) % 9;
  if (ready(img.windmill)) {
    ctx.drawImage(img.windmill, mf * 112, 0, 112, 112, millX, millY, 112, 112);
  }
  const treeSpots = [[3,2],[5,2],[7,2],[9,2],[11,2],[13,2],[3,16],[5,17],[20,15],[22,6]];
  treeSpots.forEach(([tx, ty], i) => {
    if (!ready(img.tree)) return;
    const tf = Math.floor(state.time / 16 + i) % 4;
    ctx.drawImage(img.tree, tf * 32, 0, 32, 34, tx * TILE - state.cam.x, ty * TILE - state.cam.y, 48, 51);
  });
  state.plots.forEach((p) => {
    const dx = p.x - state.cam.x;
    const dy = p.y - state.cam.y;
    ctx.fillStyle = p.locked ? "#6b7a3a" : "#8b5a2b";
    ctx.fillRect(dx + 2, dy + 2, TILE - 4, TILE - 4);
    if (p.locked) {
      ctx.fillStyle = "rgba(40,50,20,.45)";
      ctx.fillRect(dx, dy, TILE, TILE);
      ctx.fillStyle = "#fff";
      ctx.font = "10px sans-serif";
      ctx.fillText("WILD", dx + 2, dy + 20);
    } else if (p.crop) {
      const key = p.crop.slice(0, 3) + p.stage;
      const spr = img[key];
      if (spr) ctx.drawImage(spr, dx + 6, dy + 2, 20, 24);
    }
  });
}

function drawAnimals() {
  state.animals.forEach((a) => {
    const sheet = img[a.k];
    if (!ready(sheet)) return;
    const fw = sheet.width / 4;
    const fh = sheet.height;
    const f = Math.floor(a.frame) % 4;
    const scale = a.k === "duck" ? 2.4 : 2;
    ctx.drawImage(sheet, f * fw, 0, fw, fh, a.x - state.cam.x, a.y - state.cam.y, fw * scale, fh * scale);
  });
}

function drawPlayer() {
  const p = state.player;
  const moving = p.moving;
  const sheet = moving ? img["walk_" + state.gender] : img["idle_" + state.gender];
  if (!ready(sheet)) {
    ctx.fillStyle = "#3a7a3a";
    ctx.fillRect(p.x - state.cam.x, p.y - state.cam.y, 24, 40);
    return;
  }
  const frames = moving ? 8 : 9;
  const fw = sheet.width / frames;
  const fh = sheet.height;
  const f = Math.floor(p.frame) % frames;
  ctx.save();
  if (p.vx < 0) {
    ctx.translate(p.x - state.cam.x + fw, p.y - state.cam.y);
    ctx.scale(-1, 1);
    ctx.drawImage(sheet, f * fw, 0, fw, fh, 0, 0, fw, fh);
  } else {
    ctx.drawImage(sheet, f * fw, 0, fw, fh, p.x - state.cam.x, p.y - state.cam.y, fw, fh);
  }
  ctx.restore();
}

function nightTint() {
  const t = (Math.sin(state.time / 400) + 1) / 2;
  if (t > 0.55) {
    ctx.fillStyle = "rgba(8,12,36," + ((t - 0.55) / 0.45) * 0.35 + ")";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function hud() {
  document.getElementById("stats").innerHTML =
    "PAWLY ESTATE FARM · Lv" + state.lv + " · " + Math.min(state.xp, 100) + "/100 · PT " + state.pt +
    "<br>Barn cabbage " + state.inv.cabbage + " carrot " + state.inv.carrot + " kale " + state.inv.kale + " fish " + state.inv.fish + " · WASD move · click plots";
}

function setTools() {
  const box = document.getElementById("tools");
  box.innerHTML = "";
  [["cabbage", "Plant cabbage"],["carrot", "Plant carrot"],["kale", "Plant kale"],["harvest", "Harvest"],["fish", "Fish"],["expand", "Clear land 80 PT"]].forEach(([id, label]) => {
    const b = document.createElement("button");
    b.textContent = label;
    if (state.tool === id) b.classList.add("on");
    b.onclick = () => { state.tool = id; setTools(); };
    box.appendChild(b);
  });
}

function addXp(n) {
  state.xp += n;
  while (state.xp >= 100 && state.lv < 99) {
    const fee = state.lv < 5 ? 50 : state.lv < 15 ? 100 : state.lv < 30 ? 180 : 360;
    if (state.pt < fee) { state.xp = 100; break; }
    state.pt -= fee;
    state.xp -= 100;
    state.lv += 1;
  }
}

function tick() {
  if (state.screen !== "play") return;
  state.time += 1;
  const p = state.player;
  p.vx = (state.keys.ArrowRight || state.keys.d || state.keys.D ? 1 : 0) - (state.keys.ArrowLeft || state.keys.a || state.keys.A ? 1 : 0);
  p.vy = (state.keys.ArrowDown || state.keys.s || state.keys.S ? 1 : 0) - (state.keys.ArrowUp || state.keys.w || state.keys.W ? 1 : 0);
  p.moving = p.vx !== 0 || p.vy !== 0;
  if (p.moving) {
    const len = Math.hypot(p.vx, p.vy) || 1;
    p.x += (p.vx / len) * 2.2;
    p.y += (p.vy / len) * 2.2;
    p.frame += 0.18;
  } else {
    p.frame += 0.08;
  }
  state.cam.x = p.x - canvas.width / 2 + 48;
  state.cam.y = p.y - canvas.height / 2 + 32;
  state.animals.forEach((a) => {
    a.x += a.dx; a.y += a.dy; a.frame += 0.12;
    if (Math.random() < 0.01) { a.dx = Math.random() * 0.5 - 0.25; a.dy = Math.random() * 0.5 - 0.25; }
    if (a.x < 4 * TILE || a.x > 22 * TILE) a.dx *= -1;
    if (a.y < 8 * TILE || a.y > 18 * TILE) a.dy *= -1;
  });
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawWorld(); drawAnimals(); drawPlayer(); nightTint(); hud();
  requestAnimationFrame(tick);
}

canvas.addEventListener("click", (ev) => {
  if (state.screen !== "play") return;
  const r = canvas.getBoundingClientRect();
  const x = ((ev.clientX - r.left) / r.width) * canvas.width + state.cam.x;
  const y = ((ev.clientY - r.top) / r.height) * canvas.height + state.cam.y;
  if (Math.hypot(x - 19 * TILE, y - 6 * TILE) < 70 && state.tool === "fish") {
    state.inv.fish += 1; addXp(3); return;
  }
  const plot = state.plots.find((p) => x >= p.x && x < p.x + TILE && y >= p.y && y < p.y + TILE);
  if (!plot) return;
  if (plot.locked) {
    if (state.tool === "expand" && state.lv >= 15 && state.pt >= 80) { state.pt -= 80; plot.locked = false; }
    return;
  }
  if (state.tool === "harvest" || plot.stage >= 2) {
    if (plot.crop && plot.stage >= 2) { state.inv[plot.crop] += 1; addXp(4); plot.crop = ""; plot.stage = 0; }
    return;
  }
  if (["cabbage", "carrot", "kale"].includes(state.tool) && !plot.crop) { plot.crop = state.tool; plot.stage = 2; }
});

window.addEventListener("keydown", (e) => { state.keys[e.key] = true; });
window.addEventListener("keyup", (e) => { state.keys[e.key] = false; });

document.querySelectorAll("#select button").forEach((b) => {
  b.onclick = () => {
    state.gender = b.dataset.g;
    document.getElementById("select").style.display = "none";
    state.screen = "play";
    setTools();
    tick();
  };
});

function fit() {
  canvas.width = Math.min(1280, window.innerWidth);
  canvas.height = Math.min(720, window.innerHeight);
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener("resize", fit);
fit();
makeWorld();
loadImages().finally(() => {
  const boot = document.getElementById("boot");
  if (boot) boot.style.display = "none";
});
