import React, { useState } from "react";
import { ListMusic, Plus, Play, Disc, Sparkles, ChevronUp, ChevronDown } from "lucide-react";
import { ThemeMode, AccentColor, Playlist } from "../types/player";

interface PermanentPlaylistBarProps {
  playlists: Playlist[];
  activePlaylistId: string;
  theme: ThemeMode;
  accent: AccentColor;
  onSelectPlaylist: (playlistId: string) => void;
  onPlayPlaylist: (playlist: Playlist, shuffle?: boolean) => void;
  onOpenPlaylistHub: () => void;
  onCreatePlaylist: (name: string) => void;
}

export const PermanentPlaylistBar: React.FC<PermanentPlaylistBarProps> = ({
  playlists,
  activePlaylistId,
  theme,
  accent,
  onSelectPlaylist,
  onPlayPlaylist,
  onOpenPlaylistHub,
  onCreatePlaylist,
}) => {
  const [isCreatingQuick, setIsCreatingQuick] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);

  const isAmoled = theme === "amoled";

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickName.trim()) {
      onCreatePlaylist(quickName.trim());
      setQuickName("");
      setIsCreatingQuick(false);
    }
  };

  return (
    <div
      className={`fixed left-0 right-0 z-[55] transition-all duration-300 border-t backdrop-blur-xl ${
        isAmoled
          ? "bg-black/95 border-neutral-800 text-white"
          : "bg-white/95 border-neutral-200 text-neutral-900"
      }`}
      style={{
        bottom: "64px", // Positioned directly above the 64px BottomNavBar
      }}
    >
      <div className="max-w-sm mx-auto px-3 py-1.5 flex items-center justify-between gap-2">
        {/* Left: Section Badge & Expand Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenPlaylistHub}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold font-mono tracking-tight transition-all hover:scale-105"
            style={{
              backgroundColor: `${accent.hex}22`,
              color: accent.hex,
              border: `1px solid ${accent.hex}40`,
            }}
            title="Open Full Playlist Hub"
          >
            <ListMusic size={13} />
            <span className="hidden sm:inline uppercase">Playlists</span>
            <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-black/40 text-white font-mono">
              {playlists.length}
            </span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg text-neutral-400 hover:text-white transition-colors"
            title={isExpanded ? "Collapse Playlist Dock" : "Expand Playlist Dock"}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>

        {/* Center: Scrollable Permanent Playlist Chips */}
        {isExpanded && (
          <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5 px-1">
            {playlists.map((pl) => {
              const isActive = pl.id === activePlaylistId;

              return (
                <div
                  key={pl.id}
                  onClick={() => {
                    onSelectPlaylist(pl.id);
                  }}
                  className={`flex items-center gap-2 px-2.5 py-1 rounded-xl border cursor-pointer shrink-0 transition-all group ${
                    isActive
                      ? "font-semibold shadow-md"
                      : isAmoled
                      ? "bg-neutral-950/80 border-neutral-800/80 text-neutral-400 hover:text-white hover:border-neutral-700"
                      : "bg-neutral-100/80 border-neutral-200/80 text-neutral-600 hover:text-black hover:border-neutral-300"
                  }`}
                  style={
                    isActive
                      ? {
                          borderColor: accent.hex,
                          backgroundColor: `${accent.hex}15`,
                          color: isAmoled ? "#ffffff" : "#000000",
                          boxShadow: `0 0 10px ${accent.glow}`,
                        }
                      : undefined
                  }
                >
                  <img
                    src={
                      pl.coverUrl ||
                      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80"
                    }
                    alt={pl.name}
                    className="w-5 h-5 rounded-md object-cover shrink-0"
                  />

                  <span className="text-[11px] truncate max-w-[110px] sm:max-w-[140px]">
                    {pl.name}
                  </span>

                  <span className="text-[9px] font-mono opacity-60">
                    ({pl.tracks.length})
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayPlaylist(pl, false);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-full text-black transition-opacity ml-0.5"
                    style={{ backgroundColor: accent.hex }}
                    title={`Play ${pl.name}`}
                  >
                    <Play size={10} fill="currentColor" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Right: Quick Create Button */}
        {isExpanded && (
          <div className="shrink-0 flex items-center">
            {!isCreatingQuick ? (
              <button
                onClick={() => setIsCreatingQuick(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold tracking-tight text-black transition-all hover:scale-105"
                style={{ backgroundColor: accent.hex }}
                title="Create New Playlist"
              >
                <Plus size={12} />
                <span className="hidden md:inline">New Playlist</span>
              </button>
            ) : (
              <form onSubmit={handleCreateSubmit} className="flex items-center gap-1">
                <input
                  type="text"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  placeholder="Name..."
                  autoFocus
                  className={`w-24 px-2 py-0.5 rounded-lg text-[10px] border focus:outline-none ${
                    isAmoled
                      ? "bg-black border-neutral-800 text-white"
                      : "bg-white border-neutral-300 text-black"
                  }`}
                />
                <button
                  type="submit"
                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-black"
                  style={{ backgroundColor: accent.hex }}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingQuick(false)}
                  className="px-1.5 py-0.5 text-[10px] text-neutral-400 hover:text-white"
                >
                  &times;
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
