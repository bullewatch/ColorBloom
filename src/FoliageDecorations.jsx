import React from 'react';

/**
 * Botanical SVG Foliage & Daisy Decorations
 * Recreating the exact whimsical woodland aesthetic:
 * Forest green leaves with subtle highlights and realistic white daisies with golden amber centers.
 */

// Shared reusable Daisy flower component
function Daisy({ size = 26, cx = 0, cy = 0, angle = 0 }) {
  const r = size / 2;
  const petalRx = r * 0.36;
  const petalRy = r * 0.65;
  const centerR = r * 0.44;

  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${angle})`}>
      {/* 8 white rounded petals */}
      <g fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5">
        <ellipse cx="0" cy={-petalRy * 0.85} rx={petalRx} ry={petalRy} />
        <ellipse cx={petalRy * 0.6} cy={-petalRy * 0.6} rx={petalRx} ry={petalRy} transform={`rotate(45 ${petalRy * 0.6} ${-petalRy * 0.6})`} />
        <ellipse cx={petalRy * 0.85} cy="0" rx={petalRx} ry={petalRy} transform={`rotate(90 ${petalRy * 0.85} 0)`} />
        <ellipse cx={petalRy * 0.6} cy={petalRy * 0.6} rx={petalRx} ry={petalRy} transform={`rotate(135 ${petalRy * 0.6} ${petalRy * 0.6})`} />
        <ellipse cx="0" cy={petalRy * 0.85} rx={petalRx} ry={petalRy} />
        <ellipse cx={-petalRy * 0.6} cy={petalRy * 0.6} rx={petalRx} ry={petalRy} transform={`rotate(-135 ${-petalRy * 0.6} ${petalRy * 0.6})`} />
        <ellipse cx={-petalRy * 0.85} cy="0" rx={petalRx} ry={petalRy} transform={`rotate(-90 ${-petalRy * 0.85} 0)`} />
        <ellipse cx={-petalRy * 0.6} cy={-petalRy * 0.6} rx={petalRx} ry={petalRy} transform={`rotate(-45 ${-petalRy * 0.6} ${-petalRy * 0.6})`} />
      </g>
      {/* Golden amber center disk */}
      <circle cx="0" cy="0" r={centerR} fill="url(#cbFlowerCenter)" stroke="#92400e" strokeWidth="0.8" />
      {/* Center texture / highlight */}
      <circle cx={-centerR * 0.25} cy={-centerR * 0.25} r={centerR * 0.32} fill="#fef08a" opacity="0.8" />
    </g>
  );
}

// Small white daisy bud
function DaisyBud({ cx = 0, cy = 0, angle = 0 }) {
  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${angle})`}>
      {/* Green sepal */}
      <path d="M 0 6 C -4 1 -4 -5 0 -8 C 4 -5 4 1 0 6 Z" fill="#2d5615" />
      {/* White budding petal */}
      <circle cx="0" cy="-6" r="3" fill="#ffffff" />
      <path d="M -2.5 -3 C -1.5 -6 0 -7.5 0 -7.5 C 0 -7.5 1.5 -6 2.5 -3" stroke="#1e3a0e" strokeWidth="1" fill="none" />
    </g>
  );
}

// Leaf with natural vein
function BotanicalLeaf({ x = 0, y = 0, len = 24, width = 12, angle = 0, type = 1 }) {
  const grad = type === 1 ? 'url(#cbLeafGrad1)' : type === 2 ? 'url(#cbLeafGrad2)' : 'url(#cbLeafGradDark)';
  const strokeColor = type === 2 ? '#84c24e' : '#6caa3b';
  return (
    <g transform={`translate(${x}, ${y}) rotate(${angle})`}>
      <path
        d={`M 0 0 C ${-width * 0.75} ${-len * 0.35} ${-width * 0.8} ${-len * 0.75} 0 ${-len} C ${width * 0.8} ${-len * 0.75} ${width * 0.75} ${-len * 0.35} 0 0 Z`}
        fill={grad}
      />
      <path d={`M 0 -2 L 0 ${-len * 0.88}`} stroke={strokeColor} strokeWidth="1" strokeLinecap="round" opacity="0.65" />
    </g>
  );
}

/**
 * Common SVG Definitions (Gradients and Drop Shadow Filter)
 */
export function FoliageDefs() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
      <defs>
        <linearGradient id="cbLeafGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4d8426" />
          <stop offset="60%" stopColor="#2e5816" />
          <stop offset="100%" stopColor="#1a370b" />
        </linearGradient>
        <linearGradient id="cbLeafGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#69a838" />
          <stop offset="60%" stopColor="#3d701f" />
          <stop offset="100%" stopColor="#21420f" />
        </linearGradient>
        <linearGradient id="cbLeafGradDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2d5216" />
          <stop offset="100%" stopColor="#132707" />
        </linearGradient>
        <radialGradient id="cbFlowerCenter" cx="42%" cy="42%" r="58%">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="55%" stopColor="#f59e0b" />
          <stop offset="90%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#78350f" />
        </radialGradient>
        <filter id="cbBotanicalShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="1" dy="2" stdDeviation="2.2" floodColor="#0a0502" floodOpacity="0.55" />
        </filter>
      </defs>
    </svg>
  );
}

/**
 * 1. LEFT PANEL FOLIAGE (Catégories + Trier par)
 * Features lavish corner daisies, ivy vines climbing left edge, and bottom foliage.
 */
export function LeftPanelFoliage() {
  return (
    <div className="cb-panel-foliage-wrapper" aria-hidden="true">
      {/* Top-Left Corner Cluster: Daisies, buds, lush leaves */}
      <svg className="cb-foliage-tl" viewBox="0 0 130 130" width="130" height="130">
        <g filter="url(#cbBotanicalShadow)">
          {/* Woody stem */}
          <path d="M 22 110 Q 32 70 55 52 T 115 22" fill="none" stroke="#253e14" strokeWidth="3" strokeLinecap="round" />
          
          {/* Background dark leaves */}
          <BotanicalLeaf x={30} y={85} len={28} width={13} angle={-60} type={3} />
          <BotanicalLeaf x={48} y={48} len={26} width={12} angle={-35} type={3} />
          <BotanicalLeaf x={75} y={32} len={24} width={11} angle={25} type={3} />

          {/* Foreground vibrant leaves */}
          <BotanicalLeaf x={25} y={65} len={30} width={14} angle={-75} type={1} />
          <BotanicalLeaf x={42} y={35} len={28} width={13} angle={-15} type={2} />
          <BotanicalLeaf x={85} y={26} len={26} width={12} angle={50} type={1} />
          <BotanicalLeaf x={108} y={24} len={20} width={9} angle={80} type={2} />

          {/* Flower buds */}
          <DaisyBud cx={116} cy={20} angle={75} />
          <DaisyBud cx={18} cy={48} angle={-85} />

          {/* Daisy 1: Medium flower (lower left) */}
          <Daisy size={23} cx={34} cy={82} angle={15} />

          {/* Daisy 2: Large focal flower (corner anchor) */}
          <Daisy size={30} cx={58} cy={50} angle={-10} />

          {/* Daisy 3: Small top flower */}
          <Daisy size={19} cx={86} cy={28} angle={25} />
        </g>
      </svg>

      {/* Left Edge Climbing Vine */}
      <svg className="cb-foliage-left-vine" viewBox="0 0 45 140" width="45" height="140">
        <g filter="url(#cbBotanicalShadow)">
          <path d="M 32 5 Q 16 40 28 80 T 20 135" fill="none" stroke="#253e14" strokeWidth="2.5" strokeLinecap="round" />
          <BotanicalLeaf x={22} y={35} len={22} width={11} angle={-70} type={1} />
          <BotanicalLeaf x={26} y={65} len={24} width={12} angle={-100} type={2} />
          <BotanicalLeaf x={24} y={105} len={20} width={10} angle={-80} type={1} />
          <Daisy size={16} cx={18} cy={72} angle={-20} />
          <DaisyBud cx={12} cy={38} angle={-90} />
        </g>
      </svg>

      {/* Bottom-Left Foliage & Daisies */}
      <svg className="cb-foliage-bl" viewBox="0 0 110 90" width="110" height="90">
        <g filter="url(#cbBotanicalShadow)">
          <path d="M 12 15 Q 18 55 55 72 T 100 80" fill="none" stroke="#253e14" strokeWidth="2.8" strokeLinecap="round" />
          <BotanicalLeaf x={18} y={35} len={24} width={12} angle={-120} type={1} />
          <BotanicalLeaf x={32} y={65} len={26} width={13} angle={-150} type={2} />
          <BotanicalLeaf x={68} y={78} len={22} width={11} angle={160} type={1} />
          <BotanicalLeaf x={95} y={80} len={18} width={9} angle={120} type={2} />
          <Daisy size={20} cx={38} cy={60} angle={-45} />
          <Daisy size={15} cx={72} cy={74} angle={20} />
        </g>
      </svg>

      {/* Top-Right Corner Little Leaves */}
      <svg className="cb-foliage-tr" viewBox="0 0 55 55" width="55" height="55">
        <g filter="url(#cbBotanicalShadow)">
          <path d="M 5 45 Q 20 30 45 10" fill="none" stroke="#253e14" strokeWidth="2" strokeLinecap="round" />
          <BotanicalLeaf x={25} y={28} len={20} width={10} angle={35} type={2} />
          <BotanicalLeaf x={42} y={15} len={18} width={9} angle={55} type={1} />
          <DaisyBud cx={46} cy={10} angle={45} />
        </g>
      </svg>
    </div>
  );
}

/**
 * 2. TOP NAVIGATION & SEARCH BLOCK FOLIAGE
 * Garland of leafy vines and daisies nestled over the top edges and corners.
 */
export function TopNavFoliage() {
  return (
    <div className="cb-topnav-foliage-wrapper" aria-hidden="true">
      {/* Top Left Corner Sprig */}
      <svg className="cb-topnav-foliage-left" viewBox="0 0 95 65" width="95" height="65">
        <g filter="url(#cbBotanicalShadow)">
          <path d="M 85 55 Q 50 35 15 15" fill="none" stroke="#253e14" strokeWidth="2.5" strokeLinecap="round" />
          <BotanicalLeaf x={60} y={40} len={22} width={11} angle={-40} type={1} />
          <BotanicalLeaf x={38} y={26} len={24} width={12} angle={-55} type={2} />
          <BotanicalLeaf x={18} y={15} len={20} width={10} angle={-75} type={1} />
          <Daisy size={20} cx={42} cy={28} angle={-25} />
          <DaisyBud cx={14} cy={12} angle={-70} />
        </g>
      </svg>

      {/* Top Center Delicate Daisy & Leaves */}
      <svg className="cb-topnav-foliage-center" viewBox="0 0 120 45" width="120" height="45">
        <g filter="url(#cbBotanicalShadow)">
          <path d="M 10 32 Q 60 15 110 32" fill="none" stroke="#253e14" strokeWidth="2" strokeLinecap="round" />
          <BotanicalLeaf x={35} y={22} len={18} width={9} angle={-60} type={2} />
          <BotanicalLeaf x={85} y={22} len={18} width={9} angle={60} type={2} />
          <BotanicalLeaf x={60} y={16} len={16} width={8} angle={0} type={1} />
          <Daisy size={18} cx={60} cy={20} angle={0} />
          <DaisyBud cx={20} cy={26} angle={-80} />
          <DaisyBud cx={100} cy={26} angle={80} />
        </g>
      </svg>

      {/* Top Right Corner Sprig */}
      <svg className="cb-topnav-foliage-right" viewBox="0 0 95 65" width="95" height="65">
        <g filter="url(#cbBotanicalShadow)">
          <path d="M 10 55 Q 45 35 80 15" fill="none" stroke="#253e14" strokeWidth="2.5" strokeLinecap="round" />
          <BotanicalLeaf x={35} y={40} len={22} width={11} angle={40} type={1} />
          <BotanicalLeaf x={57} y={26} len={24} width={12} angle={55} type={2} />
          <BotanicalLeaf x={77} y={15} len={20} width={10} angle={75} type={1} />
          <Daisy size={20} cx={53} cy={28} angle={25} />
          <DaisyBud cx={81} cy={12} angle={70} />
        </g>
      </svg>
    </div>
  );
}

/**
 * 3. RIGHT AD PANEL FOLIAGE & BOTANICAL FRAME
 * Lush vines wrapping around the tall wooden frame, with daisies and grass silhouettes.
 */
export function AdPanelFoliage() {
  return (
    <div className="cb-ad-foliage-wrapper" aria-hidden="true">
      {/* Top-Left Corner */}
      <svg className="cb-ad-foliage-tl" viewBox="0 0 85 75" width="85" height="75">
        <g filter="url(#cbBotanicalShadow)">
          <path d="M 75 60 Q 40 40 15 15" fill="none" stroke="#253e14" strokeWidth="2.5" strokeLinecap="round" />
          <BotanicalLeaf x={50} y={45} len={22} width={11} angle={-45} type={1} />
          <BotanicalLeaf x={30} y={28} len={24} width={12} angle={-60} type={2} />
          <BotanicalLeaf x={15} y={15} len={18} width={9} angle={-80} type={1} />
          <Daisy size={21} cx={34} cy={30} angle={-20} />
        </g>
      </svg>

      {/* Top-Right Corner */}
      <svg className="cb-ad-foliage-tr" viewBox="0 0 85 75" width="85" height="75">
        <g filter="url(#cbBotanicalShadow)">
          <path d="M 10 60 Q 45 40 70 15" fill="none" stroke="#253e14" strokeWidth="2.5" strokeLinecap="round" />
          <BotanicalLeaf x={35} y={45} len={22} width={11} angle={45} type={1} />
          <BotanicalLeaf x={55} y={28} len={24} width={12} angle={60} type={2} />
          <BotanicalLeaf x={70} y={15} len={18} width={9} angle={80} type={1} />
          <Daisy size={21} cx={51} cy={30} angle={20} />
        </g>
      </svg>

      {/* Right Edge Climbing Foliage */}
      <svg className="cb-ad-foliage-right-vine" viewBox="0 0 45 130" width="45" height="130">
        <g filter="url(#cbBotanicalShadow)">
          <path d="M 12 10 Q 30 45 18 85 T 26 125" fill="none" stroke="#253e14" strokeWidth="2.4" strokeLinecap="round" />
          <BotanicalLeaf x={24} y={35} len={20} width={10} angle={70} type={1} />
          <BotanicalLeaf x={22} y={75} len={22} width={11} angle={85} type={2} />
          <BotanicalLeaf x={24} y={110} len={18} width={9} angle={65} type={1} />
          <Daisy size={16} cx={24} cy={60} angle={35} />
        </g>
      </svg>

      {/* Bottom Corner Foliage */}
      <svg className="cb-ad-foliage-bottom" viewBox="0 0 100 65" width="100" height="65">
        <g filter="url(#cbBotanicalShadow)">
          <path d="M 10 15 Q 18 45 55 55 T 90 58" fill="none" stroke="#253e14" strokeWidth="2.4" strokeLinecap="round" />
          <BotanicalLeaf x={20} y={35} len={20} width={10} angle={-120} type={1} />
          <BotanicalLeaf x={42} y={52} len={22} width={11} angle={-150} type={2} />
          <BotanicalLeaf x={75} y={56} len={18} width={9} angle={160} type={1} />
          <Daisy size={18} cx={42} cy={48} angle={-30} />
          <DaisyBud cx={88} cy={56} angle={80} />
        </g>
      </svg>
    </div>
  );
}

/**
 * Subtle Grass Blades Silhouette inside the Ad Board
 */
export function AdGrassSilhouette() {
  return (
    <svg
      className="cb-ad-grass-silhouette"
      viewBox="0 0 200 60"
      preserveAspectRatio="none"
      width="100%"
      height="60"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cbGrassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#14260a" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#0c1706" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <path
        d="M 0 60 L 0 50 Q 15 25 22 10 Q 25 35 32 48 Q 45 15 55 5 Q 58 30 68 50 Q 80 20 95 12 Q 102 32 110 46 Q 125 18 138 8 Q 142 32 152 48 Q 165 22 178 14 Q 185 36 200 48 L 200 60 Z"
        fill="url(#cbGrassGrad)"
      />
    </svg>
  );
}
