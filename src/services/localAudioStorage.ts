import { Track, MemoryFolder } from "../types/player";

const DB_NAME = "aether_phone_audio_db";
const DB_VERSION = 1;
const TRACKS_STORE = "tracks";
const FOLDERS_STORE = "folders";

interface StoredTrackRecord {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  genre: string;
  fileSize: number;
  lastModified: number;
  folderPath: string;
  file: File;
}

function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(TRACKS_STORE)) {
        db.createObjectStore(TRACKS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(FOLDERS_STORE)) {
        db.createObjectStore(FOLDERS_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadStoredTracks(): Promise<Track[]> {
  try {
    const db = await openAudioDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(TRACKS_STORE, "readonly");
      const store = tx.objectStore(TRACKS_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const records = (req.result || []) as StoredTrackRecord[];
        const tracks: Track[] = records.map((r) => ({
          id: r.id,
          title: r.title,
          artist: r.artist,
          album: r.album,
          duration: r.duration || 180,
          coverUrl: "",
          genre: r.genre || "Audio",
          fileSize: r.fileSize,
          lastModified: r.lastModified,
          folderPath: r.folderPath || "/Phone Storage",
          file: r.file,
          isSynthetic: false,
        }));
        resolve(tracks);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to load tracks from IndexedDB:", err);
    return [];
  }
}

export async function saveTracksToDB(tracks: Track[]): Promise<void> {
  try {
    const db = await openAudioDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(TRACKS_STORE, "readwrite");
      const store = tx.objectStore(TRACKS_STORE);
      for (const t of tracks) {
        if (t.file) {
          const rec: StoredTrackRecord = {
            id: t.id,
            title: t.title,
            artist: t.artist,
            album: t.album,
            duration: t.duration,
            genre: t.genre,
            fileSize: t.fileSize || t.file.size,
            lastModified: t.lastModified || t.file.lastModified || Date.now(),
            folderPath: t.folderPath || "/Phone Storage",
            file: t.file,
          };
          store.put(rec);
        }
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("Failed to save tracks to IndexedDB:", err);
  }
}

export async function deleteTrackFromDB(trackId: string): Promise<void> {
  try {
    const db = await openAudioDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(TRACKS_STORE, "readwrite");
      const store = tx.objectStore(TRACKS_STORE);
      store.delete(trackId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("Failed to delete track from IndexedDB:", err);
  }
}

export function probeAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";

    const cleanup = () => {
      URL.revokeObjectURL(url);
      audio.removeAttribute("src");
    };

    const timer = window.setTimeout(() => {
      cleanup();
      resolve(180);
    }, 3000);

    audio.onloadedmetadata = () => {
      window.clearTimeout(timer);
      const dur = audio.duration;
      cleanup();
      resolve(Number.isFinite(dur) && dur > 0 ? Math.round(dur) : 180);
    };

    audio.onerror = () => {
      window.clearTimeout(timer);
      cleanup();
      resolve(180);
    };

    audio.src = url;
  });
}

export function parseTrackFilename(file: File, fallbackFolderPath: string): {
  title: string;
  artist: string;
  album: string;
  genre: string;
  folderPath: string;
} {
  const rawName = file.name.replace(/\.[^/.]+$/, "");
  const ext = file.name.includes(".")
    ? file.name.split(".").pop()?.toUpperCase() || "AUDIO"
    : "AUDIO";

  let artist = "Local Artist";
  let title = rawName;

  if (rawName.includes(" - ")) {
    const parts = rawName.split(" - ");
    artist = parts[0].trim() || "Local Artist";
    title = parts.slice(1).join(" - ").trim() || rawName;
  }

  // Extract relative folder path if imported via folder picker
  const relPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  let folderPath = fallbackFolderPath || "/Phone Storage";
  let album = "Phone Audio";

  if (relPath && relPath.includes("/")) {
    const segments = relPath.split("/").filter(Boolean);
    segments.pop(); // remove filename
    if (segments.length > 0) {
      folderPath = "/Phone Storage/" + segments.join("/");
      album = segments[segments.length - 1] || "Phone Audio";
    }
  } else if (folderPath !== "/Phone Storage") {
    const segs = folderPath.split("/").filter(Boolean);
    album = segs[segs.length - 1] || "Phone Audio";
  }

  return {
    title,
    artist,
    album,
    genre: ext,
    folderPath,
  };
}

/**
 * Rebuilds a clean, real folder hierarchy from the actual tracks + any custom folders
 */
export function buildFolderHierarchy(
  tracks: Track[],
  existingCustomFolders: MemoryFolder[] = []
): MemoryFolder[] {
  const folderMap = new Map<string, MemoryFolder>();

  // Always ensure root Phone Storage exists
  const rootPath = "/Phone Storage";
  folderMap.set(rootPath, {
    id: "folder-root",
    name: "Phone Storage",
    path: rootPath,
    parentId: null,
    trackIds: [],
  });

  // Preserve custom folders
  for (const cf of existingCustomFolders) {
    if (!folderMap.has(cf.path)) {
      folderMap.set(cf.path, { ...cf, trackIds: [] });
    }
  }

  const ensurePath = (fullPath: string): MemoryFolder => {
    const normalized = fullPath.startsWith("/Phone Storage")
      ? fullPath
      : `/Phone Storage/${fullPath.replace(/^\/+/, "")}`;

    if (folderMap.has(normalized)) {
      return folderMap.get(normalized)!;
    }

    const segments = normalized.split("/").filter(Boolean); // ["Phone Storage", ...]
    let currentPath = "";
    let parentId: string | null = null;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      currentPath = currentPath ? `${currentPath}/${seg}` : `/${seg}`;
      if (!folderMap.has(currentPath)) {
        const id =
          currentPath === rootPath
            ? "folder-root"
            : `folder-${currentPath.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`;
        folderMap.set(currentPath, {
          id,
          name: seg,
          path: currentPath,
          parentId,
          trackIds: [],
        });
      }
      parentId = folderMap.get(currentPath)!.id;
    }

    return folderMap.get(normalized)!;
  };

  for (const track of tracks) {
    const targetFolder = ensurePath(track.folderPath || rootPath);
    if (!targetFolder.trackIds.includes(track.id)) {
      targetFolder.trackIds.push(track.id);
    }
  }

  return Array.from(folderMap.values());
}
