const world = document.getElementById("world");
const actors = document.getElementById("actors");
const ctx = world.getContext("2d");

const img = {};
const PNG = [
  "Water.png", "Water_2.png", "Grassy Island.png", "Grassy Floor.png",
  "Empty Soil.png", "Field.png", "1.png", "4.png", "8.png",
  "Big Tree_01.png", "Stump.png",
  "Horizontal Wooden Bridge.png", "Wooden Pier.png",
  "Wheat_Seed.png", "Wheat.png", "Wheat_02.png", "Wheat_03.png",
  "Tomato_Seed.png", "Tomato.png", "Tomato_02.png", "Tomato_03.png",
  "Corn Seed_01.png", "Corn.png", "Corn_02.png", "Corn_03.png",
  "Carrot.png", "Carrot_01.png", "Carrot_02.png", "Carrot_03.png",
  "Axe.png", "Fishing Rod.png", "Fish.png"
];

const CROPS = {
  wheat: ["Wheat_Seed.png", "Wheat.png", "Wheat_02.png", "Wheat_03.png"],
  tomato: ["Tomato_Seed.png", "Tomato.png", "Tomato_02.png", "Tomato_03.png"],
  corn: ["Corn Seed_01.png", "Corn.png", "Corn_02.png", "Corn_03.png"],
  carrot: ["Carrot.png", "Carrot_01.png", "Carrot_02.png", "Carrot_03.png"]
};

const SPINE_KIND = {
  boy: { json: "Bernard.json", atlas: "Bernard.atlas.txt", scale: 0.22, idle: "idle_Simple", walk: "walk", run: "run" },
  girl: { json: "Daisy.json", atlas: "Daisy.atlas.txt", scale: 0.22, idle: "idle_Simple", walk: "walk", run: "run" },
  chicken: { json: "Chicken.json", atlas: "Chicken.atlas.txt", scale: 0.16, idle: "Idle", walk: "Idle", eat: "Eating" },
  cow: { json: "Cow.json", atlas: "Cow.atlas.txt", scale: 0.18, idle: "Idle", walk: "Walk", eat: "Eating" },
  sheep: { json: "Sheep.json", atlas: "Sheep.atlas.txt", scale: 0.18, idle: "Idle", walk: "Walk", eat: "Eating" },
  goat: { json: "Goat.json", atlas: "Goat.atlas.txt", scale: 0.18, idle: "Idle", walk: "Walk", eat: "Eat" },
  pig: { json: "Pig.json", atlas: "Pig.atlas.txt", scale: 0.18, idle: "Idle", walk: "Walk", eat: "Eating" }
};

const state = {
  screen: "select",
  gender: "boy",
  lv: 1,
  xp: 0,
  pt: 500,
  tool: "wheat",
  keys: {},
  cam: { x: 0, y: 0 },
  time: 0,
  last: 0,
  player: { x: 520, y: 420, vx: 0, vy: 0, moving: false, facing: 1, anim: "" },
  target: null,
  plots: [],
  trees: [],
  animals: [],
  inv: { wheat: 2, tomato: 2, corn: 1, carrot: 1, wood: 0, fish: 0 }
};

let spineOk = false;
let scene = null;
let assetMgr = null;
const skeletons = {};

function loadPng(name) {
  return new Promise((res) => {
    const i = new Image();
    img[name] = i;
    i.onload = () => res(i);
    i.onerror = () => res(i);
    i.src = encodeURI(name);
  });
}

function ready(name) {
  const i = img[name];
  return i && i.complete && i.naturalWidth > 0;
}

function drawSpr(name, x, y, w, h) {
  if (!ready(name)) return;
  ctx.drawImage(img[name], x - state.cam.x, y - state.cam.y, w, h);
}

function makeWorld() {
  state.plots = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      state.plots.push({
        x: 380 + c * 54,
        y: 360 + r * 48,
        locked: !(c < 3 && r < 2),
        crop: "",
        stage: 0,
        grow: 0
      });
    }
  }
  state.trees = [
    { x: 220, y: 240, hp: 3 },
    { x: 280, y: 210, hp: 3 },
    { x: 820, y: 230, hp: 3 },
    { x: 880, y: 280, hp: 3 },
    { x: 200, y: 520, hp: 3 }
  ];
  state.animals = [
    { k: "chicken", x: 600, y: 500, dx: 0.4, dy: 0.1, anim: "" },
    { k: "chicken", x: 640, y: 530, dx: -0.3, dy: 0.2, anim: "" },
    { k: "cow", x: 720, y: 470, dx: 0.25, dy: 0, anim: "" },
    { k: "sheep", x: 500, y: 540, dx: -0.2, dy: 0.15, anim: "" },
    { k: "goat", x: 760, y: 520, dx: 0.2, dy: -0.1, anim: "" },
    { k: "pig", x: 560, y: 500, dx: 0.15, dy: 0.2, anim: "" }
  ];
}

function initSpine() {
  if (typeof spine === "undefined") return Promise.resolve(false);
  try {
    const gl = actors.getContext("webgl", { alpha: true, premultipliedAlpha: true });
    if (!gl) return Promise.resolve(false);
    scene = new spine.SceneRenderer(actors, gl);
    scene.camera.zoom = 1;
    assetMgr = new spine.AssetManager(gl, "");
    Object.values(SPINE_KIND).forEach((k) => {
      assetMgr.loadJson(k.json);
      assetMgr.loadTextureAtlas(k.atlas);
    });
    return new Promise((res) => {
      const wait = () => {
        if (assetMgr.isLoadingComplete()) {
          try {
            Object.entries(SPINE_KIND).forEach(([id, k]) => {
              const atlas = assetMgr.require(k.atlas);
              const json = assetMgr.require(k.json);
              const atlasLoader = new spine.AtlasAttachmentLoader(atlas);
              const skelJson = new spine.SkeletonJson(atlasLoader);
              skelJson.scale = k.scale;
              const data = skelJson.readSkeletonData(json);
              const skeleton = new spine.Skeleton(data);
              const anim = new spine.AnimationState(new spine.AnimationStateData(data));
              anim.data.defaultMix = 0.15;
              skeleton.setToSetupPose();
              skeletons[id] = { skeleton, anim, data, last: k.idle };
              setAnim(id, k.idle, true);
            });
            state.animals.forEach((a, i) => {
              const base = skeletons[a.k];
              if (!base) return;
              const skeleton = new spine.Skeleton(base.data);
              const anim = new spine.AnimationState(new spine.AnimationStateData(base.data));
              anim.data.defaultMix = 0.15;
              const nid = a.k + "_" + i;
              a.sid = nid;
              skeletons[nid] = { skeleton, anim, data: base.data, last: "" };
              setAnim(nid, SPINE_KIND[a.k].idle, true);
            });
            spineOk = true;
            res(true);
          } catch (err) {
            console.warn("spine parse", err);
            res(false);
          }
        } else {
          requestAnimationFrame(wait);
        }
      };
      wait();
    });
  } catch (err) {
    console.warn("spine init", err);
    return Promise.resolve(false);
  }
}

function setAnim(id, name, loop) {
  const s = skeletons[id];
  if (!s || !name) return;
  if (s.last === name) return;
  const found = s.data.findAnimation(name);
  if (!found) return;
  s.anim.setAnimation(0, name, loop);
  s.last = name;
}

function drawWorld() {
  const w = world.width;
  const h = world.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#1b6b9a";
  ctx.fillRect(0, 0, w, h);
  for (let y = -1; y < 8; y++) {
    for (let x = -1; x < 8; x++) {
      drawSpr("Water.png", x * 220, y * 180, 240, 200);
    }
  }
  drawSpr("Grassy Island.png", 80, 40, 980, 700);
  drawSpr("1.png", 160, 120, 220, 200);
  drawSpr("4.png", 820, 110, 200, 180);
  drawSpr("8.png", 300, 130, 160, 150);
  drawSpr("Horizontal Wooden Bridge.png", 40, 360, 160, 70);
  drawSpr("Wooden Pier.png", 900, 360, 160, 80);

  state.trees.forEach((t) => {
    if (t.hp <= 0) drawSpr("Stump.png", t.x, t.y + 40, 70, 50);
    else drawSpr("Big Tree_01.png", t.x, t.y, 110, 150);
  });

  state.plots.forEach((p) => {
    const dx = p.x - state.cam.x;
    const dy = p.y - state.cam.y;
    if (p.locked) {
      ctx.fillStyle = "rgba(20,30,10,.45)";
      ctx.fillRect(dx, dy, 50, 44);
      ctx.fillStyle = "#fff";
      ctx.font = "11px sans-serif";
      ctx.fillText("WILD", dx + 8, dy + 26);
      return;
    }
    drawSpr("Empty Soil.png", p.x, p.y, 50, 44);
    if (p.crop) {
      const stages = CROPS[p.crop];
      const spr = stages[Math.min(p.stage, stages.length - 1)];
      drawSpr(spr, p.x + 8, p.y - 6, 34, 42);
    }
  });
}

function nightTint() {
  const t = (Math.sin(state.time / 18) + 1) / 2;
  if (t > 0.55) {
    ctx.fillStyle = "rgba(8,12,40," + ((t - 0.55) / 0.45) * 0.38 + ")";
    ctx.fillRect(0, 0, world.width, world.height);
  }
}

function updateLogic(dt) {
  const p = state.player;
  let vx = (state.keys.ArrowRight || state.keys.d || state.keys.D ? 1 : 0) -
           (state.keys.ArrowLeft || state.keys.a || state.keys.A ? 1 : 0);
  let vy = (state.keys.ArrowDown || state.keys.s || state.keys.S ? 1 : 0) -
           (state.keys.ArrowUp || state.keys.w || state.keys.W ? 1 : 0);
  if (state.target) {
    const dx = state.target.x - p.x;
    const dy = state.target.y - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 8) state.target = null;
    else { vx = dx / dist; vy = dy / dist; }
  }
  const moving = Math.abs(vx) + Math.abs(vy) > 0;
  if (moving) {
    const len = Math.hypot(vx, vy) || 1;
    p.x += (vx / len) * 140 * dt;
    p.y += (vy / len) * 140 * dt;
    if (vx !== 0) p.facing = vx < 0 ? -1 : 1;
  }
  p.moving = moving;
  p.x = Math.max(160, Math.min(980, p.x));
  p.y = Math.max(180, Math.min(680, p.y));
  state.cam.x = p.x - world.width / 2;
  state.cam.y = p.y - world.height / 2;

  const farmer = state.gender === "girl" ? "girl" : "boy";
  const spec = SPINE_KIND[farmer];
  setAnim(farmer, moving ? spec.walk : spec.idle, true);

  state.animals.forEach((a) => {
    if (Math.random() < 0.008) {
      a.dx = (Math.random() - 0.5) * 0.8;
      a.dy = (Math.random() - 0.5) * 0.8;
    }
    a.x += a.dx * 40 * dt;
    a.y += a.dy * 40 * dt;
    if (a.x < 380 || a.x > 860) a.dx *= -1;
    if (a.y < 430 || a.y > 620) a.dy *= -1;
    const movingA = Math.hypot(a.dx, a.dy) > 0.05;
    const ks = SPINE_KIND[a.k];
    setAnim(a.sid || a.k, movingA ? ks.walk : ks.idle, true);
  });

  state.plots.forEach((pl) => {
    if (pl.crop && pl.stage < CROPS[pl.crop].length - 1) {
      pl.grow += dt;
      if (pl.grow > 6) {
        pl.grow = 0;
        pl.stage += 1;
      }
    }
  });
}

function drawActors(dt) {
  if (!spineOk || !scene) return;
  scene.camera.position.x = state.cam.x + actors.width / 2;
  scene.camera.position.y = -(state.cam.y + actors.height / 2);
  scene.camera.viewportWidth = actors.width;
  scene.camera.viewportHeight = actors.height;
  scene.begin();
  const farmer = state.gender === "girl" ? "girl" : "boy";
  blit(farmer, state.player.x, state.player.y, state.player.facing, dt);
  state.animals.forEach((a) => {
    blit(a.sid || a.k, a.x, a.y, a.dx < 0 ? -1 : 1, dt);
  });
  scene.end();
}

function blit(id, x, y, facing, dt) {
  const s = skeletons[id];
  if (!s) return;
  s.anim.update(dt);
  s.anim.apply(s.skeleton);
  s.skeleton.x = x;
  s.skeleton.y = -y;
  s.skeleton.scaleX = Math.abs(s.skeleton.scaleX) * (facing < 0 ? -1 : 1);
  try {
    if (spine.Physics) s.skeleton.updateWorldTransform(spine.Physics.update);
    else s.skeleton.updateWorldTransform();
  } catch (e) {
    try { s.skeleton.updateWorldTransform(); } catch (e2) {}
  }
  scene.drawSkeleton(s.skeleton, true);
}

function hud() {
  document.getElementById("stats").innerHTML =
    "PAWLY ESTATE FARM · Lv " + state.lv + " · " + Math.min(state.xp, 100) + "/100 XP · " +
    state.pt + " PT<br>Wheat " + state.inv.wheat + " · Tomato " + state.inv.tomato +
    " · Corn " + state.inv.corn + " · Carrot " + state.inv.carrot +
    " · Wood " + state.inv.wood + " · Fish " + state.inv.fish;
}

function setTools() {
  const box = document.getElementById("tools");
  box.innerHTML = "";
  [
    ["wheat", "Wheat"],
    ["tomato", "Tomato"],
    ["corn", "Corn"],
    ["carrot", "Carrot"],
    ["harvest", "Harvest"],
    ["chop", "Chop"],
    ["fish", "Fish"],
    ["expand", "Clear 80 PT"]
  ].forEach(([id, label]) => {
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

function worldPos(ev, el) {
  const r = el.getBoundingClientRect();
  const cx = ((ev.clientX - r.left) / r.width) * world.width;
  const cy = ((ev.clientY - r.top) / r.height) * world.height;
  return { x: cx + state.cam.x, y: cy + state.cam.y };
}

function onTap(ev) {
  if (state.screen !== "play") return;
  const pos = worldPos(ev.touches ? ev.touches[0] : ev, world);
  const plot = state.plots.find((p) => pos.x >= p.x && pos.x < p.x + 50 && pos.y >= p.y && pos.y < p.y + 44);
  const tree = state.trees.find((t) => t.hp > 0 && pos.x >= t.x && pos.x < t.x + 110 && pos.y >= t.y && pos.y < t.y + 150);
  if (state.tool === "fish" && pos.x > 880 && pos.y > 340 && pos.y < 460) {
    state.inv.fish += 1;
    addXp(3);
    return;
  }
  if (state.tool === "chop" && tree) {
    tree.hp -= 1;
    if (tree.hp <= 0) { state.inv.wood += 2; addXp(6); }
    return;
  }
  if (plot) {
    if (plot.locked) {
      if (state.tool === "expand" && state.lv >= 1 && state.pt >= 80) {
        state.pt -= 80;
        plot.locked = false;
      }
      return;
    }
    if (state.tool === "harvest") {
      const stages = CROPS[plot.crop];
      if (plot.crop && stages && plot.stage >= stages.length - 1) {
        state.inv[plot.crop] += 1;
        addXp(4);
        plot.crop = "";
        plot.stage = 0;
        plot.grow = 0;
      }
      return;
    }
    if (CROPS[state.tool] && !plot.crop) {
      plot.crop = state.tool;
      plot.stage = 0;
      plot.grow = 0;
      return;
    }
  }
  state.target = pos;
}

function loop(ts) {
  const dt = Math.min(0.05, (ts - (state.last || ts)) / 1000);
  state.last = ts;
  state.time += dt;
  if (state.screen === "play") {
    updateLogic(dt);
    drawWorld();
    nightTint();
    drawActors(dt);
    hud();
  }
  requestAnimationFrame(loop);
}

function fit() {
  const w = Math.min(1280, window.innerWidth);
  const h = Math.min(720, window.innerHeight);
  world.width = actors.width = w;
  world.height = actors.height = h;
}

window.addEventListener("resize", fit);
window.addEventListener("keydown", (e) => { state.keys[e.key] = true; });
window.addEventListener("keyup", (e) => { state.keys[e.key] = false; });
world.addEventListener("click", onTap);
world.addEventListener("touchstart", (e) => { onTap(e); e.preventDefault(); }, { passive: false });

document.querySelectorAll("#select button").forEach((b) => {
  b.onclick = () => {
    state.gender = b.dataset.g;
    document.getElementById("select").style.display = "none";
    state.screen = "play";
    setTools();
  };
});

fit();
makeWorld();
Promise.all(PNG.map(loadPng))
  .then(() => initSpine())
  .finally(() => {
    const boot = document.getElementById("boot");
    if (boot) boot.style.display = "none";
    requestAnimationFrame(loop);
  });
