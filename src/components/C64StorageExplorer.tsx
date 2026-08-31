/**
 * Commodore 1541 Virtual Disk Drive & Retro Storage Explorer
 * Advanced D64/T64 Disk Image Creator, Interactive 35-Track BAM Sector Map Visualizer,
 * Sector Byte Inspector, PRG File Extraction, and Multi-File Disk Packaging Studio.
 */

import React, { useState, useMemo, useRef } from "react";
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
  Plus,
  Trash2,
  FolderPlus,
  RefreshCw,
  Info,
  Cpu,
  Tv,
  Check,
  Zap,
} from "lucide-react";
import { C64System } from "../c64/c64_system";
import { D64DirectoryEntry, D64DiskInfo, C64D64, BAMTrackInfo, BAMSectorDetail } from "../c64/c64_d64";
import { C64T64 } from "../c64/c64_t64";
import { BUNDLED_SAMPLES, BundledSample } from "../c64/c64_bundled_samples";
import { C64Basic } from "../c64/c64_basic_detokenizer";

interface C64StorageExplorerProps {
  system: C64System;
  mountedDisk: D64DiskInfo | null;
  onOpenBasicStudio: (code: string) => void;
  onOpenDebugger: (address: number) => void;
  onSwitchToScreen: () => void;
}

export interface CreatorFileItem {
  id: string;
  name: string;
  type: "PRG" | "SEQ" | "USR" | "DEL";
  data: Uint8Array;
  loadAddress: number;
}

export const C64StorageExplorer: React.FC<C64StorageExplorerProps> = ({
  system,
  mountedDisk,
  onOpenBasicStudio,
  onOpenDebugger,
  onSwitchToScreen,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"directory" | "bam" | "creator" | "bundled">("directory");
  const [selectedFile, setSelectedFile] = useState<D64DirectoryEntry | null>(null);

  // BAM Visualizer state
  const [inspectedSector, setInspectedSector] = useState<{ track: number; sector: number; data: Uint8Array } | null>(null);

  // Disk Creator State
  const [creatorDiskName, setCreatorDiskName] = useState<string>("MY RETRO DISK");
  const [creatorDiskId, setCreatorDiskId] = useState<string>("2A");
  const [creatorDosType, setCreatorDosType] = useState<string>("2A");
  const [creatorFiles, setCreatorFiles] = useState<CreatorFileItem[]>([
    {
      id: "file-1",
      name: "HELLO C64",
      type: "PRG",
      data: C64Basic.tokenize('10 REM HELLO WORLD\n20 PRINT CHR$(147);\n30 POKE 53280,0:POKE 53281,0\n40 PRINT "COMMODORE 64 CUSTOM DISK"\n50 GOTO 50'),
      loadAddress: 0x0801,
    },
    {
      id: "file-2",
      name: "RASTER BARS",
      type: "PRG",
      data: C64Basic.tokenize('10 REM RASTER EFFECT\n20 POKE 53280,PEEK(53266)\n30 GOTO 20'),
      loadAddress: 0x0801,
    },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate BAM Details for currently mounted disk
  const bamTracks: BAMTrackInfo[] = useMemo(() => {
    if (!mountedDisk?.rawImage) return [];
    return C64D64.getBAMDetails(mountedDisk.rawImage);
  }, [mountedDisk]);

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

  // Inspect sector details in modal
  const handleInspectSector = (track: number, sector: number) => {
    if (!mountedDisk?.rawImage) return;
    const secData = C64D64.readSector(mountedDisk.rawImage, track, sector);
    if (secData) {
      setInspectedSector({ track, sector, data: new Uint8Array(secData) });
    }
  };

  // Handle uploading custom files to Creator list
  const handleCreatorFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const reader = new FileReader();
      reader.onload = () => {
        const bytes = new Uint8Array(reader.result as ArrayBuffer);
        let loadAddr = 0x0801;
        if (bytes.length >= 2) {
          loadAddr = bytes[0] | (bytes[1] << 8);
        }
        const cleanName = f.name.replace(/\.[^.]+$/, "").toUpperCase().slice(0, 16);
        setCreatorFiles((prev) => [
          ...prev,
          {
            id: `upload-${Date.now()}-${Math.random()}`,
            name: cleanName,
            type: "PRG",
            data: bytes,
            loadAddress: loadAddr,
          },
        ]);
      };
      reader.readAsArrayBuffer(f);
    }
  };

  // Build and mount D64 image in Virtual Drive 8
  const handleBuildAndMountD64 = () => {
    const d64Bytes = C64D64.createD64(
      creatorDiskName.trim().toUpperCase() || "CUSTOM DISK",
      creatorDiskId.trim().toUpperCase() || "2A",
      creatorFiles.map((f) => ({ name: f.name, data: f.data, type: "PRG" }))
    );

    system.mountD64(d64Bytes, true);
    setActiveSubTab("directory");
  };

  // Download created D64 image
  const handleDownloadCreatedD64 = () => {
    const d64Bytes = C64D64.createD64(
      creatorDiskName.trim().toUpperCase() || "CUSTOM DISK",
      creatorDiskId.trim().toUpperCase() || "2A",
      creatorFiles.map((f) => ({ name: f.name, data: f.data, type: "PRG" }))
    );

    const blob = new Blob([d64Bytes], { type: "application/x-commodore-disk-image" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${creatorDiskName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase() || "disk"}.d64`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download created T64 tape container
  const handleDownloadCreatedT64 = () => {
    const t64Bytes = C64T64.createT64(
      creatorDiskName.trim().toUpperCase() || "TAPE ARCHIVE",
      creatorFiles.map((f) => ({ fileName: f.name, data: f.data, startAddress: f.loadAddress }))
    );

    const blob = new Blob([t64Bytes], { type: "application/x-commodore-tape" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${creatorDiskName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase() || "tape"}.t64`;
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
    <div className="max-w-7xl mx-auto p-4 sm:p-6 flex flex-col gap-6 font-mono text-[#e6edf3]">
      {/* Cartridge Expansion Port Banner Card */}
      {system.mountedCart && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#8957e5]/20 border border-[#8957e5] flex items-center justify-center text-[#d2a8ff]">
              <Layers className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                  CARTRIDGE PORT: "{system.mountedCart.name}"
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#8957e5] text-white">
                  ATTACHED
                </span>
                {system.mountedCart.isUltimax && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#d29922] text-black">
                    ULTIMAX MODE
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8b949e] mt-0.5">
                Hardware: <span className="text-[#58a6ff] font-bold">{system.mountedCart.typeName}</span> (Type {system.mountedCart.cartridgeType}) • Total ROM: {(system.mountedCart.totalSize / 1024).toFixed(0)} KB
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                system.hardReset(false);
                onSwitchToScreen();
              }}
              className="px-3 py-1.5 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              Cold Reset Cartridge
            </button>
            <button
              onClick={() => {
                system.mountedCart = null;
                system.memory.detachCartridge();
                system.hardReset(false);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#da3633] text-[#8b949e] hover:text-white text-xs font-medium border border-[#30363d] transition-colors"
            >
              Eject Cartridge
            </button>
          </div>
        </div>
      )}

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

      {/* Sub-Mode Navigation Tabs */}
      <div className="flex items-center gap-2 bg-[#161b22] p-1.5 rounded-xl border border-[#30363d] overflow-x-auto">
        <button
          onClick={() => setActiveSubTab("directory")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeSubTab === "directory"
              ? "bg-[#1f6feb] text-white shadow-sm"
              : "text-[#8b949e] hover:text-white hover:bg-[#21262d]"
          }`}
        >
          <HardDrive className="w-4 h-4" />
          Disk Directory & Files
        </button>

        <button
          onClick={() => setActiveSubTab("bam")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeSubTab === "bam"
              ? "bg-[#1f6feb] text-white shadow-sm"
              : "text-[#8b949e] hover:text-white hover:bg-[#21262d]"
          }`}
        >
          <Radio className="w-4 h-4" />
          1541 BAM Sector Matrix (35 Tracks)
        </button>

        <button
          onClick={() => setActiveSubTab("creator")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeSubTab === "creator"
              ? "bg-[#238636] text-white shadow-sm"
              : "text-[#7ee787] hover:text-white hover:bg-[#21262d]"
          }`}
        >
          <FolderPlus className="w-4 h-4" />
          Create D64 / T64 Disk Image
        </button>

        <button
          onClick={() => setActiveSubTab("bundled")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeSubTab === "bundled"
              ? "bg-[#d29922] text-black shadow-sm"
              : "text-[#d29922] hover:text-white hover:bg-[#21262d]"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Bundled Demos & Samples
        </button>
      </div>

      {/* SUB-VIEW 1: DIRECTORY & FILES */}
      {activeSubTab === "directory" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Directory Table */}
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
                              className="p-1.5 rounded bg-[#238636] hover:bg-[#2ea043] text-white"
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
                                className="p-1.5 rounded bg-[#1f6feb] hover:bg-[#388bfd] text-white"
                                title="Detokenize to BASIC Studio"
                              >
                                <FileCode className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDisassembleFile(file);
                              }}
                              className="p-1.5 rounded bg-[#8957e5] hover:bg-[#a371f7] text-white"
                              title="Disassemble in 6502 Debugger"
                            >
                              <Cpu className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadPrg(file);
                              }}
                              className="p-1.5 rounded bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white"
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
                  Use the "Create D64 Disk Image" tab to build your own custom disk, or upload a <code className="text-[#58a6ff]">.D64</code> file.
                </p>
              </div>
            )}
          </div>

          {/* Quick File Inspector Panel */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl flex flex-col gap-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#30363d]">
              <Info className="w-4 h-4 text-[#58a6ff]" />
              <h3 className="font-bold text-white text-xs uppercase">Selected File Inspector</h3>
            </div>

            {selectedFile ? (
              <div className="flex flex-col gap-3 text-xs">
                <div className="bg-[#0d1117] p-3 rounded-xl border border-[#30363d] flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#8b949e]">File Name:</span>
                    <span className="text-white font-bold">"{selectedFile.fileName}"</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b949e]">Type:</span>
                    <span className="text-[#58a6ff] font-bold">{selectedFile.fileType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b949e]">Load Address:</span>
                    <span className="text-[#bc8cff] font-bold">
                      ${selectedFile.loadAddress.toString(16).padStart(4, "0").toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b949e]">Size:</span>
                    <span className="text-[#7ee787] font-bold">
                      {selectedFile.sizeInBlocks} blocks ({selectedFile.data.length} bytes)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b949e]">First Track/Sector:</span>
                    <span className="text-[#d29922] font-bold">
                      T:{selectedFile.firstDataTrack} / S:{selectedFile.firstDataSector}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleRunD64File(selectedFile)}
                    className="w-full py-2 rounded-xl bg-[#238636] hover:bg-[#2ea043] text-white font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    Load & Run in C64
                  </button>

                  {selectedFile.fileType === "PRG" && (
                    <button
                      onClick={() => handleDetokenizeToBasic(selectedFile)}
                      className="w-full py-2 rounded-xl bg-[#1f6feb] hover:bg-[#388bfd] text-white font-bold text-xs flex items-center justify-center gap-2"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      Open in BASIC Studio
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[#8b949e]">
                Click on any file in the directory list to inspect its tracks, sectors, and addresses.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: 1541 BAM SECTOR MATRIX (35 TRACKS) */}
      {activeSubTab === "bam" && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363d] pb-4">
            <div>
              <h3 className="font-bold text-white text-sm uppercase flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#58a6ff]" />
                1541 BAM BLOCK AVAILABILITY MAP (35 TRACKS • 683 SECTORS)
              </h3>
              <p className="text-xs text-[#8b949e] mt-0.5">
                Real-time sector allocation matrix from Track 18 Sector 0 BAM. Click any sector to inspect raw 256-byte payload.
              </p>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-green-500"></span>
                <span className="text-[#8b949e]">Free</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-red-500"></span>
                <span className="text-[#8b949e]">Allocated</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-yellow-500"></span>
                <span className="text-[#8b949e]">BAM/Directory</span>
              </div>
            </div>
          </div>

          {bamTracks.length > 0 ? (
            <div className="flex flex-col gap-2 overflow-x-auto pb-2">
              {bamTracks.map((track) => (
                <div key={track.track} className="flex items-center gap-2 text-xs">
                  <span className="w-16 text-[#8b949e] font-mono shrink-0">
                    T#{track.track.toString().padStart(2, "0")} ({track.freeSectors}/{track.totalSectors})
                  </span>
                  <div className="flex items-center gap-1">
                    {track.sectors.map((sec) => {
                      let bgColor = "bg-green-500/80 hover:bg-green-400";
                      if (sec.isBAMOrDir) {
                        bgColor = "bg-yellow-500 hover:bg-yellow-400";
                      } else if (!sec.isFree) {
                        bgColor = "bg-red-500/80 hover:bg-red-400";
                      }

                      return (
                        <button
                          key={sec.sector}
                          onClick={() => handleInspectSector(sec.track, sec.sector)}
                          title={`Track ${sec.track}, Sector ${sec.sector} - ${
                            sec.isBAMOrDir ? "BAM/DIR" : sec.isFree ? "FREE" : `USED: ${sec.ownerFileName || "DATA"}`
                          } (Click to inspect)`}
                          className={`w-4 h-4 rounded-xs ${bgColor} transition-transform hover:scale-125 cursor-pointer`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-[#8b949e] text-xs">
              Mount a D64 disk image to render the 35-track BAM allocation matrix.
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 3: CREATE D64 / T64 DISK IMAGE */}
      {activeSubTab === "creator" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Creator Configuration & File List */}
          <div className="lg:col-span-2 bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
              <h3 className="font-bold text-white text-sm uppercase flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-[#7ee787]" />
                Virtual Disk Image Builder (1541 D64 & T64)
              </h3>
              <span className="text-xs text-[#7ee787]">
                {creatorFiles.length} file(s) queued
              </span>
            </div>

            {/* Disk Header Configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#0d1117] p-4 rounded-xl border border-[#30363d]">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#8b949e] uppercase">
                  Disk Name (Max 16 Chars)
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={creatorDiskName}
                  onChange={(e) => setCreatorDiskName(e.target.value.toUpperCase())}
                  className="bg-[#161b22] border border-[#30363d] px-3 py-1.5 rounded-lg text-xs font-bold text-white uppercase focus:border-[#1f6feb] outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#8b949e] uppercase">
                  Disk ID (2 Chars)
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={creatorDiskId}
                  onChange={(e) => setCreatorDiskId(e.target.value.toUpperCase())}
                  className="bg-[#161b22] border border-[#30363d] px-3 py-1.5 rounded-lg text-xs font-bold text-white uppercase focus:border-[#1f6feb] outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#8b949e] uppercase">
                  DOS Type
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={creatorDosType}
                  onChange={(e) => setCreatorDosType(e.target.value.toUpperCase())}
                  className="bg-[#161b22] border border-[#30363d] px-3 py-1.5 rounded-lg text-xs font-bold text-white uppercase focus:border-[#1f6feb] outline-none"
                />
              </div>
            </div>

            {/* Queued Files on Disk */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#8b949e] uppercase">
                  Files to Include in Directory Track 18
                </label>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-medium flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Local PRG File
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  onChange={handleCreatorFileUpload}
                  className="hidden"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-[#8b949e] border-b border-[#30363d]">
                      <th className="py-2 px-3">FILE NAME</th>
                      <th className="py-2 px-3">TYPE</th>
                      <th className="py-2 px-3">SIZE</th>
                      <th className="py-2 px-3">LOAD ADDR</th>
                      <th className="py-2 px-3 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#21262d]">
                    {creatorFiles.map((file, idx) => (
                      <tr key={file.id} className="hover:bg-[#21262d]">
                        <td className="py-2 px-3 text-white font-bold">"{file.name}"</td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#1f6feb] text-white">
                            {file.type}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[#7ee787]">
                          {Math.max(1, Math.ceil(file.data.length / 254))} blk ({file.data.length} B)
                        </td>
                        <td className="py-2 px-3 text-[#bc8cff]">
                          ${file.loadAddress.toString(16).padStart(4, "0").toUpperCase()}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() =>
                              setCreatorFiles((prev) => prev.filter((item) => item.id !== file.id))
                            }
                            className="p-1 rounded bg-[#da3633]/20 hover:bg-[#da3633] text-[#f85149] hover:text-white transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* One-Click Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#30363d]">
              <button
                onClick={handleBuildAndMountD64}
                className="py-2.5 px-4 rounded-xl bg-[#238636] hover:bg-[#2ea043] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
              >
                <Zap className="w-4 h-4" />
                Format & Mount in 1541
              </button>

              <button
                onClick={handleDownloadCreatedD64}
                className="py-2.5 px-4 rounded-xl bg-[#1f6feb] hover:bg-[#388bfd] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" />
                Download .D64 (174 KB)
              </button>

              <button
                onClick={handleDownloadCreatedT64}
                className="py-2.5 px-4 rounded-xl bg-[#8957e5] hover:bg-[#a371f7] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" />
                Download .T64 Tape
              </button>
            </div>
          </div>

          {/* Quick Add Presets into Disk */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl flex flex-col gap-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#30363d]">
              <Sparkles className="w-4 h-4 text-[#d29922]" />
              <h3 className="font-bold text-white text-xs uppercase">Add Bundled Demos to Disk</h3>
            </div>

            <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[420px] pr-1">
              {BUNDLED_SAMPLES.map((sample) => (
                <div
                  key={sample.id}
                  className="bg-[#0d1117] p-2.5 rounded-xl border border-[#30363d] flex items-center justify-between gap-2"
                >
                  <div className="truncate">
                    <div className="text-xs font-bold text-white truncate">{sample.title}</div>
                    <div className="text-[10px] text-[#8b949e] truncate">{sample.category}</div>
                  </div>
                  <button
                    onClick={() => {
                      let bytes = sample.prgBytes;
                      if (!bytes && sample.code) {
                        bytes = C64Basic.tokenize(sample.code);
                      }
                      if (bytes) {
                        setCreatorFiles((prev) => [
                          ...prev,
                          {
                            id: `sample-${Date.now()}-${sample.id}`,
                            name: sample.title.toUpperCase().slice(0, 16),
                            type: "PRG",
                            data: bytes!,
                            loadAddress: 0x0801,
                          },
                        ]);
                      }
                    }}
                    className="px-2 py-1 rounded bg-[#21262d] hover:bg-[#1f6feb] text-white text-[11px] font-bold shrink-0 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: BUNDLED RETRO DEMOS & SAMPLES */}
      {activeSubTab === "bundled" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {BUNDLED_SAMPLES.map((sample) => (
            <div
              key={sample.id}
              className="bg-[#161b22] border border-[#30363d] hover:border-[#1f6feb] rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-lg transition-all"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">{sample.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#21262d] text-[#58a6ff] font-mono">
                    {sample.category}
                  </span>
                </div>
                <p className="text-[11px] text-[#8b949e] mt-2 leading-relaxed">
                  {sample.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#21262d]">
                <span className="text-[10px] text-[#484f58] font-mono">{sample.author}</span>
                <div className="flex items-center gap-2">
                  {sample.code && (
                    <button
                      onClick={() => onOpenBasicStudio(sample.code!)}
                      className="px-2.5 py-1 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-white text-[11px] font-medium flex items-center gap-1"
                    >
                      <FileCode className="w-3 h-3" />
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => handleRunBundledSample(sample)}
                    className="px-3 py-1 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white text-[11px] font-bold flex items-center gap-1 shadow-sm"
                  >
                    <Play className="w-3 h-3" />
                    Run
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SECTOR INSPECTOR MODAL */}
      {inspectedSector && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-[#58a6ff]" />
                <h3 className="font-bold text-white text-sm">
                  1541 SECTOR INSPECTOR: TRACK {inspectedSector.track}, SECTOR {inspectedSector.sector}
                </h3>
              </div>
              <button
                onClick={() => setInspectedSector(null)}
                className="px-3 py-1 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-bold"
              >
                Close
              </button>
            </div>

            {/* Link Header */}
            <div className="bg-[#0d1117] p-3 rounded-xl border border-[#30363d] flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-[#8b949e]">NEXT TRACK: </span>
                <span className="text-[#d29922] font-bold">${inspectedSector.data[0].toString(16).padStart(2, "0").toUpperCase()} ({inspectedSector.data[0]})</span>
              </div>
              <div>
                <span className="text-[#8b949e]">NEXT SECTOR / BYTES: </span>
                <span className="text-[#58a6ff] font-bold">${inspectedSector.data[1].toString(16).padStart(2, "0").toUpperCase()} ({inspectedSector.data[1]})</span>
              </div>
            </div>

            {/* 256-Byte Hex & PETSCII Dump */}
            <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 font-mono text-[11px] overflow-y-auto max-h-72 leading-relaxed">
              {Array.from({ length: 16 }).map((_, row) => {
                const start = row * 16;
                const slice = inspectedSector.data.slice(start, start + 16);
                const hexBytes = Array.from(slice)
                  .map((b: number) => b.toString(16).padStart(2, "0").toUpperCase())
                  .join(" ");
                const petsciiChars = Array.from(slice)
                  .map((b: number) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : "."))
                  .join("");

                return (
                  <div key={row} className="flex gap-4">
                    <span className="text-[#8b949e]">${start.toString(16).padStart(2, "0").toUpperCase()}:</span>
                    <span className="text-[#bc8cff]">{hexBytes}</span>
                    <span className="text-[#7ee787]">{petsciiChars}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
