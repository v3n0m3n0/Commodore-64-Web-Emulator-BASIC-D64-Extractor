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

  // Start system emulation loop on mount & check URL query params
  useEffect(() => {
    system.start();
    setIsRunning(true);

    // Check for ?load= or ?url= or ?zip= in URL query parameters
    const params = new URLSearchParams(window.location.search);
    const loadUrl =
      params.get("load") ||
      params.get("url") ||
      params.get("rom") ||
      params.get("d64") ||
      params.get("prg") ||
      params.get("zip");

    if (loadUrl) {
      C64ArchiveManager.loadFromUrl(loadUrl)
        .then((extracted) => {
          const runnable = C64ArchiveManager.getRunnableFiles(extracted);
          if (runnable.length === 1) {
            handleMountExtractedFile(runnable[0]);
          } else if (extracted.length > 0) {
            setExtractedFiles(extracted);
          }
        })
        .catch((err) => {
          console.error("Failed to auto-load external media from URL:", err);
        });
    }

    // 10Hz telemetry update interval
    const telemetryInterval = setInterval(() => {
      setTelemetry(system.getTelemetry());
    }, 100);

    return () => {
      system.pause();
      clearInterval(telemetryInterval);
    };
  }, [system]);

  // Global window drag and drop listener (allows dropping ZIP/ROMs anywhere on screen)
  useEffect(() => {
    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files);
      }
    };

    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("drop", handleWindowDrop);

    return () => {
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("drop", handleWindowDrop);
    };
  }, []);

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

  // Handle Sync Mode Toggle (Host VSync 60Hz / PAL 50Hz / NTSC 60Hz)
  const handleToggleSyncMode = () => {
    system.toggleSyncMode();
    setVideoStandard(system.vic.videoStandard);
    setTelemetry(system.getTelemetry());
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

  // Process File Uploads (.ZIP, .D64, .PRG, .CRT, .T64, .TAP, .SID, .BAS or URL)
  const handleFileUpload = async (filesOrUrl: FileList | File[] | ExtractedMediaFile[] | string) => {
    if (!filesOrUrl) return;

    try {
      let allExtracted: ExtractedMediaFile[] = [];

      if (typeof filesOrUrl === "string") {
        allExtracted = await C64ArchiveManager.loadFromUrl(filesOrUrl);
      } else if (Array.isArray(filesOrUrl) && filesOrUrl.length > 0 && "type" in filesOrUrl[0]) {
        allExtracted = filesOrUrl as ExtractedMediaFile[];
      } else {
        const fileList = Array.from(filesOrUrl as FileList | File[]);
        for (let i = 0; i < fileList.length; i++) {
          const extracted = await C64ArchiveManager.processUploadedFile(fileList[i]);
          allExtracted.push(...extracted);
        }
      }

      const runnableFiles = C64ArchiveManager.getRunnableFiles(allExtracted);

      if (runnableFiles.length === 1) {
        // Fast-path: exactly 1 runnable media file present (e.g. disk image in ZIP with readme/nfo)
        handleMountExtractedFile(runnableFiles[0]);
      } else if (allExtracted.length > 0) {
        // Multi-disk archive, multi-game compilation, or documentation: open selection modal
        setExtractedFiles(allExtracted);
      }
    } catch (err) {
      console.error("Error processing retro file:", err);
    }
  };

  // Mount and run specific extracted file in emulator
  const handleMountExtractedFile = (file: ExtractedMediaFile) => {
    // If mounting a TAP file, check if there are companion sides in extractedFiles
    if (file.type === "TAP" && extractedFiles) {
      const baseName = file.name
        .replace(/\.[^.]+$/, "")
        .replace(/\((Side|Tape|Cassette|Part)[^\)]*\)/gi, "")
        .replace(/[-_]\s*(Side|Tape|Cassette|Part)\s*[0-9A-Za-z]+/gi, "")
        .trim();
      const companionTapes = extractedFiles.filter((f) => {
        if (f.type !== "TAP") return false;
        const fBase = f.name
          .replace(/\.[^.]+$/, "")
          .replace(/\((Side|Tape|Cassette|Part)[^\)]*\)/gi, "")
          .replace(/[-_]\s*(Side|Tape|Cassette|Part)\s*[0-9A-Za-z]+/gi, "")
          .trim();
        return fBase === baseName;
      });

      if (companionTapes.length > 1) {
        // Multi-tape set detected! Sort so clicked tape or Side 1 is primary
        const sorted = [...companionTapes].sort((a, b) => {
          if (a.name === file.name) return -1;
          if (b.name === file.name) return 1;
          return a.name.localeCompare(b.name, undefined, { numeric: true });
        });
        setExtractedFiles(null);
        system.mountTapeSet(sorted, true);
        setActiveTab("screen");
        setIsRunning(true);
        return;
      }
    }

    setExtractedFiles(null);

    if (file.type === "D64") {
      system.mountD64(file.data, true, file.name, file.detectedStandard);
      setActiveTab("screen");
      setIsRunning(true);
    } else if (file.type === "CRT") {
      system.loadCartridge(file.data, file.name, file.detectedStandard);
      setActiveTab("screen");
      setIsRunning(true);
    } else if (file.type === "TAP") {
      system.mountTAP(file.data, true, file.name, file.detectedStandard);
      setActiveTab("screen");
      setIsRunning(true);
    } else if (file.type === "T64") {
      system.mountT64(file.data, true, file.name, file.detectedStandard);
      setActiveTab("screen");
      setIsRunning(true);
    } else if (file.type === "PRG" || file.type === "P00") {
      system.loadAndRunPRG(file.data, file.name, file.detectedStandard);
      setActiveTab("screen");
      setIsRunning(true);
    } else if (file.type === "SID") {
      if (file.detectedStandard) {
        system.setStandard(file.detectedStandard);
      }
      system.sid.reset();
      system.sid.resumeAudio();
      setActiveTab("sid");
    } else if (file.type === "BAS") {
      const text = new TextDecoder().decode(file.data);
      system.typeText(text);
      setActiveTab("screen");
      setIsRunning(true);
    }
  };

  const handleFlipTapeSide = () => {
    system.flipTapeSide();
    setTelemetry(system.getTelemetry());
  };

  const handleSwitchTape = (idx: number) => {
    system.switchTape(idx);
    setTelemetry(system.getTelemetry());
  };

  // Dedicated Cartridge (.CRT) Mount & Eject
  const handleMountCartridge = async (filesOrUrl: FileList | File[] | ExtractedMediaFile[] | string) => {
    if (!filesOrUrl) return;
    try {
      let allExtracted: ExtractedMediaFile[] = [];
      if (typeof filesOrUrl === "string") {
        allExtracted = await C64ArchiveManager.loadFromUrl(filesOrUrl);
      } else if (Array.isArray(filesOrUrl) && filesOrUrl.length > 0 && "type" in filesOrUrl[0]) {
        allExtracted = filesOrUrl as ExtractedMediaFile[];
      } else {
        const fileList = Array.from(filesOrUrl as FileList | File[]);
        for (let i = 0; i < fileList.length; i++) {
          const extracted = await C64ArchiveManager.processUploadedFile(fileList[i]);
          allExtracted.push(...extracted);
        }
      }

      const crtFile = allExtracted.find((f) => f.type === "CRT");
      if (crtFile) {
        system.loadCartridge(crtFile.data, crtFile.name, crtFile.detectedStandard);
        setTelemetry(system.getTelemetry());
        setActiveTab("screen");
        setIsRunning(true);
      } else if (allExtracted.length > 0) {
        handleMountExtractedFile(allExtracted[0]);
      }
    } catch (err) {
      console.error("Error mounting cartridge:", err);
    }
  };

  const handleEjectCartridge = () => {
    system.ejectCartridge();
    setTelemetry(system.getTelemetry());
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
        onToggleSyncMode={handleToggleSyncMode}
        onReset={handleReset}
        onFileUpload={handleFileUpload}
        onMountCartridge={handleMountCartridge}
        onEjectCartridge={handleEjectCartridge}
        onSelectTab={setActiveTab}
        onFlipTapeSide={handleFlipTapeSide}
        onSwitchTape={handleSwitchTape}
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
