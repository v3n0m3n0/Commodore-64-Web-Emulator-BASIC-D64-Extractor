/**
 * Commodore 64 Memory Bus & Banking Architecture
 * ===============================================
 * Handles 64KB RAM, Color RAM, Basic/Kernal/Char ROMs banking via 6510 Port ($0000/$0001),
 * I/O address mapping ($D000-$DFFF), Cartridge support, and direct PRG injection.
 */

import { C64ROMs } from "./c64_roms";

export interface MemoryDevice {
  read(addr: number): number;
  write(addr: number, val: number): void;
}

export class C64Memory {
  public ram: Uint8Array = new Uint8Array(65536);
  public colorRam: Uint8Array = new Uint8Array(1024);

  // ROMs (8KB Basic, 8KB Kernal, 4KB Chargen)
  public basicRom: Uint8Array = new Uint8Array(8192);
  public kernalRom: Uint8Array = new Uint8Array(8192);
  public charRom: Uint8Array = new Uint8Array(4096);

  // 6510 Processor Port Registers
  public portDDR: number = 0x2f;   // Address $0000
  public portData: number = 0x37;  // Address $0001 (LORAM=1, HIRAM=1, CHAREN=1)

  // Cached banking flags
  public _loram: boolean = true;
  public _hiram: boolean = true;
  public _charen: boolean = true;

  // Peripheral references
  public vic: any = null;
  public sid: any = null;
  public cia1: any = null;
  public cia2: any = null;

  // Cartridge support
  public cartridgeAttached: boolean = false;
  public cartridgeType: number = 0;
  public cartRomLo: Uint8Array | null = null;
  public cartRomHi: Uint8Array | null = null;
  public cartRomBanks: Uint8Array[] = [];
  public cartBank: number = 0;
  public cartControl: number = 0;
  public gameLine: boolean = true;
  public exromLine: boolean = true;

  constructor() {
    this.loadSystemRoms();
    this.reset();
  }

  public loadSystemRoms() {
    C64ROMs.init();
    this.basicRom.set(C64ROMs.basicRom);
    this.kernalRom.set(C64ROMs.kernalRom);
    this.charRom.set(C64ROMs.charRom);
  }

  public reset() {
    this.ram.fill(0);
    this.colorRam.fill(0x0e); // Light blue default text color
    this.cartridgeAttached = false;
    this.cartRomBanks = [];
    this.cartRomLo = null;
    this.cartRomHi = null;

    this.portDDR = 0x2f;
    this.portData = 0x37;
    this.ram[0x0000] = this.portDDR;
    this.ram[0x0001] = this.portData;
    this._loram = true;
    this._hiram = true;
    this._charen = true;

    // ── KERNAL Zero Page defaults ──────────────────────────────────────
    // Source: KERNAL_C64_03, init routine at $E518 + RESTOR at $FF8A
    this.ram[0x0090] = 0x00; // STATUS – I/O status word (no errors)
    this.ram[0x0091] = 0x00; // STKEY  – STOP key flag
    this.ram[0x0093] = 0x00; // VERCK  – LOAD(0)/VERIFY(1) flag
    this.ram[0x009a] = 0x03; // DFLTN  – default input device (3 = screen/kbd)
    this.ram[0x009b] = 0x03; // DFLTO  – default output device (3 = screen)
    this.ram[0x009d] = 0x00; // MSGFLG – KERNAL message flag
    this.ram[0x009e] = 0x37; // PTR1   – default tape timer value
    this.ram[0x009f] = 0x00; // PTR2   – tape end-of-tape flag
    this.ram[0x00a0] = 0x00; // TIME HI – Jiffy Clock high byte
    this.ram[0x00a1] = 0x00; // TIME MID
    this.ram[0x00a2] = 0x00; // TIME LO – Jiffy Clock low byte
    this.ram[0x00a3] = 0x00; // EAL    – pointer for floating point
    this.ram[0x00b2] = 0x3c; // TAPE1 LO – tape buffer start address low ($033C)
    this.ram[0x00b3] = 0x03; // TAPE1 HI – tape buffer start address high ($033C)
    this.ram[0x00c6] = 0x00; // NDX    – number of chars in keyboard buffer ($00C6)
    this.ram[0x00c7] = 0x00; // RVS    – reverse field flag
    this.ram[0x00c9] = 0x00; // INDX   – pointer for keyboard processing
    this.ram[0x00cb] = 0x40; // BLNSW  – cursor blink enable
    this.ram[0x00cc] = 0x01; // BLNCT  – cursor blink counter
    this.ram[0x00cd] = 0x00; // GDBLN  – character under cursor
    this.ram[0x00ce] = 0x00; // BLNON  – blink state
    this.ram[0x00cf] = 0x00; // CRSW   – input vs screen mode
    this.ram[0x00d3] = 0x00; // PNTR   – cursor column
    this.ram[0x00d6] = 0x00; // TBLX   – cursor row
    this.ram[0x00d8] = 0x00; // INSRT  – insert mode flag
    this.ram[0x0286] = 0x0e; // COLOR  – current text color (light blue)
    this.ram[0x0288] = 0x04; // HIBASE – high byte of screen base ($0400)

    // ── BASIC startup pointers ─────────────────────────────────────────
    this.ram[0x2b] = 0x01; // TXTTAB LO – start of BASIC ($0801)
    this.ram[0x2c] = 0x08; // TXTTAB HI
    this.ram[0x2d] = 0x01; // VARTAB LO
    this.ram[0x2e] = 0x08; // VARTAB HI
    this.ram[0x2f] = 0x01; // ARYTAB LO
    this.ram[0x30] = 0x08; // ARYTAB HI
    this.ram[0x31] = 0x01; // STREND LO
    this.ram[0x32] = 0x08; // STREND HI
    this.ram[0x33] = 0x00; // FRETOP LO – string storage bottom ($A000 = 40960)
    this.ram[0x34] = 0xa0; // FRETOP HI
    this.ram[0x37] = 0x00; // MEMSIZ LO – top of BASIC memory ($A000 = 40960)
    this.ram[0x38] = 0xa0; // MEMSIZ HI

    // ── BASIC Zero Page CHRGET/CHRGOT routine ($0073-$008A) ────────────
    // Source: C64 KERNAL/BASIC init table at $E3A0-$E3B7.
    const chrget = [
      0xe6, 0x7a,       // $0073: INC $7A       – TXTPTR lo++ (CHRGET entry point)
      0xd0, 0x02,       // $0075: BNE $0079     – no carry: skip hi-byte increment
      0xe6, 0x7b,       // $0077: INC $7B       – TXTPTR hi++ (carry propagate)
      0xad, 0x00, 0x08, // $0079: LDA $0800     – read char at TXTPTR (CHRGOT entry)
      0xc9, 0x3a,       // $007C: CMP #':'      – ':' or above = end of statement token
      0xb0, 0x0a,       // $007E: BCS $008A     – ≥ ':' → not a digit, exit with C set
      0xc9, 0x20,       // $0080: CMP #' '      – space character?
      0xf0, 0xef,       // $0082: BEQ $0073     – yes → skip space, fetch next char
      0x38,             // $0084: SEC
      0xe9, 0x30,       // $0085: SBC #$30      – subtract ASCII '0' (checks if digit)
      0x38,             // $0087: SEC
      0xe9, 0xd0,       // $0088: SBC #$D0      – carry clear if char was a digit 0–9
      0x60,             // $008A: RTS
    ];
    for (let i = 0; i < chrget.length; i++) {
      this.ram[0x0073 + i] = chrget[i];
    }

    // ── BASIC RAM vectors ($0300-$030B) ────────────────────────────────
    // Source: C64 BASIC V2 initialization ($E453)
    this._setWord(0x0300, 0xe38b); // IERROR – Error message
    this._setWord(0x0302, 0xa483); // IMAIN  – BASIC warm start / direct loop
    this._setWord(0x0304, 0xa57c); // ICRNCH – Tokenize line
    this._setWord(0x0306, 0xa717); // IQPLOP – List line
    this._setWord(0x0308, 0xa7e4); // IGONE  – Execute statement
    this._setWord(0x030a, 0xae86); // IEVAL  – Evaluate expression

    // ── KERNAL RAM vectors ($0314-$032F) ───────────────────────────────
    // Source: cbmsrc KERNAL_C64_03, RESTOR routine ($FF8A)
    this._setWord(0x0314, 0xea31); // IRQ handler    – main KERNAL IRQ
    this._setWord(0x0316, 0xfe66); // BRK handler
    this._setWord(0x0318, 0xfe47); // NMI handler    – RESTORE key
    this._setWord(0x031a, 0xf34a); // OPEN vector
    this._setWord(0x031c, 0xf291); // CLOSE vector
    this._setWord(0x031e, 0xf20e); // CHKIN vector
    this._setWord(0x0320, 0xf250); // CHKOUT vector
    this._setWord(0x0322, 0xf333); // CLRCHN vector
    this._setWord(0x0324, 0xf157); // CHRIN vector
    this._setWord(0x0326, 0xf1ca); // CHROUT vector
    this._setWord(0x0328, 0xf6ed); // STOP vector
    this._setWord(0x032a, 0xf13e); // GETIN vector
    this._setWord(0x032c, 0xf32f); // CLALL vector
    this._setWord(0x032e, 0xe50a); // PLOT vector  (cursor position)
    this._setWord(0x0330, 0xe500); // IOBASE vector (CIA base addr)

    // ── Tape Buffer metadata ($033C-$0350) ─────────────────────────────
    this.ram[0x033c] = 0x00;  // FILETYPE
    this.ram[0x033d] = 0x01;  // FLSTRT LO ($0801)
    this.ram[0x033e] = 0x08;  // FLSTRT HI
    this.ram[0x033f] = 0x01;  // FLEND LO
    this.ram[0x0340] = 0x08;  // FLEND HI
    for (let i = 0x0341; i <= 0x0350; i++) this.ram[i] = 0x20;
  }

  public _setWord(addr: number, val: number) {
    this.ram[addr] = val & 0xff;
    this.ram[addr + 1] = (val >> 8) & 0xff;
  }

  // Attach Cartridge ROM data
  public attachCartridge(type: number, banks: Uint8Array[], game = false, exrom = false) {
    this.cartridgeAttached = true;
    this.cartridgeType = type;
    this.cartRomBanks = banks;
    this.gameLine = game;
    this.exromLine = exrom;
    this.cartBank = 0;
    this.cartControl = 0;
    this.updateCartridgePointers();
  }

  public detachCartridge() {
    this.cartridgeAttached = false;
    this.cartRomBanks = [];
    this.cartRomLo = null;
    this.cartRomHi = null;
    this.gameLine = true;
    this.exromLine = true;
  }

  public updateCartridgePointers() {
    if (!this.cartridgeAttached || this.cartRomBanks.length === 0) {
      this.cartRomLo = null;
      this.cartRomHi = null;
      return;
    }

    if (this.cartridgeType === 0) {
      this.cartRomLo = this.cartRomBanks[0] || null;
      this.cartRomHi = this.cartRomBanks[1] || null;
    } else if (this.cartridgeType === 5) {
      const bankIdx = this.cartBank % this.cartRomBanks.length;
      this.cartRomLo = this.cartRomBanks[bankIdx] || null;
      this.cartRomHi = null;
    } else if (this.cartridgeType === 32) {
      const bankIdx = (this.cartBank & 0x3f) * 2;
      this.cartRomLo = this.cartRomBanks[bankIdx] || null;
      this.cartRomHi = this.cartRomBanks[bankIdx + 1] || null;
    }
  }

  public read(addr: number): number {
    addr &= 0xffff;

    // 6510 Processor I/O Port ($0000-$0001)
    if (addr === 0x0000) return this.portDDR;
    if (addr === 0x0001) return this.portData;

    const loram = this._loram;
    const hiram = this._hiram;
    const charen = this._charen;

    // Cartridge ROM at $8000 - $9FFF (ROML)
    if (addr >= 0x8000 && addr <= 0x9fff) {
      if (this.cartridgeAttached && !this.exromLine && this.cartRomLo) {
        return this.cartRomLo[addr - 0x8000];
      }
      return this.ram[addr];
    }

    // $A000 - $BFFF: BASIC ROM, Cartridge ROM (ROMH), or RAM
    if (addr >= 0xa000 && addr <= 0xbfff) {
      if (this.cartridgeAttached && !this.gameLine && !this.exromLine && this.cartRomHi) {
        return this.cartRomHi[addr - 0xa000];
      }
      if (loram && hiram) {
        return this.basicRom[addr - 0xa000];
      }
      return this.ram[addr];
    }

    // $D000 - $DFFF: I/O Area, Character ROM, or RAM
    if (addr >= 0xd000 && addr <= 0xdfff) {
      if ((loram || hiram) && !charen) {
        // Character ROM visible to CPU
        return this.charRom[addr - 0xd000];
      }
      if (loram || hiram) {
        // I/O Space
        if (addr >= 0xd000 && addr <= 0xd3ff) {
          return this.vic ? this.vic.read(addr & 0x3f) : 0xff;
        }
        if (addr >= 0xd400 && addr <= 0xd7ff) {
          return this.sid ? this.sid.read(addr & 0x1f) : 0xff;
        }
        if (addr >= 0xd800 && addr <= 0xdbff) {
          return (this.colorRam[addr - 0xd800] & 0x0f) | 0xf0;
        }
        if (addr >= 0xdc00 && addr <= 0xdcff) {
          return this.cia1 ? this.cia1.read(addr & 0x0f) : 0xff;
        }
        if (addr >= 0xdd00 && addr <= 0xddff) {
          return this.cia2 ? this.cia2.read(addr & 0x0f) : 0xff;
        }
        if (addr >= 0xde00 && addr <= 0xdeff && this.cartridgeAttached) {
          if (this.cartridgeType === 5) return this.cartBank;
          if (this.cartridgeType === 32) {
            if (addr === 0xde00) return this.cartBank;
            if (addr === 0xde02) return this.cartControl;
          }
        }
        return 0xff;
      }
      return this.ram[addr];
    }

    // $E000 - $FFFF: KERNAL ROM or RAM
    if (addr >= 0xe000 && addr <= 0xffff) {
      if (hiram) {
        return this.kernalRom[addr - 0xe000];
      }
      return this.ram[addr];
    }

    return this.ram[addr];
  }

  public write(addr: number, val: number): number {
    addr &= 0xffff;
    val &= 0xff;

    // 6510 Processor Port
    if (addr === 0x0000) {
      this.portDDR = val;
      this.ram[0x0000] = val;
      return val;
    }
    if (addr === 0x0001) {
      this.portData = val;
      this.ram[0x0001] = val;
      this._loram = (val & 0x01) !== 0;
      this._hiram = (val & 0x02) !== 0;
      this._charen = (val & 0x04) !== 0;
      return val;
    }

    const loram = this._loram;
    const hiram = this._hiram;
    const charen = this._charen;

    // I/O Space Writes ($D000 - $DFFF)
    if (addr >= 0xd000 && addr <= 0xdfff && (loram || hiram) && charen) {
      if (addr >= 0xd000 && addr <= 0xd3ff) {
        if (this.vic) this.vic.write(addr & 0x3f, val);
      } else if (addr >= 0xd400 && addr <= 0xd7ff) {
        if (this.sid) this.sid.write(addr & 0x1f, val);
      } else if (addr >= 0xd800 && addr <= 0xdbff) {
        this.colorRam[addr - 0xd800] = val & 0x0f;
      } else if (addr >= 0xdc00 && addr <= 0xdcff) {
        if (this.cia1) this.cia1.write(addr & 0x0f, val);
      } else if (addr >= 0xdd00 && addr <= 0xddff) {
        if (this.cia2) this.cia2.write(addr & 0x0f, val);
      } else if (addr >= 0xde00 && addr <= 0xdfff) {
        if (this.cartridgeAttached) {
          if (this.cartridgeType === 5) {
            this.cartBank = val;
            this.updateCartridgePointers();
          } else if (this.cartridgeType === 32) {
            if (addr === 0xde00) {
              this.cartBank = val;
              this.updateCartridgePointers();
            } else if (addr === 0xde02) {
              this.cartControl = val;
              this.gameLine = (val & 0x01) !== 0;
              this.exromLine = (val & 0x02) !== 0;
              this.updateCartridgePointers();
            }
          }
        }
      }
      return val;
    }

    // All other writes (including RAM under ROMs) go directly to RAM
    this.ram[addr] = val;
    return val;
  }

  // Read 16-bit word (Little Endian)
  public readWord(addr: number): number {
    const lo = this.read(addr);
    const hi = this.read((addr + 1) & 0xffff);
    return (hi << 8) | lo;
  }

  // VIC-II Memory Access (Bank: 0..3, Offset: 0x0000..0x3FFF)
  public readVic(bankOrAddr: number, addr?: number): number {
    let bank: number;
    let offset: number;

    if (addr !== undefined) {
      bank = bankOrAddr & 0x03;
      offset = addr & 0x3fff;
    } else {
      bank = (this.vic ? this.vic.vicBank : 0) & 0x03;
      offset = bankOrAddr & 0x3fff;
    }

    // In banks 0 and 2, Character ROM is mapped at $1000-$1FFF relative to bank
    if ((bank === 0 || bank === 2) && offset >= 0x1000 && offset <= 0x1fff) {
      return this.charRom[offset - 0x1000];
    }

    const fullAddr = (bank * 0x4000) + offset;
    return this.ram[fullAddr & 0xffff];
  }

  /**
   * Inject a PRG binary directly into C64 memory and update BASIC pointers.
   */
  public injectPRG(prgBytes: Uint8Array): { loadAddr: number; endAddr: number; dataLen: number } | null {
    if (!prgBytes || prgBytes.length < 2) return null;
    const loadAddr = prgBytes[0] | (prgBytes[1] << 8);
    const dataLen = prgBytes.length - 2;
    for (let i = 0; i < dataLen; i++) {
      this.ram[loadAddr + i] = prgBytes[2 + i];
    }
    const endAddr = loadAddr + dataLen;

    // If loaded into BASIC space ($0801), update BASIC Zero-Page pointers
    if (loadAddr === 0x0801) {
      this.ram[0x2b] = 0x01;
      this.ram[0x2c] = 0x08;
      this.relinkBasic(loadAddr, endAddr);
    }
    return { loadAddr, endAddr, dataLen };
  }

  public relinkBasic(startAddr: number, defaultEndAddr = 0) {
    let ptr = startAddr;
    let lastValidEnd = defaultEndAddr;
    while (ptr < 0x9fff) {
      const nextPtrLo = this.ram[ptr];
      const nextPtrHi = this.ram[ptr + 1];
      // BASIC program terminates ONLY when the 2-byte next pointer is $0000
      if (nextPtrLo === 0 && nextPtrHi === 0) {
        lastValidEnd = ptr + 2;
        break;
      }
      if (nextPtrHi < 0x08 || nextPtrHi > 0x9f) break;

      let lineEnd = ptr + 4;
      const maxSearch = Math.min(0x9fff, ptr + 256);
      while (lineEnd < maxSearch && this.ram[lineEnd] !== 0) {
        lineEnd++;
      }
      if (lineEnd >= maxSearch) break;

      const nextPtr = lineEnd + 1;
      this.ram[ptr] = nextPtr & 0xff;
      this.ram[ptr + 1] = (nextPtr >> 8) & 0xff;
      lastValidEnd = nextPtr + 2;

      ptr = nextPtr;
    }

    const endBasic = lastValidEnd > startAddr
      ? lastValidEnd
      : (defaultEndAddr || startAddr + 2);

    // VARTAB ($2D-$2E), ARYTAB ($2F-$30), STREND ($31-$32), EAL ($AE-$AF)
    this.ram[0x2d] = endBasic & 0xff;
    this.ram[0x2e] = (endBasic >> 8) & 0xff;
    this.ram[0x2f] = endBasic & 0xff;
    this.ram[0x30] = (endBasic >> 8) & 0xff;
    this.ram[0x31] = endBasic & 0xff;
    this.ram[0x32] = (endBasic >> 8) & 0xff;
    this.ram[0xae] = endBasic & 0xff;
    this.ram[0xaf] = (endBasic >> 8) & 0xff;

    // FRETOP ($33-$34), MEMSIZ ($37-$38) default to $A000
    if (this.ram[0x38] < 0x08) {
      this.ram[0x33] = 0x00;
      this.ram[0x34] = 0xa0;
      this.ram[0x37] = 0x00;
      this.ram[0x38] = 0xa0;
    }
  }
}
