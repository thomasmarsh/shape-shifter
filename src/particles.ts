import * as THREE from 'three';

// Little glowing cubes for puffs, sparkles and hits.

interface Particle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  total: number;
  gravity: number;
  size: number;
}

const geo = new THREE.BoxGeometry(1, 1, 1);

export class Particles {
  readonly group = new THREE.Group();
  private live: Particle[] = [];
  private materials = new Map<number, THREE.MeshBasicMaterial>();

  private material(color: number): THREE.MeshBasicMaterial {
    let m = this.materials.get(color);
    if (!m) {
      m = new THREE.MeshBasicMaterial({ color });
      this.materials.set(color, m);
    }
    return m;
  }

  /** A burst of `count` cubes flying outward from a point. */
  burst(at: THREE.Vector3, color: number, count = 10, speed = 3, size = 0.12, gravity = 6): void {
    for (let n = 0; n < count; n++) {
      const mesh = new THREE.Mesh(geo, this.material(color));
      mesh.position.copy(at);
      const a = Math.random() * Math.PI * 2;
      const up = 0.3 + Math.random() * 0.9;
      const s = speed * (0.4 + Math.random() * 0.6);
      const life = 0.4 + Math.random() * 0.4;
      this.group.add(mesh);
      this.live.push({
        mesh,
        vel: new THREE.Vector3(Math.cos(a) * s, up * s, Math.sin(a) * s),
        life,
        total: life,
        gravity,
        size: size * (0.6 + Math.random() * 0.8),
      });
    }
  }

  /** Slow rising sparkles, for magic. */
  sparkle(at: THREE.Vector3, color: number, count = 6, spread = 0.5): void {
    for (let n = 0; n < count; n++) {
      const mesh = new THREE.Mesh(geo, this.material(color));
      mesh.position.set(
        at.x + (Math.random() - 0.5) * spread * 2,
        at.y + Math.random() * spread,
        at.z + (Math.random() - 0.5) * spread * 2,
      );
      const life = 0.5 + Math.random() * 0.5;
      this.group.add(mesh);
      this.live.push({
        mesh,
        vel: new THREE.Vector3(0, 0.6 + Math.random() * 0.8, 0),
        life,
        total: life,
        gravity: 0,
        size: 0.06 + Math.random() * 0.06,
      });
    }
  }

  update(dt: number): void {
    for (let n = this.live.length - 1; n >= 0; n--) {
      const p = this.live[n];
      p.life -= dt;
      if (p.life <= 0) {
        this.group.remove(p.mesh);
        this.live.splice(n, 1);
        continue;
      }
      p.vel.y -= p.gravity * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.scale.setScalar(p.size * (p.life / p.total));
      p.mesh.rotation.x += dt * 6;
      p.mesh.rotation.y += dt * 4;
    }
  }
}
