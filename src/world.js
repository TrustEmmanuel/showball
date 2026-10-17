import * as THREE from "three";
import { YARD } from "./yard.js";

function paint(draw) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  draw(canvas.getContext("2d"), canvas);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function footballTexture() {
  return paint((g) => {
    g.fillStyle = "#f7f4ee";
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = "#171717";
    [[128, 48], [48, 128], [208, 128], [88, 208], [176, 200], [128, 132]].forEach(([x, y]) => {
      g.beginPath();
      for (let i = 0; i < 5; i += 1) {
        const angle = -Math.PI / 2 + (i / 5) * Math.PI * 2;
        const px = x + Math.cos(angle) * 34;
        const py = y + Math.sin(angle) * 34;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fill();
    });
  });
}

function groundTexture() {
  return paint((g) => {
    g.fillStyle = "#d8c2a0";
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1800; i += 1) {
      g.fillStyle = `rgba(90, 58, 32, ${Math.random() * 0.09})`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
  });
}

function ankaraTexture() {
  return paint((g) => {
    g.fillStyle = "#0f6b45";
    g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 28) {
      g.fillStyle = y % 56 === 0 ? "#f0c14d" : "#f4efe2";
      g.fillRect(0, y, 256, 10);
    }
    g.fillStyle = "#d7263d";
    for (let x = 16; x < 256; x += 42) {
      for (let y = 8; y < 256; y += 42) {
        g.beginPath();
        g.arc(x, y, 6, 0, Math.PI * 2);
        g.fill();
      }
    }
  });
}

function netTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const g = canvas.getContext("2d");
  g.strokeStyle = "rgba(255,255,255,0.9)";
  g.lineWidth = 3;
  for (let i = 0; i <= 128; i += 16) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, 128);
    g.stroke();
    g.beginPath();
    g.moveTo(0, i);
    g.lineTo(128, i);
    g.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function skyTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 512;
  const g = canvas.getContext("2d");
  const gradient = g.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, "#3c4c86");
  gradient.addColorStop(0.38, "#d86a45");
  gradient.addColorStop(0.62, "#f0b15a");
  gradient.addColorStop(1, "#f6d7a4");
  g.fillStyle = gradient;
  g.fillRect(0, 0, 8, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function standard(color, roughness = 0.7) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02 });
}

function solid(geometry, mat, shadow = true) {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  return mesh;
}

function hibiscus(petalColor) {
  const group = new THREE.Group();
  const stem = solid(new THREE.CylinderGeometry(0.02, 0.028, 0.28, 5), standard("#2f7a3a", 0.8), false);
  stem.position.y = 0.16;
  const head = new THREE.Group();
  head.position.y = 0.32;
  const petalMat = standard(petalColor, 0.5);
  for (let i = 0; i < 5; i += 1) {
    const petal = solid(new THREE.SphereGeometry(0.08, 8, 6), petalMat, false);
    const angle = (i / 5) * Math.PI * 2;
    petal.position.set(Math.cos(angle) * 0.1, 0, Math.sin(angle) * 0.1);
    petal.scale.set(0.7, 0.28, 1.5);
    petal.lookAt(Math.cos(angle), 0.2, Math.sin(angle));
    head.add(petal);
  }
  const center = solid(new THREE.SphereGeometry(0.045, 8, 6), standard("#f2c14e", 0.4), false);
  center.position.y = 0.02;
  head.add(center);
  const leaf = solid(new THREE.SphereGeometry(0.07, 6, 4), standard("#3e8f45", 0.7), false);
  leaf.scale.set(1.8, 0.18, 0.7);
  leaf.position.set(0.1, 0.08, 0);
  leaf.rotation.z = -0.4;
  group.add(stem, head, leaf);
  return group;
}

function mama() {
  const group = new THREE.Group();
  const skin = standard("#6b3a22", 0.55);
  const dress = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.32, 0.55, 10),
    new THREE.MeshStandardMaterial({ map: ankaraTexture(), roughness: 0.7 }),
  );
  dress.position.y = 0.42;
  dress.castShadow = true;
  const wrap = solid(new THREE.SphereGeometry(0.16, 10, 8), standard("#f0c14d", 0.6), false);
  wrap.position.y = 0.86;
  wrap.scale.set(1.1, 0.7, 1.1);
  const face = solid(new THREE.SphereGeometry(0.11, 10, 8), skin, false);
  face.position.set(0, 0.84, 0.06);
  const arm = new THREE.Group();
  arm.position.set(0.18, 0.62, 0.02);
  const sleeve = solid(new THREE.CapsuleGeometry(0.04, 0.22, 3, 6), standard("#0f6b45"), false);
  sleeve.position.set(0.08, -0.08, 0);
  sleeve.rotation.z = -0.8;
  arm.add(sleeve);
  group.add(dress, wrap, face, arm);
  group.userData.arm = arm;
  return group;
}

export function createWorld(scene) {
  scene.background = skyTexture();
  scene.fog = new THREE.Fog(0xf0b06a, 16, 34);

  const hemi = new THREE.HemisphereLight(0xfff0dc, 0xb08968, 1.15);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.45);
  sun.position.set(7, 11, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -12;
  sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 12;
  sun.shadow.camera.bottom = -12;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 28;
  sun.shadow.bias = -0.0004;
  sun.shadow.radius = 6;
  scene.add(sun);
  const bulb = new THREE.PointLight(0xffb15a, 0.45, 8);
  bulb.position.set(0, 2.6, 3.4);
  scene.add(bulb);

  const groundMat = new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 0.95 });
  groundMat.map.wrapS = THREE.RepeatWrapping;
  groundMat.map.wrapT = THREE.RepeatWrapping;
  groundMat.map.repeat.set(6, 5);
  const ground = solid(new THREE.PlaneGeometry(30, 24), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.castShadow = false;
  scene.add(ground);

  const wallMat = standard("#f6ecdc", 0.9);
  const far = solid(new THREE.BoxGeometry(14.4, 3.5, 0.28), wallMat);
  far.position.set(0, 1.75, 5.15);
  const back = solid(new THREE.BoxGeometry(14.4, 3.5, 0.28), wallMat);
  back.position.set(0, 1.75, -5.5);
  const left = solid(new THREE.BoxGeometry(0.28, 3.5, 10.6), wallMat);
  left.position.set(-7.05, 1.75, -0.15);
  const right = solid(new THREE.BoxGeometry(0.28, 3.5, 10.6), wallMat);
  right.position.set(7.05, 1.75, -0.15);
  scene.add(far, back, left, right);

  const gate = solid(new THREE.BoxGeometry(1.5, 2.2, 0.12), standard("#146b43", 0.5));
  gate.position.set(-2.4, 1.1, -5.32);
  scene.add(gate);
  const windowFrame = solid(new THREE.BoxGeometry(1.35, 1.05, 0.08), standard("#efe4d2", 0.6), false);
  windowFrame.position.set(2.3, 1.85, -5.32);
  const pane = solid(new THREE.BoxGeometry(1.05, 0.78, 0.06), standard("#7eb8c9", 0.25), false);
  pane.position.set(2.3, 1.85, -5.28);
  scene.add(windowFrame, pane);

  const slab = solid(new THREE.BoxGeometry(3.4, 0.12, 1.15), standard("#e7d7bf"));
  slab.position.set(0.2, 2.15, 4.55);
  scene.add(slab);
  const rail = solid(new THREE.BoxGeometry(3.2, 0.08, 0.08), standard("#f7f4ee", 0.4));
  rail.position.set(0.2, 2.45, 4.05);
  scene.add(rail);

  const host = mama();
  host.position.set(-0.7, 2.2, 4.55);
  host.scale.setScalar(0.85);
  scene.add(host);

  for (let i = 0; i < 7; i += 1) {
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 8, 6),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffe1a8 : 0xffb347 }),
    );
    lamp.position.set(-1.3 + i * 0.48, 2.62, 4.05);
    scene.add(lamp);
  }

  const white = standard("#f7f7f4", 0.35);
  const postL = solid(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8), white);
  postL.position.set(-1.25, 0.75, YARD.goalZ);
  const postR = solid(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8), white);
  postR.position.set(1.25, 0.75, YARD.goalZ);
  const bar = solid(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 8), white);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 1.5, YARD.goalZ);
  scene.add(postL, postR, bar);

  const net = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 1.45),
    new THREE.MeshBasicMaterial({ map: netTexture(), transparent: true, side: THREE.DoubleSide, depthWrite: false }),
  );
  net.position.set(0, 0.78, YARD.goalZ + 0.28);
  scene.add(net);

  const soil = solid(new THREE.CylinderGeometry(2.2, 2.2, 0.14, 22), standard("#5a3b28", 0.95), false);
  soil.position.set(-4.4, 0.07, 0.35);
  scene.add(soil);

  const flowers = [];
  const palette = ["#d7263d", "#e24b6a", "#ef5d3c", "#c81d4a"];
  const spots = [
    [-3.5, -0.8], [-4.2, -1.1], [-5.1, -0.5], [-3.7, 0.5], [-4.6, 0.4],
    [-5.4, 0.8], [-3.4, 1.4], [-4.3, 1.5], [-5.2, 1.7], [-4.8, -0.1],
  ];
  spots.forEach(([x, z], index) => {
    const flower = hibiscus(palette[index % palette.length]);
    flower.position.set(x, 0.08, z);
    flower.scale.setScalar(0.85 + (index % 3) * 0.12);
    flower.rotation.y = index;
    scene.add(flower);
    flowers.push(flower);
  });

  const touchline = new THREE.Mesh(
    new THREE.PlaneGeometry(0.1, 6.8),
    new THREE.MeshBasicMaterial({ color: 0xf7f4ee }),
  );
  touchline.rotation.x = -Math.PI / 2;
  touchline.position.set(YARD.flowerX, 0.035, 0.2);
  scene.add(touchline);

  const circle = new THREE.Mesh(
    new THREE.RingGeometry(1.05, 1.16, 40),
    new THREE.MeshStandardMaterial({ color: "#008751", roughness: 1 }),
  );
  circle.rotation.x = -Math.PI / 2;
  circle.position.set(0, 0.025, -0.35);
  circle.receiveShadow = true;
  scene.add(circle);

  const tank = solid(new THREE.CylinderGeometry(0.38, 0.38, 0.7, 12), standard("#d5d8dc", 0.35));
  tank.position.set(5.5, 0.35, 2.2);
  scene.add(tank);
  const genny = solid(new THREE.BoxGeometry(0.7, 0.48, 0.42), standard("#1e4d34", 0.6));
  genny.position.set(5.35, 0.24, -2.5);
  scene.add(genny);
  const can = solid(new THREE.BoxGeometry(0.22, 0.32, 0.16), standard("#e2b031", 0.45));
  can.position.set(4.85, 0.16, -2.15);
  scene.add(can);

  const clothMat = new THREE.MeshStandardMaterial({ map: ankaraTexture(), roughness: 0.7, side: THREE.DoubleSide });
  const kit = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.7), standard("#008751"));
  kit.position.set(4.7, 1.35, 0.2);
  scene.add(kit);
  const wrapCloth = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.62), clothMat);
  wrapCloth.position.set(5.35, 1.28, 0.7);
  wrapCloth.rotation.y = 0.4;
  scene.add(wrapCloth);

  const ball = solid(new THREE.SphereGeometry(YARD.ballR, 28, 18), new THREE.MeshStandardMaterial({
    map: footballTexture(),
    roughness: 0.42,
  }));
  scene.add(ball);

  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(0.22, 18),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.03;
  scene.add(blob);

  const landing = new THREE.Mesh(
    new THREE.RingGeometry(0.16, 0.28, 24),
    new THREE.MeshBasicMaterial({ color: 0x39d67a, transparent: true, opacity: 0.95, side: THREE.DoubleSide }),
  );
  landing.rotation.x = -Math.PI / 2;
  landing.position.y = 0.045;
  scene.add(landing);

  const sweet = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.52, 28),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
  );
  sweet.rotation.x = -Math.PI / 2;
  sweet.position.y = 0.04;
  scene.add(sweet);

  const sparks = [];
  const sparkGeo = new THREE.BoxGeometry(0.06, 0.1, 0.04);
  ["#f7f4ee", "#008751", "#f0c14d", "#d7263d"].forEach((color) => {
    for (let i = 0; i < 4; i += 1) {
      const mesh = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color }));
      mesh.visible = false;
      scene.add(mesh);
      sparks.push({ mesh, life: 0, vx: 0, vy: 0, vz: 0 });
    }
  });

  return { ball, blob, landing, sweet, net, flowers, touchline, circle, kit, mama: host, sparks };
}

export function updateWorld(world, dt, time, ballX) {
  world.mama.userData.arm.rotation.z = -0.4 + Math.sin(time * 3) * 0.45;
  world.flowers.forEach((flower, index) => {
    const wind = ballX < -1.4 ? 0.14 : 0.035;
    flower.rotation.z = Math.sin(time * 2.2 + index) * wind;
  });
}
