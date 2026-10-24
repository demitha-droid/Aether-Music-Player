import React, { useState } from "react";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  HardDrive,
  Play,
  ListPlus,
  Trash2,
  Upload,
  X,
  Search,
  Disc,
  FolderPlus,
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
  const [selectedFolderId, setSelectedFolderId] = useState<string>("folder-music");
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(
    new Set(["folder-root-internal", "folder-root-sd"])
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  if (!isOpen) return null;

  const isAmoled = theme === "amoled";

  const activeFolder =
    folders.find((f) => f.id === selectedFolderId) ||
    folders[0] || {
      id: "root",
      name: "Storage",
      path: "/Storage",
      parentId: null,
      trackIds: [],
    };

  // Find tracks in active folder
  const folderTracks = allTracks.filter((t) => {
    if (activeFolder.trackIds.includes(t.id)) return true;
    if (t.folderPath && t.folderPath === activeFolder.path) return true;
    return false;
  });

  // Filter by search
  const filteredTracks = folderTracks.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate memory stats
  const totalBytes = allTracks.reduce((sum, t) => sum + (t.fileSize || 7500000), 0);
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "Oct 16, 2026";
    const d = new Date(timestamp);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Build breadcrumbs path
  const buildBreadcrumbs = () => {
    const crumbs: MemoryFolder[] = [];
    let current: MemoryFolder | undefined = activeFolder;
    while (current) {
      crumbs.unshift(current);
      current = folders.find((f) => f.id === current?.parentId);
    }
    return crumbs;
  };
  const breadcrumbs = buildBreadcrumbs();

  const toggleExpand = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const handleFolderSelect = (folderId: string) => {
    setSelectedFolderId(folderId);
    setSelectedTrackIds(new Set());
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportTracks(e.target.files, selectedFolderId);
    }
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim(), selectedFolderId);
      setNewFolderName("");
      setIsCreatingFolder(false);
    }
  };

  const toggleSelectTrack = (trackId: string) => {
    setSelectedTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedTrackIds.size === filteredTracks.length) {
      setSelectedTrackIds(new Set());
    } else {
      setSelectedTrackIds(new Set(filteredTracks.map((t) => t.id)));
    }
  };

  const handlePlaySelected = () => {
    const selected = filteredTracks.filter((t) => selectedTrackIds.has(t.id));
    if (selected.length > 0) {
      onPlayMultiple(selected);
      setSelectedTrackIds(new Set());
    }
  };

  const handleEnqueueSelected = () => {
    const selected = filteredTracks.filter((t) => selectedTrackIds.has(t.id));
    if (selected.length > 0) {
      onEnqueueMultiple(selected);
      setSelectedTrackIds(new Set());
    }
  };

  // Render recursive folder tree node
  const renderFolderNode = (folder: MemoryFolder) => {
    const childFolders = folders.filter((f) => f.parentId === folder.id);
    const hasChildren = childFolders.length > 0;
    const isExpanded = expandedFolderIds.has(folder.id);
    const isSelected = selectedFolderId === folder.id;

    return (
      <div key={folder.id} className="select-none">
        <div
          onClick={() => handleFolderSelect(folder.id)}
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl cursor-pointer text-xs font-mono transition-all ${
            isSelected
              ? isAmoled
                ? "bg-neutral-900 text-white font-semibold"
                : "bg-neutral-200 text-black font-semibold"
              : isAmoled
              ? "text-neutral-400 hover:text-white hover:bg-neutral-900/40"
              : "text-neutral-600 hover:text-black hover:bg-neutral-100"
          }`}
          style={isSelected ? { borderLeft: `3px solid ${accent.hex}` } : undefined}
        >
          <div className="flex items-center gap-1.5 truncate">
            {hasChildren ? (
              <button
                onClick={(e) => toggleExpand(folder.id, e)}
                className="p-0.5 rounded hover:bg-neutral-800/40 text-neutral-500"
              >
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            ) : (
              <span className="w-3.5 inline-block" />
            )}

            {folder.parentId === null ? (
              <HardDrive size={13} style={{ color: isSelected ? accent.hex : undefined }} />
            ) : isExpanded ? (
              <FolderOpen size={13} style={{ color: isSelected ? accent.hex : undefined }} />
            ) : (
              <Folder size={13} style={{ color: isSelected ? accent.hex : undefined }} />
            )}

            <span className="truncate">{folder.name}</span>
          </div>

          <span className="text-[10px] text-neutral-500 tabular-nums">
            {allTracks.filter(
              (t) => folder.trackIds.includes(t.id) || t.folderPath === folder.path
            ).length}
          </span>
        </div>

        {hasChildren && isExpanded && (
          <div className="pl-3.5 mt-0.5 border-l border-neutral-800/30 ml-2 space-y-0.5">
            {childFolders.map(renderFolderNode)}
          </div>
        )}
      </div>
    );
  };

  const rootFolders = folders.filter((f) => f.parentId === null);

  return (
    <div className="fixed inset-x-0 top-[65px] bottom-[158px] z-40 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div
        className={`w-full max-w-6xl h-full flex flex-col rounded-3xl border shadow-2xl relative overflow-hidden ${
          isAmoled
            ? "bg-black border-neutral-800 text-white"
            : "bg-white border-neutral-200 text-neutral-900"
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: `${accent.hex}20`, color: accent.hex }}
            >
              <HardDrive size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight">Device Memory Explorer</h2>
                <span
                  className="px-2 py-0.5 text-[10px] font-mono rounded-full font-semibold uppercase tracking-wider"
                  style={{ backgroundColor: `${accent.hex}22`, color: accent.hex }}
                >
                  Local Audio Storage
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Browse internal storage and SD card memory for audio files &bull; {allTracks.length} tracks indexed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Standard File Picker Button (As requested in Phase 1) */}
            <label
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all hover:scale-105 active:scale-95 text-black"
              style={{ backgroundColor: accent.hex }}
              title="Import local music files from your device memory into this folder"
            >
              <Upload size={13} />
              <span>Import Tracks</span>
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

        {/* Breadcrumb Navigation Bar & Search */}
        <div
          className={`flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 border-b shrink-0 ${
            isAmoled ? "bg-neutral-950/60 border-neutral-900" : "bg-neutral-50/80 border-neutral-200"
          }`}
        >
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-xs font-mono overflow-x-auto scrollbar-none">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={crumb.id}>
                  <button
                    onClick={() => handleFolderSelect(crumb.id)}
                    className={`hover:underline flex items-center gap-1 transition-colors ${
                      isLast
                        ? "text-white font-bold"
                        : "text-neutral-400 hover:text-white"
                    }`}
                    style={isLast ? { color: accent.hex } : undefined}
                  >
                    {idx === 0 && <HardDrive size={12} />}
                    <span>{crumb.name}</span>
                  </button>
                  {!isLast && <ChevronRight size={12} className="text-neutral-600" />}
                </React.Fragment>
              );
            })}
          </div>

          {/* Quick Filter Search within folder */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-xl border text-xs ${
                isAmoled
                  ? "bg-black border-neutral-800 text-white"
                  : "bg-white border-neutral-200 text-neutral-900"
              }`}
            >
              <Search size={12} className="text-neutral-500 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="w-32 sm:w-44 bg-transparent focus:outline-none placeholder-neutral-500 text-xs"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")}>
                  <X size={10} className="text-neutral-500 hover:text-white" />
                </button>
              )}
            </div>

            <button
              onClick={() => setIsCreatingFolder(!isCreatingFolder)}
              className={`p-1.5 rounded-xl border transition-colors ${
                isAmoled
                  ? "border-neutral-800 hover:bg-neutral-900 text-neutral-400"
                  : "border-neutral-200 hover:bg-neutral-100 text-neutral-600"
              }`}
              title="Create new directory in this location"
            >
              <FolderPlus size={14} />
            </button>
          </div>
        </div>

        {/* New Folder Creation Bar */}
        {isCreatingFolder && (
          <form
            onSubmit={handleCreateFolderSubmit}
            className={`flex items-center gap-2 px-6 py-2 border-b animate-in fade-in ${
              isAmoled ? "bg-neutral-900/50 border-neutral-800" : "bg-neutral-100/70 border-neutral-200"
            }`}
          >
            <FolderPlus size={14} style={{ color: accent.hex }} />
            <span className="text-xs font-mono text-neutral-400">New Folder:</span>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. Synth Waveforms, Podcasts..."
              autoFocus
              className={`px-3 py-1 rounded-lg text-xs border focus:outline-none flex-1 max-w-xs ${
                isAmoled ? "bg-black border-neutral-800 text-white" : "bg-white border-neutral-200 text-black"
              }`}
            />
            <button
              type="submit"
              className="px-3 py-1 rounded-lg text-xs font-semibold text-black"
              style={{ backgroundColor: accent.hex }}
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingFolder(false)}
              className="text-xs text-neutral-400 hover:text-white"
            >
              Cancel
            </button>
          </form>
        )}

        {/* Main Body Split: Left Folder Tree & Right Audio File Table */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Folder Tree & Storage Gauge */}
          <div
            className={`w-64 border-r flex flex-col shrink-0 ${
              isAmoled ? "bg-neutral-950/60 border-neutral-900" : "bg-neutral-50/80 border-neutral-200"
            }`}
          >
            <div className="p-3 text-[11px] font-mono uppercase tracking-wider text-neutral-400 flex items-center justify-between">
              <span>Directory Tree</span>
              <span className="text-[10px] text-neutral-500">{folders.length} Folders</span>
            </div>

            {/* Tree Items */}
            <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-thin">
              {rootFolders.map(renderFolderNode)}
            </div>

            {/* Storage Usage Gauge */}
            <div className="p-3.5 border-t border-neutral-800/40 shrink-0">
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-1.5">
                <span className="flex items-center gap-1">
                  <HardDrive size={11} style={{ color: accent.hex }} />
                  Memory Indexed
                </span>
                <span className="text-white font-medium">{formatBytes(totalBytes)}</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (allTracks.length / 30) * 100)}%`,
                    backgroundColor: accent.hex,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-neutral-500 mt-1 font-mono">
                <span>{allTracks.length} Audio Tracks</span>
                <span>Active: {activeFolder.name}</span>
              </div>
            </div>
          </div>

          {/* Right Area: File List Table */}
          <div className="flex-1 flex flex-col overflow-hidden bg-black/30">
            {/* Batch Selection Toolbar */}
            {selectedTrackIds.size > 0 && (
              <div
                className={`px-4 py-2 border-b flex items-center justify-between text-xs animate-in slide-in-from-top-1 ${
                  isAmoled ? "bg-neutral-900 border-neutral-800 text-white" : "bg-neutral-100 border-neutral-200 text-black"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold" style={{ color: accent.hex }}>
                    {selectedTrackIds.size} selected
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePlaySelected}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-black"
                    style={{ backgroundColor: accent.hex }}
                  >
                    <Play size={11} fill="currentColor" />
                    Play Selected
                  </button>

                  <button
                    onClick={handleEnqueueSelected}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border ${
                      isAmoled
                        ? "border-neutral-700 hover:bg-neutral-800 text-white"
                        : "border-neutral-300 hover:bg-neutral-200 text-black"
                    }`}
                  >
                    <ListPlus size={11} />
                    Enqueue Selected
                  </button>
                </div>
              </div>
            )}

            {/* Table Header */}
            <div
              className={`grid grid-cols-12 gap-3 px-4 py-2 border-b text-[11px] font-mono uppercase tracking-wider text-neutral-400 shrink-0 ${
                isAmoled ? "bg-neutral-950 border-neutral-900" : "bg-neutral-100 border-neutral-200"
              }`}
            >
              <div className="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  checked={
                    filteredTracks.length > 0 &&
                    selectedTrackIds.size === filteredTracks.length
                  }
                  onChange={toggleSelectAll}
                  className="rounded cursor-pointer"
                  style={{ accentColor: accent.hex }}
                />
              </div>
              <div className="col-span-6 truncate">File Name</div>
              <div className="col-span-2 text-right">Size</div>
              <div className="col-span-3 text-right pr-2">Modified</div>
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-800/20 scrollbar-thin">
              {filteredTracks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-neutral-500 py-20">
                  <Folder size={40} className="mb-2 opacity-30" />
                  <p className="text-sm font-medium">No audio files found in this directory.</p>
                  <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                    Click &ldquo;Import Tracks&rdquo; to add MP3, WAV, FLAC, or AAC files from your device memory.
                  </p>
                </div>
              ) : (
                filteredTracks.map((t) => {
                  const isCurrent = currentTrack?.id === t.id;
                  const isChecked = selectedTrackIds.has(t.id);

                  // Extract filename extension
                  const ext = t.title.includes(".")
                    ? t.title.split(".").pop()?.toUpperCase()
                    : t.file?.name.split(".").pop()?.toUpperCase() || "MP3";

                  return (
                    <div
                      key={t.id}
                      className={`grid grid-cols-12 gap-3 px-4 py-3 items-center group transition-colors cursor-pointer ${
                        isChecked
                          ? isAmoled
                            ? "bg-neutral-900/80"
                            : "bg-neutral-100"
                          : isCurrent
                          ? isAmoled
                            ? "bg-neutral-950 font-semibold"
                            : "bg-neutral-50 font-semibold"
                          : isAmoled
                          ? "hover:bg-neutral-900/40"
                          : "hover:bg-neutral-50"
                      }`}
                      onClick={() => onPlayTrack(t)}
                    >
                      {/* Checkbox */}
                      <div
                        className="col-span-1 flex items-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectTrack(t.id)}
                          className="rounded cursor-pointer"
                          style={{ accentColor: accent.hex }}
                        />
                      </div>

                      {/* File Name & Audio Icon */}
                      <div className="col-span-6 flex items-center gap-2.5 truncate">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-mono text-[9px] font-bold"
                          style={{
                            backgroundColor: isCurrent ? `${accent.hex}30` : isAmoled ? "#161616" : "#f1f5f9",
                            color: isCurrent ? accent.hex : undefined,
                          }}
                        >
                          {isCurrent ? <Disc size={13} className="animate-spin" /> : ext}
                        </div>

                        <div className="truncate">
                          <div
                            className="text-xs font-medium truncate flex items-center gap-2"
                            style={isCurrent ? { color: accent.hex } : undefined}
                          >
                            <span>{t.title}</span>
                          </div>
                          <div className="text-[10px] text-neutral-400 font-mono truncate">
                            {t.artist} &bull; {Math.floor(t.duration / 60)}:
                            {String(Math.floor(t.duration % 60)).padStart(2, "0")}
                          </div>
                        </div>
                      </div>

                      {/* File Size (Clean unboxed tabular text as requested) */}
                      <div className="col-span-2 text-right text-xs font-mono tabular-nums text-neutral-400">
                        {formatBytes(t.fileSize || 7400000)}
                      </div>

                      {/* Date Modified & Row Hover Actions */}
                      <div className="col-span-3 text-right text-xs font-mono text-neutral-400 flex items-center justify-end gap-1">
                        <span className="group-hover:hidden">
                          {formatDate(t.lastModified)}
                        </span>

                        {/* Hover Quick Actions */}
                        <div className="hidden group-hover:flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlayTrack(t);
                            }}
                            className="p-1 rounded hover:bg-neutral-800 text-white"
                            title="Play Now"
                          >
                            <Play size={13} fill="currentColor" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEnqueueTrack(t);
                            }}
                            className="p-1 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white"
                            title="Add to Queue"
                          >
                            <ListPlus size={13} />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTrackFromMemory(t.id);
                            }}
                            className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-red-400"
                            title="Remove from Memory Index"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Table Footer Summary */}
            <div
              className={`px-4 py-2.5 border-t flex items-center justify-between text-[11px] font-mono text-neutral-500 shrink-0 ${
                isAmoled ? "bg-neutral-950 border-neutral-900" : "bg-neutral-100 border-neutral-200"
              }`}
            >
              <span>
                {filteredTracks.length} files in {activeFolder.path}
              </span>
              <span>
                Folder Size:{" "}
                {formatBytes(
                  filteredTracks.reduce((acc, curr) => acc + (curr.fileSize || 7500000), 0)
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
