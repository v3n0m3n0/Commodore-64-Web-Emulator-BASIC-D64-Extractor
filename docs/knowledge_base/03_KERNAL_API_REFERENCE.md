# 03. Commodore 64 KERNAL API & Jump Vector Reference

> **Source:** [mist64/c64ref](https://github.com/mist64/c64ref) (Dan Heeb, Sheldon Leemon, Todd Heimarck, CBM PRG)

## 1. Overview
The Commodore 64 KERNAL contains a standardized jump vector table at the top of ROM (`$FF81-$FFF3`).
Programs should **ALWAYS** invoke KERNAL routines via these standard jump table addresses rather than direct entry points to maintain compatibility across all C64 board revisions, SuperCPU, and C128 C64-mode.

---

## 2. Complete KERNAL Jump Table ($FF81 - $FFF3)

| Address | Routine | Purpose | Input Registers | Output Registers | Modifies |
|---|---|---|---|---|---|
| **$FF81** | `SCINIT / CINT` | Initialize VIC-II & Screen Editor | None | None | A, X, Y |
| **$FF84** | `IOINIT` | Initialize CIA 1 & CIA 2 I/O chips | None | None | A, X |
| **$FF87** | `RAMTAS` | Initialize RAM & allocate tape buffer | None | Top of RAM in `$0283` | A, X, Y |
| **$FF8A** | `RESTOR` | Restore default KERNAL vectors | None | None | None |
| **$FF8D** | `VECTOR` | Read / Set KERNAL vectors | Carry: 0=Set, 1=Read; X/Y: pointer | X/Y: vector table | A, X, Y |
| **$FF90** | `SETMSG` | Set KERNAL message control | A: Message flag (bit 7=error, bit 6=control) | None | A |
| **$FF93** | `SECOND` | Send secondary address after `LISTEN` | A: Secondary address | None | A |
| **$FF96** | `TKSA` | Send secondary address after `TALK` | A: Secondary address | None | A |
| **$FF99** | `MEMTOP` | Read / Set top of user RAM | Carry: 0=Set, 1=Read; X/Y: address | X/Y: address | X, Y |
| **$FF9C** | `MEMBOT` | Read / Set bottom of user RAM | Carry: 0=Set, 1=Read; X/Y: address | X/Y: address | X, Y |
| **$FF9F** | `SCNKEY` | Scan keyboard matrix | None | Decoded key in `$00C6` | A, X, Y |
| **$FFA2** | `SETTMO` | Set IEEE-488 bus timeout | A: Timeout value | None | None |
| **$FFA5** | `ACPTR / IECIN`| Read byte from serial IEC bus | None | A: Data byte | A |
| **$FFA8** | `CIOUT / IECOUT`| Write byte to serial IEC bus | A: Data byte | None | None |
| **$FFAB** | `UNTLK` | Send UNTALK to serial IEC bus | None | None | A |
| **$FFAE** | `UNLSN` | Send UNLISTEN to serial IEC bus | None | None | A |
| **$FFB1** | `LISTEN` | Command serial IEC device to LISTEN | A: Device number (8-15) | None | A |
| **$FFB4** | `TALK` | Command serial IEC device to TALK | A: Device number (8-15) | None | A |
| **$FFB7** | `READST` | Read I/O Status Word | None | A: Status byte (`$0090`) | A |
| **$FFBA** | `SETLFS` | Set Logical, First & Second Address | A: Logical, X: Device, Y: Secondary | None | None |
| **$FFBD** | `SETNAM` | Set File Name | A: Length, X/Y: Address Pointer | None | None |
| **$FFC0** | `OPEN` | Open Logical File | None | Carry: 0=OK, 1=Error (A=error code)| A, X, Y |
| **$FFC3** | `CLOSE` | Close Logical File | A: Logical file number | None | A, X, Y |
| **$FFC6** | `CHKIN` | Set Input Channel | X: Logical file number | None | A, X |
| **$FFC9** | `CHKOUT` | Set Output Channel | X: Logical file number | None | A, X |
| **$FFCC** | `CLRCHN` | Clear Channels & restore default I/O | None | None | A, X |
| **$FFCF** | `CHRIN / BASIN`| Read character from input channel | None | A: PETSCII character | A |
| **$FFD2** | `CHROUT / BSOUT`| Write character to output channel | A: PETSCII character | None | None |
| **$FFD5** | `LOAD` | Load RAM from device | A: 0=Load, 1=Verify; X/Y: Alt Address | X/Y: Highest loaded address | A, X, Y |
| **$FFD8** | `SAVE` | Save RAM to device | A: Zero page pointer to start; X/Y: End | Carry: 0=OK, 1=Error | A, X, Y |
| **$FFDB** | `SETTIM` | Set System Clock (`$00A0-$00A2`) | A/X/Y: 24-bit jiffies value | None | None |
| **$FFDE** | `RDTIM` | Read System Clock | None | A: MSB, X: Mid, Y: LSB | A, X, Y |
| **$FFE1** | `STOP` | Check RUN/STOP key | None | Zero Flag: 1=Pressed, 0=Not | A, X |
| **$FFE4** | `GETIN` | Get character from keyboard buffer | None | A: PETSCII character (0 = empty) | A, X, Y |
| **$FFE7** | `CLALL` | Close all logical files & clear channels | None | None | A, X |
| **$FFEA** | `UDTIM` | Update 60Hz Clock & check STOP | None | None | A, X |
| **$FFED** | `SCREEN` | Return Screen Dimensions | None | X: Columns (40), Y: Rows (25) | X, Y |
| **$FFF0** | `PLOT` | Read / Set Cursor Position | Carry: 0=Set (X=Row, Y=Col), 1=Read | X: Row, Y: Col | X, Y |
| **$FFF3** | `IOBASE` | Return Base Address of CIA 1 | None | X/Y: Pointer (`$DC00`) | X, Y |

---

## 3. Idiomatic Assembly Code Examples

### A. Print String via CHROUT ($FFD2)
```assembly
* = $C000
        LDX #$00
PRINT_LOOP:
        LDA MESSAGE,X
        BEQ FINISHED
        JSR $FFD2       ; CHROUT
        INX
        BNE PRINT_LOOP
FINISHED:
        RTS

MESSAGE:
        .text "COMMODORE 64 KERNAL API OK!", 13, 0
```

### B. Read Keyboard via GETIN ($FFE4)
```assembly
WAIT_KEY:
        JSR $FFE4       ; GETIN
        BEQ WAIT_KEY    ; Loop while buffer empty (A = 0)
        CMP #13         ; Check if ENTER key pressed
        BEQ ENTER_PRESSED
        JSR $FFD2       ; Echo character back to screen
        JMP WAIT_KEY
ENTER_PRESSED:
        RTS
```
