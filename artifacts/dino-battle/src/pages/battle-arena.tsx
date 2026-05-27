import { useContext, useEffect, useState, useRef } from 'react';
import { GameContext } from '@/App';
import { DINOSAURS, STATUS_TOOLTIPS } from '@/lib/dino-data';
import { getRequiredBites } from '@/lib/game-engine';
import { DinoSvg } from '@/components/dino-svg';
import { MoveEffect } from '@/components/move-effects';
import { motion, AnimatePresence } from 'framer-motion';
import arenaBg from '../assets/arena-bg.png';

// ── Per-ability animation configs ───────────────────────────────────────────
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
  // ── Velociraptor Pack ──  (positive x = lunge toward opponent)
  sickle_claw:     { target: 'opponent', duration: 0.40, showImpact: true,
    keyframes: { x:[0,72,24,0], y:[0,-18,8,0], rotate:[0,-22,6,0], scale:[1,1.07,1,1] } },
  pack_feint:      { target: 'self', duration: 0.55,
    keyframes: { x:[0,-28,14,-8,0], y:[0,-12,6,0], rotate:[0,12,-5,0], scale:[1,1.12,0.93,1] } },
  leap_strike:     { target: 'opponent', duration: 0.56, showImpact: true,
    keyframes: { x:[0,90,34,0], y:[0,-70,-8,0], rotate:[0,-30,10,0], scale:[1,1.15,1,1] } },
  bite_raptor:     { target: 'opponent', duration: 0.42, showImpact: true,
    keyframes: { x:[0,62,0], y:[0,-6,0], rotate:[0,-15,0], scale:[1,1.07,1] } },
  frenzy_blitz:    { target: 'opponent', duration: 0.80, isUltimate: true, showImpact: true, showLightning: true,
    keyframes: { x:[0,70,26,80,34,0], y:[0,-24,10,-18,5,0], rotate:[0,-24,10,-16,8,0], scale:[1,1.24,1,1.20,1,1] } },

  // ── Giganotosaurus ──  (positive x = lunge toward opponent)
  crushing_bite:   { target: 'opponent', duration: 0.52, showImpact: true,
    keyframes: { x:[0,90,28,0], y:[0,10,-2,0], rotate:[0,-16,5,0], scale:[1.08,1.20,1,1] } },
  body_slam:       { target: 'opponent', duration: 0.58, showImpact: true,
    keyframes: { x:[0,82,26,0], y:[0,24,6,0], rotate:[0,-10,3,0], scale:[1.05,1.24,1,1] } },
  tail_sweep_giga: { target: 'opponent', duration: 0.55, showImpact: true,
    keyframes: { x:[0,-14,38,0], y:[0,5,0,0], rotate:[0,-44,10,0], scale:[1,1.07,1,1] } },
  roar:            { target: 'self', duration: 0.65, showRoarRings: true,
    keyframes: { scale:[1,1.40,1.18,1.28,1], y:[0,-10,4,-6,0], rotate:[0,-6,3,-2,0] } },
  apex_domination: { target: 'opponent', duration: 0.88, isUltimate: true, showImpact: true, showLightning: true,
    keyframes: { x:[0,100,34,0], y:[0,34,-5,0], rotate:[0,-24,5,0], scale:[1.15,1.34,1.05,1] } },

  // ── Spinosaurus ──  (positive x = lunge toward opponent)
  sail_slam:       { target: 'opponent', duration: 0.48, showImpact: true,
    keyframes: { x:[0,64,20,0], y:[0,-30,12,0], rotate:[0,-20,5,0], scale:[1,1.11,1,1] } },
  tail_whip:       { target: 'opponent', duration: 0.52, showImpact: true,
    keyframes: { x:[0,-16,40,0], y:[0,5,-2,0], rotate:[0,-44,8,0], scale:[1,1.07,1,1] } },
  ambush_strike:   { target: 'opponent', duration: 0.48, showImpact: true,
    keyframes: { x:[0,92,26,0], y:[0,6,0,0], rotate:[0,-14,3,0], scale:[1.10,1.14,1,1] } },
  bite_spino:      { target: 'opponent', duration: 0.46, showImpact: true,
    keyframes: { x:[0,64,18,0], y:[0,10,0,0], rotate:[0,-12,3,0], scale:[1,1.09,1,1] } },
  death_roll:      { target: 'opponent', duration: 0.88, isUltimate: true, showImpact: true, showLightning: true,
    keyframes: { x:[0,70,88,44,0], y:[0,16,-5,22,0], rotate:[0,180,270,360,360], scale:[1.10,1.24,1.10,1,1] } },

  // ── T-Rex ──  (positive x = lunge toward opponent)
  rex_bite:        { target: 'opponent', duration: 0.52, showImpact: true,
    keyframes: { x:[0,98,30,0], y:[0,12,0,0], rotate:[0,-18,4,0], scale:[1.12,1.26,1,1] } },
  stomp:           { target: 'opponent', duration: 0.52, showImpact: true,
    keyframes: { x:[0,70,0], y:[0,40,-5,0], rotate:[0,-10,0], scale:[1,1.22,1] } },
  headbutt:        { target: 'opponent', duration: 0.48, showImpact: true,
    keyframes: { x:[0,90,28,0], y:[0,-12,6,0], rotate:[0,-25,5,0], scale:[1.06,1.20,1,1] } },
  rex_roar:        { target: 'self', duration: 0.75, showRoarRings: true,
    keyframes: { scale:[1,1.50,1.24,1.38,1], y:[0,-14,6,-9,0], rotate:[0,-9,4,-4,0] } },
  tyrants_wrath:   { target: 'opponent', duration: 0.92, isUltimate: true, showImpact: true, showLightning: true,
    keyframes: { x:[0,112,44,0], y:[0,16,-3,0], rotate:[0,-30,6,0], scale:[1.22,1.44,1.12,1] } },

  // ── Pterodactyl Flock ──  (positive x = dive toward opponent)
  talon_rake:      { target: 'opponent', duration: 0.40, showImpact: true,
    keyframes: { x:[0,82,26,0], y:[0,-30,12,0], rotate:[0,-30,8,0], scale:[1,1.11,1,1] } },
  aerial_dodge:    { target: 'self', duration: 0.55,
    keyframes: { x:[0,-18,12,-6,0], y:[0,-42,-10,0], rotate:[0,-20,6,0], scale:[1,0.86,1,1] } },
  beak_stab:       { target: 'opponent', duration: 0.38, showImpact: true,
    keyframes: { x:[0,94,18,0], y:[0,-12,6,0], rotate:[0,-40,12,0], scale:[1,1.09,1,1] } },
  screech:         { target: 'self', duration: 0.60, showRoarRings: true,
    keyframes: { scale:[1,1.30,1.12,1.20,1], x:[0,-6,5,-3,0], y:[0,-10,5,-4,0] } },
  screech_dive:    { target: 'opponent', duration: 0.80, isUltimate: true, showImpact: true, showLightning: true,
    keyframes: { x:[0,100,36,0], y:[0,-75,28,0], rotate:[0,-46,16,0], scale:[1,1.20,1.06,1] } },
};

const DEFAULT_ANIM: AnimConfig = {
  target: 'opponent', duration: 0.5, showImpact: false,
  keyframes: { x:[0,40,0], y:[0,0,0], rotate:[0,0,0], scale:[1,1,1] },
};

// ─────────────────────────────────────────────────────────────────────────────

interface AnimState {
  playing: boolean;
  config: AnimConfig;
  key: number;
  isUltimate: boolean;
}

const IDLE: AnimState = { playing: false, config: DEFAULT_ANIM, key: 0, isUltimate: false };

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
  const arenaRef = useRef<HTMLDivElement>(null);
  const triggerAICallbackRef = useRef<() => void>(() => {});

  const logLength = ctx?.state.log.length ?? 0;
  useEffect(() => {
    const log = ctx?.state.log ?? [];
    if (log.length > 0) setLastLog(log[log.length - 1]);
  }, [logLength]);

  // Auto-skip player turn when stunned, then trigger AI
  const isStunnedEarly = !!(ctx?.state?.player?.statusEffects.some(e => e.type === 'stunned'));
  const hasWinnerEarly = !!ctx?.state?.winner;
  useEffect(() => {
    if (isStunnedEarly && !hasWinnerEarly) {
      const timer = setTimeout(() => {
        ctx?.dispatch({ type: 'REST', attacker: 'player' });
        setTimeout(() => triggerAICallbackRef.current(), 400);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isStunnedEarly, hasWinnerEarly]);

  if (!ctx || !ctx.state.player || !ctx.state.opponent) return null;

  const { state: rawState, dispatch } = ctx;
  // player & opponent are guaranteed non-null — guarded by early return above
  const state = rawState as Omit<typeof rawState, 'player' | 'opponent'> & {
    player: NonNullable<typeof rawState.player>;
    opponent: NonNullable<typeof rawState.opponent>;
  };
  const playerBase   = DINOSAURS[state.player.dinoId];
  const opponentBase = DINOSAURS[state.opponent.dinoId];

  const fireAnimation = (
    abilityId: string,
    attacker: 'player' | 'opponent',
    abilityName: string,
  ) => {
    const cfg = ABILITY_ANIMS[abilityId] ?? DEFAULT_ANIM;
    const isUlt = !!cfg.isUltimate;
    const hitDelay = Math.round(cfg.duration * 0.55 * 1000);

    setActiveMoveEffect({ abilityId, side: attacker });

    if (attacker === 'player') {
      setPlayerAnim(prev => ({ playing: true, config: cfg, key: prev.key + 1, isUltimate: isUlt }));
      setTimeout(() => setPlayerAnim(IDLE), Math.round(cfg.duration * 1000) + 100);
    } else {
      setOpponentAnim(prev => ({ playing: true, config: cfg, key: prev.key + 1, isUltimate: isUlt }));
      setTimeout(() => setOpponentAnim(IDLE), Math.round(cfg.duration * 1000) + 100);
    }

    if (isUlt) {
      setArenaShake(true);
      setTimeout(() => setArenaShake(false), 600);
      setShowUltEffect({ side: attacker, name: abilityName });
      setTimeout(() => setShowUltEffect(null), 1200);
    }

    if (cfg.showRoarRings) {
      setShowRoar({ side: attacker });
      setTimeout(() => setShowRoar(null), 700);
    }

    if (cfg.showImpact) {
      setTimeout(() => {
        const hitSide: 'player' | 'opponent' = attacker === 'player' ? 'opponent' : 'player';
        setShowImpact({ side: hitSide });
        setTimeout(() => setShowImpact(null), 550);

        if (isUlt) {
          setShowLightning({ side: hitSide });
          setTimeout(() => setShowLightning(null), 500);
          setHitOpponent(attacker === 'player' ? 'ultimate' : null);
          setHitPlayer(attacker === 'opponent' ? 'ultimate' : null);
          setTimeout(() => { setHitOpponent(null); setHitPlayer(null); }, 750);
        } else {
          if (attacker === 'player') {
            setHitOpponent('normal');
            setTimeout(() => setHitOpponent(null), 460);
          } else {
            setHitPlayer('normal');
            setTimeout(() => setHitPlayer(null), 460);
          }
        }
      }, hitDelay);
    }
  };

  const triggerAI = () => {
    setTimeout(() => {
      if (!ctx.state.winner) {
        const aiState    = ctx.state.opponent!;
        const aiBase     = DINOSAURS[aiState.dinoId];
        const plState    = ctx.state.player!;
        const plBase     = DINOSAURS[plState.dinoId];

        // Stunned — skip turn
        if (aiState.statusEffects.some(e => e.type === 'stunned')) {
          dispatch({ type: 'REST', attacker: 'opponent' });
          return;
        }

        const aiHpPct  = aiState.hp / aiBase.maxHp;
        const plHpPct  = plState.hp / plBase.maxHp;
        const aiStamPct = aiState.stamina / aiBase.maxStamina;

        // Rest if critically low on stamina and not in immediate danger
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

        // Score each ability with context-aware heuristics
        const scoreAbility = (a: typeof validAbilities[number]): number => {
          let s = 0;

          // Base: attack damage value
          if (a.type === 'attack' && a.damage) {
            s += a.damage * 1.5;
            // Going for the finish — massive bonus if this can KO
            if (a.damage >= plState.hp) s += 200;
            // Press the advantage when player is low
            if (plHpPct < 0.3) s += 40;
          }

          // Stamina efficiency
          if (a.damage && a.staminaCost > 0) {
            s += (a.damage / a.staminaCost) * 4;
          }

          // Debuffs — only useful if target doesn't already have that effect
          if (a.id === 'roar' || a.id === 'rex_roar') {
            const already = plState.statusEffects.some(e => e.type === 'intimidated' || e.type === 'stunned');
            s += already ? -30 : (aiHpPct > 0.6 ? 50 : 20); // use early when healthy
          }
          if (a.id === 'screech') {
            const already = plState.statusEffects.some(e => e.type === 'blinded');
            s += already ? -30 : 38;
          }
          if (a.id === 'tail_sweep_giga' || a.id === 'stomp') {
            const already = plState.statusEffects.some(e => e.type === 'slowed');
            s += already ? -5 : 18; // still has damage so never fully penalise
          }
          if (a.id === 'body_slam' || a.id === 'rex_roar') {
            const already = plState.statusEffects.some(e => e.type === 'stunned');
            s += already ? -40 : 45;
            // Anti-chain-stun: heavily penalise re-stunning after the player was JUST stunned
            // (covers the auto-skip cycle where stun wears off before AI's next pick)
            const recentLog = state.log.slice(-5).join('|').toLowerCase();
            if (recentLog.includes('stunned') || recentLog.includes('loses their next')) s -= 180;
          }

          // Buff/dodge — prioritise when low HP
          if (a.type === 'buff') {
            const alreadyEvasive = aiState.statusEffects.some(e => e.type === 'evade');
            if (alreadyEvasive) s -= 50;
            else s += aiHpPct < 0.35 ? 55 : (aiHpPct < 0.55 ? 25 : 5);
          }

          // Ultimate — calculated strike, not a panic button
          if (a.isUltimate) {
            if (a.damage && a.damage >= plState.hp) s += 250; // guaranteed KO
            else if (plHpPct < 0.45) s += 70;                 // player is vulnerable
            else if (aiHpPct < 0.22) s += 90;                 // desperate last stand
            else s -= 70;                                       // strongly hold back — save for the right moment
            // Never open a fight with the ultimate
            if (state.turnNumber <= 2) s -= 120;
          }

          // Slight random noise so AI isn't perfectly predictable
          s += (Math.random() - 0.5) * 12;

          return s;
        };

        const scored = validAbilities
          .map(a => ({ a, s: scoreAbility(a) }))
          .sort((x, y) => y.s - x.s);

        // Weighted random among top 3 so AI isn't always perfectly optimal
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
    }, 1000);
  };

  // Keep ref pointing at the latest triggerAI so effects can call it without stale closures
  triggerAICallbackRef.current = triggerAI;

  const handleAction = (abilityId: string) => {
    if (!state.player) return;
    const ability = playerBase.abilities.find(a => a.id === abilityId);
    if (!ability) return;
    if (ability.isUltimate && state.player.ultimateUsed) return;
    fireAnimation(abilityId, 'player', ability.name);
    dispatch({ type: 'USE_ABILITY', abilityId, attacker: 'player' });
    triggerAI();
  };

  const handleRest = () => {
    dispatch({ type: 'REST', attacker: 'player' });
    triggerAI();
  };

  const pRequiredBites = getRequiredBites(state.player.dinoId, state.opponent.dinoId);
  const oRequiredBites = getRequiredBites(state.opponent.dinoId, state.player.dinoId);

  const maxH   = 4.0;
  const oImgH  = Math.round((opponentBase.height / maxH) * 100 + 40);
  const pImgH  = Math.round((playerBase.height / maxH) * 130 + 55);

  const isPlayerStunned = state.player.statusEffects.some(e => e.type === 'stunned');
  const playerBlocked   = !!state.winner || isPlayerStunned;

  // Build framer-motion animate object from keyframes
  const buildAnimate = (anim: AnimState, side: 'player' | 'opponent') => {
    if (!anim.playing) {
      return { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 };
    }
    const kf = anim.config.keyframes;
    // Flip x direction for player (moves right) vs opponent (moves left)
    const xDir = side === 'player' ? 1 : -1;
    return {
      x: kf.x ? kf.x.map((v: number) => v * xDir) : [0, 0],
      y: kf.y ?? [0, 0],
      rotate: kf.rotate ? kf.rotate.map((v: number) => v * (side === 'player' ? 1 : -1)) : [0, 0],
      scale: kf.scale ?? [1, 1],
      opacity: 1,
    };
  };

  const playerCss = hitPlayer === 'ultimate'
    ? 'dino-ult-hit'
    : hitPlayer === 'normal'
    ? 'dino-hit-player'
    : playerAnim.isUltimate && playerAnim.playing
    ? 'dino-ult-player'
    : '';

  const opponentCss = hitOpponent === 'ultimate'
    ? 'dino-ult-hit'
    : hitOpponent === 'normal'
    ? 'dino-hit-opponent'
    : opponentAnim.isUltimate && opponentAnim.playing
    ? 'dino-ult-opponent'
    : '';

  // HP-ratio for visual effects
  const playerHpPct   = state.player.hp   / playerBase.maxHp;
  const opponentHpPct = state.opponent.hp / opponentBase.maxHp;

  // Final CSS class: hit/ult animations take priority; else breathe or critical pulse
  const playerVisualCls = state.player.hp <= 0   ? '' : playerCss   || (playerHpPct   < 0.25 ? 'dino-critical' : 'dino-breathe');
  const oppVisualCls    = state.opponent.hp <= 0  ? '' : opponentCss || (opponentHpPct < 0.25 ? 'dino-critical' : 'dino-breathe');

  // Drop-shadow for healthy dinos; greyscale when fainted
  const playerFilter   = state.player.hp   <= 0 ? 'grayscale(0.6) brightness(0.6)' : 'drop-shadow(3px 8px 14px rgba(0,0,0,0.6))';
  const opponentFilter = state.opponent.hp  <= 0 ? 'grayscale(0.6) brightness(0.6)' : 'drop-shadow(3px 8px 14px rgba(0,0,0,0.6))';

  return (
    <div className="flex-1 flex flex-col" style={{ minHeight: '100vh', background: '#c8d8e8', userSelect: 'none' }}>

      {/* ── BATTLE FIELD ── */}
      <div
        ref={arenaRef}
        className={`relative overflow-hidden flex-shrink-0 ${arenaShake ? 'arena-shake' : ''}`}
        style={{ height: '54vh' }}
      >
        <img src={arenaBg} alt="arena" className="absolute inset-0 w-full h-full object-cover object-center" draggable={false} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(5,8,20,0.35) 0%, transparent 40%, rgba(15,8,4,0.5) 82%)' }} />

        {activeMoveEffect && (
          <MoveEffect
            abilityId={activeMoveEffect.abilityId}
            side={activeMoveEffect.side}
            onComplete={() => setActiveMoveEffect(null)}
          />
        )}

        {/* ── Ultimate screen flash ── */}
        <AnimatePresence>
          {showUltEffect && (
            <div
              className="ult-screen-flash absolute inset-0 z-40"
              style={{
                background: showUltEffect.side === 'player'
                  ? 'radial-gradient(ellipse at 20% 70%, rgba(255,200,0,0.7) 0%, rgba(255,100,0,0.3) 50%, transparent 80%)'
                  : 'radial-gradient(ellipse at 80% 30%, rgba(255,60,60,0.7) 0%, rgba(180,0,0,0.3) 50%, transparent 80%)',
              }}
            />
          )}
        </AnimatePresence>

        {/* ── Ultimate name popup ── */}
        <AnimatePresence>
          {showUltEffect && (
            <div className="ult-name-popup absolute z-50 inset-x-0 flex items-center justify-center"
              style={{ top: '30%', pointerEvents: 'none' }}>
              <div style={{
                fontWeight: 900, fontSize: 28, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: showUltEffect.side === 'player' ? '#ff8800' : '#cc2222',
                textShadow: '0 0 20px rgba(255,200,0,0.9), 3px 3px 0 rgba(0,0,0,0.6)',
                WebkitTextStroke: '1px rgba(0,0,0,0.4)',
              }}>
                ⚡ {showUltEffect.name} ⚡
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* ── OPPONENT STAT BOX ── */}
        <div className="absolute top-3 left-3 z-20" style={{ width: 210 }}>
          <div className="stat-box" style={{ padding: '8px 12px' }}>
            <div className="flex justify-between items-center mb-1">
              <span className="font-black text-sm uppercase tracking-wide" style={{ color: '#222' }}>{opponentBase.name}</span>
              <span className="text-xs font-mono" style={{ color: '#555' }}>{opponentBase.height}m</span>
            </div>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-xs font-bold" style={{ color: '#444', width: 24 }}>HP</span>
              <div className="flex-1 hp-bar-container">
                <div className={`hp-bar-fill ${getHpClass(state.opponent.hp, opponentBase.maxHp)}`}
                  style={{ width: `${Math.max(0, (state.opponent.hp / opponentBase.maxHp) * 100)}%` }} />
              </div>
              <span className="text-xs font-mono ml-1" style={{ color: '#444' }}>{state.opponent.hp}</span>
            </div>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-xs font-bold" style={{ color: '#444', width: 24 }}>ST</span>
              <div className="flex-1 hp-bar-container">
                <div className="stam-bar-fill" style={{ width: `${Math.max(0, (state.opponent.stamina / opponentBase.maxStamina) * 100)}%` }} />
              </div>
              <span className="text-xs font-mono ml-1" style={{ color: '#444' }}>{state.opponent.stamina}</span>
            </div>
            <div className="flex gap-1 mt-1 flex-wrap">
              <span className="text-[9px] px-1 rounded font-bold" style={{ background: '#e8f0ff', color: '#2266cc', border: '1px solid #99b8ee' }}>
                SPD {state.opponent.statusEffects.some(e => e.type === 'slowed') ? Math.floor(opponentBase.baseSpeed / 2) : opponentBase.baseSpeed}
              </span>
              {pRequiredBites > 1 && (
                <span className="text-[9px] px-1 rounded font-bold" style={{ background: '#fff8e0', color: '#886600', border: '1px solid #ddc050' }}
                  title={`Thick hide! ${pRequiredBites} bites needed to penetrate`}>
                  HIDE {state.player.biteProgress}/{pRequiredBites}
                </span>
              )}
              {state.opponent.statusEffects.map((e, i) => (
                <StatusBadge key={i} type={e.type} duration={e.duration} />
              ))}
            </div>
          </div>
        </div>

        {/* ── OPPONENT PLATFORM ── */}
        <div className="absolute" style={{ right: '4%', bottom: '28%', width: 230, pointerEvents: 'none', zIndex: 8 }}>
          <div style={{ position: 'relative', height: 22, borderRadius: '50%',
            background: 'linear-gradient(180deg, #7ed444 0%, #50a022 50%, #306410 100%)',
            boxShadow: '0 6px 22px rgba(0,0,0,0.65), 0 -1px 0 rgba(255,255,255,0.18) inset' }}>
            <div style={{ position:'absolute', top:4, left:'14%', width:'33%', height:4, borderRadius:3, background:'rgba(255,255,255,0.22)' }} />
          </div>
          <div style={{ height: 14, marginTop: -3, background: 'linear-gradient(180deg, #7a5520 0%, #3a2508 100%)', borderRadius:'0 0 50% 50%', boxShadow:'0 6px 14px rgba(0,0,0,0.55)' }}/>
          <div style={{ height:10, marginTop:2, borderRadius:'50%', background:'radial-gradient(ellipse 85% 50% at 50% 30%, rgba(0,0,0,0.50) 0%, transparent 100%)' }}/>
        </div>

        {/* ── OPPONENT DINO ── */}
        <motion.div
          key={`opp-${opponentAnim.key}`}
          className="absolute z-10"
          style={{ right: '10%', bottom: 'calc(28% + 22px)' }}
          initial={{ x: 80, opacity: 0 }}
          animate={opponentAnim.playing
            ? buildAnimate(opponentAnim, 'opponent')
            : { x: 0, y: 0, rotate: 0, scale: state.opponent.hp <= 0 ? 0.7 : 1, opacity: 1 }}
          transition={{
            duration: opponentAnim.playing ? opponentAnim.config.duration : 0.35,
            type: opponentAnim.playing ? 'tween' : 'spring',
            ease: opponentAnim.playing ? 'easeInOut' : undefined,
            stiffness: opponentAnim.playing ? undefined : 280,
            damping: opponentAnim.playing ? undefined : 20,
          }}
        >
          {/* Roar rings */}
          {showRoar?.side === 'opponent' && (
            <div className="absolute" style={{ top: '20%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 30 }}>
              <div className="roar-ring" /><div className="roar-ring roar-ring-2" /><div className="roar-ring roar-ring-3" />
            </div>
          )}
          {/* Lightning */}
          {showLightning?.side === 'opponent' && (
            <div className="absolute" style={{ top: '10%', left: '40%', zIndex: 30 }}>
              <div className="lightning" /><div className="lightning lightning-2" /><div className="lightning lightning-3" />
            </div>
          )}
          <DinoSvg
            dinoId={state.opponent.dinoId}
            flipped
            className={oppVisualCls}
            style={{ height: oImgH, width: 'auto', filter: opponentFilter }}
          />
        </motion.div>

        {/* ── PLAYER PLATFORM ── */}
        <div className="absolute" style={{ left: '3%', bottom: '4%', width: 282, pointerEvents: 'none', zIndex: 8 }}>
          <div style={{ position: 'relative', height: 26, borderRadius: '50%',
            background: 'linear-gradient(180deg, #86dc4a 0%, #56ac26 50%, #347214 100%)',
            boxShadow: '0 6px 24px rgba(0,0,0,0.68), 0 -1px 0 rgba(255,255,255,0.20) inset' }}>
            <div style={{ position:'absolute', top:5, left:'12%', width:'36%', height:5, borderRadius:3, background:'rgba(255,255,255,0.24)' }} />
          </div>
          <div style={{ height: 16, marginTop: -3, background: 'linear-gradient(180deg, #855e28 0%, #3e2a0a 100%)', borderRadius:'0 0 50% 50%', boxShadow:'0 6px 16px rgba(0,0,0,0.58)' }}/>
          <div style={{ height:12, marginTop:2, borderRadius:'50%', background:'radial-gradient(ellipse 88% 52% at 50% 30%, rgba(0,0,0,0.52) 0%, transparent 100%)' }}/>
        </div>

        {/* ── PLAYER DINO ── */}
        <motion.div
          key={`pl-${playerAnim.key}`}
          className="absolute z-10"
          style={{ left: '8%', bottom: 'calc(4% + 28px)' }}
          initial={playerAnim.key === 0 ? { x: -80, opacity: 0 } : false}
          animate={playerAnim.playing
            ? buildAnimate(playerAnim, 'player')
            : { x: 0, y: 0, rotate: 0, scale: state.player.hp <= 0 ? 0.7 : 1, opacity: 1 }}
          transition={{
            duration: playerAnim.playing ? playerAnim.config.duration : 0.35,
            type: playerAnim.playing ? 'tween' : 'spring',
            ease: playerAnim.playing ? 'easeInOut' : undefined,
            stiffness: playerAnim.playing ? undefined : 280,
            damping: playerAnim.playing ? undefined : 20,
          }}
        >
          {/* Roar rings */}
          {showRoar?.side === 'player' && (
            <div className="absolute" style={{ top: '20%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 30 }}>
              <div className="roar-ring" /><div className="roar-ring roar-ring-2" /><div className="roar-ring roar-ring-3" />
            </div>
          )}
          {/* Lightning */}
          {showLightning?.side === 'player' && (
            <div className="absolute" style={{ top: '10%', left: '40%', zIndex: 30 }}>
              <div className="lightning" /><div className="lightning lightning-2" /><div className="lightning lightning-3" />
            </div>
          )}
          <DinoSvg
            dinoId={state.player.dinoId}
            className={playerVisualCls}
            style={{ height: pImgH, width: 'auto', filter: playerFilter }}
          />
        </motion.div>

        {/* ── Impact star burst ── */}
        <AnimatePresence>
          {showImpact && (
            <div
              className="impact-star z-30"
              style={showImpact.side === 'opponent'
                ? { right: '18%', bottom: '44%' }
                : { left: '22%', bottom: '34%' }}
            >
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
                <div className={`hp-bar-fill ${getHpClass(state.player.hp, playerBase.maxHp)}`}
                  style={{ width: `${Math.max(0, (state.player.hp / playerBase.maxHp) * 100)}%` }} />
              </div>
              <span className="text-xs font-mono ml-1" style={{ color: '#444' }}>{state.player.hp}</span>
            </div>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-xs font-bold" style={{ color: '#444', width: 24 }}>ST</span>
              <div className="flex-1 hp-bar-container">
                <div className="stam-bar-fill" style={{ width: `${Math.max(0, (state.player.stamina / playerBase.maxStamina) * 100)}%` }} />
              </div>
              <span className="text-xs font-mono ml-1" style={{ color: '#444' }}>{state.player.stamina}</span>
            </div>
            <div className="flex gap-1 mt-1 flex-wrap">
              <span className="text-[9px] px-1 rounded font-bold" style={{ background: '#e8f0ff', color: '#2266cc', border: '1px solid #99b8ee' }}>
                SPD {state.player.statusEffects.some(e => e.type === 'slowed') ? Math.floor(playerBase.baseSpeed / 2) : playerBase.baseSpeed}
              </span>
              {oRequiredBites > 1 && (
                <span className="text-[9px] px-1 rounded font-bold" style={{ background: '#fff8e0', color: '#886600', border: '1px solid #ddc050' }}
                  title={`Thick hide! ${oRequiredBites} bites needed to penetrate`}>
                  HIDE {state.opponent.biteProgress}/{oRequiredBites}
                </span>
              )}
              {state.player.statusEffects.map((e, i) => (
                <StatusBadge key={i} type={e.type} duration={e.duration} />
              ))}
            </div>
          </div>
        </div>

        {/* Turn counter */}
        <div className="absolute top-3 right-3 z-20">
          <div style={{ background: 'rgba(255,255,255,0.85)', border: '2px solid #888', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: '#444', boxShadow: '2px 2px 0 #bbb' }}>
            TURN {state.turnNumber}
          </div>
        </div>
      </div>

      {/* ── BOTTOM PANEL ── */}
      <div className="flex-1 flex flex-col" style={{ background: '#d0d8e8', borderTop: '3px solid #8899bb' }}>

        {/* Battle dialog */}
        <div className="mx-3 mt-2 battle-dialog px-5 py-3 flex-shrink-0" style={{ minHeight: 72 }}>
          {isPlayerStunned && !state.winner ? (
            <p className="font-bold" style={{ color: '#cc2222', fontSize: 15, lineHeight: 1.5 }}>
              ⚠️ {playerBase.name} is stunned and cannot act this turn!
            </p>
          ) : (
            <p className="font-semibold" style={{ color: '#222', fontSize: 15, lineHeight: 1.55 }}>
              {state.winner
                ? (state.winner === 'player'
                  ? `🏆 ${playerBase.name} wins the arena! Incredible victory!`
                  : `💀 ${opponentBase.name} wins! ${playerBase.name} was defeated...`)
                : (lastLog || `What will ${playerBase.name} do?`)}
            </p>
          )}
        </div>

        {/* Moves panel */}
        {!state.winner ? (
          <div className="flex gap-2 px-3 pb-3 mt-2 flex-1">
            <div className="grid grid-cols-2 gap-2 flex-1">
              {playerBase.abilities.map(a => {
                const canAfford = state.player!.stamina >= a.staminaCost;
                const alreadyUsed = a.isUltimate && state.player!.ultimateUsed;
                const disabled = !canAfford || playerBlocked || alreadyUsed;
                return (
                  <button
                    key={a.id}
                    disabled={disabled}
                    onClick={() => handleAction(a.id)}
                    title={a.description}
                    className={`move-btn ${a.isUltimate ? '' : `move-${a.type}`} flex flex-col`}
                    style={a.isUltimate ? {
                      background: alreadyUsed
                        ? '#e8e8e8'
                        : 'linear-gradient(135deg, #fff8e0 0%, #ffe580 45%, #ffc820 100%)',
                      border: alreadyUsed ? '2px solid #ccc' : '2px solid #cc8800',
                      boxShadow: alreadyUsed ? 'none' : '2px 2px 0 #aa6600, inset 0 1px 0 rgba(255,255,255,0.5)',
                      borderRadius: 6, padding: '6px 8px', cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.5 : 1, textAlign: 'left', transition: 'all 0.08s',
                    } : { opacity: disabled ? 0.4 : 1 }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-black text-xs uppercase tracking-wide"
                        style={{ color: a.isUltimate ? '#884400' : '#111' }}>
                        {a.isUltimate && !alreadyUsed && '⚡ '}{a.name}
                      </span>
                      <span className="text-[10px] font-mono" style={{ color: '#777' }}>{a.staminaCost}ST</span>
                    </div>
                    {a.damage && (
                      <span className="text-[10px] mt-0.5" style={{ color: a.isUltimate ? '#cc4400' : '#c02020', fontWeight: 900 }}>
                        PWR {a.damage}{a.isUltimate ? '!' : ''}
                      </span>
                    )}
                    {alreadyUsed && (
                      <span className="text-[9px]" style={{ color: '#999', fontStyle: 'italic' }}>Used</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col" style={{ width: 90 }}>
              <button
                disabled={playerBlocked}
                onClick={handleRest}
                className="move-btn move-utility flex-1 flex flex-col items-center justify-center text-center"
                style={{ borderLeft: '4px solid #aaa', opacity: playerBlocked ? 0.4 : 1 }}
              >
                <span className="font-black text-xs uppercase" style={{ color: '#444' }}>Rest</span>
                <span className="text-[9px] mt-0.5" style={{ color: '#777' }}>+25 ST</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center pb-3 px-3">
            <button
              onClick={() => dispatch({ type: 'RESET' })}
              className="move-btn"
              style={{ padding: '12px 32px', fontSize: 14, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', borderLeft: '4px solid #2266cc' }}
            >
              Return to Roster
            </button>
          </div>
        )}
      </div>

      {/* Victory overlay */}
      <AnimatePresence>
        {state.winner && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
            style={{ background: 'rgba(0,0,0,0.45)' }}>
            <motion.div initial={{ scale: 0.7, y: -20 }} animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              className="stat-box px-10 py-6 text-center" style={{ pointerEvents: 'auto' }}>
              <p className="text-4xl font-black uppercase tracking-widest mb-1"
                style={{ color: state.winner === 'player' ? '#2266cc' : '#cc2222' }}>
                {state.winner === 'player' ? 'Victory!' : 'Defeated!'}
              </p>
              <p className="text-base font-semibold mb-4" style={{ color: '#555' }}>
                {state.winner === 'player' ? playerBase.name : opponentBase.name} wins
              </p>
              <button onClick={() => dispatch({ type: 'RESET' })} className="move-btn"
                style={{ padding: '10px 28px', fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', borderLeft: '4px solid #2266cc' }}>
                Play Again
              </button>
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
};

function StatusBadge({ type, duration }: { type: string; duration: number }) {
  const tooltip = STATUS_TOOLTIPS[type] ?? type;
  const colors  = STATUS_COLORS[type] ?? { bg: '#ffe0e0', text: '#cc2222', border: '#ffaaaa' };
  return (
    <span
      className="text-[9px] px-1 rounded font-bold cursor-help"
      style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
      title={`${tooltip} (${duration} turn${duration !== 1 ? 's' : ''} remaining)`}
    >
      {type.toUpperCase()}
    </span>
  );
}
