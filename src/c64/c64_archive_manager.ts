/**
 * Multi-Archive & Retro Media Extractor (.ZIP, .GZ, .D64, .T64, .TAP, .CRT, .PRG, .P00, .BAS)
 * Unzips archives in memory using fflate, discovers embedded C64 disks/tapes/cartridges/programs,
 * and allows instant loading into the emulator.
 */

import * as fflate from "fflate";

export interface ExtractedMediaFile {
  name: string;
  extension: string;
  size: number;
  data: Uint8Array;
  type: "D64" | "T64" | "TAP" | "CRT" | "PRG" | "P00" | "BAS" | "UNKNOWN";
}

export class C64ArchiveManager {
  // Parse an uploaded ArrayBuffer or File
  public static async processUploadedFile(file: File): Promise<ExtractedMediaFile[]> {
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);
    const fileName = file.name;
    const ext = this.getFileExtension(fileName).toUpperCase();

    if (ext === "ZIP") {
      return this.unzipArchive(data);
    } else if (ext === "GZ") {
      return this.gunzipFile(data, fileName);
    } else {
      const type = this.detectMediaType(ext, data);
      return [
        {
          name: fileName,
          extension: ext,
          size: data.length,
          data,
          type,
        },
      ];
    }
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
        for (const [rawPath, fileBytes] of Object.entries(unzipped)) {
          // Ignore __MACOSX and hidden directory files
          if (rawPath.startsWith("__MACOSX") || rawPath.includes("/.") || rawPath.endsWith("/")) {
            continue;
          }

          const baseName = rawPath.split("/").pop() || rawPath;
          const ext = this.getFileExtension(baseName).toUpperCase();
          const type = this.detectMediaType(ext, fileBytes);

          list.push({
            name: baseName,
            extension: ext,
            size: fileBytes.length,
            data: fileBytes,
            type,
          });
        }

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

        resolve([
          {
            name: baseName,
            extension: ext,
            size: uncompressed.length,
            data: uncompressed,
            type,
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
  public static detectMediaType(ext: string, data: Uint8Array): ExtractedMediaFile["type"] {
    if (ext === "D64") return "D64";
    if (ext === "T64") return "T64";
    if (ext === "TAP") return "TAP";
    if (ext === "CRT") return "CRT";
    if (ext === "PRG") return "PRG";
    if (ext === "P00") return "P00";
    if (ext === "BAS" || ext === "TXT") return "BAS";

    // Magic bytes fallback
    if (data.length >= 16) {
      const sig16 = String.fromCharCode(...data.subarray(0, 16));
      if (sig16.startsWith("C64 CARTRIDGE")) return "CRT";
      if (sig16.startsWith("C64-TAPE-RAW")) return "TAP";
      if (sig16.startsWith("C64 tape") || sig16.startsWith("C64S tape")) return "T64";
      if (sig16.startsWith("C64File")) return "P00";
    }

    if (data.length === 174848 || data.length === 175531 || data.length === 196608) {
      return "D64";
    }

    return "PRG";
  }
}
