// SPIKE-01 page boot (coding-standards §2 main.js). External entry module —
// required because the CSP restricts script-src to 'self' (REQ-3 [OQ-23e932ef]),
// so the wiring cannot live inline in index.html (plan listed index.html; this
// is the documented D-AUTO deviation).
// Wiring: rAF loop -> input drained at step start -> grounded taps are jumps /
// airborne taps route to booster.tryBoost -> landing calls resetOnLanding ->
// render with trace + boost effect (ADR-004/005; [OQ-de773ff6]; phase_4).
import { createInput, playAreaRect, toGameCoords } from './input/index.js';
import { createBooster, createPlayer, jumpVector } from './gameplay/index.js';
import * as config from './config.js';
import { createTrace, draw } from './render/index.js';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
let playArea = null;

function resize() {
  // Canvas backing store cap min(devicePixelRatio, 3) [OQ-1e6e15dd].
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  playArea = playAreaRect(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', resize);
resize();

// Taps outside the fixed 9:16 play area — the letterbox bars — are IGNORED
// (return null; not enqueued). Settled decision [OQ-dcc2896b]: taps on the
// bars never count as game taps (jump, start, retry, resume).
function mapTap(px, py) {
  const game = toGameCoords(px, py, playArea);
  if (game.x < 0 || game.x > playArea.width ||
      game.y < 0 || game.y > playArea.height) {
    return null; // tap landed on a letterbox bar — ignored [OQ-dcc2896b]
  }
  return game;
}

const input = createInput(canvas, mapTap);

// Character starts standing at the center of the play area, on the platform.
const start = { x: playArea.width / 2, y: playArea.height - 76 };
const booster = createBooster(config);
const trace = createTrace(48); // ~0.8s of arc at 60fps; fixed capacity (NFR-04)
const fx = { trace, boostMs: 0 }; // reused every frame — never reallocated
let boostUntil = 0;
let seenBoosts = 0;
let wasGrounded = true;

// Tap provider drained by the player EVERY step ([OQ-de773ff6]). The player
// routes grounded taps to the jump rule and airborne taps to booster.tryBoost
// (TC_SPIKE01_019) — the split lives in player.step(), this stays dumb.
function provideTaps() {
  return input.drainTaps();
}

const player = createPlayer(start, config, jumpVector, provideTaps, booster);

let lastTime = 0;
function frame(time) {
  const dtMs = lastTime === 0 ? 0 : Math.min(time - lastTime, 100);
  lastTime = time;
  player.update(dtMs);
  const state = player.getState();
  if (!state.grounded) {
    trace.record(state.x, state.y);
  } else if (!wasGrounded) {
    booster.resetOnLanding(); // landing re-arms the booster (FR-07-AC-02)
    trace.clear(); // the next jump draws a fresh arc
  }
  wasGrounded = state.grounded;
  const boosts = booster.boosts();
  if (boosts > seenBoosts) {
    seenBoosts = boosts;
    boostUntil = performance.now() + 350; // boost effect window (TC_SPIKE01_022)
  }
  fx.boostMs = Math.max(0, boostUntil - performance.now());
  draw(ctx, state, playArea, fx);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
