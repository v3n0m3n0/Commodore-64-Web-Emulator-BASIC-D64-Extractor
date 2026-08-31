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

  /**
   * Create a standard Commodore 64 .T64 tape container binary
   */
  public static createT64(
    tapeDescription = "C64 TAPE ARCHIVE",
    records: { fileName: string; data: Uint8Array; startAddress?: number }[] = []
  ): Uint8Array {
    const maxEntries = Math.max(30, records.length);
    const dirOffset = 64;
    const dataStartOffset = dirOffset + maxEntries * 32;

    // Calculate total size needed
    let payloadSize = 0;
    for (const r of records) {
      let rawLen = r.data.length;
      if (rawLen >= 2 && r.startAddress === undefined) {
        // Data already includes 2-byte header
        rawLen -= 2;
      }
      payloadSize += rawLen;
    }

    const totalLength = dataStartOffset + payloadSize;
    const output = new Uint8Array(totalLength);

    // Write Header (64 bytes)
    const sig = "C64 tape image file";
    for (let i = 0; i < 32; i++) {
      output[i] = i < sig.length ? sig.charCodeAt(i) : 0x00;
    }

    output[0x20] = 0x00; // Version
    output[0x21] = 0x01;
    output[0x22] = maxEntries & 0xff;
    output[0x23] = (maxEntries >> 8) & 0xff;
    output[0x24] = records.length & 0xff;
    output[0x25] = (records.length >> 8) & 0xff;

    for (let i = 0; i < 24; i++) {
      output[0x28 + i] = i < tapeDescription.length ? tapeDescription.charCodeAt(i) : 0x20;
    }

    // Write Directory Entries & Payloads
    let curPayloadOffset = dataStartOffset;

    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      const entryOff = dirOffset + i * 32;

      let startAddr = rec.startAddress ?? 0x0801;
      let payload = rec.data;

      if (rec.startAddress === undefined && rec.data.length >= 2) {
        startAddr = rec.data[0] | (rec.data[1] << 8);
        payload = rec.data.subarray(2);
      }

      const endAddr = startAddr + payload.length;

      output[entryOff + 0] = 0x01; // Normal PRG
      output[entryOff + 1] = 0x82; // PRG file type
      output[entryOff + 2] = startAddr & 0xff;
      output[entryOff + 3] = (startAddr >> 8) & 0xff;
      output[entryOff + 4] = endAddr & 0xff;
      output[entryOff + 5] = (endAddr >> 8) & 0xff;

      output[entryOff + 8] = curPayloadOffset & 0xff;
      output[entryOff + 9] = (curPayloadOffset >> 8) & 0xff;
      output[entryOff + 10] = (curPayloadOffset >> 16) & 0xff;
      output[entryOff + 11] = (curPayloadOffset >> 24) & 0xff;

      const cleanName = rec.fileName.replace(/\.[^.]+$/, "").toUpperCase();
      for (let c = 0; c < 16; c++) {
        output[entryOff + 16 + c] = c < cleanName.length ? cleanName.charCodeAt(c) : 0x20;
      }

      // Write payload bytes
      output.set(payload, curPayloadOffset);
      curPayloadOffset += payload.length;
    }

    return output;
  }
}
