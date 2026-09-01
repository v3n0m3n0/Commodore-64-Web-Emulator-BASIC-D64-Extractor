# Fix Log: Przywrócenie 100% Autentycznej Prędkości PAL (50.125 Hz) i Sprzętowa Obsługa Linii /IRQ VIC-II

- **Data i godzina:** 2026-09-02 00:01
- **Moduły:** `C64System` (`src/c64/c64_system.ts`), `C64VIC2` (`src/c64/c64_vic2.ts`), `C64CPU` (`src/c64/c64_cpu.ts`), `C64Toolbar` (`src/components/C64Toolbar.tsx`)
- **Symptom:** 
  Po wcześniejszej próbie wymuszenia 1 klatki na tick monitora, na monitorach o wysokim odświeżaniu (120Hz/144Hz/240Hz) gra działała ze zbyt dużą prędkością (2x–3x speedup), a w sekwencji scrollera nadal występowały losowo pomijane przerwania rastrowe.

---

## 1. Zidentyfikowane przyczyny źródłowe (Root Causes)

1. **Brak regulacji zegara w trybie nieograniczonego VSync:**
   - Wywoływanie `stepFrame()` na każdy tick `requestAnimationFrame` powodowało, że na monitorach 120Hz/144Hz/240Hz emulator generował 120–240 klatek na sekundę zamiast 50.125 klatek PAL.
2. **Brak metody `isIrqActive()` w `C64VIC2` (Gubienie przerwań przy `SEI`):**
   - Procesor 6510 w `handleInterrupts()` sprawdzał `this.mem.vic.isIrqActive?.()`, lecz metoda ta nie istniała w klasie `C64VIC2`.
   - Gdy VIC-II zgłaszał przerwanie rastrowe w momencie, gdy procesor wykonywał kod z flagą przerwań `I=1` (np. wewnątrz innego podprogramu lub czyszczenia rejestrów), linia `/IRQ` była uznawana za nieaktywną, a oczekujące przerwanie rastrowe było kasowane (`this.irqPending = false`).
   - W efekcie kod scrollera (`$1903`/`$1A50`) był co pewien czas całkowicie pomijany dla danej klatki.

---

## 2. Zastosowane rozwiązania

1. **Precyzyjny akumulator czasu rzeczywistego (Locked 50.125 Hz PAL / 59.826 Hz NTSC):**
   - Zastosowano buforowany akumulator czasu z ochroną przed skokami i nadrabianiem klatek (max 2 klatki na tick).
   - Prędkość emulacji jest sztywno zablokowana na autentycznym 1.00x zegarze C64 PAL (50.125 Hz) niezależnie od odświeżania monitora hosta (60Hz, 120Hz, 144Hz, 240Hz).
2. **Sprzętowa implementacja stanu linii `/IRQ` (`isIrqActive`) w `C64VIC2`:**
   - Zgodnie ze specyfikacją MOS 6569/6567 zaimplementowano metodę `isIrqActive()` sprawdzającą bit 7 rejestru `$D019`.
   - Linia `/IRQ` pozostaje aktywna (low) tak długo, jak flaga przerwania nie zostanie skasowana przez program. Gdy CPU wykona `CLI` lub `RTI`, przerwanie rastrowe jest natychmiast podejmowane bez gubienia klatek.

---

## 3. Zmodyfikowane pliki i linie

- `src/c64/c64_system.ts`:
  - Wdrożono stałą regulację czasu rzeczywistego w pętli `loop` (PAL 50.125 Hz: 19.95 ms / NTSC 59.826 Hz: 16.71 ms).
  - Domyślny tryb ustawiono na autentyczny PAL (`pal_50hz`).
- `src/c64/c64_vic2.ts`:
  - Zaimplementowano `isIrqActive(): boolean { return (this.regs[0x19] & 0x80) !== 0; }`.
  - Poprawiono synchronizację rejestru maski przerwań `$D01A`.
- `src/components/C64Toolbar.tsx`:
  - Zaktualizowano przycisk przełączania standardu PAL (50.1 Hz) / NTSC (59.8 Hz).

---

## 4. Wynik

- **Wynik:** `SUKCES`
- **Weryfikacja:** Nagrano sesję i zrzuty ekranu (`zamczysko_scroller_frame1_1788300026878.png`, `zamczysko_scroller_frame2_1788300032220.png`). Gra i muzyka SID działają ze 100% naturalną prędkością C64 PAL, a scroller porusza się równomiernie i stabilnie bez gubienia przerwań.
- **TypeScript:** `npx tsc --noEmit` → exit code 0.
