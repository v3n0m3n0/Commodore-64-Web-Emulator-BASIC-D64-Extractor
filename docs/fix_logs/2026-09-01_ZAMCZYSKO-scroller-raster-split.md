# Fix Log: Zamczysko — Pływający Tekst / Scroller Raster-Split Fix

- **Data i godzina:** 2026-09-01 23:25
- **Moduły:** `C64VIC2` (`src/c64/c64_vic2.ts`), `server.ts`
- **Symptom:** 
  Na ekranie powitalnym gry *Zamczysko.t64* (SONIC) pływający tekst (smooth horizontal scroller z napisami pozdrowień pod logiem "SONIC PROUDLY PRESENTS") był niestabilny, migotał, a litery były ucinane lub częściowo niewidoczne w kolejnych klatkach.

---

## 1. Zidentyfikowane przyczyny źródłowe (Root Causes)

1. **Brak sprzętowego automatu stanów liczników VIC-II (RC i VCBASE):**
   - Wcześniejsza implementacja `renderScanline()` wyliczała wiersz i linię znaku ze statycznego wzoru:
     `const displayY = c64Raster - (48 + yscroll)`
     Wzór ten był bezstanowy. Na oryginalnym układzie MOS 6569/6567 wybór wiersza znaków w pamięci ekranu ($0400) jest sterowany przez wewnętrzne liczniki sprzętowe:
     - `RC` (Row Counter, 0..7) – resetowany do 0 przy wystąpieniu Bad Line i inkrementowany co linię rastra.
     - `VCBASE` / `VC` (Video Counter Base) – inkrementowany o 40 bajtów w momencie przejścia `RC` z 7 na 0.
   - W intrze gry *Zamczysko* używane jest przerwanie rastrowe (Raster IRQ) do podziału ekranu (raster split) – górna część z logo ma inny stan YSCROLL/XSCROLL niż dolny scroller. Zmiana rejestru `$D011`/`$D016` w przerwaniu powodowała błędy wyliczenia `displayY` i gubienie wierszy znaków w dolnej połowie ekranu.

2. **Wymazywanie całego bufora pikseli (`clearFrameBuffer`) w linii rastra 0:**
   - Wywołanie `clearFrameBuffer()` w linii 0 zamazywało cały bufor ramki kolorem ramki z rejestru `$D020` w stanie z linii 0, niszcząc przestrzeń dla linii rysowanych po zmianach w przerwaniach rastrowych.

3. **Lokalny fallback dla pobierania ROM-ów w `server.ts`:**
   - Endpoint `/api/roms` próbował pobierać obrazy gier wyłącznie ze zdalnych serwerów GitHub przed sprawdzeniem lokalnego katalogu dyskowego `src/roms/games/polish_classics/`.

---

## 2. Zmodyfikowane pliki i linie

### `src/c64/c64_vic2.ts`
- **L48–L55:** Dodano sprzętowe rejestry wewnętrzne VIC-II: `vcBase` (0..960), `rc` (0..7), `displayActive` (boolean).
- **L142–L146:** Inicjalizacja liczników w metodzie `reset()`.
- **L241–L250:** Resetowanie `vcBase = 0`, `rc = 0`, `displayActive = false` w linii rastra 0 oraz usunięcie destrukcyjnego `clearFrameBuffer()`.
- **L280–L290:** Obsługa Bad Line w `startLine()` – ustawienie `rc = 0` oraz `displayActive = true` w momencie uderzenia w Bad Line.
- **L291–L307:** Inkrementacja `rc` i inkrementacja `vcBase += 40` przy przepełnieniu `rc === 7` w metodzie `endLine()`.
- **L338–L375:** Zastąpienie wzoru `displayY` odczytem `charRow = Math.floor(this.vcBase / 40)` oraz `charLine = this.rc`, z bezpośrednim mapowaniem `rowCharBase = this.vcBase`.

### `server.ts`
- **L1–L80:** Dodano `import fs from "fs"` oraz lokalne sprawdzanie istnienia pliku na dysku (`src/roms/games/polish_classics/`, `public/roms/`) przed próbami zapytań sieciowych.

---

## 3. Wynik

- **Wynik:** `SUKCES`
- **Weryfikacja w przeglądarce:** Scroller w grze *Zamczysko.t64* przesuwa się płynnie i bezbłędnie (zrzuty ekranu: `zamczysko_scroller_1_1788297848637.png`, `zamczysko_scroller_2_1788297856598.png`). Brak ucinania znaków, brak migotania, 100% czytelności tekstu z autentyczną paletą i synchronizacją rastra.
- **TypeScript:** `npx tsc --noEmit` → exit code 0.
