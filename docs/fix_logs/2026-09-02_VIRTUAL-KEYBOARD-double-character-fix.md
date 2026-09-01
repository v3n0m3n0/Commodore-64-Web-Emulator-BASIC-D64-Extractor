# Fix Log: Eliminacja Podwójnego Wpisywania Znaków z Klawiatury Wirtualnej

- **Data i godzina:** 2026-09-02 00:08
- **Moduły:** `C64VirtualKeyboard` (`src/components/C64VirtualKeyboard.tsx`)
- **Symptom:** 
  Podczas klikania przycisków na klawiaturze wirtualnej każda litera lub znak wpisywały się podwójnie na ekranie Commodore 64 (np. `PPRRIINNTT  11` zamiast `PRINT 1`).

---

## 1. Zidentyfikowana przyczyna źródłowa (Root Cause)

- **Podwójna ścieżka wprowadzania znaków (Hardware Matrix + Direct Buffer Push):**
  - W funkcji `handleKeyClick` oraz `handlePolishChar` w `C64VirtualKeyboard.tsx` po kliknięciu klawisza wykonywane były jednocześnie dwie operacje:
    1. `system.keyboard.pressChord(col, row, modifiers, 120)` — ustawienie bitów w sprzętowej matrycy 8x8 CIA 1 ($DC00/$DC01). Rutyna KERNAL `SCNKEY` ($FF9F) skanuje matrycę, wykrywa wciśnięcie i dodaje znak do bufora klawiatury ($0277).
    2. `system.pushKey(targetPetscii)` — bezpośrednie, redundantne wstrzyknięcie kodu znaku do bufora klawiatury.
  - W rezultacie każde pojedyncze kliknięcie klawisza generowało **dwa identyczne znaki** w buforze C64.

---

## 2. Zastosowane rozwiązania

- Usunięto redundantne wywołania `system.pushKey()` z metod `handleKeyClick` oraz `handlePolishChar`.
- Klawiatura wirtualna korzysta teraz wyłącznie z autentycznego skanowania matrycy sprzętowej CIA 1 (`pressChord`), co gwarantuje 100% zgodności ze specyfikacją sprzętową C64 i pojedyncze wpisywanie znaków.

---

## 3. Zmodyfikowane pliki i linie

- `src/components/C64VirtualKeyboard.tsx`:
  - **L70–L108:** Usunięto blok `system.pushKey(targetPetscii)` z `handleKeyClick`.
  - **L115–L125:** Usunięto `system.pushKey(p.petscii)` z `handlePolishChar`.

---

## 4. Wynik

- **Wynik:** `SUKCES`
- **Weryfikacja w przeglądarce:** Kliknięto sekwencyjnie klawisze `P`, `R`, `I`, `N`, `T`, `Space`, `1` na klawiaturze wirtualnej. Na ekranie CRT pojawił się czysty, pojedynczy napis `PRINT 1` (zrzut ekranu: `crt_screen_single_keys_1788300419771.png`).
- **TypeScript:** `npx tsc --noEmit` → exit code 0.
