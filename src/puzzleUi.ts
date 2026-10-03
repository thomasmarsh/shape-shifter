import { NOTES, NOTE_GAP, sound } from './audio';

// The music puzzle from the plan:
//   - a speaker plays a tune,
//   - you tap squares to hear the note each one plays,
//   - you drag the squares into the order that matches the tune,
//   - the Play button plays your order and tells you if you got it right.

const TILE = 76;
const GAP = 14;
const STEP = TILE + GAP;

export class PuzzleUi {
  private root: HTMLElement;
  private row: HTMLElement;
  private status: HTMLElement;
  private listenBtn: HTMLButtonElement;
  private playBtn: HTMLButtonElement;
  private melody: number[] = [];
  /** The notes in the order the player currently has them. */
  private order: number[] = [];
  private tiles = new Map<number, HTMLElement>();
  private busy = false;
  private wrongTries = 0;
  private timers: number[] = [];
  private onSolved: (() => void) | null = null;
  private onClose: (() => void) | null = null;
  isOpen = false;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'overlay puzzle hidden';
    this.root.innerHTML = `
      <div class="panel puzzle-panel" role="dialog" aria-label="Music puzzle">
        <button class="close" aria-label="Close puzzle">×</button>
        <h2>Music Puzzle</h2>
        <p class="how">Listen to the speaker. Tap the squares to hear them, then drag them into the same order as the tune.</p>
        <div class="puzzle-row"></div>
        <p class="status" aria-live="polite"></p>
        <div class="puzzle-buttons">
          <button class="btn secondary listen">Listen to speaker</button>
          <button class="btn play">Play</button>
        </div>
      </div>`;
    parent.appendChild(this.root);
    this.row = this.root.querySelector('.puzzle-row')!;
    this.status = this.root.querySelector('.status')!;
    this.listenBtn = this.root.querySelector('.listen')!;
    this.playBtn = this.root.querySelector('.play')!;
    this.listenBtn.addEventListener('click', () => this.listen());
    this.playBtn.addEventListener('click', () => this.check());
    this.root.querySelector('.close')!.addEventListener('click', () => this.close());
    window.addEventListener('keydown', (e) => {
      if (this.isOpen && e.code === 'Escape') this.close();
    });
  }

  open(melody: number[], onSolved: () => void, onClose: () => void): void {
    this.melody = melody;
    this.onSolved = onSolved;
    this.onClose = onClose;
    this.wrongTries = 0;
    this.busy = false;
    this.isOpen = true;

    // Shuffle until the squares are not already in the right order.
    this.order = [...melody];
    do {
      for (let n = this.order.length - 1; n > 0; n--) {
        const k = Math.floor(Math.random() * (n + 1));
        [this.order[n], this.order[k]] = [this.order[k], this.order[n]];
      }
    } while (this.order.every((v, n) => v === melody[n]));

    this.row.innerHTML = '';
    this.row.style.width = `${melody.length * STEP - GAP}px`;
    this.tiles.clear();
    for (const note of this.order) {
      const tile = document.createElement('button');
      tile.className = 'tile';
      tile.style.background = NOTES[note].color;
      tile.setAttribute('aria-label', 'Note square');
      tile.innerHTML = '<span>♪</span>';
      this.row.appendChild(tile);
      this.tiles.set(note, tile);
      this.makeDraggable(tile, note);
    }
    this.layout();
    this.status.textContent = '';
    this.root.classList.remove('hidden');
    this.after(350, () => this.listen());
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.timers.forEach((t) => window.clearTimeout(t));
    this.timers = [];
    this.root.classList.add('hidden');
    this.onClose?.();
  }

  private after(ms: number, fn: () => void): void {
    this.timers.push(window.setTimeout(fn, ms));
  }

  private layout(skip?: number): void {
    this.order.forEach((note, n) => {
      if (note === skip) return;
      this.tiles.get(note)!.style.transform = `translateX(${n * STEP}px)`;
    });
  }

  private setBusy(busy: boolean): void {
    this.busy = busy;
    this.listenBtn.disabled = busy;
    this.playBtn.disabled = busy;
  }

  /** The speaker plays the tune you are trying to match. */
  private listen(): void {
    if (this.busy || !this.isOpen) return;
    this.setBusy(true);
    this.status.textContent = 'The speaker is playing…';
    // After two wrong tries, each note lights up its square as a helping hand.
    const helping = this.wrongTries >= 2;
    this.melody.forEach((note, n) => {
      this.after(n * NOTE_GAP * 1000, () => {
        sound.note(note);
        this.root.classList.add('speaker-beat');
        if (helping) this.pulse(note);
        this.after(200, () => this.root.classList.remove('speaker-beat'));
      });
    });
    this.after(this.melody.length * NOTE_GAP * 1000 + 150, () => {
      this.setBusy(false);
      this.status.textContent = helping ? 'Watch which squares light up.' : '';
    });
  }

  private pulse(note: number): void {
    const tile = this.tiles.get(note);
    if (!tile) return;
    tile.classList.add('ringing');
    this.after(260, () => tile.classList.remove('ringing'));
  }

  /** Play the squares in their current order, then say whether it matches. */
  private check(): void {
    if (this.busy || !this.isOpen) return;
    this.setBusy(true);
    this.status.textContent = 'Playing your tune…';
    this.order.forEach((note, n) => {
      this.after(n * NOTE_GAP * 1000, () => {
        sound.note(note);
        this.pulse(note);
      });
    });
    this.after(this.order.length * NOTE_GAP * 1000 + 200, () => {
      const right = this.order.every((v, n) => v === this.melody[n]);
      if (right) {
        this.status.textContent = 'That’s the tune! The candle is yours.';
        this.row.classList.add('solved');
        sound.light();
        this.after(1300, () => {
          this.row.classList.remove('solved');
          const done = this.onSolved;
          this.close();
          done?.();
        });
      } else {
        this.wrongTries += 1;
        sound.wrong();
        this.row.classList.add('shake');
        this.after(450, () => this.row.classList.remove('shake'));
        this.status.textContent =
          this.wrongTries >= 2
            ? 'Not quite. Press Listen and watch the squares light up.'
            : 'Not quite. Listen again and move the squares.';
        this.setBusy(false);
      }
    });
  }

  private makeDraggable(tile: HTMLElement, note: number): void {
    let startX = 0;
    let startIndex = 0;
    let dragging = false;
    let active = false;

    tile.addEventListener('pointerdown', (e) => {
      if (this.busy) return;
      active = true;
      dragging = false;
      startX = e.clientX;
      startIndex = this.order.indexOf(note);
      tile.setPointerCapture(e.pointerId);
    });

    tile.addEventListener('pointermove', (e) => {
      if (!active) return;
      const dx = e.clientX - startX;
      if (!dragging && Math.abs(dx) > 8) {
        dragging = true;
        tile.classList.add('dragging');
      }
      if (!dragging) return;
      const max = (this.order.length - 1) * STEP;
      const left = Math.max(-20, Math.min(max + 20, startIndex * STEP + dx));
      tile.style.transform = `translateX(${left}px) scale(1.08)`;
      // Slide the others out of the way as the square passes over them.
      const target = Math.max(0, Math.min(this.order.length - 1, Math.round(left / STEP)));
      const current = this.order.indexOf(note);
      if (target !== current) {
        this.order.splice(current, 1);
        this.order.splice(target, 0, note);
        this.layout(note);
      }
    });

    const finish = (): void => {
      if (!active) return;
      active = false;
      tile.classList.remove('dragging');
      if (dragging) {
        this.layout();
      } else {
        sound.note(note);
        this.pulse(note);
      }
      dragging = false;
    };
    tile.addEventListener('pointerup', finish);
    tile.addEventListener('pointercancel', finish);

    // Keyboard: arrow keys move the focused square, Enter or Space plays it.
    tile.addEventListener('keydown', (e) => {
      if (this.busy) return;
      const at = this.order.indexOf(note);
      const to = e.code === 'ArrowLeft' ? at - 1 : e.code === 'ArrowRight' ? at + 1 : -1;
      if (to >= 0 && to < this.order.length) {
        this.order.splice(at, 1);
        this.order.splice(to, 0, note);
        this.layout();
        e.preventDefault();
        e.stopPropagation();
      }
    });
    tile.addEventListener('click', (e) => {
      // Pointer taps are handled above; this catches Enter/Space from the keyboard.
      if (e.detail === 0 && !this.busy) {
        sound.note(note);
        this.pulse(note);
      }
    });
  }
}
