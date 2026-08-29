# 02. Commodore 64 Memory Map & Zero Page Reference

> **Source:** [mist64/c64ref](https://github.com/mist64/c64ref) (Mapping the C64 - Sheldon Leemon, Joe Forster, CBM PRG)

## 1. Complete 64 KB Memory Map Overview

```
  +-------------------------------------------------------------+ $FFFF
  |  KERNAL ROM ($E000-$FFFF, 8 KB)                             |
  |  or RAM if banking switched off                             |
  +-------------------------------------------------------------+ $E000
  |  I/O Registers / Color RAM / Char ROM ($D000-$DFFF, 4 KB)   |
  |    $D000-$D3FF: VIC-II Video Controller                     |
  |    $D400-$D7FF: SID Sound Synthesizer                       |
  |    $D800-$DBFF: Color RAM (1024 x 4-bit nybbles)            |
  |    $DC00-$DCFF: CIA 1 (Keyboard, Joystick 1/2, Timers)      |
  |    $DD00-$DDFF: CIA 2 (VIC Bank, IEC Bus, NMI)              |
  |    $DE00-$DFFF: Expansion Control / Cartridge Registers     |
  +-------------------------------------------------------------+ $D000
  |  Free RAM ($C000-$CFFF, 4 KB) - Ideal for Machine Code      |
  +-------------------------------------------------------------+ $C000
  |  BASIC ROM ($A000-$BFFF, 8 KB)                              |
  |  or RAM if banking switched off                             |
  +-------------------------------------------------------------+ $A000
  |  Free BASIC RAM ($0800-$9FFF, 38,911 Bytes Available)       |
  |  Default BASIC Program Start: $0801                         |
  +-------------------------------------------------------------+ $0800
  |  Default Text Screen RAM ($0400-$07E7, 1000 Bytes)          |
  |  $07F8-$07FF: Sprite 0-7 Data Pointers                      |
  +-------------------------------------------------------------+ $0400
  |  System Variables, Buffers, Vectors ($0200-$03FF)           |
  |    $0200-$0258: BASIC Input Buffer (89 bytes)               |
  |    $0277-$0280: Keyboard Buffer (10 bytes)                  |
  |    $0314-$0315: IRQ Vector Table ($EA31)                    |
  |    $0318-$0319: NMI Vector Table ($FE47)                    |
  |    $033C-$03FB: Tape Buffer (192 bytes)                     |
  +-------------------------------------------------------------+ $0200
  |  CPU Hardware Stack ($0100-$01FF, 256 Bytes)                |
  +-------------------------------------------------------------+ $0100
  |  Zero Page ($0000-$00FF, 256 Fast Zero-Page Registers)      |
  |    $0000: 6510 Direction Register (DDR)                     |
  |    $0001: 6510 Data Register (Memory Banking Control)       |
  +-------------------------------------------------------------+ $0000
```

---

## 2. Processor Port ($0001) PLA Memory Banking Configurations

| Value ($01) | LORAM (bit 0) | HIRAM (bit 1) | CHAREN (bit 2) | $A000-$BFFF | $D000-$DFFF | $E000-$FFFF | Typical Use Case |
|---|---|---|---|---|---|---|---|
| **$37 (55)** | 1 | 1 | 1 | **BASIC ROM** | **I/O Devices** | **KERNAL ROM** | Default C64 System Mode |
| **$36 (54)** | 0 | 1 | 1 | **RAM** | **I/O Devices** | **KERNAL ROM** | Assembler / Extended RAM Games |
| **$35 (53)** | 0 | 0 | 1 | **RAM** | **I/O Devices** | **RAM** | Full 64 KB RAM with hardware I/O |
| **$34 (52)** | 0 | 0 | 0 | **RAM** | **RAM** | **RAM** | 100% Flat 64 KB RAM (No ROM/IO) |
| **$33 (51)** | 1 | 1 | 0 | **BASIC ROM** | **Char ROM** | **KERNAL ROM** | Reading Character Generator ROM |
| **$30 (48)** | 0 | 0 | 0 | **RAM** | **RAM** | **RAM** | Max RAM execution |

---

## 3. Essential Zero Page Pointers ($0000-$00FF)

| Address | Size | Label | Description |
|---|---|---|---|
| `$0000` | 1B | **D6510** | 6510 On-chip Data Direction Register (Default `$2F`) |
| `$0001` | 1B | **R6510** | 6510 On-chip 8-bit Port (Default `$37`) |
| `$002B-$002C` | 2B | **TXTTAB** | Pointer to start of BASIC Program text (Default: `$0801`) |
| `$002D-$002E` | 2B | **VARTAB** | Pointer to start of simple BASIC variables |
| `$002F-$0030` | 2B | **ARYTAB** | Pointer to start of BASIC array variables |
| `$0031-$0032` | 2B | **STREND** | Pointer to end of BASIC array storage |
| `$0033-$0034` | 2B | **FRETOP** | Pointer to bottom of dynamic string storage |
| `$0037-$0038` | 2B | **MEMSIZ** | Pointer to top of usable BASIC memory (Default: `$A000`) |
| `$0073-$008A` | 24B | **CHRGET** | Subroutine in RAM to fetch next character from BASIC program |
| `$0090` | 1B | **STATUS** | KERNAL I/O Status Word (0 = OK, bit 6 = EOF, bit 7 = Device not present) |
| `$0093` | 1B | **VERCK** | Load (0) or Verify (1) flag |
| `$00A0-$00A2` | 3B | **TIME** | System 60Hz Jiffy Clock (3-byte integer updated on each IRQ) |
| `$00C6` | 1B | **NDX** | Number of characters in Keyboard Buffer (`$0277-$0280`) |
| `$00C5` | 1B | **LSTX** | Matrix coordinate of currently held key (`$40` = no key pressed) |
| `$00CB` | 1B | **SFDX** | Decoded PETSCII key from last keyboard matrix scan |
| `$00D1-$00D2` | 2B | **PNTR** | Pointer to current cursor row in Screen Memory |
| `$00D3` | 1B | **PNTRX** | Cursor column index (0-39) |
| `$00D6` | 1B | **LNMX** | Physical screen line length (39 or 79 for wrapped lines) |
| `$00F3-$00F4` | 2B | **PALNTCS**| Video standard flag (0 = NTSC, 1 = PAL) |
