/**
 * Commodore 64 PETSCII Character Set & Graphical Tables
 * Compliant with Commodore 64 User's Guide & VICE standard specifications.
 */

export interface PetsciiGlyph {
  code: number;          // Decimal PETSCII (0-255)
  hex: string;           // e.g. "$41"
  screenCode: number;    // Screen code for POKE $0400+x
  glyph: string;         // Unicode display glyph or symbol
  name: string;          // Human readable name
  category: "letters" | "numbers" | "punctuation" | "boxes" | "shapes" | "shading" | "math" | "control";
  keyChord?: string;     // e.g. "C= + A", "SHIFT + S", "CTRL + 1"
  colorHex?: string;     // If it's a color control code
}

export const PETSCII_TABLE: PetsciiGlyph[] = [
  // Control codes
  { code: 147, hex: "$93", screenCode: 0, glyph: "CLR", name: "CLR (Clear Screen)", category: "control", keyChord: "SHIFT + CLR/HOME" },
  { code: 19, hex: "$13", screenCode: 0, glyph: "HOME", name: "HOME (Cursor Top-Left)", category: "control", keyChord: "CLR/HOME" },
  { code: 20, hex: "$14", screenCode: 0, glyph: "DEL", name: "DEL (Delete Character)", category: "control", keyChord: "INST/DEL" },
  { code: 148, hex: "$94", screenCode: 0, glyph: "INST", name: "INST (Insert Character)", category: "control", keyChord: "SHIFT + INST/DEL" },
  { code: 13, hex: "$0D", screenCode: 0, glyph: "RET", name: "RETURN (Enter)", category: "control", keyChord: "RETURN" },
  { code: 3, hex: "$03", screenCode: 0, glyph: "STOP", name: "RUN/STOP", category: "control", keyChord: "RUN/STOP" },
  { code: 18, hex: "$12", screenCode: 0, glyph: "RVS ON", name: "RVS ON (Reverse Video On)", category: "control", keyChord: "CTRL + 9" },
  { code: 146, hex: "$92", screenCode: 0, glyph: "RVS OFF", name: "RVS OFF (Reverse Video Off)", category: "control", keyChord: "CTRL + 0" },
  { code: 17, hex: "$11", screenCode: 0, glyph: "↓", name: "CRSR DOWN", category: "control", keyChord: "CRSR ↕" },
  { code: 145, hex: "$91", screenCode: 0, glyph: "↑", name: "CRSR UP", category: "control", keyChord: "SHIFT + CRSR ↕" },
  { code: 29, hex: "$1D", screenCode: 0, glyph: "→", name: "CRSR RIGHT", category: "control", keyChord: "CRSR ↔" },
  { code: 157, hex: "$9D", screenCode: 0, glyph: "←", name: "CRSR LEFT", category: "control", keyChord: "SHIFT + CRSR ↔" },

  // Colors (CTRL + 1..8 and C= + 1..8)
  { code: 144, hex: "$90", screenCode: 0, glyph: "BLK", name: "Color: Black", category: "control", keyChord: "CTRL + 1", colorHex: "#000000" },
  { code: 5, hex: "$05", screenCode: 0, glyph: "WHT", name: "Color: White", category: "control", keyChord: "CTRL + 2", colorHex: "#FFFFFF" },
  { code: 28, hex: "$1C", screenCode: 0, glyph: "RED", name: "Color: Red", category: "control", keyChord: "CTRL + 3", colorHex: "#880000" },
  { code: 159, hex: "$9F", screenCode: 0, glyph: "CYN", name: "Color: Cyan", category: "control", keyChord: "CTRL + 4", colorHex: "#AAFFEE" },
  { code: 156, hex: "$9C", screenCode: 0, glyph: "PUR", name: "Color: Purple", category: "control", keyChord: "CTRL + 5", colorHex: "#CC44CC" },
  { code: 30, hex: "$1E", screenCode: 0, glyph: "GRN", name: "Color: Green", category: "control", keyChord: "CTRL + 6", colorHex: "#00CC55" },
  { code: 31, hex: "$1F", screenCode: 0, glyph: "BLU", name: "Color: Blue", category: "control", keyChord: "CTRL + 7", colorHex: "#0000AA" },
  { code: 158, hex: "$9E", screenCode: 0, glyph: "YEL", name: "Color: Yellow", category: "control", keyChord: "CTRL + 8", colorHex: "#EEEE77" },
  { code: 129, hex: "$81", screenCode: 0, glyph: "ORNG", name: "Color: Orange", category: "control", keyChord: "C= + 1", colorHex: "#DD8855" },
  { code: 149, hex: "$95", screenCode: 0, glyph: "BRN", name: "Color: Brown", category: "control", keyChord: "C= + 2", colorHex: "#664400" },
  { code: 150, hex: "$96", screenCode: 0, glyph: "LRED", name: "Color: Light Red", category: "control", keyChord: "C= + 3", colorHex: "#FF7777" },
  { code: 151, hex: "$97", screenCode: 0, glyph: "GRY1", name: "Color: Dark Grey", category: "control", keyChord: "C= + 4", colorHex: "#333333" },
  { code: 152, hex: "$98", screenCode: 0, glyph: "GRY2", name: "Color: Medium Grey", category: "control", keyChord: "C= + 5", colorHex: "#777777" },
  { code: 153, hex: "$99", screenCode: 0, glyph: "LGRN", name: "Color: Light Green", category: "control", keyChord: "C= + 6", colorHex: "#AAFF66" },
  { code: 154, hex: "$9A", screenCode: 0, glyph: "LBLU", name: "Color: Light Blue", category: "control", keyChord: "C= + 7", colorHex: "#0088FF" },
  { code: 155, hex: "$9B", screenCode: 0, glyph: "GRY3", name: "Color: Light Grey", category: "control", keyChord: "C= + 8", colorHex: "#BBBBBB" },

  // Card Suits & Geometric Shapes (SHIFT + A-Z)
  { code: 193, hex: "$C1", screenCode: 65, glyph: "♠", name: "Spade Suit", category: "shapes", keyChord: "SHIFT + A" },
  { code: 211, hex: "$D3", screenCode: 83, glyph: "♥", name: "Heart Suit", category: "shapes", keyChord: "SHIFT + S" },
  { code: 196, hex: "$C4", screenCode: 68, glyph: "♦", name: "Diamond Suit", category: "shapes", keyChord: "SHIFT + D" },
  { code: 198, hex: "$C6", screenCode: 70, glyph: "♣", name: "Club Suit", category: "shapes", keyChord: "SHIFT + F" },
  { code: 209, hex: "$D1", screenCode: 81, glyph: "●", name: "Solid Circle", category: "shapes", keyChord: "SHIFT + Q" },
  { code: 215, hex: "$D7", screenCode: 87, glyph: "○", name: "Open Circle", category: "shapes", keyChord: "SHIFT + W" },
  { code: 218, hex: "$DA", screenCode: 90, glyph: "◈", name: "Diamond Check / Target", category: "shapes", keyChord: "SHIFT + Z" },
  { code: 214, hex: "$D6", screenCode: 86, glyph: "☒", name: "Check Box / Square X", category: "shapes", keyChord: "SHIFT + V" },
  { code: 255, hex: "$FF", screenCode: 94, glyph: "π", name: "Pi Symbol (π)", category: "math", keyChord: "SHIFT + ↑" },

  // Box Drawing, Corners & Lines (SHIFT & CBM)
  { code: 213, hex: "$D5", screenCode: 85, glyph: "╭", name: "Top-Left Arc / Corner", category: "boxes", keyChord: "SHIFT + U" },
  { code: 201, hex: "$C9", screenCode: 73, glyph: "╮", name: "Top-Right Arc / Corner", category: "boxes", keyChord: "SHIFT + I" },
  { code: 207, hex: "$CF", screenCode: 79, glyph: "╰", name: "Bottom-Left Arc / Corner", category: "boxes", keyChord: "SHIFT + O" },
  { code: 208, hex: "$D0", screenCode: 80, glyph: "╯", name: "Bottom-Right Arc / Corner", category: "boxes", keyChord: "SHIFT + P" },
  { code: 176, hex: "$B0", screenCode: 112, glyph: "◤", name: "Upper-Left Triangle", category: "shapes", keyChord: "C= + A" },
  { code: 174, hex: "$AE", screenCode: 110, glyph: "◣", name: "Lower-Left Triangle", category: "shapes", keyChord: "C= + S" },
  { code: 189, hex: "$BD", screenCode: 125, glyph: "◢", name: "Lower-Right Triangle", category: "shapes", keyChord: "C= + X" },
  { code: 190, hex: "$BE", screenCode: 126, glyph: "◥", name: "Upper-Right Triangle", category: "shapes", keyChord: "C= + V" },
  { code: 195, hex: "$C3", screenCode: 67, glyph: "═", name: "Double Horizontal Line", category: "boxes", keyChord: "SHIFT + C" },
  { code: 194, hex: "$C2", screenCode: 66, glyph: "║", name: "Double Vertical Line", category: "boxes", keyChord: "SHIFT + B" },
  { code: 192, hex: "$C0", screenCode: 64, glyph: "━", name: "Thick Horizontal Line", category: "boxes", keyChord: "SHIFT + *" },
  { code: 221, hex: "$DD", screenCode: 93, glyph: "│", name: "Thin Vertical Line", category: "boxes", keyChord: "SHIFT + -" },
  { code: 219, hex: "$DB", screenCode: 91, glyph: "┼", name: "Cross Line Junction", category: "boxes", keyChord: "SHIFT + +" },
  { code: 178, hex: "$B2", screenCode: 114, glyph: "┬", name: "Tee Top Junction", category: "boxes", keyChord: "C= + R" },
  { code: 163, hex: "$A3", screenCode: 99, glyph: "┴", name: "Tee Bottom Junction", category: "boxes", keyChord: "C= + T" },
  { code: 177, hex: "$B1", screenCode: 113, glyph: "┿", name: "Center Cross Hair", category: "boxes", keyChord: "C= + E" },

  // Shading, Blocks & Hatching (SHIFT & CBM)
  { code: 160, hex: "$A0", screenCode: 32, glyph: "█", name: "Full Solid Block", category: "shading", keyChord: "SHIFT + SPACE" },
  { code: 204, hex: "$CC", screenCode: 76, glyph: "▒", name: "Medium Checker Shading", category: "shading", keyChord: "SHIFT + L" },
  { code: 216, hex: "$D8", screenCode: 88, glyph: "░", name: "Light Dotted Shading", category: "shading", keyChord: "SHIFT + X" },
  { code: 166, hex: "$A6", screenCode: 102, glyph: "▚", name: "Checker Quadrant", category: "shading", keyChord: "C= + +" },
  { code: 200, hex: "$C8", screenCode: 72, glyph: "▎", name: "Left Quarter Bar", category: "shading", keyChord: "SHIFT + H" },
  { code: 217, hex: "$D9", screenCode: 89, glyph: "▍", name: "Left Half Bar", category: "shading", keyChord: "SHIFT + Y" },
  { code: 210, hex: "$D2", screenCode: 82, glyph: "▀", name: "Upper Half Block", category: "shading", keyChord: "SHIFT + R" },
  { code: 206, hex: "$CE", screenCode: 78, glyph: "╱", name: "Diagonal Slash Hatch", category: "shading", keyChord: "SHIFT + N" },
  { code: 205, hex: "$CD", screenCode: 77, glyph: "╲", name: "Backslash Hatch", category: "shading", keyChord: "SHIFT + M" },
  { code: 168, hex: "$A8", screenCode: 104, glyph: "▖", name: "Lower-Left Quadrant", category: "shading", keyChord: "C= + £" },
  { code: 223, hex: "$DF", screenCode: 95, glyph: "▗", name: "Lower-Right Quadrant", category: "shading", keyChord: "C= + P" },
  { code: 191, hex: "$BF", screenCode: 127, glyph: "▘", name: "Upper-Left Quadrant", category: "shading", keyChord: "C= + B" },
  { code: 170, hex: "$AA", screenCode: 106, glyph: "▄", name: "Lower Half Block", category: "shading", keyChord: "C= + N" },
  { code: 169, hex: "$A9", screenCode: 105, glyph: "▌", name: "Left Half Block", category: "shading", keyChord: "C= + M" },
];

export const PETSCII_CATEGORIES = [
  { id: "all", name: "Wszystkie Symbole" },
  { id: "shapes", name: "Karty i Kształty (♠♥♦♣●○)" },
  { id: "boxes", name: "Ramki i Narożniki (╭╮╰╯═║┬┴)" },
  { id: "shading", name: "Siatki i Cieniowanie (█▒░▚▄▌)" },
  { id: "control", name: "Kody Sterujące i Kolory (CLR, RVS, BLK)" },
  { id: "math", name: "Matematyka i Strzałki (π, ←, ↑)" },
] as const;
