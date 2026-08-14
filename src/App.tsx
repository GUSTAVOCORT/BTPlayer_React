import React, { useState, useEffect, useRef } from 'react';
import { AppPrefs, PlaybackState } from './types';
import { getAccentColor, getPalette, PALETTES } from './utils/palettes';
import { generateCoverArt } from './utils/coverArt';
import altRockIcon from './assets/images/alt_rock_icon_1785373882131.jpg';
import { audioEngine, RepeatMode } from './components/AudioEngine';
import { NixieClock } from './components/NixieClock';
import { NeonFrame } from './components/NeonFrame';
import { VisualizerView } from './components/VisualizerView';
import { EqualizerPanel } from './components/EqualizerPanel';
import { SettingsModal } from './components/SettingsModal';
import { PlaylistModal } from './components/PlaylistModal';
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
  ListMusic,
  Maximize2,
  Minimize2,
  Upload,
  Mic,
  MicOff,
  Shuffle,
  Repeat,
  Repeat1,
  Activity,
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
  autoThemeOnChange: true,
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

  const [repeatMode, setRepeatMode] = useState<RepeatMode>(() => audioEngine.getRepeatMode());
  const [isShuffle, setIsShuffle] = useState<boolean>(() => audioEngine.isShuffleActive());
  const [eqVisible, setEqVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [coverArtUrl, setCoverArtUrl] = useState<string>(() =>
    generateCoverArt(300, 'Midnight Synth Drive', DEFAULT_PREFS.coverStyle, DEFAULT_PREFS.accentColor)
  );
  const [textFlickerAlpha, setTextFlickerAlpha] = useState(1);
  const [userSeeking, setUserSeeking] = useState(false);
  const [seekProgress, setSeekProgress] = useState(0);
  const [bassBeatEnergy, setBassBeatEnergy] = useState(0);

  const bgInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  // Restore persistent audio tracks & history on mount
  useEffect(() => {
    audioEngine.restorePersistedTracks().then(() => {
      const cur = audioEngine.getCurrentTrack();
      if (cur) {
        setPlaybackState((prev) => ({
          ...prev,
          title: cur.title,
          artist: cur.artist,
          album: cur.album,
          durationMs: cur.durationMs,
          positionMs: audioEngine.getPositionMs(),
        }));
      }
      setRepeatMode(audioEngine.getRepeatMode());
      setIsShuffle(audioEngine.isShuffleActive());
    });
  }, []);

  // Live beat rhythm energy loop
  useEffect(() => {
    let animId: number;
    const loop = () => {
      if (audioEngine.isCurrentlyPlaying()) {
        setBassBeatEnergy(audioEngine.getBassEnergy());
      } else {
        setBassBeatEnergy(0);
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Toggle browser native full screen mode for phone car mount
  const toggleNativeFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsNativeFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsNativeFullscreen(false)).catch(() => {});
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsNativeFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

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
      setIsMicActive(audioEngine.isMicrophoneActive());
      setRepeatMode(audioEngine.getRepeatMode());
      setIsShuffle(audioEngine.isShuffleActive());
      if (track) {
        setPlaybackState((prev) => ({
          ...prev,
          title: track.title,
          artist: track.artist,
          album: track.album,
          durationMs: track.durationMs,
          isPlaying: playing,
        }));
      }
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

  // Auto change visual style and color palette on song change
  const prevTitleRef = useRef(playbackState.title);
  useEffect(() => {
    if (prevTitleRef.current !== playbackState.title) {
      prevTitleRef.current = playbackState.title;

      if (prefs.autoThemeOnChange !== false) {
        setPrefs((prev) => {
          const nextStyle = (prev.vizStyle + 1) % 29;
          const nextPalIndex = (prev.vizPalette + 1) % PALETTES.length;
          const pal = getPalette(nextPalIndex);
          return {
            ...prev,
            vizStyle: nextStyle,
            vizPalette: nextPalIndex,
            accentColor: pal.colors[0],
          };
        });
      }
    }
  }, [playbackState.title, prefs.autoThemeOnChange]);

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
    const files = e.target.files;
    if (files && files.length > 0) {
      const tracksToLoad = Array.from(files).map((file) => {
        const url = URL.createObjectURL(file);
        const title = file.name.replace(/\.[^/.]+$/, '');
        return {
          title,
          artist: 'Archivo Local',
          album: 'Mi Música',
          url,
          file,
        };
      });

      audioEngine.loadCustomTracks(tracksToLoad);
      if (audioInputRef.current) audioInputRef.current.value = '';
    }
  };

  const currentPos = userSeeking ? seekProgress : playbackState.positionMs;
  const progressPercent =
    playbackState.durationMs > 0 ? (currentPos / playbackState.durationMs) * 100 : 0;

  return (
    <div className="relative w-full h-[100dvh] min-h-[100dvh] max-h-[100dvh] bg-black text-white font-sans overflow-hidden flex flex-col select-none">
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
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac"
        multiple
        className="hidden"
        onChange={handleAudioFileSelect}
      />

      {/* MAIN CONTENT AREA */}
      {/* SCREEN MODE 1: Fullscreen Nixie Clock */}
      {prefs.screenMode === 1 ? (
        <div
          onClick={() => updatePrefs((prev) => ({ ...prev, screenMode: 0 }))}
          className="relative z-10 w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 cursor-pointer group"
          title="Click to return to player view"
        >
          <div className="w-full max-w-4xl h-[65vh]">
            <NixieClock glow={prefs.nixieGlow} use24h={prefs.nixie24h} />
          </div>

          <div
            className="mt-4 sm:mt-6 font-tech text-xs sm:text-sm tracking-widest text-neutral-400 group-hover:text-amber-400 transition-colors"
            style={{
              textShadow: prefs.maskNeon
                ? `0 0 ${12 * textFlickerAlpha}px ${prefs.accentColor}`
                : 'none',
            }}
          >
            ♪ {playbackState.title} — {playbackState.artist}
          </div>
          <span className="text-[10px] sm:text-xs text-neutral-500 mt-2 font-tech">
            (Tap screen to return to player)
          </span>
        </div>
      ) : (
        /* SCREEN MODE 0 (Player) or MODE 2 (Mixed Player + Clock) */
        <div className="relative z-10 flex-1 flex flex-col pt-3 pb-2 px-3 sm:pt-5 sm:pb-3 sm:px-6 md:px-8 landscape:p-2 landscape:px-3 overflow-hidden max-w-7xl mx-auto w-full min-h-0">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 mb-2 sm:mb-3 border-b border-neutral-800/80 gap-2 shrink-0">
            {/* Left: App Title, Bluetooth Status & Live Beat Rhythm Indicator */}
            <div className="flex items-center gap-2.5 truncate">
              <img
                src={altRockIcon}
                alt="Rock Icon"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover border border-amber-400/60 shadow-[0_0_12px_rgba(251,191,36,0.35)] shrink-0 transition-transform hover:scale-105"
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 truncate">
                  <Bluetooth className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
                  <span
                    className="font-tech text-xs sm:text-sm font-semibold text-neutral-200 truncate"
                    style={{
                      textShadow: prefs.maskNeon
                        ? `0 0 ${8 * textFlickerAlpha}px ${prefs.accentColor}`
                        : 'none',
                    }}
                  >
                    {isMicActive ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        🎤 Reaccionando a Audio Externo
                      </span>
                    ) : (
                      playbackState.deviceName
                    )}
                  </span>

                  {/* Live Beat Rhythm Indicator */}
                  {playbackState.isPlaying && (
                    <span
                      className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-tech font-bold uppercase transition-all duration-75"
                      style={{
                        backgroundColor: `${prefs.accentColor}25`,
                        color: prefs.accentColor,
                        boxShadow: `0 0 ${8 + bassBeatEnergy * 12}px ${prefs.accentColor}60`,
                        transform: `scale(${1 + bassBeatEnergy * 0.1})`,
                      }}
                    >
                      <Activity className="w-2.5 h-2.5 animate-spin" style={{ animationDuration: '3s' }} />
                      RITMO ON
                    </span>
                  )}
                </div>
                <span className="font-orbitron text-[10px] text-amber-400/80 font-bold tracking-wider">
                  BT PLAYER ROCK EDITION
                </span>
              </div>
            </div>

            {/* Right: Accessible Control Toolbar Dock */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap bg-neutral-950/90 border border-neutral-800/90 p-1.5 sm:p-2 rounded-xl shadow-xl self-end sm:self-auto">
              {/* Open Playlist Modal Button */}
              <button
                onClick={() => setPlaylistOpen(true)}
                className={`h-9 px-2.5 sm:px-3 rounded-lg border text-xs font-tech font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
                  playlistOpen
                    ? 'bg-amber-400 text-black border-amber-400 shadow-amber-400/20'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-200 hover:text-white hover:bg-neutral-800 hover:border-neutral-700'
                }`}
                title="Ver Lista de Reproducción e Historial"
              >
                <ListMusic className="w-4 h-4" />
                <span className="hidden xs:inline">Lista</span>
                <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-mono font-extrabold shadow-sm">
                  {audioEngine.getPlaylist().length}
                </span>
              </button>

              {/* Load Custom Audio / Playlist Batch Button */}
              <button
                onClick={() => audioInputRef.current?.click()}
                className="h-9 px-2.5 sm:px-3 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 hover:text-white hover:bg-neutral-800 hover:border-neutral-700 transition-all text-xs font-tech font-medium flex items-center gap-1.5 active:scale-95"
                title="Cargar canciones o lista MP3 (Se guardarán permanentemente)"
              >
                <Upload className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Cargar MP3</span>
              </button>

              {/* Equalizer Toggle Button */}
              <button
                onClick={() => setEqVisible(!eqVisible)}
                className={`h-9 px-2.5 sm:px-3 rounded-lg border text-xs font-tech font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
                  eqVisible
                    ? 'bg-amber-400 text-black border-amber-400 shadow-amber-400/20'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-200 hover:text-white hover:bg-neutral-800 hover:border-neutral-700'
                }`}
                title="Ecualizador"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">EQ</span>
              </button>

              {/* Microphone / External Audio Capture */}
              <button
                onClick={() => audioEngine.toggleMicCapture()}
                className={`h-9 px-2.5 sm:px-3 rounded-lg border text-xs font-tech font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
                  isMicActive
                    ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-200 hover:text-white hover:bg-neutral-800 hover:border-neutral-700'
                }`}
                title={
                  isMicActive
                    ? 'Capturando Audio Externo (Spotify / Deezer / Micrófono) - Clic para detener'
                    : 'Activar captura de Micrófono / Audio Externo para Spotify, Deezer o YouTube'
                }
              >
                {isMicActive ? <Mic className="w-4 h-4 text-black" /> : <MicOff className="w-4 h-4 text-emerald-400" />}
                <span className="hidden md:inline">Mic / Spotify</span>
              </button>

              {/* Mode Toggle Button */}
              <button
                onClick={() =>
                  updatePrefs((prev) => ({
                    ...prev,
                    screenMode: (prev.screenMode + 1) % 3,
                  }))
                }
                className="h-9 px-2.5 sm:px-3 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 hover:text-white hover:bg-neutral-800 hover:border-neutral-700 transition-all text-xs font-tech font-medium flex items-center gap-1.5 active:scale-95"
                title="Cambiar Modo de Pantalla (Reproductor / Reloj Nixie / Mixto)"
              >
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="hidden md:inline">Modo</span>
              </button>

              {/* Settings Button */}
              <button
                onClick={() => setSettingsOpen(true)}
                className="h-9 px-2.5 sm:px-3 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 hover:text-white hover:bg-neutral-800 hover:border-neutral-700 transition-all text-xs font-tech font-medium flex items-center gap-1.5 active:scale-95"
                title="Ajustes de pantalla y estilos"
              >
                <SettingsIcon className="w-4 h-4 text-amber-400" />
                <span className="hidden md:inline">Ajustes</span>
              </button>

              {/* Native Fullscreen Toggle */}
              <button
                onClick={toggleNativeFullscreen}
                className="h-9 w-9 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 hover:text-white hover:bg-neutral-800 hover:border-neutral-700 transition-all flex items-center justify-center shrink-0 active:scale-95"
                title="Pantalla Completa"
              >
                {isNativeFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Player Grid Body */}
          <div className="flex-1 grid grid-cols-1 landscape:grid-cols-12 lg:grid-cols-12 gap-3 sm:gap-4 lg:gap-6 items-stretch overflow-hidden min-h-0 py-1 sm:py-2">
            {/* Left Column: Cover Art, Metadata & Controls (5 cols) */}
            <div className="landscape:col-span-5 lg:col-span-5 flex flex-col justify-between bg-neutral-950/80 border border-neutral-800/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 landscape:p-2.5 backdrop-blur-md overflow-y-auto no-scrollbar landscape:overflow-hidden">
              {/* Cover Art Image with Beat Rhythm Glow */}
              <div className="flex justify-center items-center my-auto py-1 landscape:py-0.5">
                <div
                  className="relative group transition-transform duration-75"
                  style={{
                    transform: `scale(${1 + bassBeatEnergy * 0.05})`,
                  }}
                >
                  <img
                    src={coverArtUrl || undefined}
                    alt="Album Cover"
                    className="w-28 h-28 xs:w-36 xs:h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 landscape:w-20 landscape:h-20 sm:landscape:w-28 sm:landscape:h-28 max-h-[25vh] landscape:max-h-[30vh] rounded-xl sm:rounded-2xl object-cover shadow-2xl border border-white/10"
                    style={{
                      boxShadow: `0 0 ${16 + Math.round(bassBeatEnergy * 30)}px ${
                        prefs.maskNeon ? prefs.accentColor : '#FBBC05'
                      }${Math.round(40 + bassBeatEnergy * 60).toString(16)}`,
                    }}
                  />
                  <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                    <Maximize2
                      onClick={() =>
                        updatePrefs((prev) => ({
                          ...prev,
                          coverStyle: (prev.coverStyle + 1) % 3,
                        }))
                      }
                      className="w-6 h-6 sm:w-8 sm:h-8 text-white"
                      title="Cambiar Estilo de Portada"
                    />
                  </div>
                </div>
              </div>

              {/* Track Info Marquee */}
              <div className="text-center my-1.5 sm:my-2 landscape:my-1 overflow-hidden">
                <div className="overflow-hidden w-full relative">
                  <h1
                    className="font-orbitron font-extrabold text-base sm:text-lg md:text-xl landscape:text-xs sm:landscape:text-sm tracking-wide whitespace-nowrap animate-marquee"
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
                  className="font-tech text-xs sm:text-sm landscape:text-[11px] font-medium mt-0.5"
                  style={{
                    color: prefs.accentColor,
                    textShadow: prefs.maskNeon
                      ? `0 0 ${14 * textFlickerAlpha}px ${prefs.accentColor}`
                      : 'none',
                  }}
                >
                  {playbackState.artist || 'Esperando audio...'}
                </h2>

                <p className="font-tech text-[10px] sm:text-xs text-neutral-400 mt-0.5 truncate">
                  {playbackState.album}
                </p>
              </div>

              {/* Progress & Duration Slider */}
              <div className="my-1 sm:my-2 landscape:my-1 space-y-0.5 sm:space-y-1">
                <input
                  type="range"
                  min="0"
                  max={playbackState.durationMs || 100}
                  value={currentPos}
                  onMouseDown={() => setUserSeeking(true)}
                  onMouseUp={() => {
                    setUserSeeking(false);
                    audioEngine.seekToMs(seekProgress);
                  }}
                  onTouchStart={() => setUserSeeking(true)}
                  onTouchEnd={() => {
                    setUserSeeking(false);
                    audioEngine.seekToMs(seekProgress);
                  }}
                  onChange={(e) => setSeekProgress(parseInt(e.target.value))}
                  className="w-full h-1.5 sm:h-2 rounded-lg accent-amber-400 cursor-pointer bg-neutral-800"
                  style={{ accentColor: prefs.accentColor }}
                />
                <div className="flex justify-between font-tech text-[10px] sm:text-xs text-neutral-400">
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

              {/* Playback Controls Toolbar with Shuffle & Repeat */}
              <div className="flex items-center justify-between sm:justify-center gap-2 sm:gap-4 mt-1 sm:mt-2 pt-1.5 sm:pt-2 border-t border-neutral-800/60 w-full px-1">
                {/* Shuffle Mode Toggle */}
                <button
                  onClick={() => audioEngine.toggleShuffle()}
                  className={`p-2 sm:p-2.5 rounded-full border transition-all active:scale-95 ${
                    isShuffle
                      ? 'bg-amber-400 text-black border-amber-400 shadow-md shadow-amber-400/30 ring-1 ring-amber-400/50 font-bold'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                  }`}
                  title={isShuffle ? 'Mezcla / Shuffle: Activado' : 'Mezcla / Shuffle: Desactivado'}
                >
                  <Shuffle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {/* Prev Button */}
                <button
                  onClick={handlePrev}
                  className="p-2 sm:p-2.5 landscape:p-2 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-200 hover:text-white hover:border-neutral-700 hover:scale-105 active:scale-95 transition-all"
                  title="Canción anterior"
                >
                  <SkipBack className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-current" />
                </button>

                {/* Play / Pause Button */}
                <button
                  onClick={handlePlayPause}
                  className="p-3 sm:p-3.5 landscape:p-2.5 rounded-full text-black font-bold hover:scale-105 active:scale-95 transition-all shadow-lg"
                  style={{
                    backgroundColor: prefs.accentColor,
                    boxShadow: `0 0 20px ${prefs.accentColor}80`,
                  }}
                  title={playbackState.isPlaying ? 'Pausar' : 'Reproducir'}
                >
                  {playbackState.isPlaying ? (
                    <Pause className="w-5 h-5 sm:w-5.5 sm:h-5.5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 sm:w-5.5 sm:h-5.5 fill-current ml-0.5" />
                  )}
                </button>

                {/* Next Button */}
                <button
                  onClick={handleNext}
                  className="p-2 sm:p-2.5 landscape:p-2 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-200 hover:text-white hover:border-neutral-700 hover:scale-105 active:scale-95 transition-all"
                  title="Siguiente canción"
                >
                  <SkipForward className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-current" />
                </button>

                {/* Repeat Mode Toggle (All -> One -> Off) */}
                <button
                  onClick={() => audioEngine.toggleRepeatMode()}
                  className={`p-2 sm:p-2.5 rounded-full border transition-all active:scale-95 ${
                    repeatMode !== 'off'
                      ? 'bg-amber-400 text-black border-amber-400 shadow-md shadow-amber-400/30 ring-1 ring-amber-400/50 font-bold'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                  }`}
                  title={
                    repeatMode === 'all'
                      ? 'Repetición: Toda la lista'
                      : repeatMode === 'one'
                      ? 'Repetición: 1 canción en bucle'
                      : 'Repetición: Desactivada'
                  }
                >
                  {repeatMode === 'one' ? (
                    <Repeat1 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : (
                    <Repeat className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Right Column: Visualizer Canvas / Nixie Clock / EQ Panel (7 cols) */}
            <div className="landscape:col-span-7 lg:col-span-7 flex flex-col gap-2 sm:gap-4 h-full min-h-[180px] sm:min-h-[250px] overflow-hidden">
              {/* If Equalizer Panel is toggled */}
              {eqVisible ? (
                <div className="flex-1">
                  <EqualizerPanel accentColor={prefs.accentColor} />
                </div>
              ) : (
                /* Screen Mode 2 (Mixed: Nixie Clock + Visualizer side-by-side or stacked) */
                prefs.screenMode === 2 && (
                  <div className="h-32 sm:h-52 bg-neutral-950/80 border border-neutral-800/80 rounded-xl sm:rounded-2xl p-2 sm:p-3 flex items-center justify-center shrink-0">
                    <NixieClock glow={prefs.nixieGlow} use24h={prefs.nixie24h} />
                  </div>
                )
              )}

              {/* Audio Visualizer View */}
              <div className="flex-1 bg-neutral-950/80 border border-neutral-800/80 rounded-xl sm:rounded-2xl p-2 sm:p-4 flex flex-col justify-between overflow-hidden relative min-h-0">
                <VisualizerView
                  prefs={prefs}
                  onUpdatePrefs={updatePrefs}
                  className="w-full h-full"
                />

                {/* Gesture info label at bottom right */}
                <div className="absolute bottom-1.5 right-2 sm:bottom-2 sm:right-3 font-tech text-[9px] sm:text-[10px] text-neutral-500 pointer-events-none opacity-60">
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

      {/* PLAYLIST MODAL */}
      <PlaylistModal
        isOpen={playlistOpen}
        onClose={() => setPlaylistOpen(false)}
        playlist={audioEngine.getPlaylist()}
        currentTrackIndex={audioEngine.getCurrentTrackIndex()}
        isPlaying={playbackState.isPlaying}
        repeatMode={repeatMode}
        isShuffle={isShuffle}
        onSelectTrack={(idx) => audioEngine.playTrackIndex(idx)}
        onRemoveTrack={(idx) => audioEngine.removeTrack(idx)}
        onUploadClick={() => audioInputRef.current?.click()}
        onToggleRepeat={() => audioEngine.toggleRepeatMode()}
        onToggleShuffle={() => audioEngine.toggleShuffle()}
        accentColor={prefs.accentColor}
      />

      {/* SETTINGS MODAL */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        prefs={prefs}
        onUpdatePrefs={updatePrefs}
        onSelectBgImage={() => bgInputRef.current?.click()}
      />
    </div>
  );
};

export default App;

