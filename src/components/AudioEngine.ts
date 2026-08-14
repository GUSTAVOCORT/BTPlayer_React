import { TrackItem } from '../types';
import {
  saveTracksToStorage,
  loadTracksFromStorage,
  deleteTrackFromStorage,
  clearAllTracksFromStorage,
  savePlaybackSession,
  loadPlaybackSession,
} from '../utils/trackStorage';

export const SAMPLE_TRACKS: TrackItem[] = [
  {
    id: 'sample_1',
    title: 'Midnight Synth Drive',
    artist: 'Neon Cyber Driver',
    album: 'Retro Wave 1984',
    durationMs: 215000,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    isSynth: false,
  },
  {
    id: 'sample_2',
    title: 'Nixie Tube Glow',
    artist: 'Analog Resonator',
    album: 'Vacuum Dreams',
    durationMs: 184000,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    isSynth: false,
  },
  {
    id: 'sample_3',
    title: 'Cyberpunk Highway',
    artist: 'Synthwave FM',
    album: 'Night Shift',
    durationMs: 198000,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    isSynth: false,
  },
  {
    id: 'sample_4',
    title: 'A2DP Bluetooth Stream',
    artist: 'Dashboard Anthems',
    album: 'Car Systems 80s',
    durationMs: 242000,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    isSynth: false,
  },
];

export type RepeatMode = 'off' | 'all' | 'one';

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
  private micStream: MediaStream | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private isMicActive = false;
  private micAnalyser: AnalyserNode | null = null;

  // Repeat & Shuffle Modes
  private repeatMode: RepeatMode = 'all';
  private isShuffle = false;
  private playlist: TrackItem[] = [...SAMPLE_TRACKS];
  private isRestored = false;

  constructor() {
    // Restore session settings
    const session = loadPlaybackSession();
    if (session) {
      if (session.repeatMode) this.repeatMode = session.repeatMode;
      if (session.shuffle !== undefined) this.isShuffle = session.shuffle;
      if (session.positionMs) this.trackElapsedOffset = session.positionMs;
    }
  }

  public async restorePersistedTracks(): Promise<void> {
    if (this.isRestored) return;
    try {
      const storedTracks = await loadTracksFromStorage();
      if (storedTracks && storedTracks.length > 0) {
        // Prepend custom tracks before sample tracks
        this.playlist = [...storedTracks, ...SAMPLE_TRACKS];
      } else {
        this.playlist = [...SAMPLE_TRACKS];
      }

      // Check if we had a saved track index or track ID
      const session = loadPlaybackSession();
      if (session) {
        if (session.currentTrackId) {
          const idx = this.playlist.findIndex((t) => t.id === session.currentTrackId);
          if (idx !== -1) {
            this.currentTrackIndex = idx;
          } else if (session.currentTrackIndex !== undefined && session.currentTrackIndex < this.playlist.length) {
            this.currentTrackIndex = session.currentTrackIndex;
          }
        } else if (session.currentTrackIndex !== undefined && session.currentTrackIndex < this.playlist.length) {
          this.currentTrackIndex = session.currentTrackIndex;
        }

        if (session.positionMs && session.positionMs > 0) {
          this.trackElapsedOffset = session.positionMs;
        }
      }

      this.isRestored = true;
      this.notify();
    } catch (e) {
      console.warn('Error restoring persisted tracks:', e);
      this.playlist = [...SAMPLE_TRACKS];
      this.isRestored = true;
    }
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
      this.currentGainNode.gain.value = 0.9;

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
        this.handleTrackEnded();
      };

      this.audioElement.onloadedmetadata = () => {
        if (this.audioElement && this.audioElement.duration && !isNaN(this.audioElement.duration)) {
          const cur = this.getCurrentTrack();
          if (cur) {
            cur.durationMs = Math.round(this.audioElement.duration * 1000);
            this.notify();
          }
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

  private handleTrackEnded() {
    if (this.repeatMode === 'one') {
      // Loop same track from 0
      this.resetTimer();
      this.play();
      return;
    }

    if (this.isShuffle) {
      this.playRandomTrack();
      return;
    }

    // Normal forward progression
    if (this.currentTrackIndex < this.playlist.length - 1) {
      this.nextTrack();
    } else {
      // At end of playlist
      if (this.repeatMode === 'all') {
        this.currentTrackIndex = 0;
        this.resetTimer();
        this.play();
      } else {
        // Repeat OFF -> stop playback
        this.pause();
        this.resetTimer();
      }
    }
  }

  private playRandomTrack() {
    if (this.playlist.length <= 1) {
      this.resetTimer();
      this.play();
      return;
    }
    let nextIdx = this.currentTrackIndex;
    while (nextIdx === this.currentTrackIndex) {
      nextIdx = Math.floor(Math.random() * this.playlist.length);
    }
    this.stopAudioAndSynth();
    this.currentTrackIndex = nextIdx;
    this.resetTimer();
    this.play();
  }

  public getFFTData(): Uint8Array {
    if (this.isMicActive && this.micAnalyser) {
      const data = new Uint8Array(this.micAnalyser.frequencyBinCount);
      this.micAnalyser.getByteFrequencyData(data);
      return data;
    }
    if (this.analyser) {
      const data = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(data);
      return data;
    }
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

  /**
   * Returns normalized bass energy (0..1) for pulsing beats & neon glow
   */
  public getBassEnergy(): number {
    const data = this.getFFTData();
    if (!data || data.length === 0) return 0;
    const bins = Math.min(8, data.length);
    let sum = 0;
    for (let i = 0; i < bins; i++) {
      sum += data[i];
    }
    return Math.min(1, Math.max(0, (sum / (bins * 255)) * 1.3));
  }

  /**
   * Returns normalized overall audio energy (0..1)
   */
  public getOverallEnergy(): number {
    const data = this.getFFTData();
    if (!data || data.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    return Math.min(1, Math.max(0, sum / (data.length * 255)));
  }

  private updateMediaSession() {
    if ('mediaSession' in navigator) {
      const track = this.getCurrentTrack();
      if (!track) return;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album,
        artwork: [
          {
            src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80',
            sizes: '512x512',
            type: 'image/jpeg',
          },
        ],
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
    this.stopSynthEngine();

    const track = this.getCurrentTrack();
    if (track && track.url) {
      const audio = this.getOrCreateAudioElement();
      if (audio.src !== track.url) {
        audio.src = track.url;
        audio.currentTime = this.trackElapsedOffset / 1000;
      }

      this.attachMediaElementSource();

      try {
        await audio.play();
      } catch (err) {
        console.warn('Audio play error:', err);
      }
    }

    this.persistCurrentSession();
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
    this.persistCurrentSession();
    this.notify();
  }

  public togglePlayPause() {
    if (this.isPlaying) this.pause();
    else this.play();
  }

  public nextTrack() {
    this.stopAudioAndSynth();
    if (this.isShuffle) {
      this.playRandomTrack();
      return;
    }
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;
    this.resetTimer();
    this.persistCurrentSession();
    if (this.isPlaying) {
      this.play();
    } else {
      this.notify();
    }
  }

  public prevTrack() {
    // If playback is more than 3 seconds in, restart the song from beginning
    if (this.getPositionMs() > 3000) {
      this.seekToMs(0);
      return;
    }

    this.stopAudioAndSynth();
    this.currentTrackIndex =
      (this.currentTrackIndex - 1 + this.playlist.length) % this.playlist.length;
    this.resetTimer();
    this.persistCurrentSession();
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
    this.persistCurrentSession();
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
    if (this.playlist.length === 0) {
      return SAMPLE_TRACKS[0];
    }
    if (this.currentTrackIndex >= this.playlist.length) {
      this.currentTrackIndex = 0;
    }
    return this.playlist[this.currentTrackIndex];
  }

  public getPositionMs(): number {
    if (this.audioElement && this.audioElement.src && !this.audioElement.paused) {
      return Math.round(this.audioElement.currentTime * 1000);
    }
    if (!this.isPlaying) return this.trackElapsedOffset;
    const elapsed = this.trackElapsedOffset + (Date.now() - this.trackStartTime);
    const dur = this.getCurrentTrack()?.durationMs || 180000;
    return Math.min(dur, elapsed);
  }

  public setEQBandLevel(bandIndex: number, levelMillibels: number) {
    if (bandIndex >= 0 && bandIndex < this.eqBands.length) {
      const db = levelMillibels / 100;
      this.eqBands[bandIndex].gain.value = db;
    }
  }

  private startSynthEngine() {
    this.stopSynthEngine();
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
    return this.isPlaying || this.isMicActive;
  }

  public isMicrophoneActive(): boolean {
    return this.isMicActive;
  }

  public async startMicCapture(): Promise<boolean> {
    this.initAudio();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch (_e) {}
    }

    const nav = navigator as any;
    const getUserMedia =
      nav.mediaDevices?.getUserMedia?.bind(nav.mediaDevices) ||
      nav.getUserMedia?.bind(nav) ||
      nav.webkitGetUserMedia?.bind(nav) ||
      nav.mozGetUserMedia?.bind(nav);

    if (!getUserMedia) {
      alert(
        '📱 Tu navegador no admite acceso directo al micrófono en esta ventana. Por favor abre la aplicación en una pestaña independiente (HTTPS).'
      );
      return false;
    }

    try {
      if (this.isMicActive) return true;

      let stream: MediaStream;
      if (nav.mediaDevices?.getUserMedia) {
        stream = await nav.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: true,
          },
        });
      } else {
        stream = await new Promise((resolve, reject) => {
          getUserMedia({ audio: true }, resolve, reject);
        });
      }

      this.micStream = stream;
      if (!this.audioCtx) this.initAudio();

      this.micSourceNode = this.audioCtx!.createMediaStreamSource(stream);

      const highPassFilter = this.audioCtx!.createBiquadFilter();
      highPassFilter.type = 'highpass';
      highPassFilter.frequency.value = 50;

      const lowPassFilter = this.audioCtx!.createBiquadFilter();
      lowPassFilter.type = 'lowpass';
      lowPassFilter.frequency.value = 14000;

      this.micAnalyser = this.audioCtx!.createAnalyser();
      this.micAnalyser.fftSize = 128;
      this.micAnalyser.smoothingTimeConstant = 0.8;

      this.micSourceNode.connect(highPassFilter);
      highPassFilter.connect(lowPassFilter);
      lowPassFilter.connect(this.micAnalyser);

      this.isMicActive = true;
      this.isPlaying = true;
      this.notify();
      return true;
    } catch (e: any) {
      console.warn('Microphone permission denied or error:', e);
      this.isMicActive = false;
      this.notify();

      let errorMessage = 'No se pudo activar el micrófono.';
      if (e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError') {
        errorMessage =
          '🎤 Permiso de micrófono denegado.\n\nPara reaccionar a Spotify, Deezer o música ambiental:\n1. Toca el ícono del candado o configuración en tu navegador.\n2. Permite el acceso al micrófono.';
      } else if (e?.name === 'NotFoundError') {
        errorMessage = '🎤 No se detectó ningún micrófono en tu dispositivo.';
      } else {
        errorMessage = `🎤 Error al conectar micrófono: ${e?.message || 'Permiso restringido'}.`;
      }

      alert(errorMessage);
      return false;
    }
  }

  public stopMicCapture() {
    if (this.micSourceNode) {
      try {
        this.micSourceNode.disconnect();
      } catch (_e) {}
      this.micSourceNode = null;
    }
    if (this.micAnalyser) {
      try {
        this.micAnalyser.disconnect();
      } catch (_e) {}
      this.micAnalyser = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
    this.isMicActive = false;
    this.notify();
  }

  public async toggleMicCapture(): Promise<boolean> {
    if (this.isMicActive) {
      this.stopMicCapture();
      return false;
    } else {
      return await this.startMicCapture();
    }
  }

  /**
   * Save loaded audio files persistently into IndexedDB
   */
  public async loadCustomTracks(
    tracks: Array<{ title: string; artist: string; album: string; url: string; file?: File; blob?: Blob }>
  ) {
    if (!tracks || tracks.length === 0) return;
    this.stopAudioAndSynth();

    const timestamp = Date.now();
    const newTrackItems: TrackItem[] = tracks.map((t, idx) => ({
      id: 'custom_' + timestamp + '_' + idx,
      title: t.title,
      artist: t.artist || 'Archivo Local',
      album: t.album || 'Mi Música',
      durationMs: 180000,
      url: t.url,
      isSynth: false,
    }));

    // Save to IndexedDB if Blob/File is available
    const tracksToPersist = tracks
      .map((t, idx) => {
        const blob = t.file || t.blob;
        if (!blob) return null;
        return {
          id: newTrackItems[idx].id,
          title: newTrackItems[idx].title,
          artist: newTrackItems[idx].artist,
          album: newTrackItems[idx].album,
          durationMs: newTrackItems[idx].durationMs,
          blob,
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      title: string;
      artist: string;
      album: string;
      durationMs: number;
      blob: Blob;
    }>;

    if (tracksToPersist.length > 0) {
      saveTracksToStorage(tracksToPersist).catch((err) =>
        console.warn('Could not persist tracks to DB:', err)
      );
    }

    this.playlist = [...newTrackItems, ...this.playlist];
    this.currentTrackIndex = 0;
    this.resetTimer();
    this.persistCurrentSession();
    this.play();
  }

  public loadCustomTrack(title: string, artist: string, album: string, url: string, file?: File) {
    this.loadCustomTracks([{ title, artist, album, url, file }]);
  }

  public getPlaylist(): TrackItem[] {
    return this.playlist;
  }

  public getCurrentTrackIndex(): number {
    return this.currentTrackIndex;
  }

  public playTrackIndex(index: number) {
    if (index < 0 || index >= this.playlist.length) return;
    this.stopAudioAndSynth();
    this.currentTrackIndex = index;
    this.resetTimer();
    this.persistCurrentSession();
    this.play();
  }

  public async removeTrack(index: number) {
    if (index < 0 || index >= this.playlist.length) return;
    if (this.playlist.length <= 1) return;

    const removed = this.playlist[index];
    if (removed.id.startsWith('custom_')) {
      deleteTrackFromStorage(removed.id).catch(() => {});
    }

    this.playlist.splice(index, 1);
    if (this.currentTrackIndex >= this.playlist.length) {
      this.currentTrackIndex = 0;
    }
    this.persistCurrentSession();
    this.notify();
  }

  public async clearCustomLibrary() {
    await clearAllTracksFromStorage();
    this.playlist = [...SAMPLE_TRACKS];
    this.currentTrackIndex = 0;
    this.resetTimer();
    this.persistCurrentSession();
    this.notify();
  }

  // Repeat & Shuffle API
  public getRepeatMode(): RepeatMode {
    return this.repeatMode;
  }

  public toggleRepeatMode(): RepeatMode {
    if (this.repeatMode === 'all') this.repeatMode = 'one';
    else if (this.repeatMode === 'one') this.repeatMode = 'off';
    else this.repeatMode = 'all';

    this.persistCurrentSession();
    this.notify();
    return this.repeatMode;
  }

  public setRepeatMode(mode: RepeatMode) {
    this.repeatMode = mode;
    this.persistCurrentSession();
    this.notify();
  }

  public isShuffleActive(): boolean {
    return this.isShuffle;
  }

  public toggleShuffle(): boolean {
    this.isShuffle = !this.isShuffle;
    this.persistCurrentSession();
    this.notify();
    return this.isShuffle;
  }

  public setShuffle(active: boolean) {
    this.isShuffle = active;
    this.persistCurrentSession();
    this.notify();
  }

  private persistCurrentSession() {
    const cur = this.getCurrentTrack();
    savePlaybackSession({
      currentTrackId: cur?.id,
      currentTrackIndex: this.currentTrackIndex,
      positionMs: this.getPositionMs(),
      repeatMode: this.repeatMode,
      shuffle: this.isShuffle,
    });
  }
}

export const audioEngine = new AudioEngine();
