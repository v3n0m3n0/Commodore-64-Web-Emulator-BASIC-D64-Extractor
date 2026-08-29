# 06. PETSCII Character Sets, Screen Codes & Keyboard Matrix

> **Source:** [mist64/c64ref](https://github.com/mist64/c64ref) (Lisa Brodner, Michael Steil)

## 1. Character Sets
The Commodore 64 Character Generator ROM contains two distinct 4 KB character sets selectable via `$D018` or `POKE 53272,...`:
1. **Uppercase / Graphics Set (Default at Boot):** Contains uppercase Latin letters, numbers, and full PETSCII geometric/drawing characters.
2. **Lowercase / Uppercase Set:** Contains lowercase Latin letters, uppercase Latin letters, and essential graphic characters.

---

## 2. Keyboard Matrix 8x8 Hardware Layout

| Row \ Col | Bit 0 (Col 0) | Bit 1 (Col 1) | Bit 2 (Col 2) | Bit 3 (Col 3) | Bit 4 (Col 4) | Bit 5 (Col 5) | Bit 6 (Col 6) | Bit 7 (Col 7) |
|---|---|---|---|---|---|---|---|---|
| **Bit 0 (Row 0)** | `DEL / BS` | `RETURN` | `CRSR R/L` | `F7` | `F1` | `F3` | `F5` | `CRSR U/D` |
| **Bit 1 (Row 1)** | `3 #` | `W` | `A` | `4 $` | `Z` | `S` | `E` | `LEFT SHIFT` |
| **Bit 2 (Row 2)** | `5 %` | `R` | `D` | `6 &` | `C` | `F` | `T` | `X` |
| **Bit 3 (Row 3)** | `7 '` | `Y` | `G` | `8 (` | `B` | `H` | `U` | `V` |
| **Bit 4 (Row 4)** | `9 )` | `I` | `J` | `0` | `M` | `K` | `O` | `N` |
| **Bit 5 (Row 5)** | `+ ` | `P` | `L` | `- ` | `. >` | `: [` | `@` | `, <` |
| **Bit 6 (Row 6)** | `£` | `* ` | `; ]` | `HOME/CLR` | `RIGHT SHIFT`| `= ` | `^ ` | `/ ?` |
| **Bit 7 (Row 7)** | `1 !` | `← (LEFT ARROW)`| `CTRL` | `2 "` | `SPACE` | `C= (COMMODORE)`| `Q` | `RUN/STOP` |
