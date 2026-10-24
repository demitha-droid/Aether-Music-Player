// High-fidelity procedural audio synthesizer engine using standard Web Audio API
// Generates continuous, melodious musical stems without relying on external CDNs or brittle static files

export class ProceduralMusicEngine {
  private ctx: AudioContext;
  private outputNode: GainNode;
  private isRunning: boolean = false;
  private currentStyle: string = "synthwave";
  private timerId: number | null = null;
  private step: number = 0;
  private bpm: number = 110;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.outputNode = ctx.createGain();
    this.outputNode.gain.value = 0.85;
    this.outputNode.connect(destination);
  }

  public setStyle(style: string) {
    this.currentStyle = style;
    switch (style) {
      case "synthwave":
        this.bpm = 118;
        break;
      case "lofi":
        this.bpm = 82;
        break;
      case "piano":
        this.bpm = 72;
        break;
      case "cyberpunk":
        this.bpm = 128;
        break;
      case "ambient":
        this.bpm = 60;
        break;
      case "kotlin_beat":
        this.bpm = 126;
        break;
      default:
        this.bpm = 110;
    }
  }

  public start(style?: string) {
    if (this.isRunning) return;
    if (style) this.setStyle(style);
    this.isRunning = true;
    this.step = 0;
    this.scheduleLoop();
  }

  public stop() {
    this.isRunning = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private scheduleLoop = () => {
    if (!this.isRunning) return;

    const interval = (60 / this.bpm / 4) * 1000; // 16th notes
    const time = this.ctx.currentTime + 0.05;

    this.playStep(this.step, time);
    this.step = (this.step + 1) % 64;

    this.timerId = window.setTimeout(this.scheduleLoop, interval);
  };

  private playStep(step: number, time: number) {
    switch (this.currentStyle) {
      case "synthwave":
        this.playSynthwaveStep(step, time);
        break;
      case "lofi":
        this.playLofiStep(step, time);
        break;
      case "piano":
        this.playPianoStep(step, time);
        break;
      case "cyberpunk":
        this.playCyberpunkStep(step, time);
        break;
      case "ambient":
        this.playAmbientStep(step, time);
        break;
      case "kotlin_beat":
        this.playKotlinBeatStep(step, time);
        break;
      default:
        this.playSynthwaveStep(step, time);
    }
  }

  // --- Styles ---

  private playSynthwaveStep(step: number, time: number) {
    // 4-on-the-floor Kick
    if (step % 4 === 0) {
      this.triggerKick(time, 130, 40, 0.28, 0.9);
    }
    // Snare on 4 and 12
    if (step % 8 === 4) {
      this.triggerSnare(time, 0.18, 0.6);
    }
    // 16th Hi-hat
    if (step % 2 === 0) {
      this.triggerHat(time, step % 4 === 2 ? 0.08 : 0.04, 0.35);
    }

    // Rolling Synth Bass (16th notes)
    const rootNotes = [48, 48, 44, 44, 46, 46, 41, 41]; // C, G#, A#, F
    const currentRoot = rootNotes[Math.floor(step / 8) % rootNotes.length];
    const octave = step % 2 === 0 ? 0 : 12;
    this.triggerSynthBass(time, currentRoot + octave, 0.12, 0.35);

    // Arpeggiator Lead
    if (step % 2 === 0) {
      const scale = [0, 3, 7, 10, 12, 15, 19, 22];
      const arpNote = currentRoot + 24 + scale[step % scale.length];
      this.triggerPluck(time, arpNote, 0.2, 0.25, "sawtooth");
    }
  }

  private playLofiStep(step: number, time: number) {
    // Boom-bap pattern
    if (step === 0 || step === 10 || step === 22) {
      this.triggerKick(time, 90, 45, 0.3, 0.75);
    }
    if (step === 8 || step === 24 || step === 40 || step === 56) {
      this.triggerSnare(time, 0.22, 0.5);
    }
    if (step % 2 === 1) {
      this.triggerHat(time, 0.05, 0.25);
    }

    // Warm Rhodes/Lofi Chords on downbeats
    if (step % 16 === 0) {
      const chords = [
        [53, 57, 60, 64], // Fmaj7
        [52, 55, 59, 62], // Em7
        [50, 53, 57, 60], // Dm7
        [48, 52, 55, 59], // Cmaj7
      ];
      const chord = chords[Math.floor(step / 16) % chords.length];
      chord.forEach((midi, i) => {
        this.triggerPluck(time + i * 0.02, midi, 1.8, 0.2, "sine");
      });
    }

    // Sub Bass
    if (step % 16 === 0) {
      const bassRoots = [33, 31, 29, 28];
      const root = bassRoots[Math.floor(step / 16) % bassRoots.length];
      this.triggerSubBass(time, root, 1.6, 0.4);
    }
  }

  private playPianoStep(step: number, time: number) {
    // Minimalist Neo-classical Piano Pattern
    const chords = [
      [60, 64, 67, 71], // Cmaj7
      [57, 60, 64, 67], // Am7
      [53, 57, 60, 64], // Fmaj7
      [55, 59, 62, 67], // G
    ];
    const currentChord = chords[Math.floor(step / 16) % chords.length];

    if (step % 4 === 0) {
      const noteIdx = (step / 4) % currentChord.length;
      this.triggerPluck(time, currentChord[noteIdx] + 12, 0.6, 0.28, "triangle");
    }

    if (step % 16 === 0) {
      // Deep bass fundamental
      this.triggerPluck(time, currentChord[0] - 24, 1.8, 0.45, "sine");
    }
  }

  private playCyberpunkStep(step: number, time: number) {
    // Heavy industrial kicks
    if (step % 4 === 0) {
      this.triggerKick(time, 180, 32, 0.35, 1.0);
    }
    if (step % 8 === 4) {
      this.triggerDistortedSnare(time, 0.25, 0.8);
    }
    // High hats
    if (step % 2 === 0) {
      this.triggerHat(time, 0.06, 0.4);
    }

    // Aggressive saw bass
    const bassMidi = 36 + (step % 8 < 4 ? 0 : 3);
    this.triggerCyberBass(time, bassMidi, 0.18, 0.45);
  }

  private playAmbientStep(step: number, time: number) {
    // Deep atmospheric washes
    if (step % 32 === 0) {
      const droneNotes = [45, 52, 57, 64]; // A minor open chord
      droneNotes.forEach((midi, idx) => {
        this.triggerDrone(time + idx * 0.1, midi, 4.5, 0.18);
      });
    }
  }

  private playKotlinBeatStep(step: number, time: number) {
    // Upbeat energetic melodic chiptune / math-rock rhythm
    if (step % 4 === 0) {
      this.triggerKick(time, 150, 45, 0.25, 0.85);
    }
    if (step % 8 === 4) {
      this.triggerSnare(time, 0.2, 0.65);
    }
    if (step % 2 === 0) {
      this.triggerHat(time, 0.05, 0.3);
    }

    // Fast melodic square wave arpeggios
    const scale = [60, 62, 64, 67, 69, 72, 74, 76];
    const note = scale[step % scale.length];
    this.triggerPluck(time, note, 0.14, 0.25, "square");

    // Bassline
    if (step % 4 === 0) {
      const bassNote = 36 + ((Math.floor(step / 8) * 5) % 12);
      this.triggerSynthBass(time, bassNote, 0.2, 0.4);
    }
  }

  // --- Sound Synthesis Units ---

  private mtof(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  private triggerKick(time: number, startFreq: number, endFreq: number, duration: number, gainVal: number) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + duration);

    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(this.outputNode);

    osc.start(time);
    osc.stop(time + duration);
  }

  private triggerSnare(time: number, duration: number, gainVal: number) {
    // Noise buffer + tone
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 1000;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputNode);

    noise.start(time);
    noise.stop(time + duration);
  }

  private triggerDistortedSnare(time: number, duration: number, gainVal: number) {
    this.triggerSnare(time, duration, gainVal);
    // Add aggressive tone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, time);
    osc.frequency.exponentialRampToValueAtTime(70, time + duration);
    gain.gain.setValueAtTime(gainVal * 0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain);
    gain.connect(this.outputNode);
    osc.start(time);
    osc.stop(time + duration);
  }

  private triggerHat(time: number, duration: number, gainVal: number) {
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 7500;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputNode);

    noise.start(time);
    noise.stop(time + duration);
  }

  private triggerSynthBass(time: number, midi: number, duration: number, gainVal: number) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(this.mtof(midi), time);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(650, time);
    filter.frequency.exponentialRampToValueAtTime(140, time + duration);

    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputNode);

    osc.start(time);
    osc.stop(time + duration);
  }

  private triggerSubBass(time: number, midi: number, duration: number, gainVal: number) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(this.mtof(midi), time);

    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(this.outputNode);

    osc.start(time);
    osc.stop(time + duration);
  }

  private triggerCyberBass(time: number, midi: number, duration: number, gainVal: number) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(this.mtof(midi), time);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2200, time);
    filter.frequency.exponentialRampToValueAtTime(300, time + duration);
    filter.Q.value = 6.0;

    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputNode);

    osc.start(time);
    osc.stop(time + duration);
  }

  private triggerPluck(
    time: number,
    midi: number,
    duration: number,
    gainVal: number,
    type: OscillatorType = "sine"
  ) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(this.mtof(midi), time);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(3200, time);
    filter.frequency.exponentialRampToValueAtTime(800, time + duration);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(gainVal, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputNode);

    osc.start(time);
    osc.stop(time + duration);
  }

  private triggerDrone(time: number, midi: number, duration: number, gainVal: number) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(this.mtof(midi), time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(gainVal, time + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    gain.connect(this.outputNode);

    osc.start(time);
    osc.stop(time + duration);
  }
}
