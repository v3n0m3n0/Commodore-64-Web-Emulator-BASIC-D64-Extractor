/**
 * C64 Live Memory Watcher & Variable Inspector
 * Allows real-time tracking of memory addresses ($D020, $0801, Zero-Page, I/O registers)
 * with animated optical change highlights, format switches (Hex, Dec, Bin, Word, PETSCII),
 * live POKE editing, and change frequency telemetry.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Eye,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Sparkles,
  Zap,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  Sliders,
  Layers,
  HelpCircle,
} from "lucide-react";
import { C64System, SystemTelemetry } from "../c64/c64_system";
import { C64Disassembler } from "../c64/c64_disassembler";

export type WatchType = "byte" | "word" | "4bytes" | "petscii";

export interface MemoryWatchItem {
  id: string;
  address: number;
  label?: string;
  type: WatchType;
  lastValue: number | number[];
  changeCount: number;
  lastChangedAt: number; // timestamp
  isHighlighted: boolean;
  notes?: string;
}

interface C64MemoryWatcherProps {
  system: C64System;
  telemetry: SystemTelemetry;
  onJumpToDisassembler?: (address: number) => void;
  onJumpToHexViewer?: (address: number) => void;
}

// Curated C64 Standard Watch Presets
const PRESET_WATCHES: { address: number; label: string; type: WatchType; notes: string }[] = [
  { address: 0xd020, label: "VIC_BORDER_COLOR", type: "byte", notes: "VIC-II Border Color ($D020)" },
  { address: 0xd021, label: "VIC_BG_COLOR", type: "byte", notes: "VIC-II Background Color ($D021)" },
  { address: 0x0801, label: "BASIC_TXTTAB", type: "4bytes", notes: "Start of BASIC program memory ($0801)" },
  { address: 0x0001, label: "CPU_PORT_R6510", type: "byte", notes: "6510 On-Chip I/O Port ($37 = Default)" },
  { address: 0xd012, label: "VIC_RASTER", type: "byte", notes: "VIC-II Current Raster Line Counter" },
  { address: 0x00d6, label: "TBLX_CURSOR_ROW", type: "byte", notes: "Screen Editor Current Cursor Row (0-24)" },
  { address: 0x00d3, label: "PNTR_CURSOR_COL", type: "byte", notes: "Screen Editor Current Cursor Col (0-39)" },
  { address: 0x0314, label: "CINV_IRQ_VECTOR", type: "word", notes: "RAM Indirect IRQ Vector ($EA31)" },
  { address: 0x0286, label: "COLOR_SHADOW", type: "byte", notes: "Current Text Color ($0286 = $0E Light Blue)" },
  { address: 0xdc00, label: "CIA1_PORT_A", type: "byte", notes: "CIA1 Joystick 2 / Keyboard Matrix" },
  { address: 0xd400, label: "SID_V1_FREQ", type: "word", notes: "SID Voice 1 Frequency Register ($D400-$D401)" },
  { address: 0x0400, label: "SCREEN_ROW_0", type: "petscii", notes: "Screen Buffer First 8 Characters" },
];

export const C64MemoryWatcher: React.FC<C64MemoryWatcherProps> = ({
  system,
  telemetry,
  onJumpToDisassembler,
  onJumpToHexViewer,
}) => {
  // Watches list state
  const [watches, setWatches] = useState<MemoryWatchItem[]>([
    {
      id: "w_d020",
      address: 0xd020,
      label: "VIC_BORDER_COLOR",
      type: "byte",
      lastValue: system.memory.read(0xd020),
      changeCount: 0,
      lastChangedAt: 0,
      isHighlighted: false,
      notes: "VIC-II Border Color ($D020)",
    },
    {
      id: "w_d021",
      address: 0xd021,
      label: "VIC_BG_COLOR",
      type: "byte",
      lastValue: system.memory.read(0xd021),
      changeCount: 0,
      lastChangedAt: 0,
      isHighlighted: false,
      notes: "VIC-II Background Color ($D021)",
    },
    {
      id: "w_0801",
      address: 0x0801,
      label: "BASIC_TXTTAB",
      type: "4bytes",
      lastValue: [
        system.memory.read(0x0801),
        system.memory.read(0x0802),
        system.memory.read(0x0803),
        system.memory.read(0x0804),
      ],
      changeCount: 0,
      lastChangedAt: 0,
      isHighlighted: false,
      notes: "Start of BASIC Program",
    },
    {
      id: "w_0001",
      address: 0x0001,
      label: "CPU_PORT",
      type: "byte",
      lastValue: system.memory.read(0x0001),
      changeCount: 0,
      lastChangedAt: 0,
      isHighlighted: false,
      notes: "6510 Processor Port ($0001)",
    },
    {
      id: "w_d012",
      address: 0xd012,
      label: "VIC_RASTER",
      type: "byte",
      lastValue: system.memory.read(0xd012),
      changeCount: 0,
      lastChangedAt: 0,
      isHighlighted: false,
      notes: "Raster Line Counter",
    },
    {
      id: "w_0314",
      address: 0x0314,
      label: "CINV_IRQ",
      type: "word",
      lastValue: system.memory.read(0x0314) | (system.memory.read(0x0315) << 8),
      changeCount: 0,
      lastChangedAt: 0,
      isHighlighted: false,
      notes: "KERNAL IRQ Vector",
    },
  ]);

  // Form input state for adding new watch
  const [newAddrInput, setNewAddrInput] = useState<string>("");
  const [newLabelInput, setNewLabelInput] = useState<string>("");
  const [newTypeInput, setNewTypeInput] = useState<WatchType>("byte");

  // Inline Poke / Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValueInput, setEditValueInput] = useState<string>("");

  // Live log of recent value changes
  const [recentMutations, setRecentMutations] = useState<
    { id: string; time: string; addressHex: string; label: string; oldVal: string; newVal: string }[]
  >([]);

  // Track values between ticks/telemetry updates
  const prevValuesRef = useRef<{ [id: string]: number | number[] }>({});
  const highlightTimeoutsRef = useRef<{ [id: string]: NodeJS.Timeout }>({});

  // Helper to read current value from memory based on type
  const readWatchValue = (address: number, type: WatchType): number | number[] => {
    const mem = system.memory;
    switch (type) {
      case "byte":
        return mem.read(address & 0xffff);
      case "word":
        return (mem.read(address & 0xffff) | (mem.read((address + 1) & 0xffff) << 8)) & 0xffff;
      case "4bytes":
        return [
          mem.read(address & 0xffff),
          mem.read((address + 1) & 0xffff),
          mem.read((address + 2) & 0xffff),
          mem.read((address + 3) & 0xffff),
        ];
      case "petscii":
        return [
          mem.read(address & 0xffff),
          mem.read((address + 1) & 0xffff),
          mem.read((address + 2) & 0xffff),
          mem.read((address + 3) & 0xffff),
          mem.read((address + 4) & 0xffff),
          mem.read((address + 5) & 0xffff),
          mem.read((address + 6) & 0xffff),
          mem.read((address + 7) & 0xffff),
        ];
    }
  };

  // Compare two values
  const hasValueChanged = (v1: number | number[], v2: number | number[]): boolean => {
    if (Array.isArray(v1) && Array.isArray(v2)) {
      if (v1.length !== v2.length) return true;
      return v1.some((val, i) => val !== v2[i]);
    }
    return v1 !== v2;
  };

  // Format value to string
  const formatValue = (val: number | number[], type: WatchType) => {
    if (Array.isArray(val)) {
      if (type === "petscii") {
        const chars = val.map((b) => {
          if (b === 0x20) return " ";
          if (b >= 1 && b <= 26) return String.fromCharCode(b + 64);
          if (b >= 48 && b <= 57) return String.fromCharCode(b);
          if (b === 42) return "*";
          if (b === 46) return ".";
          return "·";
        }).join("");
        const hex = val.map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join(" ");
        return { hex, extra: `"${chars}"` };
      } else {
        const hex = val.map((b) => `$${b.toString(16).padStart(2, "0").toUpperCase()}`).join(" ");
        return { hex, extra: "" };
      }
    } else {
      if (type === "word") {
        const hex = `$${val.toString(16).padStart(4, "0").toUpperCase()}`;
        const dec = `${val}`;
        return { hex, extra: `Dec: ${dec}` };
      } else {
        const hex = `$${val.toString(16).padStart(2, "0").toUpperCase()}`;
        const dec = `${val}`;
        const bin = `%${val.toString(2).padStart(8, "0")}`;
        const char = val >= 32 && val <= 126 ? `'${String.fromCharCode(val)}'` : "";
        return { hex, extra: `Dec: ${dec}  ${bin}  ${char}`.trim() };
      }
    }
  };

  // Poll memory on telemetry updates and flag real-time changes
  useEffect(() => {
    const now = Date.now();
    let anyChanged = false;
    const newMutations: {
      id: string;
      time: string;
      addressHex: string;
      label: string;
      oldVal: string;
      newVal: string;
    }[] = [];

    const updatedWatches = watches.map((w) => {
      const currentVal = readWatchValue(w.address, w.type);
      const prevVal = prevValuesRef.current[w.id] !== undefined ? prevValuesRef.current[w.id] : w.lastValue;

      if (hasValueChanged(prevVal, currentVal)) {
        anyChanged = true;
        prevValuesRef.current[w.id] = currentVal;

        // Add mutation log entry
        const addrStr = `$${w.address.toString(16).padStart(4, "0").toUpperCase()}`;
        const oldStr = formatValue(prevVal, w.type).hex;
        const newStr = formatValue(currentVal, w.type).hex;
        const timeStr = new Date().toLocaleTimeString();

        newMutations.push({
          id: `${w.id}_${now}_${Math.random()}`,
          time: timeStr,
          addressHex: addrStr,
          label: w.label || C64Disassembler.SYMBOLS[w.address] || addrStr,
          oldVal: oldStr,
          newVal: newStr,
        });

        // Set highlight timer
        if (highlightTimeoutsRef.current[w.id]) {
          clearTimeout(highlightTimeoutsRef.current[w.id]);
        }
        highlightTimeoutsRef.current[w.id] = setTimeout(() => {
          setWatches((prev) =>
            prev.map((item) => (item.id === w.id ? { ...item, isHighlighted: false } : item))
          );
        }, 1200);

        return {
          ...w,
          lastValue: currentVal,
          changeCount: w.changeCount + 1,
          lastChangedAt: now,
          isHighlighted: true,
        };
      }

      return {
        ...w,
        lastValue: currentVal,
      };
    });

    if (anyChanged) {
      setWatches(updatedWatches);
      if (newMutations.length > 0) {
        setRecentMutations((prev) => [...newMutations, ...prev].slice(0, 20));
      }
    }
  }, [telemetry.pc, telemetry.rasterLine, telemetry.fps]);

  // Handle adding custom watch
  const handleAddWatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddrInput.trim()) return;

    let clean = newAddrInput.trim().toUpperCase();
    if (clean.startsWith("$") || clean.startsWith("0X")) {
      clean = clean.replace("$", "").replace("0X", "");
    }

    const addr = parseInt(clean, 16);
    if (isNaN(addr) || addr < 0 || addr > 0xffff) {
      return;
    }

    const autoSymbol = C64Disassembler.SYMBOLS[addr];
    const finalLabel = newLabelInput.trim() || autoSymbol || `$${addr.toString(16).padStart(4, "0").toUpperCase()}`;
    const initialVal = readWatchValue(addr, newTypeInput);

    const newWatch: MemoryWatchItem = {
      id: `w_${addr.toString(16)}_${Date.now()}`,
      address: addr,
      label: finalLabel,
      type: newTypeInput,
      lastValue: initialVal,
      changeCount: 0,
      lastChangedAt: 0,
      isHighlighted: true,
      notes: autoSymbol ? `Symbol: ${autoSymbol}` : undefined,
    };

    setWatches((prev) => [newWatch, ...prev]);
    setNewAddrInput("");
    setNewLabelInput("");
  };

  // Add preset watch
  const handleAddPreset = (preset: (typeof PRESET_WATCHES)[0]) => {
    // Check if already exists
    if (watches.some((w) => w.address === preset.address && w.type === preset.type)) {
      return;
    }

    const initialVal = readWatchValue(preset.address, preset.type);
    const newWatch: MemoryWatchItem = {
      id: `w_${preset.address.toString(16)}_${Date.now()}`,
      address: preset.address,
      label: preset.label,
      type: preset.type,
      lastValue: initialVal,
      changeCount: 0,
      lastChangedAt: 0,
      isHighlighted: true,
      notes: preset.notes,
    };

    setWatches((prev) => [newWatch, ...prev]);
  };

  // Remove watch
  const handleRemoveWatch = (id: string) => {
    setWatches((prev) => prev.filter((w) => w.id !== id));
    delete prevValuesRef.current[id];
  };

  // Clear all watches
  const handleClearAll = () => {
    setWatches([]);
    prevValuesRef.current = {};
  };

  // Reset change counters
  const handleResetCounters = () => {
    setWatches((prev) =>
      prev.map((w) => ({
        ...w,
        changeCount: 0,
        isHighlighted: false,
      }))
    );
    setRecentMutations([]);
  };

  // Save inline POKE memory edit
  const handleSavePoke = (w: MemoryWatchItem) => {
    if (!editValueInput.trim()) {
      setEditingId(null);
      return;
    }

    let val = 0;
    let clean = editValueInput.trim().toUpperCase();
    if (clean.startsWith("$") || clean.startsWith("0X")) {
      val = parseInt(clean.replace("$", "").replace("0X", ""), 16);
    } else {
      val = parseInt(clean, 10);
    }

    if (!isNaN(val)) {
      if (w.type === "word") {
        system.memory.write(w.address, val & 0xff);
        system.memory.write((w.address + 1) & 0xffff, (val >> 8) & 0xff);
      } else {
        system.memory.write(w.address, val & 0xff);
      }
    }

    setEditingId(null);
    setEditValueInput("");
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl flex flex-col gap-5">
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#30363d]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#238636]/20 border border-[#238636] flex items-center justify-center text-[#7ee787]">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base tracking-wide flex items-center gap-2">
                MEMORY WATCHER &amp; LIVE VARIABLE TRACKER
              </h3>
              <span className="bg-[#238636]/30 text-[#7ee787] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#238636]/50">
                LIVE
              </span>
            </div>
            <p className="text-xs text-[#8b949e]">
              Real-time monitoring of C64 hardware registers ($D020, $DC00) and Zero Page pointers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetCounters}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white text-xs font-mono border border-[#30363d] transition-all"
            title="Reset Mutation Counters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Counters
          </button>

          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#da3633]/20 text-[#8b949e] hover:text-[#f85149] text-xs font-mono border border-[#30363d] hover:border-[#da3633]/50 transition-all"
            title="Remove All Watches"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All
          </button>
        </div>
      </div>

      {/* Quick Add Presets Bar */}
      <div className="flex flex-col gap-2 bg-[#0d1117] p-3 rounded-xl border border-[#30363d]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#8b949e] flex items-center gap-1.5 uppercase">
            <Sparkles className="w-3.5 h-3.5 text-[#d29922]" /> Quick Preset Watches:
          </span>
          <span className="text-[10px] text-[#8b949e]">Click to add standard C64 memory locations</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESET_WATCHES.map((preset) => {
            const isAdded = watches.some(
              (w) => w.address === preset.address && w.type === preset.type
            );
            return (
              <button
                key={preset.label}
                onClick={() => handleAddPreset(preset)}
                disabled={isAdded}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono flex items-center gap-1.5 transition-all border ${
                  isAdded
                    ? "bg-[#21262d]/50 text-[#6e7681] border-[#30363d]/50 cursor-default"
                    : "bg-[#21262d] hover:bg-[#30363d] text-[#58a6ff] hover:text-white border-[#30363d]"
                }`}
                title={preset.notes}
              >
                <span>${preset.address.toString(16).padStart(4, "0").toUpperCase()}</span>
                <span className="text-[10px] text-[#8b949e]">({preset.label})</span>
                {isAdded && <Check className="w-3 h-3 text-[#7ee787]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Add New Custom Watch Form */}
      <form
        onSubmit={handleAddWatch}
        className="flex flex-wrap items-center gap-2 bg-[#0d1117] p-3 rounded-xl border border-[#30363d]"
      >
        <div className="flex items-center gap-1">
          <span className="text-xs font-mono text-[#8b949e]">$</span>
          <input
            type="text"
            value={newAddrInput}
            onChange={(e) => {
              const val = e.target.value;
              setNewAddrInput(val);
              const hex = parseInt(val.replace("$", ""), 16);
              if (!isNaN(hex) && C64Disassembler.SYMBOLS[hex] && !newLabelInput) {
                setNewLabelInput(C64Disassembler.SYMBOLS[hex]);
              }
            }}
            placeholder="ADDR (e.g. D020, 0801)"
            className="w-40 bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white placeholder-[#6e7681] focus:outline-none focus:border-[#1f6feb]"
          />
        </div>

        <input
          type="text"
          value={newLabelInput}
          onChange={(e) => setNewLabelInput(e.target.value)}
          placeholder="Custom Label / Variable Name (Optional)"
          className="flex-1 min-w-[180px] bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white placeholder-[#6e7681] focus:outline-none focus:border-[#1f6feb]"
        />

        <select
          value={newTypeInput}
          onChange={(e) => setNewTypeInput(e.target.value as WatchType)}
          className="bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#1f6feb]"
        >
          <option value="byte">8-bit Byte</option>
          <option value="word">16-bit Word (LE)</option>
          <option value="4bytes">4 Bytes Block</option>
          <option value="petscii">PETSCII Text (8 Bytes)</option>
        </select>

        <button
          type="submit"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-bold font-mono transition-all shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Watch
        </button>
      </form>

      {/* Main Watchers Table */}
      <div className="overflow-x-auto rounded-xl border border-[#30363d] bg-[#0d1117]">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="bg-[#161b22] border-b border-[#30363d] text-[#8b949e] uppercase text-[11px]">
              <th className="py-2.5 px-3 w-28">Address</th>
              <th className="py-2.5 px-3 w-44">Label / Symbol</th>
              <th className="py-2.5 px-3 w-24">Type</th>
              <th className="py-2.5 px-3">Live Value</th>
              <th className="py-2.5 px-3 w-28 text-center">Mutations</th>
              <th className="py-2.5 px-3 w-28 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#21262d]">
            {watches.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#8b949e]">
                  <Activity className="w-8 h-8 mx-auto mb-2 text-[#484f58]" />
                  No memory watchpoints configured. Add an address above or choose from presets!
                </td>
              </tr>
            ) : (
              watches.map((w) => {
                const addrHex = `$${w.address.toString(16).padStart(4, "0").toUpperCase()}`;
                const formatted = formatValue(w.lastValue, w.type);
                const isEditing = editingId === w.id;

                return (
                  <tr
                    key={w.id}
                    className={`transition-colors duration-500 ${
                      w.isHighlighted
                        ? "bg-[#238636]/25 border-l-4 border-[#238636]"
                        : "hover:bg-[#161b22]"
                    }`}
                  >
                    {/* Address Column */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#58a6ff]">{addrHex}</span>
                        {w.isHighlighted && (
                          <span
                            className="w-2 h-2 rounded-full bg-[#7ee787] animate-ping"
                            title="Memory value changed"
                          />
                        )}
                      </div>
                    </td>

                    {/* Label Column */}
                    <td className="py-2.5 px-3">
                      <div className="flex flex-col">
                        <span className="text-white font-semibold">{w.label || "-"}</span>
                        {w.notes && <span className="text-[10px] text-[#8b949e]">{w.notes}</span>}
                      </div>
                    </td>

                    {/* Type Column */}
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#21262d] text-[#8b949e] border border-[#30363d] uppercase">
                        {w.type}
                      </span>
                    </td>

                    {/* Live Value with Highlight & Inline Edit */}
                    <td className="py-2.5 px-3">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editValueInput}
                            onChange={(e) => setEditValueInput(e.target.value)}
                            placeholder="Val ($00 or Dec)"
                            className="w-28 bg-[#161b22] border border-[#1f6feb] rounded px-2 py-0.5 text-xs text-white focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSavePoke(w);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                          />
                          <button
                            onClick={() => handleSavePoke(w)}
                            className="p-1 rounded bg-[#238636] hover:bg-[#2ea043] text-white"
                            title="Poke Value"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#8b949e]"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-sm transition-all ${
                              w.isHighlighted
                                ? "bg-[#238636] text-white shadow-[0_0_12px_rgba(35,134,54,0.8)]"
                                : "bg-[#21262d] text-white"
                            }`}
                          >
                            {formatted.hex}
                          </span>
                          {formatted.extra && (
                            <span className="text-[#8b949e] text-[11px]">{formatted.extra}</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Mutation Counter */}
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          w.changeCount > 0
                            ? "bg-[#d29922]/20 text-[#d29922] border border-[#d29922]/40"
                            : "text-[#6e7681]"
                        }`}
                      >
                        {w.changeCount} changes
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingId(w.id);
                            const hex = Array.isArray(w.lastValue)
                              ? w.lastValue[0].toString(16)
                              : w.lastValue.toString(16);
                            setEditValueInput(`$${hex.padStart(2, "0").toUpperCase()}`);
                          }}
                          className="p-1.5 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-white transition-colors"
                          title="Poke / Edit Value in Memory"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {onJumpToHexViewer && (
                          <button
                            onClick={() => onJumpToHexViewer(w.address)}
                            className="p-1.5 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-[#58a6ff] transition-colors text-[10px]"
                            title="Jump to Hex Inspector"
                          >
                            HEX
                          </button>
                        )}

                        <button
                          onClick={() => handleRemoveWatch(w.id)}
                          className="p-1.5 rounded hover:bg-[#da3633]/20 text-[#8b949e] hover:text-[#f85149] transition-colors"
                          title="Remove Watch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Real-time Mutation Log Feed */}
      {recentMutations.length > 0 && (
        <div className="flex flex-col gap-2 bg-[#0d1117] p-3.5 rounded-xl border border-[#30363d]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#8b949e] flex items-center gap-1.5 uppercase">
              <Activity className="w-3.5 h-3.5 text-[#58a6ff]" /> Real-Time Memory Mutation Log:
            </span>
            <span className="text-[10px] text-[#6e7681]">Showing last {recentMutations.length} memory events</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto">
            {recentMutations.slice(0, 12).map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-1.5 bg-[#161b22] px-2.5 py-1 rounded-lg border border-[#30363d] text-[10px] font-mono"
              >
                <span className="text-[#8b949e]">{m.time}</span>
                <span className="text-[#58a6ff] font-bold">{m.addressHex}</span>
                <span className="text-white">({m.label})</span>
                <span className="text-[#f85149]">{m.oldVal}</span>
                <span className="text-[#8b949e]">→</span>
                <span className="text-[#7ee787] font-bold">{m.newVal}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
