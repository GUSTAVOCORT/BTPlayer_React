import React from 'react';
import { AppPrefs } from '../types';
import { PALETTES } from '../utils/palettes';
import { X, Image as ImageIcon, Sliders, Monitor, Palette, Sparkles, Terminal } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefs: AppPrefs;
  onUpdatePrefs: (updater: (prev: AppPrefs) => AppPrefs) => void;
  onPickBackground: () => void;
}

const STYLES = [
  'Segmentos LED',
  'Barras',
  'Espejo',
  'Línea',
  'Puntos',
  'Onda rellena',
  'Barras con pico',
  'LED plano',
  'Arcoíris H',
  'Radial circular',
  'Matriz LED',
  'Puntos grid',
  'Onda espejo',
  'Barras centro',
  'Llamas',
  'Ondas latido',
];

const BAR_COUNTS = [20, 28, 40, 56, 72];
const SCREEN_MODES = ['Reproductor', 'Reloj Nixie', 'Reloj + música'];
const COVER_STYLES = ['Inicial', 'Abstracto', 'Anillos'];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  prefs,
  onUpdatePrefs,
  onPickBackground,
}) => {
  if (!isOpen) return null;

  const updateField = <K extends keyof AppPrefs>(key: K, val: AppPrefs[K]) => {
    onUpdatePrefs((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h2 className="font-orbitron text-lg font-bold text-amber-400">Ajustes</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm">
          {/* Estilo de barras */}
          <div>
            <h3 className="text-amber-400 font-bold mb-2 flex items-center gap-1.5 font-orbitron">
              <Sparkles className="w-4 h-4" /> Estilo de barras
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {STYLES.map((name, i) => (
                <button
                  key={name}
                  onClick={() => updateField('vizStyle', i)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-tech whitespace-nowrap transition-colors ${
                    prefs.vizStyle === i
                      ? 'bg-amber-400 text-black font-bold shadow-lg'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Paleta de colores */}
          <div>
            <h3 className="text-amber-400 font-bold mb-2 flex items-center gap-1.5 font-orbitron">
              <Palette className="w-4 h-4" /> Color / paleta
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {PALETTES.map((pal, i) => (
                <button
                  key={pal.name}
                  onClick={() => {
                    updateField('vizPalette', i);
                    updateField('accentColor', pal.colors[0]);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-tech whitespace-nowrap flex items-center gap-2 transition-colors ${
                    prefs.vizPalette === i
                      ? 'bg-amber-400 text-black font-bold shadow-lg'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-white/20"
                    style={{ backgroundColor: pal.colors[0] }}
                  />
                  {pal.name}
                </button>
              ))}
            </div>
          </div>

          {/* Cantidad de barras */}
          <div>
            <h3 className="text-amber-400 font-bold mb-2 font-orbitron">Cantidad de barras</h3>
            <div className="flex gap-2">
              {BAR_COUNTS.map((count) => (
                <button
                  key={count}
                  onClick={() => updateField('vizBars', count)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-tech transition-colors ${
                    prefs.vizBars === count
                      ? 'bg-amber-400 text-black font-bold'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-4 bg-neutral-950/60 p-4 rounded-xl border border-neutral-800/80">
            <div>
              <div className="flex justify-between text-xs mb-1 font-tech">
                <span className="text-neutral-300">Alto de las barras</span>
                <span className="text-amber-400 font-bold">{prefs.vizHeight}%</span>
              </div>
              <input
                type="range"
                min="60"
                max="100"
                value={prefs.vizHeight}
                onChange={(e) => updateField('vizHeight', parseInt(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1 font-tech">
                <span className="text-neutral-300">Grosor de las barras</span>
                <span className="text-amber-400 font-bold">{prefs.vizWidth}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={prefs.vizWidth}
                onChange={(e) => updateField('vizWidth', parseInt(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1 font-tech">
                <span className="text-neutral-300">Sensibilidad (reactividad)</span>
                <span className="text-amber-400 font-bold">{prefs.vizGain}%</span>
              </div>
              <input
                type="range"
                min="80"
                max="250"
                value={prefs.vizGain}
                onChange={(e) => updateField('vizGain', parseInt(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Toggles */}
          <div>
            <h3 className="text-amber-400 font-bold mb-3 font-orbitron">Efectos visuales</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                { label: 'Neón (glow) en barras', key: 'vizNeon' },
                { label: 'Barras redondeadas', key: 'vizRounded' },
                { label: 'Barras a pantalla completa', key: 'vizFullscreen' },
                { label: 'Neón tipo letrero en texto', key: 'maskNeon' },
                { label: 'Titileo del neón (tubo viejo)', key: 'maskFlicker' },
                { label: 'Marco de neón en la pantalla', key: 'frameNeon' },
              ].map(({ label, key }) => (
                <label
                  key={key}
                  className="flex items-center gap-2 cursor-pointer bg-neutral-800/60 p-2.5 rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(prefs[key as keyof AppPrefs])}
                    onChange={(e) => updateField(key as keyof AppPrefs, e.target.checked as any)}
                    className="accent-amber-400 w-4 h-4 rounded"
                  />
                  <span className="text-neutral-200">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Modo de pantalla */}
          <div>
            <h3 className="text-amber-400 font-bold mb-2 flex items-center gap-1.5 font-orbitron">
              <Monitor className="w-4 h-4" /> Modo de pantalla
            </h3>
            <div className="flex gap-2 mb-3">
              {SCREEN_MODES.map((mode, i) => (
                <button
                  key={mode}
                  onClick={() => updateField('screenMode', i)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-tech transition-colors ${
                    prefs.screenMode === i
                      ? 'bg-amber-400 text-black font-bold'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer bg-neutral-800/60 p-2.5 rounded-lg hover:bg-neutral-800">
                <input
                  type="checkbox"
                  checked={prefs.nixie24h}
                  onChange={(e) => updateField('nixie24h', e.target.checked)}
                  className="accent-amber-400 w-4 h-4"
                />
                <span className="text-neutral-200">Reloj 24 horas</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer bg-neutral-800/60 p-2.5 rounded-lg hover:bg-neutral-800">
                <input
                  type="checkbox"
                  checked={prefs.nixieGlow}
                  onChange={(e) => updateField('nixieGlow', e.target.checked)}
                  className="accent-amber-400 w-4 h-4"
                />
                <span className="text-neutral-200">Glow del reloj</span>
              </label>
            </div>
          </div>

          {/* Carátula */}
          <div>
            <h3 className="text-amber-400 font-bold mb-2 font-orbitron">Estilo de carátula generada</h3>
            <div className="flex gap-2">
              {COVER_STYLES.map((style, i) => (
                <button
                  key={style}
                  onClick={() => updateField('coverStyle', i)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-tech transition-colors ${
                    prefs.coverStyle === i
                      ? 'bg-amber-400 text-black font-bold'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Fondo */}
          <div>
            <h3 className="text-amber-400 font-bold mb-2 flex items-center gap-1.5 font-orbitron">
              <ImageIcon className="w-4 h-4" /> Imagen de fondo
            </h3>
            <div className="flex gap-2 mb-3">
              <button
                onClick={onPickBackground}
                className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs font-tech transition-colors"
              >
                Cargar imagen
              </button>
              <button
                onClick={() => updateField('bgUri', null)}
                className="py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-tech transition-colors"
              >
                Quitar fondo
              </button>
            </div>

            {prefs.bgUri && (
              <div>
                <div className="flex justify-between text-xs mb-1 font-tech">
                  <span className="text-neutral-300">Oscurecimiento de fondo</span>
                  <span className="text-amber-400 font-bold">{prefs.bgDim}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={prefs.bgDim}
                  onChange={(e) => updateField('bgDim', parseInt(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Diagnóstico */}
          <div>
            <h3 className="text-amber-400 font-bold mb-2 flex items-center gap-1.5 font-orbitron">
              <Terminal className="w-4 h-4" /> Diagnóstico
            </h3>
            <label className="flex items-center gap-2 cursor-pointer bg-neutral-800/60 p-2.5 rounded-lg hover:bg-neutral-800">
              <input
                type="checkbox"
                checked={prefs.showDebug}
                onChange={(e) => updateField('showDebug', e.target.checked)}
                className="accent-amber-400 w-4 h-4"
              />
              <span className="text-neutral-200">Mostrar datos crudos del Bluetooth</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-amber-400 hover:bg-amber-300 text-black font-bold font-orbitron text-xs rounded-lg transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
