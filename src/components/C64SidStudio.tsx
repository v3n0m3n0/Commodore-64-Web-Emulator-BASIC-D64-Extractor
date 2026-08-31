/**
 * Commodore 64 SID (MOS 6581 / MOS 8580) Sound Synth & Tracker Studio
 * Interactive visual sound designer, 3-voice ADSR envelope generator,
 * PWM modulator, multi-mode resonant filter, live WebAudio synthesis,
 * and one-click code generation for Commodore BASIC V2 and 6502 Assembler.
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Volume2,
  VolumeX,
  Play,
  Square,
  Sparkles,
  FileCode,
  Download,
  Copy,
  Check,
  RotateCcw,
  Sliders,
  Tv,
  Zap,
  Music,
  Radio,
} from "lucide-react";
import { C64System } from "../c64/c64_system";

// Frequency table for C64 PAL clock (F_out = F_reg * 0.05872 Hz)
// F_reg = round(Hz / 0.058722)
export interface SidNote {
  name: string;
  octave: number;
  freqHz: number;
  c64FreqVal: number; // 16-bit value ($0000-$FFFF)
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function generateNoteTable(): SidNote[] {
  const notes: SidNote[] = [];
  const a4 = 440.0;
  const c64PalConst = 0.0587224;

  for (let octave = 0; octave <= 7; octave++) {
    for (let semitone = 0; semitone < 12; semitone++) {
      const midi = octave * 12 + semitone + 12; // MIDI note number
      const freqHz = a4 * Math.pow(2, (midi - 69) / 12);
      const c64Val = Math.min(65535, Math.max(0, Math.round(freqHz / c64PalConst)));
      notes.push({
        name: `${NOTE_NAMES[semitone]}-${octave}`,
        octave,
        freqHz: Math.round(freqHz * 10) / 10,
        c64FreqVal: c64Val,
      });
    }
  }
  return notes;
}

export const SID_NOTES = generateNoteTable();

export interface SidVoiceConfig {
  freqVal: number;
  pulseWidth: number; // 0..4095
  waveTriangle: boolean;
  waveSawtooth: boolean;
  wavePulse: boolean;
  waveNoise: boolean;
  ringMod: boolean;
  hardSync: boolean;
  testBit: boolean;
  gate: boolean;
  attack: number; // 0..15
  decay: number; // 0..15
  sustain: number; // 0..15
  release: number; // 0..15
  filtered: boolean;
}

export interface SidPreset {
  id: string;
  name: string;
  category: "Lead" | "Bass" | "SFX" | "Arp" | "Percussion" | "Pad";
  description: string;
  voice1: SidVoiceConfig;
  voice2?: SidVoiceConfig;
  voice3?: SidVoiceConfig;
  filterCutoff: number;
  filterResonance: number;
  filterLowpass: boolean;
  filterBandpass: boolean;
  filterHighpass: boolean;
  filterVoice3Off: boolean;
  masterVolume: number;
  chipModel: "MOS6581" | "MOS8580";
}

export const SID_PRESETS: SidPreset[] = [
  {
    id: "rob-hubbard-lead",
    name: "Rob Hubbard Arp Lead",
    category: "Lead",
    description: "Classic snappy pulse-width modulated lead with quick attack and resonant bite.",
    voice1: {
      freqVal: 0x4000,
      pulseWidth: 2048,
      waveTriangle: false,
      waveSawtooth: false,
      wavePulse: true,
      waveNoise: false,
      ringMod: false,
      hardSync: false,
      testBit: false,
      gate: false,
      attack: 0,
      decay: 8,
      sustain: 10,
      release: 3,
      filtered: true,
    },
    filterCutoff: 1200,
    filterResonance: 8,
    filterLowpass: true,
    filterBandpass: false,
    filterHighpass: false,
    filterVoice3Off: false,
    masterVolume: 15,
    chipModel: "MOS6581",
  },
  {
    id: "martin-galway-bass",
    name: "Martin Galway Analog Bass",
    category: "Bass",
    description: "Deep saw & pulse unison bassline with heavy 6581 lowpass filtering.",
    voice1: {
      freqVal: 0x0dd6, // C-2
      pulseWidth: 1024,
      waveTriangle: false,
      waveSawtooth: true,
      wavePulse: false,
      waveNoise: false,
      ringMod: false,
      hardSync: false,
      testBit: false,
      gate: false,
      attack: 1,
      decay: 6,
      sustain: 12,
      release: 4,
      filtered: true,
    },
    filterCutoff: 650,
    filterResonance: 12,
    filterLowpass: true,
    filterBandpass: false,
    filterHighpass: false,
    filterVoice3Off: false,
    masterVolume: 15,
    chipModel: "MOS6581",
  },
  {
    id: "laser-shoot",
    name: "Arcade Laser Shoot SFX",
    category: "SFX",
    description: "High-pitch frequency drop with noise decay used in 80s space shooters.",
    voice1: {
      freqVal: 0x7a00,
      pulseWidth: 1500,
      waveTriangle: false,
      waveSawtooth: true,
      wavePulse: false,
      waveNoise: true,
      ringMod: false,
      hardSync: false,
      testBit: false,
      gate: false,
      attack: 0,
      decay: 4,
      sustain: 0,
      release: 2,
      filtered: false,
    },
    filterCutoff: 0,
    filterResonance: 0,
    filterLowpass: false,
    filterBandpass: false,
    filterHighpass: false,
    filterVoice3Off: false,
    masterVolume: 15,
    chipModel: "MOS8580",
  },
  {
    id: "explosion-hit",
    name: "Heavy Explosion / Crash",
    category: "SFX",
    description: "23-bit LFSR noise with long decay and bandpass resonance sweep.",
    voice1: {
      freqVal: 0x0800,
      pulseWidth: 2048,
      waveTriangle: false,
      waveSawtooth: false,
      wavePulse: false,
      waveNoise: true,
      ringMod: false,
      hardSync: false,
      testBit: false,
      gate: false,
      attack: 0,
      decay: 11,
      sustain: 0,
      release: 9,
      filtered: true,
    },
    filterCutoff: 400,
    filterResonance: 10,
    filterLowpass: false,
    filterBandpass: true,
    filterHighpass: false,
    filterVoice3Off: false,
    masterVolume: 15,
    chipModel: "MOS6581",
  },
  {
    id: "coin-pickup",
    name: "Coin / Bonus Chime",
    category: "SFX",
    description: "Pure bright triangle / pulse harmonic ping with snappy decay.",
    voice1: {
      freqVal: 0x5cd0, // B-5
      pulseWidth: 2048,
      waveTriangle: true,
      waveSawtooth: false,
      wavePulse: true,
      waveNoise: false,
      ringMod: false,
      hardSync: false,
      testBit: false,
      gate: false,
      attack: 0,
      decay: 5,
      sustain: 0,
      release: 3,
      filtered: false,
    },
    filterCutoff: 0,
    filterResonance: 0,
    filterLowpass: false,
    filterBandpass: false,
    filterHighpass: false,
    filterVoice3Off: false,
    masterVolume: 15,
    chipModel: "MOS8580",
  },
  {
    id: "808-kick-drum",
    name: "8-Bit Analog Kick Drum",
    category: "Percussion",
    description: "Fast pitch drop on triangle waveform creating punchy sub-bass transient.",
    voice1: {
      freqVal: 0x08b0,
      pulseWidth: 2048,
      waveTriangle: true,
      waveSawtooth: false,
      wavePulse: false,
      waveNoise: false,
      ringMod: false,
      hardSync: false,
      testBit: false,
      gate: false,
      attack: 0,
      decay: 5,
      sustain: 0,
      release: 2,
      filtered: true,
    },
    filterCutoff: 300,
    filterResonance: 4,
    filterLowpass: true,
    filterBandpass: false,
    filterHighpass: false,
    filterVoice3Off: false,
    masterVolume: 15,
    chipModel: "MOS6581",
  },
  {
    id: "cyber-pad",
    name: "Cyberpunk Ambient Pad",
    category: "Pad",
    description: "Slow attack triangle/saw swell with subtle bandpass filter resonance.",
    voice1: {
      freqVal: 0x1ba2, // C-3
      pulseWidth: 2048,
      waveTriangle: true,
      waveSawtooth: true,
      wavePulse: false,
      waveNoise: false,
      ringMod: false,
      hardSync: false,
      testBit: false,
      gate: false,
      attack: 8,
      decay: 7,
      sustain: 13,
      release: 9,
      filtered: true,
    },
    filterCutoff: 950,
    filterResonance: 6,
    filterLowpass: true,
    filterBandpass: true,
    filterHighpass: false,
    filterVoice3Off: false,
    masterVolume: 15,
    chipModel: "MOS8580",
  },
];

const ATTACK_MS = [2, 8, 16, 24, 38, 56, 68, 80, 100, 250, 500, 800, 1000, 3000, 5000, 8000];
const DECAY_REL_MS = [6, 24, 48, 72, 114, 168, 204, 240, 300, 750, 1500, 2400, 3000, 9000, 15000, 24000];

interface C64SidStudioProps {
  system: C64System;
  onOpenBasicStudio: (code: string) => void;
  onSwitchToScreen: () => void;
}

export const C64SidStudio: React.FC<C64SidStudioProps> = ({
  system,
  onOpenBasicStudio,
  onSwitchToScreen,
}) => {
  const [activeVoiceIndex, setActiveVoiceIndex] = useState<0 | 1 | 2>(0);
  const [voices, setVoices] = useState<[SidVoiceConfig, SidVoiceConfig, SidVoiceConfig]>([
    {
      freqVal: 0x22cd, // C-4 approx 261.6 Hz
      pulseWidth: 2048, // 50% square
      waveTriangle: false,
      waveSawtooth: true,
      wavePulse: false,
      waveNoise: false,
      ringMod: false,
      hardSync: false,
      testBit: false,
      gate: false,
      attack: 0,
      decay: 5,
      sustain: 10,
      release: 3,
      filtered: true,
    },
    {
      freqVal: 0x1166, // C-3
      pulseWidth: 1024, // 25% pulse
      waveTriangle: false,
      waveSawtooth: false,
      wavePulse: true,
      waveNoise: false,
      ringMod: false,
      hardSync: false,
      testBit: false,
      gate: false,
      attack: 2,
      decay: 6,
      sustain: 8,
      release: 4,
      filtered: true,
    },
    {
      freqVal: 0x08b3, // C-2
      pulseWidth: 2048,
      waveTriangle: true,
      waveSawtooth: false,
      wavePulse: false,
      waveNoise: false,
      ringMod: false,
      hardSync: false,
      testBit: false,
      gate: false,
      attack: 0,
      decay: 4,
      sustain: 0,
      release: 2,
      filtered: false,
    },
  ]);

  // Master Filter State
  const [filterCutoff, setFilterCutoff] = useState<number>(1024); // 11-bit: 0..2047
  const [filterResonance, setFilterResonance] = useState<number>(6); // 4-bit: 0..15
  const [filterLowpass, setFilterLowpass] = useState<boolean>(true);
  const [filterBandpass, setFilterBandpass] = useState<boolean>(false);
  const [filterHighpass, setFilterHighpass] = useState<boolean>(false);
  const [filterVoice3Off, setFilterVoice3Off] = useState<boolean>(false);
  const [masterVolume, setMasterVolume] = useState<number>(15); // 0..15
  const [chipModel, setChipModel] = useState<"MOS6581" | "MOS8580">("MOS6581");

  // Playback & UI State
  const [isPlayingLive, setIsPlayingLive] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<string>("custom");
  const [copiedCodeType, setCopiedCodeType] = useState<string | null>(null);

  // WebAudio preview context
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeNodesRef = useRef<{
    oscs: OscillatorNode[];
    gains: GainNode[];
    filter: BiquadFilterNode | null;
  } | null>(null);

  const curVoice = voices[activeVoiceIndex];

  // Helper to update active voice config
  const updateActiveVoice = (updater: (prev: SidVoiceConfig) => SidVoiceConfig) => {
    setVoices((prev) => {
      const next = [...prev] as [SidVoiceConfig, SidVoiceConfig, SidVoiceConfig];
      next[activeVoiceIndex] = updater(next[activeVoiceIndex]);
      return next;
    });
    setActivePreset("custom");
  };

  // Convert raw 16-bit C64 frequency to Hz
  const currentHz = useMemo(() => {
    return Math.round(curVoice.freqVal * 0.0587224 * 10) / 10;
  }, [curVoice.freqVal]);

  // Find nearest note name
  const nearestNote = useMemo(() => {
    let best = SID_NOTES[0];
    let minDiff = Infinity;
    for (const n of SID_NOTES) {
      const diff = Math.abs(n.c64FreqVal - curVoice.freqVal);
      if (diff < minDiff) {
        minDiff = diff;
        best = n;
      }
    }
    return best;
  }, [curVoice.freqVal]);

  // Load a preset
  const handleLoadPreset = (preset: SidPreset) => {
    setVoices([
      { ...preset.voice1 },
      preset.voice2 ? { ...preset.voice2 } : { ...voices[1] },
      preset.voice3 ? { ...preset.voice3 } : { ...voices[2] },
    ]);
    setFilterCutoff(preset.filterCutoff);
    setFilterResonance(preset.filterResonance);
    setFilterLowpass(preset.filterLowpass);
    setFilterBandpass(preset.filterBandpass);
    setFilterHighpass(preset.filterHighpass);
    setFilterVoice3Off(preset.filterVoice3Off);
    setMasterVolume(preset.masterVolume);
    setChipModel(preset.chipModel);
    setActivePreset(preset.id);
  };

  // Trigger sound in WebAudio preview
  const playPreviewSound = (durationMs = 1500) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      // Stop any existing preview nodes
      if (activeNodesRef.current) {
        activeNodesRef.current.oscs.forEach((o) => {
          try {
            o.stop();
          } catch {}
        });
      }

      const now = ctx.currentTime;
      const oscs: OscillatorNode[] = [];
      const gains: GainNode[] = [];

      // Filter node
      let filterNode: BiquadFilterNode | null = null;
      if (filterLowpass || filterBandpass || filterHighpass) {
        filterNode = ctx.createBiquadFilter();
        if (filterLowpass) filterNode.type = "lowpass";
        else if (filterBandpass) filterNode.type = "bandpass";
        else if (filterHighpass) filterNode.type = "highpass";

        // SID cutoff 0-2047 maps to ~30Hz to ~12000Hz
        const cutoffHz = 30 + (filterCutoff / 2047) * 11970;
        filterNode.frequency.setValueAtTime(cutoffHz, now);
        filterNode.Q.setValueAtTime(1 + (filterResonance / 15) * 15, now);
        filterNode.connect(ctx.destination);
      }

      // Master gain
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime((masterVolume / 15) * 0.4, now);
      if (filterNode) {
        masterGain.connect(filterNode);
      } else {
        masterGain.connect(ctx.destination);
      }

      // Play current voice
      const v = curVoice;
      const freqHz = v.freqVal * 0.0587224;

      const osc = ctx.createOscillator();
      if (v.waveTriangle) osc.type = "triangle";
      else if (v.waveSawtooth) osc.type = "sawtooth";
      else if (v.wavePulse) osc.type = "square";
      else osc.type = "sawtooth";

      osc.frequency.setValueAtTime(Math.max(20, freqHz), now);

      const voiceGain = ctx.createGain();
      const attackSec = ATTACK_MS[v.attack] / 1000;
      const decaySec = DECAY_REL_MS[v.decay] / 1000;
      const sustainLvl = v.sustain / 15;
      const releaseSec = DECAY_REL_MS[v.release] / 1000;

      // ADSR Envelope
      voiceGain.gain.setValueAtTime(0, now);
      voiceGain.gain.linearRampToValueAtTime(1.0, now + attackSec);
      voiceGain.gain.linearRampToValueAtTime(sustainLvl, now + attackSec + decaySec);

      const gateHoldTime = Math.max(0.2, durationMs / 1000 - releaseSec);
      voiceGain.gain.setValueAtTime(sustainLvl, now + gateHoldTime);
      voiceGain.gain.linearRampToValueAtTime(0.0001, now + gateHoldTime + releaseSec);

      osc.connect(voiceGain);
      voiceGain.connect(masterGain);

      osc.start(now);
      osc.stop(now + gateHoldTime + releaseSec + 0.1);

      oscs.push(osc);
      gains.push(voiceGain);

      activeNodesRef.current = { oscs, gains, filter: filterNode };
      setIsPlayingLive(true);
      setTimeout(() => setIsPlayingLive(false), durationMs);
    } catch (e) {
      console.error("WebAudio preview error:", e);
    }
  };

  // Inject current configuration directly into running C64 emulator SID registers
  const injectIntoC64System = () => {
    const sid = system.sid;
    const v = curVoice;
    const baseReg = activeVoiceIndex * 7;

    // Freq Lo / Hi
    sid.write(baseReg + 0, v.freqVal & 0xff);
    sid.write(baseReg + 1, (v.freqVal >> 8) & 0xff);

    // Pulse Width Lo / Hi
    sid.write(baseReg + 2, v.pulseWidth & 0xff);
    sid.write(baseReg + 3, (v.pulseWidth >> 8) & 0x0f);

    // Control Register
    let ctrl = 0x01; // Gate ON
    if (v.waveNoise) ctrl |= 0x80;
    if (v.wavePulse) ctrl |= 0x40;
    if (v.waveSawtooth) ctrl |= 0x20;
    if (v.waveTriangle) ctrl |= 0x10;
    if (v.testBit) ctrl |= 0x08;
    if (v.ringMod) ctrl |= 0x04;
    if (v.hardSync) ctrl |= 0x02;
    sid.write(baseReg + 4, ctrl);

    // Attack / Decay
    sid.write(baseReg + 5, ((v.attack & 0x0f) << 4) | (v.decay & 0x0f));

    // Sustain / Release
    sid.write(baseReg + 6, ((v.sustain & 0x0f) << 4) | (v.release & 0x0f));

    // Filter Cutoff
    sid.write(0x15, v.filtered ? filterCutoff & 0x07 : 0);
    sid.write(0x16, v.filtered ? (filterCutoff >> 3) & 0xff : 0);

    // Filter Resonance & Route
    let resReg = (filterResonance & 0x0f) << 4;
    if (voices[0].filtered) resReg |= 0x01;
    if (voices[1].filtered) resReg |= 0x02;
    if (voices[2].filtered) resReg |= 0x04;
    sid.write(0x17, resReg);

    // Master Volume & Filter Mode
    let modeReg = masterVolume & 0x0f;
    if (filterLowpass) modeReg |= 0x10;
    if (filterBandpass) modeReg |= 0x20;
    if (filterHighpass) modeReg |= 0x40;
    if (filterVoice3Off) modeReg |= 0x80;
    sid.write(0x18, modeReg);

    // Auto gate-off after 1.5 seconds
    setTimeout(() => {
      sid.write(baseReg + 4, ctrl & ~0x01); // Gate OFF
    }, 1500);
  };

  // Generate Commodore BASIC V2 code
  const generatedBasicCode = useMemo(() => {
    const v = curVoice;
    const freqLo = v.freqVal & 0xff;
    const freqHi = (v.freqVal >> 8) & 0xff;
    const pwLo = v.pulseWidth & 0xff;
    const pwHi = (v.pulseWidth >> 8) & 0x0f;
    let ctrl = 1; // Gate ON
    if (v.waveNoise) ctrl += 128;
    if (v.wavePulse) ctrl += 64;
    if (v.waveSawtooth) ctrl += 32;
    if (v.waveTriangle) ctrl += 16;
    if (v.ringMod) ctrl += 4;
    if (v.hardSync) ctrl += 2;

    const ad = (v.attack << 4) + v.decay;
    const sr = (v.sustain << 4) + v.release;

    let fltCtrl = (filterResonance << 4);
    if (voices[0].filtered) fltCtrl += 1;
    if (voices[1].filtered) fltCtrl += 2;
    if (voices[2].filtered) fltCtrl += 4;

    let fltMode = masterVolume;
    if (filterLowpass) fltMode += 16;
    if (filterBandpass) fltMode += 32;
    if (filterHighpass) fltMode += 64;

    return `10 REM *** COMMODORE 64 SID SYNTH PLAYER ***
20 REM SOUND: ${activePreset.toUpperCase()}
30 S=54272:REM SID BASE REGISTER ($D400)
40 FOR I=0 TO 24:POKE S+I,0:NEXT I:REM CLEAR SID
50 POKE S+24,${fltMode}:REM MASTER VOLUME & FILTER MODE
60 POKE S+21,${(filterCutoff >> 3) & 0xff}:POKE S+22,${fltCtrl}:REM FILTER CUTOFF & RESONANCE
70 REM VOICE ${activeVoiceIndex + 1} CONFIGURATION
80 POKE S+${activeVoiceIndex * 7 + 0},${freqLo}:REM FREQUENCY LOW
90 POKE S+${activeVoiceIndex * 7 + 1},${freqHi}:REM FREQUENCY HIGH
100 POKE S+${activeVoiceIndex * 7 + 2},${pwLo}:REM PULSE WIDTH LOW
111 POKE S+${activeVoiceIndex * 7 + 3},${pwHi}:REM PULSE WIDTH HIGH
120 POKE S+${activeVoiceIndex * 7 + 5},${ad}:REM ATTACK / DECAY
130 POKE S+${activeVoiceIndex * 7 + 6},${sr}:REM SUSTAIN / RELEASE
140 POKE S+${activeVoiceIndex * 7 + 4},${ctrl}:REM WAVEFORM & GATE ON
150 FOR T=1 TO 500:NEXT T:REM NOTE DURATION
160 POKE S+${activeVoiceIndex * 7 + 4},${ctrl - 1}:REM GATE OFF (RELEASE)
170 PRINT "PLAYBACK COMPLETE."`;
  }, [curVoice, filterCutoff, filterResonance, filterLowpass, filterBandpass, filterHighpass, masterVolume, activePreset, activeVoiceIndex, voices]);

  // Generate 6502 Machine Code / Assembler source
  const generatedAsmCode = useMemo(() => {
    const v = curVoice;
    const freqLo = `$${(v.freqVal & 0xff).toString(16).padStart(2, "0").toUpperCase()}`;
    const freqHi = `$${((v.freqVal >> 8) & 0xff).toString(16).padStart(2, "0").toUpperCase()}`;
    let ctrlVal = 0x01;
    if (v.waveNoise) ctrlVal |= 0x80;
    if (v.wavePulse) ctrlVal |= 0x40;
    if (v.waveSawtooth) ctrlVal |= 0x20;
    if (v.waveTriangle) ctrlVal |= 0x10;
    if (v.ringMod) ctrlVal |= 0x04;
    if (v.hardSync) ctrlVal |= 0x02;

    const adVal = `$${(((v.attack & 0x0f) << 4) | (v.decay & 0x0f)).toString(16).padStart(2, "0").toUpperCase()}`;
    const srVal = `$${(((v.sustain & 0x0f) << 4) | (v.release & 0x0f)).toString(16).padStart(2, "0").toUpperCase()}`;
    const ctrlHex = `$${ctrlVal.toString(16).padStart(2, "0").toUpperCase()}`;
    const ctrlOffHex = `$${(ctrlVal & ~0x01).toString(16).padStart(2, "0").toUpperCase()}`;

    return `; ===================================================
; MOS 6581 / MOS 8580 SID SOUND PLAYBACK ROUTINE
; Target: Commodore 64 / 6502 Machine Language
; ===================================================

* = $C000               ; Load and execute address

SID_BASE    = $D400
SID_V1_FREQ = SID_BASE + 0
SID_V1_PW   = SID_BASE + 2
SID_V1_CTRL = SID_BASE + 4
SID_V1_AD   = SID_BASE + 5
SID_V1_SR   = SID_BASE + 6
SID_VOL     = SID_BASE + 24

PLAY_SOUND:
    ; 1. Clear SID registers
    LDX #$18
    LDA #$00
CLEAR_LOOP:
    STA SID_BASE,X
    DEX
    BPL CLEAR_LOOP

    ; 2. Set Master Volume
    LDA #${`$${(masterVolume & 0x0f).toString(16).padStart(2, "0").toUpperCase()}`}
    STA SID_VOL

    ; 3. Setup Voice Frequency (${currentHz} Hz)
    LDA #${freqLo}
    STA SID_V1_FREQ + ${activeVoiceIndex * 7}
    LDA #${freqHi}
    STA SID_V1_FREQ + ${activeVoiceIndex * 7 + 1}

    ; 4. Setup Envelope (ADSR)
    LDA #${adVal}
    STA SID_V1_AD + ${activeVoiceIndex * 7}
    LDA #${srVal}
    STA SID_V1_SR + ${activeVoiceIndex * 7}

    ; 5. Trigger Waveform & Gate ON
    LDA #${ctrlHex}
    STA SID_V1_CTRL + ${activeVoiceIndex * 7}

    ; 6. Delay Loop
    LDY #$80
DELAY_OUTER:
    LDX #$FF
DELAY_INNER:
    DEX
    BNE DELAY_INNER
    DEY
    BNE DELAY_OUTER

    ; 7. Gate OFF (Release Stage)
    LDA #${ctrlOffHex}
    STA SID_V1_CTRL + ${activeVoiceIndex * 7}
    RTS`;
  }, [curVoice, masterVolume, currentHz, activeVoiceIndex]);

  // Copy code to clipboard
  const handleCopyCode = (code: string, type: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeType(type);
    setTimeout(() => setCopiedCodeType(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 flex flex-col gap-6 font-mono text-[#e6edf3]">
      {/* Studio Header Banner */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#a371f7]/20 border border-[#a371f7] flex items-center justify-center text-[#d2a8ff] shadow-lg shadow-purple-500/10">
            <Music className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                MOS 6581 / 8580 SID SOUND SYNTH & TRACKER
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#a371f7] text-white">
                3 VOICES
              </span>
            </div>
            <p className="text-xs text-[#8b949e] mt-0.5">
              3 Independent Voices • ADSR Envelopes • 12-Bit PWM • Analog Multi-Mode Resonant Filter
            </p>
          </div>
        </div>

        {/* Global Sound Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => playPreviewSound(1500)}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all ${
              isPlayingLive
                ? "bg-[#f0883e] text-white animate-pulse"
                : "bg-[#238636] hover:bg-[#2ea043] text-white"
            }`}
          >
            <Play className="w-4 h-4 fill-white" />
            {isPlayingLive ? "Playing Voice..." : "Audition Voice"}
          </button>

          <button
            onClick={injectIntoC64System}
            className="px-3.5 py-2 rounded-xl bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            title="Inject directly into live C64 Emulator"
          >
            <Zap className="w-4 h-4" />
            Send to C64 SID
          </button>
        </div>
      </div>

      {/* Preset Library Quick Selector */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 shadow-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[#8b949e] uppercase">
            <Sparkles className="w-4 h-4 text-[#d29922]" />
            Curated Classic C64 Sound Presets
          </div>
          <span className="text-[11px] text-[#58a6ff]">
            Active: <strong className="text-white uppercase">{activePreset}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {SID_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleLoadPreset(preset)}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all ${
                activePreset === preset.id
                  ? "bg-[#1f6feb]/20 border-[#1f6feb] text-white shadow-sm"
                  : "bg-[#0d1117] border-[#30363d] hover:border-[#58a6ff] text-[#8b949e] hover:text-white"
              }`}
            >
              <span className="font-bold text-xs text-white truncate">{preset.name}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#21262d] w-fit text-[#58a6ff]">
                {preset.category}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Active Voice Synthesizer Controls */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Voice Selector Tabs */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 shadow-xl flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
              <div className="flex items-center gap-2">
                {([0, 1, 2] as const).map((vIdx) => (
                  <button
                    key={vIdx}
                    onClick={() => setActiveVoiceIndex(vIdx)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      activeVoiceIndex === vIdx
                        ? "bg-[#a371f7] text-white shadow-md shadow-purple-500/20"
                        : "bg-[#0d1117] text-[#8b949e] hover:text-white border border-[#30363d]"
                    }`}
                  >
                    <Music className="w-3.5 h-3.5" />
                    VOICE {vIdx + 1}
                    {voices[vIdx].waveNoise
                      ? "(Noise)"
                      : voices[vIdx].wavePulse
                      ? "(Pulse)"
                      : voices[vIdx].waveSawtooth
                      ? "(Saw)"
                      : "(Tri)"}
                  </button>
                ))}
              </div>

              {/* Note / Pitch Display */}
              <div className="flex items-center gap-2 bg-[#0d1117] px-3 py-1.5 rounded-xl border border-[#30363d] text-xs">
                <span className="text-[#8b949e]">NOTE:</span>
                <span className="text-[#58a6ff] font-bold">{nearestNote.name}</span>
                <span className="text-[#8b949e]">({currentHz} Hz)</span>
                <span className="text-[#a371f7] font-mono">
                  ${curVoice.freqVal.toString(16).padStart(4, "0").toUpperCase()}
                </span>
              </div>
            </div>

            {/* Frequency & Piano Key Roll */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[#8b949e] uppercase flex justify-between">
                <span>Oscillator Frequency (${(activeVoiceIndex * 7).toString(16).toUpperCase()} / ${(activeVoiceIndex * 7 + 1).toString(16).toUpperCase()})</span>
                <span className="text-white">{curVoice.freqVal} / 65535</span>
              </label>
              <input
                type="range"
                min={200}
                max={60000}
                step={20}
                value={curVoice.freqVal}
                onChange={(e) =>
                  updateActiveVoice((prev) => ({
                    ...prev,
                    freqVal: parseInt(e.target.value, 10),
                  }))
                }
                className="w-full accent-[#a371f7] bg-[#0d1117] h-2 rounded-lg cursor-pointer"
              />

              {/* Quick Musical Keyboard octave buttons */}
              <div className="flex items-center gap-1 overflow-x-auto py-1">
                {SID_NOTES.filter((n) => n.octave === 3 || n.octave === 4).map((n) => (
                  <button
                    key={n.name}
                    onClick={() => {
                      updateActiveVoice((prev) => ({ ...prev, freqVal: n.c64FreqVal }));
                      playPreviewSound(800);
                    }}
                    className={`flex-1 py-1.5 rounded text-[10px] font-bold transition-colors ${
                      n.name.includes("#")
                        ? "bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] hover:text-white"
                        : "bg-[#0d1117] text-white hover:bg-[#1f6feb] border border-[#30363d]"
                    } ${nearestNote.name === n.name ? "border-[#a371f7] text-[#a371f7]" : ""}`}
                  >
                    {n.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Waveform Selector Grid */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[#8b949e] uppercase">
                Waveform Select ($D404 / bit 4..7)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  onClick={() =>
                    updateActiveVoice((prev) => ({
                      ...prev,
                      waveTriangle: !prev.waveTriangle,
                    }))
                  }
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                    curVoice.waveTriangle
                      ? "bg-[#1f6feb]/20 border-[#1f6feb] text-white shadow-sm"
                      : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-white"
                  }`}
                >
                  <span className="text-base font-bold">▲</span>
                  <span className="text-xs font-bold">Triangle ($10)</span>
                </button>

                <button
                  onClick={() =>
                    updateActiveVoice((prev) => ({
                      ...prev,
                      waveSawtooth: !prev.waveSawtooth,
                    }))
                  }
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                    curVoice.waveSawtooth
                      ? "bg-[#1f6feb]/20 border-[#1f6feb] text-white shadow-sm"
                      : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-white"
                  }`}
                >
                  <span className="text-base font-bold">⚡</span>
                  <span className="text-xs font-bold">Sawtooth ($20)</span>
                </button>

                <button
                  onClick={() =>
                    updateActiveVoice((prev) => ({
                      ...prev,
                      wavePulse: !prev.wavePulse,
                    }))
                  }
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                    curVoice.wavePulse
                      ? "bg-[#1f6feb]/20 border-[#1f6feb] text-white shadow-sm"
                      : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-white"
                  }`}
                >
                  <span className="text-base font-bold">⎍</span>
                  <span className="text-xs font-bold">Pulse / PWM ($40)</span>
                </button>

                <button
                  onClick={() =>
                    updateActiveVoice((prev) => ({
                      ...prev,
                      waveNoise: !prev.waveNoise,
                    }))
                  }
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                    curVoice.waveNoise
                      ? "bg-[#1f6feb]/20 border-[#1f6feb] text-white shadow-sm"
                      : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-white"
                  }`}
                >
                  <span className="text-base font-bold">🎲</span>
                  <span className="text-xs font-bold">LFSR Noise ($80)</span>
                </button>
              </div>
            </div>

            {/* Pulse Width (PWM) 12-Bit Slider */}
            {curVoice.wavePulse && (
              <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#8b949e]">Pulse Width Duty Cycle ($D402-$D403)</span>
                  <span className="text-[#58a6ff]">
                    {curVoice.pulseWidth} / 4095 ({((curVoice.pulseWidth / 4095) * 100).toFixed(1)}%)
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={4095}
                  value={curVoice.pulseWidth}
                  onChange={(e) =>
                    updateActiveVoice((prev) => ({
                      ...prev,
                      pulseWidth: parseInt(e.target.value, 10),
                    }))
                  }
                  className="w-full accent-[#58a6ff] bg-[#161b22] h-2 rounded-lg cursor-pointer"
                />
              </div>
            )}

            {/* ADSR Envelope Sliders & Dynamic Graph */}
            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold text-[#8b949e] uppercase">
                ADSR Envelope Generator ($D405 / $D406)
              </label>

              {/* Visual ADSR Curve (SVG) */}
              <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3 flex flex-col items-center justify-center">
                <svg className="w-full h-20 overflow-visible" viewBox="0 0 400 80">
                  <defs>
                    <linearGradient id="adsrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a371f7" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#a371f7" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Grid Lines */}
                  <line x1="0" y1="75" x2="400" y2="75" stroke="#30363d" strokeWidth="1" />
                  <line x1="0" y1="10" x2="400" y2="10" stroke="#30363d" strokeWidth="1" strokeDasharray="3 3" />

                  {/* ADSR Polyline */}
                  {(() => {
                    const aX = 10 + (curVoice.attack / 15) * 70;
                    const dX = aX + 15 + (curVoice.decay / 15) * 70;
                    const sY = 75 - (curVoice.sustain / 15) * 65;
                    const rX = dX + 80;
                    const endX = Math.min(390, rX + 10 + (curVoice.release / 15) * 90);

                    const points = `10,75 ${aX},10 ${dX},${sY} ${rX},${sY} ${endX},75`;
                    return (
                      <>
                        <polygon
                          points={`10,75 ${aX},10 ${dX},${sY} ${rX},${sY} ${endX},75 ${endX},75 10,75`}
                          fill="url(#adsrGrad)"
                        />
                        <polyline points={points} fill="none" stroke="#a371f7" strokeWidth="3" />
                        <circle cx={aX} cy={10} r={4} fill="#58a6ff" />
                        <circle cx={dX} cy={sY} r={4} fill="#58a6ff" />
                        <circle cx={rX} cy={sY} r={4} fill="#58a6ff" />
                        <circle cx={endX} cy={75} r={4} fill="#58a6ff" />
                      </>
                    );
                  })()}
                </svg>
              </div>

              {/* 4 ADSR Sliders */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-2.5 flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-[#8b949e]">Attack (A)</span>
                    <span className="text-[#58a6ff]">{ATTACK_MS[curVoice.attack]} ms</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={15}
                    value={curVoice.attack}
                    onChange={(e) =>
                      updateActiveVoice((prev) => ({
                        ...prev,
                        attack: parseInt(e.target.value, 10),
                      }))
                    }
                    className="w-full accent-[#58a6ff] h-1.5 cursor-pointer"
                  />
                </div>

                <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-2.5 flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-[#8b949e]">Decay (D)</span>
                    <span className="text-[#58a6ff]">{DECAY_REL_MS[curVoice.decay]} ms</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={15}
                    value={curVoice.decay}
                    onChange={(e) =>
                      updateActiveVoice((prev) => ({
                        ...prev,
                        decay: parseInt(e.target.value, 10),
                      }))
                    }
                    className="w-full accent-[#58a6ff] h-1.5 cursor-pointer"
                  />
                </div>

                <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-2.5 flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-[#8b949e]">Sustain (S)</span>
                    <span className="text-[#58a6ff]">{Math.round((curVoice.sustain / 15) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={15}
                    value={curVoice.sustain}
                    onChange={(e) =>
                      updateActiveVoice((prev) => ({
                        ...prev,
                        sustain: parseInt(e.target.value, 10),
                      }))
                    }
                    className="w-full accent-[#58a6ff] h-1.5 cursor-pointer"
                  />
                </div>

                <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-2.5 flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-[#8b949e]">Release (R)</span>
                    <span className="text-[#58a6ff]">{DECAY_REL_MS[curVoice.release]} ms</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={15}
                    value={curVoice.release}
                    onChange={(e) =>
                      updateActiveVoice((prev) => ({
                        ...prev,
                        release: parseInt(e.target.value, 10),
                      }))
                    }
                    className="w-full accent-[#58a6ff] h-1.5 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Modulation / Hard Sync & Routing */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#30363d]">
              <label className="flex items-center gap-2 bg-[#0d1117] p-2.5 rounded-xl border border-[#30363d] cursor-pointer">
                <input
                  type="checkbox"
                  checked={curVoice.ringMod}
                  onChange={(e) =>
                    updateActiveVoice((prev) => ({
                      ...prev,
                      ringMod: e.target.checked,
                    }))
                  }
                  className="rounded text-[#a371f7]"
                />
                <span className="text-xs font-bold text-white">Ring Modulation ($04)</span>
              </label>

              <label className="flex items-center gap-2 bg-[#0d1117] p-2.5 rounded-xl border border-[#30363d] cursor-pointer">
                <input
                  type="checkbox"
                  checked={curVoice.hardSync}
                  onChange={(e) =>
                    updateActiveVoice((prev) => ({
                      ...prev,
                      hardSync: e.target.checked,
                    }))
                  }
                  className="rounded text-[#a371f7]"
                />
                <span className="text-xs font-bold text-white">Oscillator Sync ($02)</span>
              </label>

              <label className="flex items-center gap-2 bg-[#0d1117] p-2.5 rounded-xl border border-[#30363d] cursor-pointer">
                <input
                  type="checkbox"
                  checked={curVoice.filtered}
                  onChange={(e) =>
                    updateActiveVoice((prev) => ({
                      ...prev,
                      filtered: e.target.checked,
                    }))
                  }
                  className="rounded text-[#a371f7]"
                />
                <span className="text-xs font-bold text-white">Route to Filter ($D417)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Master Filter, Chip Model & Code Exporters */}
        <div className="flex flex-col gap-6">
          {/* Master Filter Controls */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
              <div className="flex items-center gap-2 font-bold text-white text-xs uppercase">
                <Sliders className="w-4 h-4 text-[#58a6ff]" />
                Master Resonant Filter ($D415-$D418)
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#21262d] text-[#58a6ff]">
                {chipModel}
              </span>
            </div>

            {/* Cutoff & Resonance Sliders */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#8b949e]">Cutoff Frequency (11-Bit)</span>
                  <span className="text-[#58a6ff]">
                    {filterCutoff} / 2047 (~{Math.round(30 + (filterCutoff / 2047) * 11970)} Hz)
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2047}
                  value={filterCutoff}
                  onChange={(e) => setFilterCutoff(parseInt(e.target.value, 10))}
                  className="w-full accent-[#58a6ff] bg-[#0d1117] h-2 rounded-lg cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#8b949e]">Resonance (Q) (4-Bit)</span>
                  <span className="text-[#58a6ff]">{filterResonance} / 15</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={15}
                  value={filterResonance}
                  onChange={(e) => setFilterResonance(parseInt(e.target.value, 10))}
                  className="w-full accent-[#58a6ff] bg-[#0d1117] h-2 rounded-lg cursor-pointer"
                />
              </div>

              {/* Filter Pass Modes */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  onClick={() => setFilterLowpass(!filterLowpass)}
                  className={`py-2 rounded-xl border text-xs font-bold transition-colors ${
                    filterLowpass
                      ? "bg-[#238636] border-[#238636] text-white"
                      : "bg-[#0d1117] border-[#30363d] text-[#8b949e]"
                  }`}
                >
                  Lowpass ($10)
                </button>
                <button
                  onClick={() => setFilterBandpass(!filterBandpass)}
                  className={`py-2 rounded-xl border text-xs font-bold transition-colors ${
                    filterBandpass
                      ? "bg-[#238636] border-[#238636] text-white"
                      : "bg-[#0d1117] border-[#30363d] text-[#8b949e]"
                  }`}
                >
                  Bandpass ($20)
                </button>
                <button
                  onClick={() => setFilterHighpass(!filterHighpass)}
                  className={`py-2 rounded-xl border text-xs font-bold transition-colors ${
                    filterHighpass
                      ? "bg-[#238636] border-[#238636] text-white"
                      : "bg-[#0d1117] border-[#30363d] text-[#8b949e]"
                  }`}
                >
                  Highpass ($40)
                </button>
              </div>

              {/* Master Volume */}
              <div className="flex flex-col gap-1 pt-2 border-t border-[#30363d]">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#8b949e]">Master Volume ($D418)</span>
                  <span className="text-[#7ee787]">{masterVolume} / 15</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={15}
                  value={masterVolume}
                  onChange={(e) => setMasterVolume(parseInt(e.target.value, 10))}
                  className="w-full accent-[#7ee787] bg-[#0d1117] h-2 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Code Generators & Inter-Studio Export */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
              <div className="flex items-center gap-2 font-bold text-white text-xs uppercase">
                <FileCode className="w-4 h-4 text-[#7ee787]" />
                Commodore 64 Code Generators
              </div>
            </div>

            {/* Actions: Send to BASIC Studio or Run directly */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  onOpenBasicStudio(generatedBasicCode);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-[#1f6feb] hover:bg-[#388bfd] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <FileCode className="w-4 h-4" />
                Open in BASIC Studio
              </button>

              <button
                onClick={() => {
                  system.typeText(generatedBasicCode);
                  onSwitchToScreen();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-[#238636] hover:bg-[#2ea043] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Tv className="w-4 h-4" />
                Type & Run in C64 Screen
              </button>
            </div>

            {/* Code Tabs Preview */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#8b949e]">BASIC V2 Player Code</span>
                <button
                  onClick={() => handleCopyCode(generatedBasicCode, "basic")}
                  className="text-xs text-[#58a6ff] hover:text-white flex items-center gap-1"
                >
                  {copiedCodeType === "basic" ? (
                    <>
                      <Check className="w-3 h-3 text-green-400" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copy BASIC
                    </>
                  )}
                </button>
              </div>

              <pre className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3 text-[10px] text-[#7ee787] font-mono overflow-x-auto max-h-36 leading-relaxed select-all">
                {generatedBasicCode}
              </pre>

              <div className="flex items-center justify-between mt-2">
                <span className="text-xs font-bold text-[#8b949e]">6502 Machine Assembly</span>
                <button
                  onClick={() => handleCopyCode(generatedAsmCode, "asm")}
                  className="text-xs text-[#58a6ff] hover:text-white flex items-center gap-1"
                >
                  {copiedCodeType === "asm" ? (
                    <>
                      <Check className="w-3 h-3 text-green-400" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copy 6502 ASM
                    </>
                  )}
                </button>
              </div>

              <pre className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3 text-[10px] text-[#d2a8ff] font-mono overflow-x-auto max-h-36 leading-relaxed select-all">
                {generatedAsmCode}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
