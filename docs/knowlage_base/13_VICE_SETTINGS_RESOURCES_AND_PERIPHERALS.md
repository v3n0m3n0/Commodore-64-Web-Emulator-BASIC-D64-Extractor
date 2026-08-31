# VICE Settings, Resources & Peripherals Reference

> **Source Reference**: Official VICE Documentation (*Versatile Commodore Emulator*) — `https://vice-emu.sourceforge.io/vice_toc.html`  
> **Configuration**: `vicerc` Resource File, Command-Line Options, Video / CRT Filters, Expansion Modules

---

## 1. The VICE Resource System (`vicerc`)

VICE stores all configuration settings as named **Resources**. These can be modified via:
1. The **`vicerc`** plain text configuration file (located in `~/.config/vice/vicerc` on POSIX or `vicerc` in the application directory on Windows).
2. Command-line arguments at startup (e.g. `-pal`, `-model c64c`, `-truedrive`).
3. The Binary Remote Monitor (`MON_CMD_RESOURCE_SET`).

### Common Core Resources Table
```ini
# --- Machine Model & Video Standard ---
[C64SC]
MachineVideoStandard=1          # 0 = NTSC, 1 = PAL, 2 = NTSC-Old, 3 = PAL-N
ModelType=1                     # 0 = C64 (Old Breadbin), 1 = C64C, 2 = C64GS, 3 = SX-64
VICIIModel=0                    # 0 = 6569 (PAL), 1 = 8565 (PAL), 2 = 6567R8 (NTSC)

# --- Video Rendering & CRT Filter ---
VICIIFilter=1                   # 0 = None, 1 = CRT Emulation Enabled
VICIIPaletteFile="pepto-pal.vpl"# Color palette file (pepto, colodore, vice)
VICIIScanlineShade=400          # Scanline darkness intensity (0-1000)
VICIIColorSaturation=1200       # Color saturation scaling
VICIIColorContrast=1000         # Contrast scaling
VICIIBlur=250                   # Horizontal phosphor blur

# --- Audio Subsystem & SID ---
Sound=1                         # 1 = Sound Enabled
SoundSampleRate=48000           # Output DAC sample rate (44100, 48000, 96000)
SIDEngine=1                     # 0 = FastSID, 1 = reSID, 2 = reSID-fp
SIDModel=0                      # 0 = 6581 (Old), 1 = 8580 (New), 2 = 8580 + DigiFix
SIDResidSampling=0              # 0 = Fast (Downsampling), 1 = Interpolating, 2 = Resampling

# --- Drive & Peripheral Emulation ---
Drive8TrueEmulation=1           # 1 = True Drive Emulation (100% 6502+VIA), 0 = Virtual FS
Drive8Type=1541                 # 1541, 1541II, 1571, 1581, 2040, 4040, 8050
Drive8ExtendImagePolicy=0       # 0 = Never extend, 1 = Ask, 2 = Auto-extend to 40 tracks
IECReset=1                      # Reset IEC drive on computer reset

# --- Expansion RAM & Hardware ---
REU=1                           # 1 = Commodore REU Enabled
REUsize=512                     # REU size in KB (128, 256, 512, 1024, 2048, 16384)
GeoRAM=0                        # 1 = GeoRAM Enabled (up to 4096 KB)
```

---

## 2. Video Rendering & Palette Files (`.vpl`)

VICE uses custom **`.vpl` (VICE Palette)** files to define exact RGB triplets for the 16 VIC-II colors:
- Format: Plain text file with 16 lines formatted as `R G B` (hex or decimal) or `#RRGGBB`.
- Supported Standards:
  - **Pepto Palette (`pepto-pal.vpl`)**: Philip "Pepto" Bergman's standard calculated based on S-Video colorimetry and luminance.
  - **Colodore Palette (`colodore.vpl`)**: Modern mathematically modeled CRT phosphor spectrum.
  - **VICE Default (`default.vpl`)**: Classic legacy emulator palette.

---

## 3. Keyboard Mapping Files (`.vkm`)

VICE translates modern PC keystrokes to the C64 8x8 CIA matrix using `.vkm` (VICE Keyboard Map) files:
- **Symbolic Mappings (`gtk3_sym.vkm`)**: Maps characters by their semantic ASCII/Unicode value (e.g. typing `"` on PC generates `SHIFT + 2` on C64).
- **Positional Mappings (`gtk3_pos.vkm`)**: Maps physical key locations 1:1 regardless of the host OS keyboard layout (ideal for retro typing accuracy).

---

## 4. Expansion Hardware Matrix

```
+--------------------------+--------------------+------------------------------------------+
| Expansion Device         | Connection Port    | Emulated Hardware & Chipsets             |
+--------------------------+--------------------+------------------------------------------+
| Commodore REU (1700-1764)| Expansion Port     | MOS 8726 REC (DMA Controller), 128KB-16MB|
| GeoRAM / BBGRAM          | Expansion Port     | Bank-switched RAM array (up to 4MB)      |
| SFX Sound Expander       | Expansion Port     | Yamaha YM3526 (OPL FM Synthesizer)       |
| User Port RS232          | User Port (PB0-PB7)| Bit-banged / CIA timer UART up to 9600 Bd|
| SwiftLink / Turbo232     | Expansion Port     | MOS 6551 ACIA, High-speed UART 230.4 kBaud|
| RR-Net / ETH64           | Expansion Port     | Crystal CS8900A 10BASE-T Ethernet chip   |
| CMD SuperCPU 65816       | Expansion Port/CPU | WDC 65C816 16-bit CPU @ 20 MHz, 16MB RAM |
| CPM Cartridge            | Expansion Port     | Zilog Z80A CPU @ 3.5 MHz for CP/M 2.2 OS |
+--------------------------+--------------------+------------------------------------------+
```
