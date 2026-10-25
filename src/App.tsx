/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Volume1,
  Sliders,
  Mic2,
  Sparkles,
  Sun,
  Moon,
  Clock,
  Disc,
  Upload,
  Heart,
  HardDrive,
  ListPlus,
  FolderOpen,
  Music,
} from "lucide-react";

import {
  Track,
  ThemeMode,
  AccentColor,
  RepeatMode,
  Playlist,
  MemoryFolder,
  PlaybackQueueSession,
} from "./types/player";
import {
  DEFAULT_TRACKS,
  DEFAULT_PLAYLISTS,
  INITIAL_MEMORY_FOLDERS,
} from "./data/defaultTracks";
import { globalAudioEngine } from "./services/audioEngine";
import {
  loadStoredTracks,
  saveTracksToDB,
  deleteTrackFromDB,
  probeAudioDuration,
  parseTrackFilename,
  buildFolderHierarchy,
} from "./services/localAudioStorage";
import { EqualizerModal } from "./components/EqualizerModal";
import { LyricsView } from "./components/LyricsView";
import { KotlinStudio } from "./components/KotlinStudio";
import { SonicIntelligenceModal } from "./components/SonicIntelligenceModal";
import { QueueDrawer } from "./components/QueueDrawer";
import { FileManagerModal } from "./components/FileManagerModal";
import { BottomNavBar, NavTab } from "./components/BottomNavBar";
import { PlaylistHub } from "./components/PlaylistHub";
import { AddToPlaylistModal } from "./components/AddToPlaylistModal";
import { PermanentPlaylistBar } from "./components/PermanentPlaylistBar";
import { WaveformSeekbar } from "./components/WaveformSeekbar";

const ACCENT_COLORS: AccentColor[] = [
  {
    id: "cyan",
    name: "Electric Cyan",
    hex: "#00f2fe",
    glow: "rgba(0, 242, 254, 0)",
    activeBg: "bg-cyan-500",
  },
  {
    id: "emerald",
    name: "Matrix Emerald",
    hex: "#10b981",
    glow: "rgba(16, 185, 129, 0)",
    activeBg: "bg-emerald-500",
  },
  {
    id: "purple",
    name: "Kotlin Violet",
    hex: "#a855f7",
    glow: "rgba(168, 85, 247, 0)",
    activeBg: "bg-purple-500",
  },
  {
    id: "amber",
    name: "Cyber Amber",
    hex: "#f59e0b",
    glow: "rgba(245, 158, 11, 0)",
    activeBg: "bg-amber-500",
  },
  {
    id: "crimson",
    name: "Neon Crimson",
    hex: "#f43f5e",
    glow: "rgba(244, 63, 94, 0)",
    activeBg: "bg-rose-500",
  },
  {
    id: "mono",
    name: "Pure Monochrome",
    hex: "#e2e8f0",
    glow: "rgba(226, 232, 240, 0)",
    activeBg: "bg-slate-200",
  },
];

export default function App() {
  // Theme & Appearance
  const [theme, setTheme] = useState<ThemeMode>("amoled");
  const [accent, setAccent] = useState<AccentColor>(ACCENT_COLORS[0]);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // Playlists, Phone Storage & Multi-Queue Sessions
  const [playlists, setPlaylists] = useState<Playlist[]>(DEFAULT_PLAYLISTS);
  const [activePlaylistId, setActivePlaylistId] = useState<string>("playlist-all");
  const [allTracks, setAllTracks] = useState<Track[]>(DEFAULT_TRACKS);
  const [memoryFolders, setMemoryFolders] = useState<MemoryFolder[]>(INITIAL_MEMORY_FOLDERS);
  const [queue, setQueue] = useState<Track[]>(DEFAULT_TRACKS);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Independent Playback Queues
  const [queues, setQueues] = useState<PlaybackQueueSession[]>(() => [
    {
      id: "queue-1",
      name: "Main Queue",
      tracks: [],
      currentTrackIndex: 0,
      savedProgressSeconds: 0,
      updatedAt: Date.now(),
    },
  ]);
  const [activeQueueId, setActiveQueueId] = useState<string>("queue-1");

  // Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("all");
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);

  // Equalizer, Crossfade & Gapless Audio Effects
  const [eqBands, setEqBands] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [bassBoost, setBassBoost] = useState<number>(0);
  const [reverb, setReverb] = useState<number>(0.15);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [crossfadeSeconds, setCrossfadeSeconds] = useState<number>(4);
  const [gaplessEnabled, setGaplessEnabled] = useState<boolean>(true);
  const [isCrossfading, setIsCrossfading] = useState<boolean>(false);

  // Navigation & Modals
  const [activeNavTab, setActiveNavTab] = useState<NavTab>("now-playing");
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<Track | null>(null);
  const [isEqualizerOpen, setIsEqualizerOpen] = useState<boolean>(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState<boolean>(false);
  const [isKotlinStudioOpen, setIsKotlinStudioOpen] = useState<boolean>(false);
  const [isSonicAiOpen, setIsSonicAiOpen] = useState<boolean>(false);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);
  const [isFileManagerOpen, setIsFileManagerOpen] = useState<boolean>(false);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);

  const currentTrack = queue[currentTrackIndex] || null;

  // Load persisted phone audio files from IndexedDB on startup
  useEffect(() => {
    let mounted = true;
    loadStoredTracks().then((stored) => {
      if (!mounted || stored.length === 0) return;
      setAllTracks(stored);
      setQueue(stored);
      setCurrentTrackIndex(0);
      setDuration(stored[0]?.duration || 0);
      setMemoryFolders((prev) => buildFolderHierarchy(stored, prev));
      setPlaylists((prev) =>
        prev.map((pl) => (pl.id === "playlist-all" ? { ...pl, tracks: stored } : pl))
      );
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Keep active queue session synchronized
  useEffect(() => {
    setQueues((prev) =>
      prev.map((q) =>
        q.id === activeQueueId
          ? {
              ...q,
              tracks: queue,
              currentTrackIndex,
              savedProgressSeconds: currentTime,
              updatedAt: Date.now(),
            }
          : q
      )
    );
  }, [queue, currentTrackIndex, Math.floor(currentTime), activeQueueId]);

  // Initialize audio callbacks
  useEffect(() => {
    globalAudioEngine.onTimeUpdate = (curr, total) => {
      setCurrentTime(curr);
      if (total > 0) setDuration(total);
    };

    globalAudioEngine.onPlayStateChange = (playing) => {
      setIsPlaying(playing);
    };

    globalAudioEngine.onCrossfadeStateChange = (active) => {
      setIsCrossfading(active);
    };

    globalAudioEngine.onEnded = () => {
      handleTrackEnded();
    };
  }, [currentTrackIndex, queue, repeatMode, isShuffle]);

  const handleTrackEnded = () => {
    if (repeatMode === "one") {
      if (currentTrack) {
        globalAudioEngine.playTrack(currentTrack, 0);
      }
    } else if (isShuffle && queue.length > 0) {
      const nextIndex = Math.floor(Math.random() * queue.length);
      playTrackAtIndex(nextIndex);
    } else if (currentTrackIndex < queue.length - 1) {
      playTrackAtIndex(currentTrackIndex + 1);
    } else if (repeatMode === "all" && queue.length > 0) {
      playTrackAtIndex(0);
    } else {
      setIsPlaying(false);
    }
  };

  // Sleep Timer countdown
  useEffect(() => {
    if (sleepTimerRemaining === null || sleepTimerRemaining <= 0) return;

    const timer = setInterval(() => {
      setSleepTimerRemaining((prev) => {
        if (prev === null || prev <= 1) {
          globalAudioEngine.pause();
          setSleepTimerMinutes(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sleepTimerRemaining]);

  const togglePlayPause = () => {
    if (!currentTrack) return;
    if (isPlaying) {
      globalAudioEngine.pause();
    } else {
      globalAudioEngine.resume();
    }
  };

  const playTrackAtIndex = (index: number) => {
    if (index >= 0 && index < queue.length) {
      setCurrentTrackIndex(index);
      const track = queue[index];
      setDuration(track.duration || 0);
      globalAudioEngine.playTrack(track, 0);
    }
  };

  const skipNext = () => {
    if (queue.length === 0) return;
    if (isShuffle) {
      const nextIdx = Math.floor(Math.random() * queue.length);
      playTrackAtIndex(nextIdx);
    } else {
      const nextIdx = (currentTrackIndex + 1) % queue.length;
      playTrackAtIndex(nextIdx);
    }
  };

  const skipPrevious = () => {
    if (queue.length === 0) return;
    if (currentTime > 3) {
      handleSeek(0);
    } else {
      const prevIdx = currentTrackIndex > 0 ? currentTrackIndex - 1 : queue.length - 1;
      playTrackAtIndex(prevIdx);
    }
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
    globalAudioEngine.seek(newTime);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (isMuted && newVol > 0) setIsMuted(false);
    globalAudioEngine.setVolume(newVol);
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      globalAudioEngine.setVolume(volume);
    } else {
      setIsMuted(true);
      globalAudioEngine.setVolume(0);
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "amoled" ? "light" : "amoled"));
  };

  const cycleSleepTimer = () => {
    if (sleepTimerMinutes === null) {
      setSleepTimerMinutes(15);
      setSleepTimerRemaining(15 * 60);
    } else if (sleepTimerMinutes === 15) {
      setSleepTimerMinutes(30);
      setSleepTimerRemaining(30 * 60);
    } else if (sleepTimerMinutes === 30) {
      setSleepTimerMinutes(45);
      setSleepTimerRemaining(45 * 60);
    } else if (sleepTimerMinutes === 45) {
      setSleepTimerMinutes(60);
      setSleepTimerRemaining(60 * 60);
    } else {
      setSleepTimerMinutes(null);
      setSleepTimerRemaining(null);
    }
  };

  const toggleFavorite = (trackId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });
  };

  // Core helper to ingest real phone audio files, probe duration, persist to IndexedDB, and build folders
  const processAndStoreAudioFiles = async (
    files: FileList | File[],
    defaultFolderPath: string = "/Phone Storage"
  ) => {
    const audioRegex = /\.(mp3|flac|wav|m4a|aac|ogg|opus|webm|mp4)$/i;
    const rawFiles = Array.from(files).filter(
      (f) => f.type.startsWith("audio/") || audioRegex.test(f.name)
    );
    if (rawFiles.length === 0) return;

    const now = Date.now();
    const createdTracks: Track[] = await Promise.all(
      rawFiles.map(async (file, i) => {
        const parsed = parseTrackFilename(file, defaultFolderPath);
        const realDuration = await probeAudioDuration(file);
        const ext = file.name.includes(".")
          ? file.name.split(".").pop()?.toUpperCase() || "AUDIO"
          : "AUDIO";

        return {
          id: `phone-${now}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          title: parsed.title,
          artist: parsed.artist,
          album: parsed.album,
          duration: realDuration,
          coverUrl: "",
          genre: ext,
          file,
          fileSize: file.size,
          lastModified: file.lastModified,
          folderPath: parsed.folderPath,
          isSynthetic: false,
        };
      })
    );

    if (createdTracks.length === 0) return;

    await saveTracksToDB(createdTracks);

    setAllTracks((prev) => {
      const combined = [...createdTracks, ...prev];
      setMemoryFolders((currFolders) => buildFolderHierarchy(combined, currFolders));
      setPlaylists((currPlaylists) =>
        currPlaylists.map((pl) =>
          pl.id === "playlist-all" ? { ...pl, tracks: combined } : pl
        )
      );
      return combined;
    });

    setQueue((prev) => [...createdTracks, ...prev]);
    setCurrentTrackIndex(0);
    setDuration(createdTracks[0].duration || 0);
    globalAudioEngine.playTrack(createdTracks[0], 0);
  };

  const handleUploadAudioFiles = (files: FileList | File[]) => {
    processAndStoreAudioFiles(files, "/Phone Storage");
  };

  const handleImportTracksToFolder = (files: FileList | File[], targetFolderId: string) => {
    const targetFolder = memoryFolders.find((f) => f.id === targetFolderId);
    const targetPath = targetFolder?.path || "/Phone Storage";
    processAndStoreAudioFiles(files, targetPath);
  };

  const handlePlayTrackFromMemory = (track: Track) => {
    const existingIndex = queue.findIndex((t) => t.id === track.id);
    if (existingIndex !== -1) {
      playTrackAtIndex(existingIndex);
    } else {
      setQueue((prev) => [track, ...prev]);
      setCurrentTrackIndex(0);
      setDuration(track.duration || 0);
      globalAudioEngine.playTrack(track, 0);
    }
  };

  const handleEnqueueTrackFromMemory = (track: Track) => {
    if (!queue.some((t) => t.id === track.id)) {
      setQueue((prev) => [...prev, track]);
    }
  };

  const handlePlayMultipleFromMemory = (tracks: Track[]) => {
    if (tracks.length === 0) return;
    setQueue(tracks);
    setCurrentTrackIndex(0);
    setDuration(tracks[0].duration || 0);
    globalAudioEngine.playTrack(tracks[0], 0);
  };

  const handleEnqueueMultipleFromMemory = (tracks: Track[]) => {
    const newItems = tracks.filter((t) => !queue.some((q) => q.id === t.id));
    setQueue((prev) => [...prev, ...newItems]);
  };

  const handleCreateFolder = (name: string, parentId: string | null) => {
    const parent = memoryFolders.find((f) => f.id === parentId);
    const parentPath = parent?.path || "/Phone Storage";
    const newFolder: MemoryFolder = {
      id: `folder-${Date.now()}`,
      name,
      path: `${parentPath}/${name}`,
      parentId: parent?.id || "folder-root",
      trackIds: [],
    };
    setMemoryFolders((prev) => [...prev, newFolder]);
  };

  const handleDeleteTrackFromMemory = (trackId: string) => {
    deleteTrackFromDB(trackId);
    setAllTracks((prev) => {
      const updated = prev.filter((t) => t.id !== trackId);
      setMemoryFolders((currFolders) => buildFolderHierarchy(updated, currFolders));
      setPlaylists((currPlaylists) =>
        currPlaylists.map((pl) => ({
          ...pl,
          tracks: pl.tracks.filter((t) => t.id !== trackId),
        }))
      );
      return updated;
    });
    setQueue((prev) => prev.filter((t) => t.id !== trackId));
  };

  const handleReorderTrackInPlaylist = (playlistId: string, fromIndex: number, toIndex: number) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id !== playlistId) return p;
        const updatedTracks = [...p.tracks];
        const [movedTrack] = updatedTracks.splice(fromIndex, 1);
        updatedTracks.splice(toIndex, 0, movedTrack);
        return { ...p, tracks: updatedTracks };
      })
    );
  };

  const handleRemoveTrackFromPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id !== playlistId) return p;
        return { ...p, tracks: p.tracks.filter((t) => t.id !== trackId) };
      })
    );
  };

  const handleAddTrackToPlaylist = (playlistId: string, track: Track) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id !== playlistId) return p;
        if (p.tracks.some((t) => t.id === track.id)) return p;
        return { ...p, tracks: [...p.tracks, track] };
      })
    );
  };

  const handleCreateAndAddTrack = (playlistName: string, track: Track) => {
    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      name: playlistName,
      description: "Custom user collection",
      tracks: [track],
      coverUrl: track.coverUrl,
      isCustom: true,
    };
    setPlaylists((prev) => [...prev, newPl]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.relatedTarget === null) {
      setIsDraggingFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadAudioFiles(e.dataTransfer.files);
    }
  };

  const handleApplyEqProfile = (bands: number[], boost: number, rev: number) => {
    setEqBands(bands);
    setBassBoost(boost);
    setReverb(rev);
    globalAudioEngine.setEqualizerBands(bands);
    globalAudioEngine.setBassBoost(boost);
    globalAudioEngine.setReverb(rev);
  };

  const handleUpdateEqBands = (bands: number[]) => {
    setEqBands(bands);
    globalAudioEngine.setEqualizerBands(bands);
  };

  const handleUpdateBassBoost = (val: number) => {
    setBassBoost(val);
    globalAudioEngine.setBassBoost(val);
  };

  const handleUpdateReverb = (val: number) => {
    setReverb(val);
    globalAudioEngine.setReverb(val);
  };

  const handleUpdatePlaybackRate = (val: number) => {
    setPlaybackRate(val);
    globalAudioEngine.setPlaybackRate(val);
  };

  const handleUpdateCrossfade = (seconds: number) => {
    setCrossfadeSeconds(seconds);
    globalAudioEngine.setCrossfadeSeconds(seconds);
  };

  const handleUpdateGapless = (enabled: boolean) => {
    setGaplessEnabled(enabled);
    globalAudioEngine.setGaplessEnabled(enabled);
  };

  const handleSwitchQueue = (targetQueueId: string) => {
    if (targetQueueId === activeQueueId) return;
    const targetQ = queues.find((q) => q.id === targetQueueId);
    if (!targetQ) return;

    setQueues((prev) =>
      prev.map((q) =>
        q.id === activeQueueId
          ? {
              ...q,
              tracks: queue,
              currentTrackIndex,
              savedProgressSeconds: currentTime,
              updatedAt: Date.now(),
            }
          : q
      )
    );

    setActiveQueueId(targetQ.id);
    setQueue(targetQ.tracks);
    const safeIdx = Math.min(targetQ.currentTrackIndex, Math.max(0, targetQ.tracks.length - 1));
    setCurrentTrackIndex(safeIdx);
    const targetTrack = targetQ.tracks[safeIdx] || null;
    const resumeTime = targetQ.savedProgressSeconds || 0;
    setCurrentTime(resumeTime);
    if (targetTrack) {
      setDuration(targetTrack.duration || 0);
      globalAudioEngine.playTrack(targetTrack, resumeTime);
    } else {
      globalAudioEngine.pause();
    }
  };

  const handleCreateQueue = (customName?: string) => {
    const nextNum = queues.length + 1;
    const newQ: PlaybackQueueSession = {
      id: `queue-${Date.now()}`,
      name: customName || `Queue ${nextNum}`,
      tracks: currentTrack ? [currentTrack] : [],
      currentTrackIndex: 0,
      savedProgressSeconds: 0,
      updatedAt: Date.now(),
    };
    setQueues((prev) => [...prev, newQ]);
    setActiveQueueId(newQ.id);
    setQueue(newQ.tracks);
    setCurrentTrackIndex(0);
    setCurrentTime(0);
    if (newQ.tracks[0]) {
      globalAudioEngine.playTrack(newQ.tracks[0], 0);
    }
  };

  const handleDuplicateQueue = (sourceQueueId: string) => {
    const src = queues.find((q) => q.id === sourceQueueId);
    if (!src) return;
    const cloned: PlaybackQueueSession = {
      id: `queue-${Date.now()}`,
      name: `${src.name} Copy`,
      tracks: [...src.tracks],
      currentTrackIndex: src.currentTrackIndex,
      savedProgressSeconds: src.id === activeQueueId ? currentTime : src.savedProgressSeconds,
      updatedAt: Date.now(),
    };
    setQueues((prev) => [...prev, cloned]);
  };

  const handleDeleteQueue = (queueIdToDelete: string) => {
    if (queues.length <= 1) return;
    const remaining = queues.filter((q) => q.id !== queueIdToDelete);
    setQueues(remaining);
    if (queueIdToDelete === activeQueueId && remaining[0]) {
      handleSwitchQueue(remaining[0].id);
    }
  };

  const handleRenameQueue = (queueIdToRename: string, newName: string) => {
    setQueues((prev) =>
      prev.map((q) => (q.id === queueIdToRename ? { ...q, name: newName } : q))
    );
  };

  const handleAddTracksFromDsl = (newTracks: Track[], playlistName: string) => {
    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      name: playlistName,
      description: "Compiled via Kotlin DSL Simulator",
      tracks: newTracks,
      coverUrl: newTracks[0]?.coverUrl,
      isCustom: true,
    };
    setPlaylists((prev) => [...prev, newPl]);
    setQueue((prev) => [...newTracks, ...prev]);
    setCurrentTrackIndex(0);
    globalAudioEngine.playTrack(newTracks[0], 0);
  };

  const isAmoled = theme === "amoled";

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`h-[100dvh] w-full flex flex-col font-sans select-none relative overflow-hidden ${
        isAmoled ? "bg-black text-white" : "bg-neutral-50 text-neutral-900"
      }`}
    >
      {/* Drag & Drop Overlay */}
      {isDraggingFile && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-8 text-center">
          <Upload size={56} style={{ color: accent.hex }} className="mb-4" />
          <h2 className="text-xl font-bold text-white">Drop Audio Files Here</h2>
          <p className="text-xs text-neutral-400 mt-2">
            Supports MP3, WAV, FLAC, OGG, M4A, AAC
          </p>
        </div>
      )}

      {/* PURE FLAT TOP HEADER (52px, zero border, zero shadow) */}
      <header
        className={`w-full max-w-sm mx-auto h-[52px] px-5 flex items-center justify-between shrink-0 z-30 ${
          isAmoled ? "bg-black" : "bg-neutral-50"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center font-mono font-black text-xs tracking-tighter shrink-0"
            style={{
              backgroundColor: accent.hex,
              color: "#000000",
            }}
          >
            AE
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-extrabold text-xs tracking-wider">AETHER</span>
              <span
                className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold tracking-wider uppercase shrink-0"
                style={{
                  backgroundColor: `${accent.hex}20`,
                  color: accent.hex,
                }}
              >
                LOCAL
              </span>
            </div>
            <p className="text-[10px] text-neutral-500 font-mono tabular-nums truncate">
              {allTracks.length} {allTracks.length === 1 ? "track" : "tracks"} loaded
            </p>
          </div>
        </div>

        {/* Right Flat Action Icons (36x36 rounded-xl, zero border) */}
        <div className="flex items-center gap-1.5 shrink-0 relative">
          <button
            onClick={() => setIsPaletteOpen(!isPaletteOpen)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl active:scale-95 transition-transform ${
              isAmoled ? "bg-neutral-900 text-neutral-300" : "bg-neutral-200 text-neutral-700"
            }`}
            title="Choose Accent Color"
          >
            <span
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: accent.hex }}
            />
          </button>

          <button
            onClick={() => setIsEqualizerOpen(true)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl active:scale-95 transition-transform ${
              isAmoled ? "bg-neutral-900 text-neutral-300" : "bg-neutral-200 text-neutral-700"
            }`}
            title="10-Band Equalizer"
          >
            <Sliders size={15} style={{ color: accent.hex }} />
          </button>

          <button
            onClick={() => setIsSonicAiOpen(true)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl active:scale-95 transition-transform ${
              isAmoled ? "bg-neutral-900 text-neutral-300" : "bg-neutral-200 text-neutral-700"
            }`}
            title="Sonic Intelligence"
          >
            <Sparkles size={15} style={{ color: accent.hex }} />
          </button>

          <button
            onClick={toggleTheme}
            className={`w-9 h-9 flex items-center justify-center rounded-xl active:scale-95 transition-transform ${
              isAmoled ? "bg-neutral-900 text-amber-400" : "bg-neutral-200 text-neutral-700"
            }`}
            title="Toggle Theme"
          >
            {isAmoled ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Flat Color Palette Dropdown */}
          {isPaletteOpen && (
            <div
              className={`absolute top-11 right-0 z-50 p-2 rounded-xl flex flex-col gap-1 w-44 ${
                isAmoled ? "bg-neutral-900 text-white" : "bg-white text-black"
              }`}
            >
              <div className="text-[10px] font-mono text-neutral-400 px-2 py-1 font-semibold uppercase tracking-wider">
                Accent Color
              </div>
              {ACCENT_COLORS.map((col) => (
                <button
                  key={col.id}
                  onClick={() => {
                    setAccent(col);
                    setIsPaletteOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                    accent.id === col.id
                      ? isAmoled
                        ? "bg-black font-bold"
                        : "bg-neutral-100 font-bold"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: col.hex }}
                    />
                    <span className="text-[11px] truncate">{col.name}</span>
                  </div>
                  {accent.id === col.id && (
                    <span className="text-[11px] font-bold" style={{ color: col.hex }}>
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* MAIN SINGLE-SCREEN MOBILE STAGE */}
      <main
        className={`flex-1 w-full max-w-sm mx-auto px-5 select-none ${
          activeNavTab === "now-playing"
            ? "h-[calc(100dvh-52px-56px)] flex flex-col justify-between pt-2 pb-4 overflow-hidden"
            : "overflow-y-auto py-3 pb-28"
        }`}
      >
        {activeNavTab === "now-playing" && (
          <div className="w-full h-full flex flex-col justify-between min-h-0">
            {/* 1. Flat Artwork / Monogram Stage OR Phone File Picker Zero-State */}
            <div className="flex-1 min-h-[120px] max-h-[220px] w-full flex items-center justify-center my-auto shrink">
              {!currentTrack ? (
                <div
                  className={`w-full h-full rounded-2xl p-4 flex flex-col items-center justify-center text-center ${
                    isAmoled ? "bg-neutral-900" : "bg-neutral-200/70"
                  }`}
                >
                  <HardDrive size={26} style={{ color: accent.hex }} className="mb-2" />
                  <h2 className="text-sm font-bold">Load Phone Audio</h2>
                  <p className="text-[11px] text-neutral-400 mt-0.5 mb-3 max-w-[230px]">
                    Pick audio files or scan a music folder from your phone to start listening.
                  </p>
                  <div className="w-full grid grid-cols-2 gap-2">
                    <label
                      className="h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                      style={{ backgroundColor: accent.hex, color: "#000000" }}
                    >
                      <Upload size={14} />
                      <span>Select Files</span>
                      <input
                        type="file"
                        multiple
                        accept="audio/*,.mp3,.flac,.wav,.m4a,.aac,.ogg,.opus"
                        onChange={(e) =>
                          e.target.files && handleUploadAudioFiles(e.target.files)
                        }
                        className="hidden"
                      />
                    </label>

                    <label
                      className={`h-10 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform ${
                        isAmoled ? "bg-black text-white" : "bg-white text-neutral-900"
                      }`}
                    >
                      <FolderOpen size={14} style={{ color: accent.hex }} />
                      <span>Scan Folder</span>
                      <input
                        type="file"
                        {...({ webkitdirectory: "", directory: "" } as any)}
                        multiple
                        onChange={(e) =>
                          e.target.files && handleUploadAudioFiles(e.target.files)
                        }
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div
                  className={`relative h-full aspect-square max-h-[210px] rounded-2xl overflow-hidden flex flex-col items-center justify-center ${
                    isAmoled ? "bg-neutral-900" : "bg-neutral-200"
                  }`}
                >
                  {currentTrack.coverUrl ? (
                    <img
                      src={currentTrack.coverUrl}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-5 text-center select-none">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                        style={{
                          backgroundColor: `${accent.hex}18`,
                          color: accent.hex,
                        }}
                      >
                        <Music size={28} />
                      </div>
                      <span
                        className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: accent.hex,
                          color: "#000000",
                        }}
                      >
                        {currentTrack.genre || "LOCAL AUDIO"}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-500 mt-2 truncate max-w-full">
                        {currentTrack.folderPath || "/Phone Storage"}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Track Metadata & Quick Action Buttons */}
            <div className="w-full shrink-0 flex items-center justify-between gap-2 my-1">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span
                    className="text-[10px] font-mono font-bold uppercase tracking-wider"
                    style={{ color: accent.hex }}
                  >
                    {currentTrack ? currentTrack.genre || "LOCAL FILE" : "READY"}
                  </span>
                  {currentTrack?.folderPath && (
                    <span className="text-[10px] text-neutral-500 font-mono truncate">
                      · {currentTrack.folderPath}
                    </span>
                  )}
                </div>

                <h1 className="text-lg font-bold tracking-tight truncate leading-tight">
                  {currentTrack?.title || "No Track Selected"}
                </h1>

                <p className="text-xs font-medium text-neutral-400 truncate mt-0.5">
                  {currentTrack
                    ? `${currentTrack.artist} · ${currentTrack.album}`
                    : "Tap Select Files or open File Explorer below"}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => currentTrack && setAddToPlaylistTrack(currentTrack)}
                  disabled={!currentTrack}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40 ${
                    isAmoled ? "bg-neutral-900 text-neutral-300" : "bg-neutral-200 text-neutral-700"
                  }`}
                  title="Add to Playlist"
                >
                  <ListPlus size={17} />
                </button>
                <button
                  onClick={() => currentTrack && toggleFavorite(currentTrack.id)}
                  disabled={!currentTrack}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40 ${
                    currentTrack && favorites.has(currentTrack.id)
                      ? "text-rose-500 bg-rose-500/15"
                      : isAmoled
                      ? "bg-neutral-900 text-neutral-300"
                      : "bg-neutral-200 text-neutral-700"
                  }`}
                  title="Favorite Track"
                >
                  <Heart
                    size={17}
                    fill={
                      currentTrack && favorites.has(currentTrack.id)
                        ? "currentColor"
                        : "none"
                    }
                  />
                </button>
              </div>
            </div>

            {/* 3. Pure Flat Waveform Seekbar */}
            <div className="w-full shrink-0 my-1">
              <WaveformSeekbar
                track={currentTrack}
                currentTime={currentTime}
                duration={duration}
                theme={theme}
                accent={accent}
                crossfadeSeconds={crossfadeSeconds}
                gaplessEnabled={gaplessEnabled}
                isCrossfading={isCrossfading}
                onSeek={handleSeek}
                onOpenEqualizer={() => setIsEqualizerOpen(true)}
              />
            </div>

            {/* 4. Flat Transport Controls (Elevated with clean spacing) */}
            <div className="w-full flex items-center justify-between shrink-0 my-1">
              <button
                onClick={() => setIsShuffle(!isShuffle)}
                className={`w-11 h-11 flex items-center justify-center rounded-xl active:scale-95 transition-transform ${
                  isShuffle
                    ? "text-black"
                    : isAmoled
                    ? "bg-neutral-900 text-neutral-400"
                    : "bg-neutral-200 text-neutral-600"
                }`}
                style={isShuffle ? { backgroundColor: accent.hex } : undefined}
                title="Shuffle Queue"
              >
                <Shuffle size={17} />
              </button>

              <button
                onClick={skipPrevious}
                className={`w-12 h-12 flex items-center justify-center rounded-xl active:scale-95 transition-transform ${
                  isAmoled ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-900"
                }`}
                title="Previous Track"
              >
                <SkipBack size={20} />
              </button>

              {/* Pure Flat Solid Play / Pause Button (Zero shadow, zero glow) */}
              <button
                onClick={togglePlayPause}
                className="w-16 h-16 rounded-2xl flex items-center justify-center active:scale-95 transition-transform"
                style={{
                  backgroundColor: accent.hex,
                  color: "#000000",
                }}
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause size={26} fill="currentColor" />
                ) : (
                  <Play size={26} fill="currentColor" className="ml-0.5" />
                )}
              </button>

              <button
                onClick={skipNext}
                className={`w-12 h-12 flex items-center justify-center rounded-xl active:scale-95 transition-transform ${
                  isAmoled ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-900"
                }`}
                title="Next Track"
              >
                <SkipForward size={20} />
              </button>

              <button
                onClick={() => {
                  if (repeatMode === "off") setRepeatMode("all");
                  else if (repeatMode === "all") setRepeatMode("one");
                  else setRepeatMode("off");
                }}
                className={`w-11 h-11 flex items-center justify-center rounded-xl active:scale-95 transition-transform ${
                  repeatMode !== "off"
                    ? "text-black"
                    : isAmoled
                    ? "bg-neutral-900 text-neutral-400"
                    : "bg-neutral-200 text-neutral-600"
                }`}
                style={repeatMode !== "off" ? { backgroundColor: accent.hex } : undefined}
                title={`Repeat: ${repeatMode.toUpperCase()}`}
              >
                {repeatMode === "one" ? <Repeat1 size={17} /> : <Repeat size={17} />}
              </button>
            </div>

            {/* 5. Flat Volume & Utility Strip */}
            <div
              className={`w-full h-10 rounded-xl px-3 flex items-center justify-between gap-2.5 shrink-0 ${
                isAmoled ? "bg-neutral-900" : "bg-neutral-200/80"
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <button
                  onClick={toggleMute}
                  className="p-1 text-neutral-400 hover:text-white transition-colors"
                  title="Mute / Unmute"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX size={15} />
                  ) : volume < 0.5 ? (
                    <Volume1 size={15} />
                  ) : (
                    <Volume2 size={15} />
                  )}
                </button>

                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-lg cursor-pointer appearance-none bg-neutral-800"
                  style={{ accentColor: accent.hex }}
                />

                <span className="text-[10px] font-mono text-neutral-400 w-7 text-right tabular-nums shrink-0">
                  {isMuted ? "0%" : `${Math.round(volume * 100)}%`}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setIsLyricsOpen(true)}
                  className={`h-7 px-2.5 rounded-lg text-[10px] font-mono font-semibold flex items-center gap-1 active:scale-95 transition-transform ${
                    isAmoled ? "bg-black text-neutral-300" : "bg-white text-neutral-700"
                  }`}
                >
                  <Mic2 size={11} style={{ color: accent.hex }} />
                  <span>Lyrics</span>
                </button>

                <button
                  onClick={cycleSleepTimer}
                  className={`h-7 px-2.5 rounded-lg text-[10px] font-mono font-semibold flex items-center gap-1 active:scale-95 transition-transform ${
                    sleepTimerMinutes !== null
                      ? "text-black font-bold"
                      : isAmoled
                      ? "bg-black text-neutral-300"
                      : "bg-white text-neutral-700"
                  }`}
                  style={
                    sleepTimerMinutes !== null
                      ? { backgroundColor: accent.hex }
                      : undefined
                  }
                >
                  <Clock size={11} />
                  <span className="tabular-nums">
                    {sleepTimerRemaining !== null
                      ? `${Math.ceil(sleepTimerRemaining / 60)}m`
                      : "Timer"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PLAYLIST HUB VIEW */}
        {activeNavTab === "playlists" && (
          <PlaylistHub
            playlists={playlists}
            activePlaylistId={activePlaylistId}
            currentTrack={currentTrack}
            theme={theme}
            accent={accent}
            onSelectPlaylist={(plId) => setActivePlaylistId(plId)}
            onPlayPlaylist={(pl, shuffle) => {
              if (pl.tracks.length > 0) {
                const tracksToPlay = shuffle
                  ? [...pl.tracks].sort(() => Math.random() - 0.5)
                  : pl.tracks;
                setQueue(tracksToPlay);
                setCurrentTrackIndex(0);
                setDuration(tracksToPlay[0].duration || 0);
                globalAudioEngine.playTrack(tracksToPlay[0], 0);
              }
            }}
            onCreatePlaylist={(name, desc, cover) => {
              const newPl: Playlist = {
                id: `pl-${Date.now()}`,
                name,
                description: desc || "Custom audio collection",
                tracks: [],
                coverUrl: cover || "",
                isCustom: true,
              };
              setPlaylists((prev) => [...prev, newPl]);
            }}
            onDeletePlaylist={(plId) => {
              setPlaylists((prev) => prev.filter((p) => p.id !== plId));
            }}
            onReorderTrack={handleReorderTrackInPlaylist}
            onRemoveTrackFromPlaylist={handleRemoveTrackFromPlaylist}
            onPlayTrack={handlePlayTrackFromMemory}
            onEnqueueTrack={handleEnqueueTrackFromMemory}
          />
        )}
      </main>

      {/* PERMANENT PLAYLIST DOCK */}
      {activeNavTab === "playlists" && !isFileManagerOpen && !isQueueOpen && (
        <PermanentPlaylistBar
          playlists={playlists}
          activePlaylistId={activePlaylistId}
          theme={theme}
          accent={accent}
          onSelectPlaylist={(plId) => {
            setActivePlaylistId(plId);
            const pl = playlists.find((p) => p.id === plId);
            if (pl && pl.tracks.length > 0) {
              setQueue(pl.tracks);
              setCurrentTrackIndex(0);
              setDuration(pl.tracks[0].duration || 0);
              globalAudioEngine.playTrack(pl.tracks[0], 0);
            }
          }}
          onPlayPlaylist={(pl, shuffle) => {
            if (pl.tracks.length > 0) {
              const tracksToPlay = shuffle
                ? [...pl.tracks].sort(() => Math.random() - 0.5)
                : pl.tracks;
              setQueue(tracksToPlay);
              setCurrentTrackIndex(0);
              setDuration(tracksToPlay[0].duration || 0);
              globalAudioEngine.playTrack(tracksToPlay[0], 0);
            }
          }}
          onOpenPlaylistHub={() => {
            setActiveNavTab("playlists");
            setIsFileManagerOpen(false);
            setIsQueueOpen(false);
          }}
          onCreatePlaylist={(name) => {
            const newPl: Playlist = {
              id: `pl-${Date.now()}`,
              name,
              description: "Custom user collection",
              tracks: currentTrack ? [currentTrack] : [],
              coverUrl: currentTrack?.coverUrl,
              isCustom: true,
            };
            setPlaylists((prev) => [...prev, newPl]);
          }}
        />
      )}

      {/* FLAT MINI PLAYER BAR */}
      {(activeNavTab !== "now-playing" || isFileManagerOpen || isQueueOpen) && currentTrack && (
        <div
          onClick={() => {
            setActiveNavTab("now-playing");
            setIsFileManagerOpen(false);
            setIsQueueOpen(false);
          }}
          className={`fixed bottom-14 left-0 right-0 z-[55] h-12 cursor-pointer select-none ${
            isAmoled ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-900"
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-neutral-800">
            <div
              className="h-full transition-all"
              style={{
                width: `${(currentTime / (duration || 1)) * 100}%`,
                backgroundColor: accent.hex,
              }}
            />
          </div>

          <div className="w-full max-w-sm mx-auto h-full px-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: accent.hex, color: "#000000" }}
              >
                <Disc size={16} className={isPlaying ? "animate-spin" : ""} />
              </div>
              <div className="min-w-0 truncate">
                <div className="text-xs font-bold truncate">{currentTrack.title}</div>
                <div className="text-[10px] text-neutral-400 truncate">
                  {currentTrack.artist}
                </div>
              </div>
            </div>

            <div
              className="flex items-center gap-1.5 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={togglePlayPause}
                className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 transition-transform"
                style={{ backgroundColor: accent.hex, color: "#000000" }}
              >
                {isPlaying ? (
                  <Pause size={14} fill="currentColor" />
                ) : (
                  <Play size={14} fill="currentColor" className="ml-0.5" />
                )}
              </button>
              <button
                onClick={skipNext}
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isAmoled ? "bg-black text-neutral-300" : "bg-white text-neutral-700"
                }`}
              >
                <SkipForward size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLAT BOTTOM NAVIGATION BAR (56px) */}
      <BottomNavBar
        activeTab={activeNavTab}
        onSelectTab={(tab) => {
          setActiveNavTab(tab);
          if (tab === "memory") {
            setIsFileManagerOpen(true);
            setIsQueueOpen(false);
          } else if (tab === "queue") {
            setIsQueueOpen(true);
            setIsFileManagerOpen(false);
          } else {
            setIsFileManagerOpen(false);
            setIsQueueOpen(false);
          }
        }}
        theme={theme}
        accent={accent}
        queueCount={queue.length}
      />

      {/* MODALS AND DRAWERS */}
      <FileManagerModal
        isOpen={isFileManagerOpen || activeNavTab === "memory"}
        onClose={() => {
          setIsFileManagerOpen(false);
          if (activeNavTab === "memory") setActiveNavTab("now-playing");
        }}
        theme={theme}
        accent={accent}
        currentTrack={currentTrack}
        folders={memoryFolders}
        allTracks={allTracks}
        onPlayTrack={handlePlayTrackFromMemory}
        onEnqueueTrack={handleEnqueueTrackFromMemory}
        onEnqueueMultiple={handleEnqueueMultipleFromMemory}
        onPlayMultiple={handlePlayMultipleFromMemory}
        onImportTracks={handleImportTracksToFolder}
        onCreateFolder={handleCreateFolder}
        onDeleteTrackFromMemory={handleDeleteTrackFromMemory}
      />

      <EqualizerModal
        isOpen={isEqualizerOpen}
        onClose={() => setIsEqualizerOpen(false)}
        theme={theme}
        accent={accent}
        currentTrack={currentTrack}
        eqBands={eqBands}
        bassBoost={bassBoost}
        reverb={reverb}
        playbackRate={playbackRate}
        crossfadeSeconds={crossfadeSeconds}
        gaplessEnabled={gaplessEnabled}
        onUpdateBands={handleUpdateEqBands}
        onUpdateBassBoost={handleUpdateBassBoost}
        onUpdateReverb={handleUpdateReverb}
        onUpdatePlaybackRate={handleUpdatePlaybackRate}
        onUpdateCrossfade={handleUpdateCrossfade}
        onUpdateGapless={handleUpdateGapless}
        onTriggerAiSonic={() => {
          setIsEqualizerOpen(false);
          setIsSonicAiOpen(true);
        }}
      />

      <LyricsView
        isOpen={isLyricsOpen}
        onClose={() => setIsLyricsOpen(false)}
        track={currentTrack}
        currentTime={currentTime}
        theme={theme}
        accent={accent}
        onSeek={handleSeek}
        onDeepLyricAnalysis={() => {
          setIsLyricsOpen(false);
          setIsSonicAiOpen(true);
        }}
      />

      <KotlinStudio
        isOpen={isKotlinStudioOpen}
        onClose={() => setIsKotlinStudioOpen(false)}
        theme={theme}
        accent={accent}
        onAddTracksFromDsl={handleAddTracksFromDsl}
        onTriggerAiKotlinDsp={() => {
          setIsKotlinStudioOpen(false);
          setIsSonicAiOpen(true);
        }}
      />

      <SonicIntelligenceModal
        isOpen={isSonicAiOpen}
        onClose={() => setIsSonicAiOpen(false)}
        track={currentTrack}
        theme={theme}
        accent={accent}
        onApplyEqProfile={handleApplyEqProfile}
      />

      <QueueDrawer
        isOpen={isQueueOpen || activeNavTab === "queue"}
        onClose={() => {
          setIsQueueOpen(false);
          if (activeNavTab === "queue") setActiveNavTab("now-playing");
        }}
        theme={theme}
        accent={accent}
        queue={queue}
        currentTrack={currentTrack}
        currentTime={currentTime}
        queues={queues}
        activeQueueId={activeQueueId}
        playlists={playlists}
        activePlaylistId={activePlaylistId}
        onSelectTrack={(t) => {
          const idx = queue.findIndex((item) => item.id === t.id);
          if (idx !== -1) playTrackAtIndex(idx);
        }}
        onSwitchQueue={handleSwitchQueue}
        onCreateQueue={handleCreateQueue}
        onDuplicateQueue={handleDuplicateQueue}
        onDeleteQueue={handleDeleteQueue}
        onRenameQueue={handleRenameQueue}
        onSelectPlaylist={(plId) => {
          setActivePlaylistId(plId);
          const pl = playlists.find((p) => p.id === plId);
          if (pl && pl.tracks.length > 0) {
            setQueue(pl.tracks);
            setCurrentTrackIndex(0);
            setDuration(pl.tracks[0].duration || 0);
            globalAudioEngine.playTrack(pl.tracks[0], 0);
          }
        }}
        onRemoveFromQueue={(tId) => {
          setQueue((prev) => prev.filter((item) => item.id !== tId));
        }}
        onClearQueue={() => {
          setQueue([]);
          globalAudioEngine.pause();
        }}
        onUploadAudioFiles={handleUploadAudioFiles}
        onCreatePlaylist={(name) => {
          const newPl: Playlist = {
            id: `pl-${Date.now()}`,
            name,
            description: "Custom user collection",
            tracks: currentTrack ? [currentTrack] : [],
            coverUrl: currentTrack?.coverUrl,
            isCustom: true,
          };
          setPlaylists((prev) => [...prev, newPl]);
        }}
        onOpenFileManager={() => {
          setActiveNavTab("memory");
          setIsFileManagerOpen(true);
        }}
      />

      <AddToPlaylistModal
        isOpen={addToPlaylistTrack !== null}
        onClose={() => setAddToPlaylistTrack(null)}
        track={addToPlaylistTrack}
        playlists={playlists}
        theme={theme}
        accent={accent}
        onAddTrackToPlaylist={handleAddTrackToPlaylist}
        onCreateAndAddTrack={handleCreateAndAddTrack}
      />
    </div>
  );
}
