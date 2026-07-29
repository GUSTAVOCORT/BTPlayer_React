import { TrackItem } from '../types';

export const SAMPLE_TRACKS: TrackItem[] = [
  {
    id: '1',
    title: 'Midnight Synth Drive',
    artist: 'Neon Cyber Driver',
    album: 'Retro Wave 1984',
    durationMs: 215000,
    isSynth: true,
  },
  {
    id: '2',
    title: 'Nixie Tube Glow',
    artist: 'Analog Resonator',
    album: 'Vacuum Dreams',
    durationMs: 184000,
    isSynth: true,
  },
  {
    id: '3',
    title: 'CarPlay Cruiser',
    artist: 'A2DP Audio Stream',
    album: 'Dashboard Anthems',
    durationMs: 242000,
    isSynth: true,
  },
  {
    id: '4',
    title: 'Cyberpunk Highway',
    artist: 'Synthwave FM',
    album: 'Night Shift',
    durationMs: 198000,
    isSynth: true,
  },
];

class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private synthOscs: OscillatorNode[] = [];
  private synthGain: GainNode | null = null;
  private isPlaying = false;
  private currentTrackIndex = 0;
  private trackStartTime = 0;
  private trackElapsedOffset = 0;
  private listeners: Set<() => void> = new Set();
  private synthTimer: ReturnType<typeof setInterval> | null = null;
  private eqBands: BiquadFilterNode[] = [];

  constructor() {
    // Lazy AudioContext initialization on first user interaction
  }

  private initAudio() {
    if (this.audioCtx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtx();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.8;

      // Create 5-band EQ filters
      const freqs = [60, 230, 910, 3600, 14000];
      this.eqBands = freqs.map((f, i) => {
        const filter = this.audioCtx!.createBiquadFilter();
        if (i === 0) filter.type = 'lowshelf';
        else if (i === freqs.length - 1) filter.type = 'highshelf';
        else filter.type = 'peaking';
        filter.frequency.value = f;
        filter.gain.value = 0; // dB
        return filter;
      });

      // Chain EQ filters
      for (let i = 0; i < this.eqBands.length - 1; i++) {
        this.eqBands[i].connect(this.eqBands[i + 1]);
      }

      this.eqBands[this.eqBands.length - 1].connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  public getFFTData(): Uint8Array {
    if (!this.analyser) {
      const arr = new Uint8Array(64);
      if (this.isPlaying) {
        // Generate pseudo-FFT if AudioContext is blocked
        const now = Date.now() / 150;
        for (let i = 0; i < 64; i++) {
          const val = Math.sin(now + i * 0.3) * 60 + Math.cos(now * 0.7 + i * 0.1) * 50 + 70;
          arr[i] = Math.max(10, Math.min(255, Math.floor(val)));
        }
      }
      return arr;
    }
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  public play() {
    this.initAudio();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    this.isPlaying = true;
    this.trackStartTime = Date.now();
    this.startSynthRhythm();
    this.notify();
  }

  public pause() {
    this.isPlaying = false;
    this.trackElapsedOffset += Date.now() - this.trackStartTime;
    this.stopSynthRhythm();
    this.notify();
  }

  public togglePlayPause() {
    if (this.isPlaying) this.pause();
    else this.play();
  }

  public nextTrack() {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % SAMPLE_TRACKS.length;
    this.resetTimer();
    this.notify();
  }

  public prevTrack() {
    this.currentTrackIndex = (this.currentTrackIndex - 1 + SAMPLE_TRACKS.length) % SAMPLE_TRACKS.length;
    this.resetTimer();
    this.notify();
  }

  public resetTimer() {
    this.trackElapsedOffset = 0;
    this.trackStartTime = Date.now();
  }

  public getCurrentTrack(): TrackItem {
    return SAMPLE_TRACKS[this.currentTrackIndex];
  }

  public getPositionMs(): number {
    if (!this.isPlaying) return this.trackElapsedOffset;
    const elapsed = this.trackElapsedOffset + (Date.now() - this.trackStartTime);
    const dur = this.getCurrentTrack().durationMs;
    return elapsed % dur;
  }

  public setEQBandLevel(bandIndex: number, levelMillibels: number) {
    // levelMillibels is -1500 to +1500 (mB), convert to dB (-15 to +15)
    if (bandIndex >= 0 && bandIndex < this.eqBands.length) {
      const db = levelMillibels / 100;
      this.eqBands[bandIndex].gain.value = db;
    }
  }

  private startSynthRhythm() {
    this.stopSynthRhythm();
    if (!this.audioCtx) return;

    let beat = 0;
    const inputNode = this.eqBands[0];

    this.synthTimer = setInterval(() => {
      if (!this.isPlaying || !this.audioCtx) return;
      try {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        // Synth synthwave synth rhythm
        const freqs = [130.81, 164.81, 196.0, 261.63, 329.63, 392.0];
        const freq = freqs[(beat + this.currentTrackIndex) % freqs.length];

        osc.type = beat % 4 === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

        gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.25);

        osc.connect(gain);
        gain.connect(inputNode);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.26);

        beat++;
      } catch (_e) {
        // ignore audio context glitches
      }
    }, 200);
  }

  private stopSynthRhythm() {
    if (this.synthTimer) {
      clearInterval(this.synthTimer);
      this.synthTimer = null;
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  public loadCustomTrack(title: string, artist: string, album: string, url: string) {
    const customTrack: TrackItem = {
      id: 'custom_' + Date.now(),
      title,
      artist,
      album,
      durationMs: 180000,
      url,
    };
    SAMPLE_TRACKS.unshift(customTrack);
    this.currentTrackIndex = 0;
    this.resetTimer();
    this.play();
  }
}

export const audioEngine = new AudioEngine();
