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

export interface MermaidModel {
  group: THREE.Group;
  /** Pivots at her waist: tipping it forward lays her out to swim. */
  swim: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  /** The three bending parts of the tail, each pivoting where it joins the one before. */
  tail: THREE.Group;
  tailEnd: THREE.Group;
  fin: THREE.Group;
  blade: THREE.Mesh;
}

/** How high her waist is above her feet when she sits upright on her tail. */
export const MERMAID_WAIST = 0.72;

/**
 * A human top half with long hair, and from the waist down a scaled tail in sea
 * greens ending in a wide fin. Her sword rides in the right hand like the Human's.
 */
export function makeMermaid(): MermaidModel {
  const group = new THREE.Group();
  const swim = new THREE.Group();
  swim.position.y = MERMAID_WAIST;
  group.add(swim);
  const skin = mat(0xf2c79b);
  const top = mat(0x2fa59a);
  const hair = mat(0x1f7f77);
  const scale = mat(0x2f9e7a);
  const scaleDark = mat(0x1f7a63);
  const finColor = mat(0x58c9a0);

  // Everything here is measured from the waist.
  const armL = limb(0.16, 0.5, 0.18, skin, -0.34, 0.42);
  const armR = limb(0.16, 0.5, 0.18, skin, 0.34, 0.42);
  swim.add(
    armL,
    armR,
    box(0.5, 0.52, 0.3, top, 0, 0.26, 0),
    box(0.46, 0.44, 0.44, skin, 0, 0.72, 0),
    box(0.5, 0.2, 0.48, hair, 0, 0.92, -0.01),
    // Hair falls long down her back.
    box(0.5, 0.9, 0.14, hair, 0, 0.5, -0.2),
    box(0.4, 0.3, 0.12, hair, 0, -0.1, -0.2),
    box(0.07, 0.09, 0.03, mat(0x2a2a35), -0.11, 0.72, 0.225),
    box(0.07, 0.09, 0.03, mat(0x2a2a35), 0.11, 0.72, 0.225),
  );

  // The tail: hips, then a narrower middle, then the fin, each bending on its own.
  const tail = new THREE.Group();
  tail.add(box(0.46, 0.3, 0.3, scale, 0, -0.15, 0), box(0.4, 0.05, 0.26, scaleDark, 0, -0.08, 0), box(0.4, 0.05, 0.26, scaleDark, 0, -0.2, 0));
  const tailEnd = new THREE.Group();
  tailEnd.position.y = -0.3;
  tailEnd.add(box(0.3, 0.26, 0.24, scale, 0, -0.13, 0), box(0.3, 0.05, 0.2, scaleDark, 0, -0.1, 0));
  const fin = new THREE.Group();
  fin.position.y = -0.26;
  fin.add(
    box(0.18, 0.14, 0.16, scale, 0, -0.05, 0),
    box(0.8, 0.05, 0.22, finColor, 0, -0.12, 0.03),
    box(0.55, 0.05, 0.2, finColor, 0, -0.12, 0.2),
    box(0.16, 0.05, 0.1, scaleDark, 0, -0.12, 0.06),
  );
  tailEnd.add(fin);
  tail.add(tailEnd);
  swim.add(tail);

  // The sword rides in the right hand, pointing forward and up.
  const sword = new THREE.Group();
  sword.position.set(0, -0.52, 0.06);
  sword.rotation.x = Math.PI / 2 - 0.5;
  const blade = box(0.09, 0.62, 0.05, new THREE.MeshLambertMaterial({ color: 0xb07a3f }), 0, 0.42, 0);
  sword.add(blade, box(0.26, 0.06, 0.09, mat(0x6b4423), 0, 0.1, 0), box(0.07, 0.16, 0.07, mat(0x4a2f17), 0, 0, 0));
  armR.add(sword);

  return { group, swim, armL, armR, tail, tailEnd, fin, blade };
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

export interface OrangutanModel {
  group: THREE.Group;
  /** The hunched upper body: torso, head and arms lean forward together. */
  upper: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  blade: THREE.Mesh;
}

/** Resting lean of the arms, to cancel the hunch so they hang straight down. */
export const APE_ARM_REST = -0.25;

export function makeOrangutan(): OrangutanModel {
  const group = new THREE.Group();
  const fur = mat(0xb5611f);
  const shaggy = mat(0x9a4f18);
  const face = mat(0x5c3b2a);
  const muzzle = mat(0x8a6246);

  // Short bowed legs: the feet sit wider than the hips.
  const legL = limb(0.24, 0.42, 0.26, fur, -0.2, 0.42);
  const legR = limb(0.24, 0.42, 0.26, fur, 0.2, 0.42);
  legL.add(box(0.28, 0.1, 0.34, face, -0.02, -0.4, 0.04));
  legR.add(box(0.28, 0.1, 0.34, face, 0.02, -0.4, 0.04));
  legL.rotation.z = -0.12;
  legR.rotation.z = 0.12;

  // Everything above the hips leans forward as one piece.
  const upper = new THREE.Group();
  upper.position.set(0, 0.48, 0);
  upper.rotation.x = 0.25;
  // Arms are long enough to hang past the knees.
  const armL = limb(0.22, 0.95, 0.24, fur, -0.5, 0.62);
  const armR = limb(0.22, 0.95, 0.24, fur, 0.5, 0.62);
  armL.add(box(0.26, 0.2, 0.28, face, 0, -0.95, 0.02), box(0.3, 0.3, 0.3, shaggy, 0, -0.35, 0));
  armR.add(box(0.26, 0.2, 0.28, face, 0, -0.95, 0.02), box(0.3, 0.3, 0.3, shaggy, 0, -0.35, 0));
  armL.rotation.x = APE_ARM_REST;
  armR.rotation.x = APE_ARM_REST;
  upper.add(
    armL,
    armR,
    box(0.78, 0.7, 0.5, fur, 0, 0.36, 0),
    box(0.84, 0.3, 0.54, shaggy, 0, 0.58, -0.02),
    // The head sits low and forward between the shoulders.
    box(0.5, 0.44, 0.46, fur, 0, 0.88, 0.1),
    box(0.58, 0.2, 0.5, shaggy, 0, 1.12, 0.06),
    box(0.4, 0.34, 0.06, face, 0, 0.86, 0.34),
    box(0.26, 0.14, 0.08, muzzle, 0, 0.78, 0.36),
    box(0.06, 0.07, 0.03, mat(0x1d1410), -0.1, 0.92, 0.375),
    box(0.06, 0.07, 0.03, mat(0x1d1410), 0.1, 0.92, 0.375),
  );

  // The sword rides in the right hand, like the human's.
  const sword = new THREE.Group();
  sword.position.set(0, -0.98, 0.06);
  sword.rotation.x = Math.PI / 2 - 0.5;
  const blade = box(0.09, 0.62, 0.05, new THREE.MeshLambertMaterial({ color: 0xb07a3f }), 0, 0.42, 0);
  sword.add(blade, box(0.26, 0.06, 0.09, mat(0x6b4423), 0, 0.1, 0), box(0.07, 0.16, 0.07, mat(0x4a2f17), 0, 0, 0));
  armR.add(sword);

  group.add(legL, legR, upper);
  return { group, upper, armL, armR, legL, legR, blade };
}

export interface BunnyModel {
  group: THREE.Group;
  /** The whole rabbit, scaled from the feet to squash and stretch. */
  body: THREE.Group;
  earL: THREE.Group;
  earR: THREE.Group;
  footL: THREE.Group;
  footR: THREE.Group;
}

export function makeBunny(): BunnyModel {
  const group = new THREE.Group();
  const body = new THREE.Group();
  const white = mat(0xf6f3f0);
  const grey = mat(0xaaaab4);
  const pink = mat(0xf3a1b5);
  const dark = mat(0x2a2a35);

  // Big back feet pivot at the ankle so they can kick.
  const makeFoot = (side: number): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.15, 0.1, -0.02);
    pivot.add(box(0.14, 0.1, 0.34, white, 0, -0.05, 0.1));
    return pivot;
  };
  const footL = makeFoot(-1);
  const footR = makeFoot(1);

  // Ears stand up from the head and flop back in the air.
  const makeEar = (side: number): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.09, 0.66, 0.1);
    pivot.add(box(0.1, 0.42, 0.06, white, 0, 0.21, 0), box(0.05, 0.3, 0.02, pink, 0, 0.2, 0.035));
    return pivot;
  };
  const earL = makeEar(-1);
  const earR = makeEar(1);

  body.add(
    footL,
    footR,
    earL,
    earR,
    box(0.4, 0.34, 0.48, white, 0, 0.28, -0.02),
    box(0.3, 0.16, 0.3, grey, 0, 0.42, -0.08),
    box(0.1, 0.12, 0.1, white, 0, 0.26, -0.3),
    box(0.1, 0.14, 0.1, white, -0.12, 0.2, 0.2),
    box(0.1, 0.14, 0.1, white, 0.12, 0.2, 0.2),
    box(0.32, 0.28, 0.3, white, 0, 0.56, 0.18),
    box(0.34, 0.1, 0.1, grey, 0, 0.68, 0.14),
    box(0.07, 0.06, 0.04, pink, 0, 0.53, 0.34),
    box(0.05, 0.07, 0.03, dark, -0.09, 0.6, 0.335),
    box(0.05, 0.07, 0.03, dark, 0.09, 0.6, 0.335),
  );
  group.add(body);
  return { group, body, earL, earR, footL, footR };
}

export interface WolfModel {
  group: THREE.Group;
  /** Body, head and tail together, to bob while galloping. */
  body: THREE.Group;
  tail: THREE.Group;
  legFL: THREE.Group;
  legFR: THREE.Group;
  legBL: THREE.Group;
  legBR: THREE.Group;
}

/**
 * A big white wolf with a grey saddle and dark paws, about 1.7 tall to the ear
 * tips and 2 long with its tail. Faces +z. The grey and dark parts are there so
 * it still reads against the snow it runs on.
 */
export function makeWolf(): WolfModel {
  const group = new THREE.Group();
  const body = new THREE.Group();
  const white = mat(0xf4f7fb);
  const cream = mat(0xdfe6ee);
  const grey = mat(0x8e9bad);
  const slate = mat(0x5d6a7c);
  const dark = mat(0x232833);
  const eye = mat(0xffd34d, { emissive: 0xb07a10 });

  // The torso and head ride on long legs.
  const LIFT = 0.18;
  const lift = (bw: number, bh: number, bd: number, m: THREE.Material, x: number, y: number, z: number): THREE.Mesh =>
    box(bw, bh, bd, m, x, y + LIFT, z);

  // Legs pivot at the hip. The paws and "socks" are dark, so the gait shows.
  const makeLeg = (side: number, z: number, back: boolean): THREE.Group => {
    const w = back ? 0.2 : 0.17;
    const pivot = limb(w, 0.84, w + 0.02, back ? cream : white, side * 0.2, 0.88);
    pivot.position.z = z;
    pivot.add(
      box(w + 0.02, 0.3, w + 0.04, slate, 0, -0.69, 0),
      box(w + 0.03, 0.09, w + 0.14, dark, 0, -0.8, 0.04),
    );
    return pivot;
  };
  const legFL = makeLeg(-1, 0.42, false);
  const legFR = makeLeg(1, 0.42, false);
  const legBL = makeLeg(-1, -0.5, true);
  const legBR = makeLeg(1, -0.5, true);

  // A big bushy brush of a tail with a dark tip, hanging from the rump.
  const tail = new THREE.Group();
  tail.position.set(0, 1.05 + LIFT, -0.66);
  tail.rotation.x = -0.6;
  tail.add(
    box(0.3, 0.3, 0.45, white, 0, 0, -0.18),
    box(0.36, 0.36, 0.4, white, 0, 0, -0.55),
    box(0.26, 0.26, 0.3, grey, 0, 0, -0.88),
    box(0.16, 0.16, 0.18, dark, 0, 0, -1.08),
  );

  body.add(
    // Barrel, with a lighter belly and a grey saddle along the back.
    lift(0.56, 0.5, 1.2, white, 0, 0.94, -0.06),
    lift(0.46, 0.14, 1.0, cream, 0, 0.72, -0.04),
    lift(0.42, 0.1, 0.95, grey, 0, 1.2, -0.1),
    lift(0.3, 0.06, 0.55, slate, 0, 1.25, -0.2),
    // Deep chest, thick ruff and a neck that lifts the head.
    lift(0.68, 0.64, 0.4, white, 0, 0.96, 0.42),
    lift(0.74, 0.3, 0.34, cream, 0, 0.76, 0.5),
    lift(0.4, 0.42, 0.34, white, 0, 1.2, 0.66),
    // Head: broad cheeks, a long pale snout, a dark nose and a grey brow.
    lift(0.52, 0.44, 0.44, white, 0, 1.2, 0.92),
    lift(0.58, 0.2, 0.26, cream, 0, 1.1, 0.88),
    lift(0.46, 0.08, 0.34, grey, 0, 1.4, 0.9),
    lift(0.24, 0.22, 0.42, cream, 0, 1.12, 1.26),
    lift(0.2, 0.06, 0.3, grey, 0, 1.0, 1.2),
    lift(0.13, 0.11, 0.07, dark, 0, 1.19, 1.48),
    // Tall pointed ears, grey outside and dark inside.
    lift(0.13, 0.28, 0.1, grey, -0.15, 1.57, 0.84),
    lift(0.13, 0.28, 0.1, grey, 0.15, 1.57, 0.84),
    lift(0.07, 0.12, 0.08, dark, -0.15, 1.75, 0.84),
    lift(0.07, 0.12, 0.08, dark, 0.15, 1.75, 0.84),
    lift(0.06, 0.18, 0.04, slate, -0.15, 1.55, 0.9),
    lift(0.06, 0.18, 0.04, slate, 0.15, 1.55, 0.9),
    // Glowing amber eyes under a dark brow.
    lift(0.08, 0.06, 0.04, eye, -0.15, 1.24, 1.125),
    lift(0.08, 0.06, 0.04, eye, 0.15, 1.24, 1.125),
    lift(0.11, 0.03, 0.04, slate, -0.15, 1.29, 1.125),
    lift(0.11, 0.03, 0.04, slate, 0.15, 1.29, 1.125),
    legFL,
    legFR,
    legBL,
    legBR,
    tail,
  );
  group.add(body);
  return { group, body, tail, legFL, legFR, legBL, legBR };
}

/**
 * A sandy, spotted copy of the wolf: slim, long-legged and long-tailed, with a
 * small head and dark tear lines. Same handles, so the wolf's gait animation
 * drives it.
 */
export function makeCheetah(): WolfModel {
  const m = makeWolf();
  const swap = new Map<THREE.Material, THREE.Material>([
    [mat(0xf4f7fb), mat(0xd9a441)],
    [mat(0xdfe6ee), mat(0xf0d9a0)],
    [mat(0x8e9bad), mat(0xb07a2a)],
    [mat(0x5d6a7c), mat(0x6b4a1e)],
  ]);
  m.group.traverse((o) => {
    if (o instanceof THREE.Mesh) o.material = swap.get(o.material as THREE.Material) ?? o.material;
  });
  const spot = mat(0x2b1d0e);
  for (let n = 0; n < 9; n++) {
    const z = -0.5 + (n % 3) * 0.4;
    const side = n < 5 ? -1 : 1;
    m.body.add(box(0.06, 0.1, 0.1, spot, side * 0.29, 1.0 + 0.18 + (n % 2) * 0.12, z));
  }
  // A small head: every head part (and the ears) shrinks toward the middle of the face.
  const face = new THREE.Vector3(0, 1.5, 1.0);
  for (const o of m.body.children) {
    if (o instanceof THREE.Mesh && o.position.z > 0.8) {
      o.position.sub(face).multiplyScalar(0.75).add(face);
      o.scale.multiplyScalar(0.75);
    }
  }
  // Spots along the back, then the dark tear lines from the eyes down the muzzle.
  for (let n = 0; n < 6; n++) m.body.add(box(0.07, 0.04, 0.09, spot, (n % 2 ? 1 : -1) * 0.12, 1.45, -0.55 + Math.floor(n / 2) * 0.35));
  for (const side of [-1, 1]) m.body.add(box(0.035, 0.2, 0.04, spot, side * 0.11, 1.33, 1.09));
  // A long thin tail, and legs longer than the wolf's on a slimmer frame.
  m.tail.scale.set(0.6, 0.6, 1.5);
  m.group.scale.set(0.74, 0.96, 1.12);
  return m;
}

export interface AntModel {
  group: THREE.Group;
  /** Three on each side, front to back, left side first. Each pivots at the body. */
  legs: THREE.Group[];
}

/**
 * A tiny dark red-brown ant, about 0.35 long and 0.2 tall. Faces +z. Head,
 * thorax and abdomen, six legs that swing and two antennae.
 */
export function makeAnt(): AntModel {
  const group = new THREE.Group();
  const body = mat(0x6b2a1c);
  const dark = mat(0x3e1710);
  group.add(
    box(0.1, 0.1, 0.1, body, 0, 0.12, 0.13),
    box(0.1, 0.09, 0.1, body, 0, 0.12, 0.02),
    box(0.14, 0.12, 0.17, dark, 0, 0.13, -0.11),
    box(0.015, 0.015, 0.1, dark, -0.035, 0.2, 0.2).rotateX(-0.5),
    box(0.015, 0.015, 0.1, dark, 0.035, 0.2, 0.2).rotateX(-0.5),
  );
  const legs: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    for (const z of [0.08, 0.02, -0.04]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.04, 0.08, z);
      pivot.add(box(0.1, 0.02, 0.02, dark, side * 0.05, -0.02, 0), box(0.02, 0.07, 0.02, dark, side * 0.1, -0.045, 0));
      group.add(pivot);
      legs.push(pivot);
    }
  }
  return { group, legs };
}

export interface SnakeModel {
  group: THREE.Group;
  /** Body segments head to tail; each sways side to side in a slither. */
  segments: THREE.Group[];
}

/**
 * A banded snake, about 1.1 long and 0.15 tall: a wedge head with yellow eyes,
 * then seven tapering segments in slate and gold. Faces +z. Slithers.
 */
export function makeSnake(): SnakeModel {
  const group = new THREE.Group();
  const scale = mat(0x3d5a4a);
  const band = mat(0xc9a24a);
  const dark = mat(0x23362c);
  const belly = mat(0xe3d9b4);
  const segments: THREE.Group[] = [];
  // Segment 0 is the head, a wedge: a broad jaw, a narrow snout, a raised brow, two eyes, a tongue.
  const head = new THREE.Group();
  head.position.set(0, 0, 0.35);
  head.add(
    box(0.17, 0.1, 0.18, scale, 0, 0.07, 0),
    box(0.11, 0.07, 0.1, scale, 0, 0.06, 0.12),
    box(0.06, 0.05, 0.06, scale, 0, 0.05, 0.18),
    box(0.15, 0.02, 0.16, belly, 0, 0.015, 0.01),
    box(0.03, 0.03, 0.03, mat(0xf2c230, { emissive: 0x6a5000 }), -0.075, 0.12, 0.06),
    box(0.03, 0.03, 0.03, mat(0xf2c230, { emissive: 0x6a5000 }), 0.075, 0.12, 0.06),
    box(0.012, 0.012, 0.02, dark, -0.075, 0.12, 0.08),
    box(0.012, 0.012, 0.02, dark, 0.075, 0.12, 0.08),
    box(0.012, 0.012, 0.07, mat(0xc0392b), 0, 0.045, 0.24),
  );
  group.add(head);
  segments.push(head);
  // The body tapers to the tail, in pale bands every other segment.
  for (let n = 1; n < 8; n++) {
    const seg = new THREE.Group();
    const w = 0.15 - n * 0.015;
    const h = 0.12 - n * 0.008;
    seg.position.set(0, 0, 0.35 - n * 0.14);
    seg.add(
      box(w, h, 0.15, n % 2 ? scale : band, 0, h / 2 + 0.02, 0),
      box(w * 0.5, 0.02, 0.15, belly, 0, 0.01, 0),
      box(w * 0.4, 0.02, 0.1, dark, 0, h + 0.03, 0),
    );
    group.add(seg);
    segments.push(seg);
  }
  return { group, segments };
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

export interface SwordGuyModel extends BadGuyModel {
  /** The blade's own iron, so it can glow while the sword is raised. */
  bladeMat: THREE.MeshLambertMaterial;
}

/**
 * The sword bad guy: the bad guy's heavy cousin. Broader, in dark slate armour
 * with pauldrons and a helm, and an iron-grey sword in the right hand. The
 * blade points forward from the fist, so a raised arm raises the sword.
 */
export function makeSwordGuy(): SwordGuyModel {
  const group = new THREE.Group();
  // The body material is shared by torso, arms and helm so it can flash and glow.
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x3a4150 });
  const plate = mat(0x242831);
  const dark = mat(0x16181e);
  const bladeMat = new THREE.MeshLambertMaterial({ color: 0xb4bcc6 });
  const legL = limb(0.28, 0.45, 0.3, plate, -0.18, 0.45);
  const legR = limb(0.28, 0.45, 0.3, plate, 0.18, 0.45);
  const armL = limb(0.26, 0.6, 0.28, bodyMat, -0.52, 1.1);
  const armR = limb(0.26, 0.6, 0.28, bodyMat, 0.52, 1.1);
  armL.add(box(0.3, 0.24, 0.32, dark, 0, -0.62, 0));
  armR.add(box(0.3, 0.24, 0.32, dark, 0, -0.62, 0));
  // Crossguard, grip and a blade a little longer than the arm.
  armR.add(
    box(0.07, 0.07, 0.2, dark, 0, -0.62, 0.2),
    box(0.3, 0.06, 0.07, plate, 0, -0.62, 0.3),
    box(0.09, 0.05, 0.95, bladeMat, 0, -0.62, 0.82),
  );
  const eye = mat(0xff4d4d, { emissive: 0xaa1111 });
  group.add(
    legL,
    legR,
    armL,
    armR,
    box(0.8, 0.74, 0.5, bodyMat, 0, 0.82, 0),
    box(0.84, 0.12, 0.54, plate, 0, 0.5, 0),
    box(0.3, 0.3, 0.04, plate, 0, 0.9, 0.26),
    // Pauldrons, helm, visor slit and a low crest.
    box(0.36, 0.14, 0.4, plate, -0.5, 1.5, 0),
    box(0.36, 0.14, 0.4, plate, 0.5, 1.5, 0),
    box(0.54, 0.46, 0.5, bodyMat, 0, 1.4, 0),
    box(0.4, 0.08, 0.05, dark, 0, 1.4, 0.26),
    box(0.09, 0.05, 0.03, eye, -0.1, 1.4, 0.285),
    box(0.09, 0.05, 0.03, eye, 0.1, 1.4, 0.285),
    box(0.08, 0.16, 0.4, plate, 0, 1.7, 0),
  );
  return { group, armL, armR, legL, legR, bodyMat, bladeMat };
}

/**
 * The blade bad guy: the sword guy's light cousin. Slim, in a pale sand wrap
 * with a red sash and no armour, holding a short thin curved blade. Same
 * model shape as the sword guy, so the enemy raises and glows it the same way.
 */
export function makeBladeGuy(): SwordGuyModel {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xd8c08a });
  const wrap = mat(0xb39a66);
  const sash = mat(0xc23b3b);
  const dark = mat(0x4a3a24);
  const bladeMat = new THREE.MeshLambertMaterial({ color: 0xd4dae0 });
  const legL = limb(0.18, 0.45, 0.2, wrap, -0.12, 0.45);
  const legR = limb(0.18, 0.45, 0.2, wrap, 0.12, 0.45);
  const armL = limb(0.15, 0.6, 0.17, bodyMat, -0.36, 1.1);
  const armR = limb(0.15, 0.6, 0.17, bodyMat, 0.36, 1.1);
  armL.add(box(0.18, 0.18, 0.2, dark, 0, -0.62, 0));
  armR.add(box(0.18, 0.18, 0.2, dark, 0, -0.62, 0));
  // A short grip and a blade that curves up toward the tip.
  const tip = box(0.05, 0.04, 0.3, bladeMat, 0, -0.57, 0.88);
  tip.rotation.x = -0.35;
  armR.add(box(0.05, 0.05, 0.16, dark, 0, -0.62, 0.12), box(0.06, 0.04, 0.5, bladeMat, 0, -0.62, 0.46), tip);
  const eye = mat(0xff4d4d, { emissive: 0xaa1111 });
  group.add(
    legL,
    legR,
    armL,
    armR,
    box(0.5, 0.7, 0.34, bodyMat, 0, 0.8, 0),
    box(0.54, 0.14, 0.38, sash, 0, 0.62, 0),
    box(0.1, 0.3, 0.05, sash, 0.2, 0.42, 0.18),
    box(0.4, 0.38, 0.4, bodyMat, 0, 1.34, 0),
    box(0.44, 0.1, 0.44, sash, 0, 1.5, 0),
    box(0.08, 0.05, 0.03, eye, -0.1, 1.36, 0.205),
    box(0.08, 0.05, 0.03, eye, 0.1, 1.36, 0.205),
  );
  return { group, armL, armR, legL, legR, bodyMat, bladeMat };
}

export interface ArcherModel extends BadGuyModel {
  /** The bow in the left hand. The enemy keeps it upright as the arm swings. */
  bow: THREE.Group;
  /** The bow's own wood, so it can glow while the string is drawn. */
  bowMat: THREE.MeshLambertMaterial;
}

/**
 * The archer: the bad guy's cousin. Leaner, in a dark green hood and cloak,
 * with a quiver on the back and a bow in the left hand.
 */
export function makeArcher(): ArcherModel {
  const group = new THREE.Group();
  // The body material is shared by torso, arms and hood so it can flash and glow.
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2f6b46 });
  const cloak = mat(0x1d4430);
  const dark = mat(0x1c2a22);
  const wood = new THREE.MeshLambertMaterial({ color: 0xb07a3f });
  const legL = limb(0.18, 0.45, 0.2, dark, -0.12, 0.45);
  const legR = limb(0.18, 0.45, 0.2, dark, 0.12, 0.45);
  const armL = limb(0.15, 0.6, 0.17, bodyMat, -0.36, 1.1);
  const armR = limb(0.15, 0.6, 0.17, bodyMat, 0.36, 1.1);
  armL.add(box(0.18, 0.18, 0.2, dark, 0, -0.62, 0));
  armR.add(box(0.18, 0.18, 0.2, dark, 0, -0.62, 0));

  // A bow about as tall as the archer: grip, two bent limbs and a pale string.
  const bow = new THREE.Group();
  bow.position.set(0, -0.62, 0);
  const upper = box(0.05, 0.42, 0.06, wood, 0, 0.5, -0.06);
  const lower = box(0.05, 0.42, 0.06, wood, 0, -0.5, -0.06);
  upper.rotation.x = -0.3;
  lower.rotation.x = 0.3;
  bow.add(box(0.07, 0.6, 0.08, wood, 0, 0, 0.02), upper, lower, box(0.012, 1.3, 0.012, mat(0xf2ead0), 0, 0, -0.17));
  armL.add(bow);

  // The quiver is tilted on the back, with feathers poking out of the top.
  const quiver = new THREE.Group();
  quiver.position.set(0.1, 1.0, -0.26);
  quiver.rotation.z = 0.3;
  quiver.add(
    box(0.15, 0.55, 0.14, mat(0x6b4526), 0, 0, 0),
    box(0.04, 0.2, 0.04, mat(0xe24a4a), -0.03, 0.36, 0),
    box(0.04, 0.2, 0.04, mat(0xffffff), 0.03, 0.34, 0.02),
  );

  const eye = mat(0xff4d4d, { emissive: 0xaa1111 });
  group.add(
    legL,
    legR,
    armL,
    armR,
    quiver,
    box(0.5, 0.7, 0.34, bodyMat, 0, 0.8, 0),
    // Cloak down the back and a mantle over the shoulders.
    box(0.56, 0.75, 0.06, cloak, 0, 0.75, -0.2),
    box(0.64, 0.16, 0.42, cloak, 0, 1.18, 0),
    // Hood with a point, and a dark face with red eyes inside it.
    box(0.44, 0.42, 0.42, bodyMat, 0, 1.38, 0),
    box(0.3, 0.2, 0.3, bodyMat, 0, 1.68, -0.03),
    box(0.14, 0.16, 0.14, bodyMat, 0, 1.84, -0.08),
    box(0.32, 0.24, 0.03, dark, 0, 1.36, 0.215),
    box(0.08, 0.06, 0.03, eye, -0.08, 1.38, 0.235),
    box(0.08, 0.06, 0.03, eye, 0.08, 1.38, 0.235),
  );
  return { group, armL, armR, legL, legR, bodyMat, bow, bowMat: wood };
}

/** An arrow in flight. Its middle is the origin and its point faces +z. */
export function makeArrow(): THREE.Group {
  const group = new THREE.Group();
  group.add(
    box(0.05, 0.05, 0.7, mat(0xf0e2b0, { emissive: 0x403418 }), 0, 0, 0),
    box(0.1, 0.1, 0.16, mat(0xc8ccd4), 0, 0, 0.4),
    box(0.12, 0.03, 0.14, mat(0xe24a4a), 0, 0, -0.32),
    box(0.03, 0.12, 0.14, mat(0xe24a4a), 0, 0, -0.32),
  );
  return group;
}

/** A regular tree. Its canopy top is 3.8 to 4.0 up, matching its solid block. */
export function makeTree(seed: number): THREE.Group {
  const group = new THREE.Group();
  const tall = 2.0 + (seed % 3) * 0.1;
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

/**
 * A great tree: a thick trunk and a wide, flat-topped canopy that looks like
 * something you can stand on. Exactly 5.0 tall, matching its solid block.
 */
export function makeGreatTree(seed: number): THREE.Group {
  const group = new THREE.Group();
  const bark = mat(0x6b4526);
  const leaf = mat([0x2f8a55, 0x3a9660][seed % 2]);
  const leafLight = mat([0x4aa86a, 0x56b574][seed % 2]);
  group.add(
    box(0.6, 4.4, 0.6, bark, 0, 2.2, 0),
    // Two stubby branches so the trunk reads as climbable.
    box(0.9, 0.2, 0.22, bark, 0.5, 2.3, 0),
    box(0.22, 0.2, 0.9, bark, 0, 3.0, -0.5),
    box(1.8, 0.5, 1.8, leaf, 0, 4.15, 0),
    box(2.2, 0.6, 2.2, leaf, 0, 4.7, 0),
    // A lighter rim on top picks out the flat landing.
    box(1.5, 0.04, 1.5, leafLight, 0, 4.98, 0),
  );
  group.rotation.y = (seed % 4) * 0.1;
  return group;
}

/**
 * A palm: a slim ringed trunk, a little paler than a tree's, and a crown of
 * drooping fronds. Frond roots sit just under the top of the crown and they fall
 * outward and down, so nothing stands hidden on top. `top` is the height of the
 * solid block.
 */
function makePalmOf(seed: number, top: number, trunk: number, size: number): THREE.Group {
  const group = new THREE.Group();
  const bark = mat(0x9a7248);
  const ring = mat(0x7d5a38);
  const hubTop = top;
  group.add(box(trunk * 0.8, top - 0.2, trunk * 0.8, bark, 0, (top - 0.2) / 2, 0));
  for (let y = 0.2; y < top - 0.3; y += 0.3) group.add(box(trunk, 0.09, trunk, ring, 0, y, 0));
  // Hub with a few coconuts hanging below it.
  group.add(box(trunk * 1.5, 0.2, trunk * 1.5, mat(0x6b4a2c), 0, hubTop - 0.1, 0));
  for (const [x, z] of [[-1, -1], [1, 1], [1, -1]] as const) {
    group.add(box(0.16, 0.16, 0.16, mat(0x4a331e), x * trunk * 0.5, hubTop - 0.3, z * trunk * 0.5));
  }
  const leaves = [mat(0x3c9a48), mat(0x4aa856), mat(0x2f8a45)];
  const fronds = size > 1 ? 8 : 7;
  for (let n = 0; n < fronds; n++) {
    const root = new THREE.Group();
    root.position.y = hubTop - 0.14;
    root.rotation.y = (n / fronds) * Math.PI * 2 + seed * 0.3;
    const leaf = leaves[(n + seed) % 3];
    // Three segments, each drooping further than the last, so the tip hangs.
    let parent: THREE.Group = root;
    parent.rotation.z = -0.12;
    const lens = [0.7 * size, 0.6 * size, 0.45 * size];
    const droop = [0, -0.5, -0.6];
    lens.forEach((len, k) => {
      const seg = new THREE.Group();
      seg.position.x = k === 0 ? 0.1 : lens[k - 1];
      seg.rotation.z = droop[k];
      seg.add(box(len, 0.05, 0.3 * size * (1 - k * 0.2), leaf, len / 2, 0, 0));
      parent.add(seg);
      parent = seg;
    });
    group.add(root);
  }
  group.rotation.y = (seed % 4) * 0.2;
  return group;
}

/** A palm, 3.8 to 4.0 up like a regular tree, matching its solid block. */
export function makePalm(seed: number): THREE.Group {
  return makePalmOf(seed, 3.8 + (seed % 3) * 0.1, 0.26, 1);
}

/** A great palm, exactly 5.0 tall like a great tree, with a thicker trunk and bigger fronds. */
export function makeGreatPalm(seed: number): THREE.Group {
  return makePalmOf(seed, 5.0, 0.36, 1.3);
}

/**
 * An acacia: a thin dark trunk with a wide, flat, layered umbrella canopy in
 * olive green. `top` is the height of the solid block, `span` the canopy width.
 */
function makeAcaciaOf(seed: number, top: number, trunk: number, span: number): THREE.Group {
  const group = new THREE.Group();
  const bark = mat(0x4a3526);
  const leaves = [mat(0x6b7a2f), mat(0x75842f), mat(0x61722c)];
  const leaf = leaves[seed % 3];
  const lower = top - 0.55;
  group.add(
    box(trunk, lower, trunk, bark, 0, lower / 2, 0),
    // Two forks carry the layers, so the tree reads as an umbrella on a stalk.
    box(trunk * 0.7, 0.5, trunk * 0.7, bark, trunk * 0.9, lower + 0.05, 0),
    box(trunk * 0.7, 0.5, trunk * 0.7, bark, -trunk * 0.9, lower - 0.1, 0),
    box(span, 0.22, span * 0.9, leaf, 0, top - 0.5, 0),
    box(span * 0.72, 0.22, span * 0.65, leaves[(seed + 1) % 3], span * 0.05, top - 0.3, 0),
    box(span * 0.4, 0.18, span * 0.4, leaves[(seed + 2) % 3], 0, top - 0.09, 0),
  );
  group.rotation.y = (seed % 4) * 0.4;
  return group;
}

/** An acacia, 4.0 up exactly like a regular tree's solid block. */
export function makeAcacia(seed: number): THREE.Group {
  return makeAcaciaOf(seed, 4.0, 0.22, 2.1);
}

/** A great acacia, exactly 5.0 tall like a great tree, with a stouter trunk and a broader flat top. */
export function makeGreatAcacia(seed: number): THREE.Group {
  const tree = makeAcaciaOf(seed, 5.0, 0.4, 2.7);
  // Two stubby branches so the trunk reads as climbable, like the other great trees.
  tree.add(box(0.8, 0.18, 0.2, mat(0x4a3526), 0.45, 2.3, 0), box(0.2, 0.18, 0.8, mat(0x4a3526), 0, 3.0, -0.45));
  return tree;
}

/**
 * A great banyan for the ruins, exactly 5.0 tall like a great tree: a thick
 * pale trunk with buttress roots, a wide dark crown, and hanging aerial roots.
 */
export function makeGreatBanyan(seed: number): THREE.Group {
  const group = new THREE.Group();
  const trunk = mat(0xb9b2a0);
  const root = mat(0x8f8873);
  const crowns = [mat(0x1f4a3a), mat(0x24523f), mat(0x1a4033)];
  group.add(
    box(0.7, 4.4, 0.7, trunk, 0, 2.2, 0),
    // Buttress roots flare at the foot.
    box(1.3, 0.5, 0.25, root, 0, 0.25, 0),
    box(0.25, 0.5, 1.3, root, 0, 0.25, 0),
    // Two stubby branches so the trunk reads as climbable.
    box(1.0, 0.2, 0.24, trunk, 0.55, 2.3, 0),
    box(0.24, 0.2, 1.0, trunk, 0, 3.0, -0.55),
    // A wide, low crown in dark layers.
    box(3.4, 0.7, 3.2, crowns[seed % 3], 0, 4.55, 0),
    box(2.4, 0.55, 2.4, crowns[(seed + 1) % 3], 0.1, 4.75, 0.1),
  );
  // Aerial roots hang from the crown's rim, reaching the ground or not.
  const hang: [number, number, number][] = [
    [1.5, 1.4, 1.0],
    [-1.4, 2.6, 0.7],
    [1.2, -1.3, 1.8],
    [-1.3, -1.2, 0.6],
    [0.2, 1.55, 2.2],
  ];
  for (const [x, z, len] of hang) group.add(box(0.07, len, 0.07, root, x, 4.3 - len / 2, z));
  group.rotation.y = (seed % 4) * 0.4;
  return group;
}

/** A pine: a short trunk and stacked tiers with snow on top. Its top is 3.8 to 4.0 up, matching its solid block. */
export function makePine(seed: number): THREE.Group {
  const group = new THREE.Group();
  const needle = mat([0x1f5a3a, 0x255f3f, 0x1b5036][seed % 3]);
  const snow = mat(0xf4f8ff);
  const top = 3.8 + (seed % 2) * 0.2;
  group.add(
    box(0.3, 1.0, 0.3, mat(0x5a3c24), 0, 0.5, 0),
    box(1.7, 0.7, 1.7, needle, 0, 1.2, 0),
    box(1.75, 0.08, 1.75, snow, 0, 1.58, 0),
    box(1.3, 0.7, 1.3, needle, 0, 1.95, 0),
    box(1.35, 0.08, 1.35, snow, 0, 2.33, 0),
    box(0.9, 0.7, 0.9, needle, 0, 2.7, 0),
    box(0.95, 0.08, 0.95, snow, 0, 3.08, 0),
    box(0.5, top - 3.12, 0.5, needle, 0, 3.12 + (top - 3.12) / 2, 0),
    box(0.54, 0.1, 0.54, snow, 0, top - 0.05, 0),
  );
  group.rotation.y = (seed % 4) * 0.2;
  return group;
}

/**
 * A great pine: a thick trunk and wide, snow-laden tiers that step in toward a
 * flat white top you can stand on. Much wider and fuller than a small pine.
 * Exactly 5.0 tall, matching its solid block.
 */
export function makeGreatPine(seed: number): THREE.Group {
  const group = new THREE.Group();
  const bark = mat(0x4f3420);
  const barkLight = mat(0x6a4a30);
  const dark = mat([0x15472f, 0x1a5035][seed % 2]);
  const mid = mat([0x1d5a3c, 0x226640][seed % 2]);
  const snow = mat(0xf6faff);
  const shade = mat(0xdbe8f6);

  group.add(
    box(0.6, 4.2, 0.6, bark, 0, 2.1, 0),
    // Bark stripes and two stubby branches, so the trunk reads as climbable.
    box(0.64, 3.0, 0.2, barkLight, 0, 1.6, 0.2),
    box(0.9, 0.2, 0.22, bark, 0.5, 2.3, 0),
    box(0.22, 0.2, 0.9, bark, 0, 3.0, -0.5),
    // Snow drifted round the foot of the trunk.
    box(1.1, 0.14, 1.1, snow, 0, 0.07, 0),
  );

  // Four tiers, each a dark skirt under a lighter body with snow piled on top.
  const tiers: { w: number; y: number; h: number; c: THREE.Material }[] = [
    { w: 2.6, y: 2.75, h: 0.45, c: dark },
    { w: 2.3, y: 3.35, h: 0.5, c: mid },
    { w: 2.0, y: 3.95, h: 0.5, c: dark },
    { w: 1.7, y: 4.5, h: 0.5, c: mid },
  ];
  tiers.forEach((t, n) => {
    group.add(
      // A wider, lower skirt of boughs, then the tier itself.
      box(t.w + 0.2, 0.16, t.w + 0.2, dark, 0, t.y - t.h / 2 + 0.08, 0),
      box(t.w, t.h, t.w, t.c, 0, t.y, 0),
      // Snow lies thick along the rim of each tier and a little further in.
      box(t.w + 0.06, 0.1, t.w + 0.06, snow, 0, t.y + t.h / 2 + 0.03, 0),
      box(t.w * 0.55, 0.08, t.w * 0.55, shade, 0, t.y + t.h / 2 + 0.1, 0),
    );
    // Clumps of snow slumped over the corners, and bough tips poking out.
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      const d = t.w / 2;
      group.add(box(0.34, 0.2, 0.34, snow, sx * (d - 0.08), t.y + t.h / 2 - 0.1, sz * (d - 0.08)));
      if ((n + sx + sz + seed) % 3 === 0) group.add(box(0.22, 0.1, 0.22, snow, sx * (d + 0.05), t.y - t.h / 2 + 0.05, sz * (d + 0.05)));
    }
  });

  // The flat white top you can stand on: exactly 5.0.
  group.add(box(1.8, 0.2, 1.8, snow, 0, 4.82, 0), box(1.9, 0.12, 1.9, snow, 0, 4.94, 0));
  group.rotation.y = (seed % 4) * 0.1;
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

  // A shimmering cage holds the light until the puzzle is solved.
  const cage = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 1.9, 1.1),
    new THREE.MeshBasicMaterial({ color: 0xb48cff, transparent: true, opacity: 0.28, depthWrite: false }),
  );
  cage.position.y = 0.95;
  group.add(flame, cage);
  return { group, flame, cage };
}

/**
 * A sea pickle, for a puzzle whose candle stands in the water: a fat upright
 * yellow-green gherkin about 1.1 tall with darker bumps, and a soft glow above
 * it where the flame would be. It hands back the same parts as a candle.
 */
export function makePickle(rise = 0): CandleModel {
  const group = new THREE.Group();
  // Unlit materials, so the pickle glows at the bottom of a dark pit.
  const body = new THREE.MeshBasicMaterial({ color: 0xc4e84a });
  const bump = new THREE.MeshBasicMaterial({ color: 0x86b02c });
  group.add(
    box(0.4, 0.14, 0.4, body, 0, 0.07, 0),
    box(0.54, 0.8, 0.54, body, 0, 0.54, 0),
    box(0.36, 0.16, 0.36, body, 0, 1.02, 0),
    box(0.1, 0.1, 0.1, bump, 0, 1.12, 0),
  );
  // Darker bumps on every side.
  const bumps: [number, number, number][] = [
    [0.28, 0.35, 0.1],
    [0.28, 0.7, -0.12],
    [-0.28, 0.5, 0.12],
    [-0.28, 0.85, -0.1],
  ];
  for (const [x, y, z] of bumps) {
    group.add(box(0.1, 0.12, 0.12, bump, x, y, z), box(0.12, 0.12, 0.1, bump, z, y, x));
  }
  const flame = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.13),
    new THREE.MeshBasicMaterial({ color: 0xf2ff8a }),
  );
  flame.scale.set(1, 1.7, 1);
  flame.position.y = 1.32;
  flame.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xd8ff5a, transparent: true, opacity: 0.25, depthWrite: false }),
    ),
  );

  // The same shimmering cage holds the light until the puzzle is solved.
  const cage = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 1.7, 0.95),
    new THREE.MeshBasicMaterial({ color: 0xb48cff, transparent: true, opacity: 0.28, depthWrite: false }),
  );
  cage.position.y = 0.85;
  group.add(flame, cage);
  // A pale glow column from the pickle up to the water surface, so it reads
  // through the sea from the fixed camera. Looks only.
  if (rise > 1.5) {
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, rise, 0.7),
      new THREE.MeshBasicMaterial({
        color: 0xd8ff5a,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    beam.name = 'pickle-glow';
    beam.position.y = rise / 2;
    group.add(beam);
  }
  return { group, flame, cage };
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
