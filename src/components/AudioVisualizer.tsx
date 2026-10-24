import React, { useEffect, useRef } from "react";
import { globalAudioEngine } from "../services/audioEngine";
import { VisualizerMode, ThemeMode } from "../types/player";

interface AudioVisualizerProps {
  mode: VisualizerMode;
  theme: ThemeMode;
  accentColor: string; // hex
  isPlaying: boolean;
  className?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  mode,
  theme,
  accentColor,
  isPlaying,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Peak holds for bars
  const peaksRef = useRef<number[]>([]);
  // Particle system
  const particlesRef = useRef<
    Array<{ x: number; y: number; vx: number; vy: number; radius: number; alpha: number }>
  >([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Initialize particles
    if (particlesRef.current.length === 0) {
      for (let i = 0; i < 48; i++) {
        particlesRef.current.push({
          x: Math.random() * 300,
          y: Math.random() * 80,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          radius: Math.random() * 2.5 + 1,
          alpha: Math.random() * 0.6 + 0.2,
        });
      }
    }

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const freqData = globalAudioEngine.getFrequencyData();
      const timeData = globalAudioEngine.getTimeDomainData();

      // Check if actually silent or idle
      let avgFreq = 0;
      for (let i = 0; i < freqData.length; i++) {
        avgFreq += freqData[i];
      }
      avgFreq /= freqData.length;

      // Simulated idle subtle breathing animation when paused
      const isAudible = isPlaying && avgFreq > 2;

      if (mode === "bars") {
        renderBars(ctx, width, height, freqData, isAudible);
      } else if (mode === "oscilloscope") {
        renderOscilloscope(ctx, width, height, timeData, isAudible);
      } else if (mode === "radial") {
        renderRadial(ctx, width, height, freqData, isAudible);
      } else if (mode === "particles") {
        renderParticles(ctx, width, height, freqData, isAudible);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    const renderBars = (
      c: CanvasRenderingContext2D,
      w: number,
      h: number,
      data: Uint8Array,
      active: boolean
    ) => {
      const barCount = 42;
      const spacing = 3;
      const barWidth = (w - (barCount - 1) * spacing) / barCount;

      if (peaksRef.current.length !== barCount) {
        peaksRef.current = new Array(barCount).fill(0);
      }

      const gradient = c.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, accentColor);
      gradient.addColorStop(1, `${accentColor}22`);

      for (let i = 0; i < barCount; i++) {
        // Sample logarithmically weighted frequencies
        const sampleIndex = Math.min(
          data.length - 1,
          Math.floor(Math.pow(i / barCount, 1.4) * (data.length * 0.75))
        );

        let val = active ? data[sampleIndex] / 255 : Math.sin(Date.now() * 0.003 + i * 0.2) * 0.08 + 0.1;
        val = Math.max(0.04, val);

        const barHeight = val * h * 0.92;
        const x = i * (barWidth + spacing);
        const y = h - barHeight;

        // Peak decay calculation
        if (val > peaksRef.current[i]) {
          peaksRef.current[i] = val;
        } else {
          peaksRef.current[i] = Math.max(0.04, peaksRef.current[i] - 0.015);
        }

        // Draw bar
        c.fillStyle = gradient;
        c.beginPath();
        c.roundRect(x, y, barWidth, barHeight, [barWidth / 2, barWidth / 2, 0, 0]);
        c.fill();

        // Draw peak indicator cap
        const peakY = h - peaksRef.current[i] * h * 0.92 - 2;
        c.fillStyle = accentColor;
        c.fillRect(x, Math.max(0, peakY), barWidth, 1.5);
      }
    };

    const renderOscilloscope = (
      c: CanvasRenderingContext2D,
      w: number,
      h: number,
      data: Uint8Array,
      active: boolean
    ) => {
      c.lineWidth = 2.2;
      c.strokeStyle = accentColor;
      c.shadowBlur = theme === "amoled" ? 8 : 2;
      c.shadowColor = accentColor;

      c.beginPath();
      const sliceWidth = w / data.length;
      let x = 0;

      for (let i = 0; i < data.length; i++) {
        const v = active ? data[i] / 128.0 : 1 + Math.sin(Date.now() * 0.004 + i * 0.1) * 0.06;
        const y = (v * h) / 2;

        if (i === 0) {
          c.moveTo(x, y);
        } else {
          c.lineTo(x, y);
        }
        x += sliceWidth;
      }

      c.lineTo(w, h / 2);
      c.stroke();
      c.shadowBlur = 0;
    };

    const renderRadial = (
      c: CanvasRenderingContext2D,
      w: number,
      h: number,
      data: Uint8Array,
      active: boolean
    ) => {
      const centerX = w / 2;
      const centerY = h / 2;
      const baseRadius = Math.min(w, h) * 0.28;
      const spokes = 36;

      c.save();
      c.translate(centerX, centerY);

      // Inner disc
      c.beginPath();
      c.arc(0, 0, baseRadius * 0.7, 0, Math.PI * 2);
      c.fillStyle = theme === "amoled" ? "#0a0a0a" : "#f1f5f9";
      c.fill();
      c.strokeStyle = `${accentColor}44`;
      c.lineWidth = 1.5;
      c.stroke();

      // Radial frequency spokes
      for (let i = 0; i < spokes; i++) {
        const angle = (i / spokes) * Math.PI * 2;
        const sampleIdx = Math.floor((i / spokes) * (data.length * 0.5));
        const mag = active
          ? (data[sampleIdx] / 255) * (Math.min(w, h) * 0.22)
          : Math.sin(Date.now() * 0.003 + i) * 6 + 8;

        const x1 = Math.cos(angle) * baseRadius;
        const y1 = Math.sin(angle) * baseRadius;
        const x2 = Math.cos(angle) * (baseRadius + mag);
        const y2 = Math.sin(angle) * (baseRadius + mag);

        c.beginPath();
        c.moveTo(x1, y1);
        c.lineTo(x2, y2);
        c.strokeStyle = accentColor;
        c.lineWidth = 2;
        c.lineCap = "round";
        c.stroke();
      }

      c.restore();
    };

    const renderParticles = (
      c: CanvasRenderingContext2D,
      w: number,
      h: number,
      data: Uint8Array,
      active: boolean
    ) => {
      // Sub-bass intensity for kicks
      const bassEnergy = active ? (data[2] + data[4] + data[6]) / (3 * 255) : 0.1;

      particlesRef.current.forEach((p) => {
        // React to bass with speed bursts
        p.x += p.vx * (1 + bassEnergy * 2);
        p.y += p.vy * (1 + bassEnergy * 2);

        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        const dynamicRadius = p.radius * (1 + bassEnergy * 1.5);

        c.beginPath();
        c.arc(p.x, p.y, dynamicRadius, 0, Math.PI * 2);
        c.fillStyle = `${accentColor}${Math.floor(p.alpha * 255)
          .toString(16)
          .padStart(2, "0")}`;
        c.fill();
      });

      // Ambient connecting constellation lines
      c.strokeStyle = `${accentColor}18`;
      c.lineWidth = 0.8;
      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const dx = particlesRef.current[i].x - particlesRef.current[j].x;
          const dy = particlesRef.current[i].y - particlesRef.current[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 45) {
            c.beginPath();
            c.moveTo(particlesRef.current[i].x, particlesRef.current[i].y);
            c.lineTo(particlesRef.current[j].x, particlesRef.current[j].y);
            c.stroke();
          }
        }
      }
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [mode, theme, accentColor, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      width={460}
      height={88}
      className={`w-full block select-none pointer-events-none ${className}`}
    />
  );
};
