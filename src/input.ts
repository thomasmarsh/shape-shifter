// Keyboard and mouse state. `down` is held keys; `pressed` is keys that went
// down since the last frame and is cleared by endFrame().

const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

export class Input {
  private down = new Set<string>();
  private pressed = new Set<string>();
  /** When false, the game ignores input (a menu or puzzle is open). */
  enabled = true;

  constructor(canvas: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!e.repeat) this.pressed.add(e.code);
      this.down.add(e.code);
      // Stop Space and the arrows from scrolling the page, but leave them alone
      // on buttons so menus still work from the keyboard.
      const onButton = e.target instanceof HTMLButtonElement;
      if (!onButton && (e.code === 'Space' || e.code.startsWith('Arrow'))) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button === 0) this.pressed.add('Mouse0');
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  held(code: string): boolean {
    return this.enabled && this.down.has(code);
  }

  hit(code: string): boolean {
    return this.enabled && this.pressed.has(code);
  }

  /** Movement as screen directions: x is right, y is up, each -1..1. */
  move(): { x: number; y: number } {
    if (!this.enabled) return { x: 0, y: 0 };
    const d = this.down;
    const x = (d.has('KeyD') || d.has('ArrowRight') ? 1 : 0) - (d.has('KeyA') || d.has('ArrowLeft') ? 1 : 0);
    const y = (d.has('KeyW') || d.has('ArrowUp') ? 1 : 0) - (d.has('KeyS') || d.has('ArrowDown') ? 1 : 0);
    return { x, y };
  }

  anyMoveHit(): boolean {
    return this.enabled && MOVE_KEYS.some((k) => this.pressed.has(k));
  }

  /** The number key pressed this frame, 0–9, or -1. */
  digitHit(): number {
    if (!this.enabled) return -1;
    for (let n = 0; n <= 9; n++) {
      if (this.pressed.has(`Digit${n}`) || this.pressed.has(`Numpad${n}`)) return n;
    }
    return -1;
  }

  /** Press a key from code: used by play-tests, and a hook for touch buttons later. */
  press(code: string): void {
    this.pressed.add(code);
    this.down.add(code);
  }

  release(code: string): void {
    this.down.delete(code);
  }

  endFrame(): void {
    this.pressed.clear();
  }
}
