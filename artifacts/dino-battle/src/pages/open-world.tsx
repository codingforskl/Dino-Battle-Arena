import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Sky } from '@react-three/drei';
import * as THREE from 'three';
import { GameContext } from '@/App';
import type { DinoId } from '@/lib/dino-data';
import { DINOSAURS } from '@/lib/dino-data';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────
interface LairDef { dinoId: DinoId; x: number; y: number; zone: string; label: string; }
type DinoStatus = 'remaining' | 'captured' | 'fled';

// ─── Constants ────────────────────────────────────────────────────────────────
const LAIRS: LairDef[] = [
  { dinoId: 'velociraptor',   x: 16, y: 22, zone: 'jungle',    label: 'Dense Jungle'    },
  { dinoId: 'spinosaurus',    x: 18, y: 73, zone: 'swamp',     label: 'Murky Swamp'     },
  { dinoId: 'pterodactylus',  x: 50, y: 48, zone: 'plains',    label: 'Open Plains'     },
  { dinoId: 'trex',           x: 80, y: 20, zone: 'highlands', label: 'Rocky Highlands' },
  { dinoId: 'giganotosaurus', x: 81, y: 76, zone: 'volcano',   label: 'Volcano Ridge'   },
];
const ENCOUNTER_RADIUS = 12;
const DETECT_RADIUS    = 22;
const SPEED            = 0.35;
function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

// ─── Seeded RNG ───────────────────────────────────────────────────────────────
function mkRng(seed: number) {
  let s = seed;
  return () => {
    s = (s ^ (s << 13)); s = (s ^ (s >> 7)); s = (s ^ (s << 17));
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

// ─── Static scene geometry data ──────────────────────────────────────────────
interface TreeData { x: number; z: number; sc: number; lc: string; tc: string; }

const JUNGLE_TREES: TreeData[] = (() => {
  const r = mkRng(42);
  const lcs = ['#0a3a08', '#1a5a1a', '#0d4a0a', '#2a7a2a', '#0a4410'];
  return Array.from({ length: 24 }, () => ({
    x: 16 + (r() * 2 - 1) * 22, z: 22 + (r() * 2 - 1) * 22,
    sc: 0.7 + r() * 1.7,
    lc: lcs[Math.floor(r() * lcs.length)],
    tc: r() > 0.5 ? '#3a1e0a' : '#5a3010',
  }));
})();

const BORDER_TREES: TreeData[] = (() => {
  const r = mkRng(77);
  const lcs = ['#1a5a1a', '#2a6a2a', '#154a15'];
  return Array.from({ length: 16 }, () => ({
    x: 30 + (r() * 2 - 1) * 14, z: 36 + (r() * 2 - 1) * 14,
    sc: 0.5 + r() * 1.1, lc: lcs[Math.floor(r() * lcs.length)], tc: '#5a3010',
  }));
})();

interface ReedData { x: number; z: number; s: number; }
const SWAMP_REEDS: ReedData[] = (() => {
  const r = mkRng(99);
  return Array.from({ length: 14 }, () => ({ x: 18 + (r() * 2 - 1) * 18, z: 73 + (r() * 2 - 1) * 18, s: 0.5 + r() * 1.1 }));
})();

interface RockData { x: number; z: number; sx: number; sy: number; sz: number; rot: number; }
const HIGHLAND_ROCKS: RockData[] = (() => {
  const r = mkRng(55);
  return Array.from({ length: 18 }, () => ({
    x: 80 + (r() * 2 - 1) * 20, z: 20 + (r() * 2 - 1) * 20,
    sx: 0.8 + r() * 2.6, sy: 0.4 + r() * 3.8, sz: 0.8 + r() * 2.6, rot: r() * Math.PI,
  }));
})();

interface LavaData { x: number; z: number; r: number; }
const LAVA_PATCHES: LavaData[] = (() => {
  const r = mkRng(111);
  return Array.from({ length: 12 }, () => ({ x: 81 + (r() * 2 - 1) * 16, z: 76 + (r() * 2 - 1) * 16, r: 0.8 + r() * 3 }));
})();

// ─── Tree ─────────────────────────────────────────────────────────────────────
function Tree({ x, z, sc = 1, lc, tc }: { x: number; z: number; sc?: number; lc: string; tc: string }) {
  const lc2 = lc === '#0a3a08' ? '#0a4a0a' : '#1a7a1a';
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, sc, 0]}>
        <cylinderGeometry args={[sc * 0.18, sc * 0.3, sc * 2, 6]} />
        <meshLambertMaterial color={tc} />
      </mesh>
      <mesh position={[0, sc * 3.4, 0]}>
        <coneGeometry args={[sc * 1.55, sc * 3.4, 8]} />
        <meshLambertMaterial color={lc} />
      </mesh>
      <mesh position={[0, sc * 5.6, 0]}>
        <coneGeometry args={[sc * 0.92, sc * 2.4, 7]} />
        <meshLambertMaterial color={lc2} />
      </mesh>
    </group>
  );
}

// ─── Rock ─────────────────────────────────────────────────────────────────────
function Rock({ x, z, sx = 1, sy = 1, sz = 1, rot = 0 }: RockData) {
  return (
    <mesh position={[x, sy, z]} rotation={[0, rot, 0.1]}>
      <boxGeometry args={[sx * 2, sy * 2, sz * 2]} />
      <meshLambertMaterial color="#5a5e64" />
    </mesh>
  );
}

// ─── Mountain ────────────────────────────────────────────────────────────────
function Mountain({ x, z, sc = 1 }: { x: number; z: number; sc?: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, sc * 9, 0]}>
        <coneGeometry args={[sc * 7, sc * 18, 8]} />
        <meshLambertMaterial color="#4a4e54" />
      </mesh>
      <mesh position={[0, sc * 18.5, 0]}>
        <coneGeometry args={[sc * 2.2, sc * 3.8, 7]} />
        <meshLambertMaterial color="#ddeeff" />
      </mesh>
    </group>
  );
}

// ─── Reed ─────────────────────────────────────────────────────────────────────
function Reed({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, s * 2, 0]}>
        <cylinderGeometry args={[s * 0.09, s * 0.13, s * 4, 5]} />
        <meshLambertMaterial color="#4a6a2a" />
      </mesh>
      <mesh position={[0, s * 4.4, 0]}>
        <cylinderGeometry args={[s * 0.28, s * 0.2, s * 0.9, 6]} />
        <meshLambertMaterial color="#8a6a2a" />
      </mesh>
    </group>
  );
}

// ─── Volcano ──────────────────────────────────────────────────────────────────
function VolcanoMesh() {
  const lavaTopRef = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (lavaTopRef.current) {
      const mat = lavaTopRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.5 + Math.sin(clock.elapsedTime * 2.2) * 0.9;
    }
  });
  return (
    <group position={[81, 0, 76]}>
      <mesh position={[0, 14, 0]}>
        <coneGeometry args={[17, 28, 10]} />
        <meshLambertMaterial color="#1a0a04" />
      </mesh>
      <mesh ref={lavaTopRef} position={[0, 28.1, 0]}>
        <cylinderGeometry args={[3.5, 4.5, 0.6, 12]} />
        <meshStandardMaterial color="#ff4400" emissive="#ff4400" emissiveIntensity={2} />
      </mesh>
      {LAVA_PATCHES.map((p, i) => (
        <mesh key={i} position={[p.x - 81, 0.12, p.z - 76]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[p.r, 10]} />
          <meshStandardMaterial color="#cc2200" emissive="#ff5500" emissiveIntensity={1.5} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Smoke particle ───────────────────────────────────────────────────────────
function SmokeParticle({ offset }: { offset: number }) {
  const mRef = useRef<THREE.Mesh>(null!);
  const matRef = useRef<THREE.MeshBasicMaterial>(null!);
  useFrame(({ clock }) => {
    const t = (clock.elapsedTime * 0.75 + offset) % 5;
    if (mRef.current) {
      mRef.current.position.set(81 + (t - 2.5) * 0.25, 28 + t * 3.5, 76 + (t - 2.5) * 0.15);
      mRef.current.scale.setScalar(0.4 + t * 0.48);
    }
    if (matRef.current) matRef.current.opacity = Math.max(0, 0.35 - t * 0.07);
  });
  return (
    <mesh ref={mRef}>
      <sphereGeometry args={[1.5, 8, 8]} />
      <meshBasicMaterial ref={matRef} color="#3a2a2a" transparent opacity={0.3} />
    </mesh>
  );
}

// ─── Dino lair marker ─────────────────────────────────────────────────────────
function DinoMarker({
  lair, status, isNearby, isEncounterable, distance, onEngage,
}: {
  lair: LairDef; status: DinoStatus;
  isNearby: boolean; isEncounterable: boolean;
  distance: number; onEngage: (id: DinoId) => void;
}) {
  const orbRef  = useRef<THREE.Mesh>(null!);
  const matRef  = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame(({ clock }) => {
    if (orbRef.current)  orbRef.current.rotation.y  += 0.016;
    if (matRef.current && status === 'remaining') {
      const t = clock.elapsedTime;
      matRef.current.emissiveIntensity =
        isEncounterable ? 2.4 + Math.sin(t * 5) * 1.0
        : isNearby     ? 1.2 + Math.sin(t * 2) * 0.4
        :                0.4;
    }
  });

  const color   = status === 'captured' ? '#44cc55' : status === 'fled' ? '#666688'
                : isEncounterable ? '#ffcc00' : isNearby ? '#ff8844' : '#994422';
  const emissive = status === 'captured' ? '#22aa33' : status === 'fled' ? '#333355'
                 : isEncounterable ? '#ffaa00' : isNearby ? '#ff5500' : '#441100';

  return (
    <group position={[lair.x, 0, lair.y]}>
      {/* Base pillar */}
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.75, 1.15, 4, 8]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.3} />
      </mesh>
      {/* Spinning orb */}
      {status === 'remaining' && (
        <mesh ref={orbRef} position={[0, 6.5, 0]}>
          <octahedronGeometry args={[1.7, 0]} />
          <meshStandardMaterial ref={matRef} color={color} emissive={emissive} emissiveIntensity={1} />
        </mesh>
      )}
      {/* Captured sphere */}
      {status === 'captured' && (
        <mesh position={[0, 5.5, 0]}>
          <sphereGeometry args={[1.3, 10, 10]} />
          <meshStandardMaterial color="#44cc55" emissive="#22aa33" emissiveIntensity={0.9} />
        </mesh>
      )}
      {/* Encounter ground ring */}
      {status === 'remaining' && isNearby && (
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[ENCOUNTER_RADIUS * 0.9, ENCOUNTER_RADIUS * 0.98, 40]} />
          <meshBasicMaterial
            color={isEncounterable ? '#ffdd00' : '#ff8800'}
            transparent opacity={isEncounterable ? 0.6 : 0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      {/* HTML UI overlay */}
      <Html
        position={[0, 10, 0]} center distanceFactor={45}
        style={{ pointerEvents: status === 'remaining' ? 'auto' : 'none', userSelect: 'none' }}
        occlude={false}
      >
        {status === 'captured' ? (
          <div style={{ background: 'rgba(10,50,20,0.9)', border: '1px solid #44cc55', borderRadius: 6, padding: '3px 10px', whiteSpace: 'nowrap', backdropFilter: 'blur(4px)' }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: '#88ff88' }}>✓ Captured</span>
          </div>
        ) : status === 'fled' ? (
          <div style={{ background: 'rgba(30,0,0,0.85)', border: '1px solid #aa3333', borderRadius: 6, padding: '3px 10px', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: '#ff8888' }}>💨 Fled</span>
          </div>
        ) : isEncounterable ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#ffdd00', textShadow: '0 0 10px #ff8800', marginBottom: 5, whiteSpace: 'nowrap' }}>
              ⚠️ {DINOSAURS[lair.dinoId].name}
            </div>
            <button
              onClick={() => onEngage(lair.dinoId)}
              style={{
                padding: '5px 14px',
                background: 'linear-gradient(135deg, #ffcc00, #ff7700)',
                border: '2px solid #cc5500', borderRadius: 7,
                fontWeight: 900, fontSize: 12, textTransform: 'uppercase',
                cursor: 'pointer', letterSpacing: '0.05em',
                boxShadow: '0 3px 0 #883300, 0 0 14px rgba(255,150,0,0.6)',
                color: '#fff', whiteSpace: 'nowrap',
              }}>
              ⚔️ Engage!
            </button>
          </div>
        ) : isNearby ? (
          <div style={{ background: 'rgba(0,0,0,0.75)', borderRadius: 8, padding: '4px 10px', border: '1px solid rgba(255,130,0,0.6)', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#ffdd88', whiteSpace: 'nowrap' }}>Something lurks near…</div>
            <div style={{ fontSize: 9, color: '#ffaa44' }}>{Math.round(distance - ENCOUNTER_RADIUS)} steps closer</div>
          </div>
        ) : (
          <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 4, padding: '2px 7px' }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>{lair.label}</span>
          </div>
        )}
      </Html>
    </group>
  );
}

// ─── Hunter mesh ──────────────────────────────────────────────────────────────
function HunterMesh({
  posRef, facingRef, movingRef,
}: {
  posRef:    React.MutableRefObject<{ x: number; y: number }>;
  facingRef: React.MutableRefObject<boolean>;
  movingRef: React.MutableRefObject<boolean>;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const bodyRef  = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.position.x = posRef.current.x;
    groupRef.current.position.z = posRef.current.y;
    groupRef.current.scale.x   = facingRef.current ? -1 : 1;
    if (bodyRef.current) {
      bodyRef.current.position.y = movingRef.current
        ? Math.abs(Math.sin(clock.elapsedTime * 9)) * 0.18
        : 0;
    }
  });
  return (
    <group ref={groupRef}>
      <group ref={bodyRef}>
        <mesh position={[-0.22, 0.65, 0]}><boxGeometry args={[0.28, 1.3, 0.28]} /><meshLambertMaterial color="#223366" /></mesh>
        <mesh position={[ 0.22, 0.65, 0]}><boxGeometry args={[0.28, 1.3, 0.28]} /><meshLambertMaterial color="#223366" /></mesh>
        <mesh position={[0, 1.75, 0]}><boxGeometry args={[0.92, 1.1, 0.5]} /><meshLambertMaterial color="#cc6622" /></mesh>
        <mesh position={[-0.66, 1.75, 0]}><boxGeometry args={[0.25, 0.9, 0.25]} /><meshLambertMaterial color="#cc6622" /></mesh>
        <mesh position={[ 0.66, 1.75, 0]}><boxGeometry args={[0.25, 0.9, 0.25]} /><meshLambertMaterial color="#cc6622" /></mesh>
        <mesh position={[0, 2.75, 0]}><boxGeometry args={[0.65, 0.65, 0.6]} /><meshLambertMaterial color="#e8a878" /></mesh>
        <mesh position={[0, 3.06, 0]}><cylinderGeometry args={[0.55, 0.55, 0.11, 10]} /><meshLambertMaterial color="#7a5818" /></mesh>
        <mesh position={[0, 3.42, 0]}><cylinderGeometry args={[0.29, 0.31, 0.6, 10]} /><meshLambertMaterial color="#7a5818" /></mesh>
      </group>
    </group>
  );
}

// ─── Camera rig ───────────────────────────────────────────────────────────────
function CameraRig({ posRef }: { posRef: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree();
  const tgt = useRef(new THREE.Vector3(50, 32, 78));
  const lkAt = useRef(new THREE.Vector3(50, 0, 50));
  useFrame(() => {
    const px = posRef.current.x, pz = posRef.current.y;
    tgt.current.set(px, 32, pz + 27);
    lkAt.current.set(px, 0, pz);
    camera.position.lerp(tgt.current, 0.07);
    camera.userData.lx = THREE.MathUtils.lerp(camera.userData.lx ?? px, px, 0.07);
    camera.userData.lz = THREE.MathUtils.lerp(camera.userData.lz ?? pz, pz, 0.07);
    camera.lookAt(camera.userData.lx, 0, camera.userData.lz);
  });
  return null;
}

// ─── Full 3D world scene ──────────────────────────────────────────────────────
function WorldScene({
  posRef, facingRef, movingRef,
  getDinoStatus, nearbyDinos, encounterable, playerPos, onEngage,
}: {
  posRef:    React.MutableRefObject<{ x: number; y: number }>;
  facingRef: React.MutableRefObject<boolean>;
  movingRef: React.MutableRefObject<boolean>;
  getDinoStatus: (id: DinoId) => DinoStatus;
  nearbyDinos: Set<DinoId>;
  encounterable: DinoId | null;
  playerPos: { x: number; y: number };
  onEngage: (id: DinoId) => void;
}) {
  return (
    <>
      <fog attach="fog" args={['#6a9a7a', 18, 165]} />
      <Sky sunPosition={[80, 55, 10]} turbidity={3} rayleigh={0.55} mieCoefficient={0.004} mieDirectionalG={0.8} />
      <ambientLight intensity={0.55} color="#b0ccee" />
      <directionalLight position={[80, 80, 30]} intensity={1.3} color="#ffe8c0" />
      <directionalLight position={[-30, 20, -20]} intensity={0.22} color="#889acc" />
      <pointLight position={[81, 6, 76]} intensity={3.5} color="#ff4400" distance={36} decay={2} />

      {/* Ground */}
      <mesh position={[50, 0, 50]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[115, 115]} />
        <meshLambertMaterial color="#3a6020" />
      </mesh>

      {/* Biome ground patches */}
      {[
        { x: 16, z: 22, sx: 24, sz: 22, c: '#1a4a10', o: 0.9 },
        { x: 18, z: 73, sx: 22, sz: 18, c: '#1a2e18', o: 0.9 },
        { x: 50, z: 48, sx: 28, sz: 24, c: '#8aac44', o: 0.75 },
        { x: 80, z: 20, sx: 26, sz: 22, c: '#5a5e64', o: 0.85 },
        { x: 81, z: 76, sx: 27, sz: 25, c: '#2a1008', o: 0.92 },
      ].map((p, i) => (
        <mesh key={i} position={[p.x, 0.02, p.z]} rotation={[-Math.PI / 2, 0, 0]} scale={[p.sx, p.sz, 1]}>
          <circleGeometry args={[1, 32]} />
          <meshBasicMaterial color={p.c} transparent opacity={p.o} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Jungle trees */}
      {JUNGLE_TREES.map((t, i) => <Tree key={`jt${i}`} x={t.x} z={t.z} sc={t.sc} lc={t.lc} tc={t.tc} />)}
      {BORDER_TREES.map((t, i)  => <Tree key={`bt${i}`} x={t.x} z={t.z} sc={t.sc} lc={t.lc} tc={t.tc} />)}

      {/* Swamp water */}
      <mesh position={[18, 0.04, 73]} rotation={[-Math.PI / 2, 0, 0]} scale={[14, 11, 1]}>
        <circleGeometry args={[1, 24]} />
        <meshStandardMaterial color="#0d2a18" transparent opacity={0.8} roughness={0.04} metalness={0.5} side={THREE.DoubleSide} />
      </mesh>
      {SWAMP_REEDS.map((r, i) => <Reed key={`rd${i}`} x={r.x} z={r.z} s={r.s} />)}

      {/* Highlands */}
      <Mountain x={83} z={13} sc={1.4} />
      <Mountain x={73} z={11} sc={0.9} />
      <Mountain x={91} z={21} sc={1.0} />
      {HIGHLAND_ROCKS.map((r, i) => <Rock key={`rk${i}`} {...r} />)}

      {/* Volcano */}
      <VolcanoMesh />
      {Array.from({ length: 7 }, (_, i) => <SmokeParticle key={`sp${i}`} offset={i * (5 / 7)} />)}

      {/* Dino lair markers */}
      {LAIRS.map(lair => (
        <DinoMarker
          key={lair.dinoId}
          lair={lair}
          status={getDinoStatus(lair.dinoId)}
          isNearby={nearbyDinos.has(lair.dinoId)}
          isEncounterable={encounterable === lair.dinoId}
          distance={dist(playerPos.x, playerPos.y, lair.x, lair.y)}
          onEngage={onEngage}
        />
      ))}

      {/* Hunter */}
      <HunterMesh posRef={posRef} facingRef={facingRef} movingRef={movingRef} />

      {/* Camera */}
      <CameraRig posRef={posRef} />
    </>
  );
}

// ─── Main OpenWorld component ─────────────────────────────────────────────────
export default function OpenWorld() {
  const ctx           = useContext(GameContext);
  const containerRef  = useRef<HTMLDivElement>(null);
  const posRef        = useRef({ x: 50, y: 50 });
  const facingRef     = useRef(false);
  const movingRef     = useRef(false);
  const keysRef       = useRef<Set<string>>(new Set());
  const rafRef        = useRef<number>(0);

  const [playerPos,    setPlayerPos]    = useState({ x: 50, y: 50 });
  const [nearbyDinos,  setNearbyDinos]  = useState<Set<DinoId>>(new Set());
  const [encounterable,setEncounterable] = useState<DinoId | null>(null);
  const [encounterFlash,setEncounterFlash] = useState<DinoId | null>(null);

  const state         = ctx?.state;
  const capturedDinos = state?.capturedDinos    ?? [];
  const remainingWild = state?.huntRemainingWild ?? [];
  const fledDinos     = state?.huntFledDinos     ?? [];

  const getDinoStatus = useCallback((id: DinoId): DinoStatus => {
    if (capturedDinos.includes(id)) return 'captured';
    if (fledDinos.includes(id))     return 'fled';
    return 'remaining';
  }, [capturedDinos, fledDinos]);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => { keysRef.current.add(e.key); e.preventDefault(); };
    const onUp   = (e: KeyboardEvent) =>   keysRef.current.delete(e.key);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup',   onUp);

    const tick = () => {
      const keys = keysRef.current;
      let { x, y } = posRef.current;
      let moved = false;
      let fl = facingRef.current;

      if (keys.has('ArrowLeft')  || keys.has('a') || keys.has('A')) { x -= SPEED; moved = true; fl = true;  }
      if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) { x += SPEED; moved = true; fl = false; }
      if (keys.has('ArrowUp')    || keys.has('w') || keys.has('W')) { y -= SPEED; moved = true; }
      if (keys.has('ArrowDown')  || keys.has('s') || keys.has('S')) { y += SPEED; moved = true; }

      movingRef.current = moved;

      if (moved) {
        x = Math.max(3, Math.min(97, x));
        y = Math.max(3, Math.min(97, y));
        posRef.current  = { x, y };
        facingRef.current = fl;
        setPlayerPos({ x, y });

        const nb = new Set<DinoId>();
        let enc: DinoId | null = null;
        for (const lair of LAIRS) {
          if (getDinoStatus(lair.dinoId) !== 'remaining') continue;
          const d = dist(x, y, lair.x, lair.y);
          if (d < DETECT_RADIUS)    nb.add(lair.dinoId);
          if (d < ENCOUNTER_RADIUS) enc = lair.dinoId;
        }
        setNearbyDinos(nb);
        setEncounterable(enc);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup',   onUp);
    };
  }, [getDinoStatus]);

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

      {/* ── Header ── */}
      <div style={{
        padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'linear-gradient(135deg, #0a1a06, #152808)',
        borderBottom: '3px solid #2d5a18', flexShrink: 0,
      }}>
        <div>
          <div className="font-black uppercase tracking-widest" style={{ color: '#88dd44', fontSize: 16 }}>🌿 OPEN WORLD</div>
          <div style={{ color: '#66aa33', fontSize: 10, fontWeight: 700 }}>Use WASD / Arrow Keys to explore the world</div>
        </div>
        <div style={{ background: '#1a3a10', border: '2px solid #44aa22', borderRadius: 8, padding: '4px 10px', textAlign: 'center' }}>
          <div style={{ color: '#88dd44', fontSize: 9, fontWeight: 800, textTransform: 'uppercase' }}>Captured</div>
          <div style={{ color: '#aaffaa', fontSize: 18, fontWeight: 900, lineHeight: 1 }}>{capturedDinos.length}/{LAIRS.length}</div>
        </div>
      </div>

      {/* ── 3D World ── */}
      <div ref={containerRef} className="flex-1 relative" style={{ background: '#6a9a7a', overflow: 'hidden' }} tabIndex={0}>
        <Canvas
          camera={{ position: [50, 32, 78], fov: 55, near: 0.1, far: 300 }}
          gl={{ antialias: true, alpha: false }}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          <WorldScene
            posRef={posRef}
            facingRef={facingRef}
            movingRef={movingRef}
            getDinoStatus={getDinoStatus}
            nearbyDinos={nearbyDinos}
            encounterable={encounterable}
            playerPos={playerPos}
            onEngage={handleEngage}
          />
        </Canvas>

        {/* Encounter flash */}
        <AnimatePresence>
          {encounterFlash && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.85, 0.65, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9 }}
              className="absolute inset-0 flex items-center justify-center"
              style={{ zIndex: 50, background: 'rgba(255,200,0,0.55)', pointerEvents: 'none' }}>
              <div style={{ fontWeight: 900, fontSize: 32, color: 'white', textTransform: 'uppercase', textShadow: '3px 3px 0 rgba(0,0,0,0.5)', letterSpacing: '0.1em' }}>
                ⚔️ ENCOUNTER!
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* All-done overlay */}
        {allDone && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 40, background: 'rgba(0,0,0,0.7)' }}>
            <motion.div
              initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}
              style={{ background: '#1a3010', border: '3px solid #44aa22', borderRadius: 16, padding: '24px 32px', textAlign: 'center' }}>
              <div style={{ fontSize: 48 }}>🏆</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#88ff44', textTransform: 'uppercase', marginBottom: 8 }}>Hunt Complete!</div>
              <div style={{ fontSize: 13, color: '#aaddaa', marginBottom: 16 }}>Captured: {capturedDinos.length} / {LAIRS.length}</div>
              <button
                onClick={() => ctx.dispatch({ type: 'RESET' })}
                style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #44aa22, #228811)', border: '2px solid #115500', borderRadius: 8, color: 'white', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
                Play Again
              </button>
            </motion.div>
          </div>
        )}

        {/* Controls hint */}
        <div className="absolute bottom-3 right-3" style={{ zIndex: 30, pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 10px', fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: 700, lineHeight: 1.6 }}>
            <div style={{ textAlign: 'center', marginBottom: 2 }}>   ▲  </div>
            <div>◀  WASD  ▶</div>
            <div style={{ textAlign: 'center' }}>   ▼  </div>
          </div>
        </div>

        {/* Hunt progress */}
        <div className="absolute bottom-3 left-3" style={{ zIndex: 30, pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(0,0,0,0.65)', border: '1px solid #44aa22', borderRadius: 8, padding: '6px 10px' }}>
            <div style={{ fontSize: 8, fontWeight: 800, color: '#88dd44', textTransform: 'uppercase', marginBottom: 4 }}>Hunt Progress</div>
            <div className="flex gap-2 flex-wrap" style={{ maxWidth: 140 }}>
              {LAIRS.map(lair => {
                const st = getDinoStatus(lair.dinoId);
                return (
                  <div key={lair.dinoId} style={{
                    fontSize: 7, fontWeight: 800, textTransform: 'uppercase', padding: '1px 5px', borderRadius: 3,
                    background: st === 'captured' ? '#1a5522' : st === 'fled' ? '#3a1a1a' : '#1a2a10',
                    color:      st === 'captured' ? '#88ff88' : st === 'fled' ? '#ff8888' : '#aaaaaa',
                    border: `1px solid ${st === 'captured' ? '#44aa55' : st === 'fled' ? '#aa3333' : '#333'}`,
                  }}>
                    {st === 'captured' ? '✓ ' : st === 'fled' ? '✗ ' : '? '}
                    {lair.dinoId === 'velociraptor' ? 'Veloc' : lair.dinoId === 'giganotosaurus' ? 'Gigan' : lair.dinoId === 'spinosaurus' ? 'Spino' : lair.dinoId === 'trex' ? 'T-Rex' : 'Ptero'}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Captured strip */}
      {capturedDinos.length > 0 && (
        <div style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #0a1a06, #152808)', borderTop: '2px solid #2d5a18', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: '#66aa33', textTransform: 'uppercase' }}>Captured:</span>
          {capturedDinos.map(id => (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#1a4a10', border: '1px solid #44aa22', borderRadius: 6, padding: '2px 8px' }}>
              <span style={{ fontSize: 8, fontWeight: 800, color: '#88ff88', textTransform: 'uppercase' }}>{DINOSAURS[id].name.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
