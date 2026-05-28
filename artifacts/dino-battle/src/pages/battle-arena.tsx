import { useContext, useEffect, useState, useRef } from 'react';
import { GameContext } from '@/App';
import { DINOSAURS, STATUS_TOOLTIPS } from '@/lib/dino-data';
import { getRequiredBites } from '@/lib/game-engine';
import { DinoSvg } from '@/components/dino-svg';
import { MoveEffect } from '@/components/move-effects';
import { motion, AnimatePresence } from 'framer-motion';
import { GAME_TIMING, getAdjustedDuration } from '@/lib/game-timing';
import { ArenaBackground3D } from '@/components/arena-background-3d';

type AnimTarget = 'self' | 'opponent';
interface AnimConfig {
  target: AnimTarget;
  keyframes: Record<string, number[]>;
  duration: number;
  isUltimate?: boolean;
  showRoarRings?: boolean;
  showImpact?: boolean;
  showLightning?: boolean;
}

const ABILITY_ANIMS: Record<string, AnimConfig> = {
  sickle_claw:     { target: 'opponent', duration: getAdjustedDuration(0.40), showImpact: true,
    keyframes: { x:[0,72,24,0], y:[0,-18,8,0], rotate:[0,-22,6,0], scale:[1,1.07,1,1] } },
  pack_feint:      { target: 'self', duration: getAdjustedDuration(0.55),
    keyframes: { x:[0,-28,14,-8,0], y:[0,-12,6,0], rotate:[0,12,-5,0], scale:[1,1.12,0.93,1] } },
  raptor_surround: { target: 'opponent', duration: getAdjustedDuration(0.60), showImpact: true,
    keyframes: { x:[0,40,80,60,0], y:[0,-20,-5,10,0], rotate:[0,-15,5,-8,0], scale:[1,1.08,1.12,1,1] } },
  jugular_slash:   { target: 'opponent', duration: getAdjustedDuration(0.44), showImpact: true,
    keyframes: { x:[0,76,28,0], y:[0,-30,4,0], rotate:[0,-28,10,0], scale:[1,1.14,1,1] } },
  leap_strike:     { target: 'opponent', duration: getAdjustedDuration(0.56), showImpact: true,
    keyframes: { x:[0,90,34,0], y:[0,-70,-8,0], rotate:[0,-30,10,0], scale:[1,1.15,1,1] } },
  frenzy_blitz:    { target: 'opponent', duration: getAdjustedDuration(0.80), isUltimate: true, showImpact: true, showLightning: true,
    keyframes: { x:[0,70,26,80,34,0], y:[0,-24,10,-18,5,0], rotate:[0,-24,10,-16,8,0], scale:[1,1.24,1,1.20,1,1] } },
  crushing_bite:   { target: 'opponent', duration: getAdjustedDuration(0.52), showImpact: true,
    keyframes: { x:[0,90,28,0], y:[0,10,-2,0], rotate:[0,-16,5,0], scale:[1.08,1.20,1,1] } },
  body_slam:       { target: 'opponent', duration: getAdjustedDuration(0.58), showImpact: true,
    keyframes: { x:[0,82,26,0], y:[0,24,6,0], rotate:[0,-10,3,0], scale:[1.05,1.24,1,1] } },
  tail_sweep_giga: { target: 'opponent', duration: getAdjustedDuration(0.55), showImpact: true,
    keyframes: { x:[0,-14,38,0], y:[0,5,0,0], rotate:[0,-44,10,0], scale:[1,1.07,1,1] } },
  roar:            { target: 'self', duration: getAdjustedDuration(0.65), showRoarRings: true,
    keyframes: { scale:[1,1.40,1.18,1.28,1], y:[0,-10,4,-6,0], rotate:[0,-6,3,-2,0] } },
  apex_domination: { target: 'opponent', duration: getAdjustedDuration(0.88), isUltimate: true, showImpact: true, showLightning: true,
    keyframes: { x:[0,100,34,0], y:[0,34,-5,0], rotate:[0,-24,5,0], scale:[1.15,1.34,1.05,1] } },
  sail_slam:       { target: 'opponent', duration: getAdjustedDuration(0.48), showImpact: true,
    keyframes: { x:[0,64,20,0], y:[0,-30,12,0], rotate:[0,-20,5,0], scale:[1,1.11,1,1] } },
  tail_whip:       { target: 'opponent', duration: getAdjustedDuration(0.52), showImpact: true,
    keyframes: { x:[0,-16,40,0], y:[0,5,-2,0], rotate:[0,-44,8,0], scale:[1,1.07,1,1] } },
  ambush_strike:   { target: 'opponent', duration: getAdjustedDuration(0.48), showImpact: true,
    keyframes: { x:[0,92,26,0], y:[0,6,0,0], rotate:[0,-14,3,0], scale:[1.10,1.14,1,1] } },
  bite_spino:      { target: 'opponent', duration: getAdjustedDuration(0.46), showImpact: true,
    keyframes: { x:[0,64,18,0], y:[0,10,0,0], rotate:[0,-12,3,0], scale:[1,1.09,1,1] } },
  death_roll:      { target: 'opponent', duration: getAdjustedDuration(0.88), isUltimate: true, showImpact: true, showLightning: true,
    keyframes: { x:[0,70,88,44,0], y:[0,16,-5,22,0], rotate:[0,180,270,360,360], scale:[1.10,1.24,1.10,1,1] } },
  rex_bite:        { target: 'opponent', duration: getAdjustedDuration(0.52), showImpact: true,
    keyframes: { x:[0,98,30,0], y:[0,12,0,0], rotate:[0,-18,4,0], scale:[1.12,1.26,1,1] } },
  stomp:           { target: 'opponent', duration: getAdjustedDuration(0.52), showImpact: true,
    keyframes: { x:[0,70,0], y:[0,40,-5,0], rotate:[0,-10,0], scale:[1,1.22,1] } },
  headbutt:        { target: 'opponent', duration: getAdjustedDuration(0.48), showImpact: true,
    keyframes: { x:[0,90,28,0], y:[0,-12,6,0], rotate:[0,-25,5,0], scale:[1.06,1.20,1,1] } },
  rex_roar:        { target: 'self', duration: getAdjustedDuration(0.75), showRoarRings: true,
    keyframes: { scale:[1,1.50,1.24,1.38,1], y:[0,-14,6,-9,0], rotate:[0,-9,4,-4,0] } },
  tyrants_wrath:   { target: 'opponent', duration: getAdjustedDuration(0.92), isUltimate: true, showImpact: true, showLightning: true,
    keyframes: { x:[0,112,44,0], y:[0,16,-3,0], rotate:[0,-30,6,0], scale:[1.22,1.44,1.12,1] } },
  talon_rake:      { target: 'opponent', duration: getAdjustedDuration(0.40), showImpact: true,
    keyframes: { x:[0,82,26,0], y:[0,-30,12,0], rotate:[0,-30,8,0], scale:[1,1.11,1,1] } },
  aerial_dodge:    { target: 'self', duration: getAdjustedDuration(0.55),
    keyframes: { x:[0,-18,12,-6,0], y:[0,-42,-10,0], rotate:[0,-20,6,0], scale:[1,0.86,1,1] } },
  terror_dive:     { target: 'opponent', duration: getAdjustedDuration(0.52), showImpact: true,
    keyframes: { x:[0,60,30,0], y:[0,-60,8,0], rotate:[0,-45,15,0], scale:[1,1.18,1,1] } },
  screech:         { target: 'self', duration: getAdjustedDuration(0.60), showRoarRings: true,
    keyframes: { scale:[1,1.30,1.12,1.20,1], x:[0,-6,5,-3,0], y:[0,-10,5,-4,0] } },
  beak_stab:       { target: 'opponent', duration: getAdjustedDuration(0.38), showImpact: true,
    keyframes: { x:[0,94,18,0], y:[0,-12,6,0], rotate:[0,-40,12,0], scale:[1,1.09,1,1] } },
  screech_dive:    { target: 'opponent', duration: getAdjustedDuration(0.80), isUltimate: true, showImpact: true, showLightning: true,
    keyframes: { x:[0,100,36,0], y:[0,-75,28,0], rotate:[0,-46,16,0], scale:[1,1.20,1.06,1] } },
};

const DEFAULT_ANIM: AnimConfig = {
  target: 'opponent', duration: getAdjustedDuration(0.5), showImpact: false,
  keyframes: { x:[0,40,0], y:[0,0,0], rotate:[0,0,0], scale:[1,1,1] },
};

interface AnimState {
  playing: boolean;
  config: AnimConfig;
  key: number;
  isUltimate: boolean;
}

const IDLE: AnimState = { playing: false, config: DEFAULT_ANIM, key: 0, isUltimate: false };

type CapturePhase = 'idle' | 'throwing' | 'success' | 'fail';

export default function BattleArena() {
  const ctx = useContext(GameContext);
  const [playerAnim, setPlayerAnim] = useState<AnimState>(IDLE);
  const [opponentAnim, setOpponentAnim] = useState<AnimState>(IDLE);
  const [hitPlayer,   setHitPlayer]   = useState<'normal' | 'ultimate' | null>(null);
  const [hitOpponent, setHitOpponent] = useState<'normal' | 'ultimate' | null>(null);
  const [showUltEffect, setShowUltEffect] = useState<{ side: 'player' | 'opponent'; name: string } | null>(null);
  const [showImpact, setShowImpact] = useState<{ side: 'player' | 'opponent' } | null>(null);
  const [showRoar, setShowRoar] = useState<{ side: 'player' | 'opponent' } | null>(null);
  const [showLightning, setShowLightning] = useState<{ side: 'player' | 'opponent' } | null>(null);
  const [arenaShake, setArenaShake] = useState(false);
  const [lastLog, setLastLog] = useState('');
  const [activeMoveEffect, setActiveMoveEffect] = useState<{ abilityId: string; side: 'player' | 'opponent' } | null>(null);
  const [showCritFlash, setShowCritFlash] = useState(false);
  const [stunCountdown, setStunCountdown] = useState<number | null>(null);
  const [capturePhase, setCapturePhase] = useState<CapturePhase>('idle');

  const runAIRef = useRef<() => void>(() => {});

  const logLength = ctx?.state.log.length ?? 0;
  useEffect(() => {
    const log = ctx?.state.log ?? [];
    if (log.length > 0) setLastLog(log[log.length - 1]);
  }, [logLength]);

  // Crit flash
  const lastCrit = ctx?.state.lastCrit ?? false;
  useEffect(() => {
    if (lastCrit) {
      setShowCritFlash(true);
      const t = setTimeout(() => setShowCritFlash(false), 600);
      return () => clearTimeout(t);
    }
  }, [lastCrit, logLength]);

  // ── NEW: AI trigger based on activeTurn state ─────────────────────────
  const activeTurn = ctx?.state.activeTurn ?? 'player';
  const hasWinner  = !!ctx?.state.winner;
  const awaitingSwitch = ctx?.state.awaitingSwitch ?? null;

  useEffect(() => {
    if (activeTurn !== 'opponent' || hasWinner || awaitingSwitch || capturePhase !== 'idle') return;
    const timer = setTimeout(() => runAIRef.current(), GAME_TIMING.AI_TURN_DELAY);
    return () => clearTimeout(timer);
  }, [activeTurn, hasWinner, awaitingSwitch, capturePhase, logLength]);

  // ── NEW: Stun auto-skip with countdown ───────────────────────────────
  const isPlayerStunned = !!(ctx?.state?.player?.statusEffects.some(e => e.type === 'stunned'));
  useEffect(() => {
    if (activeTurn !== 'player' || !isPlayerStunned || hasWinner) return;
    setStunCountdown(Math.ceil(GAME_TIMING.STUN_AUTO_SKIP_DELAY / 1000));
    const interval = setInterval(() => {
      setStunCountdown(prev => (prev !== null && prev > 1 ? prev - 1 : prev));
    }, 1000);
    const skipTimer = setTimeout(() => {
      clearInterval(interval);
      setStunCountdown(null);
      ctx?.dispatch({ type: 'REST', attacker: 'player' });
    }, GAME_TIMING.STUN_AUTO_SKIP_DELAY);
    return () => {
      clearInterval(interval);
      clearTimeout(skipTimer);
      setStunCountdown(null);
    };
  }, [activeTurn, isPlayerStunned, hasWinner]);

  // ── Auto-switch opponent team member ─────────────────────────────────
  useEffect(() => {
    if (awaitingSwitch !== 'opponent') return;
    const bench = ctx?.state?.opponentTeam ?? [];
    if (bench.length === 0) return;
    const timer = setTimeout(() => {
      ctx?.dispatch({ type: 'SWITCH_TEAM_MEMBER', attacker: 'opponent', nextDinoId: bench[0].dinoId });
    }, GAME_TIMING.OPPONENT_SWITCH_DELAY);
    return () => clearTimeout(timer);
  }, [awaitingSwitch]);

  if (!ctx || !ctx.state.player || !ctx.state.opponent) return null;

  const { state: rawState, dispatch } = ctx;
  const state = rawState as Omit<typeof rawState, 'player' | 'opponent'> & {
    player: NonNullable<typeof rawState.player>;
    opponent: NonNullable<typeof rawState.opponent>;
  };
  const playerBase   = DINOSAURS[state.player.dinoId];
  const opponentBase = DINOSAURS[state.opponent.dinoId];

  // ── Animation helpers ─────────────────────────────────────────────────
  const fireAnimation = (abilityId: string, attacker: 'player' | 'opponent', abilityName: string) => {
    const cfg   = ABILITY_ANIMS[abilityId] ?? DEFAULT_ANIM;
    const isUlt = !!cfg.isUltimate;
    const hitDelay = Math.round(cfg.duration * 0.55 * 1000);

    setActiveMoveEffect({ abilityId, side: attacker });

    if (attacker === 'player') {
      setPlayerAnim(prev => ({ playing: true, config: cfg, key: prev.key + 1, isUltimate: isUlt }));
      setTimeout(() => setPlayerAnim(IDLE), Math.round(cfg.duration * 1000) + 200);
    } else {
      setOpponentAnim(prev => ({ playing: true, config: cfg, key: prev.key + 1, isUltimate: isUlt }));
      setTimeout(() => setOpponentAnim(IDLE), Math.round(cfg.duration * 1000) + 200);
    }

    if (isUlt) {
      setArenaShake(true);
      setTimeout(() => setArenaShake(false), GAME_TIMING.ARENA_SHAKE_DURATION);
      setShowUltEffect({ side: attacker, name: abilityName });
      setTimeout(() => setShowUltEffect(null), GAME_TIMING.ULTIMATE_SCREEN_FLASH);
    }
    if (cfg.showRoarRings) {
      setShowRoar({ side: attacker });
      setTimeout(() => setShowRoar(null), GAME_TIMING.ROAR_RING_DURATION);
    }
    if (cfg.showImpact) {
      setTimeout(() => {
        const hitSide: 'player' | 'opponent' = attacker === 'player' ? 'opponent' : 'player';
        setShowImpact({ side: hitSide });
        setTimeout(() => setShowImpact(null), GAME_TIMING.IMPACT_FLASH_DURATION);
        if (isUlt) {
          setShowLightning({ side: hitSide });
          setTimeout(() => setShowLightning(null), GAME_TIMING.LIGHTNING_EFFECT_DURATION);
          setHitOpponent(attacker === 'player' ? 'ultimate' : null);
          setHitPlayer(attacker === 'opponent' ? 'ultimate' : null);
          setTimeout(() => { setHitOpponent(null); setHitPlayer(null); }, GAME_TIMING.HIT_EFFECT_DURATION);
        } else {
          if (attacker === 'player') { setHitOpponent('normal'); setTimeout(() => setHitOpponent(null), GAME_TIMING.HIT_EFFECT_DURATION); }
          else { setHitPlayer('normal'); setTimeout(() => setHitPlayer(null), GAME_TIMING.HIT_EFFECT_DURATION); }
        }
      }, hitDelay);
    }
  };

  // ── AI logic ──────────────────────────────────────────────────────────
  const runAI = () => {
    if (!ctx.state.winner && ctx.state.opponent && ctx.state.player) {
      const aiState  = ctx.state.opponent;
      const aiBase   = DINOSAURS[aiState.dinoId];
      const plState  = ctx.state.player;
      const plBase   = DINOSAURS[plState.dinoId];

      if (aiState.statusEffects.some(e => e.type === 'stunned')) {
        dispatch({ type: 'REST', attacker: 'opponent' });
        return;
      }

      const aiHpPct   = aiState.hp / aiBase.maxHp;
      const plHpPct   = plState.hp / plBase.maxHp;
      const aiStamPct = aiState.stamina / aiBase.maxStamina;

      if (aiStamPct < 0.18 && aiHpPct > 0.3) {
        dispatch({ type: 'REST', attacker: 'opponent' });
        return;
      }

      const validAbilities = aiBase.abilities.filter(a =>
        a.staminaCost <= aiState.stamina && (!a.isUltimate || !aiState.ultimateUsed)
      );

      if (validAbilities.length === 0) {
        dispatch({ type: 'REST', attacker: 'opponent' });
        return;
      }

      const scoreAbility = (a: typeof validAbilities[number]): number => {
        let s = 0;
        if (a.type === 'attack' && a.damage) {
          s += a.damage * 1.5;
          if (a.damage >= plState.hp) s += 200;
          if (plHpPct < 0.3) s += 40;
        }
        if (a.damage && a.staminaCost > 0) s += (a.damage / a.staminaCost) * 4;
        if (a.id === 'roar' || a.id === 'rex_roar') {
          const already = plState.statusEffects.some(e => e.type === 'intimidated' || e.type === 'stunned');
          s += already ? -30 : (aiHpPct > 0.6 ? 50 : 20);
        }
        if (a.id === 'screech') {
          s += plState.statusEffects.some(e => e.type === 'blinded') ? -30 : 38;
        }
        if (a.id === 'tail_sweep_giga' || a.id === 'stomp') {
          s += plState.statusEffects.some(e => e.type === 'slowed') ? -5 : 18;
        }
        if (['body_slam','rex_roar','raptor_surround','terror_dive'].includes(a.id)) {
          const already = plState.statusEffects.some(e => e.type === 'stunned');
          s += already ? -40 : 45;
        }
        if (a.id === 'jugular_slash') {
          s += plState.statusEffects.some(e => e.type === 'bleeding') ? -20 : 42;
        }
        if (a.type === 'buff') {
          s += aiState.statusEffects.some(e => e.type === 'evade') ? -50 : (aiHpPct < 0.35 ? 55 : 10);
        }
        if (a.isUltimate) {
          if (a.damage && a.damage >= plState.hp) s += 250;
          else if (plHpPct < 0.45) s += 70;
          else if (aiHpPct < 0.22) s += 90;
          else s -= 70;
          if (ctx.state.turnNumber <= 2) s -= 120;
        }
        s += (Math.random() - 0.5) * 12;
        return s;
      };

      const scored  = validAbilities.map(a => ({ a, s: scoreAbility(a) })).sort((x, y) => y.s - x.s);
      const topN    = Math.min(3, scored.length);
      const weights = [0.70, 0.22, 0.08].slice(0, topN);
      let r = Math.random() * weights.reduce((a, b) => a + b, 0);
      let pick = scored[0].a;
      for (let i = 0; i < topN; i++) {
        r -= weights[i];
        if (r <= 0) { pick = scored[i].a; break; }
      }

      fireAnimation(pick.id, 'opponent', pick.name);
      dispatch({ type: 'USE_ABILITY', abilityId: pick.id, attacker: 'opponent' });
    }
  };

  runAIRef.current = runAI;

  // ── Player actions ────────────────────────────────────────────────────
  const handleAction = (abilityId: string) => {
    if (state.activeTurn !== 'player') return;
    if (state.awaitingSwitch || state.winner) return;
    const ability = playerBase.abilities.find(a => a.id === abilityId);
    if (!ability || (ability.isUltimate && state.player.ultimateUsed)) return;
    fireAnimation(abilityId, 'player', ability.name);
    dispatch({ type: 'USE_ABILITY', abilityId, attacker: 'player' });
    // AI is triggered by activeTurn useEffect after state updates
  };

  const handleRest = () => {
    if (state.activeTurn !== 'player' || state.awaitingSwitch || state.winner) return;
    dispatch({ type: 'REST', attacker: 'player' });
  };

  // ── Wild Hunt capture ─────────────────────────────────────────────────
  const handleCapture = () => {
    if (capturePhase !== 'idle' || state.activeTurn !== 'player' || state.winner) return;
    setCapturePhase('throwing');
    const wildHpPct  = state.opponent.hp / opponentBase.maxHp;
    const chance     = Math.min(0.85, 0.30 + (1 - wildHpPct / 0.30) * 0.55);
    const success    = Math.random() < chance;
    setTimeout(() => {
      dispatch({ type: 'CAPTURE_ATTEMPT', success });
      setCapturePhase(success ? 'success' : 'fail');
      setTimeout(() => setCapturePhase('idle'), 2200);
    }, 1600);
  };

  // ── Visual helpers ────────────────────────────────────────────────────
  const pRequiredBites = getRequiredBites(state.player.dinoId, state.opponent.dinoId);
  const oRequiredBites = getRequiredBites(state.opponent.dinoId, state.player.dinoId);
  const maxH           = 4.0;
  const oImgH          = Math.round((opponentBase.height / maxH) * 100 + 40);
  const pImgH          = Math.round((playerBase.height   / maxH) * 130 + 55);

  const buildAnimate = (anim: AnimState, side: 'player' | 'opponent') => {
    if (!anim.playing) return { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 };
    const kf   = anim.config.keyframes;
    const xDir = side === 'player' ? 1 : -1;
    return {
      x:      kf.x      ? kf.x.map((v: number) => v * xDir) : [0, 0],
      y:      kf.y      ?? [0, 0],
      rotate: kf.rotate ? kf.rotate.map((v: number) => v * (side === 'player' ? 1 : -1)) : [0, 0],
      scale:  kf.scale  ?? [1, 1],
      opacity: 1,
    };
  };

  const playerCss   = hitPlayer === 'ultimate' ? 'dino-ult-hit' : hitPlayer === 'normal' ? 'dino-hit-player' : playerAnim.isUltimate && playerAnim.playing ? 'dino-ult-player' : '';
  const opponentCss = hitOpponent === 'ultimate' ? 'dino-ult-hit' : hitOpponent === 'normal' ? 'dino-hit-opponent' : opponentAnim.isUltimate && opponentAnim.playing ? 'dino-ult-opponent' : '';

  const playerHpPct   = state.player.hp   / playerBase.maxHp;
  const opponentHpPct = state.opponent.hp / opponentBase.maxHp;

  const playerVisualCls = state.player.hp   <= 0 ? '' : playerCss   || (playerHpPct   < 0.25 ? 'dino-critical' : 'dino-breathe');
  const oppVisualCls    = state.opponent.hp <= 0 ? '' : opponentCss || (opponentHpPct < 0.25 ? 'dino-critical' : 'dino-breathe');
  const playerFilter    = state.player.hp   <= 0 ? 'grayscale(0.6) brightness(0.6)' : 'drop-shadow(3px 8px 14px rgba(0,0,0,0.6))';
  const opponentFilter  = state.opponent.hp <= 0 ? 'grayscale(0.6) brightness(0.6)' : 'drop-shadow(3px 8px 14px rgba(0,0,0,0.6))';

  const playerCombo     = state.playerCombo ?? 0;
  const playerIsDesperate   = playerHpPct   < 0.22 && state.player.hp   > 0;
  const opponentIsDesperate = opponentHpPct < 0.22 && state.opponent.hp > 0;

  // Speed comparison for UI hints
  const plSpd  = state.player.statusEffects.some(e => e.type === 'slowed')   ? Math.floor(playerBase.baseSpeed / 2)   : playerBase.baseSpeed;
  const oppSpd = state.opponent.statusEffects.some(e => e.type === 'slowed') ? Math.floor(opponentBase.baseSpeed / 2) : opponentBase.baseSpeed;
  const playerFaster  = plSpd  > oppSpd;
  const opponentFaster = oppSpd > plSpd;

  // Hunt mode shows capture button when wild dino <30% HP
  const canCapture = state.gameMode === 'hunt' && !state.winner && opponentHpPct < 0.30 && opponentHpPct > 0 && capturePhase === 'idle';
  const captureChancePct = canCapture ? Math.round(Math.min(85, 30 + (1 - opponentHpPct / 0.30) * 55)) : 0;

  const isPlayerTurn     = state.activeTurn === 'player' && !state.winner && !state.awaitingSwitch;
  const playerInputBlocked = !isPlayerTurn || isPlayerStunned;

  return (
    <div className="flex-1 flex flex-col" style={{ minHeight: '100vh', background: '#c8d8e8', userSelect: 'none' }}>

      {/* ── BATTLE FIELD ── */}
      <div className={`relative overflow-hidden flex-shrink-0 ${arenaShake ? 'arena-shake' : ''}`} style={{ height: '52vh' }}>
        <ArenaBackground3D mode={state.gameMode as '1v1' | 'team' | 'hunt'} />
        <div className="absolute inset-0" style={{
          background: state.gameMode === 'team'
            ? 'linear-gradient(180deg, rgba(30,5,5,0.6) 0%, transparent 35%, rgba(60,15,5,0.7) 85%)'
            : state.gameMode === 'hunt'
            ? 'linear-gradient(180deg, rgba(2,15,5,0.5) 0%, transparent 40%, rgba(5,20,2,0.6) 85%)'
            : 'linear-gradient(180deg, rgba(5,8,20,0.35) 0%, transparent 40%, rgba(15,8,4,0.5) 82%)'
        }} />

        {activeMoveEffect && (
          <MoveEffect abilityId={activeMoveEffect.abilityId} side={activeMoveEffect.side} onComplete={() => setActiveMoveEffect(null)} />
        )}

        {/* Crit flash */}
        <AnimatePresence>
          {showCritFlash && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 0.55, 0] }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
              className="absolute inset-0 pointer-events-none" style={{ zIndex: 45, background: 'radial-gradient(ellipse at 50% 50%, rgba(255,220,0,0.6) 0%, rgba(255,120,0,0.3) 50%, transparent 80%)' }} />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showCritFlash && (
            <motion.div initial={{ scale: 0.5, opacity: 0, y: 20 }} animate={{ scale: 1.1, opacity: 1, y: 0 }} exit={{ scale: 1.3, opacity: 0, y: -20 }} transition={{ duration: 0.4 }}
              className="absolute inset-x-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 50, top: '42%' }}>
              <div style={{ fontWeight: 900, fontSize: 26, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#ffdd00', textShadow: '0 0 24px rgba(255,200,0,1), 3px 3px 0 rgba(0,0,0,0.7)' }}>
                ⚡ CRITICAL HIT! ⚡
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ultimate flash */}
        <AnimatePresence>
          {showUltEffect && (
            <div className="ult-screen-flash absolute inset-0" style={{ zIndex: 40, background: showUltEffect.side === 'player'
              ? 'radial-gradient(ellipse at 20% 70%, rgba(255,200,0,0.7) 0%, rgba(255,100,0,0.3) 50%, transparent 80%)'
              : 'radial-gradient(ellipse at 80% 30%, rgba(255,60,60,0.7) 0%, rgba(180,0,0,0.3) 50%, transparent 80%)' }} />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showUltEffect && (
            <div className="ult-name-popup absolute inset-x-0 flex items-center justify-center" style={{ zIndex: 50, top: '30%', pointerEvents: 'none' }}>
              <div style={{ fontWeight: 900, fontSize: 28, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: showUltEffect.side === 'player' ? '#ff8800' : '#cc2222',
                textShadow: '0 0 20px rgba(255,200,0,0.9), 3px 3px 0 rgba(0,0,0,0.6)' }}>
                ⚡ {showUltEffect.name} ⚡
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* ── OPPONENT STAT BOX ── */}
        <div className="absolute top-3 left-3 z-20" style={{ width: 214 }}>
          <div className="stat-box" style={{ padding: '8px 12px' }}>
            <div className="flex justify-between items-center mb-1">
              <span className="font-black text-sm uppercase tracking-wide" style={{ color: '#222' }}>{opponentBase.name}</span>
              <span className="text-xs font-mono" style={{ color: '#555' }}>{opponentBase.height}m</span>
            </div>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-xs font-bold" style={{ color: '#444', width: 24 }}>HP</span>
              <div className="flex-1 hp-bar-container">
                <motion.div className={`hp-bar-fill ${getHpClass(state.opponent.hp, opponentBase.maxHp)}`}
                  animate={{ width: `${Math.max(0, opponentHpPct * 100)}%` }}
                  transition={{ duration: GAME_TIMING.HP_BAR_ANIMATION / 1000 }} />
              </div>
              <span className="text-xs font-mono ml-1" style={{ color: '#444' }}>{state.opponent.hp}</span>
            </div>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-xs font-bold" style={{ color: '#444', width: 24 }}>ST</span>
              <div className="flex-1 hp-bar-container">
                <motion.div className="stam-bar-fill"
                  animate={{ width: `${Math.max(0, (state.opponent.stamina / opponentBase.maxStamina) * 100)}%` }}
                  transition={{ duration: GAME_TIMING.STAMINA_BAR_ANIMATION / 1000 }} />
              </div>
              <span className="text-xs font-mono ml-1" style={{ color: '#444' }}>{state.opponent.stamina}</span>
            </div>
            <div className="flex gap-1 mt-1 flex-wrap">
              <span className="text-[9px] px-1 rounded font-bold" style={{
                background: opponentFaster ? '#e0ffe0' : playerFaster ? '#ffe8e8' : '#e8f0ff',
                color: opponentFaster ? '#115522' : playerFaster ? '#cc2200' : '#2266cc',
                border: `1px solid ${opponentFaster ? '#88cc88' : playerFaster ? '#ff8888' : '#99b8ee'}`,
              }}>
                {opponentFaster ? '⚡' : playerFaster ? '▼' : ''} SPD {oppSpd}
              </span>
              {pRequiredBites > 1 && (
                <span className="text-[9px] px-1 rounded font-bold" style={{ background: '#fff8e0', color: '#886600', border: '1px solid #ddc050' }}
                  title={`Thick hide — ${pRequiredBites} bites needed`}>
                  HIDE {state.player.biteProgress}/{pRequiredBites}
                </span>
              )}
              {opponentIsDesperate && (
                <span className="text-[9px] px-1 rounded font-bold" style={{ background: '#ffe0e0', color: '#cc0000', border: '1px solid #ff8888' }}>
                  🔥 FURY
                </span>
              )}
              {state.opponent.statusEffects.map((e, i) => (
                <StatusBadge key={i} type={e.type} duration={e.duration} />
              ))}
            </div>
            {state.gameMode === 'hunt' && (
              <div className="mt-1 pt-1" style={{ borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                <span className="text-[8px] font-black uppercase" style={{ color: '#228833' }}>
                  🌿 WILD — {Math.round(opponentHpPct * 100)}% HP
                  {opponentHpPct < 0.30 ? ' — CATCHABLE!' : ''}
                </span>
              </div>
            )}
            {state.gameMode === 'team' && state.opponentTeam.length > 0 && (
              <div className="flex gap-1 mt-1 pt-1" style={{ borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                <span className="text-[8px] font-bold uppercase" style={{ color: '#888', alignSelf: 'center', marginRight: 2 }}>BENCH</span>
                {state.opponentTeam.map(m => (
                  <div key={m.dinoId} className="flex items-center justify-center rounded text-[7px] font-black uppercase"
                    style={{ padding: '1px 4px', background: '#cc2222', color: 'white', border: '1px solid #991111' }}>
                    {m.dinoId.slice(0, 4).toUpperCase()}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── OPPONENT DINO ── */}
        <motion.div key={`opp-${opponentAnim.key}`} className="absolute z-10" style={{ right: '10%', bottom: '25%' }}
          initial={{ x: 80, opacity: 0 }}
          animate={opponentAnim.playing ? buildAnimate(opponentAnim, 'opponent')
            : { x: 0, y: 0, rotate: 0, scale: state.opponent.hp <= 0 ? 0.7 : 1, opacity: 1 }}
          transition={{ duration: opponentAnim.playing ? opponentAnim.config.duration : 0.6, type: opponentAnim.playing ? 'tween' : 'spring', ease: opponentAnim.playing ? 'easeInOut' : undefined, stiffness: opponentAnim.playing ? undefined : 280, damping: opponentAnim.playing ? undefined : 20 }}>
          {showRoar?.side === 'opponent' && (
            <div className="absolute" style={{ top: '20%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 30 }}>
              <div className="roar-ring" /><div className="roar-ring roar-ring-2" /><div className="roar-ring roar-ring-3" />
            </div>
          )}
          {showLightning?.side === 'opponent' && (
            <div className="absolute" style={{ top: '10%', left: '40%', zIndex: 30 }}>
              <div className="lightning" /><div className="lightning lightning-2" /><div className="lightning lightning-3" />
            </div>
          )}
          <DinoSvg dinoId={state.opponent.dinoId} flipped className={oppVisualCls}
            style={{ height: oImgH, width: 'auto', filter: opponentFilter }} />
        </motion.div>

        {/* ── PLAYER DINO ── */}
        <motion.div key={`pl-${playerAnim.key}`} className="absolute z-10" style={{ left: '8%', bottom: '4%' }}
          initial={playerAnim.key === 0 ? { x: -80, opacity: 0 } : false}
          animate={playerAnim.playing ? buildAnimate(playerAnim, 'player')
            : { x: 0, y: 0, rotate: 0, scale: state.player.hp <= 0 ? 0.7 : 1, opacity: 1 }}
          transition={{ duration: playerAnim.playing ? playerAnim.config.duration : 0.6, type: playerAnim.playing ? 'tween' : 'spring', ease: playerAnim.playing ? 'easeInOut' : undefined, stiffness: playerAnim.playing ? undefined : 280, damping: playerAnim.playing ? undefined : 20 }}>
          {showRoar?.side === 'player' && (
            <div className="absolute" style={{ top: '20%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 30 }}>
              <div className="roar-ring" /><div className="roar-ring roar-ring-2" /><div className="roar-ring roar-ring-3" />
            </div>
          )}
          {showLightning?.side === 'player' && (
            <div className="absolute" style={{ top: '10%', left: '40%', zIndex: 30 }}>
              <div className="lightning" /><div className="lightning lightning-2" /><div className="lightning lightning-3" />
            </div>
          )}
          <DinoSvg dinoId={state.player.dinoId} className={playerVisualCls}
            style={{ height: pImgH, width: 'auto', filter: playerFilter }} />
        </motion.div>

        {/* Impact burst */}
        <AnimatePresence>
          {showImpact && (
            <div className="impact-star z-30"
              style={showImpact.side === 'opponent' ? { right: '18%', bottom: '44%' } : { left: '22%', bottom: '34%' }}>
              💥
            </div>
          )}
        </AnimatePresence>

        {/* ── PLAYER STAT BOX ── */}
        <div className="absolute bottom-3 right-3 z-20" style={{ width: 220 }}>
          <div className="stat-box" style={{ padding: '8px 12px' }}>
            <div className="flex justify-between items-center mb-1">
              <span className="font-black text-sm uppercase tracking-wide" style={{ color: '#222' }}>{playerBase.name}</span>
              <span className="text-xs font-mono" style={{ color: '#555' }}>{playerBase.height}m</span>
            </div>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-xs font-bold" style={{ color: '#444', width: 24 }}>HP</span>
              <div className="flex-1 hp-bar-container">
                <motion.div className={`hp-bar-fill ${getHpClass(state.player.hp, playerBase.maxHp)}`}
                  animate={{ width: `${Math.max(0, playerHpPct * 100)}%` }}
                  transition={{ duration: GAME_TIMING.HP_BAR_ANIMATION / 1000 }} />
              </div>
              <span className="text-xs font-mono ml-1" style={{ color: '#444' }}>{state.player.hp}</span>
            </div>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-xs font-bold" style={{ color: '#444', width: 24 }}>ST</span>
              <div className="flex-1 hp-bar-container">
                <motion.div className="stam-bar-fill"
                  animate={{ width: `${Math.max(0, (state.player.stamina / playerBase.maxStamina) * 100)}%` }}
                  transition={{ duration: GAME_TIMING.STAMINA_BAR_ANIMATION / 1000 }} />
              </div>
              <span className="text-xs font-mono ml-1" style={{ color: '#444' }}>{state.player.stamina}</span>
            </div>
            <div className="flex gap-1 mt-1 flex-wrap">
              <span className="text-[9px] px-1 rounded font-bold" style={{
                background: playerFaster ? '#e0ffe0' : opponentFaster ? '#ffe8e8' : '#e8f0ff',
                color: playerFaster ? '#115522' : opponentFaster ? '#cc2200' : '#2266cc',
                border: `1px solid ${playerFaster ? '#88cc88' : opponentFaster ? '#ff8888' : '#99b8ee'}`,
              }}>
                {playerFaster ? '⚡' : opponentFaster ? '▼' : ''} SPD {plSpd}
              </span>
              {oRequiredBites > 1 && (
                <span className="text-[9px] px-1 rounded font-bold" style={{ background: '#fff8e0', color: '#886600', border: '1px solid #ddc050' }}>
                  HIDE {state.opponent.biteProgress}/{oRequiredBites}
                </span>
              )}
              {playerCombo >= 2 && (
                <span className="text-[9px] px-1 rounded font-bold" style={{ background: '#fff0e0', color: '#cc5500', border: '1px solid #ffaa66' }}>
                  🔗 ×{playerCombo}
                </span>
              )}
              {playerIsDesperate && (
                <span className="text-[9px] px-1 rounded font-bold" style={{ background: '#ffe0e0', color: '#cc0000', border: '1px solid #ff8888' }}>
                  🔥 FURY
                </span>
              )}
              {state.player.statusEffects.map((e, i) => (
                <StatusBadge key={i} type={e.type} duration={e.duration} />
              ))}
            </div>
            {state.gameMode === 'team' && state.playerTeam.length > 0 && (
              <div className="flex gap-1 mt-1 pt-1" style={{ borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                <span className="text-[8px] font-bold uppercase" style={{ color: '#888', alignSelf: 'center', marginRight: 2 }}>BENCH</span>
                {state.playerTeam.map(m => (
                  <div key={m.dinoId} className="text-[7px] font-black uppercase rounded"
                    style={{ padding: '1px 4px', background: '#2266cc', color: 'white', border: '1px solid #1144aa' }}>
                    {m.dinoId.slice(0, 4).toUpperCase()}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── TEAM SWITCH OVERLAYS ── */}
        {state.gameMode === 'team' && state.awaitingSwitch === 'player' && (
          <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(2px)' }}>
            <div className="rounded-2xl p-5" style={{ background: '#1a2a3a', border: '3px solid #4488ee', maxWidth: 340, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
              <p className="font-black text-white text-center uppercase mb-1" style={{ fontSize: 15 }}>Fighter Down!</p>
              <p className="text-center mb-4" style={{ color: '#88aacc', fontSize: 11 }}>Choose your next dinosaur</p>
              <div className="flex flex-col gap-2">
                {state.playerTeam.map(member => {
                  const base   = DINOSAURS[member.dinoId];
                  const hpPct  = member.hp / base.maxHp;
                  return (
                    <button key={member.dinoId}
                      onClick={() => dispatch({ type: 'SWITCH_TEAM_MEMBER', attacker: 'player', nextDinoId: member.dinoId })}
                      className="flex items-center gap-3 rounded-xl"
                      style={{ background: '#243445', border: '2px solid #4488ee', padding: '8px 12px', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#2e4460')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#243445')}>
                      <DinoSvg dinoId={member.dinoId} flipped={false} style={{ height: 44, width: 'auto', flexShrink: 0 }} />
                      <div className="text-left flex-1">
                        <p className="font-black text-white text-xs uppercase">{base.name}</p>
                        <div className="mt-1" style={{ height: 4, background: '#1a2a3a', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${hpPct * 100}%`, height: '100%', background: hpPct > 0.5 ? '#44cc66' : hpPct > 0.25 ? '#ccaa22' : '#cc4422', borderRadius: 2 }} />
                        </div>
                        <p className="text-[10px] mt-0.5" style={{ color: '#88aacc' }}>HP {member.hp} / {base.maxHp}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {state.gameMode === 'team' && state.awaitingSwitch === 'opponent' && (
          <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}>
            <div className="rounded-2xl px-8 py-6 text-center" style={{ background: '#2a1a1a', border: '3px solid #cc3322', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
              <p className="font-black text-white uppercase" style={{ fontSize: 16 }}>💀 Fighter Down!</p>
              <p className="mt-2" style={{ color: '#ff9988', fontSize: 12 }}>Opponent sending in next dinosaur…</p>
            </div>
          </div>
        )}

        {/* ── WILD HUNT CAPTURE OVERLAY ── */}
        <AnimatePresence>
          {state.gameMode === 'hunt' && capturePhase !== 'idle' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(2px)' }}>
              {capturePhase === 'throwing' && (
                <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} className="text-center">
                  <motion.div animate={{ rotate: [0, -20, 20, -10, 10, 0], y: [0, -30, 0] }} transition={{ duration: 1.2, repeat: Infinity }}
                    style={{ fontSize: 60 }}>🪤</motion.div>
                  <p style={{ color: 'white', fontSize: 20, fontWeight: 900, letterSpacing: '0.1em', marginTop: 12 }}>THROWING NET…</p>
                </motion.div>
              )}
              {capturePhase === 'success' && (
                <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }} className="text-center">
                  <div style={{ fontSize: 64 }}>🎉</div>
                  <p style={{ color: '#44ff88', fontSize: 24, fontWeight: 900, letterSpacing: '0.1em', marginTop: 8 }}>CAPTURED!</p>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 }}>{opponentBase.name} added to your collection!</p>
                </motion.div>
              )}
              {capturePhase === 'fail' && (
                <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }} className="text-center">
                  <div style={{ fontSize: 64 }}>❌</div>
                  <p style={{ color: '#ff4444', fontSize: 22, fontWeight: 900, letterSpacing: '0.1em', marginTop: 8 }}>NET MISSED!</p>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 }}>{opponentBase.name} breaks free — ENRAGED!</p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Turn counter */}
        <div className="absolute top-3 right-3 z-20">
          <div style={{ background: 'rgba(255,255,255,0.85)', border: '2px solid #888', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: '#444', boxShadow: '2px 2px 0 rgba(0,0,0,0.2)' }}>
            ROUND {state.turnNumber}
          </div>
        </div>
      </div>

      {/* ── TURN INDICATOR BANNER ── */}
      {!state.winner && !state.awaitingSwitch && (
        <div style={{
          padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexShrink: 0,
          background: isPlayerStunned
            ? 'linear-gradient(135deg, #880000, #cc2222)'
            : state.activeTurn === 'player'
            ? 'linear-gradient(135deg, #1144aa, #2266cc)'
            : 'linear-gradient(135deg, #771111, #aa2222)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 900, fontSize: 14, letterSpacing: '0.1em', color: 'white', textTransform: 'uppercase' }}>
              {isPlayerStunned
                ? `⚠️ STUNNED — Skipping in ${stunCountdown ?? '...'}s`
                : state.activeTurn === 'player'
                ? '⚔️ YOUR TURN'
                : '⏳ OPPONENT\'S TURN'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {state.gameMode === 'hunt' && (
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 700 }}>
                🌿 {state.capturedDinos.length}/{state.capturedDinos.length + state.huntRemainingWild.length + 1} caught
              </span>
            )}
            <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: 600 }}>
              {playerFaster ? `⚡ ${playerBase.name.split(' ')[0]} faster` : opponentFaster ? `⚡ ${opponentBase.name.split(' ')[0]} faster` : 'Equal speed'}
            </span>
          </div>
        </div>
      )}

      {/* ── BOTTOM PANEL ── */}
      <div className="flex-1 flex flex-col" style={{ background: '#d0d8e8', borderTop: '3px solid #8899bb' }}>

        {/* Wild Hunt — captured dinos strip */}
        {state.gameMode === 'hunt' && (state.capturedDinos.length > 0 || state.huntRemainingWild.length > 0) && (
          <div className="mx-3 mt-2 flex items-center gap-2 flex-wrap">
            <span style={{ fontSize: 10, fontWeight: 800, color: '#115522', textTransform: 'uppercase', marginRight: 2 }}>Hunt:</span>
            {state.capturedDinos.map(id => (
              <div key={id} style={{ background: '#228833', border: '1px solid #115522', borderRadius: 4, padding: '2px 6px', fontSize: 9, color: 'white', fontWeight: 800 }}>
                ✓ {id === 'velociraptor' ? 'VELOC' : id === 'giganotosaurus' ? 'GIGAN' : id === 'spinosaurus' ? 'SPINO' : id === 'trex' ? 'T-REX' : 'PTERO'}
              </div>
            ))}
            {state.huntRemainingWild.map((id, i) => (
              <div key={id + i} style={{ background: '#666', border: '1px solid #444', borderRadius: 4, padding: '2px 6px', fontSize: 9, color: 'white', fontWeight: 800 }}>? wild</div>
            ))}
          </div>
        )}

        {/* Battle dialog */}
        <div className="mx-3 mt-2 battle-dialog px-5 py-3 flex-shrink-0" style={{ minHeight: 64 }}>
          {state.awaitingSwitch === 'player' ? (
            <p className="font-bold" style={{ color: '#2266cc', fontSize: 14, lineHeight: 1.5 }}>
              ⚔️ Choose your next fighter from the overlay above!
            </p>
          ) : state.awaitingSwitch === 'opponent' ? (
            <p className="font-bold" style={{ color: '#cc5522', fontSize: 14, lineHeight: 1.5 }}>
              ⏳ Opponent is sending in their next fighter…
            </p>
          ) : (
            <p className="font-semibold" style={{ color: '#222', fontSize: 14, lineHeight: 1.55 }}>
              {state.winner
                ? state.gameMode === 'hunt'
                  ? state.winner === 'player'
                    ? `🏆 LEGENDARY HUNTER! All ${state.capturedDinos.length} dinosaurs captured!`
                    : `💀 Defeated! You captured ${state.capturedDinos.length} dinosaur${state.capturedDinos.length !== 1 ? 's' : ''}.`
                  : state.winner === 'player'
                  ? `🏆 ${playerBase.name} wins the arena! Incredible victory!`
                  : `💀 ${opponentBase.name} wins! ${playerBase.name} was defeated...`
                : lastLog || `What will ${playerBase.name} do?`}
            </p>
          )}
        </div>

        {/* Moves panel */}
        {!state.winner ? (
          <div className="flex gap-2 px-3 pb-3 mt-2 flex-1">
            <div className="flex flex-col flex-1 gap-2">

              {/* Wild Hunt: capture button */}
              {canCapture && (
                <motion.button
                  animate={{ scale: [1, 1.03, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  onClick={handleCapture}
                  disabled={!isPlayerTurn}
                  style={{
                    width: '100%', padding: '10px 0',
                    background: isPlayerTurn ? 'linear-gradient(135deg, #118833, #22aa44)' : '#aaa',
                    border: '3px solid #006622', borderRadius: 8,
                    color: 'white', fontWeight: 900, fontSize: 15,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    cursor: isPlayerTurn ? 'pointer' : 'not-allowed',
                    opacity: isPlayerTurn ? 1 : 0.5,
                    boxShadow: isPlayerTurn ? '0 4px 0 #004411, inset 0 1px 0 rgba(255,255,255,0.3)' : 'none',
                  }}>
                  🪤 THROW NET! — {captureChancePct}% chance
                </motion.button>
              )}

              <div className="grid grid-cols-2 gap-2">
                {playerBase.abilities.map(a => {
                  const canAfford   = state.player.stamina >= a.staminaCost;
                  const alreadyUsed = a.isUltimate && state.player.ultimateUsed;
                  const disabled    = !canAfford || playerInputBlocked || alreadyUsed;
                  return (
                    <button
                      key={a.id}
                      disabled={disabled}
                      onClick={() => handleAction(a.id)}
                      title={a.description}
                      className={`move-btn ${a.isUltimate ? '' : `move-${a.type}`} flex flex-col`}
                      style={a.isUltimate ? {
                        background: alreadyUsed ? '#e8e8e8' : 'linear-gradient(135deg, #fff8e0 0%, #ffe580 45%, #ffc820 100%)',
                        border: alreadyUsed ? '2px solid #ccc' : '2px solid #cc8800',
                        boxShadow: alreadyUsed ? 'none' : '2px 2px 0 #aa6600, inset 0 1px 0 rgba(255,255,255,0.5)',
                        borderRadius: 6, padding: '6px 8px',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.45 : 1, textAlign: 'left', transition: 'all 0.08s',
                      } : { opacity: disabled ? 0.35 : 1 }}>
                      <div className="flex justify-between items-center">
                        <span className="font-black text-xs uppercase tracking-wide" style={{ color: a.isUltimate ? '#884400' : '#111' }}>
                          {a.isUltimate && !alreadyUsed && '⚡ '}{a.name}
                        </span>
                        <span className="text-[10px] font-mono" style={{ color: '#777' }}>{a.staminaCost}ST</span>
                      </div>
                      {a.damage && (
                        <span className="text-[10px] mt-0.5" style={{ color: a.isUltimate ? '#cc4400' : '#c02020', fontWeight: 900 }}>
                          PWR {a.damage}{a.isUltimate ? '!' : ''}
                        </span>
                      )}
                      {a.shortEffect && (
                        <span className="text-[9px] mt-0.5 leading-tight" style={{
                          color: a.isUltimate ? '#885500'
                            : a.type === 'debuff' ? '#9933cc'
                            : a.type === 'buff' ? '#116622'
                            : a.shortEffect.includes('bleeding') || a.shortEffect.includes('🩸') ? '#cc0000'
                            : '#555',
                          fontWeight: 600,
                          fontStyle: 'italic',
                        }}>
                          {a.shortEffect}
                        </span>
                      )}
                      {alreadyUsed && (
                        <span className="text-[9px]" style={{ color: '#999', fontStyle: 'italic' }}>Used</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rest + Combo */}
            <div className="flex flex-col gap-2" style={{ width: 90 }}>
              <button
                disabled={playerInputBlocked}
                onClick={handleRest}
                className="move-btn move-utility flex-1 flex flex-col items-center justify-center text-center"
                style={{ borderLeft: '4px solid #aaa', opacity: playerInputBlocked ? 0.35 : 1 }}>
                <span className="font-black text-xs uppercase" style={{ color: '#444' }}>Rest</span>
                <span className="text-[9px] mt-0.5" style={{ color: '#777' }}>+25 ST</span>
                {playerCombo >= 2 && (
                  <span className="text-[8px] mt-1" style={{ color: '#cc5500' }}>resets combo</span>
                )}
              </button>
              {playerCombo >= 2 && (
                <div className="rounded flex flex-col items-center justify-center py-1"
                  style={{ background: 'linear-gradient(135deg, #fff4e0, #ffe0b0)', border: '2px solid #dd8800', boxShadow: '1px 1px 0 #aa6600' }}>
                  <span className="text-[9px] font-black uppercase" style={{ color: '#885500' }}>COMBO</span>
                  <span className="font-black" style={{ color: '#cc4400', fontSize: 18, lineHeight: 1 }}>×{playerCombo}</span>
                  <span className="text-[8px]" style={{ color: '#aa6600' }}>+{Math.min(playerCombo - 1, 3) * 10}% DMG</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center pb-4 px-3 gap-3">
            {state.gameMode === 'hunt' && state.capturedDinos.length > 0 && (
              <div className="w-full rounded-xl p-3" style={{ background: 'linear-gradient(135deg, #e8f8e8, #c8ecc8)', border: '2px solid #44aa55' }}>
                <p className="font-black text-sm uppercase text-center mb-2" style={{ color: '#115522' }}>
                  🌿 Dinosaurs Captured
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {state.capturedDinos.map(id => {
                    const base = DINOSAURS[id];
                    return (
                      <div key={id} className="flex items-center gap-1 rounded-lg px-2 py-1" style={{ background: '#228833', border: '1px solid #115522' }}>
                        <DinoSvg dinoId={id} flipped={false} style={{ height: 24, width: 'auto' }} />
                        <span className="text-[9px] font-black uppercase text-white">{base.name.split(' ')[0]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <button
              onClick={() => dispatch({ type: 'RESET' })}
              className="move-btn"
              style={{ padding: '12px 32px', fontSize: 14, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', borderLeft: '4px solid #2266cc' }}>
              {state.gameMode === 'hunt' ? '🌿 Hunt Again' : 'Return to Roster'}
            </button>
          </div>
        )}
      </div>

      {/* ── VICTORY OVERLAY ── */}
      <AnimatePresence>
        {state.winner && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
            style={{ background: 'rgba(0,0,0,0.45)' }}>
            <motion.div initial={{ scale: 0.7, y: -20 }} animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              className="stat-box px-10 py-6 text-center" style={{ pointerEvents: 'auto', maxWidth: 340 }}>
              <p className="text-4xl font-black uppercase tracking-widest mb-1"
                style={{ color: state.winner === 'player' ? '#2266cc' : '#cc2222' }}>
                {state.gameMode === 'hunt' && state.winner === 'opponent' ? '💀 Overwhelmed!' : state.winner === 'player' ? '🏆 Victory!' : '💀 Defeated!'}
              </p>
              {state.gameMode === 'hunt' ? (
                <p className="text-base font-semibold mb-4" style={{ color: '#555' }}>
                  {state.winner === 'opponent'
                    ? 'The dinosaur was too powerful — return to the world and try again!'
                    : `${state.capturedDinos.length} dinosaur${state.capturedDinos.length !== 1 ? 's' : ''} captured`}
                </p>
              ) : (
                <p className="text-base font-semibold mb-4" style={{ color: '#555' }}>
                  {state.winner === 'player' ? playerBase.name : opponentBase.name} wins
                </p>
              )}
              <div className="flex gap-2 justify-center flex-wrap">
                {state.gameMode === 'hunt' && state.winner === 'opponent' && (
                  <button onClick={() => dispatch({ type: 'RETURN_TO_EXPLORE' })} className="move-btn"
                    style={{ padding: '10px 20px', fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', borderLeft: '4px solid #228833', background: 'linear-gradient(135deg, #e8f8e8, #d0ecd0)' }}>
                    🌿 Return to World
                  </button>
                )}
                <button onClick={() => dispatch({ type: 'RESET' })} className="move-btn"
                  style={{ padding: '10px 20px', fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', borderLeft: '4px solid #2266cc' }}>
                  {state.gameMode === 'hunt' && state.winner === 'opponent' ? 'Give Up' : 'Play Again'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getHpClass(hp: number, maxHp: number) {
  const pct = hp / maxHp;
  if (pct > 0.5) return 'hp-bar-green';
  if (pct > 0.2) return 'hp-bar-yellow';
  return 'hp-bar-red';
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  stunned:     { bg: '#ffe0e0', text: '#cc2222', border: '#ffaaaa' },
  intimidated: { bg: '#fff0d8', text: '#cc6600', border: '#ffcc88' },
  evade:       { bg: '#e0ffe0', text: '#228822', border: '#88dd88' },
  blinded:     { bg: '#e8e0f8', text: '#662299', border: '#cc99ee' },
  slowed:      { bg: '#e0f0ff', text: '#226699', border: '#88bbee' },
  bleeding:    { bg: '#ffe8e8', text: '#aa0000', border: '#ff6666' },
  enraged:     { bg: '#ffe0cc', text: '#bb2200', border: '#ff8844' },
};

function StatusBadge({ type, duration }: { type: string; duration: number }) {
  const tooltip = STATUS_TOOLTIPS[type] ?? type;
  const colors  = STATUS_COLORS[type] ?? { bg: '#ffe0e0', text: '#cc2222', border: '#ffaaaa' };
  const label   = type === 'bleeding' ? '🩸 BLEED' : type === 'enraged' ? '🔥 ENRAGED' : type.toUpperCase();
  return (
    <span className="text-[9px] px-1 rounded font-bold cursor-help"
      style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
      title={`${tooltip} (${duration} turn${duration !== 1 ? 's' : ''} remaining)`}>
      {label}
    </span>
  );
}
