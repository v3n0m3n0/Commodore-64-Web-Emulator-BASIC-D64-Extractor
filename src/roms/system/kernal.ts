/**
 * Authentic Commodore 64 KERNAL ROM (MOS 901227-03)
 * Address Range: $E000 - $FFFF (8192 bytes)
 * 
 * Contains:
 * - Reset and Interrupt vectors ($FFFA-$FFFF: NMI $FE43, RESET $FCE2, IRQ/BRK $FF48)
 * - Standard KERNAL jump table ($FF81-$FFF3: SCNKEY, CHROUT, CHRIN, GETIN, PLOT, LOAD, SAVE, etc.)
 * - Screen Editor, Keyboard Matrix Scanner, Tape & IEC Bus Drivers
 */

import { C64_EMBEDDED_ROMS } from "../../c64/c64_roms";

export interface SystemRomMetadata {
  name: string;
  chipId: string;
  partNumber: string;
  startAddress: number;
  endAddress: number;
  sizeBytes: number;
  description: string;
  crc32: string;
  sha256?: string;
  revision: string;
}

export const KERNAL_METADATA: SystemRomMetadata = {
  name: "Commodore 64 KERNAL ROM",
  chipId: "MOS 2364 / 901227-03",
  partNumber: "901227-03",
  startAddress: 0xE000,
  endAddress: 0xFFFF,
  sizeBytes: 8192,
  description: "Standard C64 KERNAL Operating System (Rev 3 - PAL/NTSC)",
  crc32: "2a1a0110",
  revision: "Rev 3",
};

export function getKernalRomBytes(): Uint8Array {
  const b64 = C64_EMBEDDED_ROMS["kernal"];
  if (!b64) {
    throw new Error("KERNAL ROM binary image not found in embedded registry.");
  }
  const binaryStr = atob(b64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}
