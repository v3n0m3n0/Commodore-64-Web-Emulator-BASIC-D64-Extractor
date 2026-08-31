# VICE File Formats, Containers & Cartridge Specifications

> **Source Reference**: Official VICE Documentation (*Versatile Commodore Emulator*) — `https://vice-emu.sourceforge.io/vice_toc.html`  
> **Containers**: D64, G64, D71, D81, T64, TAP (v0/v1/v2), PRG, P00, CRT (v1.0/v2.0), VSF

---

## 1. Commodore Disk Image Formats

### 1.1. Standard D64 Format (Sector-Level Image)
A `.d64` file is a flat linear byte dump of all 256-byte sectors on a 1541 disk:
- **35-Track Standard**: Exactly $683 \text{ sectors} \times 256 \text{ bytes} = 174,848 \text{ bytes}$ ($170.75 \text{ KB}$).
- **35-Track with Error Bytes**: $174,848 + 683 = 175,531 \text{ bytes}$ (each byte at the end contains the DOS error code for each sector: `$01` OK, `$02` Header not found, `$05` Data checksum error...).
- **40-Track Extended**: $768 \text{ sectors} \times 256 \text{ bytes} = 196,608 \text{ bytes}$ ($192 \text{ KB}$).
- **40-Track with Error Bytes**: $196,608 + 768 = 197,376 \text{ bytes}$.

#### BAM (Block Availability Map) Structure (Track 18, Sector 0):
```
+-----------------+----------------------------------------------------------+
| Byte Offset     | Content / Description                                    |
+-----------------+----------------------------------------------------------+
| $00 - $01       | Track & Sector pointer to first Directory Block (18, 1)  |
| $02             | DOS Version format flag ('A' = $41 for Commodore DOS 2.6)|
| $03             | Unused ($00)                                             |
| $04 - $8F       | BAM Allocation table (4 bytes per track for Tracks 1-35):|
|                 |   - Byte 0: Free sectors counter on this track           |
|                 |   - Bytes 1-3: 24-bit bitmask (1 = Sector Free, 0 = Used)|
| $90 - $9F       | Disk Name (16 characters, padded with PETSCII $A0)       |
| $A0 - $A1       | Unused ($A0 $A0)                                         |
| $A2 - $A3       | Disk ID (2 characters)                                   |
| $A4             | Unused ($A0)                                             |
| $A5 - $A6       | DOS Type ('2A')                                          |
+-----------------+----------------------------------------------------------+
```

### 1.2. Raw GCR Flux Image Format (G64)
G64 preserves raw bitstream encoding, non-standard sector headers, copy protection tracks (rapid-fire syncs, long tracks, weak bits):
- **Header (`$0000 - $000B`)**:
  - Bytes 0-7: ASCII Signature `"GCR-1541"`
  - Byte 8: Version (`$00`)
  - Byte 9: Number of Tracks (typically 84 for half-tracks 1.0 to 42.0)
  - Bytes 10-11: Maximum Track Size in bytes (typically `$1F00` = 7,936 bytes)
- **Track Offset Table (`$000C - $015B`)**: 84x 4-byte 32-bit Little-Endian file offsets pointing to track data.
- **Track Speed Table (`$015C - $02AB`)**: 84x 4-byte 32-bit speed zone values (0, 1, 2, 3).
- **Track Data Chunks**: 2-byte track byte count followed by raw GCR bytes.

---

## 2. Tape Formats: T64 vs Raw Hardware TAP

```
+------------------------------------------------------------------------------------+
| 1. T64 (Tape Container Format - Fast / File-Level Archive)                         |
|   - 64-byte Header: "C64 tape image file" or "C64 tape file"                       |
|   - Directory Table: Max Entries, Used Entries                                     |
|   - File Entries: Entry Type ($01=PRG), Start Addr, End Addr, Offset in T64        |
+------------------------------------------------------------------------------------+
| 2. TAP (Raw C2N Datassette Pulse Transition Stream)                                |
|   - 12-byte Header: ASCII "C64-TAPE-RAW", Version ($00, $01, $02), 4-byte size     |
|   - Version 0: 8-bit pulse timer values (Pulse Duration in 8 CPU clock increments) |
|   - Version 1/2: Supports $00 escape byte for long pauses (followed by 3-byte LE)  |
|   - 100% compatible with turbo-tape loaders, Novaload, Cyberload, rack loaders     |
+------------------------------------------------------------------------------------+
```

---

## 3. Cartridge Image Format (CRT) v1.0 & v2.0 Specification

The **`.crt`** format is the standard container for ROM and Flash cartridges on the Commodore 64.

### 3.1. Main CRT File Header (64 Bytes)
```
+-------------+--------+---------------------------------------------------------------+
| Byte Offset | Size   | Field Description                                             |
+-------------+--------+---------------------------------------------------------------+
| $00 - $0F   | 16 B   | ASCII Signature: "C64 CARTRIDGE   " (padded with spaces)      |
| $10 - $13   | 4 B    | Header Size: Big-Endian DWORD (Always $00000040 = 64 bytes)   |
| $14 - $15   | 2 B    | CRT Version: Big-Endian WORD ($0100 = 1.0, $0200 = 2.0)       |
| $16 - $17   | 2 B    | Hardware Type ID: Big-Endian WORD (See Table Below)           |
| $18         | 1 B    | EXROM Line State on Boot (0 = Inactive High, 1 = Active Low)  |
| $19         | 1 B    | GAME Line State on Boot (0 = Inactive High, 1 = Active Low)   |
| $1A         | 1 B    | Subtype / Hardware Revision ID                                |
| $1B - $1F   | 5 B    | Reserved / Future Extension (must be zeroes)                 |
| $20 - $3F   | 32 B   | Cartridge Name (ASCII string, null-terminated/space-padded)   |
+-------------+--------+---------------------------------------------------------------+
```

### 3.2. CHIP Packet Header (16 Bytes) followed by ROM Data
Each ROM bank in a CRT cartridge is preceded by a `CHIP` packet:
```
+-------------+--------+---------------------------------------------------------------+
| Byte Offset | Size   | Field Description                                             |
+-------------+--------+---------------------------------------------------------------+
| $00 - $03   | 4 B    | ASCII Signature: "CHIP"                                       |
| $04 - $07   | 4 B    | Total Packet Length (Header 16 bytes + ROM Data Size)         |
| $08 - $09   | 2 B    | Chip Type: 0 = ROM, 1 = RAM, 2 = Flash ROM                    |
| $0A - $0B   | 2 B    | Bank Number (Big-Endian: Bank 0, 1, 2... 127)                 |
| $0C - $0D   | 2 B    | Starting Load Address ($8000 for ROML, $A000/$E000 for ROMH) |
| $0E - $0F   | 2 B    | ROM Image Size (Big-Endian: $2000 = 8KB, $4000 = 16KB)        |
+-------------+--------+---------------------------------------------------------------+
| $10 - end   | N Bytes| Raw Binary ROM Image Data                                     |
+-------------+--------+---------------------------------------------------------------+
```

### 3.3. Standard CRT Hardware Type IDs

```
+----+------------------------------+----+------------------------------+
| ID | Cartridge Type Name          | ID | Cartridge Type Name          |
+----+------------------------------+----+------------------------------+
|  0 | Standard Generic (8KB / 16KB)| 19 | Magic Desk (Up to 1MB ROM)   |
|  1 | Action Replay (MK II/III/IV) | 20 | Super Snapshot V5            |
|  2 | KCS Power Cartridge          | 21 | Comal 80                     |
|  3 | The Final Cartridge III      | 25 | Dinamic 128KB                |
|  4 | Simons' BASIC                | 26 | Zaxxon / Super Zaxxon        |
|  5 | Ocean Type 1 (128KB - 512KB) | 32 | EasyFlash (1MB Flash + RAM)  |
|  6 | Expert Cartridge             | 35 | Super Explode V5.0           |
|  7 | Fun Play / Power Play        | 43 | Prophet 64                   |
|  8 | Super Games Cartridge        | 45 | GMod2 (SPI Flash + EEPROM)   |
|  9 | Atomic / Nordic Power        | 48 | Kung Fu Flash                |
| 10 | Epyx FastLoad                | 51 | REU Expansion Emulation      |
| 11 | Westermann Learning          | 53 | GEO-RAM Cartridge            |
| 12 | Rex Utility                  | 55 | Action Replay V6 / Retro Rep.|
+----+------------------------------+----+------------------------------+
```

---

## 4. VICE Snapshot Format (.VSF)

VICE snapshots serialize the exact internal hardware state of the running computer into a multi-module tagged binary file:
- **Header**: Signature `"VICE Snapshot Image\012"`, Major/Minor version, Machine type string (`"C64"`, `"C128"`).
- **Tagged Modules**: Each chip writes its own module containing internal registers, cycle counters, and memory:
  - `MAINCPU`: Registers `A`, `X`, `Y`, `SP`, `PC`, `P`, `clk_ticks`, RDY state.
  - `C64MEM`: Complete 64KB RAM, Color RAM, CPU Port `$0000/$0001` direction and latch.
  - `VIC-II`: Register array (`$D000-$D02E`), internal raster line, raster cycle, sprite pointers, line buffer.
  - `SID`: Voice phase accumulators, ADSR states, envelope levels, filter capacitor charges.
  - `CIA1` & `CIA2`: Timer counters, latch values, ICR interrupt masks, TOD clock counters.
  - `DRIVE8`: Drive 1541 6502 CPU, VIAs, track stepper position, spindle motor state, sector buffer.
