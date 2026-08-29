/**
 * Gemini C64 AI Studio Copilot
 * Connects to Google AI Studio / Gemini 2.5 API with hardware system telemetry context,
 * generating verified Commodore BASIC V2, 6502 Assembly routines, and providing expert retro debugging.
 */

import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  Sparkles,
  Play,
  FileCode,
  RotateCcw,
  Copy,
  Check,
  Terminal,
  Cpu,
} from "lucide-react";
import { C64System, SystemTelemetry } from "../c64/c64_system";
import { C64Basic } from "../c64/c64_basic_detokenizer";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  codeBlock?: {
    type: "BASIC" | "ASM";
    code: string;
  };
  timestamp: string;
}

interface C64GeminiCopilotProps {
  system: C64System;
  telemetry: SystemTelemetry;
  onOpenBasicStudio: (code: string) => void;
  onSwitchToScreen: () => void;
}

export const C64GeminiCopilot: React.FC<C64GeminiCopilotProps> = ({
  system,
  telemetry,
  onOpenBasicStudio,
  onSwitchToScreen,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Greetings, Commodore Hacker! I am your C64 AI Studio Copilot. I have full knowledge of MOS 6510/6502 assembly, VIC-II raster timing, SID 6581 sound synthesis, and Commodore BASIC V2. How can I assist your retro computing session today?",
      codeBlock: {
        type: "BASIC",
        code: `10 REM COMMODORE 64 AI COPILOT GREETING
20 PRINT CHR$(147);:POKE 53280,0:POKE 53281,0:POKE 646,14
30 PRINT "   *** C64 AI STUDIO COPILOT ***"
40 PRINT " SYSTEM READY FOR CODING & REVERSE ENG."
50 GOTO 50`,
      },
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message to Gemini server-side endpoint
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputText("");
    setIsLoading(true);

    try {
      // Build real-time C64 system telemetry context
      const systemContext = {
        pc: `$${telemetry.pc.toString(16).padStart(4, "0").toUpperCase()}`,
        a: `$${telemetry.a.toString(16).padStart(2, "0").toUpperCase()}`,
        x: `$${telemetry.x.toString(16).padStart(2, "0").toUpperCase()}`,
        y: `$${telemetry.y.toString(16).padStart(2, "0").toUpperCase()}`,
        sp: `$01${telemetry.sp.toString(16).padStart(2, "0").toUpperCase()}`,
        flags: telemetry.flags,
        rasterLine: telemetry.rasterLine,
        videoMode: telemetry.videoMode,
        mountedDisk: telemetry.mountedDisk || "None",
      };

      const response = await fetch("/api/gemini/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: textToSend,
          systemContext,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      const assistantText = data.text || "No response received.";

      // Check if response contains a BASIC or Assembly code block
      let extractedCode: { type: "BASIC" | "ASM"; code: string } | undefined;
      const basicMatch = assistantText.match(/```(?:basic|c64)?\s*([\s\S]*?)```/i);
      const asmMatch = assistantText.match(/```(?:asm|6502|assembly)\s*([\s\S]*?)```/i);

      if (basicMatch) {
        extractedCode = { type: "BASIC", code: basicMatch[1].trim() };
      } else if (asmMatch) {
        extractedCode = { type: "ASM", code: asmMatch[1].trim() };
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        text: assistantText,
        codeBlock: extractedCode,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        sender: "assistant",
        text: `Error connecting to Gemini Copilot: ${err.message}. Please verify server configuration or network connectivity.`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Run code directly in C64
  const handleRunInC64 = (code: string, type: "BASIC" | "ASM" = "BASIC") => {
    try {
      if (type === "BASIC") {
        const prg = C64Basic.tokenize(code);
        system.loadAndRunPRG(prg, "COPILOT.BAS");
      } else {
        system.runAssembly(code);
      }
      onSwitchToScreen();
    } catch (err: any) {
      console.error("Error executing code in C64:", err);
      system.typeText(code);
      onSwitchToScreen();
    }
  };

  // Copy code snippet
  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 flex flex-col gap-6">
      {/* Top Banner Card */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#8957e5]/20 border border-[#8957e5] flex items-center justify-center text-[#bc8cff]">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                COMMODORE 64 AI STUDIO COPILOT
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#8957e5] text-white">
                GEMINI 2.5
              </span>
            </div>
            <p className="text-xs text-[#8b949e]">
              Hardware-aware AI engineer for 6502 assembly, BASIC V2, SID, and VIC-II debugging
            </p>
          </div>
        </div>

        {/* Quick System Watcher Badge */}
        <div className="flex items-center gap-2 text-xs font-mono bg-[#0d1117] px-3 py-1.5 rounded-xl border border-[#30363d] text-[#8b949e]">
          <Cpu className="w-4 h-4 text-[#58a6ff]" />
          <span>
            PC: <strong className="text-white">${telemetry.pc.toString(16).padStart(4, "0").toUpperCase()}</strong>
          </span>
          <span>•</span>
          <span>
            Raster: <strong className="text-yellow-400">{telemetry.rasterLine}</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column (3 Cols): Main Chat Feed */}
        <div className="lg:col-span-3 bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl flex flex-col h-[600px]">
          {/* Message List */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-md ${
                    msg.sender === "user"
                      ? "bg-[#1f6feb] text-white rounded-br-none"
                      : "bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded-bl-none"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1.5 text-[10px] text-[#8b949e]">
                    <span className="font-bold uppercase flex items-center gap-1">
                      {msg.sender === "user" ? "You" : "C64 Copilot"}
                    </span>
                    <span>{msg.timestamp}</span>
                  </div>

                  <div className="whitespace-pre-wrap font-sans">{msg.text}</div>

                  {/* Render Code Block if present */}
                  {msg.codeBlock && (
                    <div className="mt-3 bg-[#161b22] border border-[#30363d] rounded-xl p-3 font-mono text-xs text-[#7ee787]">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#30363d] text-[10px] text-[#8b949e]">
                        <span className="font-bold text-[#58a6ff]">
                          {msg.codeBlock.type === "BASIC" ? "COMMODORE BASIC V2" : "6502 ASSEMBLY"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleCopyCode(msg.id, msg.codeBlock!.code)}
                            className="p-1 hover:text-white"
                            title="Copy code"
                          >
                            {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          {msg.codeBlock.type === "BASIC" && (
                            <button
                              onClick={() => onOpenBasicStudio(msg.codeBlock!.code)}
                              className="px-2 py-0.5 rounded bg-[#21262d] hover:bg-[#30363d] text-white text-[10px] flex items-center gap-1"
                            >
                              <FileCode className="w-3 h-3" />
                              Studio
                            </button>
                          )}
                          <button
                            onClick={() => handleRunInC64(msg.codeBlock!.code, msg.codeBlock!.type)}
                            className="px-2.5 py-0.5 rounded bg-[#238636] hover:bg-[#2ea043] text-white text-[10px] font-bold flex items-center gap-1 shadow-sm"
                          >
                            <Play className="w-3 h-3 fill-white" />
                            Run in C64
                          </button>
                        </div>
                      </div>
                      <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed">
                        {msg.codeBlock.code}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="mt-4 pt-3 border-t border-[#30363d] flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask Copilot about 6502 opcodes, VIC-II rasters, SID sounds, or generate BASIC code..."
              className="flex-1 bg-[#0d1117] text-white border border-[#30363d] rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#8957e5] transition-colors"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="px-4 py-2.5 rounded-xl bg-[#8957e5] hover:bg-[#a371f7] disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </form>
        </div>

        {/* Right Column (1 Col): Prompt Presets & Expert Cheat Sheets */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#30363d]">
            <Sparkles className="w-4 h-4 text-[#d29922]" />
            <h3 className="font-bold text-white text-xs uppercase tracking-wider">
              ONE-CLICK COPILOT PROMPTS
            </h3>
          </div>

          <div className="flex flex-col gap-2">
            {[
              {
                title: "Generate SID Sound Effect",
                prompt: "Generate a Commodore BASIC V2 program using SID chip registers ($D400-$D418) that plays an authentic 8-bit laser blast and explosion sound effect.",
              },
              {
                title: "Create VIC-II Raster Bar",
                prompt: "Write a Commodore BASIC program with POKEs that locks into the VIC-II raster line ($D012) and creates a smooth rainbow color bar on the screen border ($D020).",
              },
              {
                title: "Explain Zero Page Pointers",
                prompt: "Explain the key Zero Page memory addresses in Commodore 64 (such as $0001, $002B-$0032 for BASIC, and $0314 for IRQ vectors) and how to safely use them.",
              },
              {
                title: "Convert to 6502 Machine Code",
                prompt: "Explain how to write a high-performance 6502 assembly loop that clears screen color RAM ($D800-$DBE7) in machine code using indexed addressing ($D800,X).",
              },
            ].map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(preset.prompt)}
                className="text-left bg-[#0d1117] hover:bg-[#21262d] p-3 rounded-xl border border-[#30363d] hover:border-[#8957e5] transition-all flex flex-col gap-1"
              >
                <span className="font-bold text-white text-xs">{preset.title}</span>
                <span className="text-[11px] text-[#8b949e] line-clamp-2">
                  {preset.prompt}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
