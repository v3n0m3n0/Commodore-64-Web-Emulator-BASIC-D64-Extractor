/**
 * Archive & Multi-File Extractor Modal
 * Displays files extracted from .ZIP and .GZ archives, allowing the user
 * to choose which game or disk to mount or run in the C64 emulator,
 * with built-in document reader for game manuals, NFOs, and release notes.
 */

import React, { useState, useMemo } from "react";
import {
  X,
  Play,
  FileCode,
  Disc,
  Radio,
  HardDrive,
  Layers,
  Music,
  FileText,
  Eye,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { ExtractedMediaFile, C64ArchiveManager } from "../c64/c64_archive_manager";

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
  const [viewingDocFile, setViewingDocFile] = useState<ExtractedMediaFile | null>(null);

  const runnableFiles = useMemo(() => C64ArchiveManager.getRunnableFiles(files), [files]);
  const companionFiles = useMemo(
    () => files.filter((f) => !C64ArchiveManager.isRunnableMedia(f.type)),
    [files]
  );

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
      case "DOC":
        return <FileText className="w-4 h-4 text-[#e3b341]" />;
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
      case "DOC":
        return "bg-[#bb8009]/20 text-[#e3b341] border border-[#bb8009]/40";
      case "IMAGE":
        return "bg-[#39d353]/20 text-[#7ee787] border border-[#39d353]/40";
      default:
        return "bg-[#21262d] text-[#8b949e]";
    }
  };

  const getProfileLabel = (file: ExtractedMediaFile) => {
    switch (file.type) {
      case "CRT":
        return "Expansion Port Cartridge ROM";
      case "D64":
        return "1541 DOS 2.6 Virtual Disk Track Image";
      case "T64":
      case "TAP":
        return "Datasette 1530 Tape Container";
      case "SID":
        return "MOS 6581 SID Music Chiptune";
      case "PRG":
      case "P00":
        return file.loadAddress !== undefined
          ? `Direct Load ($${file.loadAddress.toString(16).toUpperCase().padStart(4, "0")})`
          : "Direct Memory Load PRG";
      case "DOC":
        return "Game Manual / Release NFO";
      case "IMAGE":
        return "Cover Art / Screenshot";
      default:
        return "Commodore File";
    }
  };

  // Render document reader if a text file is selected
  const docContent = useMemo(() => {
    if (!viewingDocFile) return "";
    try {
      return new TextDecoder("utf-8", { fatal: false }).decode(viewingDocFile.data);
    } catch {
      return "Unable to decode text file.";
    }
  }, [viewingDocFile]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl max-w-3xl w-full p-6 shadow-2xl flex flex-col max-h-[88vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#30363d] mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1f6feb]/20 border border-[#1f6feb] flex items-center justify-center text-[#58a6ff]">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base uppercase">
                {viewingDocFile
                  ? `DOCUMENT VIEWER: ${viewingDocFile.name}`
                  : `DISCOVERED C64 MEDIA (${files.length} FILES)`}
              </h3>
              <p className="text-xs text-[#8b949e]">
                {viewingDocFile
                  ? "Release notes, manual, or instructions from archive"
                  : `${runnableFiles.length} runnable items, ${companionFiles.length} companion files`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!viewingDocFile && runnableFiles.length > 0 && (
              <button
                onClick={() => onMountFile(runnableFiles[0])}
                className="px-3 py-1.5 rounded-lg bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Directly launch the primary game file"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Autostart First ({runnableFiles[0].name})
              </button>
            )}

            {viewingDocFile ? (
              <button
                onClick={() => setViewingDocFile(null)}
                className="px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to List
              </button>
            ) : (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        {viewingDocFile ? (
          <div className="flex-1 overflow-hidden flex flex-col bg-[#0d1117] rounded-xl border border-[#30363d] p-4">
            <pre className="flex-1 overflow-y-auto font-mono text-xs text-[#c9d1d9] whitespace-pre-wrap select-text leading-relaxed">
              {docContent}
            </pre>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Primary Runnable Media */}
            {runnableFiles.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-[#58a6ff] uppercase tracking-wider px-1">
                  RUNNABLE C64 PROGRAMS & IMAGES ({runnableFiles.length})
                </div>
                {runnableFiles.map((file, idx) => (
                  <div
                    key={`run-${idx}`}
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
                            • {getProfileLabel(file)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onMountFile(file)}
                        className="px-3 py-1.5 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        Mount & Run
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Companion Documents & Files */}
            {companionFiles.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#21262d]">
                <div className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider px-1">
                  COMPANION ASSETS & DOCUMENTATION ({companionFiles.length})
                </div>
                {companionFiles.map((file, idx) => (
                  <div
                    key={`comp-${idx}`}
                    className="bg-[#0d1117]/60 border border-[#21262d] hover:border-[#30363d] rounded-xl p-2.5 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="p-1.5 rounded-lg bg-[#161b22]">
                        {getIcon(file.type)}
                      </span>
                      <div>
                        <div className="text-xs text-[#c9d1d9] font-mono">
                          {file.name}
                        </div>
                        <div className="text-[10px] text-[#6e7681] flex items-center gap-2 mt-0.5">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${getTypeBadge(file.type)}`}>
                            {file.type}
                          </span>
                          <span>{(file.size / 1024).toFixed(1)} KB</span>
                          <span>• {getProfileLabel(file)}</span>
                        </div>
                      </div>
                    </div>

                    {file.type === "DOC" && (
                      <button
                        onClick={() => setViewingDocFile(file)}
                        className="px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-white text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Read Text
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
