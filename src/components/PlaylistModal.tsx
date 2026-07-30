import React from 'react';
import { X, Play, Music, Trash2, Upload, Disc } from 'lucide-react';
import { TrackItem } from '../types';

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: TrackItem[];
  currentTrackIndex: number;
  isPlaying: boolean;
  onSelectTrack: (index: number) => void;
  onRemoveTrack: (index: number) => void;
  onUploadClick: () => void;
  accentColor: string;
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  isOpen,
  onClose,
  playlist,
  currentTrackIndex,
  isPlaying,
  onSelectTrack,
  onRemoveTrack,
  onUploadClick,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-950/80">
          <div className="flex items-center gap-2.5">
            <Disc className="w-5 h-5 text-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
            <div>
              <h2 className="font-orbitron text-base font-bold text-amber-400">
                Lista de Reproducción
              </h2>
              <p className="text-[11px] font-tech text-neutral-400">
                {playlist.length} {playlist.length === 1 ? 'canción' : 'canciones en cola'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onUploadClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 text-black text-xs font-bold font-tech hover:bg-amber-300 transition-all shadow-md"
              title="Añadir más canciones o carpetas"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Cargar lista</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Track List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 font-tech">
          {playlist.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 text-sm">
              <Music className="w-10 h-10 mx-auto mb-2 opacity-30" />
              No hay canciones en la lista. ¡Haz clic en Cargar lista para añadir tus archivos MP3!
            </div>
          ) : (
            playlist.map((track, index) => {
              const isCurrent = index === currentTrackIndex;
              return (
                <div
                  key={track.id + '_' + index}
                  onClick={() => onSelectTrack(index)}
                  className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-neutral-800/90 border-amber-400/80 text-white shadow-lg shadow-amber-400/10'
                      : 'bg-neutral-950/60 border-neutral-800/80 text-neutral-300 hover:bg-neutral-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className={`w-6 text-center text-xs font-mono shrink-0 ${
                        isCurrent ? 'text-amber-400 font-bold' : 'text-neutral-500'
                      }`}
                    >
                      {isCurrent && isPlaying ? (
                        <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <div className="truncate flex-1">
                      <div
                        className={`text-xs font-bold truncate ${
                          isCurrent ? 'text-amber-300' : 'text-neutral-200'
                        }`}
                        style={{
                          color: isCurrent ? accentColor : undefined,
                        }}
                      >
                        {track.title}
                      </div>
                      <div className="text-[11px] text-neutral-500 truncate flex items-center gap-2">
                        <span>{track.artist}</span>
                        <span>•</span>
                        <span>{track.album}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-2">
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
                          ? 'bg-amber-400 text-black'
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
                        title="Quitar de la lista"
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
        <div className="p-3 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between text-xs text-neutral-400 font-tech">
          <span>💡 Puedes seleccionar varios archivos MP3 a la vez al cargarlos.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
