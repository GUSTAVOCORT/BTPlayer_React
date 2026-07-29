import React, { useEffect, useRef } from 'react';

interface NixieClockProps {
  glow?: boolean;
  use24h?: boolean;
  className?: string;
}

export const NixieClock: React.FC<NixieClockProps> = ({
  glow = true,
  use24h = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const dpr = window.devicePixelRatio || 1;
        const rect = parent.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
            canvas.width = Math.floor(rect.width * dpr);
            canvas.height = Math.floor(rect.height * dpr);
          }
        }
      }

      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) return;

      ctx.clearRect(0, 0, w, h);

      const now = new Date();
      let hh = use24h ? now.getHours() : now.getHours() % 12;
      if (!use24h && hh === 0) hh = 12;
      const mm = now.getMinutes();
      const ss = now.getSeconds();
      const digits = [Math.floor(hh / 10), hh % 10, Math.floor(mm / 10), mm % 10];

      const n = 4;
      const gapRatio = 0.14;
      const totalGap = w * gapRatio;
      const tubeW = (w - totalGap) / n;
      const tubeGap = totalGap / (n + 1);
      const tubeH = Math.min(tubeW * 2.1, h * 0.92);
      const top = (h - tubeH) / 2;

      let x = tubeGap;
      for (let i = 0; i < n; i++) {
        drawTube(ctx, x, top, tubeW, tubeH, digits[i], glow);
        x += tubeW + tubeGap;
      }

      // Blinking colon dots every 2nd second
      if (ss % 2 === 0) {
        const cx = w / 2;
        const dotR = tubeW * 0.055;
        drawDot(ctx, cx, top + tubeH * 0.4, dotR, glow);
        drawDot(ctx, cx, top + tubeH * 0.6, dotR, glow);
      }
    };

    const loop = () => {
      render();
      animId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [glow, use24h]);

  return (
    <div className={`relative w-full h-full flex items-center justify-center ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};

function drawTube(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  tw: number,
  th: number,
  digit: number,
  glow: boolean
) {
  const corner = tw * 0.2;

  ctx.save();

  // Glass tube body background
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, top, tw, th, corner);
  } else {
    ctx.rect(x, top, tw, th);
  }
  const glassGrad = ctx.createLinearGradient(x, top, x + tw, top + th);
  glassGrad.addColorStop(0, '#1E1610');
  glassGrad.addColorStop(1, '#0C0906');
  ctx.fillStyle = glassGrad;
  ctx.fill();

  // Hexagon mesh grid overlay
  ctx.save();
  ctx.clip();
  drawHexMesh(ctx, x, top, tw, th);
  ctx.restore();

  // Digit text dimensions
  const cx = x + tw / 2;
  const ts = th * 0.58;
  const dStr = digit.toString();

  ctx.font = `bold ${Math.floor(ts)}px "Orbitron", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const by = top + th / 2;

  // Glow halo behind digit
  if (glow) {
    ctx.save();
    ctx.shadowColor = '#E8420E';
    ctx.shadowBlur = Math.min(ts * 0.4, 28);
    ctx.fillStyle = '#FF7A18';
    ctx.fillText(dStr, cx, by);
    ctx.shadowColor = '#FF7A18';
    ctx.shadowBlur = Math.min(ts * 0.2, 14);
    ctx.fillText(dStr, cx, by);
    ctx.restore();
  }

  // Solid crisp core digit
  ctx.fillStyle = '#FFC66B';
  ctx.fillText(dStr, cx, by);

  // Top glass reflection highlight
  const reflGrad = ctx.createLinearGradient(x, top, x, top + th * 0.4);
  reflGrad.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
  reflGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = reflGrad;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, top, tw, th * 0.4, corner);
  } else {
    ctx.rect(x, top, tw, th * 0.4);
  }
  ctx.fill();

  // Outer tube border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = Math.max(1, tw * 0.018);
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, top, tw, th, corner);
  } else {
    ctx.rect(x, top, tw, th);
  }
  ctx.stroke();

  ctx.restore();
}

function drawHexMesh(ctx: CanvasRenderingContext2D, x: number, top: number, tw: number, th: number) {
  const hexR = tw * 0.1;
  const hStep = hexR * 1.5;
  const vStep = hexR * 0.866;
  let row = 0;
  let cy = top + hexR;

  ctx.strokeStyle = '#2E2016';
  ctx.lineWidth = 1;

  while (cy < top + th) {
    const offset = row % 2 === 0 ? 0 : hStep * 0.5;
    let cx = x + offset;
    while (cx < x + tw + hexR) {
      drawHex(ctx, cx, cy, hexR);
      cx += hStep;
    }
    cy += vStep;
    row++;
  }
}

function drawHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const ang = (Math.PI / 180) * (60 * k - 30);
    const px = cx + r * Math.cos(ang);
    const py = cy + r * Math.sin(ang);
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawDot(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  glow: boolean
) {
  ctx.save();
  if (glow) {
    ctx.shadowColor = '#FF7A18';
    ctx.shadowBlur = r * 3;
    ctx.fillStyle = '#FF7A18';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#FFC66B';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.75, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
