import './style.css';
import { Game } from './game';

const mount = document.getElementById('game');
if (!mount) throw new Error('Missing #game element');

try {
  const game = new Game(mount);
  // Handy in the browser console while building the game: `game.debug`.
  (window as unknown as { game: Game }).game = game;
} catch (err) {
  console.error(err);
  mount.innerHTML =
    '<p class="fatal">Shape Shifter needs WebGL to draw its world, and this browser could not start it. Try a recent version of Chrome, Firefox, Safari or Edge.</p>';
}
