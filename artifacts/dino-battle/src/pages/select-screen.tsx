import { useContext, useState } from 'react';
import { GameContext } from '@/App';
import { DINOSAURS, DinoId } from '@/lib/dino-data';
import { Button } from '@/components/ui/button';
import { DinoSvg } from '@/components/dino-svg';
import forestBg from '../assets/forest-bg.png';

const DINO_IDS = Object.keys(DINOSAURS) as DinoId[];

export default function SelectScreen() {
  const ctx = useContext(GameContext);
  const [selectedPlayer, setSelectedPlayer] = useState<DinoId>('velociraptor');
  const [selectedOpponent, setSelectedOpponent] = useState<DinoId>('giganotosaurus');

  if (!ctx) return null;

  const handleStart = () => {
    ctx.dispatch({ type: 'START_BATTLE', playerDino: selectedPlayer, opponentDino: selectedOpponent });
  };

  const playerDino = DINOSAURS[selectedPlayer];
  const opponentDino = DINOSAURS[selectedOpponent];

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center min-h-screen relative overflow-hidden"
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
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 z-0" style={{
        background: 'linear-gradient(180deg, rgba(3,10,5,0.72) 0%, rgba(3,10,5,0.45) 50%, rgba(3,10,5,0.75) 100%)'
      }} />

      <div className="relative z-10 w-full max-w-4xl px-6 flex flex-col items-center">
        {/* Title */}
        <h1 className="text-6xl md:text-7xl font-black text-amber-400 mb-2 tracking-tight uppercase drop-shadow-2xl" style={{ textShadow: '0 0 40px rgba(251,191,36,0.4)' }}>
          Primal Clash
        </h1>
        <p className="text-white/40 text-sm uppercase tracking-[0.4em] mb-10">Choose your prehistoric predator</p>

        {/* Selection panels */}
        <div className="grid grid-cols-2 gap-8 w-full mb-10">
          {/* Player side */}
          <div className="bg-black/50 backdrop-blur-md border border-amber-500/25 rounded-2xl p-6 flex flex-col items-center">
            <h2 className="text-lg font-bold text-white uppercase tracking-widest mb-5">Your Fighter</h2>

            <div className="flex gap-2 mb-6">
              {DINO_IDS.map(id => (
                <button
                  key={`p-${id}`}
                  data-testid={`btn-player-${id}`}
                  onClick={() => setSelectedPlayer(id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                    selectedPlayer === id
                      ? 'bg-amber-500 text-black border-amber-400'
                      : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/80'
                  }`}
                >
                  {DINOSAURS[id].name}
                </button>
              ))}
            </div>

            <div className="w-48 h-48 flex items-end justify-center mb-4">
              <DinoSvg dinoId={selectedPlayer} style={{ maxHeight: '100%', width: 'auto' }} />
            </div>

            <div className="w-full bg-black/40 rounded-xl p-4 border border-white/5 space-y-2 text-left">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-white/40 uppercase">Height</span>
                <span className="text-amber-400 font-bold">{playerDino.height}m</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-white/40 uppercase">HP</span>
                <span className="text-red-400 font-bold">{playerDino.maxHp}</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-white/40 uppercase">Speed</span>
                <span className="text-blue-400 font-bold">{playerDino.baseSpeed}</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-white/40 uppercase">Stamina</span>
                <span className="text-emerald-400 font-bold">{playerDino.maxStamina}</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-white/40 uppercase">Bite Force</span>
                <span className="text-orange-400 font-bold">{playerDino.biteForce.toLocaleString()} N</span>
              </div>
            </div>
          </div>

          {/* Opponent side */}
          <div className="bg-black/50 backdrop-blur-md border border-red-500/25 rounded-2xl p-6 flex flex-col items-center">
            <h2 className="text-lg font-bold text-white uppercase tracking-widest mb-5">Opponent</h2>

            <div className="flex gap-2 mb-6">
              {DINO_IDS.map(id => (
                <button
                  key={`o-${id}`}
                  data-testid={`btn-opponent-${id}`}
                  onClick={() => setSelectedOpponent(id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                    selectedOpponent === id
                      ? 'bg-red-500 text-white border-red-400'
                      : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/80'
                  }`}
                >
                  {DINOSAURS[id].name}
                </button>
              ))}
            </div>

            <div className="w-48 h-48 flex items-end justify-center mb-4">
              <DinoSvg dinoId={selectedOpponent} flipped style={{ maxHeight: '100%', width: 'auto' }} />
            </div>

            <div className="w-full bg-black/40 rounded-xl p-4 border border-white/5 space-y-2 text-left">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-white/40 uppercase">Height</span>
                <span className="text-amber-400 font-bold">{opponentDino.height}m</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-white/40 uppercase">HP</span>
                <span className="text-red-400 font-bold">{opponentDino.maxHp}</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-white/40 uppercase">Speed</span>
                <span className="text-blue-400 font-bold">{opponentDino.baseSpeed}</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-white/40 uppercase">Stamina</span>
                <span className="text-emerald-400 font-bold">{opponentDino.maxStamina}</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-white/40 uppercase">Bite Force</span>
                <span className="text-orange-400 font-bold">{opponentDino.biteForce.toLocaleString()} N</span>
              </div>
            </div>
          </div>
        </div>

        <Button
          size="lg"
          data-testid="btn-begin-battle"
          className="text-2xl px-16 py-8 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-[0.3em] transition-all hover:scale-105 shadow-[0_0_40px_rgba(251,191,36,0.3)]"
          onClick={handleStart}
        >
          Begin Battle
        </Button>
      </div>
    </div>
  );
}
