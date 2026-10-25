// DOM-free screen-to-game coordinate mapping for the fixed 9:16 play area
// (coding-standards §3: input mapping math is DOM-free; ADR-008 principle 8 —
// render owns mapping, the prototype shares one function).
// The spike is fixed-viewport: no letterbox bars are drawn; the play area is
// the largest centered 9:16-proportioned rect inside the canvas [OQ-045a448b].

// Largest centered 9:16-proportioned rect inside a canvasWidth x canvasHeight
// canvas. Pure; any canvas size is valid (resize-safe, TC_SPIKE01_015).
export function playAreaRect(canvasWidth, canvasHeight) {
  const targetAspect = 9 / 16;
  const canvasAspect = canvasWidth / canvasHeight;
  let width;
  let height;
  if (canvasAspect > targetAspect) {
    // Canvas is wider than 9:16 — the rect height fills the canvas.
    height = canvasHeight;
    width = (height * 9) / 16;
  } else {
    // Canvas is narrower (or exactly 9:16) — the rect width fills the canvas.
    width = canvasWidth;
    height = (width * 16) / 9;
  }
  return {
    x: (canvasWidth - width) / 2,
    y: (canvasHeight - height) / 2,
    width,
    height,
  };
}

// Map a screen point to play-area coordinates (origin = top-left of the play
// area). The caller clamps out-of-bounds points to the play area before jump math.
export function toGameCoords(px, py, playArea) {
  return { x: px - playArea.x, y: py - playArea.y };
}
