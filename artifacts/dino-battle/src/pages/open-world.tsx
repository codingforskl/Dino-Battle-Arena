import React, { useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { GameContext } from '@/App';
import type { DinoId } from '@/lib/dino-data';
import { DINOSAURS } from '@/lib/dino-data';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types & Constants ────────────────────────────────────────────────────────
interface LairDef { dinoId: DinoId; x: number; y: number; }
type DinoStatus = 'remaining' | 'captured' | 'fled';

const LAIRS: LairDef[] = [
  { dinoId: 'velociraptor',   x: 16, y: 22 },
  { dinoId: 'spinosaurus',    x: 18, y: 73 },
  { dinoId: 'pterodactylus',  x: 50, y: 48 },
  { dinoId: 'trex',           x: 80, y: 20 },
  { dinoId: 'giganotosaurus', x: 81, y: 76 },
];
const ENCOUNTER_RADIUS = 12;
const DETECT_RADIUS    = 22;
const SPEED            = 0.38;
const EYE_HEIGHT       = 1.8;

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}

// ─── Seeded RNG ───────────────────────────────────────────────────────────────
function mkRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13; s ^= s >> 7; s ^= s << 17;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

// ─── Static scene data ────────────────────────────────────────────────────────
interface TreeDef { x: number; z: number; h: number; dark: boolean; }
const WORLD_TREES: TreeDef[] = (() => {
  const rng = mkRng(42);
  const out: TreeDef[] = [];
  for (let i = 0; i < 160; i++) {
    const x = 2 + rng() * 96, z = 2 + rng() * 96;
    if (LAIRS.some(l => dist(x, z, l.x, l.y) < 9)) continue;
    if (dist(x, z, 50, 50) < 5) continue;
    // skip sparse highland/plains area occasionally
    if (x > 62 && z < 42 && rng() > 0.35) continue;
    out.push({ x, z, h: 5 + rng() * 18, dark: rng() > 0.5 });
  }
  return out;
})();

interface FireflyDef { x: number; z: number; y: number; phase: number; speed: number; }
const FIREFLY_DEFS: FireflyDef[] = (() => {
  const rng = mkRng(77);
  return Array.from({ length: 55 }, () => ({
    x: 3 + rng() * 94, z: 3 + rng() * 94,
    y: 1.2 + rng() * 4,
    phase: rng() * Math.PI * 2,
    speed: 0.4 + rng() * 0.8,
  }));
})();

// ─── Shared materials ─────────────────────────────────────────────────────────
const MATS = {
  trunkD:  new THREE.MeshLambertMaterial({ color: '#3a1e0a' }),
  trunkL:  new THREE.MeshLambertMaterial({ color: '#5a3010' }),
  leafD:   new THREE.MeshLambertMaterial({ color: '#091f07' }),
  leafL:   new THREE.MeshLambertMaterial({ color: '#112e0e' }),
  ground:  new THREE.MeshLambertMaterial({ color: '#0c1a09' }),
  fogPlane:new THREE.MeshBasicMaterial({ color: '#1a2e1a', transparent: true, opacity: 0.2, depthWrite: false }),
};

// ─── Tree ─────────────────────────────────────────────────────────────────────
function Tree({ x, z, h, dark }: TreeDef) {
  const tH  = h * 0.42;
  const cS  = tH * 0.7;
  const tm  = dark ? MATS.trunkD : MATS.trunkL;
  const lm  = dark ? MATS.leafD  : MATS.leafL;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, tH / 2, 0]} material={tm}><cylinderGeometry args={[0.18, 0.28, tH, 6]} /></mesh>
      <mesh position={[0, cS + h * 0.22, 0]} material={lm}><coneGeometry args={[h * 0.28, h * 0.46, 8]} /></mesh>
      <mesh position={[0, cS + h * 0.49, 0]} material={lm}><coneGeometry args={[h * 0.19, h * 0.34, 7]} /></mesh>
      <mesh position={[0, cS + h * 0.69, 0]} material={lm}><coneGeometry args={[h * 0.10, h * 0.22, 6]} /></mesh>
    </group>
  );
}

// ─── Firefly ──────────────────────────────────────────────────────────────────
function Firefly({ x, z, y, phase, speed }: FireflyDef) {
  const mRef  = useRef<THREE.Mesh>(null!);
  const matRef= useRef<THREE.MeshStandardMaterial>(null!);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (mRef.current) {
      mRef.current.position.set(
        x + Math.sin(t * speed * 0.41 + phase) * 0.5,
        y + Math.sin(t * speed + phase) * 0.6,
        z + Math.cos(t * speed * 0.37 + phase) * 0.5,
      );
    }
    if (matRef.current) {
      matRef.current.emissiveIntensity = Math.max(0, Math.sin(t * 2.2 * speed + phase * 3.7) * 1.8 + 0.3);
    }
  });
  return (
    <mesh ref={mRef}>
      <sphereGeometry args={[0.07, 5, 5]} />
      <meshStandardMaterial ref={matRef} color="#bbff44" emissive="#88ff22" emissiveIntensity={1.5} />
    </mesh>
  );
}

// ─── Ground fog layer ─────────────────────────────────────────────────────────
function GroundFog() {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.18 + Math.sin(clock.getElapsedTime() * 0.13) * 0.05;
  });
  return (
    <mesh ref={ref} position={[50, 0.35, 50]} rotation={[-Math.PI / 2, 0, 0]} material={MATS.fogPlane}>
      <planeGeometry args={[115, 115]} />
    </mesh>
  );
}

// ─── Dino bodies ──────────────────────────────────────────────────────────────
const EYE_MAT_RED  = new THREE.MeshStandardMaterial({ color: '#ff1100', emissive: '#ff0000', emissiveIntensity: 5, toneMapped: false });
const EYE_MAT_YEL  = new THREE.MeshStandardMaterial({ color: '#ffcc00', emissive: '#ffaa00', emissiveIntensity: 4, toneMapped: false });
const EYE_MAT_ORG  = new THREE.MeshStandardMaterial({ color: '#ff5500', emissive: '#ff5500', emissiveIntensity: 6, toneMapped: false });
const EYE_MAT_AMB  = new THREE.MeshStandardMaterial({ color: '#ff8800', emissive: '#ff6600', emissiveIntensity: 3, toneMapped: false });

function VelociraptorBody() {
  const c = '#3a4a1a'; const cd = '#2a3a10';
  return (
    <group scale={4.5}>
      <mesh position={[-0.18, 0.5, 0]}><cylinderGeometry args={[0.12, 0.1, 1.0, 6]}/><meshLambertMaterial color={c}/></mesh>
      <mesh position={[ 0.18, 0.5, 0]}><cylinderGeometry args={[0.12, 0.1, 1.0, 6]}/><meshLambertMaterial color={c}/></mesh>
      <mesh position={[-0.18, 0.1, 0.2]}><boxGeometry args={[0.2, 0.12, 0.5]}/><meshLambertMaterial color={cd}/></mesh>
      <mesh position={[ 0.18, 0.1, 0.2]}><boxGeometry args={[0.2, 0.12, 0.5]}/><meshLambertMaterial color={cd}/></mesh>
      <mesh position={[0, 1.1, 0]} rotation={[0.3, 0, 0]}><boxGeometry args={[0.65, 0.55, 1.0]}/><meshLambertMaterial color={c}/></mesh>
      <mesh position={[0, 1.55, 0.35]} rotation={[-0.4, 0, 0]}><cylinderGeometry args={[0.18, 0.22, 0.55, 7]}/><meshLambertMaterial color={c}/></mesh>
      <mesh position={[0, 1.85, 0.7]}><boxGeometry args={[0.38, 0.3, 0.7]}/><meshLambertMaterial color={c}/></mesh>
      <mesh position={[0, 1.68, 1.0]}><boxGeometry args={[0.28, 0.18, 0.45]}/><meshLambertMaterial color={cd}/></mesh>
      <mesh position={[-0.15, 1.93, 0.98]} material={EYE_MAT_RED}><sphereGeometry args={[0.06, 7, 7]}/></mesh>
      <mesh position={[ 0.15, 1.93, 0.98]} material={EYE_MAT_RED}><sphereGeometry args={[0.06, 7, 7]}/></mesh>
      <mesh position={[0, 1.0, -0.8]} rotation={[-0.5, 0, 0]}><cylinderGeometry args={[0.04, 0.2, 1.4, 6]}/><meshLambertMaterial color={c}/></mesh>
      <mesh position={[-0.35, 1.35, 0.4]} rotation={[0, 0, 0.5]}><cylinderGeometry args={[0.06, 0.04, 0.42, 5]}/><meshLambertMaterial color={c}/></mesh>
      <mesh position={[ 0.35, 1.35, 0.4]} rotation={[0, 0, -0.5]}><cylinderGeometry args={[0.06, 0.04, 0.42, 5]}/><meshLambertMaterial color={c}/></mesh>
    </group>
  );
}

function SpinosaurusBody() {
  const c = '#2a5a3a'; const cd = '#1a4028';
  return (
    <group scale={9}>
      <mesh position={[-0.2, 0.55, 0]}><cylinderGeometry args={[0.16, 0.14, 1.1, 7]}/><meshLambertMaterial color={c}/></mesh>
      <mesh position={[ 0.2, 0.55, 0]}><cylinderGeometry args={[0.16, 0.14, 1.1, 7]}/><meshLambertMaterial color={c}/></mesh>
      <mesh position={[0, 1.25, 0]} rotation={[0.2, 0, 0]}><boxGeometry args={[0.75, 0.65, 1.1]}/><meshLambertMaterial color={c}/></mesh>
      {[-0.3,-0.12,0.08,0.28].map((ox, i) => (
        <mesh key={i} position={[ox, 1.68 + i * 0.07, -0.1]}><boxGeometry args={[0.06, 0.62 + i * 0.1, 0.22]}/><meshLambertMaterial color="#3a7a5a"/></mesh>
      ))}
      <mesh position={[0, 1.82, 0.35]} rotation={[-0.3, 0, 0]}><cylinderGeometry args={[0.2, 0.25, 0.6, 7]}/><meshLambertMaterial color={c}/></mesh>
      <mesh position={[0, 2.02, 0.82]}><boxGeometry args={[0.42, 0.32, 1.0]}/><meshLambertMaterial color={c}/></mesh>
      <mesh position={[0, 1.86, 1.26]}><boxGeometry args={[0.34, 0.2, 0.6]}/><meshLambertMaterial color={cd}/></mesh>
      <mesh position={[-0.16, 2.09, 1.24]} material={EYE_MAT_YEL}><sphereGeometry args={[0.07, 7, 7]}/></mesh>
      <mesh position={[ 0.16, 2.09, 1.24]} material={EYE_MAT_YEL}><sphereGeometry args={[0.07, 7, 7]}/></mesh>
      <mesh position={[0, 1.18, -0.9]} rotation={[-0.5, 0, 0]}><cylinderGeometry args={[0.05, 0.28, 1.8, 6]}/><meshLambertMaterial color={c}/></mesh>
    </group>
  );
}

function PterodactylusBody() {
  const c = '#5a4a7a'; const cw = '#3a2a5a';
  return (
    <group scale={7} position={[0, 7, 0]}>
      <mesh position={[0, 0, 0]}><boxGeometry args={[0.5, 0.35, 0.55]}/><meshLambertMaterial color={c}/></mesh>
      <mesh position={[0, 0.25, 0.25]} rotation={[-0.5, 0, 0]}><cylinderGeometry args={[0.12, 0.18, 0.4, 6]}/><meshLambertMaterial color={c}/></mesh>
      <mesh position={[0, 0.3, 0.65]}><boxGeometry args={[0.1, 0.1, 0.6]}/><meshLambertMaterial color="#7a7a2a"/></mesh>
      <mesh position={[-1.1, -0.05, -0.1]} rotation={[0.1, 0, 0.12]}><boxGeometry args={[1.8, 0.04, 0.72]}/><meshLambertMaterial color={cw}/></mesh>
      <mesh position={[ 1.1, -0.05, -0.1]} rotation={[0.1, 0, -0.12]}><boxGeometry args={[1.8, 0.04, 0.72]}/><meshLambertMaterial color={cw}/></mesh>
      <mesh position={[-1.52, -0.15, 0.0]} rotation={[0.15, 0, 0.22]}><boxGeometry args={[0.9, 0.03, 0.5]}/><meshLambertMaterial color={cw}/></mesh>
      <mesh position={[ 1.52, -0.15, 0.0]} rotation={[0.15, 0, -0.22]}><boxGeometry args={[0.9, 0.03, 0.5]}/><meshLambertMaterial color={cw}/></mesh>
      <mesh position={[-0.18, 0.28, 0.5]} material={EYE_MAT_AMB}><sphereGeometry args={[0.07, 7, 7]}/></mesh>
      <mesh position={[ 0.18, 0.28, 0.5]} material={EYE_MAT_AMB}><sphereGeometry args={[0.07, 7, 7]}/></mesh>
    </group>
  );
}

function TRexBody() {
  const c = '#4a5022'; const cd = '#30380e'; const cs = '#5a6a2a';
  return (
    <group scale={12}>
      <mesh position={[-0.22, 0.48, 0]}><cylinderGeometry args={[0.14, 0.12, 0.96, 7]}/><meshLambertMaterial color={c}/></mesh>
      <mesh position={[ 0.22, 0.48, 0]}><cylinderGeometry args={[0.14, 0.12, 0.96, 7]}/><meshLambertMaterial color={c}/></mesh>
      <mesh position={[-0.22, 0.06, 0.14]}><boxGeometry args={[0.2, 0.1, 0.4]}/><meshLambertMaterial color={cd}/></mesh>
      <mesh position={[ 0.22, 0.06, 0.14]}><boxGeometry args={[0.2, 0.1, 0.4]}/><meshLambertMaterial color={cd}/></mesh>
      <mesh position={[0, 1.06, -0.05]}><boxGeometry args={[0.68, 0.4, 0.55]}/><meshLambertMaterial color={c}/></mesh>
      <mesh position={[0, 1.4, 0.12]} rotation={[0.18, 0, 0]}><boxGeometry args={[0.72, 0.65, 0.9]}/><meshLambertMaterial color={cs}/></mesh>
      <mesh position={[-0.38, 1.62, 0.5]} rotation={[0.6, 0, 0.4]}><cylinderGeometry args={[0.055, 0.04, 0.32, 5]}/><meshLambertMaterial color={c}/></mesh>
      <mesh position={[ 0.38, 1.62, 0.5]} rotation={[0.6, 0, -0.4]}><cylinderGeometry args={[0.055, 0.04, 0.32, 5]}/><meshLambertMaterial color={c}/></mesh>
      <mesh position={[0, 1.9, 0.32]} rotation={[-0.35, 0, 0]}><cylinderGeometry args={[0.2, 0.28, 0.65, 8]}/><meshLambertMaterial color={cs}/></mesh>
      <mesh position={[0, 2.3, 0.72]}><boxGeometry args={[0.65, 0.55, 1.0]}/><meshLambertMaterial color={cs}/></mesh>
      <mesh position={[0, 2.13, 1.14]}><boxGeometry args={[0.55, 0.22, 0.6]}/><meshLambertMaterial color={c}/></mesh>
      <mesh position={[0, 1.97, 1.06]}><boxGeometry args={[0.48, 0.16, 0.55]}/><meshLambertMaterial color={cd}/></mesh>
      {[-0.2,-0.1,0,0.1,0.2].map((ox, i) => (
        <mesh key={i} position={[ox, 2.01, 1.3]}><coneGeometry args={[0.025, 0.09, 4]}/><meshLambertMaterial color="#eeeebb"/></mesh>
      ))}
      <mesh position={[-0.24, 2.4, 1.04]} material={EYE_MAT_RED}><sphereGeometry args={[0.07, 8, 8]}/></mesh>
      <mesh position={[ 0.24, 2.4, 1.04]} material={EYE_MAT_RED}><sphereGeometry args={[0.07, 8, 8]}/></mesh>
      <mesh position={[0, 1.0, -0.87]} rotation={[-0.55, 0, 0]}><cylinderGeometry args={[0.06, 0.32, 1.7, 7]}/><meshLambertMaterial color={c}/></mesh>
    </group>
  );
}

function GiganotosaurusBody() {
  const c = '#4a1a08'; const cd = '#2a0e04'; const cs = '#6a2a10';
  return (
    <group scale={15}>
      <mesh position={[-0.24, 0.5, 0]}><cylinderGeometry args={[0.16, 0.14, 1.0, 7]}/><meshLambertMaterial color={c}/></mesh>
      <mesh position={[ 0.24, 0.5, 0]}><cylinderGeometry args={[0.16, 0.14, 1.0, 7]}/><meshLambertMaterial color={c}/></mesh>
      <mesh position={[-0.24, 0.06, 0.15]}><boxGeometry args={[0.22, 0.1, 0.42]}/><meshLambertMaterial color={cd}/></mesh>
      <mesh position={[ 0.24, 0.06, 0.15]}><boxGeometry args={[0.22, 0.1, 0.42]}/><meshLambertMaterial color={cd}/></mesh>
      <mesh position={[0, 1.08, -0.04]}><boxGeometry args={[0.7, 0.45, 0.6]}/><meshLambertMaterial color={c}/></mesh>
      <mesh position={[0, 1.44, 0.14]} rotation={[0.15, 0, 0]}><boxGeometry args={[0.78, 0.7, 0.95]}/><meshLambertMaterial color={cs}/></mesh>
      <mesh position={[-0.42, 1.67, 0.52]} rotation={[0.6, 0, 0.4]}><cylinderGeometry args={[0.06, 0.04, 0.34, 5]}/><meshLambertMaterial color={c}/></mesh>
      <mesh position={[ 0.42, 1.67, 0.52]} rotation={[0.6, 0, -0.4]}><cylinderGeometry args={[0.06, 0.04, 0.34, 5]}/><meshLambertMaterial color={c}/></mesh>
      <mesh position={[0, 1.97, 0.34]} rotation={[-0.3, 0, 0]}><cylinderGeometry args={[0.22, 0.3, 0.7, 8]}/><meshLambertMaterial color={cs}/></mesh>
      <mesh position={[0, 2.4, 0.76]}><boxGeometry args={[0.7, 0.6, 1.1]}/><meshLambertMaterial color={cs}/></mesh>
      <mesh position={[0, 2.22, 1.2]}><boxGeometry args={[0.58, 0.24, 0.65]}/><meshLambertMaterial color={c}/></mesh>
      <mesh position={[0, 2.04, 1.12]}><boxGeometry args={[0.5, 0.18, 0.58]}/><meshLambertMaterial color={cd}/></mesh>
      <mesh position={[-0.26, 2.5, 1.08]} material={EYE_MAT_ORG}><sphereGeometry args={[0.08, 8, 8]}/></mesh>
      <mesh position={[ 0.26, 2.5, 1.08]} material={EYE_MAT_ORG}><sphereGeometry args={[0.08, 8, 8]}/></mesh>
      <mesh position={[0, 1.02, -0.92]} rotation={[-0.5, 0, 0]}><cylinderGeometry args={[0.07, 0.36, 1.9, 7]}/><meshLambertMaterial color={c}/></mesh>
    </group>
  );
}

// Eye glow heights for each dino (world units)
const DINO_EYE_Y: Record<DinoId, number> = {
  velociraptor: 8, spinosaurus: 18, pterodactylus: 56, trex: 28, giganotosaurus: 37, hunter: 0,
};
const DINO_EYE_COLOR: Record<DinoId, string> = {
  velociraptor: '#ff1100', spinosaurus: '#ffaa00', pterodactylus: '#ff8800', trex: '#ff0000', giganotosaurus: '#ff5500', hunter: '#ffffff',
};

// ─── Animated dino ────────────────────────────────────────────────────────────
function ScaryDino({
  lair, status, isNearby, isEncounterable, playerPosRef,
}: {
  lair: LairDef; status: DinoStatus;
  isNearby: boolean; isEncounterable: boolean;
  playerPosRef: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const groupRef  = useRef<THREE.Group>(null!);
  const breathRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    const pp = playerPosRef.current;
    const dx = pp.x - lair.x;
    const dz = pp.y - lair.y;
    const angle = Math.atan2(dx, dz);
    if (groupRef.current && status === 'remaining') {
      const speed = isNearby ? 0.055 : 0.009;
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, angle, speed);
    }
    if (breathRef.current) {
      const t = clock.getElapsedTime();
      breathRef.current.scale.y = 1 + Math.sin(t * 0.85) * 0.022;
    }
  });

  if (status !== 'remaining') return null;
  const eyeH  = DINO_EYE_Y[lair.dinoId]  ?? 10;
  const eyeC  = DINO_EYE_COLOR[lair.dinoId] ?? '#ff0000';
  const eyeI  = isEncounterable ? 5 : isNearby ? 3 : 1.2;
  const eyeD  = isNearby ? 35 : 20;

  const Body =
    lair.dinoId === 'velociraptor'   ? <VelociraptorBody /> :
    lair.dinoId === 'spinosaurus'    ? <SpinosaurusBody /> :
    lair.dinoId === 'pterodactylus'  ? <PterodactylusBody /> :
    lair.dinoId === 'trex'           ? <TRexBody /> :
    <GiganotosaurusBody />;

  return (
    <group ref={groupRef} position={[lair.x, 0, lair.y]}>
      <group ref={breathRef}>{Body}</group>
      <pointLight position={[0, eyeH, 2.5]} intensity={eyeI} color={eyeC} distance={eyeD} decay={2} />
    </group>
  );
}

// ─── Volcano ──────────────────────────────────────────────────────────────────
function VolcanoMesh() {
  const lavaRef = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (lavaRef.current) {
      (lavaRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.2 + Math.sin(clock.getElapsedTime() * 2.1) * 1.1;
    }
  });
  return (
    <group position={[81, 0, 76]}>
      <mesh position={[0, 15, 0]}><coneGeometry args={[18, 30, 10]}/><meshLambertMaterial color="#0d0502"/></mesh>
      <mesh ref={lavaRef} position={[0, 30.2, 0]}><cylinderGeometry args={[3.5, 4.5, 0.6, 12]}/><meshStandardMaterial color="#ff4400" emissive="#ff4400" emissiveIntensity={2}/></mesh>
      <pointLight position={[0, 6, 0]} intensity={6} color="#ff4400" distance={60} decay={1.5} />
    </group>
  );
}

// ─── Captured / fled markers ──────────────────────────────────────────────────
function CapturedMarker({ x, z, status }: { x: number; z: number; status: 'captured' | 'fled' }) {
  const col = status === 'captured' ? '#44cc55' : '#888899';
  const em  = status === 'captured' ? '#22aa33' : '#444466';
  return (
    <mesh position={[x, 1.5, z]}>
      <cylinderGeometry args={[0.5, 0.7, 3, 7]} />
      <meshStandardMaterial color={col} emissive={em} emissiveIntensity={0.6} />
    </mesh>
  );
}

// ─── FPS camera (inside Canvas) ───────────────────────────────────────────────
function FPSCamera({
  posRef, lookDirRef, movingRef,
}: {
  posRef:     React.MutableRefObject<{ x: number; y: number }>;
  lookDirRef: React.MutableRefObject<{ x: number; z: number }>;
  movingRef:  React.MutableRefObject<boolean>;
}) {
  const { camera } = useThree();
  useFrame(({ clock }) => {
    const px = posRef.current.x;
    const pz = posRef.current.y;
    const bob = movingRef.current ? Math.sin(clock.getElapsedTime() * 8) * 0.07 : 0;
    camera.position.set(px, EYE_HEIGHT + bob, pz);
    camera.lookAt(
      px + lookDirRef.current.x * 12,
      EYE_HEIGHT + bob * 0.3,
      pz + lookDirRef.current.z * 12,
    );
  });
  return null;
}

// ─── Scene ────────────────────────────────────────────────────────────────────
function WorldScene({
  posRef, lookDirRef, movingRef,
  getDinoStatus, nearbyDinos, encounterable,
}: {
  posRef:       React.MutableRefObject<{ x: number; y: number }>;
  lookDirRef:   React.MutableRefObject<{ x: number; z: number }>;
  movingRef:    React.MutableRefObject<boolean>;
  getDinoStatus:(id: DinoId) => DinoStatus;
  nearbyDinos:  Set<DinoId>;
  encounterable:DinoId | null;
}) {
  return (
    <>
      <fog attach="fog" args={['#060c06', 1.5, 36]} />
      <color attach="background" args={['#040804']} />
      <Stars radius={120} depth={55} count={3500} factor={4} saturation={0.15} fade speed={0.4} />

      {/* Lighting */}
      <ambientLight intensity={0.1} color="#182830" />
      <directionalLight position={[-40, 80, -30]} intensity={0.32} color="#8899cc" />
      <pointLight position={[81, 20, 76]} intensity={5} color="#ff4400" distance={80} decay={1.5} />

      {/* Ground */}
      <mesh position={[50, 0, 50]} rotation={[-Math.PI / 2, 0, 0]} material={MATS.ground}>
        <planeGeometry args={[115, 115]} />
      </mesh>

      <GroundFog />

      {/* Trees */}
      {WORLD_TREES.map((t, i) => <Tree key={i} {...t} />)}

      {/* Fireflies */}
      {FIREFLY_DEFS.map((f, i) => <Firefly key={i} {...f} />)}

      {/* Dinos */}
      {LAIRS.map(lair => (
        <ScaryDino
          key={lair.dinoId}
          lair={lair}
          status={getDinoStatus(lair.dinoId)}
          isNearby={nearbyDinos.has(lair.dinoId)}
          isEncounterable={encounterable === lair.dinoId}
          playerPosRef={posRef}
        />
      ))}

      {/* Captured/fled markers */}
      {LAIRS.map(lair => {
        const st = getDinoStatus(lair.dinoId);
        if (st === 'remaining') return null;
        return <CapturedMarker key={`c_${lair.dinoId}`} x={lair.x} z={lair.y} status={st} />;
      })}

      <VolcanoMesh />
      <FPSCamera posRef={posRef} lookDirRef={lookDirRef} movingRef={movingRef} />
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function OpenWorld() {
  const ctx = useContext(GameContext);

  const posRef      = useRef({ x: 50, y: 50 });
  const lookDirRef  = useRef({ x: 0, z: -1 });
  const movingRef   = useRef(false);
  const keysRef     = useRef<Set<string>>(new Set());
  const rafRef      = useRef(0);

  // Throttle state — only update React state when values change
  const lastNearbyKeyRef  = useRef('');
  const lastEncounteRef   = useRef<DinoId | null>(null);

  const [nearbyDinos,   setNearbyDinos]   = useState<Set<DinoId>>(new Set());
  const [encounterable, setEncounterable] = useState<DinoId | null>(null);
  const [encounterFlash,setEncounterFlash]= useState<DinoId | null>(null);

  const state         = ctx?.state;
  const capturedDinos = state?.capturedDinos    ?? [];
  const fledDinos     = state?.huntFledDinos     ?? [];
  const remainingWild = state?.huntRemainingWild ?? [];

  const getDinoStatus = useCallback((id: DinoId): DinoStatus => {
    if (capturedDinos.includes(id)) return 'captured';
    if (fledDinos.includes(id))     return 'fled';
    return 'remaining';
  }, [capturedDinos, fledDinos]);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => { keysRef.current.add(e.key); };
    const onUp   = (e: KeyboardEvent) => { keysRef.current.delete(e.key); };
    window.addEventListener('keydown', onDown, { passive: true });
    window.addEventListener('keyup',   onUp,   { passive: true });

    const tick = () => {
      const keys = keysRef.current;
      let { x, y } = posRef.current;
      let moved = false;
      let ldx = lookDirRef.current.x;
      let ldz = lookDirRef.current.z;

      const left  = keys.has('ArrowLeft')  || keys.has('a') || keys.has('A');
      const right = keys.has('ArrowRight') || keys.has('d') || keys.has('D');
      const up    = keys.has('ArrowUp')    || keys.has('w') || keys.has('W');
      const down  = keys.has('ArrowDown')  || keys.has('s') || keys.has('S');

      if (left)  { x -= SPEED; moved = true; ldx = -1; ldz =  0; }
      if (right) { x += SPEED; moved = true; ldx =  1; ldz =  0; }
      if (up)    { y -= SPEED; moved = true; ldx =  0; ldz = -1; }
      if (down)  { y += SPEED; moved = true; ldx =  0; ldz =  1; }
      // diagonal
      if (left  && up)   { ldx = -0.707; ldz = -0.707; }
      if (right && up)   { ldx =  0.707; ldz = -0.707; }
      if (left  && down) { ldx = -0.707; ldz =  0.707; }
      if (right && down) { ldx =  0.707; ldz =  0.707; }

      movingRef.current = moved;
      if (moved) {
        lookDirRef.current = { x: ldx, z: ldz };
        posRef.current = { x: Math.max(3, Math.min(97, x)), y: Math.max(3, Math.min(97, y)) };

        // Build nearby set
        const pp = posRef.current;
        const nb = new Set<DinoId>();
        let enc: DinoId | null = null;
        for (const lair of LAIRS) {
          if (getDinoStatus(lair.dinoId) !== 'remaining') continue;
          const d = dist(pp.x, pp.y, lair.x, lair.y);
          if (d < DETECT_RADIUS)    nb.add(lair.dinoId);
          if (d < ENCOUNTER_RADIUS) enc = lair.dinoId;
        }

        // Only update React state when values change
        const nbKey = [...nb].sort().join(',');
        if (nbKey !== lastNearbyKeyRef.current) {
          lastNearbyKeyRef.current = nbKey;
          setNearbyDinos(new Set(nb));
        }
        if (enc !== lastEncounteRef.current) {
          lastEncounteRef.current = enc;
          setEncounterable(enc);
        }
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

  const handleEngage = () => {
    if (!encounterable) return;
    const id = encounterable;
    setEncounterFlash(id);
    setTimeout(() => {
      setEncounterFlash(null);
      ctx?.dispatch({ type: 'ENCOUNTER_DINO', wildDinoId: id });
    }, 900);
  };

  if (!ctx || !state) return null;

  const capturedCount = capturedDinos.length;
  const allDone       = capturedCount + fledDinos.length >= LAIRS.length;
  const dinoName      = encounterable ? DINOSAURS[encounterable]?.name ?? encounterable : '';

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#040804', userSelect: 'none' }}>

      {/* ── 3D Canvas ── */}
      <Canvas
        camera={{ position: [50, EYE_HEIGHT, 78], fov: 78, near: 0.05, far: 180 }}
        gl={{ antialias: true, alpha: false }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <WorldScene
          posRef={posRef}
          lookDirRef={lookDirRef}
          movingRef={movingRef}
          getDinoStatus={getDinoStatus}
          nearbyDinos={nearbyDinos}
          encounterable={encounterable}
        />
      </Canvas>

      {/* ── Crosshair ── */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 10 }}>
        <div style={{ position: 'relative', width: 18, height: 18 }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.55)', marginTop: -0.5 }} />
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.55)', marginLeft: -0.5 }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: 5, height: 5, border: '1px solid rgba(255,255,255,0.5)', borderRadius: '50%', transform: 'translate(-50%,-50%)' }} />
        </div>
      </div>

      {/* ── Top HUD ── */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)', pointerEvents: 'none' }}>
        <div>
          <div style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#88dd44', fontSize: 14, textShadow: '0 0 10px #44aa22' }}>🌿 WILD HUNT</div>
          <div style={{ color: '#557733', fontSize: 9, fontWeight: 700, marginTop: 2 }}>WASD / Arrow Keys to move</div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.75)', border: '2px solid #44aa22', borderRadius: 10, padding: '5px 12px', textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{ color: '#88dd44', fontSize: 9, fontWeight: 800, textTransform: 'uppercase' }}>Captured</div>
          <div style={{ color: '#aaffaa', fontSize: 22, fontWeight: 900, lineHeight: 1 }}>{capturedCount}/{LAIRS.length}</div>
        </div>
      </div>

      {/* ── Encounter prompt ── */}
      <AnimatePresence>
        {encounterable && !encounterFlash && (
          <motion.div
            key="encounter"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{ position: 'absolute', bottom: 110, left: '50%', transform: 'translateX(-50%)', zIndex: 30, textAlign: 'center', pointerEvents: 'auto' }}>
            <div style={{ marginBottom: 10 }}>
              <motion.div
                animate={{ scale: [1, 1.04, 1], opacity: [0.85, 1, 0.85] }} transition={{ duration: 1.1, repeat: Infinity }}
                style={{ fontWeight: 900, fontSize: 22, color: '#ff4422', textShadow: '0 0 16px #ff1100, 0 0 32px #880000', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                ⚠ {dinoName} ⚠
              </motion.div>
              <div style={{ fontSize: 11, color: 'rgba(255,180,150,0.8)', fontWeight: 700, marginTop: 4 }}>
                It has spotted you…
              </div>
            </div>
            <button onClick={handleEngage} style={{
              padding: '10px 28px', fontWeight: 900, fontSize: 16,
              background: 'linear-gradient(135deg, #cc0000 0%, #880000 100%)',
              border: '2px solid #ff2200', borderRadius: 10, color: 'white',
              textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer',
              boxShadow: '0 4px 0 #440000, 0 0 24px rgba(255,0,0,0.6)',
              transition: 'transform 0.1s',
            }}>⚔️ ENGAGE!</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Nearby warning ── */}
      <AnimatePresence>
        {nearbyDinos.size > 0 && !encounterable && (
          <motion.div
            key="nearby"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', bottom: 110, left: '50%', transform: 'translateX(-50%)', zIndex: 25, pointerEvents: 'none', textAlign: 'center' }}>
            <motion.div
              animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.4, repeat: Infinity }}
              style={{ background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(255,120,0,0.7)', borderRadius: 10, padding: '7px 18px' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#ffbb44' }}>🌿 Something large moves in the dark…</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Encounter flash ── */}
      <AnimatePresence>
        {encounterFlash && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: [0, 0.9, 0.7, 1, 0] }} exit={{ opacity: 0 }} transition={{ duration: 0.9 }}
            style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(180,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ fontWeight: 900, fontSize: 44, color: 'white', textTransform: 'uppercase', textShadow: '0 0 24px #ff0000, 3px 3px 0 rgba(0,0,0,0.7)', letterSpacing: '0.12em' }}>
              ⚔️ ENCOUNTER!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hunt complete ── */}
      {allDone && !encounterFlash && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 280 }}
            style={{ background: '#0a1e07', border: '3px solid #44aa22', borderRadius: 18, padding: '28px 36px', textAlign: 'center' }}>
            <div style={{ fontSize: 52 }}>🏆</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#88ff44', textTransform: 'uppercase', marginBottom: 8 }}>Hunt Complete!</div>
            <div style={{ fontSize: 14, color: '#aaddaa', marginBottom: 18 }}>Captured: {capturedCount} / {LAIRS.length}</div>
            <button onClick={() => ctx.dispatch({ type: 'RESET' })}
              style={{ padding: '11px 26px', background: 'linear-gradient(135deg, #44aa22, #228811)', border: '2px solid #115500', borderRadius: 10, color: 'white', fontWeight: 900, fontSize: 15, cursor: 'pointer' }}>
              Play Again
            </button>
          </motion.div>
        </div>
      )}

      {/* ── Bottom HUD ── */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', background: 'linear-gradient(0deg, rgba(0,0,0,0.75) 0%, transparent 100%)', pointerEvents: 'none' }}>
        <div style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid #44aa22', borderRadius: 8, padding: '6px 10px' }}>
          <div style={{ fontSize: 8, fontWeight: 800, color: '#88dd44', textTransform: 'uppercase', marginBottom: 4 }}>Dinosaurs</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', maxWidth: 160 }}>
            {LAIRS.map(lair => {
              const st = getDinoStatus(lair.dinoId);
              const isNear = nearbyDinos.has(lair.dinoId);
              return (
                <div key={lair.dinoId} style={{
                  fontSize: 7, fontWeight: 800, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4,
                  background: st === 'captured' ? '#1a5522' : st === 'fled' ? '#3a1a1a' : isNear ? '#2a1a00' : '#0d1808',
                  color: st === 'captured' ? '#88ff88' : st === 'fled' ? '#ff8888' : isNear ? '#ffaa44' : '#668844',
                  border: `1px solid ${st === 'captured' ? '#44aa55' : st === 'fled' ? '#aa3333' : isNear ? '#aa6600' : '#2a4a1a'}`,
                }}>
                  {st === 'captured' ? '✓' : st === 'fled' ? '✗' : isNear ? '⚠' : '?'}{' '}
                  {lair.dinoId === 'velociraptor' ? 'Veloc' : lair.dinoId === 'giganotosaurus' ? 'Gigan' : lair.dinoId === 'spinosaurus' ? 'Spino' : lair.dinoId === 'trex' ? 'T-Rex' : 'Ptero'}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '5px 10px', textAlign: 'center', fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
          <div> ▲ </div><div>◀ WASD ▶</div><div> ▼ </div>
        </div>
      </div>
    </div>
  );
}
