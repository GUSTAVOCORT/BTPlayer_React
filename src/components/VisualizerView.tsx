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
    let animPhase = 0;

    const render = () => {
      animPhase = (animPhase + 0.02) % (Math.PI * 2000);
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

      const style = prefs.vizStyle % 29;

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
        case 16:
          draw3DWaveGrid(ctx, w, h, levels, barCount, prefs, colorAt, animPhase);
          break;
        case 17:
          drawCyberTunnel(ctx, w, h, levels, barCount, prefs, colorAt, animPhase);
          break;
        case 18:
          drawLavaLamp(ctx, w, h, levels, barCount, prefs, colorAt, animPhase);
          break;
        case 19:
          drawTeslaCoil(ctx, w, h, levels, barCount, prefs, colorAt, animPhase);
          break;
        case 20:
          drawTronGrid(ctx, w, h, levels, barCount, prefs, colorAt, animPhase);
          break;
        case 21:
          drawVintageRadio(ctx, w, h, levels, barCount, prefs, colorAt, animPhase);
          break;
        case 22:
          drawPlasmaSphere(ctx, w, h, levels, barCount, prefs, colorAt, animPhase);
          break;
        case 23:
          drawNeonRadialRing(ctx, w, h, levels, barCount, prefs, colorAt, animPhase);
          break;
        case 24:
          drawConcentricRibbons(ctx, w, h, levels, barCount, prefs, colorAt, animPhase);
          break;
        case 25:
          draw3DParticleMatrix(ctx, w, h, levels, barCount, prefs, colorAt, animPhase);
          break;
        case 26:
          drawCosmicEnergyBeam(ctx, w, h, levels, barCount, prefs, colorAt, animPhase);
          break;
        case 27:
          draw80sDiscoBall(ctx, w, h, levels, barCount, prefs, colorAt, animPhase);
          break;
        case 28:
          drawLaserShow(ctx, w, h, levels, barCount, prefs, colorAt, animPhase);
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
            vizStyle: (prev.vizStyle + 1) % 29,
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

// 16: Ondas 3D (Perspective Horizon Grid)
function draw3DWaveGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: FloatArray,
  barCount: number,
  prefs: AppPrefs,
  colorAt: (f: number) => string,
  animPhase: number
) {
  const horizonY = h * 0.35;
  const gridRows = 16;
  const gridCols = barCount;

  ctx.save();

  // Horizon Sun / Glow
  const sunGrad = ctx.createRadialGradient(w / 2, horizonY, 5, w / 2, horizonY, h * 0.4);
  sunGrad.addColorStop(0, colorAt(0));
  sunGrad.addColorStop(0.5, colorAt(0.5));
  sunGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sunGrad;
  ctx.fillRect(0, 0, w, h);

  ctx.lineWidth = 1.5;

  // Render 3D Perspective Lines (Verticals)
  for (let c = 0; c <= gridCols; c++) {
    const frac = c / gridCols;
    const xBottom = (frac - 0.5) * w * 2.2 + w / 2;
    const xTop = (frac - 0.5) * w * 0.2 + w / 2;

    const colColor = colorAt(frac);
    ctx.strokeStyle = colColor;
    if (prefs.vizNeon) {
      ctx.shadowColor = colColor;
      ctx.shadowBlur = 8;
    }

    ctx.beginPath();
    ctx.moveTo(xTop, horizonY);
    ctx.lineTo(xBottom, h);
    ctx.stroke();
  }

  // Render Horizontals with audio wave height displacements
  for (let r = 0; r < gridRows; r++) {
    const rowFrac = (r + (animPhase % 1)) / gridRows;
    const z = Math.pow(rowFrac, 1.8);
    const y = horizonY + z * (h - horizonY);

    const rowColor = colorAt(rowFrac);
    ctx.strokeStyle = rowColor;
    ctx.globalAlpha = Math.min(1, Math.max(0.2, z));

    ctx.beginPath();
    for (let c = 0; c <= gridCols; c++) {
      const colFrac = c / gridCols;
      const x = (colFrac - 0.5) * w * (0.2 + z * 2.0) + w / 2;

      const lvl = levels[c % barCount] || 0;
      const dy = Math.sin(colFrac * Math.PI * 4 + animPhase) * lvl * h * 0.15 * z;

      if (c === 0) ctx.moveTo(x, y - dy);
      else ctx.lineTo(x, y - dy);
    }
    ctx.stroke();
  }

  ctx.restore();
}

// 17: Túnel Cyberpunk (Warp Tunnel)
function drawCyberTunnel(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: FloatArray,
  barCount: number,
  prefs: AppPrefs,
  colorAt: (f: number) => string,
  animPhase: number
) {
  const cx = w / 2;
  const cy = h / 2;
  const rings = 12;
  const sides = 8; // Octagonal tunnel

  let bassSum = 0;
  for (let i = 0; i < Math.min(8, barCount); i++) bassSum += levels[i];
  const bass = bassSum / 8;

  ctx.save();

  for (let r = rings; r >= 1; r--) {
    const z = (r - (animPhase * 2 % 1)) / rings;
    const scale = Math.pow(z, 2.2);
    const maxR = Math.max(w, h) * 0.8;
    const rad = scale * maxR * (1 + bass * 0.25);

    const color = colorAt(1 - z);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, (1 - z) * 6);
    ctx.globalAlpha = Math.min(1, Math.max(0.1, z * 1.2));

    if (prefs.vizNeon) {
      ctx.shadowColor = color;
      ctx.shadowBlur = (1 - z) * 16;
    }

    ctx.beginPath();
    for (let s = 0; s < sides; s++) {
      const angle = (s / sides) * Math.PI * 2 + animPhase * 0.2;
      const lvl = levels[s % barCount] || 0;
      const localR = rad * (1 + lvl * 0.2);
      const px = cx + Math.cos(angle) * localR;
      const py = cy + Math.sin(angle) * localR;

      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }

  ctx.restore();
}

// 18: Efecto Lámpara de Lava (Fluid Metaballs)
function drawLavaLamp(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: FloatArray,
  barCount: number,
  prefs: AppPrefs,
  colorAt: (f: number) => string,
  animPhase: number
) {
  const blobCount = 7;
  ctx.save();

  // Glass tube container outline
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 2;
  ctx.strokeRect(w * 0.1, h * 0.05, w * 0.8, h * 0.9);

  let bass = 0;
  for (let i = 0; i < Math.min(6, barCount); i++) bass += levels[i];
  bass /= 6;

  for (let b = 0; b < blobCount; b++) {
    const speed = 0.3 + (b % 3) * 0.2;
    const t = animPhase * speed + b * 1.5;
    const bx = w * 0.2 + (Math.sin(t * 0.8 + b) * 0.3 + 0.3) * w * 0.6;
    const by = h * 0.15 + (Math.cos(t * 0.5 + b) * 0.35 + 0.4) * h * 0.7;

    const lvl = levels[(b * 3) % barCount] || 0;
    const baseR = Math.min(w, h) * 0.08;
    const radius = baseR * (0.8 + lvl * 0.9 + bass * 0.4);

    const color = colorAt(b / blobCount);
    const grad = ctx.createRadialGradient(bx, by, radius * 0.1, bx, by, radius);
    grad.addColorStop(0, color);
    grad.addColorStop(0.7, color);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    if (prefs.vizNeon) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bx, by, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// 19: Bobina de Tesla (Tesla Coil & Electric Lightning Arcs)
function drawTeslaCoil(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: FloatArray,
  barCount: number,
  prefs: AppPrefs,
  colorAt: (f: number) => string,
  animPhase: number
) {
  const cx = w / 2;
  const coilBottom = h * 0.9;
  const coilTop = h * 0.45;

  ctx.save();

  // Draw Central Tesla Tower Spire
  ctx.fillStyle = '#222228';
  ctx.fillRect(cx - 12, coilTop, 24, coilBottom - coilTop);

  // Electrode Orb
  const orbGrad = ctx.createRadialGradient(cx, coilTop, 2, cx, coilTop, 20);
  const coreColor = colorAt(0.2);
  orbGrad.addColorStop(0, '#FFFFFF');
  orbGrad.addColorStop(0.5, coreColor);
  orbGrad.addColorStop(1, '#111');
  ctx.fillStyle = orbGrad;
  ctx.beginPath();
  ctx.arc(cx, coilTop, 22, 0, Math.PI * 2);
  ctx.fill();

  // High/mid energy for electrical discharge
  let midTrebleSum = 0;
  for (let i = Math.floor(barCount * 0.3); i < barCount; i++) midTrebleSum += levels[i];
  const energy = midTrebleSum / (barCount * 0.7);

  const arcCount = Math.floor(3 + energy * 9);

  for (let a = 0; a < arcCount; a++) {
    const angle = (a / arcCount) * Math.PI * 2 + Math.sin(animPhase * 5 + a) * 0.5;
    const targetDist = Math.min(w, h) * (0.35 + energy * 0.3);
    const tx = cx + Math.cos(angle) * targetDist;
    const ty = coilTop + Math.sin(angle) * targetDist;

    // Draw Jagged Bolt
    ctx.strokeStyle = a % 2 === 0 ? '#FFFFFF' : colorAt(a / arcCount);
    ctx.lineWidth = 2 + Math.random() * 2;

    if (prefs.vizNeon) {
      ctx.shadowColor = colorAt(a / arcCount);
      ctx.shadowBlur = 15;
    }

    ctx.beginPath();
    ctx.moveTo(cx, coilTop);

    const segments = 8;
    let currX = cx;
    let currY = coilTop;

    for (let s = 1; s <= segments; s++) {
      const frac = s / segments;
      const nextX = cx + (tx - cx) * frac + (Math.random() - 0.5) * 30 * energy;
      const nextY = coilTop + (ty - coilTop) * frac + (Math.random() - 0.5) * 30 * energy;
      ctx.lineTo(nextX, nextY);
      currX = nextX;
      currY = nextY;
    }
    ctx.stroke();
  }

  ctx.restore();
}

// 20: Efecto TRON (Tron Grid & Identity Disc)
function drawTronGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: FloatArray,
  barCount: number,
  prefs: AppPrefs,
  colorAt: (f: number) => string,
  animPhase: number
) {
  const cx = w / 2;
  const cy = h / 2;

  ctx.save();

  // 1. Tron Perspective Floor Grid
  const horizonY = h * 0.55;
  const gridLines = 12;
  ctx.strokeStyle = '#00F5D4';
  ctx.lineWidth = 1;
  if (prefs.vizNeon) {
    ctx.shadowColor = '#00F5D4';
    ctx.shadowBlur = 10;
  }

  ctx.beginPath();
  for (let i = -10; i <= 10; i++) {
    ctx.moveTo(cx + i * 20, horizonY);
    ctx.lineTo(cx + i * 120, h);
  }
  for (let r = 1; r <= gridLines; r++) {
    const z = Math.pow(r / gridLines, 2);
    const y = horizonY + z * (h - horizonY);
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  // 2. Spinning Tron Identity Disc
  const discRadius = Math.min(w, h) * 0.22;
  let bass = 0;
  for (let i = 0; i < Math.min(6, barCount); i++) bass += levels[i];
  bass /= 6;

  ctx.translate(cx, cy * 0.85);
  ctx.rotate(animPhase);

  // Outer Ring Segments
  const segments = barCount;
  for (let i = 0; i < segments; i++) {
    const segAngle = (Math.PI * 2) / segments;
    const startA = i * segAngle;
    const endA = startA + segAngle * 0.8;
    const lvl = levels[i] || 0;

    const rOuter = discRadius + lvl * 30;
    const color = colorAt(i / segments);

    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    if (prefs.vizNeon) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
    }

    ctx.beginPath();
    ctx.arc(0, 0, rOuter, startA, endA);
    ctx.stroke();
  }

  // Inner Identity Ring Core
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, discRadius * 0.5 * (1 + bass * 0.2), 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

// 21: Aspecto Radio Viejo (Vintage Tube Radio & VU Needle)
function drawVintageRadio(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: FloatArray,
  barCount: number,
  prefs: AppPrefs,
  colorAt: (f: number) => string,
  animPhase: number
) {
  ctx.save();

  // 1. Vintage Wood & Bakelite Frame Border
  const pad = 12;
  ctx.fillStyle = '#1A120B'; // Dark mahogany wood
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#2C1D11';
  ctx.fillRect(pad, pad, w - pad * 2, h - pad * 2);

  // Glass Dial Window Background
  const glassMargin = 24;
  const gx = glassMargin;
  const gy = glassMargin;
  const gw = w - glassMargin * 2;
  const gh = h - glassMargin * 2;

  const dialGrad = ctx.createLinearGradient(gx, gy, gx, gy + gh);
  dialGrad.addColorStop(0, '#3A260F');
  dialGrad.addColorStop(0.5, '#5C3D1E');
  dialGrad.addColorStop(1, '#221509');
  ctx.fillStyle = dialGrad;
  ctx.fillRect(gx, gy, gw, gh);

  // Glowing Vacuum Tubes (Bottom corner filaments)
  let bass = 0;
  for (let i = 0; i < Math.min(6, barCount); i++) bass += levels[i];
  bass /= 6;

  const tubeX = [gx + 40, w - gx - 40];
  const tubeY = gy + gh - 35;

  tubeX.forEach((tx) => {
    const tubeGlow = ctx.createRadialGradient(tx, tubeY, 2, tx, tubeY, 30);
    tubeGlow.addColorStop(0, '#FFE066');
    tubeGlow.addColorStop(0.5, '#FF8C00');
    tubeGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = tubeGlow;
    ctx.beginPath();
    ctx.arc(tx, tubeY, 28 * (1 + bass * 0.3), 0, Math.PI * 2);
    ctx.fill();
  });

  // Radio Frequency Dial Ticks (88..108 MHz)
  ctx.strokeStyle = '#FFD580';
  ctx.fillStyle = '#FFD580';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';

  const dialY = gy + gh * 0.35;
  ctx.beginPath();
  ctx.moveTo(gx + 30, dialY);
  ctx.lineTo(gx + gw - 30, dialY);
  ctx.stroke();

  const mhzList = ['88', '92', '96', '100', '104', '108'];
  const stepX = (gw - 60) / (mhzList.length - 1);

  mhzList.forEach((mhz, idx) => {
    const tx = gx + 30 + idx * stepX;
    ctx.beginPath();
    ctx.moveTo(tx, dialY - 12);
    ctx.lineTo(tx, dialY + 12);
    ctx.stroke();
    ctx.fillText(`${mhz} MHz`, tx, dialY - 16);
  });

  // 2. Analog VU Needle Meter
  let totalEnergy = 0;
  for (let i = 0; i < barCount; i++) totalEnergy += levels[i];
  totalEnergy /= barCount;

  const needlePivotX = w / 2;
  const needlePivotY = gy + gh * 0.95;
  const needleLen = gh * 0.55;

  // Swing needle angle (-45deg to +45deg)
  const targetAngle = -Math.PI / 4 + totalEnergy * (Math.PI / 2);
  const needleAngle = targetAngle + Math.sin(animPhase * 8) * 0.02;

  ctx.strokeStyle = '#FF3333';
  ctx.lineWidth = 2.5;
  if (prefs.vizNeon) {
    ctx.shadowColor = '#FF3333';
    ctx.shadowBlur = 10;
  }

  ctx.beginPath();
  ctx.moveTo(needlePivotX, needlePivotY);
  ctx.lineTo(
    needlePivotX + Math.sin(needleAngle) * needleLen,
    needlePivotY - Math.cos(needleAngle) * needleLen
  );
  ctx.stroke();

  // Pivot Cap
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(needlePivotX, needlePivotY, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// 22: Bola de Plasma (Plasma Sphere - Image 2)
function drawPlasmaSphere(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: FloatArray,
  barCount: number,
  prefs: AppPrefs,
  colorAt: (f: number) => string,
  animPhase: number
) {
  const cx = w / 2;
  const cy = h / 2;
  const orbRadius = Math.min(w, h) * 0.42;

  ctx.save();

  // Glass Orb Perimeter Ring
  ctx.strokeStyle = 'rgba(180, 200, 255, 0.3)';
  ctx.lineWidth = 3;
  if (prefs.vizNeon) {
    ctx.shadowColor = colorAt(0);
    ctx.shadowBlur = 18;
  }
  ctx.beginPath();
  ctx.arc(cx, cy, orbRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Central Electrode
  const coreR = orbRadius * 0.22;
  const coreGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, coreR);
  coreGrad.addColorStop(0, '#FFFFFF');
  coreGrad.addColorStop(0.5, colorAt(0.1));
  coreGrad.addColorStop(1, 'rgba(20, 0, 40, 0.8)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
  ctx.fill();

  // Dancing Electric Plasma Tendrils
  let bass = 0;
  for (let i = 0; i < Math.min(6, barCount); i++) bass += levels[i];
  bass /= 6;

  const tendrilCount = 14;
  for (let i = 0; i < tendrilCount; i++) {
    const angle = (i / tendrilCount) * Math.PI * 2 + Math.sin(animPhase * 2 + i) * 0.2;
    const lvl = levels[i % barCount] || 0;
    const reach = orbRadius * (0.85 + lvl * 0.2);

    const tendrilColor = colorAt(i / tendrilCount);
    ctx.strokeStyle = tendrilColor;
    ctx.lineWidth = 1.8 + lvl * 2;

    if (prefs.vizNeon) {
      ctx.shadowColor = tendrilColor;
      ctx.shadowBlur = 12;
    }

    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * coreR, cy + Math.sin(angle) * coreR);

    // Jagged path out to outer glass orb
    const steps = 6;
    for (let s = 1; s <= steps; s++) {
      const frac = s / steps;
      const dist = coreR + (reach - coreR) * frac;
      const perpOffset = (Math.sin(animPhase * 6 + s * 2 + i) * 16 * (1 - frac * 0.3) * (0.5 + bass));
      const px = cx + Math.cos(angle) * dist + Math.cos(angle + Math.PI / 2) * perpOffset;
      const py = cy + Math.sin(angle) * dist + Math.sin(angle + Math.PI / 2) * perpOffset;
      ctx.lineTo(px, py);

      // Bright tip glowing flare on glass contact
      if (s === steps) {
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(px, py, 4 + lvl * 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

// 23: Anillo Neón Pulsante (Neon Radial Ring - Image 3)
function drawNeonRadialRing(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: FloatArray,
  barCount: number,
  prefs: AppPrefs,
  colorAt: (f: number) => string,
  animPhase: number
) {
  const cx = w / 2;
  const cy = h / 2;
  const baseR = Math.min(w, h) * 0.28;

  let bass = 0;
  for (let i = 0; i < Math.min(8, barCount); i++) bass += levels[i];
  bass /= 8;

  ctx.save();

  // Inner Glow Center
  const innerGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, baseR);
  innerGrad.addColorStop(0, colorAt(0.5));
  innerGrad.addColorStop(0.8, 'rgba(0,0,0,0)');
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
  ctx.fill();

  // Outer Radial Equalizer Spikes
  const spikes = barCount * 2;
  for (let i = 0; i < spikes; i++) {
    const frac = i / spikes;
    const angle = frac * Math.PI * 2 - Math.PI / 2;
    const lvl = levels[i % barCount] || 0;

    const spikeLen = lvl * Math.min(w, h) * 0.25;
    const r1 = baseR + (1 + bass * 0.2);
    const r2 = r1 + spikeLen;

    const color = colorAt(frac);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, (Math.PI * 2 * baseR) / spikes * 0.6);

    if (prefs.vizNeon) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
    }

    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
    ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
    ctx.stroke();

    // Orbiting particles
    if (i % 3 === 0) {
      const partR = r2 + 8 + Math.sin(animPhase * 3 + i) * 6;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(angle) * partR, cy + Math.sin(angle) * partR, 2 + lvl * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Smooth Concentric Neon Ring Core
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, baseR * (1 + bass * 0.15), 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

// 24: Cintas Concentricas (Concentric Oscillating Ribbons - Image 4)
function drawConcentricRibbons(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: FloatArray,
  barCount: number,
  prefs: AppPrefs,
  colorAt: (f: number) => string,
  animPhase: number
) {
  const cx = w / 2;
  const cy = h / 2;
  const ringCount = 10;
  const baseRadius = Math.min(w, h) * 0.15;

  ctx.save();

  for (let r = 0; r < ringCount; r++) {
    const rFrac = r / ringCount;
    const radius = baseRadius + rFrac * Math.min(w, h) * 0.28;
    const color = colorAt(rFrac);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    if (prefs.vizNeon) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
    }

    ctx.beginPath();
    const points = 64;
    for (let p = 0; p <= points; p++) {
      const pFrac = p / points;
      const angle = pFrac * Math.PI * 2;

      const lvlIdx = Math.floor(pFrac * barCount) % barCount;
      const lvl = levels[lvlIdx] || 0;

      // Smooth wave oscillation
      const wave = Math.sin(angle * 6 + animPhase * 3 + r * 0.5) * lvl * 18;
      const currR = radius + wave;

      const px = cx + Math.cos(angle) * currR;
      const py = cy + Math.sin(angle) * currR;

      if (p === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }

  ctx.restore();
}

// 25: Malla de Puntos 3D (3D Silk Particle Waves - Image 5)
function draw3DParticleMatrix(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: FloatArray,
  barCount: number,
  prefs: AppPrefs,
  colorAt: (f: number) => string,
  animPhase: number
) {
  const rows = 18;
  const cols = 50;

  ctx.save();

  for (let r = 0; r < rows; r++) {
    const rFrac = r / rows;
    const yBase = h * 0.2 + rFrac * h * 0.65;
    const color = colorAt(rFrac);

    ctx.fillStyle = color;

    for (let c = 0; c < cols; c++) {
      const cFrac = c / cols;
      const x = cFrac * w;

      const lvl = levels[Math.floor(cFrac * barCount) % barCount] || 0;

      // 3D perspective sine wave
      const wave = Math.sin(cFrac * Math.PI * 4 + animPhase * 2 + rFrac * Math.PI) * (20 + lvl * 40);
      const y = yBase + wave;

      const dotSize = (0.8 + (1 - rFrac) * 1.5) * (1 + lvl * 0.8);

      if (prefs.vizNeon) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 4;
      }

      ctx.beginPath();
      ctx.arc(x, y, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

// 26: Haz de Energía Cósmica (Cosmic Energy Beam - Image 6)
function drawCosmicEnergyBeam(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: FloatArray,
  barCount: number,
  prefs: AppPrefs,
  colorAt: (f: number) => string,
  animPhase: number
) {
  const midY = h / 2;
  const strands = 7;

  ctx.save();

  for (let s = 0; s < strands; s++) {
    const sFrac = s / strands;
    const color = colorAt(sFrac);

    ctx.strokeStyle = color;
    ctx.lineWidth = 3 + (1 - Math.abs(sFrac - 0.5) * 2) * 3;

    if (prefs.vizNeon) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
    }

    ctx.beginPath();
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
      const xFrac = i / steps;
      const x = xFrac * w;

      const lvl = levels[Math.floor(xFrac * barCount) % barCount] || 0;

      // High energy sinuous wave
      const envelope = Math.sin(xFrac * Math.PI); // tapering at ends
      const amp = (h * 0.35) * envelope * (0.3 + lvl * 0.9);
      const dy = Math.sin(xFrac * Math.PI * 5 + animPhase * 3 + s * 0.8) * amp;

      const y = midY + dy + (s - strands / 2) * 6;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);

      // Sparkle stars along wave peak
      if (i % 12 === 0 && lvl > 0.4) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x - 2, y - 2, 4, 4);
      }
    }
    ctx.stroke();
  }

  ctx.restore();
}

// 27: Bola de Discoteca de los 80s (80s Mirror Disco Ball & Light Rays)
function draw80sDiscoBall(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: FloatArray,
  barCount: number,
  prefs: AppPrefs,
  colorAt: (f: number) => string,
  animPhase: number
) {
  const cx = w / 2;
  const ballY = h * 0.35;
  const ballR = Math.min(w, h) * 0.22;

  let bass = 0;
  for (let i = 0; i < Math.min(6, barCount); i++) bass += levels[i];
  bass /= 6;

  ctx.save();

  // 1. Hanging Chain
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, ballY - ballR);
  ctx.stroke();

  // 2. Light Rays Radiating Outward
  const rayCount = 16;
  for (let r = 0; r < rayCount; r++) {
    const angle = (r / rayCount) * Math.PI * 2 + animPhase * 0.4;
    const rayColor = colorAt(r / rayCount);

    const lvl = levels[r % barCount] || 0;
    const rayLen = Math.max(w, h) * (0.6 + lvl * 0.6 + bass * 0.3);

    const rayGrad = ctx.createLinearGradient(cx, ballY, cx + Math.cos(angle) * rayLen, ballY + Math.sin(angle) * rayLen);
    rayGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    rayGrad.addColorStop(0.3, rayColor);
    rayGrad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = rayGrad;
    ctx.beginPath();
    ctx.moveTo(cx, ballY);
    const spread = 0.12;
    ctx.lineTo(cx + Math.cos(angle - spread) * rayLen, ballY + Math.sin(angle - spread) * rayLen);
    ctx.lineTo(cx + Math.cos(angle + spread) * rayLen, ballY + Math.sin(angle + spread) * rayLen);
    ctx.closePath();
    ctx.fill();
  }

  // 3. Mirror Disco Ball Base Outer Circle Glow
  const ballGlow = ctx.createRadialGradient(cx, ballY, ballR * 0.5, cx, ballY, ballR * 1.3);
  ballGlow.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
  ballGlow.addColorStop(0.6, colorAt(0.3));
  ballGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ballGlow;
  ctx.beginPath();
  ctx.arc(cx, ballY, ballR * 1.3, 0, Math.PI * 2);
  ctx.fill();

  // 4. Disco Ball Sphere & Mirror Facets
  ctx.fillStyle = '#22222A';
  ctx.beginPath();
  ctx.arc(cx, ballY, ballR, 0, Math.PI * 2);
  ctx.fill();

  const rows = 12;
  const cols = 20;
  for (let row = 0; row < rows; row++) {
    const phi = (row / rows) * Math.PI - Math.PI / 2;
    const rRow = Math.cos(phi) * ballR;
    const yRow = ballY + Math.sin(phi) * ballR;

    for (let col = 0; col < cols; col++) {
      const theta = (col / cols) * Math.PI * 2 + animPhase * 1.2;
      const xCol = cx + Math.sin(theta) * rRow;

      // Facet depth visibility
      const zCol = Math.cos(theta);
      if (zCol < 0) continue; // back side hidden

      const facetSize = (rRow / ballR) * (ballR / rows) * 1.2;
      const highlight = Math.pow(zCol, 3) + Math.sin(theta * 3 + animPhase * 5) * 0.3;

      const colVal = Math.min(255, Math.max(80, Math.floor(highlight * 255)));
      ctx.fillStyle = `rgb(${colVal}, ${colVal}, ${Math.min(255, colVal + 40)})`;

      ctx.fillRect(xCol - facetSize / 2, yRow - facetSize / 2, facetSize, facetSize);
    }
  }

  // 5. Dancing Mirror Spot Reflections Scattered Around Room
  const spotCount = 30;
  for (let s = 0; s < spotCount; s++) {
    const spotAngle = (s / spotCount) * Math.PI * 2 + animPhase * 1.5;
    const dist = ballR * 1.4 + (s % 5) * 45 + bass * 30;
    const sx = cx + Math.cos(spotAngle) * dist;
    const sy = ballY + Math.sin(spotAngle) * dist;

    if (sx >= 0 && sx <= w && sy >= 0 && sy <= h) {
      const spotColor = colorAt(s / spotCount);
      ctx.fillStyle = spotColor;
      if (prefs.vizNeon) {
        ctx.shadowColor = spotColor;
        ctx.shadowBlur = 10;
      }
      ctx.fillRect(sx, sy, 6 + (s % 4), 6 + (s % 4));
    }
  }

  ctx.restore();
}

// 28: Show de Rayos Láser (80s Club Laser Show & Scanning Beams)
function drawLaserShow(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: FloatArray,
  barCount: number,
  prefs: AppPrefs,
  colorAt: (f: number) => string,
  animPhase: number
) {
  ctx.save();

  let bass = 0;
  let treble = 0;
  for (let i = 0; i < Math.min(6, barCount); i++) bass += levels[i];
  bass /= 6;
  for (let i = Math.floor(barCount * 0.7); i < barCount; i++) treble += levels[i];
  treble /= (barCount * 0.3);

  // Background Smoke & Strobe Flash on Bass Kick
  if (bass > 0.6) {
    ctx.fillStyle = `rgba(255, 255, 255, ${bass * 0.12})`;
    ctx.fillRect(0, 0, w, h);
  }

  // Projector Sources: Bottom Left, Bottom Right, Top Center
  const projectors = [
    { x: w * 0.1, y: h * 0.95 },
    { x: w * 0.9, y: h * 0.95 },
    { x: w * 0.5, y: h * 0.05 },
  ];

  projectors.forEach((proj, pIdx) => {
    // Draw Projector Lens Head
    ctx.fillStyle = '#111';
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Laser Fan Beams from Projector
    const beamCount = 8;
    const pColor = colorAt((pIdx * 0.33 + animPhase * 0.1) % 1);

    for (let b = 0; b < beamCount; b++) {
      const sweepAngle = Math.sin(animPhase * 2 + pIdx + b * 0.4) * 0.8;
      const baseAngle = pIdx === 2 ? Math.PI / 2 : (pIdx === 0 ? -Math.PI / 4 : -Math.PI * 0.75);
      const angle = baseAngle + sweepAngle + (b - beamCount / 2) * 0.12;

      const lvl = levels[(b * 3 + pIdx * 4) % barCount] || 0;
      const beamLen = Math.max(w, h) * (0.8 + lvl * 0.5);

      const targetX = proj.x + Math.cos(angle) * beamLen;
      const targetY = proj.y + Math.sin(angle) * beamLen;

      // Laser Beam Line
      ctx.strokeStyle = pColor;
      ctx.lineWidth = 1.5 + lvl * 3;

      if (prefs.vizNeon) {
        ctx.shadowColor = pColor;
        ctx.shadowBlur = 18;
      }

      ctx.beginPath();
      ctx.moveTo(proj.x, proj.y);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();

      // Laser Contact Point Bright Flare
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(targetX, targetY, 3 + lvl * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Cross-Cutting Overhead Laser Grid / Lattice
  const gridLines = 10;
  ctx.strokeStyle = colorAt(0.7);
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.7 + treble * 0.3;

  for (let g = 0; g < gridLines; g++) {
    const gFrac = g / gridLines;
    const lvl = levels[g % barCount] || 0;
    const y = h * 0.2 + gFrac * h * 0.6 + Math.sin(animPhase * 4 + g) * lvl * 20;

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  ctx.restore();
}
