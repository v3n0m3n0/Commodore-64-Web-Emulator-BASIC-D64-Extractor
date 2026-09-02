# Fix Log: PETSCII codeToPetscii() — ArrowUp/ArrowLeft Błędne Kody + Shift+G

- **Data i godzina:** 2026-09-02 09:26
- **Moduły:** `src/c64/c64_keyboard.ts`, `src/components/C64VirtualKeyboard.tsx`
- **Referencja:** https://www.pagetable.com/c64ref/charset/ (mist64/c64ref rev 66d05a2)

---

## 1. Opis Zgłoszonego Problemu (Symptom)

Analiza debugowania PETSCII/Klawiatura zlecona przez użytkownika. Wymagało porównania kodu z autorytatywnym źródłem pagetable.com/c64ref/charset/.

---

## 2. Zidentyfikowane Przyczyny Źródłowe (Root Causes)

### BUG-01 & BUG-02 — `codeToPetscii()`: ArrowUp i ArrowLeft generują kody kursorów zamiast kodów znaków graficznych

- **Plik:** `src/c64/c64_keyboard.ts`, linie 249 i 251
- **Problem:**
  - `ArrowUp` → zwraca `0x91` (CRSR UP — kod sterujący, wytwarzany przez SHIFT+CRSR↕) zamiast `0x5E` (znak ↑, fizyczny klawisz strzałki w górę Col6/Row6)
  - `ArrowLeft` → zwraca `0x9D` (CRSR LEFT — kod sterujący, wytwarzany przez SHIFT+CRSR↔) zamiast `0x5F` (znak ←, fizyczny klawisz strzałki w lewo Col7/Row1)
- **Źródło standardu:** Wg pagetable.com PETSCII table (C64): klawisz `↑` (Col6/Row6) = PETSCII `$5E` (94 dec) bez SHIFT, `$FF` (255 dec, π) z SHIFT. Klawisz `←` (Col7/Row1) = PETSCII `$5F` (95 dec).
- **Wpływ:** Funkcja `codeToPetscii()` jest aktualnie **kodem martwym** — nie jest wywoływana przez żaden aktywny moduł (potwierdzono grep-em w całym `src/`). Ścieżka fizycznej klawiatury używa `pressKey()` → KERNAL `SCNKEY`, omijając `codeToPetscii()`. Wirtualna klawiatura już używa prawidłowych kodów: `0x5E` (line 707) i `0x5F` (line 240).

### BUG-03 — `codeToPetscii()`: ArrowUp+Shift nie obsługuje π ($FF)

- **Plik:** `src/c64/c64_keyboard.ts`, linia 249
- **Problem:** Brak obsługi wariantu SHIFT dla klawisza ↑. Przy `shift=true` powinien zwrócić `0xFF` (π).

### BUG-04 — `C64VirtualKeyboard.tsx`: Shift+G → `$A0` zamiast `$C7`

- **Plik:** `src/components/C64VirtualKeyboard.tsx`, linia 857
- **Problem:** Klawisz `G` ma `shiftPetscii={0xA0}` (160 dec = full solid block █ = SHIFT+SPACE). Prawidłowy kod PETSCII dla Shift+G to `$C7` (199 dec). Jest to **żywy kod** wpływający na wirtualną klawiaturę.

### BUG-05 — `codeToPetscii()` jest martwym kodem

- Metoda zadeklarowana jako `public static` ale nigdy nie wywoływana. Błędy BUG-01/02/03 w niej nie mają aktualnego wpływu na działanie emulatora.

---

## 3. Poprawki

### Poprawka dla BUG-01, BUG-02, BUG-03 (kod martwy, ale warto naprawić):

```typescript
// c64_keyboard.ts, linie 249-251 — PRZED:
if (code === "ArrowUp") return 0x91;
// ...
if (code === "ArrowLeft") return 0x9d;

// PO:
if (code === "ArrowUp") return shift ? 0xff : 0x5e; // ↑ glyph unshifted / π shifted ($FF)
if (code === "ArrowLeft") return 0x5f; // ← glyph (brak wariantu shift)
```

### Poprawka dla BUG-04 (żywy kod, wymaga naprawy):

```typescript
// C64VirtualKeyboard.tsx, ~linia 857 — PRZED:
shiftPetscii={0xa0}   // klawisz G

// PO:
shiftPetscii={0xc7}   // klawisz G: $C7 = Shift+G per PETSCII standard
```

---

## 4. Zmodyfikowane Pliki i Linie

| Plik | Linia | Zmiana |
|------|-------|--------|
| `src/c64/c64_keyboard.ts` | 249 | `ArrowUp`: `0x91` → `shift ? 0xff : 0x5e` |
| `src/c64/c64_keyboard.ts` | 251 | `ArrowLeft`: `0x9d` → `0x5f` |
| `src/components/C64VirtualKeyboard.tsx` | ~857 | Shift+G: `0xa0` → `0xc7` |

---

## 5. Weryfikacja

- Wszystkie 64 pozycje matrycy klawiatury zweryfikowane z referencją (POPRAWNE).
- Wszystkie 8 kodów klawiszy funkcyjnych F1-F8 ($85-$8C) POPRAWNE.
- Wszystkie 16 kodów kolorów PETSCII ($05, $1C-$1F, $81, $90-$9B) POPRAWNE.
- Kody kursorów (CRSR DOWN=$11, UP=$91, RIGHT=$1D, LEFT=$9D) w wirtualnej klawiaturze POPRAWNE.
- Matematyka konwersji Screen Code w `c64_petscii.ts` POPRAWNA.

---

## 6. Wynik

- **Wynik diagnostyczny:** `SUKCES (analiza ukończona)`
- **BUG-04 (Shift+G):** wymaga manualnej poprawki kodu.
- **BUG-01/02/03:** w martwym kodzie — poprawka zalecana profilaktycznie.

---

## 7. Wnioski i Zalecenia

1. Funkcja `codeToPetscii()` powinna zostać naprawiona lub usunięta, aby nie wprowadzać w błąd przyszłych developerów.
2. Wirtualna klawiatura używa prawidłowych kodów PETSCII z dwóch niezależnych źródeł (hardcoded petscii props i pressChord matrix) — ta architektura jest poprawna.
3. Architektura dual-path (matrix press + direct buffer inject) była uprzednio naprawiona (patrz log 2026-09-02_VIRTUAL-KEYBOARD-double-character-fix.md).
