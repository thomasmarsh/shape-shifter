import * as THREE from 'three';

// Everything in the game is built from simple coloured shapes in code, so
// there are no model files to load. Each builder returns a group whose origin
// is at the model's feet, plus handles to the parts that get animated.

const materials = new Map<string, THREE.MeshLambertMaterial>();

export function mat(color: number, opts: { emissive?: number; opacity?: number } = {}): THREE.MeshLambertMaterial {
  const key = `${color}|${opts.emissive ?? ''}|${opts.opacity ?? ''}`;
  let m = materials.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({
      color,
      emissive: opts.emissive ?? 0x000000,
      transparent: opts.opacity !== undefined,
      opacity: opts.opacity ?? 1,
    });
    materials.set(key, m);
  }
  return m;
}

const unitBox = new THREE.BoxGeometry(1, 1, 1);

export function box(
  w: number,
  h: number,
  d: number,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(unitBox, material);
  mesh.scale.set(w, h, d);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

/** A group that pivots at its top, for arms and legs that swing. */
function limb(w: number, h: number, d: number, material: THREE.Material, x: number, y: number): THREE.Group {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, 0);
  pivot.add(box(w, h, d, material, 0, -h / 2, 0));
  return pivot;
}

export interface Look {
  skin: number;
  hair: number;
  shirt: number;
  pants: number;
}

export const DEFAULT_LOOK: Look = {
  skin: 0xf2c79b,
  hair: 0x5b3a1e,
  shirt: 0x3fa7d6,
  pants: 0x44506b,
};

export interface HumanModel {
  group: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  blade: THREE.Mesh;
}

// The models face +z (toward the camera's side of the world) at rotation 0.

export function makeHuman(look: Look = DEFAULT_LOOK): HumanModel {
  const group = new THREE.Group();
  const skin = mat(look.skin);
  const shirt = mat(look.shirt);
  const pants = mat(look.pants);

  const legL = limb(0.2, 0.5, 0.22, pants, -0.12, 0.5);
  const legR = limb(0.2, 0.5, 0.22, pants, 0.12, 0.5);
  const armL = limb(0.16, 0.5, 0.18, shirt, -0.34, 1.02);
  const armR = limb(0.16, 0.5, 0.18, shirt, 0.34, 1.02);
  armL.add(box(0.15, 0.12, 0.17, skin, 0, -0.5, 0));
  armR.add(box(0.15, 0.12, 0.17, skin, 0, -0.5, 0));

  group.add(
    legL,
    legR,
    armL,
    armR,
    box(0.5, 0.56, 0.3, shirt, 0, 0.78, 0),
    box(0.46, 0.44, 0.44, skin, 0, 1.3, 0),
    box(0.5, 0.2, 0.48, mat(look.hair), 0, 1.5, -0.01),
    box(0.5, 0.3, 0.14, mat(look.hair), 0, 1.3, -0.2),
    box(0.07, 0.09, 0.03, mat(0x2a2a35), -0.11, 1.3, 0.225),
    box(0.07, 0.09, 0.03, mat(0x2a2a35), 0.11, 1.3, 0.225),
  );

  // The sword rides in the right hand, pointing forward and up.
  const sword = new THREE.Group();
  sword.position.set(0, -0.52, 0.06);
  sword.rotation.x = Math.PI / 2 - 0.5;
  const blade = box(0.09, 0.62, 0.05, new THREE.MeshLambertMaterial({ color: 0xb07a3f }), 0, 0.42, 0);
  sword.add(blade, box(0.26, 0.06, 0.09, mat(0x6b4423), 0, 0.1, 0), box(0.07, 0.16, 0.07, mat(0x4a2f17), 0, 0, 0));
  armR.add(sword);

  return { group, armL, armR, legL, legR, blade };
}

export interface FairyModel {
  group: THREE.Group;
  wingL: THREE.Group;
  wingR: THREE.Group;
  body: THREE.Group;
}

export function makeFairy(look: Look = DEFAULT_LOOK): FairyModel {
  const group = new THREE.Group();
  const body = new THREE.Group();
  const dress = mat(0xf9a8d4, { emissive: 0x4a1030 });
  const skin = mat(look.skin);
  body.add(
    box(0.2, 0.26, 0.16, dress, 0, 0.25, 0),
    box(0.3, 0.12, 0.24, dress, 0, 0.12, 0),
    box(0.22, 0.22, 0.22, skin, 0, 0.5, 0),
    box(0.25, 0.1, 0.25, mat(look.hair), 0, 0.61, -0.01),
    box(0.04, 0.05, 0.02, mat(0x2a2a35), -0.055, 0.5, 0.115),
    box(0.04, 0.05, 0.02, mat(0x2a2a35), 0.055, 0.5, 0.115),
  );

  const wingMat = new THREE.MeshLambertMaterial({
    color: 0xd9f6ff,
    emissive: 0x4fb8d8,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
  });
  const makeWing = (side: number): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.06, 0.34, -0.09);
    const upper = box(0.34, 0.3, 0.02, wingMat, side * 0.2, 0.1, 0);
    const lower = box(0.22, 0.2, 0.02, wingMat, side * 0.15, -0.12, 0);
    upper.castShadow = lower.castShadow = false;
    pivot.add(upper, lower);
    return pivot;
  };
  const wingL = makeWing(-1);
  const wingR = makeWing(1);
  body.add(wingL, wingR);

  const glow = new THREE.PointLight(0xffc4ea, 1.4, 4, 2);
  glow.position.set(0, 0.4, 0);
  body.add(glow);

  group.add(body);
  group.scale.setScalar(1.3);
  return { group, wingL, wingR, body };
}

export interface BadGuyModel {
  group: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  bodyMat: THREE.MeshLambertMaterial;
}

export function makeBadGuy(tester: boolean): BadGuyModel {
  const group = new THREE.Group();
  // Each bad guy owns its body material so it can flash when hit.
  const bodyMat = new THREE.MeshLambertMaterial({ color: tester ? 0x7c6aa8 : 0x4b3b6b });
  const dark = mat(0x2b2140);
  const legL = limb(0.24, 0.45, 0.26, dark, -0.16, 0.45);
  const legR = limb(0.24, 0.45, 0.26, dark, 0.16, 0.45);
  const armL = limb(0.22, 0.6, 0.24, bodyMat, -0.46, 1.1);
  const armR = limb(0.22, 0.6, 0.24, bodyMat, 0.46, 1.1);
  armL.add(box(0.26, 0.22, 0.28, dark, 0, -0.62, 0));
  armR.add(box(0.26, 0.22, 0.28, dark, 0, -0.62, 0));
  const eye = mat(0xff4d4d, { emissive: 0xaa1111 });
  group.add(
    legL,
    legR,
    armL,
    armR,
    box(0.7, 0.7, 0.44, bodyMat, 0, 0.8, 0),
    box(0.5, 0.42, 0.46, bodyMat, 0, 1.36, 0),
    box(0.1, 0.07, 0.03, eye, -0.13, 1.4, 0.235),
    box(0.1, 0.07, 0.03, eye, 0.13, 1.4, 0.235),
    box(0.12, 0.2, 0.12, dark, -0.2, 1.64, 0),
    box(0.12, 0.2, 0.12, dark, 0.2, 1.64, 0),
  );
  if (tester) {
    // Testers wear a practice target so they read as the tutorial ones.
    group.add(box(0.3, 0.3, 0.03, mat(0xffffff), 0, 0.85, 0.23), box(0.14, 0.14, 0.03, mat(0xe24a4a), 0, 0.85, 0.245));
  }
  return { group, armL, armR, legL, legR, bodyMat };
}

export function makeTree(seed: number): THREE.Group {
  const group = new THREE.Group();
  const tall = 1.5 + (seed % 3) * 0.3;
  const leaf = mat([0x3f9b4b, 0x4aa856, 0x358a45][seed % 3]);
  group.add(
    box(0.36, tall, 0.36, mat(0x7a5230), 0, tall / 2, 0),
    box(1.7, 0.8, 1.7, leaf, 0, tall + 0.3, 0),
    box(1.2, 0.7, 1.2, leaf, 0, tall + 1.0, 0),
    box(0.6, 0.5, 0.6, leaf, 0, tall + 1.55, 0),
  );
  group.rotation.y = (seed % 4) * 0.2;
  return group;
}

export function makeBoulder(): THREE.Group {
  const group = new THREE.Group();
  const stone = mat(0x8d8f98);
  group.add(box(0.95, 0.7, 0.9, stone, 0, 0.35, 0), box(0.6, 0.35, 0.6, mat(0x9a9ca6), 0.05, 0.8, -0.05));
  return group;
}

export interface CandleModel {
  group: THREE.Group;
  flame: THREE.Mesh;
  light: THREE.PointLight;
  cage: THREE.Mesh;
}

export function makeCandle(): CandleModel {
  const group = new THREE.Group();
  group.add(
    box(0.8, 0.5, 0.8, mat(0x8d8f98), 0, 0.25, 0),
    box(0.6, 0.12, 0.6, mat(0xa6a8b2), 0, 0.56, 0),
    box(0.22, 0.5, 0.22, mat(0xfff6dc), 0, 0.87, 0),
    box(0.03, 0.08, 0.03, mat(0x2a2a35), 0, 1.15, 0),
  );
  const flame = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.16),
    new THREE.MeshBasicMaterial({ color: 0xffc94d }),
  );
  flame.scale.set(1, 1.7, 1);
  flame.position.y = 1.36;
  const light = new THREE.PointLight(0xffb84d, 3, 7, 2);
  light.position.y = 1.4;

  // A shimmering cage holds the light until the puzzle is solved.
  const cage = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 1.9, 1.1),
    new THREE.MeshBasicMaterial({ color: 0xb48cff, transparent: true, opacity: 0.28, depthWrite: false }),
  );
  cage.position.y = 0.95;
  group.add(flame, light, cage);
  return { group, flame, light, cage };
}

export interface SpeakerModel {
  group: THREE.Group;
  cone: THREE.Mesh;
}

export function makeSpeaker(): SpeakerModel {
  const group = new THREE.Group();
  const cone = box(0.5, 0.5, 0.06, mat(0x2a2a35), 0, 0.72, 0.36);
  group.add(
    box(0.9, 1.3, 0.7, mat(0x6b4fa3), 0, 0.65, 0),
    cone,
    box(0.24, 0.24, 0.06, mat(0x2a2a35), 0, 1.1, 0.36),
    box(0.98, 0.08, 0.78, mat(0xffd166), 0, 1.33, 0),
  );
  // Turn it to face the camera's corner of the world.
  group.rotation.y = -Math.PI / 4;
  return { group, cone };
}

export interface CheckpointModel {
  group: THREE.Group;
  crystal: THREE.Mesh;
}

export function makeCheckpoint(): CheckpointModel {
  const group = new THREE.Group();
  group.add(box(0.9, 0.3, 0.9, mat(0x8d8f98), 0, 0.15, 0), box(0.5, 0.6, 0.5, mat(0xa6a8b2), 0, 0.6, 0));
  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.3),
    new THREE.MeshLambertMaterial({ color: 0x9aa3b5, emissive: 0x000000 }),
  );
  crystal.scale.set(1, 1.5, 1);
  crystal.position.y = 1.5;
  crystal.castShadow = true;
  group.add(crystal);
  return { group, crystal };
}

export function makeBread(): THREE.Group {
  const group = new THREE.Group();
  group.add(
    box(0.5, 0.26, 0.3, mat(0xd9a05b), 0, 0.13, 0),
    box(0.4, 0.1, 0.24, mat(0xe9bd7d), 0, 0.3, 0),
  );
  return group;
}

export function makeFairyHome(): THREE.Group {
  const group = new THREE.Group();
  const wall = mat(0xfff1c9, { emissive: 0x4d3a10 });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.6, 4), mat(0xe2557a, { emissive: 0x401020 }));
  roof.position.y = 0.9;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(
    box(0.76, 0.6, 0.76, wall, 0, 0.3, 0),
    roof,
    box(0.2, 0.32, 0.03, mat(0x7a5230), 0, 0.16, 0.385),
    box(0.16, 0.16, 0.03, mat(0xffe98a, { emissive: 0xffc94d }), 0.385, 0.36, 0).rotateY(Math.PI / 2),
  );
  return group;
}

/** A drifting cloud made of a few squashed puffs. */
export function makeCloud(seed: number): THREE.Group {
  const group = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
  const count = 3 + (seed % 3);
  for (let n = 0; n < count; n++) {
    const puff = new THREE.Mesh(geo, material);
    const s = 1.6 + ((seed * (n + 3)) % 5) * 0.35;
    puff.scale.set(s, s * 0.55, s * 0.8);
    puff.position.set((n - count / 2) * 1.9, ((seed + n) % 2) * 0.3, ((seed * n) % 3) * 0.5);
    group.add(puff);
  }
  return group;
}
