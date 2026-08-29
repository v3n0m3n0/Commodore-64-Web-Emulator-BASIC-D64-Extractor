/**
 * Raw C2N Cassette Tape Pulse Stream (.TAP) Parser
 * Reads "C64-TAPE-RAW" headers and pulse durations.
 */

export interface TAPInfo {
  version: number; // 0, 1, or 2
  dataSize: number;
  totalPulses: number;
  durationSeconds: number;
}

export class C64TAP {
  public static parse(data: Uint8Array): TAPInfo | null {
    if (data.length < 20) return null;

    const signature = String.fromCharCode(...data.subarray(0, 12));
    if (!signature.startsWith("C64-TAPE-RAW")) return null;

    const version = data[12];
    const dataSize = data[16] | (data[17] << 8) | (data[18] << 16) | (data[19] << 24);
    const rawPulses = data.subarray(20, 20 + dataSize);

    let totalClockCycles = 0;
    for (let i = 0; i < rawPulses.length; i++) {
      const b = rawPulses[i];
      if (b === 0 && version >= 1 && i + 3 < rawPulses.length) {
        // 24-bit extended pulse
        const p = rawPulses[i + 1] | (rawPulses[i + 2] << 8) | (rawPulses[i + 3] << 16);
        totalClockCycles += p;
        i += 3;
      } else {
        totalClockCycles += b * 8;
      }
    }

    // PAL clock: 985,248 Hz
    const durationSeconds = totalClockCycles / 985248;

    return {
      version,
      dataSize,
      totalPulses: rawPulses.length,
      durationSeconds,
    };
  }
}
