# 05. Commodore BASIC V2 Internals & Detokenization Reference

> **Source:** [mist64/c64ref](https://github.com/mist64/c64ref) (Microsoft BASIC V2 Source Code, Lee Davison disassembly)

## 1. BASIC Line Binary Structure in RAM ($0801)
Every line in a Commodore BASIC program is stored in memory as follows:
```
  +---------------+---------------+---------------+---------------+------------------+-----+
  | Offset +0 (L) | Offset +1 (H) | Offset +2 (L) | Offset +3 (H) | Tokenized Body.. | $00 |
  +---------------+---------------+---------------+---------------+------------------+-----+
  ^ Pointer to NEXT BASIC line    ^ Line Number (16-bit unsigned) ^ BASIC tokens & ASCII ^ Null terminator
```
- End of entire BASIC program is marked by two consecutive zero bytes: `00 00`.

---

## 2. Complete BASIC V2 Token Mapping Table ($80 - $FF)

| Token (Hex) | Keyword | Token (Hex) | Keyword | Token (Hex) | Keyword | Token (Hex) | Keyword |
|---|---|---|---|---|---|---|---|
| **$80** | `END` | **$90** | `TAB(` | **$A0** | `OPEN` | **$B0** | `SQR` |
| **$81** | `FOR` | **$91** | `TO` | **$A1** | `CLOSE` | **$B1** | `RND` |
| **$82** | `NEXT` | **$92** | `FN` | **$A2** | `GET` | **$B2** | `LOG` |
| **$83** | `DATA` | **$93** | `SPC(` | **$A3** | `NEW` | **$B3** | `EXP` |
| **$84** | `INPUT#`| **$94** | `THEN` | **$A4** | `TAB` | **$B4** | `COS` |
| **$85** | `INPUT` | **$95** | `NOT` | **$A5** | `SAVE` | **$B5** | `SIN` |
| **$86** | `DIM` | **$96** | `STEP` | **$A6** | `VERIFY` | **$B6** | `TAN` |
| **$87** | `READ` | **$97** | `+` | **$A7** | `DEF` | **$B7** | `ATN` |
| **$88** | `LET` | **$98** | `-` | **$A8** | `POKE` | **$B8** | `PEEK` |
| **$89** | `GOTO` | **$99** | `*` | **$A9** | `PRINT#`| **$B9** | `LEN` |
| **$8A** | `RUN` | **$9A** | `/` | **$AA** | `PRINT` | **$BA** | `STR$` |
| **$8B** | `IF` | **$9B** | `^` | **$AB** | `CONT` | **$BB** | `VAL` |
| **$8C** | `RESTORE`| **$9C**| `AND` | **$AC** | `LIST` | **$BC** | `ASC` |
| **$8D** | `GOSUB` | **$9D** | `OR` | **$AD** | `CLR` | **$BD** | `CHR$` |
| **$8E** | `RETURN`| **$9E** | `>` | **$AE** | `CMD` | **$BE** | `LEFT$`|
| **$8F** | `REM` | **$9F** | `=` | **$AF** | `SYS` | **$BF** | `RIGHT$`|
| | | | | | | **$C0** | `MID$` |
| | | | | | | **$C1** | `GO` |
| | | | | | | **$FF** | `{\pi}` ($pi$) |
