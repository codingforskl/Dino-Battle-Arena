import { useContext, useState } from 'react';
import { GameContext } from '@/App';
import { DINOSAURS, DinoId } from '@/lib/dino-data';
import { DinoSvg } from '@/components/dino-svg';
import { HunterSvg } from '@/components/hunter-svg';
import forestBg from '../assets/forest-bg.png';

const DINO_IDS = (Object.keys(DINOSAURS) as DinoId[]).filter(id => id !== 'hunter');

const DINO_SHORT: Partial<Record<DinoId, string>> = {
  velociraptor: 'VELOC',
  giganotosaurus: 'GIGAN',
  spinosaurus: 'SPINO',
  trex: 'T-REX',
  pterodactylus: 'PTERO',
};

export default function SelectScreen() {
  const ctx = useContext(GameContext);
  const [mode, setMode] = useState<'1v1' | 'team' | 'hunt'>('1v1');
  const [selectedPlayer, setSelectedPlayer] = useState<DinoId>('velociraptor');
  const [selectedOpponent, setSelectedOpponent] = useState<DinoId>('giganotosaurus');
  const [playerTeam, setPlayerTeam] = useState<DinoId[]>(['velociraptor', 'trex', 'spinosaurus']);

  if (!ctx) return null;

  const playerDino = DINOSAURS[selectedPlayer];
  const opponentDino = DINOSAURS[selectedOpponent];

  const handleStart = () => {
    if (mode === '1v1') {
      ctx.dispatch({ type: 'START_BATTLE', playerDino: selectedPlayer, opponentDino: selectedOpponent });
    } else if (mode === 'hunt') {
      ctx.dispatch({ type: 'START_EXPLORE' });
    } else {
      const shuffled = [...DINO_IDS].sort(() => Math.random() - 0.5);
      const opponentTeam = shuffled.slice(0, 3);
      ctx.dispatch({ type: 'START_TEAM_BATTLE', playerTeam, opponentTeam });
    }
  };

  const updateTeamSlot = (slot: number, dinoId: DinoId) => {
    setPlayerTeam(prev => {
      const next = [...prev];
      next[slot] = dinoId;
      return next;
    });
  };

  const modeBtn = (m: '1v1' | 'team' | 'hunt', label: string, icon: string, color: string, shadow: string) => (
    <button
      onClick={() => setMode(m)}
      style={{
        flex: 1, padding: '10px 0', borderRadius: 8,
        fontWeight: 900, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase',
        border: mode === m ? `2px solid ${color}` : '2px solid #aab8cc',
        background: mode === m ? `linear-gradient(180deg, ${color}dd 0%, ${color} 100%)` : 'white',
        color: mode === m ? 'white' : '#888', cursor: 'pointer',
        boxShadow: mode === m ? `0 3px 0 ${shadow}` : '0 2px 0 #aab8cc',
      }}
    >
      {icon} {label}
    </button>
  );

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

        {/* Mode toggle */}
        <div className="flex gap-2 mb-4">
          {modeBtn('1v1',  '1v1 Battle',    '⚔️',  '#2266cc', '#1144aa')}
          {modeBtn('team', 'Team Battle',   '🦕',  '#cc6600', '#884400')}
          {modeBtn('hunt', 'Wild Hunt',     '🌿',  '#228833', '#115522')}
        </div>

        {mode === '1v1' ? (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <DinoCard
              label="Your Fighter"
              accentColor="#2266cc"
              shadowColor="#1144aa"
              dinos={DINO_IDS}
              selected={selectedPlayer}
              onSelect={setSelectedPlayer}
              flipped={false}
              dino={playerDino}
            />
            <DinoCard
              label="Opponent"
              accentColor="#cc2222"
              shadowColor="#991111"
              dinos={DINO_IDS}
              selected={selectedOpponent}
              onSelect={setSelectedOpponent}
              flipped={true}
              dino={opponentDino}
            />
          </div>
        ) : mode === 'hunt' ? (
          <div className="mb-4">
            {/* Hunter character card */}
            <div className="rounded-xl p-4 mb-3" style={{ background: 'linear-gradient(135deg, #e8f8e8, #c8ecc8)', border: '2px solid #44aa55' }}>
              <p className="font-black text-xs uppercase tracking-widest mb-2" style={{ color: '#115522' }}>🌿 Your Character</p>
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 flex items-center justify-center rounded-xl"
                  style={{ width: 96, height: 120, background: 'linear-gradient(180deg, #c8ddf0 0%, #a8c4e0 100%)', border: '2px solid #88bbdd' }}>
                  <HunterSvg style={{ height: 104, width: 'auto' }} />
                </div>
                <div className="flex-1">
                  <p className="font-black text-base uppercase" style={{ color: '#115522', letterSpacing: '0.06em' }}>The Hunter</p>
                  <p className="text-[10px] mb-2" style={{ color: '#337744' }}>Expert tracker with tranq darts, snare nets & field traps</p>
                  <div className="space-y-1">
                    <StatRow label="HP" value={DINOSAURS.hunter.maxHp} color="#cc3322" />
                    <StatRow label="Speed" value={DINOSAURS.hunter.baseSpeed} color="#2266cc" />
                    <StatRow label="Stamina" value={DINOSAURS.hunter.maxStamina} color="#228844" />
                  </div>
                  <div className="mt-2 p-2 rounded" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid #88cc88' }}>
                    <p className="font-black text-[9px] uppercase" style={{ color: '#884400' }}>⚡ HUNTER'S GAMBIT (Ultimate)</p>
                    <p className="text-[8px]" style={{ color: '#337744' }}>Full weapon assault — massive damage</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Open world info */}
            <div className="rounded-xl p-3" style={{ background: 'linear-gradient(135deg, #fff0e8, #ffe0cc)', border: '2px solid #cc8800' }}>
              <p className="font-black text-xs uppercase tracking-widest mb-1" style={{ color: '#884400' }}>🗺️ Open World Exploration</p>
              <p className="text-[10px]" style={{ color: '#775500', lineHeight: 1.5 }}>
                Explore a living wilderness map to <strong>find all 5 dinosaurs hiding in their territories</strong>.
                Move with <strong>WASD or arrow keys</strong>. When close enough, engage them in battle!
                Weaken to <strong>&lt;30% HP</strong>, then throw your net to capture.
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <p className="font-black text-xs uppercase tracking-widest mb-2" style={{ color: '#2266cc' }}>
              Build Your Team — 3 Dinosaurs
            </p>
            {playerTeam.map((dinoId, slotIdx) => (
              <div key={slotIdx} className="select-card p-3 mb-2 flex items-center gap-3">
                <div className="flex-shrink-0 flex items-center justify-center rounded-full font-black text-white text-sm"
                  style={{ width: 28, height: 28, background: '#2266cc', border: '2px solid #1144aa' }}>
                  {slotIdx + 1}
                </div>
                <div className="flex items-center gap-2" style={{ width: 90, flexShrink: 0 }}>
                  <DinoSvg dinoId={dinoId} flipped={false}
                    style={{ height: 44, width: 'auto', filter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.2))' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-xs uppercase truncate" style={{ color: '#111' }}>{DINOSAURS[dinoId].name}</p>
                  <p className="text-[10px]" style={{ color: '#666' }}>HP {DINOSAURS[dinoId].maxHp} · SPD {DINOSAURS[dinoId].baseSpeed}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {DINO_IDS.map(id => (
                      <button key={id} onClick={() => updateTeamSlot(slotIdx, id)}
                        style={{
                          padding: '2px 5px', borderRadius: 3, fontSize: 8, fontWeight: 900,
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                          border: dinoId === id ? '1px solid #2266cc' : '1px solid #ccc',
                          background: dinoId === id ? '#2266cc' : 'white',
                          color: dinoId === id ? 'white' : '#888', cursor: 'pointer',
                        }}>
                        {DINO_SHORT[id] ?? id.slice(0,5).toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            <div className="select-card p-3 mt-1"
              style={{ background: 'linear-gradient(135deg, #fff0e8, #ffe0cc)', border: '2px solid #cc8800' }}>
              <p className="font-black text-xs uppercase tracking-widest mb-1" style={{ color: '#884400' }}>Opponent Team</p>
              <p className="text-[10px]" style={{ color: '#775500' }}>3 random dinosaurs — revealed when battle starts!</p>
              <div className="flex gap-3 mt-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className="flex items-center justify-center rounded-lg font-black text-2xl"
                    style={{ width: 52, height: 52, background: '#cc8800', border: '2px solid #886600', color: 'rgba(255,255,255,0.8)' }}>?</div>
                ))}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleStart}
          className="w-full"
          style={{
            background: mode === 'hunt'
              ? 'linear-gradient(180deg, #44aa55 0%, #228833 100%)'
              : mode === 'team'
              ? 'linear-gradient(180deg, #ee8844 0%, #cc6600 100%)'
              : 'linear-gradient(180deg, #4488ee 0%, #2266cc 100%)',
            border: mode === 'hunt' ? '3px solid #115522' : mode === 'team' ? '3px solid #884400' : '3px solid #1144aa',
            borderRadius: 10,
            boxShadow: mode === 'hunt' ? '0 4px 0 #0a3a15, inset 0 1px 0 rgba(255,255,255,0.25)'
              : mode === 'team' ? '0 4px 0 #552200, inset 0 1px 0 rgba(255,255,255,0.25)'
              : '0 4px 0 #0d337f, inset 0 1px 0 rgba(255,255,255,0.25)',
            color: 'white', fontWeight: 900, fontSize: 18, letterSpacing: '0.15em',
            textTransform: 'uppercase', padding: '14px 0', cursor: 'pointer', transition: 'all 0.08s',
          }}
          onMouseDown={e => (e.currentTarget.style.transform = 'translateY(3px)')}
          onMouseUp={e => (e.currentTarget.style.transform = '')}
        >
          {mode === 'hunt' ? '🌿 Begin Wild Hunt!' : mode === 'team' ? 'Begin Team Battle!' : 'Begin Battle!'}
        </button>
      </div>
    </div>
  );
}

function DinoCard({
  label, accentColor, shadowColor, dinos, selected, onSelect, flipped, dino
}: {
  label: string; accentColor: string; shadowColor: string;
  dinos: DinoId[]; selected: DinoId; onSelect: (id: DinoId) => void;
  flipped: boolean; dino: typeof DINOSAURS[DinoId];
}) {
  return (
    <div className="select-card p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="font-black text-xs uppercase tracking-widest" style={{ color: accentColor }}>{label}</span>
      </div>
      <div className="flex flex-wrap gap-1 mb-3">
        {dinos.map(id => (
          <button key={id} onClick={() => onSelect(id)}
            style={{
              padding: '3px 8px', borderRadius: 4, fontSize: 9, fontWeight: 900,
              textTransform: 'uppercase', letterSpacing: '0.05em',
              border: selected === id ? `2px solid ${accentColor}` : '2px solid #ccc',
              background: selected === id ? accentColor : 'white',
              color: selected === id ? 'white' : '#888', cursor: 'pointer', transition: 'all 0.1s',
              boxShadow: selected === id ? `1px 1px 0 ${shadowColor}` : '1px 1px 0 #ccc',
            }}>
            {id === 'velociraptor' ? 'VELOC' : id === 'giganotosaurus' ? 'GIGAN' : id === 'spinosaurus' ? 'SPINO' : id === 'trex' ? 'T-REX' : 'PTERO'}
          </button>
        ))}
      </div>
      <div className="relative flex items-end justify-center mb-3 overflow-hidden"
        style={{
          height: 160,
          background: flipped ? 'linear-gradient(180deg, #f0d8d4 0%, #dcc4c0 100%)' : 'linear-gradient(180deg, #c8ddf0 0%, #a8c4e0 100%)',
          borderRadius: 8, border: `1px solid ${flipped ? '#e4c8c4' : '#c8d4e4'}`
        }}>
        <DinoSvg dinoId={selected} flipped={flipped}
          style={{ height: Math.round((dino.height / 4.0) * 65 + 65), width: 'auto',
            filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.25))', position: 'relative', zIndex: 2, marginBottom: 16 }} />
        <div className="absolute bottom-0 left-0 right-0" style={{ zIndex: 1 }}>
          <div style={{ height: 14, background: 'linear-gradient(180deg, #7dc847 0%, #5a9e2e 100%)', borderTop: '2px solid #4a8224' }} />
          <div style={{ height: 6, background: 'linear-gradient(180deg, #8B6914 0%, #6b4f0e 100%)' }} />
        </div>
      </div>
      <div className="space-y-1">
        <p className="font-black text-sm uppercase" style={{ color: '#111', letterSpacing: '0.04em' }}>{dino.name}</p>
        <StatRow label="HP" value={dino.maxHp} color="#cc3322" />
        <StatRow label="Speed" value={dino.baseSpeed} color="#2266cc" />
        <StatRow label="Stamina" value={dino.maxStamina} color="#228844" />
        <StatRow label="Height" value={`${dino.height}m`} color="#886600" />
        <StatRow label="Bite Force" value={`${dino.biteForce.toLocaleString()} N`} color="#773399" />
        <StatRow label="Hide" value={dino.hideToughness.toUpperCase()} color={dino.hideToughness === 'high' ? '#cc2222' : dino.hideToughness === 'medium' ? '#cc7700' : '#228844'} />
      </div>
      {(() => {
        const ult = dino.abilities.find(a => a.isUltimate);
        if (!ult) return null;
        return (
          <div className="mt-2 px-2 py-1 rounded" style={{ background: 'linear-gradient(135deg, #fff8e0, #ffe070)', border: '1px solid #cc8800' }}>
            <div className="flex items-center gap-1">
              <span style={{ fontSize: 10 }}>⚡</span>
              <span className="font-black text-[9px] uppercase" style={{ color: '#884400' }}>{ult.name}</span>
              <span className="ml-auto text-[9px] font-mono" style={{ color: '#997700' }}>{ult.staminaCost}ST</span>
            </div>
            <p className="text-[8px] mt-0.5" style={{ color: '#775500', lineHeight: 1.3 }}>{ult.description}</p>
          </div>
        );
      })()}
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
