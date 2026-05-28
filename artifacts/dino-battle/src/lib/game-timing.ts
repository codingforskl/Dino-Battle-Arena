/**
 * Global timing configuration for slower-paced gameplay
 * All durations are in milliseconds
 */

export const GAME_TIMING = {
  // Animation durations
  ABILITY_ANIM_MULTIPLIER: 2.0,

  // Hit detection and effect timings
  HIT_EFFECT_DELAY: 600,
  HIT_EFFECT_DURATION: 800,
  IMPACT_FLASH_DURATION: 1000,

  // Ultimate move effects
  ULTIMATE_SCREEN_FLASH: 1800,
  ULTIMATE_NAME_DISPLAY: 2200,
  LIGHTNING_EFFECT_DURATION: 900,
  ROAR_RING_DURATION: 1400,
  ARENA_SHAKE_DURATION: 1400,

  // Turn timing — much slower and clearer
  AI_TURN_DELAY: 4000,            // AI waits 4 seconds before acting
  STUN_AUTO_SKIP_DELAY: 3500,     // 3.5s countdown when player is stunned
  OPPONENT_SWITCH_DELAY: 2800,

  // Move effect particles
  PARTICLE_EFFECT_DURATION: 1400,
  MOVE_EFFECT_FADE_OUT: 400,

  // Status effect transitions
  STATUS_EFFECT_APPLY_DELAY: 400,
  STAMINA_BAR_ANIMATION: 700,
  HP_BAR_ANIMATION: 800,

  // Between-action delays
  ACTION_COMPLETION_PAUSE: 900,
  LOG_MESSAGE_DISPLAY_TIME: 1800,

  // Turn transition
  TURN_END_PAUSE: 700,
  TURN_START_DELAY: 500,

  EASE_TYPE: 'easeInOut' as const,

  DINO_IDLE_BREATHE_SPEED: 3200,
  DINO_CRITICAL_PULSE_SPEED: 1600,
};

export function getAdjustedDuration(baseDuration: number): number {
  return baseDuration * GAME_TIMING.ABILITY_ANIM_MULTIPLIER;
}
