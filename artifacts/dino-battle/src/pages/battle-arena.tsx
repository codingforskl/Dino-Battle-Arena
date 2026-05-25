import { useContext, useEffect, useRef, useState } from 'react';
import { GameContext } from '@/App';
import { DINOSAURS } from '@/lib/dino-data';
import { getRequiredBites } from '@/lib/game-engine';
import { DinoSvg } from '@/components/dino-svg';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import forestBg from '../assets/forest-bg.png';

export default function BattleArena() {
  const ctx = useContext(GameContext);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [animatingPlayer, setAnimatingPlayer] = useState(false);
  const [animatingOpponent, setAnimatingOpponent] = useState(false);

  const logLength = ctx?.state.log.length ?? 0;
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
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
        const validAbilities = aiBase.abilities.filter(a => a.staminaCost <= aiState.stamina);
        if (validAbilities.length > 0) {
          const randomAbility = validAbilities[Math.floor(Math.random() * validAbilities.length)];
          setAnimatingOpponent(true);
          setTimeout(() => setAnimatingOpponent(false), 500);
          dispatch({ type: 'USE_ABILITY', abilityId: randomAbility.id, attacker: 'opponent' });
        } else {
          dispatch({ type: 'REST', attacker: 'opponent' });
        }
      }
    }, 1200);
  };

  const handlePlayerAction = (abilityId: string) => {
    setAnimatingPlayer(true);
    setTimeout(() => setAnimatingPlayer(false), 500);
    dispatch({ type: 'USE_ABILITY', abilityId, attacker: 'player' });
    triggerAI();
  };

  const handleRest = () => {
    dispatch({ type: 'REST', attacker: 'player' });
    triggerAI();
  };

  const pRequiredBites = getRequiredBites(state.player.dinoId, state.opponent.dinoId);
  const oRequiredBites = getRequiredBites(state.opponent.dinoId, state.player.dinoId);

  // Scale dino heights proportionally — max 4m = 280px, min 0.5m = ~80px
  const maxH = 4.0;
  const pImgH = Math.round((playerBase.height / maxH) * 280 + 60);
  const oImgH = Math.round((opponentBase.height / maxH) * 280 + 60);

  return (
    <div
      className="flex-1 flex flex-col relative overflow-hidden"
      style={{ minHeight: '100vh' }}
    >
      {/* Forest background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${forestBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
        }}
      />
      {/* Atmospheric overlay */}
      <div className="absolute inset-0 z-0" style={{
        background: 'linear-gradient(180deg, rgba(3,10,5,0.6) 0%, rgba(3,10,5,0.1) 35%, rgba(3,10,5,0.35) 70%, rgba(3,10,5,0.88) 100%)'
      }} />

      {/* Top Stats */}
      <div className="relative z-20 flex justify-between p-4 bg-black/55 backdrop-blur-md border-b border-amber-500/20">
        <StatPanel
          name={playerBase.name}
          hp={state.player.hp} maxHp={playerBase.maxHp}
          stamina={state.player.stamina} maxStamina={playerBase.maxStamina}
          speed={playerBase.baseSpeed}
          isPlayer
          biteProgress={state.player.biteProgress}
          requiredBites={pRequiredBites}
          height={playerBase.height}
          statusEffects={state.player.statusEffects}
        />
        <div className="flex flex-col justify-center items-center px-4">
          <span className="text-2xl font-black text-amber-400 uppercase tracking-[0.3em]">VS</span>
          <span className="text-xs text-white/40 uppercase tracking-widest mt-1">Turn {state.turnNumber}</span>
        </div>
        <StatPanel
          name={opponentBase.name}
          hp={state.opponent.hp} maxHp={opponentBase.maxHp}
          stamina={state.opponent.stamina} maxStamina={opponentBase.maxStamina}
          speed={opponentBase.baseSpeed}
          isPlayer={false}
          biteProgress={state.opponent.biteProgress}
          requiredBites={oRequiredBites}
          height={opponentBase.height}
          statusEffects={state.opponent.statusEffects}
        />
      </div>

      {/* Arena — dinos face each other */}
      <div className="relative z-10 flex-1 flex items-end justify-between px-8 pb-4">
        {/* Player dino — left side, faces right */}
        <motion.div
          className="relative flex-shrink-0"
          initial={{ x: -120, opacity: 0 }}
          animate={{
            x: animatingPlayer ? 40 : 0,
            opacity: 1,
            scale: state.player.hp <= 0 ? 0.75 : 1,
            rotate: state.player.hp <= 0 ? -20 : 0,
          }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          style={{ filter: 'drop-shadow(0 8px 32px rgba(255,180,50,0.35))' }}
        >
          <DinoSvg
            dinoId={state.player.dinoId}
            style={{ height: pImgH, width: 'auto' }}
          />
          {state.player.hp <= 0 && (
            <div className="absolute inset-0 bg-red-700/40 rounded-2xl blur-xl" />
          )}
        </motion.div>

        {/* Opponent dino — right side, flipped to face left */}
        <motion.div
          className="relative flex-shrink-0"
          initial={{ x: 120, opacity: 0 }}
          animate={{
            x: animatingOpponent ? -40 : 0,
            opacity: 1,
            scale: state.opponent.hp <= 0 ? 0.75 : 1,
            rotate: state.opponent.hp <= 0 ? 20 : 0,
          }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          style={{ filter: 'drop-shadow(0 8px 32px rgba(220,50,50,0.4))' }}
        >
          <DinoSvg
            dinoId={state.opponent.dinoId}
            flipped
            style={{ height: oImgH, width: 'auto' }}
          />
          {state.opponent.hp <= 0 && (
            <div className="absolute inset-0 bg-red-700/40 rounded-2xl blur-xl" />
          )}
        </motion.div>

        {/* Victory / Defeat overlay */}
        <AnimatePresence>
          {state.winner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-50 backdrop-blur-md"
            >
              <motion.h2
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className={`text-8xl font-black uppercase tracking-widest mb-4 drop-shadow-2xl ${state.winner === 'player' ? 'text-amber-400' : 'text-red-500'}`}
              >
                {state.winner === 'player' ? 'Victory' : 'Defeat'}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-white/60 text-lg mb-8 uppercase tracking-widest"
              >
                {state.winner === 'player' ? playerBase.name : opponentBase.name} wins the arena
              </motion.p>
              <Button
                size="lg"
                className="text-xl px-10 py-6"
                data-testid="btn-return"
                onClick={() => dispatch({ type: 'RESET' })}
              >
                Return to Roster
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls & Log */}
      <div className="relative z-20 bg-black/80 backdrop-blur-md border-t border-amber-500/20 flex" style={{ minHeight: 280 }}>
        <div className="flex-1 p-5 grid grid-cols-2 gap-3 border-r border-amber-500/15 overflow-auto">
          {playerBase.abilities.map(a => {
            const canAfford = state.player!.stamina >= a.staminaCost;
            return (
              <Button
                key={a.id}
                variant="outline"
                data-testid={`btn-ability-${a.id}`}
                disabled={!canAfford || !!state.winner || state.player!.statusEffects.some(e => e.type === 'stunned')}
                onClick={() => handlePlayerAction(a.id)}
                className={`h-auto flex flex-col items-start p-4 text-left transition-all ${canAfford ? 'bg-white/5 hover:bg-amber-500/10 hover:border-amber-500/60 border-white/10' : 'bg-black/20 opacity-40'}`}
              >
                <div className="flex justify-between w-full mb-1">
                  <span className="font-bold text-amber-400 text-base">{a.name}</span>
                  <span className="text-amber-500/70 font-mono text-xs">{a.staminaCost} STM</span>
                </div>
                <span className="text-xs text-white/50 line-clamp-2">{a.description}</span>
                {a.damage && <span className="text-xs text-red-400/80 mt-1 font-mono">DMG {a.damage}</span>}
              </Button>
            );
          })}
          <Button
            variant="secondary"
            className="col-span-2 border-dashed border border-white/10 bg-black/20 hover:bg-white/5 py-4 text-base tracking-widest uppercase text-white/40 hover:text-white/70"
            disabled={!!state.winner || state.player!.statusEffects.some(e => e.type === 'stunned')}
            onClick={handleRest}
            data-testid="btn-rest"
          >
            Rest — Recover 25 Stamina
          </Button>
        </div>

        <div className="w-80 flex flex-col p-4">
          <h3 className="text-xs font-bold text-amber-400/70 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Battle Log
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1" ref={scrollRef}>
            {state.log.map((entry, i) => (
              <div
                key={i}
                className="text-xs text-white/70 font-mono leading-relaxed border-l border-amber-500/20 pl-2"
              >
                {entry}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatPanel({
  name, hp, maxHp, stamina, maxStamina, speed,
  isPlayer, biteProgress, requiredBites, height, statusEffects
}: {
  name: string; hp: number; maxHp: number; stamina: number; maxStamina: number;
  speed: number; isPlayer: boolean; biteProgress: number; requiredBites: number;
  height: number; statusEffects: { type: string; duration: number }[];
}) {
  const hpPct = Math.max(0, (hp / maxHp) * 100);
  const stPct = Math.max(0, (stamina / maxStamina) * 100);
  const lowStamina = stamina < 20;

  return (
    <div className={`w-64 ${isPlayer ? 'text-left' : 'text-right'}`}>
      <div className={`flex items-baseline gap-2 mb-2 ${!isPlayer && 'flex-row-reverse'}`}>
        <h3 className="font-black text-xl text-white uppercase tracking-wider leading-none">{name}</h3>
        <span className="text-xs text-white/30 font-mono">{height}m</span>
      </div>
      <div className="space-y-2 bg-black/50 p-3 rounded-lg border border-white/5">
        <div>
          <div className={`flex justify-between text-[10px] mb-1 font-mono uppercase font-bold ${!isPlayer && 'flex-row-reverse'}`}>
            <span className="text-red-400">HP</span>
            <span className="text-white/80">{hp}/{maxHp}</span>
          </div>
          <div className="h-2.5 bg-black/60 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${hpPct > 50 ? 'bg-red-500' : hpPct > 20 ? 'bg-orange-500' : 'bg-red-700 animate-pulse'}`}
              style={{ width: `${hpPct}%` }}
            />
          </div>
        </div>
        <div>
          <div className={`flex justify-between text-[10px] mb-1 font-mono uppercase font-bold ${!isPlayer && 'flex-row-reverse'}`}>
            <span className={lowStamina ? 'text-red-400 animate-pulse' : 'text-emerald-400'}>STM</span>
            <span className="text-white/80">{stamina}/{maxStamina}</span>
          </div>
          <div className="h-2 bg-black/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${stPct}%` }}
            />
          </div>
        </div>
        <div className={`flex items-center gap-1.5 pt-1 flex-wrap ${!isPlayer && 'flex-row-reverse'}`}>
          <div className="bg-black/40 px-1.5 py-0.5 rounded text-[10px] font-mono border border-white/5">
            <span className="text-blue-400">SPD</span> {lowStamina ? Math.floor(speed / 2) : speed}
          </div>
          {requiredBites > 1 && (
            <div className="bg-black/40 px-1.5 py-0.5 rounded text-[10px] font-mono border border-amber-500/20">
              <span className="text-amber-400">PEN</span> {biteProgress}/{requiredBites}
            </div>
          )}
          {statusEffects.map((e, i) => (
            <span key={i} className="text-[10px] bg-red-900/60 text-red-300 px-1 py-0.5 rounded uppercase font-mono">
              {e.type}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
