import { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { GameContext } from '@/App';
import { DinoId, DINOSAURS } from '@/lib/dino-data';
import { HunterSvg } from '@/components/hunter-svg';
import { DinoSvg } from '@/components/dino-svg';
import { motion, AnimatePresence } from 'framer-motion';

interface LairDef {
  dinoId: DinoId;
  x: number;
  y: number;
  zone: string;
  label: string;
}

const LAIRS: LairDef[] = [
  { dinoId: 'velociraptor',   x: 16,  y: 22,  zone: 'jungle',     label: 'Dense Jungle' },
  { dinoId: 'spinosaurus',    x: 18,  y: 73,  zone: 'swamp',      label: 'Murky Swamp' },
  { dinoId: 'pterodactylus',  x: 50,  y: 48,  zone: 'plains',     label: 'Open Plains' },
  { dinoId: 'trex',           x: 80,  y: 20,  zone: 'highlands',  label: 'Highlands' },
  { dinoId: 'giganotosaurus', x: 81,  y: 76,  zone: 'volcano',    label: 'Volcano Ridge' },
];

const ENCOUNTER_RADIUS = 12;
const DETECT_RADIUS = 22;
const SPEED = 0.35;

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

const ZONE_STYLES: Record<string, React.CSSProperties> = {
  jungle: {
    background: 'radial-gradient(ellipse at 25% 25%, #1a4a1a 0%, #2d6b2d 40%, transparent 75%)',
  },
  swamp: {
    background: 'radial-gradient(ellipse at 20% 75%, #1a3020 0%, #3d5a2a 35%, transparent 70%)',
  },
  plains: {
    background: 'radial-gradient(ellipse at 50% 52%, #8aac44 0%, #a8cc5a 25%, transparent 60%)',
  },
  highlands: {
    background: 'radial-gradient(ellipse at 80% 20%, #666a70 0%, #888c90 30%, transparent 65%)',
  },
  volcano: {
    background: 'radial-gradient(ellipse at 80% 78%, #6a1a08 0%, #992b10 30%, transparent 65%)',
  },
};

function ZoneDecorations({ zone }: { zone: string }) {
  if (zone === 'jungle') return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full pointer-events-none opacity-70">
      {[[20,40],[60,15],[35,80],[80,60],[15,110],[50,130]].map(([x,y],i)=>(
        <g key={i} transform={`translate(${x},${y})`}>
          <polygon points="0,-18 -14,8 14,8" fill="#1a6a1a"/>
          <polygon points="0,-25 -10,0 10,0" fill="#228822"/>
          <rect x="-2" y="8" width="4" height="8" fill="#5a3010"/>
        </g>
      ))}
      {[[100,40],[140,90],[170,50]].map(([x,y],i)=>(
        <g key={`b${i}`} transform={`translate(${x},${y})`}>
          <circle r="18" fill="#1a5a1a" opacity="0.7"/>
          <circle r="14" cx="8" fill="#228822" opacity="0.7"/>
        </g>
      ))}
    </svg>
  );
  if (zone === 'swamp') return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full pointer-events-none opacity-60">
      {[[20,60],[55,90],[30,120],[70,140],[10,170]].map(([x,y],i)=>(
        <ellipse key={i} cx={x} cy={y} rx="28" ry="10" fill="#1a4a28" opacity="0.5"/>
      ))}
      {[[40,50],[80,100],[20,140]].map(([x,y],i)=>(
        <g key={`r${i}`} transform={`translate(${x},${y})`}>
          <rect x="-2" y="-24" width="4" height="24" fill="#4a6a2a"/>
          <ellipse cx="0" cy="-26" rx="8" ry="4" fill="#6a8a3a"/>
        </g>
      ))}
      <ellipse cx="70" cy="155" rx="50" ry="20" fill="#1a3820" opacity="0.4"/>
    </svg>
  );
  if (zone === 'highlands') return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full pointer-events-none opacity-60">
      <polygon points="90,160 140,60 190,160" fill="#4a4e54" opacity="0.6"/>
      <polygon points="120,160 160,80 200,160" fill="#5a5e64" opacity="0.5"/>
      <polygon points="60,160 100,90 140,160" fill="#3a3e44" opacity="0.7"/>
      {[[100,150],[130,145],[170,155]].map(([x,y],i)=>(
        <ellipse key={i} cx={x} cy={y} rx="14" ry="6" fill="#555" opacity="0.4"/>
      ))}
    </svg>
  );
  if (zone === 'volcano') return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full pointer-events-none opacity-70">
      <polygon points="60,180 130,50 200,180" fill="#4a1208" opacity="0.7"/>
      {[[90,80],[120,100],[80,130]].map(([x,y],i)=>(
        <path key={i} d={`M${x},${y} Q${x+10},${y-10} ${x+20},${y+5}`} stroke="#ff6600" strokeWidth="3" fill="none" opacity="0.6"/>
      ))}
      {[[70,160],[110,155],[150,165]].map(([x,y],i)=>(
        <ellipse key={i} cx={x} cy={y} rx="18" ry="7" fill="#cc4400" opacity="0.5"/>
      ))}
      <circle cx="130" cy="70" r="12" fill="#ff4400" opacity="0.4"/>
      <circle cx="130" cy="70" r="7" fill="#ff8800" opacity="0.6"/>
    </svg>
  );
  if (zone === 'plains') return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full pointer-events-none opacity-50">
      {[[30,90],[70,110],[120,80],[160,100],[40,140],[100,150]].map(([x,y],i)=>(
        <g key={i} transform={`translate(${x},${y})`}>
          <line x1="0" y1="0" x2="-5" y2="-14" stroke="#6a8a2a" strokeWidth="2"/>
          <line x1="0" y1="0" x2="0" y2="-18" stroke="#5a7a1a" strokeWidth="2"/>
          <line x1="0" y1="0" x2="5" y2="-12" stroke="#6a8a2a" strokeWidth="2"/>
        </g>
      ))}
    </svg>
  );
  return null;
}

export default function OpenWorld() {
  const ctx = useContext(GameContext);
  const containerRef = useRef<HTMLDivElement>(null);

  const posRef = useRef({ x: 50, y: 50 });
  const keysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number>(0);
  const nearbyTimerRef = useRef<Record<string, NodeJS.Timeout>>({});

  const [playerPos, setPlayerPos] = useState({ x: 50, y: 50 });
  const [facingLeft, setFacingLeft] = useState(false);
  const [nearbyDinos, setNearbyDinos] = useState<Set<DinoId>>(new Set());
  const [encounterable, setEncounterable] = useState<DinoId | null>(null);
  const [encounterFlash, setEncounterFlash] = useState<DinoId | null>(null);

  const state = ctx?.state;
  const capturedDinos = state?.capturedDinos ?? [];
  const remainingWild = state?.huntRemainingWild ?? [];
  const fledDinos = state?.huntFledDinos ?? [];

  const getDinoStatus = useCallback((dinoId: DinoId): 'remaining' | 'captured' | 'fled' => {
    if (capturedDinos.includes(dinoId)) return 'captured';
    if (fledDinos.includes(dinoId)) return 'fled';
    return 'remaining';
  }, [capturedDinos, fledDinos]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const tick = () => {
      const keys = keysRef.current;
      let { x, y } = posRef.current;
      let moved = false;
      let newFacingLeft = facingRef.current;

      if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) {
        x -= SPEED; moved = true; newFacingLeft = true;
      }
      if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) {
        x += SPEED; moved = true; newFacingLeft = false;
      }
      if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) {
        y -= SPEED; moved = true;
      }
      if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) {
        y += SPEED; moved = true;
      }

      if (moved) {
        x = Math.max(3, Math.min(97, x));
        y = Math.max(3, Math.min(97, y));
        posRef.current = { x, y };
        facingRef.current = newFacingLeft;
        setPlayerPos({ x, y });
        setFacingLeft(newFacingLeft);

        const nearby = new Set<DinoId>();
        let enc: DinoId | null = null;
        for (const lair of LAIRS) {
          if (getDinoStatus(lair.dinoId) !== 'remaining') continue;
          const d = dist(x, y, lair.x, lair.y);
          if (d < DETECT_RADIUS) nearby.add(lair.dinoId);
          if (d < ENCOUNTER_RADIUS) enc = lair.dinoId;
        }
        setNearbyDinos(nearby);
        setEncounterable(enc);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [getDinoStatus]);

  const facingRef = useRef(false);

  const handleEngage = (dinoId: DinoId) => {
    setEncounterFlash(dinoId);
    setTimeout(() => {
      setEncounterFlash(null);
      ctx?.dispatch({ type: 'ENCOUNTER_DINO', wildDinoId: dinoId });
    }, 900);
  };

  if (!ctx || !state) return null;

  const allDone = remainingWild.length === 0 && capturedDinos.length + fledDinos.length >= LAIRS.length;

  return (
    <div className="flex-1 flex flex-col" style={{ minHeight: '100vh', background: '#1a2a0e', userSelect: 'none' }}>

      {/* Header */}
      <div style={{
        padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'linear-gradient(135deg, #0a1a06, #152808)',
        borderBottom: '3px solid #2d5a18', flexShrink: 0,
      }}>
        <div>
          <div className="font-black uppercase tracking-widest" style={{ color: '#88dd44', fontSize: 16 }}>
            🌿 OPEN WORLD
          </div>
          <div style={{ color: '#66aa33', fontSize: 10, fontWeight: 700 }}>
            Use WASD / Arrow Keys to move — find the dinosaurs!
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <div style={{ background: '#1a3a10', border: '2px solid #44aa22', borderRadius: 8, padding: '4px 10px', textAlign: 'center' }}>
            <div style={{ color: '#88dd44', fontSize: 9, fontWeight: 800, textTransform: 'uppercase' }}>Captured</div>
            <div style={{ color: '#aaffaa', fontSize: 18, fontWeight: 900, lineHeight: 1 }}>{capturedDinos.length}/{LAIRS.length}</div>
          </div>
        </div>
      </div>

      {/* World Map */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #2a4a18 0%, #3a6020 40%, #4a7028 100%)' }}
        tabIndex={0}
        onFocus={() => {}}
      >
        {/* Sky gradient */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg, #1a3a5a 0%, #2a5a2a 35%, #3a6a1a 100%)',
          pointerEvents: 'none'
        }}/>

        {/* Zone overlays */}
        {LAIRS.map(lair => (
          <div key={lair.dinoId} className="absolute inset-0 pointer-events-none"
            style={ZONE_STYLES[lair.zone]}/>
        ))}

        {/* Zone decorations */}
        {Object.keys(ZONE_STYLES).map(zone => (
          <div key={zone} className="absolute inset-0 pointer-events-none">
            <ZoneDecorations zone={zone} />
          </div>
        ))}

        {/* Zone labels */}
        {LAIRS.map(lair => (
          <div key={`label-${lair.dinoId}`}
            className="absolute pointer-events-none"
            style={{
              left: `${lair.x}%`, top: `${lair.y - 14}%`,
              transform: 'translateX(-50%)',
              fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'rgba(255,255,255,0.45)',
              textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
            }}>
            {lair.label}
          </div>
        ))}

        {/* Dino lairs */}
        {LAIRS.map(lair => {
          const status = getDinoStatus(lair.dinoId);
          const isNearby = nearbyDinos.has(lair.dinoId);
          const isEncounterable = encounterable === lair.dinoId;
          const d = dist(playerPos.x, playerPos.y, lair.x, lair.y);

          return (
            <div key={`lair-${lair.dinoId}`}
              className="absolute"
              style={{
                left: `${lair.x}%`, top: `${lair.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
              }}>

              {/* Encounter radius ring */}
              {status === 'remaining' && (
                <div className="absolute" style={{
                  width: `${ENCOUNTER_RADIUS * 2.2}px`, height: `${ENCOUNTER_RADIUS * 2.2}px`,
                  left: '50%', top: '50%',
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '50%',
                  border: isEncounterable ? '2px dashed #ffdd00' : isNearby ? '2px dashed rgba(255,200,0,0.4)' : '2px dashed rgba(255,255,255,0.08)',
                  pointerEvents: 'none',
                }}/>
              )}

              {status === 'captured' ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28 }}>🪤</div>
                  <div style={{
                    marginTop: 2, background: '#1a5522', border: '1px solid #44aa55',
                    borderRadius: 4, padding: '1px 6px', fontSize: 8, fontWeight: 800,
                    color: '#88ff88', textTransform: 'uppercase', whiteSpace: 'nowrap'
                  }}>✓ Captured</div>
                </div>
              ) : status === 'fled' ? (
                <div style={{ textAlign: 'center', opacity: 0.5 }}>
                  <div style={{ fontSize: 24 }}>💨</div>
                  <div style={{ fontSize: 8, color: '#ff8888', fontWeight: 800 }}>Fled</div>
                </div>
              ) : isEncounterable ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  style={{ textAlign: 'center' }}>
                  <motion.div
                    animate={{ rotate: [-8, 8, -8], y: [-3, 3, -3] }}
                    transition={{ duration: 0.5, repeat: Infinity }}>
                    <DinoSvg dinoId={lair.dinoId} style={{ height: 60, width: 'auto' }} flipped={true}/>
                  </motion.div>
                  <motion.button
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    onClick={() => handleEngage(lair.dinoId)}
                    style={{
                      marginTop: 4, padding: '4px 10px',
                      background: 'linear-gradient(135deg, #ffcc00, #ff8800)',
                      border: '2px solid #cc6600', borderRadius: 6,
                      fontWeight: 900, fontSize: 10, textTransform: 'uppercase',
                      cursor: 'pointer', letterSpacing: '0.06em',
                      boxShadow: '0 3px 0 #884400',
                      color: '#fff', whiteSpace: 'nowrap',
                    }}>
                    ⚔️ Engage!
                  </motion.button>
                </motion.div>
              ) : isNearby ? (
                <motion.div style={{ textAlign: 'center' }}
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1.2, repeat: Infinity }}>
                  <div style={{ fontSize: 22 }}>🌿🌿🌿</div>
                  <div style={{ fontSize: 8, fontWeight: 800, color: '#ffdd88', textShadow: '1px 1px 0 rgba(0,0,0,0.5)' }}>
                    Something's near...
                  </div>
                  <div style={{ fontSize: 7, color: '#ffaa44', fontWeight: 700 }}>
                    ({Math.round(d - ENCOUNTER_RADIUS)}% closer)
                  </div>
                </motion.div>
              ) : (
                <div style={{ textAlign: 'center', opacity: 0.4 }}>
                  <div style={{ fontSize: 20 }}>❓</div>
                </div>
              )}
            </div>
          );
        })}

        {/* Encounter flash */}
        <AnimatePresence>
          {encounterFlash && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.9, 0.7, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9 }}
              className="absolute inset-0 flex items-center justify-center"
              style={{ zIndex: 50, background: 'rgba(255,200,0,0.6)', pointerEvents: 'none' }}>
              <div style={{
                fontWeight: 900, fontSize: 32, color: 'white', textTransform: 'uppercase',
                textShadow: '3px 3px 0 rgba(0,0,0,0.5)', letterSpacing: '0.1em'
              }}>
                ⚔️ ENCOUNTER!
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Player character */}
        <div
          className="absolute"
          style={{
            left: `${playerPos.x}%`,
            top: `${playerPos.y}%`,
            transform: 'translate(-50%, -100%)',
            zIndex: 20,
            transition: 'left 0.04s linear, top 0.04s linear',
          }}>
          <HunterSvg
            topDown={true}
            flipped={facingLeft}
            style={{ width: 34, height: 34 }}
          />
          <div style={{
            textAlign: 'center', marginTop: -2, fontSize: 7, fontWeight: 800,
            color: '#ffff88', textShadow: '1px 1px 0 rgba(0,0,0,0.8)',
            whiteSpace: 'nowrap',
          }}>YOU</div>
        </div>

        {/* Compass / controls hint */}
        <div className="absolute bottom-3 right-3" style={{ zIndex: 30 }}>
          <div style={{
            background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 8, padding: '6px 10px', fontSize: 9, color: 'rgba(255,255,255,0.7)',
            fontWeight: 700, lineHeight: 1.6,
          }}>
            <div style={{ textAlign: 'center', marginBottom: 2 }}>   ▲  </div>
            <div>◀  WASD  ▶</div>
            <div style={{ textAlign: 'center' }}>   ▼  </div>
          </div>
        </div>

        {/* Hunt progress */}
        <div className="absolute bottom-3 left-3" style={{ zIndex: 30 }}>
          <div style={{
            background: 'rgba(0,0,0,0.65)', border: '1px solid #44aa22',
            borderRadius: 8, padding: '6px 10px',
          }}>
            <div style={{ fontSize: 8, fontWeight: 800, color: '#88dd44', textTransform: 'uppercase', marginBottom: 4 }}>
              Hunt Progress
            </div>
            <div className="flex gap-2 flex-wrap" style={{ maxWidth: 140 }}>
              {LAIRS.map(lair => {
                const st = getDinoStatus(lair.dinoId);
                return (
                  <div key={lair.dinoId} style={{
                    fontSize: 7, fontWeight: 800, textTransform: 'uppercase',
                    padding: '1px 5px', borderRadius: 3,
                    background: st === 'captured' ? '#1a5522' : st === 'fled' ? '#3a1a1a' : '#1a2a10',
                    color: st === 'captured' ? '#88ff88' : st === 'fled' ? '#ff8888' : '#aaaaaa',
                    border: `1px solid ${st === 'captured' ? '#44aa55' : st === 'fled' ? '#aa3333' : '#333'}`,
                  }}>
                    {st === 'captured' ? '✓ ' : st === 'fled' ? '✗ ' : '? '}
                    {lair.dinoId === 'velociraptor' ? 'Veloc' :
                     lair.dinoId === 'giganotosaurus' ? 'Gigan' :
                     lair.dinoId === 'spinosaurus' ? 'Spino' :
                     lair.dinoId === 'trex' ? 'T-Rex' : 'Ptero'}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Encounterable info panel */}
        {encounterable && getDinoStatus(encounterable) === 'remaining' && (
          <div className="absolute top-4 left-1/2" style={{ transform: 'translateX(-50%)', zIndex: 30 }}>
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              style={{
                background: 'rgba(0,0,0,0.8)', border: '2px solid #ffcc00',
                borderRadius: 10, padding: '6px 14px', textAlign: 'center',
              }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#ffdd00', textTransform: 'uppercase' }}>
                ⚔️ {DINOSAURS[encounterable].name} spotted!
              </div>
              <div style={{ fontSize: 9, color: '#ffaa44' }}>Click ENGAGE or press E</div>
            </motion.div>
          </div>
        )}

        {/* All done overlay */}
        {allDone && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 40, background: 'rgba(0,0,0,0.7)' }}>
            <motion.div
              initial={{ scale: 0.7 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
              style={{
                background: '#1a3010', border: '3px solid #44aa22',
                borderRadius: 16, padding: '24px 32px', textAlign: 'center',
              }}>
              <div style={{ fontSize: 48 }}>🏆</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#88ff44', textTransform: 'uppercase', marginBottom: 8 }}>
                Hunt Complete!
              </div>
              <div style={{ fontSize: 13, color: '#aaddaa', marginBottom: 16 }}>
                Captured: {capturedDinos.length} / {LAIRS.length} dinosaurs
              </div>
              <button
                onClick={() => ctx.dispatch({ type: 'RESET' })}
                style={{
                  padding: '10px 24px', background: 'linear-gradient(135deg, #44aa22, #228811)',
                  border: '2px solid #115500', borderRadius: 8,
                  color: 'white', fontWeight: 900, fontSize: 14, cursor: 'pointer',
                }}>
                Play Again
              </button>
            </motion.div>
          </div>
        )}
      </div>

      {/* Captured dinos strip */}
      {capturedDinos.length > 0 && (
        <div style={{
          padding: '8px 16px', background: 'linear-gradient(135deg, #0a1a06, #152808)',
          borderTop: '2px solid #2d5a18', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: '#66aa33', textTransform: 'uppercase' }}>Captured:</span>
          {capturedDinos.map(id => (
            <div key={id} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: '#1a4a10', border: '1px solid #44aa22', borderRadius: 6, padding: '2px 8px',
            }}>
              <DinoSvg dinoId={id} style={{ height: 24, width: 'auto' }}/>
              <span style={{ fontSize: 8, fontWeight: 800, color: '#88ff88', textTransform: 'uppercase' }}>
                {DINOSAURS[id].name.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
