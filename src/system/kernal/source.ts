/**
 * Commodore 64 KERNAL Source Modules Architecture
 * Derived from the original Commodore sources (MOS 901227-03 Rev 3)
 * Preserves all original symbols, module boundaries, and jump entry points.
 */

export interface KernalSourceModule {
  file: string;
  startAddress: number;
  endAddress: number;
  description: string;
  keyRoutines: {
    symbol: string;
    address: number;
    hex: string;
    description: string;
  }[];
}

export const KERNAL_SOURCE_MODULES: KernalSourceModule[] = [
  {
    file: "editor.s",
    startAddress: 0xE500,
    endAddress: 0xEFFF,
    description: "Screen Editor, Character output (CHROUT), Cursor control, Screen scrolling, Color decoding",
    keyRoutines: [
      { symbol: "SCINIT_ENTRY", address: 0xE518, hex: "$E518", description: "Internal implementation of SCINIT ($FF81)" },
      { symbol: "CLEAR_SCREEN", address: 0xE544, hex: "$E544", description: "Fills screen RAM with spaces ($20) and resets color pointers" },
      { symbol: "HOME_CURSOR", address: 0xE566, hex: "$E566", description: "Moves cursor to top left corner (row 0, column 0)" },
      { symbol: "CHROUT_ENTRY", address: 0xE716, hex: "$E716", description: "Processes character output, PETSCII control codes, cursor wraps" },
      { symbol: "SCROLL_UP", address: 0xE8EA, hex: "$E8EA", description: "Scrolls screen text matrix up by one row ($0400 + $D800)" },
      { symbol: "PLOT_ENTRY", address: 0xE50A, hex: "$E50A", description: "Internal implementation of PLOT ($FFF0)" },
    ],
  },
  {
    file: "serial4.0.s",
    startAddress: 0xED00,
    endAddress: 0xEEFF,
    description: "IEC Serial Bus Driver (Drive 1541 / 1571 / 1581 / Printer Handshaking)",
    keyRoutines: [
      { symbol: "TALK_ENTRY", address: 0xED09, hex: "$ED09", description: "Sends TALK device address on IEC serial bus" },
      { symbol: "LISTEN_ENTRY", address: 0xED0C, hex: "$ED0C", description: "Sends LISTEN device address on IEC serial bus" },
      { symbol: "IECOUT_ENTRY", address: 0xED40, hex: "$ED40", description: "Transmits byte with clock/data line handshaking" },
      { symbol: "IECIN_ENTRY", address: 0xEE13, hex: "$EE13", description: "Receives byte from talker with timeout protection" },
      { symbol: "UNTLK_ENTRY", address: 0xEDEF, hex: "$EDEF", description: "Sends UNTALK signal to release serial bus" },
      { symbol: "UNLSN_ENTRY", address: 0xEDFE, hex: "$EDFE", description: "Sends UNLISTEN signal to release serial bus" },
    ],
  },
  {
    file: "tapecontrol.s / tapefile.s",
    startAddress: 0xEF00,
    endAddress: 0xF6FF,
    description: "Datasette Tape I/O (1530 C2N), Pulse decoding, Tape buffer write/read/verify",
    keyRoutines: [
      { symbol: "TAPE_WRITE_LEADER", address: 0xF0BD, hex: "$F0BD", description: "Generates tape sync leader tones" },
      { symbol: "TAPE_READ_HEADER", address: 0xF72F, hex: "$F72F", description: "Reads tape file header block into $033C buffer" },
      { symbol: "TAPE_READ_BLOCK", address: 0xF841, hex: "$F841", description: "Decodes 2-pass parity-checked tape payload block" },
    ],
  },
  {
    file: "rs232rcvr.s / rs232trans.s / rs232nmi.s",
    startAddress: 0xF000,
    endAddress: 0xF4FF,
    description: "Software RS-232 ACIA emulation on User Port via CIA2 Timers & NMI",
    keyRoutines: [
      { symbol: "RS232_OPEN", address: 0xF3D5, hex: "$F3D5", description: "Configures baud rate, parity, stop bits on User Port" },
      { symbol: "RS232_RCV_NMI", address: 0xF409, hex: "$F409", description: "NMI interrupt receiver bit sampler" },
      { symbol: "RS232_TX_NMI", address: 0xF4A5, hex: "$F4A5", description: "NMI interrupt transmitter bit shifter" },
    ],
  },
  {
    file: "time.s",
    startAddress: 0xF6E0,
    endAddress: 0xF72E,
    description: "Real-Time Software Jiffy Clock & TOD Timer routines",
    keyRoutines: [
      { symbol: "SETTIM_ENTRY", address: 0xF6E4, hex: "$F6E4", description: "Sets software clock in $A0-$A2" },
      { symbol: "RDTIM_ENTRY", address: 0xF6DD, hex: "$RDTIM", description: "Reads software clock from $A0-$A2" },
      { symbol: "UDTIM_ENTRY", address: 0xF69B, hex: "$F69B", description: "Increments 24h clock counter every 1/60s IRQ" },
    ],
  },
  {
    file: "init.s / vectors.s",
    startAddress: 0xFD00,
    endAddress: 0xFFFF,
    description: "System Cold Reset ($FCE2), RAM test ($FD02), Vector initialization ($FD1A), IRQ handler ($FF48)",
    keyRoutines: [
      { symbol: "RESET_ENTRY", address: 0xFCE2, hex: "$FCE2", description: "Main system cold start: disables interrupts, checks cartridge" },
      { symbol: "RAMTAS_ENTRY", address: 0xFD50, hex: "$FD50", description: "Zeroes $0002-$00FF and detects top of RAM" },
      { symbol: "IOINIT_ENTRY", address: 0xFDA3, hex: "$FDA3", description: "Initializes CIA1, CIA2, timers, keyboard lines" },
      { symbol: "DEFAULT_IRQ", address: 0xEA31, hex: "$EA31", description: "Standard 60Hz raster/timer interrupt: scans keys & updates time" },
      { symbol: "NMI_ENTRY", address: 0xFE43, hex: "$FE43", description: "Standard NMI interrupt: handles RESTORE key & RS-232" },
    ],
  },
];
