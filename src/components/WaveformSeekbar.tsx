import React, { useState, useEffect, useRef, useMemo } from "react";
import { AudioWaveform, Minus, Shuffle, Zap } from "lucide-react";
import { Track, ThemeMode, AccentColor } from "../types/player";

interface WaveformSeekbarProps {
  track: Track | null;
  currentTime: number;
  duration: number;
  theme: ThemeMode;
  accent: AccentColor;
  crossfadeSeconds: number;
  gaplessEnabled: boolean;
  isCrossfading: boolean;
  onSeek: (newTime: number) => void;
  onOpenEqualizer?: () => void;
}

const BAR_COUNT = 76;
const waveformCache = new Map<string, number[]>();

/**
 * Generates a realistic musical envelope (intro, verse, pre-chorus, drop/chorus, bridge, outro)
 * seeded deterministically from the track metadata so each song has a unique visual signature.
 */
function generateDeterministicWaveform(track: Track | null): number[] {
  if (!track) {
    return Array.from({ length: BAR_COUNT }, () => 0.25);
  }

  const seedStr = `${track.id}-${track.title}-${track.bpm || 120}-${track.genre}`;
  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const nextRand = () => {
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    return ((hash >>> 0) % 1000) / 1000;
  };

  const peaks: number[] = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    const pos = i / (BAR_COUNT - 1); // 0..1 across the song

    // Macro song structure envelope
    let envelope = 0.55;
    if (pos < 0.08) {
      // Intro build
      envelope = 0.22 + (pos / 0.08) * 0.4;
    } else if (pos < 0.28) {
      // Verse 1
      envelope = 0.52 + Math.sin(pos * 28) * 0.12;
    } else if (pos < 0.52) {
      // First Chorus / Drop (high energy)
      envelope = 0.82 + Math.sin(pos * 45) * 0.14;
    } else if (pos < 0.66) {
      // Breakdown / Bridge (dip in amplitude)
      envelope = 0.36 + Math.cos(pos * 20) * 0.1;
    } else if (pos < 0.88) {
      // Final Chorus / Climax
      envelope = 0.88 + Math.sin(pos * 50) * 0.1;
    } else {
      // Outro fade
      envelope = Math.max(0.16, 0.75 * (1 - (pos - 0.88) / 0.12));
    }

    const jitter = (nextRand() - 0.45) * 0.32;
    const val = Math.max(0.12, Math.min(1.0, envelope + jitter));
    peaks.push(val);
  }

  return peaks;
}

export const WaveformSeekbar: React.FC<WaveformSeekbarProps> = ({
  track,
  currentTime,
  duration,
  theme,
  accent,
  crossfadeSeconds,
  gaplessEnabled,
  isCrossfading,
  onSeek,
  onOpenEqualizer,
}) => {
  const [mode, setMode] = useState<"waveform" | "minimal">("waveform");
  const [decodedPeaks, setDecodedPeaks] = useState<number[] | null>(null);
  const [hoverRatio, setHoverRatio] = useState<number | null>(null);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const isAmoled = theme === "amoled";
  const safeDuration = duration > 0 ? duration : track?.duration || 180;
  const progressRatio = Math.max(0, Math.min(1, currentTime / safeDuration));

  // Decode real audio peaks if track has a local File
  useEffect(() => {
    if (!track) {
      setDecodedPeaks(null);
      return;
    }

    if (waveformCache.has(track.id)) {
      setDecodedPeaks(waveformCache.get(track.id)!);
      return;
    }

    let cancelled = false;

    if (track.file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        if (cancelled || !e.target?.result) return;
        try {
          const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const offlineCtx = new AudioCtx();
          const audioBuffer = await offlineCtx.decodeAudioData(e.target.result as ArrayBuffer);
          const rawData = audioBuffer.getChannelData(0);
          const blockSize = Math.floor(rawData.length / BAR_COUNT);
          const peaks: number[] = [];

          let maxPeak = 0.01;
          for (let i = 0; i < BAR_COUNT; i++) {
            const start = i * blockSize;
            let sum = 0;
            for (let j = 0; j < blockSize; j += 4) {
              const sample = Math.abs(rawData[start + j] || 0);
              if (sample > sum) sum = sample;
            }
            peaks.push(sum);
            if (sum > maxPeak) maxPeak = sum;
          }

          const normalized = peaks.map((p) => Math.max(0.12, Math.min(1, p / maxPeak)));
          waveformCache.set(track.id, normalized);
          if (!cancelled) {
            setDecodedPeaks(normalized);
          }
          offlineCtx.close().catch(() => {});
        } catch {
          // Fallback to deterministic signature if decoding fails
          const fallback = generateDeterministicWaveform(track);
          waveformCache.set(track.id, fallback);
          if (!cancelled) setDecodedPeaks(fallback);
        }
      };
      reader.readAsArrayBuffer(track.file);
    } else {
      const generated = generateDeterministicWaveform(track);
      waveformCache.set(track.id, generated);
      setDecodedPeaks(generated);
    }

    return () => {
      cancelled = true;
    };
  }, [track?.id]);

  const peaks = useMemo(() => {
    return decodedPeaks || generateDeterministicWaveform(track);
  }, [decodedPeaks, track]);

  const formatTime = (secs: number) => {
    const clamped = Math.max(0, secs);
    const m = Math.floor(clamped / 60);
    const s = Math.floor(clamped % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const calculateRatioFromClientX = (clientX: number) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = clientX - rect.left;
    return Math.max(0, Math.min(1, relX / rect.width));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsScrubbing(true);
    const ratio = calculateRatioFromClientX(e.clientX);
    setHoverRatio(ratio);
    onSeek(ratio * safeDuration);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const ratio = calculateRatioFromClientX(e.clientX);
    setHoverRatio(ratio);
    if (isScrubbing) {
      onSeek(ratio * safeDuration);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isScrubbing) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setIsScrubbing(false);
    }
  };

  // Crossfade zone ratio (how much of the tail is inside the crossfade window)
  const crossfadeRatio =
    crossfadeSeconds > 0 && safeDuration > crossfadeSeconds
      ? crossfadeSeconds / safeDuration
      : 0;

  return (
    <div className="space-y-1.5 select-none">
      {/* Top Micro Status Strip: Waveform Toggle + Gapless / Crossfade Badges */}
      <div className="flex items-center justify-between text-[10px] font-mono">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setMode(mode === "waveform" ? "minimal" : "waveform")}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md border transition-colors ${
              isAmoled
                ? "bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700"
                : "bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-200"
            }`}
            title="Switch between Interactive Waveform and Minimal Seekbar"
          >
            {mode === "waveform" ? (
              <>
                <AudioWaveform size={11} style={{ color: accent.hex }} />
                <span>WAVEFORM SCRUB</span>
              </>
            ) : (
              <>
                <Minus size={11} style={{ color: accent.hex }} />
                <span>LINEAR BAR</span>
              </>
            )}
          </button>

          {track?.file && (
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
              style={{ backgroundColor: `${accent.hex}18`, color: accent.hex }}
            >
              PCM ANALYZED
            </span>
          )}
        </div>

        {/* Crossfade & Gapless status pills (clickable to open EQ/DSP settings) */}
        <div className="flex items-center gap-1.5">
          {gaplessEnabled && (
            <button
              onClick={onOpenEqualizer}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors ${
                isAmoled
                  ? "bg-neutral-950 border-neutral-800/80 text-neutral-400 hover:text-white"
                  : "bg-neutral-100 border-neutral-200 text-neutral-600 hover:text-black"
              }`}
              title="Gapless Playback Engine Active (Click to configure)"
            >
              <Zap size={9} style={{ color: accent.hex }} />
              <span>GAPLESS</span>
            </button>
          )}

          <button
            onClick={onOpenEqualizer}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-all ${
              isCrossfading
                ? "animate-pulse font-bold"
                : crossfadeSeconds > 0
                ? isAmoled
                  ? "bg-neutral-950 border-neutral-800 text-neutral-300"
                  : "bg-neutral-100 border-neutral-200 text-neutral-700"
                : isAmoled
                ? "bg-neutral-950/50 border-neutral-900 text-neutral-500 hover:text-neutral-300"
                : "bg-neutral-50 border-neutral-200 text-neutral-400 hover:text-neutral-700"
            }`}
            style={
              isCrossfading
                ? {
                    backgroundColor: `${accent.hex}25`,
                    borderColor: accent.hex,
                    color: accent.hex,
                  }
                : crossfadeSeconds > 0
                ? { borderColor: `${accent.hex}50`, color: accent.hex }
                : undefined
            }
            title="Configure Crossfade & Gapless Transitions"
          >
            <Shuffle size={9} />
            <span>
              {isCrossfading
                ? `CROSSFADING (${crossfadeSeconds}s)`
                : crossfadeSeconds > 0
                ? `XFADE ${crossfadeSeconds}s`
                : "XFADE OFF"}
            </span>
          </button>
        </div>
      </div>

      {/* Interactive Waveform or Minimal Seekbar */}
      {mode === "waveform" ? (
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            if (!isScrubbing) setHoverRatio(null);
          }}
          className={`relative h-16 w-full rounded-2xl border px-2.5 py-2 cursor-pointer overflow-hidden flex items-center transition-colors touch-none ${
            isAmoled
              ? "bg-neutral-950/90 border-neutral-900 hover:border-neutral-800"
              : "bg-white border-neutral-200 hover:border-neutral-300"
          }`}
        >
          {/* Crossfade Overlap Tail Highlight Zone */}
          {crossfadeRatio > 0 && (
            <div
              className="absolute top-0 bottom-0 right-0 pointer-events-none flex items-start justify-end p-1 transition-all"
              style={{
                width: `${crossfadeRatio * 100}%`,
                background: `linear-gradient(to right, transparent, ${accent.hex}22)`,
                borderLeft: `1px dashed ${accent.hex}66`,
              }}
            >
              <span
                className="text-[8px] font-mono font-bold tracking-wider uppercase px-1 rounded"
                style={{ color: accent.hex }}
              >
                MIX
              </span>
            </div>
          )}

          {/* Hover Scrub Timestamp Tooltip */}
          {hoverRatio !== null && (
            <div
              className="absolute top-1 z-20 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold pointer-events-none shadow-md transition-transform"
              style={{
                left: `${Math.max(8, Math.min(92, hoverRatio * 100))}%`,
                backgroundColor: accent.hex,
                color: isAmoled ? "#000000" : "#ffffff",
              }}
            >
              {formatTime(hoverRatio * safeDuration)}
            </div>
          )}

          {/* Hover Vertical Playhead Hairline */}
          {hoverRatio !== null && (
            <div
              className="absolute top-0 bottom-0 w-px z-10 pointer-events-none opacity-60"
              style={{
                left: `${hoverRatio * 100}%`,
                backgroundColor: accent.hex,
              }}
            />
          )}

          {/* Bars Container */}
          <div className="w-full h-full flex items-center justify-between gap-[2px] relative z-0">
            {peaks.map((peak, idx) => {
              const barRatio = idx / (peaks.length - 1);
              const isPlayed = barRatio <= progressRatio;
              const isHovered =
                hoverRatio !== null &&
                ((hoverRatio >= progressRatio && barRatio > progressRatio && barRatio <= hoverRatio) ||
                  (hoverRatio < progressRatio && barRatio >= hoverRatio && barRatio <= progressRatio));

              const mainHeightPercent = Math.round(peak * 70);
              const reflectionHeightPercent = Math.round(peak * 22);

              let barColor = isAmoled ? "#262626" : "#d4d4d8";
              if (isPlayed) {
                barColor = accent.hex;
              } else if (isHovered) {
                barColor = `${accent.hex}99`;
              }

              return (
                <div
                  key={idx}
                  className="flex-1 h-full flex flex-col items-center justify-center gap-[2px]"
                >
                  {/* Upper Main Peak */}
                  <div className="w-full flex-1 flex items-end justify-center">
                    <div
                      className="w-full rounded-t-full transition-all duration-75"
                      style={{
                        height: `${Math.max(12, mainHeightPercent)}%`,
                        backgroundColor: barColor,
                        boxShadow:
                          isPlayed && Math.abs(barRatio - progressRatio) < 0.025
                            ? `0 0 8px ${accent.glow}`
                            : undefined,
                      }}
                    />
                  </div>

                  {/* Lower Mirror Reflection (SoundCloud / Poweramp style) */}
                  <div className="w-full h-3 flex items-start justify-center opacity-35">
                    <div
                      className="w-full rounded-b-full transition-all duration-75"
                      style={{
                        height: `${Math.max(20, reflectionHeightPercent * 3)}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Minimal Linear Bar Fallback */
        <div className="relative group flex items-center py-2">
          <input
            type="range"
            min={0}
            max={safeDuration}
            step={0.1}
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer transition-all"
            style={{
              accentColor: accent.hex,
              background: `linear-gradient(to right, ${accent.hex} ${progressRatio * 100}%, ${
                isAmoled ? "#1f1f1f" : "#e2e8f0"
              } ${progressRatio * 100}%)`,
            }}
          />
        </div>
      )}

      {/* Timestamps Row */}
      <div className="flex items-center justify-between text-xs font-mono text-neutral-400 px-0.5">
        <span style={{ color: isScrubbing ? accent.hex : undefined }}>
          {formatTime(currentTime)}
        </span>
        <span className="text-[10px] text-neutral-500">
          {hoverRatio !== null
            ? `Scrubbing → ${formatTime(hoverRatio * safeDuration)}`
            : `-${formatTime(Math.max(0, safeDuration - currentTime))}`}
        </span>
        <span>{formatTime(safeDuration)}</span>
      </div>
    </div>
  );
};
