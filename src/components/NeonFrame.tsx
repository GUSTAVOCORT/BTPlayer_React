import React, { useEffect, useState } from 'react';
import { audioEngine } from './AudioEngine';

interface NeonFrameProps {
  neonColor?: string;
  enabled?: boolean;
  flicker?: boolean;
}

export const NeonFrame: React.FC<NeonFrameProps> = ({
  neonColor = '#FF2D95',
  enabled = true,
  flicker = true,
}) => {
  const [flickerAlpha, setFlickerAlpha] = useState(1);
  const [bassPulse, setBassPulse] = useState(0);

  // Flicker loop
  useEffect(() => {
    if (!enabled || !flicker) {
      setFlickerAlpha(1);
      return;
    }

    let timer: ReturnType<typeof setTimeout>;

    const loop = () => {
      const r = Math.random();
      let alpha = 1;
      if (r > 0.94) alpha = 0.45;
      else if (r > 0.88) alpha = 0.7;
      setFlickerAlpha(alpha);

      const delay = 80 + Math.floor(Math.random() * 160);
      timer = setTimeout(loop, delay);
    };

    loop();

    return () => {
      clearTimeout(timer);
    };
  }, [enabled, flicker]);

  // Audio beat pulse loop
  useEffect(() => {
    if (!enabled) return;

    let animId: number;
    const pulseLoop = () => {
      if (audioEngine.isCurrentlyPlaying()) {
        const bass = audioEngine.getBassEnergy();
        setBassPulse(bass);
      } else {
        setBassPulse(0);
      }
      animId = requestAnimationFrame(pulseLoop);
    };

    animId = requestAnimationFrame(pulseLoop);
    return () => cancelAnimationFrame(animId);
  }, [enabled]);

  if (!enabled) return null;

  const glowSpread = 16 + Math.round(bassPulse * 22);
  const finalAlpha = Math.min(1, Math.max(0.3, flickerAlpha * (0.8 + bassPulse * 0.4)));

  return (
    <div
      className="pointer-events-none absolute inset-[4px] sm:inset-[6px] rounded-2xl border-2 transition-all duration-75 z-40"
      style={{
        borderColor: neonColor,
        opacity: finalAlpha,
        boxShadow: `0 0 ${glowSpread}px ${neonColor}, inset 0 0 ${Math.round(glowSpread * 0.7)}px ${neonColor}`,
      }}
    />
  );
};
