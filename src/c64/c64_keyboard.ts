/**
 * Commodore 64 8x8 Keyboard Matrix & PETSCII Mapping
 * Implements authentic matrix scanning (Row 0-7 x Col 0-7), modifier keys,
 * virtual keyboard mappings, and PETSCII graphic character conversions.
 */

export interface KeyMatrixPosition {
  col: number; // 0-7 (Port A on CIA 1 - Column)
  row: number; // 0-7 (Port B on CIA 1 - Row)
}

export class C64Keyboard {
  // 8x8 matrix state (matrix[col] contains active-low row bits 0-7)
  public matrix: number[] = [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff];

  // Polish diacritics mapping to standard C64 physical keys and PETSCII values
  public static readonly POLISH_DIACRITICS: {
    [key: string]: { code: string; col: number; row: number; petscii: number };
  } = {
    "ą": { code: "KeyA", col: 1, row: 2, petscii: 0x41 },
    "Ą": { code: "KeyA", col: 1, row: 2, petscii: 0x41 },
    "ć": { code: "KeyC", col: 2, row: 4, petscii: 0x43 },
    "Ć": { code: "KeyC", col: 2, row: 4, petscii: 0x43 },
    "ę": { code: "KeyE", col: 1, row: 6, petscii: 0x45 },
    "Ę": { code: "KeyE", col: 1, row: 6, petscii: 0x45 },
    "ł": { code: "KeyL", col: 5, row: 2, petscii: 0x4c },
    "Ł": { code: "KeyL", col: 5, row: 2, petscii: 0x4c },
    "ń": { code: "KeyN", col: 4, row: 7, petscii: 0x4e },
    "Ń": { code: "KeyN", col: 4, row: 7, petscii: 0x4e },
    "ó": { code: "KeyO", col: 4, row: 6, petscii: 0x4f },
    "Ó": { code: "KeyO", col: 4, row: 6, petscii: 0x4f },
    "ś": { code: "KeyS", col: 1, row: 5, petscii: 0x53 },
    "Ś": { code: "KeyS", col: 1, row: 5, petscii: 0x53 },
    "ź": { code: "KeyX", col: 2, row: 7, petscii: 0x58 },
    "Ź": { code: "KeyX", col: 2, row: 7, petscii: 0x58 },
    "ż": { code: "KeyZ", col: 1, row: 4, petscii: 0x5a },
    "Ż": { code: "KeyZ", col: 1, row: 4, petscii: 0x5a },
  };

  // Authentic Commodore 64 8x8 matrix (CIA 1 Port A = Column 0-7, Port B = Row 0-7)
  // Compliant with VICE emulator standard & Commodore 64 Hardware Matrix
  public static readonly keyMap: { [code: string]: KeyMatrixPosition } = {
    // Column 0 ($DC00 Bit 0)
    "Delete": { col: 0, row: 0 }, // INST/DEL
    "Backspace": { col: 0, row: 0 }, // Backspace -> INST/DEL
    "Enter": { col: 0, row: 1 }, // RETURN
    "NumpadEnter": { col: 0, row: 1 },
    "ArrowRight": { col: 0, row: 2 }, // CRSR R/L (Right without Shift, Left with Shift)
    "F7": { col: 0, row: 3 }, // F7 (F8 with Shift)
    "F8": { col: 0, row: 3 },
    "F1": { col: 0, row: 4 }, // F1 (F2 with Shift)
    "F2": { col: 0, row: 4 },
    "F3": { col: 0, row: 5 }, // F3 (F4 with Shift)
    "F4": { col: 0, row: 5 },
    "F5": { col: 0, row: 6 }, // F5 (F6 with Shift)
    "F6": { col: 0, row: 6 },
    "ArrowDown": { col: 0, row: 7 }, // CRSR U/D (Down without Shift, Up with Shift)

    // Column 1 ($DC00 Bit 1)
    "Digit3": { col: 1, row: 0 },
    "Numpad3": { col: 1, row: 0 },
    "KeyW": { col: 1, row: 1 },
    "KeyA": { col: 1, row: 2 },
    "Digit4": { col: 1, row: 3 },
    "Numpad4": { col: 1, row: 3 },
    "KeyZ": { col: 1, row: 4 },
    "KeyS": { col: 1, row: 5 },
    "KeyE": { col: 1, row: 6 },
    "ShiftLeft": { col: 1, row: 7 }, // Left Shift

    // Column 2 ($DC00 Bit 2)
    "Digit5": { col: 2, row: 0 },
    "Numpad5": { col: 2, row: 0 },
    "KeyR": { col: 2, row: 1 },
    "KeyD": { col: 2, row: 2 },
    "Digit6": { col: 2, row: 3 },
    "Numpad6": { col: 2, row: 3 },
    "KeyC": { col: 2, row: 4 },
    "KeyF": { col: 2, row: 5 },
    "KeyT": { col: 2, row: 6 },
    "KeyX": { col: 2, row: 7 },

    // Column 3 ($DC00 Bit 3)
    "Digit7": { col: 3, row: 0 },
    "Numpad7": { col: 3, row: 0 },
    "KeyY": { col: 3, row: 1 },
    "KeyG": { col: 3, row: 2 },
    "Digit8": { col: 3, row: 3 },
    "Numpad8": { col: 3, row: 3 },
    "KeyB": { col: 3, row: 4 },
    "KeyH": { col: 3, row: 5 },
    "KeyU": { col: 3, row: 6 },
    "KeyV": { col: 3, row: 7 },

    // Column 4 ($DC00 Bit 4)
    "Digit9": { col: 4, row: 0 },
    "Numpad9": { col: 4, row: 0 },
    "KeyI": { col: 4, row: 1 },
    "KeyJ": { col: 4, row: 2 },
    "Digit0": { col: 4, row: 3 },
    "Numpad0": { col: 4, row: 3 },
    "KeyM": { col: 4, row: 4 },
    "KeyK": { col: 4, row: 5 },
    "KeyO": { col: 4, row: 6 },
    "KeyN": { col: 4, row: 7 },

    // Column 5 ($DC00 Bit 5)
    "NumpadAdd": { col: 5, row: 0 }, // +
    "KeyP": { col: 5, row: 1 },
    "KeyL": { col: 5, row: 2 },
    "Minus": { col: 5, row: 3 }, // -
    "NumpadSubtract": { col: 5, row: 3 },
    "Period": { col: 5, row: 4 }, // .
    "NumpadDecimal": { col: 5, row: 4 },
    "Semicolon": { col: 5, row: 5 }, // : (Colon on C64)
    "BracketLeft": { col: 5, row: 6 }, // @ (At on C64)
    "Comma": { col: 5, row: 7 }, // ,

    // Column 6 ($DC00 Bit 6)
    "BracketRight": { col: 6, row: 0 }, // £ (Pound on C64)
    "Quote": { col: 6, row: 1 }, // * (Asterisk on C64)
    "NumpadMultiply": { col: 6, row: 1 },
    "Backslash": { col: 6, row: 2 }, // ; (Semicolon on C64)
    "Home": { col: 6, row: 3 }, // CLR/HOME
    "ShiftRight": { col: 6, row: 4 }, // Right Shift
    "Equal": { col: 6, row: 5 }, // =
    "ArrowUp": { col: 6, row: 6 }, // ^ / Arrow Up / Pi (Shift)
    "Slash": { col: 6, row: 7 }, // /
    "NumpadDivide": { col: 6, row: 7 },

    // Column 7 ($DC00 Bit 7)
    "Digit1": { col: 7, row: 0 },
    "Numpad1": { col: 7, row: 0 },
    "ArrowLeft": { col: 7, row: 1 }, // ← (Left Arrow on C64)
    "ControlLeft": { col: 7, row: 2 }, // CTRL
    "ControlRight": { col: 7, row: 2 },
    "Digit2": { col: 7, row: 3 },
    "Numpad2": { col: 7, row: 3 },
    "Space": { col: 7, row: 4 }, // SPACE BAR
    "Tab": { col: 7, row: 5 }, // Commodore Key (C=)
    "AltLeft": { col: 7, row: 5 },
    "AltRight": { col: 7, row: 5 },
    "Backquote": { col: 7, row: 5 }, // ` -> Commodore Key (C=)
    "KeyQ": { col: 7, row: 6 },
    "Escape": { col: 7, row: 7 }, // RUN/STOP
  };

  public reset() {
    this.matrix = [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff];
  }

  // Handle key down event with Polish diacritics support
  public onKeyDown(code: string, key?: string) {
    if (key && C64Keyboard.POLISH_DIACRITICS[key]) {
      const p = C64Keyboard.POLISH_DIACRITICS[key];
      this.pressKey(p.col, p.row);
      return;
    }

    const pos = C64Keyboard.keyMap[code];
    if (pos) {
      this.pressKey(pos.col, pos.row);
    }
  }

  // Handle key up event with Polish diacritics support
  public onKeyUp(code: string, key?: string) {
    if (key && C64Keyboard.POLISH_DIACRITICS[key]) {
      const p = C64Keyboard.POLISH_DIACRITICS[key];
      this.releaseKey(p.col, p.row);
      return;
    }

    const pos = C64Keyboard.keyMap[code];
    if (pos) {
      this.releaseKey(pos.col, pos.row);
    }
  }

  public pressKey(col: number, row: number) {
    if (col >= 0 && col < 8 && row >= 0 && row < 8) {
      this.matrix[col] &= ~(1 << row);
    }
  }

  public releaseKey(col: number, row: number) {
    if (col >= 0 && col < 8 && row >= 0 && row < 8) {
      this.matrix[col] |= 1 << row;
    }
  }

  // Press a key with optional modifier combinations (Left Shift, Commodore, or CTRL)
  public pressChord(
    col: number,
    row: number,
    modifiers: { shift?: boolean; cbm?: boolean; ctrl?: boolean } = {},
    holdDurationMs: number = 120
  ) {
    if (modifiers.shift) {
      this.pressKey(1, 7); // Left Shift: Col 1, Row 7
    }
    if (modifiers.cbm) {
      this.pressKey(7, 5); // Commodore C=: Col 7, Row 5
    }
    if (modifiers.ctrl) {
      this.pressKey(7, 2); // CTRL: Col 7, Row 2
    }

    this.pressKey(col, row);

    setTimeout(() => {
      this.releaseKey(col, row);
      if (modifiers.shift) {
        this.releaseKey(1, 7);
      }
      if (modifiers.cbm) {
        this.releaseKey(7, 5);
      }
      if (modifiers.ctrl) {
        this.releaseKey(7, 2);
      }
    }, holdDurationMs);
  }

  // Read matrix rows (active-low) for a given selected column pattern
  public readMatrix(colSelect: number): number {
    let result = 0xff;
    for (let col = 0; col < 8; col++) {
      if ((colSelect & (1 << col)) === 0) {
        result &= this.matrix[col];
      }
    }
    return result;
  }

  // Convert JS Keyboard code to PETSCII character code
  public static codeToPetscii(code: string, shift = false, key?: string): number | null {
    if (key && C64Keyboard.POLISH_DIACRITICS[key]) {
      return C64Keyboard.POLISH_DIACRITICS[key].petscii;
    }

    if (code === "Enter" || code === "NumpadEnter") return 0x0d;
    if (code === "Backspace" || code === "Delete") return shift ? 0x94 : 0x14; // INST (148) / DEL (20)
    if (code === "Space") return 0x20;
    if (code === "Home") return shift ? 0x93 : 0x13; // CLR (147) / HOME (19)
    if (code === "Escape") return 0x03; // RUN/STOP

    if (code === "ArrowDown") return shift ? 0x91 : 0x11; // CRSR UP (145) / CRSR DOWN (17)
    if (code === "ArrowUp") return 0x91;
    if (code === "ArrowRight") return shift ? 0x9d : 0x1d; // CRSR LEFT (157) / CRSR RIGHT (29)
    if (code === "ArrowLeft") return 0x9d;

    if (code === "F1") return 0x85;
    if (code === "F2") return 0x89;
    if (code === "F3") return 0x86;
    if (code === "F4") return 0x8a;
    if (code === "F5") return 0x87;
    if (code === "F6") return 0x8b;
    if (code === "F7") return 0x88;
    if (code === "F8") return 0x8c;

    if (code.startsWith("Key")) {
      const char = code.replace("Key", "").toUpperCase();
      return char.charCodeAt(0);
    }
    if (code.startsWith("Digit")) {
      const d = code.replace("Digit", "");
      if (!shift) return d.charCodeAt(0);
      const shiftMap: { [k: string]: number } = {
        "1": 0x21, // !
        "2": 0x22, // "
        "3": 0x23, // #
        "4": 0x24, // $
        "5": 0x25, // %
        "6": 0x26, // &
        "7": 0x27, // '
        "8": 0x28, // (
        "9": 0x29, // )
        "0": 0x30,
      };
      return shiftMap[d] || d.charCodeAt(0);
    }
    if (code === "Equal") return shift ? 0x2b : 0x3d; // + / =
    if (code === "Minus") return 0x2d; // -
    if (code === "Period") return shift ? 0x3e : 0x2e; // > / .
    if (code === "Comma") return shift ? 0x3c : 0x2c; // < / ,
    if (code === "Semicolon") return shift ? 0x5b : 0x3a; // [ / :
    if (code === "Backslash") return shift ? 0x5d : 0x3b; // ] / ;
    if (code === "Quote") return 0x2a; // *
    if (code === "BracketLeft") return 0x40; // @
    if (code === "BracketRight") return 0x5c; // £

    return null;
  }
}
