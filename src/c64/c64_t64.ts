/**
 * Commodore Tape Container (.T64) Parser
 * Reads Tape Record headers, extracts PRG files with start/end addresses,
 * and decodes cassette records.
 */

export interface T64TapeRecord {
  entryType: number; // 1 = Normal PRG
  c64FileType: number; // 0x82 = PRG
  startAddress: number;
  endAddress: number;
  dataOffset: number;
  fileName: string;
  data: Uint8Array;
  prgData: Uint8Array; // Full PRG binary with 2-byte startAddress header
}

export interface T64Archive {
  tapeDescription: string;
  maxEntries: number;
  usedEntries: number;
  records: T64TapeRecord[];
}

export class C64T64 {
  public static parse(data: Uint8Array): T64Archive | null {
    if (data.length < 64) return null;

    // Check T64 Header Signature (32 bytes)
    const sig = String.fromCharCode(...data.subarray(0, 16)).trim();
    if (!sig.startsWith("C64 tape") && !sig.startsWith("C64S tape") && !sig.startsWith("C64")) {
      return null;
    }

    const maxEntries = data[0x22] | (data[0x23] << 8);
    const usedEntries = data[0x24] | (data[0x25] << 8);
    const tapeDescription = String.fromCharCode(...data.subarray(0x28, 0x40)).trim();

    const records: T64TapeRecord[] = [];
    const dirStart = 0x40; // Directory starts at offset 64

    for (let i = 0; i < Math.min(usedEntries, maxEntries, 30); i++) {
      const entryOffset = dirStart + i * 32;
      if (entryOffset + 32 > data.length) break;

      const entryType = data[entryOffset];
      if (entryType === 0) continue; // Free entry

      const c64FileType = data[entryOffset + 1];
      const startAddress = data[entryOffset + 2] | (data[entryOffset + 3] << 8);
      const endAddress = data[entryOffset + 4] | (data[entryOffset + 5] << 8);
      const dataOffset = data[entryOffset + 8] | (data[entryOffset + 9] << 8) | (data[entryOffset + 10] << 16) | (data[entryOffset + 11] << 24);

      // 16-character file name
      let fileName = "";
      for (let c = 0; c < 16; c++) {
        const b = data[entryOffset + 16 + c];
        if (b === 0xa0 || b === 0x00) break;
        fileName += String.fromCharCode(b >= 0x20 && b <= 0x7e ? b : 0x20);
      }
      fileName = fileName.trim() || `FILE_${i + 1}`;

      const length = Math.max(0, endAddress - startAddress);
      let payload = new Uint8Array(0);
      if (dataOffset > 0 && dataOffset + length <= data.length) {
        payload = data.subarray(dataOffset, dataOffset + length);
      } else if (dataOffset > 0 && dataOffset < data.length) {
        payload = data.subarray(dataOffset);
      }

      // Build PRG binary with 2-byte little endian startAddress header
      const prgData = new Uint8Array(2 + payload.length);
      prgData[0] = startAddress & 0xff;
      prgData[1] = (startAddress >> 8) & 0xff;
      prgData.set(payload, 2);

      records.push({
        entryType,
        c64FileType,
        startAddress,
        endAddress,
        dataOffset,
        fileName,
        data: payload,
        prgData,
      });
    }

    return {
      tapeDescription,
      maxEntries,
      usedEntries,
      records,
    };
  }
}
