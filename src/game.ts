import * as THREE from 'three';
import { sound } from './audio';
import { WaterPowers } from './waterpowers';
import { Arrows } from './arrows';
import { Enemy } from './enemy';
import { FORMS, lightsNeeded, swordTier } from './forms';
import { Card, Hud } from './hud';
import { Input } from './input';
import { coldAt, Snowfall } from './frost';
import { hash } from './layout';
import {
  makeAcacia,
  makeBoulder,
  makeCloud,
  makeGreatAcacia,
  makeGreatBanyan,
  makeGreatPalm,
  makeGreatPine,
  makeGreatTree,
  makePalm,
  makePine,
  makeTree,
} from './models';
import { Particles } from './particles';
import { Player } from './player';
import { PuzzleUi } from './puzzleUi';
import { clearSave, freshSave, loadSave, SaveData, writeSave } from './save';
import { BreadPickup, Checkpoint, Puzzle, REACH, REACH_HEIGHT } from './things';
import { Arrival, World, WORLD_WIDTH } from './world';

const VIEW_HEIGHT = 15; // world units visible top to bottom
// The camera sits to the south-west and looks north-east, so ground that
// steps up toward the east or north shows its face to the player.
const CAMERA_DIR = new THREE.Vector3(-1, 1.12, 1).normalize();
const HUNTED_RANGE = 12; // bad guys this close that are alert stop you using a speaker
const CANDLE_LIGHTS = 4; // point lights shared by the candles nearest the player
// Background clouds drift east across the whole world, then wrap around.
const CLOUD_MIN_X = -30;
const CLOUD_MAX_X = WORLD_WIDTH + 10;
const CLOUD_COUNT = Math.round((CLOUD_MAX_X - CLOUD_MIN_X) / 4); // about one per four tiles

interface Hint {
  id: string;
  text: string;
  /** Show this hint only while this is true. */
  when: () => boolean;
  /** Once this is true the hint is finished for good. */
  done: () => boolean;
}

interface FlyingLight {
  mesh: THREE.Mesh;
  from: THREE.Vector3;
  t: number;
}

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.OrthographicCamera;
  private camTarget = new THREE.Vector3();
  private sun: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private snowfall: Snowfall;
  private clock = new THREE.Clock();
  private time = 0;

  private world: World;
  private player: Player;
  private enemies: Enemy[] = [];
  private puzzles: Puzzle[] = [];
  private checkpoints: Checkpoint[] = [];
  private breads: BreadPickup[] = [];
  private particles = new Particles();
  private arrows: Arrows;
  private waterPowers: WaterPowers;
  private clouds: THREE.Group[] = [];
  private orbs: THREE.Mesh[] = [];
  private flying: FlyingLight[] = [];
  /** A few lights moved onto the nearest burning candles (lights are costly). */
  private candleLights: THREE.PointLight[] = [];
  /** A ring on the ground under you while airborne, to show where you'll land. */
  private landing: THREE.Mesh;
  /** An arrow drawn over everything when a hill or tree hides the player. */
  private finder: THREE.Mesh;
  private scenery = new THREE.Group();
  private raycaster = new THREE.Raycaster();
  private finderTimer = 0;

  private input: Input;
  private hud: Hud;
  private card: Card;
  private puzzleUi: PuzzleUi;
  private hints: Hint[];
  private flags = new Set<string>();

  private playing = false;
  private transition = false;
  /** Ids of the arrivals the player has reached. */
  private arrived = new Set<string>();
  private activeCheckpoint: string | null = null;

  constructor(private mount: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    // Add ?fast to the address to skip shadows and sharpness on slow computers.
    const fast = new URLSearchParams(location.search).has('fast');
    this.renderer.setPixelRatio(fast ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !fast;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.className = 'view';
    mount.appendChild(this.renderer.domElement);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);

    // Light: soft sky light plus a sun that casts shadows, so you can judge
    // where a jumping or flying character is above the ground.
    this.hemi = new THREE.HemisphereLight(0xe6f6ff, 0x9a8f78, 1.35);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff0d2, 1.9);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -26;
    sc.right = 26;
    sc.top = 26;
    sc.bottom = -26;
    sc.near = 1;
    sc.far = 90;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun, this.sun.target);

    this.world = new World();
    this.arrows = new Arrows(this.world, this.particles);
    this.waterPowers = new WaterPowers(this.world, this.particles, this.enemies);
    this.scene.add(this.world.group, this.particles.group, this.arrows.group, this.waterPowers.group);
    for (let n = 0; n < CANDLE_LIGHTS; n++) {
      const light = new THREE.PointLight(0xffb84d, 0, 7, 2);
      this.candleLights.push(light);
      this.scene.add(light);
    }
    this.buildScenery();
    // Snow falls round the camera on Frostfang; ?fast keeps only a few flakes.
    this.snowfall = new Snowfall(fast, this.renderer.getPixelRatio());
    this.scene.add(this.snowfall.points);

    this.input = new Input(this.renderer.domElement);
    this.hud = new Hud(mount);
    this.card = new Card(mount);
    this.puzzleUi = new PuzzleUi(mount);

    this.player = new Player(this.world, this.particles, {
      onFell: () => this.playerFell(),
      onDied: () => this.playerDied(),
      onAte: () => this.flags.add('ate'),
      onHome: () => this.flags.add('home'),
    });
    this.scene.add(this.player.group, this.player.homeMesh);

    const L = this.world.layout;
    for (const p of L.puzzles) this.puzzles.push(new Puzzle(p, this.world, this.scene));
    for (const c of L.checkpoints) this.checkpoints.push(new Checkpoint(c.id, c.x, c.z, this.world, this.scene));
    for (const b of L.bread) this.breads.push(new BreadPickup(b.id, b.x, b.z, b.amount, this.world, this.scene));
    for (const e of L.enemies) {
      const enemy = new Enemy(this.world, this.particles, this.arrows, { x: e.x, z: e.z }, e);
      this.enemies.push(enemy);
      this.scene.add(enemy.group);
    }

    this.landing = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.34, 20),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false }),
    );
    this.landing.rotation.x = -Math.PI / 2;
    this.landing.visible = false;
    this.scene.add(this.landing);

    this.finder = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.36, 4),
      new THREE.MeshBasicMaterial({ color: 0xffc94d, depthTest: false, transparent: true }),
    );
    this.finder.rotation.x = Math.PI;
    this.finder.renderOrder = 999;
    this.finder.visible = false;
    this.scene.add(this.finder);

    this.hints = this.makeHints();
    this.hud.onPickForm = (n) => this.tryShift(n);
    this.hud.onToggleSound = () => {
      sound.setMuted(!sound.muted);
      return sound.muted;
    };

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.playing && !this.puzzleUi.isOpen && !this.card.isOpen) this.showPause();
    });
    this.resize();

    this.applySave(loadSave() ?? freshSave());
    this.snapCamera();
    this.showTitle();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  // ---- setup -------------------------------------------------------------

  private buildScenery(): void {
    const L = this.world.layout;
    for (const t of L.trees) {
      // The look depends on where the tree stands, so adding trees elsewhere
      // never changes the ones that are already there.
      const seed = Math.floor(hash(Math.floor(t.x), Math.floor(t.z), 4) * 1000);
      const makers = {
        regular: makeTree,
        great: makeGreatTree,
        pine: makePine,
        greatPine: makeGreatPine,
        palm: makePalm,
        greatPalm: makeGreatPalm,
        acacia: makeAcacia,
        greatAcacia: makeGreatAcacia,
        greatBanyan: makeGreatBanyan,
      };
      const tree = makers[t.kind](seed);
      tree.position.set(t.x, this.world.groundAt(t.x, t.z), t.z);
      this.scenery.add(tree);
    }
    for (const b of L.boulders) {
      const boulder = makeBoulder();
      boulder.position.set(b.x, this.world.groundAt(b.x, b.z), b.z);
      this.scenery.add(boulder);
    }
    this.scene.add(this.scenery);
    // Clouds drifting past below the islands.
    for (let n = 0; n < CLOUD_COUNT; n++) {
      const cloud = makeCloud(n + 2);
      const span = CLOUD_MAX_X - CLOUD_MIN_X;
      cloud.position.set(CLOUD_MIN_X + ((n * 37) % span), -16 + ((n * 13) % 9), -28 + ((n * 53) % 120));
      cloud.userData.speed = 0.25 + (n % 5) * 0.08;
      this.clouds.push(cloud);
      this.scene.add(cloud);
    }
  }

  private resize(): void {
    const w = this.mount.clientWidth || window.innerWidth;
    const h = this.mount.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    const aspect = w / h;
    // On narrow windows, keep a minimum width in view instead.
    const height = Math.max(VIEW_HEIGHT, 17 / aspect);
    this.camera.top = height / 2;
    this.camera.bottom = -height / 2;
    this.camera.left = (-height * aspect) / 2;
    this.camera.right = (height * aspect) / 2;
    this.camera.updateProjectionMatrix();
  }

  // ---- saving ------------------------------------------------------------

  private applySave(s: SaveData): void {
    const p = this.player;
    p.level = s.level;
    p.lights = s.lights;
    p.bread = s.bread;
    p.formIndex = 0;
    p.hearts = s.hearts;
    if (FORMS[s.form]?.playable && s.level >= FORMS[s.form].level) p.formIndex = s.form;
    p.hearts = Math.max(1, Math.min(s.hearts, p.form.maxHearts));
    p.refreshGear();
    this.arrived = new Set(s.arrived);
    // Bad guys for a level you already have are simply there, with no fanfare.
    for (const e of this.enemies) e.settle(p.level);
    this.flags = new Set(s.hintsDone);
    for (const z of this.puzzles) {
      z.solved = s.solved.includes(z.spot.id);
      z.taken = s.taken.includes(z.spot.id);
      z.refresh();
    }
    for (const b of this.breads) b.taken = s.breadTaken.includes(b.id);
    this.activeCheckpoint = s.checkpoint;
    for (const c of this.checkpoints) c.setActive(c.id === s.checkpoint);
    this.toCheckpoint();
  }

  private save(): void {
    const p = this.player;
    writeSave({
      level: p.level,
      lights: p.lights,
      hearts: p.hearts,
      bread: p.bread,
      form: p.formIndex,
      checkpoint: this.activeCheckpoint,
      solved: this.puzzles.filter((z) => z.solved).map((z) => z.spot.id),
      taken: this.puzzles.filter((z) => z.taken).map((z) => z.spot.id),
      breadTaken: this.breads.filter((b) => b.taken).map((b) => b.id),
      hintsDone: [...this.flags],
      arrived: [...this.arrived],
    });
  }

  private toCheckpoint(): void {
    const c = this.checkpoints.find((k) => k.id === this.activeCheckpoint);
    const spot = c ? c.standSpot : this.world.layout.spawn;
    this.world.resetIce();
    this.world.resetGates();
    this.player.place(spot.x, spot.z);
  }

  // ---- screens -----------------------------------------------------------

  private controlsHtml(): string {
    return `
      <ul class="controls">
        <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk</li>
        <li><kbd>Space</kbd> jump - hold to fly or hop higher</li>
        <li><kbd>Click</kbd> or <kbd>J</kbd> swing sword</li>
        <li><kbd>E</kbd> use things</li>
        <li><kbd>F</kbd> eat bread</li>
        <li><kbd>Shift</kbd> Dive, as a Human or a Mermaid (hold it; let go to float up)</li>
        <li><kbd>0</kbd>–<kbd>7</kbd> shape-shift: <kbd>1</kbd> Fairy, <kbd>2</kbd> Orangutan, <kbd>3</kbd> Bunny, <kbd>4</kbd> Winter Wolf, <kbd>5</kbd> Ant, <kbd>6</kbd> Mermaid, <kbd>7</kbd> Cheetah, <kbd>0</kbd> Human</li>
        <li><kbd>Q</kbd> fairy home, or the Mermaid's water shot (swimming)</li>
        <li><kbd>R</kbd> Mermaid's bubble column (swimming)</li>
        <li><kbd>Esc</kbd> pause</li>
      </ul>`;
  }

  private showTitle(): void {
    const hasSave = loadSave() !== null;
    const begin = (fresh: boolean): void => {
      sound.unlock();
      if (fresh) {
        clearSave();
        this.applySave(freshSave());
        this.snapCamera();
      }
      this.playing = true;
      this.hud.show(true);
    };
    this.card.show(
      `<h1>Shape Shifter</h1>
       <p class="tagline">Gather candle light. Become something new.</p>
       ${this.controlsHtml()}`,
      hasSave
        ? [
            { label: 'Continue', onClick: () => begin(false) },
            { label: 'New game', primary: false, onClick: () => begin(true) },
          ]
        : [{ label: 'Start', onClick: () => begin(true) }],
      'title',
    );
  }

  private showPause(): void {
    this.card.show(`<h2>Paused</h2>${this.controlsHtml()}`, [{ label: 'Keep playing', onClick: () => {} }]);
  }

  private showLevelUp(): void {
    const level = this.player.level;
    const form = FORMS.find((f) => f.level === level);
    const article = form && /^[AEIOU]/.test(form.name) ? 'an' : 'a';
    const next = lightsNeeded(level);
    const sword = swordTier(level) !== swordTier(level - 1) ? `<p>Your sword is now <b>${swordTier(level)}</b>.</p>` : '';
    this.card.show(
      `<p class="eyebrow">Level up</p>
       <h1>Level ${level}</h1>
       ${
         form
           ? `<p>You can now shape-shift into ${article} <b>${form.name}</b>.</p>
              <p class="soft">${form.blurb} ${article[0].toUpperCase()}${article.slice(1)} ${form.name} has ${form.maxHearts} hearts.</p>
              <p>Press <kbd>${level}</kbd> to shift, and <kbd>0</kbd> to turn back into a Human.</p>`
           : ''
       }
       ${sword}
       <p class="soft">Next level: ${next} candle lights.</p>`,
      [{ label: 'Keep playing', onClick: () => {} }],
      'levelup',
    );
  }

  private showArrival(a: Arrival): void {
    this.card.show(
      `<p class="eyebrow">${a.eyebrow}</p>
       <h1>${a.title}</h1>
       ${a.html}`,
      [{ label: 'Keep exploring', onClick: () => {} }],
      'levelup',
    );
  }

  // ---- things that happen ------------------------------------------------

  private tryShift(index: number): void {
    if (!this.playing || this.transition || this.player.dead) return;
    const form = FORMS[index];
    switch (this.player.canShiftTo(index)) {
      case 'ok':
        this.player.shiftTo(index);
        if (form.id === 'fairy') this.flags.add('fairy');
        this.flags.add(`used:${form.id}`);
        this.save();
        break;
      case 'locked':
        sound.denied();
        this.hud.toast(`Reach level ${form.level} to unlock this form`);
        break;
      case 'soon':
        sound.denied();
        this.hud.toast(`${form.name} arrives on a later island`);
        break;
      case 'cramped':
        sound.denied();
        this.hud.toast('No room to change shape in here.');
        break;
      case 'same':
        break;
    }
  }

  private playerFell(): void {
    if (this.transition) return;
    const p = this.player;
    p.hearts -= 1;
    if (p.hearts <= 0) {
      p.dead = true;
      this.playerDied();
      return;
    }
    this.transition = true;
    sound.hurt();
    this.hud.fadeThrough('You fell! Back to the checkpoint.', () => {
      this.toCheckpoint();
      this.snapCamera();
      this.transition = false;
    });
  }

  private playerDied(): void {
    if (this.transition) return;
    this.transition = true;
    this.hud.fadeThrough('You fainted. Back to the checkpoint.', () => {
      const p = this.player;
      p.dead = false;
      p.hearts = p.form.maxHearts;
      this.toCheckpoint();
      for (const e of this.enemies) e.reset();
      this.arrows.clear();
      this.waterPowers.clear();
      this.snapCamera();
      this.transition = false;
      this.save();
    });
  }

  private openPuzzle(z: Puzzle): void {
    this.flags.add('puzzle');
    this.hud.setAction('');
    this.puzzleUi.open(
      z.melody,
      () => {
        z.solved = true;
        z.refresh();
        this.particles.burst(z.flamePos, 0xb48cff, 26, 4, 0.16, 3);
        this.save();
      },
      () => {},
    );
  }

  private takeLight(z: Puzzle): void {
    z.taken = true;
    z.refresh();
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.18), new THREE.MeshBasicMaterial({ color: 0xffc94d }));
    mesh.position.copy(z.flamePos);
    this.scene.add(mesh);
    this.flying.push({ mesh, from: z.flamePos, t: 0 });
    sound.pickup();
  }

  private lightArrived(): void {
    const p = this.player;
    p.lights += 1;
    sound.light();
    this.particles.sparkle(p.chest, 0xffc94d, 12, 0.5);
    if (p.lights >= lightsNeeded(p.level)) {
      p.level += 1;
      p.lights = 0;
      p.refreshGear();
      sound.levelUp();
      this.particles.burst(p.chest, 0xffe98a, 40, 5, 0.18, 2);
      this.showLevelUp();
    }
    this.save();
  }

  // ---- hints -------------------------------------------------------------

  private makeHints(): Hint[] {
    const p = this.player;
    const anyDefeated = (): boolean => this.enemies.some((e) => !e.alive);
    const lightsEver = (): number => this.puzzles.filter((z) => z.taken).length;
    const nearTester = (): boolean =>
      this.enemies.some((e) => e.alive && e.tester && e.pos.distanceTo(p.pos) < 8);
    return [
      {
        id: 'walk',
        text: 'Walk with <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd>.',
        when: () => p.level === 0,
        done: () => p.walked > 3,
      },
      {
        id: 'jump',
        text: 'Follow the path. Press <kbd>Space</kbd> to jump up the ledge.',
        when: () => p.level === 0 && p.pos.y < 2.9,
        done: () => p.pos.y >= 2.9 && p.onGround,
      },
      {
        id: 'eat',
        text: 'You are hurt. Press <kbd>F</kbd> to eat bread and get a heart back.',
        when: () => p.hearts < p.form.maxHearts && p.bread > 0 && p.level === 0,
        done: () => this.flags.has('ate'),
      },
      {
        id: 'fight',
        text: 'A tester bad guy! <kbd>Click</kbd> or press <kbd>J</kbd> to swing your sword. Step back when it glows red.',
        when: () => nearTester() && p.form.id === 'human',
        done: anyDefeated,
      },
      {
        id: 'find',
        text: 'Candle lights are locked behind music puzzles. Listen for a tune and find the speaker.',
        when: () => p.level === 0 && lightsEver() === 0 && !this.puzzles.some((z) => z.solved),
        done: () => this.flags.has('puzzle'),
      },
      {
        id: 'take',
        text: 'The cage is gone! Stand by the candle and press <kbd>E</kbd> to take its light.',
        when: () => this.puzzles.some((z) => z.solved && !z.taken),
        done: () => false,
      },
      {
        id: 'more',
        text: 'Keep looking: more candles are hidden on the hill and in the pond.',
        when: () => p.level === 0 && lightsEver() > 0,
        done: () => p.level > 0,
      },
      {
        id: 'shift',
        text: 'You can shape-shift! Press <kbd>1</kbd> to become a Fairy and <kbd>0</kbd> to turn back.',
        when: () => p.level >= 1 && p.form.id === 'human',
        done: () => this.flags.has('fairy'),
      },
      {
        id: 'fly',
        text: 'Hold <kbd>Space</kbd> to fly. Fairies tire quickly, so land before your energy runs out.',
        when: () => p.form.id === 'fairy',
        done: () => p.flownTime > 2,
      },
      {
        id: 'home',
        text: 'On the ground, press <kbd>Q</kbd> to magic up a tiny home. Bad guys cannot find you inside.',
        when: () => p.form.id === 'fairy' && !p.homed,
        done: () => this.flags.has('home'),
      },
      {
        id: 'ape',
        text: 'New shape! Press <kbd>2</kbd> to become an Orangutan.',
        when: () => p.level >= 2 && p.form.id === 'human',
        done: () => this.flags.has('used:orangutan'),
      },
      {
        id: 'climb',
        text: 'Walk into a tree trunk and keep pushing to climb it. From the top, jump toward the next tree to grab it.',
        when: () => p.form.id === 'orangutan',
        done: () => p.totalClimbs > 0,
      },
      {
        id: 'bun',
        text: 'New shape! Press <kbd>3</kbd> to become a Bunny.',
        when: () => p.level >= 3 && p.form.id === 'human',
        done: () => this.flags.has('used:bunny'),
      },
      {
        id: 'hop',
        text: 'Hold <kbd>Space</kbd> for a huge hop. Tap it for a small one.',
        when: () => p.form.id === 'bunny',
        done: () => p.fullHops > 0,
      },
      {
        id: 'wolf',
        text: 'New shape! Press <kbd>4</kbd> to become a Winter Wolf, then run across the frozen lake in the east.',
        when: () => p.level >= 4 && p.form.id === 'human',
        done: () => this.flags.has('used:wolf'),
      },
      {
        id: 'ant',
        text: 'New shape! Press <kbd>5</kbd> to become an Ant and squeeze under the root tangles.',
        when: () => p.level >= 5 && p.form.id === 'human',
        done: () => this.flags.has('used:ant'),
      },
      {
        id: 'mermaid',
        text: 'New shape! Press <kbd>6</kbd> to become a Mermaid. In water, hold <kbd>Shift</kbd> to dive.',
        when: () => p.level >= 6 && p.form.id === 'human',
        done: () => this.flags.has('used:mermaid'),
      },
      {
        id: 'cheetah',
        text: 'New shape! Press <kbd>7</kbd> to become a Cheetah. Run, and the fastest gates will open for you.',
        when: () => p.level >= 7 && p.form.id === 'human',
        done: () => this.flags.has('used:cheetah'),
      },
      {
        id: 'ice',
        text: 'Thin ice only holds for a runner. Keep running and do not stop.',
        when: () => p.form.id === 'wolf',
        done: () => p.iceRun >= 3,
      },
      {
        id: 'cross',
        text: 'Find the stone bluff past the pond, then fly from cloud to cloud to the next island.',
        when: () => p.level >= 1 && this.flags.has('fairy') && !this.arrived.has('tanglewood'),
        done: () => this.arrived.has('tanglewood'),
      },
    ];
  }

  private currentHint(): string {
    for (const h of this.hints) {
      if (this.flags.has(`hint:${h.id}`)) continue;
      if (h.done()) {
        this.flags.add(`hint:${h.id}`);
        continue;
      }
      if (h.when()) return h.text;
    }
    return this.zoneHint();
  }

  /** Hints tied to places. Only used when no scripted hint is showing. */
  private zoneHint(): string {
    const p = this.player;
    let best = '';
    let bestDist = Infinity;
    for (const z of this.world.layout.hints) {
      if (z.minLevel !== undefined && p.level < z.minLevel) continue;
      if (z.maxLevel !== undefined && p.level > z.maxLevel) continue;
      if (z.form !== undefined && z.form !== p.form.id) continue;
      const d = Math.hypot(z.x - p.pos.x, z.z - p.pos.z);
      if (d < z.r && d < bestDist) {
        best = z.text;
        bestDist = d;
      }
    }
    return best;
  }

  // ---- the loop ----------------------------------------------------------

  private frame(): void {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.time += dt;
    const running = this.playing && !this.transition && !this.puzzleUi.isOpen && !this.card.isOpen;
    this.input.enabled = running;

    if (running) this.step(dt);

    this.world.update(this.time);
    for (const z of this.puzzles) z.update(this.time);
    this.updateCandleLights();
    for (const c of this.checkpoints) c.update(this.time);
    for (const b of this.breads) b.update(this.time);
    for (const c of this.clouds) {
      c.position.x += (c.userData.speed as number) * dt;
      if (c.position.x > CLOUD_MAX_X) c.position.x = CLOUD_MIN_X;
    }
    this.particles.update(dt);
    this.updateOrbs(dt);
    this.updateLanding();
    this.updateFinder(dt);
    this.updateCamera(dt);
    this.updateCold();
    this.updateHud();
    this.input.endFrame();
    this.renderer.render(this.scene, this.camera);
  }

  private step(dt: number): void {
    const p = this.player;
    const heartsBefore = p.hearts;

    const digit = this.input.digitHit();
    if (digit >= 0) this.tryShift(digit);

    p.update(dt, this.input, this.enemies);
    this.wakeEnemies();
    for (const e of this.enemies) e.update(dt, p, this.enemies);
    this.arrows.update(dt, p);
    this.waterPowers.update(dt, p, this.input);
    if (p.hearts < heartsBefore) this.hud.hurt();

    // Checkpoints light up when you walk near them.
    for (const c of this.checkpoints) {
      if (c.id !== this.activeCheckpoint && c.pos.distanceTo(p.pos) < 2.4) {
        this.activeCheckpoint = c.id;
        for (const k of this.checkpoints) k.setActive(k === c);
        sound.checkpoint();
        this.hud.toast('Checkpoint reached');
        this.save();
      }
    }

    for (const b of this.breads) {
      if (!b.taken && Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z) < 0.9 && Math.abs(b.pos.y - p.pos.y) < 1.5) {
        b.taken = true;
        p.bread += b.amount;
        sound.pickup();
        this.hud.toast(`+${b.amount} bread`);
        this.save();
      }
    }

    this.usePuzzles(dt);

    // Standing on a new place for the first time is worth a celebration.
    if (p.onGround) {
      for (const a of this.world.layout.arrivals) {
        if (this.arrived.has(a.id) || Math.hypot(a.x - p.pos.x, a.z - p.pos.z) >= a.radius) continue;
        this.arrived.add(a.id);
        sound.levelUp();
        this.save();
        this.showArrival(a);
        break;
      }
    }
  }

  /** Bad guys that were waiting for a level appear once the player reaches it. */
  private wakeEnemies(): void {
    const woke = this.enemies.filter((e) => e.wake(this.player.level));
    if (woke.length === 0) return;
    sound.shift();
    this.hud.toast(woke.every((e) => e.kind === 'archer') ? 'Archers have appeared!' : 'New bad guys have appeared!');
  }

  private usePuzzles(dt: number): void {
    const p = this.player;
    let action = '';
    let use: (() => void) | null = null;
    // A speaker can't be used while a bad guy close by is after you.
    const hunted = this.enemies.some((e) => e.alert && Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) < HUNTED_RANGE);
    for (const z of this.puzzles) {
      const toSpeaker = Math.hypot(z.speakerPos.x - p.pos.x, z.speakerPos.z - p.pos.z);
      const toCandle = Math.hypot(z.candlePos.x - p.pos.x, z.candlePos.z - p.pos.z);
      const atSpeaker = Math.abs(z.speakerPos.y - p.pos.y) < REACH_HEIGHT;
      const atCandle = Math.abs(z.candlePos.y - p.pos.y) < REACH_HEIGHT;

      if (!z.solved) {
        // The speaker plays its tune out loud now and then, louder up close.
        z.tuneTimer -= dt;
        if (z.tuneTimer <= 0) {
          z.tuneTimer = 5.5;
          if (toSpeaker < 11) sound.melody(z.melody, 0.04 + 0.3 * (1 - toSpeaker / 11));
        }
        if (toSpeaker < REACH && atSpeaker) {
          if (hunted) {
            action = 'Bad guys are after you! Deal with them, lose them, or hide first.';
          } else {
            action = '<kbd>E</kbd> Solve the music puzzle';
            use = () => this.openPuzzle(z);
          }
        } else if (toCandle < REACH && atCandle) {
          action = z.pickle
            ? 'The sea pickle’s light is caged. Solve the speaker’s puzzle to free it.'
            : 'The light is caged. Solve the speaker’s puzzle to free it.';
        }
      } else if (!z.taken && toCandle < REACH && atCandle) {
        action = z.pickle ? '<kbd>E</kbd> Take the sea pickle’s light' : '<kbd>E</kbd> Take the candle’s light';
        use = () => this.takeLight(z);
      }
    }
    this.hud.setAction(p.homed ? 'Hidden in your fairy home. Press <kbd>Q</kbd> to come out.' : action);
    if (use && !p.homed && this.input.hit('KeyE')) use();
  }

  /** Move the shared lights onto the burning candles nearest the player. */
  private updateCandleLights(): void {
    const p = this.player.pos;
    const near = this.puzzles
      .filter((z) => !z.taken)
      .sort((a, b) => a.candlePos.distanceToSquared(p) - b.candlePos.distanceToSquared(p));
    this.candleLights.forEach((light, n) => {
      const z = near[n];
      light.intensity = z ? 3 * z.flicker : 0;
      if (z) light.position.set(z.candlePos.x, z.candlePos.y + 1.4, z.candlePos.z);
    });
  }

  /** The lights you carry circle around you; new ones fly in from the candle. */
  private updateOrbs(dt: number): void {
    const p = this.player;
    while (this.orbs.length < p.lights) {
      const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.11), new THREE.MeshBasicMaterial({ color: 0xffd76a }));
      this.orbs.push(orb);
      this.scene.add(orb);
    }
    while (this.orbs.length > p.lights) this.scene.remove(this.orbs.pop()!);
    const c = p.chest;
    this.orbs.forEach((orb, n) => {
      const a = this.time * 1.8 + (n * Math.PI * 2) / Math.max(1, this.orbs.length);
      orb.position.set(c.x + Math.cos(a) * 0.6, c.y + 0.35 + Math.sin(this.time * 3 + n) * 0.08, c.z + Math.sin(a) * 0.6);
      orb.rotation.y = this.time * 3;
      orb.visible = !p.homed;
    });

    for (let n = this.flying.length - 1; n >= 0; n--) {
      const f = this.flying[n];
      f.t += dt / 0.7;
      const ease = f.t * f.t * (3 - 2 * f.t);
      f.mesh.position.lerpVectors(f.from, c, ease);
      f.mesh.position.y += Math.sin(Math.min(1, f.t) * Math.PI) * 1.2;
      if (f.t >= 1) {
        this.scene.remove(f.mesh);
        this.flying.splice(n, 1);
        this.lightArrived();
      }
    }
  }

  private updateLanding(): void {
    const p = this.player;
    const below = Math.max(
      this.world.solidAt(p.pos.x, p.pos.z),
      this.world.isWater(p.pos.x, p.pos.z) ? this.world.waterLevelAt(p.pos.x, p.pos.z) : -Infinity,
    );
    const show = !p.homed && !p.dead && Number.isFinite(below) && p.pos.y - below > 0.25;
    this.landing.visible = show;
    if (show) this.landing.position.set(p.pos.x, below + 0.04, p.pos.z);
  }

  /** A few times a second, check whether the camera can actually see the player. */
  private updateFinder(dt: number): void {
    const p = this.player;
    const head = p.chest;
    this.finderTimer -= dt;
    if (this.finderTimer <= 0) {
      this.finderTimer = 0.15;
      const from = head.clone().addScaledVector(CAMERA_DIR, 60);
      this.raycaster.set(from, CAMERA_DIR.clone().negate());
      this.raycaster.far = 59.3;
      const hits = this.raycaster.intersectObjects([...this.world.solidMeshes, this.scenery], true);
      this.finder.visible = (hits.length > 0 || p.form.height < 0.5 || p.submerged) && !p.dead && this.playing;
    }
    if (this.finder.visible) {
      const lift = p.form.arrowLift + Math.sin(this.time * 5) * 0.08;
      this.finder.position.set(head.x, head.y + lift, head.z);
      this.finder.rotation.y = this.time * 2;
    }
  }

  private snapCamera(): void {
    this.camTarget.copy(this.player.pos);
    this.updateCamera(0);
  }

  private updateCamera(dt: number): void {
    const p = this.player.pos;
    if (dt > 0) {
      const k = Math.min(1, dt * 6);
      this.camTarget.x += (p.x - this.camTarget.x) * k;
      this.camTarget.z += (p.z - this.camTarget.z) * k;
      // Follow height gently so a jump doesn't bounce the whole view.
      this.camTarget.y += (Math.max(p.y, -4) - this.camTarget.y) * Math.min(1, dt * 2.5);
    }
    this.camera.position.copy(this.camTarget).addScaledVector(CAMERA_DIR, 80);
    this.camera.lookAt(this.camTarget.x, this.camTarget.y + 0.8, this.camTarget.z);
    this.sun.position.set(this.camTarget.x - 10, this.camTarget.y + 30, this.camTarget.z + 6);
    this.sun.target.position.copy(this.camTarget);
  }

  private static readonly WARM = { sky: new THREE.Color(0xe6f6ff), ground: new THREE.Color(0x9a8f78), sun: new THREE.Color(0xfff0d2) };
  private static readonly COLD = { sky: new THREE.Color(0xd2e4ff), ground: new THREE.Color(0x8590ac), sun: new THREE.Color(0xf0f2ff) };

  /** On Frostfang the light turns a little colder, the sky greyer, and snow falls. */
  private updateCold(): void {
    const cold = coldAt(this.camTarget.x, this.camTarget.z);
    const { WARM, COLD } = Game;
    this.hemi.color.copy(WARM.sky).lerp(COLD.sky, cold);
    this.hemi.groundColor.copy(WARM.ground).lerp(COLD.ground, cold);
    this.sun.color.copy(WARM.sun).lerp(COLD.sun, cold);
    this.snowfall.update(this.time, this.camTarget, cold);
    this.mount.style.setProperty('--cold', cold.toFixed(3));
  }

  private updateHud(): void {
    const p = this.player;
    this.hud.update({
      hearts: p.hearts,
      maxHearts: p.form.maxHearts,
      bread: p.bread,
      level: p.level,
      lights: p.lights,
      formIndex: p.formIndex,
      meter: p.meter,
    });
    if (this.playing) this.hud.setHint(this.currentHint());
  }

  // ---- for testing -------------------------------------------------------

  /** A few handles for automated play-tests; not used by the game itself. */
  get debug() {
    return {
      player: this.player,
      enemies: this.enemies,
      puzzles: this.puzzles,
      world: this.world,
      /** Activate a checkpoint and stand on it, as if the player had walked there. */
      warp: (id: string): boolean => {
        const c = this.checkpoints.find((k) => k.id === id);
        if (!c) return false;
        this.activeCheckpoint = id;
        for (const k of this.checkpoints) k.setActive(k === c);
        this.toCheckpoint();
        this.snapCamera();
        return true;
      },
      setLevel: (n: number) => {
        this.player.level = n;
        this.player.lights = 0;
        this.player.refreshGear();
      },
      takeLight: (n: number) => {
        this.puzzles[n].solved = true;
        this.takeLight(this.puzzles[n]);
      },
      /** Run the game forward without drawing, holding the given keys. */
      simulate: (seconds: number, held: string[] = [], tapped: string[] = []) => {
        this.input.enabled = true;
        held.forEach((k) => this.input.press(k));
        tapped.forEach((k) => this.input.press(k));
        this.input.endFrame();
        tapped.forEach((k) => this.input.press(k));
        for (let t = 0; t < seconds; t += 1 / 60) {
          if (this.transition || this.card.isOpen || this.puzzleUi.isOpen) break;
          this.step(1 / 60);
          this.updateOrbs(1 / 60);
          this.particles.update(1 / 60);
          this.input.endFrame();
          tapped.forEach((k) => this.input.release(k));
        }
        held.forEach((k) => this.input.release(k));
      },
    };
  }
}
