/**
 * Commodore 64 KERNAL Memory Map & Hardware I/O Register Layout
 * Official MOS Technology 6569/6567 (VIC-II), 6581/8580 (SID), 6526 (CIA 1 & 2)
 */

export interface HardwareRegister {
  address: number;
  hex: string;
  symbol: string;
  description: string;
  device: "VIC-II" | "SID" | "COLOR_RAM" | "CIA1" | "CIA2" | "KERNAL_RAM";
}

export const KERNAL_HARDWARE_REGISTERS: HardwareRegister[] = [
  // VIC-II ($D000 - $D02E)
  { address: 0xD000, hex: "$D000", symbol: "SP0X", device: "VIC-II", description: "Sprite 0 X Coordinate (Low 8 bits)" },
  { address: 0xD001, hex: "$D001", symbol: "SP0Y", device: "VIC-II", description: "Sprite 0 Y Coordinate" },
  { address: 0xD010, hex: "$D010", symbol: "MSIGX", device: "VIC-II", description: "Most Significant Bits of Sprites 0-7 X Coordinates" },
  { address: 0xD011, hex: "$D011", symbol: "SCROLY", device: "VIC-II", description: "Control Register 1: Raster bit 8, Screen 24/25 rows, Blanking, BMM, ECM" },
  { address: 0xD012, hex: "$D012", symbol: "RASTER", device: "VIC-II", description: "Current Raster Line Counter (Bits 0-7)" },
  { address: 0xD015, hex: "$D015", symbol: "SPENA", device: "VIC-II", description: "Sprite Display Enable Register (Bits 0-7)" },
  { address: 0xD016, hex: "$D016", symbol: "SCROLX", device: "VIC-II", description: "Control Register 2: Screen 38/40 columns, Multi-color mode, Scroll X" },
  { address: 0xD018, hex: "$D018", symbol: "VMCSB", device: "VIC-II", description: "Memory Pointers: Screen Matrix ($0400-$07E7) & Character Base" },
  { address: 0xD019, hex: "$D019", symbol: "VICIRQ", device: "VIC-II", description: "Interrupt Flag Register (Raster IRQ, Sprite Collision, Lightpen)" },
  { address: 0xD01A, hex: "$D01A", symbol: "IRQMSK", device: "VIC-II", description: "Interrupt Mask Register (Enable Raster IRQ, Collision IRQ)" },
  { address: 0xD020, hex: "$D020", symbol: "EXTCOL", device: "VIC-II", description: "Border Color Register (Colors 0-15)" },
  { address: 0xD021, hex: "$D021", symbol: "BGCOL0", device: "VIC-II", description: "Background Color 0 Register" },

  // SID ($D400 - $D41C)
  { address: 0xD400, hex: "$D400", symbol: "FRELO1", device: "SID", description: "Voice 1 Frequency Control (Low byte)" },
  { address: 0xD401, hex: "$D401", symbol: "FREHI1", device: "SID", description: "Voice 1 Frequency Control (High byte)" },
  { address: 0xD404, hex: "$D404", symbol: "VCREG1", device: "SID", description: "Voice 1 Control: Noise, Pulse, Saw, Triangle, Test, Ring, Sync, Gate" },
  { address: 0xD405, hex: "$D405", symbol: "ATDCY1", device: "SID", description: "Voice 1 Attack (0-15) and Decay (0-15) Durations" },
  { address: 0xD406, hex: "$D406", symbol: "SUREL1", device: "SID", description: "Voice 1 Sustain Level (0-15) and Release (0-15) Rates" },
  { address: 0xD418, hex: "$D418", symbol: "SIGVOL", device: "SID", description: "Master Volume (0-15) and Filter Mode Selector (Low, Band, High)" },

  // Color RAM ($D800 - $DBE7)
  { address: 0xD800, hex: "$D800", symbol: "COLOR_RAM", device: "COLOR_RAM", description: "Static 1024x4-bit Nybble Matrix for Screen Text Colors" },

  // CIA 1 ($DC00 - $DC0F)
  { address: 0xDC00, hex: "$DC00", symbol: "CIAPRA", device: "CIA1", description: "Data Port A: Keyboard Column Matrix Scan / Joystick Port 2" },
  { address: 0xDC01, hex: "$DC01", symbol: "CIAPRB", device: "CIA1", description: "Data Port B: Keyboard Row Matrix Read / Joystick Port 1" },
  { address: 0xDC04, hex: "$DC04", symbol: "TIMALO", device: "CIA1", description: "Timer A Prescaler Counter (Low byte) - 60Hz System Jiffy Clock" },
  { address: 0xDC05, hex: "$DC05", symbol: "TIMAHI", device: "CIA1", description: "Timer A Prescaler Counter (High byte)" },
  { address: 0xDC0D, hex: "$DC0D", symbol: "CIAICR", device: "CIA1", description: "Interrupt Control & Status Register (Timer A/B, TOD, Serial, FLAG)" },

  // CIA 2 ($DD00 - $DD0F)
  { address: 0xDD00, hex: "$DD00", symbol: "CI2PRA", device: "CIA2", description: "Data Port A: VIC-II 16KB Video Bank Selector (Bits 0-1) + IEC Lines" },
  { address: 0xDD0D, hex: "$DD0D", symbol: "CI2ICR", device: "CIA2", description: "Interrupt Control Register (Connected to CPU NMI line)" },

  // KERNAL RAM Variables
  { address: 0x0090, hex: "$0090", symbol: "STATUS", device: "KERNAL_RAM", description: "I/O Operation Status Byte (Bit 6 = EOF, Bit 7 = Device Not Present)" },
  { address: 0x00A0, hex: "$00A0", symbol: "TIME", device: "KERNAL_RAM", description: "24-Hour System Software Jiffy Counter (3 bytes: $A0, $A1, $A2)" },
  { address: 0x00C5, hex: "$00C5", symbol: "LSTX", device: "KERNAL_RAM", description: "Matrix coordinate of currently pressed key ($40 = no key)" },
  { address: 0x00C6, hex: "$00C6", symbol: "NDX", device: "KERNAL_RAM", description: "Number of characters queued in keyboard buffer (0-10)" },
  { address: 0x00D0, hex: "$00D0", symbol: "PNTR", device: "KERNAL_RAM", description: "Current cursor column position (0-39)" },
  { address: 0x00D3, hex: "$00D3", symbol: "LNPRT", device: "KERNAL_RAM", description: "Current cursor row position (0-24)" },
  { address: 0x0277, hex: "$0277", symbol: "KEYD", device: "KERNAL_RAM", description: "Keyboard circular FIFO buffer (10 bytes: $0277-$0280)" },
  { address: 0x0286, hex: "$0286", symbol: "COLOR", device: "KERNAL_RAM", description: "Current active text foreground color ($00-$0F)" },
  { address: 0x0288, hex: "$0288", symbol: "HIBASE", device: "KERNAL_RAM", description: "High byte of active screen character matrix base ($04 = $0400)" },
  { address: 0x0314, hex: "$0314", symbol: "CINV", device: "KERNAL_RAM", description: "Indirect IRQ Vector pointer (Default points to $EA31)" },
  { address: 0x0316, hex: "$0316", symbol: "CBINV", device: "KERNAL_RAM", description: "Indirect BRK Instruction Vector pointer (Default $FE66)" },
  { address: 0x0318, hex: "$0318", symbol: "NMINV", device: "KERNAL_RAM", description: "Indirect NMI Vector pointer (Default $FE47)" },
];
