import React, { useState } from "react";
import {
  Code,
  Copy,
  Check,
  X,
  Play,
  Download,
  Terminal,
  FileCode,
  FolderGit2,
  Sparkles,
} from "lucide-react";
import { ThemeMode, AccentColor, Track } from "../types/player";
import { KOTLIN_CODEBASE } from "../data/kotlinCodebase";

interface KotlinStudioProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
  accent: AccentColor;
  onAddTracksFromDsl: (tracks: Track[], playlistName: string) => void;
  onTriggerAiKotlinDsp: () => void;
}

export const KotlinStudio: React.FC<KotlinStudioProps> = ({
  isOpen,
  onClose,
  theme,
  accent,
  onAddTracksFromDsl,
  onTriggerAiKotlinDsp,
}) => {
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [dslInput, setDslInput] = useState<string>(`// Define your custom playlist in Kotlin DSL:
val lateNightVibes = playlist("Cyber Odyssey") {
    description = "Synthesized in Kotlin Audio Studio"
    track("Sub-orbital Glider", "Kotlin Synth Lab", 195) {
        genre = "Synthwave"
        bpm = 124
    }
    track("StateFlow Serenade", "Jetpack Coroutines", 160) {
        genre = "Lofi"
        bpm = 78
    }
}`);
  const [dslOutputMessage, setDslOutputMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isAmoled = theme === "amoled";
  const activeFile = KOTLIN_CODEBASE[activeFileIndex];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunDsl = () => {
    // Parse DSL tracks from code text using regex
    const playlistMatch = dslInput.match(/playlist\("([^"]+)"\)/);
    const playlistName = playlistMatch ? playlistMatch[1] : "Kotlin Custom Playlist";

    const trackRegex = /track\("([^"]+)",\s*"([^"]+)",\s*(\d+)\)/g;
    const newTracks: Track[] = [];
    let match;

    while ((match = trackRegex.exec(dslInput)) !== null) {
      const title = match[1];
      const artist = match[2];
      const duration = parseInt(match[3], 10);

      newTracks.push({
        id: `custom-dsl-${Date.now()}-${newTracks.length}`,
        title,
        artist,
        album: playlistName,
        duration,
        genre: "Kotlin Synthesized",
        year: 2026,
        bpm: 120,
        isSynthetic: true,
        synthPreset: "synthwave",
        coverUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
        lyrics: [
          { time: 0, text: `— Executed via Kotlin DSL: ${title} —` },
          { time: 10, text: "Procedural synthesis compiled in runtime memory" },
          { time: 30, text: "Streaming audio through low-latency Biquad filters" },
          { time: 60, text: "Kotlin Coroutine flow keeping time impeccably" },
        ],
      });
    }

    if (newTracks.length > 0) {
      onAddTracksFromDsl(newTracks, playlistName);
      setDslOutputMessage(`✓ Successfully compiled and mounted ${newTracks.length} tracks into "${playlistName}"!`);
      setTimeout(() => setDslOutputMessage(null), 4000);
    } else {
      setDslOutputMessage("⚠️ No tracks parsed. Use format: track(\"Title\", \"Artist\", duration)");
      setTimeout(() => setDslOutputMessage(null), 4000);
    }
  };

  const handleDownloadAll = () => {
    const projectContent = KOTLIN_CODEBASE.map(
      (f) => `// ==========================================\n// File: ${f.path}\n// ==========================================\n\n${f.code}\n\n`
    ).join("\n");

    const blob = new Blob([projectContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Aether-Music-Player-Kotlin-Android.kt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div
        className={`w-full max-w-5xl h-[88vh] flex flex-col rounded-3xl border shadow-2xl relative overflow-hidden ${
          isAmoled
            ? "bg-black border-neutral-800 text-white"
            : "bg-white border-neutral-200 text-neutral-900"
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: `${accent.hex}20`, color: accent.hex }}
            >
              <Code size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight">Kotlin Architecture Studio</h2>
                <span
                  className="px-2 py-0.5 text-[10px] font-mono rounded-full font-semibold uppercase tracking-wider"
                  style={{ backgroundColor: `${accent.hex}22`, color: accent.hex }}
                >
                  Jetpack Compose &bull; Media3
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Ground-up idiomatic Kotlin engine with ExoPlayer, StateFlow, Coroutines & AMOLED Material 3 UI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onTriggerAiKotlinDsp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105 active:scale-95"
              style={{
                backgroundColor: `${accent.hex}22`,
                color: accent.hex,
                border: `1px solid ${accent.hex}44`,
              }}
              title="Generate tailored Kotlin audio DSP algorithms with Gemini 4 Argon High Thinking"
            >
              <Sparkles size={13} />
              AI Kotlin DSP
            </button>

            <button
              onClick={handleDownloadAll}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                isAmoled
                  ? "bg-neutral-900 border-neutral-800 hover:bg-neutral-800 text-neutral-200"
                  : "bg-neutral-100 border-neutral-200 hover:bg-neutral-200 text-neutral-800"
              }`}
            >
              <Download size={13} />
              Export .kt
            </button>

            <button
              onClick={onClose}
              className={`p-2 rounded-full transition-colors ${
                isAmoled ? "hover:bg-neutral-900 text-neutral-400" : "hover:bg-neutral-100 text-neutral-600"
              }`}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body Split */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: File Tree */}
          <div
            className={`w-64 border-r flex flex-col shrink-0 ${
              isAmoled ? "bg-neutral-950/60 border-neutral-900" : "bg-neutral-50/80 border-neutral-200"
            }`}
          >
            <div className="p-3 text-[11px] font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <FolderGit2 size={13} />
              <span>Project Structure</span>
            </div>

            <div className="flex-1 overflow-y-auto px-2 space-y-1">
              {KOTLIN_CODEBASE.map((file, idx) => (
                <button
                  key={file.name}
                  onClick={() => setActiveFileIndex(idx)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono flex items-center justify-between transition-all ${
                    activeFileIndex === idx
                      ? isAmoled
                        ? "bg-neutral-900 font-semibold text-white shadow-sm"
                        : "bg-white font-semibold text-black shadow-sm"
                      : isAmoled
                      ? "text-neutral-400 hover:text-white hover:bg-neutral-900/40"
                      : "text-neutral-600 hover:text-black hover:bg-neutral-200/50"
                  }`}
                  style={activeFileIndex === idx ? { borderLeft: `3px solid ${accent.hex}` } : undefined}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileCode size={14} style={{ color: activeFileIndex === idx ? accent.hex : undefined }} />
                    <span className="truncate">{file.name}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Kotlin DSL Live Runner Area */}
            <div className="p-3 border-t border-neutral-800/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold flex items-center gap-1">
                  <Terminal size={12} style={{ color: accent.hex }} />
                  Kotlin DSL Simulator
                </span>
                <button
                  onClick={handleRunDsl}
                  className="px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 text-black font-semibold"
                  style={{ backgroundColor: accent.hex }}
                >
                  <Play size={10} fill="currentColor" />
                  Run DSL
                </button>
              </div>

              <textarea
                value={dslInput}
                onChange={(e) => setDslInput(e.target.value)}
                rows={4}
                className={`w-full text-[10px] font-mono p-2 rounded-lg border resize-none focus:outline-none ${
                  isAmoled
                    ? "bg-black border-neutral-800 text-neutral-300"
                    : "bg-white border-neutral-200 text-neutral-800"
                }`}
                placeholder="Write playlist(&quot;Name&quot;) { track(...) }"
              />

              {dslOutputMessage && (
                <div
                  className="text-[10px] mt-1.5 font-medium transition-all"
                  style={{ color: accent.hex }}
                >
                  {dslOutputMessage}
                </div>
              )}
            </div>
          </div>

          {/* Right: Code Viewer */}
          <div className="flex-1 flex flex-col overflow-hidden bg-black/40">
            {/* File info bar */}
            <div
              className={`px-4 py-2 border-b flex items-center justify-between text-xs font-mono ${
                isAmoled ? "bg-neutral-950 border-neutral-900" : "bg-neutral-100 border-neutral-200"
              }`}
            >
              <div className="flex items-center gap-2 text-neutral-400">
                <span className="text-white font-medium">{activeFile.path}</span>
                <span>&bull;</span>
                <span className="text-neutral-500">{activeFile.description}</span>
              </div>

              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
                  copied
                    ? "text-emerald-400 bg-emerald-500/10"
                    : isAmoled
                    ? "hover:bg-neutral-800 text-neutral-300"
                    : "hover:bg-neutral-200 text-neutral-700"
                }`}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? "Copied!" : "Copy Code"}</span>
              </button>
            </div>

            {/* Code content */}
            <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed scrollbar-thin select-text">
              <pre className="text-neutral-300">
                <code>
                  {activeFile.code.split("\n").map((line, idx) => (
                    <div key={idx} className="table-row">
                      <span className="table-cell select-none pr-4 text-neutral-600 text-right w-10">
                        {idx + 1}
                      </span>
                      <span className="table-cell">
                        {colorizeKotlin(line, accent.hex)}
                      </span>
                    </div>
                  ))}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Lightweight syntax highlight formatter
function colorizeKotlin(line: string, accentHex: string): React.ReactNode {
  if (line.trim().startsWith("//") || line.trim().startsWith("/*") || line.trim().startsWith("*")) {
    return <span className="text-neutral-500 italic">{line}</span>;
  }
  if (line.trim().startsWith("@")) {
    return <span className="text-amber-400 font-semibold">{line}</span>;
  }
  if (line.includes("package ") || line.includes("import ")) {
    return <span className="text-neutral-400">{line}</span>;
  }
  if (line.includes("fun ") || line.includes("class ") || line.includes("val ") || line.includes("var ")) {
    return (
      <span>
        {line.split(" ").map((word, i) => {
          if (["fun", "class", "val", "var", "override", "private", "data", "enum", "sealed"].includes(word)) {
            return (
              <span key={i} className="text-purple-400 font-semibold">
                {word}{" "}
              </span>
            );
          }
          if (["Boolean", "Float", "Long", "Int", "String", "Unit"].includes(word)) {
            return (
              <span key={i} className="text-cyan-400 font-medium">
                {word}{" "}
              </span>
            );
          }
          return word + " ";
        })}
      </span>
    );
  }
  return line;
}
