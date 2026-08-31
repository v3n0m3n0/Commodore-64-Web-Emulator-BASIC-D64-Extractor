# 06. PETSCII Character Sets, Screen Codes & Keyboard Matrix

> **Source References:**  
> - Commodore 64 Programmer's Reference Guide  
> - [mist64/c64ref](https://github.com/mist64/c64ref) (Lisa Brodner, Michael Steil)  
> - Wikimedia Commons PETSCII Standard Matrix (`File:C64_Petscii_Charts.png`)

---

## 1. Overview & Architecture

The Commodore 64 Character Generator ROM (MOS 901225-01, 4 KB at `$D000-$DFFF` in Char ROM bank) contains **two distinct 256-character font tables** (each taking 2 KB, 8 bytes per 8x8 glyph):

1. **Shifted Mode (Text / Lowercase & Uppercase Set)**:
   - Contains standard lowercase Latin letters (`a-z`), uppercase Latin letters (`A-Z`), numerals (`0-9`), and basic punctuation.
   - Switched via `PRINT CHR$(14)` or pressing `COMMODORE + SHIFT`.
   - Register bit: `$D018` bit 1 = 1 (Chargen offset `$1800` or `$1000`).

2. **Unshifted Mode (Graphics / Uppercase & Symbols Set - Default Boot)**:
   - Contains uppercase Latin letters (`A-Z`), numerals (`0-9`), card suits (♠, ♥, ♦, ♣), and full geometric drawing symbols, box borders, quadrants, and shading patterns.
   - Switched via `PRINT CHR$(142)`.
   - Register bit: `$D018` bit 1 = 0 (Chargen offset `$1000` or `$0000`).

---

## 2. PETSCII Visual Matrix Reference Charts ($20 - $BF)

### A. PETSCII (Shifted) — Lowercase & Uppercase Mode (`CHR$(14)`)

```
petscii (shifted):
   | 0 1 2 3 4 5 6 7 8 9 a b c d e f
---+--------------------------------
20 |   ! " # $ % & ' ( ) * + , - . /
30 | 0 1 2 3 4 5 6 7 8 9 : ; < = > ?
40 | @ a b c d e f g h i j k l m n o
50 | p q r s t u v w x y z [ £ ] ↑ ←
60 | ━ A B C D E F G H I J K L M N O
70 | P Q R S T U V W X Y Z + ▏ │ ▒ ░
a0 | █ ▌ ▄ ▔   ▏ ▒ ▕ ◤ ◥ ▞ ┫ ▍ ┛ ┏ ━
b0 | ┓ └ ┴ ┬ ┤ ▎ ▍ ▕ ▔ ▖ ▗ ╱ ╲ ▝ ▘ ▚
```

### B. PETSCII (Unshifted) — Uppercase & Graphics Mode (`CHR$(142)`)

```
PETSCII (UNSHIFTED):
   | 0 1 2 3 4 5 6 7 8 9 A B C D E F
---+--------------------------------
20 |   ! " # $ % & ' ( ) * + , - . /
30 | 0 1 2 3 4 5 6 7 8 9 : ; < = > ?
40 | @ A B C D E F G H I J K L M N O
50 | P Q R S T U V W X Y Z [ £ ] ↑ ←
60 | ━ ♠ ║ ─ ─ ─ ─ ─ │ ╭ ╮ └ ╲ ╱ ┌
70 | ┐ ● ▀ ♥ ▎ ╯ ╳ ○ ◈ ▒ ♦ ┼ ▏ │ π ◥
A0 | █ ▌ ▄ ▔   ▏ ▒ ▕ ◤ ◥ ▞ ┫ ▍ ┛ ┏ ━
B0 | ┓ └ ┴ ┬ ┤ ▎ ▍ ▕ ▔ ▖ ▗ ╱ ╲ ▝ ▘ ▚
```

---

## 3. PETSCII Control Codes ($00 - $1F, $80 - $9F)

PETSCII embeds operational codes directly in character streams outputted via `BSOUT` / `CHROUT` (`$FFD2`) and BASIC `PRINT`:

| Hex | Dec | Name | Function / Description | Keyboard Equivalent |
|---|---|---|---|---|
| `$03` | 3 | **STOP** | Check RUN/STOP key break | `RUN/STOP` |
| `$05` | 5 | **WHITE** | Select text color: White | `CTRL + 2` |
| `$08` | 8 | **DISABLE CBM+SHIFT** | Lock charset switching | `POKE 650,128` |
| `$09` | 9 | **ENABLE CBM+SHIFT** | Enable charset switching | `POKE 650,0` |
| `$0D` | 13 | **RETURN** | Carriage return & process line | `RETURN` |
| `$0E` | 14 | **TEXT MODE** | Switch to Lowercase / Uppercase font | `COMMODORE + SHIFT` |
| `$11` | 17 | **CRSR DOWN** | Move cursor one row down | `CRSR ↕` |
| `$12` | 18 | **RVS ON** | Reverse video characters ON | `CTRL + 9` |
| `$13` | 19 | **HOME** | Move cursor to top-left corner | `CLR/HOME` |
| `$14` | 20 | **DEL** | Delete character before cursor | `INST/DEL` |
| `$1C` | 28 | **RED** | Select text color: Red | `CTRL + 3` |
| `$1D` | 29 | **CRSR RIGHT** | Move cursor one column right | `CRSR ↔` |
| `$1E` | 30 | **GREEN** | Select text color: Green | `CTRL + 6` |
| `$1F` | 31 | **BLUE** | Select text color: Blue | `CTRL + 7` |
| `$81` | 129 | **ORANGE** | Select text color: Orange | `C= + 1` |
| `$8E` | 142 | **GRAPHICS MODE** | Switch to Uppercase / Graphics font | — |
| `$90` | 144 | **BLACK** | Select text color: Black | `CTRL + 1` |
| `$91` | 145 | **CRSR UP** | Move cursor one row up | `SHIFT + CRSR ↕` |
| `$92` | 146 | **RVS OFF** | Reverse video characters OFF | `CTRL + 0` |
| `$93` | 147 | **CLR** | Clear screen and home cursor | `SHIFT + CLR/HOME` |
| `$94` | 148 | **INST** | Insert space at cursor position | `SHIFT + INST/DEL` |
| `$95` | 149 | **BROWN** | Select text color: Brown | `C= + 2` |
| `$96` | 150 | **LIGHT RED** | Select text color: Light Red | `C= + 3` |
| `$97` | 151 | **DARK GREY** | Select text color: Dark Grey (Grey 1) | `C= + 4` |
| `$98` | 152 | **GREY 2** | Select text color: Medium Grey | `C= + 5` |
| `$99` | 153 | **LIGHT GREEN**| Select text color: Light Green | `C= + 6` |
| `$9A` | 154 | **LIGHT BLUE** | Select text color: Light Blue | `C= + 7` |
| `$9B` | 155 | **GREY 3** | Select text color: Light Grey | `C= + 8` |
| `$9C` | 156 | **PURPLE** | Select text color: Purple | `CTRL + 5` |
| `$9D` | 157 | **CRSR LEFT** | Move cursor one column left | `SHIFT + CRSR ↔` |
| `$9E` | 158 | **YELLOW** | Select text color: Yellow | `CTRL + 8` |
| `$9F` | 159 | **CYAN** | Select text color: Cyan | `CTRL + 4` |

---

## 4. Screen Code Conversion Mathematics

When writing directly to VIC-II Screen RAM (`$0400-$07E7`) via `POKE 1024+x, sc`, **Screen Codes** must be used rather than PETSCII values:

```
+--------------------------+----------------------------+
| PETSCII Code Range       | Conversion to Screen Code  |
+--------------------------+----------------------------+
| $00 .. $1F               | Screen Code = PETSCII + 128|
| $20 .. $3F (Punct/Digits)| Screen Code = PETSCII      |
| $40 .. $5F (Upper Letters| Screen Code = PETSCII - 64 |
| $60 .. $7F (Symbols/Lower| Screen Code = PETSCII - 32 |
| $80 .. $9F (Controls)    | Screen Code = PETSCII + 64 |
| $A0 .. $BF (Shift/CBM)   | Screen Code = PETSCII - 64 |
| $C0 .. $FE (Graphics/Caps| Screen Code = PETSCII - 128|
| $FF (Pi Symbol π)        | Screen Code = 94 ($5E)     |
+--------------------------+----------------------------+
```

---

## 5. Keyboard Matrix 8x8 Hardware Layout (CIA 1 $DC00 / $DC01)

The keyboard matrix is an 8-row by 8-column switch network scanned at 60 Hz by CIA 1 via port registers `$DC00` (Port A outputs row ground) and `$DC01` (Port B inputs column pull-ups):

| Row \ Col | Bit 0 (Col 0) | Bit 1 (Col 1) | Bit 2 (Col 2) | Bit 3 (Col 3) | Bit 4 (Col 4) | Bit 5 (Col 5) | Bit 6 (Col 6) | Bit 7 (Col 7) |
|---|---|---|---|---|---|---|---|---|
| **Bit 0 (Row 0)** | `DEL / BS` | `RETURN` | `CRSR R/L` | `F7` | `F1` | `F3` | `F5` | `CRSR U/D` |
| **Bit 1 (Row 1)** | `3 #` | `W` | `A` | `4 $` | `Z` | `S` | `E` | `LEFT SHIFT` |
| **Bit 2 (Row 2)** | `5 %` | `R` | `D` | `6 &` | `C` | `F` | `T` | `X` |
| **Bit 3 (Row 3)** | `7 '` | `Y` | `G` | `8 (` | `B` | `H` | `U` | `V` |
| **Bit 4 (Row 4)** | `9 )` | `I` | `J` | `0` | `M` | `K` | `O` | `N` |
| **Bit 5 (Row 5)** | `+ ` | `P` | `L` | `- ` | `. >` | `: [` | `@` | `, <` |
| **Bit 6 (Row 6)** | `£` | `* ` | `; ]` | `HOME/CLR` | `RIGHT SHIFT`| `= ` | `^ ` | `/ ?` |
| **Bit 7 (Row 7)** | `1 !` | `← (LEFT)` | `CTRL` | `2 "` | `SPACE` | `C= (CBM)` | `Q` | `RUN/STOP` |

### Modifier Keys and Decoding
- **`$028D` (`SHFLAG`)**: Byte indicating active modifier keys:
  - Bit 0 (`$01`): Left / Right Shift pressed.
  - Bit 1 (`$02`): Commodore (`C=`) key pressed.
  - Bit 2 (`$04`): Control (`CTRL`) key pressed.
- **`$00C5` (`LSTX`)**: Matrix code of the last key pressed (64 = `$40` if no key).
- **`$00C6` (`NDX`)**: Number of characters currently in keyboard queue buffer (`$0277-$0280`, max 10 characters).

