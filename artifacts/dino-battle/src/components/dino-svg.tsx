import { DinoId } from '../lib/dino-data';
import velociraptor from '../assets/velociraptor.png';
import giganotosaurus from '../assets/giganotosaurus.png';
import spinosaurus from '../assets/spinosaurus.png';
import trex from '../assets/trex.png';
import pterodactylus from '../assets/pterodactylus.png';

const DINO_IMAGES: Record<DinoId, string> = {
  velociraptor,
  giganotosaurus,
  spinosaurus,
  trex,
  pterodactylus,
};

interface DinoImgProps {
  dinoId: DinoId;
  className?: string;
  style?: React.CSSProperties;
  flipped?: boolean;
}

export function DinoSvg({ dinoId, className, style, flipped }: DinoImgProps) {

  /* ══════════════════════════════════════════════════════════════
     VELOCIRAPTOR PACK — 2 raptors in a flex row
     Front raptor (left): full height, grounded
     Back  raptor (right): 70% height, elevated + faded
     Each img gets scaleX(-1) for opponent side
  ══════════════════════════════════════════════════════════════ */
  if (dinoId === 'velociraptor') {
    const h        = typeof style?.height === 'number' ? style.height : 90;
    const backH    = Math.round(h * 0.70);
    const backElev = Math.round(h * 0.16);
    const gap      = Math.max(4, Math.round(h * 0.07));
    const flipT    = flipped ? 'scaleX(-1)' : undefined;
    const f        = style?.filter;
    const imgS: React.CSSProperties = {
      objectFit: 'contain', userSelect: 'none', pointerEvents: 'none', flexShrink: 0,
    };

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
          filter: undefined,
          transform: undefined,
        }}
      >
        {/* Front raptor — full size, grounded */}
        <img src={velociraptor} draggable={false} alt="raptor-front"
          style={{ ...imgS, height: h, width: 'auto', transform: flipT, filter: f }} />
        {/* Back raptor — smaller, elevated, faded */}
        <img src={velociraptor} draggable={false} alt="raptor-back"
          style={{ ...imgS, height: backH, width: 'auto', transform: flipT, filter: f, opacity: 0.78, marginBottom: backElev }} />
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     PTERODACTYL FLOCK — 3 birds in a flex row at varied heights
     Order (L→R): upper-back | lead | mid-flank
     Each at a different elevation via marginBottom, creating a
     loose diagonal "diving formation" silhouette
  ══════════════════════════════════════════════════════════════ */
  if (dinoId === 'pterodactylus') {
    const h      = typeof style?.height === 'number' ? style.height : 90;
    const cH     = Math.round(h * 1.15); // extra height for upper bird
    const bird1H = Math.round(h * 0.42); // small back bird
    const bird2H = Math.round(h * 0.66); // medium mid bird
    const gap    = Math.max(4, Math.round(h * 0.06));
    const flipT  = flipped ? 'scaleX(-1)' : undefined;
    const f      = style?.filter;
    const imgS: React.CSSProperties = {
      objectFit: 'contain', userSelect: 'none', pointerEvents: 'none', flexShrink: 0,
    };

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
          filter: undefined,
          transform: undefined,
        }}
      >
        {/* Small upper-back bird — high altitude, leftmost */}
        <img src={pterodactylus} draggable={false} alt="ptero-back"
          style={{ ...imgS, height: bird1H, width: 'auto', transform: flipT, filter: f,
                   opacity: 0.60, marginBottom: Math.round(h * 0.64) }} />
        {/* Lead bird — full size, lowest (closest to ground) */}
        <img src={pterodactylus} draggable={false} alt="ptero-lead"
          style={{ ...imgS, height: h, width: 'auto', transform: flipT, filter: f }} />
        {/* Medium mid-flank bird — mid altitude, rightmost */}
        <img src={pterodactylus} draggable={false} alt="ptero-mid"
          style={{ ...imgS, height: bird2H, width: 'auto', transform: flipT, filter: f,
                   opacity: 0.82, marginBottom: Math.round(h * 0.22) }} />
      </div>
    );
  }

  /* ── All other dinos: single image ── */
  return (
    <img
      src={DINO_IMAGES[dinoId]}
      alt={dinoId}
      className={className}
      style={{
        ...style,
        transform: flipped ? 'scaleX(-1)' : undefined,
        objectFit: 'contain',
        objectPosition: 'bottom center',
      }}
      draggable={false}
    />
  );
}
