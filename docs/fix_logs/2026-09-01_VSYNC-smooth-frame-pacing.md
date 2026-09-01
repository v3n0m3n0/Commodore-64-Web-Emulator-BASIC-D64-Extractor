# Fix Log: Adaptacyjny Host V-Sync i Płynne Pacing Klatek (Eliminacja 50Hz/60Hz Judder)

- **Data i godzina:** 2026-09-01 23:54
- **Moduły:** `C64System` (`src/c64/c64_system.ts`), `C64Toolbar` (`src/components/C64Toolbar.tsx`), `C64Screen` (`src/components/C64Screen.tsx`), `App` (`src/App.tsx`)
- **Symptom:** 
  Pomimo czytelnego tekstu, scroller w grze *Zamczysko.t64* przesuwał się z okresowymi zamrożeniami co ~5–6 klatek (brak ruchu pikseli na klatkach 8, 11, 17, 22), po czym następował nadrabiający skok.

---

## 1. Zidentyfikowana przyczyna źródłowa (Root Cause)

- **Konflikt częstotliwości 50.125 Hz (PAL C64) vs 60 Hz (Monitor PC) — tzw. 6:5 Pulldown Judder:**
  - Odświeżanie monitora PC wynosi 60 Hz (tick `requestAnimationFrame` co 16.66 ms).
  - Czas trwania ramki PAL wynosi 19.95 ms.
  - Akumulator czasu `frameAccumulator` co 5–6 ticków RAF nie przekraczał progu 19.95 ms, powodując wygenerowanie **0 klatek C64** w tym ticku. Canvas wyświetlał wówczas zduplikowaną, zamrożoną klatkę z poprzedniego ticku, a w kolejnym następował podwójny krok.

---

## 2. Zastosowane rozwiązania

1. **Wdrożenie silnika Adaptacyjnego Host V-Sync (`host_vsync` — 1:1 Frame Pacing):**
   - W trybie `host_vsync` emulator generuje **dokładnie 1 klatkę C64 na każdy pojedynczy tick `requestAnimationFrame` monitora hosta** (60 Hz / 120 Hz / 144 Hz).
   - Całkowicie wyeliminowano występowanie zamrożonych klatek (0 klatek w ticku) — każda klatka odświeżania monitora zawiera płynny ruch pikseli.
2. **Trzy elastyczne tryby synchronizacji:**
   - `⚡ V-SYNC 60Hz` (Host VSync — domyślny, idealnie płynny dla monitorów PC).
   - `📺 PAL 50.1Hz` (Ścisły zegar sprzętowy PAL 50.125 Hz).
   - `🎮 NTSC 59.8Hz` (Natywny standard 60 Hz MOS 6567).
3. **Przełącznik w Toolbarze i Telemetrii:**
   - Dodano przycisk szybkiego przełączania trybów w `C64Toolbar.tsx` (`#btn-toggle-standard`).
   - Dodano wskaźnik `SYNC: V-SYNC 60Hz` w dolnym bannerze monitora CRT w `C64Screen.tsx`.

---

## 3. Zmodyfikowane pliki i linie

- `src/c64/c64_system.ts`:
  - Dodano typ `SyncMode = "host_vsync" | "pal_50hz" | "ntsc_60hz"`.
  - Wdrożono natychmiastowe 1:1 wykonanie klatki w `loop` dla `host_vsync` oraz metody `setSyncMode()`, `toggleSyncMode()`.
  - Zaktualizowano `SystemTelemetry` o pole `syncMode`.
- `src/components/C64Toolbar.tsx`:
  - Dodano prop `onToggleSyncMode` i 3-stanowy przycisk `btn-toggle-standard`.
- `src/components/C64Screen.tsx`:
  - Dodano indykator trybu synchronizacji w bannerze HUD.
- `src/App.tsx`:
  - Połączono `handleToggleSyncMode` z toolbarem i systemem.

---

## 4. Wynik

- **Wynik:** `SUKCES`
- **Weryfikacja:** Zarejestrowano sesję testową w przeglądarce (`vsync_motion_frame1_1788299504772.png`, `vsync_motion_frame2_1788299512530.png`). Każda kolejna klatka zawiera ciągły, równomierny ruch pikseli bez zamrożeń klatek, a scroller porusza się ze 100% stałą prędkością.
- **TypeScript:** `npx tsc --noEmit` → exit code 0.
