import React from "react";
import { Disc, Pause, Play, SkipForward } from "lucide-react";
import { AccentColor, ThemeMode, Track } from "../types/player";

interface HyperIslandProps {
  track: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  theme: ThemeMode;
  accent: AccentColor;
  onExpand: () => void;
  onTogglePlayPause: () => void;
  onSkipNext: () => void;
}

export const HyperIsland: React.FC<HyperIslandProps> = ({
  track,
  isPlaying,
  currentTime,
  duration,
  theme,
  accent,
  onExpand,
  onTogglePlayPause,
  onSkipNext,
}) => {
  if (!track) return null;

  const isAmoled = theme === "amoled";
  const progress =
    duration > 0 ? Math.max(0, Math.min(100, (currentTime / duration) * 100)) : 0;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[58] pt-safe pointer-events-none select-none"
    >
      <div className="w-full max-w-sm mx-auto h-[52px] px-4 flex items-center justify-center">
        <div
          onClick={onExpand}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onExpand();
          }}
          className={`pointer-events-auto relative w-full max-w-[310px] h-10 rounded-full px-2.5 flex items-center justify-between gap-2 cursor-pointer overflow-hidden active:scale-[0.98] transition-transform ${
            isAmoled ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-900"
          }`}
        >
          {/* Left: Disc + Track Title/Artist */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: accent.hex, color: "#000000" }}
            >
              <Disc size={14} className={isPlaying ? "animate-spin" : ""} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold truncate leading-tight">
                {track.title}
              </div>
              <div className="text-[9px] text-neutral-400 truncate leading-tight">
                {track.artist}
              </div>
            </div>
          </div>

          {/* Right: Compact Transport */}
          <div
            className="flex items-center gap-1 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onTogglePlayPause}
              className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{ backgroundColor: accent.hex, color: "#000000" }}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause size={12} fill="currentColor" />
              ) : (
                <Play size={12} fill="currentColor" className="ml-0.5" />
              )}
            </button>

            <button
              onClick={onSkipNext}
              className={`w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform ${
                isAmoled ? "bg-black text-neutral-200" : "bg-white text-neutral-800"
              }`}
              aria-label="Next track"
            >
              <SkipForward size={12} />
            </button>
          </div>

          {/* Bottom flat hairline progress inside island */}
          <div className="absolute bottom-0 left-3 right-3 h-[2px] bg-black/30 overflow-hidden rounded-full">
            <div
              className="h-full transition-all duration-200"
              style={{
                width: `${progress}%`,
                backgroundColor: accent.hex,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
