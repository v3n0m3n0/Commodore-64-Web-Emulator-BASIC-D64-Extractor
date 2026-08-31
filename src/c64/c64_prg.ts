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

    // Scan first 128 bytes of payload for token 0x9E (SYS)
    const payload = prg.data;
    const scanLimit = Math.min(payload.length, 128);

    for (let i = 0; i < scanLimit; i++) {
      if (payload[i] === 0x9e) { // SYS token ($9E)
        let exprStr = "";
        let j = i + 1;
        // Skip spaces, tabs, colons, or parentheses
        while (j < payload.length && (payload[j] === 0x20 || payload[j] === 0x28 || payload[j] === 0x3a)) {
          j++;
        }
        // Collect digits, plus signs, hex prefix ($)
        while (
          j < payload.length &&
          ((payload[j] >= 0x30 && payload[j] <= 0x39) ||
            payload[j] === 0x2b || // '+'
            payload[j] === 0x24 || // '$'
            (payload[j] >= 0x41 && payload[j] <= 0x46) || // 'A'-'F'
            (payload[j] >= 0x61 && payload[j] <= 0x66))   // 'a'-'f'
        ) {
          exprStr += String.fromCharCode(payload[j]);
          j++;
        }

        if (exprStr.length > 0) {
          try {
            let sysAddr = 0;
            if (exprStr.includes("+")) {
              const parts = exprStr.split("+");
              for (const part of parts) {
                const clean = part.trim();
                if (clean.startsWith("$")) {
                  sysAddr += parseInt(clean.substring(1), 16);
                } else {
                  sysAddr += parseInt(clean, 10);
                }
              }
            } else if (exprStr.startsWith("$")) {
              sysAddr = parseInt(exprStr.substring(1), 16);
            } else {
              sysAddr = parseInt(exprStr, 10);
            }

            if (!isNaN(sysAddr) && sysAddr >= 0x0200 && sysAddr <= 0xffff) {
              return { address: sysAddr, isSys: true };
            }
          } catch {
            // Ignore parse errors and continue scan
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
