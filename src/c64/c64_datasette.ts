/**
 * Commodore 1530 C2N Datasette Hardware Emulation & Multi-Cassette Tape Deck
 * =========================================================================
 * Emulates authentic C2N tape drive operations & Multi-Tape Management:
 * - Magnetic pulse transitions fed into CIA 1 FLAG interrupt line ($DC0D bit 4).
 * - Motor control via MOS 6510 On-Chip Port ($0001 bit 5: 0=ON, 1=OFF).
 * - Cassette Sense switch via MOS 6510 On-Chip Port ($0001 bit 4: 0=PLAY, 1=STOP).
 * - Multi-Cassette / Multi-Side Tape Deck (Sides 1/2, Tapes A/B, hot-swapping without CPU reset).
 * - High-precision tape counter (0000..9999), pulse scrubbing, and Auto-Warp acceleration.
 * - Real-time pulse sample window for live magnetic flux oscilloscope rendering.
 */

import { C64TAP, TAPImage, TAPFileEntry } from "./c64_tap";

export type DatasetteState =
  | "STOPPED"
  | "PLAYING"
  | "RECORDING"
  | "REWINDING"
  | "FAST_FORWARDING";

export interface TapeDeckEntry {
  id: string;
  name: string;
  sideName: string; // e.g. "Side 1", "Side 2", "Tape A", "Bonus Levels"
  fileName: string;
  data: Uint8Array;
  image: TAPImage;
}

export class C64Datasette {
  // Current active tape image
  public image: TAPImage | null = null;
  public state: DatasetteState = "STOPPED";

  // Multi-Cassette Tape Deck Carousel
  public tapeDeck: TapeDeckEntry[] = [];
  public activeDeckIndex: number = 0;

  // Pulse streaming position
  public pulseIndex: number = 0;
  public currentPulseCyclesLeft: number = 0;
  public totalCyclesConsumed: number = 0;

  // Motor state (controlled by CPU $0001 bit 5: low = ON)
  public motorOn: boolean = false;

  // Key / Switch state (0=Play pressed, 1=Released)
  public playSwitchPressed: boolean = false;

  // Auto-Warp during active tape reading
  public autoWarp: boolean = true;
  public isWarpActive: boolean = false;

  // Reference to CIA 1 for FLAG interrupt line
  private cia1: any = null;

  // Master CPU clock reference (PAL: 985248, NTSC: 1022727)
  public cpuClockHz: number = 985248;

  constructor(cia1?: any) {
    this.cia1 = cia1;
  }

  public setCIA1(cia1: any) {
    this.cia1 = cia1;
  }

  public setClockFrequency(freq: number) {
    this.cpuClockHz = freq > 0 ? freq : 985248;
  }

  /**
   * Mount a single .TAP tape image into the Datasette drive.
   */
  public mount(
    image: TAPImage,
    autoPlay = true,
    name?: string,
    rawData?: Uint8Array
  ) {
    const fileName = image.fileName || name || "TAPE";
    const sideName = image.sideName || C64TAP.extractSideName(fileName) || "Side 1";

    const entry: TapeDeckEntry = {
      id: `tape-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: C64TAP.extractBaseGameName(fileName),
      sideName,
      fileName,
      data: rawData || new Uint8Array(0),
      image,
    };

    // If deck is empty or this is a single tape mount, replace deck
    this.tapeDeck = [entry];
    this.activeDeckIndex = 0;
    this.image = image;
    this.pulseIndex = 0;
    this.totalCyclesConsumed = 0;
    this.currentPulseCyclesLeft =
      image.pulses.length > 0 ? image.pulses[0] : 0;

    if (autoPlay) {
      this.play();
    } else {
      this.stop();
    }
  }

  /**
   * Mount an entire multi-cassette deck (e.g., Side 1 & Side 2 of a game).
   */
  public mountDeck(
    entries: {
      name: string;
      data: Uint8Array;
      image?: TAPImage;
      sideName?: string;
    }[],
    activeIndex = 0,
    autoPlay = true
  ) {
    if (!entries || entries.length === 0) return;

    this.tapeDeck = entries.map((e, idx) => {
      const parsedImage = e.image || C64TAP.parse(e.data, e.name);
      const sideName =
        e.sideName ||
        (parsedImage?.sideName ?? null) ||
        C64TAP.extractSideName(e.name) ||
        `Side ${idx + 1}`;
      return {
        id: `tape-${idx}-${Date.now()}`,
        name: C64TAP.extractBaseGameName(e.name),
        sideName,
        fileName: e.name,
        data: e.data,
        image: parsedImage!,
      };
    });

    const safeIdx = Math.max(0, Math.min(this.tapeDeck.length - 1, activeIndex));
    this.activeDeckIndex = safeIdx;
    this.image = this.tapeDeck[safeIdx]?.image || null;
    this.pulseIndex = 0;
    this.totalCyclesConsumed = 0;
    this.currentPulseCyclesLeft =
      this.image && this.image.pulses.length > 0 ? this.image.pulses[0] : 0;

    if (autoPlay) {
      this.play();
    } else {
      this.stop();
    }
  }

  /**
   * Add an additional cassette to the existing tape deck without interrupting emulation.
   */
  public addTape(
    name: string,
    data: Uint8Array,
    image?: TAPImage,
    sideName?: string
  ): number {
    const parsedImage = image || C64TAP.parse(data, name);
    if (!parsedImage) return -1;

    const detectedSide =
      sideName ||
      parsedImage.sideName ||
      C64TAP.extractSideName(name) ||
      `Tape ${this.tapeDeck.length + 1}`;

    const entry: TapeDeckEntry = {
      id: `tape-${this.tapeDeck.length}-${Date.now()}`,
      name: C64TAP.extractBaseGameName(name),
      sideName: detectedSide,
      fileName: name,
      data,
      image: parsedImage,
    };

    this.tapeDeck.push(entry);
    return this.tapeDeck.length - 1;
  }

  /**
   * Switch the active cassette in the tape deck (e.g. Side 1 -> Side 2) during gameplay.
   * Preserves CPU / RAM emulation state — essential when games prompt "INSERT SIDE 2".
   */
  public switchTape(index: number, resumePlayback = true): boolean {
    if (index < 0 || index >= this.tapeDeck.length) return false;

    this.activeDeckIndex = index;
    const entry = this.tapeDeck[index];
    this.image = entry.image;
    this.pulseIndex = 0;
    this.totalCyclesConsumed = 0;
    this.currentPulseCyclesLeft =
      this.image && this.image.pulses.length > 0 ? this.image.pulses[0] : 0;

    if (resumePlayback) {
      this.play();
    }

    return true;
  }

  /**
   * Flip tape side (toggles between Side 1 and Side 2, or advances through multi-tape deck).
   */
  public flipSide(resumePlayback = true): boolean {
    if (this.tapeDeck.length <= 1) return false;
    const nextIdx = (this.activeDeckIndex + 1) % this.tapeDeck.length;
    return this.switchTape(nextIdx, resumePlayback);
  }

  /**
   * Select next cassette in deck.
   */
  public nextTape(): boolean {
    if (this.activeDeckIndex + 1 < this.tapeDeck.length) {
      return this.switchTape(this.activeDeckIndex + 1, true);
    }
    return false;
  }

  /**
   * Select previous cassette in deck.
   */
  public prevTape(): boolean {
    if (this.activeDeckIndex > 0) {
      return this.switchTape(this.activeDeckIndex - 1, true);
    }
    return false;
  }

  /**
   * Eject all tapes from the Datasette drive.
   */
  public eject() {
    this.image = null;
    this.tapeDeck = [];
    this.activeDeckIndex = 0;
    this.stop();
    this.pulseIndex = 0;
    this.currentPulseCyclesLeft = 0;
    this.totalCyclesConsumed = 0;
  }

  /**
   * Press PLAY button on Datasette.
   */
  public play() {
    this.state = "PLAYING";
    this.playSwitchPressed = true;
  }

  /**
   * Press STOP button on Datasette.
   */
  public stop() {
    this.state = "STOPPED";
    this.playSwitchPressed = false;
    this.isWarpActive = false;
  }

  /**
   * Press REWIND button (reset to beginning of current tape).
   */
  public rewind() {
    this.pulseIndex = 0;
    this.totalCyclesConsumed = 0;
    if (this.image && this.image.pulses.length > 0) {
      this.currentPulseCyclesLeft = this.image.pulses[0];
    }
  }

  /**
   * Seek tape position directly to specific pulse index.
   */
  public seekToPulse(pulseIndex: number) {
    if (!this.image || this.image.pulses.length === 0) return;
    this.pulseIndex = Math.min(
      this.image.pulses.length - 1,
      Math.max(0, pulseIndex)
    );
    this.currentPulseCyclesLeft = this.image.pulses[this.pulseIndex];
  }

  /**
   * Seek tape position by percentage (0.0 to 100.0).
   */
  public seekToPercent(percentage: number) {
    if (!this.image || this.image.pulses.length === 0) return;
    const targetIdx = Math.floor(
      (Math.max(0, Math.min(100, percentage)) / 100) * this.image.pulses.length
    );
    this.seekToPulse(targetIdx);
  }

  /**
   * Seek tape position by mechanical counter value (000 to 999).
   */
  public seekToCounter(counter: number) {
    if (!this.image || this.image.pulses.length === 0) return;
    const clamped = Math.max(0, Math.min(999, counter));
    const targetIdx = Math.floor((clamped / 999) * this.image.pulses.length);
    this.seekToPulse(targetIdx);
  }

  /**
   * Cue tape directly to a specific file found within the tape container.
   */
  public seekToFile(fileIndex: number): boolean {
    if (!this.image || !this.image.files || fileIndex >= this.image.files.length) {
      return false;
    }
    const file = this.image.files[fileIndex];
    if (file && typeof file.pulseOffset === "number") {
      this.seekToPulse(file.pulseOffset);
      return true;
    }
    return false;
  }

  /**
   * Fast-Forward tape by a relative percentage.
   */
  public fastForward(percentage: number) {
    if (!this.image || this.image.pulses.length === 0) return;
    const currentPct = this.progressPercent;
    this.seekToPercent(currentPct + percentage);
  }

  /**
   * Update motor control state from MOS 6510 Processor Port ($0001).
   * Bit 5: 0 = Motor ON, 1 = Motor OFF.
   */
  public setMotorState(portValue: number) {
    const newMotor = (portValue & 0x20) === 0;
    this.motorOn = newMotor;
  }

  /**
   * Get Sense Switch status for MOS 6510 Processor Port ($0001 bit 4).
   * Returns: 0 when PLAY is pressed, 0x10 when STOP/Released.
   */
  public getSenseSwitch(): number {
    return this.playSwitchPressed ? 0 : 0x10;
  }

  /**
   * Cycle-exact step of Datasette tape movement and FLAG interrupt generation.
   * Called on every CPU / system cycle step.
   */
  public step(cycles: number) {
    if (!this.image || this.state !== "PLAYING" || !this.motorOn) {
      this.isWarpActive = false;
      return;
    }

    if (this.pulseIndex >= this.image.pulses.length) {
      this.stop();
      return;
    }

    // When tape is actively reading with motor ON, mark warp eligibility
    this.isWarpActive = this.autoWarp;

    let remainingCycles = cycles;

    while (remainingCycles > 0 && this.pulseIndex < this.image.pulses.length) {
      if (this.currentPulseCyclesLeft <= remainingCycles) {
        // Pulse expired: trigger negative edge transition on CIA 1 FLAG line
        remainingCycles -= this.currentPulseCyclesLeft;
        this.totalCyclesConsumed += this.currentPulseCyclesLeft;

        if (this.cia1 && typeof this.cia1.triggerInterrupt === "function") {
          // Bit 4 of CIA 1 ICR ($DC0D): Cassette Pulse FLAG interrupt
          this.cia1.triggerInterrupt(0x10);
        }

        // Advance to next pulse in stream
        this.pulseIndex++;
        if (this.pulseIndex < this.image.pulses.length) {
          this.currentPulseCyclesLeft = this.image.pulses[this.pulseIndex];
        } else {
          this.stop();
          break;
        }
      } else {
        this.currentPulseCyclesLeft -= remainingCycles;
        this.totalCyclesConsumed += remainingCycles;
        remainingCycles = 0;
      }
    }
  }

  /**
   * Get recent pulse buffer window (for real-time magnetic oscilloscope rendering).
   */
  public getPulseSampleWindow(maxSamples = 48): number[] {
    if (!this.image || this.image.pulses.length === 0) return [];
    const start = Math.max(0, this.pulseIndex - 8);
    const end = Math.min(this.image.pulses.length, start + maxSamples);
    const samples: number[] = [];
    for (let i = start; i < end; i++) {
      samples.push(this.image.pulses[i]);
    }
    return samples;
  }

  /**
   * Get active TapeDeckEntry.
   */
  public get activeEntry(): TapeDeckEntry | null {
    if (
      this.tapeDeck.length === 0 ||
      this.activeDeckIndex >= this.tapeDeck.length
    ) {
      return null;
    }
    return this.tapeDeck[this.activeDeckIndex];
  }

  /**
   * True if tape deck contains multiple cassettes / sides.
   */
  public get hasMultipleTapes(): boolean {
    return this.tapeDeck.length > 1;
  }

  /**
   * Total number of tapes in deck.
   */
  public get totalTapes(): number {
    return this.tapeDeck.length;
  }

  /**
   * Tape Counter value (000 to 999).
   */
  public get counter(): number {
    if (!this.image || this.image.pulses.length === 0) return 0;
    return Math.min(
      999,
      Math.floor((this.pulseIndex / this.image.pulses.length) * 999)
    );
  }

  /**
   * Tape progress percentage (0.0 to 100.0).
   */
  public get progressPercent(): number {
    if (!this.image || this.image.pulses.length === 0) return 0;
    return (this.pulseIndex / this.image.pulses.length) * 100;
  }

  /**
   * Remaining time in seconds.
   */
  public get remainingSeconds(): number {
    if (!this.image) return 0;
    const remainingPulses = this.image.pulses.length - this.pulseIndex;
    const avgCycles =
      this.image.totalCycles / Math.max(1, this.image.pulses.length);
    return Math.max(0, (remainingPulses * avgCycles) / this.cpuClockHz);
  }

  /**
   * Formatted mm:ss remaining time.
   */
  public get formattedRemainingTime(): string {
    const sec = Math.floor(this.remainingSeconds);
    const mins = Math.floor(sec / 60);
    const remainderSecs = sec % 60;
    return `${String(mins).padStart(2, "0")}:${String(remainderSecs).padStart(2, "0")}`;
  }
}
