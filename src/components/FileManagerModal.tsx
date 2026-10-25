import React, { useState, useMemo } from "react";
import {
  Folder,
  ChevronRight,
  HardDrive,
  Play,
  ListPlus,
  Trash2,
  Upload,
  X,
  Search,
  Disc,
  FolderPlus,
  ArrowLeft,
  ArrowUp,
  FileAudio,
  Info,
  ArrowUpDown,
  Check,
  Sparkles,
  Music,
  Download,
  Mic,
  BookOpen,
  MoreVertical,
  SlidersHorizontal,
} from "lucide-react";
import { ThemeMode, AccentColor, Track, MemoryFolder } from "../types/player";

interface FileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
  accent: AccentColor;
  currentTrack: Track | null;
  folders: MemoryFolder[];
  allTracks: Track[];
  onPlayTrack: (track: Track) => void;
  onEnqueueTrack: (track: Track) => void;
  onEnqueueMultiple: (tracks: Track[]) => void;
  onPlayMultiple: (tracks: Track[]) => void;
  onImportTracks: (files: FileList | File[], targetFolderId: string) => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onDeleteTrackFromMemory: (trackId: string) => void;
}

type SortField = "name" | "size" | "date" | "type";
type SpecialLocation = "this-pc" | "all-files" | string; // folderId

export const FileManagerModal: React.FC<FileManagerModalProps> = ({
  isOpen,
  onClose,
  theme,
  accent,
  currentTrack,
  folders,
  allTracks,
  onPlayTrack,
  onEnqueueTrack,
  onEnqueueMultiple,
  onPlayMultiple,
  onImportTracks,
  onCreateFolder,
  onDeleteTrackFromMemory,
}) => {
  // Navigation history stack
  const [history, setHistory] = useState<SpecialLocation[]>(["this-pc", "folder-music"]);
  const [historyIndex, setHistoryIndex] = useState<number>(1);

  const [sortField, setSortField] = useState<SortField>("name");
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  // Mobile Bottom Sheet Inspector State
  const [bottomSheetTrack, setBottomSheetTrack] = useState<Track | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const currentLocation = history[historyIndex] || "folder-music";
  const isAmoled = theme === "amoled";

  const activeFolder = useMemo(() => {
    if (currentLocation === "this-pc" || currentLocation === "all-files") {
      return null;
    }
    return folders.find((f) => f.id === currentLocation) || folders[0] || null;
  }, [currentLocation, folders]);

  // Subfolders inside current folder
  const childFolders = useMemo(() => {
    if (currentLocation === "this-pc") {
      return folders.filter((f) => f.parentId === null);
    }
    if (currentLocation === "all-files") {
      return [];
    }
    return folders.filter((f) => f.parentId === currentLocation);
  }, [currentLocation, folders]);

  const getFileMeta = (t: Track) => {
    const rawExt = t.file?.name.includes(".")
      ? t.file.name.split(".").pop()?.toLowerCase()
      : t.id === "track-1" || t.id === "track-3" || t.id === "track-6"
      ? "flac"
      : t.id === "track-4"
      ? "wav"
      : "mp3";
    const ext = rawExt || "mp3";
    const fileName = t.title.toLowerCase().endsWith(`.${ext}`) ? t.title : `${t.title}.${ext}`;
    const typeLabel =
      ext === "flac"
        ? "FLAC Lossless Audio"
        : ext === "wav"
        ? "WAV PCM Audio"
        : "MP3 Audio File";
    return { ext: ext.toUpperCase(), rawExt: ext, fileName, typeLabel };
  };

  const countFolderTracksRecursive = (folderId: string): number => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return 0;
    const directIds = new Set(
      allTracks
        .filter((t) => folder.trackIds.includes(t.id) || t.folderPath === folder.path)
        .map((t) => t.id)
    );
    const subFolders = folders.filter((f) => f.parentId === folderId);
    subFolders.forEach((sf) => {
      allTracks
        .filter((t) => sf.trackIds.includes(t.id) || t.folderPath === sf.path)
        .forEach((t) => directIds.add(t.id));
    });
    return directIds.size;
  };

  const locationTracks = useMemo(() => {
    if (currentLocation === "this-pc") return [];
    if (currentLocation === "all-files") return allTracks;
    if (!activeFolder) return [];
    return allTracks.filter(
      (t) => activeFolder.trackIds.includes(t.id) || t.folderPath === activeFolder.path
    );
  }, [currentLocation, activeFolder, allTracks]);

  const filteredSubfolders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = q
      ? childFolders.filter((f) => f.name.toLowerCase().includes(q))
      : childFolders;
    return [...list].sort((a, b) =>
      sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    );
  }, [childFolders, searchQuery, sortAsc]);

  const filteredTracks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = q
      ? (currentLocation === "this-pc" ? allTracks : locationTracks).filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.artist.toLowerCase().includes(q) ||
            t.genre.toLowerCase().includes(q)
        )
      : locationTracks;

    return [...base].sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") {
        cmp = a.title.localeCompare(b.title);
      } else if (sortField === "size") {
        cmp = (a.fileSize || 7500000) - (b.fileSize || 7500000);
      } else if (sortField === "date") {
        cmp = (a.lastModified || 0) - (b.lastModified || 0);
      } else if (sortField === "type") {
        cmp = getFileMeta(a).ext.localeCompare(getFileMeta(b).ext);
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [locationTracks, allTracks, currentLocation, searchQuery, sortField, sortAsc]);

  if (!isOpen) return null;

  const navigateTo = (loc: SpecialLocation) => {
    if (loc === currentLocation) return;
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(loc);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setSelectedTrackIds(new Set());
    setSearchQuery("");
    setIsSearchActive(false);
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex((i) => i - 1);
      setSelectedTrackIds(new Set());
    } else {
      onClose();
    }
  };

  const handleUpOneLevel = () => {
    if (currentLocation === "this-pc") return;
    if (currentLocation === "all-files") {
      navigateTo("this-pc");
      return;
    }
    if (activeFolder?.parentId) {
      navigateTo(activeFolder.parentId);
    } else {
      navigateTo("this-pc");
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 KB";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (timestamp?: number) => {
    const d = timestamp ? new Date(timestamp) : new Date(2026, 9, 18);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const buildBreadcrumbs = (): { id: SpecialLocation; name: string }[] => {
    const crumbs: { id: SpecialLocation; name: string }[] = [
      { id: "this-pc", name: "Storage" },
    ];
    if (currentLocation === "this-pc") return crumbs;
    if (currentLocation === "all-files") {
      crumbs.push({ id: "all-files", name: "All Files" });
      return crumbs;
    }
    const folderChain: MemoryFolder[] = [];
    let curr: MemoryFolder | undefined = activeFolder || undefined;
    while (curr) {
      folderChain.unshift(curr);
      curr = folders.find((f) => f.id === curr?.parentId);
    }
    folderChain.forEach((f) => crumbs.push({ id: f.id, name: f.name }));
    return crumbs;
  };

  const breadcrumbs = buildBreadcrumbs();

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const targetId =
        activeFolder?.id ||
        folders.find((f) => f.id === "folder-music")?.id ||
        folders[0]?.id ||
        "folder-music";
      onImportTracks(e.target.files, targetId);
      if (currentLocation === "this-pc") {
        navigateTo(targetId);
      }
    }
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      const parentId =
        activeFolder?.id ||
        folders.find((f) => f.parentId === null)?.id ||
        null;
      onCreateFolder(newFolderName.trim(), parentId);
      setNewFolderName("");
      setIsCreatingFolder(false);
    }
  };

  const toggleSelectTrack = (trackId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  };

  const handlePlaySelected = () => {
    const selected = filteredTracks.filter((t) => selectedTrackIds.has(t.id));
    if (selected.length > 0) {
      onPlayMultiple(selected);
      setSelectedTrackIds(new Set());
      setIsMultiSelectMode(false);
    } else if (filteredTracks.length > 0) {
      onPlayMultiple(filteredTracks);
    }
  };

  const handleEnqueueSelected = () => {
    const selected = filteredTracks.filter((t) => selectedTrackIds.has(t.id));
    if (selected.length > 0) {
      onEnqueueMultiple(selected);
      setSelectedTrackIds(new Set());
      setIsMultiSelectMode(false);
    } else if (filteredTracks.length > 0) {
      onEnqueueMultiple(filteredTracks);
    }
  };

  const rootDrives = folders.filter((f) => f.parentId === null);

  return (
    <div className="fixed inset-x-0 top-0 bottom-16 z-50 flex flex-col bg-black text-white select-none">
      {/* 1. MOBILE TOP APP BAR (56px touch height) */}
      <div
        className={`w-full h-14 px-3 flex items-center justify-between border-b shrink-0 z-20 ${
          isAmoled
            ? "bg-black border-neutral-900"
            : "bg-white border-neutral-200 text-neutral-900"
        }`}
      >
        <div className="flex items-center gap-1 min-w-0">
          <button
            onClick={handleBack}
            className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-neutral-800/50 active:scale-95 transition-transform shrink-0"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="min-w-0">
            <h1 className="text-base font-bold truncate leading-tight">
              {currentLocation === "this-pc"
                ? "Device Memory"
                : currentLocation === "all-files"
                ? "All Audio Files"
                : activeFolder?.name || "Files"}
            </h1>
            <p className="text-[11px] text-neutral-400 font-mono truncate">
              {currentLocation === "this-pc"
                ? `${allTracks.length} tracks indexed`
                : `${filteredSubfolders.length} folders · ${filteredTracks.length} audio files`}
            </p>
          </div>
        </div>

        {/* Right Action Icons: Search, Sort, New Folder, Close */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => setIsSearchActive(!isSearchActive)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-neutral-800/50 active:scale-95 transition-transform"
            aria-label="Search"
          >
            <Search size={18} style={isSearchActive ? { color: accent.hex } : undefined} />
          </button>

          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-neutral-800/50 active:scale-95 transition-transform"
            aria-label="Sort"
          >
            <ArrowUpDown size={18} />
          </button>

          <button
            onClick={() => setIsCreatingFolder(!isCreatingFolder)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-neutral-800/50 active:scale-95 transition-transform"
            aria-label="New folder"
          >
            <FolderPlus size={18} className="text-amber-400" />
          </button>

          <label
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-neutral-800/50 active:scale-95 transition-transform cursor-pointer"
            aria-label="Import files"
            title="Import audio files"
          >
            <Upload size={18} style={{ color: accent.hex }} />
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
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-neutral-800/50 active:scale-95 transition-transform"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* 2. INLINE SEARCH BAR (Appears when search icon is tapped) */}
      {isSearchActive && (
        <div
          className={`px-3 py-2 border-b flex items-center gap-2 shrink-0 animate-in fade-in ${
            isAmoled ? "bg-neutral-950 border-neutral-900" : "bg-neutral-50 border-neutral-200"
          }`}
        >
          <div
            className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${
              isAmoled ? "bg-black border-neutral-800 text-white" : "bg-white border-neutral-300"
            }`}
          >
            <Search size={14} className="text-neutral-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tracks, artists, or folders..."
              autoFocus
              className="w-full bg-transparent focus:outline-none text-xs"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="p-1 text-neutral-400">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => {
              setIsSearchActive(false);
              setSearchQuery("");
            }}
            className="text-xs font-semibold px-2 text-neutral-400 hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}

      {/* 3. MOBILE BREADCRUMB TRAIL (Horizontal scrollable chips) */}
      <div
        className={`px-3 py-2 border-b flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0 ${
          isAmoled ? "bg-black/80 border-neutral-900" : "bg-neutral-50 border-neutral-200"
        }`}
      >
        {breadcrumbs.map((crumb, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          return (
            <React.Fragment key={`${crumb.id}-${idx}`}>
              <button
                onClick={() => navigateTo(crumb.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
                  isLast
                    ? isAmoled
                      ? "bg-neutral-800 text-white font-bold"
                      : "bg-neutral-200 text-black font-bold"
                    : isAmoled
                    ? "bg-neutral-900 text-neutral-400 hover:text-white"
                    : "bg-neutral-100 text-neutral-600"
                }`}
                style={isLast ? { color: accent.hex } : undefined}
              >
                {idx === 0 && <HardDrive size={11} className="shrink-0" />}
                <span>{crumb.name}</span>
              </button>
              {!isLast && <ChevronRight size={12} className="text-neutral-600 shrink-0" />}
            </React.Fragment>
          );
        })}
      </div>

      {/* 4. SORT DRAWER / SELECTOR */}
      {showSortMenu && (
        <div
          className={`px-4 py-2.5 border-b flex items-center justify-between text-xs animate-in slide-in-from-top-1 shrink-0 ${
            isAmoled ? "bg-neutral-950 border-neutral-900" : "bg-neutral-100 border-neutral-200"
          }`}
        >
          <span className="text-neutral-400 font-mono text-[11px]">SORT BY</span>
          <div className="flex items-center gap-1.5">
            {(["name", "date", "size", "type"] as SortField[]).map((field) => (
              <button
                key={field}
                onClick={() => {
                  if (sortField === field) setSortAsc(!sortAsc);
                  else {
                    setSortField(field);
                    setSortAsc(true);
                  }
                  setShowSortMenu(false);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs capitalize transition-all ${
                  sortField === field
                    ? "font-bold text-black"
                    : isAmoled
                    ? "bg-neutral-900 text-neutral-400"
                    : "bg-white text-neutral-700"
                }`}
                style={sortField === field ? { backgroundColor: accent.hex } : undefined}
              >
                {field} {sortField === field ? (sortAsc ? "↑" : "↓") : ""}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5. INLINE NEW FOLDER INPUT */}
      {isCreatingFolder && (
        <form
          onSubmit={handleCreateFolderSubmit}
          className={`px-3 py-2.5 border-b flex items-center gap-2 text-xs shrink-0 ${
            isAmoled ? "bg-neutral-900/60 border-neutral-800" : "bg-neutral-100 border-neutral-200"
          }`}
        >
          <Folder size={18} className="text-amber-400 shrink-0" fill="currentColor" />
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name..."
            autoFocus
            className={`flex-1 px-3 py-1.5 rounded-xl border focus:outline-none ${
              isAmoled
                ? "bg-black border-neutral-800 text-white"
                : "bg-white border-neutral-300 text-black"
            }`}
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl font-bold text-black"
            style={{ backgroundColor: accent.hex }}
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => setIsCreatingFolder(false)}
            className="p-1.5 text-neutral-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </form>
      )}

      {/* 6. MULTI-SELECT BATCH ACTION BAR (When tracks are selected) */}
      {selectedTrackIds.size > 0 && (
        <div
          className="px-4 py-2.5 flex items-center justify-between border-b text-xs shrink-0"
          style={{ backgroundColor: `${accent.hex}15`, borderColor: `${accent.hex}40` }}
        >
          <span className="font-bold" style={{ color: accent.hex }}>
            {selectedTrackIds.size} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePlaySelected}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold text-black shadow-sm"
              style={{ backgroundColor: accent.hex }}
            >
              <Play size={12} fill="currentColor" />
              <span>Play</span>
            </button>
            <button
              onClick={handleEnqueueSelected}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-semibold border ${
                isAmoled ? "bg-neutral-900 border-neutral-800 text-white" : "bg-white text-black"
              }`}
            >
              <ListPlus size={12} />
              <span>Queue</span>
            </button>
            <button
              onClick={() => {
                setSelectedTrackIds(new Set());
                setIsMultiSelectMode(false);
              }}
              className="p-1 text-neutral-400 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 7. SINGLE-COLUMN MOBILE EXPLORER BODY */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-900/60 pb-32 scrollbar-thin">
        {/* VIEW A: ROOT STORAGE & CATEGORY TILES (When at "This Device") */}
        {currentLocation === "this-pc" && !searchQuery ? (
          <div className="p-4 space-y-6">
            {/* Storage Drives Section */}
            <div>
              <h2 className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-3 font-semibold">
                Storage Drives
              </h2>
              <div className="space-y-3">
                {rootDrives.map((drive, idx) => {
                  const trackCount = countFolderTracksRecursive(drive.id);
                  const usedGb = idx === 0 ? 41.2 : 84.6;
                  const totalGb = idx === 0 ? 64 : 128;
                  const freeGb = (totalGb - usedGb).toFixed(1);
                  const pct = Math.round((usedGb / totalGb) * 100);

                  return (
                    <div
                      key={drive.id}
                      onClick={() => navigateTo(drive.id)}
                      className={`p-4 rounded-2xl border cursor-pointer active:scale-[0.99] transition-all flex items-center gap-3.5 ${
                        isAmoled
                          ? "bg-neutral-950 border-neutral-900 hover:border-neutral-800"
                          : "bg-neutral-50 border-neutral-200"
                      }`}
                    >
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${accent.hex}20`, color: accent.hex }}
                      >
                        <HardDrive size={24} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold truncate">{drive.name}</h3>
                          <span className="text-[11px] font-mono text-neutral-400">
                            {trackCount} tracks
                          </span>
                        </div>

                        {/* Mobile Storage Bar */}
                        <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden my-2">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: accent.hex,
                            }}
                          />
                        </div>

                        <div className="flex justify-between text-[11px] font-mono text-neutral-400">
                          <span>{freeGb} GB free</span>
                          <span>{totalGb} GB Total</span>
                        </div>
                      </div>

                      <ChevronRight size={18} className="text-neutral-600 shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Access Categories */}
            <div>
              <h2 className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-3 font-semibold">
                Quick Folders
              </h2>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => navigateTo("folder-music")}
                  className={`p-3.5 rounded-2xl border text-left active:scale-[0.98] transition-all flex items-center gap-3 ${
                    isAmoled
                      ? "bg-neutral-950 border-neutral-900 hover:border-neutral-800"
                      : "bg-neutral-50 border-neutral-200"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                    <Music size={20} />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold truncate">Music</div>
                    <div className="text-[10px] text-neutral-400 font-mono">
                      {countFolderTracksRecursive("folder-music")} tracks
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => navigateTo("folder-downloads")}
                  className={`p-3.5 rounded-2xl border text-left active:scale-[0.98] transition-all flex items-center gap-3 ${
                    isAmoled
                      ? "bg-neutral-950 border-neutral-900 hover:border-neutral-800"
                      : "bg-neutral-50 border-neutral-200"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Download size={20} />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold truncate">Downloads</div>
                    <div className="text-[10px] text-neutral-400 font-mono">
                      {countFolderTracksRecursive("folder-downloads")} tracks
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => navigateTo("folder-recordings")}
                  className={`p-3.5 rounded-2xl border text-left active:scale-[0.98] transition-all flex items-center gap-3 ${
                    isAmoled
                      ? "bg-neutral-950 border-neutral-900 hover:border-neutral-800"
                      : "bg-neutral-50 border-neutral-200"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <Mic size={20} />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold truncate">Recordings</div>
                    <div className="text-[10px] text-neutral-400 font-mono">
                      {countFolderTracksRecursive("folder-recordings")} tracks
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => navigateTo("folder-audiobooks")}
                  className={`p-3.5 rounded-2xl border text-left active:scale-[0.98] transition-all flex items-center gap-3 ${
                    isAmoled
                      ? "bg-neutral-950 border-neutral-900 hover:border-neutral-800"
                      : "bg-neutral-50 border-neutral-200"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <BookOpen size={20} />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold truncate">Audiobooks</div>
                    <div className="text-[10px] text-neutral-400 font-mono">
                      {countFolderTracksRecursive("folder-audiobooks")} tracks
                    </div>
                  </div>
                </button>
              </div>

              {/* All Audio Files Tile */}
              <button
                onClick={() => navigateTo("all-files")}
                className={`w-full mt-3 p-3.5 rounded-2xl border text-left active:scale-[0.99] transition-all flex items-center justify-between ${
                  isAmoled
                    ? "bg-neutral-950 border-neutral-900 hover:border-neutral-800"
                    : "bg-neutral-50 border-neutral-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${accent.hex}22`, color: accent.hex }}
                  >
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-bold">All Indexed Audio Files</div>
                    <div className="text-[10px] text-neutral-400 font-mono">
                      Flat library view of all {allTracks.length} tracks
                    </div>
                  </div>
                </div>
                <ChevronRight size={18} className="text-neutral-600" />
              </button>
            </div>
          </div>
        ) : (
          /* VIEW B: INSIDE FOLDER — SINGLE-COLUMN MOBILE TOUCH ROWS */
          <div className="divide-y divide-neutral-900/40">
            {filteredSubfolders.length === 0 && filteredTracks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="w-16 h-16 rounded-3xl bg-neutral-900 flex items-center justify-center text-amber-400/60 mb-3">
                  <Folder size={32} />
                </div>
                <h3 className="text-sm font-bold text-neutral-200">This folder is empty</h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-xs">
                  Tap the Import icon at the top to add MP3, WAV, or FLAC files from your device.
                </p>
              </div>
            ) : (
              <>
                {/* 1. Subfolder Rows (Touch target min 56px) */}
                {filteredSubfolders.map((sub) => {
                  const itemCount = countFolderTracksRecursive(sub.id);
                  return (
                    <div
                      key={sub.id}
                      onClick={() => navigateTo(sub.id)}
                      className={`flex items-center justify-between px-4 py-3.5 cursor-pointer active:bg-neutral-900/80 transition-colors ${
                        isAmoled ? "hover:bg-neutral-950" : "hover:bg-neutral-50"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-amber-400/15 flex items-center justify-center text-amber-400 shrink-0">
                          <Folder size={22} fill="currentColor" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold truncate text-neutral-100">
                            {sub.name}
                          </h4>
                          <p className="text-[11px] text-neutral-400 font-mono">
                            {itemCount} {itemCount === 1 ? "track" : "tracks"}
                          </p>
                        </div>
                      </div>

                      <ChevronRight size={18} className="text-neutral-600 shrink-0 ml-2" />
                    </div>
                  );
                })}

                {/* 2. Audio File Rows (Touch target min 56px) */}
                {filteredTracks.map((track) => {
                  const isCurrent = currentTrack?.id === track.id;
                  const isChecked = selectedTrackIds.has(track.id);
                  const meta = getFileMeta(track);

                  return (
                    <div
                      key={track.id}
                      onClick={() => onPlayTrack(track)}
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer active:bg-neutral-900/80 transition-colors ${
                        isCurrent
                          ? isAmoled
                            ? "bg-neutral-900/60"
                            : "bg-neutral-100/70"
                          : isChecked
                          ? "bg-neutral-900/90"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                        {/* Artwork or Audio File Badge */}
                        <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-neutral-900 shrink-0 border border-white/5">
                          <img
                            src={track.coverUrl}
                            alt={track.title}
                            className="w-full h-full object-cover"
                          />
                          <span
                            className="absolute bottom-0 right-0 px-1 text-[8px] font-mono font-bold text-black"
                            style={{ backgroundColor: accent.hex }}
                          >
                            {meta.ext}
                          </span>
                        </div>

                        {/* Title, Artist, Size & Duration */}
                        <div className="min-w-0 flex-1">
                          <h4
                            className="text-xs font-bold truncate"
                            style={isCurrent ? { color: accent.hex } : undefined}
                          >
                            {track.title}
                          </h4>
                          <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                            {track.artist} &bull; {formatBytes(track.fileSize || 7400000)} &bull;{" "}
                            {formatDuration(track.duration)}
                          </p>
                        </div>
                      </div>

                      {/* Right Quick Actions (Play & Details / 3-dots) */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onPlayTrack(track)}
                          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-neutral-800 active:scale-90 transition-transform"
                          style={isCurrent ? { color: accent.hex } : undefined}
                          title="Play"
                        >
                          {isCurrent ? <Disc size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
                        </button>

                        <button
                          onClick={() => setBottomSheetTrack(track)}
                          className="w-9 h-9 flex items-center justify-center rounded-full text-neutral-400 hover:text-white active:scale-90 transition-transform"
                          title="File details"
                        >
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* 8. MOBILE FILE DETAILS BOTTOM SHEET (When user taps 3-dots on a file) */}
      {bottomSheetTrack && (
        <div
          onClick={() => setBottomSheetTrack(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col justify-end animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-h-[85vh] rounded-t-3xl border-t shadow-2xl p-5 overflow-y-auto animate-in slide-in-from-bottom duration-200 ${
              isAmoled
                ? "bg-[#0c0c0c] border-neutral-800 text-white"
                : "bg-white border-neutral-200 text-neutral-900"
            }`}
          >
            {/* Grab handle affordance */}
            <div className="w-10 h-1 rounded-full bg-neutral-700 mx-auto mb-4" />

            <div className="flex items-center gap-4 pb-4 border-b border-neutral-800/60">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-neutral-900 shrink-0 border border-white/10 shadow-lg">
                <img
                  src={bottomSheetTrack.coverUrl}
                  alt={bottomSheetTrack.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <span
                  className="px-2 py-0.5 rounded text-[9px] font-mono font-bold text-black uppercase"
                  style={{ backgroundColor: accent.hex }}
                >
                  {getFileMeta(bottomSheetTrack).ext} Audio
                </span>
                <h3 className="text-base font-bold truncate mt-1">{bottomSheetTrack.title}</h3>
                <p className="text-xs text-neutral-400 truncate">{bottomSheetTrack.artist}</p>
              </div>

              <button
                onClick={() => setBottomSheetTrack(null)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Technical Audio Metadata */}
            <div className="py-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-neutral-800/30">
                <span className="text-neutral-500">File Name</span>
                <span className="font-semibold text-right max-w-[200px] truncate">
                  {getFileMeta(bottomSheetTrack).fileName}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800/30">
                <span className="text-neutral-500">Audio Format</span>
                <span className="font-semibold">{getFileMeta(bottomSheetTrack).typeLabel}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800/30">
                <span className="text-neutral-500">File Size</span>
                <span className="font-semibold">
                  {formatBytes(bottomSheetTrack.fileSize || 7400000)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800/30">
                <span className="text-neutral-500">Duration</span>
                <span className="font-semibold">{formatDuration(bottomSheetTrack.duration)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800/30">
                <span className="text-neutral-500">Bitrate / Sample</span>
                <span className="font-semibold">24-bit · 96 kHz (1,411 kbps)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800/30">
                <span className="text-neutral-500">Date Modified</span>
                <span className="font-semibold">{formatDate(bottomSheetTrack.lastModified)}</span>
              </div>
              <div className="py-1">
                <span className="text-neutral-500 block mb-0.5">Directory Path</span>
                <span className="text-[11px] text-neutral-400 break-all">
                  {bottomSheetTrack.folderPath || "/Internal Storage/Music"}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                onClick={() => {
                  onPlayTrack(bottomSheetTrack);
                  setBottomSheetTrack(null);
                }}
                className="w-full h-12 rounded-2xl font-bold text-black flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-transform"
                style={{ backgroundColor: accent.hex }}
              >
                <Play size={16} fill="currentColor" />
                <span>Play Now</span>
              </button>

              <button
                onClick={() => {
                  onEnqueueTrack(bottomSheetTrack);
                  setBottomSheetTrack(null);
                }}
                className={`w-full h-12 rounded-2xl font-semibold border flex items-center justify-center gap-2 active:scale-98 transition-transform ${
                  isAmoled
                    ? "bg-neutral-900 border-neutral-800 text-white hover:bg-neutral-800"
                    : "bg-neutral-100 border-neutral-200 text-neutral-900"
                }`}
              >
                <ListPlus size={16} style={{ color: accent.hex }} />
                <span>Add to Playback Queue</span>
              </button>

              <button
                onClick={() => {
                  onDeleteTrackFromMemory(bottomSheetTrack.id);
                  setBottomSheetTrack(null);
                }}
                className="w-full h-11 rounded-2xl font-semibold text-red-400 hover:bg-red-500/10 flex items-center justify-center gap-2 active:scale-98 transition-transform text-xs"
              >
                <Trash2 size={14} />
                <span>Remove from Memory Index</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
