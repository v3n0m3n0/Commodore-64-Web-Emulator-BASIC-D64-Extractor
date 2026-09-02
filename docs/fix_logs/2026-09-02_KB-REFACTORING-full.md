# Fix Log: Refaktoryzacja Bazy Wiedzy (Technical Knowledge Base) & KB-Preflight Protocol v2.0

- **Data i godzina:** 2026-09-02 09:45
- **Komponenty:** `docs/knowledge_base/`, `AGENTS.md`, `GEMINI.md`, `metadata.json`
- **Referencje zewnętrzne:** 
  - `https://www.pagetable.com/c64ref/6502/`
  - `https://www.pagetable.com/c64ref/kernal/`
  - `https://www.pagetable.com/c64ref/c64disasm/`
  - `https://www.pagetable.com/c64ref/c64mem/`
  - `https://www.pagetable.com/c64ref/colors/`

---

## 1. Opis Zadania i Symptomów

Weryfikacja i gruntowna refaktoryzacja wbudowanej bazy wiedzy (*Technical Knowledge Base*) projektu Commodore 64 Web Emulator w oparciu o 5 autorytatywnych źródeł pagetable.com (Michael Steil).
Zaprojektowanie i wdrożenie mechanizmu gwarantującego automatyczny odczyt aktualnej wiedzy z bazy przed każdą analizą błędu (*bug report*).

---

## 2. Zidentyfikowane Luki i Przyczyny Źródłowe w Dotychczasowej KB

1. **Brak dokumentacji disasemblacji ROM:** Żaden rozdział nie opisywał punktów wejścia BASIC/KERNAL ROM, symboli ani diagnostycznych wzorców kodu maszynowego (np. hooki IRQ/NMI).
2. **Skrajnie szczupły rozdział 07 (Kolory):** Posiadał jedynie prostą tabelę 16 kolorów Pepto. Brakowało nowoczesnej palety Colodore, poziomów luminancji dla rewizji OLD (6569R1, 5 poziomów) vs NEW (9 poziomów) oraz opisu zjawiska uśredniania chroma w liniach opóźniających PAL (dithering 23c, 39c, 55c, 133c).
3. **Brak wektorów pośrednich RAM KERNAL:** Rozdział 03 pomijał kluczowe 16 wektorów `$0314-$0333` (CINV, CBINV, NMINV...), które są modyfikowane przez gry i procedury systemowe.
4. **Niepełny opis rejestru DDR `$0000`:** Brakowało precyzyjnego opisu bitów 0-5 rejestru kierunku portu procesora MOS 6510.
5. **Brak mapy powiązań KB ↔ Kod TS:** Brakowało ujednoliconego rozdziału wskazującego, który symbol/rejestr sprzętowy odpowiada któremu plikowi TypeScript w projekcie.
6. **Niewystarczająco sformalizowany proces odczytu KB:** Dotychczasowa reguła §3 nie wymuszała precyzyjnej kolejności kroków weryfikacji przed przystąpieniem do analizy błędu.

---

## 3. Zastosowane Rozwiązania i Wprowadzone Modyfikacje

1. **Rozbudowa Rozdziału 07 (`07_VIC2_PALETTE_AND_COLOR_MODELS.md`):**
   - Dodano pełne zestawienie Pepto vs Colodore (HEX, RGB, Luma).
   - Wprowadzono specyfikację sprzętową rewizji VIC-II (OLD 5 luma levels vs NEW 9 luma levels).
   - Opisano fizyczne uśrednianie linii w standardzie PAL i presety ditheringu.
   - Dodano sekcję relevancji dla `src/c64/c64_vic2.ts`.
2. **Utworzenie Nowego Rozdziału 15 (`15_ROM_DISASSEMBLY_AND_ENTRY_POINTS.md`):**
   - Skatalogowano najważniejsze punkty wejścia KERNAL ROM (`$E000-$FFFF`) i BASIC ROM (`$A000-$BFFF`).
   - Opisano diagnostyczne wzorce przechwytywania przerwań rastrowych VIC-II i procedur wejścia/wyjścia.
3. **Utworzenie Nowego Rozdziału 16 (`16_CODEBASE_CROSS_REFERENCE.md`):**
   - Utworzono kompletną mapę chipów i rejestrów sprzętowych na pliki TypeScript w `src/c64/` oraz komponenty UI w `src/components/`.
4. **Aktualizacja Rozdziału 02 (`02_C64_MEMORY_MAP_AND_ZERO_PAGE.md`):**
   - Dodano szczegółowy opis rejestru DDR `$0000` bit-by-bit oraz linii magnetofonu `$0001`.
5. **Aktualizacja Rozdziału 03 (`03_KERNAL_API_REFERENCE.md`):**
   - Wprowadzono tabelę 16 wektorów pośrednich RAM `$0314-$0333`.
6. **Utworzenie Dziennika Audytu (`VERIFICATION_LOG.md`):**
   - Skatalogowano status weryfikacji wszystkich 16 rozdziałów KB.
7. **Aktualizacja Reguł Projektu (`AGENTS.md` oraz `GEMINI.md`):**
   - Wdrożono **KB-Preflight Protocol v2.0** w §3: ścisła 5-etapowa sekwencja odczytu bazy wiedzy przed jakąkolwiek analizą zgłoszenia.
   - Dodano **Regułę §5 (KB-Update & Verification Rule)**: obowiązkowa aktualizacja KB po każdej konsultacji zewnętrznej.
8. **Aktualizacja Indeksu KB (`README.md`) oraz Metadanych KI (`metadata.json`).**

---

## 4. Zmodyfikowane i Utworzone Pliki

| Plik | Status | Opis |
|---|---|---|
| `docs/knowledge_base/07_VIC2_PALETTE_AND_COLOR_MODELS.md` | Zmodyfikowany | Rozbudowa o Colodore, Pepto, OLD/NEW luma, dithering PAL |
| `docs/knowledge_base/15_ROM_DISASSEMBLY_AND_ENTRY_POINTS.md` | **Nowy** | Punkty wejścia ROM BASIC/KERNAL, wzorce maszynowe |
| `docs/knowledge_base/16_CODEBASE_CROSS_REFERENCE.md` | **Nowy** | Cross-reference sprzęt C64 ↔ TypeScript / React |
| `docs/knowledge_base/02_C64_MEMORY_MAP_AND_ZERO_PAGE.md` | Zmodyfikowany | Uzupełnienie o $0000 DDR bit-by-bit i linie magnetofonu |
| `docs/knowledge_base/03_KERNAL_API_REFERENCE.md` | Zmodyfikowany | Dodanie wektorów pośrednich RAM $0314-$0333 |
| `docs/knowledge_base/VERIFICATION_LOG.md` | **Nowy** | Dziennik audytu i weryfikacji merytorycznej KB |
| `docs/knowledge_base/README.md` | Zmodyfikowany | Indeks z 16 rozdziałami i linkiem do weryfikacji |
| `AGENTS.md` | Zmodyfikowany | Wdrożenie KB-Preflight Protocol v2.0 i Reguły §5 |
| `GEMINI.md` | Zmodyfikowany | Synchronizacja z AGENTS.md |
| `knowledge/c64-web-emulator/metadata.json` | Zmodyfikowany | Zaktualizowane referencje KI do nowych rozdziałów |

---

## 5. Wynik Wdrożenia

- **Wynik:** `SUKCES`
- Baza wiedzy powiększona z 14 do 16 kompleksowych rozdziałów.
- KB w 100% zgodna z autorytatywnymi źródłami `https://www.pagetable.com/c64ref/`.
- Protokół odczytu KB przed zgłoszeniem błędu sformalizowany i wdrożony w regułach projektu.
