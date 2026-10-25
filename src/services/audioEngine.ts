import { ProceduralMusicEngine } from "./synthAudio";
import { EqualizerBand, AudioEffects, Track } from "../types/player";

export const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private audioElement: HTMLAudioElement;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private synthEngine: ProceduralMusicEngine | null = null;

  // Audio Node Chain
  private synthBus: GainNode | null = null;
  private mediaBus: GainNode | null = null;
  private crossfadeGain: GainNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private bassBoostFilter: BiquadFilterNode | null = null;
  private pannerNode: StereoPannerNode | null = null;
  private reverbSendGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedbackGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  // Playback state
  private isSynthetic: boolean = false;
  private isPlaying: boolean = false;
  private currentTrack: Track | null = null;
  private currentObjectUrl: string | null = null;
  private syntheticTime: number = 0;
  private syntheticDuration: number = 180;
  private synthInterval: number | null = null;

  // Crossfade & Gapless state
  private crossfadeSeconds: number = 4;
  private gaplessEnabled: boolean = true;
  private crossfadeTriggeredForTrackId: string | null = null;
  private isCrossfading: boolean = false;
  private crossfadeTimeout: number | null = null;

  // Callbacks
  public onTimeUpdate: ((current: number, total: number) => void) | null = null;
  public onEnded: (() => void) | null = null;
  public onPlayStateChange: ((isPlaying: boolean) => void) | null = null;
  public onCrossfadeStateChange: ((isCrossfading: boolean) => void) | null = null;

  constructor() {
    this.audioElement = new Audio();
    this.audioElement.preload = "auto";

    this.audioElement.addEventListener("timeupdate", () => {
      if (!this.isSynthetic && this.onTimeUpdate) {
        const curr = this.audioElement.currentTime;
        const tot =
          Number.isFinite(this.audioElement.duration) && this.audioElement.duration > 0
            ? this.audioElement.duration
            : this.currentTrack?.duration || 0;
        this.onTimeUpdate(curr, tot);
        this.checkCrossfadeWindow(curr, tot);
      }
    });

    this.audioElement.addEventListener("loadedmetadata", () => {
      if (!this.isSynthetic && this.onTimeUpdate) {
        const curr = this.audioElement.currentTime;
        const tot =
          Number.isFinite(this.audioElement.duration) && this.audioElement.duration > 0
            ? this.audioElement.duration
            : this.currentTrack?.duration || 0;
        this.onTimeUpdate(curr, tot);
      }
    });

    this.audioElement.addEventListener("ended", () => {
      this.isPlaying = false;
      this.setCrossfadingState(false);
      this.onPlayStateChange?.(false);
      this.onEnded?.();
    });

    this.audioElement.addEventListener("play", () => {
      this.isPlaying = true;
      this.onPlayStateChange?.(true);
    });

    this.audioElement.addEventListener("pause", () => {
      this.isPlaying = false;
      this.onPlayStateChange?.(false);
    });
  }

  public init() {
    if (this.ctx) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();

    // Buses
    this.synthBus = this.ctx.createGain();
    this.mediaBus = this.ctx.createGain();

    // Source from HTML audio
    this.mediaSource = this.ctx.createMediaElementSource(this.audioElement);
    this.mediaSource.connect(this.mediaBus);

    // Crossfade & Common bus
    this.crossfadeGain = this.ctx.createGain();
    this.crossfadeGain.gain.value = 1.0;

    const preEqGain = this.ctx.createGain();
    this.synthBus.connect(this.crossfadeGain);
    this.mediaBus.connect(this.crossfadeGain);
    this.crossfadeGain.connect(preEqGain);

    // 10-band EQ chain
    let prevNode: AudioNode = preEqGain;
    this.eqFilters = EQ_FREQUENCIES.map((freq, idx) => {
      const filter = this.ctx!.createBiquadFilter();
      filter.frequency.value = freq;
      if (idx === 0) {
        filter.type = "lowshelf";
      } else if (idx === EQ_FREQUENCIES.length - 1) {
        filter.type = "highshelf";
      } else {
        filter.type = "peaking";
        filter.Q.value = 1.4;
      }
      filter.gain.value = 0;
      prevNode.connect(filter);
      prevNode = filter;
      return filter;
    });

    // Bass Boost Filter (Low Shelf at 90Hz)
    this.bassBoostFilter = this.ctx.createBiquadFilter();
    this.bassBoostFilter.type = "lowshelf";
    this.bassBoostFilter.frequency.value = 90;
    this.bassBoostFilter.gain.value = 0;
    prevNode.connect(this.bassBoostFilter);
    prevNode = this.bassBoostFilter;

    // Stereo Panner
    if (this.ctx.createStereoPanner) {
      this.pannerNode = this.ctx.createStereoPanner();
      this.pannerNode.pan.value = 0;
      prevNode.connect(this.pannerNode);
      prevNode = this.pannerNode;
    }

    // Spatial Reverb / Echo Feedback circuit
    this.delayNode = this.ctx.createDelay();
    this.delayNode.delayTime.value = 0.22; // 220ms spatial reflections
    this.delayFeedbackGain = this.ctx.createGain();
    this.delayFeedbackGain.gain.value = 0.35;
    this.reverbSendGain = this.ctx.createGain();
    this.reverbSendGain.gain.value = 0.15; // default subtle spatial width

    prevNode.connect(this.reverbSendGain);
    this.reverbSendGain.connect(this.delayNode);
    this.delayNode.connect(this.delayFeedbackGain);
    this.delayFeedbackGain.connect(this.delayNode);

    // Master Output & Analyser
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.85;

    prevNode.connect(this.masterGain);
    this.delayNode.connect(this.masterGain);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.82;

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Attach Synth Engine to synthBus
    this.synthEngine = new ProceduralMusicEngine(this.ctx, this.synthBus);
  }

  private setCrossfadingState(active: boolean) {
    if (this.isCrossfading !== active) {
      this.isCrossfading = active;
      this.onCrossfadeStateChange?.(active);
    }
  }

  private checkCrossfadeWindow(current: number, total: number) {
    if (!this.isPlaying || total <= 10 || !this.currentTrack) return;

    const remaining = total - current;
    if (this.crossfadeSeconds > 0 && remaining <= this.crossfadeSeconds && remaining > 0.2) {
      if (this.crossfadeTriggeredForTrackId !== this.currentTrack.id) {
        this.crossfadeTriggeredForTrackId = this.currentTrack.id;
        this.setCrossfadingState(true);

        // Smooth fade-out ramp on current track before seamless handoff
        const fadeOutDuration = Math.max(0.3, Math.min(remaining * 0.55, 3.0));
        if (this.crossfadeGain && this.ctx) {
          const now = this.ctx.currentTime;
          this.crossfadeGain.gain.cancelScheduledValues(now);
          this.crossfadeGain.gain.setValueAtTime(this.crossfadeGain.gain.value, now);
          this.crossfadeGain.gain.linearRampToValueAtTime(0.15, now + fadeOutDuration);
        }

        if (this.crossfadeTimeout) {
          window.clearTimeout(this.crossfadeTimeout);
        }
        this.crossfadeTimeout = window.setTimeout(() => {
          if (this.isPlaying) {
            this.onEnded?.();
          }
        }, fadeOutDuration * 1000);
      }
    }
  }

  public setCrossfadeSeconds(seconds: number) {
    this.crossfadeSeconds = Math.max(0, Math.min(12, seconds));
    if (this.crossfadeSeconds === 0) {
      this.setCrossfadingState(false);
    }
  }

  public getCrossfadeSeconds(): number {
    return this.crossfadeSeconds;
  }

  public setGaplessEnabled(enabled: boolean) {
    this.gaplessEnabled = enabled;
  }

  public getGaplessEnabled(): boolean {
    return this.gaplessEnabled;
  }

  public async playTrack(track: Track, startTime: number = 0) {
    this.init();

    if (this.crossfadeTimeout) {
      window.clearTimeout(this.crossfadeTimeout);
      this.crossfadeTimeout = null;
    }

    if (this.ctx && this.ctx.state === "suspended") {
      await this.ctx.resume();
    }

    const wasCrossfading = this.isCrossfading;
    this.currentTrack = track;
    this.crossfadeTriggeredForTrackId = null;
    this.isSynthetic = Boolean(track.isSynthetic && !track.file && !track.audioUrl);

    // Apply smooth crossfade-in or gapless micro-envelope
    if (this.crossfadeGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.crossfadeGain.gain.cancelScheduledValues(now);
      if (this.crossfadeSeconds > 0 && wasCrossfading) {
        const fadeInDuration = Math.max(0.4, Math.min(this.crossfadeSeconds * 0.5, 3.5));
        this.crossfadeGain.gain.setValueAtTime(0.15, now);
        this.crossfadeGain.gain.linearRampToValueAtTime(1.0, now + fadeInDuration);
        window.setTimeout(() => this.setCrossfadingState(false), fadeInDuration * 1000);
      } else if (this.gaplessEnabled) {
        // Micro 25ms anti-click ramp for true gapless switch
        this.crossfadeGain.gain.setValueAtTime(0.85, now);
        this.crossfadeGain.gain.linearRampToValueAtTime(1.0, now + 0.025);
        this.setCrossfadingState(false);
      } else {
        this.crossfadeGain.gain.setValueAtTime(1.0, now);
        this.setCrossfadingState(false);
      }
    }

    if (this.isSynthetic) {
      // Synthetic playback mode (only for Kotlin DSL synthesized tracks)
      this.audioElement.pause();
      this.syntheticTime = startTime;
      this.syntheticDuration = track.duration || 180;
      this.synthEngine?.setStyle(track.synthPreset || "synthwave");
      this.synthEngine?.start();
      this.startSyntheticTimer();
      this.isPlaying = true;
      this.onPlayStateChange?.(true);
    } else {
      // Real local File / URL playback mode
      this.stopSyntheticTimer();
      this.synthEngine?.stop();

      if (this.currentObjectUrl) {
        URL.revokeObjectURL(this.currentObjectUrl);
        this.currentObjectUrl = null;
      }

      if (track.file) {
        this.audioElement.removeAttribute("crossorigin");
        this.currentObjectUrl = URL.createObjectURL(track.file);
        this.audioElement.src = this.currentObjectUrl;
      } else if (track.audioUrl) {
        this.audioElement.src = track.audioUrl;
      }

      this.audioElement.load();
      if (startTime > 0) {
        this.audioElement.currentTime = startTime;
      }

      try {
        await this.audioElement.play();
        this.isPlaying = true;
        this.onPlayStateChange?.(true);
      } catch (err) {
        console.warn("Audio element play interrupted or failed:", err);
        this.isPlaying = false;
        this.onPlayStateChange?.(false);
      }
    }
  }

  public async resume() {
    this.init();
    if (this.ctx && this.ctx.state === "suspended") {
      await this.ctx.resume();
    }

    if (this.isSynthetic) {
      this.synthEngine?.start(this.currentTrack?.synthPreset);
      this.startSyntheticTimer();
      this.isPlaying = true;
      this.onPlayStateChange?.(true);
    } else {
      if (!this.audioElement.src && this.currentTrack) {
        await this.playTrack(this.currentTrack, this.audioElement.currentTime || 0);
        return;
      }
      try {
        await this.audioElement.play();
        this.isPlaying = true;
        this.onPlayStateChange?.(true);
      } catch (err) {
        console.warn("Resume playback failed:", err);
        this.isPlaying = false;
        this.onPlayStateChange?.(false);
      }
    }
  }

  public pause() {
    if (this.crossfadeTimeout) {
      window.clearTimeout(this.crossfadeTimeout);
      this.crossfadeTimeout = null;
    }
    this.setCrossfadingState(false);
    if (this.isSynthetic) {
      this.synthEngine?.stop();
      this.stopSyntheticTimer();
    } else {
      this.audioElement.pause();
    }
    this.isPlaying = false;
    this.onPlayStateChange?.(false);
  }

  public seek(seconds: number) {
    // Reset crossfade trigger if user seeks backward out of the crossfade zone
    this.crossfadeTriggeredForTrackId = null;
    if (this.crossfadeTimeout) {
      window.clearTimeout(this.crossfadeTimeout);
      this.crossfadeTimeout = null;
    }
    this.setCrossfadingState(false);
    if (this.crossfadeGain && this.ctx) {
      this.crossfadeGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.crossfadeGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    }

    if (this.isSynthetic) {
      this.syntheticTime = Math.max(0, Math.min(seconds, this.syntheticDuration));
      this.onTimeUpdate?.(this.syntheticTime, this.syntheticDuration);
    } else {
      this.audioElement.currentTime = seconds;
    }
  }

  public setVolume(volume: number) {
    const clamped = Math.max(0, Math.min(1, volume));
    this.audioElement.volume = clamped;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(clamped, this.ctx.currentTime);
    }
  }

  public setPlaybackRate(rate: number) {
    const clamped = Math.max(0.5, Math.min(2.0, rate));
    this.audioElement.playbackRate = clamped;
  }

  public setStereoPan(pan: number) {
    if (this.pannerNode && this.ctx) {
      this.pannerNode.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), this.ctx.currentTime);
    }
  }

  public setBassBoost(db: number) {
    if (this.bassBoostFilter && this.ctx) {
      this.bassBoostFilter.gain.setValueAtTime(Math.max(0, Math.min(12, db)), this.ctx.currentTime);
    }
  }

  public setReverb(amount: number) {
    // amount: 0 to 1
    if (this.reverbSendGain && this.ctx) {
      this.reverbSendGain.gain.setValueAtTime(Math.max(0, Math.min(0.7, amount * 0.7)), this.ctx.currentTime);
    }
  }

  public setEqualizerBand(index: number, gainDb: number) {
    if (this.eqFilters[index] && this.ctx) {
      this.eqFilters[index].gain.setValueAtTime(
        Math.max(-12, Math.min(12, gainDb)),
        this.ctx.currentTime
      );
    }
  }

  public setEqualizerBands(gains: number[]) {
    gains.forEach((gain, i) => this.setEqualizerBand(i, gain));
  }

  public getFrequencyData(): Uint8Array {
    if (!this.analyser) {
      return new Uint8Array(128).fill(0);
    }
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  public getTimeDomainData(): Uint8Array {
    if (!this.analyser) {
      return new Uint8Array(128).fill(128);
    }
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);
    return data;
  }

  private startSyntheticTimer() {
    this.stopSyntheticTimer();
    this.synthInterval = window.setInterval(() => {
      this.syntheticTime += 0.25;
      if (this.syntheticTime >= this.syntheticDuration) {
        this.syntheticTime = 0;
        this.setCrossfadingState(false);
        this.onEnded?.();
      } else {
        this.onTimeUpdate?.(this.syntheticTime, this.syntheticDuration);
        this.checkCrossfadeWindow(this.syntheticTime, this.syntheticDuration);
      }
    }, 250);
  }

  private stopSyntheticTimer() {
    if (this.synthInterval !== null) {
      window.clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
  }
}

export const globalAudioEngine = new AudioEngine();
