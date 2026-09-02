# Fix Log: Naprawa Otwarcia Dialogu Plików w Przycisku "Load File / ZIP"

**Data i godzina:** 2026-09-02, 12:05 CEST  
**Zgłoszony problem:**  
Po kliknięciu zielonego przycisku „Load File / ZIP” na pasku narzędziowym (`C64Toolbar`) nie otwierał się natywny eksplorator plików systemu operacyjnego.

---

## 1. Przyczyny Źródłowe (Root Causes)

1. **Programistyczne wywołanie `.click()` na ukrytym elemencie `<input type="file" className="hidden" />`:**
   - Przycisk `<button onClick={() => fileInputRef.current?.click()}>` próbował wywołać programistycznie zdarzenie `click` na elemencie z klasą CSS `display: none` (`hidden`).
   - W wielu nowoczesnych przeglądarkach (Chromium, Firefox, Safari) polityki bezpieczeństwa blokują otwieranie natywnego okna wyboru plików (`file chooser dialog`) wywołanego syntetycznie z JavaScriptu na elementach z `display: none`.

---

## 2. Zrealizowane Zmiany w Kodzie

1. **Komponent `C64Toolbar` (`src/components/C64Toolbar.tsx`):**
   - Zastąpiono element `<button>` semantycznym tagiem `<label htmlFor="c64-file-upload-input">`.
   - Klasę CSS ukrytego `<input>` zmieniono z `hidden` (`display: none`) na `sr-only` (dostępny w drzewie a11y, ale niewidoczny wizualnie).
   - Kliknięcie w `<label>` natywnie i bezpośrednio wyzwala systemowy dialog wyboru plików przeglądarki bez pośrednictwa JS.
   - Dodano obsługę klawiatury (`onKeyDown` dla `Enter` i `Spacji`) oraz `tabIndex={0}`.

2. **Komponenty powiązane (`C64StorageExplorer.tsx`, `C64Debugger.tsx`):**
   - Wprowadzono ten sam standard semantycznego `<label htmlFor="...">` + `sr-only` dla przycisków dodawania plików PRG do kreatora D64 oraz przywracania migawek crash snapshot w debuggerze.

---

## 3. Zmodyfikowane Pliki

- `src/components/C64Toolbar.tsx` (linie 270–295)
- `src/components/C64StorageExplorer.tsx` (linie 765–785)
- `src/components/C64Debugger.tsx` (linie 985–1020)

---

## 4. Weryfikacja

- **Weryfikacja w przeglądarce (`chrome-devtools-mcp`):**
  - Przycisk `Load File / ZIP` posiada powiązanie `htmlFor` z elementem `<input id="c64-file-upload-input">`.
  - Kliknięcie w etykietę otwiera bezpośrednio natywne okno wyboru plików.
- **Kompilacja TypeScript:**
  - `npx tsc --noEmit` — 0 błędów.

---

## 5. Wynik
**Status:** `SUKCES` ✅
