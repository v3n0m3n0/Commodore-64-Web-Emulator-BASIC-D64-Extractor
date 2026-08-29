/**
 * Cycle-Accurate Timing & Peripheral Analyzer for Commodore 64
 * ============================================================
 * Provides in-depth analysis of VIC-II raster synchronization, Bad Line DMA cycle theft,
 * CIA 1/2 countdown timers, and CPU interrupt dispatching for custom IRQ loaders and demos.
 */

import React, { useState } from "react";
import {
  Clock,
  Zap,
  Activity,
  Cpu,
  Layers,
  Sliders,
  AlertTriangle,
  Play,
  SkipForward,
  Info,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { C64System, SystemTelemetry } from "../c64/c64_system";
import { BUNDLED_SAMPLES } from "../c64/c64_bundled_samples";

interface C64TimingAnalyzerProps {
  system: C64System;
  telemetry: SystemTelemetry;
  onStepInstruction: () => void;
  onStepCycle: (cycles?: number) => void;
  onStepScanline: () => void;
  onStepFrame: () => void;
}

export const C64TimingAnalyzer: React.FC<C64TimingAnalyzerProps> = ({
  system,
  telemetry,
  onStepInstruction,
  onStepCycle,
  onStepScanline,
  onStepFrame,
}) => {
  const [optimizerNotice, setOptimizerNotice] = useState<string | null>(null);
  const currentLine = telemetry.rasterLine;
  const lineCycle = telemetry.lineCycle || 0;
  const cyclesPerLine = system.vic.cyclesPerLine;
  const totalLines = system.vic.totalRasterLines;

  // VIC-II Analysis
  const isBadLine = system.vic.isBadLine(currentLine);
  const rasterCompare = (system.vic.regs[0x12]) | ((system.vic.regs[0x11] & 0x80) ? 0x100 : 0);
  const rasterIrqEnabled = (system.vic.regs[0x1a] & 0x01) !== 0;
  const irqVector = system.memory.read(0x0314) | (system.memory.read(0x0315) << 8);
  const nmiVector = system.memory.read(0x0318) | (system.memory.read(0x0319) << 8);

  // 6510 Processor Port ($0001)
  const portVal = system.memory.ram[0x0001];
  const basicRom = (portVal & 0x01) && (portVal & 0x02);
  const kernalRom = (portVal & 0x02) !== 0;
  const ioMapped = (portVal & 0x04) !== 0;

  // CIA1 & CIA2 Timers
  const cia1TimerA = system.cia1.timerA;
  const cia1TimerB = system.cia1.timerB;
  const cia1RunningA = (system.cia1.cra & 0x01) !== 0;
  const cia1RunningB = (system.cia1.crb & 0x01) !== 0;

  // Keyboard Buffer Diagnostic ($00C6)
  const keyBufferCount = system.memory.ram[0x00C6];

  // Detect Polling vs IRQ
  const isCustomIrqActive = irqVector !== 0xEA31 && irqVector !== 0xFE47 && irqVector !== 0xFF48;

  // Step until next interrupt or raster compare
  const handleRunToNextInterrupt = () => {
    let steps = 0;
    const maxSteps = 20000;
    while (steps < maxSteps) {
      system.stepScanline();
      steps++;
      if (telemetry.irqActive || telemetry.nmiActive || system.vic.isIrqActive() || system.cia1.irqAsserted) {
        break;
      }
    }
  };

  const handleRunToNextRasterCompare = () => {
    let steps = 0;
    const maxSteps = totalLines + 10;
    while (steps < maxSteps) {
      system.stepScanline();
      steps++;
      if (system.vic.currentRaster === rasterCompare) {
        break;
      }
    }
  };

  // Quick Injectors for Optimizations
  const handleApplyDoubleIrq = () => {
    const sample = BUNDLED_SAMPLES.find((s) => s.id === "double-irq-raster-split");
    if (sample && sample.code) {
      system.runAssembly(sample.code);
      setOptimizerNotice("Applied Non-Blocking Double-IRQ architecture ($C000). CPU freed from polling loops.");
      setTimeout(() => setOptimizerNotice(null), 4000);
    }
  };

  const handleApplyStabilizer = () => {
    const sample = BUNDLED_SAMPLES.find((s) => s.id === "cycle-exact-raster-stabilizer");
    if (sample && sample.code) {
      system.runAssembly(sample.code);
      setOptimizerNotice("Applied Cycle-Exact Raster Stabilizer ($C000). Jitter eliminated on scanlines.");
      setTimeout(() => setOptimizerNotice(null), 4000);
    }
  };

  const handleFlushKeyBuffer = () => {
    system.memory.ram[0x00C6] = 0;
    setOptimizerNotice("Keyboard buffer ($00C6) flushed to 0.");
    setTimeout(() => setOptimizerNotice(null), 3000);
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#30363d] gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#8957e5]/20 border border-[#8957e5] flex items-center justify-center text-[#d2a8ff]">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">
              CYCLE-ACCURATE TIMING & PERIPHERAL ANALYZER
            </h3>
            <p className="text-xs text-[#8b949e]">
              Analyze VIC-II Bad Lines, CIA timers, and interrupt-driven loaders cycle by cycle
            </p>
          </div>
        </div>

        {/* Quick Stepping Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onStepCycle(1)}
            className="px-2.5 py-1.5 rounded bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-mono border border-[#30363d]"
            title="Step exactly 1 CPU clock cycle"
          >
            +1 Cycle
          </button>
          <button
            onClick={() => onStepCycle(8)}
            className="px-2.5 py-1.5 rounded bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-mono border border-[#30363d]"
            title="Step 8 CPU clock cycles"
          >
            +8 Cycles
          </button>
          <button
            onClick={onStepScanline}
            className="px-2.5 py-1.5 rounded bg-[#d29922] hover:bg-[#e3b341] text-black text-xs font-bold font-mono"
            title="Step 1 scanline (63/65 cycles)"
          >
            +1 Line
          </button>
          <button
            onClick={handleRunToNextRasterCompare}
            className="px-2.5 py-1.5 rounded bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-bold font-mono"
            title="Run until raster matches $D012 compare line"
          >
            To Raster ${rasterCompare.toString(16).toUpperCase()}
          </button>
          <button
            onClick={handleRunToNextInterrupt}
            className="px-2.5 py-1.5 rounded bg-[#8957e5] hover:bg-[#a371f7] text-white text-xs font-bold font-mono"
            title="Run until IRQ/NMI triggers"
          >
            To Next IRQ
          </button>
        </div>
      </div>

      {/* Visual Timing Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Scanline Cycle Progress */}
        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#8b949e] font-bold">SCANLINE CYCLE POSITION</span>
            <span className="text-[#bc8cff] font-bold">
              {lineCycle} / {cyclesPerLine} cycles ({((lineCycle / cyclesPerLine) * 100).toFixed(1)}%)
            </span>
          </div>
          <div className="w-full bg-[#21262d] rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-75 ${
                isBadLine ? "bg-[#f85149]" : "bg-[#bc8cff]"
              }`}
              style={{ width: `${Math.min(100, (lineCycle / cyclesPerLine) * 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-[#8b949e] font-mono">
            <span>Cycle 0 (Start Line / IRQ Eval)</span>
            <span>Cycle {cyclesPerLine} (Scanline End)</span>
          </div>
        </div>

        {/* Frame Raster Progress */}
        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#8b949e] font-bold">FRAME RASTER POSITION</span>
            <span className="text-[#58a6ff] font-bold">
              Line #{currentLine} / {totalLines} ({((currentLine / totalLines) * 100).toFixed(1)}%)
            </span>
          </div>
          <div className="w-full bg-[#21262d] rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-[#58a6ff] transition-all duration-75"
              style={{ width: `${Math.min(100, (currentLine / totalLines) * 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-[#8b949e] font-mono">
            <span>Line 0 (Top VBlank)</span>
            <span>Line 51-250 (Active Window)</span>
            <span>Line {totalLines}</span>
          </div>
        </div>
      </div>

      {/* 3-Column Peripheral Status & Interrupt Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 font-mono text-xs">
        {/* VIC-II Timing & Raster Interrupts */}
        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#30363d]">
            <span className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#58a6ff]" /> VIC-II RASTER TIMING
            </span>
            <span className="text-[10px] bg-[#1f6feb]/20 text-[#58a6ff] px-1.5 py-0.5 rounded">
              {system.vic.videoStandard === 0 ? "PAL (50.1 Hz)" : "NTSC (59.8 Hz)"}
            </span>
          </div>

          <div className="flex flex-col gap-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-[#8b949e]">Current Raster Line:</span>
              <span className="text-white font-bold">#{currentLine} (${currentLine.toString(16).toUpperCase()})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8b949e]">Target Raster Compare:</span>
              <span className="text-[#d29922] font-bold">#{rasterCompare} (${rasterCompare.toString(16).toUpperCase()})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8b949e]">Raster IRQ Enabled:</span>
              <span className={rasterIrqEnabled ? "text-[#7ee787] font-bold" : "text-[#8b949e]"}>
                {rasterIrqEnabled ? "ENABLED ($D01A bit 0)" : "DISABLED"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8b949e]">Bad Line DMA Theft:</span>
              <span className={isBadLine ? "text-[#f85149] font-bold" : "text-[#7ee787]"}>
                {isBadLine ? "ACTIVE (40 CPU cycles stolen)" : "NO (Full 63 cycles)"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8b949e]">YSCROLL / XSCROLL:</span>
              <span className="text-white font-bold">
                Y: {system.vic.regs[0x11] & 0x07}, X: {system.vic.regs[0x16] & 0x07}
              </span>
            </div>
          </div>
        </div>

        {/* CIA Timers & Loading Routine Diagnostics */}
        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#30363d]">
            <span className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#bc8cff]" /> CIA 1/2 TIMERS & I/O
            </span>
            <span className="text-[10px] bg-[#8957e5]/20 text-[#bc8cff] px-1.5 py-0.5 rounded">
              CIA1 $DC00 / CIA2 $DD00
            </span>
          </div>

          <div className="flex flex-col gap-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-[#8b949e]">CIA1 Timer A (Jiffy/IRQ):</span>
              <span className="text-white font-bold">
                ${cia1TimerA.toString(16).padStart(4, "0").toUpperCase()} {cia1RunningA ? "(RUNNING)" : "(STOPPED)"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8b949e]">CIA1 Timer B:</span>
              <span className="text-white font-bold">
                ${cia1TimerB.toString(16).padStart(4, "0").toUpperCase()} {cia1RunningB ? "(RUNNING)" : "(STOPPED)"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8b949e]">CIA1 ICR / IMR ($DC0D):</span>
              <span className="text-white font-bold">
                ICR: ${system.cia1.icr.toString(16).padStart(2, "0").toUpperCase()} | IMR: ${system.cia1.imr.toString(16).padStart(2, "0").toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8b949e]">CIA2 VIC Bank Select:</span>
              <span className="text-[#7ee787] font-bold">
                Bank #{telemetry.vicBank} (${(telemetry.vicBank * 0x4000).toString(16).toUpperCase()})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8b949e]">CIA2 NMI Vector ($0318):</span>
              <span className="text-[#bc8cff] font-bold">${nmiVector.toString(16).padStart(4, "0").toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* 6510 Processor Port & Interrupt Vectors */}
        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#30363d]">
            <span className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#7ee787]" /> 6510 CPU BUS & VECTORS
            </span>
            <span className="text-[10px] bg-[#238636]/20 text-[#7ee787] px-1.5 py-0.5 rounded">
              Port $0001 = ${portVal.toString(16).padStart(2, "0").toUpperCase()}
            </span>
          </div>

          <div className="flex flex-col gap-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-[#8b949e]">RAM IRQ Vector ($0314):</span>
              <span className="text-[#58a6ff] font-bold">${irqVector.toString(16).padStart(4, "0").toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8b949e]">Hardware IRQ ($FFFE):</span>
              <span className="text-white font-bold">
                ${(system.memory.read(0xfffe) | (system.memory.read(0xffff) << 8)).toString(16).padStart(4, "0").toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8b949e]">BASIC ROM ($A000):</span>
              <span className={basicRom ? "text-[#7ee787] font-bold" : "text-[#d29922]"}>
                {basicRom ? "MAPPED (ROM)" : "RAM / DISABLED"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8b949e]">KERNAL ROM ($E000):</span>
              <span className={kernalRom ? "text-[#7ee787] font-bold" : "text-[#d29922]"}>
                {kernalRom ? "MAPPED (ROM)" : "RAM / DISABLED"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8b949e]">I/O Space ($D000):</span>
              <span className={ioMapped ? "text-[#7ee787] font-bold" : "text-[#f85149]"}>
                {ioMapped ? "MAPPED (VIC/SID/CIA)" : "CHARSET ROM / RAM"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Optimizer Notification Banner */}
      {optimizerNotice && (
        <div className="bg-[#238636]/15 border border-[#238636] rounded-xl p-3.5 flex items-center gap-3 text-xs text-[#7ee787]">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="font-medium">{optimizerNotice}</span>
        </div>
      )}

      {/* Telemetry Diagnostics & Optimization Suite */}
      <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#7ee787]" />
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">
              TELEMETRY DIAGNOSTICS & SYSTEM OPTIMIZATION ADVISOR
            </h4>
          </div>
          <span className="text-[10px] text-[#8b949e] font-mono">
            MOS 6510 • VIC-II • SID • DUAL CIA
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Item 1: Raster Split Architecture */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Layers className="w-4 h-4 text-[#58a6ff]" />
                <span>1. Non-Blocking Double-IRQ</span>
              </div>
              <p className="text-[11px] text-[#8b949e] leading-relaxed">
                {rasterIrqEnabled
                  ? "VIC-II Hardware Raster IRQ is active ($D01A). CPU is freed to execute user code without busy-waiting."
                  : "VIC-II Raster IRQ is disabled. If your program polls $D012 with CMP/BNE, switch to Double-IRQ to recover ~80% CPU time."}
              </p>
            </div>
            <button
              onClick={handleApplyDoubleIrq}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-bold transition-all cursor-pointer shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Apply Double-IRQ ($C000)
            </button>
          </div>

          {/* Item 2: Cycle-Exact Jitter Stabilizer */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Zap className="w-4 h-4 text-[#d29922]" />
                <span>2. Cycle-Exact Jitter Fix</span>
              </div>
              <p className="text-[11px] text-[#8b949e] leading-relaxed">
                6510 interrupts have an inherent 1-7 cycle jitter. The 2-line latch stabilizer synchronizes CPU execution to Cycle 0 for rock-solid raster lines.
              </p>
            </div>
            <button
              onClick={handleApplyStabilizer}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-[#d29922] hover:bg-[#e3b341] text-black text-xs font-bold transition-all cursor-pointer shadow-md"
            >
              <Zap className="w-3.5 h-3.5 fill-black" />
              Apply Jitter Stabilizer ($C000)
            </button>
          </div>

          {/* Item 3: Keyboard & KERNAL Vectors */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Cpu className="w-4 h-4 text-[#bc8cff]" />
                <span>3. Keyboard & SCNKEY ($FF9F)</span>
              </div>
              <p className="text-[11px] text-[#8b949e] leading-relaxed">
                Buffer <span className="font-mono text-[#7ee787]">$00C6: {keyBufferCount} chars</span>.
                {keyBufferCount > 0
                  ? " Pending keys in buffer. Custom IRQ routines should exit via JMP $EA31 to scan matrix."
                  : " Keyboard matrix queue is optimal."}
              </p>
            </div>
            <button
              onClick={handleFlushKeyBuffer}
              disabled={keyBufferCount === 0}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-[#21262d] hover:bg-[#30363d] disabled:opacity-50 text-white text-xs font-semibold border border-[#30363d] transition-all cursor-pointer"
            >
              Flush Key Buffer ($00C6)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
