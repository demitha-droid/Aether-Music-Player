import React, { useState } from "react";
import {
  ListMusic,
  Plus,
  Trash2,
  Upload,
  X,
  Music,
  Search,
  Check,
  Disc,
  HardDrive,
  Layers,
  Copy,
  Edit3,
  Clock,
} from "lucide-react";
import {
  ThemeMode,
  AccentColor,
  Track,
  Playlist,
  PlaybackQueueSession,
} from "../types/player";

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
  accent: AccentColor;
  queue: Track[];
  currentTrack: Track | null;
  currentTime: number;
  queues: PlaybackQueueSession[];
  activeQueueId: string;
  playlists: Playlist[];
  activePlaylistId: string;
  onSelectTrack: (track: Track) => void;
  onSwitchQueue: (queueId: string) => void;
  onCreateQueue: (name?: string) => void;
  onDuplicateQueue: (queueId: string) => void;
  onDeleteQueue: (queueId: string) => void;
  onRenameQueue: (queueId: string, newName: string) => void;
  onSelectPlaylist: (playlistId: string) => void;
  onRemoveFromQueue: (trackId: string) => void;
  onClearQueue: () => void;
  onUploadAudioFiles: (files: FileList | File[]) => void;
  onCreatePlaylist: (name: string) => void;
  onOpenFileManager?: () => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  isOpen,
  onClose,
  theme,
  accent,
  queue,
  currentTrack,
  currentTime,
  queues,
  activeQueueId,
  playlists,
  activePlaylistId,
  onSelectTrack,
  onSwitchQueue,
  onCreateQueue,
  onDuplicateQueue,
  onDeleteQueue,
  onRenameQueue,
  onSelectPlaylist,
  onRemoveFromQueue,
  onClearQueue,
  onUploadAudioFiles,
  onCreatePlaylist,
  onOpenFileManager,
}) => {
  const [activeTab, setActiveTab] = useState<"queue" | "playlists">("queue");
  const [searchQuery, setSearchQuery] = useState("");
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [showCreateInput, setShowCreateInput] = useState(false);

  // Multi-Queue Creation & Renaming State
  const [showNewQueueInput, setShowNewQueueInput] = useState(false);
  const [newQueueName, setNewQueueName] = useState("");
  const [editingQueueId, setEditingQueueId] = useState<string | null>(null);
  const [editingQueueName, setEditingQueueName] = useState("");

  if (!isOpen) return null;

  const isAmoled = theme === "amoled";

  const formatTime = (secs: number) => {
    const m = Math.floor(Math.max(0, secs) / 60);
    const s = Math.floor(Math.max(0, secs) % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadAudioFiles(e.target.files);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      onCreatePlaylist(newPlaylistName.trim());
      setNewPlaylistName("");
      setShowCreateInput(false);
    }
  };

  const handleCreateQueueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateQueue(newQueueName.trim() || undefined);
    setNewQueueName("");
    setShowNewQueueInput(false);
  };

  const handleRenameQueueSubmit = (e: React.FormEvent, qId: string) => {
    e.preventDefault();
    if (editingQueueName.trim()) {
      onRenameQueue(qId, editingQueueName.trim());
    }
    setEditingQueueId(null);
  };

  const filteredQueue = queue.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeQueueObj = queues.find((q) => q.id === activeQueueId);

  return (
    <div
      onClick={onClose}
      className="fixed inset-x-0 top-0 bottom-16 z-50 flex flex-col bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full h-full flex flex-col relative transition-all ${
          isAmoled
            ? "bg-black text-white"
            : "bg-white text-neutral-900"
        }`}
      >
        {/* Top Header */}
        <div className="p-4 px-5 border-b border-neutral-800/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${accent.hex}20`, color: accent.hex }}
            >
              <Layers size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold tracking-tight">Multi-Queue Studio</h2>
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold"
                  style={{ backgroundColor: `${accent.hex}22`, color: accent.hex }}
                >
                  {queues.length} QUEUES
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Active: <span className="font-semibold text-neutral-200">{activeQueueObj?.name || "Queue 1"}</span> &bull; Independent state memory
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <label
              className="p-2 rounded-full cursor-pointer hover:bg-neutral-800/30 transition-colors"
              title="Import Local Audio Files (MP3, WAV, FLAC)"
            >
              <Upload size={16} className="text-neutral-400 hover:text-white" />
              <input
                type="file"
                multiple
                accept="audio/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </label>

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

        {/* MUSICOLET-STYLE MULTI-QUEUE SWITCHER STRIP */}
        <div
          className={`px-4 py-3 border-b shrink-0 space-y-2 ${
            isAmoled ? "bg-neutral-950/80 border-neutral-900" : "bg-neutral-50/80 border-neutral-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Layers size={11} style={{ color: accent.hex }} />
              Independent Playback Queues (Saves Position)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onDuplicateQueue(activeQueueId)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border flex items-center gap-1 transition-colors ${
                  isAmoled
                    ? "bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white"
                    : "bg-white border-neutral-200 text-neutral-700 hover:text-black"
                }`}
                title="Clone active queue into a new independent queue"
              >
                <Copy size={10} />
                <span>Clone</span>
              </button>

              <button
                onClick={() => setShowNewQueueInput(!showNewQueueInput)}
                className="px-2 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 text-black transition-transform active:scale-95"
                style={{ backgroundColor: accent.hex }}
              >
                <Plus size={11} />
                <span>New Queue</span>
              </button>
            </div>
          </div>

          {/* New Queue Inline Form */}
          {showNewQueueInput && (
            <form onSubmit={handleCreateQueueSubmit} className="flex gap-1.5 pt-1">
              <input
                type="text"
                value={newQueueName}
                onChange={(e) => setNewQueueName(e.target.value)}
                placeholder="Queue name (e.g. Late Night Mix, Workout)..."
                autoFocus
                className={`flex-1 px-2.5 py-1 rounded-lg text-xs border focus:outline-none ${
                  isAmoled
                    ? "bg-black border-neutral-800 text-white"
                    : "bg-white border-neutral-300 text-black"
                }`}
              />
              <button
                type="submit"
                className="px-3 py-1 rounded-lg text-xs font-semibold text-black"
                style={{ backgroundColor: accent.hex }}
              >
                Create
              </button>
            </form>
          )}

          {/* Horizontal Scrollable Queue Cards */}
          <div className="flex items-stretch gap-2 overflow-x-auto pb-1 scrollbar-none">
            {queues.map((q, idx) => {
              const isSelected = q.id === activeQueueId;
              const rememberedTrack = q.tracks[q.currentTrackIndex] || q.tracks[0];
              const savedTimestamp = isSelected ? currentTime : q.savedProgressSeconds;

              return (
                <div
                  key={q.id}
                  onClick={() => {
                    if (!isSelected) onSwitchQueue(q.id);
                  }}
                  className={`min-w-[162px] max-w-[185px] p-2.5 rounded-xl border cursor-pointer transition-all shrink-0 flex flex-col justify-between ${
                    isSelected
                      ? isAmoled
                        ? "bg-neutral-900/95 text-white shadow-md"
                        : "bg-white text-black shadow-md"
                      : isAmoled
                      ? "bg-black/60 border-neutral-900 text-neutral-400 hover:border-neutral-800 hover:text-neutral-200"
                      : "bg-white/60 border-neutral-200 text-neutral-600 hover:border-neutral-300"
                  }`}
                  style={
                    isSelected
                      ? {
                          borderColor: accent.hex,
                          boxShadow: `0 0 12px ${accent.glow}`,
                        }
                      : undefined
                  }
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold shrink-0"
                          style={
                            isSelected
                              ? { backgroundColor: accent.hex, color: "#000" }
                              : { backgroundColor: isAmoled ? "#1f1f1f" : "#e5e7eb" }
                          }
                        >
                          Q{idx + 1}
                        </span>

                        {editingQueueId === q.id ? (
                          <form
                            onSubmit={(e) => handleRenameQueueSubmit(e, q.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1"
                          >
                            <input
                              type="text"
                              value={editingQueueName}
                              onChange={(e) => setEditingQueueName(e.target.value)}
                              onBlur={(e) => handleRenameQueueSubmit(e, q.id)}
                              autoFocus
                              className="w-20 bg-transparent border-b border-current text-[11px] font-semibold focus:outline-none"
                            />
                          </form>
                        ) : (
                          <span className="text-xs font-bold truncate">{q.name}</span>
                        )}
                      </div>

                      <div
                        className="flex items-center gap-0.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setEditingQueueId(q.id);
                            setEditingQueueName(q.name);
                          }}
                          className="p-0.5 text-neutral-500 hover:text-white transition-colors"
                          title="Rename Queue"
                        >
                          <Edit3 size={10} />
                        </button>
                        {queues.length > 1 && (
                          <button
                            onClick={() => onDeleteQueue(q.id)}
                            className="p-0.5 text-neutral-500 hover:text-red-400 transition-colors"
                            title="Delete Queue"
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Remembered Track Title */}
                    <p className="text-[10px] text-neutral-400 truncate">
                      {rememberedTrack ? rememberedTrack.title : "Empty queue"}
                    </p>
                  </div>

                  {/* Queue Footer: Track Count + Saved Timestamp */}
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-neutral-800/40 text-[9px] font-mono">
                    <span>{q.tracks.length} tracks</span>
                    <span
                      className="flex items-center gap-0.5 font-semibold"
                      style={isSelected ? { color: accent.hex } : undefined}
                    >
                      <Clock size={9} />
                      {formatTime(savedTimestamp)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex px-5 pt-2.5 border-b border-neutral-800/30 gap-4 shrink-0">
          <button
            onClick={() => setActiveTab("queue")}
            className={`pb-2 text-xs font-semibold tracking-wide border-b-2 transition-all ${
              activeTab === "queue"
                ? "border-current text-white"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
            style={activeTab === "queue" ? { borderColor: accent.hex, color: accent.hex } : undefined}
          >
            {activeQueueObj?.name || "Active Queue"} ({queue.length})
          </button>

          <button
            onClick={() => setActiveTab("playlists")}
            className={`pb-2 text-xs font-semibold tracking-wide border-b-2 transition-all ${
              activeTab === "playlists"
                ? "border-current text-white"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
            style={activeTab === "playlists" ? { borderColor: accent.hex, color: accent.hex } : undefined}
          >
            Playlists ({playlists.length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 px-4 shrink-0">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${
              isAmoled
                ? "bg-neutral-950 border-neutral-800 text-white"
                : "bg-neutral-50 border-neutral-200 text-neutral-900"
            }`}
          >
            <Search size={14} className="text-neutral-500 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search inside ${activeQueueObj?.name || "queue"}...`}
              className="w-full bg-transparent focus:outline-none placeholder-neutral-500 text-xs"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}>
                <X size={12} className="text-neutral-500 hover:text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Tab: Queue Content */}
        {activeTab === "queue" && (
          <div className="flex-1 overflow-y-auto px-4 py-1 space-y-1.5 scrollbar-thin">
            <div className="flex items-center justify-between px-2 py-1 text-[10px] text-neutral-500 font-mono">
              <span>TRACKS IN {activeQueueObj?.name.toUpperCase() || "QUEUE"}</span>
              {queue.length > 0 && (
                <button
                  onClick={onClearQueue}
                  className="hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <Trash2 size={11} />
                  Clear Queue
                </button>
              )}
            </div>

            {filteredQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-neutral-500">
                <Music size={32} className="mb-2 opacity-40" />
                <p className="text-xs">No tracks in this queue.</p>
              </div>
            ) : (
              filteredQueue.map((t) => {
                const isCurrent = currentTrack?.id === t.id;

                return (
                  <div
                    key={t.id}
                    onClick={() => onSelectTrack(t)}
                    className={`group flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all border ${
                      isCurrent
                        ? isAmoled
                          ? "bg-neutral-900/90 border-neutral-800 text-white shadow-sm"
                          : "bg-neutral-100 border-neutral-300 text-black shadow-sm"
                        : isAmoled
                        ? "bg-neutral-950/40 border-transparent hover:bg-neutral-900/60 hover:border-neutral-800/60"
                        : "bg-white border-transparent hover:bg-neutral-50 hover:border-neutral-200"
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-neutral-900 shrink-0">
                        <img
                          src={t.coverUrl}
                          alt={t.title}
                          className="w-full h-full object-cover"
                        />
                        {isCurrent && (
                          <div
                            className="absolute inset-0 bg-black/50 flex items-center justify-center"
                            style={{ color: accent.hex }}
                          >
                            <Disc size={16} className="animate-spin" />
                          </div>
                        )}
                      </div>

                      <div className="truncate">
                        <div
                          className="text-xs font-semibold truncate flex items-center gap-1.5"
                          style={isCurrent ? { color: accent.hex } : undefined}
                        >
                          {t.title}
                        </div>
                        <div className="text-[11px] text-neutral-400 truncate">
                          {t.artist} &bull; {t.genre}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-mono text-neutral-400">
                        {Math.floor(t.duration / 60)}:
                        {String(Math.floor(t.duration % 60)).padStart(2, "0")}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFromQueue(t.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-red-400 transition-all text-neutral-500"
                        title="Remove from queue"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab: Playlists Content */}
        {activeTab === "playlists" && (
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 scrollbar-thin">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[11px] text-neutral-500 font-mono">YOUR PLAYLISTS</span>
              <button
                onClick={() => setShowCreateInput(!showCreateInput)}
                className="text-[11px] font-medium flex items-center gap-1 transition-colors"
                style={{ color: accent.hex }}
              >
                <Plus size={12} />
                New Playlist
              </button>
            </div>

            {showCreateInput && (
              <form onSubmit={handleCreateSubmit} className="flex gap-2 p-2">
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="Playlist name..."
                  autoFocus
                  className={`flex-1 px-3 py-1.5 rounded-xl text-xs border focus:outline-none ${
                    isAmoled
                      ? "bg-neutral-900 border-neutral-800 text-white"
                      : "bg-neutral-100 border-neutral-300 text-black"
                  }`}
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-black"
                  style={{ backgroundColor: accent.hex }}
                >
                  Create
                </button>
              </form>
            )}

            {playlists.map((pl) => {
              const isActive = pl.id === activePlaylistId;

              return (
                <div
                  key={pl.id}
                  onClick={() => onSelectPlaylist(pl.id)}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border ${
                    isActive
                      ? isAmoled
                        ? "bg-neutral-900 border-neutral-800 text-white"
                        : "bg-neutral-100 border-neutral-300 text-black"
                      : isAmoled
                      ? "bg-neutral-950/40 border-transparent hover:bg-neutral-900/50"
                      : "bg-white border-transparent hover:bg-neutral-50"
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-900 shrink-0">
                      <img
                        src={pl.coverUrl || pl.tracks[0]?.coverUrl}
                        alt={pl.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="truncate">
                      <h4
                        className="text-xs font-semibold truncate"
                        style={isActive ? { color: accent.hex } : undefined}
                      >
                        {pl.name}
                      </h4>
                      <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                        {pl.description}
                      </p>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {pl.tracks.length} tracks
                      </span>
                    </div>
                  </div>

                  {isActive && <Check size={16} style={{ color: accent.hex }} />}
                </div>
              );
            })}
          </div>
        )}

        {/* Drag & Drop Audio Upload & Memory Explorer Footer Bar */}
        <div className="p-4 border-t border-neutral-800/40 shrink-0 space-y-2">
          {onOpenFileManager && (
            <button
              onClick={() => {
                onClose();
                onOpenFileManager();
              }}
              className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border text-xs font-semibold transition-all ${
                isAmoled
                  ? "bg-neutral-900 border-neutral-800 hover:bg-neutral-800 text-white"
                  : "bg-neutral-100 border-neutral-200 hover:bg-neutral-200 text-black"
              }`}
            >
              <HardDrive size={14} style={{ color: accent.hex }} />
              <span>Browse Device Memory Folders</span>
            </button>
          )}

          <label
            className={`flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-dashed cursor-pointer transition-all text-xs font-medium ${
              isAmoled
                ? "border-neutral-800 hover:border-neutral-700 bg-neutral-950/80 text-neutral-300"
                : "border-neutral-300 hover:border-neutral-400 bg-neutral-50 text-neutral-700"
            }`}
          >
            <Upload size={14} style={{ color: accent.hex }} />
            <span>Drop or Click to Import Local Audio</span>
            <input
              type="file"
              multiple
              accept="audio/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
