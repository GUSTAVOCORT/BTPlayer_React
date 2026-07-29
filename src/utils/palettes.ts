import { Palette } from '../types';

export const PALETTES: Palette[] = [
  {
    name: "Fuego",
    colors: ["#FFC400", "#FF7A00", "#FF2D95"],
    stops: [0, 0.55, 1]
  },
  {
    name: "Neón Cyan",
    colors: ["#00F5D4", "#00BBF9", "#9B5DE5"],
    stops: [0, 0.5, 1]
  },
  {
    name: "Verde ácido",
    colors: ["#B5FF00", "#00E676", "#00B0FF"],
    stops: [0, 0.5, 1]
  },
  {
    name: "Magenta",
    colors: ["#FF006E", "#8338EC", "#3A86FF"],
    stops: [0, 0.5, 1]
  },
  {
    name: "Hielo",
    colors: ["#CAF0F8", "#48CAE4", "#0077B6"],
    stops: [0, 0.5, 1]
  },
  {
    name: "Atardecer",
    colors: ["#FFD60A", "#FF9E00", "#FF0054"],
    stops: [0, 0.5, 1]
  },
  {
    name: "Blanco puro",
    colors: ["#FFFFFF", "#B0BEC5", "#607D8B"],
    stops: [0, 0.5, 1]
  },
  {
    name: "Arcoíris",
    colors: ["#FF0000", "#FFFF00", "#00FF00", "#00FFFF", "#FF00FF"],
    stops: [0, 0.25, 0.5, 0.75, 1]
  },
  {
    name: "Lava",
    colors: ["#FFF200", "#FF6A00", "#D00000"],
    stops: [0, 0.5, 1]
  },
  {
    name: "Océano",
    colors: ["#00FFD5", "#0096FF", "#7B2FF7"],
    stops: [0, 0.5, 1]
  },
  {
    name: "Tropical",
    colors: ["#FFE600", "#00E676", "#00B8D4"],
    stops: [0, 0.5, 1]
  },
  {
    name: "Chicle",
    colors: ["#FF8FE7", "#FF4D9D", "#A020F0"],
    stops: [0, 0.5, 1]
  },
  {
    name: "Cyberpunk",
    colors: ["#F9F002", "#FF00A0", "#00E5FF"],
    stops: [0, 0.5, 1]
  },
  {
    name: "Esmeralda",
    colors: ["#D8F999", "#34D399", "#065F46"],
    stops: [0, 0.5, 1]
  },
  {
    name: "Oro rosa",
    colors: ["#FFD6E0", "#FF9A8B", "#B76E79"],
    stops: [0, 0.5, 1]
  },
  {
    name: "Ámbar",
    colors: ["#FFF3B0", "#FFC300", "#FF8C00"],
    stops: [0, 0.5, 1]
  },
  {
    name: "Violeta neón",
    colors: ["#E0AAFF", "#9D4EDD", "#5A189A"],
    stops: [0, 0.5, 1]
  },
  {
    name: "Rojo sangre",
    colors: ["#FF6B6B", "#E63946", "#8B0000"],
    stops: [0, 0.5, 1]
  },
  {
    name: "Menta",
    colors: ["#CCFFEC", "#5EEAD4", "#14B8A6"],
    stops: [0, 0.5, 1]
  },
  {
    name: "Galaxia",
    colors: ["#FF61D2", "#7C3AED", "#2563EB", "#06B6D4"],
    stops: [0, 0.35, 0.7, 1]
  }
];

export function getPalette(index: number): Palette {
  const i = Math.max(0, Math.min(PALETTES.length - 1, index));
  return PALETTES[i];
}

export function getAccentColor(index: number): string {
  return getPalette(index).colors[0];
}
