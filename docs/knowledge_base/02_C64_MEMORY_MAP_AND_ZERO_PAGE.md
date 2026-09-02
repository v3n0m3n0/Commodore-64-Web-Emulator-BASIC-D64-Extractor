# 02. Commodore 64 Memory Map, Zero Page & Processor Port Reference

> **Autorytatywne źródło:** https://www.pagetable.com/c64ref/c64mem/ (Michael Steil, rev 1295642, 2026-04-05)  
> **Powiązane źródła:** Sheldon Leemon (*Mapping the Commodore 64*), Joe Forster/STA, Jim Butterfield, *Commodore 64 Programmer's Reference Guide*.  
> **Relewancja dla projektu:** `src/c64/c64_memory.ts` (bankowanie PLA, adresy I/O), `src/c64/c64_datasette.ts` (linie magnetofonu $0001), `src/c64/c64_system.ts`.

---

## 1. Kompletna Mapa Pamięci 64 KB

```
  +-------------------------------------------------------------+ $FFFF
  |  KERNAL ROM ($E000-$FFFF, 8 KB)                             |
  |  lub RAM jeśli wyłączono bank KERNAL w PLA                  |
  +-------------------------------------------------------------+ $E000
  |  Rejestry I/O / Color RAM / Char ROM ($D000-$DFFF, 4 KB)    |
  |    $D000-$D3FF: Kontroler wideo VIC-II                      |
  |    $D400-$D7FF: Syntezator dźwięku SID                      |
  |    $D800-$DBFF: Pamięć kolorów Color RAM (1024 x 4 bity)    |
  |    $DC00-$DCFF: CIA 1 (Klawiatura, Joystick 1/2, Timery)    |
  |    $DD00-$DDFF: CIA 2 (VIC Bank, Szyna IEC, NMI)            |
  |    $DE00-$DFFF: Rejestry rozszerzeń / Cartridge I/O 1 & 2   |
  +-------------------------------------------------------------+ $D000
  |  Wolna pamięć RAM ($C000-$CFFF, 4 KB) — Kod maszynowy       |
  +-------------------------------------------------------------+ $C000
  |  BASIC V2 ROM ($A000-$BFFF, 8 KB)                           |
  |  lub RAM jeśli wyłączono bank BASIC w PLA                   |
  +-------------------------------------------------------------+ $A000
  |  Wolny RAM dla programów BASIC ($0800-$9FFF, 38,911 bajtów) |
  |  Domyślny początek programu BASIC: $0801                    |
  +-------------------------------------------------------------+ $0800
  |  Domyślna pamięć ekranu tekstowego ($0400-$07E7, 1000 bajtów)|
  |  $07F8-$07FF: Wskaźniki danych sprajtów 0-7 (Sprite Pointers)|
  +-------------------------------------------------------------+ $0400
  |  Zmienne systemowe, bufory, wektory ($0200-$03FF)           |
  |    $0200-$0258: Bufor wprowadzania BASIC (89 bajtów)        |
  |    $0277-$0280: Bufor klawiatury (10 bajtów)                |
  |    $0314-$0315: Wektor przerwania IRQ ($EA31)               |
  |    $0318-$0319: Wektor przerwania NMI ($FE47)               |
  |    $033C-$03FB: Bufor taśmy Datasette (192 bajty)           |
  +-------------------------------------------------------------+ $0200
  |  Stos procesora Hardware Stack ($0100-$01FF, 256 bajtów)    |
  +-------------------------------------------------------------+ $0100
  |  Strona Zerowa Zero Page ($0000-$00FF, 256 bajtów)          |
  |    $0000: Rejestr kierunku portu CPU DDR (D6510)            |
  |    $0001: Rejestr danych portu CPU (R6510, Bankowanie PLA)  |
  +-------------------------------------------------------------+ $0000
```

---

## 2. Rejestry Portu Wbudowanego MOS 6510 ($0000 / $0001)

Układ MOS 6510 posiada wbudowany 6-bitowy dwukierunkowy port wejścia/wyjścia sterowany rejestrami pod adresami `$0000` i `$0001`:

### A. Rejestr Kierunku Danych `$0000` (D6510 DDR)
Określa kierunek każdego pinu (0 = Wejście / Input, 1 = Wyjście / Output). Wartość domyślna po resecie: `%00101111` (`$2F`).

| Bit | Kierunek Domyślny | Funkcja powiązana |
|---|---|---|
| **Bit 0** | 1 (Wyjście) | Kierunek linii `LORAM` (kontrola banku BASIC) |
| **Bit 1** | 1 (Wyjście) | Kierunek linii `HIRAM` (kontrola banku KERNAL) |
| **Bit 2** | 1 (Wyjście) | Kierunek linii `CHAREN` (kontrola banku I/O vs Char ROM) |
| **Bit 3** | 1 (Wyjście) | Linia zapisu danych magnetofonu Datasette (Cassette Write Data) |
| **Bit 4** | 0 (Wejście) | Czujnik wciśnięcia przycisku magnetofonu (Cassette Switch Sense) |
| **Bit 5** | 1 (Wyjście) | Sterowanie silnikiem magnetofonu Datasette (Cassette Motor Control) |
| **Bit 6-7**| Niepodłączone | Nieużywane w architekturze C64 |

### B. Rejestr Danych Portu `$0001` (R6510) & Konfiguracje PLA
Wartość domyślna po resecie: `%00110111` (`$37` / 55 dziesiętnie).

| Wartość `$01` | LORAM (bit 0) | HIRAM (bit 1) | CHAREN (bit 2) | Zakres `$A000-$BFFF` | Zakres `$D000-$DFFF` | Zakres `$E000-$FFFF` | Zastosowanie |
|---|---|---|---|---|---|---|---|
| **$37 (55)** | 1 | 1 | 1 | **BASIC ROM** | **I/O Registers** | **KERNAL ROM** | Standardowy tryb pracy C64 |
| **$36 (54)** | 0 | 1 | 1 | **RAM** | **I/O Registers** | **KERNAL ROM** | Asemblery, gry z KERNAL |
| **$35 (53)** | 0 | 0 | 1 | **RAM** | **I/O Registers** | **RAM** | Pełny RAM 64KB z dostępem do I/O |
| **$34 (52)** | 0 | 0 | 0 | **RAM** | **RAM** | **RAM** | Czysty płaski RAM 64KB (brak ROM/IO)|
| **$33 (51)** | 1 | 1 | 0 | **BASIC ROM** | **Character ROM**| **KERNAL ROM** | Kopiowanie generatora znaków |
| **$30 (48)** | 0 | 0 | 0 | **RAM** | **RAM** | **RAM** | Maksymalna pamięć RAM |

---

## 3. Kluczowe Wskaźniki Strony Zerowej ($0000-$00FF)

| Adres | Rozmiar | Etykieta | Opis Działania |
|---|---|---|---|
| `$0000` | 1B | **D6510** | Rejestr kierunku portu procesora 6510 (DDR, domyślnie `$2F`) |
| `$0001` | 1B | **R6510** | Rejestr danych portu procesora 6510 (Bankowanie PLA, domyślnie `$37`) |
| `$002B-$002C` | 2B | **TXTTAB** | Wskaźnik początku tekstu programu BASIC w RAM (Domyślnie: `$0801`) |
| `$002D-$002E` | 2B | **VARTAB** | Wskaźnik początku prostych zmiennych BASIC |
| `$002F-$0030` | 2B | **ARYTAB** | Wskaźnik początku tablic zmiennych BASIC |
| `$0031-$0032` | 2B | **STREND** | Wskaźnik końca pamięci tablic BASIC |
| `$0033-$0034` | 2B | **FRETOP** | Wskaźnik dolnej granicy dynamicznej pamięci łańcuchów (rośnie w dół od `$A000`)|
| `$0037-$0038` | 2B | **MEMSIZ** | Wskaźnik górnej granicy wolnego RAM dla BASIC (Domyślnie: `$A000`) |
| `$0073-$008A` | 24B | **CHRGET** | Procedura w RAM pobierająca kolejny znak programu BASIC (`JMP $0073`) |
| `$0090` | 1B | **STATUS** | Słowo statusu I/O KERNAL (0 = OK, bit 6 = EOF, bit 7 = Urządzenie niedostępne)|
| `$0093` | 1B | **VERCK** | Flaga operacji: 0 = `LOAD`, 1 = `VERIFY` |
| `$00A0-$00A2` | 3B | **TIME** | 24-bitowy zegar systemowy Jiffy 60Hz (inkrementowany co przerwanie IRQ) |
| `$00C6` | 1B | **NDX** | Liczba znaków oczekujących w buforze klawiatury (`$0277-$0280`, max 10) |
| `$00C5` | 1B | **LSTX** | Kod matrycowy ostatnio wciśniętego klawisza (`$40` = brak klawisza) |
| `$00CB` | 1B | **SFDX** | Zdekodowany znak PETSCII z ostatniego skanowania matrycy |
| `$00D1-$00D2` | 2B | **PNTR** | Wskaźnik adresu bieżącego wiersza w pamięci ekranu tekstowego |
| `$00D3` | 1B | **PNTRX** | Pozycja kolumny kursora (0-39) |
| `$00D6` | 1B | **LNMX** | Długość fizycznego wiersza ekranu (39 lub 79 dla zawiniętych linii) |
| `$00F3-$00F4` | 2B | **PALNTCS**| Flaga standardu wideo KERNAL (0 = NTSC, 1 = PAL) |

---

## 4. Relewancja dla Kodu Projektu

1. **`src/c64/c64_memory.ts`:**
   - Metody `readByte(addr)` i `writeByte(addr, val)` implementują pełną tablicę PLA w oparciu o bity 0-2 rejestru `$0001` (`ioPortData`).
   - Pamięć RAM pod pamięcią ROM KERNAL i BASIC jest w 100% zachowywana przy zapisie (`writeByte` zawsze modyfikuje RAM fizyczny, nawet gdy ROM jest widoczny przy odczycie).
2. **`src/c64/c64_datasette.ts`:**
   - Emulacja magnetofonu odczytuje stan bitu 5 rejestru `$0001` (sterowanie silnikiem: 0 = silnik włączony, 1 = silnik zatrzymany) oraz ustawia bit 4 rejestru `$0001` (detekcja wciśnięcia PLAY/RECORD).
3. **`src/c64/c64_system.ts`:**
   - Procedura `typeText()` i `pushKey()` bezpośrednio aktualizuje licznik `$00C6` (`NDX`) oraz tablicę `$0277-$0280`.
