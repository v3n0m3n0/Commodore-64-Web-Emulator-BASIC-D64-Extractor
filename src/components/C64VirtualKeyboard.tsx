/**
 * Authentic Commodore 64 Virtual Mechanical Keyboard Layout
 * Strictly matches official C64 hardware keycap printing and c64-layout.png specifications.
 * 
 * Features:
 * - Exact key legends and dual front/bottom PETSCII pictograms (Commodore C= on Left, SHIFT on Right)
 * - Authentic Commodore 64 light beige breadbin keycap aesthetic with 3D bevels
 * - Simplified control bar: ONLY "Symbole PETSCII" and "Polskie Znaki" toggles
 * - Polish diacritic character bar (Ą, Ć, Ę, Ł, Ń, Ó, Ś, Ź, Ż)
 * - Accurate CIA 1 matrix scanning and instant PETSCII buffer injection
 */

import React, { useState } from "react";
import { C64System } from "../c64/c64_system";
import { C64Keyboard } from "../c64/c64_keyboard";
import { PetsciiIcon, PetsciiGlyphType } from "./PetsciiIcon";

export type KeyboardTheme = "emulator" | "classic";

interface KeyboardThemeContextType {
  theme: KeyboardTheme;
  showPetscii: boolean;
  effectiveShift: boolean;
  isCbmActive: boolean;
  isCtrlActive: boolean;
}

const KeyboardThemeContext = React.createContext<KeyboardThemeContextType>({
  theme: "emulator",
  showPetscii: true,
  effectiveShift: false,
  isCbmActive: false,
  isCtrlActive: false,
});

interface C64VirtualKeyboardProps {
  system: C64System;
}

export const C64VirtualKeyboard: React.FC<C64VirtualKeyboardProps> = ({ system }) => {
  const [keyboardTheme, setKeyboardTheme] = useState<KeyboardTheme>("emulator");
  const [showPetscii, setShowPetscii] = useState(true);
  const [showPolishKeys, setShowPolishKeys] = useState(false);

  // Interactive modifier states
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [isShiftLock, setIsShiftLock] = useState(false);
  const [isCbmActive, setIsCbmActive] = useState(false);
  const [isCtrlActive, setIsCtrlActive] = useState(false);

  const effectiveShift = isShiftActive || isShiftLock;
  const isEmulator = keyboardTheme === "emulator";

  // Key press handler with authentic CIA 1 matrix scanning and KERNAL SCNKEY delay
  const handleKeyClick = (
    code: string,
    col: number,
    row: number,
    petsciiNormal?: number,
    petsciiShift?: number,
    petsciiCbm?: number,
    petsciiCtrl?: number
  ) => {
    // 1. Determine active modifier state
    const useShift = effectiveShift;
    const useCbm = isCbmActive;
    const useCtrl = isCtrlActive;

    // 2. Press matrix chord on CIA 1 (Authentic 8x8 Hardware Matrix scanning via KERNAL SCNKEY)
    system.keyboard.pressChord(
      col,
      row,
      { shift: useShift, cbm: useCbm, ctrl: useCtrl },
      120
    );

    // 3. Handle shared joystick fire pulse if in game_shared mode
    if (system.keyboardMode === "game_shared") {
      if (code === "Space" || code === "Enter" || code === "NumpadEnter") {
        system.cia1.joy1 &= ~0x10;
        system.cia1.joy2 &= ~0x10;
        setTimeout(() => {
          system.cia1.joy1 |= 0x10;
          system.cia1.joy2 |= 0x10;
        }, 120);
      }
    }

    // 4. If non-locked modifiers were active, clear single-shot toggles
    if (isShiftActive && !isShiftLock) setIsShiftActive(false);
    if (isCbmActive) setIsCbmActive(false);
    if (isCtrlActive) setIsCtrlActive(false);
  };

  // Dedicated RESTORE key press (NMI interrupt)
  const handleRestore = () => {
    system.triggerRestore();
  };

  // Polish diacritic quick input
  const handlePolishChar = (char: string) => {
    const p = C64Keyboard.POLISH_DIACRITICS[char];
    if (p) {
      system.keyboard.pressChord(p.col, p.row, { shift: effectiveShift }, 120);
      if (isShiftActive && !isShiftLock) setIsShiftActive(false);
    }
  };

  return (
    <KeyboardThemeContext.Provider
      value={{
        theme: keyboardTheme,
        showPetscii,
        effectiveShift,
        isCbmActive,
        isCtrlActive,
      }}
    >
      <div id="c64-virtual-keyboard" className="bg-[#121110] border-t border-[#2d2822] p-2 sm:p-3 flex flex-col items-center select-none shadow-2xl">
        {/* Header Toolbar: Theme switcher, PETSCII toggle, Polish characters toggle */}
        <div className="w-full max-w-5xl flex items-center justify-between mb-2 text-xs text-[#a09489] flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[#e6ded8] tracking-wider text-[11px] uppercase flex items-center gap-1.5 bg-[#251f1a] px-2.5 py-1 rounded border border-[#3e342a]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              COMMODORE 64
            </span>

            {/* Keyboard Appearance / Theme Mode Selector */}
            <div className="flex items-center gap-1 bg-[#1e1915] p-0.5 rounded-lg border border-[#3e342a]">
              <button
                id="theme-btn-emulator"
                onClick={() => setKeyboardTheme("emulator")}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isEmulator
                    ? "bg-[#382d23] text-amber-200 border border-[#5a4838] shadow-xs"
                    : "text-[#8e8174] hover:text-[#e0d6cc]"
                }`}
                title="Kompaktowy styl dopasowany do ciemnego motywu emulatora"
              >
                <span>Kompaktowy (Studio)</span>
              </button>
              <button
                id="theme-btn-classic"
                onClick={() => setKeyboardTheme("classic")}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  !isEmulator
                    ? "bg-[#dcd8d0] text-[#1c1814] border border-[#a8a094] shadow-xs"
                    : "text-[#8e8174] hover:text-[#e0d6cc]"
                }`}
                title="Klasyczny beżowy układ klawiatury Commodore 64"
              >
                <span>Klasyczny C64</span>
              </button>
            </div>
          </div>

          {/* Action Toggles: "Symbole PETSCII" and "Polskie Znaki" */}
          <div className="flex items-center gap-2">
            <button
              id="toggle-petscii-symbols"
              onClick={() => setShowPetscii(!showPetscii)}
              className={`px-3 py-1 rounded-md text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                showPetscii
                  ? "bg-[#1f6feb] text-white border-[#388bfd] shadow-sm ring-1 ring-[#388bfd]/50"
                  : "bg-[#251f1a] text-[#c0b3a7] border-[#3e342a] hover:text-white hover:border-[#5a4d3f]"
              }`}
              title="Włącz lub wyłącz nakładanie symboli PETSCII na klawisze wirtualnej klawiatury"
            >
              <span>Symbole PETSCII</span>
              <span
                className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                  showPetscii ? "bg-black/30 text-white" : "bg-[#352d26] text-[#8b7d71]"
                }`}
              >
                {showPetscii ? "WŁ" : "WYŁ"}
              </span>
            </button>

            <button
              id="toggle-polish-keys"
              onClick={() => setShowPolishKeys(!showPolishKeys)}
              className={`px-3 py-1 rounded-md text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                showPolishKeys
                  ? "bg-[#238636] text-white border-[#2ea043] shadow-sm ring-1 ring-[#2ea043]/50"
                  : "bg-[#251f1a] text-[#c0b3a7] border-[#3e342a] hover:text-white hover:border-[#5a4d3f]"
              }`}
              title="Pokaż pasek szybkiego wprowadzania polskich znaków diakrytycznych"
            >
              <span>Polskie Znaki</span>
              <span
                className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                  showPolishKeys ? "bg-black/30 text-white" : "bg-[#352d26] text-[#8b7d71]"
                }`}
              >
                {showPolishKeys ? "WŁ" : "WYŁ"}
              </span>
            </button>
          </div>
        </div>

        {/* Polish Diacritics Bar (Collapsible via "Polskie Znaki" toggle) */}
        {showPolishKeys && (
          <div id="polish-diacritics-bar" className="max-w-5xl w-full bg-[#1b1714] px-3 py-2 mb-2 rounded-lg border border-[#3e3227] flex items-center justify-between gap-2 flex-wrap shadow-inner animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#d29922] uppercase tracking-wider">Polskie Litery:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {["Ą", "Ć", "Ę", "Ł", "Ń", "Ó", "Ś", "Ź", "Ż"].map((pl) => (
                  <button
                    key={pl}
                    id={`polish-key-${pl}`}
                    onClick={() => handlePolishChar(pl)}
                    className="w-7 h-7 bg-[#2e261f] hover:bg-[#45392e] active:bg-[#1a1511] text-amber-100 text-xs font-bold rounded border border-[#483b30] flex items-center justify-center transition-transform active:scale-95 shadow cursor-pointer"
                    title={`Wpisz znak ${pl} (zgodnie ze standardem C64)`}
                  >
                    {pl}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-[10px] text-[#8b7d71]">Dostępne również z klawiatury fizycznej (Alt+litera)</span>
          </div>
        )}

        {/* 5-Row Commodore 64 Authentic Keyboard Case conforming exactly to c64-layout.png */}
        <div className="w-full overflow-x-auto pb-1 flex justify-center">
          <div
            className={`min-w-[700px] max-w-5xl w-full transition-colors duration-200 ${
              isEmulator
                ? "bg-[#171310] p-2 sm:p-2.5 rounded-xl border-2 border-[#382f25] shadow-2xl flex flex-col gap-1 sm:gap-1.5 ring-1 ring-black/70"
                : "bg-[#dcd8d0] p-2.5 sm:p-4 rounded-xl border-4 border-[#555048] shadow-2xl flex flex-col gap-1.5 sm:gap-2"
            }`}
          >
            {/* ROW 1: Left Arrow, 1-9, 0, +, -, £, CLR/HOME, INST/DEL  |  F1/F2 */}
            <div className="flex items-center gap-1 sm:gap-1.5 justify-center">
            <C64Key
              main="←"
            code="ArrowLeft"
            col={7}
            row={1}
            petscii={0x5f}
            shiftPetscii={0x5f}
            cbmPetscii={0xa2}
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="!"
            main="1"
            rightText="BLK"
            code="Digit1"
            col={7}
            row={0}
            petscii={0x31}
            shiftPetscii={0x21}
            cbmPetscii={0x81}
            ctrlPetscii={0x90}
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top='"'
            main="2"
            rightText="WHT"
            code="Digit2"
            col={7}
            row={3}
            petscii={0x32}
            shiftPetscii={0x22}
            cbmPetscii={0x95}
            ctrlPetscii={0x05}
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="#"
            main="3"
            rightText="RED"
            code="Digit3"
            col={1}
            row={0}
            petscii={0x33}
            shiftPetscii={0x23}
            cbmPetscii={0x96}
            ctrlPetscii={0x1c}
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="$"
            main="4"
            rightText="CYN"
            code="Digit4"
            col={1}
            row={3}
            petscii={0x34}
            shiftPetscii={0x24}
            cbmPetscii={0x97}
            ctrlPetscii={0x9f}
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="%"
            main="5"
            rightText="PUR"
            code="Digit5"
            col={2}
            row={0}
            petscii={0x35}
            shiftPetscii={0x25}
            cbmPetscii={0x98}
            ctrlPetscii={0x9c}
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="&"
            main="6"
            rightText="GRN"
            code="Digit6"
            col={2}
            row={3}
            petscii={0x36}
            shiftPetscii={0x26}
            cbmPetscii={0x99}
            ctrlPetscii={0x1e}
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="'"
            main="7"
            rightText="BLU"
            code="Digit7"
            col={3}
            row={0}
            petscii={0x37}
            shiftPetscii={0x27}
            cbmPetscii={0x9a}
            ctrlPetscii={0x1f}
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="("
            main="8"
            rightText="YEL"
            code="Digit8"
            col={3}
            row={3}
            petscii={0x38}
            shiftPetscii={0x28}
            cbmPetscii={0x9b}
            ctrlPetscii={0x9e}
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top=")"
            main="9"
            rightTextLines={["RVS", "ON"]}
            code="Digit9"
            col={4}
            row={0}
            petscii={0x39}
            shiftPetscii={0x29}
            cbmPetscii={0x12}
            ctrlPetscii={0x12}
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            main="0"
            rightTextLines={["RVS", "OFF"]}
            code="Digit0"
            col={4}
            row={3}
            petscii={0x30}
            shiftPetscii={0x30}
            cbmPetscii={0x92}
            ctrlPetscii={0x92}
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="+"
            code="Equal"
            col={5}
            row={0}
            petscii={0x2b}
            shiftPetscii={0xdb}
            cbmPetscii={0xa6}
            leftGlyph="chk_4x4"
            rightGlyph="cross_plus"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="-"
            code="Minus"
            col={5}
            row={3}
            petscii={0x2d}
            shiftPetscii={0xdd}
            cbmPetscii={0xdc}
            leftGlyph="vert_split"
            rightGlyph="vert_line_split"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="£"
            code="BracketRight"
            col={6}
            row={0}
            petscii={0x5c}
            shiftPetscii={0xde}
            cbmPetscii={0xa8}
            leftGlyph="stipple_3dots"
            rightGlyph="tri_top_right"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            stackedTop="CLR"
            stackedBottom="HOME"
            code="Home"
            col={6}
            row={3}
            petscii={0x13}
            shiftPetscii={0x93}
            width="w-11 sm:w-13 md:w-14"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            stackedTop="INST"
            stackedBottom="DEL"
            code="Delete"
            col={0}
            row={0}
            petscii={0x14}
            shiftPetscii={0x94}
            width="w-11 sm:w-13 md:w-14"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />

          {/* Right Function Column: F1 / F2 */}
          <div className="ml-1 sm:ml-2">
            <C64FunctionKey
              top="F1"
              bottom="F2"
              code="F1"
              col={0}
              row={4}
              petscii={0x85}
              shiftPetscii={0x89}
              effectiveShift={effectiveShift}
              onClick={handleKeyClick}
            />
          </div>
        </div>

        {/* ROW 2: CTRL, Q, W, E, R, T, Y, U, I, O, P, @, *, ↑/π, RESTORE  |  F3/F4 */}
        <div className="flex items-center gap-1 sm:gap-1.5 justify-center">
          {/* CTRL Key (Toggleable Modifier) */}
          <button
            id="key-ctrl"
            onClick={() => setIsCtrlActive(!isCtrlActive)}
            className={`w-11 sm:w-14 md:w-15 ${
              isEmulator
                ? "h-[42px] sm:h-[48px] md:h-[52px]"
                : "h-[50px] sm:h-[58px] md:h-[62px]"
            } rounded-lg border-2 border-b-4 flex flex-col items-center justify-center transition-all cursor-pointer shadow-md ${
              isCtrlActive
                ? isEmulator
                  ? "bg-[#388bfd] border-[#1f6feb] border-b-[#094bb7] text-white font-black translate-y-0.5 shadow-md shadow-blue-500/20"
                  : "bg-[#d0c8be] border-[#38332d] border-b-[#1c1a17] text-black font-black translate-y-0.5"
                : isEmulator
                ? "bg-[#201a15] hover:bg-[#2e261f] border-[#3e3226] border-b-[#1a1511] text-[#d6ccc2]"
                : "bg-[#f5f3ef] border-[#8b857a] border-b-[#4a463f] text-[#111111] hover:bg-white"
            }`}
          >
            <span className="text-[10px] sm:text-xs font-black">CTRL</span>
            {isCtrlActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 mt-0.5 animate-pulse" />}
          </button>

          <C64Key
            top="Q"
            code="KeyQ"
            col={7}
            row={6}
            petscii={0x51}
            shiftPetscii={0xd1}
            cbmPetscii={0xab}
            leftGlyph="circle_in_square"
            rightGlyph="solid_circle"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="W"
            code="KeyW"
            col={1}
            row={1}
            petscii={0x57}
            shiftPetscii={0xd7}
            cbmPetscii={0xb3}
            leftGlyph="target_circle"
            rightGlyph="open_circle"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="E"
            code="KeyE"
            col={1}
            row={6}
            petscii={0x45}
            shiftPetscii={0xc5}
            cbmPetscii={0xb1}
            leftGlyph="t_down"
            rightGlyph="bar_top"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="R"
            code="KeyR"
            col={2}
            row={1}
            petscii={0x52}
            shiftPetscii={0xd2}
            cbmPetscii={0xb2}
            leftGlyph="t_up"
            rightGlyph="bar_bottom"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="T"
            code="KeyT"
            col={2}
            row={6}
            petscii={0x54}
            shiftPetscii={0xd4}
            cbmPetscii={0xa3}
            leftGlyph="t_right"
            rightGlyph="bar_left"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="Y"
            code="KeyY"
            col={3}
            row={1}
            petscii={0x59}
            shiftPetscii={0xd9}
            cbmPetscii={0xb7}
            leftGlyph="t_left"
            rightGlyph="bar_right"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="U"
            code="KeyU"
            col={3}
            row={6}
            petscii={0x55}
            shiftPetscii={0xd5}
            cbmPetscii={0xb8}
            leftGlyph="cross_plus"
            rightGlyph="arc_top_right"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="I"
            code="KeyI"
            col={4}
            row={1}
            petscii={0x49}
            shiftPetscii={0xc9}
            cbmPetscii={0xa2}
            leftGlyph="bar_bottom"
            rightGlyph="arc_bottom_right"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="O"
            code="KeyO"
            col={4}
            row={6}
            petscii={0x4f}
            shiftPetscii={0xcf}
            cbmPetscii={0xb9}
            leftGlyph="quad_bl"
            rightGlyph="arc_top_left"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="P"
            code="KeyP"
            col={5}
            row={1}
            petscii={0x50}
            shiftPetscii={0xd0}
            cbmPetscii={0xdf}
            leftGlyph="quad_br"
            rightGlyph="arc_bottom_left"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="@"
            code="BracketLeft"
            col={5}
            row={6}
            petscii={0x40}
            shiftPetscii={0xba}
            cbmPetscii={0xa4}
            leftGlyph="square_outline"
            rightGlyph="bar_mid_h"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="*"
            code="Quote"
            col={6}
            row={1}
            petscii={0x2a}
            shiftPetscii={0xc0}
            cbmPetscii={0xac}
            leftGlyph="tri_bottom_left"
            rightGlyph="bar_mid_h"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="↑"
            main="π"
            code="ArrowUp"
            col={6}
            row={6}
            petscii={0x5e}
            shiftPetscii={0xff}
            cbmPetscii={0xde}
            leftGlyph="tri_top_right"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />

          {/* RESTORE Key (Hardware NMI line) */}
          <button
            id="key-restore"
            onClick={handleRestore}
            className={`w-13 sm:w-16 md:w-18 ${
              isEmulator
                ? "h-[42px] sm:h-[48px] md:h-[52px] bg-[#281b1c] hover:bg-[#382224] active:bg-[#1a1213] border-2 border-[#543235] border-b-4 border-b-[#2e1719] text-[#ff7b72]"
                : "h-[50px] sm:h-[58px] md:h-[62px] bg-[#f5f3ef] hover:bg-white active:bg-[#d5cdc2] border-2 border-[#8b857a] border-b-4 border-b-[#4a463f] text-[#111111]"
            } rounded-lg flex flex-col items-center justify-center transition-transform active:translate-y-0.5 shadow-md cursor-pointer`}
            title="Klawisz RESTORE (Wyzwala przerwanie NMI procesora 6510)"
          >
            <span className="text-[9px] sm:text-[11px] font-black tracking-tight">RESTORE</span>
          </button>

          {/* Right Function Column: F3 / F4 */}
          <div className="ml-1 sm:ml-2">
            <C64FunctionKey
              top="F3"
              bottom="F4"
              code="F3"
              col={0}
              row={5}
              petscii={0x86}
              shiftPetscii={0x8a}
              effectiveShift={effectiveShift}
              onClick={handleKeyClick}
            />
          </div>
        </div>

        {/* ROW 3: RUN/STOP, SHIFT LOCK, A, S, D, F, G, H, J, K, L, [, ], =, RETURN  |  F5/F6 */}
        <div className="flex items-center gap-1 sm:gap-1.5 justify-center">
          <C64Key
            stackedTop="RUN"
            stackedBottom="STOP"
            code="Escape"
            col={7}
            row={7}
            petscii={0x03}
            shiftPetscii={0x83}
            width="w-11 sm:w-13 md:w-14"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />

          {/* SHIFT LOCK (Latching Mechanical Lock) */}
          <button
            id="key-shift-lock"
            onClick={() => setIsShiftLock(!isShiftLock)}
            className={`w-10 sm:w-12 md:w-13 ${
              isEmulator
                ? "h-[42px] sm:h-[48px] md:h-[52px]"
                : "h-[50px] sm:h-[58px] md:h-[62px]"
            } rounded-lg border-2 border-b-4 flex flex-col items-center justify-center transition-all cursor-pointer shadow-md ${
              isShiftLock
                ? isEmulator
                  ? "bg-[#238636] border-[#2ea043] border-b-[#196c2e] text-white font-black translate-y-0.5 shadow-md shadow-green-500/20"
                  : "bg-[#d0c8be] border-[#38332d] border-b-[#1c1a17] text-black font-black translate-y-0.5"
                : isEmulator
                ? "bg-[#201a15] hover:bg-[#2e261f] border-[#3e3226] border-b-[#1a1511] text-[#d6ccc2]"
                : "bg-[#f5f3ef] border-[#8b857a] border-b-[#4a463f] text-[#111111] hover:bg-white"
            }`}
            title="Blokada klawisza SHIFT (Latching Shift Lock)"
          >
            <span className="text-[8px] sm:text-[9px] font-black leading-tight text-center">
              SHIFT
              <br />
              LOCK
            </span>
            {isShiftLock && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5 animate-pulse" />}
          </button>

          <C64Key
            top="A"
            code="KeyA"
            col={1}
            row={2}
            petscii={0x41}
            shiftPetscii={0xc1}
            cbmPetscii={0xb0}
            leftGlyph="tri_top_left"
            rightGlyph="spade"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="S"
            code="KeyS"
            col={1}
            row={5}
            petscii={0x53}
            shiftPetscii={0xd3}
            cbmPetscii={0xae}
            leftGlyph="tri_bottom_left"
            rightGlyph="heart"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="D"
            code="KeyD"
            col={2}
            row={2}
            petscii={0x44}
            shiftPetscii={0xc4}
            cbmPetscii={0xac}
            leftGlyph="bar_mid_h"
            rightGlyph="bar_double_h"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="F"
            code="KeyF"
            col={2}
            row={5}
            petscii={0x46}
            shiftPetscii={0xc6}
            cbmPetscii={0xbb}
            leftGlyph="bar_double_h"
            rightGlyph="bar_mid_h"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="G"
            code="KeyG"
            col={3}
            row={2}
            petscii={0x47}
            shiftPetscii={0xa0}
            cbmPetscii={0xa5}
            leftGlyph="bar_mid_v"
            rightGlyph="bar_double_v"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="H"
            code="KeyH"
            col={3}
            row={5}
            petscii={0x48}
            shiftPetscii={0xc8}
            cbmPetscii={0xb4}
            leftGlyph="bar_double_v"
            rightGlyph="cross_box"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="J"
            code="KeyJ"
            col={4}
            row={2}
            petscii={0x4a}
            shiftPetscii={0xca}
            cbmPetscii={0xb5}
            leftGlyph="angle_bottom_right"
            rightGlyph="arc_bottom_left"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="K"
            code="KeyK"
            col={4}
            row={5}
            petscii={0x4b}
            shiftPetscii={0xcb}
            cbmPetscii={0xa1}
            leftGlyph="angle_top_left"
            rightGlyph="arc_top_right"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="L"
            code="KeyL"
            col={5}
            row={2}
            petscii={0x4c}
            shiftPetscii={0xcc}
            cbmPetscii={0xb6}
            leftGlyph="block_left_half"
            rightGlyph="block_right_half"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="["
            main=":"
            code="Semicolon"
            col={5}
            row={5}
            petscii={0x3a}
            shiftPetscii={0x5b}
            cbmPetscii={0xdb}
            leftGlyph="cross_plus"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="]"
            main=";"
            code="Backslash"
            col={6}
            row={2}
            petscii={0x3b}
            shiftPetscii={0x5d}
            cbmPetscii={0xdd}
            leftGlyph="bar_mid_v"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            main="="
            code="Equal"
            col={6}
            row={5}
            petscii={0x3d}
            shiftPetscii={0x3d}
            cbmPetscii={0xaf}
            leftGlyph="tri_top_right"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            main="RETURN"
            code="Enter"
            col={0}
            row={1}
            petscii={0x0d}
            width="w-13 sm:w-16 md:w-20"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />

          {/* Right Function Column: F5 / F6 */}
          <div className="ml-1 sm:ml-2">
            <C64FunctionKey
              top="F5"
              bottom="F6"
              code="F5"
              col={0}
              row={6}
              petscii={0x87}
              shiftPetscii={0x8b}
              effectiveShift={effectiveShift}
              onClick={handleKeyClick}
            />
          </div>
        </div>

        {/* ROW 4: CBM, L.SHIFT, Z, X, C, V, B, N, M, <,, >., ?/, R.SHIFT, CRSR U/D, CRSR L/R  |  F7/F8 */}
        <div className="flex items-center gap-1 sm:gap-1.5 justify-center">
          {/* Commodore (CBM / C=) Key */}
          <button
            id="key-cbm"
            onClick={() => setIsCbmActive(!isCbmActive)}
            className={`w-11 sm:w-13 md:w-14 ${
              isEmulator
                ? "h-[42px] sm:h-[48px] md:h-[52px]"
                : "h-[50px] sm:h-[58px] md:h-[62px]"
            } rounded-lg border-2 border-b-4 flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md ${
              isCbmActive
                ? "bg-[#58a6ff] border-[#1f6feb] border-b-[#094bb7] text-white font-black translate-y-0.5 shadow-md shadow-blue-500/20"
                : isEmulator
                ? "bg-[#201a15] hover:bg-[#2e261f] border-[#3e3226] border-b-[#1a1511] text-[#58a6ff]"
                : "bg-[#f5f3ef] border-[#8b857a] border-b-[#4a463f] text-[#111111] hover:bg-white"
            }`}
            title="Klawisz Commodore (C=) – Przełącz tryb grafiki PETSCII (Lewy symbol na klawiszach)"
          >
            <PetsciiIcon glyph="cbm_logo" size={16} />
            <span className="text-[10px] sm:text-xs font-black tracking-tight">C=</span>
            {isCbmActive && <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5 animate-pulse" />}
          </button>

          {/* Left SHIFT */}
          <button
            id="key-shift-left"
            onClick={() => setIsShiftActive(!isShiftActive)}
            className={`w-11 sm:w-13 md:w-14 ${
              isEmulator
                ? "h-[42px] sm:h-[48px] md:h-[52px]"
                : "h-[50px] sm:h-[58px] md:h-[62px]"
            } rounded-lg border-2 border-b-4 flex flex-col items-center justify-center transition-all cursor-pointer shadow-md ${
              effectiveShift
                ? "bg-[#238636] border-[#196c2e] border-b-[#114b1f] text-white font-black translate-y-0.5 shadow-md shadow-green-500/20"
                : isEmulator
                ? "bg-[#201a15] hover:bg-[#2e261f] border-[#3e3226] border-b-[#1a1511] text-[#d6ccc2]"
                : "bg-[#f5f3ef] border-[#8b857a] border-b-[#4a463f] text-[#111111] hover:bg-white"
            }`}
          >
            <span className="text-[9px] sm:text-[10px] font-black">SHIFT</span>
          </button>

          <C64Key
            top="Z"
            code="KeyZ"
            col={1}
            row={4}
            petscii={0x5a}
            shiftPetscii={0xda}
            cbmPetscii={0xad}
            leftGlyph="tri_bottom_right"
            rightGlyph="diamond"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="X"
            code="KeyX"
            col={2}
            row={7}
            petscii={0x58}
            shiftPetscii={0xd8}
            cbmPetscii={0xbd}
            leftGlyph="tri_top_right"
            rightGlyph="club"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="C"
            code="KeyC"
            col={2}
            row={4}
            petscii={0x43}
            shiftPetscii={0xc3}
            cbmPetscii={0xbc}
            leftGlyph="tri_bottom_left"
            rightGlyph="bar_bottom"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="V"
            code="KeyV"
            col={3}
            row={7}
            petscii={0x56}
            shiftPetscii={0xd6}
            cbmPetscii={0xbe}
            leftGlyph="tri_top_left"
            rightGlyph="cross_plus"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="B"
            code="KeyB"
            col={3}
            row={4}
            petscii={0x42}
            shiftPetscii={0xc2}
            cbmPetscii={0xbf}
            leftGlyph="checker_tl_br"
            rightGlyph="checker_tr_bl"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="N"
            code="KeyN"
            col={4}
            row={7}
            petscii={0x4e}
            shiftPetscii={0xce}
            cbmPetscii={0xaa}
            leftGlyph="slash"
            rightGlyph="backslash"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="M"
            code="KeyM"
            col={4}
            row={4}
            petscii={0x4d}
            shiftPetscii={0xcd}
            cbmPetscii={0xa9}
            leftGlyph="bar_double_v"
            rightGlyph="cross_x"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="<"
            main=","
            code="Comma"
            col={5}
            row={7}
            petscii={0x2c}
            shiftPetscii={0x3c}
            cbmPetscii={0x2c}
            leftGlyph="tri_top_left"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top=">"
            main="."
            code="Period"
            col={5}
            row={4}
            petscii={0x2e}
            shiftPetscii={0x3e}
            cbmPetscii={0x2e}
            leftGlyph="tri_bottom_right"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />
          <C64Key
            top="?"
            main="/"
            code="Slash"
            col={6}
            row={7}
            petscii={0x2f}
            shiftPetscii={0x3f}
            cbmPetscii={0x2f}
            leftGlyph="tri_bottom_left"
            showPetscii={showPetscii}
            effectiveShift={effectiveShift}
            isCbmActive={isCbmActive}
            onClick={handleKeyClick}
          />

          {/* Right SHIFT */}
          <button
            id="key-shift-right"
            onClick={() => setIsShiftActive(!isShiftActive)}
            className={`w-11 sm:w-13 md:w-14 ${
              isEmulator
                ? "h-[42px] sm:h-[48px] md:h-[52px]"
                : "h-[50px] sm:h-[58px] md:h-[62px]"
            } rounded-lg border-2 border-b-4 flex flex-col items-center justify-center transition-all cursor-pointer shadow-md ${
              effectiveShift
                ? "bg-[#238636] border-[#196c2e] border-b-[#114b1f] text-white font-black translate-y-0.5 shadow-md shadow-green-500/20"
                : isEmulator
                ? "bg-[#201a15] hover:bg-[#2e261f] border-[#3e3226] border-b-[#1a1511] text-[#d6ccc2]"
                : "bg-[#f5f3ef] border-[#8b857a] border-b-[#4a463f] text-[#111111] hover:bg-white"
            }`}
          >
            <span className="text-[9px] sm:text-[10px] font-black">SHIFT</span>
          </button>

          {/* CRSR Up/Down */}
          <C64CursorKey
            arrows={["↑", "↓"]}
            code="ArrowDown"
            col={0}
            row={7}
            petscii={0x11}
            shiftPetscii={0x91}
            effectiveShift={effectiveShift}
            onClick={handleKeyClick}
          />

          {/* CRSR Left/Right */}
          <C64CursorKey
            arrows={["←", "→"]}
            code="ArrowRight"
            col={0}
            row={2}
            petscii={0x1d}
            shiftPetscii={0x9d}
            effectiveShift={effectiveShift}
            onClick={handleKeyClick}
          />

          {/* Right Function Column: F7 / F8 */}
          <div className="ml-1 sm:ml-2">
            <C64FunctionKey
              top="F7"
              bottom="F8"
              code="F7"
              col={0}
              row={3}
              petscii={0x88}
              shiftPetscii={0x8c}
              effectiveShift={effectiveShift}
              onClick={handleKeyClick}
            />
          </div>
        </div>

        {/* ROW 5: SPACE BAR */}
        <div className="flex items-center justify-center mt-1">
          <button
            id="key-space"
            onClick={() =>
              handleKeyClick("Space", 7, 4, 0x20, 0xa0, 0x20, 0x20)
            }
            className={`w-72 sm:w-96 md:w-[480px] lg:w-[540px] ${
              isEmulator
                ? "h-[38px] sm:h-[44px] md:h-[48px] bg-[#221c17] hover:bg-[#302720] active:bg-[#16120e] border-2 border-[#3c3024] border-b-4 border-b-[#18130e] text-[#ede6df]"
                : "h-[46px] sm:h-[52px] md:h-[56px] bg-[#f5f3ef] hover:bg-white active:bg-[#d5cdc2] border-2 border-[#8b857a] border-b-4 border-b-[#4a463f] text-[#111111]"
            } rounded-lg text-xs sm:text-sm font-black shadow-xl transition-transform active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-2`}
          >
            <span>SPACE</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</KeyboardThemeContext.Provider>
  );
};

// Reusable Authentic C64 Keycap Component
interface C64KeyProps {
  top?: string;
  main?: string;
  rightText?: string;
  rightTextLines?: [string, string];
  stackedTop?: string;
  stackedBottom?: string;
  leftGlyph?: PetsciiGlyphType;
  rightGlyph?: PetsciiGlyphType;
  code: string;
  col: number;
  row: number;
  petscii?: number;
  shiftPetscii?: number;
  cbmPetscii?: number;
  ctrlPetscii?: number;
  width?: string;
  showPetscii: boolean;
  effectiveShift: boolean;
  isCbmActive: boolean;
  onClick: (
    code: string,
    col: number,
    row: number,
    petscii?: number,
    shiftPetscii?: number,
    cbmPetscii?: number,
    ctrlPetscii?: number
  ) => void;
}

const C64Key: React.FC<C64KeyProps> = ({
  top,
  main,
  rightText,
  rightTextLines,
  stackedTop,
  stackedBottom,
  leftGlyph,
  rightGlyph,
  code,
  col,
  row,
  petscii,
  shiftPetscii,
  cbmPetscii,
  ctrlPetscii,
  width = "w-8.5 sm:w-11 md:w-12 min-w-[34px] sm:min-w-[44px] md:min-w-[48px]",
  showPetscii,
  effectiveShift,
  isCbmActive,
  onClick,
}) => {
  const { theme } = React.useContext(KeyboardThemeContext);
  const isEmulator = theme === "emulator";

  const isShiftHighlighted = effectiveShift && (top || rightGlyph || stackedTop);
  const isCbmHighlighted = isCbmActive && (leftGlyph || main);
  const hasPetsciiBar = showPetscii && (leftGlyph || rightGlyph);

  return (
    <button
      id={`c64-key-${code}`}
      onClick={() =>
        onClick(code, col, row, petscii, shiftPetscii, cbmPetscii, ctrlPetscii)
      }
      className={`${width} ${
        isEmulator
          ? "h-[42px] sm:h-[48px] md:h-[52px] bg-[#251f1a] hover:bg-[#322a23] active:bg-[#181410] border-2 border-[#44382d] border-b-4 border-b-[#1c1611] text-[#ede6df]"
          : "h-[50px] sm:h-[58px] md:h-[62px] bg-[#f5f3ef] hover:bg-white active:bg-[#d5cdc2] border-2 border-[#8b857a] border-b-4 border-b-[#4a463f] text-[#111111]"
      } rounded-lg flex flex-col justify-between p-1 sm:p-1.5 shadow-md transition-transform active:translate-y-0.5 relative select-none cursor-pointer`}
    >
      {/* 1. TOP SURFACE: Alphanumeric, Shift Character, Color/Control Labels */}
      <div className="w-full flex-1 flex flex-col justify-between leading-none min-h-0">
        {stackedTop && stackedBottom ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-center">
            <span
              className={`text-[9px] sm:text-[10px] md:text-xs font-black tracking-tight ${
                isShiftHighlighted
                  ? isEmulator
                    ? "text-[#f0883e] font-extrabold"
                    : "text-amber-600 font-extrabold"
                  : isEmulator
                  ? "text-[#ede6df]"
                  : "text-[#111111]"
              }`}
            >
              {stackedTop}
            </span>
            <span
              className={`text-[9px] sm:text-[10px] md:text-xs font-black tracking-tight mt-0.5 ${
                isEmulator ? "text-[#c2b6a8]" : "text-[#111111]"
              }`}
            >
              {stackedBottom}
            </span>
          </div>
        ) : (
          <div className="w-full flex items-start justify-between">
            {/* Primary / Top Glyph */}
            <div className="flex flex-col items-start leading-none">
              {top && (
                <span
                  className={`text-[10px] sm:text-xs md:text-sm font-black transition-colors ${
                    isShiftHighlighted
                      ? isEmulator
                        ? "text-[#f0883e] font-extrabold"
                        : "text-amber-600 font-extrabold"
                      : isEmulator
                      ? "text-[#ede6df]"
                      : "text-[#111111]"
                  }`}
                >
                  {top}
                </span>
              )}
              {main && !top && (
                <span
                  className={`text-[10px] sm:text-xs md:text-sm font-black transition-colors ${
                    isCbmHighlighted
                      ? isEmulator
                        ? "text-[#58a6ff] font-extrabold"
                        : "text-blue-600 font-extrabold"
                      : isEmulator
                      ? "text-[#ede6df]"
                      : "text-[#111111]"
                  }`}
                >
                  {main}
                </span>
              )}
            </div>

            {/* Secondary Glyph (e.g. number when top is symbol) / Color labels */}
            <div className="flex flex-col items-end leading-none">
              {top && main && (
                <span
                  className={`text-[10px] sm:text-xs md:text-sm font-black ${
                    isCbmHighlighted
                      ? isEmulator
                        ? "text-[#58a6ff]"
                        : "text-blue-600"
                      : isEmulator
                      ? "text-[#c2b6a8]"
                      : "text-[#222222]"
                  }`}
                >
                  {main}
                </span>
              )}
              {rightText && (
                <span
                  className={`text-[7px] sm:text-[8px] font-mono font-bold tracking-tighter mt-0.5 ${
                    isEmulator ? "text-[#8e7e70]" : "text-[#555555]"
                  }`}
                >
                  {rightText}
                </span>
              )}
              {rightTextLines && (
                <div
                  className={`flex flex-col text-[6px] sm:text-[7px] font-mono font-bold leading-tight text-right tracking-tighter ${
                    isEmulator ? "text-[#8e7e70]" : "text-[#555555]"
                  }`}
                >
                  <span>{rightTextLines[0]}</span>
                  <span>{rightTextLines[1]}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. FRONT / BOTTOM SURFACE: Dedicated PETSCII Pictograms (CBM on Left, SHIFT on Right) */}
      {hasPetsciiBar && (
        <div
          className={`w-full flex items-center justify-between pt-0.5 sm:pt-1 mt-auto leading-none px-0.5 shrink-0 ${
            isEmulator ? "border-t border-[#382d22]" : "border-t border-[#d8d2c7]/90"
          }`}
        >
          {leftGlyph ? (
            <span
              className={`inline-flex items-center justify-center p-0.5 rounded transition-transform ${
                isCbmActive
                  ? "bg-[#1f6feb] text-white scale-110 shadow-xs"
                  : isEmulator
                  ? "text-[#58a6ff]/80 hover:text-[#58a6ff]"
                  : "text-[#222222] hover:text-black"
              }`}
              title="Symbol PETSCII (z klawiszem CBM)"
            >
              <PetsciiIcon glyph={leftGlyph} size={11} />
            </span>
          ) : (
            <span className="w-3" />
          )}

          {rightGlyph ? (
            <span
              className={`inline-flex items-center justify-center p-0.5 rounded transition-transform ${
                effectiveShift
                  ? "bg-[#d29922] text-white scale-110 shadow-xs"
                  : isEmulator
                  ? "text-[#f0883e]/80 hover:text-[#f0883e]"
                  : "text-[#222222] hover:text-black"
              }`}
              title="Symbol PETSCII (z klawiszem SHIFT)"
            >
              <PetsciiIcon glyph={rightGlyph} size={11} />
            </span>
          ) : null}
        </div>
      )}
    </button>
  );
};

// Reusable Dual Function Key Component (F1/F2, F3/F4, F5/F6, F7/F8)
interface C64FunctionKeyProps {
  top: string;
  bottom: string;
  code: string;
  col: number;
  row: number;
  petscii: number;
  shiftPetscii: number;
  effectiveShift: boolean;
  onClick: (
    code: string,
    col: number,
    row: number,
    petscii?: number,
    shiftPetscii?: number
  ) => void;
}

const C64FunctionKey: React.FC<C64FunctionKeyProps> = ({
  top,
  bottom,
  code,
  col,
  row,
  petscii,
  shiftPetscii,
  effectiveShift,
  onClick,
}) => {
  const { theme } = React.useContext(KeyboardThemeContext);
  const isEmulator = theme === "emulator";

  return (
    <button
      id={`c64-fn-${top}`}
      onClick={() => onClick(code, col, row, petscii, shiftPetscii)}
      className={`w-10 sm:w-13 md:w-14 ${
        isEmulator
          ? "h-[42px] sm:h-[48px] md:h-[52px] bg-[#1c1713] hover:bg-[#28211b] active:bg-[#120f0c] border-2 border-[#382c22] border-b-4 border-b-[#14100c] text-[#58a6ff]"
          : "h-[50px] sm:h-[58px] md:h-[62px] bg-[#f5f3ef] hover:bg-white active:bg-[#d5cdc2] border-2 border-[#8b857a] border-b-4 border-b-[#4a463f] text-[#111111]"
      } rounded-lg flex flex-col justify-between p-1 sm:p-1.5 shadow-md transition-transform active:translate-y-0.5 cursor-pointer select-none`}
      title={`${top} (Standard) / ${bottom} (z klawiszem SHIFT)`}
    >
      <span
        className={`text-[9px] sm:text-[10px] md:text-xs font-black leading-none ${
          !effectiveShift
            ? isEmulator
              ? "text-[#58a6ff]"
              : "text-[#111111]"
            : isEmulator
            ? "text-[#8e7e70]"
            : "text-[#777777]"
        }`}
      >
        {top}
      </span>
      <span
        className={`text-[8px] sm:text-[9px] md:text-[10px] font-black leading-none self-end ${
          effectiveShift
            ? isEmulator
              ? "text-[#f0883e] font-extrabold"
              : "text-amber-600 font-extrabold"
            : isEmulator
            ? "text-[#8e7e70]"
            : "text-[#666666]"
        }`}
      >
        {bottom}
      </span>
    </button>
  );
};

// Reusable Cursor Key with Dual Arrows
interface C64CursorKeyProps {
  arrows: [string, string];
  code: string;
  col: number;
  row: number;
  petscii: number;
  shiftPetscii: number;
  effectiveShift: boolean;
  onClick: (
    code: string,
    col: number,
    row: number,
    petscii?: number,
    shiftPetscii?: number
  ) => void;
}

const C64CursorKey: React.FC<C64CursorKeyProps> = ({
  arrows,
  code,
  col,
  row,
  petscii,
  shiftPetscii,
  effectiveShift,
  onClick,
}) => {
  const { theme } = React.useContext(KeyboardThemeContext);
  const isEmulator = theme === "emulator";

  return (
    <button
      id={`c64-cursor-${arrows[0]}-${arrows[1]}`}
      onClick={() => onClick(code, col, row, petscii, shiftPetscii)}
      className={`w-9 sm:w-11 md:w-12 ${
        isEmulator
          ? "h-[42px] sm:h-[48px] md:h-[52px] bg-[#251f1a] hover:bg-[#322a23] active:bg-[#181410] border-2 border-[#44382d] border-b-4 border-b-[#1c1611] text-[#ede6df]"
          : "h-[50px] sm:h-[58px] md:h-[62px] bg-[#f5f3ef] hover:bg-white active:bg-[#d5cdc2] border-2 border-[#8b857a] border-b-4 border-b-[#4a463f] text-[#111111]"
      } rounded-lg flex flex-col justify-between p-1 sm:p-1.5 shadow-md transition-transform active:translate-y-0.5 relative select-none cursor-pointer`}
      title={`CRSR ${arrows[0]}/${arrows[1]}`}
    >
      <div className="w-full flex items-center justify-between leading-none">
        <span
          className={`text-[7px] sm:text-[8px] font-black ${
            isEmulator ? "text-[#8e7e70]" : "text-[#555555]"
          }`}
        >
          CRSR
        </span>
        <span
          className={`text-[9px] sm:text-[10px] font-black ${
            effectiveShift
              ? isEmulator
                ? "text-[#f0883e] font-extrabold"
                : "text-amber-600 font-extrabold"
              : isEmulator
              ? "text-[#ede6df]"
              : "text-[#111111]"
          }`}
        >
          {arrows[0]}
        </span>
      </div>
      <span
        className={`text-[9px] sm:text-[10px] font-black self-end ${
          !effectiveShift
            ? isEmulator
              ? "text-[#ede6df]"
              : "text-[#111111]"
            : isEmulator
            ? "text-[#8e7e70]"
            : "text-[#777777]"
        }`}
      >
        {arrows[1]}
      </span>
    </button>
  );
};
