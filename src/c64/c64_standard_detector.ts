/**
 * Commodore 64 Video Standard Detector (PAL 50.125 Hz vs NTSC 59.826 Hz)
 *
 * Implements multi-tier heuristics for automatic video standard detection:
 * 1. Binary headers: PSID / RSID video flags ($76-$77), CRT cartridge types.
 * 2. Standard TOSEC / GameBase64 / Scene region tags in filenames/paths.
 * 3. D64 BAM (Track 18, Sector 0) disk name and T64 tape title patterns.
 * 4. Runtime fallback default (PAL 50.125 Hz).
 */

import { VideoStandard } from "./c64_vic2";

export class C64StandardDetector {
  /**
   * Detect video standard based on file name/path, raw binary data, and optional media type.
   */
  public static detect(
    fileName?: string,
    data?: Uint8Array,
    mediaType?: string
  ): VideoStandard {
    // 1. Tier 1: Binary Header Analysis (Highest confidence)
    if (data && data.length >= 4) {
      // PSID / RSID Sound files
      const sig4 = String.fromCharCode(data[0], data[1], data[2], data[3]);
      if ((sig4 === "PSID" || sig4 === "RSID") && data.length >= 0x78) {
        const flags = (data[0x76] << 8) | data[0x77];
        const videoBits = (flags >> 2) & 0x03; // Bits 2-3: 01 = PAL, 10 = NTSC, 11 = Dual
        if (videoBits === 2) {
          return VideoStandard.NTSC;
        } else if (videoBits === 1 || videoBits === 3) {
          return VideoStandard.PAL;
        }
      }

      // CRT Cartridge binary headers
      if (sig4 === "C64 " && data.length >= 0x40) {
        const cartName = String.fromCharCode(...data.subarray(0x20, 0x40)).trim();
        if (this.matchesNTSCTags(cartName)) {
          return VideoStandard.NTSC;
        }
        if (this.matchesPALTags(cartName)) {
          return VideoStandard.PAL;
        }
      }
    }

    // 2. Tier 2: Filename & Path Heuristics (TOSEC / GameBase64 / No-Intro conventions)
    if (fileName && fileName.length > 0) {
      const cleanName = fileName.toLowerCase();

      // Explicit Polish / European Classics paths are PAL
      if (
        cleanName.includes("polish_classics") ||
        cleanName.includes("polskie_gry") ||
        cleanName.includes("polish")
      ) {
        return VideoStandard.PAL;
      }

      // Check NTSC patterns first (NTSC, USA, Canada, Japan, (U), [NTSC])
      if (this.matchesNTSCTags(cleanName)) {
        return VideoStandard.NTSC;
      }

      // Check PAL patterns (PAL, Europe, Germany, Poland, UK, France, (E), [PAL])
      if (this.matchesPALTags(cleanName)) {
        return VideoStandard.PAL;
      }
    }

    // 3. Tier 3: D64 BAM Disk Name / Header inspection
    if (data && (mediaType === "D64" || data.length === 174848 || data.length === 175531)) {
      const standardFromD64 = this.detectFromD64BAM(data);
      if (standardFromD64 !== null) {
        return standardFromD64;
      }
    }

    // 4. Default standard for Commodore 64 European/Home market
    return VideoStandard.PAL;
  }

  /**
   * Check if a string contains typical NTSC region or standard markers.
   */
  public static matchesNTSCTags(text: string): boolean {
    const s = text.toLowerCase();
    // Match explicit NTSC tags
    if (/\bntsc\b/i.test(s) || /\[ntsc\]/i.test(s) || /\(ntsc\)/i.test(s)) {
      // Guard against dual PAL/NTSC tags like (PAL-NTSC) or (PAL/NTSC)
      if (!/pal[- /_]ntsc/i.test(s) && !/ntsc[- /_]pal/i.test(s)) {
        return true;
      }
    }

    // Match USA/US/Canada/Japan regional tags
    if (
      /\(usa?\)/i.test(s) ||
      /\[usa?\]/i.test(s) ||
      /\(u\)/i.test(s) ||
      /\[u\]/i.test(s) ||
      /\(us-ca\)/i.test(s) ||
      /\(canada\)/i.test(s) ||
      /\(japan\)/i.test(s) ||
      /\bntsc-fix\b/i.test(s) ||
      /\bntsc-only\b/i.test(s)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if a string contains typical PAL region or standard markers.
   */
  public static matchesPALTags(text: string): boolean {
    const s = text.toLowerCase();
    if (
      /\bpal\b/i.test(s) ||
      /\[pal\]/i.test(s) ||
      /\(pal\)/i.test(s) ||
      /\(europe\)/i.test(s) ||
      /\[europe\]/i.test(s) ||
      /\(eur?\)/i.test(s) ||
      /\[eur?\]/i.test(s) ||
      /\(e\)/i.test(s) ||
      /\[e\]/i.test(s) ||
      /\(germany\)/i.test(s) ||
      /\(poland\)/i.test(s) ||
      /\(uk\)/i.test(s) ||
      /\(france\)/i.test(s) ||
      /\(italy\)/i.test(s) ||
      /\(sweden\)/i.test(s) ||
      /\(australia\)/i.test(s) ||
      /\(pal-ntsc\)/i.test(s) ||
      /\(world\)/i.test(s) ||
      /\(w\)/i.test(s)
    ) {
      return true;
    }
    return false;
  }

  /**
   * Inspect Track 18, Sector 0 BAM in D64 image for disk title indicators.
   */
  private static detectFromD64BAM(data: Uint8Array): VideoStandard | null {
    // Standard 35-track D64: Track 18 offset = (17 * 21) * 256 = 357 * 256 = 91392 (0x16500)
    const bamOffset = 0x16500;
    if (data.length > bamOffset + 0xa5) {
      let diskName = "";
      for (let i = 0; i < 16; i++) {
        const c = data[bamOffset + 0x90 + i];
        if (c !== 0xa0 && c >= 32 && c <= 126) {
          diskName += String.fromCharCode(c);
        }
      }
      if (diskName.length > 0) {
        if (this.matchesNTSCTags(diskName)) return VideoStandard.NTSC;
        if (this.matchesPALTags(diskName)) return VideoStandard.PAL;
      }
    }
    return null;
  }
}
