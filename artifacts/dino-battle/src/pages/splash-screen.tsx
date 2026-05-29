import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  onEnter: () => void;
}

export default function SplashScreen({ onEnter }: Props) {
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 600);
    return () => clearTimeout(t);
  }, []);

  // Animated particle rain on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    interface Particle { x: number; y: number; vy: number; size: number; alpha: number; color: string; }
    const COLORS = ['#44ff22', '#22cc11', '#88ff44', '#33ee11', '#66ff33'];
    const particles: Particle[] = Array.from({ length: 120 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vy: 0.3 + Math.random() * 1.1,
      size: 1 + Math.random() * 2.2,
      alpha: 0.08 + Math.random() * 0.3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    interface Ember { x: number; y: number; vy: number; vx: number; size: number; life: number; maxLife: number; }
    const embers: Ember[] = Array.from({ length: 30 }, () => ({
      x: Math.random() * W,
      y: H * 0.6 + Math.random() * H * 0.4,
      vy: -(0.4 + Math.random() * 1.4),
      vx: (Math.random() - 0.5) * 0.6,
      size: 1 + Math.random() * 2,
      life: Math.random() * 120,
      maxLife: 80 + Math.random() * 120,
    }));

    let frame = 0;
    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, W, H);

      // Green falling particles
      for (const p of particles) {
        p.y += p.vy;
        if (p.y > H) { p.y = -4; p.x = Math.random() * W; }
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ember particles rising from bottom
      for (const e of embers) {
        e.y += e.vy;
        e.x += e.vx;
        e.life++;
        if (e.life > e.maxLife) {
          e.x = Math.random() * W;
          e.y = H * 0.65 + Math.random() * H * 0.35;
          e.life = 0;
        }
        const prog = e.life / e.maxLife;
        const fadeAlpha = prog < 0.2 ? prog / 0.2 : prog > 0.7 ? 1 - (prog - 0.7) / 0.3 : 1;
        ctx.globalAlpha = fadeAlpha * 0.55;
        ctx.fillStyle = prog < 0.5 ? '#ff6600' : '#ff2200';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * (1 - prog * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const handleClick = () => {
    if (!ready || leaving) return;
    setLeaving(true);
    setTimeout(onEnter, 700);
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: 0.7 }}
      onClick={handleClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: ready ? 'pointer' : 'default',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Deep jungle background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 30%, #0d2e08 0%, #060f04 40%, #020602 100%)',
      }} />

      {/* Particle canvas */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      {/* Jungle silhouette layer */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%',
        background: 'linear-gradient(0deg, #010701 0%, #030e02 60%, transparent 100%)',
        zIndex: 1,
      }} />

      {/* Tree silhouettes */}
      <svg style={{ position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', height: '55%', zIndex: 2 }} viewBox="0 0 1440 400" preserveAspectRatio="xMidYMax slice">
        {[
          [0,400],[60,160],[120,400],[200,200],[280,400],[340,130],[440,400],[500,180],[580,400],[650,110],[740,400],[820,150],[900,400],[980,170],[1060,400],[1140,120],[1220,400],[1300,160],[1380,400],[1440,400]
        ].map(([x,y],i) => i%2===0 ? null : (
          <polygon key={i} points={`${x},400 ${x},${y} ${(x as number)+40},${y} ${(x as number)+40},400`} fill={`rgba(2,${8+((i*7)%10)},2,${0.7+((i%3)*0.1)})`} />
        ))}
        {/* Wide canopy trees */}
        {[50,200,380,560,740,920,1100,1280].map((x,i) => (
          <g key={`tree_${i}`}>
            <rect x={x+18} y={280} width={8} height={120} fill="#030903" />
            <ellipse cx={x+22} cy={260} rx={38} ry={55} fill="#020702" />
            <ellipse cx={x+8} cy={275} rx={28} ry={40} fill="#030903" />
            <ellipse cx={x+36} cy={272} rx={30} ry={42} fill="#020802" />
          </g>
        ))}
      </svg>

      {/* Volcano glow at back */}
      <div style={{
        position: 'absolute', bottom: '18%', right: '12%', width: 220, height: 220,
        background: 'radial-gradient(ellipse at 50% 80%, rgba(255,60,0,0.18) 0%, transparent 70%)',
        zIndex: 3,
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '0 20px' }}>

        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, letterSpacing: '0.8em' }}
          animate={{ opacity: ready ? 0.7 : 0, letterSpacing: ready ? '0.4em' : '0.8em' }}
          transition={{ duration: 1, delay: 0.2 }}
          style={{
            fontSize: 11, fontWeight: 800, color: '#88cc44',
            textTransform: 'uppercase', letterSpacing: '0.4em',
            marginBottom: 18, textShadow: '0 0 12px #44aa22',
          }}
        >
          ⚔&nbsp;PREHISTORIC SURVIVAL ARENA&nbsp;⚔
        </motion.div>

        {/* Main title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6, y: 30 }}
          animate={{ opacity: ready ? 1 : 0, scale: ready ? 1 : 0.6, y: ready ? 0 : 30 }}
          transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.1 }}
          style={{ position: 'relative', display: 'inline-block' }}
        >
          <div style={{
            fontSize: 'clamp(64px, 12vw, 130px)',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            lineHeight: 0.9,
            background: 'linear-gradient(180deg, #ffffff 0%, #ccff88 35%, #88dd22 70%, #446611 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 40px rgba(100,220,30,0.5)) drop-shadow(0 4px 0 rgba(0,0,0,0.9))',
          }}>
            PRIMAL
          </div>
          <div style={{
            fontSize: 'clamp(64px, 12vw, 130px)',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            lineHeight: 0.9,
            background: 'linear-gradient(180deg, #ffeeaa 0%, #ff9900 40%, #cc4400 80%, #660000 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 40px rgba(255,100,0,0.5)) drop-shadow(0 4px 0 rgba(0,0,0,0.9))',
          }}>
            CLASH
          </div>

          {/* Title glow behind */}
          <div style={{
            position: 'absolute', inset: '-20px -40px',
            background: 'radial-gradient(ellipse, rgba(80,180,20,0.15) 0%, transparent 70%)',
            zIndex: -1,
          }} />
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: ready ? 1 : 0, opacity: ready ? 1 : 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          style={{
            width: '100%', maxWidth: 500, height: 2, margin: '22px auto',
            background: 'linear-gradient(90deg, transparent, #88dd22, #ff6600, #88dd22, transparent)',
            boxShadow: '0 0 12px rgba(136,221,34,0.6)',
          }}
        />

        {/* Subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: ready ? 0.8 : 0, y: ready ? 0 : 12 }}
          transition={{ duration: 0.7, delay: 0.7 }}
          style={{
            fontSize: 13, fontWeight: 700, color: '#aaddaa',
            textTransform: 'uppercase', letterSpacing: '0.25em',
            marginBottom: 48, textShadow: '0 0 8px rgba(100,200,50,0.4)',
          }}
        >
          Hunt · Battle · Survive
        </motion.div>

        {/* Click prompt */}
        <AnimatePresence>
          {ready && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: [0.5, 1, 0.5], y: 0 }}
              transition={{ opacity: { duration: 1.6, repeat: Infinity }, y: { duration: 0.5 } }}
              style={{
                fontSize: 13, fontWeight: 800, color: '#88ff44',
                textTransform: 'uppercase', letterSpacing: '0.2em',
                textShadow: '0 0 16px #44cc22',
              }}
            >
              ▶ &nbsp; CLICK TO ENTER &nbsp; ◀
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Corner dino eyes (ambient atmosphere) */}
      {[
        { top: '22%', left: '5%' },
        { top: '35%', right: '6%' },
        { top: '55%', left: '8%' },
      ].map((pos, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.2, 0.9, 0.2], scale: [1, 1.15, 1] }}
          transition={{ duration: 2.2 + i * 0.7, repeat: Infinity, delay: i * 1.1 }}
          style={{
            position: 'absolute', ...pos, zIndex: 5,
            display: 'flex', gap: 10,
          }}
        >
          {[0, 1].map(j => (
            <div key={j} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: i === 1 ? '#ff6600' : '#ff2200',
              boxShadow: `0 0 12px 4px ${i === 1 ? '#ff4400' : '#ff0000'}`,
            }} />
          ))}
        </motion.div>
      ))}
    </motion.div>
  );
}
