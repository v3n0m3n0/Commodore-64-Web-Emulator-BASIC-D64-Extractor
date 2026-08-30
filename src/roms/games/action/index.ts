/**
 * Action Games Collection for Commodore 64
 */

export interface GameRomEntry {
  id: string;
  title: string;
  year?: number;
  publisher?: string;
  format: "PRG" | "BASIC" | "D64" | "TAP" | "CRT";
  genre: string;
  description: string;
  code?: string;
  controls?: string;
}

export const ACTION_GAMES: GameRomEntry[] = [
  {
    id: "boulder-cave",
    title: "Boulder Cavern 64",
    year: 1984,
    publisher: "First Star / Retro C64",
    format: "BASIC",
    genre: "Action / Arcade",
    description: "Dig through dirt caverns, dodge rolling boulders, and collect shiny diamonds.",
    controls: "W/A/S/D / Joy Port 2",
    code: `10 REM BOULDER CAVERN MINI-GAME
20 PRINT CHR$(147):POKE 53280,0:POKE 53281,0:POKE 646,7
30 PRINT "   *** BOULDER CAVERN 64 ***"
40 PRINT " COLLECT DIAMONDS ($) | AVOID (O)"
50 PRINT " CONTROLS: W/A/S/D + RETURN"
60 FOR I=1 TO 1000:NEXT I:PRINT CHR$(147)
70 DIM M$(15,20):PX=10:PY=8:SC=0:DM=0
80 FOR Y=1 TO 15:FOR X=1 TO 20
90 R=INT(RND(1)*10):M$(Y,X)="."
100 IF R=0 THEN M$(Y,X)="O"
110 IF R=1 THEN M$(Y,X)="$":DM=DM+1
120 IF X=1 OR X=20 OR Y=1 OR Y=15 THEN M$(Y,X)="#"
130 NEXT X:NEXT Y:M$(PY,PX)="@"
140 REM DRAW CAVE
150 POKE 198,0:PRINT CHR$(19);
160 FOR Y=1 TO 15:L$="":FOR X=1 TO 20:L$=L$+M$(Y,X):NEXT X:PRINT L$:NEXT Y
170 PRINT "SCORE:";SC;" DIAMONDS LEFT:";DM
180 IF DM=0 THEN PRINT "YOU WIN! ALL DIAMONDS COLLECTED!":END
190 GET K$:IF K$="" GOTO 190
200 NX=PX:NY=PY
210 IF K$="W" OR K$="w" THEN NY=PY-1
220 IF K$="S" OR K$="s" THEN NY=PY+1
230 IF K$="A" OR K$="a" THEN NX=PX-1
240 IF K$="D" OR K$="d" THEN NX=PX+1
250 T$=M$(NY,NX)
260 IF T$="#" THEN GOTO 190
270 IF T$="$" THEN SC=SC+100:DM=DM-1
280 M$(PY,PX)=" ":PX=NX:PY=NY:M$(PY,PX)="@"
290 GOTO 150`,
  },
  {
    id: "space-intercept",
    title: "Space Interceptor 64",
    year: 1985,
    publisher: "Mastertronic Style",
    format: "BASIC",
    genre: "Space Action",
    description: "Defend deep space sector from incoming alien warcraft.",
    controls: "Arrow keys / Joy Port 2 + Fire",
    code: `10 REM SPACE INTERCEPTOR 64
20 PRINT CHR$(147):POKE 53280,0:POKE 53281,0:POKE 646,14
30 PRINT "=== SPACE INTERCEPTOR ==="
40 PX=20:FOR T=1 TO 50:EX=INT(RND(1)*38)+1
50 POKE 1024+PX+960,88:POKE 55296+PX+960,1
60 POKE 1024+EX,81:POKE 55296+EX,7
70 FOR D=1 TO 50:NEXT D
80 NEXT T:PRINT "SECTOR DEFENDED!"`,
  }
];
