import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import * as THREE from 'three';

// ─── Seeded RNG ───────────────────────────────────────────────────────────────
function mkRng(seed: number) {
  let s = seed;
  return () => { s = (s ^ (s << 13)); s = (s ^ (s >> 7)); s = (s ^ (s << 17)); return (s >>> 0) / 0xFFFFFFFF; };
}

// ─── FOREST ARENA ─────────────────────────────────────────────────────────────
interface ATreeData { x: number; z: number; sc: number; lc: string; }
const FOREST_L_TREES: ATreeData[] = (() => {
  const r = mkRng(123);
  const lcs = ['#0a3a08', '#1a5a1a', '#0d4a0a', '#2a7a2a'];
  return Array.from({ length: 14 }, () => ({
    x: -(5 + r() * 10), z: -(1 + r() * 22),
    sc: 1.3 + r() * 2.2, lc: lcs[Math.floor(r() * lcs.length)],
  }));
})();
const FOREST_R_TREES: ATreeData[] = (() => {
  const r = mkRng(456);
  const lcs = ['#0a3a08', '#1a5a1a', '#0d4a0a', '#2a7a2a'];
  return Array.from({ length: 14 }, () => ({
    x: 5 + r() * 10, z: -(1 + r() * 22),
    sc: 1.3 + r() * 2.2, lc: lcs[Math.floor(r() * lcs.length)],
  }));
})();
const FOREST_BG_TREES: ATreeData[] = (() => {
  const r = mkRng(789);
  const lcs = ['#0a3808', '#134a12', '#1a5a1a'];
  return Array.from({ length: 18 }, () => ({
    x: (r() * 2 - 1) * 18, z: -(14 + r() * 20),
    sc: 0.9 + r() * 1.8, lc: lcs[Math.floor(r() * lcs.length)],
  }));
})();

function ArenaTree({ x, z, sc, lc }: ATreeData) {
  const lc2 = lc === '#0a3a08' || lc === '#0a3808' ? '#0a4a0a' : '#1a7a1a';
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, sc, 0]}>
        <cylinderGeometry args={[sc * 0.18, sc * 0.3, sc * 2, 6]} />
        <meshLambertMaterial color="#4a2a08" />
      </mesh>
      <mesh position={[0, sc * 3.5, 0]}>
        <coneGeometry args={[sc * 1.55, sc * 3.5, 8]} />
        <meshLambertMaterial color={lc} />
      </mesh>
      <mesh position={[0, sc * 5.7, 0]}>
        <coneGeometry args={[sc * 0.9, sc * 2.3, 7]} />
        <meshLambertMaterial color={lc2} />
      </mesh>
    </group>
  );
}

function ForestScene() {
  return (
    <>
      <fog attach="fog" args={['#1e3820', 10, 60]} />
      <Sky sunPosition={[4, 6, -18]} turbidity={7} rayleigh={0.3} />
      <ambientLight intensity={0.5} color="#88cc99" />
      <directionalLight position={[3, 20, 8]} intensity={0.9} color="#bce8aa" />
      <directionalLight position={[-5, 8, -12]} intensity={0.3} color="#336622" />
      {/* Ground */}
      <mesh position={[0, 0, -10]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshLambertMaterial color="#2a5018" />
      </mesh>
      {/* Moss patches */}
      {[[-4, 4], [-7, 9], [5, 6], [9, 12], [-3, 14], [2, 18], [-9, 18], [7, 20]].map(([x, z], i) => (
        <mesh key={i} position={[x!, 0.02, z!]} rotation={[-Math.PI / 2, 0, 0]} scale={[2 + i * 0.3, 2 + i * 0.25, 1]}>
          <circleGeometry args={[1, 12]} />
          <meshBasicMaterial color="#1a4010" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {[...FOREST_L_TREES, ...FOREST_R_TREES, ...FOREST_BG_TREES].map((t, i) => (
        <ArenaTree key={i} {...t} />
      ))}
    </>
  );
}

// ─── VOLCANO ARENA ────────────────────────────────────────────────────────────
const LAVA_POS: [number, number][] = [[-8, 3], [-5, 6], [3, 4], [7, 7], [-3, 9], [5, 10], [-7, 13], [2, 15], [-1, 2], [6, 2], [-10, 7], [9, 11]];

function PulsingLava({ x, z }: { x: number; z: number }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.emissiveIntensity = 1 + Math.sin(clock.elapsedTime * 1.8 + x) * 0.7;
  });
  const r = 0.7 + Math.abs(x * z * 0.03);
  return (
    <mesh position={[x, 0.05, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[r, 10]} />
      <meshStandardMaterial ref={matRef} color="#cc2200" emissive="#ff5500" emissiveIntensity={1.5} side={THREE.DoubleSide} />
    </mesh>
  );
}

function VolcanoBgSmoke({ offset }: { offset: number }) {
  const mRef  = useRef<THREE.Mesh>(null!);
  const matRef = useRef<THREE.MeshBasicMaterial>(null!);
  useFrame(({ clock }) => {
    const t = (clock.elapsedTime * 0.7 + offset) % 5;
    if (mRef.current) {
      mRef.current.position.set((offset - 2.5) * 0.4, 18 + t * 3, -22);
      mRef.current.scale.setScalar(0.5 + t * 0.5);
    }
    if (matRef.current) matRef.current.opacity = Math.max(0, 0.35 - t * 0.07);
  });
  return (
    <mesh ref={mRef}>
      <sphereGeometry args={[1.5, 7, 7]} />
      <meshBasicMaterial ref={matRef} color="#3a2a2a" transparent opacity={0.3} />
    </mesh>
  );
}

function VolcanoScene() {
  return (
    <>
      <fog attach="fog" args={['#1a0606', 6, 55]} />
      <ambientLight intensity={0.3} color="#cc4400" />
      <directionalLight position={[0, 25, -15]} intensity={0.7} color="#ff6600" />
      <pointLight position={[0, 3, 2]}  intensity={5} color="#ff4400" distance={45} decay={2} />
      <pointLight position={[-6, 1, 8]} intensity={2} color="#ff6600" distance={20} decay={2} />
      <pointLight position={[6,  1, 6]} intensity={2} color="#ff6600" distance={20} decay={2} />
      {/* Rocky ground */}
      <mesh position={[0, 0, -8]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshLambertMaterial color="#1a0804" />
      </mesh>
      {/* Volcano cone background */}
      <mesh position={[0, 13, -22]}>
        <coneGeometry args={[14, 26, 10]} />
        <meshLambertMaterial color="#0a0402" />
      </mesh>
      {/* Crater glow */}
      <mesh position={[0, 26.2, -22]}>
        <cylinderGeometry args={[3, 4, 0.6, 12]} />
        <meshStandardMaterial color="#ff4400" emissive="#ff4400" emissiveIntensity={4} />
      </mesh>
      {/* Side volcanoes */}
      <mesh position={[-14, 8, -20]}>
        <coneGeometry args={[8, 16, 9]} />
        <meshLambertMaterial color="#0d0502" />
      </mesh>
      <mesh position={[14, 7, -18]}>
        <coneGeometry args={[7, 14, 9]} />
        <meshLambertMaterial color="#0d0502" />
      </mesh>
      {/* Lava patches */}
      {LAVA_POS.map(([x, z], i) => <PulsingLava key={i} x={x} z={z} />)}
      {/* Smoke */}
      {Array.from({ length: 6 }, (_, i) => <VolcanoBgSmoke key={i} offset={i * (5 / 6)} />)}
      {/* Rock formations */}
      {[[-9, 4], [-12, 9], [-8, 15], [9, 5], [12, 10], [8, 14]].map(([x, z], i) => (
        <mesh key={i} position={[x!, 1.5 + i * 0.2, z!]}>
          <boxGeometry args={[2.2, 3 + i * 0.4, 2.0]} />
          <meshLambertMaterial color="#1a0c04" />
        </mesh>
      ))}
    </>
  );
}

// ─── STONE ARENA ─────────────────────────────────────────────────────────────
function StonePillar({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 3.2, 0]}>
        <cylinderGeometry args={[0.55, 0.65, 6.4, 8]} />
        <meshLambertMaterial color="#7a7060" />
      </mesh>
      <mesh position={[0, 6.6, 0]}>
        <boxGeometry args={[1.3, 0.55, 1.3]} />
        <meshLambertMaterial color="#8a8070" />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[1.3, 0.3, 1.3]} />
        <meshLambertMaterial color="#8a8070" />
      </mesh>
    </group>
  );
}

function TorchFlame({ x, y, z }: { x: number; y: number; z: number }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.emissiveIntensity = 1.5 + Math.sin(clock.elapsedTime * 6 + x) * 0.7;
  });
  return (
    <mesh position={[x, y, z]}>
      <coneGeometry args={[0.25, 0.6, 7]} />
      <meshStandardMaterial ref={matRef} color="#ffaa33" emissive="#ff8800" emissiveIntensity={2} />
    </mesh>
  );
}

function ArenaScene() {
  return (
    <>
      <fog attach="fog" args={['#a09080', 18, 75]} />
      <Sky sunPosition={[10, 28, -8]} turbidity={2} rayleigh={0.28} />
      <ambientLight intensity={0.6} color="#d4c8a8" />
      <directionalLight position={[10, 30, -10]} intensity={1.2} color="#ffe8c0" />
      <pointLight position={[-8, 6, 5]}  intensity={2.0} color="#ffaa44" distance={22} decay={2} />
      <pointLight position={[ 8, 6, 5]}  intensity={2.0} color="#ffaa44" distance={22} decay={2} />
      {/* Sand floor */}
      <mesh position={[0, 0, -5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshLambertMaterial color="#b0a080" />
      </mesh>
      {/* Arena pit circle */}
      <mesh position={[0, 0.02, 3]} rotation={[-Math.PI / 2, 0, 0]} scale={[13, 13, 1]}>
        <circleGeometry args={[1, 40]} />
        <meshLambertMaterial color="#c0b090" />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, 4, -14]}>
        <boxGeometry args={[34, 8, 1.8]} />
        <meshLambertMaterial color="#807060" />
      </mesh>
      <mesh position={[0, 8.3, -14]}>
        <boxGeometry args={[34, 0.9, 1.4]} />
        <meshLambertMaterial color="#908070" />
      </mesh>
      {/* Side walls */}
      <mesh position={[-15, 4, -3]}>
        <boxGeometry args={[1.8, 8, 26]} />
        <meshLambertMaterial color="#807060" />
      </mesh>
      <mesh position={[15, 4, -3]}>
        <boxGeometry args={[1.8, 8, 26]} />
        <meshLambertMaterial color="#807060" />
      </mesh>
      {/* Pillars */}
      {[[-10, -3], [-10, 4], [-10, 11], [10, -3], [10, 4], [10, 11]].map(([x, z], i) => (
        <StonePillar key={i} x={x!} z={z!} />
      ))}
      {/* Torches */}
      {[[-8, -2], [8, -2], [-8, 10], [8, 10]].map(([x, z], i) => (
        <group key={i}>
          <mesh position={[x!, 5.5, z!]}>
            <cylinderGeometry args={[0.1, 0.14, 1.2, 6]} />
            <meshLambertMaterial color="#5a4020" />
          </mesh>
          <TorchFlame x={x!} y={6.4} z={z!} />
          <pointLight position={[x!, 6.3, z!]} intensity={1.5} color="#ffaa44" distance={14} decay={2} />
        </group>
      ))}
      {/* Floor pattern lines */}
      {[-8, -4, 0, 4, 8].map((x, i) => (
        <mesh key={i} position={[x, 0.03, 3]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.15, 24]} />
          <meshBasicMaterial color="#988878" transparent opacity={0.5} />
        </mesh>
      ))}
    </>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
type GameMode = '1v1' | 'team' | 'hunt';

export function ArenaBackground3D({ mode }: { mode: GameMode }) {
  return (
    <Canvas
      camera={{ position: [0, 9, 20], fov: 62, near: 0.1, far: 200 }}
      gl={{ antialias: true, alpha: false }}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    >
      {mode === 'hunt' && <ForestScene />}
      {mode === 'team' && <VolcanoScene />}
      {mode === '1v1'  && <ArenaScene />}
    </Canvas>
  );
}
