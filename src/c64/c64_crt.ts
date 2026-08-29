/**
 * Commodore 64 Cartridge Container (.CRT) Parser
 * Decodes "C64 CARTRIDGE   " headers, chip packets (ROM banks, load addresses $8000/$A000/$E000),
 * and handles Generic (Type 0), Ocean Bank-Switched (Type 5), and EasyFlash (Type 32).
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
  cartridgeType: number; // 0 = Normal, 5 = Ocean, 32 = EasyFlash
  exromLine: boolean;
  gameLine: boolean;
  chips: CartridgeChip[];
  banks: Uint8Array[];
}

export class C64CRT {
  public static parse(data: Uint8Array): CartridgeImage | null {
    if (data.length < 64) return null;

    const signature = String.fromCharCode(...data.subarray(0, 16));
    if (!signature.startsWith("C64 CARTRIDGE")) return null;

    const headerLength = (data[16] << 24) | (data[17] << 16) | (data[18] << 8) | data[19];
    const cartridgeType = (data[22] << 8) | data[23];
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
    const banks: Uint8Array[] = [];

    let offset = headerLength;
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

      banks[bankNumber] = chipData;
      offset += packetLen;
    }

    return {
      name,
      cartridgeType,
      exromLine,
      gameLine,
      chips,
      banks,
    };
  }
}
