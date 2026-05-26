import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';

// ── Particle Systems for Move Effects ───────────────────────────────────────

interface ParticleConfig {
  type: 'slash' | 'bite' | 'stomp' | 'tail' | 'roar' | 'electric' | 'fire' | 'claw' | 'beak' | 'shockwave';
  color: string;
  count: number;
  spread: number;
  duration: number;
}

const PARTICLE_CONFIGS: Record<string, ParticleConfig> = {
  // Velociraptor moves
  sickle_claw: { type: 'claw', color: '#c03020', count: 12, spread: 60, duration: 0.6 },
  pack_feint: { type: 'slash', color: '#8888ff', count: 6, spread: 40, duration: 0.5 },
  leap_strike: { type: 'claw', color: '#ff4444', count: 16, spread: 70, duration: 0.7 },
  bite_raptor: { type: 'bite', color: '#880000', count: 8, spread: 50, duration: 0.5 },
  frenzy_blitz: { type: 'claw', color: '#ff6600', count: 24, spread: 90, duration: 1.0 },

  // Giganotosaurus moves
  crushing_bite: { type: 'bite', color: '#660000', count: 16, spread: 70, duration: 0.7 },
  body_slam: { type: 'stomp', color: '#664422', count: 20, spread: 80, duration: 0.8 },
  tail_sweep_giga: { type: 'tail', color: '#553311', count: 14, spread: 100, duration: 0.65 },
  roar: { type: 'roar', color: '#ffaa00', count: 10, spread: 60, duration: 0.8 },
  apex_domination: { type: 'stomp', color: '#cc0000', count: 30, spread: 110, duration: 1.2 },

  // Spinosaurus moves
  sail_slam: { type: 'shockwave', color: '#4488aa', count: 12, spread: 65, duration: 0.55 },
  tail_whip: { type: 'tail', color: '#335577', count: 10, spread: 95, duration: 0.6 },
  ambush_strike: { type: 'bite', color: '#446688', count: 14, spread: 55, duration: 0.55 },
  bite_spino: { type: 'bite', color: '#224466', count: 10, spread: 50, duration: 0.5 },
  death_roll: { type: 'shockwave', color: '#006688', count: 22, spread: 85, duration: 1.0 },

  // T-Rex moves
  rex_bite: { type: 'bite', color: '#550000', count: 18, spread: 75, duration: 0.7 },
  stomp: { type: 'stomp', color: '#664400', count: 22, spread: 85, duration: 0.75 },
  headbutt: { type: 'shockwave', color: '#773322', count: 16, spread: 70, duration: 0.6 },
  rex_roar: { type: 'roar', color: '#ff8800', count: 14, spread: 70, duration: 0.9 },
  tyrants_wrath: { type: 'bite', color: '#880000', count: 35, spread: 120, duration: 1.3 },

  // Pterodactyl moves
  talon_rake: { type: 'claw', color: '#aa8866', count: 18, spread: 65, duration: 0.55 },
  aerial_dodge: { type: 'slash', color: '#88aadd', count: 8, spread: 50, duration: 0.6 },
  beak_stab: { type: 'beak', color: '#664422', count: 12, spread: 55, duration: 0.5 },
  screech: { type: 'roar', color: '#ddaa00', count: 12, spread: 65, duration: 0.7 },
  screech_dive: { type: 'claw', color: '#ff6600', count: 28, spread: 100, duration: 1.0 },
};

// ── Particle Component ─────────────────────────────────────────────────────

function MoveParticle({ type, color, index, total, spread }: {
  type: string;
  color: string;
  index: number;
  total: number;
  spread: number;
}) {
  const angle = (index / total) * Math.PI * 2;
  const distanceVariation = 20 + Math.random() * spread;

  const startX = Math.cos(angle) * 50;
  const startY = Math.sin(angle) * 50;
  const endX = Math.cos(angle) * distanceVariation;
  const endY = Math.sin(angle) * distanceVariation;

  let particleSize = 8;
  let particleShape = 'circle';

  if (type === 'claw') {
    particleShape = 'triangle';
    particleSize = 12;
  } else if (type === 'bite') {
    particleShape = 'diamond';
    particleSize = 10;
  } else if (type === 'stomp') {
    particleShape = 'square';
    particleSize = 14;
  } else if (type === 'tail') {
    particleShape = 'ellipse';
    particleSize = 16;
  } else if (type === 'roar') {
    particleShape = 'wave';
    particleSize = 18;
  } else if (type === 'beak') {
    particleShape = 'triangle';
    particleSize = 14;
  }

  const rotation = angle * (180 / Math.PI);

  return React.createElement(motion.div, {
    className: `particle-${particleShape}`,
    style: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: particleSize,
      height: particleSize,
      backgroundColor: color,
      border: `2px solid ${color}`,
      opacity: 0,
      boxShadow: `0 0 ${particleSize/2}px ${color}`
    },
    initial: {
      x: startX,
      y: startY,
      opacity: 0,
      scale: 0.3,
      rotate: rotation
    },
    animate: {
      x: [startX, endX],
      y: [startY, endY],
      opacity: [0, 1, 1, 0],
      scale: [0.3, 1, 1.2, 0],
      rotate: rotation + 45
    },
    exit: {
      opacity: 0,
      scale: 0
    },
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1]
    }
  });
}

// ── Impact Flash Effect ─────────────────────────────────────────────────────

function ImpactFlash({ color }: { color: string }) {
  return React.createElement(motion.div, {
    style: {
      position: 'absolute',
      inset: 0,
      background: `radial-gradient(circle, ${color}44 0%, transparent 70%)`,
      pointerEvents: 'none'
    },
    initial: { opacity: 0, scale: 0.5 },
    animate: { opacity: [0, 0.8, 0], scale: [0.5, 1.5, 2] },
    exit: { opacity: 0 },
    transition: { duration: 0.3, ease: 'easeOut' }
  });
}

// ── Main Move Effect Component ───────────────────────────────────────────

interface MoveEffectProps {
  abilityId: string;
  side: 'player' | 'opponent';
  onComplete?: () => void;
}

export function MoveEffect({ abilityId, side, onComplete }: MoveEffectProps) {
  const config = PARTICLE_CONFIGS[abilityId];

  if (!config) return null;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, config.duration * 1000);

    return () => clearTimeout(timer);
  }, [onComplete, config.duration]);

  const particles = [];
  for (let i = 0; i < config.count; i++) {
    particles.push(
      React.createElement(MoveParticle, {
        key: i,
        type: config.type,
        color: config.color,
        index: i,
        total: config.count,
        spread: config.spread
      })
    );
  }

  const position = side === 'opponent'
    ? { top: '20%', right: '15%' }
    : { bottom: '25%', left: '15%' };

  return React.createElement(AnimatePresence, null,
    React.createElement(motion.div, {
      className: 'pointer-events-none absolute',
      style: {
        width: 150,
        height: 150,
        ...position
      }
    },
      particles,
      React.createElement(ImpactFlash, { color: config.color })
    )
  );
}

// ── Special Effect Overlays ───────────────────────────────────────────────

export function DizzyStars({ active }: { active: boolean }) {
  if (!active) return null;

  return React.createElement(motion.div, {
    className: 'absolute',
    style: {
      top: -30,
      left: '50%',
      transform: 'translateX(-50%)'
    },
    animate: {
      rotate: [0, 360]
    },
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear'
    }
  },
    React.createElement('span', {
      style: { fontSize: 28, opacity: 0.9 }
    }, '💫')
  );
}

export function ShieldEffect({ active, color = '#4488ff' }: {
  active: boolean;
  color?: string;
}) {
  if (!active) return null;

  return React.createElement(motion.div, {
    className: 'absolute inset-0 rounded-full',
    style: {
      border: `3px solid ${color}`,
      background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
      opacity: 0.7
    },
    animate: {
      scale: [1, 1.1, 1],
      opacity: [0.7, 0.9, 0.7]
    },
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  });
}

export function PowerUpEffect({ active, label }: {
  active: boolean;
  label: string;
}) {
  return React.createElement(AnimatePresence, null,
    active && React.createElement(motion.div, {
      style: {
        position: 'absolute',
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '2px 8px',
        background: 'rgba(255,220,0,0.9)',
        border: '2px solid #ff8800',
        borderRadius: 4,
        fontWeight: 'bold',
        fontSize: 12,
        color: '#333',
        whiteSpace: 'nowrap'
      },
      initial: { opacity: 0, y: 20, scale: 0.5 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: -20, scale: 0.8 },
      transition: { duration: 0.3 }
    }, label)
  );
}

// ── Bite Wound Effect ─────────────────────────────────────────────────────

export function BiteWound({ side }: { side: 'player' | 'opponent' }) {
  return React.createElement(motion.div, {
    style: {
      position: 'absolute',
      width: 40,
      height: 40,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      opacity: 0,
      pointerEvents: 'none'
    },
    initial: { opacity: 0, scale: 0.5 },
    animate: { opacity: [0, 1, 1, 0], scale: [0.5, 1, 1.2, 0] },
    transition: { duration: 0.4 },
    exit: { opacity: 0 }
  },
    React.createElement('svg', {
      viewBox: '0 0 40 40',
      style: { width: '100%', height: '100%' }
    },
      React.createElement('circle', {
        cx: 20,
        cy: 20,
        r: 18,
        fill: 'none',
        stroke: '#660000',
        strokeWidth: 3,
        strokeDasharray: '4 2'
      }),
      React.createElement('line', {
        x1: 8,
        y1: 12,
        x2: 32,
        y2: 28,
        stroke: '#880000',
        strokeWidth: 2
      }),
      React.createElement('line', {
        x1: 32,
        y1: 12,
        x2: 8,
        y2: 28,
        stroke: '#880000',
        strokeWidth: 2
      })
    )
  );
}

// ── Claw Mark Effect ─────────────────────────────────────────────────────

export function ClawMarks({ count = 3, color = '#aa0000' }: {
  count?: number;
  color?: string;
}) {
  const marks = [];
  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * 8;
    marks.push(
      React.createElement(motion.div, {
        key: i,
        style: {
          position: 'absolute',
          width: 28,
          height: 4,
          background: `linear-gradient(90deg, ${color} 0%, ${color}88 50%, transparent 100%)`,
          transform: `translateX(${offset}px) rotate(${-25 + i * 20}deg)`,
          borderRadius: 2
        },
        initial: { opacity: 0, scale: 0.3, x: offset - 20 },
        animate: { opacity: [0, 1, 1, 0], scale: [0.3, 1, 1, 0], x: offset + 30 },
        transition: { duration: 0.35, delay: i * 0.05 }
      })
    );
  }

  return React.createElement('div', {
    className: 'absolute pointer-events-none',
    style: { top: '50%', left: '50%' }
  }, marks);
}

// ── Ground Crack Effect ───────────────────────────────────────────────────

export function GroundCrack({ active }: { active: boolean }) {
  if (!active) return null;

  const cracks = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    cracks.push(
      React.createElement(motion.div, {
        key: i,
        style: {
          position: 'absolute',
          width: 50 + Math.random() * 30,
          height: 2,
          background: 'linear-gradient(90deg, #222 0%, transparent 100%)',
          transform: `rotate(${angle * (180/Math.PI)}deg)`,
          transformOrigin: 'left center',
          left: '50%',
          top: '50%'
        },
        initial: { scale: 0, opacity: 0 },
        animate: { scale: [0, 1.2], opacity: [0, 1, 0.7] },
        transition: { duration: 0.3, delay: i * 0.03 }
      })
    );
  }

  return React.createElement('div', {
    className: 'absolute inset-0 pointer-events-none'
  }, cracks);
}
