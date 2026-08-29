/**
 * Commodore 1541 Disk Image (.D64) Parser & Virtual Drive 8 File System
 * Parses 35-track (683 sectors) and 40-track (768 sectors) standard 1541 disks,
 * decodes Track 18 Sector 0 BAM (Block Availability Map) and Directory sectors,
 * extracts PRG, SEQ, USR, REL files, and provides direct memory loader injection.
 */

export interface D64DirectoryEntry {
  track: number;
  sector: number;
  fileType: "PRG" | "SEQ" | "USR" | "REL" | "DEL" | "UNKNOWN";
  isClosed: boolean;
  isLocked: boolean;
  fileName: string;
  sizeInBlocks: number;
  firstDataTrack: number;
  firstDataSector: number;
  data: Uint8Array;
  loadAddress: number;
}

export interface D64DiskInfo {
  diskName: string;
  diskId: string;
  dosVersion: string;
  totalBlocks: number;
  freeBlocks: number;
  files: D64DirectoryEntry[];
}

export class C64D64 {
  // 1541 Sector allocation per track (Tracks 1 to 40)
  private static sectorsPerTrack: number[] = [
    0, // Track 0 (unused)
    21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, // Tracks 1-17 (21 sectors)
    19, // Track 18 (Directory & BAM: 19 sectors)
    19, 19, 19, 19, 19, 19, 19, // Tracks 19-24 (19 sectors)
    18, 18, 18, 18, 18, 18, // Tracks 25-30 (18 sectors)
    17, 17, 17, 17, 17, // Tracks 31-35 (17 sectors)
    17, 17, 17, 17, 17, // Tracks 36-40 (17 sectors extended)
  ];

  // Calculate byte offset in .D64 binary for a given (track, sector)
  public static getSectorOffset(track: number, sector: number): number {
    if (track < 1 || track > 40) return -1;
    let offset = 0;
    for (let t = 1; t < track; t++) {
      offset += this.sectorsPerTrack[t] * 256;
    }
    offset += sector * 256;
    return offset;
  }

  // Read a single 256-byte sector from D64 image buffer
  public static readSector(image: Uint8Array, track: number, sector: number): Uint8Array | null {
    const offset = this.getSectorOffset(track, sector);
    if (offset < 0 || offset + 256 > image.length) return null;
    return image.subarray(offset, offset + 256);
  }

  // Convert PETSCII string from directory entry into clean display string
  public static petsciiToString(bytes: Uint8Array, start: number, length: number): string {
    let str = "";
    for (let i = 0; i < length; i++) {
      const b = bytes[start + i];
      if (b === 0xa0) break; // Trailing $A0 padding
      if (b >= 0x20 && b <= 0x7e) {
        str += String.fromCharCode(b);
      } else if (b >= 0x41 && b <= 0x5a) {
        str += String.fromCharCode(b);
      } else if (b >= 0xc1 && b <= 0xda) {
        str += String.fromCharCode(b - 0x80);
      } else {
        str += "?";
      }
    }
    return str.trim();
  }

  // Parse complete D64 Disk Image
  public static parse(image: Uint8Array): D64DiskInfo | null {
    if (image.length < 174848) { // Minimum 35 tracks * sectors * 256 bytes = 174,848 bytes
      return null;
    }

    // Read BAM (Track 18, Sector 0)
    const bam = this.readSector(image, 18, 0);
    if (!bam) return null;

    const diskName = this.petsciiToString(bam, 0x90, 16);
    const diskId = this.petsciiToString(bam, 0xa2, 5);
    const dosVersion = String.fromCharCode(bam[0xa5], bam[0xa6]);

    // Calculate free blocks from BAM
    let freeBlocks = 0;
    for (let t = 1; t <= 35; t++) {
      if (t === 18) continue; // Skip directory track
      const bamOffset = 4 * t;
      if (bamOffset < bam.length) {
        freeBlocks += bam[bamOffset];
      }
    }

    const files: D64DirectoryEntry[] = [];
    let dirTrack = bam[0x00]; // First directory track (usually 18)
    let dirSector = bam[0x01]; // First directory sector (usually 1)

    // Traverse directory chain (Track 18 Sector 1, 2, 3...)
    const visited = new Set<string>();
    while (dirTrack > 0 && dirTrack <= 40) {
      const key = `${dirTrack}:${dirSector}`;
      if (visited.has(key)) break;
      visited.add(key);

      const sectorData = this.readSector(image, dirTrack, dirSector);
      if (!sectorData) break;

      // 8 directory entries per 256-byte sector (32 bytes per entry)
      for (let e = 0; e < 8; e++) {
        const entryOffset = e * 32;
        const rawType = sectorData[entryOffset + 0x02];
        if (rawType === 0x00) continue; // Deleted / Empty slot

        const typeBits = rawType & 0x07;
        let fileType: "PRG" | "SEQ" | "USR" | "REL" | "DEL" | "UNKNOWN" = "UNKNOWN";
        if (typeBits === 0x00) fileType = "DEL";
        else if (typeBits === 0x01) fileType = "SEQ";
        else if (typeBits === 0x02) fileType = "PRG";
        else if (typeBits === 0x03) fileType = "USR";
        else if (typeBits === 0x04) fileType = "REL";

        const isClosed = (rawType & 0x80) !== 0;
        const isLocked = (rawType & 0x40) !== 0;

        const firstDataTrack = sectorData[entryOffset + 0x03];
        const firstDataSector = sectorData[entryOffset + 0x04];
        const fileName = this.petsciiToString(sectorData, entryOffset + 0x05, 16);
        const sizeInBlocks = sectorData[entryOffset + 0x1e] | (sectorData[entryOffset + 0x1f] << 8);

        // Extract file content bytes by following sector chain
        const fileBytes = this.extractFileChain(image, firstDataTrack, firstDataSector);
        let loadAddress = 0x0801;
        if (fileBytes.length >= 2) {
          loadAddress = fileBytes[0] | (fileBytes[1] << 8);
        }

        files.push({
          track: dirTrack,
          sector: dirSector,
          fileType,
          isClosed,
          isLocked,
          fileName,
          sizeInBlocks,
          firstDataTrack,
          firstDataSector,
          data: fileBytes,
          loadAddress,
        });
      }

      // Next directory sector in chain
      dirTrack = sectorData[0x00];
      dirSector = sectorData[0x01];
    }

    return {
      diskName,
      diskId,
      dosVersion,
      totalBlocks: 664,
      freeBlocks,
      files,
    };
  }

  // Follow data sector chain and assemble complete byte stream
  private static extractFileChain(image: Uint8Array, startTrack: number, startSector: number): Uint8Array {
    const chunks: Uint8Array[] = [];
    let curTrack = startTrack;
    let curSector = startSector;
    const visited = new Set<string>();

    while (curTrack > 0 && curTrack <= 40) {
      const key = `${curTrack}:${curSector}`;
      if (visited.has(key)) break;
      visited.add(key);

      const sec = this.readSector(image, curTrack, curSector);
      if (!sec) break;

      const nextTrack = sec[0];
      const nextSectorOrBytes = sec[1];

      if (nextTrack === 0) {
        // Last sector in chain: bytes 2 to nextSectorOrBytes
        const validLength = Math.min(254, Math.max(0, nextSectorOrBytes - 1));
        chunks.push(sec.subarray(2, 2 + validLength));
        break;
      } else {
        // Full sector: 254 bytes of data (bytes 2 to 255)
        chunks.push(sec.subarray(2, 256));
        curTrack = nextTrack;
        curSector = nextSectorOrBytes;
      }
    }

    // Combine chunks
    let totalLen = 0;
    for (const c of chunks) totalLen += c.length;
    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const c of chunks) {
      result.set(c, offset);
      offset += c.length;
    }
    return result;
  }
}
