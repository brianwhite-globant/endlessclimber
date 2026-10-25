// Fixed-timestep player integration (ADR-005; arch-standards §3; NFR-03/NFR-04).
// Physics runs in fixed 1/60s steps from an accumulator; the delta is capped at
// 100ms to avoid the spiral of death after tab switches. A tap drained at the
// START of a step becomes a jump at that step (TC_SPIKE01_007; [OQ-de773ff6]);
// a jump fires only when grounded (TC_SPIKE01_009). update() allocates nothing:
// no new, no object/array literals, no closures, no map/filter/spread inside
// the per-step work (coding-standards §3).
//
// Contract extension (documented deviation): a 4th argument, tapProvider, is a
// function returning the taps drained for this step (the page wiring passes
// () => input.drainTaps()). A 5th argument, booster, is the phase_4 mid-air
// booster ({ tryBoost(state) }): taps drained while AIRBORNE route to
// booster.tryBoost instead of the jump rule (TC_SPIKE01_019; plan wiring step
// "a tap while airborne routes to booster.tryBoost"). The player stays
// DOM-free and owns the per-step order: consume input, then physics
// ([OQ-de773ff6] subset; REC-04: no lose checks).
export function createPlayer(startState, configModule, jumpVectorFn, tapProvider, booster) {
  const state = {
    x: startState.x,
    y: startState.y,
    vx: 0,
    vy: 0,
    grounded: true,
  };
  // The prototype has one static platform: the player stands at its start
  // height and lands back on it (fixed viewport, no camera in the spike).
  const groundY = startState.y;
  const queued = []; // directly queued taps (phase_4 wiring); drained before provider taps
  let accumulator = 0;
  const STEP_MS = 1000 / 60; // CV-08
  const MAX_FRAME_MS = 100; // delta cap (ADR-005)

  function step() {
    // Per-step order: consume queued input at step start, then physics
    // ([OQ-de773ff6] subset; REC-04). The provider drains EVERY step —
    // otherwise mid-air taps would sit in the queue and fire as a delayed
    // jump on landing (surfaced in the phase_4 desktop smoke).
    let drained = null;
    if (queued.length > 0) {
      drained = queued.splice(0, queued.length);
    } else if (tapProvider) {
      drained = tapProvider();
    }
    // tapProvider() may return a shared read-only array (input/index.js EMPTY)
    // or null coords filtered upstream (letterbox taps ignored [OQ-dcc2896b]).
    const tap = drained && drained.length > 0 ? drained[0] : null;
    if (state.grounded) {
      if (tap) {
        const vector = jumpVectorFn(state.x, state.y, tap.x, tap.y);
        state.vx = vector.vx;
        state.vy = vector.vy;
        state.grounded = false;
      }
    } else if (tap && booster) {
      // Airborne taps are booster taps, never jumps (TERM-02). A rejected
      // boost (already used) must not fall through to the jump rule.
      booster.tryBoost(state);
    }
    if (!state.grounded) {
      state.vy += configModule.gravity * (STEP_MS / 1000);
      state.x += state.vx * (STEP_MS / 1000);
      state.y += state.vy * (STEP_MS / 1000);
      if (state.vy > 0 && state.y >= groundY) {
        // One-way platform landing: falling back onto the start surface.
        state.y = groundY;
        state.vy = 0;
        state.vx = 0;
        state.grounded = true;
      }
    }
  }

  return {
    // Direct queue for taps that must apply at the next step start (used by
    // unit tests and the phase_4 booster wiring).
    queueTap(tap) {
      queued.push(tap);
    },
    update(dtMs) {
      accumulator += Math.min(dtMs, MAX_FRAME_MS);
      // Epsilon on the step boundary: 6 * STEP_MS rounds just above 100ms in
      // float, and the capped 100ms frame must still run exactly 6 steps
      // (ADR-005 delta cap; plan edge case "no burst of > 6 steps").
      while (accumulator >= STEP_MS - 1e-9) {
        accumulator -= STEP_MS;
        step();
      }
    },
    getState() {
      return state;
    },
  };
}
