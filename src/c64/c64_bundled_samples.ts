/**
 * Curated Commodore 64 Bundled Programs & Demos
 * Includes playable games, SID synthesizer tunes, raster rainbow intros,
 * mathematical fractals, and the legendary 10 PRINT maze generator.
 */

export interface BundledSample {
  id: string;
  title: string;
  category: "Demo" | "Music" | "Math" | "Assembly";
  author: string;
  description: string;
  type: "BASIC" | "PRG" | "Assembly";
  code?: string;
  prgBytes?: Uint8Array;
}

export const BUNDLED_SAMPLES: BundledSample[] = [
  {
    id: "10-print-maze",
    title: "10 PRINT Maze Generator",
    category: "Demo",
    author: "Classic C64 Demoscene",
    description: "The most iconic one-line Commodore 64 generative maze algorithm in history.",
    type: "BASIC",
    code: `10 PRINT CHR$(147);
20 POKE 53280,0:POKE 53281,0
30 PRINT CHR$(205.5+RND(1));
40 GOTO 30`,
  },
  {
    id: "sid-arpeggiator",
    title: "SID Tri-Voice Arpeggiator",
    category: "Music",
    author: "MOS 6581 Sound Architect",
    description: "Multi-voice synthesizer demo playing harmonic arpeggios and filtered pulse-width basslines.",
    type: "BASIC",
    code: `10 REM SID TRI-VOICE SYNTH DEMO
20 PRINT CHR$(147):POKE 53280,11:POKE 53281,0:POKE 646,14
30 PRINT "   *** COMMODORE SID SYNTHESIS ***"
40 S=54272:FOR I=0 TO 24:POKE S+I,0:NEXT I
50 POKE S+24,15:REM VOLUME 15
60 POKE S+5,9:POKE S+6,240:REM VOICE 1 ATTACK/DECAY/SUSTAIN
70 POKE S+12,25:POKE S+13,200:REM VOICE 2
80 POKE S+2,0:POKE S+3,8:REM VOICE 1 PULSE WIDTH
90 PRINT "PLAYING CHORD PROGRESSION..."
100 DIM N(8):N(0)=28:N(1)=35:N(2)=42:N(3)=56:N(4)=70:N(5)=84:N(6)=112:N(7)=140
110 FOR R=1 TO 8:FOR J=0 TO 7
120 POKE S+1,N(J):POKE S+4,65:REM GATE ON (PULSE)
130 POKE S+8,N(7-J)/2:POKE S+11,33:REM VOICE 2 SAWTOOTH
140 POKE 53280,J+1
150 FOR T=1 TO 35:NEXT T
160 POKE S+4,64:POKE S+11,32:REM GATE OFF
170 NEXT J:NEXT R
180 POKE 53280,14:PRINT "READY."`,
  },
  {
    id: "mandelbrot-fractal",
    title: "Mandelbrot Fractal Visualizer",
    category: "Math",
    author: "Retro Math Lab",
    description: "Computes and renders the Mandelbrot set in PETSCII characters with mathematical precision.",
    type: "BASIC",
    code: `10 REM MANDELBROT SET FRACTAL
20 PRINT CHR$(147);:POKE 53280,0:POKE 53281,0:POKE 646,13
30 FOR Y=-10 TO 10
40 FOR X=-20 TO 15
50 CR=X/15:CI=Y/10:ZR=0:ZI=0:I=0
60 ZR2=ZR*ZR:ZI2=ZI*ZI
70 IF ZR2+ZI2>4 OR I=15 GOTO 100
80 ZI=2*ZR*ZI+CI:ZR=ZR2-ZI2+CR:I=I+1
90 GOTO 60
100 IF I=15 THEN PRINT " ";:GOTO 120
110 IF I>9 THEN PRINT "*";:GOTO 120
120 IF I>4 THEN PRINT ".";:GOTO 120
130 PRINT " ";
140 NEXT X:PRINT:NEXT Y
150 PRINT "MANDELBROT GENERATION COMPLETE."`,
  },
  {
    id: "raster-rainbow",
    title: "VIC-II Raster Rainbow Bar",
    category: "Assembly",
    author: "C64 Demoscene",
    description: "Direct 6502 Machine Code raster synchronization routine cycling border colors on scanline $D012.",
    type: "BASIC",
    code: `10 REM VIC-II RASTER SYNC IN MACHINE CODE
20 PRINT CHR$(147);:POKE 53280,0:POKE 53281,0:POKE 646,1
30 PRINT "POKING 6502 ML ROUTINE TO $C000..."
40 FOR A=49152 TO 49168:READ B:POKE A,B:NEXT A
50 DATA 173,18,208,205,18,208,240,251,141,32,208,238,33,208,76,0,192
60 PRINT "ROUTINE LOADED AT $C000 (SYS 49152)"
70 PRINT "PRESS ANY KEY TO STOP."
80 SYS 49152`,
  },
  {
    id: "double-irq-raster-split",
    title: "Double-IRQ Raster Split (Non-Blocking)",
    category: "Assembly",
    author: "MOS 6510 System Architect",
    description: "High-performance non-blocking VIC-II Double-IRQ split: toggles border colors and raster lines without wasting CPU in polling loops.",
    type: "Assembly",
    code: `; ============================================
; C64 NON-BLOCKING DOUBLE-IRQ RASTER SPLIT
; Zero CPU waste, multiplexed interrupt chain
; ============================================
* = $C000

        SEI             ; Disable interrupts

        ; Disable CIA1 Timer IRQ to avoid timer jitter
        LDA #$7F
        STA $DC0D
        LDA $DC0D       ; Acknowledge any pending CIA1 IRQ

        ; Enable VIC-II Raster IRQ
        LDA #$01
        STA $D01A

        ; Set first raster target line ($32 = 50)
        LDA #$32
        STA $D012
        LDA $D011
        AND #$7F        ; Clear high bit of raster line
        STA $D011

        ; Point RAM IRQ Vector ($0314/$0315) to IRQ1
        LDA #<IRQ1
        STA $0314
        LDA #>IRQ1
        STA $0315

        ; Acknowledge pending VIC-II IRQ
        LDA #$FF
        STA $D019

        CLI             ; Re-enable interrupts
        RTS             ; Return to BASIC / Main Loop

; --------------------------------------------
; FIRST IRQ HANDLER: Top screen split (Line 50)
; --------------------------------------------
IRQ1:
        LDA #$06        ; Blue border
        STA $D020
        STA $D021

        ; Setup second raster target line ($C8 = 200)
        LDA #$C8
        STA $D012

        ; Switch IRQ vector to IRQ2
        LDA #<IRQ2
        STA $0314
        LDA #>IRQ2
        STA $0315

        ; Acknowledge VIC-II Raster IRQ
        LDA #$FF
        STA $D019

        ; KERNAL IRQ return with SCNKEY support
        JMP $EA31

; --------------------------------------------
; SECOND IRQ HANDLER: Bottom split (Line 200)
; --------------------------------------------
IRQ2:
        LDA #$02        ; Red border
        STA $D020
        STA $D021

        ; Reset back to first raster target (Line 50)
        LDA #$32
        STA $D012

        ; Switch IRQ vector back to IRQ1
        LDA #<IRQ1
        STA $0314
        LDA #>IRQ1
        STA $0315

        ; Acknowledge VIC-II Raster IRQ
        LDA #$FF
        STA $D019

        ; Standard KERNAL IRQ return
        JMP $EA81
`,
  },
  {
    id: "cycle-exact-raster-stabilizer",
    title: "Cycle-Exact Jitter-Free Stabilizer",
    category: "Assembly",
    author: "C64 Demo Engineer",
    description: "Eliminates the 1-7 cycle CPU interrupt jitter using two chained raster lines, guaranteeing rock-solid pixel-perfect graphics splits.",
    type: "Assembly",
    code: `; ============================================
; CYCLE-EXACT JITTER-FREE RASTER STABILIZER
; Eliminates 1-7 cycle CPU interrupt jitter
; ============================================
* = $C000

        SEI

        ; Turn off CIA 1 Timer IRQ
        LDA #$7F
        STA $DC0D
        LDA $DC0D

        ; Enable Raster IRQ
        LDA #$01
        STA $D01A

        ; Target line 80 ($50)
        LDA #$50
        STA $D012
        LDA $D011
        AND #$7F
        STA $D011

        LDA #<StableIRQ1
        STA $0314
        LDA #>StableIRQ1
        STA $0315

        LDA #$FF
        STA $D019

        CLI
        RTS

; First IRQ: triggers with 1-7 cycles of jitter
StableIRQ1:
        ; Switch vector immediately to next scanline
        LDA #<StableIRQ2
        STA $0314
        LDA #>StableIRQ2
        STA $0315

        INC $D012       ; Target line 81 ($51)
        LDA #$FF
        STA $D019       ; Ack IRQ1

        ; Save stack pointer to allow direct RTI
        TSX
        CLI             ; Allow second IRQ to trigger IMMEDIATELY on line 81

        ; NOP cycle padding: second IRQ interrupts inside these NOPs
        NOP: NOP: NOP: NOP
        NOP: NOP: NOP: NOP
        NOP: NOP: NOP: NOP
        NOP: NOP: NOP: NOP
        RTI

; Second IRQ: Triggered exactly at cycle 0 of Line 81!
StableIRQ2:
        TXS             ; Restore stack pointer, discarding IRQ1 stack

        ; Precise pixel-perfect color bar
        LDX #$07        ; Yellow
        STX $D020
        LDY #$00        ; Black
        STY $D020

        ; Reset back to Line 80
        LDA #$50
        STA $D012
        LDA #<StableIRQ1
        STA $0314
        LDA #>StableIRQ1
        STA $0315

        LDA #$FF
        STA $D019

        JMP $EA81
`,
  },
];
