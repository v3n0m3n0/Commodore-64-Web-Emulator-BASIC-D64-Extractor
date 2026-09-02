/**
 * Commodore 64 Raw Cassette Tape (.TAP) Parser & Pulse Decoder
 * =============================================================
 * Supports TAP Container Versions 0, 1, and 2 ("C64-TAPE-RAW").
 *
 * Capabilities:
 * 1. Converts raw magnetic pulse transitions to precise CPU clock cycles.
 * 2. High-Level KERNAL Block Reconstruction: extracts standard PRG payloads for instant loading.
 * 3. Provides cycle-exact pulse stream for C2N Datasette hardware emulation (Turbo loaders).
 * 4. Multi-Cassette / Multi-Side metadata parsing & Side grouping helpers.
 */

export interface TAPHeader {
  signature: string;
  version: number;
  platform: number;
  video: number; // 0 = PAL (default), 1 = NTSC
  reserved: number;
  dataSize: number;
}

export interface TAPFileEntry {
  name: string;
  fileType: number; // 1 = Relocatable BASIC PRG, 3 = Non-relocatable Machine Code PRG, 2 = SEQ
  typeName: string; // "BASIC PRG" | "Machine Code PRG" | "Bootstrap Loader" | "SEQ"
  startAddr: number;
  endAddr: number;
  runAddr?: number;
  isAbsoluteLoader?: boolean;
  pulseOffset?: number; // Position in pulse stream where file was located
  prgData: Uint8Array; // Full executable PRG (2-byte start address header + payload)
  headerPayload?: Uint8Array; // Raw 192-byte header block (resident in Cassette Buffer $033C..$03FB)
  size: number;
  formattedSize: string;
  loaderType?: "KERNAL Standard" | "Cyberload" | "Novaload" | "Turbo Tape 64" | "Bootstrap Loader" | "Custom";
}

export interface TAPImage {
  header: TAPHeader;
  fileName?: string;
  sideName?: string | null;
  pulses: Uint32Array; // Pulse lengths in CPU clock cycles
  totalCycles: number;
  totalDurationSeconds: number;
  files: TAPFileEntry[];
  detectedLoader?: string;
}

export class C64TAP {
  /**
   * Extract side/tape label from filename (e.g., "Side 1", "Side 2", "Tape A", "Bonus Levels").
   */
  public static extractSideName(fileName: string): string | null {
    if (!fileName) return null;
    const match =
      fileName.match(/\((Side\s*[0-9A-Za-z]+[^\)]*|Tape\s*[0-9A-Za-z]+[^\)]*|Cassette\s*[0-9A-Za-z]+[^\)]*|Part\s*[0-9A-Za-z]+[^\)]*)\)/i) ||
      fileName.match(/[-_]\s*(Side\s*[0-9A-Za-z]+|Tape\s*[0-9A-Za-z]+|Cassette\s*[0-9A-Za-z]+|Part\s*[0-9A-Za-z]+)/i);
    if (match) return match[1].trim();
    return null;
  }

  /**
   * Extract canonical base game name from filename, stripping out (Side X), (Tape X), (Version X), etc.
   */
  public static extractBaseGameName(fileName: string): string {
    if (!fileName) return "Unknown Tape";
    let clean = fileName.replace(/\.[^.]+$/, ""); // strip extension
    clean = clean.replace(/\((Side|Tape|Cassette|Part|Version|Preview)[^\)]*\)/gi, "");
    clean = clean.replace(/[-_]\s*(Side|Tape|Cassette|Part)\s*[0-9A-Za-z]+/gi, "");
    clean = clean.replace(/\s{2,}/g, " ").trim();
    return clean || fileName;
  }

  /**
   * Parse raw .TAP byte buffer into TAPImage structure.
   */
  public static parse(data: Uint8Array, fileName?: string): TAPImage | null {
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
            const validP = p > 0 ? p : 2048;
            pulseList.push(validP);
            totalCycles += validP;
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
    const clockFreq = video === 1 ? 1022727 : 985248; // NTSC vs PAL
    const totalDurationSeconds = totalCycles / clockFreq;

    // 3. High-Level standard KERNAL block reconstruction (Fast Autostart)
    const files = this.decodeStandardFiles(pulses);

    let detectedLoader = "Standard C64 Tape";
    if (files.some((f) => f.loaderType === "Cyberload")) {
      detectedLoader = "Cyberload Turbo Tape";
    } else if (files.some((f) => f.loaderType === "Novaload")) {
      detectedLoader = "Novaload Turbo Tape";
    } else if (files.length > 0) {
      detectedLoader = "KERNAL Tape Container";
    }

    const sideName = fileName ? this.extractSideName(fileName) : null;

    return {
      header: {
        signature: sig,
        version,
        platform,
        video,
        reserved,
        dataSize,
      },
      fileName,
      sideName,
      pulses,
      totalCycles,
      totalDurationSeconds,
      files,
      detectedLoader,
    };
  }

  /**
   * Decode standard C64 KERNAL cassette pulse stream into PRG binaries.
   */
  public static decodeStandardFiles(pulses: Uint32Array): TAPFileEntry[] {
    const classify = (p: number): "S" | "M" | "L" | null => {
      if (p < 200 || p > 900) return null;
      if (p < 432) return "S"; // Short pulse: ~352 cycles (bit 0 first half or leader)
      if (p < 592) return "M"; // Medium pulse: ~512 cycles
      return "L";             // Long pulse: ~672 cycles (sync countdown / byte marker)
    };

    let pIdx = 0;
    const files: TAPFileEntry[] = [];
    let currentHeader: {
      name: string;
      fileType: number;
      startAddr: number;
      endAddr: number;
      expectedDataLen: number;
      pulseOffset: number;
      isAbsoluteLoader: boolean;
      headerPayload?: Uint8Array;
    } | null = null;

    while (pIdx < pulses.length - 100) {
      // 1. Scan for Sync Leader: consecutive short pulses (minimum 25 pulses)
      let sCount = 0;
      const leaderStartPulse = pIdx;
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

      // 4. Parse Header or Data block after countdown sequence ($89..$81 or $09..$01)
      if (blockBytes.length >= 10) {
        let startIdx = 0;
        if ((blockBytes[0] >= 0x81 && blockBytes[0] <= 0x89) || (blockBytes[0] >= 0x01 && blockBytes[0] <= 0x09)) {
          for (let i = 0; i < Math.min(12, blockBytes.length); i++) {
            if (blockBytes[i] === 0x81 || (blockBytes[i] === 0x01 && i > 0 && blockBytes[i - 1] === 0x02)) {
              startIdx = i + 1;
              break;
            }
          }
          if (startIdx === 0 && (blockBytes[0] === 0x89 || blockBytes[0] === 0x09)) {
            startIdx = 9;
          }
        }

        const payload = blockBytes.slice(startIdx);
        const marker = payload[0];
        const isHeaderBlock = (marker === 1 || marker === 3 || marker === 0x81) && payload.length >= 192;

        if (isHeaderBlock) {
          // Authentic C64 KERNAL Tape Header layout ($033C..$03FB):
          // Byte 0: File Type ($01 = Relocatable BASIC, $03 = Non-relocatable Machine Code, $02 = SEQ)
          // Byte 1-2: Start Address ($0801 for standard BASIC)
          // Byte 3-4: End Address
          // Byte 5-20: 16-byte File Name in PETSCII
          const fileType = payload[0];
          const startAddr = payload[1] | (payload[2] << 8);
          const endAddr = payload[3] | (payload[4] << 8);
          let name = "";
          for (let c = 5; c < 21; c++) {
            const ch = payload[c];
            if (ch >= 32 && ch <= 126) name += String.fromCharCode(ch);
          }

          const isAbsolute = endAddr <= startAddr;
          currentHeader = {
            name: name.trim() || `PROGRAM_${files.length + 1}`,
            fileType,
            startAddr,
            endAddr,
            expectedDataLen: isAbsolute ? -1 : (endAddr - startAddr),
            pulseOffset: leaderStartPulse,
            isAbsoluteLoader: isAbsolute,
            headerPayload: new Uint8Array(payload.slice(0, 192)),
          };
        } else if (currentHeader) {
          // File Data Block
          let dataBytes: number[];
          let effectiveStartAddr = currentHeader.startAddr;

          if (marker === 2 || marker === 4 || marker === 0x82) {
            dataBytes =
              currentHeader.expectedDataLen > 0
                ? payload.slice(1, 1 + currentHeader.expectedDataLen)
                : payload.slice(1, payload.length - 1);
          } else {
            // Raw PRG payload directly in block (or custom stage-1 loader)
            dataBytes =
              currentHeader.expectedDataLen > 0 && payload.length >= currentHeader.expectedDataLen
                ? payload.slice(0, currentHeader.expectedDataLen)
                : payload;
            if (dataBytes.length >= 2) {
              const detectedAddr = dataBytes[0] | (dataBytes[1] << 8);
              if (detectedAddr === 0x02a6) {
                effectiveStartAddr = 0x02a0;
              }
            }
          }

          if (dataBytes.length > 0) {
            let prg: Uint8Array;
            if (marker === 2 || marker === 4 || marker === 0x82 || (currentHeader.startAddr === 0x0801 && dataBytes.length === currentHeader.expectedDataLen)) {
              prg = new Uint8Array(2 + dataBytes.length);
              prg[0] = effectiveStartAddr & 0xff;
              prg[1] = (effectiveStartAddr >> 8) & 0xff;
              prg.set(dataBytes, 2);
            } else if (
              effectiveStartAddr === 0x02a0 &&
              (dataBytes[0] | (dataBytes[1] << 8)) === 0x02a6
            ) {
              prg = new Uint8Array(2 + dataBytes.length);
              prg[0] = 0xa0;
              prg[1] = 0x02;
              prg.set(dataBytes, 2);
            } else {
              prg = new Uint8Array(dataBytes);
            }

            // Determine entry/execution jump address & loader type
            let runAddr: number | undefined;
            let loaderType: TAPFileEntry["loaderType"] = "KERNAL Standard";

            // Check if tape contains a machine code loader in Cassette Buffer ($033C..$03FB) or Low RAM
            let isCassetteBufferLoader = false;
            if (currentHeader.headerPayload && currentHeader.headerPayload.length >= 32) {
              const hp = currentHeader.headerPayload;
              // 1. Relocator pattern at $034C..$0354 (LDX #$xx, LDA $03xx,X, STA $03xx,X)
              for (let offset = 16; offset <= 30; offset++) {
                if (hp[offset] === 0xa2 && hp[offset + 2] === 0xbd && hp[offset + 4] === 0x03) {
                  isCassetteBufferLoader = true;
                  runAddr = 0x033c + offset; // e.g. $0350 or $034C
                  loaderType = "Bootstrap Loader";
                  break;
                }
              }
              // 2. Direct JMP $03xx or JSR in header buffer
              if (!runAddr) {
                for (let offset = 16; offset <= 40; offset++) {
                  if (hp[offset] === 0x4c && hp[offset + 2] === 0x03) {
                    isCassetteBufferLoader = true;
                    runAddr = hp[offset + 1] | (hp[offset + 2] << 8);
                    loaderType = "Bootstrap Loader";
                    break;
                  }
                }
              }
            }

            if (effectiveStartAddr === 0x02a0) {
              // Cyberload Stage-1 Loader entry is $02A8 (SEI instruction)
              runAddr = 0x02a8;
              loaderType = "Cyberload";
            } else if (
              effectiveStartAddr === 0x02a6 &&
              dataBytes.length >= 10 &&
              dataBytes[9] === 0x78
            ) {
              runAddr = 0x02ad;
              loaderType = "Cyberload";
            } else if (isCassetteBufferLoader || effectiveStartAddr < 0x0800) {
              loaderType = "Bootstrap Loader";
              if (!runAddr) {
                runAddr = effectiveStartAddr;
              }
            } else if (currentHeader.isAbsoluteLoader) {
              runAddr =
                currentHeader.endAddr > 0 &&
                currentHeader.endAddr !== 0x0803 &&
                currentHeader.endAddr !== 0x0801
                  ? currentHeader.endAddr
                  : effectiveStartAddr;
              loaderType = "Custom";
            }

            let typeName = "BASIC PRG";
            if (loaderType === "Cyberload" || loaderType === "Bootstrap Loader" || effectiveStartAddr < 0x0800) {
              typeName = "Bootstrap Loader";
            } else if (currentHeader.fileType === 3 || currentHeader.isAbsoluteLoader) {
              typeName = "Machine Code PRG";
            } else if (currentHeader.fileType === 2) {
              typeName = "SEQ";
            }

            const formattedSize = `${(prg.length / 1024).toFixed(1)} KB (${prg.length} B)`;

            // Avoid duplicate additions from repeated tape passes, but update pulseOffset to latest block pass
            const existingIdx = files.findIndex(
              (f) =>
                f.name === currentHeader!.name &&
                f.startAddr === effectiveStartAddr
            );

            if (existingIdx === -1) {
              files.push({
                name: currentHeader.name,
                fileType: currentHeader.fileType,
                typeName,
                startAddr: effectiveStartAddr,
                endAddr: currentHeader.endAddr,
                runAddr,
                isAbsoluteLoader: currentHeader.isAbsoluteLoader,
                headerPayload: currentHeader.headerPayload,
                pulseOffset: pIdx,
                prgData: prg,
                size: prg.length,
                formattedSize,
                loaderType,
              });
            } else {
              files[existingIdx].pulseOffset = pIdx;
              if (runAddr) files[existingIdx].runAddr = runAddr;
            }

            // Consume header
            currentHeader = null;
          }
        }
      }
    }

    return files;
  }
}
