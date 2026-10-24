import React, { useState } from "react";
import { X, Sparkles, Sliders, Volume2, RotateCcw, Activity, Shuffle, Zap } from "lucide-react";
import { ThemeMode, AccentColor, Track } from "../types/player";
import { EQ_FREQUENCIES } from "../services/audioEngine";

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
  accent: AccentColor;
  currentTrack: Track | null;
  eqBands: number[];
  bassBoost: number;
  reverb: number;
  playbackRate: number;
  crossfadeSeconds: number;
  gaplessEnabled: boolean;
  onUpdateBands: (bands: number[]) => void;
  onUpdateBassBoost: (val: number) => void;
  onUpdateReverb: (val: number) => void;
  onUpdatePlaybackRate: (val: number) => void;
  onUpdateCrossfade: (seconds: number) => void;
  onUpdateGapless: (enabled: boolean) => void;
  onTriggerAiSonic: () => void;
}

const PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "AMOLED Bass": [6, 5.5, 3.5, 1, 0, 0.5, 1.5, 3, 4, 3.5],
  "Vocal Clarity": [-1, -0.5, 0, 1.5, 3, 3.5, 2, 1, 0.5, 0],
  "Electronic Club": [5, 4, 1.5, 0, -1, 1.5, 3.5, 4.5, 4, 3],
  "Acoustic Hall": [2, 1.5, 0.5, 0, 1, 1.5, 2.5, 3.5, 4, 3.5],
  "Deep Neo-Classical": [3, 2, 0.5, 0, 0, 0, 1, 2, 3, 2.5],
  "Subwoofer Punch": [8, 7, 4, 1, -1, 0, 1, 2, 3, 2],
};

export const EqualizerModal: React.FC<EqualizerModalProps> = ({
  isOpen,
  onClose,
  theme,
  accent,
  currentTrack,
  eqBands,
  bassBoost,
  reverb,
  playbackRate,
  crossfadeSeconds,
  gaplessEnabled,
  onUpdateBands,
  onUpdateBassBoost,
  onUpdateReverb,
  onUpdatePlaybackRate,
  onUpdateCrossfade,
  onUpdateGapless,
  onTriggerAiSonic,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>("Flat");

  if (!isOpen) return null;

  const isAmoled = theme === "amoled";

  const handleBandChange = (index: number, val: number) => {
    const updated = [...eqBands];
    updated[index] = val;
    setSelectedPreset("Custom");
    onUpdateBands(updated);
  };

  const handlePresetSelect = (presetName: string) => {
    setSelectedPreset(presetName);
    const gains = PRESETS[presetName];
    if (gains) {
      onUpdateBands(gains);
    }
  };

  const handleReset = () => {
    handlePresetSelect("Flat");
    onUpdateBassBoost(0);
    onUpdateReverb(0.15);
    onUpdatePlaybackRate(1.0);
    onUpdateCrossfade(4);
    onUpdateGapless(true);
  };

  // Generate SVG curve path for frequency response
  const curvePoints = eqBands.map((gain, i) => {
    const x = (i / (eqBands.length - 1)) * 480;
    // Map -12dB..+12dB to height (60px high, 30 is center 0dB)
    const y = 30 - (gain / 12) * 26;
    return `${x},${y}`;
  });
  const curvePath = `M ${curvePoints.join(" L ")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div
        className={`w-full max-w-2xl rounded-2xl p-6 transition-colors border shadow-2xl relative my-auto ${
          isAmoled
            ? "bg-black border-neutral-800 text-white shadow-black/80"
            : "bg-white border-neutral-200 text-neutral-900 shadow-xl"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800/40">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${accent.hex}20`, color: accent.hex }}
            >
              <Sliders size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">10-Band EQ &amp; Transition DSP</h2>
              <p className="text-xs text-neutral-400">
                Acoustic DSP Studio &bull; {currentTrack ? currentTrack.title : "Master Channel"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onTriggerAiSonic}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105 active:scale-95"
              style={{
                backgroundColor: `${accent.hex}22`,
                color: accent.hex,
                border: `1px solid ${accent.hex}44`,
              }}
              title="Compute optimal mastering EQ with Sonic AI"
            >
              <Sparkles size={13} />
              AI Optimize
            </button>

            <button
              onClick={handleReset}
              className={`p-2 rounded-full transition-colors ${
                isAmoled ? "hover:bg-neutral-900 text-neutral-400" : "hover:bg-neutral-100 text-neutral-600"
              }`}
              title="Reset Equalizer"
            >
              <RotateCcw size={16} />
            </button>

            <button
              onClick={onClose}
              className={`p-2 rounded-full transition-colors ${
                isAmoled ? "hover:bg-neutral-900 text-neutral-400" : "hover:bg-neutral-100 text-neutral-600"
              }`}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Real-time Frequency Response Curve */}
        <div className="mt-4 mb-3">
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-1 px-1">
            <span className="flex items-center gap-1.5">
              <Activity size={12} style={{ color: accent.hex }} />
              Frequency Response Curve
            </span>
            <span>+12 dB / -12 dB</span>
          </div>

          <div
            className={`w-full h-16 rounded-xl border relative overflow-hidden flex items-center px-4 ${
              isAmoled ? "bg-neutral-950 border-neutral-900" : "bg-neutral-50 border-neutral-200"
            }`}
          >
            {/* Zero line */}
            <div className="absolute inset-x-0 top-1/2 h-px bg-neutral-700/25 border-dashed" />

            <svg viewBox="0 0 480 60" className="w-full h-full overflow-visible">
              <path
                d={curvePath}
                fill="none"
                stroke={accent.hex}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Presets Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-2 scrollbar-none">
          {Object.keys(PRESETS).map((p) => (
            <button
              key={p}
              onClick={() => handlePresetSelect(p)}
              className={`px-3 py-1 text-xs rounded-lg transition-all shrink-0 font-medium ${
                selectedPreset === p
                  ? "text-black shadow-sm"
                  : isAmoled
                  ? "bg-neutral-900 hover:bg-neutral-800 text-neutral-300"
                  : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
              }`}
              style={selectedPreset === p ? { backgroundColor: accent.hex } : undefined}
            >
              {p}
            </button>
          ))}
        </div>

        {/* 10 Faders */}
        <div className="grid grid-cols-10 gap-2 mt-3 pt-2">
          {EQ_FREQUENCIES.map((freq, index) => {
            const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
            const gain = eqBands[index] ?? 0;

            return (
              <div key={freq} className="flex flex-col items-center">
                <span
                  className="text-[10px] font-mono mb-2"
                  style={{ color: gain !== 0 ? accent.hex : undefined }}
                >
                  {gain > 0 ? `+${gain.toFixed(0)}` : gain.toFixed(0)}
                </span>

                <div className="relative h-32 flex items-center justify-center">
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={0.5}
                    value={gain}
                    onChange={(e) => handleBandChange(index, parseFloat(e.target.value))}
                    className="slider-vertical h-28 w-1.5 cursor-pointer accent-current"
                    style={{
                      writingMode: "vertical-lr",
                      direction: "rtl",
                      accentColor: accent.hex,
                    }}
                  />
                </div>

                <span className="text-[11px] font-medium mt-2 text-neutral-400 font-mono">
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Master Audio Effects (Bass Boost, Reverb, Speed) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-neutral-800/40">
          {/* Dynamic Bass Boost */}
          <div
            className={`p-3 rounded-xl border ${
              isAmoled ? "bg-neutral-950 border-neutral-900" : "bg-neutral-50 border-neutral-200"
            }`}
          >
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-medium flex items-center gap-1.5">
                <Volume2 size={13} style={{ color: accent.hex }} />
                Bass Boost
              </span>
              <span className="font-mono text-neutral-400">+{bassBoost.toFixed(1)} dB</span>
            </div>
            <input
              type="range"
              min={0}
              max={12}
              step={0.5}
              value={bassBoost}
              onChange={(e) => onUpdateBassBoost(parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-lg cursor-pointer"
              style={{ accentColor: accent.hex }}
            />
          </div>

          {/* Spatial Reverb */}
          <div
            className={`p-3 rounded-xl border ${
              isAmoled ? "bg-neutral-950 border-neutral-900" : "bg-neutral-50 border-neutral-200"
            }`}
          >
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-medium">Spatial Reverb</span>
              <span className="font-mono text-neutral-400">{Math.round(reverb * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={reverb}
              onChange={(e) => onUpdateReverb(parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-lg cursor-pointer"
              style={{ accentColor: accent.hex }}
            />
          </div>

          {/* Playback Speed */}
          <div
            className={`p-3 rounded-xl border ${
              isAmoled ? "bg-neutral-950 border-neutral-900" : "bg-neutral-50 border-neutral-200"
            }`}
          >
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-medium">Playback Speed</span>
              <span className="font-mono text-neutral-400">{playbackRate}x</span>
            </div>
            <div className="flex items-center justify-between gap-1">
              {[0.75, 1.0, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  onClick={() => onUpdatePlaybackRate(rate)}
                  className={`px-2 py-1 text-[11px] rounded font-medium transition-colors ${
                    playbackRate === rate
                      ? "text-black"
                      : isAmoled
                      ? "hover:bg-neutral-800 text-neutral-400"
                      : "hover:bg-neutral-200 text-neutral-600"
                  }`}
                  style={playbackRate === rate ? { backgroundColor: accent.hex } : undefined}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Crossfade & Gapless Transitions Engine */}
        <div
          className={`mt-3 p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            isAmoled ? "bg-neutral-950 border-neutral-900" : "bg-neutral-50 border-neutral-200"
          }`}
        >
          {/* Crossfade Overlap Curve */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold flex items-center gap-1.5">
                <Shuffle size={13} style={{ color: accent.hex }} />
                Custom Crossfade Transition
              </span>
              <span className="font-mono font-bold" style={{ color: accent.hex }}>
                {crossfadeSeconds === 0 ? "OFF (Instant)" : `${crossfadeSeconds}s Overlap`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={12}
                step={1}
                value={crossfadeSeconds}
                onChange={(e) => onUpdateCrossfade(parseInt(e.target.value, 10))}
                className="flex-1 h-1.5 rounded-lg cursor-pointer"
                style={{ accentColor: accent.hex }}
              />
              <div className="flex items-center gap-1">
                {[0, 2, 4, 8, 12].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => onUpdateCrossfade(sec)}
                    className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
                      crossfadeSeconds === sec
                        ? "text-black font-bold"
                        : isAmoled
                        ? "bg-neutral-900 text-neutral-400 hover:text-white"
                        : "bg-neutral-200 text-neutral-600 hover:text-black"
                    }`}
                    style={crossfadeSeconds === sec ? { backgroundColor: accent.hex } : undefined}
                  >
                    {sec === 0 ? "Off" : `${sec}s`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Gapless Audio Buffer Toggle */}
          <div className="sm:border-l border-neutral-800/40 sm:pl-4 flex items-center justify-between sm:flex-col sm:items-end gap-1.5 shrink-0">
            <span className="text-xs font-semibold flex items-center gap-1">
              <Zap size={12} style={{ color: accent.hex }} />
              Gapless Engine
            </span>
            <button
              onClick={() => onUpdateGapless(!gaplessEnabled)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${
                gaplessEnabled
                  ? "text-black border-transparent"
                  : isAmoled
                  ? "bg-neutral-900 border-neutral-800 text-neutral-400"
                  : "bg-neutral-200 border-neutral-300 text-neutral-600"
              }`}
              style={gaplessEnabled ? { backgroundColor: accent.hex } : undefined}
            >
              {gaplessEnabled ? "ACTIVE (0ms)" : "DISABLED"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

