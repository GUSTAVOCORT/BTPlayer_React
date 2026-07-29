import { TrackItem } from '../types';

export const SAMPLE_TRACKS: TrackItem[] = [
  {
    id: '1',
    title: 'Midnight Synth Drive',
    artist: 'Neon Cyber Driver',
    album: 'Retro Wave 1984',
    durationMs: 215000,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    isSynth: false,
  },
  {
    id: '2',
    title: 'Nixie Tube Glow',
    artist: 'Analog Resonator',
    album: 'Vacuum Dreams',
    durationMs: 184000,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    isSynth: false,
  },
  {
    id: '3',
    title: 'Cyberpunk Highway',
    artist: 'Synthwave FM',
    album: 'Night Shift',
    durationMs: 198000,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    isSynth: false,
  },
  {
    id: '4',
    title: 'A2DP Bluetooth Stream',
    artist: 'Dashboard Anthems',
    album: 'Car Systems 80s',
    durationMs: 242000,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    isSynth: false,
  },
];

class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private isPlaying = false;
  private currentTrackIndex = 0;
  private trackStartTime = 0;
  private trackElapsedOffset = 0;
  private listeners: Set<() => void> = new Set();
  private synthTimer: ReturnType<typeof setInterval> | null = null;
  private eqBands: BiquadFilterNode[] = [];
  private currentGainNode: GainNode | null = null;

  constructor() {
    // Lazy initialization on user interaction
  }

  public initAudio() {
    if (this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtx();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.8;

      // Master Gain
      this.currentGainNode = this.audioCtx.createGain();
      this.currentGainNode.gain.value = 0.8;

      // 5-Band EQ
      const freqs = [60, 230, 910, 3600, 14000];
      this.eqBands = freqs.map((f, i) => {
        const filter = this.audioCtx!.createBiquadFilter();
        if (i === 0) filter.type = 'lowshelf';
        else if (i === freqs.length - 1) filter.type = 'highshelf';
        else filter.type = 'peaking';
        filter.frequency.value = f;
        filter.gain.value = 0;
        return filter;
      });

      // Chain EQ: eq0 -> eq1 -> eq2 -> eq3 -> eq4 -> analyser -> masterGain -> destination
      for (let i = 0; i < this.eqBands.length - 1; i++) {
        this.eqBands[i].connect(this.eqBands[i + 1]);
      }
      this.eqBands[this.eqBands.length - 1].connect(this.analyser);
      this.analyser.connect(this.currentGainNode);
      this.currentGainNode.connect(this.audioCtx.destination);
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  private getOrCreateAudioElement(): HTMLAudioElement {
    if (!this.audioElement) {
      this.audioElement = new Audio();
      this.audioElement.crossOrigin = 'anonymous';

      this.audioElement.onended = () => {
        this.nextTrack();
      };

      this.audioElement.onloadedmetadata = () => {
        if (this.audioElement && this.audioElement.duration) {
          const cur = this.getCurrentTrack();
          cur.durationMs = Math.round(this.audioElement.duration * 1000);
          this.notify();
        }
      };

      this.audioElement.onerror = (e) => {
        console.warn('Audio element error:', e);
      };
    }
    return this.audioElement;
  }

  private attachMediaElementSource() {
    if (!this.audioCtx || !this.audioElement || this.mediaSource) return;
    try {
      this.mediaSource = this.audioCtx.createMediaElementSource(this.audioElement);
      if (this.eqBands.length > 0) {
        this.mediaSource.connect(this.eqBands[0]);
      } else if (this.analyser) {
        this.mediaSource.connect(this.analyser);
      } else {
        this.mediaSource.connect(this.audioCtx.destination);
      }
    } catch (err) {
      console.warn('Could not attach MediaElementSource:', err);
    }
  }

  public getFFTData(): Uint8Array {
    if (!this.analyser) {
      const arr = new Uint8Array(64);
      if (this.isPlaying) {
        const now = Date.now() / 150;
        for (let i = 0; i < 64; i++) {
          const val = Math.sin(now + i * 0.3) * 60 + Math.cos(now * 0.7 + i * 0.1) * 50 + 80;
          arr[i] = Math.max(10, Math.min(255, Math.floor(val)));
        }
      }
      return arr;
    }
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  private updateMediaSession() {
    if ('mediaSession' in navigator) {
      const track = this.getCurrentTrack();
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album,
        artwork: [
          { src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80', sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      try {
        navigator.mediaSession.setActionHandler('play', () => this.play());
        navigator.mediaSession.setActionHandler('pause', () => this.pause());
        navigator.mediaSession.setActionHandler('previoustrack', () => this.prevTrack());
        navigator.mediaSession.setActionHandler('nexttrack', () => this.nextTrack());
      } catch (e) {
        console.warn('MediaSession handler error:', e);
      }
    }
  }

  public async play() {
    this.initAudio();

    this.isPlaying = true;
    this.trackStartTime = Date.now();

    // Always stop synth engine when attempting to play real audio
    this.stopSynthEngine();

    const track = this.getCurrentTrack();
    if (track.url) {
      const audio = this.getOrCreateAudioElement();
      if (audio.src !== track.url) {
        audio.src = track.url;
        audio.currentTime = this.trackElapsedOffset / 1000;
      }

      this.attachMediaElementSource();

      try {
        await audio.play();
      } catch (err) {
        console.warn('Audio play error, falling back to synth engine:', err);
        this.startSynthEngine();
      }
    } else {
      this.startSynthEngine();
    }

    this.updateMediaSession();
    this.notify();
  }

  public pause() {
    this.isPlaying = false;
    if (this.audioElement && !this.audioElement.paused) {
      this.audioElement.pause();
      this.trackElapsedOffset = Math.round(this.audioElement.currentTime * 1000);
    } else {
      this.trackElapsedOffset += Date.now() - this.trackStartTime;
    }
    this.stopSynthEngine();
    this.notify();
  }

  public togglePlayPause() {
    if (this.isPlaying) this.pause();
    else this.play();
  }

  public nextTrack() {
    this.stopAudioAndSynth();
    this.currentTrackIndex = (this.currentTrackIndex + 1) % SAMPLE_TRACKS.length;
    this.resetTimer();
    if (this.isPlaying) {
      this.play();
    } else {
      this.notify();
    }
  }

  public prevTrack() {
    this.stopAudioAndSynth();
    this.currentTrackIndex = (this.currentTrackIndex - 1 + SAMPLE_TRACKS.length) % SAMPLE_TRACKS.length;
    this.resetTimer();
    if (this.isPlaying) {
      this.play();
    } else {
      this.notify();
    }
  }

  public resetTimer() {
    this.trackElapsedOffset = 0;
    this.trackStartTime = Date.now();
    if (this.audioElement) {
      this.audioElement.currentTime = 0;
    }
  }

  public seekToMs(ms: number) {
    this.trackElapsedOffset = ms;
    this.trackStartTime = Date.now();
    if (this.audioElement) {
      this.audioElement.currentTime = ms / 1000;
    }
    this.notify();
  }

  private stopAudioAndSynth() {
    this.stopSynthEngine();
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }
  }

  public getCurrentTrack(): TrackItem {
    return SAMPLE_TRACKS[this.currentTrackIndex];
  }

  public getPositionMs(): number {
    if (this.audioElement && this.audioElement.src && !this.audioElement.paused) {
      return Math.round(this.audioElement.currentTime * 1000);
    }
    if (!this.isPlaying) return this.trackElapsedOffset;
    const elapsed = this.trackElapsedOffset + (Date.now() - this.trackStartTime);
    const dur = this.getCurrentTrack().durationMs;
    return elapsed % (dur || 180000);
  }

  public setEQBandLevel(bandIndex: number, levelMillibels: number) {
    if (bandIndex >= 0 && bandIndex < this.eqBands.length) {
      const db = levelMillibels / 100;
      this.eqBands[bandIndex].gain.value = db;
    }
  }

  private startSynthEngine() {
    this.stopSynthEngine();
    if (!this.audioCtx) return;

    let step = 0;
    const targetNode = this.eqBands[0] || this.analyser || this.audioCtx.destination;

    // 80s Synthwave scale frequencies (A minor / C major synth wave)
    const bassNotes = [110, 110, 130.81, 146.83, 110, 98, 130.81, 164.81]; // A2, C3, D3...
    const leadNotes = [440, 523.25, 659.25, 587.33, 523.25, 440, 392, 440]; // A4, C5, E5...

    this.synthTimer = setInterval(() => {
      if (!this.isPlaying || !this.audioCtx) return;

      try {
        const now = this.audioCtx.currentTime;

        // 1. Bassline synth
        const bassOsc = this.audioCtx.createOscillator();
        const bassGain = this.audioCtx.createGain();
        bassOsc.type = 'sawtooth';
        const bFreq = bassNotes[(step + this.currentTrackIndex * 2) % bassNotes.length];
        bassOsc.frequency.setValueAtTime(bFreq, now);

        bassGain.gain.setValueAtTime(0.2, now);
        bassGain.gain.exponentialRampToValueAtTime(0.005, now + 0.18);

        bassOsc.connect(bassGain);
        bassGain.connect(targetNode);
        bassOsc.start(now);
        bassOsc.stop(now + 0.19);

        // 2. Lead melody synth (every 2 steps)
        if (step % 2 === 0) {
          const leadOsc = this.audioCtx.createOscillator();
          const leadGain = this.audioCtx.createGain();
          leadOsc.type = 'square';
          const lFreq = leadNotes[(Math.floor(step / 2) + this.currentTrackIndex) % leadNotes.length];
          leadOsc.frequency.setValueAtTime(lFreq, now);

          leadGain.gain.setValueAtTime(0.12, now);
          leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

          leadOsc.connect(leadGain);
          leadGain.connect(targetNode);
          leadOsc.start(now);
          leadOsc.stop(now + 0.36);
        }

        // 3. Neon Kick drum (every 4 steps)
        if (step % 4 === 0) {
          const kickOsc = this.audioCtx.createOscillator();
          const kickGain = this.audioCtx.createGain();
          kickOsc.frequency.setValueAtTime(150, now);
          kickOsc.frequency.exponentialRampToValueAtTime(30, now + 0.1);

          kickGain.gain.setValueAtTime(0.35, now);
          kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

          kickOsc.connect(kickGain);
          kickGain.connect(targetNode);
          kickOsc.start(now);
          kickOsc.stop(now + 0.13);
        }

        step++;
      } catch (_e) {
        // ignore timing glitches
      }
    }, 180);
  }

  private stopSynthEngine() {
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
    this.stopAudioAndSynth();
    const customTrack: TrackItem = {
      id: 'custom_' + Date.now(),
      title,
      artist,
      album,
      durationMs: 180000,
      url,
      isSynth: false,
    };
    SAMPLE_TRACKS.unshift(customTrack);
    this.currentTrackIndex = 0;
    this.resetTimer();
    this.play();
  }
}

export const audioEngine = new AudioEngine();


