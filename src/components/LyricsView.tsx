import React, { useEffect, useRef } from "react";
import { Mic2, Sparkles, X, Music2 } from "lucide-react";
import { ThemeMode, AccentColor, Track } from "../types/player";

interface LyricsViewProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  currentTime: number;
  theme: ThemeMode;
  accent: AccentColor;
  onSeek: (seconds: number) => void;
  onDeepLyricAnalysis: () => void;
}

export const LyricsView: React.FC<LyricsViewProps> = ({
  isOpen,
  onClose,
  track,
  currentTime,
  theme,
  accent,
  onSeek,
  onDeepLyricAnalysis,
}) => {
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const isAmoled = theme === "amoled";
  const lyrics = track?.lyrics || [];

  // Find active lyric index
  let activeIndex = -1;
  for (let i = lyrics.length - 1; i >= 0; i--) {
    if (currentTime >= lyrics[i].time) {
      activeIndex = i;
      break;
    }
  }

  // Smooth auto-scroll to keep active line centered
  useEffect(() => {
    if (activeLineRef.current && scrollContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div
        className={`w-full max-w-2xl h-[80vh] flex flex-col rounded-3xl p-6 border shadow-2xl relative ${
          isAmoled
            ? "bg-black border-neutral-800 text-white"
            : "bg-white border-neutral-200 text-neutral-900"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: `${accent.hex}20`, color: accent.hex }}
            >
              <Mic2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Synchronized Lyrics</h2>
              <p className="text-xs text-neutral-400">
                {track?.title} &bull; {track?.artist}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onDeepLyricAnalysis}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105 active:scale-95"
              style={{
                backgroundColor: `${accent.hex}22`,
                color: accent.hex,
                border: `1px solid ${accent.hex}44`,
              }}
              title="Perform deep poetic and psychological lyric analysis with Gemini 4 Argon"
            >
              <Sparkles size={13} />
              Deep Meaning
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

        {/* Lyrics Scrollable Area */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto py-12 px-4 space-y-6 scrollbar-none text-center select-none"
        >
          {lyrics.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-500 py-16">
              <Music2 size={36} className="mb-3 opacity-40" />
              <p className="text-sm font-medium">No lyrics available for this audio file.</p>
              <p className="text-xs text-neutral-400 mt-1">
                Enjoy the acoustic procedural waveforms.
              </p>
            </div>
          ) : (
            lyrics.map((line, idx) => {
              const isActive = idx === activeIndex;
              const isPast = idx < activeIndex;

              return (
                <div
                  key={idx}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => onSeek(line.time)}
                  className={`cursor-pointer transition-all duration-300 py-1.5 px-4 rounded-xl inline-block max-w-xl ${
                    isActive
                      ? "text-2xl font-bold tracking-tight scale-105"
                      : isPast
                      ? "text-lg opacity-40 hover:opacity-75 font-medium"
                      : "text-lg opacity-25 hover:opacity-60 font-medium"
                  }`}
                  style={isActive ? { color: accent.hex } : undefined}
                >
                  {line.text}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-neutral-800/40 text-center text-xs text-neutral-500 shrink-0">
          Click any lyric line to jump directly to that timestamp
        </div>
      </div>
    </div>
  );
};
