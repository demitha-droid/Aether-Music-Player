import { Track } from "../types/player";

let cachedArtworkUrl: string | null = null;
let cachedArtworkKey: string | null = null;

function generateTrackArtworkDataUrl(track: Track, accentHex: string): string {
  const key = `${track.id}:${accentHex}`;
  if (cachedArtworkUrl && cachedArtworkKey === key) {
    return cachedArtworkUrl;
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // Pure flat AMOLED black background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, 256, 256);

    // Subtle flat inner card
    ctx.fillStyle = "#141414";
    ctx.beginPath();
    ctx.roundRect(20, 20, 216, 216, 36);
    ctx.fill();

    // Accent disc ring
    ctx.fillStyle = accentHex || "#ffffff";
    ctx.beginPath();
    ctx.arc(128, 112, 46, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(128, 112, 16, 0, Math.PI * 2);
    ctx.fill();

    // Format label at bottom
    ctx.fillStyle = accentHex || "#ffffff";
    ctx.font = "bold 22px monospace";
    ctx.textAlign = "center";
    ctx.fillText((track.genre || "AUDIO").slice(0, 8).toUpperCase(), 128, 204);

    cachedArtworkUrl = canvas.toDataURL("image/png");
    cachedArtworkKey = key;
    return cachedArtworkUrl;
  } catch {
    return "";
  }
}

export interface MediaSessionCallbacks {
  onPlay: () => void;
  onPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSeekTo: (time: number) => void;
  onSeekBy: (offset: number) => void;
  onStop: () => void;
}

export function registerMediaSessionHandlers(callbacks: MediaSessionCallbacks): void {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

  const ms = navigator.mediaSession;
  const actions: Array<[MediaSessionAction, MediaSessionActionHandler | null]> = [
    ["play", () => callbacks.onPlay()],
    ["pause", () => callbacks.onPause()],
    ["previoustrack", () => callbacks.onPrevious()],
    ["nexttrack", () => callbacks.onNext()],
    [
      "seekto",
      (details) => {
        if (typeof details.seekTime === "number") {
          callbacks.onSeekTo(details.seekTime);
        }
      },
    ],
    [
      "seekbackward",
      (details) => {
        callbacks.onSeekBy(-(details.seekOffset || 10));
      },
    ],
    [
      "seekforward",
      (details) => {
        callbacks.onSeekBy(details.seekOffset || 10);
      },
    ],
    ["stop", () => callbacks.onStop()],
  ];

  for (const [action, handler] of actions) {
    try {
      ms.setActionHandler(action, handler);
    } catch {
      // Unsupported MediaSession action on this browser
    }
  }
}

export function updateMediaSessionMetadata(track: Track | null, accentHex: string): void {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

  const ms = navigator.mediaSession;
  if (!track) {
    ms.metadata = null;
    ms.playbackState = "none";
    return;
  }

  const artworkSrc = track.coverUrl || generateTrackArtworkDataUrl(track, accentHex);
  const artwork: MediaImage[] = artworkSrc
    ? [
        {
          src: artworkSrc,
          sizes: "256x256",
          type: artworkSrc.startsWith("data:image/png") ? "image/png" : "image/jpeg",
        },
      ]
    : [];

  try {
    ms.metadata = new MediaMetadata({
      title: track.title || "Unknown Track",
      artist: track.artist || "Local Audio",
      album: track.album || "Aether Player",
      artwork,
    });
  } catch {
    // Ignore on browsers without MediaMetadata constructor
  }
}

export function updateMediaSessionPlaybackState(isPlaying: boolean, hasTrack: boolean): void {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.playbackState = !hasTrack
      ? "none"
      : isPlaying
      ? "playing"
      : "paused";
  } catch {
    // Ignore
  }
}

export function updateMediaSessionPosition(
  position: number,
  duration: number,
  playbackRate: number = 1.0
): void {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
  if (!Number.isFinite(duration) || duration <= 0) return;

  try {
    navigator.mediaSession.setPositionState({
      duration,
      playbackRate: Math.max(0.25, Math.min(4, playbackRate || 1)),
      position: Math.max(0, Math.min(duration, position || 0)),
    });
  } catch {
    // Ignore if browser rejects position state
  }
}
