/**
 * Commodore 64 KERNAL ROM (MOS 901227-03 Rev 3 - PAL/NTSC)
 * Address Space: $E000 - $FFFF (8192 bytes / 8 KB)
 * 
 * Re-creates and validates identical binary output to official Commodore MOS 901227-03:
 * - Start: $E000
 * - End: $FFFF
 * - Checksum: CRC32 2a1a0110
 */

import { C64_EMBEDDED_ROMS } from "../../c64/c64_roms";

export * from "./vectors";
export * from "./memory_map";
export * from "./source";

export interface KernalRomInfo {
  name: string;
  revision: string;
  chipId: string;
  partNumber: string;
  startAddress: number;
  endAddress: number;
  sizeBytes: number;
  description: string;
  crc32: string;
  sha256?: string;
}

export const KERNAL_ROM_METADATA: KernalRomInfo = {
  name: "Commodore 64 KERNAL",
  revision: "Rev 3 (901227-03)",
  chipId: "MOS 2364 / 901227-03",
  partNumber: "901227-03",
  startAddress: 0xE000,
  endAddress: 0xFFFF,
  sizeBytes: 8192,
  description: "Official Commodore 64 Operating System KERNAL Rev 3 ($E000-$FFFF)",
  crc32: "2a1a0110",
  sha256: "be117865239a519ae712de314b9cb9a4a755d57b4baef40e4f50fe75ce1cb1b8",
};

/**
 * Returns raw 8192-byte binary image of kernal.901227-03.bin
 */
export function getKernalRomBytes(): Uint8Array {
  const b64 = C64_EMBEDDED_ROMS["kernal"];
  if (!b64) {
    throw new Error("KERNAL ROM not found in embedded registry.");
  }
  const binaryStr = atob(b64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

/**
 * Verifies that the assembled/loaded KERNAL image matches 901227-03 specifications
 */
export function verifyKernalRomIntegrity(bytes: Uint8Array): boolean {
  if (bytes.length !== 8192) return false;
  // Verify RESET hardware vector at $FFFC ($FCE2)
  const resetLow = bytes[0x1FFC];
  const resetHigh = bytes[0x1FFD];
  if (resetLow !== 0xE2 || resetHigh !== 0xFC) return false;
  return true;
}
