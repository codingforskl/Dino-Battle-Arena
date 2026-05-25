import { useContext, useState } from 'react';
import { GameContext } from '@/App';
import { DINOSAURS, DinoId } from '@/lib/dino-data';
import { DinoSvg } from '@/components/dino-svg';
import forestBg from '../assets/forest-bg.png';

const DINO_IDS = Object.keys(DINOSAURS) as DinoId[];

const DINO_SHORT: Record<DinoId, string> = {
  velociraptor: 'VELOC',
  giganotosaurus: 'GIGAN',
  spinosaurus: 'SPINO',
  trex: 'T-REX',
  pterodactylus: 'PTERO',
};

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

          {/* Opponent card */}
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

        {/* Begin battle button */}
        <button
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

function DinoCard({
  label, accentColor, shadowColor, dinos, selected, onSelect, flipped, dino
}: {
  label: string;
  accentColor: string;
  shadowColor: string;
  dinos: DinoId[];
  selected: DinoId;
  onSelect: (id: DinoId) => void;
  flipped: boolean;
  dino: typeof DINOSAURS[DinoId];
}) {
  return (
    <div className="select-card p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="font-black text-xs uppercase tracking-widest" style={{ color: accentColor }}>{label}</span>
      </div>

      {/* Dino tabs — wrapping row */}
      <div className="flex flex-wrap gap-1 mb-3">
        {dinos.map(id => (
          <button
            key={id}
            onClick={() => onSelect(id)}
            style={{
              padding: '3px 8px',
              borderRadius: 4,
              fontSize: 9,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              border: selected === id ? `2px solid ${accentColor}` : '2px solid #ccc',
              background: selected === id ? accentColor : 'white',
              color: selected === id ? 'white' : '#888',
              cursor: 'pointer',
              transition: 'all 0.1s',
              boxShadow: selected === id ? `1px 1px 0 ${shadowColor}` : '1px 1px 0 #ccc',
            }}
          >
            {DINO_SHORT[id]}
          </button>
        ))}
      </div>

      {/* Dino preview */}
      <div className="relative flex items-end justify-center mb-3 overflow-hidden"
        style={{
          height: 130,
          background: flipped ? 'linear-gradient(180deg, #f0d8d4 0%, #dcc4c0 100%)' : 'linear-gradient(180deg, #c8ddf0 0%, #a8c4e0 100%)',
          borderRadius: 8,
          border: `1px solid ${flipped ? '#e4c8c4' : '#c8d4e4'}`
        }}>
        <DinoSvg
          dinoId={selected}
          flipped={flipped}
          style={{
            height: Math.round((dino.height / 4.0) * 65 + 65),
            width: 'auto',
            filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.25))',
            position: 'relative',
            zIndex: 2,
            marginBottom: 16,
          }}
        />
        {/* Ground strip */}
        <div className="absolute bottom-0 left-0 right-0" style={{ zIndex: 1 }}>
          <div style={{ height: 14, background: 'linear-gradient(180deg, #7dc847 0%, #5a9e2e 100%)', borderTop: '2px solid #4a8224' }} />
          <div style={{ height: 6, background: 'linear-gradient(180deg, #8B6914 0%, #6b4f0e 100%)' }} />
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-1">
        <p className="font-black text-sm uppercase" style={{ color: '#111', letterSpacing: '0.04em' }}>{dino.name}</p>
        <StatRow label="HP" value={dino.maxHp} color="#cc3322" />
        <StatRow label="Speed" value={dino.baseSpeed} color="#2266cc" />
        <StatRow label="Stamina" value={dino.maxStamina} color="#228844" />
        <StatRow label="Height" value={`${dino.height}m`} color="#886600" />
        <StatRow label="Bite Force" value={`${dino.biteForce.toLocaleString()} N`} color="#773399" />
        <StatRow label="Hide" value={dino.hideToughness.toUpperCase()} color={dino.hideToughness === 'high' ? '#cc2222' : dino.hideToughness === 'medium' ? '#cc7700' : '#228844'} />
      </div>

      {/* Ultimate preview */}
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
