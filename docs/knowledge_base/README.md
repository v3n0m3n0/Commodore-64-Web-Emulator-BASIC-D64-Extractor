# Commodore 64 Technical Reference & Knowledge Base

This knowledge base is curated from the authoritative **[mist64/c64ref](https://github.com/mist64/c64ref)** repository by **Michael Steil** (pagetable.com), enriched with reference data from **cbmsrc**, **kernalemu**, and classic literature (*Mapping the Commodore 64*, *Compute!*, *Commodore 64 Intern*).

---

## 📚 Knowledge Base Documents Index

1. **[01. MOS 6510 / 6502 CPU & Opcode Architecture](01_MOS_6510_CPU_AND_OPCODES.md)**
   - Official & Undocumented Opcodes (`LAX`, `SAX`, `DCP`, `ISC`, `SLO`, `RLA`, `LAS`...).
   - Addressing modes and page-crossing cycle penalties.
   - Hardware reset and interrupt vectors (`$FFFA-$FFFF`).

2. **[02. Memory Map & Zero Page Pointers](02_C64_MEMORY_MAP_AND_ZERO_PAGE.md)**
   - Complete 64 KB memory layout.
   - Processor Port `$0001` PLA bank switching ($37, $36, $35, $34...).
   - Detailed Zero Page map (`$0000-$00FF`).

3. **[03. KERNAL API Jump Vectors ($FF81-$FFF3)](03_KERNAL_API_REFERENCE.md)**
   - Complete 39 KERNAL jump routines (`CHROUT $FFD2`, `GETIN $FFE4`, `PLOT $FFF0`...).
   - Registers in, out, error codes, and assembly examples.

4. **[04. Hardware I/O Registers (VIC-II, SID, CIA 1/2)](04_HARDWARE_IO_MAP_VIC_SID_CIA.md)**
   - VIC-II (`$D000-$D02E`): Bad Lines, Raster, Sprites, Scrolling.
   - SID (`$D400-$D41C`): 3 Voices, ADSR, Waveforms, Filter.
   - CIA 1 (`$DC00`) & CIA 2 (`$DD00`): Keyboard, Joystick, Timers, VIC Banks.

5. **[05. Commodore BASIC V2 Internals & Token Mapping](05_BASIC_V2_INTERNALS_AND_TOKENS.md)**
   - Line binary header format.
   - All 75+ BASIC tokens (`$80-$FF`).
   - Detokenizer algorithms.

6. **[06. PETSCII Character Sets & Keyboard Matrix](06_PETSCII_CHARSET_AND_KEYBOARD_MATRIX.md)**
   - Uppercase/Graphics and Lowercase/Uppercase ROM character sets.
   - 8x8 Hardware Keyboard Matrix wire map.

7. **[07. VIC-II Color Palette & Colorimetry Models](07_VIC2_PALETTE_AND_COLOR_MODELS.md)**
   - Pepto and Colodore RGB color models and luminance tables.
