/**
 * Archive & Multi-File Extractor Modal
 * Displays files extracted from .ZIP and .GZ archives, allowing the user
 * to choose which game or disk to mount or run in the C64 emulator.
 */

import React from "react";
import { X, Play, FileCode, Disc, Radio, HardDrive, Layers, Music } from "lucide-react";
import { ExtractedMediaFile } from "../c64/c64_archive_manager";

interface C64ArchiveModalProps {
  files: ExtractedMediaFile[];
  onClose: () => void;
  onMountFile: (file: ExtractedMediaFile) => void;
}

export const C64ArchiveModal: React.FC<C64ArchiveModalProps> = ({
  files,
  onClose,
  onMountFile,
}) => {
  const getIcon = (type: ExtractedMediaFile["type"]) => {
    switch (type) {
      case "CRT":
        return <Layers className="w-4 h-4 text-[#d2a8ff]" />;
      case "D64":
        return <Disc className="w-4 h-4 text-[#58a6ff]" />;
      case "T64":
      case "TAP":
        return <Radio className="w-4 h-4 text-[#7ee787]" />;
      case "SID":
        return <Music className="w-4 h-4 text-[#f0883e]" />;
      default:
        return <FileCode className="w-4 h-4 text-[#79c0ff]" />;
    }
  };

  const getTypeBadge = (type: ExtractedMediaFile["type"]) => {
    switch (type) {
      case "CRT":
        return "bg-[#8957e5] text-white";
      case "D64":
        return "bg-[#1f6feb] text-white";
      case "T64":
      case "TAP":
        return "bg-[#238636] text-white";
      case "SID":
        return "bg-[#bd561d] text-white";
      case "PRG":
      case "P00":
        return "bg-[#388bfd]/20 text-[#58a6ff] border border-[#388bfd]/40";
      default:
        return "bg-[#21262d] text-[#8b949e]";
    }
  };

  const getProfileLabel = (type: ExtractedMediaFile["type"]) => {
    switch (type) {
      case "CRT":
        return "Expansion Port Cartridge Profile";
      case "D64":
        return "1541 DOS 2.6 Virtual Disk Track Profile";
      case "T64":
      case "TAP":
        return "Datasette 1530 Tape Profile";
      case "SID":
        return "MOS 6581 SID Music Chiptune Profile";
      case "PRG":
      case "P00":
        return "Direct Memory Load & Autostart Profile";
      default:
        return "PETSCII Text / BASIC Script Profile";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#30363d] mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1f6feb]/20 border border-[#1f6feb] flex items-center justify-center text-[#58a6ff]">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base uppercase">
                DISCOVERED C64 MEDIA ({files.length} FILES)
              </h3>
              <p className="text-xs text-[#8b949e]">Select a program or disk image to run</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {files.map((file, idx) => (
            <div
              key={idx}
              className="bg-[#0d1117] border border-[#30363d] hover:border-[#1f6feb] rounded-xl p-3 flex items-center justify-between gap-3 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-[#21262d]">
                  {getIcon(file.type)}
                </span>
                <div>
                  <div className="font-bold text-white text-xs sm:text-sm font-mono">
                    {file.name}
                  </div>
                  <div className="text-[11px] text-[#8b949e] flex flex-wrap items-center gap-2 mt-0.5">
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${getTypeBadge(file.type)}`}>
                      {file.type}
                    </span>
                    <span>{(file.size / 1024).toFixed(1)} KB</span>
                    <span className="text-[#6e7681] text-[10px] hidden sm:inline">
                      • {getProfileLabel(file.type)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onMountFile(file)}
                  className="px-3 py-1.5 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Mount & Run
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
