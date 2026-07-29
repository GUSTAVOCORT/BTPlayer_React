# BtPlayer — Retro Neon & Nixie Clock Bluetooth Car Audio Player

A React + TypeScript rewrite of the **BtPlayer** Bluetooth car audio application. Features full audio visualization, Nixie tube clock display, 5-band equalizer, procedural cover art generation, customizable color palettes, and retro neon aesthetic effects.

## Features

- **3 Screen Modes**:
  - **Player View**: Complete media controls, song metadata marquee, duration seek bar, album cover art, and audio visualizer panel.
  - **Fullscreen Nixie Clock**: High-fidelity glowing Nixie tubes with solid digit cores, amber/orange glow halos, hexagonal mesh grid texture, and glass reflection.
  - **Mixed Mode**: Displays Nixie clock alongside the audio visualizer.
- **16 Audio Visualizer Styles**:
  - Segmented LED, Solid Bars, Mirror Bars, Wave Line, Floating Dots, Filled Wave, Peak Hold Bars, Flat LED, Horizontal Rainbow, Radial Circular, LED Block Matrix, Dot Grid, Mirror Wave, Center Dual Bars, Fire Flames, and Rhythm Concentric Ripples.
- **20 Color Palettes**:
  - Fuego, Neón Cyan, Verde ácido, Magenta, Hielo, Atardecer, Blanco puro, Arcoíris, Lava, Océano, Tropical, Chicle, Cyberpunk, Esmeralda, Oro rosa, Ámbar, Violeta neón, Rojo sangre, Menta, and Galaxia.
- **Interactive Gestures on Visualizer**:
  - Single tap: Cycle visualizer style
  - Double tap: Cycle color palette and accent color
  - Long press: Toggle fullscreen visualizer mode
- **5-Band Equalizer**:
  - Interactive vertical sliders for 60Hz, 230Hz, 910Hz, 3.6kHz, and 14kHz bands with preset support (Flat, Bass Boost, Pop, Rock, Jazz, Techno, Custom).
- **Procedural Cover Art Generator**:
  - Renders 3 artistic cover art styles (Initial + Gradient, Abstract Blobs, Concentric Rings) when album artwork is unavailable.
- **Neon Glow & Jitter Effects**:
  - Outer neon screen frame with realistic old gas-tube flickering effect.
  - Neon glow text shadows for track title, artist, and device status.
- **Web Audio Engine**:
  - Built-in Web Audio API synthesizer engine and audio spectrum analyzer + support for uploading local audio files or custom background wallpaper images.

## Development

```bash
npm install
npm run dev
```

Built with React 19, TypeScript, Vite, and Tailwind CSS.
