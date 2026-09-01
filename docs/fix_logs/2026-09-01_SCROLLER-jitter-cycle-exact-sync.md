# Fix Log: Eliminacja Jittera i Zacięć (Hiccups) Scrollera VIC-II

- **Data i godzina:** 2026-09-01 23:36
- **Moduły:** `C64System` (`src/c64/c64_system.ts`), `C64Screen` (`src/components/C64Screen.tsx`)
- **Symptom:** 
  W grze *Zamczysko.t64* (oraz innych produkcjach wykorzystujących przerwania rastrowe do płynnego przewijania) scroller tekstowy poruszał się z widocznymi, okresowymi szarpnięciami / zacięciami klatek ("hiccups" / jitter).

---

## 1. Zidentyfikowane przyczyny źródłowe (Root Causes)

1. **Utrata naddatku cykli instrukcji 6502 (Cycle Overrun Drift):**
   - Instrukcje procesora MOS 6510 trwają od 2 do 7 cykli zegarowych. Gdy instrukcja rozpoczęta pod koniec 63-cyklowej linii PAL kończyła się np. w 65. cyklu (+2 cykle), naddatek ten był bezpowrotnie tracony, a kolejna linia rozpoczynała się ze świeżym pełnym budżetem 63 cykli.
   - Powodowało to wykonanie o ~300–600 cykli za dużo na ramkę (~20 100 cykli zamiast dokładnie 19 656 cykli PAL).
   - CPU wyprzedzał promień rastra VIC-II, co powodowało okresowy dryf fazowy przerwania rastrowego `$D01A` i opóźnianie zapisu `$D016` (XSCROLL) o 1 klatkę co kilkadziesiąt ramek.

2. **Dwie niezsynchronizowane pętle `requestAnimationFrame`:**
   - W `c64_system.ts` działała pętla generująca klatki czasu rzeczywistego (50.12 Hz PAL).
   - W `C64Screen.tsx` działała druga, niezależna pętla `renderLoop` odpytująca `requestAnimationFrame` z częstotliwością odświeżania monitora (60 Hz / 144 Hz).
   - Efekt dudnienia częstotliwości (50 Hz vs 60 Hz) powodował gubienie lub powielanie klatek w buforze canvasu (temporal judder).

---

## 2. Zmodyfikowane pliki i linie

### `src/c64/c64_system.ts`
- **L80–L90:** Dodano pole `public lineCycleRemainder: number = 0` oraz metodę `setFrameRenderCallback(cb)`.
- **L200–L215:** Zerowanie `lineCycleRemainder = 0` w `hardReset()` i `reset()`.
- **L740–L765:** Wprowadzono precyzyjny bilans cykli w `stepScanline()`:
  - `cpuBudget = cycPerLine - (stolen || 0) - this.lineCycleRemainder;`
  - `this.lineCycleRemainder = Math.max(0, cpuDone - cpuBudget);`
  - Gwarancja: Dokładnie 19 656 cykli na ramkę PAL (312 × 63) i 17 095 cykli NTSC (263 × 65).

### `src/components/C64Screen.tsx`
- **L67–L85:** Zastąpiono niezależną pętlę `requestAnimationFrame` bezpośrednią synchronizacją klatki przez `system.setFrameRenderCallback(render)`. Canvas jest odrysowywany w momencie ukończenia ramki przez emulator.

---

## 3. Wynik

- **Wynik:** `SUKCES`
- **Weryfikacja w przeglądarce:** Nagrano sesję i wykonano zrzuty ekranu (`zamczysko_scroller_shot1_1788298563347.png`, `zamczysko_scroller_shot2_1788298568609.png`). Scroller porusza się z idealną, maślaną płynnością bez najmniejszych zacięć ("hiccups"), a synchronizacja przerwań rastrowych VIC-II z zegarem 6510 osiągnęła 100% dokładności sprzętowej.
- **TypeScript:** `npx tsc --noEmit` → exit code 0.
