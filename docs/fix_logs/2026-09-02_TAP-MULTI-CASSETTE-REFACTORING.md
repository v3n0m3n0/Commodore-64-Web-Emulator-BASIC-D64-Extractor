# Fix Log: Głęboka Refaktoryzacja Obsługi Taśm TAP, Multi-Cassette Tape Deck i Oscyloskopu Strumienia Impulsów

**Data i godzina:** 2026-09-02, 14:38 CEST  
**Zgłoszony problem:**  
Potrzeba głębokiej refaktoryzacji kodu emulatora pod kątem obsługi formatów taśmowych `.TAP`, wsparcia wielokasetowych wydań gier (Side 1 / Side 2, Tape A / Tape B) z możliwością hot-swapu bez restartu procesora i RAM-u, precyzyjnego pozycjonowania taśmy oraz wprowadzenia co najmniej 3 kluczowych usprawnień funkcjonalnych.  
**Komponenty:** `src/c64/c64_tap.ts`, `src/c64/c64_datasette.ts`, `src/c64/c64_system.ts`, `src/c64/c64_archive_manager.ts`, `src/components/C64DatasetteStudio.tsx`, `src/components/C64StorageExplorer.tsx`, `src/components/C64Toolbar.tsx`, `src/App.tsx`.

---

## 1. Zrealizowane Główne Usprawnienia Funkcjonalne

### 🌟 Usprawnienie 1: Multi-Cassette Tape Deck Engine & Hot-Swapping bez Resetu RAM/CPU
- **Architektura karuzeli kasetowej (`tapeDeck`, `TapeDeckEntry[]`):**
  - Magnetofon `C64Datasette` może teraz zarządzać wieloma kasetami jednocześnie (np. *North & South*, *Turn'n'Burn*, *Twinworld*, *Typhoon*, *Vigilante*, *Viz*, *Yes Prime Minister*).
  - Wprowadzono metodę `flipSide(resumePlayback)` oraz `switchTape(index)` pozwalające na bezszwowe przełączanie stron kasety w locie, gdy gra wyświetla komunikat *„INSERT SIDE 2 AND PRESS PLAY ON TAPE”*, zachowując w 100% stan pamięci RAM `$0000..$FFFF` i rejestrów 6510 CPU.
  - Automatyczne grupowanie stron taśm w `C64ArchiveManager.findTapeSets()` na podstawie wzorców nazw plików (`(Side 1)`, `(Side 2)`, `_SideA`, `Tape 1`).

### 🌟 Usprawnienie 2: Precyzyjny Scrubber Taśmy, Skok do Pliku (Cue) i Adaptacyjna Klasyfikacja Impulsów
- **Wzbogacony dekoder `C64TAP` i wskaźnik strumienia:**
  - Wzbogacono parser o detekcję kontenerów TAP v0, v1, v2 z 24-bitowymi przerwami i poprawnym taktowaniem PAL/NTSC.
  - Rozszerzono `TAPFileEntry` o metadane: typ programu (`BASIC PRG`, `Machine Code PRG`, `Bootstrap Loader`, `Cyberload`), start address, sformatowany rozmiar oraz dokładny offset impulsowy `pulseOffset`.
  - Wprowadzono funkcję natychmiastowego pozycjonowania taśmy (`seekToPulse`, `seekToPercent`, `seekToCounter`, `seekToFile`) umożliwiającą natychmiastowy skok głowicy magnetofonu do wybranego programu na taśmie wieloprogramowej.

### 🌟 Usprawnienie 3: 1530 C2N Datasette Studio z Oscyloskopem Strumienia Magnetycznego w Czasie Rzeczywistym
- **Dedykowany moduł UI `C64DatasetteStudio.tsx`:**
  - **Oscyloskop magnetyczny:** Płynny rendering na canvasie `requestAnimationFrame` z siatką oscyloskopową, linią głowicy odczytu i kodowaniem kolorystycznym impulsów (Krótki: zieleń, Średni: cyjan, Długi: bursztyn, Turbo burst: fiolet).
  - **Mechaniczny panel transportu:** Przyciski `PLAY`, `STOP`, `REWIND (000)`, `FFWD (+10%)`, przełącznik `Auto-Warp` oraz bezpośredni selektor licznika `000..999`.
  - **Tabela katalogu taśmy:** Lista wykrytych programów z akcjami `Run`, `Cue`, podglądem w `BASIC Studio` i disasemblacją w `6502 Debugger`.
  - **Klasyki wielokasetowe:** Wbudowany selektor autentycznych tytułów wielokasetowych z automatycznym pobieraniem binarnym przez `/api/roms`.

### 🌟 Usprawnienie 4: Pasek Szybkiego Przełączania Stron w Głównym Toolbarze
- Dodano wskaźnik `📼 [Side 1 ▾] Counter: 0142 (Play)` w `C64Toolbar` z bezpośrednim przyciskiem `⇄ FLIP`, umożliwiający natychmiastową zmianę strony kasety z poziomu ekranu gry CRT bez przełączania zakładek.

---

## 2. Zmodyfikowane i Nowe Pliki

1. **`src/c64/c64_tap.ts`** — Pełna refaktoryzacja parsera, `extractSideName`, `extractBaseGameName`, wzbogacone rekordy `TAPFileEntry`.
2. **`src/c64/c64_datasette.ts`** — Karuzela `tapeDeck`, `mountDeck`, `switchTape`, `flipSide`, `seekToPulse`, `seekToCounter`, `seekToFile`, bufor próbek oscyloskopu `getPulseSampleWindow`.
3. **`src/c64/c64_system.ts`** — Metody `mountTapeSet`, `switchTape`, `flipTapeSide`, rozszerzenie `SystemTelemetry` o stan magnetofonu i nazwy stron.
4. **`src/c64/c64_archive_manager.ts`** — Dodanie `findTapeSets` do automatycznego grupowania kaset wielostronnych.
5. **`src/components/C64DatasetteStudio.tsx`** *(Nowy)* — Komponent studia magnetofonu C2N Datasette z oscyloskopem, scrubberem i biblioteką kaset.
6. **`src/components/C64StorageExplorer.tsx`** — Zintegrowanie subtabu `1530 C2N Datasette Studio`.
7. **`src/components/C64Toolbar.tsx`** — Dodanie paska statusu taśmy i przycisku szybkiego przełączania stron `⇄ FLIP`.
8. **`src/App.tsx`** — Automatyczne wykrywanie towarzyszących stron taśm przy montowaniu i przekazanie handlerów `onFlipTapeSide`/`onSwitchTape`.
9. **`server.ts`** — Dodanie lokalnej ścieżki przeszukiwania `src/roms/games/tap/` dla automatycznego serwowania obrazów TAP.

---

## 3. Weryfikacja

1. **Weryfikacja w Przeglądarce (Browser Subagent):**
   - Sprawdzono załadowanie emulatora pod adresem `http://localhost:3000`.
   - Przetestowano przejście do zakładki `1541 Disk & Tapes` oraz subtabu `1530 C2N Datasette Studio`.
   - Zweryfikowano poprawne renderowanie panelu licznika taśmy, aktywnego stanu `STOPPED`, oscyloskopu sygnałów magnetycznych z legendą i siatką kineskopu.
   - Brak jakichkolwiek błędów w konsoli JavaScript (`0 errors`).
2. **Kompilacja TypeScript:**
   - `npm run lint` (`tsc --noEmit`) — **0 błędów**.

---

## 4. Wynik
**Status:** `SUKCES` ✅
