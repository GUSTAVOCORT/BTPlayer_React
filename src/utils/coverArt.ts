function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function hslToRgb(h: number, s: number, l: number): string {
  return `hsl(${h}, ${s * 100}%, ${l * 100}%)`;
}

export function generateCoverArt(
  size: number,
  seedText: string,
  style: number = 0,
  accentColor: string = "#FFC400"
): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const seed = seedText.trim() || "?";
  const h = hashCode(seed);

  const hue1 = h % 360;
  const hue2 = Math.floor(h / 7) % 360;

  const c1 = hslToRgb(hue1, 0.55, 0.35);
  const c2 = hslToRgb(hue2, 0.65, 0.15);

  const radius = size * 0.12;

  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(0, 0, size, size, radius);
  } else {
    ctx.rect(0, 0, size, size);
  }
  ctx.clip();

  // Background linear gradient
  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, c1);
  bg.addColorStop(1, c2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Style details
  if (style === 1) {
    // Abstract blobs
    for (let k = 0; k < 5; k++) {
      const hue = Math.floor(h / (k + 1)) % 360;
      ctx.fillStyle = `hsla(${hue}, 70%, 50%, 0.35)`;
      const cx = (h * (k + 3)) % size;
      const cy = (h * (k + 7)) % size;
      const r = size * (0.14 + (k % 3) * 0.06);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (style === 2) {
    // Concentric rings
    for (let k = 1; k <= 6; k++) {
      ctx.lineWidth = size * 0.02;
      ctx.strokeStyle = k % 2 === 0 ? accentColor : "rgba(255, 255, 255, 0.45)";
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.08 * k, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Radial highlight glow
  const glow = ctx.createRadialGradient(
    size * 0.32,
    size * 0.28,
    0,
    size * 0.32,
    size * 0.28,
    size * 0.8
  );
  glow.addColorStop(0, "rgba(255, 255, 255, 0.25)");
  glow.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  // Initial letter
  if (style !== 2) {
    const ch = (seed.trim()[0] || "?").toUpperCase();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold ${Math.floor(size * 0.46)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 8;
    ctx.fillText(ch, size / 2, size / 2 + size * 0.02);
  }

  ctx.restore();
  return canvas.toDataURL("image/png");
}
