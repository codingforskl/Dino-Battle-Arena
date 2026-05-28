interface HunterSvgProps {
  className?: string;
  style?: React.CSSProperties;
  flipped?: boolean;
  topDown?: boolean;
}

export function HunterSvg({ className, style, flipped, topDown }: HunterSvgProps) {
  const flipT = flipped ? 'scaleX(-1)' : undefined;

  if (topDown) {
    return (
      <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{ ...style, transform: flipT, display: 'block', overflow: 'visible' }}>
        <circle cx="20" cy="20" r="11" fill="#c8a96a" stroke="#7a6030" strokeWidth="1.5"/>
        <ellipse cx="20" cy="14" rx="8" ry="5" fill="#8B6914"/>
        <circle cx="20" cy="20" r="5.5" fill="#f4c09a" stroke="#cc8866" strokeWidth="1"/>
        <circle cx="17.5" cy="19" r="1.2" fill="#333"/>
        <circle cx="22.5" cy="19" r="1.2" fill="#333"/>
        <rect x="8" y="17" width="7" height="4" rx="2" fill="#c8a028" opacity="0.9"/>
        <rect x="25" y="17" width="7" height="4" rx="2" fill="#c8a028" opacity="0.9"/>
        <circle cx="20" cy="30" r="3" fill="#c8a028" opacity="0.6"/>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ ...style, transform: flipT, display: 'block', overflow: 'visible' }}>

      {/* Shadow */}
      <ellipse cx="50" cy="126" rx="22" ry="5" fill="rgba(0,0,0,0.18)"/>

      {/* Legs */}
      <rect x="33" y="80" width="14" height="38" rx="5" fill="#8a7840"/>
      <rect x="53" y="80" width="14" height="38" rx="5" fill="#8a7840"/>

      {/* Boots */}
      <rect x="30" y="112" width="18" height="10" rx="4" fill="#3d2b12"/>
      <rect x="52" y="112" width="18" height="10" rx="4" fill="#3d2b12"/>

      {/* Torso */}
      <rect x="28" y="42" width="44" height="44" rx="8" fill="#c8a028"/>
      {/* Vest detail */}
      <rect x="42" y="44" width="16" height="38" rx="3" fill="#b08820" opacity="0.6"/>

      {/* Belt */}
      <rect x="28" y="76" width="44" height="7" rx="2" fill="#5c3d12"/>
      <rect x="46" y="77" width="8" height="5" rx="1" fill="#c0a010"/>

      {/* Left arm (holding tranq gun) */}
      <rect x="10" y="44" width="20" height="10" rx="5" fill="#c8a028"/>
      {/* Tranq gun */}
      <rect x="2" y="44" width="24" height="7" rx="3" fill="#3a3a3a"/>
      <rect x="14" y="40" width="5" height="7" rx="1" fill="#2a2a2a"/>
      <rect x="0" y="45" width="8" height="4" rx="1" fill="#555"/>

      {/* Right arm */}
      <rect x="70" y="44" width="20" height="10" rx="5" fill="#c8a028"/>

      {/* Head */}
      <circle cx="50" cy="28" r="18" fill="#f4c09a" stroke="#cc8866" strokeWidth="1.5"/>

      {/* Hat brim */}
      <ellipse cx="50" cy="14" rx="26" ry="7" fill="#6b4d0a"/>
      {/* Hat crown */}
      <rect x="33" y="5" width="34" height="13" rx="5" fill="#7d5c10"/>
      {/* Hat band */}
      <rect x="33" y="15" width="34" height="4" fill="#cc8800" opacity="0.8"/>

      {/* Face */}
      <circle cx="43" cy="27" r="2.8" fill="#333"/>
      <circle cx="57" cy="27" r="2.8" fill="#333"/>
      <circle cx="44" cy="26" r="1" fill="white" opacity="0.6"/>
      <circle cx="58" cy="26" r="1" fill="white" opacity="0.6"/>
      <path d="M43 35 Q50 40 57 35" stroke="#b06040" strokeWidth="1.5" fill="none" strokeLinecap="round"/>

      {/* Chin/jaw definition */}
      <path d="M36 32 Q50 46 64 32" fill="#e8a880" opacity="0.4"/>

      {/* Shirt collar */}
      <polygon points="42,43 50,50 58,43 50,48" fill="#b08820" opacity="0.7"/>
    </svg>
  );
}
