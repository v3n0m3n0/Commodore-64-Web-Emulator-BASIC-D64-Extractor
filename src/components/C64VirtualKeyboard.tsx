/**
 * Authentic 66-Key Commodore 64 Virtual Mechanical Keyboard
 * Features classic breadbin key styling, PETSCII graphics overlays,
 * Commodore (C=) key, RUN/STOP, RESTORE, Function keys F1-F8, and cursor controls.
 */

import React, { useState } from "react";
import { C64System } from "../c64/c64_system";
import { C64Keyboard } from "../c64/c64_keyboard";

interface C64VirtualKeyboardProps {
  system: C64System;
}

export const C64VirtualKeyboard: React.FC<C64VirtualKeyboardProps> = ({ system }) => {
  const [showPetscii, setShowPetscii] = useState(false);
  const [showPolishKeys, setShowPolishKeys] = useState(true);

  // Key press action helper (Authentic 120ms matrix hold for KERNAL SCNKEY)
  const handleKeyPress = (code: string, key?: string) => {
    system.keyboard.onKeyDown(code, key);
    if (system.keyboardMode === "game_shared") {
      if (code === "Space" || code === "Enter" || code === "NumpadEnter") {
        system.cia1.joy1 &= ~0x10;
        system.cia1.joy2 &= ~0x10;
      }
    }
    setTimeout(() => {
      system.keyboard.onKeyUp(code, key);
      if (system.keyboardMode === "game_shared") {
        if (code === "Space" || code === "Enter" || code === "NumpadEnter") {
          system.cia1.joy1 |= 0x10;
          system.cia1.joy2 |= 0x10;
        }
      }
    }, 120);
  };

  const handlePolishChar = (char: string) => {
    const p = C64Keyboard.POLISH_DIACRITICS[char];
    if (p) {
      handleKeyPress(p.code, char);
    }
  };

  return (
    <div className="bg-[#161b22] border-t border-[#30363d] p-3 flex flex-col items-center select-none shadow-inner">
      {/* Keyboard Controls Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-2 text-xs text-[#8b949e]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white uppercase text-[11px]">COMMODORE 64 MATRIX KEYBOARD</span>
          <span className="text-[10px] bg-[#21262d] px-1.5 py-0.5 rounded text-[#8b949e]">66-KEY BREADBIN</span>
          <span className="text-[10px] bg-[#1f6feb]/20 text-[#58a6ff] px-1.5 py-0.5 rounded font-mono font-bold">
            {system.keyboardMode === "text_pure" ? "TRYB: ⌨️" : "TRYB: 🕹️+⌨️"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPolishKeys(!showPolishKeys)}
            className={`px-2.5 py-1 rounded text-xs border transition-all ${
              showPolishKeys
                ? "bg-[#238636] text-white border-[#238636]"
                : "bg-[#21262d] text-[#8b949e] border-[#30363d] hover:text-white"
            }`}
          >
            {showPolishKeys ? "Ukryj Polskie Litery" : "Pokaż Polskie Litery (PL)"}
          </button>
          <button
            onClick={() => setShowPetscii(!showPetscii)}
            className={`px-2.5 py-1 rounded text-xs border transition-all ${
              showPetscii
                ? "bg-[#1f6feb] text-white border-[#1f6feb]"
                : "bg-[#21262d] text-[#8b949e] border-[#30363d] hover:text-white"
            }`}
          >
            {showPetscii ? "Ukryj PETSCII" : "Pokaż PETSCII"}
          </button>
        </div>
      </div>

      {/* Polish Diacritics Quick Bar */}
      {showPolishKeys && (
        <div className="max-w-4xl w-full bg-[#13110f] px-3 py-1.5 mb-2 rounded-lg border border-[#3e342a] flex items-center justify-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-[#d29922] uppercase mr-1">PL Diakrytyki:</span>
          {["Ą", "Ć", "Ę", "Ł", "Ń", "Ó", "Ś", "Ź", "Ż"].map((pl) => (
            <button
              key={pl}
              onClick={() => handlePolishChar(pl)}
              className="px-2.5 py-1 bg-[#3a3028] hover:bg-[#524438] active:bg-[#251f1a] text-amber-200 text-xs font-bold rounded border border-[#524438] transition-transform active:scale-95 cursor-pointer shadow"
              title={`Wpisz znak ${pl} (Mapowane na klawiaturę matrycy C64)`}
            >
              {pl}
            </button>
          ))}
        </div>
      )}

      {/* 5-Row Keyboard Matrix */}
      <div className="max-w-4xl w-full bg-[#1c1815] p-3 sm:p-4 rounded-xl border-2 border-[#2b2520] shadow-2xl flex flex-col gap-1.5">
        {/* Row 1: Left Arrow, 1-9, 0, +, -, £, HOME, DEL, F1, F3 */}
        <div className="flex items-center gap-1 sm:gap-1.5 justify-center">
          <KeyBtn label="←" code="ArrowLeft" onClick={handleKeyPress} sub={showPetscii ? "─" : undefined} />
          <KeyBtn label="1" code="Digit1" onClick={handleKeyPress} sub="!" />
          <KeyBtn label="2" code="Digit2" onClick={handleKeyPress} sub='"' />
          <KeyBtn label="3" code="Digit3" onClick={handleKeyPress} sub="#" />
          <KeyBtn label="4" code="Digit4" onClick={handleKeyPress} sub="$" />
          <KeyBtn label="5" code="Digit5" onClick={handleKeyPress} sub="%" />
          <KeyBtn label="6" code="Digit6" onClick={handleKeyPress} sub="&" />
          <KeyBtn label="7" code="Digit7" onClick={handleKeyPress} sub="'" />
          <KeyBtn label="8" code="Digit8" onClick={handleKeyPress} sub="(" />
          <KeyBtn label="9" code="Digit9" onClick={handleKeyPress} sub=")" />
          <KeyBtn label="0" code="Digit0" onClick={handleKeyPress} />
          <KeyBtn label="+" code="Equal" onClick={handleKeyPress} />
          <KeyBtn label="-" code="Minus" onClick={handleKeyPress} />
          <KeyBtn label="£" code="BracketRight" onClick={handleKeyPress} />
          <KeyBtn label="CLR/HOME" code="Home" onClick={handleKeyPress} width="w-14 sm:w-16" bg="bg-[#2d2822]" />
          <KeyBtn label="INST/DEL" code="Delete" onClick={handleKeyPress} width="w-14 sm:w-16" bg="bg-[#2d2822]" />
          <KeyBtn label="F1" code="F1" onClick={handleKeyPress} bg="bg-[#4a3b32]" width="w-10 sm:w-12" />
        </div>

        {/* Row 2: CTRL, Q, W, E, R, T, Y, U, I, O, P, @, *, ^, RESTORE, F3 */}
        <div className="flex items-center gap-1 sm:gap-1.5 justify-center">
          <KeyBtn label="CTRL" code="ControlLeft" onClick={handleKeyPress} width="w-12 sm:w-14" bg="bg-[#2d2822]" />
          <KeyBtn label="Q" code="KeyQ" onClick={handleKeyPress} sub={showPetscii ? "●" : undefined} />
          <KeyBtn label="W" code="KeyW" onClick={handleKeyPress} sub={showPetscii ? "○" : undefined} />
          <KeyBtn label="E" code="KeyE" onClick={handleKeyPress} sub={showPetscii ? "◤" : undefined} />
          <KeyBtn label="R" code="KeyR" onClick={handleKeyPress} sub={showPetscii ? "◥" : undefined} />
          <KeyBtn label="T" code="KeyT" onClick={handleKeyPress} sub={showPetscii ? "│" : undefined} />
          <KeyBtn label="Y" code="KeyY" onClick={handleKeyPress} sub={showPetscii ? "─" : undefined} />
          <KeyBtn label="U" code="KeyU" onClick={handleKeyPress} sub={showPetscii ? "┌" : undefined} />
          <KeyBtn label="I" code="KeyI" onClick={handleKeyPress} sub={showPetscii ? "┐" : undefined} />
          <KeyBtn label="O" code="KeyO" onClick={handleKeyPress} sub={showPetscii ? "└" : undefined} />
          <KeyBtn label="P" code="KeyP" onClick={handleKeyPress} sub={showPetscii ? "┘" : undefined} />
          <KeyBtn label="@" code="BracketLeft" onClick={handleKeyPress} />
          <KeyBtn label="*" code="Quote" onClick={handleKeyPress} />
          <KeyBtn label="↑" code="ArrowUp" onClick={handleKeyPress} />
          <KeyBtn label="RESTORE" code="Escape" onClick={() => system.reset()} width="w-14 sm:w-16" bg="bg-[#3a201b]" />
          <KeyBtn label="F3" code="F3" onClick={handleKeyPress} bg="bg-[#4a3b32]" width="w-10 sm:w-12" />
        </div>

        {/* Row 3: RUN/STOP, SHIFT LOCK, A, S, D, F, G, H, J, K, L, :, ;, =, RETURN, F5 */}
        <div className="flex items-center gap-1 sm:gap-1.5 justify-center">
          <KeyBtn label="RUN/STOP" code="Escape" onClick={handleKeyPress} width="w-16 sm:w-20" bg="bg-[#3a201b]" />
          <KeyBtn label="A" code="KeyA" onClick={handleKeyPress} sub={showPetscii ? "♠" : undefined} />
          <KeyBtn label="S" code="KeyS" onClick={handleKeyPress} sub={showPetscii ? "♥" : undefined} />
          <KeyBtn label="D" code="KeyD" onClick={handleKeyPress} sub={showPetscii ? "♦" : undefined} />
          <KeyBtn label="F" code="KeyF" onClick={handleKeyPress} sub={showPetscii ? "♣" : undefined} />
          <KeyBtn label="G" code="KeyG" onClick={handleKeyPress} sub={showPetscii ? "█" : undefined} />
          <KeyBtn label="H" code="KeyH" onClick={handleKeyPress} sub={showPetscii ? "▄" : undefined} />
          <KeyBtn label="J" code="KeyJ" onClick={handleKeyPress} sub={showPetscii ? "▌" : undefined} />
          <KeyBtn label="K" code="KeyK" onClick={handleKeyPress} sub={showPetscii ? "▐" : undefined} />
          <KeyBtn label="L" code="KeyL" onClick={handleKeyPress} sub={showPetscii ? "░" : undefined} />
          <KeyBtn label=":" code="Semicolon" onClick={handleKeyPress} />
          <KeyBtn label=";" code="Backslash" onClick={handleKeyPress} />
          <KeyBtn label="=" code="Slash" onClick={handleKeyPress} />
          <KeyBtn label="RETURN" code="Enter" onClick={handleKeyPress} width="w-14 sm:w-16" bg="bg-[#2d2822]" />
          <KeyBtn label="F5" code="F5" onClick={handleKeyPress} bg="bg-[#4a3b32]" width="w-10 sm:w-12" />
        </div>

        {/* Row 4: C= (Commodore), L.SHIFT, Z, X, C, V, B, N, M, ,, ., /, R.SHIFT, CRSR U/D, CRSR L/R, F7 */}
        <div className="flex items-center gap-1 sm:gap-1.5 justify-center">
          <KeyBtn label="C=" code="Tab" onClick={handleKeyPress} width="w-12 sm:w-14" bg="bg-[#3a201b]" />
          <KeyBtn label="SHIFT" code="ShiftLeft" onClick={handleKeyPress} width="w-12 sm:w-14" bg="bg-[#2d2822]" />
          <KeyBtn label="Z" code="KeyZ" onClick={handleKeyPress} sub={showPetscii ? "◄" : undefined} />
          <KeyBtn label="X" code="KeyX" onClick={handleKeyPress} sub={showPetscii ? "►" : undefined} />
          <KeyBtn label="C" code="KeyC" onClick={handleKeyPress} sub={showPetscii ? "▲" : undefined} />
          <KeyBtn label="V" code="KeyV" onClick={handleKeyPress} sub={showPetscii ? "▼" : undefined} />
          <KeyBtn label="B" code="KeyB" onClick={handleKeyPress} />
          <KeyBtn label="N" code="KeyN" onClick={handleKeyPress} />
          <KeyBtn label="M" code="KeyM" onClick={handleKeyPress} />
          <KeyBtn label="," code="Comma" onClick={handleKeyPress} sub="<" />
          <KeyBtn label="." code="Period" onClick={handleKeyPress} sub=">" />
          <KeyBtn label="/" code="SlashNumpad" onClick={handleKeyPress} sub="?" />
          <KeyBtn label="SHIFT" code="ShiftRight" onClick={handleKeyPress} width="w-12 sm:w-14" bg="bg-[#2d2822]" />
          <KeyBtn label="CRSR ↕" code="ArrowDown" onClick={handleKeyPress} width="w-12 sm:w-14" bg="bg-[#2d2822]" />
          <KeyBtn label="CRSR ↔" code="ArrowRight" onClick={handleKeyPress} width="w-12 sm:w-14" bg="bg-[#2d2822]" />
          <KeyBtn label="F7" code="F7" onClick={handleKeyPress} bg="bg-[#4a3b32]" width="w-10 sm:w-12" />
        </div>

        {/* Row 5: SPACE BAR */}
        <div className="flex items-center justify-center">
          <button
            onClick={() => handleKeyPress("Space")}
            className="w-80 sm:w-96 h-9 sm:h-10 bg-[#352f28] hover:bg-[#423b32] active:bg-[#28231d] rounded-md border-b-4 border-[#1f1b17] text-white text-xs font-bold shadow-md transition-transform active:translate-y-0.5"
          >
            SPACE BAR
          </button>
        </div>
      </div>
    </div>
  );
};

// Reusable Mechanical Key Button Component
const KeyBtn: React.FC<{
  label: string;
  code: string;
  onClick: (code: string) => void;
  sub?: string;
  width?: string;
  bg?: string;
}> = ({ label, code, onClick, sub, width = "w-8 sm:w-10", bg = "bg-[#352f28]" }) => {
  return (
    <button
      onClick={() => onClick(code)}
      className={`${width} h-9 sm:h-10 ${bg} hover:brightness-110 active:brightness-75 rounded-md border-b-4 border-[#1f1b17] text-[#e8dfd8] flex flex-col items-center justify-center shadow-md transition-transform active:translate-y-0.5 relative select-none`}
    >
      <span className="text-[10px] sm:text-xs font-bold leading-none">{label}</span>
      {sub && <span className="text-[8px] text-[#a09489] leading-none mt-0.5">{sub}</span>}
    </button>
  );
};
