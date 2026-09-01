# Fix Log: Automatyczne Rozpoznawanie Standardu Wideo PAL / NTSC i Dostrajanie Odświeżania

**Data i godzina:** 2026-09-02, 00:45 CEST  
**Zgłoszony problem / Funkcjonalność:**  
Implementacja automatycznego rozpoznawania wersji gry/programu (czy jest w formacie PAL 50.125 Hz, czy NTSC 59.826 Hz / Dual) i samoczynnego ustawiania parametrów układów emulacyjnych oraz prędkości odświeżania.

---

## 1. Zrealizowana Architektura Rozpoznawania (Multi-Tier Pipeline)

1. **Moduł `C64StandardDetector` (`src/c64/c64_standard_detector.ts`):**
   - **Tier 1 (Nagłówki binarne):**
     - Pliki SID (PSID/RSID): analiza bajtów `$76-$77` (flagi wideo: bity 2–3, gdzie `01` = PAL, `10` = NTSC, `11` = DUAL).
     - Kartridże CRT: analiza nagłówka `$0016` oraz nazwy kartridża.
   - **Tier 2 (Tagi regionalne TOSEC / Scene / No-Intro):**
     - Reguły regex dla NTSC: `(USA)`, `[USA]`, `(U)`, `[U]`, `(NTSC)`, `[NTSC]`, `(Canada)`, `(Japan)`.
     - Reguły regex dla PAL: `(Europe)`, `[Europe]`, `(EUR)`, `(E)`, `(PAL)`, `[PAL]`, `(Poland)`, `(Germany)`, `(UK)`, `(France)`, `(Italy)`, `(Sweden)`, `(Australia)`, ścieżki `polish_classics`.
   - **Tier 3 (Wewnętrzne nagłówki nośników):**
     - Sektor BAM w obrazach D64 (Ścieżka 18, Sektor 0) oraz nagłówki taśm T64.
   - **Domyślny fallback:** PAL (50.125 Hz).

2. **Automatyczna rekonfiguracja podzespołów w `C64System`:**
   - Metoda `setStandard(std: VideoStandard, updateSyncMode = true)`:
     - `C64VIC2`: przestawienie `cyclesPerLine` (PAL: 63 / NTSC: 65), `totalRasterLines` (PAL: 312 / NTSC: 263), zakresu widocznych linii rastra (PAL: 16..288 / NTSC: 12..250).
     - `C64CIA`: przestawienie zegarów magistrali (PAL: 985 248 Hz / NTSC: 1 022 727 Hz) i dzielnika TOD.
     - `C64Memory`: aktualizacja rejestru KERNAL Zero Page `$02A6` (`0 = NTSC`, `1 = PAL`).
     - Pętla czasu rzeczywistego: automatyczne zablokowanie na 19.95 ms (PAL 50.1 Hz) lub 16.71 ms (NTSC 59.8 Hz).

3. **Integracja w procedurach ładowania nośników:**
   - `mountD64()`, `mountT64()`, `loadAndRunPRG()`, `loadCartridge()`, `C64ArchiveManager` — wszystkie metody automatycznie dokonują klasyfikacji i adaptacji sprzętowej przed uruchomieniem kodu.

---

## 2. Zmodyfikowane i Utworzone Pliki

- `src/c64/c64_standard_detector.ts` (Nowy moduł detektora)
- `src/c64/c64_system.ts` (Implementacja `setStandard()`, `toggleSyncMode()` oraz automatyczna detekcja w `loadAndRunPRG`, `mountD64`, `mountT64`, `loadCartridge`)
- `src/c64/c64_archive_manager.ts` (Dodanie właściwości `detectedStandard` do `ExtractedMediaFile` i analiza w `processBinaryData`, `unzipArchive`, `gunzipFile`)
- `src/App.tsx` (Przekazywanie wykrytego standardu podczas montowania mediów)
- `src/components/C64PolishGamesCatalog.tsx` (Przekazywanie nazw plików do metod montowania)

---

## 3. Weryfikacja

1. **Testy jednostkowe (`scratch/test_standard_detector.js`):**
   - Sprawdzono 10 zróżnicowanych przypadków testowych (nagłówki binarne, gry polskie, tagi TOSEC `(USA)`, `(Europe)`, `[NTSC]`, `(U)`, `(E)`).
   - Wynik: 10/10 PASS.
2. **Kompilacja TypeScript:**
   - `npx tsc --noEmit` — 0 błędów.
3. **Browser Subagent Test:**
   - Zweryfikowano automatyczne załadowanie gry w standardzie PAL (50.1 Hz).
   - Zweryfikowano działanie przełączania ręcznego na NTSC (59.8 Hz, 263 linie, 65 cykli/linię) i poprawność odzwierciedlenia w interfejsie oraz telemetrii.

---

## 4. Wynik
**Status:** `SUKCES` ✅
