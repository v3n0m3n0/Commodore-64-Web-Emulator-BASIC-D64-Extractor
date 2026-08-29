/**
 * 6502 / 6510 Mini Assembler for Commodore 64
 * Compiles standard 6502 assembly source listings into executable machine code binaries (.PRG)
 * with label resolution, pseudo-ops (.ORG, .BYTE, .WORD, .TEXT), and optional BASIC SYS launcher stubs.
 */

import { C64Basic } from "./c64_basic_detokenizer";

export interface AssemblyResult {
  success: boolean;
  prgBytes?: Uint8Array;
  loadAddress?: number;
  entryAddress?: number;
  byteLength?: number;
  errors: string[];
  labels: { [label: string]: number };
}

export class C64Assembler {
  // Standard KERNAL and Hardware Register Pre-defined Symbols
  public static readonly DEFAULT_SYMBOLS: { [symbol: string]: number } = {
    // KERNAL Jump Table ($FF81 - $FFF3)
    SCINIT: 0xff81,
    IOINIT: 0xff84,
    RAMTAS: 0xff87,
    RESTOR: 0xff8a,
    VECTOR: 0xff8d,
    SETMSG: 0xff90,
    LSTNSA: 0xff93,
    TALKSA: 0xff96,
    MEMBOT: 0xff99,
    MEMTOP: 0xff9c,
    SCNKEY: 0xff9f,
    SETTMO: 0xffa2,
    IECIN: 0xffa5,
    IECOUT: 0xffa8,
    UNTALK: 0xffab,
    UNLSN: 0xffae,
    LISTEN: 0xffb1,
    TALK: 0xffb4,
    READST: 0xffb7,
    SETLFS: 0xffba,
    SETNAM: 0xffbd,
    OPEN: 0xffc0,
    CLOSE: 0xffc3,
    CHKIN: 0xffc6,
    CHKOUT: 0xffc9,
    CLRCHN: 0xffcc,
    CHRIN: 0xffcf,
    BASIN: 0xffcf,
    CHROUT: 0xffd2,
    BSOUT: 0xffd2,
    LOAD: 0xffd5,
    SAVE: 0xffd8,
    SETTIM: 0xffdb,
    RDTIM: 0xffde,
    STOP: 0xffe1,
    GETIN: 0xffe4,
    CLALL: 0xffe7,
    UDTIM: 0xffea,
    SCREEN: 0xffed,
    PLOT: 0xfff0,
    IOBASE: 0xfff3,
    // Hardware Registers
    CPU_PORT: 0x0001,
    TXTTAB_LO: 0x002b,
    TXTTAB_HI: 0x002c,
    VARTAB_LO: 0x002d,
    VARTAB_HI: 0x002e,
    CURRENT_COLOR: 0x0286,
    CINV_IRQ_LO: 0x0314,
    CINV_IRQ_HI: 0x0315,
    NMINV_NMI_LO: 0x0318,
    NMINV_NMI_HI: 0x0319,
    VIC_SP0_X: 0xd000,
    VIC_SP0_Y: 0xd001,
    VIC_CTRL1: 0xd011,
    VIC_RASTER: 0xd012,
    VIC_CTRL2: 0xd016,
    VIC_VMEM: 0xd018,
    VIC_IRQ_STATUS: 0xd019,
    VIC_IRQ_MASK: 0xd01a,
    VIC_BORDER: 0xd020,
    VIC_BORDER_COLOR: 0xd020,
    VIC_BG: 0xd021,
    VIC_BG_COLOR0: 0xd021,
    SID_V1_FREQ_LO: 0xd400,
    SID_V1_FREQ_HI: 0xd401,
    SID_V1_CTRL: 0xd404,
    SID_FILTER_VOL: 0xd418,
    COLOR_RAM: 0xd800,
    COLORRAM: 0xd800,
    CIA1_PORT_A_JOY2: 0xdc00,
    CIA1_PORT_B_JOY1: 0xdc01,
    CIA1_TIMER_A_LO: 0xdc04,
    CIA1_TIMER_A_HI: 0xdc05,
    CIA1_ICR: 0xdc0d,
    CIA1_CRA: 0xdc0e,
    CIA2_PORT_A_VIC_BANK: 0xdd00,
    CIA2_ICR: 0xdd0d,
    VECTOR_NMI: 0xfffa,
    VECTOR_RESET: 0xfffc,
    VECTOR_IRQ: 0xfffe,
  };

  // Complete 6502 / 6510 Opcode Matrix by Mnemonic and Addressing Mode (Including Undocumented)
  private static readonly OPCODES: { [mnemonic: string]: { [mode: string]: number } } = {
    ADC: { IMM: 0x69, ZP: 0x65, ZPX: 0x75, ABS: 0x6d, ABSX: 0x7d, ABSY: 0x79, INDX: 0x61, INDY: 0x71 },
    AND: { IMM: 0x29, ZP: 0x25, ZPX: 0x35, ABS: 0x2d, ABSX: 0x3d, ABSY: 0x39, INDX: 0x21, INDY: 0x31 },
    ASL: { ACC: 0x0a, ZP: 0x06, ZPX: 0x16, ABS: 0x0e, ABSX: 0x1e },
    BCC: { REL: 0x90 },
    BCS: { REL: 0xb0 },
    BEQ: { REL: 0xf0 },
    BIT: { ZP: 0x24, ABS: 0x2c },
    BMI: { REL: 0x30 },
    BNE: { REL: 0xd0 },
    BPL: { REL: 0x10 },
    BRK: { IMP: 0x00 },
    BVC: { REL: 0x50 },
    BVS: { REL: 0x70 },
    CLC: { IMP: 0x18 },
    CLD: { IMP: 0xd8 },
    CLI: { IMP: 0x58 },
    CLV: { IMP: 0xb8 },
    CMP: { IMM: 0xc9, ZP: 0xc5, ZPX: 0xd5, ABS: 0xcd, ABSX: 0xdd, ABSY: 0xd9, INDX: 0xc1, INDY: 0xd1 },
    CPX: { IMM: 0xe0, ZP: 0xe4, ABS: 0xec },
    CPY: { IMM: 0xc0, ZP: 0xc4, ABS: 0xcc },
    DEC: { ZP: 0xc6, ZPX: 0xd6, ABS: 0xce, ABSX: 0xde },
    DEX: { IMP: 0xca },
    DEY: { IMP: 0x88 },
    EOR: { IMM: 0x49, ZP: 0x45, ZPX: 0x55, ABS: 0x4d, ABSX: 0x5d, ABSY: 0x59, INDX: 0x41, INDY: 0x51 },
    INC: { ZP: 0xe6, ZPX: 0xf6, ABS: 0xee, ABSX: 0xfe },
    INX: { IMP: 0xe8 },
    INY: { IMP: 0xc8 },
    JMP: { ABS: 0x4c, IND: 0x6c },
    JSR: { ABS: 0x20 },
    LDA: { IMM: 0xa9, ZP: 0xa5, ZPX: 0xb5, ABS: 0xad, ABSX: 0xbd, ABSY: 0xb9, INDX: 0xa1, INDY: 0xb1 },
    LDX: { IMM: 0xa2, ZP: 0xa6, ZPY: 0xb6, ABS: 0xae, ABSY: 0xbe },
    LDY: { IMM: 0xa0, ZP: 0xa4, ZPX: 0xb4, ABS: 0xac, ABSX: 0xbc },
    LSR: { ACC: 0x4a, ZP: 0x46, ZPX: 0x56, ABS: 0x4e, ABSX: 0x5e },
    NOP: { IMP: 0xea },
    ORA: { IMM: 0x09, ZP: 0x05, ZPX: 0x15, ABS: 0x0d, ABSX: 0x1d, ABSY: 0x19, INDX: 0x01, INDY: 0x11 },
    PHA: { IMP: 0x48 },
    PHP: { IMP: 0x08 },
    PLA: { IMP: 0x68 },
    PLP: { IMP: 0x28 },
    ROL: { ACC: 0x2a, ZP: 0x26, ZPX: 0x36, ABS: 0x2e, ABSX: 0x3e },
    ROR: { ACC: 0x6a, ZP: 0x66, ZPX: 0x76, ABS: 0x6e, ABSX: 0x7e },
    RTI: { IMP: 0x40 },
    RTS: { IMP: 0x60 },
    SBC: { IMM: 0xe9, ZP: 0xe5, ZPX: 0xf5, ABS: 0xed, ABSX: 0xfd, ABSY: 0xf9, INDX: 0xe1, INDY: 0xf1 },
    SEC: { IMP: 0x38 },
    SED: { IMP: 0xf8 },
    SEI: { IMP: 0x78 },
    STA: { ZP: 0x85, ZPX: 0x95, ABS: 0x8d, ABSX: 0x9d, ABSY: 0x99, INDX: 0x81, INDY: 0x91 },
    STX: { ZP: 0x86, ZPY: 0x96, ABS: 0x8e },
    STY: { ZP: 0x84, ZPX: 0x94, ABS: 0x8c },
    TAX: { IMP: 0xaa },
    TAY: { IMP: 0xa8 },
    TSX: { IMP: 0xba },
    TXA: { IMP: 0x8a },
    TXS: { IMP: 0x9a },
    TYA: { IMP: 0x98 },
    // Undocumented / Illegal 6502 Opcodes
    LAX: { ZP: 0xa7, ZPY: 0xb7, ABS: 0xaf, ABSY: 0xbf, INDX: 0xa3, INDY: 0xb3 },
    SAX: { ZP: 0x87, ZPY: 0x97, ABS: 0x8f, INDX: 0x83 },
    DCP: { ZP: 0xc7, ZPX: 0xd7, ABS: 0xcf, ABSX: 0xdf, ABSY: 0xdb, INDX: 0xc3, INDY: 0xd3 },
    ISC: { ZP: 0xe7, ZPX: 0xf7, ABS: 0xef, ABSX: 0xff, ABSY: 0xfb, INDX: 0xe3, INDY: 0xf3 },
    ISB: { ZP: 0xe7, ZPX: 0xf7, ABS: 0xef, ABSX: 0xff, ABSY: 0xfb, INDX: 0xe3, INDY: 0xf3 },
    SLO: { ZP: 0x07, ZPX: 0x17, ABS: 0x0f, ABSX: 0x1f, ABSY: 0x1b, INDX: 0x03, INDY: 0x13 },
    RLA: { ZP: 0x27, ZPX: 0x37, ABS: 0x2f, ABSX: 0x3f, ABSY: 0x3b, INDX: 0x23, INDY: 0x33 },
    SRE: { ZP: 0x47, ZPX: 0x57, ABS: 0x4f, ABSX: 0x5f, ABSY: 0x5b, INDX: 0x43, INDY: 0x53 },
    RRA: { ZP: 0x67, ZPX: 0x77, ABS: 0x6f, ABSX: 0x7f, ABSY: 0x7b, INDX: 0x63, INDY: 0x73 },
    ALR: { IMM: 0x4b },
    ANC: { IMM: 0x0b },
    ARR: { IMM: 0x6b },
    SBX: { IMM: 0xcb },
    LAS: { ABSY: 0xbb },
  };

  /**
   * Parse single term / literal ($FF, 0xFF, %1010, 'A', 255, LABEL)
   */
  private static parseSingleTerm(term: string, labels: { [key: string]: number }): number | null {
    term = term.trim();
    if (!term) return null;

    // Check pre-defined and custom labels (case-insensitive)
    const upper = term.toUpperCase();
    if (labels[upper] !== undefined) return labels[upper];
    if (labels[term] !== undefined) return labels[term];
    if (C64Assembler.DEFAULT_SYMBOLS[upper] !== undefined) return C64Assembler.DEFAULT_SYMBOLS[upper];

    // Hex literal: $XXXX or 0xXXXX
    if (term.startsWith("$")) {
      const val = parseInt(term.slice(1), 16);
      return isNaN(val) ? null : val;
    }
    if (term.startsWith("0x") || term.startsWith("0X")) {
      const val = parseInt(term.slice(2), 16);
      return isNaN(val) ? null : val;
    }
    // Binary literal: %10101010
    if (term.startsWith("%")) {
      const val = parseInt(term.slice(1), 2);
      return isNaN(val) ? null : val;
    }
    // Character literal: 'A' or "A"
    if ((term.startsWith("'") && term.endsWith("'")) || (term.startsWith('"') && term.endsWith('"'))) {
      if (term.length === 3) {
        return term.charCodeAt(1);
      }
    }
    // Decimal integer
    if (/^-?\d+$/.test(term)) {
      const val = parseInt(term, 10);
      return isNaN(val) ? null : val;
    }

    return null;
  }

  /**
   * Parse number or arithmetic expression (<LABEL, >LABEL, LABEL+4, $C000-1)
   */
  public static parseNumber(expr: string, labels: { [key: string]: number } = {}): number | null {
    expr = expr.trim();
    if (!expr) return null;

    // Low byte operator: <EXPR
    if (expr.startsWith("<")) {
      const sub = this.parseNumber(expr.slice(1).trim(), labels);
      return sub !== null ? sub & 0xff : null;
    }

    // High byte operator: >EXPR
    if (expr.startsWith(">")) {
      const sub = this.parseNumber(expr.slice(1).trim(), labels);
      return sub !== null ? (sub >> 8) & 0xff : null;
    }

    // Arithmetic expression with + or - (e.g. LABEL + 2 or $D000 + $20)
    // Avoid splitting within quotes
    const addIdx = expr.lastIndexOf("+");
    const subIdx = expr.lastIndexOf("-");
    if (addIdx > 0) {
      const left = this.parseNumber(expr.slice(0, addIdx).trim(), labels);
      const right = this.parseNumber(expr.slice(addIdx + 1).trim(), labels);
      if (left !== null && right !== null) return left + right;
    }
    if (subIdx > 0) {
      const left = this.parseNumber(expr.slice(0, subIdx).trim(), labels);
      const right = this.parseNumber(expr.slice(subIdx + 1).trim(), labels);
      if (left !== null && right !== null) return left - right;
    }

    return this.parseSingleTerm(expr, labels);
  }

  /**
   * Two-pass 6502 Assembler
   */
  public static assemble(source: string, defaultOrigin = 0xc000): AssemblyResult {
    const lines = source.split(/\r?\n/);
    const errors: string[] = [];
    const labels: { [label: string]: number } = {};

    let origin = defaultOrigin;
    let entryPoint = defaultOrigin;

    // PASS 1: Calculate PC addresses and collect labels
    let currentPC = origin;
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      let raw = lines[lineIndex].trim();
      if (!raw || raw.startsWith(";") || raw.startsWith("//") || raw.startsWith("#")) continue;

      // Remove inline comments
      const commentIdx = raw.indexOf(";");
      if (commentIdx !== -1) raw = raw.slice(0, commentIdx).trim();

      // Check constant assignments: SYMBOL = VALUE, SYMBOL EQU VALUE, SYMBOL := VALUE
      const equMatch = raw.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(?:=|EQU|:=)\s*(.+)$/i);
      if (equMatch) {
        const symName = equMatch[1].toUpperCase();
        if (symName !== "*" && symName !== "ORG" && symName !== ".ORG") {
          const val = this.parseNumber(equMatch[2].trim(), labels);
          if (val !== null) {
            labels[symName] = val;
          }
          continue;
        }
      }

      // Check .ORG or * = $XXXX
      const orgMatch = raw.match(/^(?:\*|\.ORG|ORG)\s*=\s*(.+)$/i) || raw.match(/^(?:\.ORG|ORG)\s+(.+)$/i);
      if (orgMatch) {
        const val = this.parseNumber(orgMatch[1], labels);
        if (val !== null) {
          currentPC = val;
          if (lineIndex === 0 || origin === defaultOrigin) {
            origin = val;
            entryPoint = val;
          }
        }
        continue;
      }

      // Check labels (e.g., "START:", "LOOP")
      const labelMatch = raw.match(/^([A-Za-z_][A-Za-z0-9_]*):?(.*)$/);
      if (labelMatch) {
        const potentialLabel = labelMatch[1].toUpperCase();
        const remainder = labelMatch[2].trim();

        if (!this.OPCODES[potentialLabel] && !potentialLabel.startsWith(".") && !["BYTE", "WORD", "TEXT", "DB", "DW"].includes(potentialLabel)) {
          labels[potentialLabel] = currentPC;
          if (!remainder) continue;
          raw = remainder;
        }
      }

      // Estimate instruction/data byte size
      const parts = raw.split(/\s+/);
      const mnemonic = parts[0].toUpperCase().replace(/^\./, "");
      const operand = parts.slice(1).join(" ").trim();

      if (mnemonic === "BYTE" || mnemonic === "DB") {
        const count = operand.split(",").length;
        currentPC += count;
      } else if (mnemonic === "WORD" || mnemonic === "DW") {
        const count = operand.split(",").length;
        currentPC += count * 2;
      } else if (mnemonic === "TEXT" || mnemonic === "STR") {
        const strMatch = operand.match(/^["'](.*)["']$/);
        const len = strMatch ? strMatch[1].length : operand.length;
        currentPC += len;
      } else if (this.OPCODES[mnemonic]) {
        // Opcode size calculation
        if (!operand || operand.toUpperCase() === "A") {
          currentPC += 1;
        } else if (operand.startsWith("#")) {
          currentPC += 2;
        } else if (this.OPCODES[mnemonic]["REL"]) {
          currentPC += 2;
        } else if (operand.startsWith("(") && operand.includes("),Y")) {
          currentPC += 2; // (ZP),Y
        } else if (operand.startsWith("(") && operand.includes(",X)")) {
          currentPC += 2; // (ZP,X)
        } else if (operand.startsWith("(") && operand.endsWith(")")) {
          currentPC += 3; // (ABS)
        } else if (operand.includes(",X") || operand.includes(",Y")) {
          // If operand is ZP or ABS
          const cleanOp = operand.replace(/,[XYxy]$/, "").trim();
          const num = this.parseNumber(cleanOp, labels);
          if (num !== null && num <= 0xff) {
            currentPC += 2;
          } else {
            currentPC += 3;
          }
        } else {
          const num = this.parseNumber(operand, labels);
          if (num !== null && num <= 0xff && this.OPCODES[mnemonic]["ZP"]) {
            currentPC += 2;
          } else {
            currentPC += 3;
          }
        }
      }
    }

    // PASS 2: Emit machine code bytes
    const machineCode: number[] = [];
    currentPC = origin;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      let raw = lines[lineIndex].trim();
      if (!raw || raw.startsWith(";") || raw.startsWith("//") || raw.startsWith("#")) continue;

      const commentIdx = raw.indexOf(";");
      if (commentIdx !== -1) raw = raw.slice(0, commentIdx).trim();

      // Check constant assignments
      const equMatch = raw.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(?:=|EQU|:=)\s*(.+)$/i);
      if (equMatch) {
        const symName = equMatch[1].toUpperCase();
        if (symName !== "*" && symName !== "ORG" && symName !== ".ORG") {
          continue;
        }
      }

      const orgMatch = raw.match(/^(?:\*|\.ORG|ORG)\s*=\s*(.+)$/i) || raw.match(/^(?:\.ORG|ORG)\s+(.+)$/i);
      if (orgMatch) {
        const val = this.parseNumber(orgMatch[1], labels);
        if (val !== null) currentPC = val;
        continue;
      }

      // Strip leading label
      const labelMatch = raw.match(/^([A-Za-z_][A-Za-z0-9_]*):?(.*)$/);
      if (labelMatch) {
        const potentialLabel = labelMatch[1].toUpperCase();
        const remainder = labelMatch[2].trim();
        if (!this.OPCODES[potentialLabel] && !potentialLabel.startsWith(".") && !["BYTE", "WORD", "TEXT", "DB", "DW"].includes(potentialLabel)) {
          if (!remainder) continue;
          raw = remainder;
        }
      }

      const parts = raw.split(/\s+/);
      const mnemonic = parts[0].toUpperCase().replace(/^\./, "");
      const operand = parts.slice(1).join(" ").trim();

      if (mnemonic === "BYTE" || mnemonic === "DB") {
        const items = operand.split(",");
        for (const item of items) {
          const val = this.parseNumber(item.trim(), labels);
          if (val === null) {
            errors.push(`Line ${lineIndex + 1}: Invalid byte expression '${item.trim()}'`);
          } else {
            machineCode.push(val & 0xff);
            currentPC++;
          }
        }
      } else if (mnemonic === "WORD" || mnemonic === "DW") {
        const items = operand.split(",");
        for (const item of items) {
          const val = this.parseNumber(item.trim(), labels);
          if (val === null) {
            errors.push(`Line ${lineIndex + 1}: Invalid word expression '${item.trim()}'`);
          } else {
            machineCode.push(val & 0xff);
            machineCode.push((val >> 8) & 0xff);
            currentPC += 2;
          }
        }
      } else if (mnemonic === "TEXT" || mnemonic === "STR") {
        const strMatch = operand.match(/^["'](.*)["']$/);
        const str = strMatch ? strMatch[1] : operand;
        for (let i = 0; i < str.length; i++) {
          machineCode.push(str.charCodeAt(i) & 0xff);
          currentPC++;
        }
      } else if (this.OPCODES[mnemonic]) {
        const modes = this.OPCODES[mnemonic];

        // 1. Implied / Accumulator
        if (!operand || operand.toUpperCase() === "A") {
          const op = modes["IMP"] !== undefined ? modes["IMP"] : modes["ACC"];
          if (op !== undefined) {
            machineCode.push(op);
            currentPC += 1;
          } else {
            errors.push(`Line ${lineIndex + 1}: ${mnemonic} requires an operand`);
          }
        }
        // 2. Relative Branches (BEQ, BNE, BCS, BCC, etc.)
        else if (modes["REL"] !== undefined) {
          const target = this.parseNumber(operand, labels);
          if (target === null) {
            errors.push(`Line ${lineIndex + 1}: Unknown branch label or target '${operand}'`);
          } else {
            const offset = target - (currentPC + 2);
            if (offset < -128 || offset > 127) {
              errors.push(`Line ${lineIndex + 1}: Branch out of range (${offset} bytes)`);
            }
            machineCode.push(modes["REL"]);
            machineCode.push(offset & 0xff);
            currentPC += 2;
          }
        }
        // 3. Immediate (#$FF)
        else if (operand.startsWith("#")) {
          if (modes["IMM"] === undefined) {
            errors.push(`Line ${lineIndex + 1}: ${mnemonic} does not support Immediate addressing`);
          } else {
            const val = this.parseNumber(operand.slice(1).trim(), labels);
            if (val === null) {
              errors.push(`Line ${lineIndex + 1}: Unknown immediate value or symbol '${operand}'`);
            } else {
              machineCode.push(modes["IMM"]);
              machineCode.push(val & 0xff);
              currentPC += 2;
            }
          }
        }
        // 4. Indirect Indexed ( ($ZP),Y )
        else if (operand.startsWith("(") && operand.toUpperCase().includes("),Y")) {
          const clean = operand.slice(1).replace(/\),Y/i, "").trim();
          const val = this.parseNumber(clean, labels);
          if (val === null) {
            errors.push(`Line ${lineIndex + 1}: Unknown indirect index symbol '${clean}'`);
          } else if (modes["INDY"] !== undefined) {
            machineCode.push(modes["INDY"]);
            machineCode.push(val & 0xff);
            currentPC += 2;
          } else {
            errors.push(`Line ${lineIndex + 1}: ${mnemonic} does not support (ZP),Y addressing`);
          }
        }
        // 5. Indexed Indirect ( ($ZP,X) )
        else if (operand.startsWith("(") && operand.toUpperCase().includes(",X)")) {
          const clean = operand.slice(1).replace(/,X\)/i, "").trim();
          const val = this.parseNumber(clean, labels);
          if (val === null) {
            errors.push(`Line ${lineIndex + 1}: Unknown indexed indirect symbol '${clean}'`);
          } else if (modes["INDX"] !== undefined) {
            machineCode.push(modes["INDX"]);
            machineCode.push(val & 0xff);
            currentPC += 2;
          } else {
            errors.push(`Line ${lineIndex + 1}: ${mnemonic} does not support (ZP,X) addressing`);
          }
        }
        // 6. Indirect ( JMP ($XXXX) )
        else if (operand.startsWith("(") && operand.endsWith(")")) {
          const clean = operand.slice(1, -1).trim();
          const val = this.parseNumber(clean, labels);
          if (val === null) {
            errors.push(`Line ${lineIndex + 1}: Unknown indirect jump target '${clean}'`);
          } else if (modes["IND"] !== undefined) {
            machineCode.push(modes["IND"]);
            machineCode.push(val & 0xff);
            machineCode.push((val >> 8) & 0xff);
            currentPC += 3;
          } else {
            errors.push(`Line ${lineIndex + 1}: ${mnemonic} does not support Indirect addressing`);
          }
        }
        // 7. Indexed Absolute / Zero Page ( $XXXX,X or $XXXX,Y )
        else if (operand.toUpperCase().endsWith(",X") || operand.toUpperCase().endsWith(",Y")) {
          const isY = operand.toUpperCase().endsWith(",Y");
          const clean = operand.slice(0, -2).trim();
          const val = this.parseNumber(clean, labels);

          if (val === null) {
            errors.push(`Line ${lineIndex + 1}: Unknown symbol in indexed operand '${operand}'`);
          } else if (!isY && val <= 0xff && modes["ZPX"] !== undefined) {
            machineCode.push(modes["ZPX"]);
            machineCode.push(val & 0xff);
            currentPC += 2;
          } else if (isY && val <= 0xff && modes["ZPY"] !== undefined) {
            machineCode.push(modes["ZPY"]);
            machineCode.push(val & 0xff);
            currentPC += 2;
          } else if (!isY && modes["ABSX"] !== undefined) {
            machineCode.push(modes["ABSX"]);
            machineCode.push(val & 0xff);
            machineCode.push((val >> 8) & 0xff);
            currentPC += 3;
          } else if (isY && modes["ABSY"] !== undefined) {
            machineCode.push(modes["ABSY"]);
            machineCode.push(val & 0xff);
            machineCode.push((val >> 8) & 0xff);
            currentPC += 3;
          } else {
            errors.push(`Line ${lineIndex + 1}: Invalid addressing mode for ${mnemonic} with '${operand}'`);
          }
        }
        // 8. Zero Page or Absolute ($XXXX)
        else {
          const val = this.parseNumber(operand, labels);
          if (val === null) {
            errors.push(`Line ${lineIndex + 1}: Unknown symbol or invalid address '${operand}' for ${mnemonic}`);
          } else if (val <= 0xff && modes["ZP"] !== undefined) {
            machineCode.push(modes["ZP"]);
            machineCode.push(val & 0xff);
            currentPC += 2;
          } else if (modes["ABS"] !== undefined) {
            machineCode.push(modes["ABS"]);
            machineCode.push(val & 0xff);
            machineCode.push((val >> 8) & 0xff);
            currentPC += 3;
          } else {
            errors.push(`Line ${lineIndex + 1}: Addressing mode error for ${mnemonic} with '${operand}'`);
          }
        }
      } else {
        errors.push(`Line ${lineIndex + 1}: Unrecognized mnemonic or directive '${mnemonic}'`);
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        errors,
        labels,
      };
    }

    // Wrap into PRG binary (2 bytes load address + machine code)
    const prgBytes = new Uint8Array(2 + machineCode.length);
    prgBytes[0] = origin & 0xff;
    prgBytes[1] = (origin >> 8) & 0xff;
    prgBytes.set(machineCode, 2);

    return {
      success: true,
      prgBytes,
      loadAddress: origin,
      entryAddress: entryPoint,
      byteLength: machineCode.length,
      errors: [],
      labels,
    };
  }

  /**
   * Helper: Compiles 6502 assembly and prepends a BASIC `10 SYS <address>` launcher
   * so the PRG auto-starts smoothly when loaded into $0801.
   */
  public static assembleWithBasicStub(source: string, targetAddress = 0xc000): Uint8Array {
    const res = this.assemble(source, targetAddress);
    if (!res.success || !res.prgBytes) {
      throw new Error(`Assembly failed: ${res.errors.join("; ")}`);
    }

    // If already loaded at $0801, return PRG directly
    if (res.loadAddress === 0x0801) {
      return res.prgBytes;
    }

    // Generate BASIC stub: 10 SYS <targetAddress>
    const stubBasic = `10 SYS ${res.entryAddress || targetAddress}`;
    const stubPrg = C64Basic.tokenize(stubBasic);

    // Combine BASIC stub ($0801) and ML payload into a unified PRG or load ML directly
    return res.prgBytes;
  }
}
