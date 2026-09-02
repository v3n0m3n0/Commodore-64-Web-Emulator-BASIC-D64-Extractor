/**
 * Multi-Archive & Retro Media Extractor (.ZIP, .GZ, .D64, .T64, .TAP, .CRT, .PRG, .P00, .BAS, .SID)
 * Unzips archives in memory using fflate, discovers embedded C64 disks/tapes/cartridges/programs/docs,
 * and allows instant loading into the emulator.
 */

import * as fflate from "fflate";
import { VideoStandard } from "./c64_vic2";
import { C64StandardDetector } from "./c64_standard_detector";

export type C64MediaType =
  | "D64"
  | "T64"
  | "TAP"
  | "CRT"
  | "PRG"
  | "P00"
  | "BAS"
  | "SID"
  | "DOC"
  | "IMAGE"
  | "UNKNOWN";

export interface ExtractedMediaFile {
  name: string;
  extension: string;
  size: number;
  data: Uint8Array;
  type: C64MediaType;
  loadAddress?: number;
  description?: string;
  detectedStandard?: VideoStandard;
}

export class C64ArchiveManager {
  // Check if raw byte buffer is a ZIP archive by magic header (PK\x03\x04 or PK\x05\x06)
  public static isZipData(data: Uint8Array): boolean {
    if (!data || data.length < 4) return false;
    return (
      (data[0] === 0x50 && data[1] === 0x4b && data[2] === 0x03 && data[3] === 0x04) ||
      (data[0] === 0x50 && data[1] === 0x4b && data[2] === 0x05 && data[3] === 0x06) ||
      (data[0] === 0x50 && data[1] === 0x4b && data[2] === 0x07 && data[3] === 0x08)
    );
  }

  // Check if raw byte buffer is a GZIP archive by magic header (\x1F\x8B)
  public static isGzipData(data: Uint8Array): boolean {
    if (!data || data.length < 2) return false;
    return data[0] === 0x1f && data[1] === 0x8b;
  }

  // Check if media type is runnable/mountable on C64 hardware
  public static isRunnableMedia(type: C64MediaType): boolean {
    return (
      type === "D64" ||
      type === "T64" ||
      type === "TAP" ||
      type === "CRT" ||
      type === "PRG" ||
      type === "P00" ||
      type === "BAS" ||
      type === "SID"
    );
  }

  // Filter list of extracted files to only runnable/mountable media
  public static getRunnableFiles(files: ExtractedMediaFile[]): ExtractedMediaFile[] {
    return files.filter((f) => this.isRunnableMedia(f.type));
  }

  // Detect and group multi-cassette tape sets (e.g. Side 1, Side 2)
  public static findTapeSets(files: ExtractedMediaFile[]): { baseName: string; tapes: ExtractedMediaFile[] }[] {
    const tapFiles = files.filter((f) => f.type === "TAP");
    if (tapFiles.length === 0) return [];

    const groups: { [baseName: string]: ExtractedMediaFile[] } = {};
    for (const f of tapFiles) {
      const base = f.name
        .replace(/\.[^.]+$/, "")
        .replace(/\((Side|Tape|Cassette|Part)[^\)]*\)/gi, "")
        .replace(/[-_]\s*(Side|Tape|Cassette|Part)\s*[0-9A-Za-z]+/gi, "")
        .trim();
      if (!groups[base]) groups[base] = [];
      groups[base].push(f);
    }

    const result: { baseName: string; tapes: ExtractedMediaFile[] }[] = [];
    for (const baseName in groups) {
      if (groups[baseName].length > 1) {
        // Sort sides (Side 1 before Side 2, Side A before Side B)
        groups[baseName].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        result.push({ baseName, tapes: groups[baseName] });
      }
    }
    return result;
  }

  // Process raw binary buffer and extract archive if packed
  public static async processBinaryData(data: Uint8Array, fileName: string): Promise<ExtractedMediaFile[]> {
    const ext = this.getFileExtension(fileName).toUpperCase();

    if (ext === "ZIP" || this.isZipData(data)) {
      return this.unzipArchive(data);
    } else if (ext === "GZ" || this.isGzipData(data)) {
      return this.gunzipFile(data, fileName);
    } else {
      const type = this.detectMediaType(ext, data);
      const loadAddress = (type === "PRG" || type === "P00") && data.length >= 2
        ? (type === "P00" && data.length >= 28 ? data[26] | (data[27] << 8) : data[0] | (data[1] << 8))
        : undefined;
      const detectedStandard = C64StandardDetector.detect(fileName, data, type);

      return [
        {
          name: fileName,
          extension: ext,
          size: data.length,
          data,
          type,
          loadAddress,
          detectedStandard,
        },
      ];
    }
  }

  // Parse an uploaded ArrayBuffer or File
  public static async processUploadedFile(file: File): Promise<ExtractedMediaFile[]> {
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);
    return this.processBinaryData(data, file.name);
  }

  // Fetch and decompress retro media from external URL or HTTP mirror
  public static async loadFromUrl(url: string): Promise<ExtractedMediaFile[]> {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status} when fetching external retro media from ${url}`);
    }
    const buffer = await res.arrayBuffer();
    const data = new Uint8Array(buffer);
    const urlClean = url.split("?")[0].split("#")[0];
    const fileName = urlClean.split("/").pop() || "downloaded.bin";
    return this.processBinaryData(data, fileName);
  }

  // Decompress ZIP archive
  public static unzipArchive(zipData: Uint8Array): Promise<ExtractedMediaFile[]> {
    return new Promise((resolve, reject) => {
      fflate.unzip(zipData, (err, unzipped) => {
        if (err) {
          reject(err);
          return;
        }

        const list: ExtractedMediaFile[] = [];

        for (const filePath in unzipped) {
          if (filePath.endsWith("/") || filePath.endsWith("\\")) {
            continue; // Skip directories
          }

          const fileBytes = unzipped[filePath];
          if (!fileBytes || fileBytes.length === 0) continue;

          // Strip macOS __MACOSX / .DS_Store garbage
          if (filePath.includes("__MACOSX") || filePath.includes(".DS_Store")) {
            continue;
          }

          const normalizedPath = filePath.replace(/\\/g, "/");
          const baseName = normalizedPath.split("/").pop() || normalizedPath;
          const ext = this.getFileExtension(baseName).toUpperCase();
          const type = this.detectMediaType(ext, fileBytes);

          const loadAddress = (type === "PRG" || type === "P00") && fileBytes.length >= 2
            ? (type === "P00" && fileBytes.length >= 28 ? fileBytes[26] | (fileBytes[27] << 8) : fileBytes[0] | (fileBytes[1] << 8))
            : undefined;

          const detectedStandard = C64StandardDetector.detect(baseName, fileBytes, type);

          list.push({
            name: baseName,
            extension: ext,
            size: fileBytes.length,
            data: fileBytes,
            type,
            loadAddress,
            detectedStandard,
          });
        }

        // Sort files: Primary runnable games/disks first, companion docs/images at bottom
        list.sort((a, b) => {
          const aRunnable = C64ArchiveManager.isRunnableMedia(a.type) ? 1 : 0;
          const bRunnable = C64ArchiveManager.isRunnableMedia(b.type) ? 1 : 0;
          if (aRunnable !== bRunnable) return bRunnable - aRunnable;
          return a.name.localeCompare(b.name);
        });

        resolve(list);
      });
    });
  }

  // Decompress GZIP single file
  public static gunzipFile(gzData: Uint8Array, origFileName: string): Promise<ExtractedMediaFile[]> {
    return new Promise((resolve, reject) => {
      fflate.gunzip(gzData, (err, uncompressed) => {
        if (err) {
          reject(err);
          return;
        }

        const baseName = origFileName.replace(/\.gz$/i, "");
        const ext = this.getFileExtension(baseName).toUpperCase();
        const type = this.detectMediaType(ext, uncompressed);

        const loadAddress = (type === "PRG" || type === "P00") && uncompressed.length >= 2
          ? (type === "P00" && uncompressed.length >= 28 ? uncompressed[26] | (uncompressed[27] << 8) : uncompressed[0] | (uncompressed[1] << 8))
          : undefined;

        const detectedStandard = C64StandardDetector.detect(baseName, uncompressed, type);

        resolve([
          {
            name: baseName,
            extension: ext,
            size: uncompressed.length,
            data: uncompressed,
            type,
            loadAddress,
            detectedStandard,
          },
        ]);
      });
    });
  }

  // Helper to extract file extension
  public static getFileExtension(filename: string): string {
    const parts = filename.split(".");
    return parts.length > 1 ? parts.pop() || "" : "";
  }

  // Detect media type from extension and binary magic bytes
  public static detectMediaType(ext: string, data: Uint8Array): C64MediaType {
    // 1. Magic bytes verification first (highest reliability)
    if (data.length >= 4) {
      const sig4 = String.fromCharCode(...data.subarray(0, 4));
      if (sig4 === "PSID" || sig4 === "RSID") return "SID";
      if (sig4 === "C64 ") return "CRT";
    }

    if (data.length >= 16) {
      const sig16 = String.fromCharCode(...data.subarray(0, 16));
      if (sig16.startsWith("C64 CARTRIDGE")) return "CRT";
      if (sig16.startsWith("C64-TAPE-RAW")) return "TAP";
      if (sig16.startsWith("C64 tape") || sig16.startsWith("C64S tape")) return "T64";
      if (sig16.startsWith("C64File")) return "P00";
    }

    // 2. Exact extension checks for C64 hardware formats
    if (ext === "D64" || ext === "D71" || ext === "D81" || ext === "G64") return "D64";
    if (ext === "T64") return "T64";
    if (ext === "TAP") return "TAP";
    if (ext === "CRT") return "CRT";
    if (ext === "PRG" || ext === "P00" || ext === "C64") return "PRG";
    if (ext === "SID" || ext === "MUS") return "SID";
    if (ext === "BAS") return "BAS";

    // 3. Companion documentation & text files
    if (
      ext === "TXT" ||
      ext === "NFO" ||
      ext === "DIZ" ||
      ext === "DOC" ||
      ext === "PDF" ||
      ext === "MD" ||
      ext === "ME" ||
      ext === "1ST" ||
      ext === "HTM" ||
      ext === "HTML"
    ) {
      // If it's a .TXT file, check if it looks like BASIC program source (line numbers like '10 PRINT')
      if (ext === "TXT" && data.length > 0 && data.length < 65536) {
        const textSample = new TextDecoder().decode(data.subarray(0, Math.min(200, data.length)));
        if (/^\s*\d+\s+[A-Z]/m.test(textSample)) {
          return "BAS";
        }
      }
      return "DOC";
    }

    // 4. Companion artwork & screenshots
    if (
      ext === "PNG" ||
      ext === "JPG" ||
      ext === "JPEG" ||
      ext === "GIF" ||
      ext === "BMP" ||
      ext === "WEBP"
    ) {
      return "IMAGE";
    }

    // 5. Structural byte-size check for 1541 disk images
    if (
      data.length === 174848 || // 35 tracks, standard D64
      data.length === 175531 || // 35 tracks + error info
      data.length === 196608 || // 40 tracks
      data.length === 197376 || // 40 tracks + error info
      data.length === 205312 || // 42 tracks
      data.length === 819200    // D81 (3.5" 1581 disk)
    ) {
      return "D64";
    }

    // 6. Plausible PRG binary heuristic:
    // If extension is unknown or BIN, but length > 2 and load address is a standard C64 RAM range
    if (data.length > 2) {
      const loadAddr = data[0] | (data[1] << 8);
      if (loadAddr >= 0x0200 && loadAddr <= 0xffff && data.length < 65536) {
        return "PRG";
      }
    }

    return "UNKNOWN";
  }
}
