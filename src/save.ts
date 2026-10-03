// Progress is kept in the browser's local storage so closing the tab doesn't
// lose it. Storage can be unavailable (private windows), so every access is
// guarded and the game simply starts fresh when it is.

const KEY = 'shape-shifter-save-v1';

export interface SaveData {
  level: number;
  lights: number;
  hearts: number;
  bread: number;
  form: number;
  checkpoint: string | null;
  /** Puzzle ids that have been solved. */
  solved: string[];
  /** Puzzle ids whose candle light has been taken. */
  taken: string[];
  breadTaken: string[];
  hintsDone: string[];
  finished: boolean;
}

export function freshSave(): SaveData {
  return {
    level: 0,
    lights: 0,
    hearts: 10,
    bread: 100,
    form: 0,
    checkpoint: null,
    solved: [],
    taken: [],
    breadTaken: [],
    hintsDone: [],
    finished: false,
  };
}

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return { ...freshSave(), ...(JSON.parse(raw) as Partial<SaveData>) };
  } catch {
    return null;
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // No storage: the game still works, it just won't remember.
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
