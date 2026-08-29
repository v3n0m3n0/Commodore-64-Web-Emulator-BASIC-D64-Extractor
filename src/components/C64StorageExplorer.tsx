/**
 * 1541 Virtual Disk Drive & Retro Storage Explorer
 * Decodes D64 disks, T64 tapes, CRT cartridges, and provides one-click mounting,
 * BAM block allocation view, PRG file extraction, and curated bundled retro demos.
 */

import React, { useState } from "react";
import {
  Disc,
  Play,
  Download,
  FileCode,
  Radio,
  Layers,
  Sparkles,
  HardDrive,
  CheckCircle,
  Eye,
} from "lucide-react";
import { C64System } from "../c64/c64_system";
import { D64DirectoryEntry, D64DiskInfo } from "../c64/c64_d64";
import { BUNDLED_SAMPLES, BundledSample } from "../c64/c64_bundled_samples";
import { C64Basic } from "../c64/c64_basic_detokenizer";

interface C64StorageExplorerProps {
  system: C64System;
  mountedDisk: D64DiskInfo | null;
  onOpenBasicStudio: (code: string) => void;
  onOpenDebugger: (address: number) => void;
  onSwitchToScreen: () => void;
}

export const C64StorageExplorer: React.FC<C64StorageExplorerProps> = ({
  system,
  mountedDisk,
  onOpenBasicStudio,
  onOpenDebugger,
  onSwitchToScreen,
}) => {
  const [selectedFile, setSelectedFile] = useState<D64DirectoryEntry | null>(null);

  // Run a D64 PRG file directly
  const handleRunD64File = (file: D64DirectoryEntry) => {
    if (file.data && file.data.length > 0) {
      system.loadAndRunPRG(file.data, file.fileName);
      onSwitchToScreen();
    }
  };

  // Detokenize PRG to BASIC Studio
  const handleDetokenizeToBasic = (file: D64DirectoryEntry) => {
    if (file.data && file.data.length > 0) {
      const source = C64Basic.detokenize(file.data);
      onOpenBasicStudio(source || `10 REM ${file.fileName}\n20 PRINT "READY."`);
    }
  };

  // Disassemble file in 6502 Debugger
  const handleDisassembleFile = (file: D64DirectoryEntry) => {
    if (file.data && file.data.length > 0) {
      system.loadAndRunPRG(file.data, file.fileName);
      onOpenDebugger(file.loadAddress);
    }
  };

  // Download raw PRG binary
  const handleDownloadPrg = (file: D64DirectoryEntry) => {
    const blob = new Blob([file.data], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file.fileName.replace(/[^a-zA-Z0-9_-]/g, "_")}.prg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Run a bundled demo
  const handleRunBundledSample = (sample: BundledSample) => {
    if (sample.code) {
      system.typeText(sample.code);
    } else if (sample.prgBytes) {
      system.loadAndRunPRG(sample.prgBytes, sample.title);
    }
    onSwitchToScreen();
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 flex flex-col gap-6">
      {/* 1541 Virtual Drive 8 Banner Card */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#0d1117] border border-[#30363d] flex items-center justify-center text-[#58a6ff]">
            <Disc className="w-8 h-8 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                COMMODORE 1541 DISK DRIVE (DEVICE 8)
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#238636] text-white">
                ONLINE
              </span>
            </div>
            <p className="text-xs text-[#8b949e] mt-0.5">
              DOS 2.6 • 35 Tracks (683 Sectors) • IEC Serial Bus • BAM Allocation Engine
            </p>
          </div>
        </div>

        {/* 1541 Drive LEDs */}
        <div className="flex items-center gap-4 bg-[#0d1117] px-4 py-2 rounded-xl border border-[#30363d]">
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#8b949e]">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></span>
            <span>POWER</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#8b949e]">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                mountedDisk ? "bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse" : "bg-[#30363d]"
              }`}
            ></span>
            <span>DRIVE ACT</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Mounted D64 Disk Directory */}
        <div className="lg:col-span-2 bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#30363d]">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-[#58a6ff]" />
              <h3 className="font-bold text-white text-sm uppercase">
                {mountedDisk ? `DISK: "${mountedDisk.diskName}" (${mountedDisk.diskId})` : "NO D64 DISK MOUNTED"}
              </h3>
            </div>
            {mountedDisk && (
              <span className="text-xs font-mono text-[#7ee787]">
                {mountedDisk.freeBlocks} BLOCKS FREE
              </span>
            )}
          </div>

          {mountedDisk ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-[#8b949e] border-b border-[#30363d]">
                    <th className="py-2 px-3">BLOCKS</th>
                    <th className="py-2 px-3">FILE NAME</th>
                    <th className="py-2 px-3">TYPE</th>
                    <th className="py-2 px-3">LOAD ADDR</th>
                    <th className="py-2 px-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21262d]">
                  {mountedDisk.files.map((file, idx) => (
                    <tr
                      key={idx}
                      onClick={() => setSelectedFile(file)}
                      className={`hover:bg-[#21262d] cursor-pointer transition-colors ${
                        selectedFile === file ? "bg-[#1f6feb]/20" : ""
                      }`}
                    >
                      <td className="py-2 px-3 text-[#d29922]">{file.sizeInBlocks}</td>
                      <td className="py-2 px-3 text-white font-bold">"{file.fileName}"</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            file.fileType === "PRG"
                              ? "bg-[#1f6feb] text-white"
                              : "bg-[#30363d] text-[#8b949e]"
                          }`}
                        >
                          {file.fileType}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[#bc8cff]">
                        ${file.loadAddress.toString(16).padStart(4, "0").toUpperCase()}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRunD64File(file);
                            }}
                            className="p-1 rounded bg-[#238636] hover:bg-[#2ea043] text-white"
                            title="Load and Run in Emulator"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                          {file.fileType === "PRG" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDetokenizeToBasic(file);
                              }}
                              className="p-1 rounded bg-[#1f6feb] hover:bg-[#388bfd] text-white"
                              title="Detokenize to BASIC Studio"
                            >
                              <FileCode className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadPrg(file);
                            }}
                            className="p-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white"
                            title="Download PRG Binary"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center text-[#8b949e]">
              <Disc className="w-12 h-12 mb-3 text-[#30363d]" />
              <p className="text-sm font-medium text-white">No D64 Disk Image Loaded</p>
              <p className="text-xs mt-1 max-w-sm">
                Upload a <code className="text-[#58a6ff]">.D64</code> disk image or a <code className="text-[#58a6ff]">.ZIP</code> archive using the top toolbar to explore directory tracks and load games.
              </p>
            </div>
          )}
        </div>

        {/* Right Column (1 Col): Curated Bundled Programs & Demos */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl flex flex-col">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#30363d]">
            <Sparkles className="w-5 h-5 text-[#d29922]" />
            <h3 className="font-bold text-white text-sm uppercase">
              BUNDLED RETRO DEMOS & GAMES
            </h3>
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto max-h-[500px] pr-1">
            {BUNDLED_SAMPLES.map((sample) => (
              <div
                key={sample.id}
                className="bg-[#0d1117] border border-[#30363d] hover:border-[#1f6feb] rounded-xl p-3 flex flex-col justify-between gap-2 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{sample.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#21262d] text-[#8b949e] font-mono">
                      {sample.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8b949e] mt-1 leading-relaxed">
                    {sample.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#21262d]">
                  <span className="text-[10px] text-[#484f58] font-mono">{sample.author}</span>
                  <div className="flex items-center gap-1.5">
                    {sample.code && (
                      <button
                        onClick={() => onOpenBasicStudio(sample.code!)}
                        className="px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-white text-[11px] font-medium flex items-center gap-1"
                      >
                        <FileCode className="w-3 h-3" />
                        Edit Code
                      </button>
                    )}
                    <button
                      onClick={() => handleRunBundledSample(sample)}
                      className="px-2.5 py-1 rounded bg-[#238636] hover:bg-[#2ea043] text-white text-[11px] font-bold flex items-center gap-1 shadow-sm"
                    >
                      <Play className="w-3 h-3" />
                      Run
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
