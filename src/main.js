import * as THREE from "three";
import { createAudio } from "./audio.js";
import { animateCharacter, createCharacter, disposeObject } from "./character.js";
import { askStartNg, FALLBACK_STYLE, normalizeStyle, signInUrl } from "./startng.js";
import { createWorld, updateWorld } from "./world.js";
import { YARD } from "./yard.js";

const $ = (id) => document.getElementById(id);
const canvas = $("view");
const audio = createAudio();

const GOAL_LINES = [
  "GOAL! You don hammer!",
  "Net don shake. I see am!",
  "Finish clean. Oya, again.",
  "Back of the net. Swagger.",
  "Mama Kemi don clap!",
];

const MILES = {
  1: "E don start.",
  3: "Three. You fit finish now.",
  5: "Five! Balcony don wake.",
  8: "You dey show working.",
  10: "Ten! Mama Kemi don stand up.",
  15: "Fifteen. The flowers dey jealous.",
  20: "Twenty. This one na film.",
  30: "Ah ah. Who send you?",
  40: "Forty. I don drop my purse.",
  50: "Fifty! The compound don gather.",
};

const player = {
  id: null,
  name: "Guest",
  account: null,
  face: null,
  guest: true,
  style: { ...FALLBACK_STYLE },
};

const ball = { x: 0.1, y: 1.4, z: -0.4, vx: 0, vy: 0, vz: 0 };
const look = new THREE.Vector3(0, 1.1, 0.4);
const camIdeal = new THREE.Vector3();
const camFocus = new THREE.Vector3();

let renderer;
let scene;
let camera;
let world;
let character;
let state = "ready";
let time = 0;
let juggles = 0;
let goals = 0;
let sinceGoal = 0;
let drift = 0;
let mercy = false;
let shot = null;
let anim = "idle";
let animUntil = 0;
let kickQueued = false;
let finishQueued = false;
let endAt = 0;
let pause = 0;
let overLine = "";
let runToken = 0;
let popUntil = 0;
let lastStyleKey = "";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function say(text) {
  $("line").textContent = text;
}

function flash(text) {
  const pop = $("pop");
  pop.textContent = text;
  pop.hidden = false;
  popUntil = time + 0.7;
  pop.classList.remove("show");
  void pop.offsetWidth;
  pop.classList.add("show");
}

function buzz(ms) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

function openingLine() {
  const style = player.style;
  const named = player.name && player.name !== "Guest" ? player.name : null;
  const lines = [];
  if (style.hat === "crown") lines.push("Crown for compound ball? We go see.");
  if (style.hat === "tophat") lines.push("Tophat for this yard. I respect am.");
  if (style.hat === "cap") lines.push("Cap set. First touch, oya.");
  if (style.hat === "beanie") lines.push("Beanie for this heat? Na you sabi.");
  if (style.hair === "afro") lines.push("Afro dey bounce. Make the ball bounce too.");
  if (style.hair === "braids") lines.push("Braids tight. Touch gats tight.");
  if (style.hair === "dreads") lines.push("Dreads dey swing. Swing the ball pass flower.");
  if (style.hair === "bun") lines.push("Bun neat. Make the touch neat.");
  if (style.hair === "ponytail") lines.push("Ponytail secure? Oya play.");
  if (style.hair === "bald") lines.push("Clean head, clean touch. Oya.");
  if (style.accessory === "backpack") lines.push("Backpack still dey. Play with am.");
  if (style.accessory === "glasses") lines.push("You fit see the ball? Good. Show me.");
  if (style.accessory === "earrings") lines.push("Fine earrings. No let flower collect them.");
  if (style.accessory === "beard") lines.push("Beard no be skill. Touch na skill.");
  if (style.accessory === "scarf") lines.push("Scarf tight. Oya, first touch.");
  if (named && Math.random() < 0.45) lines.push(`${named}, the flowers dey wait.`);
  if (!lines.length) lines.push("Oya, show me something.");
  return pick(lines);
}

function goalLine() {
  if (player.style.hat === "crown" && Math.random() < 0.5) return "Crown still on. GOAL!";
  if (player.style.accessory === "backpack" && Math.random() < 0.45) return "Backpack and all, GOAL!";
  return pick(GOAL_LINES);
}

function localBest() {
  try {
    return JSON.parse(localStorage.getItem("showball-best") || "null");
  } catch {
    return null;
  }
}

function rememberBest() {
  const prev = localBest();
  const better = !prev || juggles > prev.juggles || (juggles === prev.juggles && goals > prev.goals);
  if (better) localStorage.setItem("showball-best", JSON.stringify({ juggles, goals }));
  return { prev, better };
}

function paintPlayer() {
  $("pname").textContent = player.name || "Guest";
  $("paccount").textContent = player.account ? `@${player.account}` : "Not signed in";
  const face = $("face");
  const mark = $("mark");
  if (player.face) {
    face.src = player.face;
    face.hidden = false;
    mark.hidden = true;
  } else {
    face.hidden = true;
    mark.hidden = false;
    mark.textContent = (player.name || "G").slice(0, 1).toUpperCase();
    mark.style.background = player.style.primaryColor;
  }
  const guestParam = new URLSearchParams(location.search).has("guest");
  $("signin").hidden = !player.guest || guestParam;
  $("signin").onclick = () => {
    location.href = signInUrl();
  };
}

function mountCharacter() {
  const key = JSON.stringify(player.style);
  if (character && key === lastStyleKey) {
    paintPlayer();
    return;
  }
  lastStyleKey = key;
  if (character) {
    scene.remove(character);
    disposeObject(character);
  }
  character = createCharacter(player.style);
  character.position.set(0, 0, YARD.playerZ);
  scene.add(character);
  world.circle.material.color.set(player.style.primaryColor);
  world.kit.material.color.set(player.style.primaryColor);
  paintPlayer();
}

function applyPerson(person, guest) {
  if (!person) return;
  player.id = person.id ?? null;
  player.name = person.name || "Guest";
  player.account = person.account || null;
  player.face = person.face || null;
  player.guest = guest;
  player.style = normalizeStyle(person.style);
  mountCharacter();
  if (state === "ready") say(openingLine());
}

async function refreshPlayer() {
  const reply = await askStartNg({ type: "startng:whoami" }, "startng:user");
  if (!reply) return;
  if (reply.user) applyPerson(reply.user, false);
  else if (reply.guest) applyPerson(reply.guest, true);
}

function bands() {
  if (juggles < 2) return { perfect: 0.36, connect: 0.78 };
  if (juggles < 8) return { perfect: 0.24, connect: 0.52 };
  return { perfect: 0.16, connect: 0.4 };
}

function strike() {
  if (!character) return { ok: false, quality: 0 };
  const dx = ball.x - character.position.x;
  const dz = ball.z - character.position.z;
  if (Math.hypot(dx, dz) > 1.55) return { ok: false, quality: 0 };
  if (ball.vy > 1.4 && ball.y > 1.2) return { ok: false, quality: 0 };
  const { perfect, connect } = bands();
  const dy = Math.abs(ball.y - 0.84);
  if (dy > connect) return { ok: false, quality: 0 };
  const quality = dy <= perfect ? 1 : clamp(1 - (dy - perfect) / (connect - perfect), 0.22, 0.95);
  return { ok: true, quality };
}

function dropBall() {
  ball.x = 0.05;
  ball.y = 2.55;
  ball.z = -0.55;
  ball.vx = 0;
  ball.vy = -0.4;
  ball.vz = 0;
  shot = null;
  mercy = false;
}

function updateHud() {
  $("juggles").textContent = String(juggles);
  $("goals").textContent = String(goals);
  const ready = state === "play" && sinceGoal >= 3 && !shot;
  $("finish").disabled = !ready;
  $("finish").classList.toggle("ready", ready);
  $("finish-note").textContent = ready ? "Oya" : `${Math.max(0, 3 - sinceGoal)} more`;
  const now = strike();
  $("kick").classList.toggle("hot", state === "play" && now.ok && now.quality > 0.9);
  $("kick").classList.toggle("ok", state === "play" && now.ok);
}

function requestKick() {
  if (state === "ready" || state === "over") {
    startRun();
    return;
  }
  if (state === "play") kickQueued = true;
}

function requestFinish() {
  if (state !== "play") return;
  if (sinceGoal < 3) {
    say("Three touches, then you fit finish.");
    return;
  }
  finishQueued = true;
}

function tryKick() {
  if (shot) return;
  const now = strike();
  anim = "kick";
  animUntil = time + 0.22;
  if (!now.ok) {
    if (ball.y > 1.55) say("You kick air. Focus.");
    return;
  }
  const quality = now.quality;
  juggles += 1;
  sinceGoal += 1;
  if (quality > 0.9) {
    drift = Math.max(0, drift - 0.1);
    flash("Clean");
    audio.perfect();
  } else {
    drift = Math.min(4, drift + 0.22 + (1 - quality) * 0.28);
  }
  const pull = (juggles < 2 ? 0.2 : 0.45 + drift * 0.72) * (quality > 0.9 ? 0.05 : 1 - quality * 0.55);
  ball.vy = 5.8 + quality * 1.5;
  ball.vx = quality > 0.9 ? -ball.x * 0.85 : -pull;
  ball.vz = (YARD.playerZ + 0.55 - ball.z) * 0.9 + (Math.random() - 0.5) * (1 - quality);
  ball.y = Math.max(ball.y, 0.5);
  mercy = false;
  audio.kick(quality > 0.9);
  buzz(10);
  if (MILES[juggles]) say(MILES[juggles]);
  updateHud();
}

function tryFinish() {
  const now = strike();
  if (!now.ok) {
    say("Wait for the ball. No rush.");
    anim = "kick";
    animUntil = time + 0.16;
    return;
  }
  const quality = clamp(now.quality + (goals === 0 ? 0.2 : 0), 0, 1);
  const duration = 0.68;
  const aimX = (1 - quality) * -(1.15 + drift * 0.45);
  const aimY = 0.72 + (1 - quality) * 1.15;
  shot = { quality };
  ball.vx = (aimX - ball.x) / duration;
  ball.vz = (YARD.goalZ - ball.z) / duration;
  ball.vy = (aimY - ball.y + 0.5 * YARD.gravity * duration * duration) / duration;
  anim = "shoot";
  animUntil = time + 0.28;
  audio.kick(true);
  say("Finish!");
  updateHud();
}

function burst() {
  world.sparks.forEach((spark) => {
    spark.life = 0.7 + Math.random() * 0.3;
    spark.mesh.visible = true;
    spark.mesh.position.set(ball.x, ball.y, ball.z);
    spark.vx = (Math.random() - 0.5) * 3.5;
    spark.vy = 1.5 + Math.random() * 3;
    spark.vz = (Math.random() - 0.5) * 3;
  });
}

function onGoal() {
  goals += 1;
  sinceGoal = 0;
  drift = 0;
  mercy = false;
  shot = null;
  state = "goalpause";
  pause = 0.95;
  anim = "cheer";
  animUntil = time + 1;
  ball.vx = 0;
  ball.vy = 0.4;
  ball.vz = 0.2;
  say(goalLine());
  flash("GOAL");
  audio.goal();
  buzz(40);
  burst();
  updateHud();
}

function endRun(line) {
  if (state === "ending" || state === "over") return;
  state = "ending";
  endAt = time + 0.65;
  overLine = line;
  shot = null;
  anim = "miss";
  animUntil = time + 2;
  say(line);
  audio.miss();
  buzz(25);
  updateHud();
}

function landingPoint() {
  const g = juggles === 0 && !shot ? YARD.gravity * 0.32 : YARD.gravity;
  const a = -0.5 * g;
  const b = ball.vy;
  const c = ball.y - YARD.ballR;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const root = Math.sqrt(disc);
  const times = [(-b + root) / (2 * a), (-b - root) / (2 * a)].filter((t) => t > 0.02);
  if (!times.length) return null;
  const t = Math.min(...times);
  return { x: ball.x + ball.vx * t, z: ball.z + ball.vz * t };
}

function resolveShot() {
  const inMouth = Math.abs(ball.x) < YARD.goalHalf && ball.y > 0.12 && ball.y < YARD.goalHeight;
  const post = Math.abs(Math.abs(ball.x) - YARD.goalHalf) < 0.2 && ball.y < YARD.goalHeight + 0.05 && ball.y > 0.1;
  if (inMouth) {
    onGoal();
    return;
  }
  if (post) {
    ball.vx = Math.sign(ball.x || 1) * -1.4;
    ball.vz = -Math.abs(ball.vz) * 0.25;
    ball.vy = 4.6;
    shot = null;
    say(pick(["POST! E hit iron.", "The post don save you. Oya!"]));
    audio.miss();
    flash("POST");
    return;
  }
  if (ball.y >= YARD.goalHeight) endRun("E fly over the bar!");
  else if (ball.x < YARD.flowerX) endRun("You don shoot enter flower.");
  else endRun("Wall don reject am.");
}

function collide() {
  if (shot && ball.x < YARD.flowerX && ball.y < 1.1) {
    endRun("You don shoot enter flower.");
    return;
  }
  if (shot && ball.z >= YARD.goalZ) {
    resolveShot();
    return;
  }
  if (shot) return;

  if (ball.x > YARD.rightX) {
    ball.x = YARD.rightX;
    ball.vx = -Math.abs(ball.vx) * 0.35;
  }
  if (ball.z < YARD.backZ) {
    endRun("E don go back pass you.");
    return;
  }
  if (ball.z > YARD.goalZ - 0.15) {
    endRun("E don pass the goal.");
    return;
  }
  if (ball.y > YARD.ballR) return;

  ball.y = YARD.ballR;
  if (ball.x < YARD.flowerX) {
    endRun("Flowers don collect am.");
    return;
  }
  if (!mercy) {
    mercy = true;
    ball.vy = 4.4;
    ball.vx -= 0.35;
    kickQueued = false;
    say("Last chance! Boot am!");
    audio.miss();
    flash("Boot am");
    return;
  }
  endRun("Ball don land. E don finish.");
}

function integrate(dt) {
  const g = juggles === 0 && !shot ? YARD.gravity * 0.32 : YARD.gravity;
  ball.vy -= g * dt;
  if (!shot) {
    ball.vx *= 1 - 0.35 * dt;
    ball.vz *= 1 - 0.3 * dt;
  }
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.z += ball.vz * dt;
}

function updatePlay(dt) {
  if (finishQueued) tryFinish();
  else if (kickQueued) tryKick();
  kickQueued = false;
  finishQueued = false;
  integrate(dt);
  if (state === "play") collide();
}

function updateGoalPause(dt) {
  pause -= dt;
  ball.y = Math.max(0.7, ball.y - dt * 0.15);
  world.net.position.z = YARD.goalZ + 0.28 + Math.sin(time * 28) * 0.08 * pause;
  if (pause <= 0) {
    state = "play";
    dropBall();
    anim = "idle";
    say("Oya, again. Flowers still dey wait.");
    updateHud();
  }
}

function updateEnding(dt) {
  ball.vy -= YARD.gravity * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.z += ball.vz * dt;
  if (ball.y < YARD.ballR) {
    ball.y = YARD.ballR;
    ball.vy = 0;
    ball.vx *= 0.9;
  }
  if (time >= endAt) {
    state = "over";
    showOver(overLine);
  }
}

function updateDemo() {
  const bounce = Math.abs(Math.sin(time * 2));
  ball.x = Math.sin(time * 0.65) * 0.28;
  ball.y = YARD.ballR + 0.15 + bounce * 1.35;
  ball.z = -0.4;
  ball.vy = Math.cos(time * 2) * -2;
  ball.vx = 0;
  ball.vz = 0;
  anim = bounce < 0.16 ? "kick" : "idle";
}

function updateCharacter(dt) {
  if (!character) return;
  const mode = time < animUntil ? anim : state === "over" || state === "ending" ? "miss" : "idle";
  animateCharacter(character, dt, mode === "kick" || mode === "shoot" || mode === "cheer" || mode === "miss" ? mode : "idle");
  if (state === "play" || state === "goalpause" || state === "ending") {
    const wantX = clamp(ball.x, -1.45, 1.55);
    character.position.x += (wantX - character.position.x) * Math.min(1, dt * 6);
    character.position.z = YARD.playerZ;
    const dx = ball.x - character.position.x;
    const dz = ball.z - character.position.z;
    const face = Math.atan2(dx, dz);
    let delta = face - character.rotation.y;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    character.rotation.y += delta * Math.min(1, dt * 8);
  } else {
    character.position.x += (0 - character.position.x) * Math.min(1, dt * 3);
    character.rotation.y += (0.7 - character.rotation.y) * Math.min(1, dt * 3);
  }
}

function updateMarkers() {
  const spot = state === "play" ? landingPoint() : null;
  world.landing.visible = !!spot;
  if (spot) {
    world.landing.position.x = spot.x;
    world.landing.position.z = spot.z;
    const danger = spot.x < YARD.flowerX;
    world.landing.material.color.set(danger ? 0xd7263d : 0x39d67a);
  }
  const now = state === "play" ? strike() : { ok: false, quality: 0 };
  world.sweet.visible = state === "play" || state === "ready";
  world.sweet.position.x = character ? character.position.x : 0;
  world.sweet.position.z = character ? character.position.z : YARD.playerZ;
  const sweetColor = now.quality > 0.9 ? 0x39d67a : now.ok ? 0xf0c14d : 0xfffaf2;
  world.sweet.material.color.set(sweetColor);
  world.sweet.material.opacity = state === "ready" ? 0.45 : now.ok ? 0.9 : 0.28;
  const pulse = 1 + Math.sin(time * 6) * (now.ok ? 0.06 : 0.02);
  world.sweet.scale.setScalar(pulse);
}

function updateBallMesh() {
  world.ball.position.set(ball.x, Math.max(YARD.ballR, ball.y), ball.z);
  world.ball.rotation.x += ball.vz * 0.02;
  world.ball.rotation.z -= ball.vx * 0.02;
  const height = Math.max(0, ball.y - YARD.ballR);
  world.blob.position.set(ball.x, 0.03, ball.z);
  const spread = 1 + height * 0.18;
  world.blob.scale.setScalar(spread);
  world.blob.material.opacity = clamp(0.28 - height * 0.05, 0.08, 0.28);
}

function updateSparks(dt) {
  world.sparks.forEach((spark) => {
    if (spark.life <= 0) return;
    spark.life -= dt;
    spark.vy -= YARD.gravity * dt;
    spark.mesh.position.x += spark.vx * dt;
    spark.mesh.position.y += spark.vy * dt;
    spark.mesh.position.z += spark.vz * dt;
    if (spark.life <= 0 || spark.mesh.position.y < 0.05) spark.mesh.visible = false;
  });
}

function updateCamera(dt) {
  const wide = window.innerWidth >= window.innerHeight;
  const posing = state === "ready";
  if (posing && wide) {
    camIdeal.set(5.2, 2.15, 1.55);
    camFocus.set(1.15, 0.95, -1.05);
    camera.fov = 34;
  } else if (wide) {
    camIdeal.set(9.4, 5.15, 0.35);
    camIdeal.y += Math.max(0, ball.y - 2.1) * 0.18;
    camFocus.set(-0.55, 0.95, 1.05);
    camera.fov = 42;
  } else {
    camIdeal.set(6.6, 6.4, 1.15);
    camFocus.set(-0.35, 0.9, 0.55);
    camera.fov = 52;
  }
  camera.updateProjectionMatrix();
  const blend = 1 - Math.exp(-dt * 2.4);
  camera.position.lerp(camIdeal, blend);
  look.lerp(camFocus, blend);
  camera.lookAt(look);
}

function update(dt) {
  time += dt;
  if (state === "ready") updateDemo();
  else if (state === "play") updatePlay(dt);
  else if (state === "goalpause") updateGoalPause(dt);
  else if (state === "ending") updateEnding(dt);
  updateCharacter(dt);
  updateWorld(world, dt, time, ball.x);
  updateBallMesh();
  updateMarkers();
  updateSparks(dt);
  updateCamera(dt);
  if (popUntil && time > popUntil) $("pop").hidden = true;
  if (state === "play") updateHud();
}

function setMenu(open) {
  document.body.classList.toggle("menu", open);
  $("overlay").hidden = !open;
}

function startRun() {
  runToken += 1;
  audio.unlock();
  juggles = 0;
  goals = 0;
  sinceGoal = 0;
  drift = 0;
  mercy = false;
  shot = null;
  state = "play";
  anim = "idle";
  dropBall();
  setMenu(false);
  say(openingLine());
  updateHud();
}

function renderBoard(entries) {
  const list = $("board");
  list.replaceChildren();
  if (!entries?.length) {
    const empty = document.createElement("li");
    empty.textContent = "No scores yet. Be the first name on the wall.";
    list.append(empty);
    return;
  }
  entries.forEach((entry) => {
    const item = document.createElement("li");
    if (player.id && entry.player_id === player.id) item.className = "mine";
    const swatch = document.createElement("i");
    swatch.style.background = entry.color || "#008751";
    const name = document.createElement("b");
    name.textContent = entry.name;
    const stat = document.createElement("span");
    const j = entry.stats?.juggles ?? entry.score ?? 0;
    const g = entry.stats?.goals ?? 0;
    stat.textContent = `${j} juggles · ${g} goals`;
    item.append(swatch, name, stat);
    list.append(item);
  });
}

async function showOver(line) {
  const token = runToken;
  state = "over";
  setMenu(true);
  $("panel-title").hidden = true;
  $("panel-over").hidden = false;
  $("over-line").textContent = line;
  $("over-stat").textContent = `${juggles} juggles · ${goals} ${goals === 1 ? "goal" : "goals"}`;
  const savedLocal = rememberBest();
  const best = localBest();
  $("phone-best").textContent = best ? `On this phone: ${best.juggles} juggles, ${best.goals} goals.` : "";
  $("rank-line").textContent = player.guest ? "Sign in to put your name on the board." : "Saving your run…";
  if (savedLocal.better) $("rank-line").textContent = "New best on this phone.";

  const saved = await askStartNg(
    { type: "startng:score", stats: { juggles, goals } },
    "startng:scoreSaved",
  );
  if (token !== runToken) return;
  if (saved?.ok && saved.result) {
    const rank = saved.result.rank;
    $("rank-line").textContent = saved.result.improved
      ? `New best. You dey number ${rank}.`
      : `Not your best this time. You still dey number ${rank}.`;
  } else if (saved && saved.ok === false) {
    $("rank-line").textContent = "Sign in to put your name on the board.";
  } else if (!player.guest) {
    $("rank-line").textContent = "Board go show for real once you dey on start.ng.";
  }

  const board = await askStartNg({ type: "startng:leaderboard", limit: 8 }, "startng:leaderboardData");
  if (token !== runToken) return;
  const entries = board?.entries || (Array.isArray(board) ? board : null);
  if (entries) renderBoard(entries);
  else if (!board) $("board-note").textContent = "The compound board wakes up on showball.start.ng.";
}

function showTitle() {
  $("panel-title").hidden = false;
  $("panel-over").hidden = true;
  setMenu(true);
}

async function showBoard() {
  const note = $("title-board");
  note.hidden = false;
  const board = await askStartNg({ type: "startng:leaderboard", limit: 8 }, "startng:leaderboardData");
  const entries = board?.entries || (Array.isArray(board) ? board : null);
  if (!entries) {
    note.textContent = "The board shows once Showball is live on start.ng.";
    return;
  }
  note.textContent = entries.length
    ? entries.map((entry) => `#${entry.rank} ${entry.name} · ${entry.stats?.juggles ?? entry.score}`).join("  ·  ")
    : "Nobody don play yet. Be the first.";
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.fov = width < height ? 54 : 40;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function frame(now) {
  const dt = Math.min(0.033, (now - (frame.last || now)) / 1000);
  frame.last = now;
  update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function boot() {
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  } catch {
    $("lede").textContent = "This browser no fit show the yard. Try another one.";
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
  camera.position.set(5.2, 2.15, 1.55);
  look.set(1.15, 0.95, -1.05);
  camera.lookAt(look);
  world = createWorld(scene);
  applyPerson({ name: "Guest", style: FALLBACK_STYLE }, true);
  say("The flowers dey wait.");
  resize();
  showTitle();
  refreshPlayer();
  requestAnimationFrame(frame);
}

$("play").addEventListener("click", startRun);
$("again").addEventListener("click", startRun);
$("kick").addEventListener("pointerdown", (event) => {
  event.preventDefault();
  requestKick();
});
$("finish").addEventListener("pointerdown", (event) => {
  event.preventDefault();
  requestFinish();
});
$("board-btn").addEventListener("click", showBoard);
$("mute").addEventListener("click", () => {
  const muted = audio.toggle();
  $("mute").textContent = muted ? "Sound off" : "Sound on";
  $("mute").setAttribute("aria-pressed", muted ? "true" : "false");
});
$("mute").textContent = audio.muted ? "Sound off" : "Sound on";

canvas.addEventListener("pointerdown", () => {
  if (state === "play") requestKick();
});

addEventListener("keydown", (event) => {
  if (event.repeat) return;
  if (event.code === "Space") {
    event.preventDefault();
    requestKick();
  } else if (event.code === "KeyF") {
    requestFinish();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") refreshPlayer();
});
addEventListener("focus", refreshPlayer);
addEventListener("resize", resize);

boot();
