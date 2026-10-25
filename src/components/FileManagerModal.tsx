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
  ArrowUpDown,
  MoreVertical,
  FolderOpen,
  Music,
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
type LocationId = "all-files" | string; // folderId or "all-files"

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
  const rootFolderId = useMemo(() => {
    const root = folders.find((f) => f.parentId === null);
    return root ? root.id : "folder-root";
  }, [folders]);

  const [history, setHistory] = useState<LocationId[]>(["folder-root"]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const [sortField, setSortField] = useState<SortField>("name");
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);

  const [bottomSheetTrack, setBottomSheetTrack] = useState<Track | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const currentLocation = history[historyIndex] || rootFolderId;
  const isAmoled = theme === "amoled";

  const activeFolder = useMemo(() => {
    if (currentLocation === "all-files") return null;
    return (
      folders.find((f) => f.id === currentLocation) ||
      folders.find((f) => f.parentId === null) ||
      folders[0] ||
      null
    );
  }, [currentLocation, folders]);

  const childFolders = useMemo(() => {
    if (currentLocation === "all-files" || !activeFolder) return [];
    return folders.filter((f) => f.parentId === activeFolder.id);
  }, [currentLocation, activeFolder, folders]);

  const getFileMeta = (t: Track) => {
    const rawExt = t.file?.name.includes(".")
      ? t.file.name.split(".").pop()?.toLowerCase()
      : "mp3";
    const ext = rawExt || "mp3";
    const fileName = t.file?.name || `${t.title}.${ext}`;
    const typeLabel =
      ext === "flac"
        ? "FLAC Lossless Audio"
        : ext === "wav"
        ? "WAV PCM Audio"
        : ext === "m4a" || ext === "aac"
        ? "AAC Audio File"
        : ext === "ogg" || ext === "opus"
        ? "OGG / Opus Audio"
        : "MP3 Audio File";
    return { ext: ext.toUpperCase(), rawExt: ext, fileName, typeLabel };
  };

  const countFolderTracksRecursive = (folderId: string): number => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return 0;

    const visitedIds = new Set<string>();
    const collect = (fId: string) => {
      const f = folders.find((item) => item.id === fId);
      if (!f) return;
      allTracks
        .filter((t) => f.trackIds.includes(t.id) || t.folderPath === f.path)
        .forEach((t) => visitedIds.add(t.id));
      folders
        .filter((sub) => sub.parentId === fId)
        .forEach((sub) => collect(sub.id));
    };
    collect(folderId);
    return visitedIds.size;
  };

  const locationTracks = useMemo(() => {
    if (currentLocation === "all-files") return allTracks;
    if (!activeFolder) return allTracks;
    return allTracks.filter(
      (t) =>
        activeFolder.trackIds.includes(t.id) ||
        t.folderPath === activeFolder.path
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
      ? allTracks.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.artist.toLowerCase().includes(q) ||
            (t.folderPath || "").toLowerCase().includes(q)
        )
      : locationTracks;

    return [...base].sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") {
        cmp = a.title.localeCompare(b.title);
      } else if (sortField === "size") {
        cmp = (a.fileSize || 0) - (b.fileSize || 0);
      } else if (sortField === "date") {
        cmp = (a.lastModified || 0) - (b.lastModified || 0);
      } else if (sortField === "type") {
        cmp = getFileMeta(a).ext.localeCompare(getFileMeta(b).ext);
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [locationTracks, allTracks, searchQuery, sortField, sortAsc]);

  if (!isOpen) return null;

  const navigateTo = (loc: LocationId) => {
    if (loc === currentLocation) return;
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(loc);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setSearchQuery("");
    setIsSearchActive(false);
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex((i) => i - 1);
    } else {
      onClose();
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes <= 0) return "0 KB";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (timestamp?: number) => {
    const d = timestamp ? new Date(timestamp) : new Date();
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDuration = (secs: number) => {
    const safe = Math.max(0, Math.floor(secs || 0));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const buildBreadcrumbs = (): { id: LocationId; name: string }[] => {
    if (currentLocation === "all-files") {
      return [
        { id: rootFolderId, name: "Phone Storage" },
        { id: "all-files", name: "All Audio Files" },
      ];
    }
    const folderChain: MemoryFolder[] = [];
    let curr: MemoryFolder | undefined = activeFolder || undefined;
    while (curr) {
      folderChain.unshift(curr);
      curr = folders.find((f) => f.id === curr?.parentId);
    }
    if (folderChain.length === 0) {
      return [{ id: rootFolderId, name: "Phone Storage" }];
    }
    return folderChain.map((f) => ({ id: f.id, name: f.name }));
  };

  const breadcrumbs = buildBreadcrumbs();

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const targetId = activeFolder?.id || rootFolderId;
      onImportTracks(e.target.files, targetId);
      e.target.value = "";
    }
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      const parentId = activeFolder?.id || rootFolderId;
      onCreateFolder(newFolderName.trim(), parentId);
      setNewFolderName("");
      setIsCreatingFolder(false);
    }
  };

  return (
    <div
      className={`fixed inset-x-0 top-0 bottom-14 z-50 flex flex-col select-none ${
        isAmoled ? "bg-black text-white" : "bg-neutral-50 text-neutral-900"
      }`}
    >
      <div className="w-full max-w-sm mx-auto flex flex-col h-full">
        {/* 1. FLAT TOP APP BAR (52px) */}
        <div className="w-full h-[52px] px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={handleBack}
              className={`w-9 h-9 flex items-center justify-center rounded-xl active:scale-95 transition-transform shrink-0 ${
                isAmoled ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-900"
              }`}
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="min-w-0">
              <h1 className="text-sm font-bold truncate leading-tight">
                {currentLocation === "all-files"
                  ? "All Phone Audio"
                  : activeFolder?.name || "Phone Storage"}
              </h1>
              <p className="text-[11px] text-neutral-500 font-mono tabular-nums truncate">
                {allTracks.length} {allTracks.length === 1 ? "file" : "files"} on device
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsSearchActive(!isSearchActive)}
              className={`w-9 h-9 flex items-center justify-center rounded-xl active:scale-95 transition-transform ${
                isAmoled ? "bg-neutral-900 text-neutral-300" : "bg-neutral-200 text-neutral-700"
              }`}
              aria-label="Search"
            >
              <Search size={16} style={isSearchActive ? { color: accent.hex } : undefined} />
            </button>

            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className={`w-9 h-9 flex items-center justify-center rounded-xl active:scale-95 transition-transform ${
                isAmoled ? "bg-neutral-900 text-neutral-300" : "bg-neutral-200 text-neutral-700"
              }`}
              aria-label="Sort"
            >
              <ArrowUpDown size={16} />
            </button>

            <button
              onClick={() => setIsCreatingFolder(!isCreatingFolder)}
              className={`w-9 h-9 flex items-center justify-center rounded-xl active:scale-95 transition-transform ${
                isAmoled ? "bg-neutral-900 text-neutral-300" : "bg-neutral-200 text-neutral-700"
              }`}
              aria-label="New folder"
            >
              <FolderPlus size={16} style={{ color: accent.hex }} />
            </button>

            <button
              onClick={onClose}
              className={`w-9 h-9 flex items-center justify-center rounded-xl active:scale-95 transition-transform ${
                isAmoled ? "bg-neutral-900 text-neutral-300" : "bg-neutral-200 text-neutral-700"
              }`}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 2. PROMINENT PHONE STORAGE ACTION BAR (Add Audio Files & Scan Folder) */}
        <div className="px-4 py-2 grid grid-cols-2 gap-2 shrink-0">
          <label
            className="h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform"
            style={{
              backgroundColor: accent.hex,
              color: "#000000",
            }}
          >
            <Upload size={15} />
            <span>Add Audio Files</span>
            <input
              type="file"
              multiple
              accept="audio/*,.mp3,.flac,.wav,.m4a,.aac,.ogg,.opus"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </label>

          <label
            className={`h-11 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform ${
              isAmoled ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-900"
            }`}
          >
            <FolderOpen size={15} style={{ color: accent.hex }} />
            <span>Scan Folder</span>
            <input
              type="file"
              {...({ webkitdirectory: "", directory: "" } as any)}
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />
          </label>
        </div>

        {/* 3. VIEW MODE & BREADCRUMB BAR */}
        <div className="px-4 py-1.5 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none min-w-0 flex-1">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={`${crumb.id}-${idx}`}>
                  <button
                    onClick={() => navigateTo(crumb.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
                      isLast
                        ? isAmoled
                          ? "bg-neutral-900 font-bold"
                          : "bg-neutral-200 font-bold"
                        : "text-neutral-500"
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

          <button
            onClick={() =>
              navigateTo(currentLocation === "all-files" ? rootFolderId : "all-files")
            }
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold shrink-0 ${
              currentLocation === "all-files"
                ? "text-black"
                : isAmoled
                ? "bg-neutral-900 text-neutral-300"
                : "bg-neutral-200 text-neutral-700"
            }`}
            style={
              currentLocation === "all-files" ? { backgroundColor: accent.hex } : undefined
            }
          >
            {currentLocation === "all-files" ? "Folders" : "All Files"}
          </button>
        </div>

        {/* 4. INLINE SEARCH BAR */}
        {isSearchActive && (
          <div className="px-4 py-2 flex items-center gap-2 shrink-0">
            <div
              className={`flex-1 flex items-center gap-2 px-3 h-10 rounded-xl text-xs ${
                isAmoled ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-900"
              }`}
            >
              <Search size={14} className="text-neutral-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search phone audio files or folders..."
                autoFocus
                className="w-full bg-transparent focus:outline-none text-xs"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="p-1 text-neutral-400">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* 5. SORT SELECTOR */}
        {showSortMenu && (
          <div className="px-4 py-2 flex items-center justify-between text-xs shrink-0">
            <span className="text-neutral-500 font-mono text-[10px] uppercase">Sort By</span>
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
                  className={`px-2.5 py-1 rounded-lg text-[11px] capitalize ${
                    sortField === field
                      ? "font-bold text-black"
                      : isAmoled
                      ? "bg-neutral-900 text-neutral-400"
                      : "bg-neutral-200 text-neutral-700"
                  }`}
                  style={sortField === field ? { backgroundColor: accent.hex } : undefined}
                >
                  {field} {sortField === field ? (sortAsc ? "↑" : "↓") : ""}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 6. INLINE NEW FOLDER INPUT */}
        {isCreatingFolder && (
          <form
            onSubmit={handleCreateFolderSubmit}
            className="px-4 py-2 flex items-center gap-2 text-xs shrink-0"
          >
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="New folder name..."
              autoFocus
              className={`flex-1 px-3 h-10 rounded-xl focus:outline-none ${
                isAmoled ? "bg-neutral-900 text-white" : "bg-neutral-200 text-black"
              }`}
            />
            <button
              type="submit"
              className="px-3.5 h-10 rounded-xl font-bold text-black"
              style={{ backgroundColor: accent.hex }}
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingFolder(false)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isAmoled ? "bg-neutral-900 text-neutral-400" : "bg-neutral-200 text-neutral-600"
              }`}
            >
              <X size={16} />
            </button>
          </form>
        )}

        {/* 7. SINGLE-COLUMN FILE & FOLDER LIST */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5 pb-24">
          {allTracks.length === 0 && filteredSubfolders.length === 0 ? (
            /* ZERO-STATE WHEN NO PHONE FILES ARE LOADED YET */
            <div
              className={`mt-4 p-6 rounded-2xl flex flex-col items-center text-center ${
                isAmoled ? "bg-neutral-900" : "bg-neutral-200/70"
              }`}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                style={{ backgroundColor: `${accent.hex}20`, color: accent.hex }}
              >
                <HardDrive size={26} />
              </div>
              <h3 className="text-sm font-bold">No Phone Audio Files Loaded</h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-[240px] leading-relaxed">
                Select audio files or scan a music folder from your phone storage. Your tracks are saved locally for instant playback.
              </p>

              <div className="w-full mt-5 space-y-2">
                <label
                  className="w-full h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-transform"
                  style={{ backgroundColor: accent.hex, color: "#000000" }}
                >
                  <Upload size={15} />
                  <span>Select Phone Audio Files</span>
                  <input
                    type="file"
                    multiple
                    accept="audio/*,.mp3,.flac,.wav,.m4a,.aac,.ogg,.opus"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </label>

                <label
                  className={`w-full h-11 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-transform ${
                    isAmoled ? "bg-black text-white" : "bg-white text-neutral-900"
                  }`}
                >
                  <FolderOpen size={15} style={{ color: accent.hex }} />
                  <span>Scan Phone Music Folder</span>
                  <input
                    type="file"
                    {...({ webkitdirectory: "", directory: "" } as any)}
                    multiple
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          ) : filteredSubfolders.length === 0 && filteredTracks.length === 0 ? (
            <div
              className={`mt-4 p-6 rounded-2xl flex flex-col items-center text-center ${
                isAmoled ? "bg-neutral-900" : "bg-neutral-200/70"
              }`}
            >
              <Folder size={28} style={{ color: accent.hex }} className="mb-2" />
              <h3 className="text-sm font-bold">Folder is Empty</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Tap "Add Audio Files" above to import tracks into this folder, or switch to "All Files".
              </p>
              {allTracks.length > 0 && (
                <button
                  onClick={() => navigateTo("all-files")}
                  className="mt-4 px-4 h-10 rounded-xl text-xs font-bold text-black"
                  style={{ backgroundColor: accent.hex }}
                >
                  View All {allTracks.length} Phone Audio Files
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Play All / Queue All Header Bar when tracks exist in current view */}
              {filteredTracks.length > 0 && (
                <div className="flex items-center justify-between py-1 px-1">
                  <span className="text-[11px] font-mono text-neutral-400 tabular-nums">
                    {filteredTracks.length} {filteredTracks.length === 1 ? "track" : "tracks"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onPlayMultiple(filteredTracks)}
                      className="h-8 px-3 rounded-lg text-[11px] font-bold text-black flex items-center gap-1.5 active:scale-95 transition-transform"
                      style={{ backgroundColor: accent.hex }}
                    >
                      <Play size={12} fill="currentColor" />
                      <span>Play All</span>
                    </button>
                    <button
                      onClick={() => onEnqueueMultiple(filteredTracks)}
                      className={`h-8 px-3 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 active:scale-95 transition-transform ${
                        isAmoled ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-900"
                      }`}
                    >
                      <ListPlus size={12} />
                      <span>Queue All</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Subfolder Rows */}
              {filteredSubfolders.map((sub) => {
                const itemCount = countFolderTracksRecursive(sub.id);
                return (
                  <div
                    key={sub.id}
                    onClick={() => navigateTo(sub.id)}
                    className={`min-h-[56px] px-3.5 py-2.5 rounded-xl flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform ${
                      isAmoled ? "bg-neutral-900" : "bg-neutral-200/70"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${accent.hex}20`, color: accent.hex }}
                      >
                        <Folder size={20} fill="currentColor" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold truncate">{sub.name}</h4>
                        <p className="text-[11px] text-neutral-400 font-mono tabular-nums">
                          {itemCount} {itemCount === 1 ? "audio file" : "audio files"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-neutral-500 shrink-0 ml-2" />
                  </div>
                );
              })}

              {/* Audio File Rows */}
              {filteredTracks.map((track) => {
                const isCurrent = currentTrack?.id === track.id;
                const meta = getFileMeta(track);

                return (
                  <div
                    key={track.id}
                    onClick={() => onPlayTrack(track)}
                    className={`min-h-[56px] px-3 py-2 rounded-xl flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform ${
                      isCurrent
                        ? isAmoled
                          ? "bg-neutral-800"
                          : "bg-neutral-300"
                        : isAmoled
                        ? "bg-neutral-900"
                        : "bg-neutral-200/70"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                      {/* Flat Format Monogram Tile */}
                      <div
                        className="w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 font-mono"
                        style={{
                          backgroundColor: isCurrent ? accent.hex : "#000000",
                          color: isCurrent ? "#000000" : accent.hex,
                        }}
                      >
                        <Music size={14} />
                        <span className="text-[8px] font-bold uppercase leading-none mt-0.5">
                          {meta.ext}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4
                          className="text-xs font-bold truncate"
                          style={isCurrent ? { color: accent.hex } : undefined}
                        >
                          {track.title}
                        </h4>
                        <p className="text-[11px] text-neutral-400 truncate mt-0.5 tabular-nums">
                          {track.artist} · {formatBytes(track.fileSize)} ·{" "}
                          {formatDuration(track.duration)}
                        </p>
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => onPlayTrack(track)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl active:scale-90 transition-transform"
                        style={isCurrent ? { color: accent.hex } : undefined}
                        title="Play"
                      >
                        {isCurrent ? (
                          <Disc size={17} className="animate-spin" />
                        ) : (
                          <Play size={16} fill="currentColor" />
                        )}
                      </button>

                      <button
                        onClick={() => setBottomSheetTrack(track)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-neutral-400 active:scale-90 transition-transform"
                        title="File details"
                      >
                        <MoreVertical size={17} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* 8. FLAT BOTTOM SHEET FOR FILE DETAILS */}
      {bottomSheetTrack && (
        <div
          onClick={() => setBottomSheetTrack(null)}
          className="fixed inset-0 z-50 bg-black/80 flex flex-col justify-end"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm mx-auto rounded-t-2xl p-5 space-y-4 ${
              isAmoled ? "bg-neutral-900 text-white" : "bg-white text-neutral-900"
            }`}
          >
            <div className="w-10 h-1 rounded-full bg-neutral-700 mx-auto" />

            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span
                  className="px-2 py-0.5 rounded text-[9px] font-mono font-bold text-black uppercase"
                  style={{ backgroundColor: accent.hex }}
                >
                  {getFileMeta(bottomSheetTrack).ext}
                </span>
                <h3 className="text-sm font-bold truncate mt-1">{bottomSheetTrack.title}</h3>
                <p className="text-xs text-neutral-400 truncate">{bottomSheetTrack.artist}</p>
              </div>
              <button
                onClick={() => setBottomSheetTrack(null)}
                className="w-9 h-9 rounded-xl bg-black/40 flex items-center justify-center text-neutral-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1.5 text-xs font-mono bg-black/40 p-3 rounded-xl">
              <div className="flex justify-between">
                <span className="text-neutral-500">File</span>
                <span className="truncate max-w-[180px]">
                  {getFileMeta(bottomSheetTrack).fileName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Size</span>
                <span className="tabular-nums">{formatBytes(bottomSheetTrack.fileSize)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Duration</span>
                <span className="tabular-nums">{formatDuration(bottomSheetTrack.duration)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Modified</span>
                <span>{formatDate(bottomSheetTrack.lastModified)}</span>
              </div>
              <div className="pt-1">
                <span className="text-neutral-500 block">Folder Path</span>
                <span className="text-[11px] text-neutral-300 break-all">
                  {bottomSheetTrack.folderPath || "/Phone Storage"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  onPlayTrack(bottomSheetTrack);
                  setBottomSheetTrack(null);
                }}
                className="w-full h-11 rounded-xl font-bold text-black flex items-center justify-center gap-2 text-xs"
                style={{ backgroundColor: accent.hex }}
              >
                <Play size={15} fill="currentColor" />
                <span>Play Track</span>
              </button>

              <button
                onClick={() => {
                  onEnqueueTrack(bottomSheetTrack);
                  setBottomSheetTrack(null);
                }}
                className="w-full h-11 rounded-xl font-semibold bg-black text-white flex items-center justify-center gap-2 text-xs"
              >
                <ListPlus size={15} style={{ color: accent.hex }} />
                <span>Add to Playback Queue</span>
              </button>

              <button
                onClick={() => {
                  onDeleteTrackFromMemory(bottomSheetTrack.id);
                  setBottomSheetTrack(null);
                }}
                className="w-full h-10 rounded-xl font-semibold text-red-400 flex items-center justify-center gap-2 text-xs"
              >
                <Trash2 size={14} />
                <span>Remove from Library</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
