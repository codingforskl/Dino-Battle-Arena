import { useContext, useState } from 'react';
import { GameContext } from '@/App';
import { DINOSAURS, DinoId } from '@/lib/dino-data';
import { DinoSvg } from '@/components/dino-svg';
import forestBg from '../assets/forest-bg.png';

const DINO_IDS = Object.keys(DINOSAURS) as DinoId[];

export default function SelectScreen() {
  const ctx = useContext(GameContext);
  const [selectedPlayer, setSelectedPlayer] = useState<DinoId>('velociraptor');
  const [selectedOpponent, setSelectedOpponent] = useState<DinoId>('giganotosaurus');

  if (!ctx) return null;

  const playerDino = DINOSAURS[selectedPlayer];
  const opponentDino = DINOSAURS[selectedOpponent];

  const handleStart = () => {
    ctx.dispatch({ type: 'START_BATTLE', playerDino: selectedPlayer, opponentDino: selectedOpponent });
  };

  return (
    <div className="flex-1 flex flex-col items-stretch min-h-screen" style={{ background: '#c8d8e8' }}>

      {/* Header banner */}
      <div className="relative overflow-hidden flex-shrink-0" style={{ height: 160 }}>
        <img src={forestBg} alt="" className="absolute inset-0 w-full h-full object-cover object-center" style={{ opacity: 0.85 }} draggable={false} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,40,80,0.55) 0%, rgba(10,40,80,0.15) 100%)' }} />
        <div className="relative z-10 h-full flex flex-col items-center justify-center">
          <h1 className="font-black uppercase text-white drop-shadow-lg" style={{ fontSize: 44, letterSpacing: '0.06em', textShadow: '3px 3px 0 rgba(0,0,0,0.5)' }}>
            PRIMAL CLASH
          </h1>
          <p className="text-white/70 uppercase tracking-[0.35em] text-xs mt-1">Choose your prehistoric predator</p>
        </div>
      </div>

      {/* Selection area */}
      <div className="flex-1 px-4 pt-4 pb-4" style={{ background: '#d0d8e8', borderTop: '3px solid #8899bb' }}>
        <div className="grid grid-cols-2 gap-4 mb-4">

          {/* Player card */}
          <div className="select-card p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="font-black text-xs uppercase tracking-widest" style={{ color: '#2266cc' }}>Your Fighter</span>
              <div className="flex gap-1">
                {DINO_IDS.map(id => (
                  <button
                    key={`p-${id}`}
                    data-testid={`btn-player-${id}`}
                    onClick={() => setSelectedPlayer(id)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 4,
                      fontSize: 9,
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      border: selectedPlayer === id ? '2px solid #2266cc' : '2px solid #ccc',
                      background: selectedPlayer === id ? '#2266cc' : 'white',
                      color: selectedPlayer === id ? 'white' : '#888',
                      cursor: 'pointer',
                      transition: 'all 0.1s',
                      boxShadow: selectedPlayer === id ? '1px 1px 0 #1144aa' : '1px 1px 0 #ccc',
                    }}
                  >
                    {DINOSAURS[id].name.slice(0, 5)}
                  </button>
                ))}
              </div>
            </div>

            {/* Dino preview */}
            <div className="relative flex items-end justify-center mb-3 overflow-hidden" style={{ height: 130, background: 'linear-gradient(180deg, #c8ddf0 0%, #a8c4e0 100%)', borderRadius: 8, border: '1px solid #c8d4e4' }}>
              <DinoSvg
                dinoId={selectedPlayer}
                style={{ height: Math.round((playerDino.height / 4.0) * 65 + 65), width: 'auto', filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.25))', position: 'relative', zIndex: 2, marginBottom: 16 }}
              />
              {/* Ground strip */}
              <div className="absolute bottom-0 left-0 right-0" style={{ zIndex: 1 }}>
                <div style={{ height: 14, background: 'linear-gradient(180deg, #7dc847 0%, #5a9e2e 100%)', borderTop: '2px solid #4a8224' }} />
                <div style={{ height: 6, background: 'linear-gradient(180deg, #8B6914 0%, #6b4f0e 100%)' }} />
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-1">
              <p className="font-black text-sm uppercase" style={{ color: '#111', letterSpacing: '0.04em' }}>{playerDino.name}</p>
              <StatRow label="HP" value={playerDino.maxHp} color="#cc3322" />
              <StatRow label="Speed" value={playerDino.baseSpeed} color="#2266cc" />
              <StatRow label="Stamina" value={playerDino.maxStamina} color="#228844" />
              <StatRow label="Height" value={`${playerDino.height}m`} color="#886600" />
              <StatRow label="Bite Force" value={`${playerDino.biteForce.toLocaleString()} N`} color="#773399" />
            </div>
          </div>

          {/* Opponent card */}
          <div className="select-card p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="font-black text-xs uppercase tracking-widest" style={{ color: '#cc2222' }}>Opponent</span>
              <div className="flex gap-1">
                {DINO_IDS.map(id => (
                  <button
                    key={`o-${id}`}
                    data-testid={`btn-opponent-${id}`}
                    onClick={() => setSelectedOpponent(id)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 4,
                      fontSize: 9,
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      border: selectedOpponent === id ? '2px solid #cc2222' : '2px solid #ccc',
                      background: selectedOpponent === id ? '#cc2222' : 'white',
                      color: selectedOpponent === id ? 'white' : '#888',
                      cursor: 'pointer',
                      transition: 'all 0.1s',
                      boxShadow: selectedOpponent === id ? '1px 1px 0 #991111' : '1px 1px 0 #ccc',
                    }}
                  >
                    {DINOSAURS[id].name.slice(0, 5)}
                  </button>
                ))}
              </div>
            </div>

            {/* Dino preview */}
            <div className="relative flex items-end justify-center mb-3 overflow-hidden" style={{ height: 130, background: 'linear-gradient(180deg, #f0d8d4 0%, #dcc4c0 100%)', borderRadius: 8, border: '1px solid #e4c8c4' }}>
              <DinoSvg
                dinoId={selectedOpponent}
                flipped
                style={{ height: Math.round((opponentDino.height / 4.0) * 65 + 65), width: 'auto', filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.25))', position: 'relative', zIndex: 2, marginBottom: 16 }}
              />
              <div className="absolute bottom-0 left-0 right-0" style={{ zIndex: 1 }}>
                <div style={{ height: 14, background: 'linear-gradient(180deg, #7dc847 0%, #5a9e2e 100%)', borderTop: '2px solid #4a8224' }} />
                <div style={{ height: 6, background: 'linear-gradient(180deg, #8B6914 0%, #6b4f0e 100%)' }} />
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-1">
              <p className="font-black text-sm uppercase" style={{ color: '#111', letterSpacing: '0.04em' }}>{opponentDino.name}</p>
              <StatRow label="HP" value={opponentDino.maxHp} color="#cc3322" />
              <StatRow label="Speed" value={opponentDino.baseSpeed} color="#2266cc" />
              <StatRow label="Stamina" value={opponentDino.maxStamina} color="#228844" />
              <StatRow label="Height" value={`${opponentDino.height}m`} color="#886600" />
              <StatRow label="Bite Force" value={`${opponentDino.biteForce.toLocaleString()} N`} color="#773399" />
            </div>
          </div>
        </div>

        {/* Begin battle button */}
        <button
          data-testid="btn-begin-battle"
          onClick={handleStart}
          className="w-full"
          style={{
            background: 'linear-gradient(180deg, #4488ee 0%, #2266cc 100%)',
            border: '3px solid #1144aa',
            borderRadius: 10,
            boxShadow: '0 4px 0 #0d337f, inset 0 1px 0 rgba(255,255,255,0.25)',
            color: 'white',
            fontWeight: 900,
            fontSize: 18,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            padding: '14px 0',
            cursor: 'pointer',
            transition: 'all 0.08s',
          }}
          onMouseDown={e => (e.currentTarget.style.boxShadow = '0 1px 0 #0d337f')}
          onMouseUp={e => (e.currentTarget.style.boxShadow = '0 4px 0 #0d337f, inset 0 1px 0 rgba(255,255,255,0.25)')}
        >
          Begin Battle!
        </button>
      </div>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex justify-between items-center" style={{ borderBottom: '1px solid #eee', paddingBottom: 2 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 900, color }}>{value}</span>
    </div>
  );
}
