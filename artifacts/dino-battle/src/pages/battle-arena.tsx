import { useContext, useEffect, useState, useRef } from 'react';
import { GameContext } from '@/App';
import { DINOSAURS, STATUS_TOOLTIPS } from '@/lib/dino-data';
import { getRequiredBites } from '@/lib/game-engine';
import { DinoSvg } from '@/components/dino-svg';
import { motion, AnimatePresence } from 'framer-motion';
import forestBg from '../assets/forest-bg.png';

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
  // ── Velociraptor ──
  sickle_claw:     { target: 'opponent', duration: 0.42, showImpact: true,
    keyframes: { x:[0,55,20,0], y:[0,-15,10,0], rotate:[0,-20,5,0], scale:[1,1.05,1,1] } },
  pack_feint:      { target: 'self', duration: 0.55,
    keyframes: { x:[0,-25,15,-8,0], y:[0,-10,5,0], rotate:[0,10,-5,0], scale:[1,1.08,0.95,1] } },
  leap_strike:     { target: 'opponent', duration: 0.6, showImpact: true,
    keyframes: { x:[0,70,30,0], y:[0,-60,-10,0], rotate:[0,-25,10,0], scale:[1,1.12,1,1] } },
  bite_raptor:     { target: 'opponent', duration: 0.45, showImpact: true,
    keyframes: { x:[0,45,0], y:[0,-5,0], rotate:[0,-12,0], scale:[1,1.05,1] } },
  frenzy_blitz:    { target: 'opponent', duration: 0.85, isUltimate: true, showImpact: true, showLightning: true,
    keyframes: { x:[0,50,20,60,30,0], y:[0,-20,10,-15,5,0], rotate:[0,-20,10,-15,8,0], scale:[1,1.2,1,1.15,1,1] } },

  // ── Giganotosaurus ──
  crushing_bite:   { target: 'opponent', duration: 0.55, showImpact: true,
    keyframes: { x:[0,-75,-20,0], y:[0,8,-2,0], rotate:[0,15,-5,0], scale:[1.1,1.15,1,1] } },
  body_slam:       { target: 'opponent', duration: 0.6, showImpact: true,
    keyframes: { x:[0,-65,-20,0], y:[0,20,5,0], rotate:[0,8,-2,0], scale:[1.05,1.2,1,1] } },
  tail_sweep_giga: { target: 'opponent', duration: 0.55, showImpact: true,
    keyframes: { x:[0,15,-30,0], y:[0,5,0,0], rotate:[0,35,10,0], scale:[1,1.05,1,1] } },
  roar:            { target: 'self', duration: 0.65, showRoarRings: true,
    keyframes: { scale:[1,1.35,1.15,1.25,1], y:[0,-8,3,-5,0], rotate:[0,-5,3,-2,0] } },
  apex_domination: { target: 'opponent', duration: 0.9, isUltimate: true, showImpact: true, showLightning: true,
    keyframes: { x:[0,-90,-30,0], y:[0,30,-5,0], rotate:[0,20,-5,0], scale:[1.15,1.3,1.05,1] } },

  // ── Spinosaurus ──
  sail_slam:       { target: 'opponent', duration: 0.5, showImpact: true,
    keyframes: { x:[0,-45,-10,0], y:[0,-25,10,0], rotate:[0,15,-5,0], scale:[1,1.08,1,1] } },
  tail_whip:       { target: 'opponent', duration: 0.52, showImpact: true,
    keyframes: { x:[0,20,-35,0], y:[0,5,-2,0], rotate:[0,-35,5,0], scale:[1,1.05,1,1] } },
  ambush_strike:   { target: 'opponent', duration: 0.5, showImpact: true,
    keyframes: { x:[0,-80,-20,0], y:[0,5,0,0], rotate:[0,12,-3,0], scale:[1.1,1.1,1,1] } },
  bite_spino:      { target: 'opponent', duration: 0.48, showImpact: true,
    keyframes: { x:[0,-50,-10,0], y:[0,8,0,0], rotate:[0,10,-3,0], scale:[1,1.06,1,1] } },
  death_roll:      { target: 'opponent', duration: 0.9, isUltimate: true, showImpact: true, showLightning: true,
    keyframes: { x:[0,-60,-80,-40,0], y:[0,15,-5,20,0], rotate:[0,-180,-270,-360,-360], scale:[1.1,1.2,1.1,1,1] } },

  // ── T-Rex ──
  rex_bite:        { target: 'opponent', duration: 0.55, showImpact: true,
    keyframes: { x:[0,-85,-25,0], y:[0,10,0,0], rotate:[0,15,-4,0], scale:[1.1,1.2,1,1] } },
  stomp:           { target: 'opponent', duration: 0.55, showImpact: true,
    keyframes: { x:[0,-55,0], y:[0,35,-5,0], rotate:[0,8,0], scale:[1,1.18,1] } },
  headbutt:        { target: 'opponent', duration: 0.5, showImpact: true,
    keyframes: { x:[0,-75,-20,0], y:[0,-10,5,0], rotate:[0,20,-5,0], scale:[1.05,1.15,1,1] } },
  rex_roar:        { target: 'self', duration: 0.75, showRoarRings: true,
    keyframes: { scale:[1,1.45,1.2,1.35,1], y:[0,-12,5,-8,0], rotate:[0,-8,4,-4,0] } },
  tyrants_wrath:   { target: 'opponent', duration: 0.95, isUltimate: true, showImpact: true, showLightning: true,
    keyframes: { x:[0,-100,-40,0], y:[0,15,-3,0], rotate:[0,25,-6,0], scale:[1.2,1.4,1.1,1] } },

  // ── Pterodactylus ──
  talon_rake:      { target: 'opponent', duration: 0.42, showImpact: true,
    keyframes: { x:[0,65,20,0], y:[0,-25,10,0], rotate:[0,-25,8,0], scale:[1,1.08,1,1] } },
  aerial_dodge:    { target: 'self', duration: 0.55,
    keyframes: { x:[0,-15,10,-5,0], y:[0,-35,-10,0], rotate:[0,-15,5,0], scale:[1,0.9,1,1] } },
  beak_stab:       { target: 'opponent', duration: 0.4, showImpact: true,
    keyframes: { x:[0,80,15,0], y:[0,-10,5,0], rotate:[0,-35,10,0], scale:[1,1.06,1,1] } },
  screech:         { target: 'self', duration: 0.6, showRoarRings: true,
    keyframes: { scale:[1,1.25,1.1,1.18,1], x:[0,-5,5,-3,0], y:[0,-8,4,-4,0] } },
  screech_dive:    { target: 'opponent', duration: 0.85, isUltimate: true, showImpact: true, showLightning: true,
    keyframes: { x:[0,90,30,0], y:[0,-65,25,0], rotate:[0,-40,15,0], scale:[1,1.15,1.05,1] } },
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
  const arenaRef = useRef<HTMLDivElement>(null);

  const logLength = ctx?.state.log.length ?? 0;
  useEffect(() => {
    const log = ctx?.state.log ?? [];
    if (log.length > 0) setLastLog(log[log.length - 1]);
  }, [logLength]);

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
            else s -= 15;                                       // save for right moment
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
  const oImgH  = Math.round((opponentBase.height / maxH) * 140 + 50);
  const pImgH  = Math.round((playerBase.height / maxH) * 180 + 70);

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

  return (
    <div className="flex-1 flex flex-col" style={{ minHeight: '100vh', background: '#c8d8e8', userSelect: 'none' }}>

      {/* ── BATTLE FIELD ── */}
      <div
        ref={arenaRef}
        className={`relative overflow-hidden flex-shrink-0 ${arenaShake ? 'arena-shake' : ''}`}
        style={{ height: '54vh' }}
      >
        <img src={forestBg} alt="arena" className="absolute inset-0 w-full h-full object-cover object-center" style={{ opacity: 0.92 }} draggable={false} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(120,180,240,0.25) 0%, transparent 55%)' }} />

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
              {oRequiredBites > 1 && (
                <span className="text-[9px] px-1 rounded font-bold" style={{ background: '#fff8e0', color: '#886600', border: '1px solid #ddc050' }}
                  title={`Thick hide! Needs ${oRequiredBites} bites to fully penetrate`}>
                  HIDE {state.opponent.biteProgress}/{oRequiredBites}
                </span>
              )}
              {state.opponent.statusEffects.map((e, i) => (
                <StatusBadge key={i} type={e.type} duration={e.duration} />
              ))}
            </div>
          </div>
        </div>

        {/* ── OPPONENT GROUND PLATFORM ── */}
        <div className="absolute z-8" style={{ right: '6%', bottom: '28%', width: 220, pointerEvents: 'none' }}>
          {/* Grass top — layered for depth */}
          <div style={{ position: 'relative', height: 22, borderRadius: '50%', background: 'linear-gradient(180deg, #8fd45a 0%, #5daa2e 45%, #3d8018 100%)', boxShadow: '0 5px 0 #2a6010, 0 8px 14px rgba(0,0,0,0.45)', border: '1px solid #3a7818' }}>
            {/* Grass highlight streak */}
            <div style={{ position: 'absolute', top: 3, left: '20%', width: '28%', height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.22)' }} />
            <div style={{ position: 'absolute', top: 5, left: '55%', width: '16%', height: 3, borderRadius: 3, background: 'rgba(255,255,255,0.15)' }} />
          </div>
          {/* Soil band */}
          <div style={{ height: 12, marginTop: -3, background: 'linear-gradient(180deg, #a07828 0%, #7a5a14 55%, #5c4010 100%)', borderRadius: '0 0 40% 40%' }}>
            {/* Rock pebbles */}
            <div style={{ position: 'relative', top: 3, left: '18%', display: 'inline-block', width: 6, height: 5, borderRadius: '50%', background: '#4a3010' }} />
            <div style={{ position: 'relative', top: 2, left: '48%', display: 'inline-block', width: 5, height: 4, borderRadius: '50%', background: '#3e2a0c' }} />
          </div>
          {/* Ground shadow */}
          <div style={{ height: 9, marginTop: 1, borderRadius: '50%', background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(0,0,0,0.32) 0%, transparent 100%)' }} />
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
            className={state.opponent.hp <= 0 ? '' : opponentCss}
            style={{ height: oImgH, width: 'auto', filter: state.opponent.hp <= 0 ? 'grayscale(0.6) brightness(0.6)' : undefined }}
          />
        </motion.div>

        {/* ── PLAYER GROUND PLATFORM ── */}
        <div className="absolute z-8" style={{ left: '4%', bottom: '4%', width: 265, pointerEvents: 'none' }}>
          {/* Grass top — layered for depth */}
          <div style={{ position: 'relative', height: 26, borderRadius: '50%', background: 'linear-gradient(180deg, #9fe060 0%, #68bb38 40%, #4a9020 100%)', boxShadow: '0 6px 0 #306812, 0 10px 16px rgba(0,0,0,0.5)', border: '1px solid #458020' }}>
            <div style={{ position: 'absolute', top: 4, left: '15%', width: '32%', height: 5, borderRadius: 4, background: 'rgba(255,255,255,0.24)' }} />
            <div style={{ position: 'absolute', top: 6, left: '55%', width: '20%', height: 3, borderRadius: 3, background: 'rgba(255,255,255,0.16)' }} />
            {/* Grass blade tips */}
            <div style={{ position: 'absolute', top: -3, left: '22%', width: 3, height: 6, borderRadius: '2px 2px 0 0', background: '#7ccc40', transform: 'rotate(-8deg)' }} />
            <div style={{ position: 'absolute', top: -4, left: '40%', width: 3, height: 7, borderRadius: '2px 2px 0 0', background: '#8adc44', transform: 'rotate(5deg)' }} />
            <div style={{ position: 'absolute', top: -3, left: '62%', width: 3, height: 6, borderRadius: '2px 2px 0 0', background: '#72c03a', transform: 'rotate(-4deg)' }} />
          </div>
          {/* Soil band */}
          <div style={{ height: 14, marginTop: -3, background: 'linear-gradient(180deg, #b08830 0%, #8a6418 55%, #644810 100%)', borderRadius: '0 0 40% 40%' }}>
            <div style={{ position: 'relative', top: 3, left: '14%', display: 'inline-block', width: 8, height: 6, borderRadius: '50%', background: '#52380e' }} />
            <div style={{ position: 'relative', top: 2, left: '36%', display: 'inline-block', width: 6, height: 5, borderRadius: '50%', background: '#42300c' }} />
            <div style={{ position: 'relative', top: 4, left: '58%', display: 'inline-block', width: 7, height: 5, borderRadius: '50%', background: '#4e3610' }} />
          </div>
          {/* Ground shadow */}
          <div style={{ height: 10, marginTop: 1, borderRadius: '50%', background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(0,0,0,0.35) 0%, transparent 100%)' }} />
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
            className={state.player.hp <= 0 ? '' : playerCss}
            style={{ height: pImgH, width: 'auto', filter: state.player.hp <= 0 ? 'grayscale(0.6) brightness(0.6)' : undefined }}
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
              {pRequiredBites > 1 && (
                <span className="text-[9px] px-1 rounded font-bold" style={{ background: '#fff8e0', color: '#886600', border: '1px solid #ddc050' }}
                  title={`Thick hide! Needs ${pRequiredBites} bites to fully penetrate`}>
                  HIDE {state.player.biteProgress}/{pRequiredBites}
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
