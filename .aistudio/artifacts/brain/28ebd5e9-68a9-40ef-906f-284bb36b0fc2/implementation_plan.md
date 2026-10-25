# Real Device Audio File Explorer & Pure Flat AMOLED UI Redesign

This update replaces all synthetic demo tracks and mock storage folders with real local phone audio scanning and persistent IndexedDB storage, while transforming the entire mobile player into a pure flat AMOLED interface with zero borders, shadows, or ambient glows.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and design decisions were confirmed during interactive clarification and govern this implementation:

- **Confirmed Decision 1 — Real Phone Files Only (Zero Demo Tracks)**: All synthetic demo tracks, fake storage capacity bars, and pre-populated mock folders are removed. The player and File Explorer display exclusively real audio files imported from the user's phone, persisted in browser `IndexedDB` so they remain available across app reloads without re-selecting.
- **Confirmed Decision 2 — Pure Flat AMOLED Aesthetic**: Every border (`border-*`), drop shadow (`shadow-*`), ambient blur glow (`blur-*`), and nested card outline is stripped across the Now Playing stage, header, waveform seekbar, controls, and navigation bar in favor of flat solid surfaces (`#000000` canvas and `#111111` flat interactive fills).

---

## 1. Overview & Core Concept

- **What It Does**: Provides a mobile-first local audio player that mounts and indexes real audio files and directory trees directly from the user's phone storage, paired with a zero-clutter, pure flat AMOLED playback interface.
- **Target Audience / Persona**: Mobile audiophiles who want Musicolet-style local folder browsing, multi-queue playback, and waveform scrubbing without fake demo data or visual bloat.
- **Key Value**: Immediate access to real device music files organized by their actual folder paths, presented in a distraction-free, borderless flat UI where every element fits cleanly within the mobile viewport.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Zero-State Phone Storage Mounting**:
   - When opening the app or **File Explorer** with no files loaded yet, the user sees a clean, flat zero-state screen with two large touch actions ($\ge 48\text{px}$ height): **Select Audio Files** (supports multi-file selection of `.mp3`, `.flac`, `.wav`, `.m4a`, `.ogg`, `.aac`, `.opus` on Android/iOS) and **Scan Music Folder** (uses directory picker / `webkitdirectory` to import an entire folder hierarchy).
2. **Real Directory Tree Browsing**:
   - Imported files automatically reconstruct their real folder hierarchy (from `webkitRelativePath` or user-created folders) inside the File Explorer.
   - Tapping a folder drills down into its subfolders and audio files; tapping any audio file plays it immediately and loads the current folder into the active queue; a prominent **+ Add Files** button remains accessible in the top bar at all times.
3. **Now Playing Zero-Scroll Stage**:
   - If no files are loaded yet, the Now Playing screen displays a direct **Load Phone Audio** CTA in the center stage.
   - Once tracks are loaded, the Now Playing screen displays the cover art (or a clean flat typographic monogram tile if the audio file has no embedded cover), unboxed track title/artist metadata, flat interactive waveform scrubber, flat transport controls, and a single flat utility row.

### Visual Identity & Theme
- **Aesthetic Direction**: Pure Flat Utilitarian AMOLED — inspired by Braun hardware and Zune/Metro flat typography, strictly adhering to zero-pill discipline and zero nested card borders.
- **Color Palette & Mood**:
  - `--background`: `#000000` (100% pure pitch black AMOLED canvas, 0% pixel power draw).
  - `--surface`: `#0d0d0d` to `#141414` (flat solid surface fill for interactive buttons and inputs, zero borders, zero shadows).
  - `--foreground`: `#ffffff` primary text, `#737373` muted secondary metadata.
  - `--accent`: User-selected solid accent color (`#00f2fe` Electric Cyan default) applied strictly as flat solid fills on the active play button, played waveform bars, and active tab label—with zero `box-shadow` or neon glow.
- **Typography & Hierarchy**:
  - Clean geometric sans-serif display and body hierarchy with `tabular-nums` monospace numerals for timestamps, file sizes, and durations.
  - Zero static pill badges (`HI-RES`, `MEDIA3`, `SYNTH`, `GAPLESS`, `XFADE` boxes are removed or rendered as quiet unboxed inline text with `·` separators).
- **Component Styling & Layout**:
  - **Mobile Viewport Budget**: Fixed `100dvh` flexbox column (`52px` flat top bar + `flex-1 min-h-0` stage + `56px` flat bottom tab bar, keeping sticky chrome well under the 15% mobile sticky cap).
  - **Touch Target Discipline**: All interactive buttons (transport controls, header icons, file rows, folder rows) enforce a minimum $44 \times 44\text{px}$ touch hitbox (`min-h-[44px] min-w-[44px]`).
  - **Zero-Border Flat Surfaces**: Buttons and scrubbers use flat background contrast (`bg-neutral-900` on `bg-black`) with sharp `rounded-lg` ($8\text{px}$) or `rounded-xl` ($12\text{px}$) geometry and no `border` or `shadow` classes.

### Interactive Feedback & Motion
- Instant $\le 150\text{ms}$ opacity and `active:scale-95` press feedback on all touch targets.
- Real-time audio duration and metadata extraction when importing phone files, with a progress indicator while indexing multiple files into `IndexedDB`.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Persistent Client-Side `IndexedDB` Audio Vault + Real Metadata Extraction**
  - *Chosen Approach*: Store imported `File` / `Blob` objects and folder structures in `IndexedDB` (`aether_audio_db`), and parse real duration, file size, format extension, and ID3/filename metadata (`Artist - Title`) via the browser `Audio` / `AudioContext` API upon import.
  - *Why*: Mobile web browsers sandbox direct filesystem access (`file:///storage/emulated/0/`). Combining `<input type="file" multiple accept="audio/*,.mp3,.flac,.wav,.m4a,.ogg,.opus,.aac">` and folder picking with `IndexedDB` persistence ensures the user selects their phone music once and sees their real files every time they open the app.
  - *Alternatives Considered*: Keeping mock folders with fake tracks was rejected because it misled the user into thinking the file explorer was broken when their phone files didn't appear.
- **Decision 2: Eliminating Multi-Layered Card Chrome for Pure Flat Layout**
  - *Chosen Approach*: Remove all borders, ambient blurs, and redundant status badge rows above the waveform and header. Consolidate the Now Playing view into 5 clean, unboxed horizontal bands that scale fluidly via `flex-1 min-h-0`.
  - *Why*: Eliminates visual misalignment ("elements out of whack") and prevents any control from ever clipping or colliding with the bottom navigation bar.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌───────────────────────────────────────────────────────────────────┐
│                   Mobile Viewport Shell (100dvh)                  │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Flat Top Bar (52px): Wordmark · Equalizer · Palette · Theme │  │
│  └──────────────────────────────┬──────────────────────────────┘  │
│                                 │                                 │
│  ┌──────────────────────────────▼──────────────────────────────┐  │
│  │               Active View Stage (flex-1 min-h-0)            │  │
│  │  ┌───────────────────────────┬───────────────────────────┐  │  │
│  │  │   Now Playing Flat View   │  Real Phone File Explorer │  │  │
│  │  │  • Fluid Cover / Monogram │  • File & Folder Importer │  │  │
│  │  │  • Unboxed Title + Heart  │  • Real Path Tree Builder │  │  │
│  │  │  • Flat Waveform Scrubber │  • Tap-to-Play File Rows  │  │  │
│  │  │  • Flat Transport Row     │  • Batch Queue / Delete   │  │  │
│  │  │  • Flat Volume + Lyrics   │                           │  │  │
│  │  └─────────────┬─────────────┴─────────────┬─────────────┘  │  │
│  └────────────────┼───────────────────────────┼────────────────┘  │
│                   │                           │                   │
│  ┌────────────────▼───────────────────────────▼────────────────┐  │
│  │     Persistent Storage & Audio Engine Layer                 │  │
│  │  ┌───────────────────────────┐  ┌────────────────────────┐  │  │
│  │  │ IndexedDB Audio Store     │  │ Web Audio DSP Engine   │  │  │
│  │  │ • Persists File Blobs     │  │ • ObjectURL Playback   │  │  │
│  │  │ • Rebuilds Folder Tree    │  │ • 10-Band EQ & Xfade   │  │  │
│  │  └───────────────────────────┘  └────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Flat Bottom Tab Bar (56px): Now Playing · Files · Playlists │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

### Data Model & State
- **IndexedDB Store (`aether_local_files`)**:
  - Stores `{ id, fileBlob, fileName, title, artist, album, duration, folderPath, fileSize, lastModified }` so real phone audio files persist across page refreshes.
- **Dynamic Folder Tree**:
  - Automatically derived from the `folderPath` of all real imported tracks plus any user-created folders. Starts completely empty (0 fake tracks) until the user imports files or folders from their phone.

### Interactive Component & State Mapping
- **File & Folder Import Flow**:
  - User taps **Add Audio Files** or **Scan Folder** $\rightarrow$ native mobile file picker opens $\rightarrow$ selected files are parsed for real audio duration and artist/title tags $\rightarrow$ saved to `IndexedDB` $\rightarrow$ `allTracks`, `memoryFolders`, and active `queue` state update immediately and playback begins.
- **File Explorer Navigation & Actions**:
  - Tapping a folder row updates the active path breadcrumb; tapping a file row plays the track and syncs the current folder to the active queue; tapping the `⋮` action button opens a flat bottom sheet to enqueue, add to playlist, or delete the file from `IndexedDB` and state.
- **Flat Now Playing Controls**:
  - Waveform pointer events scrub directly to `ratio * duration`; transport buttons trigger shuffle, skip, play/pause, and repeat with flat solid state changes; volume slider and lyrics/timer buttons operate in a single borderless row.
