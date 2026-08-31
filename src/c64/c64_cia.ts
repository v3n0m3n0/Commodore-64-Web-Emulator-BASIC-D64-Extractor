/**
 * MOS 6526 CIA 1 & CIA 2 (Complex Interface Adapter)
 * ==================================================
 * Implements 60Hz/50Hz Timers, Interrupt Control Registers (ICR),
 * 8x8 Keyboard Matrix Scanning ($DC00/$DC01), Joystick inputs,
 * TOD Clock, and VIC-II Bank Switching ($DD00).
 */

export class C64CIA {
  public id: number; // 1 or 2
  public cpu: any;

  // Registers
  public pra: number = 0xff;  // Port A
  public prb: number = 0xff;  // Port B
  public ddra: number = 0x00; // DDR A
  public ddrb: number = 0x00; // DDR B

  // Timer A
  public timerALatch: number = 0xffff;
  public timerA: number = 0xffff;
  public cra: number = 0x00;

  // Timer B
  public timerBLatch: number = 0xffff;
  public timerB: number = 0xffff;
  public crb: number = 0x00;

  // Serial Data Register (SDR $DC0C / $DD0C) & Shift Register
  public sdr: number = 0x00;
  public sdrBitsLeft: number = 0;

  // Interrupts
  public icr: number = 0x00;
  public imr: number = 0x00;
  public irqActive: boolean = false;

  // Keyboard matrix & Joysticks
  public keyboard?: any;
  public keyMatrix: Uint8Array = new Uint8Array(8);
  public joystick1: number = 0xff;
  public joystick2: number = 0xff;

  // TOD Clock
  public todTenths: number = 0;
  public todSeconds: number = 0;
  public todMinutes: number = 0;
  public todHours: number = 1;
  public todRunning: boolean = true;
  public todLatch: boolean = false;
  public todLatchTenths: number = 0;
  public todLatchSeconds: number = 0;
  public todLatchMinutes: number = 0;
  public todLatchHours: number = 0;
  public clockHz: number = 985248;
  public todCyclesPerTenth: number = 16421;
  public todCycleAcc: number = 0;

  public onVicBankChange?: (bank: number) => void;

  constructor(id: number, cpu?: any, keyboard?: any, onVicBankChange?: (bank: number) => void) {
    this.id = id;
    this.cpu = cpu;
    this.keyboard = keyboard;
    this.onVicBankChange = onVicBankChange;
    this.keyMatrix.fill(0xff);
    this.reset();
  }

  // Compatibility getters/setters
  public get isCIA2(): boolean { return this.id === 2; }
  public get joy1(): number { return this.joystick1; }
  public set joy1(v: number) { this.joystick1 = v; }
  public get joy2(): number { return this.joystick2; }
  public set joy2(v: number) { this.joystick2 = v; }
  public get irqAsserted(): boolean { return this.irqActive; }
  public set irqAsserted(v: boolean) { this.irqActive = v; }
  public get regs(): Uint8Array {
    const r = new Uint8Array(16);
    r[0] = this.pra;
    r[1] = this.prb;
    r[2] = this.ddra;
    r[3] = this.ddrb;
    r[4] = this.timerA & 0xff;
    r[5] = (this.timerA >> 8) & 0xff;
    r[6] = this.timerB & 0xff;
    r[7] = (this.timerB >> 8) & 0xff;
    r[8] = this.todTenths;
    r[9] = this.todSeconds;
    r[10] = this.todMinutes;
    r[11] = this.todHours;
    r[13] = this.icr;
    r[14] = this.cra;
    r[15] = this.crb;
    return r;
  }
  reset() {
    this.pra = 0xFF;
    this.prb = 0xFF;
    this.ddra = 0x00;
    this.ddrb = 0x00;

    this.timerALatch = 0xFFFF;
    this.timerA = 0xFFFF;
    this.cra = 0x00;

    this.timerBLatch = 0xFFFF;
    this.timerB = 0xFFFF;
    this.crb = 0x00;

    this.icr = 0x00;
    this.imr = 0x00;
    this.irqActive = false;

    this.keyMatrix.fill(0xFF);
    this.joystick1 = 0xFF;
    this.joystick2 = 0xFF;

    // Reset TOD
    this.todTenths  = 0;
    this.todSeconds = 0;
    this.todMinutes = 0;
    this.todHours   = 1; // TOD starts at 01:00:00.0 AM (BCD 01)
    this.todRunning = true;
    this.todLatch   = false;
    this.todCycleAcc = 0;
    // Recompute todCyclesPerTenth from current clockHz (survives standard switches)
    this.todCyclesPerTenth = Math.round(this.clockHz / 60);
  }

  /**
   * Update the CIA system clock rate to match the video standard.
   * Must be called whenever the PAL/NTSC standard changes.
   *
   * @param {number} hz  System clock in Hz. PAL = 985248, NTSC = 1022727.
   */
  setClockRate(hz) {
    this.clockHz = hz;
    this.todCyclesPerTenth = Math.round(hz / 60);
  }

  getVicBank() {
    // Port A bits 0-1 on CIA2 determine VIC-II memory bank (inverted logic)
    // 00 -> Bank 3, 01 -> Bank 2, 10 -> Bank 1, 11 -> Bank 0
    return (~this.pra) & 0x03;
  }

  read(reg) {
    reg &= 0x0F;

    if (reg === 0x00) {
      // Port A
      if (this.id === 1) {
        // CIA1 Port A: Keyboard columns & Joystick 2
        let val = this.pra | ~this.ddra;
        let rowMask = this.prb | ~this.ddrb;
        let colVal = 0xFF;
        const kbMatrix = this.keyboard?.matrix || this.keyMatrix;
        for (let row = 0; row < 8; row++) {
          if ((rowMask & (1 << row)) === 0) {
            for (let col = 0; col < 8; col++) {
              if ((kbMatrix[col] & (1 << row)) === 0) {
                colVal &= ~(1 << col);
              }
            }
          }
        }
        return (val & colVal & this.joystick2) & 0xFF;
      }
      // CIA2 Port A: VIC bank bits 0-1, RS232 bit 2, IEC serial bus bits 3-7 (inputs pulled high)
      return (this.pra | ~this.ddra) & 0xFF;
    }

    if (reg === 0x01) {
      // Port B
      if (this.id === 1) {
        // CIA1 Port B: Keyboard matrix rows scan & Joystick 1
        let val = this.prb | ~this.ddrb;
        let colMask = this.pra | ~this.ddra;
        let rowVal = 0xFF;
        const kbMatrix = this.keyboard?.matrix || this.keyMatrix;
        for (let col = 0; col < 8; col++) {
          if ((colMask & (1 << col)) === 0) {
            rowVal &= kbMatrix[col];
          }
        }
        return (val & rowVal & this.joystick1) & 0xFF;
      }
      // CIA2 Port B: User port lines (pulled high)
      return (this.prb | ~this.ddrb) & 0xFF;
    }

    if (reg === 0x02) return this.ddra;
    if (reg === 0x03) return this.ddrb;

    // Timer A
    if (reg === 0x04) return this.timerA & 0xFF;
    if (reg === 0x05) return (this.timerA >> 8) & 0xFF;

    // Timer B
    if (reg === 0x06) return this.timerB & 0xFF;
    if (reg === 0x07) return (this.timerB >> 8) & 0xFF;

    // Serial Data Register (SDR)
    if (reg === 0x0C) return this.sdr;

    // Interrupt Control Register
    if (reg === 0x0D) {
      const status = this.icr;
      this.icr = 0; // Reading clears ICR and resets IRQ
      this.irqActive = false;
      return status;
    }

    if (reg === 0x0E) return this.cra;
    if (reg === 0x0F) return this.crb;

    // ── TOD Clock reads ($08-$0B) ──────────────────────────────────────
    // Source: cbmsrc 6526 datasheet + KERNAL_C64_03
    // Reading $0B (hours) LATCHES the TOD — all subsequent reads return
    // the latched value until $08 (tenths) is read, which re-enables live TOD.
    if (reg === 0x0B) {
      // Latch current TOD snapshot
      this.todLatch        = true;
      this.todLatchTenths  = this.todTenths;
      this.todLatchSeconds = this.todSeconds;
      this.todLatchMinutes = this.todMinutes;
      this.todLatchHours   = this.todHours;
      return this._toBCD(this.todLatchHours);
    }
    if (reg === 0x0A) return this._toBCD(this.todLatch ? this.todLatchMinutes : this.todMinutes);
    if (reg === 0x09) return this._toBCD(this.todLatch ? this.todLatchSeconds : this.todSeconds);
    if (reg === 0x08) {
      // Reading tenths releases the latch
      const val = this._toBCD(this.todLatch ? this.todLatchTenths : this.todTenths);
      this.todLatch = false;
      return val;
    }

    return 0xFF;
  }

  write(reg, val) {
    reg &= 0x0F;
    val &= 0xFF;

    if (reg === 0x00) {
      this.pra = val;
      if (this.id === 2 && this.onVicBankChange) {
        this.onVicBankChange((~val) & 0x03);
      }
      return;
    }
    if (reg === 0x01) {
      this.prb = val;
      return;
    }
    if (reg === 0x02) {
      this.ddra = val;
      return;
    }
    if (reg === 0x03) {
      this.ddrb = val;
      return;
    }

    // Timer A Latch
    if (reg === 0x04) {
      this.timerALatch = (this.timerALatch & 0xFF00) | val;
      return;
    }
    if (reg === 0x05) {
      this.timerALatch = (this.timerALatch & 0x00FF) | (val << 8);
      if ((this.cra & 0x01) === 0) {
        this.timerA = this.timerALatch;
      }
      return;
    }

    // Timer B Latch
    if (reg === 0x06) {
      this.timerBLatch = (this.timerBLatch & 0xFF00) | val;
      return;
    }
    if (reg === 0x07) {
      this.timerBLatch = (this.timerBLatch & 0x00FF) | (val << 8);
      if ((this.crb & 0x01) === 0) {
        this.timerB = this.timerBLatch;
      }
      return;
    }

    // Serial Data Register (SDR)
    if (reg === 0x0C) {
      this.sdr = val;
      if (this.cra & 0x40) { // SPMODE: Output
        this.sdrBitsLeft = 8;
      }
      return;
    }

    // Interrupt Mask Register (IMR)
    if (reg === 0x0D) {
      const setBits = (val & 0x80) !== 0;
      if (setBits) {
        this.imr |= (val & 0x1F);
      } else {
        this.imr &= ~(val & 0x1F);
      }
      return;
    }

    // Control Register A
    if (reg === 0x0E) {
      if (val & 0x10) { // Force load
        this.timerA = this.timerALatch;
      }
      this.cra = val & 0xEF;
      return;
    }

    // TOD Clock writes ($08-$0B) — writing $0B sets/latches, writing $08 starts
    if (reg === 0x0B) { this.todHours   = this._fromBCD(val & 0x9F); return; }
    if (reg === 0x0A) { this.todMinutes = this._fromBCD(val & 0x7F); return; }
    if (reg === 0x09) { this.todSeconds = this._fromBCD(val & 0x7F); return; }
    if (reg === 0x08) { this.todTenths  = this._fromBCD(val & 0x0F); this.todRunning = true; return; }

    // Control Register B
    if (reg === 0x0F) {
      if (val & 0x10) { // Force load
        this.timerB = this.timerBLatch;
      }
      this.crb = val & 0xEF;
      return;
    }
  }

  // ── BCD helpers ─────────────────────────────────────────────────────
  _toBCD(val)    { return ((Math.floor(val / 10) << 4) | (val % 10)) & 0xFF; }
  _fromBCD(bcd)  { return ((bcd >> 4) & 0x0F) * 10 + (bcd & 0x0F); }

  // ── TOD Clock tick (called from step()) ─────────────────────────────
  // Source: cbmsrc KERNAL_C64_03 irq.asm — Jiffy Clock update at $EA31
  _tickTOD(cycles) {
    if (!this.todRunning) return;
    this.todCycleAcc += cycles;
    if (this.todCycleAcc < this.todCyclesPerTenth) return;
    this.todCycleAcc -= this.todCyclesPerTenth;

    // Advance 1/10 second
    this.todTenths++;
    if (this.todTenths < 10) return;
    this.todTenths = 0;

    this.todSeconds++;
    if (this.todSeconds < 60) return;
    this.todSeconds = 0;

    this.todMinutes++;
    if (this.todMinutes < 60) return;
    this.todMinutes = 0;

    // Hours: BCD 1-12 with PM flag (bit 7)
    const pm  = (this.todHours & 0x80) !== 0;
    let   hrs = this.todHours & 0x7F;
    hrs++;
    if (hrs > 12) hrs = 1;
    this.todHours = hrs | (pm ? 0x80 : 0);
  }

  // Count down timers according to elapsed CPU cycles
  step(cycles) {
    // Tick TOD clock
    this._tickTOD(cycles);

    let timerAUnderflows = 0;

    // Timer A
    if (this.cra & 0x01) { // Timer A started
      this.timerA -= cycles;
      if (this.timerA <= 0) {
        // Underflow
        timerAUnderflows++;
        this.timerA += this.timerALatch;
        this.triggerInterrupt(0x01); // Bit 0: Timer A

        // SDR shift out on Timer A underflow
        if (this.sdrBitsLeft > 0) {
          this.sdrBitsLeft--;
          if (this.sdrBitsLeft === 0) {
            this.triggerInterrupt(0x08); // Bit 3: Serial Port SDR
          }
        }

        // ── Jiffy Clock update (CIA1 only) ────────────────────────────
        // Source: cbmsrc KERNAL_C64_03 irq.asm – ISR at $EA31
        // Timer A 60Hz underflow → KERNAL ISR increments TIME ($A0-$A2)
        if (this.id === 1 && this.cpu && this.cpu.mem) {
          const m = this.cpu.mem.ram;
          let lo = (m[0x00A2] + 1) & 0xFF;
          m[0x00A2] = lo;
          if (lo === 0) {
            let mid = (m[0x00A1] + 1) & 0xFF;
            m[0x00A1] = mid;
            if (mid === 0) {
              m[0x00A0] = (m[0x00A0] + 1) & 0xFF;
            }
          }
        }

        if (this.cra & 0x08) { // One-shot mode
          this.cra &= ~0x01; // Stop timer
        }
      }
    }

    // Timer B
    if (this.crb & 0x01) { // Timer B started
      const isCascade = (this.crb & 0x60) === 0x40; // Count Timer A underflows
      const decrement = isCascade ? timerAUnderflows : cycles;

      if (decrement > 0) {
        this.timerB -= decrement;
        if (this.timerB <= 0) {
          // Underflow
          this.timerB += this.timerBLatch;
          this.triggerInterrupt(0x02); // Bit 1: Timer B

          if (this.crb & 0x08) { // One-shot mode
            this.crb &= ~0x01; // Stop timer
          }
        }
      }
    }
  }

  triggerInterrupt(sourceBit) {
    this.icr |= sourceBit;
    if (this.imr & sourceBit) {
      this.icr |= 0x80; // Master IRQ flag
      this.irqActive = true;
      if (this.cpu) {
        if (this.id === 1) {
          this.cpu.triggerIRQ();
        } else {
          this.cpu.triggerNMI();
        }
      }
    }
  }
}

