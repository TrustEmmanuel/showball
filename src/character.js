import * as THREE from "three";
import { normalizeStyle } from "./startng.js";

function shade(hex, amount) {
  const value = parseInt(hex.slice(1), 16);
  const channel = (shift) => Math.max(0, Math.min(255, ((value >> shift) & 255) + amount));
  const mixed = (channel(16) << 16) | (channel(8) << 8) | channel(0);
  return `#${mixed.toString(16).padStart(6, "0")}`;
}

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.62,
    metalness: options.metalness ?? 0.02,
  });
}

function addMesh(parent, geometry, mat, shadow = false) {
  const item = new THREE.Mesh(geometry, mat);
  item.castShadow = shadow;
  item.receiveShadow = true;
  parent.add(item);
  return item;
}

function scalp(parent, mat) {
  const cap = addMesh(parent, new THREE.SphereGeometry(0.255, 14, 10), mat);
  cap.scale.set(1.04, 0.48, 1.05);
  cap.position.y = 0.12;
}

function braids(parent, mat, { count, radius, length, front }) {
  scalp(parent, mat);
  for (let i = 0; i < count; i += 1) {
    const side = i / (count - 1) - 0.5;
    const braid = addMesh(parent, new THREE.CapsuleGeometry(radius, length, 3, 6), mat);
    braid.position.set(side * 0.34, 0.02 - length * 0.35, front && Math.abs(side) > 0.28 ? 0.08 : -0.08);
    braid.rotation.z = side * 0.35;
    braid.rotation.x = 0.15;
  }
}

function addHair(parent, style, mat) {
  const hat = style.hat;
  if (style.hair === "bald") return;

  if (style.hair === "afro") {
    const afro = addMesh(parent, new THREE.SphereGeometry(hat === "none" ? 0.36 : 0.3, 16, 12), mat, true);
    afro.scale.set(1.05, hat === "cap" || hat === "beanie" ? 0.72 : 0.92, 1.08);
    afro.position.set(0, hat === "none" ? 0.08 : 0.02, -0.02);
    return;
  }

  if (style.hair === "short") {
    const crop = addMesh(parent, new THREE.SphereGeometry(0.26, 14, 10), mat);
    crop.scale.set(1.02, 0.42, 1.02);
    crop.position.y = 0.16;
    return;
  }

  if (style.hair === "braids") {
    braids(parent, mat, { count: 6, radius: 0.032, length: 0.42, front: true });
    return;
  }

  if (style.hair === "dreads") {
    braids(parent, mat, { count: 7, radius: 0.045, length: 0.62, front: true });
    return;
  }

  scalp(parent, mat);
  if (style.hair === "bun") {
    const bun = addMesh(parent, new THREE.SphereGeometry(0.12, 12, 10), mat, true);
    bun.position.set(0, hat === "none" ? 0.22 : 0.16, -0.16);
  }
  if (style.hair === "ponytail") {
    const tie = addMesh(parent, new THREE.SphereGeometry(0.07, 10, 8), material(style.primaryColor));
    tie.position.set(0, 0.16, -0.2);
    const tail = addMesh(parent, new THREE.CapsuleGeometry(0.045, 0.42, 3, 6), mat);
    tail.position.set(0, -0.08, -0.22);
    tail.rotation.x = 0.25;
  }
}

function addHat(parent, style) {
  if (style.hat === "none") return;
  if (style.hat === "cap") {
    const crown = addMesh(parent, new THREE.SphereGeometry(0.23, 14, 10), material(shade(style.primaryColor, -55), { roughness: 0.55 }));
    crown.scale.set(1.05, 0.55, 1.05);
    crown.position.set(0, 0.2, 0.02);
    const brim = addMesh(parent, new THREE.BoxGeometry(0.34, 0.035, 0.2), material("#f3efe4"));
    brim.position.set(0, 0.12, 0.18);
    return;
  }
  if (style.hat === "beanie") {
    const wool = addMesh(parent, new THREE.SphereGeometry(0.25, 14, 10), material(style.secondaryColor, { roughness: 0.85 }));
    wool.scale.set(1.02, 0.62, 1.02);
    wool.position.y = 0.18;
    const pom = addMesh(parent, new THREE.SphereGeometry(0.07, 10, 8), material(style.primaryColor));
    pom.position.y = 0.36;
    return;
  }
  if (style.hat === "tophat") {
    const brim = addMesh(parent, new THREE.CylinderGeometry(0.3, 0.3, 0.04, 16), material("#161616", { roughness: 0.4 }));
    brim.position.y = 0.18;
    const pipe = addMesh(parent, new THREE.CylinderGeometry(0.16, 0.16, 0.34, 16), material("#161616", { roughness: 0.4 }), true);
    pipe.position.y = 0.36;
    const band = addMesh(parent, new THREE.CylinderGeometry(0.165, 0.165, 0.06, 16), material("#9b2335"));
    band.position.y = 0.24;
    return;
  }
  const gold = material("#f0c14d", { roughness: 0.32, metalness: 0.62 });
  const band = addMesh(parent, new THREE.CylinderGeometry(0.23, 0.25, 0.08, 8), gold, true);
  band.position.y = 0.2;
  for (let i = 0; i < 5; i += 1) {
    const spike = addMesh(parent, new THREE.ConeGeometry(0.055, 0.16, 6), gold);
    const angle = (i / 5) * Math.PI * 2;
    spike.position.set(Math.cos(angle) * 0.16, 0.32, Math.sin(angle) * 0.16);
  }
  const gem = addMesh(parent, new THREE.SphereGeometry(0.045, 8, 8), material(style.primaryColor, { roughness: 0.3 }));
  gem.position.set(0, 0.2, 0.22);
}

function addAccessory(bob, head, style, skin) {
  const gold = material("#f0c14d", { roughness: 0.35, metalness: 0.55 });
  if (style.accessory === "glasses") {
    const frame = material("#1c1c1c", { roughness: 0.3, metalness: 0.4 });
    [-1, 1].forEach((side) => {
      const lens = addMesh(head, new THREE.TorusGeometry(0.055, 0.012, 8, 14), frame);
      lens.position.set(side * 0.085, 0.02, 0.22);
    });
    const bridge = addMesh(head, new THREE.BoxGeometry(0.05, 0.012, 0.012), frame);
    bridge.position.set(0, 0.02, 0.23);
  }
  if (style.accessory === "earrings") {
    [-1, 1].forEach((side) => {
      const drop = addMesh(head, new THREE.SphereGeometry(0.035, 8, 8), gold);
      drop.position.set(side * 0.26, -0.08, 0.02);
    });
  }
  if (style.accessory === "beard") {
    const beard = addMesh(head, new THREE.SphereGeometry(0.16, 12, 10), material(style.hairColor, { roughness: 0.9 }));
    beard.scale.set(0.85, 0.55, 0.55);
    beard.position.set(0, -0.16, 0.1);
  }
  if (style.accessory === "scarf") {
    const scarf = addMesh(bob, new THREE.TorusGeometry(0.16, 0.045, 8, 14), material("#c43b5a", { roughness: 0.7 }));
    scarf.position.y = 1.4;
    scarf.rotation.x = Math.PI / 2;
    const tail = addMesh(bob, new THREE.BoxGeometry(0.1, 0.28, 0.04), material("#f0c14d"));
    tail.position.set(0.08, 1.22, 0.16);
  }
  if (style.accessory === "backpack") {
    const bag = addMesh(bob, new THREE.BoxGeometry(0.32, 0.36, 0.16), material("#6b4a32", { roughness: 0.75 }), true);
    bag.position.set(0, 1.14, -0.24);
    const pocket = addMesh(bob, new THREE.BoxGeometry(0.18, 0.12, 0.04), material("#8a6244"));
    pocket.position.set(0, 1.04, -0.33);
    [-1, 1].forEach((side) => {
      const strap = addMesh(bob, new THREE.BoxGeometry(0.045, 0.42, 0.08), material("#4e3424"));
      strap.position.set(side * 0.16, 1.2, 0.02);
    });
  }
  return skin;
}

function face(head, hairColor) {
  const white = material("#f7f6f2");
  const ink = material("#1a120e");
  [-1, 1].forEach((side) => {
    const eye = addMesh(head, new THREE.SphereGeometry(0.05, 10, 8), white);
    eye.scale.set(1, 1.05, 0.55);
    eye.position.set(side * 0.085, 0.03, 0.21);
    const pupil = addMesh(head, new THREE.SphereGeometry(0.024, 8, 8), ink);
    pupil.position.set(side * 0.085, 0.02, 0.242);
    const light = addMesh(head, new THREE.SphereGeometry(0.01, 6, 6), white);
    light.position.set(side * 0.098, 0.034, 0.255);
    const brow = addMesh(head, new THREE.BoxGeometry(0.07, 0.016, 0.02), material(hairColor));
    brow.position.set(side * 0.085, 0.1, 0.22);
    brow.rotation.z = side * -0.25;
  });
  const nose = addMesh(head, new THREE.SphereGeometry(0.03, 8, 8), head.children[0]?.material || material("#fff"));
  nose.scale.set(0.8, 0.7, 1);
  nose.position.set(0, -0.02, 0.24);
  const smile = addMesh(head, new THREE.TorusGeometry(0.055, 0.012, 6, 12, Math.PI), material("#6e2e32"));
  smile.position.set(0, -0.09, 0.22);
  smile.rotation.z = Math.PI;
  smile.rotation.x = 0.2;
}

function limb(side, skin, boot, female) {
  const hip = new THREE.Group();
  hip.position.set(side * (female ? 0.13 : 0.15), 0.78, 0);
  const thigh = addMesh(hip, new THREE.CapsuleGeometry(0.075, 0.28, 3, 8), skin, true);
  thigh.position.y = -0.18;
  const knee = new THREE.Group();
  knee.position.y = -0.36;
  const shin = addMesh(knee, new THREE.CapsuleGeometry(0.058, 0.24, 3, 8), skin);
  shin.position.y = -0.16;
  const sock = addMesh(knee, new THREE.CylinderGeometry(0.055, 0.06, 0.1, 8), material("#f7f4ee"));
  sock.position.y = -0.28;
  const shoe = addMesh(knee, new THREE.BoxGeometry(0.13, 0.08, 0.24), boot, true);
  shoe.position.set(0, -0.36, 0.04);
  hip.add(knee);
  return { hip, knee };
}

function arm(side, skin, female) {
  const shoulder = new THREE.Group();
  shoulder.position.set(side * (female ? 0.28 : 0.32), 1.32, 0);
  const upper = addMesh(shoulder, new THREE.CapsuleGeometry(0.052, 0.22, 3, 8), skin);
  upper.position.y = -0.16;
  const elbow = new THREE.Group();
  elbow.position.y = -0.3;
  const fore = addMesh(elbow, new THREE.CapsuleGeometry(0.044, 0.2, 3, 8), skin);
  fore.position.y = -0.14;
  const hand = addMesh(elbow, new THREE.SphereGeometry(0.05, 8, 8), skin);
  hand.position.y = -0.28;
  shoulder.add(elbow);
  return { shoulder, elbow };
}

export function createCharacter(rawStyle) {
  const style = normalizeStyle(rawStyle);
  const female = style.body === "female";
  const root = new THREE.Group();
  const bob = new THREE.Group();
  root.add(bob);

  const skin = material(style.skinColor, { roughness: 0.52 });
  const bibMat = material(style.primaryColor, { roughness: 0.5 });
  const cloth = material(style.secondaryColor, { roughness: 0.68 });
  const hairMat = material(style.hairColor, { roughness: 0.9 });
  const boot = material("#1b1916", { roughness: 0.42 });
  const cream = material("#f6f3ec");

  const left = limb(-1, skin, boot, female);
  const right = limb(1, skin, boot, female);
  bob.add(left.hip, right.hip);

  if (female) {
    const skirt = addMesh(bob, new THREE.CylinderGeometry(0.2, 0.34, 0.38, 12), cloth, true);
    skirt.position.y = 0.7;
  } else {
    const shorts = addMesh(bob, new THREE.BoxGeometry(0.44, 0.24, 0.3), cloth, true);
    shorts.position.y = 0.8;
  }

  const torso = addMesh(bob, new THREE.CapsuleGeometry(female ? 0.19 : 0.22, 0.34, 4, 10), bibMat, true);
  torso.position.y = 1.16;
  const bib = addMesh(bob, new THREE.BoxGeometry(female ? 0.36 : 0.4, 0.4, 0.18), bibMat, true);
  bib.position.set(0, 1.17, 0.12);
  [-1, 1].forEach((side) => {
    const stripe = addMesh(bob, new THREE.BoxGeometry(0.035, 0.4, 0.02), cream);
    stripe.position.set(side * 0.14, 1.17, 0.215);
  });
  const belt = addMesh(bob, new THREE.BoxGeometry(0.38, 0.045, 0.2), material("#241c16"));
  belt.position.set(0, 0.94, 0.08);

  const neck = addMesh(bob, new THREE.CylinderGeometry(0.07, 0.08, 0.1, 8), skin);
  neck.position.y = 1.42;

  const leftArm = arm(-1, skin, female);
  const rightArm = arm(1, skin, female);
  bob.add(leftArm.shoulder, rightArm.shoulder);

  const head = new THREE.Group();
  head.position.y = 1.6;
  const skull = addMesh(head, new THREE.SphereGeometry(0.25, 18, 14), skin, true);
  skull.scale.set(1, 1.06, 0.98);
  face(head, style.hairColor);
  head.children.forEach((child) => {
    if (child.geometry?.type === "SphereGeometry" && child.position.z > 0.2 && child.geometry.parameters.radius === 0.03) {
      child.material = skin;
    }
  });
  addHair(head, style, hairMat);
  addHat(head, style);
  addAccessory(bob, head, style, skin);
  bob.add(head);

  root.userData.rig = {
    bob,
    hipL: left.hip,
    hipR: right.hip,
    kneeL: left.knee,
    kneeR: right.knee,
    shL: leftArm.shoulder,
    shR: rightArm.shoulder,
    head,
  };
  root.userData.anim = { t: 0, mode: "idle", modeT: 0 };
  root.userData.style = style;
  return root;
}

export function animateCharacter(root, dt, mode) {
  const rig = root.userData.rig;
  const anim = root.userData.anim;
  anim.t += dt;
  if (anim.mode !== mode) {
    anim.mode = mode;
    anim.modeT = 0;
  } else {
    anim.modeT += dt;
  }

  const idle = Math.sin(anim.t * 2.3);
  rig.bob.position.y = idle * 0.012;
  rig.hipL.rotation.set(idle * 0.06, 0, 0);
  rig.hipR.rotation.set(-idle * 0.06, 0, 0);
  rig.kneeL.rotation.set(0, 0, 0);
  rig.kneeR.rotation.set(0, 0, 0);
  rig.shL.rotation.set(0.18, 0, 0.18);
  rig.shR.rotation.set(0.18, 0, -0.18);
  rig.head.rotation.set(idle * 0.03, 0, 0);

  const kick = Math.sin(Math.min(1, anim.modeT / 0.22) * Math.PI);
  if (mode === "kick" || mode === "shoot") {
    const power = mode === "shoot" ? 1.25 : 1;
    rig.hipR.rotation.x = -1.2 * kick * power;
    rig.kneeR.rotation.x = 0.35 * kick;
    rig.shL.rotation.x = -0.8 * kick * power;
    rig.shR.rotation.x = -0.25 * kick;
    rig.bob.position.y = kick * 0.04;
  } else if (mode === "cheer") {
    const up = Math.min(1, anim.modeT / 0.18);
    rig.shL.rotation.set(-2.5 * up, 0, 0.35);
    rig.shR.rotation.set(-2.5 * up, 0, -0.35);
    rig.head.rotation.x = -0.15 * up;
    rig.bob.position.y = up * 0.05;
  } else if (mode === "miss") {
    rig.head.rotation.x = 0.35;
    rig.shL.rotation.z = 0.55;
    rig.shR.rotation.x = 0.4;
    rig.hipL.rotation.x = 0.2;
  }
}

export function disposeObject(object) {
  const seen = new Set();
  object.traverse((node) => {
    if (node.geometry && !seen.has(node.geometry)) {
      seen.add(node.geometry);
      node.geometry.dispose();
    }
    const materials = node.material ? (Array.isArray(node.material) ? node.material : [node.material]) : [];
    materials.forEach((mat) => {
      if (seen.has(mat)) return;
      seen.add(mat);
      if (mat.map) mat.map.dispose();
      mat.dispose();
    });
  });
}
