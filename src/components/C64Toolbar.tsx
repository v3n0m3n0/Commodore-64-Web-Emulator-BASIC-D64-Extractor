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
} from "lucide-react";
import { VideoStandard } from "../c64/c64_vic2";
import { SystemTelemetry } from "../c64/c64_system";

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
  onReset: (hard: boolean) => void;
  onFileUpload: (files: FileList) => void;
  onSelectTab: (tab: ActiveTabType) => void;
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
  onReset,
  onFileUpload,
  onSelectTab,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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

        {/* PAL / NTSC standard selector */}
        <button
          id="btn-toggle-standard"
          onClick={() =>
            onChangeStandard(
              videoStandard === VideoStandard.PAL ? VideoStandard.NTSC : VideoStandard.PAL
            )
          }
          className="px-2.5 py-1 text-xs font-mono font-bold rounded bg-[#21262d] text-white border border-[#30363d] hover:border-[#8b949e]"
          title="Switch Video Standard"
        >
          {videoStandard} (
          {videoStandard === VideoStandard.PAL ? "50.1 Hz" : "59.8 Hz"})
        </button>

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

        {/* Upload File Input Button */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".d64,.prg,.p00,.crt,.t64,.tap,.bas,.txt,.zip,.gz"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onFileUpload(e.target.files);
            }
          }}
        />
        <button
          id="btn-upload-file"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold shadow-sm transition-all"
          title="Upload D64, PRG, CRT, T64, TAP or ZIP archive"
        >
          <Upload className="w-3.5 h-3.5" />
          Load File / ZIP
        </button>
      </div>
    </header>
  );
};
