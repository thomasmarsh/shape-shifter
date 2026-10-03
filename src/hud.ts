import { FORMS, lightsNeeded } from './forms';

// Everything drawn on top of the 3D view: hearts, bread, candle lights, the
// form bar, hints and the title / level-up / finish screens. Plain DOM.

const HEART = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
const FLAME = `<svg viewBox="0 0 20 26" aria-hidden="true"><path d="M10 1c1 5 7 8 7 15a7 7 0 0 1-14 0c0-4 2-6 3.5-8 .5 2 1.5 3 2.5 3C9 8 8 4 10 1Z"/></svg>`;

export interface HudState {
  hearts: number;
  maxHearts: number;
  bread: number;
  level: number;
  lights: number;
  formIndex: number;
  /** The bar under the hearts (fairy flight, orangutan trees), or null for none. */
  meter: Meter | null;
}

export interface Meter {
  label: string;
  fraction: number; // 0..1
  /** Drawn in the "worn out" colour. */
  tired: boolean;
}

export class Hud {
  readonly root: HTMLElement;
  private hearts: HTMLElement;
  private bread: HTMLElement;
  private level: HTMLElement;
  private lights: HTMLElement;
  private energy: HTMLElement;
  private energyFill: HTMLElement;
  private energyLabel: HTMLElement;
  private bar: HTMLElement;
  private hint: HTMLElement;
  private action: HTMLElement;
  private toasts: HTMLElement;
  private flash: HTMLElement;
  private fade: HTMLElement;
  private last = '';
  private lastHint = '';
  private lastAction = '';
  onPickForm: (index: number) => void = () => {};
  onToggleSound: () => boolean = () => false;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'hud hidden';
    this.root.innerHTML = `
      <div class="hud-top">
        <div class="stats">
          <div class="hearts" aria-label="Hearts"></div>
          <div class="energy hidden">
            <span class="energy-label"></span>
            <div class="energy-track"><div class="energy-fill"></div></div>
          </div>
        </div>
        <div class="hint hidden" aria-live="polite"></div>
        <div class="progress">
          <div class="level"></div>
          <div class="lights" aria-label="Candle lights"></div>
          <div class="bread"></div>
        </div>
      </div>
      <div class="toasts"></div>
      <div class="action hidden"></div>
      <div class="formbar" role="toolbar" aria-label="Shape-shift"></div>
      <button class="sound-toggle" aria-label="Sound on or off">Sound: on</button>
      <div class="hurt-flash"></div>
      <div class="fade"></div>`;
    parent.appendChild(this.root);
    const q = (s: string): HTMLElement => this.root.querySelector(s)!;
    this.hearts = q('.hearts');
    this.bread = q('.bread');
    this.level = q('.level');
    this.lights = q('.lights');
    this.energy = q('.energy');
    this.energyFill = q('.energy-fill');
    this.energyLabel = q('.energy-label');
    this.bar = q('.formbar');
    this.hint = q('.hint');
    this.action = q('.action');
    this.toasts = q('.toasts');
    this.flash = q('.hurt-flash');
    this.fade = q('.fade');

    const soundBtn = q('.sound-toggle');
    soundBtn.addEventListener('click', () => {
      const muted = this.onToggleSound();
      soundBtn.textContent = muted ? 'Sound: off' : 'Sound: on';
      soundBtn.blur();
    });

    FORMS.forEach((form, n) => {
      const slot = document.createElement('button');
      slot.className = 'slot';
      slot.dataset.index = String(n);
      slot.innerHTML = `<kbd>${n}</kbd><span class="name">${form.name}</span>`;
      slot.addEventListener('click', () => {
        this.onPickForm(n);
        slot.blur();
      });
      this.bar.appendChild(slot);
    });
  }

  show(visible: boolean): void {
    this.root.classList.toggle('hidden', !visible);
  }

  update(s: HudState): void {
    const key = `${s.hearts}|${s.maxHearts}|${s.bread}|${s.level}|${s.lights}|${s.formIndex}`;
    if (key !== this.last) {
      this.last = key;
      let hearts = '';
      for (let n = 0; n < s.maxHearts; n++) {
        hearts += `<span class="heart ${n < s.hearts ? 'full' : 'empty'}">${HEART}</span>`;
      }
      this.hearts.innerHTML = hearts;
      this.hearts.setAttribute('aria-label', `${s.hearts} of ${s.maxHearts} hearts`);
      this.bread.innerHTML = `<span class="loaf"></span>${s.bread}`;
      this.level.textContent = `Level ${s.level}`;
      const need = lightsNeeded(s.level);
      let lights = '';
      if (Number.isFinite(need)) {
        for (let n = 0; n < need; n++) {
          lights += `<span class="flame ${n < s.lights ? 'lit' : ''}">${FLAME}</span>`;
        }
      }
      this.lights.innerHTML = lights;

      this.bar.querySelectorAll<HTMLElement>('.slot').forEach((slot, n) => {
        const form = FORMS[n];
        const unlocked = s.level >= form.level;
        slot.classList.toggle('locked', !unlocked);
        slot.classList.toggle('selected', n === s.formIndex);
        slot.querySelector('.name')!.textContent = unlocked ? form.name : `Level ${form.level}`;
        slot.setAttribute(
          'aria-label',
          unlocked ? `Shift into ${form.name}, key ${n}` : `Locked until level ${form.level}`,
        );
      });
    }
    this.energy.classList.toggle('hidden', !s.meter);
    if (s.meter) {
      this.energyFill.style.width = `${Math.round(s.meter.fraction * 100)}%`;
      this.energy.classList.toggle('tired', s.meter.tired);
      this.energyLabel.textContent = s.meter.label;
    }
  }

  setHint(text: string): void {
    if (text === this.lastHint) return;
    this.lastHint = text;
    this.hint.classList.toggle('hidden', !text);
    if (text) {
      this.hint.innerHTML = text;
      this.hint.classList.remove('pop');
      void this.hint.offsetWidth;
      this.hint.classList.add('pop');
    }
  }

  /** The "press E to…" prompt above the form bar. */
  setAction(text: string): void {
    if (text === this.lastAction) return;
    this.lastAction = text;
    this.action.classList.toggle('hidden', !text);
    this.action.innerHTML = text;
  }

  toast(text: string): void {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    this.toasts.appendChild(el);
    window.setTimeout(() => el.remove(), 2600);
  }

  hurt(): void {
    this.flash.classList.remove('on');
    void this.flash.offsetWidth;
    this.flash.classList.add('on');
  }

  /** Fade to dark, run `midway`, fade back. */
  fadeThrough(message: string, midway: () => void): void {
    this.fade.textContent = message;
    this.fade.classList.add('on');
    window.setTimeout(() => {
      midway();
      window.setTimeout(() => this.fade.classList.remove('on'), 500);
    }, 700);
  }
}

/** A centred card used for the title, level-up and finish screens. */
export class Card {
  private root: HTMLElement;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'overlay card hidden';
    parent.appendChild(this.root);
  }

  get isOpen(): boolean {
    return !this.root.classList.contains('hidden');
  }

  show(html: string, buttons: { label: string; primary?: boolean; onClick: () => void }[], extraClass = ''): void {
    this.root.className = `overlay card ${extraClass}`;
    this.root.innerHTML = `<div class="panel">${html}<div class="card-buttons"></div></div>`;
    const row = this.root.querySelector('.card-buttons')!;
    buttons.forEach((b, n) => {
      const el = document.createElement('button');
      el.className = `btn ${b.primary === false ? 'secondary' : ''}`;
      el.textContent = b.label;
      // Ignore presses for a moment, so a key held during play can't close a
      // card before it has been read.
      const shownAt = performance.now();
      el.addEventListener('click', () => {
        if (performance.now() - shownAt < 600) return;
        this.hide();
        b.onClick();
      });
      row.appendChild(el);
      if (n === 0) window.setTimeout(() => el.focus(), 650);
    });
  }

  hide(): void {
    this.root.classList.add('hidden');
  }
}
