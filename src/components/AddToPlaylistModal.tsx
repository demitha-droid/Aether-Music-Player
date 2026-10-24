import React, { useState } from "react";
import { ListMusic, Plus, Check, X, Disc } from "lucide-react";
import { ThemeMode, AccentColor, Track, Playlist } from "../types/player";

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  playlists: Playlist[];
  theme: ThemeMode;
  accent: AccentColor;
  onAddTrackToPlaylist: (playlistId: string, track: Track) => void;
  onCreateAndAddTrack: (playlistName: string, track: Track) => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  isOpen,
  onClose,
  track,
  playlists,
  theme,
  accent,
  onAddTrackToPlaylist,
  onCreateAndAddTrack,
}) => {
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [addedPlaylistIds, setAddedPlaylistIds] = useState<Set<string>>(new Set());

  if (!isOpen || !track) return null;

  const isAmoled = theme === "amoled";

  const handleSelectPlaylist = (playlistId: string) => {
    onAddTrackToPlaylist(playlistId, track);
    setAddedPlaylistIds((prev) => new Set(prev).add(playlistId));
    setTimeout(() => {
      onClose();
      setAddedPlaylistIds(new Set());
    }, 1000);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      onCreateAndAddTrack(newPlaylistName.trim(), track);
      setNewPlaylistName("");
      setIsCreatingNew(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-sm rounded-3xl p-5 border shadow-2xl relative ${
          isAmoled
            ? "bg-black border-neutral-800 text-white"
            : "bg-white border-neutral-200 text-neutral-900"
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800/40">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${accent.hex}20`, color: accent.hex }}
            >
              <ListMusic size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Add to Playlist</h3>
              <p className="text-[11px] text-neutral-400 truncate max-w-[200px]">
                {track.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors ${
              isAmoled ? "hover:bg-neutral-900 text-neutral-400" : "hover:bg-neutral-100 text-neutral-600"
            }`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Existing Playlists List */}
        <div className="py-3 space-y-1.5 max-h-60 overflow-y-auto scrollbar-thin">
          {playlists.map((pl) => {
            const isAdded = addedPlaylistIds.has(pl.id);
            const alreadyInPlaylist = pl.tracks.some((t) => t.id === track.id);

            return (
              <button
                key={pl.id}
                onClick={() => handleSelectPlaylist(pl.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-2xl border text-left transition-all ${
                  isAdded
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                    : isAmoled
                    ? "bg-neutral-950/60 border-neutral-900 hover:bg-neutral-900/80 text-white"
                    : "bg-neutral-50 border-neutral-200 hover:bg-neutral-100 text-neutral-900"
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-neutral-900 shrink-0">
                    <img
                      src={pl.coverUrl || track.coverUrl}
                      alt={pl.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-semibold truncate">{pl.name}</div>
                    <div className="text-[10px] text-neutral-400">
                      {pl.tracks.length} tracks {alreadyInPlaylist && "&bull; Already added"}
                    </div>
                  </div>
                </div>

                {isAdded ? (
                  <Check size={16} className="text-emerald-400" />
                ) : (
                  <Plus size={14} className="text-neutral-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Create New Playlist option */}
        <div className="pt-2 border-t border-neutral-800/40">
          {!isCreatingNew ? (
            <button
              onClick={() => setIsCreatingNew(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-black transition-all"
              style={{ backgroundColor: accent.hex }}
            >
              <Plus size={14} />
              <span>Create New Playlist</span>
            </button>
          ) : (
            <form onSubmit={handleCreateSubmit} className="space-y-2">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Playlist name..."
                autoFocus
                className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                  isAmoled
                    ? "bg-neutral-950 border-neutral-800 text-white"
                    : "bg-neutral-50 border-neutral-300 text-black"
                }`}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-1.5 rounded-xl text-xs font-semibold text-black"
                  style={{ backgroundColor: accent.hex }}
                >
                  Save &amp; Add
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
