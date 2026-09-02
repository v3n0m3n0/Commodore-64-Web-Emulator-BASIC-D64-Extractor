/**
 * Commodore 1530 C2N Datasette Studio & Multi-Cassette Tape Deck
 * =============================================================
 * Interactive Multi-Cassette Carousel, Hot-Swapping Side Switcher,
 * Real-Time Magnetic Pulse Oscilloscope, Precision Tape Scrubber,
 * and Tape File Directory Explorer.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Radio,
  Play,
  Square,
  RotateCcw,
  FastForward,
  Zap,
  Layers,
  FileCode,
  Cpu,
  Tv,
  Plus,
  Trash2,
  RefreshCw,
  Activity,
  Sliders,
  Disc,
  Info,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { C64System } from "../c64/c64_system";
import { C64TAP, TAPFileEntry } from "../c64/c64_tap";
import { C64Basic } from "../c64/c64_basic_detokenizer";
import { C64ArchiveManager } from "../c64/c64_archive_manager";

interface C64DatasetteStudioProps {
  system: C64System;
  onOpenBasicStudio: (code: string) => void;
  onOpenDebugger: (address: number) => void;
  onSwitchToScreen: () => void;
}

export const C64DatasetteStudio: React.FC<C64DatasetteStudioProps> = ({
  system,
  onOpenBasicStudio,
  onOpenDebugger,
  onSwitchToScreen,
}) => {
  const [, setTick] = useState(0);
  const [selectedFile, setSelectedFile] = useState<TAPFileEntry | null>(null);
  const [manualCounter, setManualCounter] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Force re-render periodically when tape is playing or motor is on
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  // Real-time Magnetic Pulse Oscilloscope Animation
  useEffect(() => {
    let animId: number;

    const renderOscilloscope = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Clear with dark oscilloscope phosphor grid
      ctx.fillStyle = "#090d13";
      ctx.fillRect(0, 0, width, height);

      // Draw oscilloscope grid lines
      ctx.strokeStyle = "#1b2533";
      ctx.lineWidth = 1;
      const gridStep = 24;

      ctx.beginPath();
      for (let x = 0; x < width; x += gridStep) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += gridStep) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Center baseline
      const centerY = height / 2;
      ctx.strokeStyle = "#283548";
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      // Get recent pulse window from Datasette
      const pulses = system.datasette.getPulseSampleWindow(64);
      const isMotorOn = system.datasette.motorOn;
      const isPlaying = system.datasette.state === "PLAYING";

      if (pulses.length > 0) {
        // Draw magnetic pulse wave
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;

        const sliceWidth = width / pulses.length;
        let x = 0;

        ctx.beginPath();
        for (let i = 0; i < pulses.length; i++) {
          const p = pulses[i];
          // Classify pulse length for color coding
          let pulseColor = "#58a6ff"; // Standard blue
          if (p < 432) {
            pulseColor = "#3fb950"; // Short pulse (green)
          } else if (p < 592) {
            pulseColor = "#38bdf8"; // Medium pulse (cyan)
          } else if (p < 800) {
            pulseColor = "#d29922"; // Long pulse (amber)
          } else {
            pulseColor = "#bc8cff"; // Extra long / pause (purple)
          }

          // Compute amplitude relative to center
          const normalizedLen = Math.min(1.0, p / 1200);
          const amp = (normalizedLen * (height * 0.4)) * (i % 2 === 0 ? 1 : -1);
          const y = centerY + (isPlaying && isMotorOn ? amp : amp * 0.1);

          if (i === 0) {
            ctx.moveTo(x, centerY);
            ctx.lineTo(x, y);
          } else {
            ctx.strokeStyle = pulseColor;
            ctx.shadowColor = pulseColor;
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Current read head cursor
        ctx.strokeStyle = "#ff7b72";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(width * 0.2, 0);
        ctx.lineTo(width * 0.2, height);
        ctx.stroke();

        // Read Head Label
        ctx.fillStyle = "#ff7b72";
        ctx.font = "10px monospace";
        ctx.fillText("READ HEAD", width * 0.2 + 4, 14);
      } else {
        // Idle line
        ctx.strokeStyle = "#30363d";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        ctx.fillStyle = "#8b949e";
        ctx.font = "11px monospace";
        ctx.textAlign = "center";
        ctx.fillText(
          system.mountedTapImage ? "DATASETTE STOPPED — NO FLUX" : "NO TAPE MOUNTED IN C2N DRIVE",
          width / 2,
          centerY - 10
        );
      }

      animId = requestAnimationFrame(renderOscilloscope);
    };

    animId = requestAnimationFrame(renderOscilloscope);
    return () => cancelAnimationFrame(animId);
  }, [system]);

  const handleAppendTapeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        const extracted = await C64ArchiveManager.processUploadedFile(f);
        for (const item of extracted) {
          if (item.type === "TAP") {
            system.datasette.addTape(item.name, item.data);
          }
        }
      } catch (err) {
        console.error("Error adding tape to deck:", err);
      }
    }
    e.target.value = "";
  };

  const handleRunTapFile = (file: TAPFileEntry) => {
    if (file.prgData && file.prgData.length > 0) {
      if (file.headerPayload && file.headerPayload.length > 0) {
        for (let i = 0; i < Math.min(192, file.headerPayload.length); i++) {
          system.memory.ram[0x033c + i] = file.headerPayload[i];
        }
      }
      system.loadAndRunPRG(file.prgData, file.name);
      onSwitchToScreen();
    }
  };

  const handleDetokenizeTapFile = (file: TAPFileEntry) => {
    if (file.prgData && file.prgData.length > 0) {
      const source = C64Basic.detokenize(file.prgData);
      onOpenBasicStudio(source || `10 REM ${file.name}\n20 PRINT "READY."`);
    }
  };

  const handleDisassembleTapFile = (file: TAPFileEntry) => {
    if (file.prgData && file.prgData.length > 0) {
      system.loadAndRunPRG(file.prgData, file.name);
      onOpenDebugger(file.startAddr);
    }
  };

  const tap = system.mountedTapImage;
  const deck = system.datasette.tapeDeck;
  const activeDeckIndex = system.datasette.activeDeckIndex;
  const isPlaying = system.datasette.state === "PLAYING";
  const isMotorOn = system.datasette.motorOn;

  return (
    <div className="space-y-6">
      {/* Tape Deck Master Header Card */}
      <div className="bg-[#161b22] border border-[#d29922]/50 rounded-2xl p-5 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#d29922]/10 border border-[#d29922] flex items-center justify-center text-[#d29922] relative">
            <Radio className={`w-8 h-8 ${isMotorOn ? "animate-pulse" : ""}`} />
            {isMotorOn && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-green-400 animate-ping" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                COMMODORE 1530 C2N DATASETTE TAPE DECK
              </h2>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isPlaying
                    ? "bg-[#238636] text-white animate-pulse"
                    : "bg-[#30363d] text-[#8b949e]"
                }`}
              >
                {system.datasette.state}
              </span>
              {isMotorOn && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#d29922] text-black animate-pulse">
                  MOTOR ON
                </span>
              )}
              {system.datasette.isWarpActive && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1f6feb] text-white">
                  ⚡ AUTO-WARP
                </span>
              )}
            </div>
            <p className="text-xs text-[#8b949e] mt-1">
              {tap ? (
                <>
                  <span className="text-white font-bold">{tap.fileName || "Active Tape"}</span>
                  {tap.sideName && (
                    <span className="ml-1 text-[#d29922] font-semibold">({tap.sideName})</span>
                  )}
                  {" • "}
                  {tap.detectedLoader} • {tap.pulses.length.toLocaleString()} Pulses • Remaining:{" "}
                  <span className="text-[#7ee787] font-mono font-bold">
                    {system.datasette.formattedRemainingTime}
                  </span>
                </>
              ) : (
                "No Tape Mounted • Load a .TAP file or multi-cassette archive below"
              )}
            </p>
          </div>
        </div>

        {/* Counter Display & Quick Controls */}
        <div className="flex items-center gap-3">
          <div className="bg-[#090d13] border border-[#30363d] px-4 py-2 rounded-xl flex items-center gap-3">
            <div>
              <div className="text-[10px] text-[#8b949e] font-bold uppercase tracking-wider">
                TAPE COUNTER
              </div>
              <div className="text-2xl font-black font-mono text-[#58a6ff] tracking-widest">
                {String(system.datasette.counter).padStart(4, "0")}
              </div>
            </div>
            <div className="border-l border-[#30363d] pl-3">
              <div className="text-[10px] text-[#8b949e] font-bold uppercase tracking-wider">
                PROGRESS
              </div>
              <div className="text-sm font-bold font-mono text-white">
                {system.datasette.progressPercent.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Cassette Carousel / Side Switcher */}
      {deck.length > 0 && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#d29922]" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Tape Deck Carousel ({deck.length} {deck.length === 1 ? "Cassette" : "Cassettes / Sides"})
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {deck.length > 1 && (
                <button
                  onClick={() => system.flipTapeSide()}
                  className="px-3 py-1.5 rounded-lg bg-[#d29922]/20 hover:bg-[#d29922]/30 text-[#d29922] text-xs font-bold flex items-center gap-1.5 border border-[#d29922]/50 transition-all"
                  title="Przełącz stronę kasety bez resetu emulatora"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  ⇄ Flip Side (Hot-Swap)
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".tap,.zip"
                multiple
                className="sr-only"
                onChange={handleAppendTapeFile}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white text-xs font-bold flex items-center gap-1.5 border border-[#30363d] transition-colors"
                title="Dodaj kolejną kasetę / stronę do magnetofonu"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Tape to Deck
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {deck.map((entry, idx) => {
              const isActive = idx === activeDeckIndex;
              return (
                <div
                  key={entry.id}
                  onClick={() => system.switchTape(idx)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                    isActive
                      ? "bg-[#1f2937] border-[#d29922] shadow-lg shadow-yellow-500/10"
                      : "bg-[#0d1117] border-[#30363d] hover:border-[#8b949e]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isActive
                            ? "bg-[#d29922] text-black"
                            : "bg-[#21262d] text-[#8b949e]"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white truncate max-w-[140px]">
                          {entry.name}
                        </div>
                        <div className="text-[11px] text-[#d29922] font-semibold">
                          {entry.sideName}
                        </div>
                      </div>
                    </div>
                    {isActive && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#238636] text-white">
                        IN DRIVE
                      </span>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-[#30363d]/60 flex items-center justify-between text-[11px] text-[#8b949e]">
                    <span>{entry.image.pulses.length.toLocaleString()} pulses</span>
                    <span>{(entry.image.totalDurationSeconds / 60).toFixed(1)} min</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Real-Time Magnetic Pulse Oscilloscope */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#58a6ff]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Magnetic Flux & Pulse Transition Oscilloscope
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-[#8b949e]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#3fb950]" /> Short (~352c)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#38bdf8]" /> Med (~512c)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#d29922]" /> Long (~672c)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#bc8cff]" /> Turbo Burst
            </span>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden border border-[#30363d] bg-[#090d13]">
          <canvas
            ref={canvasRef}
            width={800}
            height={140}
            className="w-full h-36 block"
          />
        </div>
      </div>

      {/* Precision Transport Controls & Tape Scrubber */}
      {tap && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#58a6ff]" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Datasette Transport & Tape Scrubber
              </h3>
            </div>
            <div className="text-xs font-mono text-[#8b949e]">
              Pulse {system.datasette.pulseIndex.toLocaleString()} of{" "}
              {tap.pulses.length.toLocaleString()}
            </div>
          </div>

          {/* Scrubber Progress Bar */}
          <div className="space-y-1">
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={system.datasette.progressPercent}
              onChange={(e) => system.datasette.seekToPercent(parseFloat(e.target.value))}
              className="w-full h-2.5 bg-[#090d13] rounded-lg appearance-none cursor-pointer accent-[#d29922]"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#8b949e]">
              <span>000 (0:00)</span>
              <span>250</span>
              <span>500</span>
              <span>750</span>
              <span>999 (End)</span>
            </div>
          </div>

          {/* Mechanical Transport Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  system.datasette.play();
                  system.start();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95 ${
                  isPlaying
                    ? "bg-[#238636] text-white shadow-green-500/20"
                    : "bg-[#21262d] hover:bg-[#238636] text-white border border-[#30363d]"
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                PLAY
              </button>

              <button
                onClick={() => system.datasette.stop()}
                className="px-4 py-2 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-bold flex items-center gap-2 border border-[#30363d] transition-all active:scale-95"
              >
                <Square className="w-4 h-4" />
                STOP
              </button>

              <button
                onClick={() => system.datasette.rewind()}
                className="px-4 py-2 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-bold flex items-center gap-2 border border-[#30363d] transition-all active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                REWIND (000)
              </button>

              <button
                onClick={() => system.datasette.fastForward(10)}
                className="px-4 py-2 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-bold flex items-center gap-2 border border-[#30363d] transition-all active:scale-95"
              >
                <FastForward className="w-4 h-4" />
                FFWD (+10%)
              </button>

              <button
                onClick={() => {
                  system.datasette.autoWarp = !system.datasette.autoWarp;
                  setTick((t) => t + 1);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                  system.datasette.autoWarp
                    ? "bg-[#1f6feb] text-white border-[#1f6feb]"
                    : "bg-[#21262d] text-[#8b949e] border-[#30363d]"
                }`}
                title="Automatycznie przyspiesza emulację podczas wczytywania taśmy"
              >
                <Zap className="w-3.5 h-3.5" />
                Auto-Warp {system.datasette.autoWarp ? "ON" : "OFF"}
              </button>
            </div>

            {/* Direct Counter Seek Input */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="999"
                placeholder="Counter"
                value={manualCounter}
                onChange={(e) => setManualCounter(e.target.value)}
                className="w-20 px-2.5 py-1.5 rounded-lg bg-[#090d13] border border-[#30363d] text-xs font-mono text-white placeholder-[#8b949e]"
              />
              <button
                onClick={() => {
                  const val = parseInt(manualCounter, 10);
                  if (!isNaN(val)) {
                    system.datasette.seekToCounter(val);
                    setManualCounter("");
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-bold border border-[#30363d]"
              >
                Cue Tape
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tape File Directory Explorer */}
      {tap && tap.files && tap.files.length > 0 && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode className="w-5 h-5 text-[#7ee787]" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Detected Tape Files ({tap.files.length} {tap.files.length === 1 ? "Program" : "Programs"})
              </h3>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#30363d]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#090d13] border-b border-[#30363d] text-[#8b949e]">
                  <th className="p-3 font-semibold">#</th>
                  <th className="p-3 font-semibold">File Name</th>
                  <th className="p-3 font-semibold">Type</th>
                  <th className="p-3 font-semibold">Start Addr</th>
                  <th className="p-3 font-semibold">Size</th>
                  <th className="p-3 font-semibold">Pulse Offset</th>
                  <th className="p-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d]/60 font-mono">
                {tap.files.map((file, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-[#21262d]/50 transition-colors"
                  >
                    <td className="p-3 text-[#8b949e]">{idx + 1}</td>
                    <td className="p-3 font-bold text-white">{file.name}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/30">
                        {file.typeName}
                      </span>
                    </td>
                    <td className="p-3 text-[#d29922]">
                      ${file.startAddr.toString(16).padStart(4, "0").toUpperCase()}
                    </td>
                    <td className="p-3 text-[#8b949e]">{file.formattedSize}</td>
                    <td className="p-3 text-[#8b949e]">
                      {file.pulseOffset?.toLocaleString() || "0"}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleRunTapFile(file)}
                          className="px-2.5 py-1 rounded bg-[#238636] hover:bg-[#2ea043] text-white text-[11px] font-bold flex items-center gap-1 shadow-sm"
                          title="Uruchom program natychmiast"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          Run
                        </button>
                        {typeof file.pulseOffset === "number" && (
                          <button
                            onClick={() => system.datasette.seekToPulse(file.pulseOffset!)}
                            className="px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-white text-[11px] font-bold border border-[#30363d]"
                            title="Ustaw taśmę dokładnie na początku tego pliku"
                          >
                            Cue
                          </button>
                        )}
                        <button
                          onClick={() => handleDetokenizeTapFile(file)}
                          className="px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white text-[11px] border border-[#30363d]"
                          title="Podgląd w BASIC Studio"
                        >
                          <FileCode className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDisassembleTapFile(file)}
                          className="px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white text-[11px] border border-[#30363d]"
                          title="Disasemblacja w 6502 Debugger"
                        >
                          <Cpu className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Multi-Cassette Authentic Classics Library Showcase */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#d29922]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Authentic Multi-Cassette Classics Library
            </h3>
          </div>
          <span className="text-xs text-[#8b949e]">
            100% Genuine Binary Tape Dumps (No Mocks)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            {
              title: "North & South",
              publisher: "Infogrames",
              year: 1989,
              sides: ["North and South (Side 1).tap"],
              genre: "Strategy / Arcade",
              badge: "Cyberload Turbo",
            },
            {
              title: "Turn'n'Burn",
              publisher: "Grandslam",
              year: 1990,
              sides: ["Turn'n'Burn (Side 1).tap", "Turn'n'Burn (Side 2).tap"],
              genre: "Flight Combat",
              badge: "2-Side Tape Set",
            },
            {
              title: "Twinworld",
              publisher: "Domark",
              year: 1989,
              sides: ["Twinworld (Side 1).tap", "Twinworld (Side 2).tap"],
              genre: "Platformer",
              badge: "2-Side Tape Set",
            },
            {
              title: "Typhoon",
              publisher: "Imagine",
              year: 1988,
              sides: ["Typhoon (Side 1).tap", "Typhoon (Side 2).tap"],
              genre: "Vertical Shooter",
              badge: "2-Side Tape Set",
            },
            {
              title: "Vigilante",
              publisher: "US Gold",
              year: 1989,
              sides: ["Vigilante (Side 1).tap", "Vigilante (Side 2).tap"],
              genre: "Beat 'em up",
              badge: "2-Side Tape Set",
            },
            {
              title: "Viz",
              publisher: "Virgin",
              year: 1991,
              sides: ["Viz (Side 1) - Game.tap", "Viz (Side 2) - Bonus Levels.tap"],
              genre: "Arcade Racing",
              badge: "Game + Bonus Tape",
            },
            {
              title: "Yes Prime Minister",
              publisher: "Mosaic",
              year: 1987,
              sides: ["Yes Prime Minister (Side 1).tap", "Yes Prime Minister (Side 2).tap"],
              genre: "Political Simulation",
              badge: "2-Side Tape Set",
            },
            {
              title: "Turrican II",
              publisher: "Rainbow Arts",
              year: 1991,
              sides: ["Turrican II.tap"],
              genre: "Action / Shooter",
              badge: "Turbo Master",
            },
          ].map((game, gIdx) => (
            <div
              key={gIdx}
              className="bg-[#0d1117] border border-[#30363d] hover:border-[#d29922] p-4 rounded-xl flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-1 mb-1.5">
                  <h4 className="font-bold text-white text-sm group-hover:text-[#d29922] transition-colors">
                    {game.title}
                  </h4>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#d29922]/20 text-[#d29922] border border-[#d29922]/30">
                    {game.badge}
                  </span>
                </div>
                <p className="text-[11px] text-[#8b949e]">
                  {game.publisher} ({game.year}) • {game.genre}
                </p>
                <div className="mt-2 text-[10px] text-[#58a6ff] font-mono">
                  {game.sides.length === 1 ? "1 Cassette" : `${game.sides.length} Cassettes in Set`}
                </div>
              </div>

              <button
                onClick={async () => {
                  try {
                    const loadedSides: { name: string; data: Uint8Array }[] = [];
                    for (const sideName of game.sides) {
                      const res = await fetch(`/api/roms?path=${encodeURIComponent(sideName)}`);
                      if (!res.ok) throw new Error(`HTTP ${res.status}`);
                      const buf = await res.arrayBuffer();
                      loadedSides.push({ name: sideName, data: new Uint8Array(buf) });
                    }
                    if (loadedSides.length > 0) {
                      system.mountTapeSet(loadedSides, true);
                      onSwitchToScreen();
                    }
                  } catch (err) {
                    console.error("Failed to load multi-tape game:", err);
                  }
                }}
                className="mt-3 w-full py-1.5 rounded-lg bg-[#238636] hover:bg-[#2ea043] active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Mount & Play Tape Set
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
