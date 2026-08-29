/**
 * Archive & Multi-File Extractor Modal
 * Displays files extracted from .ZIP and .GZ archives, allowing the user
 * to choose which game or disk to mount or run in the C64 emulator.
 */

import React from "react";
import { X, Play, FileCode, Disc, Radio, HardDrive, Download } from "lucide-react";
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
                <span className="p-2 rounded-lg bg-[#21262d] text-[#58a6ff]">
                  {file.type === "D64" ? (
                    <Disc className="w-4 h-4" />
                  ) : file.type === "T64" || file.type === "TAP" ? (
                    <Radio className="w-4 h-4" />
                  ) : (
                    <FileCode className="w-4 h-4" />
                  )}
                </span>
                <div>
                  <div className="font-bold text-white text-xs sm:text-sm font-mono">
                    {file.name}
                  </div>
                  <div className="text-[11px] text-[#8b949e] flex items-center gap-2 mt-0.5">
                    <span className="px-1.5 py-0.2 rounded bg-[#21262d] text-[#7ee787] font-bold">
                      {file.type}
                    </span>
                    <span>{(file.size / 1024).toFixed(1)} KB</span>
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
