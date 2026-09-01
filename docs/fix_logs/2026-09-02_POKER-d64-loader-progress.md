# Fix Log: Poker po Polsku D64 Post-Crack RETURN Loader Advance & Matrix Ghosting Fix

**Data i godzina:** 2026-09-02, 00:32 CEST  
**Zgłoszony problem (symptom):**  
Po uruchomieniu gry `Poker po Polsku.d64` z katalogu Polskich Klasyków C64, po planszy `CRACKED: WALDI TEL...` pojawiała się plansza `NACISNIJ RETURN \n RUN`, lecz naciśnięcie klawisza RETURN (lub kliknięcie na wirtualnej klawiaturze) nie powodowało uruchomienia gry / postępu ładowania. Ponadto tekst na ekranie zmieniał się w małe litery (`nacisnij return`).

---

## 1. Zidentyfikowane przyczyny źródłowe (Root Causes)

1. **Konflikt linii CIA 1 Joystick Fire z matrycą klawiatury w trybie `game_shared`:**
   - W Commodore 64 linie joysticków współdzielą rejestry CIA 1 z matrycą klawiatury (Port A `$DC00` to kolumny klawiatury + Joystick 2, Port B `$DC01` to wiersze klawiatury + Joystick 1).
   - W `C64Screen.tsx` i `C64VirtualKeyboard.tsx` naciśnięcie klawisza `Enter` / `Space` w trybie `game_shared` ściągało do masy linię FIRE joysticka (`system.cia1.joy1 &= ~0x10`, bit 4 = 0).
   - Gdy KERNAL `SCNKEY` ($FF9F) skanował matrycę 8x8 (wystawiając kolejne bity kolumn 0–7 na `$DC00`), na rejestrze wierszy `$DC01` odczytywał zawsze aktywny wiersz 4 (bit 4 = 0) na **każdej** kolumnie.
   - KERNAL interpretował tę jednoczesną wielokrotną kolizję klawiszy jako przełączenie rejestru `$0291` (Commodore + Shift toggle), przełączając zestaw znaków na małe litery i odrzucając kod klawisza `RETURN` ($0D).

2. **Crosstalk i nieczyste sekwencje w `triggerFireAndNext()`:**
   - Metoda `triggerFireAndNext()` wciskała jednocześnie klawisze Space (wiersz 7, kol. 4) oraz Return (wiersz 0, kol. 1) na matrycy oraz ciągnęła obie linie FIRE joysticków do zera w tym samym momencie.
   - Wstrzykiwała również do bufora KERNAL kod Spacji ($20) przed kodem Return ($0D), co modyfikowało polecenie `RUN ` na ekranie zamiast je zatwierdzić.

---

## 2. Wprowadzone zmiany

### 1. `src/components/C64Screen.tsx` (L139–L149)
- Usunięto mapowanie `Enter` i `NumpadEnter` na linie FIRE joysticka CIA 1.
- Klawisze `Enter` i `NumpadEnter` służą wyłącznie do wprowadzania znaków i poleceń KERNAL bez zakłócania linii Portu B.

### 2. `src/c64/c64_system.ts` (L598–L622)
- Zrefaktoryzowano `triggerFireAndNext()`:
  - Wstrzykuje czysty znak `RETURN` ($0D) bezpośrednio do bufora KERNAL `$0277` (`$00C6 = 1`).
  - Wykonuje impuls klawisza `RETURN` na matrycy CIA 1 (`pressChord(0, 1, {}, 120)`).
  - W trybie `game_shared` opóźnia impuls FIRE joysticka o 140 ms, aby całkowicie odseparować skanowanie klawisza od stanu joysticka i wyeliminować ghosting matrycy.

---

## 3. Weryfikacja

1. **Kompilacja TypeScript:**
   - Wykonano `npx tsc --noEmit` — 0 błędów.
2. **Testy w Browser Subagent:**
   - Uruchomiono `Poker po polsku.d64` z poziomu zakładki *PL Polskie Gry C64*.
   - Przewinięto intro do planszy `NACISNIJ RETURN \n RUN`.
   - Naciśnięto przycisk `🕹️ DALEJ (FIRE)`.
   - BASIC odebrał polecenie `RUN`, wyczyścił ekran i uruchomił główny program gry.
   - Gra wyświetliła stół karciany z zieloną ramką PETSCII oraz stanem graczy (ADAM $792, ALA $723, ALEK $1113, ANDRZEJ $977).
   - CPU poprawnie przeszedł do pętli oczekiwania na ruch gracza `$E9DA`.

---

## 4. Wynik
**Status:** `SUKCES` ✅
