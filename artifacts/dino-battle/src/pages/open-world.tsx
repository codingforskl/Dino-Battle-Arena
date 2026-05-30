import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GameContext } from '@/App';
import type { DinoId } from '@/lib/dino-data';
import { DINOSAURS } from '@/lib/dino-data';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types & Constants ────────────────────────────────────────────────────────
interface LairDef { dinoId: DinoId; x: number; y: number; }
type DinoStatus = 'remaining' | 'captured' | 'fled';

const LAIRS: LairDef[] = [
  { dinoId: 'velociraptor',   x: 42,  y: 58  },
  { dinoId: 'spinosaurus',    x: 50,  y: 258 },
  { dinoId: 'pterodactylus',  x: 52,  y: 148 },
  { dinoId: 'trex',           x: 262, y: 50  },
  { dinoId: 'giganotosaurus', x: 255, y: 260 },
];
const ENCOUNTER_RADIUS = 16;
const DETECT_RADIUS    = 30;
const SPEED            = 0.55;
const EYE_HEIGHT       = 1.8;
const MOUSE_SENS       = 0.0028;
const MAX_PITCH        = Math.PI / 2.2;
const VOLCANO_X        = 150;
const VOLCANO_Z        = 150;
const VOLCANO_H        = 55;  // cone height
const VOLCANO_R        = 32;  // cone base radius
const VOLCANO_COL_R    = 36;
const WORLD_MAX        = 295;

// Hills: each lair sits atop a hill; extra hills for terrain variation
interface HillDef { x: number; z: number; rx: number; rz: number; h: number; }
// Only 5 hills — one under each lair so dinos stand elevated
const HILLS: HillDef[] = [
  { x: 42,  z: 58,  rx: 26, rz: 20, h: 7  },
  { x: 50,  z: 258, rx: 30, rz: 22, h: 9  },
  { x: 52,  z: 148, rx: 22, rz: 18, h: 6  },
  { x: 262, z: 50,  rx: 34, rz: 26, h: 12 },
  { x: 255, z: 260, rx: 32, rz: 28, h: 11 },
];
function getTerrainHeight(x: number, z: number): number {
  let h = 0;
  for (const hill of HILLS) {
    const nx = (x - hill.x) / hill.rx;
    const nz = (z - hill.z) / hill.rz;
    const d2 = nx*nx + nz*nz;
    if (d2 < 1) { const f = Math.cos(Math.sqrt(d2) * Math.PI * 0.5); h += hill.h * f * f; }
  }
  return h;
}

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}

function mkRng(seed: number) {
  let s = seed >>> 0;
  return () => { s ^= s << 13; s ^= s >> 7; s ^= s << 17; return (s >>> 0) / 0xFFFFFFFF; };
}

// ─── Static scene data ────────────────────────────────────────────────────────
interface TreeDef { x: number; z: number; h: number; dark: boolean; }
const WORLD_TREES: TreeDef[] = (() => {
  const rng = mkRng(42); const out: TreeDef[] = [];
  for (let i = 0; i < 900; i++) {
    const x = 5 + rng() * 288, z = 5 + rng() * 288;
    if (LAIRS.some(l => dist(x, z, l.x, l.y) < 16)) continue;
    if (dist(x, z, VOLCANO_X, VOLCANO_Z) < VOLCANO_COL_R + 12) continue;
    out.push({ x, z, h: 5 + rng() * 24, dark: rng() > 0.5 });
  }
  return out;
})();

interface FireflyDef { x: number; z: number; y: number; phase: number; speed: number; }
const FIREFLY_DEFS: FireflyDef[] = (() => {
  const rng = mkRng(77);
  return Array.from({ length: 250 }, () => ({ x: 5 + rng() * 288, z: 5 + rng() * 288, y: 1.2 + rng() * 5, phase: rng() * Math.PI * 2, speed: 0.4 + rng() * 0.8 }));
})();

interface BushDef { x: number; z: number; s: number; }
const BUSHES: BushDef[] = (() => {
  const rng = mkRng(131); const out: BushDef[] = [];
  for (let i = 0; i < 400; i++) {
    const x = 5 + rng() * 288, z = 5 + rng() * 288;
    if (dist(x, z, VOLCANO_X, VOLCANO_Z) < VOLCANO_COL_R + 10) continue;
    if (LAIRS.some(l => dist(x, z, l.x, l.y) < 10)) continue;
    out.push({ x, z, s: 0.6 + rng() * 1.3 });
  }
  return out;
})();

interface RockDef  { x: number; z: number; s: number; rot: number; sy: number; }
const ROCKS: RockDef[] = (() => {
  const rng = mkRng(73); const out: RockDef[] = [];
  for (let i = 0; i < 130; i++) {
    const x = 5 + rng() * 288, z = 5 + rng() * 288;
    if (dist(x, z, VOLCANO_X, VOLCANO_Z) < VOLCANO_COL_R + 14) continue;
    if (LAIRS.some(l => dist(x, z, l.x, l.y) < 9)) continue;
    out.push({ x, z, s: 0.5 + rng() * 2.2, rot: rng() * Math.PI * 2, sy: 0.45 + rng() * 0.55 });
  }
  return out;
})();

interface GrassDef { x: number; z: number; h: number; rot: number; }
const GRASS_TUFTS: GrassDef[] = (() => {
  const rng = mkRng(19); const out: GrassDef[] = [];
  for (let i = 0; i < 500; i++) {
    const x = 5 + rng() * 288, z = 5 + rng() * 288;
    if (dist(x, z, VOLCANO_X, VOLCANO_Z) < VOLCANO_COL_R + 6) continue;
    out.push({ x, z, h: 0.28 + rng() * 0.9, rot: rng() * Math.PI });
  }
  return out;
})();

interface PatchDef { x: number; z: number; rx: number; rz: number; mi: 0|1|2; }
const GROUND_PATCHES: PatchDef[] = (() => {
  const rng = mkRng(51); const out: PatchDef[] = [];
  for (let i = 0; i < 55; i++)
    out.push({ x: rng()*294, z: rng()*294, rx: 10+rng()*26, rz: 7+rng()*20, mi: Math.floor(rng()*3) as 0|1|2 });
  return out;
})();

const WATER_POOLS = [
  { x: 88,  z: 196, rx: 13, rz: 8 },
  { x: 218, z: 118, rx: 10, rz: 6 },
  { x: 72,  z: 115, rx: 8,  rz: 5 },
  { x: 200, z: 244, rx: 12, rz: 7 },
];

// ─── Module-level shared materials (never recreated) ─────────────────────────
const MAT_TRUNK_D  = new THREE.MeshLambertMaterial({ color: '#5c3414' });
const MAT_TRUNK_L  = new THREE.MeshLambertMaterial({ color: '#7e4a22' });
const MAT_LEAF_D   = new THREE.MeshLambertMaterial({ color: '#1e5a14' });
const MAT_LEAF_L   = new THREE.MeshLambertMaterial({ color: '#2e7224' });
const MAT_LEAF_M   = new THREE.MeshLambertMaterial({ color: '#266418' });
const MAT_FERN     = new THREE.MeshLambertMaterial({ color: '#163c10' });
const MAT_BUSH_D   = new THREE.MeshLambertMaterial({ color: '#152e10' });
const MAT_BUSH_L   = new THREE.MeshLambertMaterial({ color: '#1e4018' });
const MAT_GRASS_A  = new THREE.MeshLambertMaterial({ color: '#2d5216', side: THREE.DoubleSide });
const MAT_GRASS_B  = new THREE.MeshLambertMaterial({ color: '#1e400e', side: THREE.DoubleSide });
const MAT_ROCK_B   = new THREE.MeshLambertMaterial({ color: '#1e1c14' });
const MAT_ROCK_C   = new THREE.MeshLambertMaterial({ color: '#2a241c' });
const MAT_WATER    = new THREE.MeshStandardMaterial({ color: '#16283a', roughness: 0.04, metalness: 0.9, transparent: true, opacity: 0.82 });
const MAT_PATCH_D  = new THREE.MeshBasicMaterial({ color: '#0c180a', transparent: true, opacity: 0.52, depthWrite: false });
const MAT_PATCH_L  = new THREE.MeshBasicMaterial({ color: '#1c3612', transparent: true, opacity: 0.42, depthWrite: false });
const MAT_PATCH_M  = new THREE.MeshBasicMaterial({ color: '#2c1a08', transparent: true, opacity: 0.38, depthWrite: false });
const MAT_GROUND   = new THREE.MeshLambertMaterial({ color: '#142810' });
const MAT_HILL     = new THREE.MeshLambertMaterial({ color: '#09150a' });
const MAT_FOG      = new THREE.MeshBasicMaterial({ color: '#1a2e1a', transparent: true, opacity: 0.2, depthWrite: false });
// Eye materials
const EYE_RED = new THREE.MeshStandardMaterial({ color: '#ff1100', emissive: '#ff0000', emissiveIntensity: 6, toneMapped: false });
const EYE_YEL = new THREE.MeshStandardMaterial({ color: '#ffee00', emissive: '#ffcc00', emissiveIntensity: 5, toneMapped: false });
const EYE_ORG = new THREE.MeshStandardMaterial({ color: '#ff6600', emissive: '#ff4400', emissiveIntensity: 7, toneMapped: false });
const EYE_AMB = new THREE.MeshStandardMaterial({ color: '#ff9900', emissive: '#ff7700', emissiveIntensity: 4, toneMapped: false });
// Dino skin materials
const MAT_VELOC_BODY  = new THREE.MeshStandardMaterial({ color: '#3d5c18', roughness: 0.85, metalness: 0.02 });
const MAT_VELOC_BELLY = new THREE.MeshStandardMaterial({ color: '#5a7a28', roughness: 0.85, metalness: 0.02 });
const MAT_VELOC_DARK  = new THREE.MeshStandardMaterial({ color: '#253810', roughness: 0.9,  metalness: 0.02 });
const MAT_CLAW        = new THREE.MeshStandardMaterial({ color: '#ddddaa', roughness: 0.5,  metalness: 0.05 });
const MAT_TOOTH       = new THREE.MeshStandardMaterial({ color: '#e8e8cc', roughness: 0.45, metalness: 0.05 });
const MAT_SPINO_BODY  = new THREE.MeshStandardMaterial({ color: '#2a6a48', roughness: 0.85, metalness: 0.02 });
const MAT_SPINO_BELLY = new THREE.MeshStandardMaterial({ color: '#3a8055', roughness: 0.85, metalness: 0.02 });
const MAT_SPINO_DARK  = new THREE.MeshStandardMaterial({ color: '#163828', roughness: 0.9,  metalness: 0.02 });
const MAT_SPINO_SAIL  = new THREE.MeshStandardMaterial({ color: '#ff7744', roughness: 0.7,  metalness: 0.02 });
const MAT_SPINO_MEM   = new THREE.MeshStandardMaterial({ color: '#cc5533', roughness: 0.6, transparent: true, opacity: 0.75 });
const MAT_PTERO_BODY  = new THREE.MeshStandardMaterial({ color: '#6a4a8a', roughness: 0.85, metalness: 0.02 });
const MAT_PTERO_WING  = new THREE.MeshStandardMaterial({ color: '#3e2860', roughness: 0.9,  metalness: 0.02 });
const MAT_PTERO_BEAK  = new THREE.MeshStandardMaterial({ color: '#cc9933', roughness: 0.4,  metalness: 0.05 });
const MAT_PTERO_CREST = new THREE.MeshStandardMaterial({ color: '#8844aa', roughness: 0.7,  metalness: 0.02 });
const MAT_TREX_BODY   = new THREE.MeshStandardMaterial({ color: '#556622', roughness: 0.85, metalness: 0.02 });
const MAT_TREX_BELLY  = new THREE.MeshStandardMaterial({ color: '#778833', roughness: 0.85, metalness: 0.02 });
const MAT_TREX_DARK   = new THREE.MeshStandardMaterial({ color: '#334410', roughness: 0.9,  metalness: 0.02 });
const MAT_GIGA_BODY   = new THREE.MeshStandardMaterial({ color: '#5a2208', roughness: 0.85, metalness: 0.02 });
const MAT_GIGA_BELLY  = new THREE.MeshStandardMaterial({ color: '#7a3a14', roughness: 0.85, metalness: 0.02 });
const MAT_GIGA_DARK   = new THREE.MeshStandardMaterial({ color: '#300c02', roughness: 0.9,  metalness: 0.02 });
const MAT_GIGA_SCALE  = new THREE.MeshStandardMaterial({ color: '#8a3614', roughness: 0.9,  metalness: 0.02 });
const MAT_ROCK        = new THREE.MeshStandardMaterial({ color: '#1a0e06', roughness: 0.95 });
const MAT_LAVA_CRUST  = new THREE.MeshStandardMaterial({ color: '#220600', roughness: 0.95 });
const MAT_LAVA_POOL   = new THREE.MeshStandardMaterial({ color: '#ff3300', emissive: '#ff1100', emissiveIntensity: 3.0, roughness: 0.15 });
const MAT_LAVA_R1     = new THREE.MeshStandardMaterial({ color: '#ff4400', emissive: '#ff2200', emissiveIntensity: 2.0, roughness: 0.18 });
const MAT_LAVA_R2     = new THREE.MeshStandardMaterial({ color: '#ff5500', emissive: '#ff3300', emissiveIntensity: 2.0, roughness: 0.18 });
const MAT_LAVA_R3     = new THREE.MeshStandardMaterial({ color: '#ff3800', emissive: '#ff1800', emissiveIntensity: 2.0, roughness: 0.18 });
const MAT_SMOKE       = new THREE.MeshStandardMaterial({ color: '#1a1a22', transparent: true, opacity: 0.25, roughness: 1 });

// ─── Lava-flow-on-volcano constants & per-segment materials ───────────────────
const CONE_HALF_ANGLE = Math.atan2(VOLCANO_R, VOLCANO_H);
const FLOW_ROT_Z      = Math.PI + CONE_HALF_ANGLE;
const FLOW_SLOPE_LEN  = Math.sqrt(VOLCANO_R * VOLCANO_R + VOLCANO_H * VOLCANO_H);
const FLOW_N          = 14;
const FLOW_SEG_LEN    = FLOW_SLOPE_LEN / FLOW_N + 0.7;
// One material per segment-index so wave animation sweeps top→bottom
const FLOW_SEG_MATS: THREE.MeshStandardMaterial[] = Array.from({ length: FLOW_N }, () =>
  new THREE.MeshStandardMaterial({ color: '#ff4400', emissive: '#ff2200', emissiveIntensity: 2.0, roughness: 0.1, toneMapped: false })
);

// ─── Tree ─────────────────────────────────────────────────────────────────────
function Tree({ x, z, h, dark }: TreeDef) {
  const tH = h * 0.42, cS = tH * 0.7;
  const lMat = dark ? MAT_LEAF_D : MAT_LEAF_L;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, tH/2, 0]} material={dark ? MAT_TRUNK_D : MAT_TRUNK_L}><cylinderGeometry args={[0.18, 0.3, tH, 7]}/></mesh>
      {/* Wide base skirt — low, flat, dark like undergrowth shadow */}
      <mesh position={[0, cS + h*0.02, 0]} material={MAT_FERN}><coneGeometry args={[h*0.46, h*0.18, 10]}/></mesh>
      {/* Mid skirt */}
      <mesh position={[0, cS + h*0.16, 0]} material={MAT_LEAF_M}><coneGeometry args={[h*0.35, h*0.32, 9]}/></mesh>
      {/* Main canopy tiers */}
      <mesh position={[0, cS + h*0.32, 0]} material={lMat}><coneGeometry args={[h*0.26, h*0.44, 8]}/></mesh>
      <mesh position={[0, cS + h*0.56, 0]} material={lMat}><coneGeometry args={[h*0.17, h*0.32, 7]}/></mesh>
      <mesh position={[0, cS + h*0.74, 0]} material={lMat}><coneGeometry args={[h*0.09, h*0.22, 6]}/></mesh>
    </group>
  );
}

// ─── Firefly ──────────────────────────────────────────────────────────────────
function Firefly({ x, z, y, phase, speed }: FireflyDef) {
  const mRef = useRef<THREE.Mesh>(null!);
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (mRef.current) mRef.current.position.set(x + Math.sin(t*speed*0.41+phase)*0.5, y + Math.sin(t*speed+phase)*0.6, z + Math.cos(t*speed*0.37+phase)*0.5);
    if (matRef.current) matRef.current.emissiveIntensity = Math.max(0, Math.sin(t*2.2*speed+phase*3.7)*1.8+0.3);
  });
  return (
    <mesh ref={mRef}>
      <sphereGeometry args={[0.07, 5, 5]}/>
      <meshStandardMaterial ref={matRef} color="#bbff44" emissive="#88ff22" emissiveIntensity={1.5}/>
    </mesh>
  );
}

// ─── Ground fog ───────────────────────────────────────────────────────────────
function GroundFog() {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => { if (ref.current) (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.18 + Math.sin(clock.getElapsedTime()*0.13)*0.05; });
  return <mesh ref={ref} position={[150,0.35,150]} rotation={[-Math.PI/2,0,0]} material={MAT_FOG}><planeGeometry args={[340,340]}/></mesh>;
}

// ─── VELOCIRAPTOR ─────────────────────────────────────────────────────────────
function VelociraptorBody() {
  return (
    <group scale={1.4}>
      {/* Thighs */}
      <mesh position={[-0.14,0.62,-0.08]} rotation={[0.35,0,0.12]} material={MAT_VELOC_BODY}><cylinderGeometry args={[0.11,0.09,0.6,8]}/></mesh>
      <mesh position={[ 0.14,0.62,-0.08]} rotation={[0.35,0,-0.12]} material={MAT_VELOC_BODY}><cylinderGeometry args={[0.11,0.09,0.6,8]}/></mesh>
      {/* Shins */}
      <mesh position={[-0.16,0.32,0.14]} rotation={[-0.5,0,0.05]} material={MAT_VELOC_DARK}><cylinderGeometry args={[0.08,0.06,0.52,7]}/></mesh>
      <mesh position={[ 0.16,0.32,0.14]} rotation={[-0.5,0,-0.05]} material={MAT_VELOC_DARK}><cylinderGeometry args={[0.08,0.06,0.52,7]}/></mesh>
      {/* Feet */}
      <mesh position={[-0.16,0.08,0.28]} material={MAT_VELOC_DARK}><boxGeometry args={[0.12,0.07,0.32]}/></mesh>
      <mesh position={[ 0.16,0.08,0.28]} material={MAT_VELOC_DARK}><boxGeometry args={[0.12,0.07,0.32]}/></mesh>
      {/* Sickle claws */}
      <mesh position={[-0.12,0.03,0.44]} rotation={[0.8,0,0]} material={MAT_CLAW}><coneGeometry args={[0.03,0.18,5]}/></mesh>
      <mesh position={[ 0.12,0.03,0.44]} rotation={[0.8,0,0]} material={MAT_CLAW}><coneGeometry args={[0.03,0.18,5]}/></mesh>
      {/* Torso */}
      <mesh position={[0,1.05,-0.02]} rotation={[0.25,0,0]} material={MAT_VELOC_BODY}><boxGeometry args={[0.52,0.52,0.82]}/></mesh>
      {/* Belly */}
      <mesh position={[0,0.95,0.18]} material={MAT_VELOC_BELLY}><boxGeometry args={[0.38,0.38,0.4]}/></mesh>
      {/* Spine ridge */}
      {[0,1,2,3].map(i => <mesh key={i} position={[0,1.34+i*0.07,-0.18-i*0.04]} material={MAT_VELOC_DARK}><boxGeometry args={[0.06,0.14+i*0.02,0.08]}/></mesh>)}
      {/* Neck */}
      <mesh position={[0,1.52,0.2]} rotation={[-0.55,0,0]} material={MAT_VELOC_BODY}><cylinderGeometry args={[0.16,0.2,0.52,8]}/></mesh>
      {/* Head */}
      <mesh position={[0,1.78,0.52]} material={MAT_VELOC_BODY}><boxGeometry args={[0.32,0.28,0.58]}/></mesh>
      {/* Snout */}
      <mesh position={[0,1.68,0.86]} material={MAT_VELOC_DARK}><boxGeometry args={[0.22,0.18,0.38]}/></mesh>
      {/* Teeth */}
      {[-0.07,0,0.07].map((ox,i) => <mesh key={i} position={[ox,1.62,1.01]} rotation={[0.3,0,0]} material={MAT_CLAW}><coneGeometry args={[0.02,0.08,4]}/></mesh>)}
      {/* Eyes */}
      <mesh position={[-0.13,1.84,0.65]} material={EYE_RED}><sphereGeometry args={[0.055,8,8]}/></mesh>
      <mesh position={[ 0.13,1.84,0.65]} material={EYE_RED}><sphereGeometry args={[0.055,8,8]}/></mesh>
      {/* Brow */}
      <mesh position={[-0.13,1.9,0.6]} rotation={[0.3,0,0]} material={MAT_VELOC_DARK}><boxGeometry args={[0.09,0.05,0.14]}/></mesh>
      <mesh position={[ 0.13,1.9,0.6]} rotation={[0.3,0,0]} material={MAT_VELOC_DARK}><boxGeometry args={[0.09,0.05,0.14]}/></mesh>
      {/* Arms */}
      <mesh position={[-0.32,1.28,0.22]} rotation={[0.6,0,0.55]} material={MAT_VELOC_BODY}><cylinderGeometry args={[0.05,0.04,0.38,6]}/></mesh>
      <mesh position={[ 0.32,1.28,0.22]} rotation={[0.6,0,-0.55]} material={MAT_VELOC_BODY}><cylinderGeometry args={[0.05,0.04,0.38,6]}/></mesh>
      <mesh position={[-0.44,1.14,0.42]} rotation={[0.8,0,0.3]} material={MAT_CLAW}><coneGeometry args={[0.025,0.1,4]}/></mesh>
      <mesh position={[ 0.44,1.14,0.42]} rotation={[0.8,0,-0.3]} material={MAT_CLAW}><coneGeometry args={[0.025,0.1,4]}/></mesh>
      {/* Tail */}
      <mesh position={[0,0.95,-0.68]} rotation={[-0.4,0,0]} material={MAT_VELOC_BODY}><cylinderGeometry args={[0.06,0.22,1.1,7]}/></mesh>
      <mesh position={[0,0.72,-1.28]} rotation={[-0.2,0,0]} material={MAT_VELOC_DARK}><cylinderGeometry args={[0.02,0.06,0.7,6]}/></mesh>
    </group>
  );
}

// ─── SPINOSAURUS ──────────────────────────────────────────────────────────────
function SpinosaurusBody() {
  return (
    <group scale={3.0}>
      {/* Legs */}
      <mesh position={[-0.2,0.6,0]} rotation={[0.15,0,0.1]} material={MAT_SPINO_BODY}><cylinderGeometry args={[0.14,0.12,1.0,8]}/></mesh>
      <mesh position={[ 0.2,0.6,0]} rotation={[0.15,0,-0.1]} material={MAT_SPINO_BODY}><cylinderGeometry args={[0.14,0.12,1.0,8]}/></mesh>
      <mesh position={[-0.22,0.06,0.18]} material={MAT_SPINO_DARK}><boxGeometry args={[0.18,0.1,0.42]}/></mesh>
      <mesh position={[ 0.22,0.06,0.18]} material={MAT_SPINO_DARK}><boxGeometry args={[0.18,0.1,0.42]}/></mesh>
      {/* Torso */}
      <mesh position={[0,1.3,-0.05]} rotation={[0.15,0,0]} material={MAT_SPINO_BODY}><boxGeometry args={[0.8,0.7,1.15]}/></mesh>
      <mesh position={[0,1.18,0.22]} material={MAT_SPINO_BELLY}><boxGeometry args={[0.6,0.5,0.5]}/></mesh>
      {/* Neural sail */}
      {[-0.28,-0.14,0,0.14,0.28].map((ox, i) => {
        const h = 0.55 + i*0.12 + (i > 2 ? (4-i)*0.15 : 0);
        return <mesh key={i} position={[ox, 1.78+h/2, -0.2]} rotation={[0.08,0,0]} material={MAT_SPINO_SAIL}><boxGeometry args={[0.055,h,0.15]}/></mesh>;
      })}
      {/* Sail membrane */}
      <mesh position={[0,1.95,-0.2]} rotation={[0.08,0,0]} material={MAT_SPINO_MEM}><boxGeometry args={[0.62,0.48,0.07]}/></mesh>
      {/* Neck */}
      <mesh position={[0,1.82,0.3]} rotation={[-0.45,0,0]} material={MAT_SPINO_BODY}><cylinderGeometry args={[0.19,0.26,0.72,8]}/></mesh>
      {/* Head – long crocodilian snout */}
      <mesh position={[0,2.05,0.88]} material={MAT_SPINO_BODY}><boxGeometry args={[0.48,0.38,1.0]}/></mesh>
      <mesh position={[0,1.9,1.42]} material={MAT_SPINO_DARK}><boxGeometry args={[0.36,0.22,0.72]}/></mesh>
      <mesh position={[-0.1,2.0,1.76]} material={MAT_SPINO_DARK}><sphereGeometry args={[0.06,6,6]}/></mesh>
      <mesh position={[ 0.1,2.0,1.76]} material={MAT_SPINO_DARK}><sphereGeometry args={[0.06,6,6]}/></mesh>
      {/* Teeth */}
      {[-0.12,-0.04,0.04,0.12].map((ox,i) => <mesh key={i} position={[ox,1.82,1.58+i*0.04]} rotation={[0.4,0,0]} material={MAT_TOOTH}><coneGeometry args={[0.025,0.1,4]}/></mesh>)}
      {/* Eyes */}
      <mesh position={[-0.2,2.12,0.96]} material={EYE_YEL}><sphereGeometry args={[0.08,8,8]}/></mesh>
      <mesh position={[ 0.2,2.12,0.96]} material={EYE_YEL}><sphereGeometry args={[0.08,8,8]}/></mesh>
      {/* Arms */}
      <mesh position={[-0.48,1.5,0.38]} rotation={[0.7,0,0.5]} material={MAT_SPINO_BODY}><cylinderGeometry args={[0.07,0.05,0.5,6]}/></mesh>
      <mesh position={[ 0.48,1.5,0.38]} rotation={[0.7,0,-0.5]} material={MAT_SPINO_BODY}><cylinderGeometry args={[0.07,0.05,0.5,6]}/></mesh>
      {/* Tail */}
      <mesh position={[0,1.15,-0.95]} rotation={[-0.35,0,0]} material={MAT_SPINO_BODY}><cylinderGeometry args={[0.07,0.32,1.6,7]}/></mesh>
      <mesh position={[0,0.85,-1.9]} rotation={[-0.18,0,0]} material={MAT_SPINO_DARK}><cylinderGeometry args={[0.03,0.07,1.0,6]}/></mesh>
    </group>
  );
}

// ─── PTERODACTYLUS ────────────────────────────────────────────────────────────
function PterodactylusBody() {
  return (
    <group scale={3.0} position={[0,5,0]}>
      {/* Body */}
      <mesh position={[0,0,0]} material={MAT_PTERO_BODY}><boxGeometry args={[0.44,0.32,0.52]}/></mesh>
      <mesh position={[0,-0.1,0.1]} material={MAT_PTERO_BODY}><boxGeometry args={[0.3,0.18,0.3]}/></mesh>
      {/* Neck + head */}
      <mesh position={[0,0.2,0.28]} rotation={[-0.5,0,0]} material={MAT_PTERO_BODY}><cylinderGeometry args={[0.1,0.14,0.36,7]}/></mesh>
      <mesh position={[0,0.32,0.62]} material={MAT_PTERO_BODY}><boxGeometry args={[0.24,0.22,0.44]}/></mesh>
      {/* Head crest */}
      <mesh position={[0,0.52,0.34]} rotation={[0.6,0,0]} material={MAT_PTERO_CREST}><boxGeometry args={[0.1,0.7,0.08]}/></mesh>
      {/* Beak */}
      <mesh position={[0,0.22,1.0]} material={MAT_PTERO_BEAK}><boxGeometry args={[0.12,0.1,0.68]}/></mesh>
      <mesh position={[0,0.16,1.3]} rotation={[0.2,0,0]} material={MAT_PTERO_BEAK}><coneGeometry args={[0.05,0.2,5]}/></mesh>
      {/* Eyes */}
      <mesh position={[-0.12,0.36,0.72]} material={EYE_AMB}><sphereGeometry args={[0.075,8,8]}/></mesh>
      <mesh position={[ 0.12,0.36,0.72]} material={EYE_AMB}><sphereGeometry args={[0.075,8,8]}/></mesh>
      {/* Left wing */}
      <mesh position={[-0.22,0,0]} rotation={[0.1,0,0.08]} material={MAT_PTERO_BODY}><boxGeometry args={[0.12,0.06,0.12]}/></mesh>
      <mesh position={[-0.68,-0.04,-0.1]} rotation={[0.1,0,0.06]} material={MAT_PTERO_WING}><boxGeometry args={[1.9,0.04,0.85]}/></mesh>
      <mesh position={[-1.62,-0.14,-0.08]} rotation={[0.12,0,0.18]} material={MAT_PTERO_WING}><boxGeometry args={[0.95,0.03,0.55]}/></mesh>
      <mesh position={[-0.6,0.08,0.05]} rotation={[0,0,0.18]} material={MAT_PTERO_BODY}><cylinderGeometry args={[0.03,0.02,1.5,5]}/></mesh>
      {/* Right wing */}
      <mesh position={[ 0.22,0,0]} rotation={[0.1,0,-0.08]} material={MAT_PTERO_BODY}><boxGeometry args={[0.12,0.06,0.12]}/></mesh>
      <mesh position={[ 0.68,-0.04,-0.1]} rotation={[0.1,0,-0.06]} material={MAT_PTERO_WING}><boxGeometry args={[1.9,0.04,0.85]}/></mesh>
      <mesh position={[ 1.62,-0.14,-0.08]} rotation={[0.12,0,-0.18]} material={MAT_PTERO_WING}><boxGeometry args={[0.95,0.03,0.55]}/></mesh>
      <mesh position={[ 0.6,0.08,0.05]} rotation={[0,0,-0.18]} material={MAT_PTERO_BODY}><cylinderGeometry args={[0.03,0.02,1.5,5]}/></mesh>
      {/* Legs */}
      <mesh position={[-0.16,-0.22,0.1]} rotation={[0.3,0,0.2]} material={MAT_PTERO_BODY}><cylinderGeometry args={[0.06,0.04,0.38,6]}/></mesh>
      <mesh position={[ 0.16,-0.22,0.1]} rotation={[0.3,0,-0.2]} material={MAT_PTERO_BODY}><cylinderGeometry args={[0.06,0.04,0.38,6]}/></mesh>
      {/* Tail */}
      <mesh position={[0,0.05,-0.3]} rotation={[-0.3,0,0]} material={MAT_PTERO_BODY}><cylinderGeometry args={[0.02,0.08,0.3,5]}/></mesh>
    </group>
  );
}

// ─── T-REX ────────────────────────────────────────────────────────────────────
function TRexBody() {
  return (
    <group scale={3.8}>
      {/* Massive legs */}
      <mesh position={[-0.24,0.72,-0.04]} rotation={[0.1,0,0.08]} material={MAT_TREX_BODY}><cylinderGeometry args={[0.17,0.14,1.2,9]}/></mesh>
      <mesh position={[ 0.24,0.72,-0.04]} rotation={[0.1,0,-0.08]} material={MAT_TREX_BODY}><cylinderGeometry args={[0.17,0.14,1.2,9]}/></mesh>
      {/* Shins */}
      <mesh position={[-0.26,0.18,0.2]} rotation={[-0.55,0,0.05]} material={MAT_TREX_DARK}><cylinderGeometry args={[0.12,0.1,0.72,8]}/></mesh>
      <mesh position={[ 0.26,0.18,0.2]} rotation={[-0.55,0,-0.05]} material={MAT_TREX_DARK}><cylinderGeometry args={[0.12,0.1,0.72,8]}/></mesh>
      {/* Feet */}
      <mesh position={[-0.26,-0.06,0.36]} material={MAT_TREX_DARK}><boxGeometry args={[0.22,0.1,0.46]}/></mesh>
      <mesh position={[ 0.26,-0.06,0.36]} material={MAT_TREX_DARK}><boxGeometry args={[0.22,0.1,0.46]}/></mesh>
      {[-0.1,0,0.1].map((ox,i) => (
        <React.Fragment key={i}>
          <mesh position={[-0.26+ox,-0.12,0.58]} rotation={[0.5,0,0]} material={MAT_TOOTH}><coneGeometry args={[0.03,0.14,4]}/></mesh>
          <mesh position={[ 0.26+ox,-0.12,0.58]} rotation={[0.5,0,0]} material={MAT_TOOTH}><coneGeometry args={[0.03,0.14,4]}/></mesh>
        </React.Fragment>
      ))}
      {/* Torso */}
      <mesh position={[0,1.22,-0.1]} material={MAT_TREX_BODY}><boxGeometry args={[0.75,0.5,0.65]}/></mesh>
      <mesh position={[0,1.52,0.05]} rotation={[0.15,0,0]} material={MAT_TREX_BODY}><boxGeometry args={[0.8,0.72,1.0]}/></mesh>
      <mesh position={[0,1.4,0.28]} material={MAT_TREX_BELLY}><boxGeometry args={[0.58,0.5,0.45]}/></mesh>
      {/* Spine bumps */}
      {[0,1,2].map(i => <mesh key={i} position={[0,2.0+i*0.09,-0.22-i*0.06]} material={MAT_TREX_DARK}><sphereGeometry args={[0.06+i*0.01,6,6]}/></mesh>)}
      {/* Arms */}
      <mesh position={[-0.44,1.75,0.52]} rotation={[0.8,0,0.55]} material={MAT_TREX_BODY}><cylinderGeometry args={[0.055,0.04,0.3,6]}/></mesh>
      <mesh position={[ 0.44,1.75,0.52]} rotation={[0.8,0,-0.55]} material={MAT_TREX_BODY}><cylinderGeometry args={[0.055,0.04,0.3,6]}/></mesh>
      <mesh position={[-0.52,1.65,0.64]} rotation={[0.6,0,0.3]} material={MAT_TOOTH}><coneGeometry args={[0.03,0.12,4]}/></mesh>
      <mesh position={[ 0.52,1.65,0.64]} rotation={[0.6,0,-0.3]} material={MAT_TOOTH}><coneGeometry args={[0.03,0.12,4]}/></mesh>
      {/* Neck */}
      <mesh position={[0,2.05,0.28]} rotation={[-0.3,0,0]} material={MAT_TREX_BODY}><cylinderGeometry args={[0.24,0.32,0.72,9]}/></mesh>
      {/* Skull */}
      <mesh position={[0,2.42,0.76]} material={MAT_TREX_BODY}><boxGeometry args={[0.72,0.62,1.1]}/></mesh>
      <mesh position={[-0.38,2.38,0.82]} material={MAT_TREX_DARK}><sphereGeometry args={[0.22,8,8]}/></mesh>
      <mesh position={[ 0.38,2.38,0.82]} material={MAT_TREX_DARK}><sphereGeometry args={[0.22,8,8]}/></mesh>
      {/* Nasal ridge */}
      <mesh position={[0,2.68,0.7]} rotation={[0.2,0,0]} material={MAT_TREX_DARK}><boxGeometry args={[0.14,0.1,0.38]}/></mesh>
      {/* Upper jaw */}
      <mesh position={[0,2.26,1.3]} material={MAT_TREX_BODY}><boxGeometry args={[0.6,0.24,0.68]}/></mesh>
      {/* Lower jaw */}
      <mesh position={[0,2.1,1.26]} material={MAT_TREX_DARK}><boxGeometry args={[0.52,0.18,0.62]}/></mesh>
      {/* Teeth */}
      {[-0.18,-0.09,0,0.09,0.18].map((ox,i) => (
        <React.Fragment key={i}>
          <mesh position={[ox,2.2,1.58]} rotation={[0.4,0,0]} material={MAT_TOOTH}><coneGeometry args={[0.025,0.1,4]}/></mesh>
          <mesh position={[ox,2.14,1.54]} rotation={[-0.4,0,0]} material={MAT_TOOTH}><coneGeometry args={[0.02,0.08,4]}/></mesh>
        </React.Fragment>
      ))}
      {/* Eyes */}
      <mesh position={[-0.26,2.54,0.92]} material={EYE_RED}><sphereGeometry args={[0.075,9,9]}/></mesh>
      <mesh position={[ 0.26,2.54,0.92]} material={EYE_RED}><sphereGeometry args={[0.075,9,9]}/></mesh>
      {/* Brow */}
      <mesh position={[-0.27,2.62,0.84]} rotation={[0.35,0,0]} material={MAT_TREX_DARK}><boxGeometry args={[0.14,0.08,0.22]}/></mesh>
      <mesh position={[ 0.27,2.62,0.84]} rotation={[0.35,0,0]} material={MAT_TREX_DARK}><boxGeometry args={[0.14,0.08,0.22]}/></mesh>
      {/* Tail */}
      <mesh position={[0,1.3,-0.92]} rotation={[-0.38,0,0]} material={MAT_TREX_BODY}><cylinderGeometry args={[0.08,0.35,1.8,8]}/></mesh>
      <mesh position={[0,0.95,-1.98]} rotation={[-0.18,0,0]} material={MAT_TREX_DARK}><cylinderGeometry args={[0.03,0.08,1.1,6]}/></mesh>
    </group>
  );
}

// ─── GIGANOTOSAURUS ───────────────────────────────────────────────────────────
function GiganotosaurusBody() {
  return (
    <group scale={4.5}>
      {/* Legs */}
      <mesh position={[-0.26,0.78,-0.04]} rotation={[0.1,0,0.08]} material={MAT_GIGA_BODY}><cylinderGeometry args={[0.19,0.16,1.3,9]}/></mesh>
      <mesh position={[ 0.26,0.78,-0.04]} rotation={[0.1,0,-0.08]} material={MAT_GIGA_BODY}><cylinderGeometry args={[0.19,0.16,1.3,9]}/></mesh>
      <mesh position={[-0.28,0.14,0.24]} rotation={[-0.6,0,0.05]} material={MAT_GIGA_DARK}><cylinderGeometry args={[0.13,0.11,0.76,8]}/></mesh>
      <mesh position={[ 0.28,0.14,0.24]} rotation={[-0.6,0,-0.05]} material={MAT_GIGA_DARK}><cylinderGeometry args={[0.13,0.11,0.76,8]}/></mesh>
      <mesh position={[-0.28,-0.08,0.4]} material={MAT_GIGA_DARK}><boxGeometry args={[0.24,0.11,0.5]}/></mesh>
      <mesh position={[ 0.28,-0.08,0.4]} material={MAT_GIGA_DARK}><boxGeometry args={[0.24,0.11,0.5]}/></mesh>
      {/* Torso – wider than T-Rex */}
      <mesh position={[0,1.3,-0.1]} material={MAT_GIGA_BODY}><boxGeometry args={[0.82,0.55,0.7]}/></mesh>
      <mesh position={[0,1.62,0.08]} rotation={[0.12,0,0]} material={MAT_GIGA_BODY}><boxGeometry args={[0.88,0.76,1.08]}/></mesh>
      <mesh position={[0,1.5,0.3]} material={MAT_GIGA_BELLY}><boxGeometry args={[0.64,0.52,0.48]}/></mesh>
      {/* Scale pattern */}
      {[-0.3,-0.15,0,0.15,0.3].map((ox,i) => <mesh key={i} position={[ox,2.12,-0.12]} material={MAT_GIGA_SCALE}><sphereGeometry args={[0.06,5,5]}/></mesh>)}
      {/* Arms */}
      <mesh position={[-0.5,1.84,0.55]} rotation={[0.7,0,0.5]} material={MAT_GIGA_BODY}><cylinderGeometry args={[0.065,0.05,0.36,6]}/></mesh>
      <mesh position={[ 0.5,1.84,0.55]} rotation={[0.7,0,-0.5]} material={MAT_GIGA_BODY}><cylinderGeometry args={[0.065,0.05,0.36,6]}/></mesh>
      <mesh position={[-0.6,1.72,0.68]} rotation={[0.5,0,0.3]} material={MAT_TOOTH}><coneGeometry args={[0.03,0.14,4]}/></mesh>
      <mesh position={[ 0.6,1.72,0.68]} rotation={[0.5,0,-0.3]} material={MAT_TOOTH}><coneGeometry args={[0.03,0.14,4]}/></mesh>
      {/* Neck */}
      <mesh position={[0,2.18,0.3]} rotation={[-0.28,0,0]} material={MAT_GIGA_BODY}><cylinderGeometry args={[0.27,0.35,0.78,9]}/></mesh>
      {/* Massive skull */}
      <mesh position={[0,2.58,0.82]} material={MAT_GIGA_BODY}><boxGeometry args={[0.8,0.68,1.22]}/></mesh>
      <mesh position={[-0.42,2.54,0.9]} material={MAT_GIGA_DARK}><sphereGeometry args={[0.25,8,8]}/></mesh>
      <mesh position={[ 0.42,2.54,0.9]} material={MAT_GIGA_DARK}><sphereGeometry args={[0.25,8,8]}/></mesh>
      {/* Nasal horn ridge */}
      <mesh position={[0,2.82,0.72]} rotation={[0.2,0,0]} material={MAT_GIGA_SCALE}><boxGeometry args={[0.18,0.14,0.48]}/></mesh>
      {/* Upper jaw */}
      <mesh position={[0,2.38,1.42]} material={MAT_GIGA_BODY}><boxGeometry args={[0.66,0.26,0.74]}/></mesh>
      {/* Lower jaw */}
      <mesh position={[0,2.2,1.38]} material={MAT_GIGA_DARK}><boxGeometry args={[0.58,0.2,0.68]}/></mesh>
      {/* Teeth */}
      {[-0.2,-0.1,0,0.1,0.2].map((ox,i) => (
        <React.Fragment key={i}>
          <mesh position={[ox,2.31,1.72]} rotation={[0.45,0,0]} material={MAT_TOOTH}><coneGeometry args={[0.028,0.12,4]}/></mesh>
          <mesh position={[ox,2.24,1.68]} rotation={[-0.45,0,0]} material={MAT_TOOTH}><coneGeometry args={[0.022,0.09,4]}/></mesh>
        </React.Fragment>
      ))}
      {/* Eyes */}
      <mesh position={[-0.28,2.68,1.0]} material={EYE_ORG}><sphereGeometry args={[0.085,9,9]}/></mesh>
      <mesh position={[ 0.28,2.68,1.0]} material={EYE_ORG}><sphereGeometry args={[0.085,9,9]}/></mesh>
      {/* Brow */}
      <mesh position={[-0.29,2.78,0.92]} rotation={[0.35,0,0]} material={MAT_GIGA_DARK}><boxGeometry args={[0.15,0.1,0.24]}/></mesh>
      <mesh position={[ 0.29,2.78,0.92]} rotation={[0.35,0,0]} material={MAT_GIGA_DARK}><boxGeometry args={[0.15,0.1,0.24]}/></mesh>
      {/* Tail */}
      <mesh position={[0,1.4,-1.02]} rotation={[-0.4,0,0]} material={MAT_GIGA_BODY}><cylinderGeometry args={[0.09,0.38,1.95,8]}/></mesh>
      <mesh position={[0,1.04,-2.14]} rotation={[-0.2,0,0]} material={MAT_GIGA_DARK}><cylinderGeometry args={[0.03,0.09,1.2,6]}/></mesh>
    </group>
  );
}

// ─── Minimap ──────────────────────────────────────────────────────────────────
const MM_SIZE  = 164;   // canvas pixels
const MM_WORLD = WORLD_MAX + 8; // world units with small border

const DINO_DOT_COLOR: Record<DinoId, string> = {
  velociraptor:   '#ff5555',
  spinosaurus:    '#55aaff',
  pterodactylus:  '#ffcc33',
  trex:           '#ff2222',
  giganotosaurus: '#ff7700',
  hunter:         '#ffffff',
};

function Minimap({ posRef, yawRef, getDinoStatus }: {
  posRef:        React.MutableRefObject<{x:number;y:number}>;
  yawRef:        React.MutableRefObject<number>;
  getDinoStatus: (id: DinoId) => 'remaining' | 'captured' | 'fled';
}) {
  const canvasRef      = useRef<HTMLCanvasElement>(null!);
  const statusRef      = useRef(getDinoStatus);
  useEffect(() => { statusRef.current = getDinoStatus; });

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d')!;
    const S = MM_SIZE;
    const W = MM_WORLD;
    const wx = (x: number) => Math.round((x / W) * S);
    const wz = (z: number) => Math.round((z / W) * S);

    let raf: number;
    let blinkTimer = 0;
    let blinkOn = true;
    let last = performance.now();

    function draw(time: number) {
      const dt = time - last; last = time;
      blinkTimer += dt;
      if (blinkTimer > 480) { blinkTimer = 0; blinkOn = !blinkOn; }

      ctx.clearRect(0, 0, S, S);

      // ── Ground background ──
      ctx.fillStyle = '#0b1a0b';
      ctx.fillRect(0, 0, S, S);

      // ── Subtle dot-grid ──
      ctx.fillStyle = 'rgba(50,100,50,0.22)';
      for (let gx = 0; gx < S; gx += 16)
        for (let gz = 0; gz < S; gz += 16) {
          ctx.fillRect(gx, gz, 1, 1);
        }

      // ── Volcano glow ──
      const vx = wx(VOLCANO_X), vz = wz(VOLCANO_Z);
      const vg = ctx.createRadialGradient(vx, vz, 1, vx, vz, 16);
      vg.addColorStop(0,   'rgba(255,80,0,1)');
      vg.addColorStop(0.35,'rgba(255,40,0,0.55)');
      vg.addColorStop(1,   'rgba(255,10,0,0)');
      ctx.fillStyle = vg;
      ctx.beginPath(); ctx.arc(vx, vz, 16, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#ff5500';
      ctx.beginPath(); ctx.arc(vx, vz, 3.5, 0, Math.PI*2); ctx.fill();

      // ── Dino lairs ──
      for (const lair of LAIRS) {
        const st  = statusRef.current(lair.dinoId);
        const lx  = wx(lair.x);
        const lz  = wz(lair.y);
        const col = st === 'captured' ? '#44ff88' : st === 'fled' ? '#ff5555' : DINO_DOT_COLOR[lair.dinoId];

        if (st === 'remaining') {
          // soft glow halo
          const halo = ctx.createRadialGradient(lx, lz, 0, lx, lz, 8);
          halo.addColorStop(0, col + 'bb');
          halo.addColorStop(1, col + '00');
          ctx.fillStyle = halo;
          ctx.beginPath(); ctx.arc(lx, lz, 8, 0, Math.PI*2); ctx.fill();
        }

        ctx.globalAlpha = st === 'remaining' ? 1 : 0.55;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(lx, lz, 3.2, 0, Math.PI*2); ctx.fill();

        if (st === 'captured') {
          ctx.strokeStyle = '#44ff88'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(lx, lz, 5.5, 0, Math.PI*2); ctx.stroke();
        } else if (st === 'fled') {
          ctx.strokeStyle = '#ff5555'; ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(lx-3.5, lz-3.5); ctx.lineTo(lx+3.5, lz+3.5);
          ctx.moveTo(lx+3.5, lz-3.5); ctx.lineTo(lx-3.5, lz+3.5);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // ── Player ──
      const px = wx(posRef.current.x);
      const pz = wz(posRef.current.y);
      // Facing wedge (always visible so the player can navigate)
      const yaw = yawRef.current;
      const HALF = 0.30; // half-angle of FOV wedge
      const LEN  = 13;
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.moveTo(px, pz);
      // yaw=0 faces -Z (north on minimap), rotate accordingly
      const dir = -yaw - Math.PI / 2;
      ctx.arc(px, pz, LEN, dir - HALF, dir + HALF);
      ctx.closePath();
      ctx.fill();

      // Blinking dot
      if (blinkOn) {
        // outer ring
        ctx.strokeStyle = '#aaffaa'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(px, pz, 5.5, 0, Math.PI*2); ctx.stroke();
        // center
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(px, pz, 3.0, 0, Math.PI*2); ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.beginPath(); ctx.arc(px, pz, 3.0, 0, Math.PI*2); ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []); // runs once; posRef/yawRef/statusRef are refs so always fresh

  return (
    <div style={{ position:'relative' }}>
      {/* Frame */}
      <div style={{
        position:'absolute', inset:-2,
        borderRadius:10,
        background:'linear-gradient(135deg,rgba(80,160,60,0.5),rgba(30,80,20,0.3))',
        border:'2px solid rgba(80,180,60,0.6)',
        boxShadow:'0 0 12px rgba(60,200,40,0.25),inset 0 0 8px rgba(0,0,0,0.6)',
        pointerEvents:'none',
      }}/>
      <canvas
        ref={canvasRef}
        width={MM_SIZE}
        height={MM_SIZE}
        style={{ display:'block', borderRadius:8 }}
      />
      {/* Label */}
      <div style={{
        position:'absolute', top:4, left:0, right:0,
        textAlign:'center', fontSize:7, fontWeight:900,
        color:'rgba(150,255,120,0.6)', textTransform:'uppercase', letterSpacing:'0.1em',
        pointerEvents:'none',
      }}>Minimap</div>
      {/* Legend row */}
      <div style={{
        position:'absolute', bottom:4, left:4, right:4,
        display:'flex', justifyContent:'space-between', alignItems:'center',
        fontSize:6, fontWeight:800, color:'rgba(255,255,255,0.3)',
        textTransform:'uppercase', letterSpacing:'0.05em',
        pointerEvents:'none',
      }}>
        <span style={{ color:'rgba(255,80,0,0.7)' }}>🌋 Volcano</span>
        <span style={{ color:'rgba(200,255,200,0.5)' }}>● You</span>
      </div>
    </div>
  );
}

// ─── Dino eye heights & colors ────────────────────────────────────────────────
const DINO_EYE_Y: Record<DinoId, number>     = { velociraptor:2.6, spinosaurus:6.4, pterodactylus:6.2, trex:9.7, giganotosaurus:12.1, hunter:0 };
const DINO_EYE_COLOR: Record<DinoId, string> = { velociraptor:'#ff1100', spinosaurus:'#ffaa00', pterodactylus:'#ff8800', trex:'#ff0000', giganotosaurus:'#ff5500', hunter:'#ffffff' };

// ─── Animated dino wrapper ────────────────────────────────────────────────────
function ScaryDino({ lair, status, isNearby, isEncounterable, playerPosRef }: {
  lair: LairDef; status: DinoStatus; isNearby: boolean; isEncounterable: boolean;
  playerPosRef: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const groupRef  = useRef<THREE.Group>(null!);
  const breathRef = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    const pp = playerPosRef.current;
    const angle = Math.atan2(pp.x - lair.x, pp.y - lair.y);
    if (groupRef.current && status === 'remaining')
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, angle, isNearby ? 0.055 : 0.009);
    if (breathRef.current)
      breathRef.current.scale.y = 1 + Math.sin(clock.getElapsedTime()*0.85)*0.022;
  });
  if (status !== 'remaining') return null;
  const eyeH = DINO_EYE_Y[lair.dinoId] ?? 10;
  const eyeC = DINO_EYE_COLOR[lair.dinoId] ?? '#ff0000';
  const Body =
    lair.dinoId === 'velociraptor'  ? <VelociraptorBody /> :
    lair.dinoId === 'spinosaurus'   ? <SpinosaurusBody /> :
    lair.dinoId === 'pterodactylus' ? <PterodactylusBody /> :
    lair.dinoId === 'trex'          ? <TRexBody /> : <GiganotosaurusBody />;
  return (
    <group ref={groupRef} position={[lair.x, getTerrainHeight(lair.x, lair.y), lair.y]}>
      <group ref={breathRef}>{Body}</group>
      <pointLight position={[0,eyeH,2.5]} intensity={isEncounterable?6:isNearby?3.5:1.4} color={eyeC} distance={isNearby?38:22} decay={2}/>
    </group>
  );
}

// ─── Lava field around volcano ────────────────────────────────────────────────
// Uses only module-level materials (MAT_LAVA_*) — never creates materials inside render.
// "Flowing" effect: each river's material pulses at a different phase, so rivers
// glow independently giving a sense of movement.
const R1_SEGS: [number,number,number][] = [[-12,0.22,-9],[-22,0.18,-18],[-32,0.14,-28],[-44,0.10,-38],[-58,0.06,-50],[-72,0.02,-62]];
const R2_SEGS: [number,number,number][] = [[-12,0.22,12],[-22,0.18,22],[-32,0.14,32],[-44,0.10,44],[-58,0.06,57],[-72,0.02,72]];
const R3_SEGS: [number,number,number][] = [[14,0.22,2],[26,0.18,2],[38,0.14,2],[52,0.10,2],[67,0.06,2],[82,0.02,2]];

const RING_LIGHTS: [number,number,number,string][] = Array.from({length:14}, (_,i) => {
  const a = (i/14)*Math.PI*2;
  return [Math.cos(a)*18, 2.5, Math.sin(a)*18, i%2===0?'#ff3300':'#ff6600'];
});

function LavaField() {
  const glow1 = useRef<THREE.PointLight>(null!);
  const glow2 = useRef<THREE.PointLight>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Pool breathes
    MAT_LAVA_POOL.emissiveIntensity = 3.0 + Math.sin(t * 1.6) * 1.2;
    // Each river pulses with different phase — staggered → looks like flow
    MAT_LAVA_R1.emissiveIntensity   = 1.4 + Math.sin(t * 2.2 + 0.0) * 1.1;
    MAT_LAVA_R2.emissiveIntensity   = 1.4 + Math.sin(t * 2.2 + 1.2) * 1.1;
    MAT_LAVA_R3.emissiveIntensity   = 1.4 + Math.sin(t * 2.2 + 2.4) * 1.1;
    if (glow1.current) glow1.current.intensity = 12 + Math.sin(t * 2.1) * 4;
    if (glow2.current) glow2.current.intensity =  8 + Math.sin(t * 1.7 + 1.0) * 3;
  });

  return (
    <group position={[VOLCANO_X, 0, VOLCANO_Z]}>
      {/* Main lava pool */}
      <mesh position={[0,0.18,0]} rotation={[-Math.PI/2,0,0]} material={MAT_LAVA_POOL}>
        <circleGeometry args={[20,32]}/>
      </mesh>
      {/* Cooled crust ring */}
      <mesh position={[0,0.09,0]} rotation={[-Math.PI/2,0,0]} material={MAT_LAVA_CRUST}>
        <ringGeometry args={[20,34,32]}/>
      </mesh>

      {/* River 1 — NW */}
      {R1_SEGS.map(([x,y,z],i) => (
        <mesh key={`r1${i}`} position={[x,y,z]} rotation={[-Math.PI/2,0,Math.PI*0.25]} material={MAT_LAVA_R1}>
          <planeGeometry args={[5,10]}/>
        </mesh>
      ))}
      {R1_SEGS.map(([x,y,z],i) => <mesh key={`c1${i}`} position={[x,y-0.04,z]} rotation={[-Math.PI/2,0,Math.PI*0.25]} material={MAT_LAVA_CRUST}><planeGeometry args={[8,11]}/></mesh>)}

      {/* River 2 — SW */}
      {R2_SEGS.map(([x,y,z],i) => (
        <mesh key={`r2${i}`} position={[x,y,z]} rotation={[-Math.PI/2,0,-Math.PI*0.2]} material={MAT_LAVA_R2}>
          <planeGeometry args={[5,10]}/>
        </mesh>
      ))}
      {R2_SEGS.map(([x,y,z],i) => <mesh key={`c2${i}`} position={[x,y-0.04,z]} rotation={[-Math.PI/2,0,-Math.PI*0.2]} material={MAT_LAVA_CRUST}><planeGeometry args={[8,11]}/></mesh>)}

      {/* River 3 — E */}
      {R3_SEGS.map(([x,y,z],i) => (
        <mesh key={`r3${i}`} position={[x,y,z]} rotation={[-Math.PI/2,0,Math.PI*0.5]} material={MAT_LAVA_R3}>
          <planeGeometry args={[5,10]}/>
        </mesh>
      ))}
      {R3_SEGS.map(([x,y,z],i) => <mesh key={`c3${i}`} position={[x,y-0.04,z]} rotation={[-Math.PI/2,0,Math.PI*0.5]} material={MAT_LAVA_CRUST}><planeGeometry args={[8,11]}/></mesh>)}

      {/* ── Lights ── */}
      <pointLight ref={glow1} position={[0,8,0]}   intensity={32} color="#ff4400" distance={160} decay={1.2}/>
      <pointLight ref={glow2} position={[0,3,0]}   intensity={18} color="#ff6600" distance={110} decay={1.4}/>
      {RING_LIGHTS.map(([x,y,z,col],i) => <pointLight key={`rl${i}`} position={[x,y,z]} intensity={12} color={col} distance={90} decay={1.8}/>)}
      {R1_SEGS.map(([x,,z],i) => <pointLight key={`ll1${i}`} position={[x,3,z]} intensity={9} color="#ff4400" distance={55} decay={2}/>)}
      {R2_SEGS.map(([x,,z],i) => <pointLight key={`ll2${i}`} position={[x,3,z]} intensity={9} color="#ff5500" distance={55} decay={2}/>)}
      {R3_SEGS.map(([x,,z],i) => <pointLight key={`ll3${i}`} position={[x,3,z]} intensity={9} color="#ff3800" distance={55} decay={2}/>)}
      <pointLight position={[0,60,0]} intensity={18} color="#ff2200" distance={280} decay={1.0}/>
    </group>
  );
}

// ─── Hill terrain ─────────────────────────────────────────────────────────────
function Hill({ x, z, rx, rz, h }: HillDef) {
  return (
    <mesh position={[x, 0, z]} scale={[rx, h, rz]} material={MAT_HILL}>
      <sphereGeometry args={[1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]}/>
    </mesh>
  );
}

// ─── Bush cluster ─────────────────────────────────────────────────────────────
function Bush({ x, z, s }: BushDef) {
  const ty = getTerrainHeight(x, z);
  return (
    <group position={[x, ty, z]}>
      <mesh position={[0,       s*0.55, 0      ]} material={MAT_BUSH_D}><sphereGeometry args={[s*0.9, 6, 5]}/></mesh>
      <mesh position={[s*0.55,  s*0.40, s*0.3  ]} material={MAT_BUSH_L}><sphereGeometry args={[s*0.65,5, 4]}/></mesh>
      <mesh position={[-s*0.45, s*0.35, -s*0.35]} material={MAT_BUSH_D}><sphereGeometry args={[s*0.70,5, 4]}/></mesh>
    </group>
  );
}

// ─── Rock cluster ─────────────────────────────────────────────────────────────
function Rock({ x, z, s, rot, sy }: RockDef) {
  const ty = getTerrainHeight(x, z);
  return (
    <group position={[x, ty, z]} rotation={[0, rot, 0]}>
      <mesh scale={[s, s * sy, s * 0.88]} material={MAT_ROCK}><sphereGeometry args={[1, 7, 6]}/></mesh>
      <mesh position={[s*0.54, -s*0.07, s*0.38]} scale={[s*0.48, s*sy*0.5, s*0.46]} material={MAT_ROCK_B}><sphereGeometry args={[1, 6, 5]}/></mesh>
      <mesh position={[-s*0.4, -s*0.09, -s*0.44]} scale={[s*0.38, s*sy*0.44, s*0.42]} material={MAT_ROCK_C}><sphereGeometry args={[1, 6, 5]}/></mesh>
    </group>
  );
}

// ─── Grass tuft (crossed billboard planes) ────────────────────────────────────
function GrassTuft({ x, z, h, rot }: GrassDef) {
  const ty = getTerrainHeight(x, z);
  const mat = h > 0.65 ? MAT_GRASS_A : MAT_GRASS_B;
  return (
    <group position={[x, ty + h * 0.5, z]}>
      <mesh rotation={[0, rot,                0]} material={mat}><planeGeometry args={[h * 0.6, h]}/></mesh>
      <mesh rotation={[0, rot + Math.PI / 2, 0]} material={mat}><planeGeometry args={[h * 0.6, h]}/></mesh>
    </group>
  );
}

// ─── Ground colour patches ─────────────────────────────────────────────────────
const PATCH_MATS = [MAT_PATCH_D, MAT_PATCH_L, MAT_PATCH_M] as const;
function GroundPatch({ x, z, rx, rz, mi }: PatchDef) {
  return (
    <mesh position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[rx, rz, 1]} material={PATCH_MATS[mi]}>
      <circleGeometry args={[1, 14]}/>
    </mesh>
  );
}

// ─── Water pool ───────────────────────────────────────────────────────────────
function WaterPool({ x, z, rx, rz }: { x:number; z:number; rx:number; rz:number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) (ref.current.material as THREE.MeshStandardMaterial).roughness = 0.03 + Math.sin(clock.getElapsedTime() * 0.35) * 0.025;
  });
  return (
    <mesh ref={ref} position={[x, 0.06, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[rx, rz, 1]} material={MAT_WATER}>
      <circleGeometry args={[1, 22]}/>
    </mesh>
  );
}

// ─── Volcano (large realistic) ────────────────────────────────────────────────
function VolcanoMesh() {
  const craterRef      = useRef<THREE.Mesh>(null!);
  const smoke1Ref      = useRef<THREE.Mesh>(null!);
  const smoke2Ref      = useRef<THREE.Mesh>(null!);
  const smoke3Ref      = useRef<THREE.Mesh>(null!);
  const smoke4Ref      = useRef<THREE.Mesh>(null!);
  const craterLightRef = useRef<THREE.PointLight>(null!);

  const VH = VOLCANO_H, VR = VOLCANO_R;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (craterRef.current)
      (craterRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 3.5 + Math.sin(t * 1.9) * 2.2;
    if (smoke1Ref.current) {
      smoke1Ref.current.position.y = VH + 4 + Math.sin(t * 0.55) * 1.2;
      smoke1Ref.current.scale.setScalar(1 + Math.sin(t * 0.36) * 0.14);
    }
    if (smoke2Ref.current) {
      smoke2Ref.current.position.set(3 + Math.sin(t * 0.21) * 0.6, VH + 10 + Math.sin(t * 0.42 + 1.0) * 1.0, 1.2);
      smoke2Ref.current.scale.setScalar(1 + Math.sin(t * 0.26 + 0.9) * 0.17);
      (smoke2Ref.current.material as THREE.MeshStandardMaterial).opacity = 0.2 + Math.sin(t * 0.6) * 0.07;
    }
    if (smoke3Ref.current) {
      smoke3Ref.current.position.set(-2 + Math.cos(t * 0.18) * 0.5, VH + 17 + Math.sin(t * 0.35 + 2.1) * 0.9, 2);
      smoke3Ref.current.scale.setScalar(1 + Math.sin(t * 0.28 + 1.5) * 0.13);
    }
    if (smoke4Ref.current) {
      smoke4Ref.current.position.set(1.5, VH + 26 + Math.sin(t * 0.3 + 0.5) * 0.8, -1);
      smoke4Ref.current.scale.setScalar(1 + Math.sin(t * 0.22 + 2.4) * 0.1);
    }
    if (craterLightRef.current)
      craterLightRef.current.intensity = 30 + Math.sin(t * 2.2) * 12;
  });

  return (
    <group position={[VOLCANO_X, 0, VOLCANO_Z]}>
      {/* Main cone body */}
      <mesh position={[0, VH/2, 0]}>
        <coneGeometry args={[VR, VH, 18]}/>
        <meshStandardMaterial color="#0d0502" roughness={0.98}/>
      </mesh>

      {/* Geological strata bands — each a slightly different shade and size */}
      <mesh position={[0, 8,  0]}><coneGeometry args={[VR*0.96, 13, 16]}/><meshStandardMaterial color="#160805" roughness={0.97}/></mesh>
      <mesh position={[0, 19, 0]}><coneGeometry args={[VR*0.76, 15, 15]}/><meshStandardMaterial color="#0e0401" roughness={0.96}/></mesh>
      <mesh position={[0, 31, 0]}><coneGeometry args={[VR*0.52, 16, 14]}/><meshStandardMaterial color="#130503" roughness={0.97}/></mesh>
      <mesh position={[0, 43, 0]}><coneGeometry args={[VR*0.28, 14, 13]}/><meshStandardMaterial color="#0f0402" roughness={0.98}/></mesh>
      <mesh position={[0, 51, 0]}><coneGeometry args={[VR*0.12, 10, 12]}/><meshStandardMaterial color="#1a0706" roughness={0.97}/></mesh>

      {/* Ash ledge ridges — horizontal rings at different heights */}
      {[0.18, 0.36, 0.55, 0.72, 0.88].map((t, i) => {
        const ry = VH * t, rr = VR * (1 - t) + 1.2;
        return <mesh key={`ledge${i}`} position={[0, ry, 0]}>
          <torusGeometry args={[rr, 0.6 + (1-t)*0.8, 5, 18]}/>
          <meshStandardMaterial color="#120404" roughness={0.97}/>
        </mesh>;
      })}

      {/* Glowing lava-crack veins up the slope */}
      {[0,1,2,3,4,5,6,7].map(i => {
        const a = (i / 8) * Math.PI * 2 + 0.3;
        const tMid = 0.3 + (i % 4) * 0.12;
        const r = VR * tMid, h = VH * (1 - tMid);
        return (
          <mesh key={`vein${i}`} position={[Math.cos(a)*r, h, Math.sin(a)*r]}>
            <sphereGeometry args={[0.7 + (1-tMid)*0.4, 5, 5]}/>
            <meshStandardMaterial color="#ff3300" emissive="#ff1100" emissiveIntensity={2.2 + (i%3)*0.6} roughness={0.1} toneMapped={false}/>
          </mesh>
        );
      })}

      {/* Crater rim — thick and jagged torus */}
      <mesh position={[0, VH, 0]}>
        <torusGeometry args={[9, 2.5, 10, 22]}/>
        <meshStandardMaterial color="#1a0704" roughness={0.94}/>
      </mesh>
      {/* Inner crater glowing ring */}
      <mesh position={[0, VH + 0.6, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[6.5, 9, 22]}/>
        <meshStandardMaterial color="#ff2200" emissive="#ff0800" emissiveIntensity={2.2} roughness={0.3}/>
      </mesh>
      {/* Crater lava pool */}
      <mesh ref={craterRef} position={[0, VH + 1.2, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <circleGeometry args={[6.5, 22]}/>
        <meshStandardMaterial color="#ff4400" emissive="#ff2200" emissiveIntensity={4} roughness={0.12}/>
      </mesh>

      {/* Dense rock boulder ring at the base */}
      {Array.from({length:16}, (_,i) => {
        const a = (i/16)*Math.PI*2, r = VR*0.9 + Math.sin(i*1.7)*3;
        const sc = 1.4 + Math.cos(i*2.3)*0.6;
        return <mesh key={`br${i}`} position={[Math.cos(a)*r, 1 + Math.sin(i)*0.6, Math.sin(a)*r]} material={MAT_ROCK}><sphereGeometry args={[1.6*sc,7,6]}/></mesh>;
      })}
      {/* Outer scattered boulders */}
      {Array.from({length:12}, (_,i) => {
        const a = (i/12)*Math.PI*2+0.3, r = VR*1.1 + Math.sin(i*2.1)*4;
        return <mesh key={`ob${i}`} position={[Math.cos(a)*r, 0.5+Math.cos(i)*0.4, Math.sin(a)*r]} material={MAT_ROCK}><sphereGeometry args={[1.0+Math.sin(i)*0.4,6,5]}/></mesh>;
      })}
      {/* Mid-slope rocky outcroppings */}
      {[0,1,2,3,4,5,6,7].map(i => {
        const a = (i/8)*Math.PI*2 + 0.6;
        const tMid = 0.2 + (i%4)*0.08;
        const r = VR*tMid + 1, h = VH*(1-tMid) - 1.5;
        return <mesh key={`mr${i}`} position={[Math.cos(a)*r, h, Math.sin(a)*r]} material={MAT_ROCK}><sphereGeometry args={[1.0+Math.cos(i)*0.35,6,5]}/></mesh>;
      })}

      {/* Smoke plumes — billow up in layers */}
      <mesh ref={smoke1Ref} position={[0, VH+4, 0]} material={MAT_SMOKE}><sphereGeometry args={[5, 9, 9]}/></mesh>
      <mesh ref={smoke2Ref} position={[3, VH+10, 1.2]}>
        <sphereGeometry args={[7, 8, 8]}/>
        <meshStandardMaterial color="#111118" transparent opacity={0.22} roughness={1}/>
      </mesh>
      <mesh ref={smoke3Ref} position={[-2, VH+17, 2]}>
        <sphereGeometry args={[9, 8, 8]}/>
        <meshStandardMaterial color="#0e0e15" transparent opacity={0.17} roughness={1}/>
      </mesh>
      <mesh ref={smoke4Ref} position={[1.5, VH+26, -1]}>
        <sphereGeometry args={[12, 7, 7]}/>
        <meshStandardMaterial color="#0a0a12" transparent opacity={0.12} roughness={1}/>
      </mesh>

      {/* Crater point light */}
      <pointLight ref={craterLightRef} position={[0, VH+6, 0]} intensity={30} color="#ff2200" distance={220} decay={1.1}/>
    </group>
  );
}

// ─── Lava flow animation driver (updates per-segment materials) ────────────────
function LavaFlowAnimator() {
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    for (let i = 0; i < FLOW_N; i++) {
      // Wave travels top (i=0) → bottom (i=FLOW_N-1) over time
      FLOW_SEG_MATS[i].emissiveIntensity = 1.3 + Math.sin(t * 2.6 - i * 0.85) * 1.4;
    }
  });
  return null;
}

// ─── Single lava flow channel down the cone ───────────────────────────────────
function LavaFlowOnVolcano({ angle }: { angle: number }) {
  return (
    <group position={[VOLCANO_X, 0, VOLCANO_Z]} rotation={[0, angle, 0]}>
      {Array.from({ length: FLOW_N }, (_, i) => {
        const tMid = (i + 0.5) / FLOW_N;
        // Position on the cone surface in the theta=0 local frame:
        // x = radial distance outward, y = height
        const lx = VOLCANO_R * tMid;
        const ly = VOLCANO_H * (1 - tMid);
        return (
          <mesh key={i} position={[lx, ly, 0]} rotation={[0, 0, FLOW_ROT_Z]} material={FLOW_SEG_MATS[i]}>
            {/* args: [thickness, length-along-slope, width-around-cone] */}
            <boxGeometry args={[0.22, FLOW_SEG_LEN, 1.5]}/>
          </mesh>
        );
      })}
    </group>
  );
}

// ─── Captured / fled markers ──────────────────────────────────────────────────
function CapturedMarker({ x, z, status }: { x: number; z: number; status: 'captured' | 'fled' }) {
  return (
    <mesh position={[x,1.5,z]}>
      <cylinderGeometry args={[0.5,0.7,3,7]}/>
      <meshStandardMaterial color={status==='captured'?'#44cc55':'#888899'} emissive={status==='captured'?'#22aa33':'#444466'} emissiveIntensity={0.6}/>
    </mesh>
  );
}

// ─── FPS Camera + Flashlight ──────────────────────────────────────────────────
function FPSCamera({ posRef, yawRef, pitchRef, movingRef, flashlightOnRef }: {
  posRef: React.MutableRefObject<{x:number;y:number}>;
  yawRef: React.MutableRefObject<number>;
  pitchRef: React.MutableRefObject<number>;
  movingRef: React.MutableRefObject<boolean>;
  flashlightOnRef: React.MutableRefObject<boolean>;
}) {
  const { camera, scene } = useThree();
  const flashRef   = useRef<THREE.SpotLight>(null!);
  const targetObj  = useRef(new THREE.Object3D());

  useEffect(() => {
    camera.rotation.order = 'YXZ';
    scene.add(targetObj.current);
    return () => { scene.remove(targetObj.current); };
  }, [camera, scene]);

  useFrame(({ clock }) => {
    const bob = movingRef.current ? Math.sin(clock.getElapsedTime() * 8) * 0.07 : 0;
    const px = posRef.current.x, pz = EYE_HEIGHT + bob, py = posRef.current.y;
    camera.position.set(px, pz, py);
    camera.rotation.y = yawRef.current;
    camera.rotation.x = pitchRef.current;

    if (flashRef.current) {
      const yaw = yawRef.current, pitch = pitchRef.current;
      const dx = -Math.sin(yaw) * Math.cos(pitch);
      const dy =  Math.sin(pitch);
      const dz = -Math.cos(yaw) * Math.cos(pitch);
      flashRef.current.position.set(px, pz, py);
      targetObj.current.position.set(px + dx * 40, pz + dy * 40, py + dz * 40);
      flashRef.current.target = targetObj.current;
      flashRef.current.intensity = flashlightOnRef.current ? 280 : 0;
    }
  });

  return (
    <spotLight
      ref={flashRef}
      intensity={280}
      angle={Math.PI / 5}
      penumbra={0.5}
      distance={130}
      decay={1.5}
      color="#ddeeff"
      castShadow={false}
    />
  );
}

// ─── Day / Night Cycle ────────────────────────────────────────────────────────
function DayNightCycle() {
  const { scene } = useThree();
  const ambRef   = useRef<THREE.AmbientLight>(null!);
  const sunRef   = useRef<THREE.DirectionalLight>(null!);
  const fillRef  = useRef<THREE.DirectionalLight>(null!);
  const bgCol    = useRef(new THREE.Color());
  const CYCLE    = 30; // seconds per full day

  useFrame(({ clock }) => {
    const t = (clock.getElapsedTime() % CYCLE) / CYCLE; // 0 → 1
    // sunPhase: -1 = midnight, +1 = noon
    const sunPhase  = Math.sin(t * Math.PI * 2 - Math.PI * 0.5);
    const dayF      = Math.max(0, sunPhase);               // 0 at night, 1 at noon
    const dawnDusk  = Math.max(0, 1 - Math.abs(sunPhase) * 3); // spike at horizon crossing

    // ── Ambient ──
    if (ambRef.current) {
      ambRef.current.intensity = 0.12 + dayF * 0.45 + dawnDusk * 0.15;
      ambRef.current.color.setRGB(
        0.07 + dayF * 0.14 + dawnDusk * 0.18,
        0.10 + dayF * 0.24 + dawnDusk * 0.07,
        0.08 + dayF * 0.22 + dawnDusk * 0.02
      );
    }

    // ── Sun (moves across sky) ──
    if (sunRef.current) {
      const ang = t * Math.PI * 2;
      sunRef.current.position.set(-Math.cos(ang) * 160, Math.sin(ang) * 200, -80);
      sunRef.current.intensity = dayF * 0.75 + dawnDusk * 0.45;
      sunRef.current.color.setRGB(
        0.80 + dawnDusk * 0.20,
        0.55 + dayF * 0.32 - dawnDusk * 0.08,
        0.32 + dayF * 0.48 - dawnDusk * 0.22
      );
    }

    // ── Cool fill / moonlight ──
    if (fillRef.current) {
      fillRef.current.intensity = 0.18 + dayF * 0.10;
    }

    // ── Sky background ──
    bgCol.current.setRGB(
      0.009 + dayF * 0.022 + dawnDusk * 0.018,
      0.010 + dayF * 0.032 + dawnDusk * 0.006,
      0.009 + dayF * 0.026 + dawnDusk * 0.002
    );
    scene.background = bgCol.current;

    // ── Fog colour ──
    if (scene.fog) {
      (scene.fog as THREE.Fog).color.setRGB(
        0.007 + dayF * 0.016 + dawnDusk * 0.013,
        0.008 + dayF * 0.026 + dawnDusk * 0.004,
        0.007 + dayF * 0.018 + dawnDusk * 0.001
      );
    }
  });

  return (
    <>
      <ambientLight ref={ambRef} intensity={0.18} color="#152515"/>
      <directionalLight ref={sunRef} intensity={0} position={[0, 200, -80]}/>
      <directionalLight ref={fillRef} intensity={0.22} color="#6677bb" position={[100, 60, 150]}/>
    </>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────
function WorldScene({ posRef, yawRef, pitchRef, movingRef, getDinoStatus, nearbyDinos, encounterable, flashlightOnRef }: {
  posRef: React.MutableRefObject<{x:number;y:number}>;
  yawRef: React.MutableRefObject<number>;
  pitchRef: React.MutableRefObject<number>;
  movingRef: React.MutableRefObject<boolean>;
  getDinoStatus: (id:DinoId)=>DinoStatus;
  nearbyDinos: Set<DinoId>;
  encounterable: DinoId|null;
  flashlightOnRef: React.MutableRefObject<boolean>;
}) {
  return (
    <>
      <fog attach="fog" args={['#060c06',3,115]}/>
      <DayNightCycle/>
      <mesh position={[150,0,150]} rotation={[-Math.PI/2,0,0]} material={MAT_GROUND}><planeGeometry args={[340,340]}/></mesh>
      {GROUND_PATCHES.map((p,i) => <GroundPatch key={i} {...p}/>)}
      {WATER_POOLS.map((w,i) => <WaterPool key={i} {...w}/>)}
      <GroundFog/>
      {HILLS.map((h,i) => <Hill key={i} {...h}/>)}
      {ROCKS.map((r,i) => <Rock key={i} {...r}/>)}
      {BUSHES.map((b,i) => <Bush key={i} {...b}/>)}
      {GRASS_TUFTS.map((g,i) => <GrassTuft key={i} {...g}/>)}
      {WORLD_TREES.map((t,i) => <Tree key={i} {...t}/>)}
      {FIREFLY_DEFS.map((f,i) => <Firefly key={i} {...f}/>)}
      {LAIRS.map(lair => (
        <ScaryDino key={lair.dinoId} lair={lair} status={getDinoStatus(lair.dinoId)}
          isNearby={nearbyDinos.has(lair.dinoId)} isEncounterable={encounterable===lair.dinoId}
          playerPosRef={posRef}/>
      ))}
      {LAIRS.map(lair => {
        const st = getDinoStatus(lair.dinoId);
        if (st === 'remaining') return null;
        return <CapturedMarker key={`c_${lair.dinoId}`} x={lair.x} z={lair.y} status={st}/>;
      })}
      <LavaField/>
      <VolcanoMesh/>
      <LavaFlowAnimator/>
      <LavaFlowOnVolcano angle={0}/>
      <LavaFlowOnVolcano angle={Math.PI * 0.28}/>
      <LavaFlowOnVolcano angle={Math.PI * 0.56}/>
      <LavaFlowOnVolcano angle={Math.PI * 0.84}/>
      <LavaFlowOnVolcano angle={Math.PI * 1.12}/>
      <LavaFlowOnVolcano angle={Math.PI * 1.42}/>
      <LavaFlowOnVolcano angle={Math.PI * 1.72}/>
      <FPSCamera posRef={posRef} yawRef={yawRef} pitchRef={pitchRef} movingRef={movingRef} flashlightOnRef={flashlightOnRef}/>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function OpenWorld() {
  const ctx = useContext(GameContext);
  const posRef       = useRef({ x: 85, y: 85 });
  const yawRef       = useRef(Math.PI);
  const pitchRef     = useRef(0);
  const movingRef    = useRef(false);
  const keysRef      = useRef<Set<string>>(new Set());
  const rafRef       = useRef(0);
  const isDraggingRef    = useRef(false);
  const lastMouseRef     = useRef({ x: 0, y: 0 });
  const lastNearbyKey    = useRef('');
  const lastEncounteR    = useRef<DinoId|null>(null);
  const flashlightOnRef  = useRef(true);

  const [nearbyDinos,     setNearbyDinos]     = useState<Set<DinoId>>(new Set());
  const [encounterable,   setEncounterable]   = useState<DinoId|null>(null);
  const [encounterFlash,  setEncounterFlash]  = useState<DinoId|null>(null);
  const [isDragging,      setIsDragging]      = useState(false);
  const [flashlightOn,    setFlashlightOn]    = useState(true);

  const state         = ctx?.state;
  const capturedDinos = state?.capturedDinos ?? [];
  const fledDinos     = state?.huntFledDinos  ?? [];

  const getDinoStatus = useCallback((id: DinoId): DinoStatus => {
    if (capturedDinos.includes(id)) return 'captured';
    if (fledDinos.includes(id))     return 'fled';
    return 'remaining';
  }, [capturedDinos, fledDinos]);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (e.key === 'f' || e.key === 'F') {
        flashlightOnRef.current = !flashlightOnRef.current;
        setFlashlightOn(flashlightOnRef.current);
      }
    };
    const onUp   = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener('keydown', onDown, { passive: true });
    window.addEventListener('keyup',   onUp,   { passive: true });
    const tick = () => {
      const keys = keysRef.current;
      let { x, y } = posRef.current;
      let moved = false;
      const fwdX=-Math.sin(yawRef.current), fwdZ=-Math.cos(yawRef.current);
      const rtX=Math.cos(yawRef.current),   rtZ=-Math.sin(yawRef.current);
      if (keys.has('ArrowUp')    || keys.has('w') || keys.has('W')) { x+=fwdX*SPEED; y+=fwdZ*SPEED; moved=true; }
      if (keys.has('ArrowDown')  || keys.has('s') || keys.has('S')) { x-=fwdX*SPEED; y-=fwdZ*SPEED; moved=true; }
      if (keys.has('ArrowLeft')  || keys.has('a') || keys.has('A')) { x-=rtX*SPEED;  y-=rtZ*SPEED;  moved=true; }
      if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) { x+=rtX*SPEED;  y+=rtZ*SPEED;  moved=true; }
      movingRef.current = moved;
      if (moved) {
        x = Math.max(3, Math.min(WORLD_MAX, x));
        y = Math.max(3, Math.min(WORLD_MAX, y));
        if (dist(x, y, VOLCANO_X, VOLCANO_Z) < VOLCANO_COL_R) { x=posRef.current.x; y=posRef.current.y; }
        posRef.current = { x, y };
        const nb = new Set<DinoId>(); let enc: DinoId|null = null;
        for (const lair of LAIRS) {
          if (getDinoStatus(lair.dinoId) !== 'remaining') continue;
          const d = dist(x, y, lair.x, lair.y);
          if (d < DETECT_RADIUS)    nb.add(lair.dinoId);
          if (d < ENCOUNTER_RADIUS) enc = lair.dinoId;
        }
        const nbKey = [...nb].sort().join(',');
        if (nbKey !== lastNearbyKey.current) { lastNearbyKey.current=nbKey; setNearbyDinos(new Set(nb)); }
        if (enc   !== lastEncounteR.current) { lastEncounteR.current=enc;   setEncounterable(enc); }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('keydown',onDown); window.removeEventListener('keyup',onUp); };
  }, [getDinoStatus]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (e.button!==0 && e.button!==2) return; isDraggingRef.current=true; lastMouseRef.current={x:e.clientX,y:e.clientY}; setIsDragging(true); };
    const onMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      yawRef.current  -= (e.clientX-lastMouseRef.current.x)*MOUSE_SENS;
      pitchRef.current = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitchRef.current-(e.clientY-lastMouseRef.current.y)*MOUSE_SENS));
      lastMouseRef.current = { x:e.clientX, y:e.clientY };
    };
    const onUp   = (e: MouseEvent) => { if (e.button!==0 && e.button!==2) return; isDraggingRef.current=false; setIsDragging(false); };
    const noCtx  = (e: Event) => e.preventDefault();
    window.addEventListener('mousedown',   onDown);
    window.addEventListener('mousemove',   onMove);
    window.addEventListener('mouseup',     onUp);
    window.addEventListener('contextmenu', noCtx);
    return () => { window.removeEventListener('mousedown',onDown); window.removeEventListener('mousemove',onMove); window.removeEventListener('mouseup',onUp); window.removeEventListener('contextmenu',noCtx); };
  }, []);

  const handleEngage = () => {
    if (!encounterable) return;
    const id = encounterable;
    setEncounterFlash(id);
    setTimeout(() => { setEncounterFlash(null); ctx?.dispatch({ type:'ENCOUNTER_DINO', wildDinoId:id }); }, 900);
  };

  if (!ctx || !state) return null;
  const capturedCount = capturedDinos.length;
  const allDone       = capturedCount + fledDinos.length >= LAIRS.length;
  const dinoName      = encounterable ? DINOSAURS[encounterable]?.name ?? encounterable : '';

  return (
    <div style={{ position:'fixed', inset:0, background:'#040804', userSelect:'none', cursor:isDragging?'grabbing':'default' }}>
      <Canvas camera={{ position:[85,EYE_HEIGHT,140], fov:78, near:0.05, far:500 }} gl={{ antialias:true, alpha:false }} style={{ position:'absolute', inset:0 }}>
        <WorldScene posRef={posRef} yawRef={yawRef} pitchRef={pitchRef} movingRef={movingRef} getDinoStatus={getDinoStatus} nearbyDinos={nearbyDinos} encounterable={encounterable} flashlightOnRef={flashlightOnRef}/>
      </Canvas>

      {/* Crosshair */}
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none', zIndex:10 }}>
        <div style={{ position:'relative', width:18, height:18 }}>
          <div style={{ position:'absolute', top:'50%', left:0, right:0, height:1, background:'rgba(255,255,255,0.55)', marginTop:-0.5 }}/>
          <div style={{ position:'absolute', left:'50%', top:0, bottom:0, width:1, background:'rgba(255,255,255,0.55)', marginLeft:-0.5 }}/>
          <div style={{ position:'absolute', top:'50%', left:'50%', width:5, height:5, border:'1px solid rgba(255,255,255,0.5)', borderRadius:'50%', transform:'translate(-50%,-50%)' }}/>
        </div>
      </div>

      {/* Top HUD */}
      <div style={{ position:'absolute', top:0, left:0, right:0, zIndex:20, padding:'10px 14px', display:'flex', alignItems:'flex-start', justifyContent:'space-between', background:'linear-gradient(180deg,rgba(0,0,0,0.8) 0%,transparent 100%)', pointerEvents:'none' }}>
        <div>
          <div style={{ fontWeight:900, textTransform:'uppercase', letterSpacing:'0.1em', color:'#88dd44', fontSize:14, textShadow:'0 0 10px #44aa22' }}>🌿 WILD HUNT</div>
          <div style={{ color:'#557733', fontSize:9, fontWeight:700, marginTop:2 }}>WASD to move · Click &amp; drag to look · [F] Flashlight: {flashlightOn ? '🔦 ON' : '⬛ OFF'}</div>
        </div>
        <div style={{ background:'rgba(0,0,0,0.75)', border:'2px solid #44aa22', borderRadius:10, padding:'5px 12px', textAlign:'center' }}>
          <div style={{ color:'#88dd44', fontSize:9, fontWeight:800, textTransform:'uppercase' }}>Captured</div>
          <div style={{ color:'#aaffaa', fontSize:22, fontWeight:900, lineHeight:1 }}>{capturedCount}/{LAIRS.length}</div>
        </div>
      </div>

      {/* Encounter prompt */}
      <AnimatePresence>
        {encounterable && !encounterFlash && (
          <motion.div key="enc" initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} exit={{opacity:0,y:20}}
            style={{ position:'absolute', bottom:110, left:'50%', transform:'translateX(-50%)', zIndex:30, textAlign:'center', pointerEvents:'auto' }}>
            <motion.div animate={{scale:[1,1.04,1],opacity:[0.85,1,0.85]}} transition={{duration:1.1,repeat:Infinity}}
              style={{ fontWeight:900, fontSize:22, color:'#ff4422', textShadow:'0 0 16px #ff1100,0 0 32px #880000', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
              ⚠ {dinoName} ⚠
            </motion.div>
            <div style={{ fontSize:11, color:'rgba(255,180,150,0.8)', fontWeight:700, marginBottom:10 }}>It has spotted you…</div>
            <button onClick={handleEngage} style={{ padding:'10px 28px', fontWeight:900, fontSize:16, background:'linear-gradient(135deg,#cc0000,#880000)', border:'2px solid #ff2200', borderRadius:10, color:'white', textTransform:'uppercase', cursor:'pointer', boxShadow:'0 4px 0 #440000,0 0 24px rgba(255,0,0,0.6)' }}>⚔️ ENGAGE!</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nearby warning */}
      <AnimatePresence>
        {nearbyDinos.size>0 && !encounterable && (
          <motion.div key="near" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{ position:'absolute', bottom:110, left:'50%', transform:'translateX(-50%)', zIndex:25, pointerEvents:'none' }}>
            <motion.div animate={{opacity:[0.6,1,0.6]}} transition={{duration:1.4,repeat:Infinity}}
              style={{ background:'rgba(0,0,0,0.75)', border:'1px solid rgba(255,120,0,0.7)', borderRadius:10, padding:'7px 18px' }}>
              <span style={{ fontSize:13, fontWeight:800, color:'#ffbb44' }}>🌿 Something large moves in the dark…</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Encounter flash */}
      <AnimatePresence>
        {encounterFlash && (
          <motion.div initial={{opacity:0}} animate={{opacity:[0,0.9,0.7,1,0]}} exit={{opacity:0}} transition={{duration:0.9}}
            style={{ position:'absolute', inset:0, zIndex:50, background:'rgba(180,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
            <div style={{ fontWeight:900, fontSize:44, color:'white', textTransform:'uppercase', textShadow:'0 0 24px #ff0000,3px 3px 0 rgba(0,0,0,0.7)', letterSpacing:'0.12em' }}>⚔️ ENCOUNTER!</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hunt complete */}
      {allDone && !encounterFlash && (
        <div style={{ position:'absolute', inset:0, zIndex:40, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <motion.div initial={{scale:0.7}} animate={{scale:1}} transition={{type:'spring',stiffness:280}}
            style={{ background:'#0a1e07', border:'3px solid #44aa22', borderRadius:18, padding:'28px 36px', textAlign:'center' }}>
            <div style={{ fontSize:52 }}>🏆</div>
            <div style={{ fontSize:24, fontWeight:900, color:'#88ff44', textTransform:'uppercase', marginBottom:8 }}>Hunt Complete!</div>
            <div style={{ fontSize:14, color:'#aaddaa', marginBottom:18 }}>Captured: {capturedCount} / {LAIRS.length}</div>
            <button onClick={()=>ctx.dispatch({type:'RESET'})} style={{ padding:'11px 26px', background:'linear-gradient(135deg,#44aa22,#228811)', border:'2px solid #115500', borderRadius:10, color:'white', fontWeight:900, fontSize:15, cursor:'pointer' }}>Play Again</button>
          </motion.div>
        </div>
      )}

      {/* Bottom HUD */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:20, padding:'8px 12px', display:'flex', justifyContent:'space-between', alignItems:'flex-end', background:'linear-gradient(0deg,rgba(0,0,0,0.75) 0%,transparent 100%)', pointerEvents:'none' }}>
        <div style={{ background:'rgba(0,0,0,0.7)', border:'1px solid #44aa22', borderRadius:8, padding:'6px 10px' }}>
          <div style={{ fontSize:8, fontWeight:800, color:'#88dd44', textTransform:'uppercase', marginBottom:4 }}>Dinosaurs</div>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', maxWidth:180 }}>
            {LAIRS.map(lair => {
              const st=getDinoStatus(lair.dinoId), isNear=nearbyDinos.has(lair.dinoId);
              return (
                <div key={lair.dinoId} style={{ fontSize:7, fontWeight:800, textTransform:'uppercase', padding:'2px 6px', borderRadius:4,
                  background:st==='captured'?'#1a5522':st==='fled'?'#3a1a1a':isNear?'#2a1a00':'#0d1808',
                  color:st==='captured'?'#88ff88':st==='fled'?'#ff8888':isNear?'#ffaa44':'#668844',
                  border:`1px solid ${st==='captured'?'#44aa55':st==='fled'?'#aa3333':isNear?'#aa6600':'#2a4a1a'}` }}>
                  {st==='captured'?'✓':st==='fled'?'✗':isNear?'⚠':'?'}{' '}
                  {lair.dinoId==='velociraptor'?'Veloc':lair.dinoId==='giganotosaurus'?'Gigan':lair.dinoId==='spinosaurus'?'Spino':lair.dinoId==='trex'?'T-Rex':'Ptero'}
                </div>
              );
            })}
          </div>
        </div>
        {/* Minimap — bottom-right */}
        <Minimap posRef={posRef} yawRef={yawRef} getDinoStatus={getDinoStatus}/>
      </div>
    </div>
  );
}
