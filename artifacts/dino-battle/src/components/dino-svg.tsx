import { DinoId } from '../lib/dino-data';
import velociraptor from '../assets/velociraptor.png';
import giganotosaurus from '../assets/giganotosaurus.png';
import spinosaurus from '../assets/spinosaurus.png';

const DINO_IMAGES: Record<DinoId, string> = {
  velociraptor,
  giganotosaurus,
  spinosaurus,
};

interface DinoImgProps {
  dinoId: DinoId;
  className?: string;
  style?: React.CSSProperties;
  flipped?: boolean;
}

export function DinoSvg({ dinoId, className, style, flipped }: DinoImgProps) {
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
