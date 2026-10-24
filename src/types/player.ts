export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  coverUrl: string;
  audioUrl?: string;
  isSynthetic?: boolean;
  synthPreset?: string;
  genre: string;
  year?: number;
  bpm?: number;
  key?: string;
  lyrics?: { time: number; text: string }[];
  file?: File;
  fileSize?: number; // in bytes
  lastModified?: number; // timestamp ms
  folderPath?: string; // directory path e.g. /Internal Storage/Music
}

export interface MemoryFolder {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  trackIds: string[];
}

export type VisualizerMode = "bars" | "oscilloscope" | "radial" | "particles";

export type RepeatMode = "off" | "all" | "one";

export type ThemeMode = "amoled" | "light";

export interface AccentColor {
  id: string;
  name: string;
  hex: string;
  glow: string;
  activeBg: string;
}

export interface EqualizerBand {
  freq: number;
  label: string;
  gain: number; // -12dB to +12dB
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  tracks: Track[];
  coverUrl?: string;
  isCustom?: boolean;
}

export interface AudioEffects {
  bassBoost: number; // 0 to 10 dB
  reverb: number; // 0 to 100%
  playbackRate: number; // 0.5 to 2.0
  stereoPan: number; // -1.0 (L) to +1.0 (R)
  crossfadeSeconds?: number; // 0 (off) to 12s
  gapless?: boolean;
}

export interface PlaybackQueueSession {
  id: string;
  name: string;
  tracks: Track[];
  currentTrackIndex: number;
  savedProgressSeconds: number;
  updatedAt: number;
}

export interface KotlinFile {
  name: string;
  path: string;
  description: string;
  code: string;
}
