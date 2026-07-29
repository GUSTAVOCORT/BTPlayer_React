import React, { useEffect, useRef } from 'react';
import { AppPrefs } from '../types';
import { getPalette } from '../utils/palettes';
import { audioEngine } from './AudioEngine';

type FloatArray = Float32Array;
const FloatArray = Float32Array;

interface VisualizerViewProps {
  prefs: AppPrefs;
  onUpdatePrefs: (updater: (prev: AppPrefs) => AppPrefs) => void;
  className?: string;
  isFullscreen?: boolean;
}

export const VisualizerView: React.FC<VisualizerViewProps> = ({
  prefs,
  onUpdatePrefs,
  className = '',
  isFullscreen = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickCountRef = useRef(0);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const barCount = Math.max(16, Math.min(96, prefs.vizBars));
    let levels = new FloatArray(barCount);
    let target = new FloatArray(barCount);
    let peaks = new FloatArray(barCount);
    let ripplePhase = 0;

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

      // Read audio FFT spectrum data
      const fftData = audioEngine.getFFTData();
      const per = Math.max(1, Math.floor(fftData.length / barCount));
      const gainFactor = prefs.vizGain / 100;

      for (let b = 0; b < barCount; b++) {
        let sum = 0;
        const start = b * per;
        for (let j = 0; j < per; j++) {
          if (start + j < fftData.length) {
            sum += fftData[start + j];
          }
        }
        let v = (sum / per) / 255;
        v = Math.min(1, Math.max(0, v * gainFactor));
        target[b] = v;
      }

      // Smooth levels
      for (let i = 0; i < barCount; i++) {
        levels[i] += (target[i] - levels[i]) * 0.28;
      }

      ctx.clearRect(0, 0, w, h);

      const palette = getPalette(prefs.vizPalette);

      // Helper function to color at fraction 0..1
      const colorAt = (frac: number) => {
        const cols = palette.colors;
        if (cols.length === 1) return cols[0];
        const f = Math.min(1, Math.max(0, frac)) * (cols.length - 1);
        const idx = Math.min(cols.length - 2, Math.floor(f));
        const t = f - idx;
        return blendColors(cols[idx], cols[idx + 1], t);
      };

      const style = prefs.vizStyle % 16;

      switch (style) {
        case 0:
          drawSegments(ctx, w, h, levels, barCount, prefs, colorAt, true);
          break;
        case 1:
          drawBars(ctx, w, h, levels, barCount, prefs, colorAt, false);
          break;
        case 2:
          drawBars(ctx, w, h, levels, barCount, prefs, colorAt, true);
          break;
        case 3:
          drawLine(ctx, w, h, levels, barCount, prefs, colorAt, false);
          break;
        case 4:
          drawDots(ctx, w, h, levels, barCount, prefs, colorAt);
          break;
        case 5:
          drawLine(ctx, w, h, levels, barCount, prefs, colorAt, true);
          break;
        case 6:
          drawBarsPeak(ctx, w, h, levels, peaks, barCount, prefs, colorAt);
          break;
        case 7:
          drawSegments(ctx, w, h, levels, barCount, prefs, colorAt, false);
          break;
        case 8:
          drawBarsHorizontal(ctx, w, h, levels, barCount, prefs);
          break;
        case 9:
          drawCircle(ctx, w, h, levels, barCount, prefs, colorAt);
          break;
        case 10:
          drawLedMatrix(ctx, w, h, levels, barCount, prefs, colorAt);
          break;
        case 11:
          drawDotGrid(ctx, w, h, levels, barCount, prefs, colorAt);
          break;
        case 12:
          drawMirrorWave(ctx, w, h, levels, barCount, prefs, colorAt);
          break;
        case 13:
          drawDualBars(ctx, w, h, levels, barCount, prefs, colorAt);
          break;
        case 14:
          drawFlame(ctx, w, h, levels, barCount, prefs, colorAt);
          break;
        case 15:
          ripplePhase = drawRipple(ctx, w, h, levels, barCount, prefs, colorAt, ripplePhase);
          break;
        default:
          drawSegments(ctx, w, h, levels, barCount, prefs, colorAt, true);
          break;
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
  }, [prefs]);

  // Handle gesture interactions matching MainActivity.kt
  // Single Tap = cycle style (0..15)
  // Double Tap = cycle palette (0..19) + set accent
  // Long Press = toggle fullscreen
  const handlePointerDown = () => {
    longPressTimerRef.current = setTimeout(() => {
      // Long press triggered
      onUpdatePrefs((prev) => ({
        ...prev,
        vizFullscreen: !prev.vizFullscreen,
      }));
      clickCountRef.current = 0;
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    }, 600);
  };

  const handlePointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    clickCountRef.current += 1;

    if (clickCountRef.current === 1) {
      clickTimerRef.current = setTimeout(() => {
        if (clickCountRef.current === 1) {
          // Single tap -> next style
          onUpdatePrefs((prev) => ({
            ...prev,
            vizStyle: (prev.vizStyle + 1) % 16,
          }));
        } else if (clickCountRef.current >= 2) {
          // Double tap -> next palette & accent
          onUpdatePrefs((prev) => {
            const nextPal = (prev.vizPalette + 1) % 20;
            const pal = getPalette(nextPal);
            return {
              ...prev,
              vizPalette: nextPal,
              accentColor: pal.colors[0],
            };
          });
        }
        clickCountRef.current = 0;
      }, 250);
    }
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      className={`relative cursor-pointer overflow-hidden ${className}`}
      title="Single tap: Style | Double tap: Palette | Long press: Fullscreen"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};

// Helper color blender
function blendColors(c1: string, c2: string, t: number): string {
  const parseHex = (hex: string) => {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map((x) => x + x).join('');
    const num = parseInt(hex, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  };
  const [r1, g1, b1] = parseHex(c1);
  const [r2, g2, b2] = parseHex(c2);
  const r = Math.round(r1 * (1 - t) + r2 * t);
  const g = Math.round(g1 * (1 - t) + g2 * t);
  const b = Math.round(b1 * (1 - t) + b2 * t);
  return `rgb(${r}, ${g}, ${b})`;
}

// ------------------------------------
// VISUALIZER DRAWING IMPLEMENTATIONS
// ------------------------------------

function drawSegments(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: FloatArray,
  barCount: number,
  prefs: AppPrefs,
  colorAt: (f: number) => string,
  reflect: boolean
) {
  const widthPct = prefs.vizWidth;
  const heightPct = prefs.vizHeight;
  const neon = prefs.vizNeon;
  const gapFactor = 0.5 - (widthPct / 100) * 0.42;
  const gap = (w / barCount) * gapFactor;
  const bw = w / barCount - gap;
  const reflectFrac = reflect ? 0.26 : 0;
  const barZone = h * (1 - reflectFrac);
  const maxH = barZone * (heightPct / 100);

  const segH = maxH / 22;
  const segGap = segH * 0.28;
  const segDraw = segH - segGap;
  const r = prefs.vizRounded ? segDraw * 0.35 : 0;

  let x = gap / 2;
  for (let i = 0; i < barCount; i++) {
    const lvl = levels[i] || 0;
    const lit = Math.min(22, Math.max(0, Math.floor(lvl * 22)));

    for (let s = 0; s < lit; s++) {
      const frac = s / 22;
      const color = colorAt(frac);
      const segBottom = barZone - s * segH;
      const segTop = segBottom - segDraw;

      ctx.save();
      if (neon) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, segTop, bw, segDraw, r);
      else ctx.rect(x, segTop, bw, segDraw);
      ctx.fill();
      ctx.restore();
    }

    if (reflect) {
      const refCount = Math.floor(lit * 0.5);
      for (let s = 0; s < refCount; s++) {
        const frac = s / 22;
        const color = colorAt(frac);
        const segTop = barZone + s * segH;
        ctx.save();
        ctx.globalAlpha = Math.max(0.1, 0.35 - s * 0.05);
        ctx.fillStyle = color;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, segTop, bw, segDraw, r);
        else ctx.rect(x, segTop, bw, segDraw);
        ctx.fill();
        ctx.restore();
      }
    }

    x += bw + gap;
  }
}

function drawBars(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: FloatArray,
  barCount: number,
  prefs: AppPrefs,
  colorAt: (f: number) => string,
  mirror: boolean
) {
  const gapFactor = 0.5 - (prefs.vizWidth / 100) * 0.42;
  const gap = (w / barCount) * gapFactor;
  const bw = w / barCount - gap;
  let x = gap / 2;
  const hp = prefs.vizHeight / 100;
  const baseY = mirror ? h / 2 : h;
  const maxH = mirror ? h * 0.5 * hp : h * hp;
  const minH = h * 0.03;
  const r = prefs.vizRounded ? bw * 0.45 : 0;

  for (let i = 0; i < barCount; i++) {
    const lvl = levels[i] || 0;
    const bh = minH + lvl * maxH;
    const color = colorAt(i / barCount);

    ctx.save();
    if (prefs.vizNeon) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    if (mirror) {
      if (ctx.roundRect) ctx.roundRect(x, baseY - bh, bw, bh * 2, r);
      else ctx.rect(x, baseY - bh, bw, bh * 2);
    } else {
      if (ctx.roundRect) ctx.roundRect(x, baseY - bh, bw, bh, r);
      else ctx.rect(x, baseY - bh, bw, bh);
    }
    ctx.fill();
    ctx.restore();

    x += bw + gap;
  }
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: FloatArray,
  barCount: number,
  prefs: AppPrefs,
  colorAt: (f: number) => string,
  fill: boolean
) {
  const step = w / (barCount - 1);
  const color = colorAt(0.5);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, h - (levels[0] || 0) * h * 0.85);

  for (let i = 0; i < barCount; i++) {
    const lvl = levels[i] || 0;
    const x = i * step;
    const y = h - lvl * h * 0.85 - h * 0.03;
    ctx.lineTo(x, y);
  }

  if (fill) {
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0, colorAt(0));
    grad.addColorStop(1, colorAt(1));
    ctx.fillStyle = grad;
    if (prefs.vizNeon) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
    }
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = h * 0.02;
    ctx.lineJoin = 'round';
    if (prefs.vizNeon) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawDots(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: FloatArray,
  barCount: number,
  prefs: AppPrefs,
  colorAt: (f: number) => string
) {
  const step = w / barCount;
  for (let i = 0; i < barCount; i++) {
    const lvl = levels[i] || 0;
    const x = i * step + step / 2;
    const y = h - (h * 0.03 + lvl * h * 0.9);
    const rad = step * 0.28 * (0.5 + lvl);
    const color = colorAt(i / barCount);

    ctx.save();
    if (prefs.vizNeon) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawBarsPeak(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: FloatArray,
  peaks: FloatArray,
  barCount: number,
  prefs: AppPrefs,
  colorAt: (f: number) => string
) {
  const gapFactor = 0.5 - (prefs.vizWidth / 100) * 0.42;
  const gap = (w / barCount) * gapFactor;
  const bw = w / barCount - gap;
  const hp = prefs.vizHeight / 100;
  const maxH = h * hp;
  const minH = h * 0.03;
  const r = prefs.vizRounded ? bw * 0.4 : 0;
  let x = gap / 2;

  for (let i = 0; i < barCount; i++) {
    const lvl = levels[i] || 0;
    const bh = minH + lvl * maxH;
    const color = colorAt(i / barCount);

    ctx.save();
    if (prefs.vizNeon) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, h - bh, bw, bh, r);
    else ctx.rect(x, h - bh, bw, bh);
    ctx.fill();

    // Peak marker line
    if (lvl >= peaks[i]) peaks[i] = lvl;
    else peaks[i] = Math.max(0, peaks[i] - 0.012);

    const py = h - (minH + peaks[i] * maxH);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, py - bw * 0.2, bw, bw * 0.2, r);
    else ctx.rect(x, py - bw * 0.2, bw, bw * 0.2);
    ctx.fill();

    ctx.restore();

    x += bw + gap;
  }
}

function drawBarsHorizontal(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: FloatArray,
  barCount: number,
  prefs: AppPrefs
) {
  const gapFactor = 0.5 - (prefs.vizWidth / 100) * 0.42;
  const gap = (w / barCount) * gapFactor;
  const bw = w / barCount - gap;
  const hp = prefs.vizHeight / 100;
  const maxH = h * hp;
  const minH = h * 0.03;
  const r = prefs.vizRounded ? bw * 0.4 : 0;
  let x = gap / 2;

  for (let i = 0; i < barCount; i++) {
    const lvl = levels[i] || 0;
    const bh = minH + lvl * maxH;
    const hue = (i / barCount) * 360;
    const color = `hsl(${hue}, 90%, 55%)`;

    ctx.save();
    if (prefs.vizNeon) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, h - bh, bw, bh, r);
    else ctx.rect(x, h - bh, bw, bh);
    ctx.fill();
    ctx.restore();

    x += bw + gap;
  }
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: FloatArray,
  barCount: number,
  prefs: AppPrefs,
  colorAt: (f: number) => string
) {
  const cx = w / 2;
  const cy = h / 2;
  const innerR = Math.min(w, h) * 0.16;
  const maxLen = Math.min(w, h) * 0.32 * (prefs.vizHeight / 100);

  for (let i = 0; i < barCount; i++) {
    const lvl = levels[i] || 0;
    const ang = (i / barCount) * Math.PI * 2;
    const len = innerR + lvl * maxLen;
    const sx = cx + innerR * Math.cos(ang);
    const sy = cy + innerR * Math.sin(ang);
    const ex = cx + len * Math.cos(ang);
    const ey = cy + len * Math.sin(ang);
    const color = colorAt(i / barCount);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = ((Math.PI * 2 * innerR) / barCount) * 0.6;
    ctx.lineCap = 'round';
    if (prefs.vizNeon) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
    }
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.restore();
  }
}

function drawLedMatrix(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: FloatArray,
  barCount: number,
  prefs: AppPrefs,
  colorAt: (f: number) => string
) {
  const gapFactor = 0.5 - (prefs.vizWidth / 100) * 0.42;
  const gap = (w / barCount) * gapFactor;
  const bw = w / barCount - gap;
  const hp = prefs.vizHeight / 100;
  const reflectFrac = 0.28;
  const barZone = h * (1 - reflectFrac);
  const maxH = barZone * hp;
  const segs = 20;
  const segH = maxH / segs;
  const segDraw = segH * 0.78;

  let x = gap / 2;

  for (let i = 0; i < barCount; i++) {
    const lvl = levels[i] || 0;
    const lit = Math.min(segs, Math.max(0, Math.floor(lvl * segs)));

    for (let s = 0; s < lit; s++) {
      const frac = s / segs;
      const color = colorAt(frac);
      const segBottom = barZone - s * segH;
      const segTop = segBottom - segDraw;

      ctx.save();
      if (prefs.vizNeon) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
      }
      ctx.fillStyle = color;
      ctx.fillRect(x, segTop, bw, segDraw);
      ctx.restore();
    }

    const refN = Math.floor(lit * 0.6);
    for (let s = 0; s < refN; s++) {
      const frac = s / segs;
      const color = colorAt(frac);
      const segTop = barZone + s * segH;

      ctx.save();
      ctx.globalAlpha = Math.max(0.1, 0.3 - s * 0.04);
      ctx.fillStyle = color;
      ctx.fillRect(x, segTop, bw, segDraw);
      ctx.restore();
    }

    x += bw + gap;
  }
}

function drawDotGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: FloatArray,
  barCount: number,
  prefs: AppPrefs,
  colorAt: (f: number) => string
) {
  const cols = barCount;
  const rows = 20;
  const cw = w / cols;
  const ch = h / rows;
  const r = Math.min(cw, ch) * 0.32;
  const hp = prefs.vizHeight / 100;

  for (let c = 0; c < cols; c++) {
    const lvl = (levels[c] || 0) * hp;
    const lit = Math.min(rows, Math.max(0, Math.floor(lvl * rows)));

    for (let rr = 0; rr < lit; rr++) {
      const frac = rr / rows;
      const color = colorAt(frac);
      const cx = c * cw + cw / 2;
      const cy = h - (rr * ch + ch / 2);

      ctx.save();
      if (prefs.vizNeon) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawMirrorWave(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: FloatArray,
  barCount: number,
  prefs: AppPrefs,
  colorAt: (f: number) => string
) {
  const midY = h / 2;
  const amp = h * 0.42 * (prefs.vizHeight / 100);
  const step = w / (barCount - 1);
  const color = colorAt(0.5);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = h * 0.012;
  ctx.lineJoin = 'round';
  if (prefs.vizNeon) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
  }

  // Top wave
  ctx.beginPath();
  ctx.moveTo(0, midY);
  for (let i = 0; i < barCount; i++) {
    const lvl = levels[i] || 0;
    ctx.lineTo(i * step, midY - lvl * amp);
  }
  ctx.stroke();

  // Bottom wave
  ctx.beginPath();
  ctx.moveTo(0, midY);
  for (let i = 0; i < barCount; i++) {
    const lvl = levels[i] || 0;
    ctx.lineTo(i * step, midY + lvl * amp);
  }
  ctx.stroke();

  ctx.restore();
}

function drawDualBars(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: FloatArray,
  barCount: number,
  prefs: AppPrefs,
  colorAt: (f: number) => string
) {
  const gapFactor = 0.5 - (prefs.vizWidth / 100) * 0.42;
  const gap = (w / barCount) * gapFactor;
  const bw = w / barCount - gap;
  const hp = prefs.vizHeight / 100;
  const midY = h / 2;
  const maxH = h * 0.46 * hp;
  const r = prefs.vizRounded ? bw * 0.4 : 0;
  let x = gap / 2;

  for (let i = 0; i < barCount; i++) {
    const lvl = levels[i] || 0;
    const bh = lvl * maxH;
    const color = colorAt(i / barCount);

    ctx.save();
    if (prefs.vizNeon) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, midY - bh, bw, bh * 2, r);
    else ctx.rect(x, midY - bh, bw, bh * 2);
    ctx.fill();
    ctx.restore();

    x += bw + gap;
  }
}

function drawFlame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: FloatArray,
  barCount: number,
  prefs: AppPrefs,
  colorAt: (f: number) => string
) {
  const step = w / barCount;
  const hp = prefs.vizHeight / 100;

  for (let i = 0; i < barCount; i++) {
    const lvl = levels[i] || 0;
    const fh = lvl * h * hp;
    const cx = i * step + step / 2;
    const baseW = step * 0.9;

    ctx.save();
    const grad = ctx.createLinearGradient(cx, h, cx, h - fh);
    grad.addColorStop(0, colorAt(0));
    grad.addColorStop(1, colorAt(1));

    if (prefs.vizNeon) {
      ctx.shadowColor = colorAt(0.5);
      ctx.shadowBlur = 16;
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx - baseW / 2, h);
    ctx.quadraticCurveTo(cx - baseW / 2, h - fh * 0.5, cx, h - fh);
    ctx.quadraticCurveTo(cx + baseW / 2, h - fh * 0.5, cx + baseW / 2, h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawRipple(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: FloatArray,
  barCount: number,
  prefs: AppPrefs,
  colorAt: (f: number) => string,
  currentPhase: number
): number {
  const cx = w / 2;
  const cy = h / 2;
  let energy = 0;
  for (let i = 0; i < levels.length; i++) energy += levels[i];
  energy = Math.min(1, energy / levels.length);

  const nextPhase = (currentPhase + 0.04 + energy * 0.14) % 1;
  const maxR = Math.min(w, h) * 0.5;
  const rings = 6;

  for (let k = 0; k < rings; k++) {
    const phase = (nextPhase + k / rings) % 1;
    const rad = phase * maxR;
    const color = colorAt(phase);

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, (1 - phase) * (0.3 + energy)));
    ctx.strokeStyle = color;
    ctx.lineWidth = h * 0.02 * (0.5 + energy);
    if (prefs.vizNeon) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
    }
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  return nextPhase;
}
