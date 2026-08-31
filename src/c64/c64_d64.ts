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
  rawImage?: Uint8Array;
}

export interface BAMSectorDetail {
  track: number;
  sector: number;
  isFree: boolean;
  isBAMOrDir: boolean;
  ownerFileName?: string;
  nextTrack?: number;
  nextSector?: number;
}

export interface BAMTrackInfo {
  track: number;
  totalSectors: number;
  freeSectors: number;
  sectors: BAMSectorDetail[];
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
      rawImage: image,
    };
  }

  /**
   * Decode full 35-track BAM block allocation map and sector owner assignments
   */
  public static getBAMDetails(image: Uint8Array): BAMTrackInfo[] {
    const tracks: BAMTrackInfo[] = [];
    const bam = this.readSector(image, 18, 0);
    if (!bam) return [];

    // Map file ownership by traversing file sector chains
    const sectorOwnerMap = new Map<string, string>();
    const sectorLinkMap = new Map<string, { nextTrack: number; nextSector: number }>();

    // Parse directory to find files
    let dirTrack = bam[0x00] || 18;
    let dirSector = bam[0x01] || 1;
    const visitedDir = new Set<string>();

    while (dirTrack > 0 && dirTrack <= 35) {
      const key = `${dirTrack}:${dirSector}`;
      if (visitedDir.has(key)) break;
      visitedDir.add(key);

      const sec = this.readSector(image, dirTrack, dirSector);
      if (!sec) break;

      for (let e = 0; e < 8; e++) {
        const off = e * 32;
        const rawType = sec[off + 0x02];
        if (rawType === 0) continue;

        const fTrack = sec[off + 0x03];
        const fSector = sec[off + 0x04];
        const fileName = this.petsciiToString(sec, off + 0x05, 16);

        // Trace file chain
        let curT = fTrack;
        let curS = fSector;
        const visitedChain = new Set<string>();

        while (curT > 0 && curT <= 35) {
          const sKey = `${curT}:${curS}`;
          if (visitedChain.has(sKey)) break;
          visitedChain.add(sKey);
          sectorOwnerMap.set(sKey, fileName);

          const chainSec = this.readSector(image, curT, curS);
          if (!chainSec) break;

          const nT = chainSec[0];
          const nS = chainSec[1];
          sectorLinkMap.set(sKey, { nextTrack: nT, nextSector: nS });
          if (nT === 0) break; // EOF
          curT = nT;
          curS = nS;
        }
      }

      dirTrack = sec[0x00];
      dirSector = sec[0x01];
    }

    // Process all 35 tracks
    for (let t = 1; t <= 35; t++) {
      const totalSec = this.sectorsPerTrack[t];
      const bamOff = 4 * t;
      const freeSecCount = bamOff < bam.length ? bam[bamOff] : 0;
      const b1 = bam[bamOff + 1] || 0;
      const b2 = bam[bamOff + 2] || 0;
      const b3 = bam[bamOff + 3] || 0;
      const bitmask = b1 | (b2 << 8) | (b3 << 16);

      const sectors: BAMSectorDetail[] = [];
      for (let s = 0; s < totalSec; s++) {
        const isBAMOrDir = t === 18;
        const isFree = (bitmask & (1 << s)) !== 0;
        const sKey = `${t}:${s}`;
        const owner = sectorOwnerMap.get(sKey);
        const links = sectorLinkMap.get(sKey);

        sectors.push({
          track: t,
          sector: s,
          isFree: isBAMOrDir ? (s > 1 && isFree) : isFree,
          isBAMOrDir,
          ownerFileName: isBAMOrDir ? (s === 0 ? "BAM HEADER" : `DIRECTORY (S#${s})`) : owner,
          nextTrack: links?.nextTrack,
          nextSector: links?.nextSector,
        });
      }

      tracks.push({
        track: t,
        totalSectors: totalSec,
        freeSectors: freeSecCount,
        sectors,
      });
    }

    return tracks;
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

  /**
   * Create a standard 35-track (174,848 bytes) 1541 .D64 disk image with BAM and PRG files
   */
  public static createD64(
    diskName = "C64 DISK",
    diskId = "2A",
    files: { name: string; data: Uint8Array; type?: "PRG" }[] = []
  ): Uint8Array {
    const image = new Uint8Array(174848); // 35 tracks standard 1541 disk

    // Initialize BAM on Track 18, Sector 0
    const bamOffset = this.getSectorOffset(18, 0);
    image[bamOffset + 0x00] = 18; // First directory track
    image[bamOffset + 0x01] = 1; // First directory sector
    image[bamOffset + 0x02] = 0x41; // DOS version 'A'
    image[bamOffset + 0x03] = 0x00;

    // Set free sectors for each track (1-35)
    for (let t = 1; t <= 35; t++) {
      const secCount = this.sectorsPerTrack[t];
      const entryOff = bamOffset + 4 * t;
      if (t === 18) {
        // Track 18 reserved for directory & BAM (sectors 0 and 1 used)
        image[entryOff] = Math.max(0, secCount - 2);
        image[entryOff + 1] = 0xfc; // Sectors 0 and 1 allocated
        image[entryOff + 2] = 0xff;
        image[entryOff + 3] = 0x07;
      } else {
        image[entryOff] = secCount;
        if (secCount === 21) {
          image[entryOff + 1] = 0xff;
          image[entryOff + 2] = 0xff;
          image[entryOff + 3] = 0x1f;
        } else if (secCount === 19) {
          image[entryOff + 1] = 0xff;
          image[entryOff + 2] = 0xff;
          image[entryOff + 3] = 0x07;
        } else if (secCount === 18) {
          image[entryOff + 1] = 0xff;
          image[entryOff + 2] = 0xff;
          image[entryOff + 3] = 0x03;
        } else {
          image[entryOff + 1] = 0xff;
          image[entryOff + 2] = 0xff;
          image[entryOff + 3] = 0x01;
        }
      }
    }

    // Disk Name at 0x90 (16 bytes padded with 0xA0)
    for (let i = 0; i < 16; i++) {
      image[bamOffset + 0x90 + i] = i < diskName.length ? diskName.charCodeAt(i) : 0xa0;
    }
    image[bamOffset + 0xa0] = 0xa0;
    image[bamOffset + 0xa1] = 0xa0;

    // Disk ID at 0xA2
    image[bamOffset + 0xa2] = diskId.charCodeAt(0) || 0x32;
    image[bamOffset + 0xa3] = diskId.charCodeAt(1) || 0x41;
    image[bamOffset + 0xa4] = 0xa0;
    image[bamOffset + 0xa5] = 0x32; // '2'
    image[bamOffset + 0xa6] = 0x41; // 'A'

    // Directory sector Track 18 Sector 1
    const dirOffset = this.getSectorOffset(18, 1);
    image[dirOffset + 0x00] = 0x00; // Next directory track (0 = last dir sector)
    image[dirOffset + 0x01] = 0xff; // Next directory sector (0xFF = last)

    let curAllocTrack = 1;
    let curAllocSector = 0;

    // Write files into directory and data sectors
    for (let fIdx = 0; fIdx < Math.min(files.length, 8); fIdx++) {
      const file = files[fIdx];
      const entryOff = dirOffset + fIdx * 32;

      // File header in directory:
      image[entryOff + 0x00] = 0x00;
      image[entryOff + 0x01] = 0x00;
      image[entryOff + 0x02] = 0x82; // PRG closed (0x80 | 0x02)
      image[entryOff + 0x03] = curAllocTrack; // First data track
      image[entryOff + 0x04] = curAllocSector; // First data sector

      // File name (16 bytes padded with 0xA0)
      const cleanName = file.name.replace(/\.[^.]+$/, "").toUpperCase();
      for (let i = 0; i < 16; i++) {
        image[entryOff + 0x05 + i] = i < cleanName.length ? cleanName.charCodeAt(i) : 0xa0;
      }

      // Write data sectors
      const fileData = file.data;
      const totalBlocks = Math.max(1, Math.ceil(fileData.length / 254));
      image[entryOff + 0x1e] = totalBlocks & 0xff;
      image[entryOff + 0x1f] = (totalBlocks >> 8) & 0xff;

      let dataPtr = 0;
      while (dataPtr < fileData.length) {
        const remaining = fileData.length - dataPtr;
        const chunkSize = Math.min(254, remaining);
        const isLast = dataPtr + chunkSize >= fileData.length;

        const secOffset = this.getSectorOffset(curAllocTrack, curAllocSector);
        if (secOffset < 0) break;

        // Allocate sector in BAM
        const bamTrackOff = bamOffset + 4 * curAllocTrack;
        if (image[bamTrackOff] > 0) image[bamTrackOff]--;

        if (isLast) {
          image[secOffset + 0] = 0x00; // Track 0 = EOF
          image[secOffset + 1] = chunkSize + 1; // Index of last valid byte + 1
          image.set(fileData.subarray(dataPtr, dataPtr + chunkSize), secOffset + 2);
          dataPtr += chunkSize;

          // Advance to next sector for next file
          curAllocSector++;
          if (curAllocSector >= this.sectorsPerTrack[curAllocTrack]) {
            curAllocSector = 0;
            curAllocTrack++;
            if (curAllocTrack === 18) curAllocTrack = 19;
          }
        } else {
          // Prepare next sector
          let nextTrack = curAllocTrack;
          let nextSec = curAllocSector + 1;
          if (nextSec >= this.sectorsPerTrack[nextTrack]) {
            nextSec = 0;
            nextTrack++;
            if (nextTrack === 18) nextTrack = 19;
          }

          image[secOffset + 0] = nextTrack;
          image[secOffset + 1] = nextSec;
          image.set(fileData.subarray(dataPtr, dataPtr + chunkSize), secOffset + 2);

          dataPtr += chunkSize;
          curAllocTrack = nextTrack;
          curAllocSector = nextSec;
        }
      }
    }

    return image;
  }
}
