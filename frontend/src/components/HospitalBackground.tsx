import React from 'react';

interface HospitalBackgroundProps {
  /** Opacity of the background illustration (recommended 10-20%) */
  opacity?: number;
  /** Soft blur filter to diffuse text/signage and enhance painterly feel */
  blur?: string;
  className?: string;
}

export const HospitalBackground: React.FC<HospitalBackgroundProps> = ({
  opacity = 0.15,
  blur = '2px',
  className = ''
}) => {
  return (
    <div
      className={`fixed inset-0 z-0 pointer-events-none overflow-hidden select-none ${className}`}
      aria-hidden="true"
    >
      {/* Layer 1: Ghibli-Inspired Hospital Illustration */}
      <div
        className="absolute inset-0 bg-cover bg-no-repeat transition-opacity duration-1000 ease-out"
        style={{
          backgroundImage: 'url(/hospital-bg.jpg)',
          backgroundPosition: 'center 28%',
          opacity,
          filter: `blur(${blur}) saturate(1.12)`,
          transform: 'scale(1.04)',
        }}
      />

      {/* Layer 2: Soft Mint / Healthcare Palette Overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#F3FAF7]/85 via-[#E6F4F0]/80 to-[#F3FAF7]/90"
        style={{
          backdropFilter: 'blur(0.5px)',
        }}
      />
    </div>
  );
};
