/**
 * Commodore 64 Web Emulator & BASIC D64 Extractor
 * Powered by cycle-accurate MOS 6510 CPU, VIC-II, SID, CIA 1/2, and Gemini Copilot.
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { C64System, SystemTelemetry } from "./c64/c64_system";
import { VideoStandard } from "./c64/c64_vic2";
import { C64Toolbar } from "./components/C64Toolbar";
import { C64Screen } from "./components/C64Screen";
import { C64VirtualKeyboard } from "./components/C64VirtualKeyboard";
import { C64StorageExplorer } from "./components/C64StorageExplorer";
import { C64Debugger } from "./components/C64Debugger";
import { C64BasicStudio } from "./components/C64BasicStudio";
import { C64SidStudio } from "./components/C64SidStudio";
import { C64GeminiCopilot } from "./components/C64GeminiCopilot";
import { C64PolishGamesCatalog } from "./components/C64PolishGamesCatalog";
import { C64ArchiveManager, ExtractedMediaFile } from "./c64/c64_archive_manager";
import { C64ArchiveModal } from "./components/C64ArchiveModal";
import { ActiveTabType } from "./components/C64Toolbar";

export default function App() {
  // Initialize Master System Orchestrator
  const system = useMemo(() => new C64System(), []);

  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [isWarpMode, setIsWarpMode] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.8);
  const [videoStandard, setVideoStandard] = useState<VideoStandard>(VideoStandard.PAL);
  const [activeTab, setActiveTab] = useState<ActiveTabType>("screen");

  const [telemetry, setTelemetry] = useState<SystemTelemetry>(() => system.getTelemetry());
  const [basicStudioCode, setBasicStudioCode] = useState<string | undefined>(undefined);
  const [debuggerTargetAddr, setDebuggerTargetAddr] = useState<number | undefined>(undefined);

  // Archive modal state
  const [extractedFiles, setExtractedFiles] = useState<ExtractedMediaFile[] | null>(null);

  // Start system emulation loop on mount
  useEffect(() => {
    system.start();
    setIsRunning(true);

    // 10Hz telemetry update interval
    const telemetryInterval = setInterval(() => {
      setTelemetry(system.getTelemetry());
    }, 100);

    return () => {
      system.pause();
      clearInterval(telemetryInterval);
    };
  }, [system]);

  // Handle Play/Pause
  const handleTogglePlay = () => {
    if (system.isRunning) {
      system.pause();
      setIsRunning(false);
    } else {
      system.start();
      setIsRunning(true);
    }
  };

  // Handle Warp Mode
  const handleToggleWarp = () => {
    system.isWarpMode = !system.isWarpMode;
    setIsWarpMode(system.isWarpMode);
  };

  // Handle Audio Mute
  const handleToggleMute = () => {
    system.sid.isMuted = !system.sid.isMuted;
    setIsMuted(system.sid.isMuted);
  };

  // Handle Volume Change
  const handleChangeVolume = (vol: number) => {
    system.sid.volume = vol;
    setVolume(vol);
  };

  // Handle PAL/NTSC Standard change
  const handleChangeStandard = (std: VideoStandard) => {
    system.vic.setStandard(std);
    setVideoStandard(std);
  };

  // Handle Reset
  const handleReset = (hard: boolean) => {
    if (hard) {
      system.hardReset();
    } else {
      system.reset();
    }
    setTelemetry(system.getTelemetry());
  };

  // Process File Uploads (.ZIP, .D64, .PRG, .CRT, .T64, .TAP)
  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;

    try {
      const allExtracted: ExtractedMediaFile[] = [];

      for (let i = 0; i < files.length; i++) {
        const extracted = await C64ArchiveManager.processUploadedFile(files[i]);
        allExtracted.push(...extracted);
      }

      if (allExtracted.length === 1) {
        // Single file: mount & run immediately
        handleMountExtractedFile(allExtracted[0]);
      } else if (allExtracted.length > 1) {
        // Multi-file or ZIP: show selection modal
        setExtractedFiles(allExtracted);
      }
    } catch (err) {
      console.error("Error processing retro file:", err);
    }
  };

  // Mount and run specific extracted file in emulator
  const handleMountExtractedFile = (file: ExtractedMediaFile) => {
    setExtractedFiles(null);

    if (file.type === "D64") {
      system.mountD64(file.data, true);
      setActiveTab("screen");
      setIsRunning(true);
    } else if (file.type === "CRT") {
      system.loadCartridge(file.data);
      setActiveTab("screen");
      setIsRunning(true);
    } else if (file.type === "T64" || file.type === "TAP") {
      system.mountT64(file.data, true);
      setActiveTab("screen");
      setIsRunning(true);
    } else if (file.type === "PRG" || file.type === "P00") {
      system.loadAndRunPRG(file.data, file.name);
      setActiveTab("screen");
      setIsRunning(true);
    } else if (file.type === "BAS") {
      const text = new TextDecoder().decode(file.data);
      system.typeText(text);
      setActiveTab("screen");
      setIsRunning(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] flex flex-col font-mono selection:bg-[#1f6feb] selection:text-white">
      {/* Master Toolbar & Telemetry Header */}
      <C64Toolbar
        isRunning={isRunning}
        isWarpMode={isWarpMode}
        isMuted={isMuted}
        volume={volume}
        videoStandard={videoStandard}
        telemetry={telemetry}
        activeTab={activeTab}
        onTogglePlay={handleTogglePlay}
        onToggleWarp={handleToggleWarp}
        onToggleMute={handleToggleMute}
        onChangeVolume={handleChangeVolume}
        onChangeStandard={handleChangeStandard}
        onReset={handleReset}
        onFileUpload={handleFileUpload}
        onSelectTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {activeTab === "screen" && (
          <div className="flex-1 flex flex-col justify-between">
            <C64Screen
              system={system}
              telemetry={telemetry}
              onFileUpload={handleFileUpload}
            />
            <C64VirtualKeyboard system={system} />
          </div>
        )}

        {activeTab === "basic" && (
          <C64BasicStudio
            system={system}
            initialCode={basicStudioCode}
            onSwitchToScreen={() => setActiveTab("screen")}
          />
        )}

        {activeTab === "sid" && (
          <C64SidStudio
            system={system}
            onOpenBasicStudio={(code) => {
              setBasicStudioCode(code);
              setActiveTab("basic");
            }}
            onSwitchToScreen={() => setActiveTab("screen")}
          />
        )}

        {activeTab === "storage" && (
          <C64StorageExplorer
            system={system}
            mountedDisk={system.mountedDisk}
            onOpenBasicStudio={(code) => {
              setBasicStudioCode(code);
              setActiveTab("basic");
            }}
            onOpenDebugger={(addr) => {
              setDebuggerTargetAddr(addr);
              setActiveTab("debugger");
            }}
            onSwitchToScreen={() => setActiveTab("screen")}
          />
        )}

        {activeTab === "debugger" && (
          <C64Debugger
            system={system}
            telemetry={telemetry}
            targetAddress={debuggerTargetAddr}
          />
        )}

        {activeTab === "copilot" && (
          <C64GeminiCopilot
            system={system}
            telemetry={telemetry}
            onOpenBasicStudio={(code) => {
              setBasicStudioCode(code);
              setActiveTab("basic");
            }}
            onSwitchToScreen={() => setActiveTab("screen")}
          />
        )}

        {activeTab === "polish" && (
          <C64PolishGamesCatalog
            system={system}
            onSwitchToScreen={() => setActiveTab("screen")}
            onOpenBasicStudio={(code) => {
              setBasicStudioCode(code);
              setActiveTab("basic");
            }}
            onOpenDebugger={(addr) => {
              setDebuggerTargetAddr(addr);
              setActiveTab("debugger");
            }}
          />
        )}
      </main>

      {/* Archive Multi-File Extractor Modal */}
      {extractedFiles && (
        <C64ArchiveModal
          files={extractedFiles}
          onClose={() => setExtractedFiles(null)}
          onMountFile={handleMountExtractedFile}
        />
      )}
    </div>
  );
}
