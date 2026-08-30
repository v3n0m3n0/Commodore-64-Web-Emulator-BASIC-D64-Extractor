/**
 * Adventure & Text RPG Games Collection for Commodore 64
 */

import { GameRomEntry } from "../action";

export const ADVENTURE_GAMES: GameRomEntry[] = [
  {
    id: "castle-quest-64",
    title: "Castle Quest: Dungeon of Shadows",
    year: 1986,
    publisher: "Adventure Soft / Retro C64",
    format: "BASIC",
    genre: "Text Adventure / RPG",
    description: "Explore the dark corridors of the ancient castle, find keys, avoid traps and find the amulet.",
    controls: "Text parser (NORTH, SOUTH, EAST, WEST, GET, USE, LOOK, INVENTORY)",
    code: `10 REM CASTLE QUEST ADVENTURE
20 PRINT CHR$(147):POKE 53280,0:POKE 53281,0:POKE 646,13
30 PRINT "   *** CASTLE QUEST 64 ***"
40 PRINT "YOU STAND AT THE GATES OF AN ABANDONED CASTLE."
50 PRINT "COMMANDS: N, S, E, W, LOOK, GET, QUIT"
60 INPUT "WHAT WILL YOU DO";C$
70 IF C$="N" THEN PRINT "YOU ENTER THE GRAND HALLWAY. IT IS COLD AND DUSTY."
80 IF C$="LOOK" THEN PRINT "YOU SEE AN OLD BRASS KEY ON A RUSTY HOOK."
90 IF C$="QUIT" THEN PRINT "GOODBYE, BRAVE ADVENTURER!":END
100 GOTO 60`,
  }
];
