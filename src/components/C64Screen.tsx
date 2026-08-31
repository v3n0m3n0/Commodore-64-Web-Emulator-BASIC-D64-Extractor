/**
 * Commodore 64 Interactive CRT Display Viewport
 * Displays cycle-rendered VIC-II canvas, CRT shader effects,
 * drag-and-drop file mount overlay, mobile touch virtual joystick, and screenshot capture.
 */

import React, { useRef, useEffect, useState } from "react";
import {
  Maximize2,
  Camera,
  Layers,
  Sparkles,
  Gamepad,
  HelpCircle,
  UploadCloud,
  Eye,
  CircleDot,
  Keyboard,
} from "lucide-react";
import { C64System, SystemTelemetry } from "../c64/c64_system";
import { C64Keyboard } from "../c64/c64_keyboard";

interface C64ScreenProps {
  system: C64System;
  telemetry: SystemTelemetry;
  onFileUpload: (files: FileList) => void;
}

export const C64Screen: React.FC<C64ScreenProps> = ({ system, telemetry, onFileUpload }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [scanlines, setScanlines] = useState<boolean>(false);
  const [crtGlow, setCrtGlow] = useState<boolean>(false);
  const [crtCurvature, setCrtCurvature] = useState<boolean>(false);
  const [showVirtualJoystick, setShowVirtualJoystick] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isFireActive, setIsFireActive] = useState<boolean>(false);
  const [keyboardMode, setKeyboardMode] = useState<"text_pure" | "game_shared">(
    system.keyboardMode || "text_pure"
  );
  const [modeNotice, setModeNotice] = useState<string | null>(null);

  const toggleKeyboardMode = () => {
    const next = system.toggleKeyboardMode();
    setKeyboardMode(next);
    const msg =
      next === "text_pure"
        ? "Włączono Tryb Czysty ⌨️ - Klawiatura 8x8 odizolowana od Joysticka (Familiada/BASIC)"
        : "Włączono Tryb Gry 🕹️+⌨️ - WASD / Strzałki / Spacja sterują Joystickiem 1 i 2";
    setModeNotice(msg);
    setTimeout(() => setModeNotice(null), 3500);
  };

  // Trigger NEXT / FIRE pulse (Space + Return + Joy1/Joy2 Fire on CIA 1)
  const handleFireNext = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.stopPropagation();
    }
    system.triggerFireAndNext();
    setIsFireActive(true);
    setTimeout(() => setIsFireActive(false), 220);
  };

  // Hook canvas rendering to system frame tick
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Direct render loop
    let animId: number;
    const renderLoop = () => {
      system.vic.renderToCanvas(ctx, { scanlines, crtGlow });
      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [system, scanlines, crtGlow]);

  // Handle Global Physical Keyboard Events and forward to C64 Keyboard Matrix
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in an active text input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }

      // F10 key toggles keyboard mode
      if (e.code === "F10") {
        e.preventDefault();
        toggleKeyboardMode();
        return;
      }

      // PageUp triggers authentic C64 RESTORE NMI (VICE emulator standard)
      if (e.code === "PageUp") {
        e.preventDefault();
        system.triggerRestore();
        return;
      }

      // Prevent page scrolling on Arrow keys / Space in emulator
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }

      // Clean 8x8 matrix input with Polish diacritics support (No double buffer push!)
      system.keyboard.onKeyDown(e.code, e.key);

      // Only map keys to CIA 1 Joystick 1 & 2 when in Shared Game Mode
      if (system.keyboardMode === "game_shared") {
        if (e.code === "ArrowUp" || e.code === "KeyW") {
          system.cia1.joy1 &= ~0x01;
          system.cia1.joy2 &= ~0x01;
        }
        if (e.code === "ArrowDown" || e.code === "KeyS") {
          system.cia1.joy1 &= ~0x02;
          system.cia1.joy2 &= ~0x02;
        }
        if (e.code === "ArrowLeft" || e.code === "KeyA") {
          system.cia1.joy1 &= ~0x04;
          system.cia1.joy2 &= ~0x04;
        }
        if (e.code === "ArrowRight" || e.code === "KeyD") {
          system.cia1.joy1 &= ~0x08;
          system.cia1.joy2 &= ~0x08;
        }
        if (
          e.code === "Space" ||
          e.code === "ControlLeft" ||
          e.code === "ControlRight" ||
          e.code === "KeyJ" ||
          e.code === "Enter" ||
          e.code === "NumpadEnter"
        ) {
          system.cia1.joy1 &= ~0x10;
          system.cia1.joy2 &= ~0x10;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }

      system.keyboard.onKeyUp(e.code, e.key);

      if (system.keyboardMode === "game_shared") {
        if (e.code === "ArrowUp" || e.code === "KeyW") {
          system.cia1.joy1 |= 0x01;
          system.cia1.joy2 |= 0x01;
        }
        if (e.code === "ArrowDown" || e.code === "KeyS") {
          system.cia1.joy1 |= 0x02;
          system.cia1.joy2 |= 0x02;
        }
        if (e.code === "ArrowLeft" || e.code === "KeyA") {
          system.cia1.joy1 |= 0x04;
          system.cia1.joy2 |= 0x04;
        }
        if (e.code === "ArrowRight" || e.code === "KeyD") {
          system.cia1.joy1 |= 0x08;
          system.cia1.joy2 |= 0x08;
        }
        if (
          e.code === "Space" ||
          e.code === "ControlLeft" ||
          e.code === "ControlRight" ||
          e.code === "KeyJ" ||
          e.code === "Enter" ||
          e.code === "NumpadEnter"
        ) {
          system.cia1.joy1 |= 0x10;
          system.cia1.joy2 |= 0x10;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [system, keyboardMode]);

  // Take high-res screenshot
  const handleScreenshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `c64_screenshot_${Date.now()}.png`;
    a.click();
  };

  // Toggle Fullscreen
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => {
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload(e.dataTransfer.files);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 min-h-[calc(100vh-140px)]">
      {/* Top Display Controls Toolbar */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Scanlines toggle */}
          <button
            id="btn-toggle-scanlines"
            onClick={() => setScanlines(!scanlines)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border transition-all h-[28px] ${
              scanlines
                ? "bg-[#21262d] text-[#58a6ff] border-[#1f6feb]"
                : "bg-[#161b22] text-[#8b949e] border-[#30363d]"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Scanlines
          </button>

          {/* CRT Glow toggle */}
          <button
            id="btn-toggle-glow"
            onClick={() => setCrtGlow(!crtGlow)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border transition-all h-[28px] ${
              crtGlow
                ? "bg-[#21262d] text-[#7ee787] border-[#238636]"
                : "bg-[#161b22] text-[#8b949e] border-[#30363d]"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Phosphor Glow
          </button>

          {/* Curved CRT toggle */}
          <button
            id="btn-toggle-curvature"
            onClick={() => setCrtCurvature(!crtCurvature)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border transition-all h-[28px] ${
              crtCurvature
                ? "bg-[#21262d] text-[#d29922] border-[#d29922]"
                : "bg-[#161b22] text-[#8b949e] border-[#30363d]"
            }`}
          >
            <CircleDot className="w-3.5 h-3.5" />
            Curved Tube
          </button>

          {/* Virtual Joystick Toggle */}
          <button
            id="btn-toggle-vjoy"
            onClick={() => setShowVirtualJoystick(!showVirtualJoystick)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border transition-all h-[28px] ${
              showVirtualJoystick
                ? "bg-[#21262d] text-[#bc8cff] border-[#8957e5]"
                : "bg-[#161b22] text-[#8b949e] border-[#30363d]"
            }`}
          >
            <Gamepad className="w-3.5 h-3.5" />
            Virtual Joy
          </button>

          {/* Keyboard Mode Toggle (Pure Matrix vs Shared Joystick) */}
          <button
            id="btn-toggle-kbd-mode"
            onClick={toggleKeyboardMode}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border transition-all cursor-pointer h-[28px] ${
              keyboardMode === "text_pure"
                ? "bg-[#1f6feb]/25 text-[#58a6ff] border-[#1f6feb] shadow-[0_0_10px_rgba(31,111,235,0.25)]"
                : "bg-[#d29922]/20 text-[#e3b341] border-[#d29922]"
            }`}
            title="Przełącz tryb klawiatury [F10]: ⌨️ (Czysta tekstowa dla Familiady/BASIC) vs 🕹️+⌨️ (Współdzielona z Joystickiem dla gier)"
          >
            <span className="text-xs">
              {keyboardMode === "text_pure" ? "⌨️" : "🕹️+⌨️"}
            </span>
            <span className="text-[10px] bg-black/50 px-1 py-0.2 rounded font-mono text-gray-300">
              F10
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Czerwony przycisk 🕹️ DALEJ (FIRE) */}
          <button
            id="btn-fire-next"
            onClick={handleFireNext}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer border h-[28px] ${
              isFireActive
                ? "bg-red-500 text-white shadow-[0_0_16px_rgba(239,68,68,0.8)] border-red-300 scale-95"
                : "bg-gradient-to-r from-red-700 via-red-600 to-red-500 hover:from-red-600 hover:to-red-400 text-white shadow-red-950/50 border-red-400/60"
            }`}
            title="Przewiń stronę tekstu / FIRE (Wciska SPACE + RETURN + Joy 1/2 Fire)"
          >
            <span className="text-xs">🕹️</span>
            <span className="tracking-wide">DALEJ (FIRE)</span>
          </button>

          {/* Screenshot */}
          <button
            id="btn-screenshot"
            onClick={handleScreenshot}
            className="flex items-center justify-center w-[28px] h-[28px] rounded bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white border border-[#30363d] cursor-pointer"
            title="Take Screenshot"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen */}
          <button
            id="btn-fullscreen"
            onClick={handleToggleFullscreen}
            className="flex items-center justify-center w-[28px] h-[28px] rounded bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white border border-[#30363d] cursor-pointer"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main CRT Monitor Bezel Container */}
      <div
        ref={containerRef}
        tabIndex={0}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative w-full bg-[#03060a] transition-all outline-none flex flex-col justify-between ${
          isFullscreen
            ? "fixed inset-0 z-50 p-2 sm:p-4 max-w-none h-screen w-screen rounded-none border-none overflow-hidden"
            : `max-w-4xl p-3 sm:p-5 rounded-2xl border-4 border-[#2b2f3a] shadow-2xl ${
                crtCurvature ? "crt-curvature" : ""
              }`
        } ${isDragOver ? "ring-4 ring-[#1f6feb]" : ""}`}
      >
        {/* CRT Bezel Label (Hidden or minimal in fullscreen to give maximum viewport to CRT) */}
        <div
          className={`flex items-center justify-between text-[10px] text-[#484f58] uppercase font-bold tracking-widest px-2 select-none shrink-0 ${
            isFullscreen ? "mb-1" : "mb-2"
          }`}
        >
          <span>COMMODORE COLOR MONITOR 1702</span>
          <span className="flex items-center gap-2">
            {isFullscreen && (
              <button
                onClick={handleToggleFullscreen}
                className="text-[10px] bg-[#21262d] hover:bg-[#30363d] text-gray-300 px-2 py-0.5 rounded border border-[#30363d] cursor-pointer"
              >
                Wyjdź z Pełnego Ekranu [ESC]
              </button>
            )}
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ff0000]"></span>
            POWER
          </span>
        </div>

        {/* The Screen Canvas Area (Click anywhere to advance / fire) */}
        <div
          onClick={handleFireNext}
          className={`crt-screen-container relative bg-black w-full flex items-center justify-center cursor-pointer select-none transition-all ${
            isFullscreen ? "flex-1 min-h-0 aspect-[384/272] max-h-full mx-auto" : "aspect-[384/272]"
          } ${scanlines ? "crt-scanlines" : ""} ${crtGlow ? "crt-glow" : ""} ${
            isFireActive ? "ring-2 ring-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.4)]" : ""
          }`}
          title="Kliknij lub dotknij ekran, aby przejść dalej / strzał (SPACE + RETURN + Joy Fire)"
        >
          <canvas
            ref={canvasRef}
            width={384}
            height={272}
            className="w-full h-full object-contain [image-rendering:pixelated]"
          />

          {/* Quick Click/Touch Ripple Feedback Indicator */}
          {isFireActive && (
            <div className="absolute inset-0 bg-red-500/10 pointer-events-none flex items-center justify-center animate-pulse">
              <div className="bg-red-600/90 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded shadow-lg tracking-wider border border-red-400">
                ▶ NEXT (SPACE / RETURN / FIRE)
              </div>
            </div>
          )}

          {/* Mode Switch Toast Notification */}
          {modeNotice && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#0d1117]/95 border border-[#1f6feb] text-white text-xs px-4 py-2 rounded-lg shadow-2xl z-40 flex items-center gap-2 pointer-events-none animate-in fade-in zoom-in duration-150">
              <Keyboard className="w-4 h-4 text-[#58a6ff]" />
              <span>{modeNotice}</span>
            </div>
          )}

          {/* Drag & Drop File Overlay */}
          {isDragOver && (
            <div className="absolute inset-0 bg-[#1f6feb]/80 backdrop-blur-sm flex flex-col items-center justify-center text-white z-30 pointer-events-none">
              <UploadCloud className="w-16 h-16 mb-2 animate-bounce" />
              <div className="text-lg font-bold">DROP COMMODORE 64 MEDIA HERE</div>
              <div className="text-xs text-blue-100">
                Supports .D64, .PRG, .CRT, .T64, .TAP, .BAS or .ZIP archives
              </div>
            </div>
          )}
        </div>

        {/* Live Bottom Telemetry HUD */}
        <div
          className={`bg-[#0d1117] rounded-lg p-2 sm:p-2.5 border border-[#30363d] flex flex-wrap items-center justify-between text-[11px] font-mono text-[#8b949e] gap-2 shrink-0 ${
            isFullscreen ? "mt-1.5" : "mt-3"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-white font-bold">
              FPS: <span className="text-[#58a6ff]">{typeof telemetry.fps === "number" ? telemetry.fps.toFixed(1) : telemetry.fps}</span>
            </span>
            <span>
              RASTER: <span className="text-yellow-400">{telemetry.rasterLine}</span>
            </span>
            <span>
              MODE: <span className="text-green-400">{telemetry.videoMode}</span>
            </span>
            <span className="hidden sm:inline">
              KBD:{" "}
              <span className={keyboardMode === "text_pure" ? "text-[#58a6ff] font-bold" : "text-[#d29922] font-bold"}>
                {keyboardMode === "text_pure" ? "PURE MATRIX" : "JOY SHARED"}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span>
              PC: <span className="text-purple-400">${telemetry.pc.toString(16).padStart(4, "0").toUpperCase()}</span>
            </span>
            <span>
              A: <span className="text-white">${telemetry.a.toString(16).padStart(2, "0").toUpperCase()}</span>
            </span>
            <span>
              X: <span className="text-white">${telemetry.x.toString(16).padStart(2, "0").toUpperCase()}</span>
            </span>
            <span>
              Y: <span className="text-white">${telemetry.y.toString(16).padStart(2, "0").toUpperCase()}</span>
            </span>
            <span>
              FLAGS: <span className="text-blue-300 font-bold">{telemetry.flags}</span>
            </span>
          </div>
        </div>
      </div>

      {/* On-Screen Virtual Touch / Mouse Joystick (Optional for Touch/Mobile) */}
      {showVirtualJoystick && (
        <div className="mt-4 p-4 bg-[#161b22] border border-[#30363d] rounded-xl flex items-center justify-center gap-8 select-none">
          {/* Directional Pad */}
          <div className="relative w-32 h-32 bg-[#0d1117] rounded-full border border-[#30363d] p-2 flex items-center justify-center">
            {/* Up */}
            <button
              onMouseDown={() => { system.cia1.joy1 &= ~0x01; system.cia1.joy2 &= ~0x01; }}
              onMouseUp={() => { system.cia1.joy1 |= 0x01; system.cia1.joy2 |= 0x01; }}
              onTouchStart={() => { system.cia1.joy1 &= ~0x01; system.cia1.joy2 &= ~0x01; }}
              onTouchEnd={() => { system.cia1.joy1 |= 0x01; system.cia1.joy2 |= 0x01; }}
              className="absolute top-1 w-10 h-10 rounded bg-[#21262d] active:bg-[#1f6feb] text-white font-bold flex items-center justify-center border border-[#30363d]"
            >
              ▲
            </button>
            {/* Down */}
            <button
              onMouseDown={() => { system.cia1.joy1 &= ~0x02; system.cia1.joy2 &= ~0x02; }}
              onMouseUp={() => { system.cia1.joy1 |= 0x02; system.cia1.joy2 |= 0x02; }}
              onTouchStart={() => { system.cia1.joy1 &= ~0x02; system.cia1.joy2 &= ~0x02; }}
              onTouchEnd={() => { system.cia1.joy1 |= 0x02; system.cia1.joy2 |= 0x02; }}
              className="absolute bottom-1 w-10 h-10 rounded bg-[#21262d] active:bg-[#1f6feb] text-white font-bold flex items-center justify-center border border-[#30363d]"
            >
              ▼
            </button>
            {/* Left */}
            <button
              onMouseDown={() => { system.cia1.joy1 &= ~0x04; system.cia1.joy2 &= ~0x04; }}
              onMouseUp={() => { system.cia1.joy1 |= 0x04; system.cia1.joy2 |= 0x04; }}
              onTouchStart={() => { system.cia1.joy1 &= ~0x04; system.cia1.joy2 &= ~0x04; }}
              onTouchEnd={() => { system.cia1.joy1 |= 0x04; system.cia1.joy2 |= 0x04; }}
              className="absolute left-1 w-10 h-10 rounded bg-[#21262d] active:bg-[#1f6feb] text-white font-bold flex items-center justify-center border border-[#30363d]"
            >
              ◀
            </button>
            {/* Right */}
            <button
              onMouseDown={() => { system.cia1.joy1 &= ~0x08; system.cia1.joy2 &= ~0x08; }}
              onMouseUp={() => { system.cia1.joy1 |= 0x08; system.cia1.joy2 |= 0x08; }}
              onTouchStart={() => { system.cia1.joy1 &= ~0x08; system.cia1.joy2 &= ~0x08; }}
              onTouchEnd={() => { system.cia1.joy1 |= 0x08; system.cia1.joy2 |= 0x08; }}
              className="absolute right-1 w-10 h-10 rounded bg-[#21262d] active:bg-[#1f6feb] text-white font-bold flex items-center justify-center border border-[#30363d]"
            >
              ▶
            </button>
          </div>

          {/* Fire Button */}
          <div className="flex flex-col items-center gap-1">
            <button
              onMouseDown={() => { system.cia1.joy1 &= ~0x10; system.cia1.joy2 &= ~0x10; }}
              onMouseUp={() => { system.cia1.joy1 |= 0x10; system.cia1.joy2 |= 0x10; }}
              onTouchStart={() => { system.cia1.joy1 &= ~0x10; system.cia1.joy2 &= ~0x10; }}
              onTouchEnd={() => { system.cia1.joy1 |= 0x10; system.cia1.joy2 |= 0x10; }}
              className="w-16 h-16 rounded-full bg-red-600 active:bg-red-400 text-white font-bold shadow-lg shadow-red-500/30 border-2 border-red-400 flex items-center justify-center text-sm"
            >
              FIRE
            </button>
            <span className="text-[10px] text-[#8b949e]">Joystick Fire</span>
          </div>
        </div>
      )}
    </div>
  );
};
