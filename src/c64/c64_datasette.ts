/**
 * Commodore 1530 C2N Datasette Hardware Emulation
 * ===============================================
 * Emulates authentic C2N tape drive operations:
 * - Magnetic pulse transitions fed into CIA 1 FLAG interrupt line ($DC0D bit 4).
 * - Motor control via MOS 6510 On-Chip Port ($0001 bit 5: 0=ON, 1=OFF).
 * - Cassette Sense switch via MOS 6510 On-Chip Port ($0001 bit 4: 0=PLAY, 1=STOP).
 * - Tape counter (0000..9999), progress percentage, and Auto-Warp acceleration.
 */

import { C64TAP, TAPImage } from "./c64_tap";

export type DatasetteState = "STOPPED" | "PLAYING" | "RECORDING" | "REWINDING" | "FAST_FORWARDING";

export class C64Datasette {
  public image: TAPImage | null = null;
  public state: DatasetteState = "STOPPED";

  // Pulse streaming position
  public pulseIndex: number = 0;
  public currentPulseCyclesLeft: number = 0;
  public totalCyclesConsumed: number = 0;

  // Motor state (controlled by CPU $0001 bit 5)
  public motorOn: boolean = false;

  // Key / Switch state (0=Play pressed, 1=Released)
  public playSwitchPressed: boolean = false;

  // Auto-Warp during active tape reading
  public autoWarp: boolean = true;
  public isWarpActive: boolean = false;

  // Reference to CIA 1 for FLAG interrupt line
  private cia1: any = null;

  constructor(cia1?: any) {
    this.cia1 = cia1;
  }

  public setCIA1(cia1: any) {
    this.cia1 = cia1;
  }

  /**
   * Mount a .TAP tape image into the Datasette drive.
   */
  public mount(image: TAPImage, autoPlay = true) {
    this.image = image;
    this.pulseIndex = 0;
    this.totalCyclesConsumed = 0;
    this.currentPulseCyclesLeft = image.pulses.length > 0 ? image.pulses[0] : 0;

    if (autoPlay) {
      this.play();
    } else {
      this.stop();
    }
  }

  /**
   * Eject currently mounted tape.
   */
  public eject() {
    this.image = null;
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
   * Press REWIND button (reset to beginning of tape).
   */
  public rewind() {
    this.pulseIndex = 0;
    this.totalCyclesConsumed = 0;
    if (this.image && this.image.pulses.length > 0) {
      this.currentPulseCyclesLeft = this.image.pulses[0];
    }
  }

  /**
   * Fast-Forward tape by a percentage or pulse count.
   */
  public fastForward(percentage: number) {
    if (!this.image || this.image.pulses.length === 0) return;
    const targetIdx = Math.floor((percentage / 100) * this.image.pulses.length);
    this.pulseIndex = Math.min(this.image.pulses.length - 1, Math.max(0, targetIdx));
    this.currentPulseCyclesLeft = this.image.pulses[this.pulseIndex];
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
   * Returns: 0 when PLAY is pressed, 1 when STOP/Released.
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
   * Tape Counter value (0000 to 9999).
   */
  public get counter(): number {
    if (!this.image || this.image.pulses.length === 0) return 0;
    return Math.min(9999, Math.floor((this.pulseIndex / this.image.pulses.length) * 999));
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
    const avgCycles = this.image.totalCycles / Math.max(1, this.image.pulses.length);
    return Math.max(0, (remainingPulses * avgCycles) / 985248);
  }
}
