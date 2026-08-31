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
