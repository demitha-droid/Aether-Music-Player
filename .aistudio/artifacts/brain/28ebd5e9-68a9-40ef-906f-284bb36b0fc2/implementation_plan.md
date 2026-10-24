# Bottom Navigation Bar & Playlist Hub Integration

A complete navigation and media management upgrade for Aether Music Player featuring a full-width fixed bottom navigation bar with 4 primary icon tabs (**Now Playing**, **Memory Directory**, **Playlists**, and **Queue**), alongside a full-featured **Playlist Hub** with cover art customization, playlist creation, track reordering, and instant play.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The implementation directly incorporates your confirmed choices:
> - **Navigation Position**: Full-width fixed bottom navigation bar anchored to the bottom of the viewport with backdrop blur and active accent indicators.
> - **Tab Destinations**: 4 primary icon tabs: **Now Playing**, **Memory Directory**, **Playlists**, and **Queue**.
> - **Playlist Capabilities**: Full Playlist Hub complete with cover artwork, custom playlist creation, track reordering, track removal, and instant play.

---

## 1. Overview & Core Concept

- **What It Does**: Transforms the application into a touch-friendly, multi-tab music hub. Users can instantly switch between the primary **Now Playing** visualizer screen, **Memory Directory** (file manager), **Playlist Hub**, and **Queue** using single-tap bottom bar icons.
- **Playlist Hub**: A dedicated view where users can create, organize, and edit custom playlists, assign custom artwork, reorder tracks via drag/buttons, and add tracks directly from the Memory Explorer or active queue.
- **Target Audience**: Mobile and desktop users seeking effortless 1-tap navigation between local memory folders, curated playlists, and live playback controls.

---

## 2. User Experience & Visual Design

### Bottom Navigation Bar Layout
- **Position**: Fixed to the bottom viewport (`fixed bottom-0 left-0 right-0 z-40`), elevated with backdrop blur (`backdrop-blur-xl`).
- **4 Icon Tabs**:
  1. 💿 **Now Playing**: Vinyl album art, 60fps audio reactive visualizer, and main transport controls.
  2. 📁 **Memory Directory**: Local device storage file manager with directory tree, breadcrumbs, and file table.
  3. 🎶 **Playlists**: Dedicated Playlist Hub for viewing, creating, and editing custom collections.
  4. 📋 **Queue**: Live playback queue with track count badge and clear controls.
- **Active State Styling**: Active tab highlighted with selected accent color (`#00f2fe`, `#10b981`, `#a855f7`, etc.), smooth sliding indicator line, and crisp icon scaling.

### Playlist Hub Feature
- **Playlist Collection View**:
  - Grid and list card layouts displaying cover artwork, playlist title, description, and total track count.
  - **"Create Playlist"** button opening a creation modal for title, description, and cover image selection.
- **Playlist Detail View**:
  - Hero header with cover artwork, track count, total duration, and description.
  - **"Play All"** and **"Shuffle All"** primary action buttons.
  - Interactive track table with **Move Up / Move Down** reordering buttons, **Remove** button, and **Play Now**.
- **Contextual "Add to Playlist" Action**:
  - Available across the entire app (Memory Explorer rows, Queue rows, and Now Playing bar) via a dropdown modal to add any track to any playlist in 1 click.

---

## 3. Key Product Decisions & Trade-Offs

- **Full-Width Fixed Bottom Navigation Bar vs Floating Dock**:
  - *Chosen Approach*: Full-width fixed bottom bar spanning the viewport (`h-16 border-t`), as confirmed.
  - *Why*: Provides maximum touch targets ($48\text{px}$ touch hitboxes), prevents layout overlap on mobile viewports, and guarantees 100% WCAG AA contrast.
- **View Navigation vs Modal Overlays**:
  - *Chosen Approach*: Unified main viewport tab switching. Clicking "Memory Directory" or "Playlists" switches the main view cleanly, with option to expand into full screen if desired.
- **Kotlin Android Architecture Alignment**:
  - *Chosen Approach*: Update `KOTLIN_CODEBASE` in `src/data/kotlinCodebase.ts` to include `BottomNavigationHub.kt` (Jetpack Compose `NavigationBar` + `NavHost`) and `PlaylistManager.kt` (Room database persistence in Kotlin).

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MAIN VIEWPORT CANVAS                            │
│  [Now Playing View]  │  [Memory Directory View]  │  [Playlists Hub]   │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   FULL-WIDTH FIXED BOTTOM NAV BAR                      │
│ ┌────────────────┐ ┌──────────────────┐ ┌───────────┐ ┌──────────────┐ │
│ │ 💿 Now Playing │ │ 📁 Memory Dir    │ │ 🎶Playlists│ │ 📋 Queue (6) │ │
│ └────────────────┘ └──────────────────┘ └───────────┘ └──────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### Component Breakdown
1. `src/components/BottomNavBar.tsx`:
   - Full-width fixed container (`fixed bottom-0 left-0 right-0 z-40`).
   - 4 tab triggers with active accent indicators, badges, and tooltips.
2. `src/components/PlaylistHub.tsx`:
   - Playlist grid/list view & creation modal.
   - Playlist detail view with hero header, Play All, Shuffle, track reordering, and deletion.
3. `src/components/AddToPlaylistModal.tsx`:
   - Quick popup modal to select destination playlist for any track.
4. `src/data/kotlinCodebase.ts`:
   - Add `BottomNavigationHub.kt` and `PlaylistManager.kt` showing Jetpack Compose `NavigationBar` and `NavHost` implementation in Android Kotlin.
5. `src/App.tsx`:
   - Integrate bottom navigation bar and active tab view state.
   - Connect playlist creation, track reordering, and track addition handlers.
