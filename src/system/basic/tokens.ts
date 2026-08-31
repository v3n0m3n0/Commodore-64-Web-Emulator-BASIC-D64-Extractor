/**
 * Commodore 64 BASIC V2 Token Definitions and Dispatch Vectors
 * ROM Range: $A000 - $A3FF
 */

export interface BasicToken {
  token: number;
  keyword: string;
  entryPoint: number;
  description: string;
  type: "STATEMENT" | "FUNCTION" | "OPERATOR" | "CLAUSE";
}

export const BASIC_V2_TOKENS: BasicToken[] = [
  // Statements ($80 - $A0)
  { token: 0x80, keyword: "END", entryPoint: 0xA831, description: "Terminates program execution", type: "STATEMENT" },
  { token: 0x81, keyword: "FOR", entryPoint: 0xA742, description: "Initiates a loop with index variable", type: "STATEMENT" },
  { token: 0x82, keyword: "NEXT", entryPoint: 0xAD1E, description: "Advances FOR loop counter", type: "STATEMENT" },
  { token: 0x83, keyword: "DATA", entryPoint: 0xA8F8, description: "Stores constant data elements", type: "STATEMENT" },
  { token: 0x84, keyword: "INPUT#", entryPoint: 0xABBF, description: "Reads input from logical device", type: "STATEMENT" },
  { token: 0x85, keyword: "INPUT", entryPoint: 0xABB2, description: "Prompts user for keyboard input", type: "STATEMENT" },
  { token: 0x86, keyword: "DIM", entryPoint: 0xB016, description: "Allocates array dimensions in memory", type: "STATEMENT" },
  { token: 0x87, keyword: "READ", entryPoint: 0xAC06, description: "Reads values from DATA statements", type: "STATEMENT" },
  { token: 0x88, keyword: "LET", entryPoint: 0xA9A5, description: "Assigns value to variable", type: "STATEMENT" },
  { token: 0x89, keyword: "GOTO", entryPoint: 0xA8A0, description: "Unconditional jump to line number", type: "STATEMENT" },
  { token: 0x8A, keyword: "RUN", entryPoint: 0xA871, description: "Executes program from beginning or line", type: "STATEMENT" },
  { token: 0x8B, keyword: "IF", entryPoint: 0xA928, description: "Conditional branch execution", type: "STATEMENT" },
  { token: 0x8C, keyword: "RESTORE", entryPoint: 0xA81D, description: "Resets DATA pointer to first entry", type: "STATEMENT" },
  { token: 0x8D, keyword: "GOSUB", entryPoint: 0xA883, description: "Calls subroutine at line number", type: "STATEMENT" },
  { token: 0x8E, keyword: "RETURN", entryPoint: 0xA8D2, description: "Returns from subroutine to caller", type: "STATEMENT" },
  { token: 0x8F, keyword: "REM", entryPoint: 0xA8F8, description: "Comment line (ignored by interpreter)", type: "STATEMENT" },
  { token: 0x90, keyword: "STOP", entryPoint: 0xA82F, description: "Halts execution with BREAK message", type: "STATEMENT" },
  { token: 0x91, keyword: "ON", entryPoint: 0xA94B, description: "Multi-way branch on numerical index", type: "STATEMENT" },
  { token: 0x92, keyword: "WAIT", entryPoint: 0xB82D, description: "Waits for memory address bit condition", type: "STATEMENT" },
  { token: 0x93, keyword: "LOAD", entryPoint: 0xE168, description: "Loads program into RAM from device", type: "STATEMENT" },
  { token: 0x94, keyword: "SAVE", entryPoint: 0xE156, description: "Saves program to storage device", type: "STATEMENT" },
  { token: 0x95, keyword: "VERIFY", entryPoint: 0xE165, description: "Verifies program in RAM against storage", type: "STATEMENT" },
  { token: 0x96, keyword: "DEF", entryPoint: 0xB3B3, description: "Defines single-line user function FN", type: "STATEMENT" },
  { token: 0x97, keyword: "POKE", entryPoint: 0xB824, description: "Writes single byte to memory address", type: "STATEMENT" },
  { token: 0x98, keyword: "PRINT#", entryPoint: 0xAAA0, description: "Outputs data to logical device", type: "STATEMENT" },
  { token: 0x99, keyword: "PRINT", entryPoint: 0xAA9A, description: "Outputs text or numerical expressions", type: "STATEMENT" },
  { token: 0x9A, keyword: "CONT", entryPoint: 0xA857, description: "Continues program execution after STOP", type: "STATEMENT" },
  { token: 0x9B, keyword: "LIST", entryPoint: 0xA69C, description: "Lists BASIC program source lines", type: "STATEMENT" },
  { token: 0x9C, keyword: "CLR", entryPoint: 0xA65E, description: "Clears variables, arrays, and stack", type: "STATEMENT" },
  { token: 0x9D, keyword: "CMD", entryPoint: 0xAA86, description: "Redirects default output channel", type: "STATEMENT" },
  { token: 0x9E, keyword: "SYS", entryPoint: 0xA7E7, description: "Executes machine language routine at address", type: "STATEMENT" },
  { token: 0x9F, keyword: "OPEN", entryPoint: 0xBA28, description: "Opens a logical channel to file/device", type: "STATEMENT" },
  { token: 0xA0, keyword: "CLOSE", entryPoint: 0xBA3E, description: "Closes an open logical file channel", type: "STATEMENT" },
  { token: 0xA1, keyword: "GET", entryPoint: 0xAB7B, description: "Fetches single keypress character", type: "STATEMENT" },
  { token: 0xA2, keyword: "NEW", entryPoint: 0xA642, description: "Erases BASIC program and resets pointers", type: "STATEMENT" },

  // Clauses & Operators ($A3 - $B3)
  { token: 0xA3, keyword: "TAB(", entryPoint: 0xAA3B, description: "Positions cursor horizontally to column", type: "CLAUSE" },
  { token: 0xA4, keyword: "TO", entryPoint: 0x0000, description: "Clause for FOR statement", type: "CLAUSE" },
  { token: 0xA5, keyword: "FN", entryPoint: 0xB3E1, description: "Calls user-defined function", type: "CLAUSE" },
  { token: 0xA6, keyword: "SPC(", entryPoint: 0xAA38, description: "Prints specified number of spaces", type: "CLAUSE" },
  { token: 0xA7, keyword: "THEN", entryPoint: 0x0000, description: "Clause for IF conditional branch", type: "CLAUSE" },
  { token: 0xA8, keyword: "NOT", entryPoint: 0xAF0D, description: "Logical bitwise NOT operator", type: "OPERATOR" },
  { token: 0xA9, keyword: "STEP", entryPoint: 0x0000, description: "Specifies increment step in FOR loop", type: "CLAUSE" },
  { token: 0xAA, keyword: "+", entryPoint: 0xB853, description: "Addition or string concatenation", type: "OPERATOR" },
  { token: 0xAB, keyword: "-", entryPoint: 0xB849, description: "Subtraction or unary negation", type: "OPERATOR" },
  { token: 0xAC, keyword: "*", entryPoint: 0xBA28, description: "Floating-point multiplication", type: "OPERATOR" },
  { token: 0xAD, keyword: "/", entryPoint: 0xBB0F, description: "Floating-point division", type: "OPERATOR" },
  { token: 0xAE, keyword: "^", entryPoint: 0xBF7B, description: "Exponentiation power operator", type: "OPERATOR" },
  { token: 0xAF, keyword: "AND", entryPoint: 0xAFE9, description: "Logical bitwise AND operator", type: "OPERATOR" },
  { token: 0xB0, keyword: "OR", entryPoint: 0xAFE6, description: "Logical bitwise OR operator", type: "OPERATOR" },
  { token: 0xB1, keyword: ">", entryPoint: 0xAE19, description: "Greater than comparison operator", type: "OPERATOR" },
  { token: 0xB2, keyword: "=", entryPoint: 0xAE19, description: "Equality comparison or assignment", type: "OPERATOR" },
  { token: 0xB3, keyword: "<", entryPoint: 0xAE19, description: "Less than comparison operator", type: "OPERATOR" },

  // Built-in Mathematical and String Functions ($B4 - $FF)
  { token: 0xB4, keyword: "SGN", entryPoint: 0xBC39, description: "Sign function (-1, 0, +1)", type: "FUNCTION" },
  { token: 0xB5, keyword: "INT", entryPoint: 0xBCCC, description: "Floor integer conversion", type: "FUNCTION" },
  { token: 0xB6, keyword: "ABS", entryPoint: 0xBC58, description: "Absolute positive value", type: "FUNCTION" },
  { token: 0xB7, keyword: "USR", entryPoint: 0x0310, description: "Calls user machine code function vector", type: "FUNCTION" },
  { token: 0xB8, keyword: "FRE", entryPoint: 0xB37D, description: "Returns free RAM memory bytes", type: "FUNCTION" },
  { token: 0xB9, keyword: "POS", entryPoint: 0xB39E, description: "Returns cursor horizontal position", type: "FUNCTION" },
  { token: 0xBA, keyword: "SQR", entryPoint: 0xBF71, description: "Square root mathematical function", type: "FUNCTION" },
  { token: 0xBB, keyword: "RND", entryPoint: 0xBF8B, description: "Pseudo-random number generator", type: "FUNCTION" },
  { token: 0xBC, keyword: "LOG", entryPoint: 0xB9EA, description: "Natural logarithm function", type: "FUNCTION" },
  { token: 0xBD, keyword: "EXP", entryPoint: 0xBFED, description: "Natural exponential function (e^x)", type: "FUNCTION" },
  { token: 0xBE, keyword: "COS", entryPoint: 0xE264, description: "Cosine trigonometric function", type: "FUNCTION" },
  { token: 0xBF, keyword: "SIN", entryPoint: 0xE26B, description: "Sine trigonometric function", type: "FUNCTION" },
  { token: 0xC0, keyword: "TAN", entryPoint: 0xE2B4, description: "Tangent trigonometric function", type: "FUNCTION" },
  { token: 0xC1, keyword: "ATN", entryPoint: 0xE30E, description: "Arctangent inverse trigonometric function", type: "FUNCTION" },
  { token: 0xC2, keyword: "PEEK", entryPoint: 0xB80D, description: "Reads single byte from memory address", type: "FUNCTION" },
  { token: 0xC3, keyword: "LEN", entryPoint: 0xB782, description: "Returns length of string in characters", type: "FUNCTION" },
  { token: 0xC4, keyword: "STR$", entryPoint: 0xB465, description: "Converts number to string format", type: "FUNCTION" },
  { token: 0xC5, keyword: "VAL", entryPoint: 0xB7AD, description: "Converts string to numerical float", type: "FUNCTION" },
  { token: 0xC6, keyword: "ASC", entryPoint: 0xB78B, description: "Returns PETSCII code of first character", type: "FUNCTION" },
  { token: 0xC7, keyword: "CHR$", entryPoint: 0xB77C, description: "Converts PETSCII code to character string", type: "FUNCTION" },
  { token: 0xC8, keyword: "LEFT$", entryPoint: 0xB700, description: "Extracts left substring of specified length", type: "FUNCTION" },
  { token: 0xC9, keyword: "RIGHT$", entryPoint: 0xB72C, description: "Extracts right substring of specified length", type: "FUNCTION" },
  { token: 0xCA, keyword: "MID$", entryPoint: 0xB737, description: "Extracts middle substring from start index", type: "FUNCTION" },
  { token: 0xCB, keyword: "GO", entryPoint: 0xA8A0, description: "Direct execution synonym for GOTO", type: "STATEMENT" },
];
