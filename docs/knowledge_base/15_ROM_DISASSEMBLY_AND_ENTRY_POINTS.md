# 15. C64 BASIC & KERNAL ROM Disassembly and Entry Points Reference

> **Autorytatywne źródło:** https://www.pagetable.com/c64ref/c64disasm/ (Michael Steil, rev ceb140a, 2025-11-04)  
> **Powiązane źródła:** *Das neue Commodore-64-intern-Buch* (Data Becker), Lee Davison (*C64 ROM Disassembly V1.01*), Marko Mäkelä (*Commodore 64 BASIC/KERNAL ROM Disassembly*).  
> **Relewancja dla projektu:** `src/c64/c64_system.ts` (`fastBoot()`, `initReadyState()`, wektory skoków), `src/c64/c64_cpu.ts` (przerwania sprzętowe), `src/c64/c64_disassembler.ts` (tablica symboli debuggera).

---

## 1. Architektura Pamięci ROM w Commodore 64

W standardowej konfiguracji PLA (`$0001 = $37`):
- **BASIC V2 ROM:** `$A000-$BFFF` (8192 bajty, 8 KB)
- **KERNAL ROM:** `$E000-$FFFF` (8192 bajty, 8 KB)
- **Character Generator ROM:** `$D000-$DFFF` (widoczny przy `$0001 = $33` lub z perspektywy VIC-II)

---

## 2. Kluczowe Punkty Wejścia BASIC V2 ROM ($A000–$BFFF)

| Adres | Symbol / Etykieta | Opis Działania |
|---|---|---|
| **$A000** | `BAS_RESET_VEC` | Wektor zimnego startu BASIC (wskazuje na `$E394`) |
| **$A002** | `BAS_WARM_VEC` | Wektor ciepłego startu BASIC (wskazuje na `$E37B`) |
| **$A004** | `CBM_SIGNATURE` | Tekst `"CBM"` identyfikujący obecność ROM |
| **$A408** | `ARRAY_ERROR` | Obsługa błędu `?BAD SUBSCRIPT` |
| **$A437** | `ERROR` | Główna procedura obsługi błędów interpretera BASIC (kod błędu w X) |
| **$A480** | `READY` | Wypisanie komunikatu `"READY."` i znaku nowej linii (używane w `fastBoot()`) |
| **$A483** | `MAIN` | Główna pętla wprowadzania wiersza z klawiatury w trybie bezpośrednim |
| **$A579** | `CRUNCH` | Tokenizacja wiersza tekstu z bufora `$0200` na bajty tokenów BASIC |
| **$A613** | `FINDLINE` | Wyszukiwanie linii programu o numerze w LinNum (`$14-$15`) |
| **$A642** | `NEW` | Realizacja instrukcji `NEW` (zerowanie wskaźników TXTTAB, VARTAB) |
| **$A65E** | `CLR` | Realizacja instrukcji `CLR` (zerowanie zmiennych i tablic) |
| **$A7AE** | `NEWSTT` | Wykonanie kolejnej instrukcji BASIC (punkt przejścia pętli interpretera) |
| **$A7E4** | `GONE` | Wykonanie pojedynczego statementu na podstawie bieżącego tokenu |
| **$A8A0** | `PERR` | Wyświetlenie komunikatu `?SYNTAX ERROR` |
| **$AD8A** | `FRMNUM` | Obliczenie wartości wyrażenia numerycznego do akumulatora zmiennoprzecinkowego FAC1 |
| **$AE83** | `EVAL` | Obliczenie wartości dowolnego wyrażenia (tekstowego lub liczbowego) |
| **$B08B** | `GETFNM` | Parsowanie nazwy pliku w instrukcjach `LOAD`/`SAVE`/`OPEN` |
| **$B248** | `EXEC_ERROR` | Zgłoszenie błędu `?ILLEGAL QUANTITY` |
| **$B3A2** | `FRE_STR` | Zbieranie nieużytków pamięci łańcuchów (Garbage Collector) |
| **$BF7B** | `TABLE_TOKENS` | Tablica nazw tokenów BASIC V2 (`END`, `FOR`, `NEXT`, `DATA`...) |

---

## 3. Kluczowe Punkty Wejścia KERNAL ROM ($E000–$FFFF)

| Adres | Symbol / Etykieta | Opis Działania |
|---|---|---|
| **$E37B** | `BASIC_WARM` | Inicjalizacja ciepłego restartu interpretera BASIC |
| **$E394** | `BASIC_COLD` | Inicjalizacja zimnego startu BASIC, czyszczenie pamięci i RAMTAS |
| **$E4D3** | `BANNER` | Wypisanie nagłówka `**** COMMODORE 64 BASIC V2 ****` oraz wolnej pamięci |
| **$E518** | `CLINE` | Inicjalizacja tablicy wierszy ekranu `$00D9-$00F2` |
| **$E544** | `CLRSCN` | Wyszyszczenie ekranu domyślnym kolorem i ustawienie kursora na poz. (0,0) |
| **$E56C** | `HOME` | Ustawienie kursora w lewym górnym rogu ekranu |
| **$E716** | `DSPCH` | Bezpośrednie wypisanie znaku PETSCII w bieżącej pozycji kursora |
| **$E8EA** | `SCR_DOWN` | Przewinięcie zawartości ekranu w dół o jedną linię |
| **$E9FF** | `SCR_UP` | Przewinięcie zawartości ekranu w górę o jedną linię (Scroll) |
| **$EA31** | `DEFAULT_IRQ` | Domyślna procedura obsługi przerwania IRQ (zegar 60Hz, kursor, klawiatura) |
| **$EA87** | `SCNKEY_INT` | Wewnętrzna procedura skanowania matrycy klawiatury CIA1 ($DC00/$DC01) |
| **$F086** | `TAP_READ` | Pętla odczytu sygnałów z magnetofonu Datasette (C2N) |
| **$F13E** | `GETIN_INT` | Wewnętrzne pobranie znaku z bufora klawiatury `$0277` |
| **$F157** | `BASIN_INT` | Odczyt znaku z bieżącego kanału wejściowego |
| **$F1CA** | `BSOUT_INT` | Zapis znaku do bieżącego kanału wyjściowego (CHROUT) |
| **$F34A** | `OPEN_INT` | Wewnętrzna obsługa otwarcia pliku logicznego KERNAL |
| **$F4A5** | `LOAD_INT` | Wewnętrzna procedura ładowania pamięci z magnetofonu lub stacji IEC |
| **$F5ED** | `SAVE_INT` | Wewnętrzna procedura zapisu pamięci na nośnik |
| **$FCE2** | `COLD_RESET` | Główna procedura startowa po włączeniu zasilania lub sygnale RESET |
| **$FD15** | `RESTOR_INT` | Wypełnienie wektorów `$0314-$0333` domyślnymi adresami ROM KERNAL |
| **$FD50** | `RAMTAS_INT` | Test pamięci RAM, ustalenie MEMTOP `$0283`, zerowanie bufora taśmy |
| **$FDA3** | `IOINIT_INT` | Konfiguracja rejestrów kierunku i timerów CIA 1 i CIA 2 |
| **$FE43** | `DEFAULT_NMI` | Domyślna procedura obsługi przerwania NMI (klawisz RESTORE) |
| **$FF81-$FFF3**| `JUMP_TABLE` | 39 znormalizowanych wektorów KERNAL (patrz Rozdział 03) |
| **$FFFA-$FFFF**| `HARDWARE_VECTORS`| Wektory sprzętowe 6510: NMI (`$FFFA`), RESET (`$FFFC`), IRQ/BRK (`$FFFE`) |

---

## 4. Diagnostyka Kodu Maszynowego — Typowe Wzorce w Grach i Demach

### A. Przechwycenie Wektora Przerwania Rastrowego (Raster IRQ Hook):
```assembly
; Wyłączenie przerwań i przejęcie $0314-$0315:
        SEI
        LDA #$7F
        STA $DC0D       ; Wyłącz przerwania timera CIA 1
        LDA $DC0D       ; Acknowledge ewentualnych oczekujących IRQ
        LDA #$01
        STA $D01A       ; Włącz przerwanie rastrowe VIC-II
        LDA #<MY_IRQ
        STA $0314       ; Ustaw młodszy bajt wektora IRQ
        LDA #>MY_IRQ
        STA $0315       ; Ustaw starszy bajt wektora IRQ
        LDA #100
        STA $D012       ; Ustaw linię rastra na 100
        LDA $D011
        AND #$7F
        STA $D011       ; Wyzeruj najstarszy bit linii rastra (bit 8)
        CLI
        RTS

MY_IRQ:
        STA $02         ; Zapisz rejestry
        STX $03
        STY $04
        INC $D020       ; Zmień kolor ramki (efekt rastrowy)
        DEC $D020
        ASL $D019       ; Skasuj flagę przerwania VIC-II (ACK)
        LDA $02         ; Przywróć rejestry
        LDX $03
        LDY $04
        JMP $EA31       ; Lub $FEBC (wyjście bez obsługi KERNAL)
```

### B. Ominięcie KERNAL i bezpośredni powrót z przerwania:
Zaawansowane gry przełączają pamięć na czysty RAM (`$0001 = $35` lub `$34`) i kończą procedurę IRQ własną sekwencją:
```assembly
        PLA
        TAY
        PLA
        TAX
        PLA
        RTI             ; Bezpośredni powrót ze stosu 6502
```

---

## 5. Relewancja dla Kodu Projektu

1. **`src/c64/c64_system.ts` (`fastBoot`):**
   - Emuluje pętlę CPU do momentu osiągnięcia adresu `$A480` (`READY`), co gwarantuje pełne i bezbłędne przejście sekwencji `IOINIT` → `RAMTAS` → `RESTOR` → `CINT` → `BANNER`.
2. **`src/c64/c64_disassembler.ts`:**
   - Adresy z powyższej tabeli stanowią bazę tablicy symboli etykiet wbudowanego disasemblera 6502.
3. **`src/c64/c64_cpu.ts`:**
   - Wektory sprzętowe `$FFFA` (NMI), `$FFFC` (RESET), `$FFFE` (IRQ) muszą bezwzględnie ładować dane z banku KERNAL ROM `$E000-$FFFF` (chyba że tryb Ultimax wymusza mapowanie z cartridge).
