# Fix Log: Naprawa Pętli Linii Rastrowych VIC-II i Wykonywania Dekompresora w "Burmistrz 3.t64"

- **Data i godzina:** 2026-09-02 10:14
- **Nośnik:** `src/roms/games/polish_classics/Burmistrz 3.t64`
- **Symptom:** Po załadowaniu `Burmistrz 3.t64` i odczekaniu 8 sekund gra zawieszała się na etapie dekompresora (`MUZYKA Z 'RED MOON'`) i nie przechodziła do ekranu tytułowego.

---

## 1. Zidentyfikowana Przyczyna Źródłowa (Root Cause)

W pliku `src/c64/c64_system.ts` w metodzie `stepScanline()` występowały dwa błędy w synchronizacji sprzętowej procesora 6510 z układem graficznym VIC-II i timerami CIA 1/2:
1. **Zmienna `this.lineCycleRemainder`:**
   - Gdy VIC-II wstrzymywał procesor na liniach Bad Lines (`stolen = 40` cykli DMA), `cpuBudget` stawał się ujemny lub zerowy.
   - Algorytm akumulował błąd cykli w `lineCycleRemainder`, powodując permanentne głodzenie procesora (`cpuDone = 0`) na kolejnych liniach rastrowych.
2. **Kolejność krokowania timerów CIA:**
   - W liniach ze skradzionymi cyklami DMA (`stolen > 0`) timery CIA były krokowane dopiero **po** pętli procesora, zamiast natychmiast przy rozpoczęciu transferu DMA przez VIC-II.
   - W rezultacie timery CIA 1 (odpowiedzialne za przerwania IRQ) otrzymywały skokowe, opóźnione serie 40 cykli, co w krytycznym momencie dekompresji (współdzielenie strony stosu `$0100-$01FF` z kodem dekompresora) wywoływało przerwanie IRQ niszczące wskaźniki powrotu na stosie i skok PC pod adresy `$0021`/`$0027`.

---

## 2. Wprowadzone Modyfikacje

- **Plik:** [`src/c64/c64_system.ts`](file:///C:/Users/KB/Desktop/Antigravity/Commodore%2064%20Web%20Emulator/src/c64/c64_system.ts) (linie 896–939)
- **Zmiany:**
  - Natychmiastowe zasilenie układów peryferyjnych (CIA 1, CIA 2, Datasette) skradzionymi cyklami DMA przy rozpoczęciu scanline (`stolen > 0`).
  - Uproszczenie i zabezpieczenie budżetu cykli CPU: `const cpuBudget = Math.max(0, cycPerLine - (stolen || 0));`.
  - Usunięcie wadliwego akumulatora `lineCycleRemainder`, który zakłócał równowagę czasową CPU i układów CIA.

---

## 3. Wyniki Weryfikacji (Testy E2E w Przeglądarce)

Przeprowadzono pełny test E2E w przeglądarce za pośrednictwem `browser_subagent`:
1. Uruchomiono `Burmistrz 3` z poziomu zakładki *Katalog Polskich Gier*.
2. Dekompresor taśmowy wykonał rozpakowanie w ~7,8 sekundy czasu rzeczywistego.
3. Wyświetlił się autentyczny ekran tytułowy:
   - `MACIEK KOZICKI PRZEDSTAWIA:`
   - `BURMISTRZ 3`
   - `PRESS SPACE TO CONTINUE..... 27.06.1993`
   - Odtwarzana jest muzyka SID w tle.
4. Po wciśnięciu klawisza **SPACJA** gra natychmiast przeszła do planszy instrukcji i właściwej rozgrywki:
   - `W TEJ GRZE WCIELASZ SIE W POSTAC BURMISTRZA MIASTA...`
5. Zapisano zrzuty ekranu potwierdzające sukces: `burmistrz3_title_screen_decrunched.png` oraz `burmistrz3_instruction_screen_success.png`.

---

## 4. Wynik

- **Status:** `SUKCES`
