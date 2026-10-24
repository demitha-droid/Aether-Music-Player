/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
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
  ListMusic,
  Code2,
  Sparkles,
  Sun,
  Moon,
  Clock,
  Disc,
  Activity,
  Radio,
  AudioWaveform,
  Orbit,
  Sparkle,
  Upload,
  Maximize2,
  Minimize2,
  Share2,
  Heart,
  HardDrive,
  ListPlus,
  Layers,
  Plus,
} from "lucide-react";

import {
  Track,
  ThemeMode,
  AccentColor,
  RepeatMode,
  VisualizerMode,
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
import { AudioVisualizer } from "./components/AudioVisualizer";
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
    glow: "rgba(0, 242, 254, 0.35)",
    activeBg: "bg-cyan-500",
  },
  {
    id: "emerald",
    name: "Matrix Emerald",
    hex: "#10b981",
    glow: "rgba(16, 185, 129, 0.35)",
    activeBg: "bg-emerald-500",
  },
  {
    id: "purple",
    name: "Kotlin Violet",
    hex: "#a855f7",
    glow: "rgba(168, 85, 247, 0.35)",
    activeBg: "bg-purple-500",
  },
  {
    id: "amber",
    name: "Cyber Amber",
    hex: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.35)",
    activeBg: "bg-amber-500",
  },
  {
    id: "crimson",
    name: "Neon Crimson",
    hex: "#f43f5e",
    glow: "rgba(244, 63, 94, 0.35)",
    activeBg: "bg-rose-500",
  },
  {
    id: "mono",
    name: "Pure Monochrome",
    hex: "#e2e8f0",
    glow: "rgba(226, 232, 240, 0.35)",
    activeBg: "bg-slate-200",
  },
];

export default function App() {
  // Theme & Appearance
  const [theme, setTheme] = useState<ThemeMode>("amoled");
  const [accent, setAccent] = useState<AccentColor>(ACCENT_COLORS[0]);
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>("bars");

  // Playlists, Memory & Multi-Queue Sessions (Musicolet Style)
  const [playlists, setPlaylists] = useState<Playlist[]>(DEFAULT_PLAYLISTS);
  const [activePlaylistId, setActivePlaylistId] = useState<string>("playlist-all");
  const [allTracks, setAllTracks] = useState<Track[]>(DEFAULT_TRACKS);
  const [memoryFolders, setMemoryFolders] = useState<MemoryFolder[]>(INITIAL_MEMORY_FOLDERS);
  const [queue, setQueue] = useState<Track[]>(DEFAULT_TRACKS);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [favorites, setFavorites] = useState<Set<string>>(new Set(["track-1", "track-5"]));

  // Independent Playback Queues (Each remembers its own tracklist, track index, and timestamp)
  const [queues, setQueues] = useState<PlaybackQueueSession[]>(() => [
    {
      id: "queue-1",
      name: "Main Stage",
      tracks: DEFAULT_TRACKS,
      currentTrackIndex: 0,
      savedProgressSeconds: 0,
      updatedAt: Date.now(),
    },
    {
      id: "queue-2",
      name: "Night Drive Synth",
      tracks: DEFAULT_TRACKS.slice(0, 3),
      currentTrackIndex: 1,
      savedProgressSeconds: 48,
      updatedAt: Date.now() - 3600000,
    },
    {
      id: "queue-3",
      name: "Deep Focus Lo-Fi",
      tracks: DEFAULT_TRACKS.slice(2, 6),
      currentTrackIndex: 0,
      savedProgressSeconds: 75,
      updatedAt: Date.now() - 7200000,
    },
  ]);
  const [activeQueueId, setActiveQueueId] = useState<string>("queue-1");

  // Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(DEFAULT_TRACKS[0]?.duration || 180);
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

  // Keep the active queue session synchronized with live queue, track index, and timestamp
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

  // Handle Track End based on repeat mode
  const handleTrackEnded = () => {
    if (repeatMode === "one") {
      if (currentTrack) {
        globalAudioEngine.playTrack(currentTrack, 0);
      }
    } else if (isShuffle) {
      const nextIndex = Math.floor(Math.random() * queue.length);
      playTrackAtIndex(nextIndex);
    } else if (currentTrackIndex < queue.length - 1) {
      playTrackAtIndex(currentTrackIndex + 1);
    } else if (repeatMode === "all") {
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

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlayPause();
          break;
        case "ArrowLeft":
          e.preventDefault();
          handleSeek(Math.max(0, currentTime - 5));
          break;
        case "ArrowRight":
          e.preventDefault();
          handleSeek(Math.min(duration, currentTime + 5));
          break;
        case "ArrowUp":
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.05));
          break;
        case "ArrowDown":
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.05));
          break;
        case "KeyM":
          toggleMute();
          break;
        case "KeyL":
          setIsLyricsOpen((v) => !v);
          break;
        case "KeyE":
          setIsEqualizerOpen((v) => !v);
          break;
        case "KeyK":
          setIsKotlinStudioOpen((v) => !v);
          break;
        case "KeyA":
          setIsSonicAiOpen((v) => !v);
          break;
        case "KeyQ":
          setIsQueueOpen((v) => !v);
          break;
        case "KeyF":
          setIsFileManagerOpen((v) => !v);
          break;
        case "KeyT":
          toggleTheme();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, currentTime, duration, volume, isMuted, currentTrack]);

  // Play / Pause toggle
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

  // Audio Upload Handling
  const handleUploadAudioFiles = (files: FileList | File[]) => {
    const uploadedTracks: Track[] = Array.from(files).map((file, i) => {
      const title = file.name.replace(/\.[^/.]+$/, "");
      return {
        id: `local-${Date.now()}-${i}`,
        title,
        artist: "Local Audio File",
        album: "Local Imports",
        duration: 180,
        coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
        genre: "Custom Audio",
        file,
        fileSize: file.size,
        lastModified: file.lastModified,
        folderPath: "/Internal Storage/Music",
        isSynthetic: false,
      };
    });

    if (uploadedTracks.length > 0) {
      setAllTracks((prev) => [...uploadedTracks, ...prev]);
      setQueue((prev) => [...uploadedTracks, ...prev]);
      setCurrentTrackIndex(0);
      globalAudioEngine.playTrack(uploadedTracks[0], 0);

      // Register with Music folder
      setMemoryFolders((prev) =>
        prev.map((f) =>
          f.id === "folder-music"
            ? { ...f, trackIds: [...uploadedTracks.map((t) => t.id), ...f.trackIds] }
            : f
        )
      );
    }
  };

  // Memory File Manager Handlers
  const handlePlayTrackFromMemory = (track: Track) => {
    const existingIndex = queue.findIndex((t) => t.id === track.id);
    if (existingIndex !== -1) {
      playTrackAtIndex(existingIndex);
    } else {
      setQueue((prev) => [track, ...prev]);
      setCurrentTrackIndex(0);
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
    globalAudioEngine.playTrack(tracks[0], 0);
  };

  const handleEnqueueMultipleFromMemory = (tracks: Track[]) => {
    const newItems = tracks.filter((t) => !queue.some((q) => q.id === t.id));
    setQueue((prev) => [...prev, ...newItems]);
  };

  const handleImportTracksToFolder = (files: FileList | File[], targetFolderId: string) => {
    const targetFolder = memoryFolders.find((f) => f.id === targetFolderId);
    const targetPath = targetFolder?.path || "/Internal Storage/Music";

    const newTracks: Track[] = Array.from(files).map((file, i) => {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      return {
        id: `local-mem-${Date.now()}-${i}`,
        title: nameWithoutExt,
        artist: "Device Memory",
        album: targetFolder?.name || "Local Audio",
        duration: 180,
        coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
        genre: "Imported File",
        file,
        fileSize: file.size,
        lastModified: file.lastModified,
        folderPath: targetPath,
        isSynthetic: false,
      };
    });

    if (newTracks.length > 0) {
      setAllTracks((prev) => [...newTracks, ...prev]);
      setMemoryFolders((prev) =>
        prev.map((f) =>
          f.id === targetFolderId
            ? { ...f, trackIds: [...f.trackIds, ...newTracks.map((t) => t.id)] }
            : f
        )
      );

      // Play the first imported track
      handlePlayTrackFromMemory(newTracks[0]);
    }
  };

  const handleCreateFolder = (name: string, parentId: string | null) => {
    const parent = memoryFolders.find((f) => f.id === parentId);
    const parentPath = parent?.path || "/Internal Storage";
    const newFolder: MemoryFolder = {
      id: `folder-${Date.now()}`,
      name,
      path: `${parentPath}/${name}`,
      parentId,
      trackIds: [],
    };
    setMemoryFolders((prev) => [...prev, newFolder]);
  };

  const handleDeleteTrackFromMemory = (trackId: string) => {
    setAllTracks((prev) => prev.filter((t) => t.id !== trackId));
    setQueue((prev) => prev.filter((t) => t.id !== trackId));
    setMemoryFolders((prev) =>
      prev.map((f) => ({
        ...f,
        trackIds: f.trackIds.filter((id: string) => id !== trackId),
      }))
    );
  };

  // Playlist Hub Handlers
  const handlePlayPlaylist = (playlist: Playlist, shuffle: boolean = false) => {
    if (playlist.tracks.length === 0) return;
    let tracksToPlay = [...playlist.tracks];
    if (shuffle) {
      tracksToPlay = tracksToPlay.sort(() => Math.random() - 0.5);
    }
    setActivePlaylistId(playlist.id);
    setQueue(tracksToPlay);
    setCurrentTrackIndex(0);
    globalAudioEngine.playTrack(tracksToPlay[0], 0);
  };

  const handleCreatePlaylist = (name: string, description: string, coverUrl?: string) => {
    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      name,
      description,
      tracks: [],
      coverUrl: coverUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
      isCustom: true,
    };
    setPlaylists((prev) => [...prev, newPl]);
  };

  const handleDeletePlaylist = (playlistId: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
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

  // Drag and drop audio files over entire window
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

  // Apply Equalizer Profile from AI or Modal
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

  // Musicolet-Style Multi-Queue Handlers
  const handleSwitchQueue = (targetQueueId: string) => {
    if (targetQueueId === activeQueueId) return;
    const targetQ = queues.find((q) => q.id === targetQueueId);
    if (!targetQ) return;

    // Save current queue's exact state first
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

    // Activate target queue and restore its remembered track & playback timestamp
    setActiveQueueId(targetQ.id);
    setQueue(targetQ.tracks);
    const safeIdx = Math.min(targetQ.currentTrackIndex, Math.max(0, targetQ.tracks.length - 1));
    setCurrentTrackIndex(safeIdx);
    const targetTrack = targetQ.tracks[safeIdx] || null;
    const resumeTime = targetQ.savedProgressSeconds || 0;
    setCurrentTime(resumeTime);
    if (targetTrack) {
      setDuration(targetTrack.duration || 180);
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
      tracks: currentTrack ? [currentTrack] : DEFAULT_TRACKS.slice(0, 3),
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

  // Handle adding tracks compiled from Kotlin DSL
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

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const isAmoled = theme === "amoled";

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`min-h-screen w-full flex flex-col transition-colors duration-300 font-sans select-none relative ${
        isAmoled ? "bg-black text-white" : "bg-neutral-50 text-neutral-900"
      }`}
    >
      {/* Drag & Drop Overlay */}
      {isDraggingFile && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center border-4 border-dashed border-cyan-400 p-8 text-center animate-in fade-in">
          <Upload size={64} className="text-cyan-400 mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold text-white">Drop Audio Files Here</h2>
          <p className="text-sm text-neutral-400 mt-2">
            Supports MP3, WAV, FLAC, OGG, AAC &bull; Instantly loads into Aether Player
          </p>
        </div>
      )}

      {/* TOP STATUS / NAV BAR */}
      <header
        className={`w-full px-6 py-4 flex items-center justify-between border-b shrink-0 ${
          isAmoled ? "border-neutral-900/90 bg-black" : "border-neutral-200/90 bg-white"
        }`}
      >
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs"
            style={{
              backgroundColor: accent.hex,
              color: isAmoled ? "#000000" : "#ffffff",
              boxShadow: `0 0 16px ${accent.glow}`,
            }}
          >
            AE
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-sm">AETHER</span>
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold tracking-wider uppercase"
                style={{
                  backgroundColor: `${accent.hex}18`,
                  color: accent.hex,
                  border: `1px solid ${accent.hex}30`,
                }}
              >
                Kotlin &bull; {isAmoled ? "AMOLED" : "LIGHT"}
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 tracking-wide font-mono">
              AUDIO ENGINE V2.6
            </p>
          </div>
        </div>

        {/* Center: Quick Action Launchers */}
        <div className="hidden md:flex items-center gap-2">
          {/* Memory Explorer Button */}
          <button
            onClick={() => {
              setActiveNavTab("memory");
              setIsFileManagerOpen(true);
              setIsQueueOpen(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all border ${
              isAmoled
                ? "bg-neutral-950 border-neutral-800 hover:bg-neutral-900 text-neutral-200"
                : "bg-neutral-100 border-neutral-200 hover:bg-neutral-200 text-neutral-800"
            }`}
            title="Browse device memory audio files & directories (Key: F)"
          >
            <HardDrive size={13} style={{ color: accent.hex }} />
            <span>Memory</span>
          </button>

          {/* Kotlin Studio Button */}
          <button
            onClick={() => setIsKotlinStudioOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all border ${
              isAmoled
                ? "bg-neutral-950 border-neutral-800 hover:bg-neutral-900 text-neutral-200"
                : "bg-neutral-100 border-neutral-200 hover:bg-neutral-200 text-neutral-800"
            }`}
            title="Inspect Kotlin Media3 Architecture, StateFlow & Run Kotlin DSL (Key: K)"
          >
            <Code2 size={13} style={{ color: accent.hex }} />
            <span>Kotlin Studio</span>
          </button>

          {/* Sonic Intelligence Button */}
          <button
            onClick={() => setIsSonicAiOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all border ${
              isAmoled
                ? "bg-neutral-950 border-neutral-800 hover:bg-neutral-900 text-neutral-200"
                : "bg-neutral-100 border-neutral-200 hover:bg-neutral-200 text-neutral-800"
            }`}
            title="Engage Gemini 4 Argon with High Thinking for Sonic Acoustic Reasoning (Key: A)"
          >
            <Sparkles size={13} style={{ color: accent.hex }} />
            <span>Sonic AI</span>
          </button>

          {/* Equalizer Button */}
          <button
            onClick={() => setIsEqualizerOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all border ${
              isAmoled
                ? "bg-neutral-950 border-neutral-800 hover:bg-neutral-900 text-neutral-200"
                : "bg-neutral-100 border-neutral-200 hover:bg-neutral-200 text-neutral-800"
            }`}
            title="10-Band Graphic Equalizer & Bass Boost (Key: E)"
          >
            <Sliders size={13} style={{ color: accent.hex }} />
            <span>10-Band EQ</span>
          </button>

          {/* Lyrics Button */}
          <button
            onClick={() => setIsLyricsOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all border ${
              isAmoled
                ? "bg-neutral-950 border-neutral-800 hover:bg-neutral-900 text-neutral-200"
                : "bg-neutral-100 border-neutral-200 hover:bg-neutral-200 text-neutral-800"
            }`}
            title="Synchronized Lyrics & Meaning (Key: L)"
          >
            <Mic2 size={13} style={{ color: accent.hex }} />
            <span>Lyrics</span>
          </button>
        </div>

        {/* Right: Theme Switcher & Accents & Queue */}
        <div className="flex items-center gap-3">
          {/* Accent Color Palette Selector */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full border border-neutral-800/40">
            {ACCENT_COLORS.map((col) => (
              <button
                key={col.id}
                onClick={() => setAccent(col)}
                className={`w-4 h-4 rounded-full transition-transform ${
                  accent.id === col.id ? "scale-125 ring-2 ring-white/60" : "hover:scale-110 opacity-70"
                }`}
                style={{ backgroundColor: col.hex }}
                title={col.name}
              />
            ))}
          </div>

          {/* Mobile Memory trigger */}
          <button
            onClick={() => {
              setActiveNavTab("memory");
              setIsFileManagerOpen(true);
              setIsQueueOpen(false);
            }}
            className={`md:hidden p-2 rounded-xl transition-all border ${
              isAmoled
                ? "bg-neutral-950 border-neutral-800 text-neutral-300"
                : "bg-neutral-100 border-neutral-200 text-neutral-700"
            }`}
            title="Memory Files (Key: F)"
          >
            <HardDrive size={16} style={{ color: accent.hex }} />
          </button>

          {/* Theme Toggle (AMOLED / Light) */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl transition-all border ${
              isAmoled
                ? "bg-neutral-950 border-neutral-800 hover:bg-neutral-900 text-amber-400"
                : "bg-neutral-100 border-neutral-200 hover:bg-neutral-200 text-neutral-700"
            }`}
            title={isAmoled ? "Switch to Light Mode (Key: T)" : "Switch to pure AMOLED Black (Key: T)"}
          >
            {isAmoled ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Queue Drawer Trigger */}
          <button
            onClick={() => {
              setActiveNavTab("queue");
              setIsQueueOpen(true);
              setIsFileManagerOpen(false);
            }}
            className={`p-2 rounded-xl transition-all border flex items-center gap-1.5 text-xs font-semibold ${
              isAmoled
                ? "bg-neutral-950 border-neutral-800 hover:bg-neutral-900 text-white"
                : "bg-neutral-100 border-neutral-200 hover:bg-neutral-200 text-neutral-900"
            }`}
            title="Open Queue & Playlist Library (Key: Q)"
          >
            <ListMusic size={16} style={{ color: accent.hex }} />
            <span className="hidden sm:inline font-mono">{queue.length}</span>
          </button>
        </div>
      </header>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 pb-32 relative overflow-y-auto">
        {activeNavTab === "now-playing" && (
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 w-full min-h-[70vh]">
            {/* LEFT COLUMN: Visualizer & Artwork Vinyl Stage */}
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md">
              {/* Album Artwork & Rotating Vinyl Disc */}
              <div className="relative group mb-6">
                {/* Ambient Accent Glow in AMOLED Mode */}
                {isAmoled && (
                  <div
                    className="absolute -inset-4 rounded-3xl opacity-20 blur-2xl transition-all duration-700"
                    style={{ backgroundColor: accent.hex }}
                  />
                )}

                {/* Main Album Card */}
                <div
                  className={`relative w-72 h-72 sm:w-80 sm:h-80 rounded-3xl overflow-hidden border shadow-2xl transition-all duration-500 ${
                    isAmoled
                      ? "bg-neutral-950 border-neutral-800/90 shadow-black"
                      : "bg-white border-neutral-200 shadow-xl"
                  }`}
                >
                  <img
                    src={currentTrack?.coverUrl}
                    alt={currentTrack?.title}
                    className={`w-full h-full object-cover transition-transform duration-700 ${
                      isPlaying ? "scale-105" : "scale-100"
                    }`}
                  />

                  {/* Floating Vinyl Overlay Badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <button
                      onClick={() => currentTrack && setAddToPlaylistTrack(currentTrack)}
                      className="p-2 rounded-full backdrop-blur-md transition-all text-white/80 bg-black/40 hover:text-white"
                      title="Add to Playlist"
                    >
                      <ListPlus size={16} />
                    </button>
                    <button
                      onClick={() => currentTrack && toggleFavorite(currentTrack.id)}
                      className={`p-2 rounded-full backdrop-blur-md transition-all ${
                        currentTrack && favorites.has(currentTrack.id)
                          ? "text-rose-500 bg-rose-500/20"
                          : "text-white/80 bg-black/40 hover:text-white"
                      }`}
                      title="Favorite Track"
                    >
                      <Heart
                        size={16}
                        fill={currentTrack && favorites.has(currentTrack.id) ? "currentColor" : "none"}
                      />
                    </button>
                  </div>

                  {/* Synthetic Procedural Indicator */}
                  {currentTrack?.isSynthetic && (
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-mono font-medium backdrop-blur-md bg-black/60 text-white/90 border border-white/10 flex items-center gap-1.5">
                      <Activity size={10} style={{ color: accent.hex }} />
                      <span>Real-time Audio Synth</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Visualizer Mode Selector & Canvas */}
              <div className="w-full flex flex-col items-center">
                {/* Visualizer Mode Buttons */}
                <div className="flex items-center gap-1 mb-2">
                  <button
                    onClick={() => setVisualizerMode("bars")}
                    className={`p-1.5 rounded-lg text-xs transition-colors ${
                      visualizerMode === "bars"
                        ? "text-black"
                        : isAmoled
                        ? "text-neutral-500 hover:text-white"
                        : "text-neutral-400 hover:text-black"
                    }`}
                    style={visualizerMode === "bars" ? { backgroundColor: accent.hex } : undefined}
                    title="Spectrum Bars"
                  >
                    <Radio size={14} />
                  </button>

                  <button
                    onClick={() => setVisualizerMode("oscilloscope")}
                    className={`p-1.5 rounded-lg text-xs transition-colors ${
                      visualizerMode === "oscilloscope"
                        ? "text-black"
                        : isAmoled
                        ? "text-neutral-500 hover:text-white"
                        : "text-neutral-400 hover:text-black"
                    }`}
                    style={visualizerMode === "oscilloscope" ? { backgroundColor: accent.hex } : undefined}
                    title="Oscilloscope Waveform"
                  >
                    <AudioWaveform size={14} />
                  </button>

                  <button
                    onClick={() => setVisualizerMode("radial")}
                    className={`p-1.5 rounded-lg text-xs transition-colors ${
                      visualizerMode === "radial"
                        ? "text-black"
                        : isAmoled
                        ? "text-neutral-500 hover:text-white"
                        : "text-neutral-400 hover:text-black"
                    }`}
                    style={visualizerMode === "radial" ? { backgroundColor: accent.hex } : undefined}
                    title="Radial Ring Pulse"
                  >
                    <Orbit size={14} />
                  </button>

                  <button
                    onClick={() => setVisualizerMode("particles")}
                    className={`p-1.5 rounded-lg text-xs transition-colors ${
                      visualizerMode === "particles"
                        ? "text-black"
                        : isAmoled
                        ? "text-neutral-500 hover:text-white"
                        : "text-neutral-400 hover:text-black"
                    }`}
                    style={visualizerMode === "particles" ? { backgroundColor: accent.hex } : undefined}
                    title="AMOLED Galaxy Particles"
                  >
                    <Sparkle size={14} />
                  </button>
                </div>

                {/* Audio Reactive Canvas */}
                <div
                  className={`w-full max-w-sm h-20 rounded-2xl border p-1 overflow-hidden transition-colors flex items-center justify-center ${
                    isAmoled ? "bg-black border-neutral-900" : "bg-white border-neutral-200"
                  }`}
                >
                  <AudioVisualizer
                    mode={visualizerMode}
                    theme={theme}
                    accentColor={accent.hex}
                    isPlaying={isPlaying}
                  />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Track Metadata & Rich Playback Controls */}
            <div className="flex-1 flex flex-col justify-center w-full max-w-md space-y-6">
              {/* Track Titles */}
              <div className="space-y-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <span
                    className="text-xs font-mono font-semibold uppercase tracking-wider"
                    style={{ color: accent.hex }}
                  >
                    {currentTrack?.genre || "Electronic"}
                  </span>
                  {currentTrack?.bpm && (
                    <span className="text-xs text-neutral-400 font-mono">
                      &bull; {currentTrack.bpm} BPM
                    </span>
                  )}
                  {currentTrack?.key && (
                    <span className="text-xs text-neutral-400 font-mono">
                      &bull; Key of {currentTrack.key}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate">
                  {currentTrack?.title || "No Track Loaded"}
                </h1>

                <p className="text-sm font-medium text-neutral-400 truncate">
                  {currentTrack?.artist || "Unknown Artist"} &bull; {currentTrack?.album}
                </p>
              </div>

              {/* Current Live Lyric Snippet Banner */}
              {currentTrack?.lyrics && currentTrack.lyrics.length > 0 && (
                <div
                  onClick={() => setIsLyricsOpen(true)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] ${
                    isAmoled
                      ? "bg-neutral-950/70 border-neutral-800 text-neutral-300"
                      : "bg-white border-neutral-200 text-neutral-700"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 mb-1">
                    <span className="flex items-center gap-1">
                      <Mic2 size={11} style={{ color: accent.hex }} />
                      SYNCHRONIZED LYRICS
                    </span>
                    <span style={{ color: accent.hex }}>Tap for Karaoke View &rarr;</span>
                  </div>
                  <p className="text-xs font-medium italic line-clamp-1">
                    {currentTrack.lyrics.find(
                      (l, i, arr) =>
                        currentTime >= l.time && (i === arr.length - 1 || currentTime < arr[i + 1].time)
                    )?.text || currentTrack.lyrics[0]?.text}
                  </p>
                </div>
              )}

              {/* Interactive Waveform Seekbar & Crossfade/Gapless Indicators */}
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

              {/* Core Controls: Shuffle, Prev, Play/Pause, Next, Repeat */}
              <div className="flex items-center justify-between px-2">
                {/* Shuffle */}
                <button
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={`p-2.5 rounded-full transition-colors ${
                    isShuffle
                      ? "text-black"
                      : isAmoled
                      ? "text-neutral-400 hover:text-white hover:bg-neutral-900"
                      : "text-neutral-500 hover:text-black hover:bg-neutral-100"
                  }`}
                  style={isShuffle ? { backgroundColor: accent.hex } : undefined}
                  title="Shuffle Queue"
                >
                  <Shuffle size={18} />
                </button>

                {/* Previous */}
                <button
                  onClick={skipPrevious}
                  className={`p-3 rounded-full transition-transform active:scale-95 ${
                    isAmoled
                      ? "text-white hover:bg-neutral-900"
                      : "text-neutral-800 hover:bg-neutral-100"
                  }`}
                  title="Previous Track"
                >
                  <SkipBack size={22} />
                </button>

                {/* Play / Pause Primary Button */}
                <button
                  onClick={togglePlayPause}
                  className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 transform active:scale-90 hover:scale-105 shadow-xl"
                  style={{
                    backgroundColor: accent.hex,
                    color: isAmoled ? "#000000" : "#ffffff",
                    boxShadow: `0 8px 24px ${accent.glow}`,
                  }}
                  title={isPlaying ? "Pause (Space)" : "Play (Space)"}
                >
                  {isPlaying ? (
                    <Pause size={28} fill="currentColor" />
                  ) : (
                    <Play size={28} fill="currentColor" className="ml-1" />
                  )}
                </button>

                {/* Next */}
                <button
                  onClick={skipNext}
                  className={`p-3 rounded-full transition-transform active:scale-95 ${
                    isAmoled
                      ? "text-white hover:bg-neutral-900"
                      : "text-neutral-800 hover:bg-neutral-100"
                  }`}
                  title="Next Track"
                >
                  <SkipForward size={22} />
                </button>

                {/* Repeat Mode */}
                <button
                  onClick={() => {
                    if (repeatMode === "off") setRepeatMode("all");
                    else if (repeatMode === "all") setRepeatMode("one");
                    else setRepeatMode("off");
                  }}
                  className={`p-2.5 rounded-full transition-colors ${
                    repeatMode !== "off"
                      ? "text-black"
                      : isAmoled
                      ? "text-neutral-400 hover:text-white hover:bg-neutral-900"
                      : "text-neutral-500 hover:text-black hover:bg-neutral-100"
                  }`}
                  style={repeatMode !== "off" ? { backgroundColor: accent.hex } : undefined}
                  title={`Repeat: ${repeatMode.toUpperCase()}`}
                >
                  {repeatMode === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
                </button>
              </div>

              {/* Volume & Sleep Timer Secondary Controls */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-4 ${
                  isAmoled
                    ? "bg-neutral-950/60 border-neutral-900"
                    : "bg-white border-neutral-200"
                }`}
              >
                {/* Volume slider */}
                <div className="flex items-center gap-2.5 flex-1">
                  <button
                    onClick={toggleMute}
                    className="text-neutral-400 hover:text-white transition-colors"
                    title="Mute / Unmute (Key: M)"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX size={16} />
                    ) : volume < 0.5 ? (
                      <Volume1 size={16} />
                    ) : (
                      <Volume2 size={16} />
                    )}
                  </button>

                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 rounded-lg cursor-pointer"
                    style={{ accentColor: accent.hex }}
                  />

                  <span className="text-[11px] font-mono text-neutral-400 w-8 text-right">
                    {isMuted ? "0%" : `${Math.round(volume * 100)}%`}
                  </span>
                </div>

                {/* Sleep Timer button */}
                <div className="flex items-center gap-1.5 border-l border-neutral-800/40 pl-3">
                  <Clock size={14} className="text-neutral-400" />
                  <select
                    value={sleepTimerMinutes || ""}
                    onChange={(e) => {
                      const val = e.target.value ? parseInt(e.target.value, 10) : null;
                      setSleepTimerMinutes(val);
                      setSleepTimerRemaining(val ? val * 60 : null);
                    }}
                    className={`text-xs bg-transparent focus:outline-none font-mono cursor-pointer ${
                      isAmoled ? "text-neutral-300" : "text-neutral-700"
                    }`}
                  >
                    <option value="" className="bg-neutral-900 text-white">Timer Off</option>
                    <option value="15" className="bg-neutral-900 text-white">15 min</option>
                    <option value="30" className="bg-neutral-900 text-white">30 min</option>
                    <option value="45" className="bg-neutral-900 text-white">45 min</option>
                    <option value="60" className="bg-neutral-900 text-white">60 min</option>
                  </select>

                  {sleepTimerRemaining !== null && (
                    <span className="text-[10px] font-mono text-amber-400 animate-pulse">
                      {Math.floor(sleepTimerRemaining / 60)}:
                      {String(sleepTimerRemaining % 60).padStart(2, "0")}
                    </span>
                  )}
                </div>
              </div>

              {/* Permanent Active Queue & Multi-Queue Switcher Card */}
              <div
                className={`p-4 rounded-2xl border space-y-2.5 transition-all ${
                  isAmoled
                    ? "bg-neutral-950/70 border-neutral-900"
                    : "bg-white border-neutral-200 shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers size={15} style={{ color: accent.hex }} />
                    <span className="text-xs font-bold tracking-tight">
                      {queues.find((q) => q.id === activeQueueId)?.name || "Main Queue"}
                    </span>
                    <span
                      className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-semibold"
                      style={{ backgroundColor: `${accent.hex}22`, color: accent.hex }}
                    >
                      {queue.length} tracks
                    </span>
                  </div>

                  <button
                    onClick={() => setIsQueueOpen(true)}
                    className="text-[11px] font-semibold hover:underline"
                    style={{ color: accent.hex }}
                  >
                    Multi-Queue ({queues.length}) &rarr;
                  </button>
                </div>

                {/* Quick Musicolet-style Independent Queue Switcher Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {queues.map((q, idx) => {
                    const isSelected = q.id === activeQueueId;
                    const savedSec = isSelected ? currentTime : q.savedProgressSeconds;
                    return (
                      <button
                        key={q.id}
                        onClick={() => handleSwitchQueue(q.id)}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-semibold flex items-center gap-1.5 shrink-0 transition-all border ${
                          isSelected
                            ? "text-black border-transparent shadow-sm"
                            : isAmoled
                            ? "bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-white"
                            : "bg-neutral-100 border-neutral-200 text-neutral-600 hover:text-black"
                        }`}
                        style={isSelected ? { backgroundColor: accent.hex } : undefined}
                        title={`Switch to ${q.name} (Restores at ${formatTime(savedSec)})`}
                      >
                        <span>Q{idx + 1}: {q.name}</span>
                        <span className="opacity-75">({formatTime(savedSec)})</span>
                      </button>
                    );
                  })}
                  <button
                    onClick={() => handleCreateQueue()}
                    className={`px-2 py-1 rounded-xl text-[10px] font-mono font-semibold flex items-center gap-1 shrink-0 border transition-colors ${
                      isAmoled
                        ? "bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:text-white"
                        : "bg-neutral-100 border-neutral-200 text-neutral-600 hover:text-black"
                    }`}
                    title="Create a new independent playback queue"
                  >
                    <Plus size={10} style={{ color: accent.hex }} />
                    <span>New Q</span>
                  </button>
                </div>

                {/* Inline Tracklist */}
                <div className="space-y-1 max-h-36 overflow-y-auto scrollbar-none pr-1">
                  {queue.slice(0, 5).map((track, idx) => {
                    const isCurrent = currentTrackIndex === idx;

                    return (
                      <div
                        key={`${track.id}-${idx}`}
                        onClick={() => playTrackAtIndex(idx)}
                        className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all ${
                          isCurrent
                            ? "font-semibold"
                            : isAmoled
                            ? "hover:bg-neutral-900/60 text-neutral-400 hover:text-white"
                            : "hover:bg-neutral-100 text-neutral-600 hover:text-black"
                        }`}
                        style={
                          isCurrent
                            ? {
                                backgroundColor: `${accent.hex}18`,
                                color: accent.hex,
                              }
                            : undefined
                        }
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="font-mono text-[10px] opacity-60 w-4 text-center">
                            {isCurrent ? "▶" : idx + 1}
                          </span>
                          <span className="truncate">{track.title}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-neutral-500 truncate max-w-[80px]">
                            {track.artist}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAddToPlaylistTrack(track);
                            }}
                            className="p-1 text-neutral-500 hover:text-white transition-colors"
                            title="Add to another playlist"
                          >
                            <ListPlus size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
                const tracksToPlay = shuffle ? [...pl.tracks].sort(() => Math.random() - 0.5) : pl.tracks;
                setQueue(tracksToPlay);
                setCurrentTrackIndex(0);
                globalAudioEngine.playTrack(tracksToPlay[0], 0);
              }
            }}
            onCreatePlaylist={(name, desc, cover) => {
              const newPl: Playlist = {
                id: `pl-${Date.now()}`,
                name,
                description: desc || "Custom audio collection",
                tracks: [],
                coverUrl: cover || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
                isCustom: true,
              };
              setPlaylists((prev) => [...prev, newPl]);
            }}
            onDeletePlaylist={(plId) => {
              setPlaylists((prev) => prev.filter((p) => p.id !== plId));
            }}
            onReorderTrack={handleReorderTrackInPlaylist}
            onRemoveTrackFromPlaylist={handleRemoveTrackFromPlaylist}
            onPlayTrack={(track) => {
              handlePlayTrackFromMemory(track);
            }}
            onEnqueueTrack={(track) => {
              handleEnqueueTrackFromMemory(track);
            }}
          />
        )}
      </main>

      {/* FOOTER SHORTCUTS & SYSTEM STATUS */}
      <footer
        className={`w-full py-2 px-6 border-t flex flex-wrap items-center justify-between text-[11px] font-mono text-neutral-500 shrink-0 ${
          isAmoled ? "border-neutral-900 bg-black" : "border-neutral-200 bg-white"
        }`}
      >
        <div className="flex items-center gap-3">
          <span>Shortcuts: Space (Play) &bull; Arrows (Seek/Vol) &bull; F (Memory) &bull; T (Theme) &bull; K (Kotlin) &bull; E (EQ) &bull; L (Lyrics) &bull; Q (Queue)</span>
        </div>

        <div className="flex items-center gap-2">
          <span>AAudio DSP Pipeline</span>
          <span>&bull;</span>
          <span style={{ color: accent.hex }}>
            {isAmoled ? "OLED 0-Nit True Black" : "High Contrast Minimal Light"}
          </span>
        </div>
      </footer>

      {/* PERMANENT PLAYLIST DOCK (Always visible at the bottom right above bottom nav bar) */}
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
            globalAudioEngine.playTrack(pl.tracks[0], 0);
          }
        }}
        onPlayPlaylist={(pl, shuffle) => {
          if (pl.tracks.length > 0) {
            const tracksToPlay = shuffle ? [...pl.tracks].sort(() => Math.random() - 0.5) : pl.tracks;
            setQueue(tracksToPlay);
            setCurrentTrackIndex(0);
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

      {/* MINI PLAYER BAR (Appears when browsing Memory Directory, Playlists, or Queue) */}
      {(activeNavTab !== "now-playing" || isFileManagerOpen || isQueueOpen) && currentTrack && (
        <div
          onClick={() => {
            setActiveNavTab("now-playing");
            setIsFileManagerOpen(false);
            setIsQueueOpen(false);
          }}
          className={`fixed bottom-[110px] left-0 right-0 z-[55] h-12 border-t backdrop-blur-xl px-4 flex items-center justify-between cursor-pointer transition-all shadow-xl ${
            isAmoled
              ? "bg-black/95 border-neutral-900 text-white"
              : "bg-white/95 border-neutral-200 text-neutral-900"
          }`}
        >
          {/* Top miniature glowing progress bar */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-neutral-800">
            <div
              className="h-full transition-all"
              style={{
                width: `${(currentTime / (duration || 1)) * 100}%`,
                backgroundColor: accent.hex,
                boxShadow: `0 0 8px ${accent.glow}`,
              }}
            />
          </div>

          <div className="flex items-center gap-3 truncate">
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className="w-8 h-8 rounded-xl object-cover shrink-0 shadow-md"
            />
            <div className="truncate">
              <div className="text-xs font-bold truncate flex items-center gap-1.5">
                <span>{currentTrack.title}</span>
                {isPlaying && (
                  <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: accent.hex }} />
                )}
              </div>
              <div className="text-[10px] text-neutral-400 truncate font-medium">
                {currentTrack.artist} &bull; {currentTrack.album}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={togglePlayPause}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-90 shadow"
              style={{ backgroundColor: accent.hex, color: isAmoled ? "#000000" : "#ffffff" }}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" className="ml-0.5" />}
            </button>
            <button
              onClick={skipNext}
              className="p-1 text-neutral-400 hover:text-white transition-colors"
              title="Next Track"
            >
              <SkipForward size={15} />
            </button>
          </div>
        </div>
      )}

      {/* FIXED BOTTOM NAVIGATION BAR */}
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
