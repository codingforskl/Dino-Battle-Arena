import { useContext, useEffect, useState } from 'react';
import { GameContext } from '@/App';
import { DINOSAURS, STATUS_TOOLTIPS } from '@/lib/dino-data';
import { getRequiredBites } from '@/lib/game-engine';
import { DinoSvg } from '@/components/dino-svg';
import { motion, AnimatePresence } from 'framer-motion';
import forestBg from '../assets/forest-bg.png';

export default function BattleArena() {
  const ctx = useContext(GameContext);
  const [animatingPlayer, setAnimatingPlayer] = useState(false);
  const [animatingOpponent, setAnimatingOpponent] = useState(false);
  const [hitPlayer, setHitPlayer] = useState(false);
  const [hitOpponent, setHitOpponent] = useState(false);
  const [lastLog, setLastLog] = useState('');

  const logLength = ctx?.state.log.length ?? 0;
  useEffect(() => {
    const log = ctx?.state.log ?? [];
    if (log.length > 0) setLastLog(log[log.length - 1]);
  }, [logLength]);

  if (!ctx || !ctx.state.player || !ctx.state.opponent) return null;

  const { state, dispatch } = ctx;
  const playerBase = DINOSAURS[state.player.dinoId];
  const opponentBase = DINOSAURS[state.opponent.dinoId];

  const triggerAI = () => {
    setTimeout(() => {
      if (!ctx.state.winner) {
        const aiState = ctx.state.opponent!;
        const aiBase = DINOSAURS[aiState.dinoId];
        const isStunned = aiState.statusEffects.some(e => e.type === 'stunned');
        if (isStunned) {
          dispatch({ type: 'REST', attacker: 'opponent' });
          return;
        }
        // AI avoids using ultimate if already used
        const validAbilities = aiBase.abilities.filter(a =>
          a.staminaCost <= aiState.stamina && (!a.isUltimate || !aiState.ultimateUsed)
        );
        if (validAbilities.length > 0) {
          // AI uses ultimate only if HP < 40% and it has enough stamina
          const hpPct = aiState.hp / aiBase.maxHp;
          const ultimates = validAbilities.filter(a => a.isUltimate);
          const normals = validAbilities.filter(a => !a.isUltimate);
          let pick = normals[Math.floor(Math.random() * normals.length)];
          if (hpPct < 0.4 && ultimates.length > 0 && Math.random() > 0.4) {
            pick = ultimates[0];
          }
          if (!pick) pick = validAbilities[Math.floor(Math.random() * validAbilities.length)];

          setAnimatingOpponent(true);
          setTimeout(() => setAnimatingOpponent(false), 600);
          if (pick.type === 'attack') {
            setTimeout(() => {
              setHitPlayer(true);
              setTimeout(() => setHitPlayer(false), 450);
            }, 300);
          }
          dispatch({ type: 'USE_ABILITY', abilityId: pick.id, attacker: 'opponent' });
        } else {
          dispatch({ type: 'REST', attacker: 'opponent' });
        }
      }
    }, 1000);
  };

  const handleAction = (abilityId: string) => {
    if (!state.player) return;
    const ability = playerBase.abilities.find(a => a.id === abilityId);
    if (ability?.isUltimate && state.player.ultimateUsed) return;
    setAnimatingPlayer(true);
    setTimeout(() => setAnimatingPlayer(false), 600);
    if (ability?.type === 'attack') {
      setTimeout(() => {
        setHitOpponent(true);
        setTimeout(() => setHitOpponent(false), 450);
      }, 300);
    }
    dispatch({ type: 'USE_ABILITY', abilityId, attacker: 'player' });
    triggerAI();
  };

  const handleRest = () => {
    dispatch({ type: 'REST', attacker: 'player' });
    triggerAI();
  };

  const pRequiredBites = getRequiredBites(state.player.dinoId, state.opponent.dinoId);
  const oRequiredBites = getRequiredBites(state.opponent.dinoId, state.player.dinoId);

  const maxH = 4.0;
  const oImgH = Math.round((opponentBase.height / maxH) * 140 + 50);
  const pImgH = Math.round((playerBase.height / maxH) * 180 + 70);

  const isPlayerStunned = state.player.statusEffects.some(e => e.type === 'stunned');
  const playerBlocked = !!state.winner || isPlayerStunned;

  return (
    <div className="flex-1 flex flex-col" style={{ minHeight: '100vh', background: '#c8d8e8', userSelect: 'none' }}>

      {/* ── BATTLE FIELD ── */}
      <div className="relative overflow-hidden flex-shrink-0" style={{ height: '54vh' }}>
        <img src={forestBg} alt="arena" className="absolute inset-0 w-full h-full object-cover object-center" style={{ opacity: 0.92 }} draggable={false} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(120,180,240,0.25) 0%, transparent 55%)' }} />

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
        <div className="absolute z-8" style={{ right: '8%', bottom: '28%', width: 200, pointerEvents: 'none' }}>
          <div style={{ height: 18, borderRadius: '50%', background: 'linear-gradient(180deg, #6aaa44 0%, #4e8830 60%, #3d6e24 100%)', boxShadow: '0 4px 0 #2d5518, 0 6px 8px rgba(0,0,0,0.35)', border: '1px solid #3d6e24' }} />
          <div style={{ height: 8, marginTop: -2, borderRadius: '0 0 50% 50%', background: 'linear-gradient(180deg, #8B6914 0%, #6b4f10 100%)' }} />
          <div style={{ height: 8, marginTop: 1, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(0,0,0,0.25) 0%, transparent 70%)' }} />
        </div>

        {/* ── OPPONENT DINO ── */}
        <motion.div className="absolute z-10" style={{ right: '10%', bottom: 'calc(28% + 22px)' }}
          initial={{ x: 80, opacity: 0 }}
          animate={{ x: animatingOpponent ? -30 : 0, opacity: 1, scale: state.opponent.hp <= 0 ? 0.7 : 1, rotate: state.opponent.hp <= 0 ? 25 : 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 20 }}>
          <DinoSvg dinoId={state.opponent.dinoId} flipped
            className={hitOpponent && state.opponent.hp > 0 ? 'dino-hit-opponent' : ''}
            style={{ height: oImgH, width: 'auto', filter: state.opponent.hp <= 0 ? 'grayscale(0.6) brightness(0.6)' : undefined }} />
        </motion.div>

        {/* ── PLAYER GROUND PLATFORM ── */}
        <div className="absolute z-8" style={{ left: '6%', bottom: '4%', width: 240, pointerEvents: 'none' }}>
          <div style={{ height: 22, borderRadius: '50%', background: 'linear-gradient(180deg, #78c450 0%, #5a9e36 60%, #4a8228 100%)', boxShadow: '0 5px 0 #365e1c, 0 8px 10px rgba(0,0,0,0.4)', border: '1px solid #4a8228' }} />
          <div style={{ height: 10, marginTop: -2, borderRadius: '0 0 50% 50%', background: 'linear-gradient(180deg, #9B7914 0%, #7b5f10 100%)' }} />
          <div style={{ height: 10, marginTop: 1, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(0,0,0,0.3) 0%, transparent 70%)' }} />
        </div>

        {/* ── PLAYER DINO ── */}
        <motion.div className="absolute z-10" style={{ left: '8%', bottom: 'calc(4% + 28px)' }}
          initial={{ x: -80, opacity: 0 }}
          animate={{ x: animatingPlayer ? 40 : 0, opacity: 1, scale: state.player.hp <= 0 ? 0.7 : 1, rotate: state.player.hp <= 0 ? -25 : 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 20 }}>
          <DinoSvg dinoId={state.player.dinoId}
            className={hitPlayer && state.player.hp > 0 ? 'dino-hit-player' : ''}
            style={{ height: pImgH, width: 'auto', filter: state.player.hp <= 0 ? 'grayscale(0.6) brightness(0.6)' : undefined }} />
        </motion.div>

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

        {/* Battle dialog box */}
        <div className="mx-3 mt-2 battle-dialog px-4 py-2 flex-shrink-0" style={{ minHeight: 48 }}>
          {isPlayerStunned && !state.winner ? (
            <p className="text-sm font-semibold" style={{ color: '#cc2222' }}>
              {playerBase.name} is stunned and cannot act this turn! (Losing next move)
            </p>
          ) : (
            <p className="text-sm font-semibold" style={{ color: '#222', lineHeight: 1.4 }}>
              {state.winner
                ? (state.winner === 'player'
                  ? `${playerBase.name} wins the arena! Incredible victory!`
                  : `${opponentBase.name} wins! ${playerBase.name} was defeated...`)
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
                const alreadyUsedUltimate = a.isUltimate && state.player!.ultimateUsed;
                const disabled = !canAfford || playerBlocked || alreadyUsedUltimate;
                return (
                  <button
                    key={a.id}
                    disabled={disabled}
                    onClick={() => handleAction(a.id)}
                    title={a.description}
                    className={`move-btn ${a.isUltimate ? 'move-ultimate' : `move-${a.type}`} flex flex-col`}
                    style={a.isUltimate ? {
                      background: alreadyUsedUltimate ? '#e8e8e8' : 'linear-gradient(135deg, #fff8e0 0%, #ffe580 50%, #ffc820 100%)',
                      border: alreadyUsedUltimate ? '2px solid #ccc' : '2px solid #cc8800',
                      boxShadow: alreadyUsedUltimate ? 'none' : '2px 2px 0 #aa6600, inset 0 1px 0 rgba(255,255,255,0.5)',
                      opacity: disabled ? 0.5 : 1,
                    } : { opacity: disabled ? 0.45 : 1 }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-black text-xs uppercase tracking-wide" style={{ color: a.isUltimate ? '#884400' : '#111' }}>
                        {a.isUltimate && !alreadyUsedUltimate && <span style={{ marginRight: 3 }}>⚡</span>}
                        {a.name}
                      </span>
                      <span className="text-[10px] font-mono" style={{ color: '#777' }}>{a.staminaCost}ST</span>
                    </div>
                    {a.damage && (
                      <span className="text-[10px] mt-0.5" style={{ color: a.isUltimate ? '#cc4400' : '#c02020', fontWeight: 900 }}>
                        PWR {a.damage}{a.isUltimate ? '!' : ''}
                      </span>
                    )}
                    {alreadyUsedUltimate && (
                      <span className="text-[9px] mt-0.5" style={{ color: '#999', fontStyle: 'italic' }}>Already used</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-2" style={{ width: 90 }}>
              <button
                disabled={playerBlocked}
                onClick={handleRest}
                className="move-btn move-utility flex-1 flex flex-col items-center justify-center text-center"
                style={{ borderLeft: '4px solid #aaa', opacity: playerBlocked ? 0.45 : 1 }}
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
              <p className="text-4xl font-black uppercase tracking-widest mb-1" style={{ color: state.winner === 'player' ? '#2266cc' : '#cc2222' }}>
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
  const colors = STATUS_COLORS[type] ?? { bg: '#ffe0e0', text: '#cc2222', border: '#ffaaaa' };
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
