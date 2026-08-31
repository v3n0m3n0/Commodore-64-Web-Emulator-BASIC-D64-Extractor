# VICE Emulator Architecture & Technical Specifications

> **Source Reference**: Official VICE Documentation (*Versatile Commodore Emulator*) — `https://vice-emu.sourceforge.io/vice_toc.html`  
> **Target Subsystems**: `x64` (Fast C64), `x64sc` (Cycle-Exact C64), `x128`, `xvic`, `xplus4`, `xpet`, `xcbm2`, `xcbm5x0`

---

## 1. Executive Summary & Emulator Matrix

The **Versatile Commodore Emulator (VICE)** is the modular reference emulator for the entire 8-bit Commodore computer family. In the context of Commodore 64 emulation and development, VICE provides two core C64 emulation engines:

| Emulator Target | Binary Name | Timing Model | Pipeline Architecture | Contention / Bad Lines | Primary Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **C64 (Fast)** | `x64` | Line-based / Hybrid Cycle | Optimized instruction batching | Approximated DMA stealing | High-performance execution, low-end host CPU |
| **C64 (Cycle-Exact)** | `x64sc` | **100% Cycle-by-Cycle** | Fully interleaved bus pipeline | Exact `BA` line pull & 40-cycle DMA steal | Demoscene productions, raster tricks, FLI/VSP |
| **C128** | `x128` | Cycle-Exact Dual-CPU | 6502/8502 + Z80A CPU, VIC-IIe + VDC 8563 | Exact 2MHz fast-mode switching | C128 40/80 column development |
| **VIC-20** | `xvic` | Cycle-Exact | MOS 6502 + VIC-I (6560/6561) | Exact raster beam synchronization | VIC-20 software & unexpanded/expanded RAM |
| **PLUS/4** | `xplus4` | Cycle-Exact | MOS 7501/8501 + TED (7360/8360) | Single-chip video/audio/timer sync | 264-series emulation |
| **PET / CBM-II** | `xpet`, `xcbm2` | Cycle-Exact | MOS 6502/6809 + CRTC 6545 | Video retrace & PIA/VIA synchronization | Business machine emulation |

---

## 2. VICE Core System Architecture

```
                       +-----------------------------------+
                       |      VICE Main Event Loop         |
                       |  (Main Cycle Clock: clk_ticks)    |
                       +-----------------+-----------------+
                                         |
         +-------------------------------+-------------------------------+
         |                               |                               |
+--------v--------+             +--------v--------+             +--------v--------+
|  MOS 6510 CPU   |             |  VIC-II Engine  |             |  Alarm Context  |
|  Cycle Exec     |             |  Raster/DMA     |             |  Event Dispatch |
|  RDY / IRQ / NMI|             |  Bad Lines / BA |             |  CIA/VIA Timers |
+--------+--------+             +--------+--------+             +--------+--------+
         |                               |                               |
         +---------------+---------------+-------------------------------+
                         |
        +----------------v----------------+
        |     Interleaved Memory Bus      |
        |   (PLA Configuration $0001)     |
        +----------------+----------------+
                         |
         +---------------+---------------+
         |               |               |
+--------v-------+ +-----v--------+ +----v-----------+
| MOS 6581/8580  | | CIA 1 ($DC00)| | True Drive Emul|
| reSID DSP Core | | CIA 2 ($DD00)| | 1541 6502+VIAs |
+----------------+ +--------------+ +----------------+
```

### 2.1. The Alarm & Event Dispatcher (`alarm.h`, `alarm.c`)
VICE synchronizes all asynchronous hardware chips through an **Alarm Context** subsystem.
- **Cycle Counter (`clk_ticks`)**: Global 64-bit integer tracking the exact number of phi-2 clock cycles elapsed since system boot.
- **Alarm Registration**: Components (VIC-II raster lines, CIA timer underflows, Drive IEC bus state transitions) register future trigger cycles.
- **Dispatch Loop**: The CPU executes cycle-by-cycle. When `clk_ticks >= alarm->trigger_tick`, the registered callback fires with zero latency.

### 2.2. CPU Pipeline & Bus Contention Model (`x64sc`)
Unlike basic emulators that execute an entire instruction at once:
1. **Micro-Cycle Stepping**: Each opcode is split into sub-cycles (T1, T2, T3... T7).
2. **Memory Contention (`BA` Signal)**:
   - When VIC-II asserts `BA` (Bus Available low) during Bad Lines or Sprite DMA, the 6510 CPU RDY pin is pulled low.
   - If the CPU is performing a Write cycle, the write completes immediately.
   - If the CPU performs a Read cycle on a halted bus, CPU execution stalls until `BA` is released high.
3. **Cycle-Accurate Instruction Timing**: Includes all page-crossing write penalties, branch taken/not taken delays, and interrupt hijacking behaviors.

---

## 3. Comparison of `x64` vs `x64sc` Core Subsystems

```
+------------------------+--------------------------+--------------------------+
| Subsystem              | x64 (Fast Engine)        | x64sc (Cycle-Exact)      |
+------------------------+--------------------------+--------------------------+
| CPU Fetch              | Opcode-at-a-time         | Cycle-by-cycle with RDY  |
| VIC-II Processing      | Scanline raster caching  | Pixel-by-pixel rendering |
| Sprite Crunching       | Approximated             | Cycle-exact (b0-b7 DMA)  |
| VSP (Variable Scroll)  | Unstable                 | 100% Accurate (Hardware) |
| Side-Border Opening    | Line-level trigger       | Exact cycle $D016 mod    |
| CIA Timer Sync         | Event delta check        | Phi-2 phase clocking     |
| Host CPU Overhead      | ~15-25% host core        | ~40-60% host core        |
+------------------------+--------------------------+--------------------------+
```

---

## 4. PAL vs NTSC Timing Standards in VICE

VICE maintains dedicated timing tables for the different regional hardware revisions:

```
+------------------------------------+--------------------+--------------------+
| Timing Parameter                   | PAL (MOS 6569/8565)| NTSC (MOS 6567R8)  |
+------------------------------------+--------------------+--------------------+
| Master Crystal Oscillator          | 17.734475 MHz      | 14.31818 MHz       |
| System Clock (Phi-2)               | 0.985248 MHz       | 1.022727 MHz       |
| Total Raster Lines per Frame       | 312 lines          | 263 lines          |
| Clock Cycles per Raster Line       | 63 cycles          | 65 cycles          |
| Total Cycles per Frame             | 19,656 cycles      | 17,095 cycles      |
| Frame Refresh Rate                 | 50.125 Hz          | 59.826 Hz          |
| Visible Display Lines              | Lines 16 - 288     | Lines 12 - 250     |
| Bad Line Range (DEN=1, $D011)      | Lines $30 - $F7    | Lines $30 - $F7    |
| First Bad Line Condition           | Line $30 (48)      | Line $30 (48)      |
+------------------------------------+--------------------+--------------------+
```

---

## 5. Emulated Expansion Hardware & Peripherals

VICE includes integrated hardware modules for standard Commodore expansions:

1. **Memory Expansions (REU & GeoRAM)**:
   - **Commodore REU (1700 / 1750 / 1764 / 1750XL)**: Custom MOS 8726 DMA Controller supporting high-speed burst transfers up to 1 MB/cycle, with programmable base address, length, and auto-increment.
   - **GeoRAM / BBGRAM**: Bank-switched RAM expansion used by GEOS (up to 4MB).
   - **RamCart**: 64KB - 128KB battery-backed static RAM expansion.

2. **Sound Hardware Add-ons**:
   - **Dual / Triple SID (Stereo SID)**: Secondary SIDs mapped at `$D420`, `$D500`, or `$DE00`.
   - **SFX Sound Expander**: Yamaha YM3526 (OPL) FM synthesizer card.
   - **SFX Sound Sampler**: 8-bit DAC/ADC digitizer module.

3. **Communication & Network**:
   - **User Port RS232**: Real-time UART bridge (1200 - 9600 baud) connecting to host TCP sockets.
   - **ACIA 6551**: Cartridge-based high-speed serial communications (SwiftLink / Turbo232 up to 230,400 baud).
   - **Ethernet (CS8900A / RR-Net)**: 10 Mbps Ethernet controller emulation for native TCP/IP (Contiki OS).

4. **Accelerators**:
   - **CMD SuperCPU 65816**: 20 MHz 16-bit processor card with up to 16MB linear memory mapping and SIMM RAM.
