# 04. Commodore 64 Hardware I/O Register Map (VIC-II, SID, CIA 1, CIA 2)

> **Source:** [mist64/c64ref](https://github.com/mist64/c64ref) (Commodore-64-intern, Mapping the C64)

## 1. VIC-II Video Controller ($D000 - $D02E)

| Address | Hex Register | Bit Definitions / Description |
|---|---|---|
| `$D000-$D00F` | `SP0X - SP7Y` | Sprite 0 to 7 X and Y coordinates (9th bit of X in `$D010`) |
| `$D010` | `MSIGX` | Most Significant Bits of Sprite 0-7 X-Coordinates (Bit 0 = Sprite 0... Bit 7 = Sprite 7) |
| `$D011` | `SCROLY / VICCR1` | Control Register 1:<br>• Bit 7: 8th bit of Raster Line ($D012)<br>• Bit 6: Extended Color Text Mode (ECM)<br>• Bit 5: Bitmap Mode (BMM: 0=Text, 1=Bitmap)<br>• Bit 4: Screen Display Enable (DEN: 1=Visible, 0=Blanked / Borders only)<br>• Bit 3: Row Select (RSEL: 1=25 rows, 0=24 rows)<br>• Bits 2-0: Smooth Y-Scroll (0-7 pixels) |
| `$D012` | `RASTER` | Current Raster Line Counter (Bits 0-7, 8th bit in `$D011` bit 7) |
| `$D015` | `SPENA` | Sprite Enable Register (1 = Sprite active, 0 = Hidden) |
| `$D016` | `SCROLX / VICCR2` | Control Register 2:<br>• Bit 4: Multicolor Mode Enable (MCM)<br>• Bit 3: Column Select (CSEL: 1=40 columns, 0=38 columns)<br>• Bits 2-0: Smooth X-Scroll (0-7 pixels) |
| `$D018` | `VMCSB` | VIC-II Memory Pointers:<br>• Bits 7-4: Screen Memory Pointer (Offset from VIC Base: $0000-$3C00 in 1KB steps)<br>• Bits 3-1: Character ROM / Bitmap Pointer ($0000-$3800 in 2KB steps) |
| `$D019` | `VICIRQ` | VIC-II Interrupt Request Flag Register (Bit 7: Any IRQ, Bit 0: Raster IRQ) |
| `$D01A` | `IRQMASK` | VIC-II Interrupt Mask Register (Bit 0: Enable Raster IRQ, Bit 1: Sprite-Background collision) |
| `$D020` | `EXTCOL` | Border Color Register (Bits 0-3: Colors 0-15) |
| `$D021` | `BGCOL0` | Background Color 0 (Default Screen Background) |
| `$D022-$D024` | `BGCOL1 - BGCOL3`| Background Colors 1-3 for Multicolor and Extended Color modes |

---

## 2. SID Sound Synthesizer ($D400 - $D41C)

| Address | Description |
|---|---|
| `$D400-$D401` | Voice 1 Frequency Low / High (`Freq = (Hz * 16.777) / Clock_MHz`) |
| `$D402-$D403` | Voice 1 Pulse Width Low / High (12-bit PWM duty cycle) |
| `$D404` | Voice 1 Control: Bit 7=Noise, 6=Pulse, 5=Sawtooth, 4=Triangle, 3=Test, 2=Ring Mod, 1=Sync, 0=Gate |
| `$D405` | Voice 1 Attack / Decay Duration (Bits 7-4: Attack 2ms-8s, Bits 3-0: Decay 6ms-24s) |
| `$D406` | Voice 1 Sustain Level / Release Rate (Bits 7-4: Sustain Level 0-15, Bits 3-0: Release 6ms-24s) |
| `$D407-$D40D` | Voice 2 Registers (Structure identical to Voice 1) |
| `$D40E-$D414` | Voice 3 Registers (Structure identical to Voice 1) |
| `$D415-$D416` | Filter Cutoff Frequency (11-bit: `$D415` bits 0-2, `$D416` bits 0-7) |
| `$D417` | Filter Resonance & Voice Routing (Bits 7-4: Resonance 0-15; Bits 3-0: Filter Voice 3, 2, 1, External) |
| `$D418` | Mode / Volume: Bit 7=Voice 3 Mute, Bit 6=High-Pass, Bit 5=Band-Pass, Bit 4=Low-Pass, Bits 3-0: Volume (0-15) |

---

## 3. CIA 1 ($DC00 - $DC0F) & CIA 2 ($DD00 - $DD0F)

| Address | Chip | Register | Purpose |
|---|---|---|---|
| `$DC00` | CIA1 | `CIAPRA / Port A` | Keyboard Column Strobe / Joystick Port 2 Inputs (Active-Low: Bit 0=Up, 1=Down, 2=Left, 3=Right, 4=Fire) |
| `$DC01` | CIA1 | `CIAPRB / Port B` | Keyboard Row Sense / Joystick Port 1 Inputs (Active-Low: Bit 0=Up, 1=Down, 2=Left, 3=Right, 4=Fire) |
| `$DC02-$DC03`| CIA1 | `CIDDRA / CIDDRB` | Data Direction Registers A & B (1 = Output, 0 = Input) |
| `$DC04-$DC05`| CIA1 | `TIMALO / TIMAHI` | Timer A Latch & Counter (Default 60Hz system tick) |
| `$DC06-$DC07`| CIA1 | `TIMBLO / TIMBHI` | Timer B Latch & Counter |
| `$DC08-$DC0B`| CIA1 | `TOD...` | Time-Of-Day 50Hz/60Hz Clock (Tenths, Seconds, Minutes, Hours AM/PM) |
| `$DC0D` | CIA1 | `CIAICR` | Interrupt Control Register (Read=Flags, Write=Mask) |
| `$DD00` | CIA2 | `CIAPRA / Port A` | VIC-II 16 KB Bank Select:<br>• `%11` (3) = Bank 0: `$0000-$3FFF` (Default)<br>• `%10` (2) = Bank 1: `$4000-$7FFF`<br>• `%01` (1) = Bank 2: `$8000-$BFFF`<br>• `%00` (0) = Bank 3: `$C000-$FFFF`<br>• Serial IEC Bus Out (Clock, Data, ATN) |
| `$DD0D` | CIA2 | `CIAICR` | CIA2 Interrupt Control Register (Generates CPU **NMI** interrupts) |
