// Base canvas draw: stand-in character, one static platform, ground, jump
// trajectory trace and boost effect (prototype-grade; [OQ-d20cc766] render
// reads the player state each frame). Release palette and 3:1 contrast are
// EPIC-10 scope (NFR-12 out of chunk). Allocation-free: no new, no literals,
// no closures inside draw (coding-standards §3, NFR-04). Draw guards on state
// before the first jump. createTrace() is the DOM-free factory for the
// preallocated fixed ring buffer (NFR-04; TC_SPIKE01_010 support); the page
// passes { trace, boostMs } as fx so the feel session can judge the arc
// (TC_SPIKE01_017) and the boost (TC_SPIKE01_022).

export function createTrace(capacity) {
  const xs = new Float32Array(capacity);
  const ys = new Float32Array(capacity);
  let head = 0; // next write slot
  let count = 0;
  return {
    record(x, y) {
      xs[head] = x;
      ys[head] = y;
      head = (head + 1) % capacity;
      if (count < capacity) count += 1;
    },
    clear() {
      head = 0;
      count = 0;
    },
    count() {
      return count;
    },
    // Oldest-first read index (wraps around the ring).
    xAt(i) {
      return xs[(head - count + i + capacity) % capacity];
    },
    yAt(i) {
      return ys[(head - count + i + capacity) % capacity];
    },
  };
}

export function draw(ctx, playerState, playArea, fx) {
  if (!ctx || !playArea) return;
  if (!playerState) return; // guard before the first jump / before boot

  const { width, height } = playArea;

  // Clear the whole canvas (not just the play area — the letterboxed play
  // area is narrower than the canvas on desktop, and anything drawn outside
  // it would accumulate forever). Self-correction surfaced in the phase_4
  // desktop smoke; also fixed the original missing-clear ghost trail.
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Jump trajectory trace: oldest-first dots over the recent arc. Drawn before
  // the character so the arc reads as a trail behind it (TC_SPIKE01_017).
  if (fx && fx.trace) {
    ctx.fillStyle = '#4ECDC4';
    const points = fx.trace.count();
    for (let i = 0; i < points; i++) {
      ctx.fillRect(fx.trace.xAt(i) - 2, fx.trace.yAt(i) - 2, 4, 4);
    }
  }

  // Ground: bottom strip of the play area.
  ctx.fillStyle = '#1A1A2E';
  ctx.fillRect(0, height - 16, width, 16);

  // One static platform: centered, tier-1 width (gameplay-spec §4), top at
  // the player's standing height.
  const platformWidth = Math.min(200, width);
  const platformX = (width - platformWidth) / 2;
  const platformY = height - 64;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(platformX, platformY, platformWidth, 12);
  ctx.strokeStyle = '#1A1A2E';
  ctx.lineWidth = 2;
  ctx.strokeRect(platformX, platformY, platformWidth, 12);

  // Stand-in character: 24x24 rounded square, #FFD23F with dark outline.
  const size = 24;
  const charX = playerState.x - size / 2;
  const charY = playerState.y - size / 2;
  ctx.fillStyle = '#FFD23F';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(charX, charY, size, size, 6);
  } else {
    ctx.rect(charX, charY, size, size);
  }
  ctx.fill();
  ctx.strokeStyle = '#1A1A2E';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Boost effect: a fading ring above the character while the boost is fresh
  // (fx.boostMs counts down from the page wiring; TC_SPIKE01_022 support).
  if (fx && fx.boostMs > 0) {
    const t = Math.min(fx.boostMs / 350, 1); // 1 = just fired, 0 = fading out
    ctx.strokeStyle = '#FF6B6B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(playerState.x, playerState.y - 18, 10 + 8 * (1 - t), 0, Math.PI * 2);
    ctx.stroke();
  }
}
