/**
 * Commodore BASIC V2 Code Studio & RAM Detokenizer
 * Full-featured development environment for writing, testing, decompiling,
 * tokenizing, and downloading Commodore BASIC programs.
 */

import React, { useState, useEffect } from "react";
import {
  Play,
  Download,
  RotateCcw,
  Sparkles,
  FileCode,
  Layers,
  ArrowRight,
  Code2,
  Copy,
  Check,
  AlertTriangle,
  XCircle,
  Cpu,
} from "lucide-react";
import { C64System } from "../c64/c64_system";
import { C64Basic } from "../c64/c64_basic_detokenizer";
import { C64Assembler } from "../c64/c64_assembler";
import { BUNDLED_SAMPLES } from "../c64/c64_bundled_samples";

interface C64BasicStudioProps {
  system: C64System;
  initialCode?: string;
  onSwitchToScreen: () => void;
}

export const C64BasicStudio: React.FC<C64BasicStudioProps> = ({
  system,
  initialCode,
  onSwitchToScreen,
}) => {
  const [sourceCode, setSourceCode] = useState<string>(
    initialCode ||
      `10 REM COMMODORE BASIC V2 PROGRAM
20 PRINT CHR$(147);:POKE 53280,0:POKE 53281,0
30 PRINT "HELLO FROM C64 AI STUDIO COPILOT!"
40 FOR I=1 TO 15
50 POKE 646,I
60 PRINT "COLOR";I;" IN PETSCII"
70 NEXT I
80 PRINT "READY."`
  );

  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Sync sourceCode with initialCode prop whenever initialCode changes
  useEffect(() => {
    if (initialCode !== undefined && initialCode.trim().length > 0) {
      setSourceCode(initialCode);
      setErrors([]);
    }
  }, [initialCode]);

  // Pull current active BASIC program from C64 RAM ($0801)
  const handleDetokenizeRAM = () => {
    try {
      setErrors([]);
      // Read from $0801 up to 16KB of BASIC program space
      const ramSlice = system.memory.ram.subarray(0x0801, 0x4000);
      const listing = C64Basic.detokenize(ramSlice);
      if (listing && listing.trim().length > 0) {
        setSourceCode(listing);
        setStatusMessage("Program decompiled successfully from RAM ($0801)");
        setTimeout(() => setStatusMessage(null), 3000);
      } else {
        setSourceCode(`10 REM NO BASIC PROGRAM FOUND IN RAM AT $0801\n20 PRINT "READY."`);
      }
    } catch (e: any) {
      setErrors([`Decompilation error: ${e.message || e}`]);
    }
  };

  // Tokenize / Assemble & Inject to C64 RAM, then start execution
  const handleInjectAndRun = () => {
    setErrors([]);
    try {
      const trimmed = sourceCode.trim();
      if (!trimmed) {
        setErrors(["Source code cannot be empty"]);
        return;
      }

      const isAssembly =
        trimmed.startsWith("*") ||
        trimmed.startsWith(".ORG") ||
        trimmed.startsWith("ORG") ||
        /^\s*(LDA|LDX|LDY|STA|STX|STY|SEI|CLI|JSR|JMP|NOP|RTS|INC|DEC|BNE|BEQ|BCS|BCC|BMI|BPL|PHA|PLA|TAX|TXA|TAY|TYA)\b/im.test(trimmed);

      if (isAssembly) {
        const asmRes = C64Assembler.assemble(sourceCode);
        if (!asmRes.success || !asmRes.prgBytes) {
          setErrors(asmRes.errors.length > 0 ? asmRes.errors : ["Assembly failed with syntax or symbol errors"]);
          return;
        }
        system.runAssembly(sourceCode);
      } else {
        const tokenizedPrg = C64Basic.tokenize(sourceCode);
        if (!tokenizedPrg || tokenizedPrg.length <= 4) {
          setErrors(["Failed to generate valid BASIC binary"]);
          return;
        }
        system.loadAndRunPRG(tokenizedPrg, "STUDIO.BAS");
      }
      onSwitchToScreen();
    } catch (err: any) {
      setErrors([err.message || "Failed to execute code in C64"]);
    }
  };

  // Validate syntax without running
  const handleValidate = () => {
    setErrors([]);
    try {
      const trimmed = sourceCode.trim();
      if (!trimmed) {
        setErrors(["Source code is empty"]);
        return;
      }
      const isAssembly =
        trimmed.startsWith("*") ||
        trimmed.startsWith(".ORG") ||
        trimmed.startsWith("ORG") ||
        /^\s*(LDA|LDX|LDY|STA|STX|STY|SEI|CLI|JSR|JMP|NOP|RTS)\b/im.test(trimmed);

      if (isAssembly) {
        const res = C64Assembler.assemble(sourceCode);
        if (!res.success) {
          setErrors(res.errors);
        } else {
          setStatusMessage(`Assembly valid: ${res.byteLength} bytes compiled at $${res.loadAddress?.toString(16).toUpperCase()}`);
          setTimeout(() => setStatusMessage(null), 3000);
        }
      } else {
        const prg = C64Basic.tokenize(sourceCode);
        setStatusMessage(`BASIC valid: ${prg.length} bytes tokenized ($0801)`);
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (e: any) {
      setErrors([e.message || "Validation failed"]);
    }
  };

  // Download plain text .BAS file
  const handleDownloadBas = () => {
    const blob = new Blob([sourceCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "program.bas";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download binary .PRG
  const handleDownloadPrg = () => {
    setErrors([]);
    try {
      const trimmed = sourceCode.trim();
      const isAssembly =
        trimmed.startsWith("*") ||
        trimmed.startsWith(".ORG") ||
        trimmed.startsWith("ORG") ||
        /^\s*(LDA|LDX|LDY|STA|STX|STY|SEI|CLI|JSR|JMP|NOP|RTS)\b/im.test(trimmed);

      let prgBytes: Uint8Array;
      if (isAssembly) {
        const res = C64Assembler.assemble(sourceCode);
        if (!res.success || !res.prgBytes) {
          setErrors(res.errors);
          return;
        }
        prgBytes = res.prgBytes;
      } else {
        prgBytes = C64Basic.tokenize(sourceCode);
      }

      const blob = new Blob([prgBytes], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = isAssembly ? "program_asm.prg" : "program.prg";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrors([err.message || "Failed to download PRG"]);
    }
  };

  // Copy code to clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(sourceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 flex flex-col gap-6">
      {/* Top Banner Card */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#238636]/20 border border-[#238636] flex items-center justify-center text-[#7ee787]">
            <Code2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              COMMODORE BASIC V2 & 6502 CODE STUDIO
            </h2>
            <p className="text-xs text-[#8b949e]">
              Write standard BASIC V2 or 6502 Assembler, decompile live RAM from $0801, and compile to PRG
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDetokenizeRAM}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-semibold border border-[#30363d] transition-all cursor-pointer"
            title="Decompile active program from C64 RAM"
          >
            <Layers className="w-3.5 h-3.5 text-[#58a6ff]" />
            Decompile RAM ($0801)
          </button>

          <button
            onClick={handleValidate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-semibold border border-[#30363d] transition-all cursor-pointer"
            title="Validate syntax"
          >
            <Check className="w-3.5 h-3.5 text-[#d29922]" />
            Validate
          </button>

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-semibold border border-[#30363d] transition-all cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>

          <button
            onClick={handleDownloadBas}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-semibold border border-[#30363d] transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            .BAS
          </button>

          <button
            onClick={handleDownloadPrg}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-semibold border border-[#30363d] transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#bc8cff]" />
            .PRG
          </button>

          <button
            onClick={handleInjectAndRun}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-bold shadow-lg shadow-green-500/20 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            Inject & RUN in C64
          </button>
        </div>
      </div>

      {/* Error / Status Alerts */}
      {errors.length > 0 && (
        <div className="bg-[#f85149]/10 border border-[#f85149] rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#f85149] font-bold text-xs">
            <XCircle className="w-4 h-4" />
            <span>Code Execution / Compilation Errors:</span>
          </div>
          <ul className="list-disc list-inside text-xs text-[#ff7b72] font-mono space-y-1">
            {errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {statusMessage && (
        <div className="bg-[#238636]/10 border border-[#238636] rounded-xl p-3 flex items-center gap-2 text-xs text-[#7ee787] font-medium">
          <Check className="w-4 h-4" />
          <span>{statusMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side (3 Cols): Main BASIC/ASM Editor Area */}
        <div className="lg:col-span-3 bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-3 text-xs text-[#8b949e] font-mono">
            <span>COMMODORE BASIC V2 / 6502 ASM EDITOR</span>
            <span>UPPERCASE KEYWORDS • 38911 BYTES FREE</span>
          </div>

          <textarea
            value={sourceCode}
            onChange={(e) => {
              setSourceCode(e.target.value);
              if (errors.length > 0) setErrors([]);
            }}
            spellCheck={false}
            rows={18}
            className="w-full bg-[#0d1117] text-[#7ee787] border border-[#30363d] rounded-xl p-4 font-mono text-sm leading-relaxed focus:outline-none focus:border-[#1f6feb] resize-none shadow-inner"
          />
        </div>

        {/* Right Side (1 Col): Template Quick Loaders */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#30363d]">
            <Sparkles className="w-4 h-4 text-[#d29922]" />
            <h3 className="font-bold text-white text-xs uppercase tracking-wider">
              CODE TEMPLATES
            </h3>
          </div>

          <div className="flex flex-col gap-2.5">
            {BUNDLED_SAMPLES.filter((s) => s.code).map((sample) => (
              <button
                key={sample.id}
                onClick={() => {
                  setSourceCode(sample.code!);
                  setErrors([]);
                }}
                className="text-left bg-[#0d1117] hover:bg-[#21262d] p-3 rounded-xl border border-[#30363d] hover:border-[#1f6feb] transition-all flex flex-col gap-1 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">{sample.title}</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#21262d] text-[#8b949e]">
                    {sample.category}
                  </span>
                </div>
                <span className="text-[11px] text-[#8b949e] line-clamp-2">
                  {sample.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
