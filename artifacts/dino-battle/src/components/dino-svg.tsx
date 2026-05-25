import React from 'react';
import { DinoId } from '../lib/dino-data';

interface DinoSvgProps extends React.SVGProps<SVGSVGElement> {
  dinoId: DinoId;
}

export function DinoSvg({ dinoId, ...props }: DinoSvgProps) {
  if (dinoId === 'velociraptor') {
    return (
      <svg viewBox="0 0 100 100" fill="currentColor" {...props}>
        {/* Simple Raptor representation */}
        <path d="M 20 80 Q 30 60 50 50 Q 80 40 90 20 Q 70 30 50 40 L 40 80 Z" />
        <circle cx="80" cy="25" r="2" fill="var(--primary)" />
      </svg>
    );
  }
  if (dinoId === 'spinosaurus') {
    return (
      <svg viewBox="0 0 150 150" fill="currentColor" {...props}>
        {/* Simple Spino representation */}
        <path d="M 10 120 Q 30 100 60 80 Q 90 60 130 50 Q 100 80 70 120 Z" />
        <path d="M 40 90 Q 60 40 80 70" stroke="currentColor" fill="none" strokeWidth="5" />
      </svg>
    );
  }
  if (dinoId === 'giganotosaurus') {
    return (
      <svg viewBox="0 0 200 200" fill="currentColor" {...props}>
        {/* Simple Giga representation */}
        <path d="M 10 180 Q 40 140 80 100 Q 140 70 180 50 Q 120 100 80 180 Z" />
        <path d="M 170 50 L 190 60 L 170 70" />
      </svg>
    );
  }
  return null;
}
