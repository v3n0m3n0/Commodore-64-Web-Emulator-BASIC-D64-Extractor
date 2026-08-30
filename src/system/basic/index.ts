/**
 * Commodore 64 BASIC V2 ROM (MOS 901226-01)
 * Address Space: $A000 - $BFFF (8192 bytes / 8 KB)
 * 
 * Functions:
 * - BASIC V2 Interpreter (Token Parser, Math routines, Float library)
 * - Memory pointers initialization ($002B-$0038: TXTTAB, VARTAB, ARYTAB, STREND, FRETOP, MEMSIZ)
 * - Standard BASIC tokens (PRINT, POKE, PEEK, GOTO, GOSUB, SYS, etc.)
 */

import { C64_EMBEDDED_ROMS } from "../../c64/c64_roms";

export interface BasicRomInfo {
  name: string;
  version: string;
  chipId: string;
  partNumber: string;
  startAddress: number;
  endAddress: number;
  sizeBytes: number;
  description: string;
  crc32: string;
}

export const BASIC_V2_METADATA: BasicRomInfo = {
  name: "Commodore BASIC V2",
  version: "V2.0",
  chipId: "MOS 2364 / 901226-01",
  partNumber: "901226-01",
  startAddress: 0xA000,
  endAddress: 0xBFFF,
  sizeBytes: 8192,
  description: "Official Commodore 64 BASIC V2 ROM",
  crc32: "f833d117",
};

export function getBasicRomBytes(): Uint8Array {
  const b64 = C64_EMBEDDED_ROMS["basic"];
  if (!b64) {
    throw new Error("BASIC ROM not found in embedded registry.");
  }
  const binaryStr = atob(b64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}
