/**
 * 6502 / 6510 Machine Code Disassembler & KERNAL Symbol Annotator
 * Disassembles machine code instructions from memory, resolves addressing modes,
 * and annotates standard C64 KERNAL jump vectors and I/O hardware registers.
 */

import { C64Memory } from "./c64_memory";

export enum AddrMode {
  IMP,
  ACC,
  IMM,
  ZP,
  ZPX,
  ZPY,
  REL,
  ABS,
  ABX,
  ABY,
  IND,
  IZX,
  IZY,
}

export interface DisassembledInstruction {
  address: number;
  addressHex: string;
  bytes: number[];
  bytesHex: string;
  mnemonic: string;
  operand: string;
  symbol?: string;
  size: number;
}

export class C64Disassembler {
  // Known KERNAL and I/O Symbols for clean disassembly annotations
  public static readonly SYMBOLS: { [addr: number]: string } = {
    0x0001: "CPU_PORT",
    0x002b: "TXTTAB_LO",
    0x002c: "TXTTAB_HI",
    0x002d: "VARTAB_LO",
    0x002e: "VARTAB_HI",
    0x0286: "CURRENT_COLOR",
    0x0314: "CINV_IRQ_LO",
    0x0315: "CINV_IRQ_HI",
    0x0318: "NMINV_NMI_LO",
    0x0319: "NMINV_NMI_HI",
    0xd000: "VIC_SP0_X",
    0xd001: "VIC_SP0_Y",
    0xd011: "VIC_CTRL1",
    0xd012: "VIC_RASTER",
    0xd016: "VIC_CTRL2",
    0xd018: "VIC_VMEM",
    0xd019: "VIC_IRQ_STATUS",
    0xd01a: "VIC_IRQ_MASK",
    0xd020: "VIC_BORDER_COLOR",
    0xd021: "VIC_BG_COLOR0",
    0xd400: "SID_V1_FREQ_LO",
    0xd401: "SID_V1_FREQ_HI",
    0xd404: "SID_V1_CTRL",
    0xd418: "SID_FILTER_VOL",
    0xd800: "COLOR_RAM",
    0xdc00: "CIA1_PORT_A_JOY2",
    0xdc01: "CIA1_PORT_B_JOY1",
    0xdc04: "CIA1_TIMER_A_LO",
    0xdc05: "CIA1_TIMER_A_HI",
    0xdc0d: "CIA1_ICR",
    0xdc0e: "CIA1_CRA",
    0xdd00: "CIA2_PORT_A_VIC_BANK",
    0xdd0d: "CIA2_ICR",
    0xff81: "KERNAL_SCINIT",
    0xff84: "KERNAL_IOINIT",
    0xff87: "KERNAL_RAMTAS",
    0xff90: "KERNAL_SETMSG",
    0xff9f: "KERNAL_SCNKEY",
    0xffba: "KERNAL_SETLFS",
    0xffbd: "KERNAL_SETNAM",
    0xffc6: "KERNAL_CHKIN",
    0xffc9: "KERNAL_CHKOUT",
    0xffcf: "KERNAL_CHRIN",
    0xffd2: "KERNAL_CHROUT",
    0xffd5: "KERNAL_LOAD",
    0xffd8: "KERNAL_SAVE",
    0xffe1: "KERNAL_STOP",
    0xffe4: "KERNAL_GETIN",
    0xfff0: "KERNAL_PLOT",
    0xfffe: "VECTOR_IRQ",
    0xfffc: "VECTOR_RESET",
    0xfffa: "VECTOR_NMI",
  };

  // Disassemble a single instruction at given memory address
  public static disassembleInstruction(memory: C64Memory, addr: number): DisassembledInstruction {
    const opcode = memory.read(addr);
    const bytes: number[] = [opcode];

    // Decode opcode details
    const { mnemonic, mode, size } = this.getOpcodeInfo(opcode);

    for (let i = 1; i < size; i++) {
      bytes.push(memory.read((addr + i) & 0xffff));
    }

    const bytesHex = bytes.map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join(" ");
    let operand = "";
    let symbol: string | undefined;

    if (mode === AddrMode.IMM) {
      operand = `#$${bytes[1].toString(16).padStart(2, "0").toUpperCase()}`;
    } else if (mode === AddrMode.ZP) {
      const target = bytes[1];
      operand = `$${target.toString(16).padStart(2, "0").toUpperCase()}`;
      symbol = this.SYMBOLS[target];
    } else if (mode === AddrMode.ZPX) {
      operand = `$${bytes[1].toString(16).padStart(2, "0").toUpperCase()},X`;
    } else if (mode === AddrMode.ZPY) {
      operand = `$${bytes[1].toString(16).padStart(2, "0").toUpperCase()},Y`;
    } else if (mode === AddrMode.ABS) {
      const target = bytes[1] | (bytes[2] << 8);
      operand = `$${target.toString(16).padStart(4, "0").toUpperCase()}`;
      symbol = this.SYMBOLS[target];
    } else if (mode === AddrMode.ABX) {
      const target = bytes[1] | (bytes[2] << 8);
      operand = `$${target.toString(16).padStart(4, "0").toUpperCase()},X`;
      symbol = this.SYMBOLS[target];
    } else if (mode === AddrMode.ABY) {
      const target = bytes[1] | (bytes[2] << 8);
      operand = `$${target.toString(16).padStart(4, "0").toUpperCase()},Y`;
      symbol = this.SYMBOLS[target];
    } else if (mode === AddrMode.IND) {
      const target = bytes[1] | (bytes[2] << 8);
      operand = `($${target.toString(16).padStart(4, "0").toUpperCase()})`;
      symbol = this.SYMBOLS[target];
    } else if (mode === AddrMode.IZX) {
      operand = `($${bytes[1].toString(16).padStart(2, "0").toUpperCase()},X)`;
    } else if (mode === AddrMode.IZY) {
      operand = `($${bytes[1].toString(16).padStart(2, "0").toUpperCase()}),Y`;
    } else if (mode === AddrMode.REL) {
      const offset = (bytes[1] << 24) >> 24; // Sign extend 8-bit
      const target = (addr + 2 + offset) & 0xffff;
      operand = `$${target.toString(16).padStart(4, "0").toUpperCase()}`;
    } else if (mode === AddrMode.ACC) {
      operand = "A";
    }

    return {
      address: addr,
      addressHex: `$${addr.toString(16).padStart(4, "0").toUpperCase()}`,
      bytes,
      bytesHex,
      mnemonic,
      operand,
      symbol,
      size,
    };
  }

  // Disassemble N instructions starting at startAddr
  public static disassembleRange(memory: C64Memory, startAddr: number, count = 20): DisassembledInstruction[] {
    const list: DisassembledInstruction[] = [];
    let current = startAddr & 0xffff;

    for (let i = 0; i < count; i++) {
      const inst = this.disassembleInstruction(memory, current);
      list.push(inst);
      current = (current + inst.size) & 0xffff;
    }

    return list;
  }

  private static getOpcodeInfo(op: number): { mnemonic: string; mode: AddrMode; size: number } {
    switch (op) {
      case 0x00: return { mnemonic: "BRK", mode: AddrMode.IMP, size: 1 };
      case 0x01: return { mnemonic: "ORA", mode: AddrMode.IZX, size: 2 };
      case 0x05: return { mnemonic: "ORA", mode: AddrMode.ZP, size: 2 };
      case 0x06: return { mnemonic: "ASL", mode: AddrMode.ZP, size: 2 };
      case 0x08: return { mnemonic: "PHP", mode: AddrMode.IMP, size: 1 };
      case 0x09: return { mnemonic: "ORA", mode: AddrMode.IMM, size: 2 };
      case 0x0a: return { mnemonic: "ASL", mode: AddrMode.ACC, size: 1 };
      case 0x0d: return { mnemonic: "ORA", mode: AddrMode.ABS, size: 3 };
      case 0x0e: return { mnemonic: "ASL", mode: AddrMode.ABS, size: 3 };
      case 0x10: return { mnemonic: "BPL", mode: AddrMode.REL, size: 2 };
      case 0x11: return { mnemonic: "ORA", mode: AddrMode.IZY, size: 2 };
      case 0x15: return { mnemonic: "ORA", mode: AddrMode.ZPX, size: 2 };
      case 0x16: return { mnemonic: "ASL", mode: AddrMode.ZPX, size: 2 };
      case 0x18: return { mnemonic: "CLC", mode: AddrMode.IMP, size: 1 };
      case 0x19: return { mnemonic: "ORA", mode: AddrMode.ABY, size: 3 };
      case 0x1d: return { mnemonic: "ORA", mode: AddrMode.ABX, size: 3 };
      case 0x1e: return { mnemonic: "ASL", mode: AddrMode.ABX, size: 3 };
      case 0x20: return { mnemonic: "JSR", mode: AddrMode.ABS, size: 3 };
      case 0x21: return { mnemonic: "AND", mode: AddrMode.IZX, size: 2 };
      case 0x24: return { mnemonic: "BIT", mode: AddrMode.ZP, size: 2 };
      case 0x25: return { mnemonic: "AND", mode: AddrMode.ZP, size: 2 };
      case 0x26: return { mnemonic: "ROL", mode: AddrMode.ZP, size: 2 };
      case 0x28: return { mnemonic: "PLP", mode: AddrMode.IMP, size: 1 };
      case 0x29: return { mnemonic: "AND", mode: AddrMode.IMM, size: 2 };
      case 0x2a: return { mnemonic: "ROL", mode: AddrMode.ACC, size: 1 };
      case 0x2c: return { mnemonic: "BIT", mode: AddrMode.ABS, size: 3 };
      case 0x2d: return { mnemonic: "AND", mode: AddrMode.ABS, size: 3 };
      case 0x2e: return { mnemonic: "ROL", mode: AddrMode.ABS, size: 3 };
      case 0x30: return { mnemonic: "BMI", mode: AddrMode.REL, size: 2 };
      case 0x31: return { mnemonic: "AND", mode: AddrMode.IZY, size: 2 };
      case 0x35: return { mnemonic: "AND", mode: AddrMode.ZPX, size: 2 };
      case 0x36: return { mnemonic: "ROL", mode: AddrMode.ZPX, size: 2 };
      case 0x38: return { mnemonic: "SEC", mode: AddrMode.IMP, size: 1 };
      case 0x39: return { mnemonic: "AND", mode: AddrMode.ABY, size: 3 };
      case 0x3d: return { mnemonic: "AND", mode: AddrMode.ABX, size: 3 };
      case 0x3e: return { mnemonic: "ROL", mode: AddrMode.ABX, size: 3 };
      case 0x40: return { mnemonic: "RTI", mode: AddrMode.IMP, size: 1 };
      case 0x41: return { mnemonic: "EOR", mode: AddrMode.IZX, size: 2 };
      case 0x45: return { mnemonic: "EOR", mode: AddrMode.ZP, size: 2 };
      case 0x46: return { mnemonic: "LSR", mode: AddrMode.ZP, size: 2 };
      case 0x48: return { mnemonic: "PHA", mode: AddrMode.IMP, size: 1 };
      case 0x49: return { mnemonic: "EOR", mode: AddrMode.IMM, size: 2 };
      case 0x4a: return { mnemonic: "LSR", mode: AddrMode.ACC, size: 1 };
      case 0x4c: return { mnemonic: "JMP", mode: AddrMode.ABS, size: 3 };
      case 0x4d: return { mnemonic: "EOR", mode: AddrMode.ABS, size: 3 };
      case 0x4e: return { mnemonic: "LSR", mode: AddrMode.ABS, size: 3 };
      case 0x50: return { mnemonic: "BVC", mode: AddrMode.REL, size: 2 };
      case 0x51: return { mnemonic: "EOR", mode: AddrMode.IZY, size: 2 };
      case 0x55: return { mnemonic: "EOR", mode: AddrMode.ZPX, size: 2 };
      case 0x56: return { mnemonic: "LSR", mode: AddrMode.ZPX, size: 2 };
      case 0x58: return { mnemonic: "CLI", mode: AddrMode.IMP, size: 1 };
      case 0x59: return { mnemonic: "EOR", mode: AddrMode.ABY, size: 3 };
      case 0x5d: return { mnemonic: "EOR", mode: AddrMode.ABX, size: 3 };
      case 0x5e: return { mnemonic: "LSR", mode: AddrMode.ABX, size: 3 };
      case 0x60: return { mnemonic: "RTS", mode: AddrMode.IMP, size: 1 };
      case 0x61: return { mnemonic: "ADC", mode: AddrMode.IZX, size: 2 };
      case 0x65: return { mnemonic: "ADC", mode: AddrMode.ZP, size: 2 };
      case 0x66: return { mnemonic: "ROR", mode: AddrMode.ZP, size: 2 };
      case 0x68: return { mnemonic: "PLA", mode: AddrMode.IMP, size: 1 };
      case 0x69: return { mnemonic: "ADC", mode: AddrMode.IMM, size: 2 };
      case 0x6a: return { mnemonic: "ROR", mode: AddrMode.ACC, size: 1 };
      case 0x6c: return { mnemonic: "JMP", mode: AddrMode.IND, size: 3 };
      case 0x6d: return { mnemonic: "ADC", mode: AddrMode.ABS, size: 3 };
      case 0x6e: return { mnemonic: "ROR", mode: AddrMode.ABS, size: 3 };
      case 0x70: return { mnemonic: "BVS", mode: AddrMode.REL, size: 2 };
      case 0x71: return { mnemonic: "ADC", mode: AddrMode.IZY, size: 2 };
      case 0x75: return { mnemonic: "ADC", mode: AddrMode.ZPX, size: 2 };
      case 0x76: return { mnemonic: "ROR", mode: AddrMode.ZPX, size: 2 };
      case 0x78: return { mnemonic: "SEI", mode: AddrMode.IMP, size: 1 };
      case 0x79: return { mnemonic: "ADC", mode: AddrMode.ABY, size: 3 };
      case 0x7d: return { mnemonic: "ADC", mode: AddrMode.ABX, size: 3 };
      case 0x7e: return { mnemonic: "ROR", mode: AddrMode.ABX, size: 3 };
      case 0x81: return { mnemonic: "STA", mode: AddrMode.IZX, size: 2 };
      case 0x84: return { mnemonic: "STY", mode: AddrMode.ZP, size: 2 };
      case 0x85: return { mnemonic: "STA", mode: AddrMode.ZP, size: 2 };
      case 0x86: return { mnemonic: "STX", mode: AddrMode.ZP, size: 2 };
      case 0x88: return { mnemonic: "DEY", mode: AddrMode.IMP, size: 1 };
      case 0x8a: return { mnemonic: "TXA", mode: AddrMode.IMP, size: 1 };
      case 0x8c: return { mnemonic: "STY", mode: AddrMode.ABS, size: 3 };
      case 0x8d: return { mnemonic: "STA", mode: AddrMode.ABS, size: 3 };
      case 0x8e: return { mnemonic: "STX", mode: AddrMode.ABS, size: 3 };
      case 0x90: return { mnemonic: "BCC", mode: AddrMode.REL, size: 2 };
      case 0x91: return { mnemonic: "STA", mode: AddrMode.IZY, size: 2 };
      case 0x94: return { mnemonic: "STY", mode: AddrMode.ZPX, size: 2 };
      case 0x95: return { mnemonic: "STA", mode: AddrMode.ZPX, size: 2 };
      case 0x96: return { mnemonic: "STX", mode: AddrMode.ZPY, size: 2 };
      case 0x98: return { mnemonic: "TYA", mode: AddrMode.IMP, size: 1 };
      case 0x99: return { mnemonic: "STA", mode: AddrMode.ABY, size: 3 };
      case 0x9a: return { mnemonic: "TXS", mode: AddrMode.IMP, size: 1 };
      case 0x9d: return { mnemonic: "STA", mode: AddrMode.ABX, size: 3 };
      case 0xa0: return { mnemonic: "LDY", mode: AddrMode.IMM, size: 2 };
      case 0xa1: return { mnemonic: "LDA", mode: AddrMode.IZX, size: 2 };
      case 0xa2: return { mnemonic: "LDX", mode: AddrMode.IMM, size: 2 };
      case 0xa4: return { mnemonic: "LDY", mode: AddrMode.ZP, size: 2 };
      case 0xa5: return { mnemonic: "LDA", mode: AddrMode.ZP, size: 2 };
      case 0xa6: return { mnemonic: "LDX", mode: AddrMode.ZP, size: 2 };
      case 0xa8: return { mnemonic: "TAY", mode: AddrMode.IMP, size: 1 };
      case 0xa9: return { mnemonic: "LDA", mode: AddrMode.IMM, size: 2 };
      case 0xaa: return { mnemonic: "TAX", mode: AddrMode.IMP, size: 1 };
      case 0xac: return { mnemonic: "LDY", mode: AddrMode.ABS, size: 3 };
      case 0xad: return { mnemonic: "LDA", mode: AddrMode.ABS, size: 3 };
      case 0xae: return { mnemonic: "LDX", mode: AddrMode.ABS, size: 3 };
      case 0xb0: return { mnemonic: "BCS", mode: AddrMode.REL, size: 2 };
      case 0xb1: return { mnemonic: "LDA", mode: AddrMode.IZY, size: 2 };
      case 0xb4: return { mnemonic: "LDY", mode: AddrMode.ZPX, size: 2 };
      case 0xb5: return { mnemonic: "LDA", mode: AddrMode.ZPX, size: 2 };
      case 0xb6: return { mnemonic: "LDX", mode: AddrMode.ZPY, size: 2 };
      case 0xb8: return { mnemonic: "CLV", mode: AddrMode.IMP, size: 1 };
      case 0xb9: return { mnemonic: "LDA", mode: AddrMode.ABY, size: 3 };
      case 0xba: return { mnemonic: "TSX", mode: AddrMode.IMP, size: 1 };
      case 0xbc: return { mnemonic: "LDY", mode: AddrMode.ABX, size: 3 };
      case 0xbd: return { mnemonic: "LDA", mode: AddrMode.ABX, size: 3 };
      case 0xbe: return { mnemonic: "LDX", mode: AddrMode.ABY, size: 3 };
      case 0xc0: return { mnemonic: "CPY", mode: AddrMode.IMM, size: 2 };
      case 0xc1: return { mnemonic: "CMP", mode: AddrMode.IZX, size: 2 };
      case 0xc4: return { mnemonic: "CPY", mode: AddrMode.ZP, size: 2 };
      case 0xc5: return { mnemonic: "CMP", mode: AddrMode.ZP, size: 2 };
      case 0xc6: return { mnemonic: "DEC", mode: AddrMode.ZP, size: 2 };
      case 0xc8: return { mnemonic: "INY", mode: AddrMode.IMP, size: 1 };
      case 0xc9: return { mnemonic: "CMP", mode: AddrMode.IMM, size: 2 };
      case 0xca: return { mnemonic: "DEX", mode: AddrMode.IMP, size: 1 };
      case 0xcc: return { mnemonic: "CPY", mode: AddrMode.ABS, size: 3 };
      case 0xcd: return { mnemonic: "CMP", mode: AddrMode.ABS, size: 3 };
      case 0xce: return { mnemonic: "DEC", mode: AddrMode.ABS, size: 3 };
      case 0xd0: return { mnemonic: "BNE", mode: AddrMode.REL, size: 2 };
      case 0xd1: return { mnemonic: "CMP", mode: AddrMode.IZY, size: 2 };
      case 0xd5: return { mnemonic: "CMP", mode: AddrMode.ZPX, size: 2 };
      case 0xd6: return { mnemonic: "DEC", mode: AddrMode.ZPX, size: 2 };
      case 0xd8: return { mnemonic: "CLD", mode: AddrMode.IMP, size: 1 };
      case 0xd9: return { mnemonic: "CMP", mode: AddrMode.ABY, size: 3 };
      case 0xdd: return { mnemonic: "CMP", mode: AddrMode.ABX, size: 3 };
      case 0xde: return { mnemonic: "DEC", mode: AddrMode.ABX, size: 3 };
      case 0xe0: return { mnemonic: "CPX", mode: AddrMode.IMM, size: 2 };
      case 0xe1: return { mnemonic: "SBC", mode: AddrMode.IZX, size: 2 };
      case 0xe4: return { mnemonic: "CPX", mode: AddrMode.ZP, size: 2 };
      case 0xe5: return { mnemonic: "SBC", mode: AddrMode.ZP, size: 2 };
      case 0xe6: return { mnemonic: "INC", mode: AddrMode.ZP, size: 2 };
      case 0xe8: return { mnemonic: "INX", mode: AddrMode.IMP, size: 1 };
      case 0xe9: return { mnemonic: "SBC", mode: AddrMode.IMM, size: 2 };
      case 0xea: return { mnemonic: "NOP", mode: AddrMode.IMP, size: 1 };
      case 0xec: return { mnemonic: "CPX", mode: AddrMode.ABS, size: 3 };
      case 0xed: return { mnemonic: "SBC", mode: AddrMode.ABS, size: 3 };
      case 0xee: return { mnemonic: "INC", mode: AddrMode.ABS, size: 3 };
      case 0xf0: return { mnemonic: "BEQ", mode: AddrMode.REL, size: 2 };
      case 0xf1: return { mnemonic: "SBC", mode: AddrMode.IZY, size: 2 };
      case 0xf5: return { mnemonic: "SBC", mode: AddrMode.ZPX, size: 2 };
      case 0xf6: return { mnemonic: "INC", mode: AddrMode.ZPX, size: 2 };
      case 0xf8: return { mnemonic: "SED", mode: AddrMode.IMP, size: 1 };
      case 0xf9: return { mnemonic: "SBC", mode: AddrMode.ABY, size: 3 };
      case 0xfd: return { mnemonic: "SBC", mode: AddrMode.ABX, size: 3 };
      case 0xfe: return { mnemonic: "INC", mode: AddrMode.ABX, size: 3 };

      // Unofficial Opcodes
      case 0xeb: return { mnemonic: "SBC*", mode: AddrMode.IMM, size: 2 };
      case 0xa7: return { mnemonic: "LAX", mode: AddrMode.ZP, size: 2 };
      case 0xb7: return { mnemonic: "LAX", mode: AddrMode.ZPY, size: 2 };
      case 0xaf: return { mnemonic: "LAX", mode: AddrMode.ABS, size: 3 };
      case 0xbf: return { mnemonic: "LAX", mode: AddrMode.ABY, size: 3 };
      case 0xa3: return { mnemonic: "LAX", mode: AddrMode.IZX, size: 2 };
      case 0xb3: return { mnemonic: "LAX", mode: AddrMode.IZY, size: 2 };
      case 0xab: return { mnemonic: "LAX*", mode: AddrMode.IMM, size: 2 };

      case 0x87: return { mnemonic: "SAX", mode: AddrMode.ZP, size: 2 };
      case 0x97: return { mnemonic: "SAX", mode: AddrMode.ZPY, size: 2 };
      case 0x8f: return { mnemonic: "SAX", mode: AddrMode.ABS, size: 3 };
      case 0x83: return { mnemonic: "SAX", mode: AddrMode.IZX, size: 2 };

      case 0xc7: return { mnemonic: "DCP", mode: AddrMode.ZP, size: 2 };
      case 0xd7: return { mnemonic: "DCP", mode: AddrMode.ZPX, size: 2 };
      case 0xcf: return { mnemonic: "DCP", mode: AddrMode.ABS, size: 3 };
      case 0xdf: return { mnemonic: "DCP", mode: AddrMode.ABX, size: 3 };
      case 0xdb: return { mnemonic: "DCP", mode: AddrMode.ABY, size: 3 };
      case 0xc3: return { mnemonic: "DCP", mode: AddrMode.IZX, size: 2 };
      case 0xd3: return { mnemonic: "DCP", mode: AddrMode.IZY, size: 2 };

      case 0xe7: return { mnemonic: "ISC", mode: AddrMode.ZP, size: 2 };
      case 0xf7: return { mnemonic: "ISC", mode: AddrMode.ZPX, size: 2 };
      case 0xef: return { mnemonic: "ISC", mode: AddrMode.ABS, size: 3 };
      case 0xff: return { mnemonic: "ISC", mode: AddrMode.ABX, size: 3 };
      case 0xfb: return { mnemonic: "ISC", mode: AddrMode.ABY, size: 3 };
      case 0xe3: return { mnemonic: "ISC", mode: AddrMode.IZX, size: 2 };
      case 0xf3: return { mnemonic: "ISC", mode: AddrMode.IZY, size: 2 };

      case 0x07: return { mnemonic: "SLO", mode: AddrMode.ZP, size: 2 };
      case 0x17: return { mnemonic: "SLO", mode: AddrMode.ZPX, size: 2 };
      case 0x0f: return { mnemonic: "SLO", mode: AddrMode.ABS, size: 3 };
      case 0x1f: return { mnemonic: "SLO", mode: AddrMode.ABX, size: 3 };
      case 0x1b: return { mnemonic: "SLO", mode: AddrMode.ABY, size: 3 };
      case 0x03: return { mnemonic: "SLO", mode: AddrMode.IZX, size: 2 };
      case 0x13: return { mnemonic: "SLO", mode: AddrMode.IZY, size: 2 };

      case 0x27: return { mnemonic: "RLA", mode: AddrMode.ZP, size: 2 };
      case 0x37: return { mnemonic: "RLA", mode: AddrMode.ZPX, size: 2 };
      case 0x2f: return { mnemonic: "RLA", mode: AddrMode.ABS, size: 3 };
      case 0x3f: return { mnemonic: "RLA", mode: AddrMode.ABX, size: 3 };
      case 0x3b: return { mnemonic: "RLA", mode: AddrMode.ABY, size: 3 };
      case 0x23: return { mnemonic: "RLA", mode: AddrMode.IZX, size: 2 };
      case 0x33: return { mnemonic: "RLA", mode: AddrMode.IZY, size: 2 };

      case 0x47: return { mnemonic: "SRE", mode: AddrMode.ZP, size: 2 };
      case 0x57: return { mnemonic: "SRE", mode: AddrMode.ZPX, size: 2 };
      case 0x4f: return { mnemonic: "SRE", mode: AddrMode.ABS, size: 3 };
      case 0x5f: return { mnemonic: "SRE", mode: AddrMode.ABX, size: 3 };
      case 0x5b: return { mnemonic: "SRE", mode: AddrMode.ABY, size: 3 };
      case 0x43: return { mnemonic: "SRE", mode: AddrMode.IZX, size: 2 };
      case 0x53: return { mnemonic: "SRE", mode: AddrMode.IZY, size: 2 };

      case 0x67: return { mnemonic: "RRA", mode: AddrMode.ZP, size: 2 };
      case 0x77: return { mnemonic: "RRA", mode: AddrMode.ZPX, size: 2 };
      case 0x6f: return { mnemonic: "RRA", mode: AddrMode.ABS, size: 3 };
      case 0x7f: return { mnemonic: "RRA", mode: AddrMode.ABX, size: 3 };
      case 0x7b: return { mnemonic: "RRA", mode: AddrMode.ABY, size: 3 };
      case 0x63: return { mnemonic: "RRA", mode: AddrMode.IZX, size: 2 };
      case 0x73: return { mnemonic: "RRA", mode: AddrMode.IZY, size: 2 };

      case 0x0b:
      case 0x2b: return { mnemonic: "ANC", mode: AddrMode.IMM, size: 2 };
      case 0x4b: return { mnemonic: "ALR", mode: AddrMode.IMM, size: 2 };
      case 0x6b: return { mnemonic: "ARR", mode: AddrMode.IMM, size: 2 };
      case 0xcb: return { mnemonic: "SBX", mode: AddrMode.IMM, size: 2 };
      case 0xbb: return { mnemonic: "LAS", mode: AddrMode.ABY, size: 3 };
      case 0x93: return { mnemonic: "SHA", mode: AddrMode.IZY, size: 2 };
      case 0x9f: return { mnemonic: "SHA", mode: AddrMode.ABY, size: 3 };
      case 0x9e: return { mnemonic: "SHX", mode: AddrMode.ABY, size: 3 };
      case 0x9c: return { mnemonic: "SHY", mode: AddrMode.ABX, size: 3 };

      default: return { mnemonic: `??? ($${op.toString(16).toUpperCase()})`, mode: AddrMode.IMP, size: 1 };
    }
  }
}
