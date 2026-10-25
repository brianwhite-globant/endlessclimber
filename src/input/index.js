// Input module surface: press normalization + tap queue (SVC-03-FE; ADR-004/005).
// Presses fire on touchstart/mousedown (gameplay-spec §1). Only the FIRST touch
// point of a gesture is used (FR-01-AC-02); further taps are ignored until the
// queue is drained at the start of the next physics step [OQ-de773ff6].
// The queue is transient in-memory state — never persisted (NFR-08).
// Cross-module imports use only this index.js (coding-standards §2).

export { playAreaRect, toGameCoords } from './map.js';

// Shared frozen empty array returned by drainTaps() when the queue is empty —
// avoids a fresh allocation on every physics step (NFR-04 hot-path rule).
// Never mutated; callers treat the drained array as read-only.
const EMPTY = Object.freeze([]);

// Factory: takes a tap surface element (DOM or test double with
// addEventListener) and a mapping fn (screen px -> game coords | null).
// A mapping fn may return null (e.g. taps on letterbox bars [OQ-dcc2896b]);
// null coords are never enqueued.
export function createInput(surfaceElement, mappingFn) {  const queue = [];

  function enqueuePress(px, py) {
    const coords = mappingFn(px, py);
    if (coords) queue.push(coords);
  }

  surfaceElement.addEventListener('touchstart', (event) => {
    if (event.cancelable) event.preventDefault();
    // FR-01-AC-02: only the first touch point of a gesture becomes a tap.
    const firstTouch = event.touches[0];
    if (firstTouch) enqueuePress(firstTouch.clientX, firstTouch.clientY);
  });

  surfaceElement.addEventListener('mousedown', (event) => {
    enqueuePress(event.clientX, event.clientY);
  });

  return {
    queueTap(coords) {
      queue.push(coords);
    },
    // Drained at the start of each physics step; returns and empties the queue.
    // Empty case returns the shared EMPTY array — no per-step allocation in the
    // hot path (NFR-04; coding-standards §3). Callers must never mutate the
    // return value.
    drainTaps() {
      if (queue.length === 0) return EMPTY;
      return queue.splice(0, queue.length);
    },
  };
}
