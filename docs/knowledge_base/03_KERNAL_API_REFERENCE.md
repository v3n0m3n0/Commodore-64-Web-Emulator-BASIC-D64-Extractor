# 03. Commodore 64 KERNAL API & Jump Vector Reference

> **Autorytatywne źródło:** https://www.pagetable.com/c64ref/kernal/ (Michael Steil)  
> **Powiązane źródła:** *Commodore 64 Programmer's Reference Guide*, Sheldon Leemon (*Mapping the Commodore 64*), Todd Heimarck.  
> **Relewancja dla projektu:** `src/c64/c64_system.ts` (`fastBoot()`, `initReadyState()`, KERNAL boot sequence), `src/c64/c64_cpu.ts` (obsługa wektorów przerwań sprzętowych).

---

## 1. Overview & Standard Zgodności

Pamięć KERNAL ROM Commodore 64 udostępnia znormalizowaną tablicę wektorów skoków na samym szczycie pamięci ROM (`$FF81-$FFF3`).
Programy użytkowe i gry powinny **ZAWSZE** wywoływać procedury systemowe za pośrednictwem tych znormalizowanych adresów (zamiast bezpośrednich adresów wewnętrznych ROM), co gwarantuje pełną kompatybilność między różnymi rewizjami płyt C64, cartridge'ami SuperCPU oraz trybem C64 na Commodore 128.

---

## 2. Zewnętrzny Jump Table KERNAL ($FF81 – $FFF3)

| Adres | Procedura | Cel i Działanie | Rejestry Wejściowe | Rejestry Wyjściowe | Modyfikuje |
|---|---|---|---|---|---|
| **$FF81** | `SCINIT / CINT` | Inicjalizacja VIC-II i Edytora Ekranu | Brak | Brak | A, X, Y |
| **$FF84** | `IOINIT` | Inicjalizacja układów CIA 1 i CIA 2 | Brak | Brak | A, X |
| **$FF87** | `RAMTAS` | Inicjalizacja pamięci RAM, ustalenie MEMTOP (`$0283`), bufor taśmy | Brak | Szczyt RAM w `$0283` | A, X, Y |
| **$FF8A** | `RESTOR` | Przywrócenie domyślnych wektorów KERNAL `$0314-$0333` | Brak | Brak | Brak |
| **$FF8D** | `VECTOR` | Odczyt / Zapis tablicy wektorów KERNAL | Carry: 0=Set, 1=Read; X/Y: wskaźnik | X/Y: wskaźnik tabeli | A, X, Y |
| **$FF90** | `SETMSG` | Kontrola komunikatów systemowych KERNAL | A: Flagi komunikatów (bity 6-7) | Brak | A |
| **$FF93** | `SECOND` | Wysłanie adresu wtórnego po rozkazie `LISTEN` na IEC | A: Adres wtórny | Brak | A |
| **$FF96** | `TKSA` | Wysłanie adresu wtórnego po rozkazie `TALK` na IEC | A: Adres wtórny | Brak | A |
| **$FF99** | `MEMTOP` | Odczyt / Zapis górnej granicy wolnego RAM | Carry: 0=Set, 1=Read; X/Y: adres | X/Y: adres graniczny | X, Y |
| **$FF9C** | `MEMBOT` | Odczyt / Zapis dolnej granicy wolnego RAM | Carry: 0=Set, 1=Read; X/Y: adres | X/Y: adres graniczny | X, Y |
| **$FF9F** | `SCNKEY` | Skanowanie sprzętowej matrycy klawiatury CIA 1 | Brak | Zdekodowany znak w `$00C6` | A, X, Y |
| **$FFA2** | `SETTMO` | Ustawienie limitu czasu szyny IEEE-488 | A: Wartość timeout | Brak | Brak |
| **$FFA5** | `ACPTR / IECIN`| Odczyt bajtu z szeregowej szyny IEC | Brak | A: Odczytany bajt | A |
| **$FFA8** | `CIOUT / IECOUT`| Zapis bajtu do szeregowej szyny IEC | A: Bajt danych | Brak | Brak |
| **$FFAB** | `UNTLK` | Wysłanie rozkazu UNTALK na szynę IEC | Brak | Brak | A |
| **$FFAE** | `UNLSN` | Wysłanie rozkazu UNLISTEN na szynę IEC | Brak | Brak | A |
| **$FFB1** | `LISTEN` | Rozkaz LISTEN dla urządzenia IEC (numery 8–15) | A: Numer urządzenia | Brak | A |
| **$FFB4** | `TALK` | Rozkaz TALK dla urządzenia IEC (numery 8–15) | A: Numer urządzenia | Brak | A |
| **$FFB7** | `READST` | Odczyt słowa statusu wejścia/wyjścia (I/O Status Word) | Brak | A: Bajt statusu (`$0090`) | A |
| **$FFBA** | `SETLFS` | Ustawienie parametrów pliku (Logical, Device, Secondary) | A: Logiczny, X: Urządzenie, Y: Wtórny | Brak | Brak |
| **$FFBD** | `SETNAM` | Ustawienie wskaźnika i długości nazwy pliku | A: Długość nazwy, X/Y: Adres w RAM | Brak | Brak |
| **$FFC0** | `OPEN` | Otwarcie logicznego pliku KERNAL | Wymaga wcześniejszego `SETLFS`+`SETNAM` | Carry: 0=OK, 1=Błąd (kod w A) | A, X, Y |
| **$FFC3** | `CLOSE` | Zamknięcie logicznego pliku KERNAL | A: Numer pliku logicznego | Brak | A, X, Y |
| **$FFC6** | `CHKIN` | Przełączenie kanału wejściowego na otwarty plik | X: Numer pliku logicznego | Brak | A, X |
| **$FFC9** | `CHKOUT` | Przełączenie kanału wyjściowego na otwarty plik | X: Numer pliku logicznego | Brak | A, X |
| **$FFCC** | `CLRCHN` | Skasowanie kanałów i powrót do domyślnego I/O (Ekran/Klawiatura)| Brak | Brak | A, X |
| **$FFCF** | `CHRIN / BASIN`| Odczyt znaku z bieżącego kanału wejściowego | Brak | A: Znak PETSCII | A |
| **$FFD2** | `CHROUT / BSOUT`| Wypisanie znaku na bieżący kanał wyjściowy | A: Znak PETSCII | Brak | Brak |
| **$FFD5** | `LOAD` | Załadowanie danych z nośnika do pamięci RAM | A: 0=Load, 1=Verify; X/Y: Adres docelowy | X/Y: Najwyższy załadowany adres | A, X, Y |
| **$FFD8** | `SAVE` | Zapis bloku pamięci RAM na urządzenie | A: Wskaźnik ZP do początku; X/Y: Koniec | Carry: 0=OK, 1=Błąd | A, X, Y |
| **$FFDB** | `SETTIM` | Ustawienie 24-bitowego zegara systemowego jiffy (`$00A0-$00A2`)| A/X/Y: Wartość 24-bitowa | Brak | Brak |
| **$FFDE** | `RDTIM` | Odczyt 24-bitowego zegara systemowego jiffy | Brak | A: MSB, X: MID, Y: LSB | A, X, Y |
| **$FFE1** | `STOP` | Sprawdzenie stanu klawisza RUN/STOP | Brak | Flaga Z: 1=Wciśnięty, 0=Nie | A, X |
| **$FFE4** | `GETIN` | Pobranie znaku z bufora klawiatury | Brak | A: Znak PETSCII (0 = bufor pusty) | A, X, Y |
| **$FFE7** | `CLALL` | Zamknięcie wszystkich plików logicznych i reset kanałów | Brak | Brak | A, X |
| **$FFEA** | `UDTIM` | Inkrementacja zegara 60Hz i weryfikacja klawisza STOP | Brak | Brak | A, X |
| **$FFED** | `SCREEN` | Pobranie wymiarów ekranu tekstowego | Brak | X: Liczba kolumn (40), Y: Wierszy (25) | X, Y |
| **$FFF0** | `PLOT` | Odczyt lub ustawienie pozycji kursora na ekranie | Carry: 0=Ustaw (X=Wiersz, Y=Kol), 1=Odczytaj | X: Wiersz, Y: Kolumna | X, Y |
| **$FFF3** | `IOBASE` | Zwrócenie adresu bazowego układów wejścia/wyjścia (CIA 1) | Brak | X/Y: Wskaźnik (`$DC00`) | X, Y |

---

## 2B. Wewnętrzne Wektory KERNAL w Pamięci RAM ($0314 – $0333)

> **Źródło:** https://www.pagetable.com/c64ref/kernal/ (Sekcja *Indirect Vectors*)  
> Wektory te są przechowywane w pamięci RAM i mogą być **dowolnie podmieniane (patchowane) przez oprogramowanie**, aby przechwytywać lub rozszerzać operacje KERNAL. Wywołanie procedury `RESTOR` (`$FF8A`) przywraca ich fabryczne wartości z ROM.

| Adres w RAM | Etykieta | Domyślny Adres w ROM | Funkcja / Obsługiwane Zdarzenie |
|---|---|---|---|
| **$0314-$0315** | `CINV` | `$EA31` | Wektor obsługi przerwań maskowalnych **IRQ** (Timer CIA 1, Raster VIC-II) |
| **$0316-$0317** | `CBINV` | `$FE66` | Wektor obsługi instrukcji programowego przerwania **BRK** |
| **$0318-$0319** | `NMINV` | `$FE47` | Wektor obsługi przerwań niemaskowalnych **NMI** (Klawisz RESTORE, CIA 2) |
| **$031A-$031B** | `IOPEN` | `$F34A` | Przechwycenie wywołania funkcji `OPEN` |
| **$031C-$031D** | `ICLOSE` | `$F291` | Przechwycenie wywołania funkcji `CLOSE` |
| **$031E-$031F** | `ICHKIN` | `$F20E` | Przechwycenie wywołania funkcji `CHKIN` |
| **$0320-$0321** | `ICKOUT` | `$F250` | Przechwycenie wywołania funkcji `CHKOUT` |
| **$0322-$0323** | `ICLRCH` | `$F333` | Przechwycenie wywołania funkcji `CLRCHN` |
| **$0324-$0325** | `IBASIN` | `$F157` | Przechwycenie wywołania funkcji `CHRIN / BASIN` |
| **$0326-$0327** | `IBSOUT` | `$F1CA` | Przechwycenie wywołania funkcji `CHROUT / BSOUT` |
| **$0328-$0329** | `ISTOP` | `$F6ED` | Przechwycenie testu klawisza `STOP` |
| **$032A-$032B** | `IGETIN` | `$F13E` | Przechwycenie wywołania funkcji `GETIN` |
| **$032C-$032D** | `ICLALL` | `$F32F` | Przechwycenie wywołania funkcji `CLALL` |
| **$032E-$032F** | `EXMON` | `$FE22` | Wektor wejścia do wbudowanego monitora maszynowego KERNAL |
| **$0330-$0331** | `ILOAD` | `$F4A5` | Przechwycenie operacji ładowania `LOAD` |
| **$0332-$0333** | `ISAVE` | `$F5ED` | Przechwycenie operacji zapisu `SAVE` |

---

## 3. Przykłady Kodu Maszynowego

### A. Wypisanie Ciągu Znaków za Pomocą CHROUT ($FFD2)
```assembly
* = $C000
        LDX #$00
PRINT_LOOP:
        LDA MESSAGE,X
        BEQ FINISHED
        JSR $FFD2       ; CHROUT
        INX
        BNE PRINT_LOOP
FINISHED:
        RTS

MESSAGE:
        .text "COMMODORE 64 KERNAL API OK!", 13, 0
```

### B. Pobieranie Znaków z Bufora Klawiatury przez GETIN ($FFE4)
```assembly
WAIT_KEY:
        JSR $FFE4       ; GETIN
        BEQ WAIT_KEY    ; Pętla jeśli bufor pusty (A = 0)
        CMP #13         ; Sprawdź czy naciśnięto klawisz RETURN
        BEQ ENTER_PRESSED
        JSR $FFD2       ; Echo znaku na ekran
        JMP WAIT_KEY
ENTER_PRESSED:
        RTS
```

---

## 4. Relewancja dla Kodu Projektu

1. **`src/c64/c64_system.ts`:**
   - Procedura `fastBoot()` emuluje cykle procesora do momentu osiągnięcia adresu `$A480` (`READY`), po pełnej inicjalizacji wektorów RAM `$0314-$0333` przez `RESTOR` (`$FF8A`).
   - Procedura awaryjna `initReadyState()` manualnie inicjalizuje wektory `$0314-$0315 = $EA31`, `$0318-$0319 = $FE47`.
2. **`src/c64/c64_cpu.ts`:**
   - Obsługa przerwań IRQ/NMI przekazuje sterowanie do adresów pobranych z KERNAL ROM (`$FFFE` / `$FFFA`), które standardowo wskazują na wektory pośrednie w RAM (`$0314` / `$0318`).
