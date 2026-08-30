/**
 * Demos & Demoscene Productions for Commodore 64
 */

import { GameRomEntry } from "../action";

export const DEMOSCENE_ROMS: GameRomEntry[] = [
  {
    id: "10-print-maze",
    title: "10 PRINT Maze Generator",
    year: 1982,
    publisher: "C64 Demoscene",
    format: "BASIC",
    genre: "Generative Art",
    description: "The most iconic one-line generative maze algorithm in computer history.",
    code: `10 PRINT CHR$(147);
20 POKE 53280,0:POKE 53281,0
30 PRINT CHR$(205.5+RND(1));
40 GOTO 30`,
  },
  {
    id: "raster-rainbow-bars",
    title: "VIC-II Raster Rainbow Synth",
    year: 1988,
    publisher: "Scene C64",
    format: "BASIC",
    genre: "Graphics & Sound Demo",
    description: "Synchronous VIC-II color bars with algorithmic SID arpeggios.",
    code: `10 REM RASTER RAINBOW BARS & SID CHORD
20 POKE 53280,0:POKE 53281,0:PRINT CHR$(147)
30 POKE 54296,15:POKE 54277,0:POKE 54278,240
40 FOR I=0 TO 24:POKE 53280,I AND 15:POKE 53281,I AND 15
50 POKE 54273,20+(I*3):POKE 54276,17:FOR W=1 TO 30:NEXT W
60 NEXT I:GOTO 40`,
  }
];
