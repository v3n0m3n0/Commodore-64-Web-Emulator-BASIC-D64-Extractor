# VICE SID Architecture & reSID Audio DSP Engine

> **Source Reference**: Official VICE Documentation (*Versatile Commodore Emulator*) — `https://vice-emu.sourceforge.io/vice_toc.html`  
> **Audio Cores**: `FastSID` (Table-lookup / Lightweight), `reSID` (Cycle-Exact DSP), `reSID-fp` (Floating-Point Physical Modeling)  
> **Chips**: MOS 6581 (Revisions R1, R2, R3, R4) and MOS 8580 (Revision R5)

---

## 1. SID Emulation Engines in VICE

```
+----------------------------------------------------------------------------------------------------+
| 1. FastSID Core                                                                                    |
|    - Integer lookup tables and linear approximation of filter responses.                           |
|    - Low CPU overhead (~2-5% host CPU), but lacks analog filter distortion and combined waveforms.|
+----------------------------------------------------------------------------------------------------+
| 2. reSID Engine (Dag Lem)                                                                          |
|    - Cycle-exact physical modeling of all 3 voices, ADSR envelope generators, and analog filters. |
|    - Simulates DAC non-linearities, MOS FET switches, and Op-Amp distortion.                       |
+----------------------------------------------------------------------------------------------------+
| 3. reSID-fp (Floating-Point Extension)                                                             |
|    - Solves differential equations for Operational Transconductance Amplifiers (OTA) using floats.|
|    - Provides precise control over filter curve parameters (Cutoff curve, resonance gain).         |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. MOS 6581 vs MOS 8580 Physical Differences

```
+-----------------------+----------------------------------+----------------------------------+
| Characteristic        | MOS 6581 (Old NMOS Breadbin)     | MOS 8580 (New HMOS-II C64C/G)    |
+-----------------------+----------------------------------+----------------------------------+
| Power Supply          | 12V Vdd (Generates more heat)    | 9V Vdd (Runs cooler)             |
| Filter Type           | NMOS Switched Capacitor / OTA    | Scaled Poly-Capacitor Filter     |
| Filter Cutoff Range   | ~30 Hz to ~10-12 kHz (Non-linear)| 0 Hz to ~20 kHz (Linear & Clean) |
| Filter Dispersion     | High variance between chips      | Uniform across production batches|
| Filter Resonance      | Warmer, heavily saturated        | Sharp, highly resonant (peaking) |
| Combined Waveforms    | Asymmetrical bit-fade distortion | Stable, mathematically cleaner   |
| Digis ($D418 volume)  | DC offset leakage clicks (Loud)  | No DC offset (Silent without mod)|
| Digibooster Hardware  | Not needed (Native audio)        | 10k resistor mod needed on Pin 26|
+-----------------------+----------------------------------+----------------------------------+
```

---

## 3. Physical Model of the SID Analog Filter

```
                  +---------------- Voice 1..3 / Ext In ------------------+
                  |                                                       |
                  |     +-----------+                                     |
                  +---->| Low-Pass  |-----+                               |
                  |     +-----------+     |                               |
                  |                       |                               |
                  |     +-----------+     +--->[ Inverting Summer ]------>| Main Output
                  +---->| Band-Pass |-----+    (Master Volume $D418)      |
                  |     +-----------+     |                               |
                  |                       |                               |
                  |     +-----------+     |                               |
                  +---->| High-Pass |-----+                               |
                        +-----------+                                     |
                  |                                                       |
                  +------------- Non-Filtered Direct Pass ----------------+
```

### 3.1. Filter Mathematical Equations
The analog filter is modeled as a state-variable multi-mode filter:

$$\frac{d V_{hp}}{dt} = \frac{1}{R_f C} \left( V_{in} - V_{hp} - Q \cdot V_{bp} - V_{lp} \right)$$

$$\frac{d V_{bp}}{dt} = \frac{1}{R_f C} V_{hp}$$

$$\frac{d V_{lp}}{dt} = \frac{1}{R_f C} V_{bp}$$

Where:
- $V_{in}$: Sum of voice outputs directed to the filter ($D417 bits 0-3).
- $R_f$: Effective dynamic resistance of MOS-FETs modulated by the 11-bit Filter Cutoff register (`$D415-$D416`).
- $Q$: Resonance factor controlled by `$D417` bits 4-7 ($Q = 1 / \text{Resonance}$).

---

## 4. Waveform Generation & Combined Waveform Physics

Each voice oscillator contains a 24-bit phase accumulator clocked at $\Phi_2 \approx 0.985 \text{ MHz}$ (PAL):

$$f_{out} = \frac{\text{Freq Register} \times f_{clk}}{16,777,216}$$

### Combined Waveform Interactions
When multiple waveform bits ($D404/$D40B/$D412) are set simultaneously:
- **Triangle + Sawtooth ($31)**: The internal NMOS pull-down transistors pull bits low against passive pull-ups, resulting in an analog AND operation distorted by internal bus capacitance.
- **Sawtooth + Pulse ($51)**: Non-linear pulse wave slicing through the sawtooth ramp.
- **Noise + Any Wave ($81, $82, $84)**: The 23-bit Linear Feedback Shift Register (LFSR) is locked or clocked erratically by oscillator transitions.

---

## 5. Digitized Audio & Sample Playback Techniques

1. **Volume Register DC Offset Modulation (`$D418`)**:
   - The master volume register ($D418 bits 0-3) produces a minor DC voltage step on the MOS 6581 output pin.
   - By updating `$D418` at 4 kHz - 11 kHz using timer IRQs or fast loops, 4-bit PCM samples are rendered directly without running any voice oscillators.
2. **Mahony 8-bit / Pulse-Width Modulation (PWM) Method**:
   - Combines Voice 3 pulse width or ring modulation with volume to achieve true 8-bit linear resolution.
3. **SID 8580 "Digi Fix" Emulation**:
   - Because the 8580 lacks the DC bias leakage, playing `$D418` samples is nearly silent unless an oscillator is sustained at high frequency to provide the carrier DC offset. VICE provides the `SIDResid8580Passband` resource to simulate this hardware behavior.

---

## 6. Multi-SID (Stereo & 3-SID) Memory Configuration

VICE supports multiple SID chips for panoramic stereo and 6/9-voice chiptune playback:

```
+-----------+----------------------+--------------------+---------------------+
| SID Index | Primary Base Address | Alternative Base 1 | Alternative Base 2  |
+-----------+----------------------+--------------------+---------------------+
| SID #1    | $D400 - $D41F        | Standard Default   | Standard Default    |
| SID #2    | $D420 - $D43F        | $D500 - $D51F      | $DE00 - $DE1F (IO1) |
| SID #3    | $D440 - $D45F        | $D600 - $D61F      | $DF00 - $DF1F (IO2) |
+-----------+----------------------+--------------------+---------------------+
```
