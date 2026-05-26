import { DinoId } from '../lib/dino-data';
import velociraptor from '../assets/velociraptor.png';
import giganotosaurus from '../assets/giganotosaurus.png';
import spinosaurus from '../assets/spinosaurus.png';
import trex from '../assets/trex.png';
import pterodactylus from '../assets/pterodactylus.png';

const DINO_IMAGES: Record<DinoId, string> = {
  velociraptor, giganotosaurus, spinosaurus, trex, pterodactylus,
};

interface DinoImgProps {
  dinoId: DinoId;
  className?: string;
  style?: React.CSSProperties;
  flipped?: boolean;
}

export function DinoSvg({ dinoId, className, style, flipped }: DinoImgProps) {
  const flipT = flipped ? 'scaleX(-1)' : undefined;
  const imgBase: React.CSSProperties = {
    objectFit: 'contain', userSelect: 'none', pointerEvents: 'none',
    flexShrink: 0, display: 'block',
    transform: flipT,
  };

  /* ══════════════════════════════════════════════════════════
     VELOCIRAPTOR PACK — 2 raptors, flex row
     filter / className both live on the wrapper so CSS
     hit-flash / breathe animations affect the whole group
  ══════════════════════════════════════════════════════════ */
  if (dinoId === 'velociraptor') {
    const h        = typeof style?.height === 'number' ? style.height : 90;
    const backH    = Math.round(h * 0.70);
    const backElev = Math.round(h * 0.16);
    const gap      = Math.max(4, Math.round(h * 0.07));

    return (
      <div
        className={className}
        style={{
          ...style,
          display: 'inline-flex',
          alignItems: 'flex-end',
          gap,
          height: h,
          width: 'auto',
          transform: undefined,  // flip lives on each img, not wrapper
          transformOrigin: 'bottom center',
        }}
      >
        <img src={velociraptor} draggable={false} alt="raptor-front"
          style={{ ...imgBase, height: h, width: 'auto' }} />
        <img src={velociraptor} draggable={false} alt="raptor-back"
          style={{ ...imgBase, height: backH, width: 'auto', opacity: 0.78, marginBottom: backElev }} />
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════
     PTERODACTYL FLOCK — 3 birds at staggered heights
  ══════════════════════════════════════════════════════════ */
  if (dinoId === 'pterodactylus') {
    const h      = typeof style?.height === 'number' ? style.height : 90;
    const cH     = Math.round(h * 1.15);
    const bird1H = Math.round(h * 0.42);
    const bird2H = Math.round(h * 0.66);
    const gap    = Math.max(4, Math.round(h * 0.06));

    return (
      <div
        className={className}
        style={{
          ...style,
          display: 'inline-flex',
          alignItems: 'flex-end',
          gap,
          height: cH,
          width: 'auto',
          transform: undefined,
          transformOrigin: 'bottom center',
        }}
      >
        <img src={pterodactylus} draggable={false} alt="ptero-back"
          style={{ ...imgBase, height: bird1H, width: 'auto', opacity: 0.60, marginBottom: Math.round(h * 0.64) }} />
        <img src={pterodactylus} draggable={false} alt="ptero-lead"
          style={{ ...imgBase, height: h, width: 'auto' }} />
        <img src={pterodactylus} draggable={false} alt="ptero-mid"
          style={{ ...imgBase, height: bird2H, width: 'auto', opacity: 0.82, marginBottom: Math.round(h * 0.22) }} />
      </div>
    );
  }

  /* ── Single-image dinos ── */
  return (
    <img
      src={DINO_IMAGES[dinoId]}
      alt={dinoId}
      className={className}
      style={{
        ...style,
        transform: flipT,
        objectFit: 'contain',
        objectPosition: 'bottom center',
      }}
      draggable={false}
    />
  );
}
