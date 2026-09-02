# Fix Log: Dedykowany Przycisk Cartridge (.CRT) i Współistnienie z Ładowaniem Gier

- **Data i godzina:** 2026-09-02 19:12
- **Komponenty:** `src/components/C64Toolbar.tsx`, `src/App.tsx`, `src/c64/c64_system.ts`
- **Symptom / Zadanie:** 
  1. Zamiana przycisku `Load File / ZIP` na `Load Game` z tooltipem informującym o formatach gier.
  2. Dodanie obok dedykowanego przycisku `Insert Cartridge` do podmontowywania obrazów kartridży `.crt`.
  3. Wyświetlanie po najechaniu na przycisk informacji o obsługiwanych formatach i typach kartridży.
  4. Umożliwienie jednoczesnego działania podmontowanego kartridża w porcie rozszerzeń oraz ładowania i uruchamiania gier (D64 / TAP / T64 / PRG).
  5. Dodanie możliwości wysunięcia (Eject) kartridża.

---

## 1. Zidentyfikowane przyczyny i architektura rozwiązania

1. **Wcześniejszy stan UI:**
   - W nagłówku istniał jeden uniwersalny przycisk `Load File / ZIP`, który wczytywał dowolny plik (w tym .CRT), ale nie rozróżniał semantycznie podłączenia sprzętowego kartridża do Expansion Portu od włożenia nośnika gry do stacji dysków lub magnetofonu.
2. **Rozdzielenie przepływów:**
   - Przycisk **`Load Game`**: Akceptuje nośniki gier (`.d64`, `.prg`, `.p00`, `.t64`, `.tap`, `.bas`, `.txt`, `.zip`, `.gz`).
   - Przycisk **`Insert Cartridge`**: Akceptuje obrazy kartridży ROM (`.crt`, `.zip`, `.gz`).
   - Podczas montowania kartridża (`system.loadCartridge`) stan `this.mountedCart` jest trwale zapisywany w `C64System`.
   - Gdy użytkownik następnie ładuje grę (np. dysk D64, taśmę TAP, archiwum T64 lub PRG), metoda `hardReset(false)` w `C64System` sprawdza `if (this.mountedCart) this.memory.attachCartridge(this.mountedCart);`, dzięki czemu kartridż pozostaje w pamięci rozszerzeń (np. szybki loader Action Replay / Final Cartridge III / Simons' BASIC).
3. **Wizualizacja stanu i funkcja Eject:**
   - Gdy kartridż jest włożony, przycisk w toolbarze przekształca się w plakietkę informacyjną `[CRT: Nazwa]` z aktywnym pulsującym układem scalonym oraz dedykowanym czerwonym przyciskiem `Eject` (wywołującym `system.ejectCartridge()`).

---

## 2. Lista zmodyfikowanych plików

1. **`src/c64/c64_system.ts`:**
   - Dodano metodę `public ejectCartridge(): boolean` czyszczącą `mountedCart`, odłączającą pamięć przez `memory.detachCartridge()` i wykonującą czysty reset systemu.
2. **`src/components/C64Toolbar.tsx`:**
   - Zaimportowano ikonę `Unplug` z `lucide-react`.
   - Dodano do interfejsu `C64ToolbarProps` właściwości: `onMountCartridge` oraz `onEjectCartridge`.
   - Przekształcono przycisk `Load File / ZIP` w `Load Game` (`id="btn-upload-file"`).
   - Dodano przycisk `Insert Cartridge` (`id="btn-upload-cartridge"`) oraz stan aktywny z przyciskiem `Eject` (`id="btn-eject-cartridge"`).
3. **`src/App.tsx`:**
   - Zaimplementowano procedurę `handleMountCartridge`, wyszukującą plik `.crt` w paczkach ZIP lub bezpośrednich plikach.
   - Zaimplementowano procedurę `handleEjectCartridge` wywołującą `system.ejectCartridge()`.
   - Przekazano handlery do komponentu `C64Toolbar`.

---

## 3. Weryfikacja

- `npm run lint` (`tsc --noEmit`) zakończony kodem 0 bez błędów.
- Test subagentem przeglądarkowym:
  - Weryfikacja wizualna obecności przycisków `Load Game` i `Insert Cartridge` (`toolbar_buttons_verified_1788368964455.png`).
  - Wgranie kartridża `EPYX Fastload.crt` — poprawne wyświetlenie plakietki `EPYX Fastload` i przycisku `Eject` (`cartridge_mounted_1788369032013.png`).
  - Wgranie gry taśmowej `Roundabout.tap` przy aktywnym kartridżu — gra uruchomiła się w magnetofonie Datasette (`Side 1: 998`), a kartridż `EPYX Fastload` pozostał w porcie rozszerzeń (`cartridge_and_game_running_1788369042244.png`).
- Wynik: `SUKCES`.
