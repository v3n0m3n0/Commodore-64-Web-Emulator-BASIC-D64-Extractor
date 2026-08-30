/**
 * Polish C64 Classics Collection (Katalog Polskich Gier na Commodore 64)
 */

import { GameRomEntry } from "../action";

export const POLISH_CLASSICS: GameRomEntry[] = [
  {
    id: "miecze-walpurgii",
    title: "Miecze Walpurgii",
    year: 1991,
    publisher: "Aprovis",
    format: "PRG",
    genre: "Strategia / Fantasy RPG",
    description: "Kultowa polska strategia turowa fantasy osadzona w średniowiecznych krainach z walkami armii i magią.",
    controls: "Klawiatura i Joystick Port 2",
  },
  {
    id: "hans-kloss",
    title: "Hans Kloss",
    year: 1992,
    publisher: "LK Avalon",
    format: "PRG",
    genre: "Platformówka / Labirynt / Logiczna",
    description: "Legendarne dzieło autorstwa Janusza Pelca i Macieja Miąsika w podziemiach bunkra Wolfsschanze.",
    controls: "Joystick Port 2",
  },
  {
    id: "klatwa",
    title: "Klątwa",
    year: 1992,
    publisher: "LK Avalon",
    format: "PRG",
    genre: "Przygoda / RPG",
    description: "Przełomowa polska gra przygodowo-logiczna z rzutem izometrycznym autorstwa Rolanda Pantoły.",
    controls: "Joystick Port 2",
  },
  {
    id: "wladcy-ciemnosci",
    title: "Władcy Ciemności",
    year: 1993,
    publisher: "LK Avalon",
    format: "PRG",
    genre: "Przygoda / Izometryczna",
    description: "Kontynuacja Klątwy w mrocznym świecie magii autorstwa Rolanda Pantoły z wybitną grafiką i muzyką SID.",
    controls: "Joystick Port 2",
  },
  {
    id: "smok-wawelski",
    title: "Smok Wawelski",
    year: 1989,
    publisher: "Krzysztof Kluczek / Mirage",
    format: "BASIC",
    genre: "Gra Tekstowa / Przygoda",
    description: "Klasyczna polska gra tekstowa oparta na legendzie o Szewczyku Dratewce i Smoku Wawelskim.",
    controls: "Wpisywanie komend tekstowych w języku polskim",
    code: `10 REM SMOK WAWELSKI - KLASYKA C64
20 PRINT CHR$(147):POKE 53280,0:POKE 53281,0:POKE 646,14
30 PRINT "   *** SMOK WAWELSKI 64 ***"
40 PRINT "JESTES DZIELNYM SZEWCZYKIEM POD KRAKOWEM."
50 PRINT "SMOK SIEJE POSTRACH W GRODZIE KRAKA."
60 PRINT "TWOJA MISJA: ZDOBADZ BARANA I SIARKE!"
70 INPUT "CO CHCESZ ZROBIC (SZUKAJ / IDZ / ZAPLATA)";A$
80 IF A$="SZUKAJ" THEN PRINT "ZNAJDUJESZ WOREK ZIOL I OSTRA SKORE SZEWSKA."
90 IF A$="IDZ" THEN PRINT "KROCZYSZ BRZEGIEM WISLY POD SMOCZA JAME..."
100 GOTO 70`,
  }
];
