import { useContext, useEffect, useRef, useState } from 'react';
import { GameContext } from '@/App';
import { DINOSAURS } from '@/lib/dino-data';
import { getRequiredBites } from '@/lib/game-engine';
import { DinoSvg } from '@/components/dino-svg';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';

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
        
        // Is stunned?
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
    
    // Determine speed to see if AI responds
    // Note: Simple turn structure for presentation: Player -> AI
    triggerAI();
  };

  const handleRest = () => {
    dispatch({ type: 'REST', attacker: 'player' });
    triggerAI();
  };

  const pRequiredBites = getRequiredBites(state.player.dinoId, state.opponent.dinoId);
  const oRequiredBites = getRequiredBites(state.opponent.dinoId, state.player.dinoId);
  
  // Calculate heights relative to largest (4m)
  const maxH = 4.0;
  const pScale = (playerBase.height / maxH) * 100 + 40; // 40-140%
  const oScale = (opponentBase.height / maxH) * 100 + 40; 

  const isPlayerTurn = !state.winner && state.turnNumber % 1 === 0; // Simplified
  
  return (
    <div className="flex-1 flex flex-col forest-bg relative overflow-hidden h-screen">
      {/* Top Stats */}
      <div className="flex justify-between p-6 bg-black/60 backdrop-blur-md border-b border-primary/20 z-20">
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
          <span className="text-xl font-black text-amber-500 uppercase tracking-[0.2em] opacity-80">VS</span>
          <span className="text-xs text-white/50 uppercase mt-2">Turn {state.turnNumber}</span>
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

      {/* Arena */}
      <div className="flex-1 relative flex items-end justify-between px-16 pb-32 ground-layer">
        {/* Environment details */}
        <div className="absolute top-10 left-10 w-32 h-64 bg-green-900/10 rounded-full blur-3xl mix-blend-screen pointer-events-none"></div>
        <div className="absolute top-20 right-20 w-48 h-48 bg-amber-600/10 rounded-full blur-3xl mix-blend-screen pointer-events-none"></div>

        <motion.div 
          className="relative z-10 drop-shadow-[0_0_20px_rgba(255,180,50,0.3)]"
          initial={{ x: -100, opacity: 0 }}
          animate={{ 
            x: animatingPlayer ? 50 : 0, 
            opacity: 1,
            scale: state.player.hp <= 0 ? 0.8 : 1,
            rotate: state.player.hp <= 0 ? -15 : 0
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          style={{ width: `${pScale * 3}px`, height: `${pScale * 3}px` }}
        >
          <DinoSvg dinoId={state.player.dinoId} className="w-full h-full text-primary" />
          {state.player.hp <= 0 && <div className="absolute inset-0 bg-red-500/50 mix-blend-multiply rounded-full blur-xl"></div>}
        </motion.div>

        <motion.div 
          className="relative z-10 drop-shadow-[0_0_20px_rgba(255,50,50,0.3)] transform -scale-x-100"
          initial={{ x: 100, opacity: 0 }}
          animate={{ 
            x: animatingOpponent ? 50 : 0, // 50 to the left (because of scale-x-100 it looks like moving forward)
            opacity: 1,
            scale: state.opponent.hp <= 0 ? 0.8 : 1,
            rotate: state.opponent.hp <= 0 ? -15 : 0
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          style={{ width: `${oScale * 3}px`, height: `${oScale * 3}px` }}
        >
          <DinoSvg dinoId={state.opponent.dinoId} className="w-full h-full text-destructive" />
        </motion.div>
        
        <AnimatePresence>
          {state.winner && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-50 backdrop-blur-md"
            >
              <h2 className={`text-7xl font-black uppercase tracking-widest mb-6 ${state.winner === 'player' ? 'text-primary' : 'text-destructive'} drop-shadow-2xl`}>
                {state.winner === 'player' ? 'Victory' : 'Defeat'}
              </h2>
              <Button size="lg" className="text-xl px-10 py-6" onClick={() => dispatch({ type: 'RESET' })}>
                Return to Roster
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls & Log */}
      <div className="h-72 bg-card/95 backdrop-blur-md border-t border-primary/20 flex z-20">
        <div className="flex-1 p-6 grid grid-cols-2 gap-4 border-r border-primary/20">
          {playerBase.abilities.map(a => {
            const canAfford = state.player!.stamina >= a.staminaCost;
            return (
              <Button 
                key={a.id} 
                variant="outline"
                data-testid={`btn-ability-${a.id}`}
                disabled={!canAfford || !!state.winner || state.player!.statusEffects.some(e => e.type === 'stunned')}
                onClick={() => handlePlayerAction(a.id)}
                className={`h-auto flex flex-col items-start p-4 ${canAfford ? 'bg-secondary/40 hover:bg-secondary/80 hover:border-primary border-primary/30' : 'bg-muted/10 opacity-50'} transition-all`}
              >
                <div className="flex justify-between w-full mb-1">
                  <span className="font-bold text-primary text-lg">{a.name}</span>
                  <span className="text-amber-500 font-mono text-sm">{a.staminaCost} STM</span>
                </div>
                <span className="text-sm text-muted-foreground text-left line-clamp-2">{a.description}</span>
                {a.damage && <span className="text-xs text-red-400 mt-2 font-mono">DMG: {a.damage}</span>}
              </Button>
            );
          })}
          <Button 
            variant="secondary" 
            className="col-span-2 mt-2 border-dashed border-2 bg-black/30 hover:bg-black/50 py-6 text-lg tracking-widest uppercase"
            disabled={!!state.winner || state.player!.statusEffects.some(e => e.type === 'stunned')}
            onClick={handleRest}
            data-testid="btn-rest"
          >
            Rest (Recover 25 Stamina)
          </Button>
        </div>
        <div className="w-96 bg-black/40 p-6 flex flex-col">
          <h3 className="text-sm font-bold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Battle Log
          </h3>
          <div className="flex-1 overflow-y-auto pr-2" ref={scrollRef}>
            <div className="space-y-3">
              {state.log.map((entry, i) => (
                <div key={i} className="text-sm text-foreground/90 font-mono leading-relaxed border-l-2 border-primary/30 pl-3">
                  {entry}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatPanel({ name, hp, maxHp, stamina, maxStamina, speed, isPlayer, biteProgress, requiredBites, height, statusEffects }: { name: string, hp: number, maxHp: number, stamina: number, maxStamina: number, speed: number, isPlayer: boolean, biteProgress: number, requiredBites: number, height: number, statusEffects: any[] }) {
  const hpPercent = Math.max(0, (hp / maxHp) * 100);
  const staminaPercent = Math.max(0, (stamina / maxStamina) * 100);
  const isStaminaLow = stamina < 20;

  return (
    <div className={`w-72 ${isPlayer ? 'text-left' : 'text-right'}`}>
      <div className={`flex items-end gap-3 mb-3 ${!isPlayer && 'flex-row-reverse'}`}>
        <h3 className="font-black text-2xl text-white uppercase tracking-wider">{name}</h3>
        <span className="text-xs text-muted-foreground font-mono mb-1">{height}m</span>
      </div>
      
      <div className="space-y-3 bg-black/40 p-4 rounded-lg border border-white/5">
        <div>
          <div className="flex justify-between text-xs mb-1 font-mono uppercase font-bold">
            <span className="text-red-400">Health</span>
            <span className="text-white">{hp} / {maxHp}</span>
          </div>
          <div className="h-3 bg-gray-900 rounded-full overflow-hidden border border-black shadow-inner">
            <div 
              className={`h-full transition-all duration-500 ease-out ${hpPercent > 50 ? 'bg-red-500' : hpPercent > 20 ? 'bg-orange-500' : 'bg-red-700 animate-pulse'}`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>
        
        <div>
          <div className="flex justify-between text-xs mb-1 font-mono uppercase font-bold">
            <span className={`${isStaminaLow ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>Stamina</span>
            <span className="text-white">{stamina} / {maxStamina}</span>
          </div>
          <div className="h-2 bg-gray-900 rounded-full overflow-hidden border border-black shadow-inner">
            <div 
              className="h-full bg-green-500 transition-all duration-500 ease-out"
              style={{ width: `${staminaPercent}%` }}
            />
          </div>
          {isStaminaLow && <p className="text-[10px] text-red-400 mt-1 text-right">Speed halved!</p>}
        </div>

        <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
          <div className="flex gap-2">
            <div className="bg-black/50 px-2 py-1 rounded text-xs font-mono border border-white/10" title="Speed">
              <span className="text-blue-400">SPD:</span> {isStaminaLow ? Math.floor(speed / 2) : speed}
            </div>
            {requiredBites > 1 && (
              <div className="bg-black/50 px-2 py-1 rounded text-xs font-mono border border-white/10" title="Bite Penetration">
                <span className="text-amber-500">PEN:</span> {biteProgress}/{requiredBites}
              </div>
            )}
          </div>
          
          {statusEffects.length > 0 && (
            <div className="flex gap-1">
              {statusEffects.map((e, i) => (
                <span key={i} className="text-[10px] bg-red-900/50 text-red-200 px-1 rounded uppercase">
                  {e.type}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
