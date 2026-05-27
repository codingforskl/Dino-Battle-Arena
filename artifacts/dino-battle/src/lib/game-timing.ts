/**
 * Global timing configuration for slower-paced gameplay
 * All durations are in milliseconds
 */

export const GAME_TIMING = {
  // Animation durations - INCREASED from original speeds
  ABILITY_ANIM_MULTIPLIER: 1.8, // Multiplier for ability animations (was ~0.4-0.9s, now ~0.7-1.6s)
  
  // Hit detection and effect timings
  HIT_EFFECT_DELAY: 600, // Delay before impact effect shows (was 400-500ms)
  HIT_EFFECT_DURATION: 750, // How long the hit effect lasts (was 400-460ms)
  IMPACT_FLASH_DURATION: 1000, // Impact flash duration (was 550ms)
  
  // Ultimate move effects
  ULTIMATE_SCREEN_FLASH: 1600, // Ultimate screen flash duration (was 1200ms)
  ULTIMATE_NAME_DISPLAY: 2000, // How long the ultimate name shows (was 1200ms)
  LIGHTNING_EFFECT_DURATION: 800, // Lightning effect on screen (was 500ms)
  ROAR_RING_DURATION: 1200, // Roar rings animation (was 700ms)
  ARENA_SHAKE_DURATION: 1200, // Arena shake on ultimate (was 600ms)
  
  // Turn timing
  AI_TURN_DELAY: 2500, // Delay before AI makes their move (was 1000ms)
  AI_STUN_SKIP_DELAY: 2000, // Delay before AI acts when stunned (was 1200ms, + REST delay)
  OPPONENT_SWITCH_DELAY: 2500, // Delay before opponent switches to next team member (was 1600ms)
  
  // Move effect particles
  PARTICLE_EFFECT_DURATION: 1200, // Particle system duration (was 0.4-1.0s, now longer)
  MOVE_EFFECT_FADE_OUT: 300, // Time for move effects to fade (was instant)
  
  // Status effect transitions
  STATUS_EFFECT_APPLY_DELAY: 400, // Delay before showing status effect badges
  STAMINA_BAR_ANIMATION: 600, // Smooth stamina bar animation duration
  HP_BAR_ANIMATION: 700, // Smooth HP bar animation duration
  
  // Between-action delays
  ACTION_COMPLETION_PAUSE: 800, // Pause after action completes before next can start
  LOG_MESSAGE_DISPLAY_TIME: 1500, // How long to show battle log messages
  
  // Turn transition
  TURN_END_PAUSE: 600, // Pause at end of turn before next starts
  TURN_START_DELAY: 400, // Delay before a new turn visually starts
  
  // Animation easing - slower, more deliberate easing
  EASE_TYPE: 'easeInOut' as const,
  
  // Dino sprite animations
  DINO_IDLE_BREATHE_SPEED: 3000, // Breathing animation cycle (was ~2s, now 3s)
  DINO_CRITICAL_PULSE_SPEED: 1500, // Low HP pulse speed (was ~1s, now 1.5s)
};

/**
 * Helper to calculate adjusted animation duration
 */
export function getAdjustedDuration(baseDuration: number): number {
  return baseDuration * GAME_TIMING.ABILITY_ANIM_MULTIPLIER;
}
