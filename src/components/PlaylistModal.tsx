import React from 'react';
import {
  X,
  Play,
  Music,
  Trash2,
  Upload,
  Disc,
  Shuffle,
  Repeat,
  Repeat1,
  Database,
  RotateCcw,
} from 'lucide-react';
import { TrackItem } from '../types';
import { audioEngine, RepeatMode } from './AudioEngine';

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: TrackItem[];
  currentTrackIndex: number;
  isPlaying: boolean;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  onSelectTrack: (index: number) => void;
  onRemoveTrack: (index: number) => void;
  onUploadClick: () => void;
  onToggleRepeat: () => void;
  onToggleShuffle: () => void;
  accentColor: string;
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  isOpen,
  onClose,
  playlist,
  currentTrackIndex,
  isPlaying,
  repeatMode,
  isShuffle,
  onSelectTrack,
  onRemoveTrack,
  onUploadClick,
  onToggleRepeat,
  onToggleShuffle,
  accentColor,
}) => {
  if (!isOpen) return null;

  const formatDuration = (ms: number) => {
    if (!ms) return '0:00';
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleClearAll = () => {
    if (
      window.confirm(
        '¿Deseas restaurar la lista de canciones a las pistas por defecto y limpiar las canciones cargadas?'
      )
    ) {
      audioEngine.clearCustomLibrary();
    }
  };

  const hasCustomTracks = playlist.some((t) => t.id.startsWith('custom_'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4">
      <div className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col max-h-[88vh] text-white overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-neutral-800 bg-neutral-950/90 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Disc
              className="w-5 h-5 text-amber-400 animate-spin shrink-0"
              style={{ animationDuration: '8s' }}
            />
            <div className="truncate">
              <h2 className="font-orbitron text-sm sm:text-base font-bold text-amber-400 truncate">
                Lista de Reproducción
              </h2>
              <div className="flex items-center gap-2 text-[11px] font-tech text-neutral-400">
                <span>
                  {playlist.length} {playlist.length === 1 ? 'canción' : 'canciones en cola'}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/40">
                  <Database className="w-2.5 h-2.5" /> Auto-guardado
                </span>
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Shuffle Toggle */}
            <button
              onClick={onToggleShuffle}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border text-xs font-tech font-bold flex items-center gap-1 transition-all ${
                isShuffle
                  ? 'bg-amber-400 text-black border-amber-400 shadow-md shadow-amber-400/20'
                  : 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-700'
              }`}
              title={isShuffle ? 'Mezcla / Shuffle: Activado' : 'Mezcla / Shuffle: Desactivado'}
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mezclar</span>
            </button>

            {/* Repeat Toggle */}
            <button
              onClick={onToggleRepeat}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border text-xs font-tech font-bold flex items-center gap-1 transition-all ${
                repeatMode !== 'off'
                  ? 'bg-amber-400 text-black border-amber-400 shadow-md shadow-amber-400/20'
                  : 'bg-neutral-800/80 border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-700'
              }`}
              title={
                repeatMode === 'all'
                  ? 'Repetición: Toda la lista'
                  : repeatMode === 'one'
                  ? 'Repetición: 1 canción actual'
                  : 'Repetición: Desactivada'
              }
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-3.5 h-3.5" />
              ) : (
                <Repeat className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {repeatMode === 'one' ? '1' : repeatMode === 'all' ? 'Todo' : 'Off'}
              </span>
            </button>

            {/* Upload MP3s */}
            <button
              onClick={onUploadClick}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-400 text-black text-xs font-bold font-tech hover:bg-amber-300 transition-all shadow-md active:scale-95"
              title="Añadir canciones MP3 a la biblioteca"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Cargar</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Track List */}
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-1.5 font-tech no-scrollbar">
          {playlist.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 text-sm">
              <Music className="w-10 h-10 mx-auto mb-2 opacity-30" />
              No hay canciones en la lista. ¡Haz clic en Cargar para añadir tus archivos de música!
            </div>
          ) : (
            playlist.map((track, index) => {
              const isCurrent = index === currentTrackIndex;
              return (
                <div
                  key={track.id + '_' + index}
                  onClick={() => onSelectTrack(index)}
                  className={`group flex items-center justify-between p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-neutral-800/95 border-amber-400/80 text-white shadow-lg shadow-amber-400/15 ring-1 ring-amber-400/30'
                      : 'bg-neutral-950/60 border-neutral-800/80 text-neutral-300 hover:bg-neutral-800/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <span
                      className={`w-6 text-center text-xs font-mono shrink-0 ${
                        isCurrent ? 'text-amber-400 font-bold' : 'text-neutral-500'
                      }`}
                    >
                      {isCurrent && isPlaying ? (
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <div className="truncate flex-1">
                      <div
                        className={`text-xs sm:text-sm font-bold truncate ${
                          isCurrent ? 'text-amber-300' : 'text-neutral-200'
                        }`}
                        style={{
                          color: isCurrent ? accentColor : undefined,
                        }}
                      >
                        {track.title}
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate flex items-center gap-1.5">
                        <span className="truncate">{track.artist}</span>
                        <span>•</span>
                        <span className="truncate text-neutral-500">{track.album}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
                    <span className="text-[11px] font-mono text-neutral-400">
                      {formatDuration(track.durationMs)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTrack(index);
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isCurrent
                          ? 'bg-amber-400 text-black shadow-md'
                          : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'
                      }`}
                      title="Reproducir esta canción"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                    {playlist.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveTrack(index);
                        }}
                        className="p-1.5 rounded-lg bg-neutral-800/50 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-colors opacity-60 group-hover:opacity-100"
                        title="Quitar de la lista y memoria"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-neutral-800 bg-neutral-950/90 flex flex-wrap items-center justify-between text-xs text-neutral-400 font-tech gap-2">
          <div className="flex items-center gap-2">
            <span className="text-neutral-400 text-[11px]">
              💾 Tus canciones quedan guardadas permanentemente en este dispositivo.
            </span>
          </div>

          <div className="flex items-center gap-2">
            {hasCustomTracks && (
              <button
                onClick={handleClearAll}
                className="px-2.5 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-red-950/60 hover:text-red-300 text-neutral-400 text-xs font-tech transition-colors flex items-center gap-1"
                title="Limpiar biblioteca y restaurar canciones de demostración"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restaurar</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
