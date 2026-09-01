# Fix Log: Obsługa Gier w Formacie .TAP i Emulacja Magnetofonu Commodore 1530 C2N Datasette

**Data i godzina:** 2026-09-02, 01:10 CEST  
**Zgłoszony problem:**  
Pogłębiona analiza i wdrożenie pełnej obsługi uruchamiania gier w formacie `.TAP` (zrzut impulsów magnetycznych taśmy magnetofonowej) na przykładzie kolekcji gier z folderu `src/roms/games/tap/` (np. *Galaxions*, *Galax-i-Birds*, *Ghosts'n Goblins*, *The Great Giana Sisters*, *Green Beret*, *Gauntlet*).

---

## 1. Zidentyfikowane Przyczyny Źródłowe (Root Causes)

1. **Błędne mapowanie nośnika:** Pliki `.TAP` były dotychczas przekierowywane do parsera `C64T64.parse()`, który obsługuje wyłącznie archiwa kontenerowe `.T64` i odrzucał zrzuty `.TAP` z sygnaturą `"C64-TAPE-RAW"`.
2. **Brak emulacji sprzętowej magnetofonu Commodore 1530 C2N Datasette:**
   - Komercyjne gry kasetowe korzystają z zaawansowanych loaderów turbo (*Turbo Tape*, *Novaload*, *Cyberload*, *Freeload*), które odczytują impulsy magnetyczne przez **linię `FLAG` układu CIA 1** (przerwanie bitu 4 rejestru `$DC0D`) oraz sterują silnikiem taśmy przez **bit 5 portu procesora 6510 `$0001`**.

---

## 2. Zrealizowane Zmiany i Nowa Architektura

1. **Moduł `C64TAP` (`src/c64/c64_tap.ts`):**
   - Pełna obsługa kontenerów `.TAP` w wersjach v0, v1 i v2.
   - Dekodowanie impulsów do bufora `Uint32Array` czasów trwania w taktach zegara CPU.
   - Moduł rekonstrukcji bloków standardowych KERNAL (szybki autostart programów BASIC i maszynowych w ~100 ms).

2. **Moduł `C64Datasette` (`src/c64/c64_datasette.ts`):**
   - Cyklo-dokładna emulacja magnetofonu C2N Datasette.
   - Integracja z portem procesora `$0001`:
     - Bit 5: detekcja załączenia silnika (`0 = Motor ON`, `1 = Motor OFF`).
     - Bit 4: zwracanie stanu czujnika klawisza `PLAY` (`0 = Play pressed`, `1 = Released`).
   - Generowanie przerwań zbocza opadającego na linii `FLAG` układu CIA 1 (`cia1.triggerInterrupt(0x10)`).
   - Licznik taśmy `0000..9999`, wskaźnik postępu % oraz Auto-Warp.

3. **Integracja w `C64Memory` i `C64System` (`src/c64/c64_memory.ts`, `src/c64/c64_system.ts`):**
   - Dodanie metody `system.mountTAP(data, autoRun, fileName, standard)`.
   - Przekazywanie cykli procesora do magnetofonu `datasette.step(cyc)` na każdym kroku pętli emulacyjnej.
   - Odczyt/zapis portu `$0001` powiązany ze stanem klawisza Play i silnika magnetofonu.

4. **Integracja w UI (`App.tsx` & `C64StorageExplorer.tsx`):**
   - Bezpośrednie kierowanie plików `.TAP` do `system.mountTAP()`.
   - Dedykowany panel magnetofonu 1530 C2N Datasette w eksploratorze nośników (przyciski PLAY, STOP, REWIND, EJECT, dioda MOTOR ON, licznik taśmy).

---

## 3. Zmodyfikowane i Utworzone Pliki

- `src/c64/c64_tap.ts` [NOWY]
- `src/c64/c64_datasette.ts` [NOWY]
- `src/c64/c64_memory.ts` (linie 50–52, 279–285, 370–385)
- `src/c64/c64_system.ts` (linie 15–45, 140–175, 660–715, 910–975, 1145–1160)
- `src/App.tsx` (linie 196–205)
- `src/components/C64StorageExplorer.tsx` (linie 275–355)

---

## 4. Weryfikacja

1. **Testy jednostkowe (`scratch/test_tap_execution.cjs`):**
   - Przetestowano 6 komercyjnych obrazów `.TAP` z `src/roms/games/tap/G/` (*Galaxions*, *Galax-i-Birds*, *Ghostbusters*, *The Great Giana Sisters*, *Green Beret*, *Gauntlet*).
   - Wynik: 6/6 gier zdekodowanych pomyślnie.
2. **Kompilacja TypeScript:**
   - `npx tsc --noEmit` — 0 błędów.
3. **Weryfikacja w przeglądarce:**
   - Sprawdzono działanie interfejsu eksploratora nośników i ekranu CRT.

---

## 5. Wynik
**Status:** `SUKCES` ✅
