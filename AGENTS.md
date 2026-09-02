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

## 3. KB-Preflight Protocol — Obowiązkowy Odczyt Bazy Wiedzy (KB-First Rule v2.0)
Przed przystąpieniem do diagnozy lub naprawy **KAŻDEGO błędu / issue**, agent MUSI bezwzględnie wykonać pełną procedurę wstępną (*Preflight Check*) w następującej kolejności:

1. **Krok 0 — Odczyt KI Architecture Artifact:**
   - Przeczytaj plik `c:\Users\KB\.gemini\antigravity-ide\knowledge\c64-web-emulator\artifacts\architecture.md` w celu weryfikacji aktualnego stanu modułów i pipeline'u.
2. **Krok 1 — Sprawdzenie Indeksu Fix Logów:**
   - Przeczytaj `docs/fix_logs/INDEX.md` — zweryfikuj, czy dany błąd lub powiązany komponent był już wcześniej naprawiany. Jeśli znaleziono pasujący log, przeczytaj go w całości.
3. **Krok 2 — Przeszukanie i Odczyt Technical Knowledge Base:**
   - Wykonaj `grep` w katalogu `docs/knowledge_base/` z użyciem **co najmniej dwóch słów kluczowych** bezpośrednio powiązanych z błędem (np. `rasterCompare`, `clearFrameBuffer`, `vicBank`, `ioPortData`, `pressChord`).
   - Jeśli wyszukiwanie zwróci trafienie, **przeczytaj odpowiedni rozdział bazy wiedzy w całości** przed planowaniem zmian.
4. **Krok 3 — Weryfikacja Mapowania Kodu w Rozdziale 16:**
   - Sprawdź `docs/knowledge_base/16_CODEBASE_CROSS_REFERENCE.md`, aby precyzyjnie ustalić relacje rejestrów sprzętowych i adresów pamięci z plikami TypeScript (`src/c64/`) i komponentami React (`src/components/`).
5. **Krok 4 — Konsultacja Źródeł Zewnętrznych (pagetable.com / VICE):**
   - Jeśli problem dotyczy nieudokumentowanego zachowania sprzętu, skonsultuj autorytatywne źródła referencyjne (`https://www.pagetable.com/c64ref/`).
6. **Dopiero po wykonaniu kroków 0–4:** Agent może sformułować diagnozę, przedstawić reasoning użytkownikowi i przystąpić do modyfikacji kodu.

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
- Zaktualizuj `docs/fix_logs/INDEX.md` dodając nowy wpis na samej górze tabeli.
- KI metadata (`c:\Users\KB\.gemini\antigravity-ide\knowledge\c64-web-emulator\metadata.json`) powinna być aktualizowana po każdym logu.

## 5. Aktualizacja i Weryfikacja Bazy Wiedzy (KB-Update & Verification Rule)
- Po każdej nowej sesji analitycznej, weryfikacji sprzętowej ze źródłami zewnętrznymi lub wykryciu braków w dokumentacji, agent MUSI:
  1. Zaktualizować odpowiedni rozdział bazy wiedzy w `docs/knowledge_base/`.
  2. Dodać wpis audytowy do `docs/knowledge_base/VERIFICATION_LOG.md` z datą, zakresem zmian i źródłem referencyjnym.
  3. Zadbać o zachowanie spójności między kodem emulatora a bazą wiedzy.
