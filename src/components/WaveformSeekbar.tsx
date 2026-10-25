import React, { useState, useEffect, useRef, useMemo } from "react";
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

const BAR_COUNT = 64;
const waveformCache = new Map<string, number[]>();

function generateDeterministicWaveform(track: Track | null): number[] {
  if (!track) {
    return Array.from({ length: BAR_COUNT }, () => 0.2);
  }

  const seedStr = `${track.id}-${track.title}-${track.fileSize || 0}`;
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
    const pos = i / (BAR_COUNT - 1);
    let envelope = 0.55;
    if (pos < 0.08) {
      envelope = 0.22 + (pos / 0.08) * 0.4;
    } else if (pos < 0.28) {
      envelope = 0.52 + Math.sin(pos * 28) * 0.12;
    } else if (pos < 0.52) {
      envelope = 0.82 + Math.sin(pos * 45) * 0.14;
    } else if (pos < 0.66) {
      envelope = 0.36 + Math.cos(pos * 20) * 0.1;
    } else if (pos < 0.88) {
      envelope = 0.88 + Math.sin(pos * 50) * 0.1;
    } else {
      envelope = Math.max(0.16, 0.75 * (1 - (pos - 0.88) / 0.12));
    }

    const jitter = (nextRand() - 0.45) * 0.3;
    const val = Math.max(0.14, Math.min(1.0, envelope + jitter));
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
  const safeDuration = duration > 0 ? duration : track?.duration || 0;
  const progressRatio =
    safeDuration > 0 ? Math.max(0, Math.min(1, currentTime / safeDuration)) : 0;

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
          const AudioCtx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
              .webkitAudioContext;
          const offlineCtx = new AudioCtx();
          const audioBuffer = await offlineCtx.decodeAudioData(
            e.target.result as ArrayBuffer
          );
          const rawData = audioBuffer.getChannelData(0);
          const blockSize = Math.floor(rawData.length / BAR_COUNT);
          const peaks: number[] = [];

          let maxPeak = 0.01;
          for (let i = 0; i < BAR_COUNT; i++) {
            const start = i * blockSize;
            let sum = 0;
            for (let j = 0; j < blockSize; j += 8) {
              const sample = Math.abs(rawData[start + j] || 0);
              if (sample > sum) sum = sample;
            }
            peaks.push(sum);
            if (sum > maxPeak) maxPeak = sum;
          }

          const normalized = peaks.map((p) =>
            Math.max(0.14, Math.min(1, p / maxPeak))
          );
          waveformCache.set(track.id, normalized);
          if (!cancelled) {
            setDecodedPeaks(normalized);
          }
          offlineCtx.close().catch(() => {});
        } catch {
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
    const clamped = Math.max(0, Math.floor(secs || 0));
    const m = Math.floor(clamped / 60);
    const s = clamped % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const calculateRatioFromClientX = (clientX: number) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = clientX - rect.left;
    return Math.max(0, Math.min(1, relX / rect.width));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!track || safeDuration <= 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsScrubbing(true);
    const ratio = calculateRatioFromClientX(e.clientX);
    setHoverRatio(ratio);
    onSeek(ratio * safeDuration);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!track || safeDuration <= 0) return;
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
      setHoverRatio(null);
    }
  };

  return (
    <div className="w-full space-y-1.5 select-none">
      {/* Unboxed Flat Status Text Strip */}
      <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 px-0.5">
        <button
          onClick={() => setMode(mode === "waveform" ? "minimal" : "waveform")}
          className="uppercase tracking-wider hover:text-neutral-300 transition-colors"
          style={{ color: accent.hex }}
        >
          {mode === "waveform" ? "Waveform" : "Linear"}
          {track?.file ? " · Local Audio" : ""}
        </button>

        <button
          onClick={onOpenEqualizer}
          className="uppercase tracking-wider hover:text-neutral-300 transition-colors"
          style={isCrossfading ? { color: accent.hex } : undefined}
        >
          {gaplessEnabled ? "Gapless" : "Standard"} ·{" "}
          {crossfadeSeconds > 0 ? `XFade ${crossfadeSeconds}s` : "XFade Off"}
        </button>
      </div>

      {/* Pure Flat Seekbar Surface (Zero borders, zero shadows, zero glows) */}
      {mode === "waveform" ? (
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            if (!isScrubbing) setHoverRatio(null);
          }}
          className={`relative h-12 w-full rounded-xl px-2.5 py-2 cursor-pointer overflow-hidden flex items-center touch-none ${
            isAmoled ? "bg-neutral-900" : "bg-neutral-200/80"
          }`}
        >
          <div className="w-full h-full flex items-center justify-between gap-[2px]">
            {peaks.map((peak, idx) => {
              const barRatio = idx / (peaks.length - 1);
              const isPlayed = barRatio <= progressRatio && safeDuration > 0;
              const isHovered =
                hoverRatio !== null &&
                ((hoverRatio >= progressRatio &&
                  barRatio > progressRatio &&
                  barRatio <= hoverRatio) ||
                  (hoverRatio < progressRatio &&
                    barRatio >= hoverRatio &&
                    barRatio <= progressRatio));

              const heightPercent = Math.max(16, Math.round(peak * 88));

              let barColor = isAmoled ? "#262626" : "#cbd5e1";
              if (isPlayed) {
                barColor = accent.hex;
              } else if (isHovered) {
                barColor = `${accent.hex}99`;
              }

              return (
                <div
                  key={idx}
                  className="flex-1 h-full flex items-center justify-center"
                >
                  <div
                    className="w-full rounded-full transition-colors duration-75"
                    style={{
                      height: `${heightPercent}%`,
                      backgroundColor: barColor,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          className={`h-12 w-full rounded-xl px-3 flex items-center ${
            isAmoled ? "bg-neutral-900" : "bg-neutral-200/80"
          }`}
        >
          <input
            type="range"
            min={0}
            max={safeDuration || 1}
            step={0.1}
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
            style={{
              accentColor: accent.hex,
              background: `linear-gradient(to right, ${accent.hex} ${
                progressRatio * 100
              }%, ${isAmoled ? "#262626" : "#cbd5e1"} ${progressRatio * 100}%)`,
            }}
          />
        </div>
      )}

      {/* Timestamps Row */}
      <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 px-0.5 tabular-nums">
        <span style={{ color: isScrubbing ? accent.hex : undefined }}>
          {formatTime(currentTime)}
        </span>
        <span className="text-[10px] text-neutral-500">
          {hoverRatio !== null && safeDuration > 0
            ? formatTime(hoverRatio * safeDuration)
            : safeDuration > 0
            ? `-${formatTime(Math.max(0, safeDuration - currentTime))}`
            : "0:00"}
        </span>
        <span>{formatTime(safeDuration)}</span>
      </div>
    </div>
  );
};
