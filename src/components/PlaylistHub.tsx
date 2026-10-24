import React, { useState } from "react";
import {
  ListMusic,
  Plus,
  Play,
  Shuffle,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  Clock,
  Disc,
  ListPlus,
  ChevronLeft,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";
import { ThemeMode, AccentColor, Track, Playlist } from "../types/player";

interface PlaylistHubProps {
  playlists: Playlist[];
  activePlaylistId: string;
  currentTrack: Track | null;
  theme: ThemeMode;
  accent: AccentColor;
  onSelectPlaylist: (playlistId: string) => void;
  onPlayPlaylist: (playlist: Playlist, shuffle?: boolean) => void;
  onCreatePlaylist: (name: string, description: string, coverUrl?: string) => void;
  onDeletePlaylist: (playlistId: string) => void;
  onReorderTrack: (playlistId: string, fromIndex: number, toIndex: number) => void;
  onRemoveTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  onPlayTrack: (track: Track) => void;
  onEnqueueTrack: (track: Track) => void;
}

const PRESET_COVERS = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80",
];

export const PlaylistHub: React.FC<PlaylistHubProps> = ({
  playlists,
  activePlaylistId,
  currentTrack,
  theme,
  accent,
  onSelectPlaylist,
  onPlayPlaylist,
  onCreatePlaylist,
  onDeletePlaylist,
  onReorderTrack,
  onRemoveTrackFromPlaylist,
  onPlayTrack,
  onEnqueueTrack,
}) => {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [selectedCover, setSelectedCover] = useState(PRESET_COVERS[0]);

  const isAmoled = theme === "amoled";

  const activePlaylist = playlists.find((p) => p.id === (selectedPlaylistId || activePlaylistId)) || playlists[0];

  const calculateTotalDuration = (tracks: Track[]) => {
    const totalSecs = tracks.reduce((acc, t) => acc + (t.duration || 180), 0);
    const mins = Math.floor(totalSecs / 60);
    return `${mins} mins`;
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      onCreatePlaylist(newTitle.trim(), newDescription.trim(), selectedCover);
      setNewTitle("");
      setNewDescription("");
      setIsCreating(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 flex flex-col space-y-6 pb-24 select-none">
      {/* Top Header & Creation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {selectedPlaylistId && (
            <button
              onClick={() => setSelectedPlaylistId(null)}
              className={`p-2 rounded-xl border transition-colors ${
                isAmoled
                  ? "bg-neutral-950 border-neutral-800 hover:bg-neutral-900 text-white"
                  : "bg-neutral-100 border-neutral-200 hover:bg-neutral-200 text-black"
              }`}
              title="Back to Playlists Overview"
            >
              <ChevronLeft size={18} />
            </button>
          )}

          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: `${accent.hex}20`, color: accent.hex }}
          >
            <ListMusic size={20} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">
                {selectedPlaylistId ? activePlaylist.name : "Playlist Hub"}
              </h2>
              <span
                className="px-2 py-0.5 text-[10px] font-mono rounded-full font-semibold uppercase tracking-wider"
                style={{ backgroundColor: `${accent.hex}22`, color: accent.hex }}
              >
                {playlists.length} Collections
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              {selectedPlaylistId
                ? activePlaylist.description || "Custom track collection"
                : "Create, organize, reorder, and play your custom audio collections"}
            </p>
          </div>
        </div>

        {!selectedPlaylistId && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-black transition-all hover:scale-105 active:scale-95 shadow-md"
            style={{ backgroundColor: accent.hex }}
          >
            <Plus size={15} />
            <span>Create New Playlist</span>
          </button>
        )}
      </div>

      {/* Creation Modal / Drawer */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl relative ${
              isAmoled
                ? "bg-black border-neutral-800 text-white"
                : "bg-white border-neutral-200 text-neutral-900"
            }`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800/40">
              <h3 className="text-base font-semibold tracking-tight">Create Custom Playlist</h3>
              <button
                onClick={() => setIsCreating(false)}
                className="p-1.5 rounded-full hover:bg-neutral-800/40 text-neutral-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1">
                  Playlist Name *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Midnight Cyber Drive"
                  className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none ${
                    isAmoled
                      ? "bg-neutral-950 border-neutral-800 text-white"
                      : "bg-neutral-50 border-neutral-300 text-black"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g. Synthesized lo-fi and deep bass anthems"
                  className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none ${
                    isAmoled
                      ? "bg-neutral-950 border-neutral-800 text-white"
                      : "bg-neutral-50 border-neutral-300 text-black"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-2">
                  Select Cover Artwork
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_COVERS.map((cover, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedCover(cover)}
                      className={`w-12 h-12 rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                        selectedCover === cover
                          ? "scale-105"
                          : "opacity-60 border-transparent hover:opacity-100"
                      }`}
                      style={selectedCover === cover ? { borderColor: accent.hex } : undefined}
                    >
                      <img src={cover} alt="Cover" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-black"
                  style={{ backgroundColor: accent.hex }}
                >
                  Save Playlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW A: Playlists Overview Grid (When no playlist selected) */}
      {!selectedPlaylistId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {playlists.map((pl) => {
            const isActive = pl.id === activePlaylistId;

            return (
              <div
                key={pl.id}
                onClick={() => setSelectedPlaylistId(pl.id)}
                className={`group flex flex-col p-4 rounded-3xl border cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                  isAmoled
                    ? "bg-neutral-950/80 border-neutral-800/90 hover:border-neutral-700 shadow-lg shadow-black/80"
                    : "bg-white border-neutral-200/90 hover:border-neutral-300 shadow-md"
                }`}
              >
                {/* Artwork Banner */}
                <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-4 bg-neutral-900">
                  <img
                    src={pl.coverUrl || pl.tracks[0]?.coverUrl}
                    alt={pl.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Play Button Overlay */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayPlaylist(pl);
                    }}
                    className="absolute bottom-3 right-3 w-12 h-12 rounded-full flex items-center justify-center text-black shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0"
                    style={{ backgroundColor: accent.hex }}
                    title="Play Playlist"
                  >
                    <Play size={20} fill="currentColor" className="ml-0.5" />
                  </button>

                  {/* Track Count Badge */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold backdrop-blur-md bg-black/60 text-white border border-white/10">
                    {pl.tracks.length} tracks &bull; {calculateTotalDuration(pl.tracks)}
                  </div>
                </div>

                {/* Playlist Info */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3
                      className="text-base font-bold truncate"
                      style={isActive ? { color: accent.hex } : undefined}
                    >
                      {pl.name}
                    </h3>
                    <p className="text-xs text-neutral-400 line-clamp-2 mt-0.5">
                      {pl.description || "Custom track collection"}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-800/30 flex items-center justify-between text-xs font-mono text-neutral-500">
                    <span>{pl.isCustom ? "Custom Collection" : "Master Discography"}</span>
                    <span className="text-xs group-hover:translate-x-1 transition-transform" style={{ color: accent.hex }}>
                      View Details &rarr;
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW B: Selected Playlist Detail View */}
      {selectedPlaylistId && activePlaylist && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Hero Banner */}
          <div
            className={`p-6 rounded-3xl border flex flex-col sm:flex-row items-center gap-6 ${
              isAmoled
                ? "bg-neutral-950/90 border-neutral-800"
                : "bg-white border-neutral-200"
            }`}
          >
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden bg-neutral-900 shrink-0 border border-white/10 shadow-xl">
              <img
                src={activePlaylist.coverUrl || activePlaylist.tracks[0]?.coverUrl}
                alt={activePlaylist.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <span
                className="text-xs font-mono font-semibold uppercase tracking-wider"
                style={{ color: accent.hex }}
              >
                {activePlaylist.isCustom ? "Custom Playlist" : "Studio Collection"}
              </span>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {activePlaylist.name}
              </h1>

              <p className="text-xs sm:text-sm text-neutral-400 max-w-xl">
                {activePlaylist.description || "Curated audio tracks in custom order."}
              </p>

              <div className="text-xs font-mono text-neutral-500 pt-1">
                {activePlaylist.tracks.length} Tracks &bull; Total Duration: {calculateTotalDuration(activePlaylist.tracks)}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-3">
                <button
                  onClick={() => onPlayPlaylist(activePlaylist, false)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-black transition-all hover:scale-105 active:scale-95 shadow-lg"
                  style={{ backgroundColor: accent.hex }}
                >
                  <Play size={16} fill="currentColor" />
                  <span>Play All</span>
                </button>

                <button
                  onClick={() => onPlayPlaylist(activePlaylist, true)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold border transition-all ${
                    isAmoled
                      ? "bg-neutral-900 border-neutral-800 hover:bg-neutral-800 text-white"
                      : "bg-neutral-100 border-neutral-300 hover:bg-neutral-200 text-black"
                  }`}
                >
                  <Shuffle size={15} />
                  <span>Shuffle Play</span>
                </button>

                {activePlaylist.isCustom && (
                  <button
                    onClick={() => {
                      onDeletePlaylist(activePlaylist.id);
                      setSelectedPlaylistId(null);
                    }}
                    className="p-2.5 rounded-full text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete Custom Playlist"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Track Table */}
          <div
            className={`rounded-3xl border overflow-hidden ${
              isAmoled ? "bg-neutral-950/60 border-neutral-900" : "bg-white border-neutral-200"
            }`}
          >
            {/* Table Header */}
            <div
              className={`grid grid-cols-12 gap-3 px-6 py-3 border-b text-[11px] font-mono uppercase tracking-wider text-neutral-400 ${
                isAmoled ? "bg-neutral-950 border-neutral-900" : "bg-neutral-100 border-neutral-200"
              }`}
            >
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-6">Track Title &amp; Artist</div>
              <div className="col-span-2">Genre</div>
              <div className="col-span-1 text-right">Time</div>
              <div className="col-span-2 text-right pr-2">Reorder &amp; Manage</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-neutral-800/20">
              {activePlaylist.tracks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-neutral-500">
                  <ListMusic size={36} className="mb-2 opacity-30" />
                  <p className="text-xs font-medium">This playlist is currently empty.</p>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Add tracks from Memory Explorer or Queue into this playlist.
                  </p>
                </div>
              ) : (
                activePlaylist.tracks.map((t, idx) => {
                  const isCurrent = currentTrack?.id === t.id;

                  return (
                    <div
                      key={t.id}
                      className={`grid grid-cols-12 gap-3 px-6 py-3 items-center group transition-colors cursor-pointer ${
                        isCurrent
                          ? isAmoled
                            ? "bg-neutral-900 font-semibold"
                            : "bg-neutral-100 font-semibold"
                          : isAmoled
                          ? "hover:bg-neutral-900/40"
                          : "hover:bg-neutral-50"
                      }`}
                      onClick={() => onPlayTrack(t)}
                    >
                      {/* Index / Audio Icon */}
                      <div className="col-span-1 flex items-center justify-center font-mono text-xs text-neutral-500">
                        {isCurrent ? (
                          <Disc size={15} className="animate-spin" style={{ color: accent.hex }} />
                        ) : (
                          idx + 1
                        )}
                      </div>

                      {/* Track Title */}
                      <div className="col-span-6 flex items-center gap-3 truncate">
                        <img
                          src={t.coverUrl}
                          alt={t.title}
                          className="w-9 h-9 rounded-xl object-cover shrink-0"
                        />
                        <div className="truncate">
                          <div
                            className="text-xs font-semibold truncate"
                            style={isCurrent ? { color: accent.hex } : undefined}
                          >
                            {t.title}
                          </div>
                          <div className="text-[11px] text-neutral-400 truncate">
                            {t.artist}
                          </div>
                        </div>
                      </div>

                      {/* Genre */}
                      <div className="col-span-2 text-xs font-mono text-neutral-400 truncate">
                        {t.genre}
                      </div>

                      {/* Duration */}
                      <div className="col-span-1 text-right text-xs font-mono tabular-nums text-neutral-400">
                        {Math.floor((t.duration || 180) / 60)}:
                        {String(Math.floor((t.duration || 180) % 60)).padStart(2, "0")}
                      </div>

                      {/* Reorder & Action Controls */}
                      <div
                        className="col-span-2 flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Move Up */}
                        <button
                          disabled={idx === 0}
                          onClick={() => onReorderTrack(activePlaylist.id, idx, idx - 1)}
                          className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white disabled:opacity-20"
                          title="Move Up"
                        >
                          <ArrowUp size={13} />
                        </button>

                        {/* Move Down */}
                        <button
                          disabled={idx === activePlaylist.tracks.length - 1}
                          onClick={() => onReorderTrack(activePlaylist.id, idx, idx + 1)}
                          className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white disabled:opacity-20"
                          title="Move Down"
                        >
                          <ArrowDown size={13} />
                        </button>

                        {/* Enqueue */}
                        <button
                          onClick={() => onEnqueueTrack(t)}
                          className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
                          title="Add to Queue"
                        >
                          <ListPlus size={13} />
                        </button>

                        {/* Remove from Playlist */}
                        <button
                          onClick={() => onRemoveTrackFromPlaylist(activePlaylist.id, t.id)}
                          className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-red-400"
                          title="Remove from Playlist"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
