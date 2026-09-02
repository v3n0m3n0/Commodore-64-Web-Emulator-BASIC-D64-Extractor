# Commodore 64 & VICE Emulator Technical Knowledge Base

This comprehensive reference library combines authoritative hardware documentation from **[mist64/c64ref](https://github.com/mist64/c64ref)** (by Michael Steil) with the complete technical specifications and architectural documentation of the **VICE Emulator** (*Versatile Commodore Emulator* — `https://vice-emu.sourceforge.io/vice_toc.html`) and the codebase architecture of the Commodore 64 Web Emulator.

> **Audyt & Weryfikacja Bazy Wiedzy:** Pełny dziennik weryfikacji ze źródłami znajduje się w **[VERIFICATION_LOG.md](VERIFICATION_LOG.md)**.

---

## 📚 Knowledge Base Index

### Part I: Core Commodore 64 Hardware Architecture
1. **[01. MOS 6510 / 6502 CPU & Opcode Architecture](01_MOS_6510_CPU_AND_OPCODES.md)**
   - Official & Undocumented Opcodes (`LAX`, `SAX`, `DCP`, `ISC`, `SLO`, `RLA`, `LAS`...).
   - Addressing modes and page-crossing cycle penalties.
   - Hardware reset and interrupt vectors (`$FFFA-$FFFF`).

2. **[02. Memory Map, Zero Page Pointers & Processor Port](02_C64_MEMORY_MAP_AND_ZERO_PAGE.md)**
   - Complete 64 KB memory layout.
   - 6510 On-Chip Port: `$0000` DDR (Data Direction Register) bit-by-bit & `$0001` PLA bank switching ($37, $36, $35, $34...).
   - Detailed Zero Page map (`$0000-$00FF`).

3. **[03. KERNAL API Jump Vectors ($FF81-$FFF3) & RAM Vectors ($0314-$0333)](03_KERNAL_API_REFERENCE.md)**
   - Complete 39 KERNAL jump routines (`CHROUT $FFD2`, `GETIN $FFE4`, `PLOT $FFF0`...).
   - 16 Indirect RAM Vectors (`$0314-$0333`: CINV, CBINV, NMINV, IOPEN...).
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
   - 8x8 Hardware Keyboard Matrix wire map and modifier decoding.

7. **[07. VIC-II Color Palette, Colorimetry & Dithering](07_VIC2_PALETTE_AND_COLOR_MODELS.md)**
   - Pepto and Colodore RGB color models and luminance tables.
   - OLD VIC-II (MOS 6569R1, 5 luma levels) vs NEW VIC-II (9 luma levels).
   - PAL Ultrasonic delay line chroma averaging & mixed colors (23c, 39c, 55c, 133c).

---

### Part II: ROM Disassembly, Debugging & Codebase Mapping
8. **[15. C64 BASIC & KERNAL ROM Disassembly & Entry Points](15_ROM_DISASSEMBLY_AND_ENTRY_POINTS.md)**
   - KERNAL ($E000-$FFFF) and BASIC ($A000-$BFFF) internal entry points.
   - Diagnostic machine code patterns (Raster IRQ hooks, NMI takeover, fastBoot stops).

9. **[16. Cross-Reference: Knowledge Base ↔ Codebase](16_CODEBASE_CROSS_REFERENCE.md)**
   - Complete hardware chip mapping to TypeScript classes (`src/c64/`).
   - Hardware register and memory address lookup table for emulator development.
   - React UI panels to `C64System` master orchestrator binding.

---

### Part III: VICE Emulator Architecture & Technical Specifications
10. **[08. VICE Emulator Architecture & Subsystem Specifications](08_VICE_EMULATOR_ARCHITECTURE_AND_SPECS.md)**
    - Event-driven cycle-exact synchronization and Alarm/Queue dispatcher (`alarm.c`).
    - Comparison of `x64` (Fast) vs `x64sc` (Cycle-Exact) CPU pipelines and bus contention (`BA` line).
    - PAL (MOS 6569, 63 cyc/line, 312 lines) vs NTSC (MOS 6567R8, 65 cyc/line, 263 lines) timing models.

11. **[09. VICE Drive Architecture & IEC Bus Emulation](09_VICE_DRIVE_AND_IEC_BUS_EMULATION.md)**
    - True Drive Emulation (TDE) vs Virtual File System (VFS / KERNAL trapping).
    - 1541 Hardware: MOS 6502 @ 1 MHz, 2x VIA 6522, Stepper motor phase timing, Half-tracks.
    - GCR (Group Coded Recording) 5-bit encoding, Sector layout, Speed zones 0-3.
    - Standalone `c1541` disk management tool commands.

12. **[10. VICE File Formats, Containers & Cartridge Specifications](10_VICE_FILE_FORMATS_AND_CONTAINERS.md)**
    - Disk formats: D64 (35/40 tracks, error bytes), G64 (raw GCR flux), D71, D81.
    - Tape formats: T64 archive vs TAP raw C2N pulse transitions (v0, v1, v2).
    - Cartridge Format (.CRT): 64-byte header, CHIP packets, and comprehensive Hardware IDs (0-60+).
    - VICE Snapshot Format (.VSF) module structure.

13. **[11. VICE SID Architecture & reSID Audio DSP Engine](11_VICE_SID_RESID_AUDIO_ENGINE.md)**
    - Sound cores: FastSID vs reSID vs reSID-fp (Floating-point physical modeling).
    - MOS 6581 (OTA non-linear curve, DC volume pop) vs MOS 8580 (Linear poly-cap, DigiFix).
    - Analog state-variable filter equations ($V_{lp}, V_{bp}, V_{hp}$), resonance, and combined waveforms.
    - Multi-SID stereo / triple-SID configurations ($D420, $D500, $DE00).

14. **[12. VICE Monitor & Remote Debugger Protocol Specification](12_VICE_MONITOR_AND_DEBUGGER_PROTOCOL.md)**
    - Built-in Monitor commands: execution control, breakpoints, watchpoints, memory/disassembly, CPU registers.
    - Binary Remote Monitor Protocol (STX `$02` frame format, little-endian header, command opcodes `$01-$DD`, asynchronous event push).

15. **[13. VICE Settings, Resources & Peripherals Reference](13_VICE_SETTINGS_RESOURCES_AND_PERIPHERALS.md)**
    - `vicerc` resource naming and configuration schema.
    - Video CRT filters, shader parameters, and `.vpl` palette files.
    - Keyboard map definitions (`.vkm`: symbolic vs positional).
    - Expansion hardware: Commodore REU (1700/1750/1764 up to 16MB), GeoRAM, SFX Sound Expander, RS232, ACIA 6551, CMD SuperCPU.

---

### Part IV: Clean-Room & Open-Source ROM Implementations
16. **[14. MEGA65 Open-ROMs Architecture & Technical Specifications](14_MEGA65_OPEN_ROMS_ARCHITECTURE_AND_SPECS.md)**
    - Clean-Room Open-Source ROM Architecture (`https://github.com/MEGA65/open-roms`) & Legal unencumberment.
    - Ophis Assembler toolchain, deterministic code reordering (`reorder.py` / address placement `xxxx.routine.s`).
    - Configuration targets: `config_c64.s`, `config_mega65.s`, `config_ultimate64.s`, `config_generic.s`, `config_testing.s`.
    - Memory Models (`MEMORY_MODEL_STANDARD`, `MEMORY_MODEL_60K`, `MEMORY_MODEL_MEGA65`).
    - KERNAL Jump Table compatibility (`$FF81-$FFF3`) & Internal KERNAL vectors (`$0314-$0333`).
    - Integrated DOS Wedge (`@`, `@$`, `/`, `%`, `↑`) & Internal Pseudo-IEC / SD Storage driver.
    - OpenBASIC V2 Subsystem: Tokenizer pipeline, 5-byte Microsoft Floating-Point Math engine (FAC1 `$61-$66`, FAC2 `$69-$6E`), dynamic string garbage collector.
    - Diagnostic utilities: Tape head alignment oscilloscope, Joyport tester, and Fast Boot mode.
