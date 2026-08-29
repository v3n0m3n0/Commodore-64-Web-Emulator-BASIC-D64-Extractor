/**
 * Standalone Commodore PRG / P00 Binary Loader
 * Reads 2-byte Little-Endian load address header ($0801 for BASIC, $C000 for ML, $0400 for Screen),
 * injects into C64 RAM, and updates Zero Page memory pointers ($2B-$32) for instant execution.
 */

import { C64Memory } from "./c64_memory";

export interface PRGInfo {
  fileName: string;
  loadAddress: number;
  data: Uint8Array;
  isBasic: boolean;
}

export class C64PRG {
  public static parse(data: Uint8Array, fileName = "PROGRAM.PRG"): PRGInfo | null {
    if (data.length < 2) return null;

    // Check for P00 format header ("C64File\0")
    let startOffset = 0;
    if (data.length >= 26 && String.fromCharCode(...data.subarray(0, 7)) === "C64File") {
      startOffset = 26; // Skip 26-byte P00 header
    }

    const loadAddress = data[startOffset] | (data[startOffset + 1] << 8);
    const payload = data.subarray(startOffset + 2);

    return {
      fileName,
      loadAddress,
      data: payload,
      isBasic: loadAddress === 0x0801,
    };
  }

  // Detect execution entry point address (from BASIC SYS launcher or machine code load address)
  public static detectEntryPoint(prg: PRGInfo): { address: number; isSys: boolean } {
    if (prg.loadAddress !== 0x0801) {
      return { address: prg.loadAddress, isSys: false };
    }

    // Scan first 40 bytes of payload for token 0x9E (SYS)
    const payload = prg.data;
    for (let i = 0; i < Math.min(payload.length, 40); i++) {
      if (payload[i] === 0x9e) { // SYS token ($9E)
        let numStr = "";
        let j = i + 1;
        // Skip spaces, tabs, colons, or parentheses
        while (j < payload.length && (payload[j] === 0x20 || payload[j] === 0x28 || payload[j] === 0x3a)) {
          j++;
        }
        while (j < payload.length && payload[j] >= 0x30 && payload[j] <= 0x39) {
          numStr += String.fromCharCode(payload[j]);
          j++;
        }
        if (numStr.length > 0) {
          const sysAddr = parseInt(numStr, 10);
          if (!isNaN(sysAddr) && sysAddr >= 0x0200 && sysAddr <= 0xffff) {
            return { address: sysAddr, isSys: true };
          }
        }
      }
    }

    return { address: 0x0801, isSys: false };
  }

  // Inject PRG binary into C64 RAM and adjust system pointers
  public static inject(memory: C64Memory, prg: PRGInfo): number {
    const endAddress = prg.loadAddress + prg.data.length;

    for (let i = 0; i < prg.data.length; i++) {
      const target = prg.loadAddress + i;
      if (target < 65536) {
        memory.ram[target] = prg.data[i];
      }
    }

    // If loaded into BASIC RAM ($0801), update standard BASIC Zero Page pointers
    if (prg.loadAddress === 0x0801) {
      // $002B-$002C: Start of BASIC ($0801)
      memory.ram[0x002b] = 0x01;
      memory.ram[0x002c] = 0x08;

      // $002D-$002E: Start of Variables (Points to end of loaded PRG)
      memory.ram[0x002d] = endAddress & 0xff;
      memory.ram[0x002e] = (endAddress >> 8) & 0xff;

      // $002F-$0030: Start of Arrays
      memory.ram[0x002f] = endAddress & 0xff;
      memory.ram[0x0030] = (endAddress >> 8) & 0xff;

      // $0031-$0032: End of Arrays
      memory.ram[0x0031] = endAddress & 0xff;
      memory.ram[0x0032] = (endAddress >> 8) & 0xff;
    }

    return endAddress;
  }
}
