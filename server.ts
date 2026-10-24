import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Google GenAI
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// Sonic Intelligence & Deep Thinking endpoint
app.post("/api/sonic-intelligence", async (req, res) => {
  try {
    const { trackTitle, artist, genre, lyrics, action, userQuery } = req.body;

    if (!ai) {
      // Provide high quality deterministic fallback if API key is not yet configured
      return res.json({
        success: true,
        isFallback: true,
        analysis: generateFallbackAnalysis(trackTitle, artist, genre, action),
      });
    }

    let prompt = "";
    if (action === "eq-optimize") {
      prompt = `You are a world-class audio mastering engineer and acoustic scientist.
Analyze the track "${trackTitle}" by "${artist}" (Genre: ${genre || "Contemporary"}).
Compute the optimal 10-band graphic equalizer adjustments in decibels (-12dB to +12dB) across:
32Hz, 64Hz, 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz, 8kHz, 16kHz.
Also recommend bass boost (0 to 10), spatial reverb (0 to 100%), and explain the mathematical & acoustic rationale behind each band's tuning.
Return your response in clean markdown with a JSON block formatted exactly as:
\`\`\`json
{
  "bands": [0, 1.5, 3.0, 0.5, -1.0, 1.0, 2.5, 3.0, 2.0, 1.0],
  "bassBoost": 4,
  "reverb": 15,
  "profileName": "Acoustic Clarity"
}
\`\`\`
Followed by your in-depth acoustic analysis.`;
    } else if (action === "kotlin-dsp") {
      prompt = `You are an expert Android Audio DSP Engineer writing high-performance Kotlin for Android Media3 / ExoPlayer / Oboe / AAudio.
Generate an idiomatic, modern Kotlin audio DSP processor or Biquad Filter implementation tailored for the track "${trackTitle}" by "${artist}".
Include clean coroutines, StateFlow, Android Jetpack Compose Material 3 state binding, and pure AMOLED-friendly canvas visualization logic. Explain how the audio math works.`;
    } else if (action === "deep-lyric-thought") {
      prompt = `Provide a deeply nuanced, philosophical, and poetic breakdown of the lyrical and harmonic themes of "${trackTitle}" by "${artist}".
Examine the sonic texture, psychological emotional resonance, cadence, and metaphorical layers. Query details: ${userQuery || "Deep analysis"}`;
    } else {
      prompt = `Act as an avant-garde musicologist and sonic curator.
Analyze track "${trackTitle}" by "${artist}" (${genre}).
User prompt: ${userQuery || "Perform deep acoustic reasoning, mood color mapping, and sonic profile analysis."}`;
    }

    // Call gemini-4-argon with thinkingLevel: HIGH as required by feature specification
    const response = await ai.models.generateContent({
      model: "gemini-4-argon",
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH,
        },
      },
    });

    const outputText = response.text || "No analysis generated.";
    return res.json({
      success: true,
      analysis: outputText,
      modelUsed: "gemini-4-argon",
      thinkingMode: "HIGH",
    });
  } catch (error: any) {
    console.error("Sonic Intelligence Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to execute sonic intelligence query.",
    });
  }
});

function generateFallbackAnalysis(
  title: string = "Track",
  artist: string = "Artist",
  genre: string = "Electronic",
  action: string = "eq-optimize"
) {
  if (action === "eq-optimize") {
    return `### 🎚️ Harmonic Acoustic Profiling: **${title}** by **${artist}**

**Genre Profile**: ${genre}
**Acoustic Target**: Enhanced transient response, tightened sub-bass resonance, and airy AMOLED highs.

\`\`\`json
{
  "bands": [3.5, 2.8, 1.2, -0.8, -1.2, 0.5, 2.0, 3.2, 3.8, 2.5],
  "bassBoost": 5,
  "reverb": 20,
  "profileName": "AMOLED Master Profile"
}
\`\`\`

#### Frequency Breakdown
- **Sub-Bass (32Hz - 64Hz)**: Boosted +3.5dB to drive tactile punch on high-excursion drivers without muddiness.
- **Warmth (125Hz - 250Hz)**: Gentle dip at 250Hz (-0.8dB) to remove boxy room reflections.
- **Mid-Range Clarity (500Hz - 2kHz)**: Flat through speech fundamentals to maintain vocal presence and instrument separation.
- **Brilliance (4kHz - 16kHz)**: Elevated +3.2dB shelf to reveal micro-details, shimmer, and expansive stereo spatial imaging.`;
  }

  return `### ⚡ Kotlin Audio Engine DSP Blueprint

\`\`\`kotlin
package io.aether.player.dsp

import kotlin.math.*

/**
 * High-performance 10-band Biquad Equalizer Filter Node
 * Idiomatic Kotlin with Direct Form II Transposed Topology
 */
class BiquadFilter(
    private val sampleRate: Float = 44100f
) {
    private var x1 = 0f
    private var x2 = 0f
    private var y1 = 0f
    private var y2 = 0f

    var b0 = 1f; var b1 = 0f; var b2 = 0f
    var a1 = 0f; var a2 = 0f

    fun configurePeaking(frequency: Float, gainDb: Float, q: Float = 1.414f) {
        val w0 = 2f * PI.toFloat() * frequency / sampleRate
        val alpha = sin(w0) / (2f * q)
        val a = 10f.pow(gainDb / 40f)

        b0 = 1f + alpha * a
        b1 = -2f * cos(w0)
        b2 = 1f - alpha * a
        val a0 = 1f + alpha / a
        a1 = -2f * cos(w0)
        a2 = 1f - alpha / a

        // Normalize
        b0 /= a0; b1 /= a0; b2 /= a0
        a1 /= a0; a2 /= a0
    }

    fun processSample(input: Float): Float {
        val output = b0 * input + x1
        x1 = b1 * input - a1 * output + x2
        x2 = b2 * input - a2 * output
        return output
    }
}
\`\`\`
This algorithm executes in $O(1)$ constant time with negligible memory footprint, ideal for 60fps real-time audio on Android.`;
}

// Setup Vite middleware in development or static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
