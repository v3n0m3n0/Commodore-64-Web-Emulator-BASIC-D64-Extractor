# VICE Drive Architecture & IEC Bus Emulation

> **Source Reference**: Official VICE Documentation (*Versatile Commodore Emulator*) — `https://vice-emu.sourceforge.io/vice_toc.html`  
> **Hardware Modules**: Commodore 1541, 1541-II, 1570, 1571, 1581, 2040, 4040, 8050, 8250, CMD FD-2000, CMD HD

---

## 1. True Drive Emulation (TDE) vs Virtual File System

VICE supports two distinct disk emulation methodologies:

```
+----------------------------------------------------------------------------------------------------+
| 1. True Drive Emulation (TDE) - 100% Hardware Emulation                                            |
|                                                                                                    |
|  [ Commodore 64 ]                                             [ Commodore 1541 Drive ]             |
|   - 6510 CPU                                                   - MOS 6502 CPU @ 1.000 MHz           |
|   - CIA 2 ($DD00) <==== IEC Bus (ATN, CLK, DATA Lines) ======> - 2x MOS 6522 VIA (VIA1 & VIA2)     |
|   - Custom Fastloader                                          - 2 KB Drive RAM ($0000-$07FF)      |
|   - GCR Stream / Bit Timing                                    - 16 KB Drive DOS ROM ($C000-$FFFF) |
|                                                                - Track Stepper Motor & Head R/W   |
+----------------------------------------------------------------------------------------------------+
| 2. Virtual File System / Trapped KERNAL Calls (VFS Fastloader)                                     |
|                                                                                                    |
|  [ Commodore 64 ]                                                                                  |
|   - KERNAL LOAD ($FFD5) ===> Traced & Intercepted by VICE ===> Host OS reads D64/PRG directly      |
|   - Instantaneous transfers (0.01 sec), but breaks custom fastloaders and custom DOS code.         |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Hardware Architecture of the 1541 Drive

The 1541 disk drive is a standalone autonomous computer running concurrently alongside the C64.

### 2.1. Internal Memory Map (1541)
- `$0000 - $07FF`: 2048 bytes (2 KB) Static RAM.
  - `$0000 - $00FF`: Zero Page variables (head position, buffer pointers, error codes).
  - `$0100 - $01FF`: 6502 CPU Stack.
  - `$0300 - $07FF`: 4x 256-byte disk sector data buffers (Buffer 0 to Buffer 3).
- `$1800 - $180F`: **MOS 6522 VIA 1** (IEC Bus Interface).
- `$1C00 - $1C0F`: **MOS 6522 VIA 2** (Drive Mechanism, Stepper Motor, GCR Read/Write Shift Register).
- `$C000 - $FFFF`: 16 KB Commodore DOS 2.6 ROM.
  - `$FFFC - $FFFD`: 6502 Reset Vector (points to DOS startup routine `$EAA0`).

### 2.2. VIA 1 (`$1800`): Serial IEC Bus Interface
- **Port A (`$1801`)**: IEC lines data buffer.
- **Port B (`$1800`)**:
  - `Bit 0`: Serial Data In (`DATA IN`)
  - `Bit 1`: Serial Data Out (`DATA OUT`)
  - `Bit 2`: Serial Clock In (`CLK IN`)
  - `Bit 3`: Serial Clock Out (`CLK OUT`)
  - `Bit 4`: Serial ATN In (`ATN IN`)
  - `Bit 5-6`: Drive device number jumpers (Device 8, 9, 10, or 11).
  - `Bit 7`: ATN Acknowledge.

### 2.3. VIA 2 (`$1C00`): Head Stepper & GCR Bitstream
- **Port B (`$1C00`)**:
  - `Bits 0-1`: Stepper motor phase coil activation (`00 -> 01 -> 10 -> 11`). 2 phase steps = 1 physical track (supports half-tracks 1.0, 1.5, 2.0... 35.0, up to 42.0).
  - `Bit 2`: Spindle Motor Control (`1 = ON`, `0 = OFF`).
  - `Bit 3`: Activity LED (`1 = ON`, `0 = OFF`).
  - `Bits 5-6`: Bit Density / Speed Zone selection (Tracks 1-17, 18-24, 25-30, 31-35).
  - `Bit 7`: Write Protect Sensor (`0 = Write Protected`).
- **Port A (`$1C01`)**: Parallel 8-bit GCR byte data register from disk read amplifier.

---

## 3. GCR (Group Coded Recording) Encoding Specification

Commodore 1541 disks store data using 5-bit GCR symbols representing 4-bit nibbles (ensuring no more than two consecutive `0` bits appear on the magnetic track):

```
+------------+--------------------+------------+--------------------+
| 4-Bit Data | 5-Bit GCR Pattern  | 4-Bit Data | 5-Bit GCR Pattern  |
+------------+--------------------+------------+--------------------+
| $0 (0000)  | 01010 ($0A)        | $8 (1000)  | 01001 ($09)        |
| $1 (0001)  | 01011 ($0B)        | $9 (1001)  | 11001 ($19)        |
| $2 (0010)  | 01001 ($09) [corr] | $A (1010)  | 01101 ($0D)        |
| $3 (0011)  | 01111 ($0F)        | $B (1011)  | 01110 ($0E)        |
| $4 (0100)  | 01010 ($0A) [corr] | $C (1100)  | 10101 ($15)        |
| $5 (0101)  | 10110 ($16)        | $D (1101)  | 10111 ($17)        |
| $6 (0110)  | 10111 ($17) [corr] | $E (1110)  | 10110 ($16) [corr] |
| $7 (0111)  | 10010 ($12)        | $F (1111)  | 10100 ($14)        |
+------------+--------------------+------------+--------------------+
```

### 3.1. Standard GCR Sector Layout
Each physical sector on a 1541 disk contains:
1. **Sync Mark**: At least 10 consecutive `1` bits (typically 5 bytes of `$FF`).
2. **Header Block (`$08`)**:
   - Header Identifier (`$52` in GCR / `$08` decoded).
   - Checksum byte.
   - Sector number (0-20).
   - Track number (1-35/40).
   - Disk ID bytes (2 characters from format command).
   - Off-bytes (`$0F $0F`).
3. **Data Block (`$07`)**:
   - Sync Mark (`$FF` sync).
   - Data Identifier (`$55` in GCR / `$07` decoded).
   - 256 bytes of payload data (encoded as 320 GCR bytes).
   - Data checksum byte.
   - Tail padding (`$00 $00`).

---

## 4. Track Density Zones & Capacity

```
+-------+----------------+----------------+----------------+--------------------+
| Zone  | Track Range    | Sectors/Track  | Raw Bytes/Trk  | Bit Clock Frequency|
+-------+----------------+----------------+----------------+--------------------+
|   3   | Tracks 1 - 17  | 21 sectors     | 7,692 bytes    | 16.000 MHz / 13    |
|   2   | Tracks 18 - 24 | 19 sectors     | 7,142 bytes    | 16.000 MHz / 14    |
|   1   | Tracks 25 - 30 | 18 sectors     | 6,666 bytes    | 16.000 MHz / 15    |
|   0   | Tracks 31 - 35 | 17 sectors     | 6,250 bytes    | 16.000 MHz / 16    |
+-------+----------------+----------------+----------------+--------------------+
| Total Capacity (35 Trk)| 683 sectors    | 174,848 bytes  | ~170.75 KB User RAM|
| Extended (40 Tracks)   | 768 sectors    | 196,608 bytes  | ~192.00 KB User RAM|
+-------+----------------+----------------+----------------+--------------------+
```

---

## 5. Standalone `c1541` Tool Commands Reference

VICE includes the `c1541` command-line utility for manipulating disk images without launching the GUI:

```bash
# Create a new blank 35-track D64 disk image
c1541 -format "my_game,01" d64 disk.d64

# Write a PRG file onto a D64 disk image
c1541 -attach disk.d64 -write program.prg "game"

# Extract a file from a D64 disk image
c1541 -attach disk.d64 -read "game" game_extracted.prg

# List directory of a D64 disk image
c1541 -attach disk.d64 -list

# Validate and repair BAM allocations
c1541 -attach disk.d64 -validate

# Convert D64 to raw GCR flux format (G64)
c1541 -attach disk.d64 -copy disk.g64
```
