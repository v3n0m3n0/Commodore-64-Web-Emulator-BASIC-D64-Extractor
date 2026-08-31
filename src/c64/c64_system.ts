/**
 * Master Commodore 64 System Orchestrator
 * ========================================
 * Integrates cycle-accurate 6510 CPU, Memory Bus with PLA Banking and authentic ROMs,
 * Scanline-accurate VIC-II Video with Bad Line DMA, SID Sound Synthesizer,
 * CIA 1/2 I/O Timers, Keyboard Matrix, and Virtual Storage Formats (D64, T64, PRG, CRT).
 */

import { C64CPU } from "./c64_cpu";
import { C64Memory } from "./c64_memory";
import { C64VIC2, VideoStandard } from "./c64_vic2";
import { C64SID } from "./c64_sid";
import { C64CIA } from "./c64_cia";
import { C64Keyboard } from "./c64_keyboard";
import { C64PRG, PRGInfo } from "./c64_prg";
import { C64D64, D64DiskInfo } from "./c64_d64";
import { C64CRT, CartridgeImage } from "./c64_crt";
import { C64T64, T64Archive } from "./c64_t64";
import { C64Basic } from "./c64_basic_detokenizer";
import { C64Assembler, AssemblyResult } from "./c64_assembler";

export interface SystemTelemetry {
  fps: number;
  cpuSpeedMhz: number;
  rasterLine: number;
  lineCycle: number;
  totalCycles: number;
  pc: number;
  a: number;
  x: number;
  y: number;
  sp: number;
  flags: string;
  vicBank: number;
  videoMode: string;
  activeVoices: number;
  cartridge: string | null;
  mountedDisk: string | null;
  cia1TimerA: number;
  cia1TimerB: number;
  cia1Icr: number;
  cia2Icr: number;
  irqActive: boolean;
  nmiActive: boolean;
}

export class C64System {
  public memory: C64Memory;
  public cpu: C64CPU;
  public vic: C64VIC2;
  public sid: C64SID;
  public keyboard: C64Keyboard;
  public cia1: C64CIA;
  public cia2: C64CIA;

  // Keyboard Mode: Pure Text / Matrix (no joystick collision) vs Game Shared (WASD/Arrows/Space map to Joy 1 & 2)
  public keyboardMode: "text_pure" | "game_shared" = "text_pure";

  // Running State
  public isRunning: boolean = false;
  public isWarpMode: boolean = false;
  public fps: number = 0;
  public frameCount: number = 0;
  public totalCycles: number = 0;
  public lineCycles: number = 0;
  private lastFpsTime: number = 0;
  private lastFrameTime: number = 0;
  private frameAccumulator: number = 0;

  // Mounted Storage
  public mountedDisk: D64DiskInfo | null = null;
  public mountedTape: T64Archive | null = null;
  public mountedCart: CartridgeImage | null = null;
  public currentPrg: PRGInfo | null = null;

  // Animation Frame Request ID
  private animFrameId: number | null = null;
  private onFrameRender?: () => void;
  private keyboardQueue: number[] = [];
  private firePulseTimeout: any = null;

  constructor() {
    this.memory = new C64Memory();
    this.keyboard = new C64Keyboard();
    this.cpu = new C64CPU(this.memory);
    this.vic = new C64VIC2(this.memory, this.cpu);
    this.sid = new C64SID();

    // Instantiate CIAs
    this.cia1 = new C64CIA(1, this.cpu, this.keyboard);
    this.cia2 = new C64CIA(2, this.cpu, this.keyboard, (bank) => {
      this.vic.vicBank = bank;
    });

    // Attach peripherals to Memory Bus
    this.memory.vic = this.vic;
    this.memory.sid = this.sid;
    this.memory.cia1 = this.cia1;
    this.memory.cia2 = this.cia2;

    this.hardReset();
  }

  // Hard Reset: Re-initialize all chips and cold start CPU from authentic KERNAL reset vector ($FFFC -> $FCE2)
  public hardReset(skipBoot = false) {
    this.memory.reset();
    this.memory.loadSystemRoms();

    if (this.mountedCart) {
      this.memory.attachCartridge(this.mountedCart);
    }

    this.keyboard.reset();
    this.vic.reset();
    this.sid.reset();
    this.cia1.reset();
    this.cia2.reset();
    this.cpu.reset();

    // Check if Cartridge is attached
    if (this.memory.cartridgeAttached) {
      // 1. Ultimax mode: Reset vector is directly from $FFFC-$FFFD in cartridge ROMH
      if (!this.memory.exromActive && this.memory.gameActive) {
        const resetVector = this.memory.readWord(0xfffc);
        this.cpu.pc = resetVector;
        this.cpu.sp = 0xff;
        this.cpu.setP(0x24);
        this.initReadyState();
        return;
      }

      // 2. Standard Cartridge: Check for "CBM80" autostart signature at $8004..$8008
      const isCbm80 =
        this.memory.read(0x8004) === 0xc3 && // 'C'
        this.memory.read(0x8005) === 0xc2 && // 'B'
        this.memory.read(0x8006) === 0xcd && // 'M'
        this.memory.read(0x8007) === 0x38 && // '8'
        this.memory.read(0x8008) === 0x30;   // '0'

      if (isCbm80) {
        const cartColdReset = this.memory.readWord(0x8000);
        this.initReadyState();
        this.cpu.pc = cartColdReset;
        this.cpu.sp = 0xff;
        this.cpu.setP(0x24);
        return;
      }
    }

    // Standard C64 KERNAL Boot
    const resetVector = this.memory.readWord(0xfffc) || 0xfce2;
    this.cpu.pc = resetVector;

    if (!skipBoot) {
      const bootSuccess = this.fastBoot();
      if (!bootSuccess) {
        // Fallback: If emulation loop was constrained, guarantee authentic BASIC V2 READY state
        this.initReadyState();
      }
    } else {
      this.initReadyState();
    }

    this.lastFrameTime = 0;
    this.frameAccumulator = 0;
    this.frameCount = 0;
    this.lastFpsTime = 0;
  }

  // Warm Reset (RESTORE / CPU Reset Vector)
  public reset() {
    this.cpu.reset();
    this.vic.clearFrameBuffer();
    this.lastFrameTime = 0;
    this.frameAccumulator = 0;
  }

  // Fast-boot the CPU from cold start until it finishes KERNAL init and reaches READY ($A480)
  public fastBoot(targetPC = 0xa480, maxLines = 100000): boolean {
    const cycPerLine = this.vic.cyclesPerLine;
    for (let line = 0; line < maxLines; line++) {
      const stolen = this.vic.startLine();
      const cpuBudget = cycPerLine - (stolen || 0);
      let cpuDone = 0;
      while (cpuDone < cpuBudget) {
        const cyc = this.cpu.step();
        this.cia1.step(cyc);
        this.cia2.step(cyc);
        cpuDone += cyc;
        if (this.cpu.pc === targetPC) {
          this.vic.endLine();
          return true;
        }
      }
      if (stolen > 0) {
        this.cia1.step(stolen);
        this.cia2.step(stolen);
      }
      this.vic.endLine();
    }
    return false;
  }

  // Initialize all KERNAL shadow registers, Zero Page pointers, RAM indirect vectors,
  // CIA 1/2 timers, and fill screen RAM at $0400 with the standard Commodore 64 BASIC V2 banner
  public initReadyState() {
    // 1. Processor Port ($0000-$0001)
    this.memory.ram[0x0000] = 0x2f;
    this.memory.ram[0x0001] = 0x37;

    // 2. BASIC Zero Page pointers ($002B-$0038)
    this.memory.ram[0x2b] = 0x01; // TXTTAB LO ($0801)
    this.memory.ram[0x2c] = 0x08; // TXTTAB HI
    this.memory.ram[0x2d] = 0x01; // VARTAB LO
    this.memory.ram[0x2e] = 0x08; // VARTAB HI
    this.memory.ram[0x2f] = 0x01; // ARYTAB LO
    this.memory.ram[0x30] = 0x08; // ARYTAB HI
    this.memory.ram[0x31] = 0x01; // STREND LO
    this.memory.ram[0x32] = 0x08; // STREND HI
    this.memory.ram[0x33] = 0x00; // FRETOP LO ($A000)
    this.memory.ram[0x34] = 0xa0; // FRETOP HI
    this.memory.ram[0x37] = 0x00; // MEMSIZ LO ($A000)
    this.memory.ram[0x38] = 0xa0; // MEMSIZ HI
    this.memory.ram[0x0800] = 0x00; // BASIC initial leading zero-byte

    // 3. BASIC CHRGET/CHRGOT routine ($0073-$008A)
    const chrget = [
      0xe6, 0x7a, 0xd0, 0x02, 0xe6, 0x7b, 0xad, 0x00, 0x08,
      0xc9, 0x3a, 0xb0, 0x0a, 0xc9, 0x20, 0xf0, 0xef, 0x38,
      0xe9, 0x30, 0x38, 0xe9, 0xd0, 0x60,
    ];
    for (let i = 0; i < chrget.length; i++) {
      this.memory.ram[0x0073 + i] = chrget[i];
    }

    // 4. KERNAL Zero Page status & cursor control
    this.memory.ram[0x0090] = 0x00; // STATUS
    this.memory.ram[0x0091] = 0x7f; // STKEY
    this.memory.ram[0x0093] = 0x00; // VERCK
    this.memory.ram[0x009a] = 0x03; // DFLTN (Screen)
    this.memory.ram[0x009b] = 0x03; // DFLTO (Screen)
    this.memory.ram[0x009d] = 0x80; // MSGFLG
    this.memory.ram[0x00b2] = 0x3c; // TAPE1 LO
    this.memory.ram[0x00b3] = 0x03; // TAPE1 HI
    this.memory.ram[0x00c6] = 0x00; // NDX (Keyboard buffer count)
    this.memory.ram[0x00c7] = 0x00; // RVS
    this.memory.ram[0x00cb] = 0x00; // BLNSW (0 = cursor enabled)
    this.memory.ram[0x00cc] = 0x14; // BLNCT (20 timer ticks)
    this.memory.ram[0x00cd] = 0x20; // GDBLN (Character under cursor = space)
    this.memory.ram[0x00ce] = 0x00; // BLNON
    this.memory.ram[0x00cf] = 0x00; // CRSW
    this.memory.ram[0x00d1] = 0xc8; // PNT LO ($04C8 = row 5 start)
    this.memory.ram[0x00d2] = 0x04; // PNT HI
    this.memory.ram[0x00d3] = 0x00; // PNTR (Cursor column 0)
    this.memory.ram[0x00d4] = 0x00; // QTSW
    this.memory.ram[0x00d5] = 0x27; // LNMX (39 = 40 columns)
    this.memory.ram[0x00d6] = 0x05; // TBLX (Cursor row 5)
    this.memory.ram[0x00d8] = 0x00; // INSRT

    // Screen Line Link Table ($00D9-$00F2)
    for (let r = 0; r < 25; r++) {
      this.memory.ram[0x00d9 + r] = r;
    }

    // 5. KERNAL Shadow Registers ($0200-$02FF)
    this.memory.ram[0x0286] = 0x0e; // COLOR (Light blue)
    this.memory.ram[0x0287] = 0x0e; // GDCOL (Light blue)
    this.memory.ram[0x0288] = 0x04; // HIBASE ($04 = screen at $0400)
    this.memory.ram[0x0289] = 0x0a; // XMAX (10 chars max in key buffer)
    this.memory.ram[0x028a] = 0x00; // RPTFLG
    this.memory.ram[0x028b] = 0x04; // KOUNT
    this.memory.ram[0x028c] = 0x10; // DELAY
    this.memory.ram[0x028d] = 0x00; // SHFLAG
    this.memory.ram[0x028e] = 0x00; // LSTSHF
    this.memory._setWord(0x028f, 0xeb81); // KEYLOG vector
    this.memory.ram[0x0291] = 0x00; // MODE
    this.memory.ram[0x0292] = 0x00; // AUTODN
    this.memory.ram[0x02a6] = this.vic.videoStandard === VideoStandard.PAL ? 0x01 : 0x00;

    // 6. BASIC RAM indirect vectors ($0300-$030B)
    this.memory._setWord(0x0300, 0xe38b); // IERROR
    this.memory._setWord(0x0302, 0xa483); // IMAIN
    this.memory._setWord(0x0304, 0xa57c); // ICRNCH
    this.memory._setWord(0x0306, 0xa717); // IQPLOP
    this.memory._setWord(0x0308, 0xa7e4); // IGONE
    this.memory._setWord(0x030a, 0xae86); // IEVAL

    // 7. KERNAL RAM indirect vectors ($0314-$0333)
    this.memory._setWord(0x0314, 0xea31); // CINV (IRQ)
    this.memory._setWord(0x0316, 0xfe66); // CBINV (BRK)
    this.memory._setWord(0x0318, 0xfe47); // NMINV (NMI)
    this.memory._setWord(0x031a, 0xf34a); // IOPEN
    this.memory._setWord(0x031c, 0xf291); // ICLOSE
    this.memory._setWord(0x031e, 0xf20e); // ICHKIN
    this.memory._setWord(0x0320, 0xf250); // ICKOUT
    this.memory._setWord(0x0322, 0xf333); // ICLRCH
    this.memory._setWord(0x0324, 0xf157); // IBASIN (CHRIN)
    this.memory._setWord(0x0326, 0xf1ca); // IBSOUT (CHROUT)
    this.memory._setWord(0x0328, 0xf6ed); // ISTOP
    this.memory._setWord(0x032a, 0xf13e); // IGETIN
    this.memory._setWord(0x032c, 0xf32f); // ICLALL
    this.memory._setWord(0x032e, 0xe50a); // USRCMD
    this.memory._setWord(0x0330, 0xe500); // IOBASE

    // 8. Screen Buffer ($0400-$07E7) & Color RAM ($D800-$DBE7)
    for (let i = 0x0400; i <= 0x07e7; i++) {
      this.memory.ram[i] = 0x20; // PETSCII space
    }
    this.memory.colorRam.fill(0x0e); // Light blue color

    // Print authentic Commodore 64 BASIC V2 banner to screen memory
    const bannerLines = [
      { row: 1, text: "    **** COMMODORE 64 BASIC V2 ****     " },
      { row: 3, text: " 64K RAM SYSTEM  38911 BASIC BYTES FREE " },
      { row: 5, text: "READY.                                  " },
    ];

    for (const b of bannerLines) {
      const offset = 0x0400 + b.row * 40;
      for (let c = 0; c < b.text.length; c++) {
        const char = b.text[c];
        let petscii = 0x20;
        if (char === "*") petscii = 0x2a;
        else if (char === ".") petscii = 0x2e;
        else {
          const code = char.charCodeAt(0);
          if (code >= 65 && code <= 90) petscii = code - 64; // 'A'-'Z' screen codes 1-26
          else if (code >= 48 && code <= 57) petscii = code;  // '0'-'9'
          else petscii = 0x20;
        }
        this.memory.ram[offset + c] = petscii;
      }
    }

    // 9. VIC-II Registers
    this.memory.write(0xd020, 0x0e); // Border: Light Blue
    this.memory.write(0xd021, 0x06); // Background: Blue
    this.memory.write(0xd018, 0x14); // Screen at $0400, Charset at $1000
    this.memory.write(0xd011, 0x1b); // Text mode, 25 rows
    this.memory.write(0xd016, 0xc8); // 40 columns

    // 10. CIA 1 & 2 Timers and Interrupts
    const isPal = this.vic.videoStandard === VideoStandard.PAL;
    const timerLatch = isPal ? 0x4295 : 0x4025;
    this.cia1.timerALatch = timerLatch;
    this.cia1.timerA = timerLatch;
    this.cia1.cra = 0x01; // Start Timer A
    this.cia1.imr = 0x01; // Enable Timer A IRQ

    // 11. CPU State: Jump to BASIC Interpreter prompt loop
    this.cpu.pc = 0xa480;
    this.cpu.sp = 0xfb;
    this.cpu.setP(0x24); // Interrupts enabled, Break clear
  }

  // Mount and inject a PRG file into memory and automatically RUN it
  public loadAndRunPRG(data: Uint8Array, fileName = "AUTOSTART.PRG"): boolean {
    const prg = C64PRG.parse(data, fileName);
    if (!prg) return false;

    this.currentPrg = prg;

    // 1. Cold reset and boot to authentic READY state
    this.hardReset(false);

    // 2. Inject PRG bytes into RAM
    const res = this.memory.injectPRG(data);
    if (!res) return false;

    // 3. Ensure memory location $0800 is 0 (required for BASIC tokenizer & line fetching)
    this.memory.ram[0x0800] = 0x00;

    // 4. Update BASIC pointers and configure execution entry
    if (res.loadAddr !== 0x0801) {
      // Machine language program with explicit custom load address (e.g. $C000, $1000, $0200)
      this.cpu.pc = res.loadAddr;
      // Setup stack with return address to BASIC prompt loop ($A483 - 1 = $A482)
      this.memory.ram[0x01ff] = 0xa4;
      this.memory.ram[0x01fe] = 0x82;
      this.cpu.sp = 0xfd;
      this.cpu.setP(0x20); // Interrupts enabled
    } else {
      // Standard load address $0801 (BASIC program or SYS machine code launcher)
      // Check if this is a valid BASIC structure or raw machine code at $0801
      const isLikelyBasic =
        prg.data.length >= 4 &&
        (prg.data[1] >= 0x08 || (prg.data[0] === 0 && prg.data[1] === 0));

      if (isLikelyBasic) {
        // Relink all BASIC lines and calculate end of program
        this.memory.relinkBasic(0x0801, res.endAddr);

        // Ensure TXTPTR ($7A/$7B) points to $0800 (the leading zero byte before first line)
        this.memory.ram[0x7a] = 0x00;
        this.memory.ram[0x7b] = 0x08;

        // Reset execution state to direct mode
        this.memory.ram[0x39] = 0xff; // CURLIN LO ($FFFF)
        this.memory.ram[0x3a] = 0xff; // CURLIN HI

        // Clear keyboard buffer
        this.memory.ram[0x00c6] = 0x00;
        this.keyboardQueue = [];

        // Set stack pointer with return address to BASIC prompt loop ($A483 - 1 = $A482)
        this.memory.ram[0x01ff] = 0xa4;
        this.memory.ram[0x01fe] = 0x82;
        this.cpu.sp = 0xfd;
        this.cpu.setP(0x20); // Interrupts enabled, decimal clear

        // Start CPU at authentic BASIC statement execution entry point (NEWSTT = $A7AE)
        this.cpu.pc = 0xa7ae;
      } else {
        // Raw machine code without BASIC wrapper loaded at $0801
        this.cpu.pc = 0x0801;
        this.memory.ram[0x01ff] = 0xa4;
        this.memory.ram[0x01fe] = 0x82;
        this.cpu.sp = 0xfd;
        this.cpu.setP(0x20);
      }
    }

    // 5. Start continuous emulation loop
    if (!this.isRunning) {
      this.start();
    }

    return true;
  }

  // Mount Cartridge (.CRT)
  public loadCartridge(data: Uint8Array): boolean {
    const cart = C64CRT.parse(data);
    if (!cart) return false;

    this.mountedCart = cart;
    this.memory.attachCartridge(cart);
    this.hardReset(false);

    if (!this.isRunning) {
      this.start();
    }
    return true;
  }

  // Mount D64 Disk Image and optionally autorun the first program
  public mountD64(data: Uint8Array, autoRun = false): D64DiskInfo | null {
    const d64 = C64D64.parse(data);
    if (!d64) return null;
    this.mountedDisk = d64;

    if (autoRun) {
      this.autoRunFirstDiskFile();
    }
    return d64;
  }

  // Autorun the first PRG file found on the mounted D64 disk
  public autoRunFirstDiskFile(): boolean {
    if (!this.mountedDisk || this.mountedDisk.files.length === 0) return false;

    const isHeaderOrBanner = (name: string) => {
      const trimmed = name.trim();
      return (
        trimmed.startsWith("-") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("=") ||
        trimmed.startsWith("#") ||
        trimmed.startsWith("/") ||
        trimmed.startsWith("\\") ||
        trimmed.length === 0
      );
    };

    // 1. Try to find first substantial PRG file with data > 2 bytes and blocks > 0, not starting with banner chars
    let targetEntry = this.mountedDisk.files.find(
      (e) =>
        e.fileType === "PRG" &&
        e.data &&
        e.data.length > 2 &&
        e.sizeInBlocks > 0 &&
        !isHeaderOrBanner(e.fileName)
    );

    // 2. Fallback to any PRG with payload data > 2 bytes
    if (!targetEntry) {
      targetEntry = this.mountedDisk.files.find(
        (e) => e.fileType === "PRG" && e.data && e.data.length > 2
      );
    }

    // 3. Fallback to first file
    if (!targetEntry) {
      targetEntry = this.mountedDisk.files[0];
    }

    if (targetEntry && targetEntry.data && targetEntry.data.length > 0) {
      return this.loadAndRunPRG(targetEntry.data, targetEntry.fileName);
    }
    return false;
  }

  // Mount T64 Tape Image
  public mountT64(data: Uint8Array, autoRun = false): T64Archive | null {
    const t64 = C64T64.parse(data);
    if (!t64) return null;
    this.mountedTape = t64;

    if (autoRun && t64.records.length > 0) {
      const entry = t64.records[0];
      if (entry && entry.prgData && entry.prgData.length > 0) {
        this.loadAndRunPRG(entry.prgData, entry.fileName);
      }
    }
    return t64;
  }

  // Push a single PETSCII key character into KERNAL keyboard buffer ($0277 / $00C6)
  public pushKey(petscii: number) {
    const count = this.memory.ram[0x00c6];
    if (count < 10) {
      this.memory.ram[0x0277 + count] = petscii & 0xff;
      this.memory.ram[0x00c6] = count + 1;
    } else {
      this.keyboardQueue.push(petscii & 0xff);
    }
  }

  // Composite impulse for "DALEJ / FIRE":
  // Simulates pressing SPACE and RETURN in keyboard matrix, pushes PETSCII codes into buffer,
  // and pulls FIRE on CIA 1 Joystick 1 ($DC01) and Joystick 2 ($DC00) low.
  public triggerFireAndNext() {
    // 1. Matrix keys (Space: Row 7, Col 4; Return: Row 0, Col 1)
    this.keyboard.pressKey(7, 4);
    this.keyboard.pressKey(0, 1);

    // 2. PETSCII buffer push (Space=32, Return=13)
    this.pushKey(32);
    this.pushKey(13);

    // 3. CIA 1 Joystick Fire on Port 1 & 2 ($DC00 / $DC01 bit 4 low = 0)
    this.cia1.joy1 &= ~0x10;
    this.cia1.joy2 &= ~0x10;

    // Wake audio if context was suspended
    this.sid.resumeAudio();

    if (this.firePulseTimeout) {
      clearTimeout(this.firePulseTimeout);
    }

    this.firePulseTimeout = setTimeout(() => {
      // Release matrix keys
      this.keyboard.releaseKey(7, 4);
      this.keyboard.releaseKey(0, 1);
      // Release joystick fire (bit 4 high = 1)
      this.cia1.joy1 |= 0x10;
      this.cia1.joy2 |= 0x10;
      this.firePulseTimeout = null;
    }, 140);
  }

  // Authentic RESTORE key press (triggers NMI line on 6510 CPU)
  public triggerRestore() {
    this.cpu.triggerNMI();
  }

  // Switch between Pure Text/Matrix Mode and Shared Joystick Mode
  public setKeyboardMode(mode: "text_pure" | "game_shared") {
    this.keyboardMode = mode;
    if (mode === "text_pure") {
      this.cia1.joy1 = 0xff;
      this.cia1.joy2 = 0xff;
    }
  }

  public toggleKeyboardMode(): "text_pure" | "game_shared" {
    const next = this.keyboardMode === "text_pure" ? "game_shared" : "text_pure";
    this.setKeyboardMode(next);
    return next;
  }

  // Type a text string or BASIC commands into KERNAL keyboard input buffer
  public typeText(text: string) {
    const KEYBUF_ADDR = 0x0277;
    const petsciiBytes: number[] = [];

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === "\n" || char === "\r") {
        petsciiBytes.push(13); // CR
      } else if (C64Keyboard.POLISH_DIACRITICS[char]) {
        // Polish character conversion (e.g. ą -> A / 0x41 or Polish character set equivalent)
        petsciiBytes.push(C64Keyboard.POLISH_DIACRITICS[char].petscii);
      } else {
        const code = char.charCodeAt(0);
        if (code >= 97 && code <= 122) {
          petsciiBytes.push(code - 32); // a-z -> A-Z
        } else {
          petsciiBytes.push(code & 0xff);
        }
      }
    }

    // Append to internal queue for continuous multi-character streaming
    for (const b of petsciiBytes) {
      this.keyboardQueue.push(b);
    }

    // If keyboard buffer is currently empty, immediately push the first chunk
    if (this.memory.ram[0x00c6] === 0 && this.keyboardQueue.length > 0) {
      const count = Math.min(10, this.keyboardQueue.length);
      const chunk = this.keyboardQueue.splice(0, count);
      for (let i = 0; i < chunk.length; i++) {
        this.memory.ram[KEYBUF_ADDR + i] = chunk[i];
      }
      this.memory.ram[0x00c6] = count;
    }
  }

  // Alias for typeText
  public injectString(text: string) {
    this.typeText(text);
  }

  // Assemble and execute 6502 Machine Code directly in C64
  public runAssembly(asmSource: string, defaultOrigin = 0xc000): AssemblyResult {
    const result = C64Assembler.assemble(asmSource, defaultOrigin);
    if (result.success && result.prgBytes) {
      this.loadAndRunPRG(result.prgBytes, "ASM_CODE.PRG");
    }
    return result;
  }

  // Poll Web Gamepad API and update Joystick Ports 1 and 2
  public updateGamepads() {
    if (!navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    if (!gamepads) return;

    // Joystick 2 (Default Primary Player: $DC00 on CIA 1)
    const gp2 = gamepads[0];
    if (gp2) {
      let joy = 0xff;
      if (gp2.axes[1] < -0.4 || gp2.buttons[12]?.pressed) joy &= ~0x01; // Up
      if (gp2.axes[1] > 0.4 || gp2.buttons[13]?.pressed) joy &= ~0x02; // Down
      if (gp2.axes[0] < -0.4 || gp2.buttons[14]?.pressed) joy &= ~0x04; // Left
      if (gp2.axes[0] > 0.4 || gp2.buttons[15]?.pressed) joy &= ~0x08; // Right
      if (gp2.buttons[0]?.pressed || gp2.buttons[1]?.pressed || gp2.buttons[2]?.pressed) joy &= ~0x10; // Fire
      this.cia1.joy2 = joy;
    }

    // Joystick 1 (Player 2: $DC01 on CIA 1)
    const gp1 = gamepads[1];
    if (gp1) {
      let joy = 0xff;
      if (gp1.axes[1] < -0.4 || gp1.buttons[12]?.pressed) joy &= ~0x01;
      if (gp1.axes[1] > 0.4 || gp1.buttons[13]?.pressed) joy &= ~0x02;
      if (gp1.axes[0] < -0.4 || gp1.buttons[14]?.pressed) joy &= ~0x04;
      if (gp1.axes[0] > 0.4 || gp1.buttons[15]?.pressed) joy &= ~0x08;
      if (gp1.buttons[0]?.pressed || gp1.buttons[1]?.pressed) joy &= ~0x10;
      this.cia1.joy1 = joy;
    }
  }

  // Execute a single video frame (312 raster lines for PAL, 263 for NTSC)
  public stepFrame() {
    this.updateGamepads();

    // Stream queued keyboard inputs into hardware keyboard buffer ($0277 / $00C6)
    if (this.keyboardQueue.length > 0 && this.memory.ram[0x00c6] === 0) {
      const count = Math.min(10, this.keyboardQueue.length);
      const chunk = this.keyboardQueue.splice(0, count);
      for (let i = 0; i < chunk.length; i++) {
        this.memory.ram[0x0277 + i] = chunk[i];
      }
      this.memory.ram[0x00c6] = count;
    }

    const totalLines = this.vic.totalRasterLines;
    const cycPerLine = this.vic.cyclesPerLine;

    for (let line = 0; line < totalLines; line++) {
      this.stepScanline();
    }

    this.frameCount++;
  }

  // Step one full scanline (63 cycles PAL / 65 cycles NTSC)
  public stepScanline(): number {
    const cycPerLine = this.vic.cyclesPerLine;

    // 1. Start of scanline (triggers raster IRQ if matched on current line)
    const stolen = this.vic.startLine();
    const cpuBudget = cycPerLine - (stolen || 0);

    // Check interrupts before executing CPU budget for this scanline
    if (this.vic.isIrqActive() || this.cia1.irqAsserted) {
      this.cpu.triggerIRQ();
    }
    if (this.cia2.irqAsserted) {
      this.cpu.triggerNMI();
    }

    // 2. Step CPU instructions for available budget
    let cpuDone = 0;
    while (cpuDone < cpuBudget) {
      const cyc = this.cpu.step();
      this.cia1.step(cyc);
      this.cia2.step(cyc);
      cpuDone += cyc;
      this.totalCycles += cyc;
    }

    // Step CIA timers by stolen cycles if DMA occurred
    if (stolen > 0) {
      this.cia1.step(stolen);
      this.cia2.step(stolen);
      this.totalCycles += stolen;
    }

    this.lineCycles = (this.lineCycles + cycPerLine) % cycPerLine;

    // 3. Render scanline with registers state after CPU execution, and advance raster
    this.vic.endLine();

    return cycPerLine;
  }

  // Step a precise number of CPU / bus clock cycles
  public stepCycles(requestedCycles: number = 1): number {
    let executed = 0;
    while (executed < requestedCycles) {
      const cyc = this.cpu.step();
      this.cia1.step(cyc);
      this.cia2.step(cyc);
      executed += cyc;
      this.totalCycles += cyc;
      this.lineCycles += cyc;

      if (this.lineCycles >= this.vic.cyclesPerLine) {
        this.lineCycles -= this.vic.cyclesPerLine;
        this.vic.endLine();
        this.vic.startLine();
        if (this.vic.isIrqActive() || this.cia1.irqAsserted) {
          this.cpu.triggerIRQ();
        }
        if (this.cia2.irqAsserted) {
          this.cpu.triggerNMI();
        }
      }
    }
    return executed;
  }

  // Step a single 6502 instruction
  public stepInstruction(): number {
    const cycles = this.cpu.step();
    this.cia1.step(cycles);
    this.cia2.step(cycles);
    this.totalCycles += cycles;
    this.lineCycles += cycles;

    if (this.lineCycles >= this.vic.cyclesPerLine) {
      this.lineCycles -= this.vic.cyclesPerLine;
      this.vic.endLine();
      this.vic.startLine();
      if (this.vic.isIrqActive() || this.cia1.irqAsserted) {
        this.cpu.triggerIRQ();
      }
      if (this.cia2.irqAsserted) {
        this.cpu.triggerNMI();
      }
    }

    return cycles;
  }

  // Alias for stepInstruction
  public stepCpu(): number {
    return this.stepInstruction();
  }

  // Start continuous emulation loop synchronized to authentic PAL (50.125 Hz) / NTSC (59.826 Hz)
  public start(onFrameRender?: () => void) {
    this.isRunning = true;
    this.lastFrameTime = 0;
    this.frameAccumulator = 0;
    if (onFrameRender) {
      this.onFrameRender = onFrameRender;
    }
    this.sid.initAudio();
    this.sid.resumeAudio();

    if (typeof requestAnimationFrame !== "undefined") {
      const loop = (timestamp: number) => {
        if (!this.isRunning) return;

        if (!this.lastFrameTime) {
          this.lastFrameTime = timestamp;
        }
        let delta = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;

        // Prevent spiral of death on background tab or system lag spike (max 100ms)
        if (delta > 100) delta = 100;
        if (delta < 0) delta = 0;

        // Calculate exact target frame duration based on active video standard (PAL or NTSC)
        const isPal = this.vic.videoStandard === VideoStandard.PAL;
        // PAL: 985248.4 / 19656 = 50.12456 Hz (~19.9503 ms)
        // NTSC: 1022727.27 / 17095 = 59.82611 Hz (~16.7145 ms)
        const targetHz = isPal ? (985248.4 / 19656) : (1022727.27 / 17095);
        const frameDurationMs = 1000 / targetHz;

        this.frameAccumulator += delta;

        // Update real-world FPS measurement every 1000ms
        if (!this.lastFpsTime) this.lastFpsTime = timestamp;
        if (timestamp - this.lastFpsTime >= 1000) {
          const elapsedSec = (timestamp - this.lastFpsTime) / 1000;
          this.fps = Math.round((this.frameCount / elapsedSec) * 10) / 10;
          this.frameCount = 0;
          this.lastFpsTime = timestamp;
        }

        // Run authentic number of emulation frames matching real-time clock
        let framesRun = 0;
        while (this.frameAccumulator >= frameDurationMs && framesRun < 4) {
          this.stepFrame();
          this.frameAccumulator -= frameDurationMs;
          framesRun++;
        }

        // Warp Turbo Mode executes 4 additional frames
        if (this.isWarpMode) {
          for (let w = 0; w < 4; w++) {
            this.stepFrame();
          }
        }

        if (framesRun > 0 || this.isWarpMode) {
          this.onFrameRender?.();
        }

        this.animFrameId = requestAnimationFrame(loop);
      };

      this.animFrameId = requestAnimationFrame(loop);
    }
  }

  // Pause emulation
  public pause() {
    this.isRunning = false;
    this.lastFrameTime = 0;
    this.frameAccumulator = 0;
    if (this.animFrameId !== null && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  // Gather real-time system telemetry
  public getTelemetry(): SystemTelemetry {
    const d011 = this.vic.regs[0x11];
    const d016 = this.vic.regs[0x16];
    let videoMode = "Standard Text (40x25)";
    if ((d011 & 0x20) !== 0) {
      videoMode = (d016 & 0x10) !== 0 ? "Multicolor Bitmap (160x200)" : "Hi-Res Bitmap (320x200)";
    } else if ((d016 & 0x10) !== 0) {
      videoMode = "Multicolor Text";
    }

    let activeVoices = 0;
    for (const v of this.sid.voices) {
      if (v.envelope > 0.01) activeVoices++;
    }

    const isPal = this.vic.videoStandard === VideoStandard.PAL;

    return {
      fps: this.fps || (isPal ? 50.1 : 59.8),
      cpuSpeedMhz: isPal ? 0.985 : 1.023,
      rasterLine: this.vic.currentRaster,
      lineCycle: this.lineCycles,
      totalCycles: this.totalCycles,
      pc: this.cpu.pc,
      a: this.cpu.a,
      x: this.cpu.x,
      y: this.cpu.y,
      sp: this.cpu.sp,
      flags: this.cpu.getFlagsString(),
      vicBank: this.vic.vicBank,
      videoMode,
      activeVoices,
      cartridge: this.mountedCart ? this.mountedCart.name : null,
      mountedDisk: this.mountedDisk ? this.mountedDisk.diskName : null,
      cia1TimerA: this.cia1.timerA,
      cia1TimerB: this.cia1.timerB,
      cia1Icr: this.cia1.icr,
      cia2Icr: this.cia2.icr,
      irqActive: this.vic.isIrqActive() || this.cia1.irqAsserted,
      nmiActive: this.cia2.irqAsserted,
    };
  }

  // Export full system state (RAM, Registers, VIC-II, CIAs, SID) for sharing reproducible crash snapshots
  public exportCrashSnapshot(description: string = "Reproducible Crash Snapshot"): C64SystemCrashSnapshot {
    return {
      format: "COMMODORE_64_CRASH_SNAPSHOT_V1",
      version: 1,
      timestamp: new Date().toISOString(),
      description,
      hardware: {
        standard: this.vic.standard,
        totalRasterLines: this.vic.totalRasterLines,
        cyclesPerLine: this.vic.cyclesPerLine,
      },
      system: {
        totalCycles: this.totalCycles,
        lineCycles: this.lineCycles,
        frameCount: this.frameCount,
        isRunning: this.isRunning,
        isPaused: !this.isRunning,
        isWarpMode: this.isWarpMode,
      },
      cpu: {
        pc: this.cpu.pc,
        a: this.cpu.a,
        x: this.cpu.x,
        y: this.cpu.y,
        sp: this.cpu.sp,
        fC: this.cpu.fC,
        fZ: this.cpu.fZ,
        fI: this.cpu.fI,
        fD: this.cpu.fD,
        fB: this.cpu.fB,
        fV: this.cpu.fV,
        fN: this.cpu.fN,
        cycles: this.cpu.cycles,
        totalCycles: this.cpu.totalCycles,
        halted: this.cpu.halted,
        irqPending: this.cpu.irqPending,
        nmiPending: this.cpu.nmiPending,
      },
      memory: {
        portDDR: this.memory.portDDR,
        portData: this.memory.portData,
        _loram: this.memory._loram,
        _hiram: this.memory._hiram,
        _charen: this.memory._charen,
        ramBase64: uint8ToBase64(this.memory.ram),
        colorRamBase64: uint8ToBase64(this.memory.colorRam),
      },
      vic: {
        regs: Array.from(this.vic.regs),
        currentRaster: this.vic.currentRaster,
        rasterCompare: this.vic.rasterCompare,
        rasterIrqEnabled: this.vic.rasterIrqEnabled,
        vicBank: this.vic.vicBank,
        vBorder: this.vic.vBorder,
        mainBorder: this.vic.mainBorder,
        standard: this.vic.standard,
      },
      cia1: {
        cra: this.cia1.cra,
        crb: this.cia1.crb,
        timerA: this.cia1.timerA,
        timerALatch: this.cia1.timerALatch,
        timerB: this.cia1.timerB,
        timerBLatch: this.cia1.timerBLatch,
        icr: this.cia1.icr,
        imr: this.cia1.imr,
        sdr: this.cia1.sdr,
        sdrBitsLeft: this.cia1.sdrBitsLeft,
        joy1: this.cia1.joy1,
        joy2: this.cia1.joy2,
      },
      cia2: {
        cra: this.cia2.cra,
        crb: this.cia2.crb,
        timerA: this.cia2.timerA,
        timerALatch: this.cia2.timerALatch,
        timerB: this.cia2.timerB,
        timerBLatch: this.cia2.timerBLatch,
        icr: this.cia2.icr,
        imr: this.cia2.imr,
        sdr: this.cia2.sdr,
        sdrBitsLeft: this.cia2.sdrBitsLeft,
      },
      sid: {
        regs: Array.from(this.sid.regs),
        chipModel: this.sid.chipModel,
      },
    };
  }

  // Import and restore full reproducible system state
  public importCrashSnapshot(input: C64SystemCrashSnapshot | string): boolean {
    try {
      const snap: C64SystemCrashSnapshot = typeof input === "string" ? JSON.parse(input) : input;
      if (!snap || snap.format !== "COMMODORE_64_CRASH_SNAPSHOT_V1") {
        throw new Error("Invalid snapshot format");
      }

      this.pause();

      // Restore System state
      this.totalCycles = snap.system.totalCycles || 0;
      this.lineCycles = snap.system.lineCycles || 0;
      this.frameCount = snap.system.frameCount || 0;
      this.isWarpMode = !!snap.system.isWarpMode;

      // Restore CPU
      this.cpu.pc = snap.cpu.pc & 0xffff;
      this.cpu.a = snap.cpu.a & 0xff;
      this.cpu.x = snap.cpu.x & 0xff;
      this.cpu.y = snap.cpu.y & 0xff;
      this.cpu.sp = snap.cpu.sp & 0xff;
      this.cpu.fC = snap.cpu.fC ? 1 : 0;
      this.cpu.fZ = snap.cpu.fZ ? 1 : 0;
      this.cpu.fI = snap.cpu.fI ? 1 : 0;
      this.cpu.fD = snap.cpu.fD ? 1 : 0;
      this.cpu.fB = snap.cpu.fB ? 1 : 0;
      this.cpu.fV = snap.cpu.fV ? 1 : 0;
      this.cpu.fN = snap.cpu.fN ? 1 : 0;
      this.cpu.cycles = snap.cpu.cycles || 0;
      this.cpu.totalCycles = snap.cpu.totalCycles || 0;
      this.cpu.halted = !!snap.cpu.halted;
      this.cpu.irqPending = !!snap.cpu.irqPending;
      this.cpu.nmiPending = !!snap.cpu.nmiPending;

      // Restore Memory & Banking
      this.memory.portDDR = snap.memory.portDDR & 0xff;
      this.memory.portData = snap.memory.portData & 0xff;
      this.memory._loram = !!snap.memory._loram;
      this.memory._hiram = !!snap.memory._hiram;
      this.memory._charen = !!snap.memory._charen;
      const ramDecoded = base64ToUint8(snap.memory.ramBase64);
      this.memory.ram.set(ramDecoded);
      const colorDecoded = base64ToUint8(snap.memory.colorRamBase64);
      this.memory.colorRam.set(colorDecoded);

      // Restore VIC-II
      if (snap.vic.regs && snap.vic.regs.length) {
        for (let i = 0; i < Math.min(64, snap.vic.regs.length); i++) {
          this.vic.regs[i] = snap.vic.regs[i];
        }
      }
      this.vic.currentRaster = snap.vic.currentRaster || 0;
      this.vic.rasterCompare = snap.vic.rasterCompare || 0;
      this.vic.rasterIrqEnabled = !!snap.vic.rasterIrqEnabled;
      this.vic.vicBank = snap.vic.vicBank || 0;
      this.vic.vBorder = snap.vic.vBorder !== undefined ? snap.vic.vBorder : true;
      this.vic.mainBorder = snap.vic.mainBorder !== undefined ? snap.vic.mainBorder : true;

      // Restore CIA 1
      this.cia1.cra = snap.cia1.cra & 0xff;
      this.cia1.crb = snap.cia1.crb & 0xff;
      this.cia1.timerA = snap.cia1.timerA;
      this.cia1.timerALatch = snap.cia1.timerALatch;
      this.cia1.timerB = snap.cia1.timerB;
      this.cia1.timerBLatch = snap.cia1.timerBLatch;
      this.cia1.icr = snap.cia1.icr;
      this.cia1.imr = snap.cia1.imr;
      this.cia1.sdr = snap.cia1.sdr || 0;
      this.cia1.sdrBitsLeft = snap.cia1.sdrBitsLeft || 0;
      this.cia1.joy1 = snap.cia1.joy1 !== undefined ? snap.cia1.joy1 : 0xff;
      this.cia1.joy2 = snap.cia1.joy2 !== undefined ? snap.cia1.joy2 : 0xff;

      // Restore CIA 2
      this.cia2.cra = snap.cia2.cra & 0xff;
      this.cia2.crb = snap.cia2.crb & 0xff;
      this.cia2.timerA = snap.cia2.timerA;
      this.cia2.timerALatch = snap.cia2.timerALatch;
      this.cia2.timerB = snap.cia2.timerB;
      this.cia2.timerBLatch = snap.cia2.timerBLatch;
      this.cia2.icr = snap.cia2.icr;
      this.cia2.imr = snap.cia2.imr;
      this.cia2.sdr = snap.cia2.sdr || 0;
      this.cia2.sdrBitsLeft = snap.cia2.sdrBitsLeft || 0;

      // Restore SID
      if (snap.sid.regs && snap.sid.regs.length) {
        for (let i = 0; i < Math.min(32, snap.sid.regs.length); i++) {
          this.sid.regs[i] = snap.sid.regs[i];
        }
      }
      if (snap.sid.chipModel === "MOS6581" || snap.sid.chipModel === "MOS8580") {
        this.sid.setChipModel(snap.sid.chipModel);
      }

      // Force canvas redraw
      this.onFrameRender?.();
      return true;
    } catch (e) {
      console.error("Failed to load crash snapshot:", e);
      return false;
    }
  }
}

// Helpers for compact Base64 encoding of 64KB RAM & Color RAM
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface C64SystemCrashSnapshot {
  format: "COMMODORE_64_CRASH_SNAPSHOT_V1";
  version: number;
  timestamp: string;
  description: string;
  hardware: {
    standard: string;
    totalRasterLines: number;
    cyclesPerLine: number;
  };
  system: {
    totalCycles: number;
    lineCycles: number;
    frameCount: number;
    isRunning: boolean;
    isPaused: boolean;
    isWarpMode: boolean;
  };
  cpu: {
    pc: number;
    a: number;
    x: number;
    y: number;
    sp: number;
    fC: number;
    fZ: number;
    fI: number;
    fD: number;
    fB: number;
    fV: number;
    fN: number;
    cycles: number;
    totalCycles: number;
    halted: boolean;
    irqPending: boolean;
    nmiPending: boolean;
  };
  memory: {
    portDDR: number;
    portData: number;
    _loram: boolean;
    _hiram: boolean;
    _charen: boolean;
    ramBase64: string;
    colorRamBase64: string;
  };
  vic: {
    regs: number[];
    currentRaster: number;
    rasterCompare: number;
    rasterIrqEnabled: boolean;
    vicBank: number;
    vBorder: boolean;
    mainBorder: boolean;
    standard: string;
  };
  cia1: {
    cra: number;
    crb: number;
    timerA: number;
    timerALatch: number;
    timerB: number;
    timerBLatch: number;
    icr: number;
    imr: number;
    sdr: number;
    sdrBitsLeft: number;
    joy1: number;
    joy2: number;
  };
  cia2: {
    cra: number;
    crb: number;
    timerA: number;
    timerALatch: number;
    timerB: number;
    timerBLatch: number;
    icr: number;
    imr: number;
    sdr: number;
    sdrBitsLeft: number;
  };
  sid: {
    regs: number[];
    chipModel: string;
  };
}
