import React from 'react';

interface MeenakshiLogoProps {
  className?: string;
  size?: number;
}

export const MeenakshiLogo: React.FC<MeenakshiLogoProps> = ({ className = 'w-7 h-7', size }) => {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      {/* Golden Temple Kalasam / Spire Pinnacle */}
      <path
        d="M24 2L22.5 5.5H25.5L24 2Z"
        fill="#FDE047"
        stroke="#EAB308"
        strokeWidth="0.8"
      />
      <circle cx="24" cy="6.5" r="1.5" fill="#F59E0B" />
      <path d="M21 7.5H27V9H21V7.5Z" fill="#F59E0B" />

      {/* Gopuram Tier 1 (Top Tier) */}
      <path
        d="M19 9H29L31 13H17L19 9Z"
        fill="#F59E0B"
        stroke="#B45309"
        strokeWidth="0.8"
      />
      <rect x="22.5" y="10" width="3" height="2.5" rx="0.5" fill="#FEF08A" />

      {/* Gopuram Tier 2 */}
      <path
        d="M16 13H32L34 18H14L16 13Z"
        fill="#EA580C"
        stroke="#9A3412"
        strokeWidth="0.8"
      />
      {/* Statues & niches */}
      <rect x="18" y="14" width="2.5" height="3" rx="0.5" fill="#FDE047" />
      <rect x="22.75" y="14" width="2.5" height="3" rx="0.5" fill="#FDE047" />
      <rect x="27.5" y="14" width="2.5" height="3" rx="0.5" fill="#FDE047" />

      {/* Gopuram Tier 3 */}
      <path
        d="M13 18H35L37.5 24H10.5L13 18Z"
        fill="#D97706"
        stroke="#78350F"
        strokeWidth="0.8"
      />
      <circle cx="16" cy="20.5" r="1.2" fill="#FEF08A" />
      <circle cx="20" cy="20.5" r="1.2" fill="#FDE047" />
      <circle cx="24" cy="20.5" r="1.2" fill="#FEF08A" />
      <circle cx="28" cy="20.5" r="1.2" fill="#FDE047" />
      <circle cx="32" cy="20.5" r="1.2" fill="#FEF08A" />

      {/* Gopuram Tier 4 */}
      <path
        d="M10 24H38L41 31H7L10 24Z"
        fill="#B45309"
        stroke="#78350F"
        strokeWidth="0.8"
      />
      <rect x="12" y="25.5" width="3" height="4" rx="0.5" fill="#FEF08A" />
      <rect x="18" y="25.5" width="3" height="4" rx="0.5" fill="#FDE047" />
      <rect x="24" y="25.5" width="3" height="4" rx="0.5" fill="#FBBF24" />
      <rect x="30" y="25.5" width="3" height="4" rx="0.5" fill="#FDE047" />
      <rect x="36" y="25.5" width="3" height="4" rx="0.5" fill="#FEF08A" />

      {/* Gopuram Base Plinth & Archway Entrance */}
      <path
        d="M6 31H42V44H6V31Z"
        fill="#78350F"
        stroke="#451A03"
        strokeWidth="1"
      />
      {/* Carved Dravidian Gateway Arch */}
      <path
        d="M17 44V36C17 32.5 31 32.5 31 36V44H17Z"
        fill="#1C1917"
        stroke="#F59E0B"
        strokeWidth="1"
      />
      {/* Inner Sanctum Golden Lamp Glow */}
      <circle cx="24" cy="38" r="2" fill="#FDE047" />
      <circle cx="24" cy="38" r="3.5" fill="#F59E0B" fillOpacity="0.4" />

      {/* Temple Base steps */}
      <rect x="3" y="44" width="42" height="2.5" rx="1" fill="#451A03" />
      <rect x="1" y="46" width="46" height="1.5" rx="0.5" fill="#292524" />
    </svg>
  );
};
