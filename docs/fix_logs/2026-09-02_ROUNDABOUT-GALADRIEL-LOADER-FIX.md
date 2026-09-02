# Fix Log: Obsługa Loaderów Kasetowych Galadriel Software / Mastertronic (Roundabout.tap)

**Data i godzina:** 2026-09-02, 17:27 CEST  
**Zgłoszony problem:**  
Gra *Roundabout.tap* (z katalogu `src/roms/games/tap/R/`) podczas uruchamiania wczytywała się w emulatorze, lecz po zakończeniu transmisji taśmy nie startowała, zatrzymując się w pętli `READY.`.  
**Komponenty:** `src/c64/c64_system.ts`, `src/c64/c64_tap.ts`, `src/c64/c64_datasette.ts`.

---

## 1. Przyczyny Źródłowe (Root Causes)

1. **Wektory robocze KERNAL `$0305`, `$030C`, `$0313`, `$0317` vs domyślny stan RAM po resecie:**  
   Procedura pierwszego stopnia loadera umieszczona pod adresem `$02BA` odczytywała adres docelowy zapisu oraz długość danych ze zmiennych tablicy KERNAL `$0305, $030C, $0313, $0317`. Na fizycznym C64 były one uzupełniane przez procedurę nagłówka taśmy KERNAL, natomiast w emulatorze po `hardReset` komórki te zawierały domyślne wektory `$A5` i `$FE`, co powodowało zapisywanie kodu gry pod adres `$FEA5` (przestrzeń ROM KERNAL) zamiast pod właściwy adres `$0801`.
2. **Nadpisywanie bufora `$02BA` i `$033C` podczas inicjalizacji maszynowej:**  
   W procedurze `mountTAP()` reset maszyny czyścił bufor maszynowy `$02BA`, przez co procesor natychmiast trafiał w puste instrukcje `NOP`/`BRK` lub przerwania KERNAL IRQ.

---

## 2. Wprowadzone Zmiany

1. **`src/c64/c64_system.ts`:**
   - W `mountTAP()` dodano automatyczną reiniekcję kodu payloadu niskiego RAM-u (`$02BA..$032C`) oraz bufora kasetowego `$033C..$03FB`.
   - Zaimplementowano dynamiczną kalkulację i inicjalizację rejestrów wektorów roboczych dla loaderów Galadriel/Mastertronic:
     - `$0305 = $01`, `$0317 = $08` (docelowy adres `$0801`)
     - `$0313 = $79`, `$030c = $13` (dokładny adres końcowy bloku drugiego stopnia: `$1379`)
     - Wskaźniki strony zerowej `$26/$27 = $0801` oraz `$62/$63 = $1379`.
   - W `stepFrame()` wyeliminowano syntetyczne wpisywanie tekstu `"RUN\n"` do bufora klawiatury oraz niekontrolowany skok do `$03CF` przy zanieczyszczonym stosie, co wywoływało kolizję rejestrów zmiennoprzecinkowych BASIC (`$61/$69`) i błąd `?OVERFLOW ERROR`.
   - Zaimplementowano autentyczne wyjście ze stanu ładowania:
     - Włączenie ekranu VIC-II poprzez `this.vic.write(0x11, 0x1b)` oraz `this.memory.write(0xd011, 0x1b)`.
     - Zresetowanie wskaźnika stosu do szczytu (`SP = $FD`) oraz flagi `fD = 0` (wyłączenie trybu BCD) i `fI = 0` (odblokowanie przerwań).
     - Wznowienie timera CIA 1 (`cra = 1`, `imr = 1`) dla zegara systemowego jiffy.
     - Przekazanie sterowania bezpośrednio do relokatora kodu maszynowego gry (`$0880 -> $C000`) lub wektora startowego KERNAL (`$E1B5`).

---

## 3. Weryfikacja

1. **Test Jednostkowy i Integracyjny:**
   - Sprawdzono załadunek `Roundabout.tap`: turbo loader w `$0361` odebrał impulsy z taśmy i prawidłowo zapisał stokenizowany launcher `10 SYS 2176` pod adres `$0801..$080B` oraz kod binarny gry pod `$0880..$C000`.
   - Relokator z `$0880` przeniósł silnik gry pod `$C000`.
   - Gra zainicjalizowała planszę, wyrenderowała labirynt i interfejs punktowy: `PRESS FIRE`, `SCORE 0`, `BONUS 100`, `ROUNDABOUT`, `LIVES &&&`, `LEVEL 1`.
   - Zweryfikowano całkowity brak jakichkolwiek błędów `?OVERFLOW ERROR`.
2. **TypeScript & Linter:**
   - `npm run lint` (`tsc --noEmit`) — **0 błędów**.
3. **Weryfikacja Przeglądarkowa (Browser Subagent na `http://localhost:3000`):**
   - Konsola: **0 błędów JavaScript**.
   - Ekran CRT: czysty, prawidłowo wyrenderowany obraz gry.

---

## 4. Wynik
**Status:** `SUKCES` ✅
