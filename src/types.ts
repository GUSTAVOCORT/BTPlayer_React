export interface AppPrefs {
  vizStyle: number;       // 0..15 styles
  vizPalette: number;     // 0..19 palettes
  vizBars: number;        // 20, 28, 40, 56, 72
  vizHeight: number;      // 60..100
  vizGain: number;        // 80..250
  vizWidth: number;       // 20..100
  vizFullscreen: boolean;
  frameNeon: boolean;
  maskNeon: boolean;
  vizNeon: boolean;
  vizRounded: boolean;
  vizMirror: boolean;
  maskFlicker: boolean;
  screenMode: number;     // 0 player, 1 nixie clock, 2 mixed player + clock
  bgUri: string | null;
  bgDim: number;          // 0..100
  accentColor: string;    // Hex color string
  coverStyle: number;     // 0 initial, 1 abstract, 2 rings
  nixieGlow: boolean;
  nixie24h: boolean;
  showDebug: boolean;
  autoThemeOnChange?: boolean;
}

export interface PlaybackState {
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  positionMs: number;
  isPlaying: boolean;
  deviceName: string;
  connected: boolean;
  progress: number;
}

export interface Palette {
  name: string;
  colors: string[];
  stops: number[];
}

export interface TrackItem {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  url?: string;
  isSynth?: boolean;
}
