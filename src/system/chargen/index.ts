/**
 * Commodore 64 Character Generator ROM (MOS 901225-01)
 * Address Space: $D000 - $DFFF (4096 bytes / 4 KB)
 * 
 * Contains:
 * - Upper Case / PETSCII Graphic Set (Bank 1)
 * - Lower Case / Upper Case Set (Bank 2)
 * - 8x8 Pixel Matrix Glyph Definitions
 */

import { C64_EMBEDDED_ROMS } from "../../c64/c64_roms";

export interface ChargenRomInfo {
  name: string;
  chipId: string;
  partNumber: string;
  startAddress: number;
  endAddress: number;
  sizeBytes: number;
  description: string;
  crc32: string;
}

export const CHARGEN_ROM_METADATA: ChargenRomInfo = {
  name: "Commodore 64 Character Generator",
  chipId: "MOS 2332 / 901225-01",
  partNumber: "901225-01",
  startAddress: 0xD000,
  endAddress: 0xDFFF,
  sizeBytes: 4096,
  description: "Official Commodore 64 Character Generator ROM",
  crc32: "77741d4a",
};

export function getChargenRomBytes(): Uint8Array {
  const b64 = C64_EMBEDDED_ROMS["chargen"];
  if (!b64) {
    throw new Error("CHARGEN ROM not found in embedded registry.");
  }
  const binaryStr = atob(b64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}
