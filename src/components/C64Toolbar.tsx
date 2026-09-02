/**
 * Commodore 64 Master Control Toolbar & Telemetry Header
 * Controls play/pause, warp mode, audio volume, PAL/NTSC switching,
 * reset triggers, file upload dropzone, and live system metrics.
 */

import React, { useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Volume2,
  VolumeX,
  Upload,
  Tv,
  Gamepad2,
  Cpu,
  Radio,
  FileCode,
  Terminal,
  Activity,
  Bot,
  Music,
  Unplug,
} from "lucide-react";
import { VideoStandard } from "../c64/c64_vic2";
import { SystemTelemetry } from "../c64/c64_system";
import { ExtractedMediaFile } from "../c64/c64_archive_manager";

export type ActiveTabType = "screen" | "basic" | "sid" | "debugger" | "storage" | "copilot" | "polish";

interface C64ToolbarProps {
  isRunning: boolean;
  isWarpMode: boolean;
  isMuted: boolean;
  volume: number;
  videoStandard: VideoStandard;
  telemetry: SystemTelemetry;
  activeTab: ActiveTabType;
  onTogglePlay: () => void;
  onToggleWarp: () => void;
  onToggleMute: () => void;
  onChangeVolume: (vol: number) => void;
  onChangeStandard: (std: VideoStandard) => void;
  onToggleSyncMode?: () => void;
  onReset: (hard: boolean) => void;
  onFileUpload: (files: FileList | File[] | ExtractedMediaFile[] | string) => void;
  onMountCartridge?: (files: FileList | File[] | ExtractedMediaFile[] | string) => void;
  onEjectCartridge?: () => void;
  onSelectTab: (tab: ActiveTabType) => void;
  onFlipTapeSide?: () => void;
  onSwitchTape?: (index: number) => void;
}

export const C64Toolbar: React.FC<C64ToolbarProps> = ({
  isRunning,
  isWarpMode,
  isMuted,
  volume,
  videoStandard,
  telemetry,
  activeTab,
  onTogglePlay,
  onToggleWarp,
  onToggleMute,
  onChangeVolume,
  onChangeStandard,
  onToggleSyncMode,
  onReset,
  onFileUpload,
  onMountCartridge,
  onEjectCartridge,
  onSelectTab,
  onFlipTapeSide,
  onSwitchTape,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cartridgeInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="bg-[#161b22] border-b border-[#30363d] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 select-none">
      {/* Brand & Main Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-[#1f6feb] flex items-center justify-center shadow-lg shadow-blue-500/20 font-bold text-white tracking-widest text-xs c64-font">
          C64
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold tracking-wide text-white uppercase flex items-center gap-1.5">
              Commodore 64
            </h1>
          </div>
          <p className="text-[11px] text-[#8b949e]">
            MOS 6510 • VIC-II • SID 6581 • 1541 Virtual Drive 8
          </p>
        </div>
      </div>

      {/* Main Mode Navigation Tabs */}
      <div className="flex items-center gap-1 bg-[#0d1117] p-1 rounded-lg border border-[#30363d]">
        <button
          id="btn-tab-screen"
          onClick={() => onSelectTab("screen")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
            activeTab === "screen"
              ? "bg-[#1f6feb] text-white shadow-sm"
              : "text-[#8b949e] hover:text-white hover:bg-[#21262d]"
          }`}
        >
          <Tv className="w-3.5 h-3.5" />
          CRT Screen
        </button>

        <button
          id="btn-tab-basic"
          onClick={() => onSelectTab("basic")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
            activeTab === "basic"
              ? "bg-[#1f6feb] text-white shadow-sm"
              : "text-[#8b949e] hover:text-white hover:bg-[#21262d]"
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          BASIC Studio
        </button>

        <button
          id="btn-tab-sid"
          onClick={() => onSelectTab("sid")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
            activeTab === "sid"
              ? "bg-[#1f6feb] text-white shadow-sm"
              : "text-[#8b949e] hover:text-white hover:bg-[#21262d]"
          }`}
        >
          <Music className="w-3.5 h-3.5 text-[#58a6ff]" />
          SID Synth
        </button>

        <button
          id="btn-tab-storage"
          onClick={() => onSelectTab("storage")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
            activeTab === "storage"
              ? "bg-[#1f6feb] text-white shadow-sm"
              : "text-[#8b949e] hover:text-white hover:bg-[#21262d]"
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          1541 Disk & Tapes
          {telemetry.mountedDisk && (
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
          )}
        </button>

        <button
          id="btn-tab-debugger"
          onClick={() => onSelectTab("debugger")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
            activeTab === "debugger"
              ? "bg-[#1f6feb] text-white shadow-sm"
              : "text-[#8b949e] hover:text-white hover:bg-[#21262d]"
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          6502 Debugger
        </button>

        <button
          id="btn-tab-polish"
          onClick={() => onSelectTab("polish")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
            activeTab === "polish"
              ? "bg-[#da3633] text-white shadow-sm shadow-red-500/20"
              : "text-[#f85149] hover:text-white hover:bg-[#21262d]"
          }`}
        >
          <Gamepad2 className="w-3.5 h-3.5" />
          🇵🇱 Polskie Gry C64
        </button>

        <button
          id="btn-tab-copilot"
          onClick={() => onSelectTab("copilot")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
            activeTab === "copilot"
              ? "bg-[#8957e5] text-white shadow-sm shadow-purple-500/20"
              : "text-[#a371f7] hover:text-white hover:bg-[#21262d]"
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          AI Copilot
        </button>
      </div>

      {/* Hardware State Controls */}
      <div className="flex items-center gap-2">
        {/* Play/Pause Button */}
        <button
          id="btn-toggle-play"
          onClick={onTogglePlay}
          className={`p-2 rounded border transition-all ${
            isRunning
              ? "bg-[#238636] hover:bg-[#2ea043] text-white border-[#2ea043]"
              : "bg-[#da3633] hover:bg-[#f85149] text-white border-[#f85149]"
          }`}
          title={isRunning ? "Pause Emulation" : "Resume Emulation"}
        >
          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        {/* Warp Mode Toggle */}
        <button
          id="btn-toggle-warp"
          onClick={onToggleWarp}
          className={`p-2 rounded border transition-all ${
            isWarpMode
              ? "bg-[#d29922] text-black border-[#d29922] shadow-sm shadow-yellow-500/20"
              : "bg-[#21262d] text-[#8b949e] hover:text-white border-[#30363d]"
          }`}
          title="Warp Turbo Mode (2x Speed)"
        >
          <Zap className="w-4 h-4" />
        </button>

        {/* Reset Actions */}
        <button
          id="btn-reset-c64"
          onClick={() => onReset(true)}
          className="p-2 rounded bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white border border-[#30363d] transition-all"
          title="Hard System Reset (Cold Boot)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Sync Mode & Video Standard selector (V-Sync 60Hz / PAL 50Hz / NTSC 60Hz) */}
        <button
          id="btn-toggle-standard"
          onClick={
            onToggleSyncMode ||
            (() =>
              onChangeStandard(
                videoStandard === VideoStandard.PAL ? VideoStandard.NTSC : VideoStandard.PAL
              ))
          }
          className="px-2.5 py-1 text-xs font-mono font-bold rounded bg-[#21262d] text-white border border-[#30363d] hover:border-[#8b949e] transition-all"
          title="Przełącz standard wideo (PAL 50.1 Hz / NTSC 59.8 Hz)"
        >
          {telemetry.syncMode === "ntsc_60hz" || videoStandard === VideoStandard.NTSC
            ? "🎮 NTSC (59.8 Hz)"
            : "📺 PAL (50.1 Hz)"}
        </button>

        {/* Quick Tape Deck & Multi-Side Switcher Badge */}
        {telemetry.mountedTape && (
          <div className="flex items-center gap-1 bg-[#0d1117] border border-[#d29922]/60 px-2 py-0.5 rounded text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                telemetry.tapePlay && telemetry.tapeMotor
                  ? "bg-green-400 animate-ping"
                  : telemetry.tapePlay
                  ? "bg-yellow-400"
                  : "bg-gray-500"
              }`}
            />
            <span className="text-[#d29922] font-mono font-bold text-[11px] hidden sm:inline">
              📼 {telemetry.tapeSideName || "TAPE"}:
            </span>
            <span className="text-[#58a6ff] font-mono font-bold text-[11px]">
              {String(telemetry.tapeCounter).padStart(3, "0")}
            </span>
            {telemetry.tapeDeckCount > 1 && onFlipTapeSide && (
              <button
                onClick={onFlipTapeSide}
                className="ml-1 px-1.5 py-0.5 rounded bg-[#d29922]/20 hover:bg-[#d29922]/40 text-[#d29922] text-[10px] font-bold uppercase transition-colors"
                title={`Przełącz stronę kasety (${telemetry.tapeDeckIndex + 1}/${telemetry.tapeDeckCount})`}
              >
                ⇄ FLIP ({telemetry.tapeDeckIndex + 1}/{telemetry.tapeDeckCount})
              </button>
            )}
          </div>
        )}

        {/* Audio Volume & Mute */}
        <div className="flex items-center gap-1.5 bg-[#0d1117] px-2.5 py-1 rounded border border-[#30363d]">
          <button
            id="btn-toggle-mute"
            onClick={onToggleMute}
            className="text-[#8b949e] hover:text-white"
            title={isMuted ? "Unmute SID Audio" : "Mute SID Audio"}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-green-400" />
            )}
          </button>
          <input
            id="slider-volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
            className="w-14 h-1.5 bg-[#21262d] rounded-lg appearance-none cursor-pointer accent-[#1f6feb]"
          />
        </div>

        {/* Load Game File Input & Button */}
        <input
          id="c64-file-upload-input"
          ref={fileInputRef}
          type="file"
          accept=".d64,.prg,.p00,.t64,.tap,.bas,.txt,.zip,.gz,.sid,.mus"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onFileUpload(e.target.files);
              e.target.value = "";
            }
          }}
        />
        <label
          htmlFor="c64-file-upload-input"
          id="btn-upload-file"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#238636] hover:bg-[#2ea043] active:scale-95 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer select-none"
          title="Wczytaj grę lub nośnik C64: .D64 (dyskietka 1541), .TAP (kaseta C2N), .T64 (taśma), .PRG / .P00 (program binarny), .ZIP / .GZ (archiwum), .BAS (kod BASIC)"
        >
          <Gamepad2 className="w-3.5 h-3.5" />
          Load Game
        </label>

        {/* Dedicated Cartridge Mount & Eject Controls */}
        <input
          id="c64-cartridge-upload-input"
          ref={cartridgeInputRef}
          type="file"
          accept=".crt,.zip,.gz"
          className="sr-only"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              if (onMountCartridge) {
                onMountCartridge(e.target.files);
              } else {
                onFileUpload(e.target.files);
              }
              e.target.value = "";
            }
          }}
        />

        {telemetry.cartridge ? (
          <div className="flex items-center rounded shadow-sm border border-blue-500/40 overflow-hidden">
            <label
              htmlFor="c64-cartridge-upload-input"
              id="btn-cartridge-active"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1f6feb]/90 hover:bg-[#1f6feb] text-cyan-100 text-xs font-semibold cursor-pointer transition-all select-none"
              title={`Podłączony Cartridge: ${telemetry.cartridge} (Obsługiwane formaty: .CRT, .ZIP, .GZ — m.in. Action Replay, Final Cartridge III, Super Snapshot, Simons' BASIC, standard 8KB/16KB, Ultimax, Ocean, Magic Desk, EasyFlash itp.). Kliknij, aby zmienić cartridge.`}
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
              <span className="max-w-[110px] truncate">{telemetry.cartridge}</span>
            </label>
            {onEjectCartridge && (
              <button
                id="btn-eject-cartridge"
                onClick={onEjectCartridge}
                className="px-2 py-1.5 bg-[#d9383a] hover:bg-[#f85149] active:scale-95 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer select-none"
                title="Wysuń Cartridge (Eject) z portu rozszerzeń C64"
              >
                <Unplug className="w-3 h-3" />
                <span>Eject</span>
              </button>
            )}
          </div>
        ) : (
          <label
            htmlFor="c64-cartridge-upload-input"
            id="btn-upload-cartridge"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                cartridgeInputRef.current?.click();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1f6feb] hover:bg-[#388bfd] active:scale-95 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer select-none"
            title="Podmontuj Cartridge C64 (.CRT): Obsługiwane typy kartridży (Standard 8KB/16KB, Ultimax, Action Replay, Final Cartridge III, Super Snapshot, Simons' BASIC, Ocean, Magic Desk, EasyFlash itp.). Cartridge pozostaje w porcie podczas wczytywania gier!"
          >
            <Cpu className="w-3.5 h-3.5 text-blue-200" />
            Insert Cartridge
          </label>
        )}
      </div>
    </header>
  );
};
