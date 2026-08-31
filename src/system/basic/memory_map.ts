/**
 * Commodore 64 BASIC V2 Zero-Page and Memory Layout Map
 * Official MOS 6510 Zero Page Addresses ($0000 - $00FF)
 */

export interface MemoryLocation {
  address: number;
  hex: string;
  symbol: string;
  size: number;
  description: string;
}

export const BASIC_ZERO_PAGE_MAP: MemoryLocation[] = [
  { address: 0x0000, hex: "$0000", symbol: "D6510", size: 1, description: "6510 On-chip I/O Data Direction Register" },
  { address: 0x0001, hex: "$0001", symbol: "R6510", size: 1, description: "6510 On-chip 8-bit I/O Port (LORAM/HIRAM/CHAREN memory banking)" },
  { address: 0x000D, hex: "$000D", symbol: "VALTYP", size: 1, description: "Data type flag: $00 = numeric, $FF = string" },
  { address: 0x000E, hex: "$000E", symbol: "INTFLG", size: 1, description: "Integer variable flag: $00 = floating point, $80 = integer" },
  { address: 0x0022, hex: "$0022", symbol: "FORPNT", size: 2, description: "Pointer to current active FOR loop variable" },
  { address: 0x002B, hex: "$002B", symbol: "TXTTAB", size: 2, description: "Pointer to Start of BASIC Program text (Default: $0801)" },
  { address: 0x002D, hex: "$002D", symbol: "VARTAB", size: 2, description: "Pointer to Start of BASIC Simple Variables" },
  { address: 0x002F, hex: "$002F", symbol: "ARYTAB", size: 2, description: "Pointer to Start of BASIC Array Variables" },
  { address: 0x0031, hex: "$0031", symbol: "STREND", size: 2, description: "Pointer to End of BASIC Array Storage (+1)" },
  { address: 0x0033, hex: "$0033", symbol: "FRETOP", size: 2, description: "Pointer to Bottom of String Storage (grows downward)" },
  { address: 0x0037, hex: "$0037", symbol: "MEMSIZ", size: 2, description: "Pointer to Top of BASIC RAM Limit (Default: $A000 = 40960)" },
  { address: 0x0039, hex: "$0039", symbol: "CURLIN", size: 2, description: "Current BASIC Line Number being executed ($FFFF if direct mode)" },
  { address: 0x003B, hex: "$003B", symbol: "OLDLIN", size: 2, description: "Previous BASIC Line Number (before STOP or BREAK)" },
  { address: 0x003D, hex: "$003D", symbol: "OLDTXT", size: 2, description: "Pointer to next BASIC statement for CONT command" },
  { address: 0x003F, hex: "$003F", symbol: "DATLIN", size: 2, description: "Line number of currently reading DATA statement" },
  { address: 0x0041, hex: "$0041", symbol: "DATPTR", size: 2, description: "Pointer to current DATA item address in memory" },
  { address: 0x0043, hex: "$0043", symbol: "INPPTR", size: 2, description: "Pointer to source text for INPUT / READ buffer" },
  { address: 0x0045, hex: "$0045", symbol: "VARNAM", size: 2, description: "Current variable name being searched or evaluated" },
  { address: 0x0047, hex: "$0047", symbol: "VARPNT", size: 2, description: "Pointer to current variable value descriptor in RAM" },
  { address: 0x0061, hex: "$0061", symbol: "FAC1", size: 6, description: "Floating Point Accumulator 1 (Exponent, Mantissa, Sign)" },
  { address: 0x0069, hex: "$0069", symbol: "FAC2", size: 6, description: "Floating Point Accumulator 2 / Math Register" },
  { address: 0x0073, hex: "$0073", symbol: "CHRGET", size: 6, description: "Subroutine in Zero Page to fetch next character of BASIC text" },
  { address: 0x0079, hex: "$0079", symbol: "CHRGOT", size: 6, description: "Subroutine in Zero Page to re-read current character of BASIC text" },
  { address: 0x007A, hex: "$007A", symbol: "TXTPTR", size: 2, description: "Pointer to current byte in BASIC program text (operand of CHRGET)" },
];
