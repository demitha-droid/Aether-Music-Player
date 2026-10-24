import React, { useState } from "react";
import { Sparkles, Brain, Check, X, Sliders, Code, BookOpen, Send, RefreshCw } from "lucide-react";
import { ThemeMode, AccentColor, Track } from "../types/player";

interface SonicIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  theme: ThemeMode;
  accent: AccentColor;
  onApplyEqProfile: (bands: number[], bassBoost: number, reverb: number) => void;
}

export const SonicIntelligenceModal: React.FC<SonicIntelligenceModalProps> = ({
  isOpen,
  onClose,
  track,
  theme,
  accent,
  onApplyEqProfile,
}) => {
  const [activeTab, setActiveTab] = useState<"eq-optimize" | "kotlin-dsp" | "deep-lyric-thought" | "custom">("eq-optimize");
  const [customPrompt, setCustomPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  if (!isOpen) return null;

  const isAmoled = theme === "amoled";

  const handleRunQuery = async (actionOverride?: string) => {
    const action = actionOverride || activeTab;
    setLoading(true);
    setError(null);
    setResult(null);
    setApplied(false);

    try {
      const res = await fetch("/api/sonic-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackTitle: track?.title || "Track",
          artist: track?.artist || "Artist",
          genre: track?.genre || "Contemporary",
          lyrics: track?.lyrics,
          action,
          userQuery: customPrompt,
        }),
      });

      const data = await res.json();
      if (data.success && data.analysis) {
        setResult(data.analysis);
      } else {
        setError(data.error || "Failed to generate sonic analysis.");
      }
    } catch (err: any) {
      setError(err.message || "Network request failed.");
    } finally {
      setLoading(false);
    }
  };

  // Extract EQ JSON profile if present in response
  let parsedProfile: { bands?: number[]; bassBoost?: number; reverb?: number; profileName?: string } | null = null;
  if (result) {
    const jsonMatch = result.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        parsedProfile = JSON.parse(jsonMatch[1]);
      } catch {
        // ignore JSON parse error
      }
    }
  }

  const handleApplyProfile = () => {
    if (parsedProfile?.bands && Array.isArray(parsedProfile.bands)) {
      onApplyEqProfile(
        parsedProfile.bands,
        parsedProfile.bassBoost ?? 4,
        (parsedProfile.reverb ?? 20) / 100
      );
      setApplied(true);
      setTimeout(() => setApplied(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div
        className={`w-full max-w-3xl h-[84vh] flex flex-col rounded-3xl border shadow-2xl relative overflow-hidden ${
          isAmoled
            ? "bg-black border-neutral-800 text-white"
            : "bg-white border-neutral-200 text-neutral-900"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center animate-pulse"
              style={{ backgroundColor: `${accent.hex}25`, color: accent.hex }}
            >
              <Brain size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight">Sonic Neural Intelligence</h2>
                <span
                  className="px-2 py-0.5 text-[10px] font-mono rounded-full font-semibold uppercase tracking-wider"
                  style={{ backgroundColor: `${accent.hex}22`, color: accent.hex }}
                >
                  gemini-4-argon &bull; High Thinking
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Acoustic mastering reasoning &amp; Kotlin DSP synthesis for &ldquo;{track?.title}&rdquo;
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${
              isAmoled ? "hover:bg-neutral-900 text-neutral-400" : "hover:bg-neutral-100 text-neutral-600"
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Tabs */}
        <div
          className={`flex items-center gap-2 px-6 py-2 border-b shrink-0 overflow-x-auto scrollbar-none ${
            isAmoled ? "bg-neutral-950/60 border-neutral-900" : "bg-neutral-50/80 border-neutral-200"
          }`}
        >
          <button
            onClick={() => {
              setActiveTab("eq-optimize");
              handleRunQuery("eq-optimize");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === "eq-optimize"
                ? "text-black shadow-sm font-semibold"
                : isAmoled
                ? "text-neutral-400 hover:text-white"
                : "text-neutral-600 hover:text-black"
            }`}
            style={activeTab === "eq-optimize" ? { backgroundColor: accent.hex } : undefined}
          >
            <Sliders size={13} />
            Mastering EQ Curve
          </button>

          <button
            onClick={() => {
              setActiveTab("kotlin-dsp");
              handleRunQuery("kotlin-dsp");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === "kotlin-dsp"
                ? "text-black shadow-sm font-semibold"
                : isAmoled
                ? "text-neutral-400 hover:text-white"
                : "text-neutral-600 hover:text-black"
            }`}
            style={activeTab === "kotlin-dsp" ? { backgroundColor: accent.hex } : undefined}
          >
            <Code size={13} />
            Kotlin DSP Synthesizer
          </button>

          <button
            onClick={() => {
              setActiveTab("deep-lyric-thought");
              handleRunQuery("deep-lyric-thought");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === "deep-lyric-thought"
                ? "text-black shadow-sm font-semibold"
                : isAmoled
                ? "text-neutral-400 hover:text-white"
                : "text-neutral-600 hover:text-black"
            }`}
            style={activeTab === "deep-lyric-thought" ? { backgroundColor: accent.hex } : undefined}
          >
            <BookOpen size={13} />
            Lyric Philosophy &amp; Themes
          </button>

          <button
            onClick={() => setActiveTab("custom")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === "custom"
                ? "text-black shadow-sm font-semibold"
                : isAmoled
                ? "text-neutral-400 hover:text-white"
                : "text-neutral-600 hover:text-black"
            }`}
            style={activeTab === "custom" ? { backgroundColor: accent.hex } : undefined}
          >
            <Sparkles size={13} />
            Custom Reasoning
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin space-y-4">
          {activeTab === "custom" && (
            <div className="flex gap-2">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRunQuery()}
                placeholder="Ask any complex acoustic, music theory, or Kotlin audio question..."
                className={`flex-1 px-4 py-2.5 rounded-xl text-xs border focus:outline-none ${
                  isAmoled
                    ? "bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500"
                    : "bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400"
                }`}
              />
              <button
                onClick={() => handleRunQuery()}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 text-black disabled:opacity-50"
                style={{ backgroundColor: accent.hex }}
              >
                <Send size={13} />
                Analyze
              </button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div
                className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mb-4"
                style={{ borderColor: `${accent.hex} transparent ${accent.hex} ${accent.hex}` }}
              />
              <p className="text-sm font-semibold tracking-tight">
                Engaging High Thinking Neural Reasoner...
              </p>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm">
                Evaluating acoustic harmonics, transient envelopes, and mathematical biquad coefficients at high depth.
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          {!loading && !result && !error && (
            <div className="flex flex-col items-center justify-center py-16 text-center text-neutral-400">
              <Brain size={42} className="mb-3 opacity-30" style={{ color: accent.hex }} />
              <p className="text-sm font-medium">Select a reasoning mode above to begin analysis.</p>
              <p className="text-xs text-neutral-500 mt-1">
                Powered by Gemini 4 Argon with High Thinking enabled.
              </p>
            </div>
          )}

          {!loading && result && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {parsedProfile && (
                <div
                  className={`p-4 rounded-2xl border flex items-center justify-between ${
                    isAmoled ? "bg-neutral-950 border-neutral-800" : "bg-neutral-50 border-neutral-200"
                  }`}
                >
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Sliders size={15} style={{ color: accent.hex }} />
                      Recommended Profile: {parsedProfile.profileName || "Acoustic Master"}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Bass Boost: +{parsedProfile.bassBoost ?? 4}dB &bull; Spatial Reverb: {parsedProfile.reverb ?? 20}%
                    </p>
                  </div>

                  <button
                    onClick={handleApplyProfile}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      applied ? "bg-emerald-500 text-black" : "text-black"
                    }`}
                    style={!applied ? { backgroundColor: accent.hex } : undefined}
                  >
                    {applied ? <Check size={14} /> : <Sliders size={14} />}
                    {applied ? "Applied to Equalizer!" : "Apply to Equalizer"}
                  </button>
                </div>
              )}

              <div
                className={`p-5 rounded-2xl border text-xs leading-relaxed font-sans whitespace-pre-wrap select-text ${
                  isAmoled
                    ? "bg-neutral-950/70 border-neutral-800/80 text-neutral-200"
                    : "bg-neutral-50 border-neutral-200 text-neutral-800"
                }`}
              >
                {result}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
