// DOM-free vector jump math (ADR-003; coding-standards §3).
// Direction = unit vector from the character's center to the tap point (FR-02-AC-01).
// Speed = linear interpolation from 0px at minJumpSpeed to maxSpeedTapDistance at
// maxJumpSpeed [OQ-bc9eac8e], capped at maxJumpSpeed beyond the cap distance (FR-03).
// Taps within centerTapRadius of the center hop straight up at minJumpSpeed (FR-05).
// No launch-angle clamp here: minLaunchAngle is a pinned config value only, the
// clamp behavior is EPIC-02 scope [OQ-d4e75731].
import {
  minJumpSpeed,
  maxJumpSpeed,
  maxSpeedTapDistance,
  centerTapRadius,
} from '../config.js';

// CV-10: speed(d) = minJumpSpeed + (maxJumpSpeed - minJumpSpeed) * min(d, cap) / cap
export function speedForTapDistance(distance) {
  const capped = Math.min(distance, maxSpeedTapDistance);
  return minJumpSpeed + ((maxJumpSpeed - minJumpSpeed) * capped) / maxSpeedTapDistance;
}

export function jumpVector(centerX, centerY, tapX, tapY) {
  const dx = tapX - centerX;
  const dy = tapY - centerY;
  const distance = Math.hypot(dx, dy);

  // FR-05: a tap inside the centre radius (or exactly on it) jumps straight up
  // at the minimum speed. Canvas y is down, so straight up is negative vy.
  if (distance <= centerTapRadius) {
    return { vx: 0, vy: -minJumpSpeed, speed: minJumpSpeed };
  }

  const speed = speedForTapDistance(distance);
  return {
    vx: (dx / distance) * speed,
    vy: (dy / distance) * speed,
    speed,
  };
}
