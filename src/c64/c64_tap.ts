/**
 * Commodore 64 Raw Cassette Tape (.TAP) Parser & Pulse Decoder
 * =============================================================
 * Supports TAP Container Versions 0, 1, and 2 ("C64-TAPE-RAW").
 *
 * Capabilities:
 * 1. Converts raw magnetic pulse transitions to precise CPU clock cycles.
 * 2. High-Level KERNAL Block Reconstruction: extracts standard PRG payloads for instant loading.
 * 3. Provides cycle-exact pulse stream for C2N Datasette hardware emulation (Turbo loaders).
 */

export interface TAPHeader {
  signature: string;
  version: number;
  platform: number;
  video: number;
  reserved: number;
  dataSize: number;
}

export interface TAPFileEntry {
  name: string;
  fileType: number; // 1 = Relocatable BASIC PRG, 3 = Non-relocatable Machine Code PRG, 2 = SEQ
  startAddr: number;
  endAddr: number;
  prgData: Uint8Array; // Full executable PRG (2-byte start address header + payload)
  size: number;
}

export interface TAPImage {
  header: TAPHeader;
  pulses: Uint32Array; // Pulse lengths in CPU clock cycles
  totalCycles: number;
  totalDurationSeconds: number;
  files: TAPFileEntry[];
}

export class C64TAP {
  /**
   * Parse raw .TAP byte buffer into TAPImage structure.
   */
  public static parse(data: Uint8Array): TAPImage | null {
    if (!data || data.length < 20) return null;

    // 1. Validate Header Signature ("C64-TAPE-RAW")
    const sig = String.fromCharCode(...data.subarray(0, 12));
    if (sig !== "C64-TAPE-RAW") return null;

    const version = data[12];
    const platform = data[13];
    const video = data[14];
    const reserved = data[15];
    const dataSize =
      data[16] | (data[17] << 8) | (data[18] << 16) | (data[19] << 24);

    const rawPulseData = data.subarray(20, Math.min(data.length, 20 + dataSize));

    // 2. Decode pulse lengths in CPU clock cycles
    const pulseList: number[] = [];
    let idx = 0;
    let totalCycles = 0;

    while (idx < rawPulseData.length) {
      const b = rawPulseData[idx++];
      if (b === 0) {
        if (version === 0) {
          // Version 0: 0 represents 256 * 8 = 2048 cycles
          pulseList.push(2048);
          totalCycles += 2048;
        } else {
          // Version 1 / 2: 0 is escape byte followed by 24-bit little-endian cycle count
          if (idx + 3 <= rawPulseData.length) {
            const p =
              rawPulseData[idx] |
              (rawPulseData[idx + 1] << 8) |
              (rawPulseData[idx + 2] << 16);
            idx += 3;
            pulseList.push(p);
            totalCycles += p;
          }
        }
      } else {
        // Standard pulse: byte value * 8 cycles
        const p = b * 8;
        pulseList.push(p);
        totalCycles += p;
      }
    }

    const pulses = new Uint32Array(pulseList);
    const totalDurationSeconds = totalCycles / 985248; // PAL master clock reference

    // 3. Attempt High-Level standard KERNAL block reconstruction (Fast Autostart)
    const files = this.decodeStandardFiles(pulses);

    return {
      header: {
        signature: sig,
        version,
        platform,
        video,
        reserved,
        dataSize,
      },
      pulses,
      totalCycles,
      totalDurationSeconds,
      files,
    };
  }

  /**
   * Decode standard C64 KERNAL cassette pulse stream into PRG binaries.
   */
  public static decodeStandardFiles(pulses: Uint32Array): TAPFileEntry[] {
    const classify = (p: number): "S" | "M" | "L" | null => {
      if (p < 200 || p > 900) return null;
      if (p < 432) return "S"; // Short pulse: ~352 cycles
      if (p < 592) return "M"; // Medium pulse: ~512 cycles
      return "L";             // Long pulse: ~672 cycles
    };

    let pIdx = 0;
    const files: TAPFileEntry[] = [];
    let currentHeader: {
      name: string;
      fileType: number;
      startAddr: number;
      endAddr: number;
      expectedDataLen: number;
    } | null = null;

    while (pIdx < pulses.length - 100) {
      // 1. Scan for Sync Leader: consecutive short pulses (minimum 25 pulses)
      let sCount = 0;
      while (pIdx < pulses.length && classify(pulses[pIdx]) === "S") {
        sCount++;
        pIdx++;
      }
      if (sCount < 25) {
        pIdx++;
        continue;
      }
      if (pIdx >= pulses.length) break;

      // 2. Scan for Sync Countdown Sequence starting with a Long pulse
      while (pIdx < pulses.length - 2) {
        const c1 = classify(pulses[pIdx]);
        const c2 = classify(pulses[pIdx + 1]);
        if (c1 === "L" && (c2 === "M" || c2 === "S")) {
          pIdx += 2;
          break;
        }
        pIdx++;
      }

      // 3. Decode pulse pairs into raw bytes (8 data bits + 1 parity bit + optional word marker)
      const blockBytes: number[] = [];
      while (pIdx < pulses.length - 18 && blockBytes.length < 65536) {
        let byteVal = 0;
        let bitOk = true;

        for (let bit = 0; bit < 8; bit++) {
          const c1 = classify(pulses[pIdx]);
          const c2 = classify(pulses[pIdx + 1]);
          pIdx += 2;

          if (c1 === "S" && c2 === "M") {
            // Bit 0
          } else if (c1 === "M" && c2 === "S") {
            // Bit 1
            byteVal |= 1 << bit;
          } else {
            bitOk = false;
            break;
          }
        }

        if (!bitOk) break;

        // Skip parity bit
        pIdx += 2;

        // Skip Word Sync Marker (L + M or L + S)
        if (pIdx < pulses.length - 1 && classify(pulses[pIdx]) === "L") {
          pIdx += 2;
        }

        blockBytes.push(byteVal);
      }

      // 4. Parse Header or Data block after countdown ($81 or $01)
      if (blockBytes.length >= 10) {
        let startIdx = 0;
        for (let i = 0; i < Math.min(16, blockBytes.length); i++) {
          if (blockBytes[i] === 0x81 || blockBytes[i] === 0x01) {
            startIdx = i + 1;
            break;
          }
        }

        const payload = blockBytes.slice(startIdx);
        const marker = payload[0];

        if ((marker === 1 || marker === 3) && payload.length >= 193) {
          // File Header Block
          const fileType = payload[1];
          const startAddr = payload[2] | (payload[3] << 8);
          const endAddr = payload[4] | (payload[5] << 8);
          let name = "";
          for (let c = 6; c < 22; c++) {
            const ch = payload[c];
            if (ch >= 32 && ch <= 126) name += String.fromCharCode(ch);
          }

          currentHeader = {
            name: name.trim() || "PROGRAM",
            fileType,
            startAddr,
            endAddr,
            expectedDataLen: Math.max(0, endAddr - startAddr),
          };
        } else if ((marker === 2 || marker === 4) && currentHeader) {
          // File Data Block
          const dataLen = currentHeader.expectedDataLen;
          const dataBytes = payload.slice(1, 1 + dataLen);

          if (dataBytes.length > 0) {
            const prg = new Uint8Array(2 + dataBytes.length);
            prg[0] = currentHeader.startAddr & 0xff;
            prg[1] = (currentHeader.startAddr >> 8) & 0xff;
            prg.set(dataBytes, 2);

            // Avoid duplicate additions from repeated tape passes
            const exists = files.some(
              (f) =>
                f.name === currentHeader!.name &&
                f.startAddr === currentHeader!.startAddr
            );

            if (!exists) {
              files.push({
                name: currentHeader.name,
                fileType: currentHeader.fileType,
                startAddr: currentHeader.startAddr,
                endAddr: currentHeader.endAddr,
                prgData: prg,
                size: prg.length,
              });
            }
          }
        }
      }
    }

    return files;
  }
}
