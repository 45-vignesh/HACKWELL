import React from 'react';

interface HospitalBackgroundProps {
  /** Opacity of the background illustration (recommended 10-20%) */
  opacity?: number;
  /** Soft blur filter to diffuse text/signage and enhance painterly feel */
  blur?: string;
  className?: string;
}

export const HospitalBackground: React.FC<HospitalBackgroundProps> = ({
  opacity = 0.35,
  blur = '0.75px',
  className = ''
}) => {
  return (
    <div
      className={`fixed inset-0 z-0 pointer-events-none overflow-hidden select-none ${className}`}
      aria-hidden="true"
    >
      {/* Layer 0: Base Canvas Background Tint */}
      <div className="absolute inset-0 bg-[#E6F4F0] z-0" />

      {/* Layer 1: Hospital Ghibli-Inspired Background Illustration */}
      <div
        className="absolute inset-0 bg-cover bg-no-repeat transition-all duration-700 ease-out z-[1]"
        style={{
          backgroundImage: 'url(/hospital-bg.jpg)',
          backgroundPosition: 'center center',
          backgroundSize: 'cover',
          opacity,
          filter: `blur(${blur}) saturate(1.15)`,
        }}
      />

      {/* Layer 2: Subtle Transparent Mint/White Readability Overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#F3FAF7]/20 via-[#E6F4F0]/15 to-[#F3FAF7]/25 z-[2]"
      />
    </div>
  );
};

