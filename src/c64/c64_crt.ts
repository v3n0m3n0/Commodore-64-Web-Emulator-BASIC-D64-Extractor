/**
 * Commodore 64 Cartridge Container (.CRT) Parser & Hardware Bank Dispatcher
 * Based on VICE CRT Specification (v1.0 & v2.0)
 * Supports:
 *   - Type 0: Standard Generic (8KB / 16KB / Ultimax)
 *   - Type 1: Action Replay
 *   - Type 2: KCS Power Cartridge
 *   - Type 3: The Final Cartridge III
 *   - Type 4: Simons' BASIC
 *   - Type 5: Ocean Bank-Switched (128KB - 512KB)
 *   - Type 19: Magic Desk (Up to 1MB ROM)
 *   - Type 26: Zaxxon / Super Zaxxon (Ultimax)
 *   - Type 32: EasyFlash (1MB Flash + 256B RAM)
 */

export interface CartridgeChip {
  chipType: number; // 0 = ROM, 1 = RAM, 2 = FlashROM
  bankNumber: number;
  loadAddress: number;
  romSize: number;
  data: Uint8Array;
}

export interface CartridgeImage {
  name: string;
  cartridgeType: number;
  typeName: string;
  version: number;
  exromLine: boolean; // Active Low flag in hardware (1 in CRT header = active low pulled down)
  gameLine: boolean;  // Active Low flag in hardware (1 in CRT header = active low pulled down)
  isUltimax: boolean;
  is16k: boolean;
  is8k: boolean;
  chips: CartridgeChip[];
  // Banks indexed by bank number
  romL: Map<number, Uint8Array>; // 8KB at $8000
  romH: Map<number, Uint8Array>; // 8KB at $A000 or $E000
  banks: Uint8Array[]; // Flat list of bank chunks
  totalSize: number;
}

export const CRT_HARDWARE_NAMES: Record<number, string> = {
  0: "Generic (8KB / 16KB / Ultimax)",
  1: "Action Replay",
  2: "KCS Power Cartridge",
  3: "The Final Cartridge III",
  4: "Simons' BASIC",
  5: "Ocean (Bank-Switched 128KB-512KB)",
  6: "Expert Cartridge",
  7: "Fun Play / Power Play",
  8: "Super Games Cartridge",
  9: "Atomic / Nordic Power",
  10: "Epyx FastLoad",
  11: "Westermann Learning",
  12: "Rex Utility",
  13: "Final Cartridge I",
  14: "Magic Formel",
  15: "C64 Game System (GS)",
  16: "WarpSpeed",
  17: "Dinamic",
  18: "Zaxxon (Standard)",
  19: "Magic Desk (Up to 1MB)",
  20: "Super Snapshot V5",
  21: "Comal 80",
  22: "Structured BASIC",
  23: "Ross Cartridge",
  24: "Dela EP64",
  25: "Dela EP7x8",
  26: "Zaxxon / Super Zaxxon",
  27: "Mach 5",
  28: "Pagefox",
  29: "Kingsoft",
  30: "Silverrock 128KB",
  31: "RGCD 64KB",
  32: "EasyFlash (1MB Flash + RAM)",
  33: "Mega-Cart",
  34: "Bank-Switched 128KB",
  35: "Super Explode V5.0",
  45: "GMod2 (SPI Flash)",
  48: "Kung Fu Flash",
};

export class C64CRT {
  public static parse(data: Uint8Array): CartridgeImage | null {
    if (data.length < 64) return null;

    const signature = String.fromCharCode(...data.subarray(0, 16));
    if (!signature.startsWith("C64 CARTRIDGE")) return null;

    const headerLength = (data[16] << 24) | (data[17] << 16) | (data[18] << 8) | data[19];
    const version = (data[20] << 8) | data[21];
    const cartridgeType = (data[22] << 8) | data[23];
    // In CRT header: 0 = inactive (high), 1 = active (low)
    const exromLine = data[24] !== 0;
    const gameLine = data[25] !== 0;

    let name = "";
    for (let i = 0x20; i < 0x40; i++) {
      const b = data[i];
      if (b === 0) break;
      name += String.fromCharCode(b);
    }
    name = name.trim() || "CARTRIDGE";

    const chips: CartridgeChip[] = [];
    const romL = new Map<number, Uint8Array>();
    const romH = new Map<number, Uint8Array>();
    const banks: Uint8Array[] = [];
    let totalSize = 0;

    let offset = headerLength >= 64 ? headerLength : 64;
    while (offset + 16 <= data.length) {
      const chipSig = String.fromCharCode(...data.subarray(offset, offset + 4));
      if (chipSig !== "CHIP") break;

      const packetLen = (data[offset + 4] << 24) | (data[offset + 5] << 16) | (data[offset + 6] << 8) | data[offset + 7];
      const chipType = (data[offset + 8] << 8) | data[offset + 9];
      const bankNumber = (data[offset + 10] << 8) | data[offset + 11];
      const loadAddress = (data[offset + 12] << 8) | data[offset + 13];
      const romSize = (data[offset + 14] << 8) | data[offset + 15];

      const chipData = data.subarray(offset + 16, offset + 16 + romSize);
      chips.push({
        chipType,
        bankNumber,
        loadAddress,
        romSize,
        data: chipData,
      });

      totalSize += romSize;

      // Store in bank map based on load address
      if (loadAddress === 0x8000) {
        if (romSize === 0x4000) {
          // 16KB chip: first 8KB is ROML, second 8KB is ROMH
          romL.set(bankNumber, chipData.subarray(0, 0x2000));
          romH.set(bankNumber, chipData.subarray(0x2000, 0x4000));
        } else {
          romL.set(bankNumber, chipData);
        }
      } else if (loadAddress === 0xa000 || loadAddress === 0xe000) {
        romH.set(bankNumber, chipData);
      }

      banks[bankNumber] = chipData;
      offset += packetLen > 0 ? packetLen : 16 + romSize;
    }

    // Default fallback if map was empty but chips exist
    if (romL.size === 0 && chips.length > 0) {
      romL.set(0, chips[0].data.subarray(0, Math.min(0x2000, chips[0].data.length)));
      if (chips.length > 1) {
        romH.set(0, chips[1].data.subarray(0, Math.min(0x2000, chips[1].data.length)));
      }
    }

    // Ultimax is active when GAME is active (low) and EXROM is inactive (high)
    const isUltimax = gameLine && !exromLine;
    const is16k = gameLine && exromLine;
    const is8k = !gameLine && exromLine;

    const typeName = CRT_HARDWARE_NAMES[cartridgeType] || `Custom Type ${cartridgeType}`;

    return {
      name,
      cartridgeType,
      typeName,
      version,
      exromLine,
      gameLine,
      isUltimax,
      is16k,
      is8k,
      chips,
      romL,
      romH,
      banks,
      totalSize,
    };
  }

  // Create a minimal synthetic 8KB/16KB cartridge image from raw binary
  public static createGenericCartridge(
    name: string,
    romBytes: Uint8Array,
    loadAddress = 0x8000
  ): CartridgeImage {
    const romL = new Map<number, Uint8Array>();
    const romH = new Map<number, Uint8Array>();
    const is16k = romBytes.length > 0x2000;

    if (loadAddress === 0x8000) {
      romL.set(0, romBytes.subarray(0, Math.min(0x2000, romBytes.length)));
      if (is16k) {
        romH.set(0, romBytes.subarray(0x2000, Math.min(0x4000, romBytes.length)));
      }
    } else {
      romH.set(0, romBytes.subarray(0, Math.min(0x2000, romBytes.length)));
    }

    return {
      name,
      cartridgeType: 0,
      typeName: is16k ? "Generic 16KB" : "Generic 8KB",
      version: 0x0100,
      exromLine: true,
      gameLine: is16k,
      isUltimax: false,
      is16k,
      is8k: !is16k,
      chips: [
        {
          chipType: 0,
          bankNumber: 0,
          loadAddress,
          romSize: romBytes.length,
          data: romBytes,
        },
      ],
      romL,
      romH,
      banks: [romBytes],
      totalSize: romBytes.length,
    };
  }
}

