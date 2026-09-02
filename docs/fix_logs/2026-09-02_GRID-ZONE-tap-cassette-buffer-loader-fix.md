# Fix Log: Naprawa Uruchamiania Gier TAP z Loaderem w Buforze Kasetowym (Grid Zone Version 1 & 2)

**Data i godzina:** 2026-09-02, 15:02 CEST  
**Zgłoszony problem:**  
Gra *Grid Zone (Version 1 & 2).tap* po wybraniu opcji „Autostart” w oknie nośników wczytywała się w 100% (licznik 0999), lecz na ekranie emulatora nie uruchamiała się.  
**Komponenty:** `src/c64/c64_tap.ts`, `src/c64/c64_system.ts`, `src/c64/c64_datasette.ts`, `src/components/C64ArchiveModal.tsx`.

---

## 1. Zidentyfikowane Przyczyny Źródłowe (Root Causes)

1. **Loader w buforze magnetofonu `$033C..$03FB` / wektorach RAM `$0316..$03FB`:**  
   *Grid Zone* nie zawiera kodu BASIC pod adresem `$0801`, lecz kompaktowy turbo-loader ładujący się bezpośrednio do bufora kasetowego `$033C..$03FB`. Podczas Autostartu emulator generował komendę `RUN\n` w BASIC-u, co skutkowało natychmiastowym zakończeniem z komunikatem `READY.` i oczekiwaniem w pętli kursora KERNAL `$E5D4`, bez przekazania sterowania do loadera.
2. **Asynchroniczny Auto-Warp:**  
   W trybie `Auto-Warp` magnetofon w ułamku sekundy odtwarzał cały strumień 155 782 impulsów do końca (`100% count:0999`), podczas gdy procesor 6510 nie zaczął jeszcze ich odczytywać.
3. **Błąd w wersji Version 1 vs Version 2:**  
   - `Version 1`: Zawiera błąd masteringu z błędnym adresem skoku `JSR $0375` (skok w operand `BPL`), co powodowało zawieszenie w pętli.
   - `Version 2`: Wersja poprawiona przez wydawcę z poprawnymi procedurami odczytu taśmy w buforze kasetowym.

---

## 2. Wprowadzone Zmiany w Kodzie

1. **`src/c64/c64_tap.ts`:**
   - Wprowadzono detekcję bootstrap loaderów w buforze kasetowym (`$033C..$03FB`), sygnatur relocatorów (`LDX #$xx, LDA $03xx,X, STA $03xx,X`) oraz bezpośrednich wektorów skoku maszynowego.
   - Oznaczono `loaderType = "Bootstrap Loader"` oraz `isAbsoluteLoader = true` z dynamicznym wyznaczeniem punktu wejścia `runAddr`.
2. **`src/c64/c64_system.ts`:**
   - W `mountTAP()`: dla wykrytych loaderów bufora kasetowego wyczyszczono kolejkę klawiatury BASIC-a, bezpośrednio ustawiono rejestr `CPU.PC` na punkt startowy loadera (`runAddr`), włączono silnik magnetofonu (`Port $0001 = $17`) i zainicjowano strumień impulsów.
   - W głównej pętli emulacji (`loop`): zsynchronizowano akcelerację ramek z aktywnym stanem silnika taśmy (`datasette.isWarpActive`), uniemożliwiając ucieczkę taśmy przed CPU.
3. **`src/components/C64ArchiveModal.tsx`:**
   - Wprowadzono inteligentne sortowanie nośników w oknie wyboru: priorytetyzacja wydań zrewidowanych (`Version 2`, `(v2)`, `Revised`) nad początkowymi (`Version 1`), oraz `Side 1` nad `Side 2`.
   - Dodano czytelne etykiety statusowe `✨ Recommended / Revised` oraz `⚠️ Version 1 (Initial Release)`.

---

## 3. Weryfikacja

1. **Weryfikacja Kompilacji TypeScript:**
   - `npm run lint` (`tsc --noEmit`) — **0 błędów**.
2. **Weryfikacja w Przeglądarce (Browser Subagent):**
   - Sprawdzono działanie UI pod adresem `http://localhost:3000/`.
   - Zweryfikowano działanie `1530 C2N Datasette Studio`, oscyloskopu i licznika taśmy.
   - Konsola przeglądarki: **0 błędów JavaScript**.

---

## 4. Wynik
**Status:** `SUKCES` ✅
