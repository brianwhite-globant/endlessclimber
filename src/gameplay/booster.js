// Mid-air booster rule (SPIKE-01 US-01-03-FE; FR-06/FR-07; TERM-02 semantics).
// One mid-air tap per jump: the vertical speed is REPLACED with CV-06 upward
// (config.boosterVerticalSpeed), the horizontal speed is untouched. The booster
// fires only while airborne — a grounded tap is a jump, never a boost — and
// resets when the player lands (FR-07-AC-01..02; TC_SPIKE01_019..021).
// DOM-free and allocation-free: tryBoost mutates the player state in place and
// creates nothing (coding-standards §3; NFR-04).
export function createBooster(configModule) {
  let used = false;
  let boostCount = 0;

  return {
    // Returns true when the boost fired; false when grounded or already used
    // for this jump (a false return changes nothing — TC_SPIKE01_020).
    tryBoost(state) {
      if (!state || state.grounded) return false;
      if (used) return false;
      used = true;
      boostCount += 1;
      state.vy = -configModule.boosterVerticalSpeed;
      return true;
    },
    // Clears the used flag; called by the page wiring when the player lands.
    resetOnLanding() {
      used = false;
    },
    // Monotonic count of successful boosts; the page wiring polls it to time
    // the boost effect without the booster needing a clock (DOM-free).
    boosts() {
      return boostCount;
    },
  };
}
