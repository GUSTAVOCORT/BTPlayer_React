import React, { useEffect, useState } from 'react';

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

  if (!enabled) return null;

  return (
    <div
      className="pointer-events-none absolute inset-[6px] rounded-2xl border-2 transition-opacity duration-75 z-40"
      style={{
        borderColor: neonColor,
        opacity: flickerAlpha,
        boxShadow: `0 0 18px ${neonColor}, inset 0 0 18px ${neonColor}`,
      }}
    />
  );
};
