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
  // Pterodactylus renders as a flock of 3
  if (dinoId === 'pterodactylus') {
    const h = typeof style?.height === 'number' ? style.height : 90;
    const w = Math.round(h * 1.9);
    const flip: React.CSSProperties = flipped ? { transform: 'scaleX(-1)' } : {};
    const baseImg: React.CSSProperties = { objectFit: 'contain', objectPosition: 'bottom', userSelect: 'none' };

    return (
      <div
        className={className}
        style={{
          ...style,
          position: 'relative',
          width: w,
          height: h,
          // strip filter/transform from wrapper — applied per-img
          filter: undefined,
          transform: undefined,
        }}
      >
        {/* Back-left bird — smallest, most transparent */}
        <img
          src={pterodactylus}
          draggable={false}
          alt="pterodactyl-1"
          style={{
            ...baseImg, ...flip,
            position: 'absolute',
            height: '55%',
            width: 'auto',
            bottom: '28%',
            ...(flipped ? { right: '0%' } : { left: '0%' }),
            opacity: 0.7,
            filter: style?.filter,
          }}
        />
        {/* Back-right bird — medium */}
        <img
          src={pterodactylus}
          draggable={false}
          alt="pterodactyl-2"
          style={{
            ...baseImg, ...flip,
            position: 'absolute',
            height: '70%',
            width: 'auto',
            bottom: '10%',
            ...(flipped ? { left: '8%' } : { right: '8%' }),
            opacity: 0.85,
            filter: style?.filter,
          }}
        />
        {/* Front-center bird — largest, full opacity */}
        <img
          src={pterodactylus}
          draggable={false}
          alt="pterodactyl-3"
          style={{
            ...baseImg, ...flip,
            position: 'absolute',
            height: '100%',
            width: 'auto',
            bottom: 0,
            ...(flipped ? { right: '22%' } : { left: '22%' }),
            filter: style?.filter,
          }}
        />
      </div>
    );
  }

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
