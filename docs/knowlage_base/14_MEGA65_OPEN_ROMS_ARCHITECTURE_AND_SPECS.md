# MEGA65 Open-ROMs Architecture & Technical Specifications

> **Source Reference**: Official Open-ROMs Project (`https://github.com/MEGA65/open-roms`)  
> **Target Systems**: MEGA65 FPGA Retro Computer, Commodore 64, Commodore 65, Ultimate 64, VICE (`x64sc`), Xemu  
> **Toolchain**: Ophis 6502/65C02/45GS02 Assembler, `reorder.py` Deterministic Preprocessor

---

## 1. Executive Summary & Project Purpose

The **MEGA65 Open-ROMs** project is a clean-room, open-source re-implementation of the 8-bit Commodore system ROMs (KERNAL, BASIC, and DOS).

```
+-----------------------------------------------------------------------------+
|                         COMMODORE 64 / 65 ROM SETS                          |
+------------------------------------+----------------------------------------+
| Original Commodore / Cloanto ROMs  | MEGA65 Open-ROMs (Clean-Room Project)  |
+------------------------------------+----------------------------------------+
| • Proprietary closed copyright     | • Free & Open-Source (Unencumbered)    |
| • Strict distribution licenses     | • Royalty-free bundling on MEGA65 FPGA |
| • Hardcoded legacy ROM bugs        | • Fixes legacy bugs & adds DOS wedge   |
| • Fixed 38911 bytes free RAM model | • Modular 60K & MEGA65 memory models   |
+------------------------------------+----------------------------------------+
```

### Key Engineering Goals
1. **100% Unencumbered Legal Status**: Enables pre-installing functional operating firmware on new MEGA65 hardware units and modern FPGA boards (Ultimate 64, MiSTer) without proprietary license entanglements.
2. **Binary & Vector Compatibility**: Exact functional compliance with standard KERNAL jump tables (`$FF81-$FFF3`) and Zero Page/Page 2/Page 3 vectors (`$0314-$0333`).
3. **Modular Build Pipeline**: Granular source organization where each OS routine is authored in an isolated, testable assembly file.

---

## 2. Source Code Architecture & Toolchain

The Open-ROMs codebase departs from the monolithic `kernal.s` / `basic.s` files of classic C64 disassemblies. Instead, it utilizes a modular, deterministic routine placement system.

```
open-roms/
├── src/
│   ├── config_c64.s           # Standard C64 build target
│   ├── config_mega65.s       # MEGA65 hardware & 40MHz extensions
│   ├── config_ultimate64.s   # Ultimate 64 FPGA target
│   ├── config_generic.s      # Base profile
│   ├── config_testing.s      # Unit test configuration
│   ├── kernal/
│   │   ├── ffd2.chrout.s     # Vector-pinned KERNAL routine ($FFD2)
│   │   ├── ffe4.getin.s      # Vector-pinned KERNAL routine ($FFE4)
│   │   ├── scnkey.s          # Keyboard scanner
│   │   └── ...
│   ├── basic/
│   │   ├── tokenizer.s       # Tokenizer & keyword table ($80-$FF)
│   │   ├── eval.s            # Expression evaluator
│   │   └── math_fac.s        # Floating-Point Accumulator routines
│   └── dos/
│       ├── wedge.s           # Direct mode DOS wedge (@, @$, /, %)
│       └── sd_driver.s       # Internal pseudo-IEC block handler
├── tools/
│   ├── reorder.py            # Deterministic code address scheduler
│   └── ophis                 # Ophis 6502/45GS02 assembler
```

### Deterministic Routine Ordering (`reorder.py`)
Because many routines do not require fixed entry addresses while vector entrypoints MUST reside at exact addresses (e.g. `$FFD2` for `CHROUT`), the build system employs a two-pass scheduler:
1. **Fixed-Address Routines (`xxxx.routine.s`)**: Placed at their mandatory offsets (e.g., jump table `$FF81-$FFF3`, reset vectors `$FFFA-$FFFF`).
2. **Floating Routines**: The `reorder.py` preprocessor orders all remaining subroutines into available gaps between fixed vectors, guaranteeing zero address collisions across varying configurations.
3. **Ophis Assembler**: Assembles the resulting unified stream into target `.bin` and `.rom` binaries.

---

## 3. Configuration Targets & Profiles

| Configuration Target | Source Config File | Platform & Features Enabled |
|---|---|---|
| **C64 Standard** | `config_c64.s` | 100% C64 breadbin / C64C compatible, 8KB BASIC (`$A000`) + 8KB KERNAL (`$E000`). |
| **MEGA65 Native** | `config_mega65.s` | MEGA65 45GS02 CPU (40 MHz), 128KB ROM bank mapping, Hypervisor traps, DMA controller. |
| **Ultimate 64** | `config_ultimate64.s` | Gideon'z Ultimate 64 FPGA board, fast IEC transfer acceleration, memory expansions. |
| **Testing / Debug** | `config_testing.s` | Emits assertion hooks, profiling counters, and test runner harness for automated CI. |

---

## 4. Memory Models & Address Layouts

Open-ROMs introduces customizable memory architectures suited for different use-cases:

```
           STANDARD MODEL                           60K EXTENDED MODEL
    +--------------------------+ $FFFF       +--------------------------+ $FFFF
    | KERNAL ROM (8 KB)        |             | RAM / Minimal KERNAL     |
    +--------------------------+ $E000       +--------------------------+ $E000
    | I/O ($D000-$DFFF) / RAM  |             | RAM (Usable by BASIC)    |
    +--------------------------+ $D000       +--------------------------+ $D000
    | Free RAM (4 KB)          |             | RAM (Extended BASIC)     |
    +--------------------------+ $C000       +--------------------------+ $C000
    | BASIC ROM (8 KB)         |             | RAM (Usable by BASIC)    |
    +--------------------------+ $A000       +--------------------------+ $A000
    | Usable BASIC RAM         |             | Usable BASIC RAM         |
    | (38,911 Bytes Free)      |             | (~60,000 Bytes Free)     |
    +--------------------------+ $0800       +--------------------------+ $0800
    | Screen / Pointers / ZP   |             | Screen / Pointers / ZP   |
    +--------------------------+ $0000       +--------------------------+ $0000
```

### Memory Models Breakdown
1. **`MEMORY_MODEL_STANDARD`**:
   - Full compatibility with existing C64 commercial software.
   - Yields the standard `38911 BASIC BYTES FREE` banner.
2. **`MEMORY_MODEL_60K`**:
   - Reclaims the `$A000-$BFFF` (BASIC ROM) and `$C000-$CFFF` areas for BASIC program storage by running KERNAL banking dynamically or in low footprint mode.
   - Provides ~60 KB for large pure BASIC calculations and database utilities.
3. **`MEMORY_MODEL_MEGA65`**:
   - Leverages 128 KB of fast ROM bank-switched via the MEGA65 memory mapper with 8KB granularity.

---

## 5. KERNAL Compatibility & Vector Implementation

### KERNAL Jump Table ($FF81 - $FFF3)
Open-ROMs guarantees strict 1:1 compliance with all 39 standard Commodore KERNAL entrypoints:

```
Address   Symbol     Description                              Open-ROM Status
-----------------------------------------------------------------------------
$FF81     CINT       Initialize screen editor & VIC-II       Implemented (Clean)
$FF84     IOINIT     Initialize CIA 1/2 chips & timers       Implemented (Clean)
$FF87     RAMTAS     Initialize RAM, find memory top/bottom  Implemented (Clean)
$FF8A     RESTOR     Restore default I/O vectors ($0314)     Implemented (Clean)
$FF8D     VECTOR     Read/write indirect I/O vectors         Implemented (Clean)
$FF90     SETMSG     Control KERNAL error/status messages    Implemented (Clean)
$FF93     SECLSN     Send secondary address after LISTEN     Implemented (Clean)
$FF96     SECTLK     Send secondary address after TALK       Implemented (Clean)
$FF99     MEMTOP     Read/set top of user memory             Implemented (Clean)
$FF9C     MEMBOT     Read/set bottom of user memory          Implemented (Clean)
$FF9F     SCNKEY     Scan keyboard matrix (CIA 1 $DC00)      Implemented (Clean)
$FFA2     SETTMO     Set IEEE-488 / IEC bus timeout          Implemented (Clean)
$FFA5     IECIN      Receive byte from serial IEC bus        Implemented (Clean)
$FFA8     IECOUT     Send byte over serial IEC bus           Implemented (Clean)
$FFAB     UNTLK      Transmit UNTALK command on IEC bus      Implemented (Clean)
$FFAE     UNLSN      Transmit UNLISTEN command on IEC bus    Implemented (Clean)
$FFB1     LISTEN     Transmit LISTEN command to IEC device   Implemented (Clean)
$FFB4     TALK       Transmit TALK command to IEC device     Implemented (Clean)
$FFB7     READST     Read I/O status word ($90)              Implemented (Clean)
$FFBA     SETLFS     Set logical file, device & secondary #  Implemented (Clean)
$FFBD     SETNAM     Set filename string length and pointer  Implemented (Clean)
$FFC0     OPEN       Open logical file                       Implemented (Clean)
$FFC3     CLOSE      Close logical file                      Implemented (Clean)
$FFC6     CHKIN      Set input channel                       Implemented (Clean)
$FFC9     CKOUT      Set output channel                      Implemented (Clean)
$FFCC     CLRCHN     Restore default input/output channels   Implemented (Clean)
$FFCF     BASIN      Read byte from input channel (CHRIN)    Implemented (Clean)
$FFD2     BSOUT      Write byte to output channel (CHROUT)   Implemented (Clean)
$FFD5     LOAD       Load file into RAM from device          Implemented (Clean)
$FFD8     SAVE       Save memory range to device             Implemented (Clean)
$FFDB     SETTIM     Set real-time clock ($A0-$A2)           Implemented (Clean)
$FFDE     RDTIM      Read real-time clock ($A0-$A2)          Implemented (Clean)
$FFE1     STOP       Scan RUN/STOP key state ($91)           Implemented (Clean)
$FFE4     GETIN      Get character from keyboard buffer      Implemented (Clean)
$FFE7     CLALL      Close all logical files & reset channelsImplemented (Clean)
$FFEA     UDTIM      Increment 60Hz software clock & timers  Implemented (Clean)
$FFED     SCRORG     Get screen dimensions (40x25)           Implemented (Clean)
$FFF0     PLOT       Read/write cursor position (X, Y)       Implemented (Clean)
$FFF3     IOBASE     Return base address of I/O block ($D000)Implemented (Clean)
```

### Indirect Vector Table in RAM ($0314 - $0333)
```
Vector Pointer   Default Target   Description
----------------------------------------------------------------
$0314-$0315      IRQ ($EA31)      Hardware IRQ Interrupt Handler
$0316-$0317      BRK ($FE66)      Software Break (BRK opcode) Handler
$0318-$0319      NMI ($FE47)      Non-Maskable Interrupt (RESTORE key / CIA 2)
$031A-$031B      OPEN             Indirect OPEN vector
$031C-$031D      CLOSE            Indirect CLOSE vector
$031E-$031F      CHKIN            Indirect CHKIN vector
$0320-$0321      CKOUT            Indirect CKOUT vector
$0322-$0323      CLRCHN           Indirect CLRCHN vector
$0324-$0325      CHRIN            Indirect CHRIN vector
$0326-$0327      CHROUT           Indirect CHROUT vector
$0328-$0329      STOP             Indirect STOP check vector
$032A-$032B      GETIN            Indirect GETIN vector
$032C-$032D      CLALL            Indirect CLALL vector
$032E-$032F      USRCMD           User custom vector
$0330-$0331      LOAD             Indirect LOAD vector
$0332-$0333      SAVE             Indirect SAVE vector
```

---

## 6. Integrated Utilities & Enhancements

Beyond legacy compatibility, Open-ROMs integrates several high-demand extensions:

### 1. Built-in DOS Wedge
Direct mode commands executed directly from the `READY.` prompt without loading an external cartridge or `DOS 5.1` wedge:
- `@` — Display drive status channel (`00, OK, 00, 00`).
- `@$` — Display disk directory without overwriting BASIC program in RAM.
- `@#device` — Switch active default disk drive number (e.g. `@#9`).
- `/filename` — Quick load binary PRG.
- `%filename` — Quick load & run PRG.
- `↑filename` — Quick save PRG.

### 2. Internal Pseudo-IEC / SD Card Driver
For MEGA65 and Ultimate 64 targets, Open-ROMs handles block-level read/write operations to SD card FAT32 partitions and virtual D64/D81 images directly via hardware register DMA and hypervisor calls.

### 3. Diagnostic & Calibration Tools
- **Tape Head Alignment Visualizer**: Real-time raster oscilloscope rendering pulse transitions from the C2N datasette for manual azimuth alignment.
- **Joystick / CIA Tester**: Interactive port inspection tool embedded in diagnostic builds.
- **Fast Boot Mode**: Skips the 5-second power-on memory test delay for near-instant boot into BASIC.

---

## 7. OpenBASIC V2 Subsystem Specifications

The BASIC interpreter in Open-ROMs is fully clean-room engineered:

```
                     +---------------------------------+
                     | Raw ASCII / PETSCII Input Line  |
                     +----------------+----------------+
                                      |
                           [ Tokenizer Engine ]
                                      |
                     +----------------v----------------+
                     | Tokenized Byte Stream ($80-$FF) |
                     +----------------+----------------+
                                      |
                      [ Recursive Descent Parser ]
                                      |
                +---------------------+---------------------+
                |                                           |
       [ Control Flow ]                            [ Math Subsystem ]
 (GOTO, FOR/NEXT, IF/THEN)                     (FAC1, FAC2, FADD, FMULT)
```

### Floating-Point Math Implementation
- **FAC1 (Floating Point Accumulator 1)**: Memory locations `$61-$66` (Exponent, Mantissa 4 bytes, Sign).
- **FAC2 / ARG (Floating Point Accumulator 2)**: Memory locations `$69-$6E`.
- Clean-room binary algorithms for trigonometric (`SIN`, `COS`, `TAN`), logarithmic (`LOG`, `EXP`), power (`^`), and division operations matching Commodore 5-byte Microsoft Floating-Point binary format.

---

## 8. Verification & Test Suite

The Open-ROMs repository maintains an automated Continuous Integration (CI) regression matrix:

1. **Unit Tests (`tests/`)**: Automated test scripts compiled with Ophis and executed via headless VICE (`x64sc`) and Xemu.
2. **Kupke Memory Test**: Validates zero-page and low-RAM retention across bank switches.
3. **Lorenz C64 Test Suite**: Strict verification of undocumented 6510 opcodes, decimal mode ADC/SBC flags, and cycle-exact timer IRQs.
4. **Commercial Game Compatibility**: Verification matrix covering demanding fastloaders (Epyx FastLoad, Action Replay, DreamLoad) and multi-part disk games.
