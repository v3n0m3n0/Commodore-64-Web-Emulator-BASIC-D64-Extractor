/**
 * Commodore BASIC V2 Detokenizer & Tokenizer Engine
 * Converts binary BASIC PRG byte streams ($0801) into human-readable source listings,
 * and compiles standard uppercase text BASIC programs back into tokenized C64 RAM binaries.
 */

export class C64Basic {
  // Official Commodore BASIC V2 Keywords ($80-$CB)
  public static readonly TOKENS: { [token: number]: string } = {
    0x80: "END",
    0x81: "FOR",
    0x82: "NEXT",
    0x83: "DATA",
    0x84: "INPUT#",
    0x85: "INPUT",
    0x86: "DIM",
    0x87: "READ",
    0x88: "LET",
    0x89: "GOTO",
    0x8a: "RUN",
    0x8b: "IF",
    0x8c: "RESTORE",
    0x8d: "GOSUB",
    0x8e: "RETURN",
    0x8f: "REM",
    0x90: "STOP",
    0x91: "ON",
    0x92: "WAIT",
    0x93: "LOAD",
    0x94: "SAVE",
    0x95: "VERIFY",
    0x96: "DEF",
    0x97: "POKE",
    0x98: "PRINT#",
    0x99: "PRINT",
    0x9a: "CONT",
    0x9b: "LIST",
    0x9c: "CLR",
    0x9d: "CMD",
    0x9e: "SYS",
    0x9f: "OPEN",
    0xa0: "CLOSE",
    0xa1: "GET",
    0xa2: "NEW",
    0xa3: "TAB(",
    0xa4: "TO",
    0xa5: "FN",
    0xa6: "SPC(",
    0xa7: "THEN",
    0xa8: "NOT",
    0xa9: "STEP",
    0xaa: "+",
    0xab: "-",
    0xac: "*",
    0xad: "/",
    0xae: "^",
    0xaf: "AND",
    0xb0: "OR",
    0xb1: ">",
    0xb2: "=",
    0xb3: "<",
    0xb4: "SGN",
    0xb5: "INT",
    0xb6: "ABS",
    0xb7: "USR",
    0xb8: "FRE",
    0xb9: "POS",
    0xba: "SQR",
    0xbb: "RND",
    0xbc: "LOG",
    0xbd: "EXP",
    0xbe: "COS",
    0xbf: "SIN",
    0xc0: "TAN",
    0xc1: "ATN",
    0xc2: "PEEK",
    0xc3: "LEN",
    0xc4: "STR$",
    0xc5: "VAL",
    0xc6: "ASC",
    0xc7: "CHR$",
    0xc8: "LEFT$",
    0xc9: "RIGHT$",
    0xca: "MID$",
    0xcb: "GO",
  };

  // Reverse mapping for compiling plain text back to tokens (sorted by length descending for greedy match)
  private static readonly KEYWORD_MAP: readonly [string, number][] = Object.entries(C64Basic.TOKENS)
    .map(([k, v]) => [v, parseInt(k, 10)] as [string, number])
    .sort((a, b) => b[0].length - a[0].length);

  /**
   * Detokenize a binary BASIC PRG buffer (with or without 2-byte load address header)
   */
  public static detokenize(data: Uint8Array): string {
    if (data.length < 4) return "";

    let offset = 0;
    // If first two bytes are load address (e.g. 0x01, 0x08 -> $0801)
    if (data[0] === 0x01 && data[1] === 0x08) {
      offset = 2;
    }

    const lines: string[] = [];

    while (offset < data.length - 2) {
      // Next line pointer (2 bytes Little-Endian). If 0x0000 -> End of program
      const nextLinePtr = data[offset] | (data[offset + 1] << 8);
      if (nextLinePtr === 0) break;

      // Line number (2 bytes Little-Endian)
      const lineNum = data[offset + 2] | (data[offset + 3] << 8);
      offset += 4;

      let lineText = `${lineNum} `;
      let inQuotes = false;
      let inRem = false;

      while (offset < data.length) {
        const b = data[offset++];
        if (b === 0x00) {
          // End of this line
          break;
        }

        if (b === 0x22) { // Double quote
          inQuotes = !inQuotes;
          lineText += '"';
          continue;
        }

        if (inQuotes || inRem) {
          lineText += String.fromCharCode(b >= 0x20 && b <= 0x7e ? b : 0x20);
          continue;
        }

        // Check if byte is a keyword token ($80-$CB)
        if (b >= 0x80 && b <= 0xcb && C64Basic.TOKENS[b]) {
          const kw = C64Basic.TOKENS[b];
          lineText += kw;
          if (kw === "REM") {
            inRem = true;
          }
        } else {
          // Standard ASCII / PETSCII character
          lineText += String.fromCharCode(b >= 0x20 && b <= 0x7e ? b : 0x20);
        }
      }

      lines.push(lineText);
    }

    return lines.join("\n");
  }

  /**
   * Tokenize plain text BASIC program into Commodore binary PRG ($0801)
   */
  public static tokenize(source: string): Uint8Array {
    const rawLines = source
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("#") && !l.startsWith("//"));
    const byteChunks: number[] = [0x01, 0x08]; // $0801 load address header

    let currentMemoryAddr = 0x0801;
    let autoLineNum = 10;

    for (const line of rawLines) {
      // Match line number at start (e.g., "10 PRINT..." or unnumbered lines)
      let lineNum = autoLineNum;
      let rest = line;
      const match = line.match(/^(\d+)\s*(.*)$/);
      if (match) {
        lineNum = parseInt(match[1], 10);
        rest = match[2];
        autoLineNum = lineNum + 10;
      } else {
        autoLineNum += 10;
      }

      const lineTokens: number[] = [];
      let i = 0;
      let inQuotes = false;
      let inRem = false;

      while (i < rest.length) {
        const ch = rest[i];

        if (ch === '"') {
          inQuotes = !inQuotes;
          lineTokens.push(0x22);
          i++;
          continue;
        }

        if (inQuotes || inRem) {
          lineTokens.push(rest.charCodeAt(i) & 0xff);
          i++;
          continue;
        }

        // Shorthand for PRINT: ?
        if (ch === "?") {
          lineTokens.push(0x99); // PRINT token
          i++;
          continue;
        }

        // Shorthand for REM: '
        if (ch === "'") {
          lineTokens.push(0x8f); // REM token
          inRem = true;
          i++;
          continue;
        }

        // Check if starts with "GO TO" -> GOTO ($89)
        const subUpper = rest.substring(i).toUpperCase();
        if (subUpper.startsWith("GO TO")) {
          lineTokens.push(0x89);
          i += 5;
          continue;
        }

        // Try matching keywords ($80-$CB)
        let matched = false;
        for (const [kw, token] of C64Basic.KEYWORD_MAP) {
          if (subUpper.startsWith(kw)) {
            lineTokens.push(token);
            i += kw.length;
            if (kw === "REM") inRem = true;
            matched = true;
            break;
          }
        }

        if (!matched) {
          let code = rest.charCodeAt(i);
          // Convert lowercase ASCII a-z to uppercase A-Z outside quotes for C64 BASIC interpreter
          if (code >= 97 && code <= 122) {
            code -= 32;
          }
          lineTokens.push(code & 0xff);
          i++;
        }
      }

      // Line terminator
      lineTokens.push(0x00);

      // Calculate next line pointer: currentMemoryAddr + 4 header bytes (ptr + lineNum) + lineTokens length
      const nextLineAddr = currentMemoryAddr + 4 + lineTokens.length;

      byteChunks.push(nextLineAddr & 0xff);
      byteChunks.push((nextLineAddr >> 8) & 0xff);
      byteChunks.push(lineNum & 0xff);
      byteChunks.push((lineNum >> 8) & 0xff);

      for (const b of lineTokens) {
        byteChunks.push(b);
      }

      currentMemoryAddr = nextLineAddr;
    }

    // Program terminator: 2 zero bytes for next line pointer (0x0000)
    byteChunks.push(0x00);
    byteChunks.push(0x00);

    return new Uint8Array(byteChunks);
  }
}
