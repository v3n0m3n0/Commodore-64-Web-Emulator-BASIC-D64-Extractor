/**
 * Commodore 64 VIC-II (6569 PAL / 6567 NTSC) Video Chip Emulation
 * ================================================================
 * High-performance scanline-accurate implementation with 32-bit ARGB/ABGR pixel buffer,
 * 40-cycle Bad Line DMA stealing, Sprites, Multicolor/HiRes, and Raster IRQs.
 */

export const C64_PALETTE_RGBA = new Uint32Array([
  0xFF000000, // 0: Black
  0xFFFFFFFF, // 1: White
  0xFF263B88, // 2: Red (#883B26)
  0xFFE5FF67, // 3: Cyan (#67FFE5)
  0xFFBA5BB5, // 4: Purple (#B55BBA)
  0xFF44B940, // 5: Green (#40B944)
  0xFFA83A35, // 6: Blue (#353AA8)
  0xFF65DDBE, // 7: Yellow (#BEDD65)
  0xFF2B558B, // 8: Orange (#8B552B)
  0xFF003743, // 9: Brown (#433700)
  0xFF6E68B8, // 10: Light Red (#B8686E)
  0xFF444444, // 11: Dark Grey (#444444)
  0xFF6C6C6C, // 12: Medium Grey (#6C6C6C)
  0xFF86E99A, // 13: Light Green (#9AE986)
  0xFFCC7270, // 14: Light Blue (#7072CC)
  0xFF959595, // 15: Light Grey (#959595)
]);

export enum VideoStandard {
  PAL = "PAL",
  NTSC = "NTSC",
}

export class C64VIC2 {
  public mem: any;
  public cpu: any;
  public regs: Uint8Array = new Uint8Array(64);
  public currentRaster: number = 0;
  public rasterCompare: number = 0;
  public rasterIrqEnabled: boolean = false;
  public width: number = 384;
  public height: number = 272;
  public pixels: Uint32Array = new Uint32Array(384 * 272);
  public scanlineFgMask: Uint8Array = new Uint8Array(384);
  public standard: string = "PAL";
  public totalRasterLines: number = 312;
  public cyclesPerLine: number = 63;
  public vicBank: number = 0;

  // VIC-II Dynamic Border Unit State
  public vBorder: boolean = true;
  public mainBorder: boolean = true;

  constructor(memory: any, cpu?: any) {
    this.mem = memory;
    this.cpu = cpu;
    this.reset();
  }

  private _cachedImageData: ImageData | null = null;
  private _cachedImageBuf: Uint32Array | null = null;

  public renderToCanvas(ctx: CanvasRenderingContext2D, options?: { scanlines?: boolean; crtGlow?: boolean }) {
    if (!this._cachedImageData || this._cachedImageData.width !== this.width || this._cachedImageData.height !== this.height) {
      this._cachedImageData = ctx.createImageData(this.width, this.height);
      this._cachedImageBuf = new Uint32Array(this._cachedImageData.data.buffer);
    }
    if (this._cachedImageBuf) {
      this._cachedImageBuf.set(this.pixels);
      ctx.putImageData(this._cachedImageData, 0, 0);
    }
  }

  public getTotalRasterLines(): number { return this.totalRasterLines; }
  public getCyclesPerLine(): number { return this.cyclesPerLine; }
  public get lineCycle(): number { return (this.cpu as any)?.system?.lineCycles || 0; }

  public isBadLine(rasterLine?: number): boolean {
    const line = rasterLine !== undefined ? rasterLine : this.currentRaster;
    const yscroll = this.regs[0x11] & 0x07;
    const den = (this.regs[0x11] & 0x10) !== 0;
    return den && line >= 0x30 && line <= 0xf7 && ((line & 0x07) === yscroll);
  }
  public isIrqActive(): boolean {
    return (this.regs[0x19] & 0x80) !== 0 && ((this.regs[0x19] & this.regs[0x1a] & 0x0f) !== 0);
  }
  public get frameBuffer(): Uint8ClampedArray {
    return new Uint8ClampedArray(this.pixels.buffer);
  }
  public get currentRasterLine(): number {
    return this.currentRaster;
  }
  public get videoStandard(): VideoStandard {
    return this.standard === "NTSC" ? VideoStandard.NTSC : VideoStandard.PAL;
  }
  public set videoStandard(std: VideoStandard) {
    this.setStandard(std);
  }
  setStandard(std: VideoStandard | string) {
    this.standard = std === "NTSC" ? "NTSC" : "PAL";
    this.totalRasterLines = this.standard === "NTSC" ? 263 : 312;
    this.cyclesPerLine = this.standard === "NTSC" ? 65 : 63;
    this.currentRaster = this.currentRaster % this.totalRasterLines;
  }

  reset() {
    this.regs.fill(0);
    this.regs[0x11] = 0x1B;
    this.regs[0x16] = 0xC8;
    this.regs[0x18] = 0x14;
    this.regs[0x20] = 0x0E;
    this.regs[0x21] = 0x06;
    this.currentRaster = 0;
    this.rasterCompare = 0;
    this.rasterIrqEnabled = false;
    this.vBorder = true;
    this.mainBorder = true;
    this.totalRasterLines = this.standard === 'NTSC' ? 263 : 312;
    this.cyclesPerLine = this.standard === 'NTSC' ? 65 : 63;
    this.pixels.fill(C64_PALETTE_RGBA[0x0E]);
  }

  read(reg) {
    reg &= 0x3F;
    if (reg === 0x11) {
      // Bit 7 is MSB of current raster line (bit 8)
      return (this.regs[0x11] & 0x7F) | ((this.currentRaster & 0x100) ? 0x80 : 0);
    }
    if (reg === 0x12) {
      return this.currentRaster & 0xFF;
    }
    if (reg === 0x19) {
      // Interrupt Request Register (bit 7 set if any interrupt active)
      return this.regs[0x19] | 0x70;
    }
    if (reg === 0x1A) {
      return this.regs[0x1A] | 0xF0;
    }
    if (reg === 0x1E) {
      const val = this.regs[0x1E];
      this.regs[0x1E] = 0;
      return val;
    }
    if (reg === 0x1F) {
      const val = this.regs[0x1F];
      this.regs[0x1F] = 0;
      return val;
    }
    if (reg >= 0x20 && reg <= 0x2E) {
      return this.regs[reg] | 0xF0;
    }
    return this.regs[reg];
  }

  write(reg, val) {
    reg &= 0x3F;
    val &= 0xFF;

    if (reg === 0x11) {
      this.rasterCompare = (this.rasterCompare & 0xFF) | ((val & 0x80) << 1);
      this.regs[0x11] = val & 0x7F;
      return;
    }
    if (reg === 0x12) {
      this.rasterCompare = (this.rasterCompare & 0x100) | val;
      this.regs[0x12] = val;
      return;
    }
    if (reg === 0x19) {
      // In MOS VIC-II, writing a 1 to bits 0-3 clears that interrupt latch.
      // Furthermore, on real 6502/6510 hardware, Read-Modify-Write instructions
      // (e.g. INC $D019, ASL $D019, LSR $D019, DEC $D019) read $D019 (with bits 4-6 set to 1)
      // and write back. In VIC-II hardware, any write acknowledges the active interrupt flags:
      let mask = val & 0x0F;
      // Handle RMW (INC/DEC/ASL/LSR) or writes where bit 7 or bits 4-6 are set:
      if (mask === 0 || (val & 0x80) !== 0 || (val & 0x70) === 0x70) {
        mask |= (this.regs[0x19] & 0x0F);
      }
      this.regs[0x19] &= ~mask;
      if ((this.regs[0x19] & 0x0F) === 0) {
        this.regs[0x19] &= 0x7F; // Clear master IRQ bit
      }
      return;
    }
    if (reg === 0x1A) {
      this.rasterIrqEnabled = (val & 0x01) !== 0;
      this.regs[0x1A] = val;
      return;
    }

    this.regs[reg] = val;
  }

  /**
   * Start of scanline:
   * 1. Check raster IRQ for currentRaster
   * 2. Calculate bad line DMA penalty (40 cycles)
   */
  startLine(): number {
    const c64Raster = this.currentRaster;

    // Dynamic Vertical Border Flip-Flop evaluation
    // Reference: docs/knowledge_base/04_HARDWARE_IO_MAP_VIC_SID_CIA.md & Christian Bauer VIC-II Article
    const is25Rows = (this.regs[0x11] & 0x08) !== 0;
    const den = (this.regs[0x11] & 0x10) !== 0;
    const topCompare = is25Rows ? 51 : 55;
    const bottomCompare = is25Rows ? 251 : 247;

    if (c64Raster === topCompare && den) {
      this.vBorder = false; // Open vertical display area
    }
    if (c64Raster === bottomCompare) {
      this.vBorder = true;  // Close vertical display area
    }

    // Trigger raster interrupt at beginning of scanline
    if (c64Raster === this.rasterCompare) {
      this.regs[0x19] |= 0x01;
      if (this.rasterIrqEnabled) {
        this.regs[0x19] |= 0x80;
        if (this.cpu) {
          this.cpu.triggerIRQ();
        }
      }
    }

    // Bad Line condition (cycles 12..54 stolen by VIC-II DMA for character/color fetch):
    // Occurs when raster is in 48..247, (raster & 7) === (YSCROLL & 7), and DEN (bit 4) is 1.
    const screenOn = (this.regs[0x11] & 0x10) !== 0;
    const isBadLine = screenOn && (c64Raster >= 48 && c64Raster <= 247) && ((c64Raster & 7) === (this.regs[0x11] & 7));
    return isBadLine ? 40 : 0;
  }

  /**
   * End of scanline:
   * 1. Render scanline after CPU instructions executed on this raster line
   * 2. Advance raster line counter (0..311 in PAL)
   */
  endLine() {
    const c64Raster = this.currentRaster;
    if (c64Raster >= 15 && c64Raster < 287) {
      this.renderScanline(c64Raster);
    }
    this.currentRaster = (this.currentRaster + 1) % this.totalRasterLines;
  }

  /**
   * Step VIC-II by one scanline synchronously
   */
  stepLine(): number {
    const stolen = this.startLine();
    this.endLine();
    return stolen;
  }

  /**
   * Fast scanline renderer
   */
  renderScanline(c64Raster) {
    const regs = this.regs;
    const pixels = this.pixels;
    const mem = this.mem;
    const palette = C64_PALETTE_RGBA;

    const canvasY = c64Raster - 15; // 0..271
    const borderColor = palette[regs[0x20] & 0x0F];
    const rowOffset = canvasY * 384;

    const screenOn = (regs[0x11] & 0x10) !== 0;
    const is25Rows = (regs[0x11] & 0x08) !== 0;
    const is40Cols = (regs[0x16] & 0x08) !== 0;
    const yscroll = regs[0x11] & 0x07;
    const xscroll = regs[0x16] & 0x07;

    // Top / bottom border outside active display area (evaluated by vBorder state machine)
    if (this.vBorder || !screenOn) {
      pixels.fill(borderColor, rowOffset, rowOffset + 384);
      if (regs[0x15]) this.renderSpritesOnScanline(c64Raster, canvasY);
      return;
    }

    const startX = 32 + xscroll;
    const displayY = c64Raster - (48 + yscroll); // 0..199

    const bgColor0 = palette[regs[0x21] & 0x0F];
    const bgColor1 = palette[regs[0x22] & 0x0F];
    const bgColor2 = palette[regs[0x23] & 0x0F];
    const bgColor3 = palette[regs[0x24] & 0x0F];

    const isBitmap = (regs[0x11] & 0x20) !== 0;
    const isMulticolor = (regs[0x16] & 0x10) !== 0;
    const isExtendedColor = (regs[0x11] & 0x40) !== 0;

    const screenMemBase = ((regs[0x18] >> 4) & 0x0F) * 0x0400;
    const charMemBase = ((regs[0x18] >> 1) & 0x07) * 0x0800;
    const bitmapBase = ((regs[0x18] >> 3) & 0x01) * 0x2000;

    const charRow = (displayY >> 3);
    const charLine = displayY & 7;
    const rowCharBase = charRow * 40;

    const mask = this.scanlineFgMask;
    mask.fill(0);

    for (let col = 0; col < 40; col++) {
      const pStart = rowOffset + startX + (col << 3);
      const mStart = startX + (col << 3);
      if (pStart + 8 > rowOffset + 384) continue;

      const charOffset = rowCharBase + col;
      const charCode = mem.readVic(screenMemBase + charOffset);
      const charColorIdx = mem.colorRam[charOffset] & 0x0F;
      const fgColor = palette[charColorIdx];

      if (!isBitmap) {
        if (isExtendedColor) {
          const bgIdx = (charCode >> 6) & 0x03;
          let cellBg = bgColor0;
          if (bgIdx === 1) cellBg = bgColor1;
          else if (bgIdx === 2) cellBg = bgColor2;
          else if (bgIdx === 3) cellBg = bgColor3;

          const fontByte = mem.readVic(charMemBase + ((charCode & 0x3F) << 3) + charLine);

          pixels[pStart]     = (fontByte & 0x80) ? fgColor : cellBg;
          pixels[pStart + 1] = (fontByte & 0x40) ? fgColor : cellBg;
          pixels[pStart + 2] = (fontByte & 0x20) ? fgColor : cellBg;
          pixels[pStart + 3] = (fontByte & 0x10) ? fgColor : cellBg;
          pixels[pStart + 4] = (fontByte & 0x08) ? fgColor : cellBg;
          pixels[pStart + 5] = (fontByte & 0x04) ? fgColor : cellBg;
          pixels[pStart + 6] = (fontByte & 0x02) ? fgColor : cellBg;
          pixels[pStart + 7] = (fontByte & 0x01) ? fgColor : cellBg;
        } else if (isMulticolor && (charColorIdx & 0x08)) {
          const fontByte = mem.readVic(charMemBase + (charCode << 3) + charLine);
          const mcColor = palette[charColorIdx & 0x07];

          for (let x = 0; x < 4; x++) {
            const pair = (fontByte >> (6 - (x << 1))) & 0x03;
            let c = bgColor0;
            if (pair === 1) c = bgColor1;
            else if (pair === 2) c = bgColor2;
            else if (pair === 3) {
              c = mcColor;
              mask[mStart + (x << 1)] = 1;
              mask[mStart + (x << 1) + 1] = 1;
            }
            const px = pStart + (x << 1);
            pixels[px] = c;
            pixels[px + 1] = c;
          }
        } else {
          const fontByte = mem.readVic(charMemBase + (charCode << 3) + charLine);

          pixels[pStart]     = (fontByte & 0x80) ? fgColor : bgColor0;
          pixels[pStart + 1] = (fontByte & 0x40) ? fgColor : bgColor0;
          pixels[pStart + 2] = (fontByte & 0x20) ? fgColor : bgColor0;
          pixels[pStart + 3] = (fontByte & 0x10) ? fgColor : bgColor0;
          pixels[pStart + 4] = (fontByte & 0x08) ? fgColor : bgColor0;
          pixels[pStart + 5] = (fontByte & 0x04) ? fgColor : bgColor0;
          pixels[pStart + 6] = (fontByte & 0x02) ? fgColor : bgColor0;
          pixels[pStart + 7] = (fontByte & 0x01) ? fgColor : bgColor0;

          if (fontByte) {
            for (let b = 0; b < 8; b++) {
              if (fontByte & (0x80 >> b)) mask[mStart + b] = 1;
            }
          }
        }
      } else {
        const bmpByte = mem.readVic(bitmapBase + (charRow * 320) + (col << 3) + charLine);
        const screenColor = charCode;

        if (isMulticolor) {
          const c0 = bgColor0;
          const c1 = palette[(screenColor >> 4) & 0x0F];
          const c2 = palette[screenColor & 0x0F];
          const c3 = palette[charColorIdx];

          for (let x = 0; x < 4; x++) {
            const pair = (bmpByte >> (6 - (x << 1))) & 0x03;
            let c = c0;
            if (pair === 1) c = c1;
            else if (pair === 2) c = c2;
            else if (pair === 3) {
              c = c3;
              mask[mStart + (x << 1)] = 1;
              mask[mStart + (x << 1) + 1] = 1;
            }
            const px = pStart + (x << 1);
            pixels[px] = c;
            pixels[px + 1] = c;
          }
        } else {
          const c0 = palette[screenColor & 0x0F];
          const c1 = palette[(screenColor >> 4) & 0x0F];

          pixels[pStart]     = (bmpByte & 0x80) ? c1 : c0;
          pixels[pStart + 1] = (bmpByte & 0x40) ? c1 : c0;
          pixels[pStart + 2] = (bmpByte & 0x20) ? c1 : c0;
          pixels[pStart + 3] = (bmpByte & 0x10) ? c1 : c0;
          pixels[pStart + 4] = (bmpByte & 0x08) ? c1 : c0;
          pixels[pStart + 5] = (bmpByte & 0x04) ? c1 : c0;
          pixels[pStart + 6] = (bmpByte & 0x02) ? c1 : c0;
          pixels[pStart + 7] = (bmpByte & 0x01) ? c1 : c0;

          if (bmpByte) {
            for (let b = 0; b < 8; b++) {
              if (bmpByte & (0x80 >> b)) mask[mStart + b] = 1;
            }
          }
        }
      }
    }

    // Hardware left & right border clipping for 40-col / 38-col modes
    const leftBorderWidth = is40Cols ? 32 : 40;
    const rightBorderStart = is40Cols ? 352 : 344;
    pixels.fill(borderColor, rowOffset, rowOffset + leftBorderWidth);
    pixels.fill(borderColor, rowOffset + rightBorderStart, rowOffset + 384);

    if (regs[0x15]) {
      this.renderSpritesOnScanline(c64Raster, canvasY);
    }
  }

  /**
   * Fast sprite renderer for intersecting scanlines
   */
  renderSpritesOnScanline(c64Raster, canvasY) {
    const regs = this.regs;
    const spriteEnable = regs[0x15];
    if (!spriteEnable) return;

    const mem = this.mem;
    const pixels = this.pixels;
    const palette = C64_PALETTE_RGBA;
    const mask = this.scanlineFgMask;

    const screenMemBase = ((regs[0x18] >> 4) & 0x0F) * 0x0400;
    const rowOffset = canvasY * 384;

    const spriteMC0 = palette[regs[0x25] & 0x0F];
    const spriteMC1 = palette[regs[0x26] & 0x0F];

    for (let s = 7; s >= 0; s--) {
      if (!(spriteEnable & (1 << s))) continue;

      const xMsb = (regs[0x10] & (1 << s)) ? 256 : 0;
      const rawX = regs[s << 1] | xMsb;
      const rawY = regs[(s << 1) + 1];

      // In C64 PAL: X=24 is left of active area (canvas X=32), Y is C64 raster line
      const screenX = (rawX - 24) + 32;

      const yExpanded = (regs[0x17] & (1 << s)) !== 0;
      const spriteHeight = yExpanded ? 42 : 21;

      if (c64Raster < rawY || c64Raster >= rawY + spriteHeight) continue;

      const spriteLine = yExpanded ? ((c64Raster - rawY) >> 1) : (c64Raster - rawY);
      if (spriteLine >= 21) continue;

      const spritePtr = mem.readVic(screenMemBase + 0x03F8 + s);
      const spriteDataAddr = (spritePtr << 6) + (spriteLine * 3);

      // Sprite pointers are relative to the current VIC bank, so map them through
      // the banked address space before reading the 63-byte sprite pattern.
      const b0 = mem.readVic(spriteDataAddr);
      const b1 = mem.readVic(spriteDataAddr + 1);
      const b2 = mem.readVic(spriteDataAddr + 2);

      const xExpanded = (regs[0x1D] & (1 << s)) !== 0;
      const isMulticolor = (regs[0x1C] & (1 << s)) !== 0;
      const isBehindBg = (regs[0x1B] & (1 << s)) !== 0;
      const spriteColor = palette[regs[0x27 + s] & 0x0F];

      if (!isMulticolor) {
        let px = screenX;
        const bytes = [b0, b1, b2];
        const step = xExpanded ? 2 : 1;

        for (let b = 0; b < 3; b++) {
          const byteVal = bytes[b];
          for (let bit = 7; bit >= 0; bit--) {
            if (byteVal & (1 << bit)) {
              if (px >= 0 && px < 384 && (!isBehindBg || !mask[px])) {
                pixels[rowOffset + px] = spriteColor;
              }
              if (xExpanded && px + 1 >= 0 && px + 1 < 384 && (!isBehindBg || !mask[px + 1])) {
                pixels[rowOffset + px + 1] = spriteColor;
              }
            }
            px += step;
          }
        }
      } else {
        let px = screenX;
        const bytes = [b0, b1, b2];
        const step = xExpanded ? 4 : 2;

        for (let b = 0; b < 3; b++) {
          const byteVal = bytes[b];
          for (let bitPair = 3; bitPair >= 0; bitPair--) {
            const code = (byteVal >> (bitPair << 1)) & 0x03;
            if (code !== 0) {
              let c = spriteMC0;
              if (code === 2) c = spriteColor;
              else if (code === 3) c = spriteMC1;

              const repeat = xExpanded ? 4 : 2;
              for (let r = 0; r < repeat; r++) {
                const targetPx = px + r;
                if (targetPx >= 0 && targetPx < 384 && (!isBehindBg || !mask[targetPx])) {
                  pixels[rowOffset + targetPx] = c;
                }
              }
            }
            px += step;
          }
        }
      }
    }
  }

  renderFrame() {
    for (let raster = 15; raster < 287; raster++) {
      this.renderScanline(raster);
    }
  }
}

