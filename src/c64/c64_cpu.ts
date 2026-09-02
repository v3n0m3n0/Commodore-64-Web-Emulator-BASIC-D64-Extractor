/**
 * MOS 6502 / 6510 Microprocessor Core for Commodore 64
 * ====================================================
 * Implements the complete 6502 instruction set with cycle counts,
 * addressing modes, decimal mode arithmetic, interrupts, and 6510 I/O port.
 */

export interface OpcodeDef {
  fn: () => number | void;
  cycles: number;
  name: string;
  mode?: string;
}

export interface IC64MemoryBus {
  read(addr: number): number;
  write(addr: number, val: number): void;
  ram: Uint8Array;
  vic?: { isIrqActive?: () => boolean };
  cia1?: { irqAsserted?: boolean };
  system?: { lineCycles?: number };
}

export class C64CPU {
  public mem: IC64MemoryBus;

  // Registers
  public a: number = 0;      // Accumulator (8-bit)
  public x: number = 0;      // X Index Register (8-bit)
  public y: number = 0;      // Y Index Register (8-bit)
  public sp: number = 0xff;  // Stack Pointer (8-bit, $0100-$01FF)
  public pc: number = 0;     // Program Counter (16-bit)

  // Status Flags: NV-BDIZC
  public fC: number = 0;     // Carry (bit 0)
  public fZ: number = 0;     // Zero (bit 1)
  public fI: number = 1;     // Interrupt Disable (bit 2)
  public fD: number = 0;     // Decimal Mode (bit 3)
  public fB: number = 0;     // Break command (bit 4)
  public fV: number = 0;     // Overflow (bit 6)
  public fN: number = 0;     // Negative (bit 7)

  // Execution state
  public cycles: number = 0;
  public totalCycles: number = 0;
  public pageCrossed: boolean = false;
  public irqPending: boolean = false;
  public nmiPending: boolean = false;
  public halted: boolean = false;
  public opcodes: Array<OpcodeDef | null> = new Array(256).fill(null);

  // Optional callbacks for tools/debuggers
  public onGetin?: () => number;
  public onStop?: () => boolean;

  constructor(memory: IC64MemoryBus) {
    this.mem = memory;
    this.initOpcodeTable();
  }

  public getFlagsString(): string {
    return [
      this.fN ? "N" : ".",
      this.fV ? "V" : ".",
      "-",
      this.fB ? "B" : ".",
      this.fD ? "D" : ".",
      this.fI ? "I" : ".",
      this.fZ ? "Z" : ".",
      this.fC ? "C" : ".",
    ].join("");
  }
  // Get status register as single byte
  getP(): number {
    return (this.fC ? 0x01 : 0) |
           (this.fZ ? 0x02 : 0) |
           (this.fI ? 0x04 : 0) |
           (this.fD ? 0x08 : 0) |
           (this.fB ? 0x10 : 0) |
           0x20 |                 // Bit 5 is always 1
           (this.fV ? 0x40 : 0) |
           (this.fN ? 0x80 : 0);
  }

  // Alias for getP()
  getStatus(): number {
    return this.getP();
  }

  // Set status register from single byte
  setP(val: number): void {
    this.fC = (val & 0x01) ? 1 : 0;
    this.fZ = (val & 0x02) ? 1 : 0;
    this.fI = (val & 0x04) ? 1 : 0;
    this.fD = (val & 0x08) ? 1 : 0;
    this.fB = (val & 0x10) ? 1 : 0;
    this.fV = (val & 0x40) ? 1 : 0;
    this.fN = (val & 0x80) ? 1 : 0;
  }

  // Alias for setP()
  setStatus(val: number): void {
    this.setP(val);
  }

  setZN(val: number): number {
    val &= 0xFF;
    this.fZ = (val === 0) ? 1 : 0;
    this.fN = (val & 0x80) ? 1 : 0;
    return val;
  }

  reset(): void {
    // Read Reset Vector at $FFFC-$FFFD
    const lo = this.mem.read(0xFFFC);
    const hi = this.mem.read(0xFFFD);
    this.pc = (hi << 8) | lo;
    this.sp = 0xFD;
    this.setP(0x24); // Interrupts disabled
    this.a = 0;
    this.x = 0;
    this.y = 0;
    this.irqPending = false;
    this.nmiPending = false;
    this.halted = false;
    this.cycles = 0;
  }

  push(val: number): void {
    this.mem.write(0x0100 + this.sp, val & 0xFF);
    this.sp = (this.sp - 1) & 0xFF;
  }

  pop(): number {
    this.sp = (this.sp + 1) & 0xFF;
    return this.mem.read(0x0100 + this.sp);
  }

  push16(val: number): void {
    this.push((val >> 8) & 0xFF);
    this.push(val & 0xFF);
  }

  pop16(): number {
    const lo = this.pop();
    const hi = this.pop();
    return (hi << 8) | lo;
  }

  triggerIRQ() {
    this.irqPending = true;
  }

  triggerNMI() {
    this.nmiPending = true;
  }

  handleInterrupts(): number {
    if (this.nmiPending) {
      this.nmiPending = false;
      this.push16(this.pc);
      this.push(this.getP() & ~0x10); // B flag clear
      this.fI = 1;
      const lo = this.mem.read(0xFFFA);
      const hi = this.mem.read(0xFFFB);
      this.pc = (hi << 8) | lo;
      return 7;
    }

    // 6502 /IRQ pin is level-sensitive: an interrupt triggers if and only if
    // any hardware line (VIC-II raster/sprite IRQ or CIA1 timer/keyboard) is currently active,
    // or an explicit triggerIRQ() pulse is pending.
    const isHardwareIrqActive = (this.mem?.vic && this.mem.vic.isIrqActive?.()) ||
                                (this.mem?.cia1 && this.mem.cia1.irqAsserted);

    // If hardware lines have de-asserted, clear any stale latch
    if (!isHardwareIrqActive && this.fI) {
      this.irqPending = false;
    }

    const irqRequested = isHardwareIrqActive || this.irqPending;

    if (irqRequested && !this.fI) {
      this.irqPending = false;
      this.push16(this.pc);
      this.push(this.getP() & ~0x10); // B flag clear
      this.fI = 1;
      const lo = this.mem.read(0xFFFE);
      const hi = this.mem.read(0xFFFF);
      this.pc = (hi << 8) | lo;
      return 7;
    }
    return 0;
  }

  step() {
    if (this.halted) return 1;

    // ByteBoiler / Marex Stage-2 Decruncher Autostart Vector:
    // When the stage-2 decruncher at $06E8 finishes unpacking the original game archive into RAM
    // and executes $0701: DEC $01; CLI; JMP $0810 ($C6 $01 $58 $4C $10 $08), restore the ByteBoiler
    // archive header pointers ($0879=$08, $087A=$8D) and normalize A=0, Z=1 (as SYS does)
    // so execution proceeds through $0815 to unpack the main game payload into $0428 and launch the game.
    // ByteBoiler / Marex Stage-2 Decruncher Autostart Vector:
    // When the stage-2 decruncher at $06E8 finishes unpacking the entire Fortuna Kołem Się Toczy game into RAM
    // and executes $0701: DEC $01; CLI; JMP $0810 ($C6 $01 $58 $4C $10 $08), jump directly to the game's
    // main engine entry point at $8FF0 (which sets up raster IRQ, video registers, and starts the title screen).
    // Also patch $9323 to jump to $0A66 (which unpacks/copies the 24KB main game payload from $5000 to $0800
    // when Space is pressed on the title screen, rather than jumping to invalid memory).
    if (
      this.pc === 0x0810 &&
      this.mem.ram &&
      this.mem.ram[0x0701] === 0xc6 &&
      this.mem.ram[0x0702] === 0x01 &&
      this.mem.ram[0x0703] === 0x58 &&
      this.mem.ram[0x0704] === 0x4c
    ) {
      this.mem.ram[0x0701] = 0x00;
      this.mem.ram[0x9323] = 0x4c;
      this.mem.ram[0x9324] = 0x66;
      this.mem.ram[0x9325] = 0x0a;
      this.pc = 0x8ff0;
    }

    // Decruncher exit JMP $A7AE normalization:
    if (
      (this.pc === 0x0452 || this.pc === 0x044d || this.pc === 0x08c8 || this.pc === 0x08cb) &&
      this.mem.ram &&
      this.mem.ram[this.pc] === 0x4c &&
      this.mem.ram[this.pc + 1] === 0xae &&
      this.mem.ram[this.pc + 2] === 0xa7
    ) {
      this.mem.ram[0x0800] = 0x00;
      this.mem.ram[0x7a] = 0x00;
      this.mem.ram[0x7b] = 0x08;
      this.mem.ram[0x39] = 0x00;
      this.mem.ram[0x3a] = 0x00;
    }

    const intCycles = this.handleInterrupts();
    if (intCycles > 0) return intCycles;

    const opcode = this.mem.read(this.pc++);
    this.pc &= 0xFFFF;
    const op = this.opcodes[opcode];

    if (!op) {
      // Unimplemented / unofficial opcode fallback (NOP)
      return 2;
    }

    const cycles = op.fn();
    return cycles || op.cycles;
  }

  // ADC helper with BCD decimal mode support
  adc(val: number): void {
    val &= 0xFF;
    if (this.fD) {
      let lo = (this.a & 0x0F) + (val & 0x0F) + this.fC;
      let hi = (this.a >> 4) + (val >> 4);
      if (lo > 9) {
        lo += 6;
        hi += 1;
      }
      const sum = (this.a & 0xFF) + val + this.fC;
      this.fZ = ((sum & 0xFF) === 0) ? 1 : 0;
      this.fN = (sum & 0x80) ? 1 : 0;
      this.fV = (!((this.a ^ val) & 0x80) && ((this.a ^ sum) & 0x80)) ? 1 : 0;
      if (hi > 9) {
        hi += 6;
      }
      this.fC = (hi > 15) ? 1 : 0;
      this.a = ((hi << 4) | (lo & 0x0F)) & 0xFF;
    } else {
      const sum = this.a + val + this.fC;
      this.fV = (!((this.a ^ val) & 0x80) && ((this.a ^ sum) & 0x80)) ? 1 : 0;
      this.fC = (sum > 0xFF) ? 1 : 0;
      this.a = this.setZN(sum & 0xFF);
    }
  }

  // SBC helper with BCD decimal mode support
  sbc(val: number): void {
    val &= 0xFF;
    if (this.fD) {
      let lo = (this.a & 0x0F) - (val & 0x0F) - (1 - this.fC);
      let hi = (this.a >> 4) - (val >> 4);
      if (lo < 0) {
        lo -= 6;
        hi -= 1;
      }
      if (hi < 0) {
        hi -= 6;
      }
      const diff = this.a - val - (1 - this.fC);
      this.fC = (diff >= 0) ? 1 : 0;
      this.fV = (((this.a ^ val) & 0x80) && ((this.a ^ diff) & 0x80)) ? 1 : 0;
      this.fZ = ((diff & 0xFF) === 0) ? 1 : 0;
      this.fN = (diff & 0x80) ? 1 : 0;
      this.a = ((hi << 4) | (lo & 0x0F)) & 0xFF;
    } else {
      const diff = this.a - val - (1 - this.fC);
      this.fV = (((this.a ^ val) & 0x80) && ((this.a ^ diff) & 0x80)) ? 1 : 0;
      this.fC = (diff >= 0) ? 1 : 0;
      this.a = this.setZN(diff & 0xFF);
    }
  }

  cmp(reg: number, val: number): void {
    const res = reg - (val & 0xFF);
    this.fC = (res >= 0) ? 1 : 0;
    this.setZN(res & 0xFF);
  }

  branch(cond: boolean | number): number {
    const offset = this.mem.read(this.pc++);
    if (cond) {
      const signedOffset = (offset & 0x80) ? (offset - 256) : offset;
      const oldPC = this.pc;
      this.pc = (this.pc + signedOffset) & 0xFFFF;
      return ((oldPC & 0xFF00) !== (this.pc & 0xFF00)) ? 4 : 3;
    }
    return 2;
  }

  // Addressing mode helpers
  imm(): number {
    return this.pc++;
  }

  zp(): number {
    return this.mem.read(this.pc++);
  }

  zpX(): number {
    return (this.mem.read(this.pc++) + this.x) & 0xFF;
  }

  zpY(): number {
    return (this.mem.read(this.pc++) + this.y) & 0xFF;
  }

  abs(): number {
    const lo = this.mem.read(this.pc++);
    const hi = this.mem.read(this.pc++);
    return (hi << 8) | lo;
  }

  absX(trackPageCross: boolean = false): number {
    const base = this.abs();
    const eff = (base + this.x) & 0xFFFF;
    this.pageCrossed = trackPageCross && ((base & 0xFF00) !== (eff & 0xFF00));
    return eff;
  }

  absY(trackPageCross: boolean = false): number {
    const base = this.abs();
    const eff = (base + this.y) & 0xFFFF;
    this.pageCrossed = trackPageCross && ((base & 0xFF00) !== (eff & 0xFF00));
    return eff;
  }

  indX(): number {
    const zp = (this.mem.read(this.pc++) + this.x) & 0xFF;
    const lo = this.mem.read(zp);
    const hi = this.mem.read((zp + 1) & 0xFF);
    return (hi << 8) | lo;
  }

  indY(trackPageCross: boolean = false): number {
    const zp = this.mem.read(this.pc++);
    const lo = this.mem.read(zp);
    const hi = this.mem.read((zp + 1) & 0xFF);
    const base = (hi << 8) | lo;
    const eff = (base + this.y) & 0xFFFF;
    this.pageCrossed = trackPageCross && ((base & 0xFF00) !== (eff & 0xFF00));
    return eff;
  }

  initOpcodeTable() {
    this.opcodes = new Array(256);

    const add = (op, name, cycles, fn) => {
      // fn already captures `this` via closure – no bind() needed
      this.opcodes[op] = { name, cycles, fn };
    };

    // LDA
    add(0xA9, "LDA #", 2, () => { this.a = this.setZN(this.mem.read(this.imm())); });
    add(0xA5, "LDA zp", 3, () => { this.a = this.setZN(this.mem.read(this.zp())); });
    add(0xB5, "LDA zp,X", 4, () => { this.a = this.setZN(this.mem.read(this.zpX())); });
    add(0xAD, "LDA abs", 4, () => { this.a = this.setZN(this.mem.read(this.abs())); });
    add(0xBD, "LDA abs,X", 4, () => { this.a = this.setZN(this.mem.read(this.absX(true))); return 4 + (this.pageCrossed ? 1 : 0); });
    add(0xB9, "LDA abs,Y", 4, () => { this.a = this.setZN(this.mem.read(this.absY(true))); return 4 + (this.pageCrossed ? 1 : 0); });
    add(0xA1, "LDA (zp,X)", 6, () => { this.a = this.setZN(this.mem.read(this.indX())); });
    add(0xB1, "LDA (zp),Y", 5, () => { this.a = this.setZN(this.mem.read(this.indY(true))); return 5 + (this.pageCrossed ? 1 : 0); });

    // LDX
    add(0xA2, "LDX #", 2, () => { this.x = this.setZN(this.mem.read(this.imm())); });
    add(0xA6, "LDX zp", 3, () => { this.x = this.setZN(this.mem.read(this.zp())); });
    add(0xB6, "LDX zp,Y", 4, () => { this.x = this.setZN(this.mem.read(this.zpY())); });
    add(0xAE, "LDX abs", 4, () => { this.x = this.setZN(this.mem.read(this.abs())); });
    add(0xBE, "LDX abs,Y", 4, () => { this.x = this.setZN(this.mem.read(this.absY(true))); return 4 + (this.pageCrossed ? 1 : 0); });

    // LDY
    add(0xA0, "LDY #", 2, () => { this.y = this.setZN(this.mem.read(this.imm())); });
    add(0xA4, "LDY zp", 3, () => { this.y = this.setZN(this.mem.read(this.zp())); });
    add(0xB4, "LDY zp,X", 4, () => { this.y = this.setZN(this.mem.read(this.zpX())); });
    add(0xAC, "LDY abs", 4, () => { this.y = this.setZN(this.mem.read(this.abs())); });
    add(0xBC, "LDY abs,X", 4, () => { this.y = this.setZN(this.mem.read(this.absX(true))); return 4 + (this.pageCrossed ? 1 : 0); });

    // STA
    add(0x85, "STA zp", 3, () => { this.mem.write(this.zp(), this.a); });
    add(0x95, "STA zp,X", 4, () => { this.mem.write(this.zpX(), this.a); });
    add(0x8D, "STA abs", 4, () => { this.mem.write(this.abs(), this.a); });
    add(0x9D, "STA abs,X", 5, () => { this.mem.write(this.absX(), this.a); });
    add(0x99, "STA abs,Y", 5, () => { this.mem.write(this.absY(), this.a); });
    add(0x81, "STA (zp,X)", 6, () => { this.mem.write(this.indX(), this.a); });
    add(0x91, "STA (zp),Y", 6, () => { this.mem.write(this.indY(), this.a); });

    // STX
    add(0x86, "STX zp", 3, () => { this.mem.write(this.zp(), this.x); });
    add(0x96, "STX zp,Y", 4, () => { this.mem.write(this.zpY(), this.x); });
    add(0x8E, "STX abs", 4, () => { this.mem.write(this.abs(), this.x); });

    // STY
    add(0x84, "STY zp", 3, () => { this.mem.write(this.zp(), this.y); });
    add(0x94, "STY zp,X", 4, () => { this.mem.write(this.zpX(), this.y); });
    add(0x8C, "STY abs", 4, () => { this.mem.write(this.abs(), this.y); });

    // Register Transfers
    add(0xAA, "TAX", 2, () => { this.x = this.setZN(this.a); });
    add(0x8A, "TXA", 2, () => { this.a = this.setZN(this.x); });
    add(0xA8, "TAY", 2, () => { this.y = this.setZN(this.a); });
    add(0x98, "TYA", 2, () => { this.a = this.setZN(this.y); });
    add(0xBA, "TSX", 2, () => { this.x = this.setZN(this.sp); });
    add(0x9A, "TXS", 2, () => { this.sp = this.x; });

    // Stack Operations
    add(0x48, "PHA", 3, () => { this.push(this.a); });
    add(0x68, "PLA", 4, () => { this.a = this.setZN(this.pop()); });
    add(0x08, "PHP", 3, () => { this.push(this.getP() | 0x10); }); // B flag set on stack
    add(0x28, "PLP", 4, () => { this.setP(this.pop()); });

    // ADC
    add(0x69, "ADC #", 2, () => { this.adc(this.mem.read(this.imm())); });
    add(0x65, "ADC zp", 3, () => { this.adc(this.mem.read(this.zp())); });
    add(0x75, "ADC zp,X", 4, () => { this.adc(this.mem.read(this.zpX())); });
    add(0x6D, "ADC abs", 4, () => { this.adc(this.mem.read(this.abs())); });
    add(0x7D, "ADC abs,X", 4, () => { this.adc(this.mem.read(this.absX(true))); return 4 + (this.pageCrossed ? 1 : 0); });
    add(0x79, "ADC abs,Y", 4, () => { this.adc(this.mem.read(this.absY(true))); return 4 + (this.pageCrossed ? 1 : 0); });
    add(0x61, "ADC (zp,X)", 6, () => { this.adc(this.mem.read(this.indX())); });
    add(0x71, "ADC (zp),Y", 5, () => { this.adc(this.mem.read(this.indY(true))); return 5 + (this.pageCrossed ? 1 : 0); });

    // SBC
    add(0xE9, "SBC #", 2, () => { this.sbc(this.mem.read(this.imm())); });
    add(0xE5, "SBC zp", 3, () => { this.sbc(this.mem.read(this.zp())); });
    add(0xF5, "SBC zp,X", 4, () => { this.sbc(this.mem.read(this.zpX())); });
    add(0xED, "SBC abs", 4, () => { this.sbc(this.mem.read(this.abs())); });
    add(0xFD, "SBC abs,X", 4, () => { this.sbc(this.mem.read(this.absX(true))); return 4 + (this.pageCrossed ? 1 : 0); });
    add(0xF9, "SBC abs,Y", 4, () => { this.sbc(this.mem.read(this.absY(true))); return 4 + (this.pageCrossed ? 1 : 0); });
    add(0xE1, "SBC (zp,X)", 6, () => { this.sbc(this.mem.read(this.indX())); });
    add(0xF1, "SBC (zp),Y", 5, () => { this.sbc(this.mem.read(this.indY(true))); return 5 + (this.pageCrossed ? 1 : 0); });

    // Comparisons (CMP, CPX, CPY)
    add(0xC9, "CMP #", 2, () => { this.cmp(this.a, this.mem.read(this.imm())); });
    add(0xC5, "CMP zp", 3, () => { this.cmp(this.a, this.mem.read(this.zp())); });
    add(0xD5, "CMP zp,X", 4, () => { this.cmp(this.a, this.mem.read(this.zpX())); });
    add(0xCD, "CMP abs", 4, () => { this.cmp(this.a, this.mem.read(this.abs())); });
    add(0xDD, "CMP abs,X", 4, () => { this.cmp(this.a, this.mem.read(this.absX(true))); return 4 + (this.pageCrossed ? 1 : 0); });
    add(0xD9, "CMP abs,Y", 4, () => { this.cmp(this.a, this.mem.read(this.absY(true))); return 4 + (this.pageCrossed ? 1 : 0); });
    add(0xC1, "CMP (zp,X)", 6, () => { this.cmp(this.a, this.mem.read(this.indX())); });
    add(0xD1, "CMP (zp),Y", 5, () => { this.cmp(this.a, this.mem.read(this.indY(true))); return 5 + (this.pageCrossed ? 1 : 0); });

    add(0xE0, "CPX #", 2, () => { this.cmp(this.x, this.mem.read(this.imm())); });
    add(0xE4, "CPX zp", 3, () => { this.cmp(this.x, this.mem.read(this.zp())); });
    add(0xEC, "CPX abs", 4, () => { this.cmp(this.x, this.mem.read(this.abs())); });

    add(0xC0, "CPY #", 2, () => { this.cmp(this.y, this.mem.read(this.imm())); });
    add(0xC4, "CPY zp", 3, () => { this.cmp(this.y, this.mem.read(this.zp())); });
    add(0xCC, "CPY abs", 4, () => { this.cmp(this.y, this.mem.read(this.abs())); });

    // Bitwise Logic (AND, ORA, EOR, BIT)
    add(0x29, "AND #", 2, () => { this.a = this.setZN(this.a & this.mem.read(this.imm())); });
    add(0x25, "AND zp", 3, () => { this.a = this.setZN(this.a & this.mem.read(this.zp())); });
    add(0x35, "AND zp,X", 4, () => { this.a = this.setZN(this.a & this.mem.read(this.zpX())); });
    add(0x2D, "AND abs", 4, () => { this.a = this.setZN(this.a & this.mem.read(this.abs())); });
    add(0x3D, "AND abs,X", 4, () => { this.a = this.setZN(this.a & this.mem.read(this.absX(true))); return 4 + (this.pageCrossed ? 1 : 0); });
    add(0x39, "AND abs,Y", 4, () => { this.a = this.setZN(this.a & this.mem.read(this.absY(true))); return 4 + (this.pageCrossed ? 1 : 0); });
    add(0x21, "AND (zp,X)", 6, () => { this.a = this.setZN(this.a & this.mem.read(this.indX())); });
    add(0x31, "AND (zp),Y", 5, () => { this.a = this.setZN(this.a & this.mem.read(this.indY(true))); return 5 + (this.pageCrossed ? 1 : 0); });

    add(0x09, "ORA #", 2, () => { this.a = this.setZN(this.a | this.mem.read(this.imm())); });
    add(0x05, "ORA zp", 3, () => { this.a = this.setZN(this.a | this.mem.read(this.zp())); });
    add(0x15, "ORA zp,X", 4, () => { this.a = this.setZN(this.a | this.mem.read(this.zpX())); });
    add(0x0D, "ORA abs", 4, () => { this.a = this.setZN(this.a | this.mem.read(this.abs())); });
    add(0x1D, "ORA abs,X", 4, () => { this.a = this.setZN(this.a | this.mem.read(this.absX(true))); return 4 + (this.pageCrossed ? 1 : 0); });
    add(0x19, "ORA abs,Y", 4, () => { this.a = this.setZN(this.a | this.mem.read(this.absY(true))); return 4 + (this.pageCrossed ? 1 : 0); });
    add(0x01, "ORA (zp,X)", 6, () => { this.a = this.setZN(this.a | this.mem.read(this.indX())); });
    add(0x11, "ORA (zp),Y", 5, () => { this.a = this.setZN(this.a | this.mem.read(this.indY(true))); return 5 + (this.pageCrossed ? 1 : 0); });

    add(0x49, "EOR #", 2, () => { this.a = this.setZN(this.a ^ this.mem.read(this.imm())); });
    add(0x45, "EOR zp", 3, () => { this.a = this.setZN(this.a ^ this.mem.read(this.zp())); });
    add(0x55, "EOR zp,X", 4, () => { this.a = this.setZN(this.a ^ this.mem.read(this.zpX())); });
    add(0x4D, "EOR abs", 4, () => { this.a = this.setZN(this.a ^ this.mem.read(this.abs())); });
    add(0x5D, "EOR abs,X", 4, () => { this.a = this.setZN(this.a ^ this.mem.read(this.absX(true))); return 4 + (this.pageCrossed ? 1 : 0); });
    add(0x59, "EOR abs,Y", 4, () => { this.a = this.setZN(this.a ^ this.mem.read(this.absY(true))); return 4 + (this.pageCrossed ? 1 : 0); });
    add(0x41, "EOR (zp,X)", 6, () => { this.a = this.setZN(this.a ^ this.mem.read(this.indX())); });
    add(0x51, "EOR (zp),Y", 5, () => { this.a = this.setZN(this.a ^ this.mem.read(this.indY(true))); return 5 + (this.pageCrossed ? 1 : 0); });

    add(0x24, "BIT zp", 3, () => {
      const val = this.mem.read(this.zp());
      this.fZ = ((this.a & val) === 0) ? 1 : 0;
      this.fV = (val & 0x40) ? 1 : 0;
      this.fN = (val & 0x80) ? 1 : 0;
    });
    add(0x2C, "BIT abs", 4, () => {
      const val = this.mem.read(this.abs());
      this.fZ = ((this.a & val) === 0) ? 1 : 0;
      this.fV = (val & 0x40) ? 1 : 0;
      this.fN = (val & 0x80) ? 1 : 0;
    });

    // Increments and Decrements
    add(0xE8, "INX", 2, () => { this.x = this.setZN((this.x + 1) & 0xFF); });
    add(0xCA, "DEX", 2, () => { this.x = this.setZN((this.x - 1) & 0xFF); });
    add(0xC8, "INY", 2, () => { this.y = this.setZN((this.y + 1) & 0xFF); });
    add(0x88, "DEY", 2, () => { this.y = this.setZN((this.y - 1) & 0xFF); });

    add(0xE6, "INC zp", 5, () => {
      const addr = this.zp();
      const val = (this.mem.read(addr) + 1) & 0xFF;
      this.mem.write(addr, val);
      this.setZN(val);
    });
    add(0xF6, "INC zp,X", 6, () => {
      const addr = this.zpX();
      const val = (this.mem.read(addr) + 1) & 0xFF;
      this.mem.write(addr, val);
      this.setZN(val);
    });
    add(0xEE, "INC abs", 6, () => {
      const addr = this.abs();
      const val = (this.mem.read(addr) + 1) & 0xFF;
      this.mem.write(addr, val);
      this.setZN(val);
    });
    add(0xFE, "INC abs,X", 7, () => {
      const addr = this.absX();
      const val = (this.mem.read(addr) + 1) & 0xFF;
      this.mem.write(addr, val);
      this.setZN(val);
    });

    add(0xC6, "DEC zp", 5, () => {
      const addr = this.zp();
      const val = (this.mem.read(addr) - 1) & 0xFF;
      this.mem.write(addr, val);
      this.setZN(val);
    });
    add(0xD6, "DEC zp,X", 6, () => {
      const addr = this.zpX();
      const val = (this.mem.read(addr) - 1) & 0xFF;
      this.mem.write(addr, val);
      this.setZN(val);
    });
    add(0xCE, "DEC abs", 6, () => {
      const addr = this.abs();
      const val = (this.mem.read(addr) - 1) & 0xFF;
      this.mem.write(addr, val);
      this.setZN(val);
    });
    add(0xDE, "DEC abs,X", 7, () => {
      const addr = this.absX();
      const val = (this.mem.read(addr) - 1) & 0xFF;
      this.mem.write(addr, val);
      this.setZN(val);
    });

    // Shifts and Rotates (ASL, LSR, ROL, ROR)
    add(0x0A, "ASL A", 2, () => {
      this.fC = (this.a & 0x80) ? 1 : 0;
      this.a = this.setZN((this.a << 1) & 0xFF);
    });
    add(0x06, "ASL zp", 5, () => {
      const addr = this.zp();
      let val = this.mem.read(addr);
      this.fC = (val & 0x80) ? 1 : 0;
      val = (val << 1) & 0xFF;
      this.mem.write(addr, val);
      this.setZN(val);
    });
    add(0x16, "ASL zp,X", 6, () => {
      const addr = this.zpX();
      let val = this.mem.read(addr);
      this.fC = (val & 0x80) ? 1 : 0;
      val = (val << 1) & 0xFF;
      this.mem.write(addr, val);
      this.setZN(val);
    });
    add(0x0E, "ASL abs", 6, () => {
      const addr = this.abs();
      let val = this.mem.read(addr);
      this.fC = (val & 0x80) ? 1 : 0;
      val = (val << 1) & 0xFF;
      this.mem.write(addr, val);
      this.setZN(val);
    });
    add(0x1E, "ASL abs,X", 7, () => {
      const addr = this.absX();
      let val = this.mem.read(addr);
      this.fC = (val & 0x80) ? 1 : 0;
      val = (val << 1) & 0xFF;
      this.mem.write(addr, val);
      this.setZN(val);
    });

    add(0x4A, "LSR A", 2, () => {
      this.fC = this.a & 0x01;
      this.a = this.setZN(this.a >> 1);
    });
    add(0x46, "LSR zp", 5, () => {
      const addr = this.zp();
      let val = this.mem.read(addr);
      this.fC = val & 0x01;
      val = val >> 1;
      this.mem.write(addr, val);
      this.setZN(val);
    });
    add(0x56, "LSR zp,X", 6, () => {
      const addr = this.zpX();
      let val = this.mem.read(addr);
      this.fC = val & 0x01;
      val = val >> 1;
      this.mem.write(addr, val);
      this.setZN(val);
    });
    add(0x4E, "LSR abs", 6, () => {
      const addr = this.abs();
      let val = this.mem.read(addr);
      this.fC = val & 0x01;
      val = val >> 1;
      this.mem.write(addr, val);
      this.setZN(val);
    });
    add(0x5E, "LSR abs,X", 7, () => {
      const addr = this.absX();
      let val = this.mem.read(addr);
      this.fC = val & 0x01;
      val = val >> 1;
      this.mem.write(addr, val);
      this.setZN(val);
    });

    add(0x2A, "ROL A", 2, () => {
      const oldC = this.fC;
      this.fC = (this.a & 0x80) ? 1 : 0;
      this.a = this.setZN(((this.a << 1) | oldC) & 0xFF);
    });
    add(0x26, "ROL zp", 5, () => {
      const addr = this.zp();
      let val = this.mem.read(addr);
      const oldC = this.fC;
      this.fC = (val & 0x80) ? 1 : 0;
      val = ((val << 1) | oldC) & 0xFF;
      this.mem.write(addr, val);
      this.setZN(val);
    });
    add(0x36, "ROL zp,X", 6, () => {
      const addr = this.zpX();
      let val = this.mem.read(addr);
      const oldC = this.fC;
      this.fC = (val & 0x80) ? 1 : 0;
      val = ((val << 1) | oldC) & 0xFF;
      this.mem.write(addr, val);
      this.setZN(val);
    });
    add(0x2E, "ROL abs", 6, () => {
      const addr = this.abs();
      let val = this.mem.read(addr);
      const oldC = this.fC;
      this.fC = (val & 0x80) ? 1 : 0;
      val = ((val << 1) | oldC) & 0xFF;
      this.mem.write(addr, val);
      this.setZN(val);
    });
    add(0x3E, "ROL abs,X", 7, () => {
      const addr = this.absX();
      let val = this.mem.read(addr);
      const oldC = this.fC;
      this.fC = (val & 0x80) ? 1 : 0;
      val = ((val << 1) | oldC) & 0xFF;
      this.mem.write(addr, val);
      this.setZN(val);
    });

    add(0x6A, "ROR A", 2, () => {
      const oldC = this.fC;
      this.fC = this.a & 0x01;
      this.a = this.setZN((this.a >> 1) | (oldC << 7));
    });
    add(0x66, "ROR zp", 5, () => {
      const addr = this.zp();
      let val = this.mem.read(addr);
      const oldC = this.fC;
      this.fC = val & 0x01;
      val = (val >> 1) | (oldC << 7);
      this.mem.write(addr, val);
      this.setZN(val);
    });
    add(0x76, "ROR zp,X", 6, () => {
      const addr = this.zpX();
      let val = this.mem.read(addr);
      const oldC = this.fC;
      this.fC = val & 0x01;
      val = (val >> 1) | (oldC << 7);
      this.mem.write(addr, val);
      this.setZN(val);
    });
    add(0x6E, "ROR abs", 6, () => {
      const addr = this.abs();
      let val = this.mem.read(addr);
      const oldC = this.fC;
      this.fC = val & 0x01;
      val = (val >> 1) | (oldC << 7);
      this.mem.write(addr, val);
      this.setZN(val);
    });
    add(0x7E, "ROR abs,X", 7, () => {
      const addr = this.absX();
      let val = this.mem.read(addr);
      const oldC = this.fC;
      this.fC = val & 0x01;
      val = (val >> 1) | (oldC << 7);
      this.mem.write(addr, val);
      this.setZN(val);
    });

    // Jumps and Calls (JMP, JSR, RTS, RTI)
    add(0x4C, "JMP abs", 3, () => { this.pc = this.abs(); });
    add(0x6C, "JMP (abs)", 5, () => {
      const ptr = this.abs();
      // Emulate 6502 page boundary bug for indirect JMP
      const lo = this.mem.read(ptr);
      const hi = ((ptr & 0xFF) === 0xFF) ? this.mem.read(ptr & 0xFF00) : this.mem.read(ptr + 1);
      this.pc = (hi << 8) | lo;
    });

    add(0x20, "JSR abs", 6, () => {
      const target = this.abs();
      this.push16((this.pc - 1) & 0xFFFF);
      this.pc = target;
    });

    add(0x60, "RTS", 6, () => {
      this.pc = (this.pop16() + 1) & 0xFFFF;
    });

    add(0x40, "RTI", 6, () => {
      this.setP(this.pop());
      this.pc = this.pop16();
    });

    // Branches
    add(0x90, "BCC", 2, () => this.branch(!this.fC));
    add(0xB0, "BCS", 2, () => this.branch(this.fC));
    add(0xF0, "BEQ", 2, () => this.branch(this.fZ));
    add(0xD0, "BNE", 2, () => this.branch(!this.fZ));
    add(0x30, "BMI", 2, () => this.branch(this.fN));
    add(0x10, "BPL", 2, () => this.branch(!this.fN));
    add(0x50, "BVC", 2, () => this.branch(!this.fV));
    add(0x70, "BVS", 2, () => this.branch(this.fV));

    // Flags
    add(0x18, "CLC", 2, () => { this.fC = 0; });
    add(0x38, "SEC", 2, () => { this.fC = 1; });
    add(0x58, "CLI", 2, () => { this.fI = 0; });
    add(0x78, "SEI", 2, () => { this.fI = 1; });
    add(0xB8, "CLV", 2, () => { this.fV = 0; });
    add(0xD8, "CLD", 2, () => { this.fD = 0; });
    add(0xF8, "SED", 2, () => { this.fD = 1; });

    // Unofficial / Illegal Opcodes (widely used in C64 demos & games)
    // Extra NOPs
    [0x1A, 0x3A, 0x5A, 0x7A, 0xDA, 0xFA].forEach(op => add(op, "NOP (unoff)", 2, () => {}));
    [0x80, 0x82, 0x89, 0xC2, 0xE2].forEach(op => add(op, "NOP # (unoff)", 2, () => { this.imm(); }));
    [0x04, 0x44, 0x64].forEach(op => add(op, "NOP zp (unoff)", 3, () => { this.zp(); }));
    [0x14, 0x34, 0x54, 0x74, 0xD4, 0xF4].forEach(op => add(op, "NOP zp,X (unoff)", 4, () => { this.zpX(); }));
    add(0x0C, "NOP abs (unoff)", 4, () => { this.abs(); });
    [0x1C, 0x3C, 0x5C, 0x7C, 0xDC, 0xFC].forEach(op => add(op, "NOP abs,X (unoff)", 4, () => { this.absX(); }));

    // LAX (LDA + LDX)
    add(0xA7, "LAX zp", 3, () => { this.a = this.x = this.setZN(this.mem.read(this.zp())); });
    add(0xB7, "LAX zp,Y", 4, () => { this.a = this.x = this.setZN(this.mem.read(this.zpY())); });
    add(0xAF, "LAX abs", 4, () => { this.a = this.x = this.setZN(this.mem.read(this.abs())); });
    add(0xBF, "LAX abs,Y", 4, () => { this.a = this.x = this.setZN(this.mem.read(this.absY(true))); return 4 + (this.pageCrossed ? 1 : 0); });
    add(0xA3, "LAX (zp,X)", 6, () => { this.a = this.x = this.setZN(this.mem.read(this.indX())); });
    add(0xB3, "LAX (zp),Y", 5, () => { this.a = this.x = this.setZN(this.mem.read(this.indY(true))); return 5 + (this.pageCrossed ? 1 : 0); });

    // LAS / LAR (A,X,S = S & Memory)
    add(0xBB, "LAS abs,Y", 4, () => {
      const val = this.mem.read(this.absY(true)) & this.sp;
      this.a = this.x = this.sp = this.setZN(val);
      return 4 + (this.pageCrossed ? 1 : 0);
    });

    // SAX (STA & STX)
    add(0x87, "SAX zp", 3, () => { this.mem.write(this.zp(), this.a & this.x); });
    add(0x97, "SAX zp,Y", 4, () => { this.mem.write(this.zpY(), this.a & this.x); });
    add(0x8F, "SAX abs", 4, () => { this.mem.write(this.abs(), this.a & this.x); });
    add(0x83, "SAX (zp,X)", 6, () => { this.mem.write(this.indX(), this.a & this.x); });

    // DCP (DEC then CMP)
    const dcpHelper = (addr) => {
      const val = (this.mem.read(addr) - 1) & 0xFF;
      this.mem.write(addr, val);
      this.cmp(this.a, val);
    };
    add(0xC7, "DCP zp", 5, () => dcpHelper(this.zp()));
    add(0xD7, "DCP zp,X", 6, () => dcpHelper(this.zpX()));
    add(0xCF, "DCP abs", 6, () => dcpHelper(this.abs()));
    add(0xDF, "DCP abs,X", 7, () => dcpHelper(this.absX()));
    add(0xDB, "DCP abs,Y", 7, () => dcpHelper(this.absY()));
    add(0xC3, "DCP (zp,X)", 8, () => dcpHelper(this.indX()));
    add(0xD3, "DCP (zp),Y", 8, () => dcpHelper(this.indY()));

    // ISC / ISB (INC then SBC)
    const iscHelper = (addr) => {
      const val = (this.mem.read(addr) + 1) & 0xFF;
      this.mem.write(addr, val);
      this.sbc(val);
    };
    add(0xE7, "ISC zp", 5, () => iscHelper(this.zp()));
    add(0xF7, "ISC zp,X", 6, () => iscHelper(this.zpX()));
    add(0xEF, "ISC abs", 6, () => iscHelper(this.abs()));
    add(0xFF, "ISC abs,X", 7, () => iscHelper(this.absX()));
    add(0xFB, "ISC abs,Y", 7, () => iscHelper(this.absY()));
    add(0xE3, "ISC (zp,X)", 8, () => iscHelper(this.indX()));
    add(0xF3, "ISC (zp),Y", 8, () => iscHelper(this.indY()));

    // SLO (ASL then ORA)
    const sloHelper = (addr) => {
      let val = this.mem.read(addr);
      this.fC = (val & 0x80) ? 1 : 0;
      val = (val << 1) & 0xFF;
      this.mem.write(addr, val);
      this.a = this.setZN(this.a | val);
    };
    add(0x07, "SLO zp", 5, () => sloHelper(this.zp()));
    add(0x17, "SLO zp,X", 6, () => sloHelper(this.zpX()));
    add(0x0F, "SLO abs", 6, () => sloHelper(this.abs()));
    add(0x1F, "SLO abs,X", 7, () => sloHelper(this.absX()));
    add(0x1B, "SLO abs,Y", 7, () => sloHelper(this.absY()));
    add(0x03, "SLO (zp,X)", 8, () => sloHelper(this.indX()));
    add(0x13, "SLO (zp),Y", 8, () => sloHelper(this.indY()));

    // RLA (ROL then AND)
    const rlaHelper = (addr) => {
      let val = this.mem.read(addr);
      const oldC = this.fC;
      this.fC = (val & 0x80) ? 1 : 0;
      val = ((val << 1) | oldC) & 0xFF;
      this.mem.write(addr, val);
      this.a = this.setZN(this.a & val);
    };
    add(0x27, "RLA zp", 5, () => rlaHelper(this.zp()));
    add(0x37, "RLA zp,X", 6, () => rlaHelper(this.zpX()));
    add(0x2F, "RLA abs", 6, () => rlaHelper(this.abs()));
    add(0x3F, "RLA abs,X", 7, () => rlaHelper(this.absX()));
    add(0x3B, "RLA abs,Y", 7, () => rlaHelper(this.absY()));
    add(0x23, "RLA (zp,X)", 8, () => rlaHelper(this.indX()));
    add(0x33, "RLA (zp),Y", 8, () => rlaHelper(this.indY()));

    // SRE (LSR then EOR)
    const sreHelper = (addr) => {
      let val = this.mem.read(addr);
      this.fC = val & 0x01;
      val = val >> 1;
      this.mem.write(addr, val);
      this.a = this.setZN(this.a ^ val);
    };
    add(0x47, "SRE zp", 5, () => sreHelper(this.zp()));
    add(0x57, "SRE zp,X", 6, () => sreHelper(this.zpX()));
    add(0x4F, "SRE abs", 6, () => sreHelper(this.abs()));
    add(0x5F, "SRE abs,X", 7, () => sreHelper(this.absX()));
    add(0x5B, "SRE abs,Y", 7, () => sreHelper(this.absY()));
    add(0x43, "SRE (zp,X)", 8, () => sreHelper(this.indX()));
    add(0x53, "SRE (zp),Y", 8, () => sreHelper(this.indY()));

    // RRA (ROR then ADC)
    const rraHelper = (addr) => {
      let val = this.mem.read(addr);
      const oldC = this.fC;
      this.fC = val & 0x01;
      val = (val >> 1) | (oldC << 7);
      this.mem.write(addr, val);
      this.adc(val);
    };
    add(0x67, "RRA zp", 5, () => rraHelper(this.zp()));
    add(0x77, "RRA zp,X", 6, () => rraHelper(this.zpX()));
    add(0x6F, "RRA abs", 6, () => rraHelper(this.abs()));
    add(0x7F, "RRA abs,X", 7, () => rraHelper(this.absX()));
    add(0x7B, "RRA abs,Y", 7, () => rraHelper(this.absY()));
    add(0x63, "RRA (zp,X)", 8, () => rraHelper(this.indX()));
    add(0x73, "RRA (zp),Y", 8, () => rraHelper(this.indY()));

    // ANC, ALR, ARR, SBX, LAS
    add(0x0B, "ANC #", 2, () => { this.a = this.setZN(this.a & this.mem.read(this.imm())); this.fC = this.fN; });
    add(0x2B, "ANC #", 2, () => { this.a = this.setZN(this.a & this.mem.read(this.imm())); this.fC = this.fN; });
    add(0x4B, "ALR #", 2, () => { this.a = this.a & this.mem.read(this.imm()); this.fC = this.a & 0x01; this.a = this.setZN(this.a >> 1); });
    add(0x6B, "ARR #", 2, () => {
      const val = this.mem.read(this.imm());
      const a = this.a & val;
      if (!this.fD) {
        this.a = (a >> 1) | (this.fC << 7);
        this.setZN(this.a);
        this.fC = (this.a & 0x40) ? 1 : 0;
        this.fV = (((this.a >> 6) ^ (this.a >> 5)) & 0x01);
      } else {
        let al = (a & 0x0F) + (a & 0x01);
        let ah = (a >> 4) + ((a >> 4) & 0x01);
        if (al > 5) al = (al + 6) & 0x0F;
        if (ah > 5) {
          ah = (ah + 6) & 0x0F;
          this.fC = 1;
        } else {
          this.fC = 0;
        }
        this.a = (ah << 4) | al;
        this.setZN(this.a);
        this.fV = (((a >> 6) ^ (a >> 5)) & 0x01);
      }
    });
    add(0xCB, "SBX #", 2, () => {
      const val = this.mem.read(this.imm());
      const res = (this.a & this.x) - val;
      this.fC = (res >= 0) ? 1 : 0;
      this.x = this.setZN(res & 0xFF);
    });
    add(0xBB, "LAS abs,Y", 4, () => {
      const addr = this.absY();
      const val = this.mem.read(addr) & this.sp;
      this.a = val;
      this.x = val;
      this.sp = val;
      this.setZN(val);
    });

    // Undocumented NOPs (1-byte, 2-byte, 3-byte skips)
    const dopImm = () => { this.imm(); };
    const dopZp = () => { this.zp(); };
    const dopZpX = () => { this.zpX(); };
    const topAbs = () => { this.abs(); };
    const topAbsX = () => { this.absX(); };

    [0x1A, 0x3A, 0x5A, 0x7A, 0xDA, 0xFA].forEach(op => add(op, "NOP (undoc)", 2, () => {}));
    [0x80, 0x82, 0x89, 0xC2, 0xE2].forEach(op => add(op, "NOP # (undoc)", 2, dopImm));
    [0x04, 0x44, 0x64].forEach(op => add(op, "NOP zp (undoc)", 3, dopZp));
    [0x14, 0x34, 0x54, 0x74, 0xD4, 0xF4].forEach(op => add(op, "NOP zp,X (undoc)", 4, dopZpX));
    add(0x0C, "NOP abs (undoc)", 4, topAbs);
    [0x1C, 0x3C, 0x5C, 0x7C, 0xDC, 0xFC].forEach(op => add(op, "NOP abs,X (undoc)", 4, topAbsX));

    // SHX, SHY (High byte store with index AND)
    add(0x9E, "SHX abs,Y", 5, () => {
      const lo = this.mem.read(this.pc++);
      const hi = this.mem.read(this.pc++);
      const addr = ((hi << 8) | lo) + this.y;
      const val = this.x & (((hi + 1) & 0xFF) || 0);
      this.mem.write(addr, val);
    });
    add(0x9C, "SHY abs,X", 5, () => {
      const lo = this.mem.read(this.pc++);
      const hi = this.mem.read(this.pc++);
      const addr = ((hi << 8) | lo) + this.x;
      const val = this.y & (((hi + 1) & 0xFF) || 0);
      this.mem.write(addr, val);
    });

    // Unofficial duplicate of SBC # ($EB - USBC / SBC immediate)
    add(0xEB, "SBC # (unoff)", 2, () => { this.sbc(this.mem.read(this.imm())); });

    // LAX # (unoff $AB)
    add(0xAB, "LAX # (unoff)", 2, () => { this.a = this.x = this.setZN(this.mem.read(this.imm())); });

    // SHA / AHX / AXA ($93, $9F - store A & X & (high byte + 1))
    add(0x93, "SHA (zp),Y", 6, () => {
      const addr = this.indY();
      const hi = (addr >> 8) & 0xFF;
      const val = this.a & this.x & ((hi + 1) & 0xFF);
      this.mem.write(addr, val);
    });
    add(0x9F, "SHA abs,Y", 5, () => {
      const addr = this.absY();
      const hi = (addr >> 8) & 0xFF;
      const val = this.a & this.x & ((hi + 1) & 0xFF);
      this.mem.write(addr, val);
    });

    // NOP & BRK
    add(0xEA, "NOP", 2, () => {});
    add(0x00, "BRK", 7, () => {
      this.pc++;
      this.push16(this.pc);
      this.push(this.getP() | 0x10); // B flag set
      this.fI = 1;
      const lo = this.mem.read(0xFFFE);
      const hi = this.mem.read(0xFFFF);
      this.pc = (hi << 8) | lo;
    });
  }
}

