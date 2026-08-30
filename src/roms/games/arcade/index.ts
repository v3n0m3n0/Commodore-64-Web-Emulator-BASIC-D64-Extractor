/**
 * Arcade Games Collection for Commodore 64
 */

import { GameRomEntry } from "../action";

export const ARCADE_GAMES: GameRomEntry[] = [
  {
    id: "lunar-lander-c64",
    title: "Lunar Lander 64",
    year: 1983,
    publisher: "Commodore",
    format: "BASIC",
    genre: "Arcade / Physics",
    description: "Manage thrust and velocity to land your lunar module softly on the moon surface.",
    controls: "SPACE for main engine thrust, Arrow keys for steering",
    code: `10 REM LUNAR LANDER 64
20 PRINT CHR$(147):POKE 53280,0:POKE 53281,0:POKE 646,1
30 PRINT "   *** C64 LUNAR LANDER ***"
40 ALT=1000:VEL=50:FUEL=500:G=1.6
50 PRINT "ALTITUDE: ";ALT;" VELOCITY: ";VEL;" FUEL: ";FUEL
60 IF ALT<=0 THEN GOTO 120
70 GET K$:T=0:IF K$=" " AND FUEL>0 THEN T=4:FUEL=FUEL-10
80 VEL=VEL+G-T:ALT=ALT-VEL:IF ALT<0 THEN ALT=0
90 PRINT "ALT:";INT(ALT);" VEL:";INT(VEL);" FUEL:";FUEL
100 FOR W=1 TO 150:NEXT W:GOTO 50
120 IF VEL<15 THEN PRINT "PERFECT TOUCHDOWN! SUCCESS!":END
130 PRINT "CRASHED ON THE MOON SURFACE!":END`,
  },
  {
    id: "retro-pong-64",
    title: "Table Tennis / Retro Pong",
    year: 1982,
    publisher: "C64 Basics",
    format: "BASIC",
    genre: "Arcade Classic",
    description: "Classic table paddle tennis simulation with dynamic ball ricochet.",
    controls: "W/S for Left Player, Up/Down for Right Player",
  }
];
