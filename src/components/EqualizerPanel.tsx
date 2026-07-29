import React, { useState } from 'react';
import { audioEngine } from './AudioEngine';
import { SlidersHorizontal, Check } from 'lucide-react';

interface EqualizerPanelProps {
  accentColor: string;
}

const EQ_FREQS = ['60Hz', '230Hz', '910Hz', '3.6kHz', '14kHz'];

const EQ_PRESETS = [
  { name: 'Flat', levels: [0, 0, 0, 0, 0] },
  { name: 'Bass Boost', levels: [1200, 800, 200, 0, -200] },
  { name: 'Pop', levels: [-200, 400, 700, 500, -100] },
  { name: 'Rock', levels: [800, 500, -300, 400, 900] },
  { name: 'Jazz', levels: [400, 200, -200, 400, 700] },
  { name: 'Techno', levels: [1000, 600, 0, 800, 1000] },
  { name: 'Custom', levels: [0, 0, 0, 0, 0] },
];

export const EqualizerPanel: React.FC<EqualizerPanelProps> = ({ accentColor }) => {
  const [levels, setLevels] = useState<number[]>([0, 0, 0, 0, 0]);
  const [selectedPreset, setSelectedPreset] = useState<string>('Flat');

  const handleLevelChange = (bandIndex: number, valMilli: number) => {
    const newLevels = [...levels];
    newLevels[bandIndex] = valMilli;
    setLevels(newLevels);
    setSelectedPreset('Custom');
    audioEngine.setEQBandLevel(bandIndex, valMilli);
  };

  const handleSelectPreset = (preset: typeof EQ_PRESETS[0]) => {
    setSelectedPreset(preset.name);
    setLevels(preset.levels);
    preset.levels.forEach((lvl, i) => {
      audioEngine.setEQBandLevel(i, lvl);
    });
  };

  return (
    <div className="flex flex-col h-full w-full bg-neutral-900/90 backdrop-blur-md rounded-xl p-4 border border-neutral-800 text-white select-none">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" style={{ color: accentColor }} />
          <span className="font-orbitron text-sm font-bold tracking-wider" style={{ color: accentColor }}>
            EQUALIZER (5 BANDS)
          </span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[60%]">
          {EQ_PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => handleSelectPreset(p)}
              className={`text-xs px-2 py-1 rounded transition-colors whitespace-nowrap font-tech ${
                selectedPreset === p.name
                  ? 'bg-amber-500 text-black font-bold'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* 5 Band Sliders */}
      <div className="flex-1 grid grid-cols-5 gap-2 items-center justify-items-center py-2">
        {EQ_FREQS.map((freqLabel, i) => {
          const val = levels[i]; // -1500 to +1500
          return (
            <div key={freqLabel} className="flex flex-col items-center h-full w-full justify-between">
              <span className="text-[11px] font-tech text-amber-400">
                {val > 0 ? `+${(val / 100).toFixed(1)}` : (val / 100).toFixed(1)}dB
              </span>

              {/* Vertical range slider */}
              <div className="relative flex-1 flex items-center justify-center py-2 w-full">
                <input
                  type="range"
                  min="-1500"
                  max="1500"
                  step="50"
                  value={val}
                  onChange={(e) => handleLevelChange(i, parseInt(e.target.value))}
                  className="h-32 w-3 accent-amber-400 cursor-pointer appearance-none bg-neutral-800 rounded-lg -rotate-90 origin-center"
                  style={{
                    accentColor: accentColor,
                  }}
                />
              </div>

              <span className="text-xs font-tech font-bold text-neutral-300 mt-1">
                {freqLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
