import React from "react";
import { Disc, HardDrive, ListMusic, ListOrdered } from "lucide-react";
import { ThemeMode, AccentColor } from "../types/player";

export type NavTab = "now-playing" | "memory" | "playlists" | "queue";

interface BottomNavBarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  theme: ThemeMode;
  accent: AccentColor;
  queueCount: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onSelectTab,
  theme,
  accent,
  queueCount,
}) => {
  const isAmoled = theme === "amoled";

  const tabs: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: "now-playing",
      label: "Now Playing",
      icon: <Disc size={20} className={activeTab === "now-playing" ? "animate-spin" : ""} />,
    },
    {
      id: "memory",
      label: "File Explorer",
      icon: <HardDrive size={20} />,
    },
    {
      id: "playlists",
      label: "Playlists",
      icon: <ListMusic size={20} />,
    },
    {
      id: "queue",
      label: "Queue",
      icon: <ListOrdered size={20} />,
      badge: queueCount,
    },
  ];

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-[60] h-16 border-t backdrop-blur-xl select-none transition-colors ${
        isAmoled
          ? "bg-black/95 border-neutral-800 text-white"
          : "bg-white/95 border-neutral-200 text-neutral-900"
      }`}
    >
      <div className="w-full max-w-sm mx-auto h-full px-2 flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] transition-all relative group ${
                isActive
                  ? "font-bold scale-105"
                  : isAmoled
                  ? "text-neutral-500 hover:text-neutral-300"
                  : "text-neutral-400 hover:text-neutral-700"
              }`}
              style={isActive ? { color: accent.hex } : undefined}
            >
              {/* Sliding top active indicator bar */}
              {isActive && (
                <span
                  className="absolute top-0 w-8 h-0.5 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: accent.hex,
                    boxShadow: `0 0 12px ${accent.glow}`,
                  }}
                />
              )}

              <div className="relative flex items-center justify-center">
                {tab.icon}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2.5 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold text-black"
                    style={{ backgroundColor: accent.hex }}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className="text-[10px] tracking-tight mt-1 whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
