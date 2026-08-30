/**
 * Commodore 64 KERNAL ROM (MOS 901227-03 Rev 3 - PAL/NTSC)
 * Address Space: $E000 - $FFFF (8192 bytes / 8 KB)
 * 
 * Functions:
 * - Operating System Kernel & Hardware Abstraction Layer
 * - Reset and Interrupt Handlers ($FFFA: NMI $FE43, $FFFC: RESET $FCE2, $FFFE: IRQ/BRK $FF48)
 * - Standard KERNAL Jump Vectors ($FF81 - $FFF3):
 *   $FF81 SCINIT, $FF84 IOINIT, $FF87 RAMTAS, $FF90 SETMSG, $FF9F SCNKEY,
 *   $FFBA SETLFS, $FFBD SETNAM, $FFD2 CHROUT/BSOUT, $FFCF CHRIN/BASIN,
 *   $FFE4 GETIN, $FFF0 PLOT, $FFE1 STOP, $FFD5 LOAD, $FFD8 SAVE
 * - VIC-II Screen Editor, Keyboard Matrix Scan, RS-232, Tape & IEC Serial Bus
 */

import { C64_EMBEDDED_ROMS } from "../../c64/c64_roms";

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
}

export const KERNAL_ROM_METADATA: KernalRomInfo = {
  name: "Commodore 64 KERNAL",
  revision: "Rev 3 (901227-03)",
  chipId: "MOS 2364 / 901227-03",
  partNumber: "901227-03",
  startAddress: 0xE000,
  endAddress: 0xFFFF,
  sizeBytes: 8192,
  description: "Official Commodore 64 Operating System KERNAL Rev 3",
  crc32: "2a1a0110",
};

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
