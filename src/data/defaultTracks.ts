import { Track, Playlist, MemoryFolder } from "../types/player";

export const DEFAULT_TRACKS: Track[] = [];

export const INITIAL_MEMORY_FOLDERS: MemoryFolder[] = [
  {
    id: "folder-root",
    name: "Phone Storage",
    path: "/Phone Storage",
    parentId: null,
    trackIds: [],
  },
];

export const DEFAULT_PLAYLISTS: Playlist[] = [
  {
    id: "playlist-all",
    name: "All Phone Audio",
    description: "All audio files imported from your phone storage",
    tracks: [],
  },
];
