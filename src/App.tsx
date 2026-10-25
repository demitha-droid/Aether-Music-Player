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
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
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
      className={`h-[100dvh] w-full flex flex-col transition-colors duration-300 font-sans select-none relative overflow-hidden ${
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
        className={`w-full h-14 px-4 flex items-center justify-between border-b shrink-0 z-30 ${
          isAmoled ? "border-neutral-900 bg-black" : "border-neutral-200 bg-white"
        }`}
      >
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center font-mono font-black text-xs tracking-tighter shadow-md shrink-0"
            style={{
              backgroundColor: accent.hex,
              color: isAmoled ? "#000000" : "#ffffff",
              boxShadow: `0 0 12px ${accent.glow}`,
            }}
          >
            AE
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-extrabold text-xs tracking-wider">AETHER</span>
              <span
                className="text-[9px] font-mono px-1.5 py-0.5 rounded-md font-semibold tracking-wider uppercase shrink-0 border"
                style={{
                  backgroundColor: `${accent.hex}15`,
                  borderColor: `${accent.hex}40`,
                  color: accent.hex,
                }}
              >
                HI-RES
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 tracking-wide font-mono truncate">
              0-Latency Engine
            </p>
          </div>
        </div>

        {/* Right: Uniform Action Icons (All 36x36 rounded-xl) */}
        <div className="flex items-center gap-1.5 shrink-0 relative">
          {/* Accent Color Palette Popover Button */}
          <button
            onClick={() => setIsPaletteOpen(!isPaletteOpen)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-transform active:scale-90 border ${
              isAmoled
                ? "bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700"
                : "bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-200"
            }`}
            title="Choose Accent Color"
          >
            <span
              className="w-4 h-4 rounded-full ring-2 ring-white/30 transition-transform shadow-sm"
              style={{ backgroundColor: accent.hex }}
            />
          </button>

          {/* Equalizer (10-Band EQ) */}
          <button
            onClick={() => setIsEqualizerOpen(true)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-transform active:scale-90 border ${
              isAmoled
                ? "bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700"
                : "bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-200"
            }`}
            title="10-Band Equalizer"
          >
            <Sliders size={15} style={{ color: accent.hex }} />
          </button>

          {/* Sonic Intelligence */}
          <button
            onClick={() => setIsSonicAiOpen(true)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-transform active:scale-90 border ${
              isAmoled
                ? "bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700"
                : "bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-200"
            }`}
            title="Sonic Intelligence"
          >
            <Sparkles size={15} style={{ color: accent.hex }} />
          </button>

          {/* Theme Toggle (AMOLED / Light) */}
          <button
            onClick={toggleTheme}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-transform active:scale-90 border ${
              isAmoled
                ? "bg-neutral-950 border-neutral-800 text-amber-400 hover:border-neutral-700"
                : "bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-200"
            }`}
            title={isAmoled ? "Switch to Light Mode" : "Switch to pure AMOLED Black"}
          >
            {isAmoled ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Color Palette Popover Dropdown */}
          {isPaletteOpen && (
            <div
              className={`absolute top-11 right-0 z-50 p-2 rounded-xl border shadow-2xl flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 w-44 ${
                isAmoled ? "bg-black border-neutral-800 text-white" : "bg-white border-neutral-200 text-black"
              }`}
            >
              <div className="text-[10px] font-mono text-neutral-400 px-1 font-semibold uppercase tracking-wider">
                Accent Palette
              </div>
              {ACCENT_COLORS.map((col) => (
                <button
                  key={col.id}
                  onClick={() => {
                    setAccent(col);
                    setIsPaletteOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors border ${
                    accent.id === col.id
                      ? isAmoled
                        ? "bg-neutral-900 border-neutral-700 font-bold"
                        : "bg-neutral-100 border-neutral-300 font-bold"
                      : "border-transparent hover:bg-neutral-900/40"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: col.hex }} />
                    <span className="text-[11px] truncate">{col.name}</span>
                  </div>
                  {accent.id === col.id && (
                    <span className="text-[11px] font-bold" style={{ color: col.hex }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* MAIN VIEWPORT */}
      <main
        className={`flex-1 w-full max-w-sm mx-auto px-4 select-none ${
          activeNavTab === "now-playing"
            ? "h-[calc(100dvh-56px-64px)] flex flex-col justify-between pt-1 pb-3 overflow-hidden"
            : "overflow-y-auto py-4 pb-32"
        }`}
      >
        {activeNavTab === "now-playing" && (
          <div className="w-full h-full flex flex-col justify-between min-h-0">
            {/* 1. Fluid Responsive Album Artwork with AMOLED Glow */}
            <div className="flex-1 min-h-[110px] max-h-[240px] w-full flex items-center justify-center my-auto relative shrink">
              <div className="relative h-full aspect-square max-h-[240px]">
                {/* Ambient Accent Glow in AMOLED Mode */}
                {isAmoled && (
                  <div
                    className="absolute -inset-2.5 rounded-2xl opacity-20 blur-xl transition-all duration-700 pointer-events-none"
                    style={{ backgroundColor: accent.hex }}
                  />
                )}

                {/* Main Album Card */}
                <div
                  className={`relative w-full h-full rounded-2xl overflow-hidden border shadow-2xl transition-all duration-500 ${
                    isAmoled
                      ? "bg-neutral-950 border-neutral-800"
                      : "bg-white border-neutral-200"
                  }`}
                >
                  <img
                    src={currentTrack?.coverUrl}
                    alt={currentTrack?.title}
                    className={`w-full h-full object-cover transition-transform duration-700 ${
                      isPlaying ? "scale-105" : "scale-100"
                    }`}
                  />

                  {/* Real-time Audio Synth Indicator */}
                  {currentTrack?.isSynthetic && (
                    <div className="absolute bottom-2 left-2 h-5 px-2 rounded-md text-[9px] font-mono font-medium backdrop-blur-md bg-black/70 text-white/90 border border-white/15 flex items-center gap-1">
                      <Activity size={9} style={{ color: accent.hex }} />
                      <span>SYNTH</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Track Metadata & Quick Action Buttons */}
            <div className="w-full shrink-0 flex items-center justify-between gap-2 my-1 px-1">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span
                    className="text-[10px] font-mono font-bold uppercase tracking-wider"
                    style={{ color: accent.hex }}
                  >
                    {currentTrack?.genre || "Electronic"}
                  </span>
                  {currentTrack?.bpm && (
                    <span className="text-[10px] text-neutral-400 font-mono">
                      &bull; {currentTrack.bpm} BPM
                    </span>
                  )}
                </div>

                <h1 className="text-lg xs:text-xl font-bold tracking-tight text-white truncate leading-tight">
                  {currentTrack?.title || "No Track Loaded"}
                </h1>

                <p className="text-xs font-medium text-neutral-400 truncate">
                  {currentTrack?.artist || "Unknown Artist"} &bull; {currentTrack?.album}
                </p>
              </div>

              {/* Action Buttons: Add to Playlist & Favorite */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => currentTrack && setAddToPlaylistTrack(currentTrack)}
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all active:scale-90 ${
                    isAmoled
                      ? "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                      : "bg-neutral-100 border-neutral-200 text-neutral-600 hover:text-black"
                  }`}
                  title="Add to Playlist"
                >
                  <ListPlus size={16} />
                </button>
                <button
                  onClick={() => currentTrack && toggleFavorite(currentTrack.id)}
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all active:scale-90 ${
                    currentTrack && favorites.has(currentTrack.id)
                      ? "text-rose-500 bg-rose-500/15 border-rose-500/40"
                      : isAmoled
                      ? "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                      : "bg-neutral-100 border-neutral-200 text-neutral-600 hover:text-black"
                  }`}
                  title="Favorite Track"
                >
                  <Heart
                    size={16}
                    fill={currentTrack && favorites.has(currentTrack.id) ? "currentColor" : "none"}
                  />
                </button>
              </div>
            </div>

            {/* 3. Interactive Waveform Seekbar */}
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

            {/* 4. Core Mobile Playback Controls */}
            <div className="w-full flex items-center justify-between shrink-0 my-1 px-1">
              {/* Shuffle */}
              <button
                onClick={() => setIsShuffle(!isShuffle)}
                className={`w-11 h-11 flex items-center justify-center rounded-xl border transition-all active:scale-95 ${
                  isShuffle
                    ? "text-black border-transparent shadow"
                    : isAmoled
                    ? "border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
                    : "border-neutral-200 bg-neutral-100 text-neutral-600 hover:text-black"
                }`}
                style={isShuffle ? { backgroundColor: accent.hex } : undefined}
                title="Shuffle Queue"
              >
                <Shuffle size={16} />
              </button>

              {/* Previous */}
              <button
                onClick={skipPrevious}
                className={`w-12 h-12 flex items-center justify-center rounded-xl border transition-transform active:scale-95 ${
                  isAmoled
                    ? "border-neutral-800 bg-neutral-950 text-white"
                    : "border-neutral-200 bg-neutral-100 text-neutral-900"
                }`}
                title="Previous Track"
              >
                <SkipBack size={20} />
              </button>

              {/* Big Touch Play / Pause Button */}
              <button
                onClick={togglePlayPause}
                className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 transform active:scale-90 shadow-xl"
                style={{
                  backgroundColor: accent.hex,
                  color: isAmoled ? "#000000" : "#ffffff",
                  boxShadow: `0 6px 20px ${accent.glow}`,
                }}
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause size={24} fill="currentColor" />
                ) : (
                  <Play size={24} fill="currentColor" className="ml-0.5" />
                )}
              </button>

              {/* Next */}
              <button
                onClick={skipNext}
                className={`w-12 h-12 flex items-center justify-center rounded-xl border transition-transform active:scale-95 ${
                  isAmoled
                    ? "border-neutral-800 bg-neutral-950 text-white"
                    : "border-neutral-200 bg-neutral-100 text-neutral-900"
                }`}
                title="Next Track"
              >
                <SkipForward size={20} />
              </button>

              {/* Repeat Mode */}
              <button
                onClick={() => {
                  if (repeatMode === "off") setRepeatMode("all");
                  else if (repeatMode === "all") setRepeatMode("one");
                  else setRepeatMode("off");
                }}
                className={`w-11 h-11 flex items-center justify-center rounded-xl border transition-all active:scale-95 ${
                  repeatMode !== "off"
                    ? "text-black border-transparent shadow"
                    : isAmoled
                    ? "border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
                    : "border-neutral-200 bg-neutral-100 text-neutral-600 hover:text-black"
                }`}
                style={repeatMode !== "off" ? { backgroundColor: accent.hex } : undefined}
                title={`Repeat: ${repeatMode.toUpperCase()}`}
              >
                {repeatMode === "one" ? <Repeat1 size={16} /> : <Repeat size={16} />}
              </button>
            </div>

            {/* 5. Sleek Integrated Volume & Quick Tools Utility Bar */}
            <div
              className={`w-full h-10 rounded-xl border px-2.5 flex items-center justify-between gap-2 shrink-0 mb-1 transition-colors ${
                isAmoled
                  ? "bg-neutral-950 border-neutral-800"
                  : "bg-neutral-50 border-neutral-200"
              }`}
            >
              {/* Volume slider */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <button
                  onClick={toggleMute}
                  className={`p-1 rounded-md transition-colors ${
                    isAmoled ? "text-neutral-400 hover:text-white" : "text-neutral-500 hover:text-neutral-900"
                  }`}
                  title="Mute / Unmute"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX size={14} />
                  ) : volume < 0.5 ? (
                    <Volume1 size={14} />
                  ) : (
                    <Volume2 size={14} />
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

              {/* Subtle Vertical Divider */}
              <div className={`h-4 w-px shrink-0 ${isAmoled ? "bg-neutral-800" : "bg-neutral-200"}`} />

              {/* Quick Actions Strip */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Synchronized Lyrics */}
                <button
                  onClick={() => setIsLyricsOpen(true)}
                  className={`h-7 px-2 rounded-lg border text-[10px] font-mono font-medium flex items-center gap-1 transition-all active:scale-95 ${
                    isAmoled
                      ? "bg-neutral-900/60 border-neutral-800 text-neutral-300 hover:text-white"
                      : "bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-200"
                  }`}
                  title="Synchronized Lyrics"
                >
                  <Mic2 size={11} style={{ color: accent.hex }} />
                  <span>Lyrics</span>
                </button>

                {/* Sleep Timer with Cycle Tap */}
                <button
                  onClick={cycleSleepTimer}
                  className={`h-7 px-2 rounded-lg border text-[10px] font-mono font-medium flex items-center gap-1 transition-all active:scale-95 ${
                    sleepTimerMinutes !== null
                      ? isAmoled
                        ? "border-amber-500/60 text-amber-400 bg-amber-500/10 font-bold"
                        : "border-amber-500/60 text-amber-600 bg-amber-50 font-bold"
                      : isAmoled
                      ? "bg-neutral-900/60 border-neutral-800 text-neutral-300 hover:text-white"
                      : "bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-200"
                  }`}
                  title={
                    sleepTimerMinutes !== null
                      ? `Sleep timer: ${Math.ceil((sleepTimerRemaining || 0) / 60)}m left (Tap to cycle/disable)`
                      : "Set Sleep Timer"
                  }
                >
                  <Clock size={11} className={sleepTimerMinutes !== null ? "animate-spin" : ""} />
                  <span>
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

      {/* PERMANENT PLAYLIST DOCK (Visible on Playlists tab when no modal is open) */}
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
      )}

      {/* MINI PLAYER BAR (Appears when browsing File Explorer, Playlists, or Queue) */}
      {(activeNavTab !== "now-playing" || isFileManagerOpen || isQueueOpen) && currentTrack && (
        <div
          onClick={() => {
            setActiveNavTab("now-playing");
            setIsFileManagerOpen(false);
            setIsQueueOpen(false);
          }}
          className={`fixed bottom-16 left-0 right-0 z-[55] h-12 border-t backdrop-blur-xl cursor-pointer transition-all shadow-xl select-none ${
            isAmoled
              ? "bg-black/95 border-neutral-800 text-white"
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

          <div className="w-full max-w-sm mx-auto h-full px-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="w-8 h-8 rounded-xl object-cover shrink-0 shadow-md"
              />
              <div className="min-w-0 truncate">
                <div className="text-xs font-bold truncate flex items-center gap-1.5">
                  <span className="truncate">{currentTrack.title}</span>
                  {isPlaying && (
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 animate-ping" style={{ backgroundColor: accent.hex }} />
                  )}
                </div>
                <div className="text-[10px] text-neutral-400 truncate font-medium">
                  {currentTrack.artist} &bull; {currentTrack.album}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={togglePlayPause}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform active:scale-90 shadow"
                style={{ backgroundColor: accent.hex, color: isAmoled ? "#000000" : "#ffffff" }}
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
              </button>
              <button
                onClick={skipNext}
                className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-colors ${
                  isAmoled
                    ? "border-neutral-800 bg-neutral-950 text-neutral-300 hover:text-white"
                    : "border-neutral-200 bg-neutral-100 text-neutral-700"
                }`}
                title="Next Track"
              >
                <SkipForward size={14} />
              </button>
            </div>
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
