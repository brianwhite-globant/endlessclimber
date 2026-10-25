// Single source of tuned values (FR-60; coding-standards §3).
// Values recorded for the SPIKE-01 vector-input-feel prototype and pinned by
// tests/unit/config-pin.test.mjs (TC_SPIKE01_005/006, TC_SPIKE01_029..033).
// Feel-session retune rounds change THESE values only — never jump/input/render
// logic (TC_SPIKE01_004; RSK-01 mitigation).
export const minJumpSpeed = 250; // LIT-01: tap next to the character; interpolation floor
// [OQ-bc9eac8e]
export const maxJumpSpeed = 750; // LIT-02: tap >= 200px away
export const maxSpeedTapDistance = 200; // LIT-03: interpolation cap, linear in between
export const minLaunchAngle = 15; // LIT-04: pinned value ONLY; clamp is EPIC-02 scope
// [OQ-d4e75731]
export const centerTapRadius = 12; // LIT-05: <= 12px from center hops straight up
export const boosterVerticalSpeed = 500; // LIT-06: booster replaces vy, horizontal unchanged
export const gravity = 1800; // LIT-07: feel-realism carry only; EPIC-03 owns the physics constant
