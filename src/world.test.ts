import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { NOTES } from './audio';
import { ICE_REGROW } from './forms';
import { Island, Kind, NO_STAND, seaWater, TANGLE_GAP, TREE_BLOCK, World } from './world';

const tiny = (extra: Partial<ReturnType<Island['build']>> = {}, id = 'tiny'): Island => ({
  id,
  name: 'Tiny',
  build(t) {
    t.rect(2, 2, 6, 6, (i, j) => t.set(i, j, 3, Kind.Grass));
    return { spawn: { x: 3.5, z: 3.5 }, ...extra };
  },
});

describe('the default world', () => {
  const world = new World();
  const { layout } = world;

  it('is 1136 by 64 tiles with the meadow where it always was', () => {
    expect(world.width).toBe(1136);
    expect(world.depth).toBe(64);
    expect(layout.spawn).toEqual({ x: 10.5, z: 27.5 });
    expect(world.groundAt(10.5, 27.5)).toBe(2);
  });

  it('gives every melody distinct notes that exist', () => {
    for (const p of layout.puzzles) {
      expect(new Set(p.melody).size, p.id).toBe(p.melody.length);
      for (const n of p.melody) expect(NOTES[n], `${p.id} note ${n}`).toBeDefined();
    }
  });

  it('makes trees solid to the height of their kind', () => {
    expect(layout.trees.length).toBeGreaterThan(0);
    for (const t of layout.trees) {
      expect(world.treeAt(t.x, t.z)).toBe(TREE_BLOCK[t.kind]);
      expect(world.solidAt(t.x, t.z)).toBe(world.groundAt(t.x, t.z) + TREE_BLOCK[t.kind]);
    }
    expect(world.treeAt(10.5, 27.5)).toBe(0);
  });

  it('makes acacias block and climb exactly like regular and great trees', () => {
    const isl: Island = {
      id: 'savanna',
      name: 'Savanna',
      build(t) {
        t.rect(2, 2, 8, 6, (i, j) => t.set(i, j, 3, Kind.Straw));
        t.set(9, 4, 3, Kind.Clay);
        return {
          spawn: { x: 3.5, z: 3.5 },
          trees: [
            { x: 5.5, z: 4.5, kind: 'acacia' },
            { x: 7.5, z: 4.5, kind: 'greatAcacia' },
          ],
        };
      },
    };
    const w = new World([isl]);
    expect(w.treeAt(5.5, 4.5)).toBe(TREE_BLOCK.regular);
    expect(w.treeAt(7.5, 4.5)).toBe(TREE_BLOCK.great);
    expect(w.solidAt(7.5, 4.5)).toBe(3 + TREE_BLOCK.great);
    expect(w.groundAt(9.5, 4.5)).toBe(3);
  });

  it('has a tanglewood arrival to cross to', () => {
    expect(layout.arrivals.map((a) => a.id)).toContain('tanglewood');
  });
});

describe('building from islands', () => {
  it('merges what every island places', () => {
    const w = new World([
      tiny({ checkpoints: [{ id: 'a', x: 4.5, z: 4.5 }] }),
      { id: 'b', name: 'B', build: () => ({ checkpoints: [{ id: 'b', x: 1, z: 1 }], hints: [] }) },
    ]);
    expect(w.layout.checkpoints.map((c) => c.id)).toEqual(['a', 'b']);
    expect(w.layout.puzzles).toEqual([]);
  });

  it('makes boulders solid', () => {
    const w = new World([tiny({ boulders: [{ x: 5.5, z: 5.5 }] })]);
    expect(w.solidAt(5.5, 5.5)).toBeCloseTo(3.9);
  });

  it('lets nothing stand on a speaker, candle or checkpoint', () => {
    const w = new World([
      tiny({
        checkpoints: [{ id: 'a', x: 4.5, z: 4.5 }],
        puzzles: [{ id: 'p', speaker: { x: 3.5, z: 5.5 }, candle: { x: 5.5, z: 3.5 }, melody: [0] }],
      }),
    ]);
    for (const s of [{ x: 4.5, z: 4.5 }, { x: 3.5, z: 5.5 }, { x: 5.5, z: 3.5 }]) {
      expect(w.solidAt(s.x, s.z), `${s.x},${s.z}`).toBeGreaterThanOrEqual(NO_STAND);
      expect(w.groundAt(s.x, s.z)).toBe(3);
    }
    // The ground next to them is untouched.
    expect(w.solidAt(4.5, 5.5)).toBe(3);
  });

  it('refuses a world with no spawn point', () => {
    expect(() => new World([{ id: 'x', name: 'X', build: () => ({}) }])).toThrow(/spawn/);
  });

  it('refuses two things with the same id', () => {
    const cp = { checkpoints: [{ id: 'same', x: 4.5, z: 4.5 }] };
    expect(() => new World([tiny(cp, 'one'), tiny(cp, 'two')])).toThrow(/same/);
  });
});

// A small island with a strip of thin ice at height 3.5 beside it: tile 10
// over sky, tile 11 over a water tile (a pond bed at height 1).
const iceyIsland: Island = {
  id: 'icey',
  name: 'Icey',
  build(t) {
    t.rect(2, 2, 6, 6, (i, j) => t.set(i, j, 3, Kind.Grass));
    t.set(11, 4, 1, Kind.Sand);
    t.setWater(11, 4, true);
    t.setThinIce(10, 4, 3.5);
    t.setThinIce(11, 4, 3.5);
    return { spawn: { x: 3.5, z: 3.5 } };
  },
};

describe('thin ice', () => {
  const sky = { x: 10.5, z: 4.5 };
  const pond = { x: 11.5, z: 4.5 };

  it('is solid ground at its height while whole, over sky and over water', () => {
    const w = new World([iceyIsland]);
    for (const s of [sky, pond]) {
      expect(w.solidAt(s.x, s.z)).toBe(3.5);
      expect(w.groundAt(s.x, s.z)).toBe(3.5);
      expect(w.solidUnder(s.x, s.z, 0.3)).toBe(3.5);
      expect(w.isVoid(s.x, s.z)).toBe(false);
      expect(w.isWater(s.x, s.z)).toBe(false);
      expect(w.isThinIce(s.x, s.z)).toBe(true);
    }
  });

  it('leaves the tile underneath unchanged, so broken ice is sky or water again', () => {
    const w = new World([iceyIsland]);
    w.breakIce([sky, pond]);
    expect(w.solidAt(sky.x, sky.z)).toBe(-Infinity);
    expect(w.isVoid(sky.x, sky.z)).toBe(true);
    expect(w.isWater(pond.x, pond.z)).toBe(true);
    expect(w.groundAt(pond.x, pond.z)).toBe(1);
    // Still thin ice, just not whole.
    expect(w.isThinIce(sky.x, sky.z)).toBe(true);
    expect(w.isIceIntact(sky.x, sky.z)).toBe(false);
  });

  it('counts for the island bounds, and a plain tile is not thin ice', () => {
    const w = new World([iceyIsland]);
    expect(w.bounds[0].i1).toBe(11);
    expect(w.isThinIce(3.5, 3.5)).toBe(false);
  });

  it('grows back ICE_REGROW seconds after breaking, but not under the player', () => {
    const w = new World([iceyIsland]);
    w.breakIce([sky]);
    const away = { x: 30, z: 30 };
    w.stepIce(ICE_REGROW - 0.1, away.x, away.z, 0.3);
    expect(w.isIceIntact(sky.x, sky.z)).toBe(false);
    // Someone is in the column, even only just: it waits.
    w.stepIce(0.2, sky.x + 0.65, sky.z, 0.3);
    expect(w.isIceIntact(sky.x, sky.z)).toBe(false);
    w.stepIce(0.01, sky.x + 0.8, sky.z, 0.3);
    expect(w.isIceIntact(sky.x, sky.z)).toBe(true);
    expect(w.solidAt(sky.x, sky.z)).toBe(3.5);
  });

  it('comes back all at once on resetIce', () => {
    const w = new World([iceyIsland]);
    w.breakIce([sky, pond]);
    w.resetIce();
    expect(w.isIceIntact(sky.x, sky.z)).toBe(true);
    expect(w.isIceIntact(pond.x, pond.z)).toBe(true);
  });

  it('names its whole tiles under a footprint, but not ones far below the feet', () => {
    const w = new World([iceyIsland]);
    // Standing on the seam of the two tiles.
    expect(w.iceHolding(11, 4.5, 0.3, 3.5)).toHaveLength(2);
    expect(w.iceHolding(11, 4.5, 0.3, 6)).toHaveLength(0);
    w.breakIce([sky]);
    expect(w.iceHolding(11, 4.5, 0.3, 3.5)).toEqual([pond]);
  });
});

describe('root tangles', () => {
  const world = new World([
    {
      id: 'tangly',
      name: 'Tangly',
      build(t) {
        t.rect(2, 2, 8, 6, (i, j) => t.set(i, j, 3, Kind.Moss));
        t.setTangle(5, 4);
        t.setTangle(6, 4, 0.5);
        t.setTangle(7, 4);
        t.clear(7, 4);
        t.set(7, 4, 3, Kind.Bark);
        return { spawn: { x: 3.5, z: 3.5 } };
      },
    },
  ]);

  it('is a wall to anything taller than the gap and plain ground to the rest', () => {
    expect(world.isTangle(5.5, 4.5)).toBe(true);
    expect(world.tangleGapAt(5.5, 4.5)).toBe(TANGLE_GAP);
    expect(world.tangleGapAt(6.5, 4.5)).toBe(0.5);
    expect(world.solidAt(5.5, 4.5)).toBeGreaterThanOrEqual(NO_STAND);
    expect(world.solidAt(5.5, 4.5, 0.3)).toBeGreaterThanOrEqual(NO_STAND);
    expect(world.solidAt(5.5, 4.5, 0.2)).toBe(3);
    expect(world.solidUnder(5.5, 4.5, 0.3, 0.2)).toBe(3);
    expect(world.solidUnder(5.5, 3.9, 0.3)).toBeGreaterThanOrEqual(NO_STAND);
    expect(world.groundAt(5.5, 4.5)).toBe(3);
    // A gap of 0.5 lets a taller body in too, up to its own height.
    expect(world.solidAt(6.5, 4.5, 0.4)).toBe(3);
    expect(world.solidAt(6.5, 4.5, 0.6)).toBeGreaterThanOrEqual(NO_STAND);
  });

  it('draws one faint, see-through strand per ant tangle tile, and a burrow instead on a wide gap', () => {
    const strands = world.group.getObjectByName('tangle-strands') as THREE.InstancedMesh;
    // Two ant tangles (one cleared later leaves its weave); the 0.5 gap is a burrow, with no strand.
    expect(strands.count).toBe(1);
    expect((world.group.getObjectByName('burrow-mouth') as THREE.InstancedMesh).count).toBe(1);
    const mat = strands.material as THREE.MeshLambertMaterial;
    expect(mat.transparent).toBe(true);
    expect(mat.opacity).toBeLessThanOrEqual(0.3);
    expect(mat.depthWrite).toBe(false);
    expect(strands.castShadow).toBe(false);
  });

  it('is removed by clear, and Moss and Bark are ordinary ground', () => {
    expect(world.isTangle(7.5, 4.5)).toBe(false);
    expect(world.solidAt(7.5, 4.5)).toBe(3);
    expect(world.solidAt(3.5, 3.5)).toBe(3);
  });
});

describe('kelp mats', () => {
  const pond = (depth: number, bed: number, wet = true): Island => ({
    id: 'pond',
    name: 'Pond',
    build(t) {
      t.rect(2, 2, 6, 6, (i, j) => t.set(i, j, bed, Kind.Sand));
      t.rect(2, 2, 6, 6, (i, j) => t.setWater(i, j, wet));
      t.setKelp(4, 4, depth);
      return { spawn: { x: 3.5, z: 3.5 } };
    },
  });

  it('wall off a body that cannot get under, and let one that can through', () => {
    const world = new World([pond(5, -5)]);
    expect(world.isKelp(4.5, 4.5)).toBe(true);
    expect(world.kelpDepthAt(4.5, 4.5)).toBe(5);
    expect(world.kelpDepthAt(3.5, 3.5)).toBe(0);
    expect(world.solidAt(4.5, 4.5)).toBe(-5 + NO_STAND);
    expect(world.solidAt(4.5, 4.5, 1.6, 4)).toBe(-5 + NO_STAND);
    expect(world.solidAt(4.5, 4.5, 1.4, Infinity)).toBe(-5);
    expect(world.solidAt(4.5, 4.5, 1.6, 6.6)).toBe(-5);
  });

  it('hang fronds down to the mat depth, darker when deep, with nothing tall above the water', () => {
    const lum = (mesh: THREE.InstancedMesh): number => {
      const c = new THREE.Color();
      mesh.getColorAt(0, c);
      return c.getHSL({ h: 0, s: 0, l: 0 }).l;
    };
    const low = new World([pond(2, -5)]);
    const deep = new World([pond(5, -5)]);
    const fronds = (w: World) => w.group.getObjectByName('kelp-fronds') as THREE.InstancedMesh;
    const mats = (w: World) => w.group.getObjectByName('kelp-mats') as THREE.InstancedMesh;
    expect(lum(fronds(deep))).toBeLessThan(lum(fronds(low)));
    expect(lum(mats(deep))).toBeLessThan(lum(mats(low)));
    for (const [w, d] of [[low, 2], [deep, 5]] as const) {
      const b = new THREE.Box3().setFromObject(fronds(w));
      expect(b.min.y).toBeLessThan(w.waterLevel - d * 0.7);
      expect(b.max.y).toBeLessThanOrEqual(w.waterLevel + 1e-4);
      expect(new THREE.Box3().setFromObject(mats(w)).max.y).toBeLessThan(w.waterLevel + 0.25);
    }
  });

  it('must be on water with room for a body under the mat', () => {
    expect(() => new World([pond(5, -5, false)])).toThrow(/not on a water tile/);
    expect(() => new World([pond(5, -4)])).toThrow(/too shallow/);
    expect(() => new World([pond(5, -4.3)])).not.toThrow();
  });
});

describe('who owns the look of a tile', () => {
  const world = new World();
  const tiles = (keep: (i: number, j: number) => boolean): { i: number; j: number }[] => {
    const out: { i: number; j: number }[] = [];
    for (let j = 0; j < world.depth; j++) for (let i = 0; i < world.width; i++) if (keep(i, j)) out.push({ i, j });
    return out;
  };
  /** Water in the grid, whether or not a thin sheet lies over it. */
  const hasWater = (i: number, j: number): boolean => (world as any).water[j * world.width + i] === 1;
  const hexOf = (mesh: THREE.InstancedMesh, n: number): number => {
    const c = new THREE.Color();
    mesh.getColorAt(n, c);
    return c.getHex();
  };
  const hex = (h: number): number => new THREE.Color(h).getHex();
  /** The slab and frame colours drawn for a thin-sheet tile. */
  const sheetColors = (i: number, j: number): { slab: number; frame: number } => {
    const draw = (world as any).iceSlot.get(j * world.width + i);
    return { slab: hexOf(draw.slab, draw.slot), frame: hexOf(draw.cracks, draw.slot) };
  };
  const sheets = (owner: string) => tiles((i, j) => world.isThinIce(i + 0.5, j + 0.5) && world.ownerAt(i, j) === owner);

  it('says which island shaped a tile, and nothing for sky', () => {
    expect(world.ownerAt(10, 27)).toBe('meadow');
    expect(world.ownerAt(-1, 0)).toBe('');
    expect(world.ownerAt(0, 0)).toBe('');
  });

  it('keeps Saltmere out of the frost look', () => {
    const salt = tiles((i, j) => world.ownerAt(i, j) === 'saltmere');
    expect(salt.length).toBeGreaterThan(0);
    for (const t of salt) expect(world.isFrostTile(t.i, t.j)).toBe(false);
    expect(tiles((i, j) => world.isFrostTile(i, j)).every((t) => world.ownerAt(t.i, t.j) === 'frostfang')).toBe(true);
  });

  it('draws every thin sheet of Saltmere as salt crust: pale, pink-grey, no frost or leaf colour', () => {
    const list = sheets('saltmere');
    expect(list.length).toBeGreaterThan(0);
    for (const t of list) {
      const { slab, frame } = sheetColors(t.i, t.j);
      expect(slab, `${t.i},${t.j}`).toBe(hex(0xf0e4e6));
      expect(frame).toBe(hex(0xaaa5a9));
      expect(slab).not.toBe(hex(0xa8dcff));
      expect(slab).not.toBe(hex(0xc4c25a));
    }
    const crust = world.group.getObjectByName('salt-crust') as THREE.InstancedMesh;
    expect(crust.count).toBe(list.length);
    // No blue glow on the crust.
    expect((crust.material as THREE.MeshLambertMaterial).emissive.getHex()).toBe(0);
  });

  it('draws Frostfang sheets as ice and Underroot sheets as leaf mats, as before', () => {
    const ice = sheets('frostfang');
    const leaf = sheets('underroot');
    expect(ice.length).toBeGreaterThan(0);
    expect(leaf.length).toBeGreaterThan(0);
    for (const t of ice) expect(sheetColors(t.i, t.j)).toEqual({ slab: hex(0xa8dcff), frame: hex(0xffffff) });
    for (const t of leaf) expect(sheetColors(t.i, t.j)).toEqual({ slab: hex(0xc4c25a), frame: hex(0x2f5a28) });
  });

  it('draws Sunveld thin sheets as sun crust, not ice or salt, and brittle crust paler than it', () => {
    const own = tiles((i, j) => world.isThinIce(i + 0.5, j + 0.5) && world.ownerAt(i, j).startsWith('sunveld'));
    expect(own.length).toBeGreaterThan(0);
    const crust = world.group.getObjectByName('sun-crust') as THREE.InstancedMesh;
    expect(crust).toBeTruthy();
    for (const t of own) {
      const d = (world as any).iceSlot.get(t.j * world.width + t.i);
      if (d.slab.name === 'brittle') continue;
      expect(d.slab.name, `${t.i},${t.j}`).toBe('sun-crust');
      expect(sheetColors(t.i, t.j)).toEqual({ slab: hex(0xd9b27a), frame: hex(0x7a4a22) });
    }
  });

  it('draws Sunveld water as mud, not Saltmere sea or bright pond blue', () => {
    const mesh = world.group.getObjectByName('water') as THREE.InstancedMesh;
    const muddy = [0x8a7b43, 0x66652f, 0x3a4524].map(hex);
    let found = 0;
    const wet = tiles((i, j) => hasWater(i, j) && world.ownerAt(i, j) !== 'saltmere');
    wet.forEach((t, n) => {
      if (!world.ownerAt(t.i, t.j).startsWith('sunveld')) return;
      found++;
      expect(muddy).toContain(hexOf(mesh, n));
    });
    expect(found).toBeGreaterThan(0);
  });

  it('keeps the water of the older islands exactly as it was', () => {
    const mesh = world.group.getObjectByName('water') as THREE.InstancedMesh;
    const wet = tiles((i, j) => hasWater(i, j) && world.ownerAt(i, j) !== 'saltmere');
    expect(mesh.count).toBe(wet.length);
    expect((mesh.material as THREE.MeshLambertMaterial).opacity).toBe(0.72);
    wet.forEach((t, n) => {
      if (world.ownerAt(t.i, t.j).startsWith('sunveld')) return;
      const want = world.isThinIce(t.i + 0.5, t.j + 0.5) ? 0x2f7fb5 : world.isFrostTile(t.i, t.j) ? 0x3aa0d0 : 0x4cc3f0;
      expect(hexOf(mesh, n), `${t.i},${t.j}`).toBe(hex(want));
    });
  });

  it('paints Saltmere water turquoise, darker and bluer the deeper the bed, and a little clearer', () => {
    const mesh = world.group.getObjectByName('sea-water') as THREE.InstancedMesh;
    const wet = tiles((i, j) => hasWater(i, j) && world.ownerAt(i, j) === 'saltmere');
    expect(mesh.count).toBe(wet.length);
    expect((mesh.material as THREE.MeshLambertMaterial).opacity).toBeLessThan(0.72);
    const seen = new Map<number, number>();
    wet.forEach((t, n) => {
      const depth = world.waterLevelAt(t.i + 0.5, t.j + 0.5) - world.groundAt(t.i + 0.5, t.j + 0.5);
      const got = hexOf(mesh, n);
      expect(got).toBe(hex(seaWater(depth)));
      seen.set(Math.round(depth * 100) / 100, got);
    });
    expect(hex(seaWater(2))).toBe(hex(0x46e0d2));
    expect(hex(seaWater(4))).toBe(hex(0x1f9ab8));
    expect(hex(seaWater(7))).toBe(hex(0x0b3f7a));
    const lum = (h: number): number => new THREE.Color(h).getHSL({ h: 0, s: 0, l: 0 }).l;
    expect(lum(seaWater(2))).toBeGreaterThan(lum(seaWater(4)));
    expect(lum(seaWater(4))).toBeGreaterThan(lum(seaWater(7)));
  });
});
