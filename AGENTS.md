# Instrukcje i Zasady Projektu Commodore 64 AI Studio Copilot

## 1. Bezwzględny Zakaz Generowania Mocków i Danych Zastępczych dla Gier (No Mock / No Dummy Data)
- **Nigdy nie twórz syntetycznych generatorów kodu, mocków ani atrap gier, które posiadają rzeczywiste, historyczne odpowiedniki na platformie Commodore 64** (np. *Familiada*, *Burmistrz*, *Koło Fortuny*, *Zombi*, *Hans Kloss*, *Robbo*, *Władca*, *Krucjata*, *Miecze Valdgira* itp.).
- **Kod emulatora i warstwy danych musi być w 100% czysty od fikcyjnych implementacji gier.**
- Wszystkie obrazy nośników (D64, T64, TAP, PRG, P00, CRT) ładowane do pamięci RAM/napędów C64 muszą pochodzić z autentycznych plików binarnych.
- Jeśli plik gry lub ROM jest niedostępny (błąd sieciowy, 404, uszkodzony nośnik), system musi zgłosić jawny i czytelny komunikat błędu (np. `404 Not Found`), a **nie syntetyzować ani podstawiać fałszywych programów w BASIC-u/kodzie maszynowym**.
- Jedynym dopuszczalnym kodem przykładowym w środowisku są ogólne, jawne dema technologiczne i szablony w BASIC Studio (np. *10 PRINT*, generator dźwięku SID, pętla rastrowa), które służą do nauki programowania i nie podszywają się pod tytuły komercyjne.

## 2. Standardy Emulacji Architektury C64
- Wszystkie komponenty procesora MOS 6510, układu graficznego VIC-II (MOS 6569 / MOS 6567), układu dźwiękowego SID (MOS 6581 / MOS 8580) oraz układów CIA 1 i CIA 2 muszą ściśle realizować sprzętową specyfikację Commodore 64:
  - Prawidłowe cykle zegarowe (PAL: 63 cykle/linię, 312 linii; NTSC: 65 cykli/linię, 263 linie).
  - Czyszczenie bufora ramki i obsługa ramek bocznych/pionowych w standardach 38/40 kolumn i 24/25 wierszy.
  - Prawidłowe bankowanie pamięci VIC-II przez bity `$DD00` i port procesora `$0001`.
  - Korzystanie ze standardowych wektorów skoków KERNAL (`$FF81` - `$FFF3`).

## 3. Obowiązkowy Grep Bazy Wiedzy Przed Każdą Naprawą Błędu (KB-First Rule)
- **PRZED przystąpieniem do diagnozy lub naprawy KAŻDEGO błędu / issue**, agent MUSI wykonać grep bazy wiedzy w celu wyszukania wcześniej odnotowanych informacji, wzorców i kontekstu dotyczącego danego problemu.
- Ścieżki do przeszukania (w kolejności):
  1. `docs/knowledge_base/` — techniczna dokumentacja sprzętu C64, VICE, formatów plików.
  2. `docs/fix_logs/` — historia wszystkich poprzednich prób naprawy błędów w tym projekcie.
  3. KI artifact: `c:\Users\KB\.gemini\antigravity-ide\knowledge\c64-web-emulator\artifacts\architecture.md` — architektura kodu projektu.
- Grep musi obejmować **co najmniej dwa słowa kluczowe** bezpośrednio związane z naprawianym błędem (np. `clearFrameBuffer`, `vicBank`, `rasterCompare`, `fastBoot`, `startLine`).
- Jeśli grep zwróci trafienie w `docs/fix_logs/`, agent musi przeczytać ten log przed zaproponowaniem rozwiązania — może on dokumentować wcześniejsze próby, które się nie powiodły.
- Pomijanie tego kroku jest **niedopuszczalne**, nawet jeśli agent uważa, że zna rozwiązanie.

## 4. System Logów Napraw Błędów (Fix Log System)
- Po **każdej zakończonej próbie naprawy błędu** (niezależnie od sukcesu lub porażki) agent MUSI utworzyć lub zaktualizować plik logu w `docs/fix_logs/`.
- **Format nazwy pliku:** `YYYY-MM-DD_TEMAT-BUGU.md` (np. `2026-09-01_VERMES-framebuffer-artifact.md`).
- **Obowiązkowa zawartość logu:**
  - Data i godzina próby.
  - Opis zgłoszonego błędu (symptom widoczny przez użytkownika).
  - Zidentyfikowane przyczyny źródłowe (root causes).
  - Lista zmodyfikowanych plików z numerami linii.
  - Wynik próby: `SUKCES` / `CZĘŚCIOWY` / `PORAŻKA`.
  - Wnioski i zalecenia dla kolejnych prób.
- Logi są trwałą historyczną bazą wiedzy. **Nigdy ich nie usuwaj ani nie nadpisuj** — jeśli ten sam błąd wymaga kolejnej próby, dodaj nową sekcję datowaną w tym samym pliku.
- KI metadata (`c:\Users\KB\.gemini\antigravity-ide\knowledge\c64-web-emulator\metadata.json`) powinna być aktualizowana po każdym logu, aby summaries wskazywały na najnowsze fix logi.

