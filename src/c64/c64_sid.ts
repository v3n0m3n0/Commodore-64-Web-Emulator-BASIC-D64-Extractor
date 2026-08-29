/**
 * MOS 6581 / MOS 8580 SID (Sound Interface Device) Audio Emulation
 * Synthesizes 3 independent voices with Noise, Sawtooth, Triangle, Variable Pulse (PWM),
 * ADSR Envelope Generator, and Multi-Mode Analog Resonant Filter via WebAudio API.
 */

export class SIDVoice {
  public freqLo: number = 0;
  public freqHi: number = 0;
  public pwLo: number = 0;
  public pwHi: number = 0;
  public control: number = 0;
  public attackDecay: number = 0;
  public sustainRelease: number = 0;

  // Internal synthesis state
  public phase: number = 0;
  public envelope: number = 0; // 0.0 to 1.0
  public envState: "IDLE" | "ATTACK" | "DECAY" | "SUSTAIN" | "RELEASE" = "IDLE";
  public noiseShift: number = 0x7ffff8;
  public lastNoiseBit: number = 0;

  // ADSR rate tables (approximate seconds for full transitions)
  private static attackTimes = [
    0.002, 0.008, 0.016, 0.024, 0.038, 0.056, 0.068, 0.08,
    0.1, 0.25, 0.5, 0.8, 1.0, 3.0, 5.0, 8.0,
  ];
  private static decayReleaseTimes = [
    0.006, 0.024, 0.048, 0.072, 0.114, 0.168, 0.204, 0.24,
    0.3, 0.75, 1.5, 2.4, 3.0, 9.0, 15.0, 24.0,
  ];

  public getFrequency(): number {
    const rawFreq = (this.freqHi << 8) | this.freqLo;
    // C64 PAL clock: Fout = (rawFreq * Fclk) / 16777216 = rawFreq * 0.05872 Hz (approx)
    return rawFreq * 0.05872;
  }

  public getPulseWidth(): number {
    return ((this.pwHi & 0x0f) << 8) | this.pwLo;
  }

  public stepADSR(dt: number) {
    const gate = (this.control & 0x01) !== 0;
    const attackIdx = (this.attackDecay >> 4) & 0x0f;
    const decayIdx = this.attackDecay & 0x0f;
    const sustainLevel = ((this.sustainRelease >> 4) & 0x0f) / 15.0;
    const releaseIdx = this.sustainRelease & 0x0f;

    if (gate) {
      if (this.envState === "IDLE" || this.envState === "RELEASE") {
        this.envState = "ATTACK";
      }
      if (this.envState === "ATTACK") {
        const attackRate = 1.0 / SIDVoice.attackTimes[attackIdx];
        this.envelope += attackRate * dt;
        if (this.envelope >= 1.0) {
          this.envelope = 1.0;
          this.envState = "DECAY";
        }
      } else if (this.envState === "DECAY") {
        const decayRate = 1.0 / SIDVoice.decayReleaseTimes[decayIdx];
        this.envelope -= decayRate * dt;
        if (this.envelope <= sustainLevel) {
          this.envelope = sustainLevel;
          this.envState = "SUSTAIN";
        }
      } else if (this.envState === "SUSTAIN") {
        this.envelope = sustainLevel;
      }
    } else {
      if (this.envState !== "IDLE") {
        this.envState = "RELEASE";
        const releaseRate = 1.0 / SIDVoice.decayReleaseTimes[releaseIdx];
        this.envelope -= releaseRate * dt;
        if (this.envelope <= 0) {
          this.envelope = 0;
          this.envState = "IDLE";
        }
      }
    }
  }

  // Generate a single audio sample (-1.0 to 1.0)
  public generateSample(sampleRate: number): number {
    const freq = this.getFrequency();
    if (freq <= 0 || this.envelope <= 0) return 0;

    const dt = 1.0 / sampleRate;
    this.phase = (this.phase + freq * dt) % 1.0;
    this.stepADSR(dt);

    let wave = 0;
    const isNoise = (this.control & 0x80) !== 0;
    const isPulse = (this.control & 0x40) !== 0;
    const isSaw = (this.control & 0x20) !== 0;
    const isTriangle = (this.control & 0x10) !== 0;

    if (isTriangle) {
      wave = this.phase < 0.5 ? 4.0 * this.phase - 1.0 : 3.0 - 4.0 * this.phase;
    } else if (isSaw) {
      wave = 2.0 * this.phase - 1.0;
    } else if (isPulse) {
      const duty = this.getPulseWidth() / 4096.0;
      wave = this.phase < duty ? 1.0 : -1.0;
    } else if (isNoise) {
      // 23-bit LFSR pseudo-random noise generator
      if (Math.random() < freq * dt * 2) {
        const bit0 = this.noiseShift & 1;
        const bit22 = (this.noiseShift >> 22) & 1;
        this.noiseShift = (this.noiseShift >> 1) | ((bit0 ^ bit22) << 22);
      }
      wave = (this.noiseShift & 0xff) / 128.0 - 1.0;
    }

    return wave * this.envelope;
  }
}

export type SIDChipModel = "MOS6581" | "MOS8580";

export class C64SID {
  public regs: Uint8Array = new Uint8Array(32);
  public voices: SIDVoice[] = [new SIDVoice(), new SIDVoice(), new SIDVoice()];
  public chipModel: SIDChipModel = "MOS6581";

  // Filter State Variable Filter (SVF) state
  private vLp: number = 0; // Lowpass output
  private vBp: number = 0; // Bandpass output
  private vHp: number = 0; // Highpass output

  // WebAudio API objects
  private audioCtx: AudioContext | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  public isMuted: boolean = false;
  public volume: number = 0.8;

  constructor() {
    this.reset();
  }

  public setChipModel(model: SIDChipModel) {
    this.chipModel = model;
  }

  public reset() {
    this.regs.fill(0);
    this.vLp = 0;
    this.vBp = 0;
    this.vHp = 0;
    for (const v of this.voices) {
      v.freqLo = 0;
      v.freqHi = 0;
      v.pwLo = 0;
      v.pwHi = 0;
      v.control = 0;
      v.attackDecay = 0;
      v.sustainRelease = 0;
      v.phase = 0;
      v.envelope = 0;
      v.envState = "IDLE";
    }
  }

  // Calculate cutoff frequency based on MOS 6581 vs MOS 8580 curve
  private getCutoffFrequency(): number {
    const rawCutoff = ((this.regs[0x16] << 3) | (this.regs[0x15] & 0x07)) & 0x07ff; // 11-bit
    if (this.chipModel === "MOS6581") {
      // 6581: non-linear, range ~30Hz to ~4000-5000Hz with high bass boost
      const normalized = rawCutoff / 2047.0;
      return 30.0 + (normalized * normalized) * 4500.0;
    } else {
      // 8580: highly linear, range ~30Hz to ~12500Hz
      return 30.0 + (rawCutoff / 2047.0) * 12500.0;
    }
  }

  // Initialize Web Audio API on first user gesture
  public initAudio() {
    if (typeof window === "undefined") return;
    if (this.audioCtx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      this.audioCtx = new AudioContextClass({ sampleRate: 44100 });
      this.scriptNode = this.audioCtx.createScriptProcessor(2048, 0, 1);

      this.scriptNode.onaudioprocess = (e) => {
        const output = e.outputBuffer.getChannelData(0);
        const sampleRate = this.audioCtx?.sampleRate || 44100;
        const masterVol = ((this.regs[0x18] & 0x0f) / 15.0) * (this.isMuted ? 0 : this.volume);

        // Filter parameters
        const filtRes = (this.regs[0x17] >> 4) & 0x0f; // Resonance 0-15
        const filtV1 = (this.regs[0x17] & 0x01) !== 0;
        const filtV2 = (this.regs[0x17] & 0x02) !== 0;
        const filtV3 = (this.regs[0x17] & 0x04) !== 0;
        const isLp = (this.regs[0x18] & 0x10) !== 0;
        const isBp = (this.regs[0x18] & 0x20) !== 0;
        const isHp = (this.regs[0x18] & 0x40) !== 0;
        const voice3Mute = (this.regs[0x18] & 0x80) !== 0;

        const fc = this.getCutoffFrequency();
        // Chamberlin State-Variable Filter coefficients
        const f = Math.min(0.8, 2.0 * Math.sin((Math.PI * fc) / sampleRate));
        const q = this.chipModel === "MOS6581"
          ? 1.0 - (filtRes / 18.0)
          : 1.0 - (filtRes / 15.5);

        for (let i = 0; i < output.length; i++) {
          const s0 = this.voices[0].generateSample(sampleRate);
          const s1 = this.voices[1].generateSample(sampleRate);
          const s2 = voice3Mute ? 0 : this.voices[2].generateSample(sampleRate);

          let filteredIn = 0;
          let nonFiltered = 0;

          if (filtV1) filteredIn += s0; else nonFiltered += s0;
          if (filtV2) filteredIn += s1; else nonFiltered += s1;
          if (filtV3 && !voice3Mute) filteredIn += s2; else if (!voice3Mute) nonFiltered += s2;

          // Apply Analog State-Variable Filter (Chamberlin SVF)
          if (isLp || isBp || isHp) {
            // SVF step
            this.vLp += f * this.vBp;
            this.vHp = filteredIn - this.vLp - q * this.vBp;
            this.vBp += f * this.vHp;

            // 6581 soft non-linear saturation
            if (this.chipModel === "MOS6581") {
              this.vLp = Math.tanh(this.vLp);
              this.vBp = Math.tanh(this.vBp);
            }

            let filteredOut = 0;
            if (isLp) filteredOut += this.vLp;
            if (isBp) filteredOut += this.vBp;
            if (isHp) filteredOut += this.vHp;

            const total = (nonFiltered + filteredOut) / 3.0;
            output[i] = total * masterVol;
          } else {
            const mix = (s0 + s1 + s2) / 3.0;
            output[i] = mix * masterVol;
          }
        }
      };

      this.scriptNode.connect(this.audioCtx.destination);
    } catch (e) {
      console.warn("Could not initialize SID WebAudio:", e);
    }
  }

  public resumeAudio() {
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  // Read register ($D400-$D41F)
  public read(addr: number): number {
    addr &= 0x1f;
    // $D41B: Voice 3 Oscillator Output, $D41C: Voice 3 Envelope Output
    if (addr === 0x1b) {
      return Math.floor(Math.random() * 256);
    }
    if (addr === 0x1c) {
      return Math.floor(this.voices[2].envelope * 255);
    }
    return this.regs[addr];
  }

  // Write register ($D400-$D41F)
  public write(addr: number, val: number) {
    addr &= 0x1f;
    this.regs[addr] = val;

    // Voice 1 ($D400-$D406)
    if (addr === 0x00) this.voices[0].freqLo = val;
    if (addr === 0x01) this.voices[0].freqHi = val;
    if (addr === 0x02) this.voices[0].pwLo = val;
    if (addr === 0x03) this.voices[0].pwHi = val;
    if (addr === 0x04) this.voices[0].control = val;
    if (addr === 0x05) this.voices[0].attackDecay = val;
    if (addr === 0x06) this.voices[0].sustainRelease = val;

    // Voice 2 ($D407-$D40D)
    if (addr === 0x07) this.voices[1].freqLo = val;
    if (addr === 0x08) this.voices[1].freqHi = val;
    if (addr === 0x09) this.voices[1].pwLo = val;
    if (addr === 0x0a) this.voices[1].pwHi = val;
    if (addr === 0x0b) this.voices[1].control = val;
    if (addr === 0x0c) this.voices[1].attackDecay = val;
    if (addr === 0x0d) this.voices[1].sustainRelease = val;

    // Voice 3 ($D40E-$D414)
    if (addr === 0x0e) this.voices[2].freqLo = val;
    if (addr === 0x0f) this.voices[2].freqHi = val;
    if (addr === 0x10) this.voices[2].pwLo = val;
    if (addr === 0x11) this.voices[2].pwHi = val;
    if (addr === 0x12) this.voices[2].control = val;
    if (addr === 0x13) this.voices[2].attackDecay = val;
    if (addr === 0x14) this.voices[2].sustainRelease = val;
  }
}
