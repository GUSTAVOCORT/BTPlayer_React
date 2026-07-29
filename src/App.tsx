import React, { useState, useEffect, useRef } from 'react';
import { AppPrefs, PlaybackState } from './types';
import { getAccentColor } from './utils/palettes';
import { generateCoverArt } from './utils/coverArt';
import { audioEngine } from './components/AudioEngine';
import { NixieClock } from './components/NixieClock';
import { NeonFrame } from './components/NeonFrame';
import { VisualizerView } from './components/VisualizerView';
import { EqualizerPanel } from './components/EqualizerPanel';
import { SettingsModal } from './components/SettingsModal';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Settings as SettingsIcon,
  Bluetooth,
  Clock,
  Music,
  Maximize2,
  Upload,
} from 'lucide-react';

const DEFAULT_PREFS: AppPrefs = {
  vizStyle: 0,
  vizPalette: 0,
  vizBars: 40,
  vizHeight: 92,
  vizGain: 130,
  vizWidth: 72,
  vizFullscreen: false,
  frameNeon: true,
  maskNeon: true,
  vizNeon: true,
  vizRounded: true,
  vizMirror: false,
  maskFlicker: true,
  screenMode: 0, // 0: Player, 1: Nixie Clock, 2: Mixed
  bgUri: null,
  bgDim: 60,
  accentColor: '#FFC400',
  coverStyle: 0,
  nixieGlow: true,
  nixie24h: false,
  showDebug: false,
};

export const App: React.FC = () => {
  const [prefs, setPrefs] = useState<AppPrefs>(() => {
    try {
      const saved = localStorage.getItem('btplayer_prefs');
      if (saved) return { ...DEFAULT_PREFS, ...JSON.parse(saved) };
    } catch (_e) {
      // ignore
    }
    return DEFAULT_PREFS;
  });

  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    title: 'Midnight Synth Drive',
    artist: 'Neon Cyber Driver',
    album: 'Retro Wave 1984',
    durationMs: 215000,
    positionMs: 0,
    isPlaying: false,
    deviceName: 'BT Car Audio (Connected)',
    connected: true,
    progress: -1,
  });

  const [eqVisible, setEqVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [coverArtUrl, setCoverArtUrl] = useState<string>(() =>
    generateCoverArt(300, 'Midnight Synth Drive', DEFAULT_PREFS.coverStyle, DEFAULT_PREFS.accentColor)
  );
  const [textFlickerAlpha, setTextFlickerAlpha] = useState(1);
  const [userSeeking, setUserSeeking] = useState(false);
  const [seekProgress, setSeekProgress] = useState(0);

  const bgInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  // Save preferences
  useEffect(() => {
    try {
      localStorage.setItem('btplayer_prefs', JSON.stringify(prefs));
    } catch (_e) {
      // ignore
    }
  }, [prefs]);

  // Sync audio engine & playback state loop
  useEffect(() => {
    const unsub = audioEngine.subscribe(() => {
      const track = audioEngine.getCurrentTrack();
      const playing = audioEngine.isCurrentlyPlaying();
      setPlaybackState((prev) => ({
        ...prev,
        title: track.title,
        artist: track.artist,
        album: track.album,
        durationMs: track.durationMs,
        isPlaying: playing,
      }));
    });

    const interval = setInterval(() => {
      const pos = audioEngine.getPositionMs();
      setPlaybackState((prev) => ({
        ...prev,
        positionMs: pos,
      }));
    }, 250);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  // Update Cover Art when track or coverStyle or accentColor changes
  useEffect(() => {
    const seed = playbackState.artist || playbackState.title || 'BT';
    const url = generateCoverArt(300, seed, prefs.coverStyle, prefs.accentColor);
    setCoverArtUrl(url);
  }, [playbackState.title, playbackState.artist, prefs.coverStyle, prefs.accentColor]);

  // Neon text flicker effect
  useEffect(() => {
    if (!prefs.maskNeon || !prefs.maskFlicker) {
      setTextFlickerAlpha(1);
      return;
    }

    let timer: ReturnType<typeof setTimeout>;
    const loop = () => {
      const r = Math.random();
      let alpha = 1;
      if (r > 0.93) alpha = 0.35;
      else if (r > 0.86) alpha = 0.65;
      setTextFlickerAlpha(alpha);
      timer = setTimeout(loop, 70 + Math.floor(Math.random() * 150));
    };

    loop();
    return () => clearTimeout(timer);
  }, [prefs.maskNeon, prefs.maskFlicker]);

  const updatePrefs = (updater: (prev: AppPrefs) => AppPrefs) => {
    setPrefs((prev) => updater(prev));
  };

  const handlePlayPause = () => {
    audioEngine.togglePlayPause();
  };

  const handleNext = () => {
    audioEngine.nextTrack();
  };

  const handlePrev = () => {
    audioEngine.prevTrack();
  };

  const formatTime = (ms: number) => {
    if (!ms || ms <= 0) return '0:00';
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleBgFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          updatePrefs((prev) => ({
            ...prev,
            bgUri: evt.target!.result as string,
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const title = file.name.replace(/\.[^/.]+$/, '');
      audioEngine.loadCustomTrack(title, 'Local File', 'My Library', url);
    }
  };

  const currentPos = userSeeking ? seekProgress : playbackState.positionMs;
  const progressPercent = playbackState.durationMs > 0 ? (currentPos / playbackState.durationMs) * 100 : 0;

  return (
    <div className="relative w-screen h-screen bg-black text-white font-sans overflow-hidden flex flex-col select-none">
      {/* Outer Neon Frame */}
      <NeonFrame
        neonColor={prefs.accentColor}
        enabled={prefs.frameNeon}
        flicker={prefs.maskFlicker}
      />

      {/* Background Image Layer */}
      {prefs.bgUri && (
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none transition-opacity duration-300"
          style={{ backgroundImage: `url(${prefs.bgUri})` }}
        >
          <div
            className="absolute inset-0"
            style={{ backgroundColor: `rgba(0, 0, 0, ${prefs.bgDim / 100})` }}
          />
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={bgInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleBgFileSelect}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleAudioFileSelect}
      />

      {/* MAIN CONTENT AREA */}
      {/* SCREEN MODE 1: Fullscreen Nixie Clock */}
      {prefs.screenMode === 1 ? (
        <div
          onClick={() => updatePrefs((prev) => ({ ...prev, screenMode: 0 }))}
          className="relative z-10 w-full h-full flex flex-col items-center justify-center p-8 cursor-pointer group"
          title="Click to return to player view"
        >
          <div className="w-full max-w-4xl h-[65vh]">
            <NixieClock glow={prefs.nixieGlow} use24h={prefs.nixie24h} />
          </div>

          <div
            className="mt-6 font-tech text-sm tracking-widest text-neutral-400 group-hover:text-amber-400 transition-colors"
            style={{
              textShadow: prefs.maskNeon
                ? `0 0 ${12 * textFlickerAlpha}px ${prefs.accentColor}`
                : 'none',
            }}
          >
            ♪ {playbackState.title} — {playbackState.artist}
          </div>
          <span className="text-xs text-neutral-500 mt-2 font-tech">
            (Tap screen to return to player)
          </span>
        </div>
      ) : (
        /* SCREEN MODE 0 (Player) or MODE 2 (Mixed Player + Clock) */
        <div className="relative z-10 flex-1 flex flex-col p-4 md:p-6 overflow-hidden max-w-7xl mx-auto w-full">
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-neutral-800/80">
            <div className="flex items-center gap-2">
              <Bluetooth className="w-5 h-5 text-amber-400 animate-pulse" />
              <span
                className="font-tech text-xs md:text-sm font-semibold text-neutral-300"
                style={{
                  textShadow: prefs.maskNeon
                    ? `0 0 ${8 * textFlickerAlpha}px ${prefs.accentColor}`
                    : 'none',
                }}
              >
                {playbackState.deviceName}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Load Custom Audio Button */}
              <button
                onClick={() => audioInputRef.current?.click()}
                className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors"
                title="Load Audio File"
              >
                <Upload className="w-4 h-4" />
              </button>

              {/* Mode Toggle Button */}
              <button
                onClick={() =>
                  updatePrefs((prev) => ({
                    ...prev,
                    screenMode: (prev.screenMode + 1) % 3,
                  }))
                }
                className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors"
                title="Toggle Screen Mode (Player / Clock / Mixed)"
              >
                <Clock className="w-4 h-4" />
              </button>

              {/* Equalizer Toggle Button */}
              <button
                onClick={() => setEqVisible(!eqVisible)}
                className={`p-2 rounded-lg border transition-colors ${
                  eqVisible
                    ? 'bg-amber-400 text-black border-amber-400 font-bold'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white'
                }`}
                title="Equalizer"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>

              {/* Settings Button */}
              <button
                onClick={() => setSettingsOpen(true)}
                className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors"
                title="Settings"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Player Grid Body */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch overflow-hidden min-h-0 py-2">
            {/* Left Column: Cover Art, Metadata & Controls (5 cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between bg-neutral-950/70 border border-neutral-800/80 rounded-2xl p-5 backdrop-blur-md">
              {/* Cover Art Image */}
              <div className="flex justify-center items-center my-auto py-2">
                <div className="relative group">
                  <img
                    src={coverArtUrl || undefined}
                    alt="Album Cover"
                    className="w-44 h-44 sm:w-56 sm:h-56 md:w-60 md:h-60 rounded-2xl object-cover shadow-2xl border border-white/10"
                    style={{
                      boxShadow: prefs.maskNeon ? `0 0 25px ${prefs.accentColor}40` : undefined,
                    }}
                  />
                  <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                    <Maximize2
                      onClick={() =>
                        updatePrefs((prev) => ({
                          ...prev,
                          coverStyle: (prev.coverStyle + 1) % 3,
                        }))
                      }
                      className="w-8 h-8 text-white"
                      title="Change Cover Style"
                    />
                  </div>
                </div>
              </div>

              {/* Track Info Marquee */}
              <div className="text-center my-3 overflow-hidden">
                <div className="overflow-hidden w-full relative">
                  <h1
                    className="font-orbitron font-extrabold text-lg sm:text-xl md:text-2xl tracking-wide whitespace-nowrap animate-marquee"
                    style={{
                      color: prefs.maskNeon ? prefs.accentColor : '#F2F4F8',
                      textShadow: prefs.maskNeon
                        ? `0 0 ${20 * textFlickerAlpha}px ${prefs.accentColor}`
                        : 'none',
                    }}
                  >
                    {playbackState.title || 'Bluetooth Player'}
                  </h1>
                </div>

                <h2
                  className="font-tech text-sm sm:text-base font-medium mt-1"
                  style={{
                    color: prefs.accentColor,
                    textShadow: prefs.maskNeon
                      ? `0 0 ${14 * textFlickerAlpha}px ${prefs.accentColor}`
                      : 'none',
                  }}
                >
                  {playbackState.artist || 'Waiting for audio...'}
                </h2>

                <p className="font-tech text-xs text-neutral-400 mt-0.5">
                  {playbackState.album}
                </p>
              </div>

              {/* Progress & Duration Slider */}
              <div className="my-2 space-y-1">
                <input
                  type="range"
                  min="0"
                  max={playbackState.durationMs || 100}
                  value={currentPos}
                  onMouseDown={() => setUserSeeking(true)}
                  onMouseUp={() => setUserSeeking(false)}
                  onChange={(e) => setSeekProgress(parseInt(e.target.value))}
                  className="w-full h-2 rounded-lg accent-amber-400 cursor-pointer bg-neutral-800"
                  style={{ accentColor: prefs.accentColor }}
                />
                <div className="flex justify-between font-tech text-xs text-neutral-400">
                  <span
                    style={{
                      textShadow: prefs.maskNeon
                        ? `0 0 ${8 * textFlickerAlpha}px ${prefs.accentColor}`
                        : 'none',
                    }}
                  >
                    {formatTime(currentPos)}
                  </span>
                  <span>{formatTime(playbackState.durationMs)}</span>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-center gap-6 mt-2 pt-2 border-t border-neutral-800/60">
                <button
                  onClick={handlePrev}
                  className="p-3 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-200 hover:text-white hover:border-neutral-700 hover:scale-105 active:scale-95 transition-all"
                >
                  <SkipBack className="w-5 h-5 fill-current" />
                </button>

                <button
                  onClick={handlePlayPause}
                  className="p-4 rounded-full text-black font-bold hover:scale-105 active:scale-95 transition-all shadow-lg"
                  style={{
                    backgroundColor: prefs.accentColor,
                    boxShadow: `0 0 20px ${prefs.accentColor}80`,
                  }}
                >
                  {playbackState.isPlaying ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onClick={handleNext}
                  className="p-3 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-200 hover:text-white hover:border-neutral-700 hover:scale-105 active:scale-95 transition-all"
                >
                  <SkipForward className="w-5 h-5 fill-current" />
                </button>
              </div>
            </div>

            {/* Right Column: Visualizer Canvas / Nixie Clock / EQ Panel (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-4 h-full min-h-[300px]">
              {/* If Equalizer Panel is toggled */}
              {eqVisible ? (
                <div className="flex-1">
                  <EqualizerPanel accentColor={prefs.accentColor} />
                </div>
              ) : (
                /* Screen Mode 2 (Mixed: Nixie Clock + Visualizer side-by-side or stacked) */
                prefs.screenMode === 2 && (
                  <div className="h-44 sm:h-52 bg-neutral-950/80 border border-neutral-800/80 rounded-2xl p-3 flex items-center justify-center">
                    <NixieClock glow={prefs.nixieGlow} use24h={prefs.nixie24h} />
                  </div>
                )
              )}

              {/* Audio Visualizer View */}
              <div className="flex-1 bg-neutral-950/80 border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-between overflow-hidden relative">
                <VisualizerView
                  prefs={prefs}
                  onUpdatePrefs={updatePrefs}
                  className="w-full h-full"
                />

                {/* Gesture info label at bottom right */}
                <div className="absolute bottom-2 right-3 font-tech text-[10px] text-neutral-500 pointer-events-none opacity-60">
                  Tap: style | Dbl-tap: color | Hold: full
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN VISUALIZER OVERLAY */}
      {prefs.vizFullscreen && prefs.screenMode !== 1 && (
        <div className="fixed inset-0 z-40 bg-black flex flex-col p-4">
          <VisualizerView
            prefs={prefs}
            onUpdatePrefs={updatePrefs}
            className="w-full h-full"
            isFullscreen={true}
          />
          <div
            className="absolute bottom-4 left-6 font-tech text-sm font-bold tracking-wider"
            style={{
              color: prefs.accentColor,
              textShadow: prefs.maskNeon
                ? `0 0 ${12 * textFlickerAlpha}px ${prefs.accentColor}`
                : 'none',
            }}
          >
            ♪ {playbackState.title} — {playbackState.artist}
          </div>
        </div>
      )}

      {/* DEBUG PANEL OVERLAY */}
      {prefs.showDebug && (
        <div className="fixed bottom-2 left-2 z-50 bg-black/90 border border-amber-500/50 p-3 rounded-lg max-w-md max-h-40 overflow-y-auto font-tech text-[10px] text-amber-300">
          <div className="font-bold border-b border-amber-500/30 pb-1 mb-1">
            [BT RAW PROTOCOL DUMP LOG]
          </div>
          <div>[ACTION_MEDIA_INFO] EXTRA_MEDIA_NAME={playbackState.title}</div>
          <div>[ACTION_MEDIA_INFO] EXTRA_MEDIA_ARTIST={playbackState.artist}</div>
          <div>[ACTION_MEDIA_TIME] KEY_A2DP_CUR_TIME={playbackState.positionMs} ms</div>
          <div>[ACTION_MEDIA_TIME] KEY_A2DP_TOTAL_TIME={playbackState.durationMs} ms</div>
          <div>[ACTION_BT_MUSIC_PLAY] isPlaying={playbackState.isPlaying ? 'true' : 'false'}</div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        prefs={prefs}
        onUpdatePrefs={updatePrefs}
        onPickBackground={() => bgInputRef.current?.click()}
      />
    </div>
  );
};

export default App;
