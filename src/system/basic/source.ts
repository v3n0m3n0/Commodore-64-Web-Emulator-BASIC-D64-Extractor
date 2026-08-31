/**
 * Commodore 64 BASIC V2 Source Modules Architecture
 * Derived from the original Commodore sources (MOS 901226-01)
 * Preserves all original symbols, module boundaries, and entry addresses.
 */

export interface BasicSourceModule {
  file: string;
  startAddress: number;
  endAddress: number;
  description: string;
  keyRoutines: {
    symbol: string;
    address: number;
    hex: string;
    description: string;
  }[];
}

export const BASIC_SOURCE_MODULES: BasicSourceModule[] = [
  {
    file: "tokens.s / token2.s",
    startAddress: 0xA000,
    endAddress: 0xA3BF,
    description: "BASIC V2 Keyword Tokens, Vector Dispatch Tables, and Error Messages",
    keyRoutines: [
      { symbol: "VEC_INIT", address: 0xA000, hex: "$A000", description: "Default BASIC indirect vector jump table" },
      { symbol: "TOKEN_LIST", address: 0xA09E, hex: "$A09E", description: "Table of keyword strings ($80 END ... $CB GO)" },
      { symbol: "TOKEN_VECS", address: 0xA00C, hex: "$A00C", description: "Table of routine addresses corresponding to statements" },
      { symbol: "ERR_TABLE", address: 0xA328, hex: "$A328", description: "Compressed text of runtime BASIC error messages" },
    ],
  },
  {
    file: "init.s",
    startAddress: 0xA3C0,
    endAddress: 0xA47F,
    description: "Cold start initialization, memory size detection, and startup banner",
    keyRoutines: [
      { symbol: "INIT_VECS", address: 0xA3BF, hex: "$A3BF", description: "Initializes indirect RAM vectors at $0300-$030B" },
      { symbol: "INIT_BASIC", address: 0xA408, hex: "$A408", description: "Cold-starts BASIC interpreter and displays banner" },
      { symbol: "READY_MSG", address: 0xA474, hex: "$A474", description: "Prints 'READY.' prompt and returns to main direct loop" },
    ],
  },
  {
    file: "code1.s - code3.s",
    startAddress: 0xA480,
    endAddress: 0xA741,
    description: "Main evaluation loop, line tokenization, statement dispatcher, NEW and LIST",
    keyRoutines: [
      { symbol: "MAIN_LOOP", address: 0xA480, hex: "$A480", description: "Main interpreter dispatch loop for BASIC execution" },
      { symbol: "PARSE_LINE", address: 0xA57C, hex: "$A57C", description: "Tokenizes input string into PETSCII bytecode in $0200" },
      { symbol: "DO_NEW", address: 0xA642, hex: "$A642", description: "Executes NEW: clears TXTTAB and resets variable pointers" },
      { symbol: "DO_LIST", address: 0xA69C, hex: "$A69C", description: "Executes LIST: de-tokenizes bytecode to ASCII/PETSCII text" },
      { symbol: "DO_CLR", address: 0xA65E, hex: "$A65E", description: "Executes CLR: resets variable tables, strings, and stack" },
    ],
  },
  {
    file: "code4.s - code6.s",
    startAddress: 0xA742,
    endAddress: 0xAD1D,
    description: "Control flow statements (FOR, NEXT, GOTO, GOSUB, RETURN, IF, ON, RESTORE)",
    keyRoutines: [
      { symbol: "DO_FOR", address: 0xA742, hex: "$A742", description: "Pushes FOR loop frame onto CPU stack" },
      { symbol: "DO_NEXT", address: 0xAD1E, hex: "$AD1E", description: "Steps loop variable and loops if bound not exceeded" },
      { symbol: "DO_GOTO", address: 0xA8A0, hex: "$A8A0", description: "Searches program text for target line number" },
      { symbol: "DO_GOSUB", address: 0xA883, hex: "$A883", description: "Pushes GOSUB return token & pointer to stack" },
      { symbol: "DO_RETURN", address: 0xA8D2, hex: "$A8D2", description: "Pulls GOSUB return context and resumes execution" },
      { symbol: "DO_IF", address: 0xA928, hex: "$A928", description: "Evaluates boolean expression and branches conditionally" },
    ],
  },
  {
    file: "code7.s - code9.s",
    startAddress: 0xAD1E,
    endAddress: 0xB823,
    description: "Variable management, Arrays, Expressions, Strings, Math, PRINT and INPUT",
    keyRoutines: [
      { symbol: "EVAL_EXPR", address: 0xAD9E, hex: "$AD9E", description: "Evaluates arithmetic/logical expression into FAC1" },
      { symbol: "FIND_VAR", address: 0xB08B, hex: "$B08B", description: "Searches symbol tables (VARTAB/ARYTAB) for variable" },
      { symbol: "DO_PRINT", address: 0xAA9A, hex: "$AA9A", description: "Handles PRINT statement output with tabs, commas, semi" },
      { symbol: "DO_INPUT", address: 0xABB2, hex: "$ABB2", description: "Prompts and buffers input from keyboard or device" },
      { symbol: "STR_ALLOC", address: 0xB4F4, hex: "$B4F4", description: "Allocates string descriptor in dynamic string memory" },
      { symbol: "GARBAGE_COLLECT", address: 0xB526, hex: "$B526", description: "Performs garbage collection on dynamic string heap" },
    ],
  },
  {
    file: "trig.s & float.s",
    startAddress: 0xB824,
    endAddress: 0xBFFF,
    description: "Floating Point Accumulator 1/2 arithmetic, Transcendental functions, Trigonometry",
    keyRoutines: [
      { symbol: "DO_POKE", address: 0xB824, hex: "$B824", description: "Evaluates address and byte, stores in RAM" },
      { symbol: "FADD", address: 0xB86A, hex: "$B86A", description: "Floating point addition: FAC1 = FAC1 + Memory" },
      { symbol: "FSUB", address: 0xB850, hex: "$B850", description: "Floating point subtraction: FAC1 = Memory - FAC1" },
      { symbol: "FMULT", address: 0xBA28, hex: "$BA28", description: "Floating point multiplication: FAC1 = FAC1 * Memory" },
      { symbol: "FDIV", address: 0xBB0F, hex: "$BB0F", description: "Floating point division: FAC1 = Memory / FAC1" },
      { symbol: "FLOG", address: 0xB9EA, hex: "$B9EA", description: "Calculates natural logarithm: FAC1 = LN(FAC1)" },
      { symbol: "FEXP", address: 0xBFED, hex: "$BFED", description: "Calculates exponential: FAC1 = EXP(FAC1)" },
      { symbol: "FSIN", address: 0xE26B, hex: "$E26B", description: "Calculates trigonometric sine: FAC1 = SIN(FAC1)" },
      { symbol: "FCOS", address: 0xE264, hex: "$E264", description: "Calculates trigonometric cosine: FAC1 = COS(FAC1)" },
    ],
  },
];
