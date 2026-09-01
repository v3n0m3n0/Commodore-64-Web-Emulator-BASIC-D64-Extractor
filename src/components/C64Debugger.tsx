/**
 * 6502 / 6510 Machine Code Debugger & Hex Memory Inspector
 * Provides live CPU register display, single-step execution, real-time disassembler
 * with KERNAL symbol resolution, and 64KB RAM/ROM hex memory editor.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  SkipForward,
  RotateCcw,
  Search,
  Cpu,
  Layers,
  Terminal,
  Hash,
  Compass,
  Eye,
  LayoutGrid,
  Clock,
  Zap,
  Activity,
  Gauge,
  Sliders,
  Download,
  CheckCircle2,
  FileDown,
  Save,
  Upload,
  Share2,
  FileUp,
  FileCheck,
  AlertCircle,
  X,
  CircleDot,
  Circle,
  CornerDownRight,
  CornerUpLeft,
  ArrowLeft,
  Edit2,
  Check,
  Plus,
  Trash2,
} from "lucide-react";
import { C64System, SystemTelemetry } from "../c64/c64_system";
import { C64Disassembler, DisassembledInstruction } from "../c64/c64_disassembler";
import { C64MemoryWatcher } from "./C64MemoryWatcher";
import { C64TimingAnalyzer } from "./C64TimingAnalyzer";

interface C64DebuggerProps {
  system: C64System;
  telemetry: SystemTelemetry;
  targetAddress?: number;
}

export type DebuggerViewMode = "all" | "timing" | "watcher" | "disasm" | "hex";

export const C64Debugger: React.FC<C64DebuggerProps> = ({ system, telemetry, targetAddress }) => {
  const [viewMode, setViewMode] = useState<DebuggerViewMode>("all");
  const [disasmAddr, setDisasmAddr] = useState<number>(targetAddress || system.cpu.pc);
  const [disasmList, setDisasmList] = useState<DisassembledInstruction[]>([]);
  const [disasmHistory, setDisasmHistory] = useState<number[]>([]);
  const [hexStartAddr, setHexStartAddr] = useState<number>(0x0400); // Screen RAM default
  const [hexSearchInput, setHexSearchInput] = useState<string>("0400");
  const [disasmSearchInput, setDisasmSearchInput] = useState<string>(
    system.cpu.pc.toString(16).toUpperCase()
  );
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [showSnapshotModal, setShowSnapshotModal] = useState<boolean>(false);
  const [showBreakpointsModal, setShowBreakpointsModal] = useState<boolean>(false);
  const [newBreakpointInput, setNewBreakpointInput] = useState<string>("");
  const [breakpointsList, setBreakpointsList] = useState<number[]>(Array.from(system.breakpoints));
  const [snapshotDescription, setSnapshotDescription] = useState<string>("");
  const [snapshotFeedback, setSnapshotFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Editable CPU Register state
  const [editingReg, setEditingReg] = useState<"PC" | "A" | "X" | "Y" | "SP" | null>(null);
  const [editRegValue, setEditRegValue] = useState<string>("");

  // Editable Hex byte state
  const [editingHexAddr, setEditingHexAddr] = useState<number | null>(null);
  const [editHexValue, setEditHexValue] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync breakpoint hit callback
  useEffect(() => {
    system.onBreakpointHit = (hitPC) => {
      setDisasmAddr(hitPC);
      setDisasmSearchInput(hitPC.toString(16).toUpperCase());
      setSnapshotFeedback({
        type: "success",
        message: `🔴 BREAKPOINT HIT at PC=$${hitPC.toString(16).padStart(4, "0").toUpperCase()}`,
      });
      setTimeout(() => setSnapshotFeedback(null), 6000);
    };
    return () => {
      system.onBreakpointHit = undefined;
    };
  }, [system]);

  // Update disassembly on CPU tick or address change
  useEffect(() => {
    const list = C64Disassembler.disassembleRange(system.memory, disasmAddr, 20);
    setDisasmList(list);
  }, [system, disasmAddr, telemetry.pc]);

  // Sync with targetAddress prop if updated externally
  useEffect(() => {
    if (targetAddress !== undefined) {
      setDisasmAddr(targetAddress);
      setDisasmSearchInput(targetAddress.toString(16).toUpperCase());
    }
  }, [targetAddress]);

  // Toggle breakpoint on an address
  const handleToggleBreakpoint = (addr: number) => {
    system.toggleBreakpoint(addr);
    setBreakpointsList(Array.from(system.breakpoints));
  };

  const handleAddBreakpointFromInput = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(newBreakpointInput.replace(/[$#]/g, ""), 16);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 0xffff) {
      system.addBreakpoint(parsed);
      setBreakpointsList(Array.from(system.breakpoints));
      setNewBreakpointInput("");
    }
  };

  const handleClearAllBreakpoints = () => {
    system.clearBreakpoints();
    setBreakpointsList([]);
  };

  // Step single instruction
  const handleStepInstruction = () => {
    system.stepInstruction();
    setDisasmAddr(system.cpu.pc);
  };

  // Step Over (JSR skip)
  const handleStepOver = () => {
    system.stepOver();
    setDisasmAddr(system.cpu.pc);
  };

  // Step Out (RTS / RTI skip)
  const handleStepOut = () => {
    system.stepOut();
    setDisasmAddr(system.cpu.pc);
  };

  // Step single cycle
  const handleStepCycle = (cycles: number = 1) => {
    system.stepCycles(cycles);
    setDisasmAddr(system.cpu.pc);
  };

  // Step single scanline
  const handleStepScanline = () => {
    system.stepScanline();
    setDisasmAddr(system.cpu.pc);
  };

  // Step 1 frame
  const handleStepFrame = () => {
    system.stepFrame();
    setDisasmAddr(system.cpu.pc);
  };

  // Jump Disassembler to PC
  const handleJumpToPC = () => {
    setDisasmAddr(system.cpu.pc);
    setDisasmSearchInput(system.cpu.pc.toString(16).toUpperCase());
  };

  // Follow subroutine address in Disassembler
  const handleFollowAddress = (target: number) => {
    setDisasmHistory((prev) => [...prev, disasmAddr]);
    setDisasmAddr(target);
    setDisasmSearchInput(target.toString(16).toUpperCase());
  };

  // Navigate back in Disassembler history
  const handleNavBack = () => {
    if (disasmHistory.length > 0) {
      const prevAddr = disasmHistory[disasmHistory.length - 1];
      setDisasmHistory((prev) => prev.slice(0, prev.length - 1));
      setDisasmAddr(prevAddr);
      setDisasmSearchInput(prevAddr.toString(16).toUpperCase());
    }
  };

  // Commit edited CPU Register
  const handleCommitRegisterEdit = () => {
    if (!editingReg) return;
    const parsed = parseInt(editRegValue.replace(/[$#]/g, ""), 16);
    if (!isNaN(parsed)) {
      if (editingReg === "PC") system.cpu.pc = parsed & 0xffff;
      if (editingReg === "A") system.cpu.a = parsed & 0xff;
      if (editingReg === "X") system.cpu.x = parsed & 0xff;
      if (editingReg === "Y") system.cpu.y = parsed & 0xff;
      if (editingReg === "SP") system.cpu.sp = parsed & 0xff;
    }
    setEditingReg(null);
    setEditRegValue("");
  };

  // Commit edited Hex byte
  const handleCommitHexEdit = (addr: number) => {
    const parsed = parseInt(editHexValue.replace(/[$#]/g, ""), 16);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 0xff) {
      system.memory.write(addr, parsed);
    }
    setEditingHexAddr(null);
    setEditHexValue("");
  };

  // Export comprehensive system telemetry snapshot to local JSON file
  const handleExportDebugLogs = () => {
    const currentLine = system.vic.currentRaster;
    const lineCycle = telemetry.lineCycle ?? system.lineCycles ?? 0;
    const isBadLine = typeof system.vic.isBadLine === "function" ? system.vic.isBadLine(currentLine) : false;
    const d011 = system.vic.regs[0x11];
    const d012 = system.vic.regs[0x12];
    const rasterCompare = d012 | ((d011 & 0x80) ? 0x100 : 0);

    // Capture Zero Page ($0000 - $00FF)
    const zeroPageHex: Record<string, string> = {};
    for (let i = 0; i < 256; i += 16) {
      const rowKey = `$00${i.toString(16).padStart(2, "0").toUpperCase()}`;
      const rowBytes: string[] = [];
      for (let j = 0; j < 16; j++) {
        rowBytes.push(system.memory.read(i + j).toString(16).padStart(2, "0").toUpperCase());
      }
      zeroPageHex[rowKey] = rowBytes.join(" ");
    }

    // Capture Stack ($0100 - $01FF)
    const stackHex: Record<string, string> = {};
    for (let i = 0x0100; i <= 0x01ff; i += 16) {
      const rowKey = `$${i.toString(16).padStart(4, "0").toUpperCase()}`;
      const rowBytes: string[] = [];
      for (let j = 0; j < 16; j++) {
        rowBytes.push(system.memory.read(i + j).toString(16).padStart(2, "0").toUpperCase());
      }
      stackHex[rowKey] = rowBytes.join(" ");
    }

    // Capture Disassembly around current PC
    const disasmWindow = C64Disassembler.disassembleRange(
      system.memory,
      Math.max(0, system.cpu.pc - 24),
      32
    ).map((inst) => ({
      address: `$${inst.address.toString(16).padStart(4, "0").toUpperCase()}`,
      isCurrentPC: inst.address === system.cpu.pc,
      mnemonic: inst.mnemonic,
      bytes: inst.bytes.map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join(" "),
      symbol: inst.symbol || null,
    }));

    // Timing anomalies & health diagnostics
    const anomalies: string[] = [];
    if (isBadLine && lineCycle >= 12 && lineCycle <= 54) {
      anomalies.push("CRITICAL: CPU executing during Bad Line DMA cycle theft window (Cycles 12-54)");
    }
    if ((system.vic.regs[0x1a] & 0x01) && !(system.vic.regs[0x19] & 0x01) && currentLine === rasterCompare) {
      anomalies.push("Raster compare match reached but IRQ ACK pending in $D019");
    }
    if (system.cpu.p_i && telemetry.irqActive) {
      anomalies.push("Interrupt Line IRQ is ACTIVE but CPU I-flag is set (Interrupts Masked)");
    }
    if (system.cia1.timerALatch === 0 || system.cia1.timerBLatch === 0) {
      anomalies.push("CIA 1 Timer Latch set to 0 (potential infinite IRQ flood)");
    }

    const debugSnapshot = {
      timestamp: new Date().toISOString(),
      reportType: "COMMODORE_64_SYSTEM_TELEMETRY_SNAPSHOT",
      hardwareProfile: {
        machine: "Commodore 64 (MOS 6510 / VIC-II / SID / Dual CIA)",
        tvStandard: system.vic.standard,
        clockFrequencyHz: system.vic.standard === "NTSC" ? 1022727 : 985248,
        totalRasterLines: system.vic.totalRasterLines,
        cyclesPerLine: system.vic.cyclesPerLine,
        totalCyclesPerFrame: system.vic.totalRasterLines * system.vic.cyclesPerLine,
      },
      systemRuntime: {
        totalCycles: telemetry.totalCycles,
        approxFramesElapsed: (
          telemetry.totalCycles /
          (system.vic.totalRasterLines * system.vic.cyclesPerLine)
        ).toFixed(2),
        isRunning: system.isRunning,
        isPaused: system.isPaused,
        isMuted: system.isMuted,
      },
      cpu: {
        pc: `$${system.cpu.pc.toString(16).padStart(4, "0").toUpperCase()}`,
        pcDecimal: system.cpu.pc,
        a: `$${system.cpu.a.toString(16).padStart(2, "0").toUpperCase()}`,
        aDecimal: system.cpu.a,
        x: `$${system.cpu.x.toString(16).padStart(2, "0").toUpperCase()}`,
        xDecimal: system.cpu.x,
        y: `$${system.cpu.y.toString(16).padStart(2, "0").toUpperCase()}`,
        yDecimal: system.cpu.y,
        sp: `$01${system.cpu.sp.toString(16).padStart(2, "0").toUpperCase()}`,
        flagsRegister: system.cpu.getFlagsString(),
        flags: {
          N_negative: system.cpu.p_n ? 1 : 0,
          V_overflow: system.cpu.p_v ? 1 : 0,
          B_break: system.cpu.p_b ? 1 : 0,
          D_decimal: system.cpu.p_d ? 1 : 0,
          I_interruptDisable: system.cpu.p_i ? 1 : 0,
          Z_zero: system.cpu.p_z ? 1 : 0,
          C_carry: system.cpu.p_c ? 1 : 0,
        },
        processorPort: {
          ddr0000: `$${system.memory.read(0x0000).toString(16).padStart(2, "0").toUpperCase()}`,
          port0001: `$${system.memory.read(0x0001).toString(16).padStart(2, "0").toUpperCase()}`,
          loram: (system.memory.read(0x0001) & 0x01) !== 0,
          hiram: (system.memory.read(0x0001) & 0x02) !== 0,
          charen: (system.memory.read(0x0001) & 0x04) !== 0,
          activeBankingDescription:
            (system.memory.read(0x0001) & 0x03) === 0x03
              ? "BASIC ROM + KERNAL ROM + I/O Active (Default $37)"
              : (system.memory.read(0x0001) & 0x03) === 0x02
              ? "KERNAL ROM + I/O Active, RAM at $A000-$BFFF ($36)"
              : (system.memory.read(0x0001) & 0x03) === 0x01
              ? "All RAM except Character ROM ($35)"
              : "Full 64KB RAM Banked In ($30)",
        },
      },
      vic2Timing: {
        rasterLine: currentLine,
        lineCycle: lineCycle,
        cycleBudgetRemaining: system.vic.cyclesPerLine - lineCycle,
        isBadLine: isBadLine,
        badLineCondition: `Raster line bits 0-2 = ${d011 & 0x07} (YSCROLL) and Line in [48..247] and DEN=1`,
        vBorderActive: system.vic.vBorder,
        mainBorderActive: system.vic.mainBorder,
        rasterCompareLine: rasterCompare,
        rasterIrqEnabled: (system.vic.regs[0x1a] & 0x01) !== 0,
        rasterIrqPending: (system.vic.regs[0x19] & 0x01) !== 0,
        vicBank: system.vic.vicBank,
        vicBankAddressBase: `$${(system.vic.vicBank * 0x4000).toString(16).padStart(4, "0").toUpperCase()}`,
        controlRegisters: {
          d011_control1: `$${d011.toString(16).padStart(2, "0").toUpperCase()}`,
          d012_rasterLineLo: `$${d012.toString(16).padStart(2, "0").toUpperCase()}`,
          d016_control2: `$${system.vic.regs[0x16].toString(16).padStart(2, "0").toUpperCase()}`,
          d018_memoryPointers: `$${system.vic.regs[0x18].toString(16).padStart(2, "0").toUpperCase()}`,
          d019_irqStatus: `$${system.vic.regs[0x19].toString(16).padStart(2, "0").toUpperCase()}`,
          d01a_irqMask: `$${system.vic.regs[0x1a].toString(16).padStart(2, "0").toUpperCase()}`,
          d020_borderColor: `$${system.vic.regs[0x20].toString(16).padStart(2, "0").toUpperCase()}`,
          d021_backgroundColor: `$${system.vic.regs[0x21].toString(16).padStart(2, "0").toUpperCase()}`,
          d015_spriteEnable: `$${system.vic.regs[0x15].toString(16).padStart(2, "0").toUpperCase()}`,
          d01c_spriteMulticolor: `$${system.vic.regs[0x1c].toString(16).padStart(2, "0").toUpperCase()}`,
        },
      },
      cia1: {
        timerA: system.cia1.timerA,
        timerALatch: system.cia1.timerALatch,
        timerB: system.cia1.timerB,
        timerBLatch: system.cia1.timerBLatch,
        cra: `$${system.cia1.cra.toString(16).padStart(2, "0").toUpperCase()}`,
        crb: `$${system.cia1.crb.toString(16).padStart(2, "0").toUpperCase()}`,
        icr: `$${system.cia1.icr.toString(16).padStart(2, "0").toUpperCase()}`,
        imr: `$${system.cia1.imr.toString(16).padStart(2, "0").toUpperCase()}`,
        sdr: `$${system.cia1.sdr.toString(16).padStart(2, "0").toUpperCase()}`,
        joy1: `$${system.cia1.joy1.toString(16).padStart(2, "0").toUpperCase()}`,
        joy2: `$${system.cia1.joy2.toString(16).padStart(2, "0").toUpperCase()}`,
      },
      cia2: {
        timerA: system.cia2.timerA,
        timerALatch: system.cia2.timerALatch,
        timerB: system.cia2.timerB,
        timerBLatch: system.cia2.timerBLatch,
        cra: `$${system.cia2.cra.toString(16).padStart(2, "0").toUpperCase()}`,
        crb: `$${system.cia2.crb.toString(16).padStart(2, "0").toUpperCase()}`,
        icr: `$${system.cia2.icr.toString(16).padStart(2, "0").toUpperCase()}`,
        imr: `$${system.cia2.imr.toString(16).padStart(2, "0").toUpperCase()}`,
        sdr: `$${system.cia2.sdr.toString(16).padStart(2, "0").toUpperCase()}`,
      },
      sidAudio: {
        chipModel: system.sid.chipModel,
        masterVolume: system.sid.regs[0x18] & 0x0f,
        filterCutoffRaw: ((system.sid.regs[0x16] << 3) | (system.sid.regs[0x15] & 0x07)) & 0x07ff,
        filterResonance: (system.sid.regs[0x17] >> 4) & 0x0f,
        filterPassModes: {
          lowpass: (system.sid.regs[0x18] & 0x10) !== 0,
          bandpass: (system.sid.regs[0x18] & 0x20) !== 0,
          highpass: (system.sid.regs[0x18] & 0x40) !== 0,
        },
        voices: system.sid.voices.map((v, idx) => ({
          voice: idx + 1,
          frequency: (v.freqHi << 8) | v.freqLo,
          pulseWidth: ((system.sid.regs[idx * 7 + 3] & 0x0f) << 8) | system.sid.regs[idx * 7 + 2],
          controlReg: `$${system.sid.regs[idx * 7 + 4].toString(16).padStart(2, "0").toUpperCase()}`,
          gate: v.gate,
          waveforms: {
            noise: v.noise,
            pulse: v.pulse,
            sawtooth: v.sawtooth,
            triangle: v.triangle,
          },
          adsr: {
            attack: v.attack,
            decay: v.decay,
            sustain: v.sustain,
            release: v.release,
          },
          envelopeState: v.envState,
        })),
      },
      vectorsAndPointers: {
        ramIrqVector0314: `$${(
          (system.memory.read(0x0315) << 8) |
          system.memory.read(0x0314)
        )
          .toString(16)
          .padStart(4, "0")
          .toUpperCase()}`,
        ramBrkVector0316: `$${(
          (system.memory.read(0x0317) << 8) |
          system.memory.read(0x0316)
        )
          .toString(16)
          .padStart(4, "0")
          .toUpperCase()}`,
        ramNmiVector0318: `$${(
          (system.memory.read(0x0319) << 8) |
          system.memory.read(0x0318)
        )
          .toString(16)
          .padStart(4, "0")
          .toUpperCase()}`,
        hardwareNmiVectorFFFA: `$${(
          (system.memory.read(0xfffb) << 8) |
          system.memory.read(0xfffa)
        )
          .toString(16)
          .padStart(4, "0")
          .toUpperCase()}`,
        hardwareResetVectorFFFC: `$${(
          (system.memory.read(0xfffd) << 8) |
          system.memory.read(0xfffc)
        )
          .toString(16)
          .padStart(4, "0")
          .toUpperCase()}`,
        hardwareIrqBrkVectorFFFE: `$${(
          (system.memory.read(0xffff) << 8) |
          system.memory.read(0xfffe)
        )
          .toString(16)
          .padStart(4, "0")
          .toUpperCase()}`,
        basicTxtTab002B: `$${(
          (system.memory.read(0x002c) << 8) |
          system.memory.read(0x002b)
        )
          .toString(16)
          .padStart(4, "0")
          .toUpperCase()}`,
        basicVarTab002D: `$${(
          (system.memory.read(0x002e) << 8) |
          system.memory.read(0x002d)
        )
          .toString(16)
          .padStart(4, "0")
          .toUpperCase()}`,
        basicMemSiz0037: `$${(
          (system.memory.read(0x0038) << 8) |
          system.memory.read(0x0037)
        )
          .toString(16)
          .padStart(4, "0")
          .toUpperCase()}`,
        keyboardBufferCount00C6: system.memory.read(0x00c6),
      },
      diagnosticsAndAnomalies: anomalies.length > 0 ? anomalies : ["No timing anomalies detected at current cycle."],
      disassemblyAroundPC: disasmWindow,
      zeroPageDump: zeroPageHex,
      stackDump: stackHex,
    };

    const jsonString = JSON.stringify(debugSnapshot, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = url;
    downloadAnchor.download = `c64-telemetry-snapshot-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(url);

    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 2500);
  };

  // Open Save Crash Snapshot modal
  const handleOpenSnapshotModal = () => {
    const lCycle = telemetry.lineCycle ?? system.lineCycles ?? 0;
    setSnapshotDescription(
      `Crash at PC=$${system.cpu.pc.toString(16).padStart(4, "0").toUpperCase()}, Raster #${system.vic.currentRaster}, LineCycle ${lCycle}`
    );
    setShowSnapshotModal(true);
  };

  // Save reproducible full crash snapshot to local JSON file
  const handleSaveCrashSnapshot = (desc?: string) => {
    const note =
      desc ||
      snapshotDescription ||
      `C64 Crash Snapshot at PC=$${system.cpu.pc.toString(16).padStart(4, "0").toUpperCase()}`;
    const snapshot = system.exportCrashSnapshot(note);
    const jsonString = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `c64-crash-snapshot-pc-${system.cpu.pc
      .toString(16)
      .padStart(4, "0")
      .toUpperCase()}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setShowSnapshotModal(false);
    setSnapshotFeedback({
      type: "success",
      message: `Full system state snapshot saved (PC=$${system.cpu.pc
        .toString(16)
        .padStart(4, "0")
        .toUpperCase()}, 64KB RAM + VIC-II + SID)!`,
    });
    setTimeout(() => setSnapshotFeedback(null), 5000);
  };

  // Load and restore reproducible crash snapshot from JSON file
  const handleLoadCrashSnapshotFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const success = system.importCrashSnapshot(parsed);
        if (success) {
          setDisasmAddr(system.cpu.pc);
          setDisasmSearchInput(system.cpu.pc.toString(16).toUpperCase());
          setHexStartAddr(system.cpu.pc & 0xfff0);
          setSnapshotFeedback({
            type: "success",
            message: `Snapshot restored: "${parsed.description || "State"}" (PC=$${system.cpu.pc
              .toString(16)
              .padStart(4, "0")
              .toUpperCase()}, Raster #${system.vic.currentRaster})`,
          });
        } else {
          setSnapshotFeedback({
            type: "error",
            message: "Failed to restore snapshot. Please verify that the file is a valid C64 snapshot JSON.",
          });
        }
      } catch (err: any) {
        setSnapshotFeedback({
          type: "error",
          message: `Error parsing snapshot JSON: ${err?.message || "Invalid file format"}`,
        });
      }
      setTimeout(() => setSnapshotFeedback(null), 6000);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Seek Hex viewer
  const handleHexSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(hexSearchInput, 16);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 0xffff) {
      setHexStartAddr(parsed & 0xfff0);
    }
  };

  // Seek Disassembler
  const handleDisasmSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(disasmSearchInput, 16);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 0xffff) {
      setDisasmAddr(parsed);
    }
  };

  // Generate 16-byte rows for Hex Editor
  const renderHexRows = () => {
    const rows = [];
    for (let r = 0; r < 12; r++) {
      const rowAddr = (hexStartAddr + r * 16) & 0xffff;
      const bytes: number[] = [];
      let asciiStr = "";

      for (let b = 0; b < 16; b++) {
        const val = system.memory.read(rowAddr + b);
        bytes.push(val);
        asciiStr += val >= 0x20 && val <= 0x7e ? String.fromCharCode(val) : ".";
      }

      rows.push(
        <div key={rowAddr} className="flex items-center gap-2 py-0.5 hover:bg-[#21262d] px-2 rounded font-mono text-xs">
          <span className="text-[#58a6ff] w-14 font-bold select-none">
            ${rowAddr.toString(16).padStart(4, "0").toUpperCase()}
          </span>
          <div className="flex items-center gap-1 text-white">
            {bytes.slice(0, 8).map((byte, idx) => {
              const currentByteAddr = rowAddr + idx;
              const isEditing = editingHexAddr === currentByteAddr;
              return (
                <span
                  key={idx}
                  onClick={() => {
                    setEditingHexAddr(currentByteAddr);
                    setEditHexValue(byte.toString(16).padStart(2, "0").toUpperCase());
                  }}
                  className={`w-6 text-center cursor-pointer rounded px-0.5 transition-colors ${
                    isEditing
                      ? "bg-[#1f6feb] text-white font-bold ring-1 ring-[#58a6ff]"
                      : "hover:bg-[#30363d] hover:text-[#58a6ff]"
                  }`}
                  title={`$${currentByteAddr.toString(16).padStart(4, "0").toUpperCase()} = #${byte} ($${byte.toString(16).padStart(2, "0").toUpperCase()}) - Click to Edit`}
                >
                  {isEditing ? (
                    <input
                      type="text"
                      autoFocus
                      value={editHexValue}
                      onChange={(e) => setEditHexValue(e.target.value)}
                      onBlur={() => handleCommitHexEdit(currentByteAddr)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCommitHexEdit(currentByteAddr);
                        if (e.key === "Escape") setEditingHexAddr(null);
                      }}
                      className="w-5 bg-black text-center text-white outline-none text-xs"
                      maxLength={2}
                    />
                  ) : (
                    byte.toString(16).padStart(2, "0").toUpperCase()
                  )}
                </span>
              );
            })}
            <span className="text-[#484f58] mx-0.5 select-none">|</span>
            {bytes.slice(8, 16).map((byte, idx) => {
              const currentByteAddr = rowAddr + 8 + idx;
              const isEditing = editingHexAddr === currentByteAddr;
              return (
                <span
                  key={idx + 8}
                  onClick={() => {
                    setEditingHexAddr(currentByteAddr);
                    setEditHexValue(byte.toString(16).padStart(2, "0").toUpperCase());
                  }}
                  className={`w-6 text-center cursor-pointer rounded px-0.5 transition-colors ${
                    isEditing
                      ? "bg-[#1f6feb] text-white font-bold ring-1 ring-[#58a6ff]"
                      : "hover:bg-[#30363d] hover:text-[#58a6ff]"
                  }`}
                  title={`$${currentByteAddr.toString(16).padStart(4, "0").toUpperCase()} = #${byte} ($${byte.toString(16).padStart(2, "0").toUpperCase()}) - Click to Edit`}
                >
                  {isEditing ? (
                    <input
                      type="text"
                      autoFocus
                      value={editHexValue}
                      onChange={(e) => setEditHexValue(e.target.value)}
                      onBlur={() => handleCommitHexEdit(currentByteAddr)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCommitHexEdit(currentByteAddr);
                        if (e.key === "Escape") setEditingHexAddr(null);
                      }}
                      className="w-5 bg-black text-center text-white outline-none text-xs"
                      maxLength={2}
                    />
                  ) : (
                    byte.toString(16).padStart(2, "0").toUpperCase()
                  )}
                </span>
              );
            })}
          </div>
          <span className="text-[#7ee787] ml-2 tracking-widest select-none">{asciiStr}</span>
        </div>
      );
    }
    return rows;
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 flex flex-col gap-6">
      {/* Top CPU Registers Banner */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1f6feb]/20 border border-[#1f6feb] flex items-center justify-center text-[#58a6ff]">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              MOS 6510 / 6502 CPU REGISTERS
            </h2>
            <p className="text-xs text-[#8b949e]">Cycle-accurate instruction execution, live registers & breakpoints</p>
          </div>
        </div>

        {/* Live Register Badges (Clickable / Editable) */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {/* PC */}
          <div
            onClick={() => {
              if (editingReg !== "PC") {
                setEditingReg("PC");
                setEditRegValue(system.cpu.pc.toString(16).toUpperCase());
              }
            }}
            className="bg-[#0d1117] border border-[#30363d] px-3 py-1.5 rounded-lg cursor-pointer hover:border-[#bc8cff] transition-all"
            title="Program Counter (Click to edit)"
          >
            <span className="text-[#8b949e]">PC: </span>
            {editingReg === "PC" ? (
              <input
                type="text"
                autoFocus
                value={editRegValue}
                onChange={(e) => setEditRegValue(e.target.value)}
                onBlur={handleCommitRegisterEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCommitRegisterEdit();
                  if (e.key === "Escape") setEditingReg(null);
                }}
                className="w-16 bg-black text-[#bc8cff] font-bold outline-none px-1 rounded"
              />
            ) : (
              <span className="text-[#bc8cff] font-bold">
                ${system.cpu.pc.toString(16).padStart(4, "0").toUpperCase()}
              </span>
            )}
          </div>

          {/* A */}
          <div
            onClick={() => {
              if (editingReg !== "A") {
                setEditingReg("A");
                setEditRegValue(system.cpu.a.toString(16).toUpperCase());
              }
            }}
            className="bg-[#0d1117] border border-[#30363d] px-3 py-1.5 rounded-lg cursor-pointer hover:border-white transition-all"
            title="Accumulator (Click to edit)"
          >
            <span className="text-[#8b949e]">A: </span>
            {editingReg === "A" ? (
              <input
                type="text"
                autoFocus
                value={editRegValue}
                onChange={(e) => setEditRegValue(e.target.value)}
                onBlur={handleCommitRegisterEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCommitRegisterEdit();
                  if (e.key === "Escape") setEditingReg(null);
                }}
                className="w-10 bg-black text-white font-bold outline-none px-1 rounded"
              />
            ) : (
              <span className="text-white font-bold">
                ${system.cpu.a.toString(16).padStart(2, "0").toUpperCase()} ({system.cpu.a})
              </span>
            )}
          </div>

          {/* X */}
          <div
            onClick={() => {
              if (editingReg !== "X") {
                setEditingReg("X");
                setEditRegValue(system.cpu.x.toString(16).toUpperCase());
              }
            }}
            className="bg-[#0d1117] border border-[#30363d] px-3 py-1.5 rounded-lg cursor-pointer hover:border-white transition-all"
            title="X Index Register (Click to edit)"
          >
            <span className="text-[#8b949e]">X: </span>
            {editingReg === "X" ? (
              <input
                type="text"
                autoFocus
                value={editRegValue}
                onChange={(e) => setEditRegValue(e.target.value)}
                onBlur={handleCommitRegisterEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCommitRegisterEdit();
                  if (e.key === "Escape") setEditingReg(null);
                }}
                className="w-10 bg-black text-white font-bold outline-none px-1 rounded"
              />
            ) : (
              <span className="text-white font-bold">
                ${system.cpu.x.toString(16).padStart(2, "0").toUpperCase()} ({system.cpu.x})
              </span>
            )}
          </div>

          {/* Y */}
          <div
            onClick={() => {
              if (editingReg !== "Y") {
                setEditingReg("Y");
                setEditRegValue(system.cpu.y.toString(16).toUpperCase());
              }
            }}
            className="bg-[#0d1117] border border-[#30363d] px-3 py-1.5 rounded-lg cursor-pointer hover:border-white transition-all"
            title="Y Index Register (Click to edit)"
          >
            <span className="text-[#8b949e]">Y: </span>
            {editingReg === "Y" ? (
              <input
                type="text"
                autoFocus
                value={editRegValue}
                onChange={(e) => setEditRegValue(e.target.value)}
                onBlur={handleCommitRegisterEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCommitRegisterEdit();
                  if (e.key === "Escape") setEditingReg(null);
                }}
                className="w-10 bg-black text-white font-bold outline-none px-1 rounded"
              />
            ) : (
              <span className="text-white font-bold">
                ${system.cpu.y.toString(16).padStart(2, "0").toUpperCase()} ({system.cpu.y})
              </span>
            )}
          </div>

          {/* SP */}
          <div
            onClick={() => {
              if (editingReg !== "SP") {
                setEditingReg("SP");
                setEditRegValue(system.cpu.sp.toString(16).toUpperCase());
              }
            }}
            className="bg-[#0d1117] border border-[#30363d] px-3 py-1.5 rounded-lg cursor-pointer hover:border-[#d29922] transition-all"
            title="Stack Pointer (Click to edit)"
          >
            <span className="text-[#8b949e]">SP: </span>
            {editingReg === "SP" ? (
              <input
                type="text"
                autoFocus
                value={editRegValue}
                onChange={(e) => setEditRegValue(e.target.value)}
                onBlur={handleCommitRegisterEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCommitRegisterEdit();
                  if (e.key === "Escape") setEditingReg(null);
                }}
                className="w-10 bg-black text-[#d29922] font-bold outline-none px-1 rounded"
              />
            ) : (
              <span className="text-[#d29922] font-bold">
                $01{system.cpu.sp.toString(16).padStart(2, "0").toUpperCase()}
              </span>
            )}
          </div>

          {/* Flags */}
          <div className="bg-[#0d1117] border border-[#30363d] px-3 py-1.5 rounded-lg" title="Processor Status Flags: Negative, Overflow, Break, Decimal, Interrupt, Zero, Carry">
            <span className="text-[#8b949e]">FLAGS [NV-BDIZC]: </span>
            <span className="text-[#7ee787] font-bold">{system.cpu.getFlagsString()}</span>
          </div>
        </div>

        {/* Execution & Stepping Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={handleStepInstruction}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
            title="Step Single 6502 Instruction (Step Into)"
          >
            <SkipForward className="w-3.5 h-3.5" />
            Step Inst
          </button>

          <button
            onClick={handleStepOver}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#0969da] hover:bg-[#218bff] text-white text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
            title="Step Over Subroutine (JSR skip)"
          >
            <CornerDownRight className="w-3.5 h-3.5" />
            Step Over
          </button>

          <button
            onClick={handleStepOut}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#13233a] hover:bg-[#1f3a5f] text-[#58a6ff] border border-[#1f6feb]/50 text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
            title="Step Out of Current Subroutine (Execute until RTS/RTI)"
          >
            <CornerUpLeft className="w-3.5 h-3.5" />
            Step Out
          </button>

          <button
            onClick={() => handleStepCycle(1)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#8957e5] hover:bg-[#a371f7] text-white text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
            title="Execute exactly 1 clock cycle"
          >
            <Clock className="w-3.5 h-3.5" />
            1 Cyc
          </button>

          <button
            onClick={() => handleStepCycle(8)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#6e40c9] hover:bg-[#8957e5] text-white text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
            title="Execute 8 clock cycles"
          >
            <Zap className="w-3.5 h-3.5" />
            8 Cyc
          </button>

          <button
            onClick={handleStepScanline}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#d29922] hover:bg-[#e3b341] text-black text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
            title="Step 1 Video Scanline (63 cycles PAL / 65 NTSC)"
          >
            <Sliders className="w-3.5 h-3.5" />
            Line
          </button>

          <button
            onClick={handleStepFrame}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
            title="Step Full Video Frame (312 Lines PAL / 263 NTSC)"
          >
            <Play className="w-3.5 h-3.5" />
            Frame
          </button>

          <button
            onClick={handleJumpToPC}
            className="px-2 py-1.5 rounded bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-mono border border-[#30363d] cursor-pointer"
            title="Jump Disassembler to Current PC"
          >
            PC
          </button>

          {/* Breakpoints Toggle Button */}
          <button
            onClick={() => setShowBreakpointsModal(true)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-mono font-bold border transition-all cursor-pointer ${
              breakpointsList.length > 0
                ? "bg-[#f85149]/20 text-[#ff7b72] border-[#f85149]/60 shadow-[0_0_10px_rgba(248,81,73,0.3)]"
                : "bg-[#21262d] text-[#8b949e] hover:text-white border-[#30363d]"
            }`}
            title="Manage Hardware Breakpoints"
          >
            <CircleDot className="w-3.5 h-3.5 text-[#f85149]" />
            <span>BREAKPOINTS ({breakpointsList.length})</span>
          </button>

          {/* Hidden File Input for Loading Crash Snapshot JSON */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleLoadCrashSnapshotFile}
            className="hidden"
          />

          {/* Save Full System Crash Snapshot Button */}
          <button
            id="btn-save-crash-snapshot"
            onClick={handleOpenSnapshotModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all border cursor-pointer bg-gradient-to-r from-[#1f6feb] to-[#388bfd] hover:from-[#388bfd] hover:to-[#58a6ff] text-white border-[#58a6ff]/50 shadow-md active:scale-95"
            title="Save full system state (64KB RAM, CPU, VIC-II, SID, CIAs) to JSON file for sharing reproducible crash snapshots"
          >
            <Save className="w-3.5 h-3.5 text-white" />
            <span>SAVE SNAPSHOT</span>
          </button>

          {/* Restore Full System Crash Snapshot Button */}
          <button
            id="btn-restore-crash-snapshot"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all border cursor-pointer bg-[#21262d] hover:bg-[#30363d] text-[#58a6ff] hover:text-white border-[#30363d] shadow-sm active:scale-95"
            title="Load and restore a reproducible crash snapshot (.json)"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>LOAD SNAPSHOT</span>
          </button>

          {/* Export Debug Logs (Telemetry Analysis) */}
          <button
            id="btn-export-debug-logs"
            onClick={handleExportDebugLogs}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all border cursor-pointer ${
              exportSuccess
                ? "bg-[#238636] text-white border-[#3fb950] shadow-[0_0_12px_rgba(63,185,80,0.6)]"
                : "bg-[#21262d] hover:bg-[#30363d] text-[#7ee787] hover:text-white border-[#30363d] shadow-sm active:scale-95"
            }`}
            title="Export complete system telemetry & timing logs snapshot to JSON for offline deep analysis"
          >
            {exportSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                <span>SAVED!</span>
              </>
            ) : (
              <>
                <FileDown className="w-3.5 h-3.5" />
                <span>EXPORT LOGS</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Snapshot Notification Feedback Banner */}
      {snapshotFeedback && (
        <div
          className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-mono shadow-lg transition-all animate-in fade-in slide-in-from-top-2 duration-200 ${
            snapshotFeedback.type === "success"
              ? "bg-[#238636]/20 border-[#3fb950]/60 text-[#7ee787]"
              : "bg-[#f85149]/20 border-[#f85149]/60 text-[#ff7b72]"
          }`}
        >
          <div className="flex items-center gap-2">
            {snapshotFeedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-[#3fb950] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#f85149] shrink-0" />
            )}
            <span>{snapshotFeedback.message}</span>
          </div>
          <button
            onClick={() => setSnapshotFeedback(null)}
            className="p-1 text-[#8b949e] hover:text-white rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Modal: Breakpoints Manager */}
      {showBreakpointsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4 text-white font-sans">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#f85149]/20 text-[#ff7b72] flex items-center justify-center border border-[#f85149]/30">
                  <CircleDot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Execution Breakpoints</h3>
                  <p className="text-[11px] text-[#8b949e]">
                    Pause emulation when CPU reaches specified address
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBreakpointsModal(false)}
                className="p-1.5 rounded-lg text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Add Breakpoint Form */}
            <form onSubmit={handleAddBreakpointFromInput} className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#8b949e]">$</span>
              <input
                type="text"
                value={newBreakpointInput}
                onChange={(e) => setNewBreakpointInput(e.target.value)}
                placeholder="ADDR (e.g. 0801, E000, C000)"
                className="flex-1 bg-[#0d1117] border border-[#30363d] focus:border-[#58a6ff] rounded-lg px-3 py-1.5 text-xs font-mono text-white outline-none"
              />
              <button
                type="submit"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-mono font-bold cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </form>

            {/* Breakpoints List */}
            <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto font-mono text-xs bg-[#0d1117] p-2.5 rounded-xl border border-[#30363d]">
              {breakpointsList.length === 0 ? (
                <div className="text-center py-6 text-[#8b949e] text-xs">
                  No active breakpoints. Click on address numbers in the disassembler to toggle breakpoints.
                </div>
              ) : (
                breakpointsList.map((bpAddr) => {
                  const symbol = C64Disassembler.SYMBOLS[bpAddr];
                  return (
                    <div
                      key={bpAddr}
                      className="flex items-center justify-between py-1.5 px-3 rounded bg-[#161b22] border border-[#30363d] hover:border-[#f85149]/50"
                    >
                      <div className="flex items-center gap-2">
                        <CircleDot className="w-3.5 h-3.5 text-[#f85149]" />
                        <span className="text-white font-bold">
                          ${bpAddr.toString(16).padStart(4, "0").toUpperCase()}
                        </span>
                        {symbol && (
                          <span className="text-[10px] text-[#7ee787] bg-[#238636]/20 px-1.5 py-0.5 rounded">
                            {symbol}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setDisasmAddr(bpAddr);
                            setDisasmSearchInput(bpAddr.toString(16).toUpperCase());
                            setShowBreakpointsModal(false);
                          }}
                          className="px-2 py-0.5 rounded bg-[#21262d] hover:bg-[#30363d] text-[#58a6ff] text-[10px] cursor-pointer"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleToggleBreakpoint(bpAddr)}
                          className="p-1 rounded bg-[#21262d] hover:bg-[#f85149]/30 text-[#8b949e] hover:text-[#ff7b72] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-[#30363d]">
              {breakpointsList.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllBreakpoints}
                  className="text-xs text-[#ff7b72] hover:underline cursor-pointer"
                >
                  Clear All Breakpoints
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowBreakpointsModal(false)}
                className="ml-auto px-4 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Save Full System Crash Snapshot */}
      {showSnapshotModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl w-full max-w-lg p-6 flex flex-col gap-4 text-white font-sans">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#1f6feb]/20 text-[#58a6ff] flex items-center justify-center border border-[#1f6feb]/30">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Export Full Crash Snapshot</h3>
                  <p className="text-[11px] text-[#8b949e]">
                    Save complete 64KB RAM, CPU registers, VIC-II, SID, and CIA states
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSnapshotModal(false)}
                className="p-1.5 rounded-lg text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#c9d1d9] font-mono">
                Snapshot Description / Crash Notes:
              </label>
              <input
                type="text"
                value={snapshotDescription}
                onChange={(e) => setSnapshotDescription(e.target.value)}
                placeholder="e.g. Sprite multiplexer timing collision on raster #120"
                className="w-full bg-[#0d1117] border border-[#30363d] focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] rounded-lg px-3 py-2 text-xs font-mono text-white outline-none"
              />
            </div>

            {/* Telemetry Snapshot Preview */}
            <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3.5 flex flex-col gap-2 font-mono text-xs">
              <span className="text-[11px] font-bold text-[#8b949e] uppercase">Snapshot Preview:</span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-[#161b22] p-2 rounded border border-[#21262d]">
                  <span className="text-[#8b949e] block text-[10px]">CPU STATE</span>
                  <span className="text-[#bc8cff] font-bold">
                    PC: ${system.cpu.pc.toString(16).padStart(4, "0").toUpperCase()}
                  </span>
                  <span className="text-[#8b949e] block text-[9px] mt-0.5">
                    A:${system.cpu.a.toString(16).padStart(2, "0").toUpperCase()} X:${system.cpu.x.toString(16).padStart(2, "0").toUpperCase()} Y:${system.cpu.y.toString(16).padStart(2, "0").toUpperCase()} SP:${system.cpu.sp.toString(16).padStart(2, "0").toUpperCase()}
                  </span>
                </div>
                <div className="bg-[#161b22] p-2 rounded border border-[#21262d]">
                  <span className="text-[#8b949e] block text-[10px]">VIC-II RASTER</span>
                  <span className="text-[#58a6ff] font-bold">
                    Line: #{system.vic.currentRaster} ({system.vic.standard})
                  </span>
                  <span className="text-[#8b949e] block text-[9px] mt-0.5">
                    Cycle: {system.vic.lineCycle} / {system.vic.cyclesPerLine}
                  </span>
                </div>
                <div className="bg-[#161b22] p-2 rounded border border-[#21262d]">
                  <span className="text-[#8b949e] block text-[10px]">MEMORY PAYLOAD</span>
                  <span className="text-[#7ee787] font-bold">64KB RAM + 1KB Color</span>
                  <span className="text-[#8b949e] block text-[9px] mt-0.5">
                    Base64 Encoded (~86 KB JSON)
                  </span>
                </div>
                <div className="bg-[#161b22] p-2 rounded border border-[#21262d]">
                  <span className="text-[#8b949e] block text-[10px]">PERIPHERALS</span>
                  <span className="text-[#d2a8ff] font-bold">CIA 1/2 & SID 6581</span>
                  <span className="text-[#8b949e] block text-[9px] mt-0.5">
                    Full Register States Included
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#30363d]">
              <button
                type="button"
                onClick={() => setShowSnapshotModal(false)}
                className="px-4 py-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveCrashSnapshot()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-[#1f6feb] to-[#388bfd] hover:from-[#388bfd] hover:to-[#58a6ff] text-white text-xs font-bold font-mono transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>DOWNLOAD SNAPSHOT (.JSON)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cycle & Peripheral Timing Telemetry Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3 flex flex-col">
          <span className="text-[10px] text-[#8b949e] uppercase font-mono">RASTER SCANLINE</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-base font-bold font-mono text-[#58a6ff]">
              #{telemetry.rasterLine}
            </span>
            <span className="text-[10px] text-[#6e7681] font-mono">
              / {system.vic.totalRasterLines}
            </span>
          </div>
          <span className="text-[9px] text-[#8b949e] font-mono mt-0.5">
            Bad Line: {system.vic.isBadLine(telemetry.rasterLine) ? "YES (DMA)" : "NO"}
          </span>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3 flex flex-col">
          <span className="text-[10px] text-[#8b949e] uppercase font-mono">LINE CYCLE</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-base font-bold font-mono text-[#bc8cff]">
              {telemetry.lineCycle || 0}
            </span>
            <span className="text-[10px] text-[#6e7681] font-mono">
              / {system.vic.cyclesPerLine}
            </span>
          </div>
          <span className="text-[9px] text-[#8b949e] font-mono mt-0.5">
            Budget: {system.vic.cyclesPerLine - (telemetry.lineCycle || 0)} cyc
          </span>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3 flex flex-col">
          <span className="text-[10px] text-[#8b949e] uppercase font-mono">TOTAL CYCLES</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-base font-bold font-mono text-[#7ee787]">
              {(telemetry.totalCycles || 0).toLocaleString()}
            </span>
          </div>
          <span className="text-[9px] text-[#8b949e] font-mono mt-0.5">
            ~{((telemetry.totalCycles || 0) / (system.vic.totalRasterLines * system.vic.cyclesPerLine)).toFixed(1)} frames
          </span>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3 flex flex-col">
          <span className="text-[10px] text-[#8b949e] uppercase font-mono">CIA1 TIMER A / B</span>
          <div className="flex items-baseline gap-1 mt-1 font-mono text-xs">
            <span className="text-white font-bold">${(telemetry.cia1TimerA || 0).toString(16).padStart(4, "0").toUpperCase()}</span>
            <span className="text-[#6e7681]">/</span>
            <span className="text-white font-bold">${(telemetry.cia1TimerB || 0).toString(16).padStart(4, "0").toUpperCase()}</span>
          </div>
          <span className="text-[9px] text-[#8b949e] font-mono mt-0.5">
            ICR: ${(telemetry.cia1Icr || 0).toString(16).padStart(2, "0").toUpperCase()}
          </span>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3 flex flex-col">
          <span className="text-[10px] text-[#8b949e] uppercase font-mono">CIA2 TIMER A / B</span>
          <div className="flex items-baseline gap-1 mt-1 font-mono text-xs">
            <span className="text-white font-bold">${(system.cia2.timerA || 0).toString(16).padStart(4, "0").toUpperCase()}</span>
            <span className="text-[#6e7681]">/</span>
            <span className="text-white font-bold">${(system.cia2.timerB || 0).toString(16).padStart(4, "0").toUpperCase()}</span>
          </div>
          <span className="text-[9px] text-[#8b949e] font-mono mt-0.5">
            VIC Bank: #{telemetry.vicBank}
          </span>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3 flex flex-col">
          <span className="text-[10px] text-[#8b949e] uppercase font-mono">INTERRUPT LINES</span>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[11px] font-bold font-mono px-1.5 py-0.5 rounded ${
              telemetry.irqActive ? "bg-[#f85149]/30 text-[#ff7b72] border border-[#f85149]" : "bg-[#21262d] text-[#8b949e]"
            }`}>
              IRQ: {telemetry.irqActive ? "ACTIVE" : "IDLE"}
            </span>
            <span className={`text-[11px] font-bold font-mono px-1.5 py-0.5 rounded ${
              telemetry.nmiActive ? "bg-[#d29922]/30 text-[#e3b341] border border-[#d29922]" : "bg-[#21262d] text-[#8b949e]"
            }`}>
              NMI: {telemetry.nmiActive ? "ACTIVE" : "IDLE"}
            </span>
          </div>
          <span className="text-[9px] text-[#8b949e] font-mono mt-0.5">
            Status: {system.cpu.p_i ? "I-Flag Set (Masked)" : "Enabled"}
          </span>
        </div>
      </div>

      {/* Debugger Sub-View Switcher */}
      <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "all", label: "STUDIO VIEW (ALL)", icon: LayoutGrid },
            { id: "timing", label: "CYCLE TIMING & PERIPHERALS", icon: Clock, badge: "ACCURATE" },
            { id: "watcher", label: "MEMORY WATCHER", icon: Eye, badge: "LIVE" },
            { id: "disasm", label: "6502 DISASSEMBLER", icon: Terminal },
            { id: "hex", label: "64KB HEX INSPECTOR", icon: Hash },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = viewMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id as DebuggerViewMode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#1f6feb] text-white shadow-sm"
                    : "bg-[#161b22] text-[#8b949e] hover:text-white hover:bg-[#21262d] border border-[#30363d]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-[#238636]/30 text-[#7ee787]"}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {exportSuccess && (
            <span className="text-[11px] text-[#7ee787] font-mono flex items-center gap-1 animate-pulse">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Snapshot Exported
            </span>
          )}
          <button
            id="btn-export-debug-logs-tab"
            onClick={handleExportDebugLogs}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#7ee787] hover:text-white border border-[#30363d] text-xs font-mono font-bold transition-all cursor-pointer"
            title="Save system telemetry snapshot to local JSON file"
          >
            <Download className="w-3 h-3" />
            <span>EXPORT LOGS</span>
          </button>
          <span className="text-[11px] text-[#8b949e] font-mono hidden sm:inline-block">
            CPU PC: <span className="text-[#bc8cff] font-bold">${system.cpu.pc.toString(16).padStart(4, "0").toUpperCase()}</span>
          </span>
        </div>
      </div>

      {/* Cycle Timing & Peripheral Analyzer Section (rendered in 'all' and 'timing' views) */}
      {(viewMode === "all" || viewMode === "timing") && (
        <C64TimingAnalyzer
          system={system}
          telemetry={telemetry}
          onStepInstruction={handleStepInstruction}
          onStepCycle={handleStepCycle}
          onStepScanline={handleStepScanline}
          onStepFrame={handleStepFrame}
        />
      )}

      {/* Live Memory Watcher Section (rendered in 'all' and 'watcher' views) */}
      {(viewMode === "all" || viewMode === "watcher") && (
        <C64MemoryWatcher
          system={system}
          telemetry={telemetry}
          onJumpToDisassembler={(addr) => {
            setDisasmAddr(addr);
            setDisasmSearchInput(addr.toString(16).toUpperCase());
            if (viewMode === "watcher") setViewMode("disasm");
          }}
          onJumpToHexViewer={(addr) => {
            setHexStartAddr(addr & 0xfff0);
            setHexSearchInput(addr.toString(16).toUpperCase());
            if (viewMode === "watcher") setViewMode("hex");
          }}
        />
      )}

      {/* Disassembler & Hex Inspector Grid (rendered in 'all', 'disasm', or 'hex' views) */}
      {(viewMode === "all" || viewMode === "disasm" || viewMode === "hex") && (
        <div className={`grid gap-6 ${viewMode === "all" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
          {/* Left Column / Tab: 6502 Machine Code Disassembler */}
          {(viewMode === "all" || viewMode === "disasm") && (
            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl flex flex-col">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#30363d]">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-[#bc8cff]" />
                  <h3 className="font-bold text-white text-sm uppercase">6502 DISASSEMBLER</h3>
                  {disasmHistory.length > 0 && (
                    <button
                      onClick={handleNavBack}
                      className="flex items-center gap-1 text-[11px] font-mono text-[#58a6ff] hover:text-white bg-[#21262d] px-2 py-0.5 rounded ml-2 cursor-pointer"
                      title="Return to previous disassembled address"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Back
                    </button>
                  )}
                </div>

                <form onSubmit={handleDisasmSearch} className="flex items-center gap-1.5">
                  <span className="text-xs text-[#8b949e] font-mono">$</span>
                  <input
                    type="text"
                    value={disasmSearchInput}
                    onChange={(e) => setDisasmSearchInput(e.target.value)}
                    placeholder="ADDR"
                    className="w-20 bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-[#1f6feb]"
                  />
                  <button
                    type="submit"
                    className="p-1 rounded bg-[#21262d] hover:bg-[#30363d] text-white cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>

              <div className={`overflow-y-auto font-mono text-xs flex flex-col gap-1 pr-1 ${viewMode === "disasm" ? "max-h-[600px]" : "max-h-[420px]"}`}>
                {disasmList.map((inst, idx) => {
                  const isCurrentPC = inst.address === system.cpu.pc;
                  const isBreakpoint = breakpointsList.includes(inst.address);
                  const isJumpOrSubroutine =
                    (inst.mnemonic === "JSR" || inst.mnemonic === "JMP") &&
                    inst.bytes.length === 3;
                  const jumpTargetAddr = isJumpOrSubroutine
                    ? inst.bytes[1] | (inst.bytes[2] << 8)
                    : null;

                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between py-1 px-2.5 rounded transition-colors group ${
                        isCurrentPC
                          ? "bg-[#1f6feb]/30 border-l-4 border-[#1f6feb]"
                          : isBreakpoint
                          ? "bg-[#f85149]/15 border-l-4 border-[#f85149]"
                          : "hover:bg-[#21262d]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {/* Breakpoint Gutter Toggle */}
                        <button
                          onClick={() => handleToggleBreakpoint(inst.address)}
                          className="w-4 h-4 flex items-center justify-center cursor-pointer"
                          title={isBreakpoint ? "Remove Breakpoint" : "Set Breakpoint"}
                        >
                          {isBreakpoint ? (
                            <CircleDot className="w-3.5 h-3.5 text-[#f85149] animate-pulse" />
                          ) : (
                            <Circle className="w-3 h-3 text-[#484f58] opacity-0 group-hover:opacity-100 hover:text-[#f85149]" />
                          )}
                        </button>

                        <span
                          onClick={() => handleToggleBreakpoint(inst.address)}
                          className={`w-14 font-bold cursor-pointer ${
                            isCurrentPC
                              ? "text-[#58a6ff]"
                              : isBreakpoint
                              ? "text-[#ff7b72]"
                              : "text-[#8b949e] hover:text-white"
                          }`}
                        >
                          {inst.addressHex}
                        </span>
                        <span className="w-20 text-[#6e7681] text-[11px]">{inst.bytesHex}</span>
                        <span className="text-white font-bold w-12">{inst.mnemonic}</span>
                        
                        {jumpTargetAddr !== null ? (
                          <span
                            onClick={() => handleFollowAddress(jumpTargetAddr)}
                            className="text-[#d29922] font-semibold hover:underline hover:text-[#58a6ff] cursor-pointer"
                            title="Follow subroutine address"
                          >
                            {inst.operand}
                          </span>
                        ) : (
                          <span className="text-[#d29922] font-semibold">{inst.operand}</span>
                        )}
                      </div>

                      {inst.symbol && (
                        <span className="text-[10px] text-[#7ee787] bg-[#238636]/20 px-1.5 py-0.5 rounded">
                          ; {inst.symbol}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Right Column / Tab: 64KB Hex Memory Inspector */}
          {(viewMode === "all" || viewMode === "hex") && (
            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl flex flex-col">
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#30363d]">
                <div className="flex items-center gap-2">
                  <Hash className="w-5 h-5 text-[#7ee787]" />
                  <h3 className="font-bold text-white text-sm uppercase">64KB HEX MEMORY INSPECTOR</h3>
                </div>

                <form onSubmit={handleHexSearch} className="flex items-center gap-1.5">
                  <span className="text-xs text-[#8b949e] font-mono">$</span>
                  <input
                    type="text"
                    value={hexSearchInput}
                    onChange={(e) => setHexSearchInput(e.target.value)}
                    placeholder="0400"
                    className="w-20 bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-[#1f6feb]"
                  />
                  <button
                    type="submit"
                    className="p-1 rounded bg-[#21262d] hover:bg-[#30363d] text-white cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>

              {/* Quick Memory Jump Presets */}
              <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[10px] font-mono">
                <span className="text-[#8b949e] mr-1">JUMP:</span>
                {[
                  { label: "ZERO-PAGE", addr: 0x0000 },
                  { label: "STACK", addr: 0x0100 },
                  { label: "SCREEN ($0400)", addr: 0x0400 },
                  { label: "BASIC ($0801)", addr: 0x0801 },
                  { label: "RAM ($C000)", addr: 0xc000 },
                  { label: "VIC-II ($D000)", addr: 0xd000 },
                  { label: "SID ($D400)", addr: 0xd400 },
                  { label: "COLOR ($D800)", addr: 0xd800 },
                  { label: "CIA1 ($DC00)", addr: 0xdc00 },
                  { label: "KERNAL ($E000)", addr: 0xe000 },
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() => {
                      setHexStartAddr(p.addr);
                      setHexSearchInput(p.addr.toString(16).toUpperCase());
                    }}
                    className="px-2 py-0.5 rounded bg-[#0d1117] hover:bg-[#21262d] text-[#8b949e] hover:text-white border border-[#30363d] cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Hex Editor Rows */}
              <div className={`overflow-y-auto flex flex-col gap-0.5 bg-[#0d1117] p-2.5 rounded-xl border border-[#30363d] ${viewMode === "hex" ? "max-h-[550px]" : "max-h-[360px]"}`}>
                {renderHexRows()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
