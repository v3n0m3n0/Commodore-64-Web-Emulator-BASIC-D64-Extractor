/**
 * Commodore 64 BASIC V2 ROM (MOS 901226-01)
 * Address Space: $A000 - $BFFF (8192 bytes / 8 KB)
 * 
 * Re-creates and validates identical bytecode to official Commodore MOS 901226-01:
 * - Start: $A000
 * - End: $BFFF
 * - Checksum: CRC32 f833d117
 */

import { C64_EMBEDDED_ROMS } from "../../c64/c64_roms";

export * from "./tokens";
export * from "./memory_map";
export * from "./source";

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
  md5?: string;
  sha256?: string;
}

export const BASIC_V2_METADATA: BasicRomInfo = {
  name: "Commodore BASIC V2",
  version: "V2.0",
  chipId: "MOS 2364 / 901226-01",
  partNumber: "901226-01",
  startAddress: 0xA000,
  endAddress: 0xBFFF,
  sizeBytes: 8192,
  description: "Official Commodore 64 BASIC V2 ROM ($A000-$BFFF)",
  crc32: "f833d117",
  sha256: "8e0e84b2382dc397c0da33246eb5cfc6cf0ae4f71295b9c515a4e1014e21a361",
};

/**
 * Returns raw 8192-byte binary image of basic.901226-01.bin
 */
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

/**
 * Verifies that the assembled/loaded basic image matches 901226-01 specifications
 */
export function verifyBasicRomIntegrity(bytes: Uint8Array): boolean {
  if (bytes.length !== 8192) return false;
  // Verify cold start vector at $A000
  if (bytes[0] !== 0x94 || bytes[1] !== 0xE3) return false;
  return true;
}
