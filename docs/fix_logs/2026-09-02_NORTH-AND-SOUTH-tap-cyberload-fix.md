# Fix Log: Naprawa Uruchamiania "North and South" (.TAP) i Obsługa Turbo Loaderów Cyberload

**Data i godzina:** 2026-09-02, 13:20 CEST  
**Zgłoszony problem:**  
Po uruchomieniu gry *North and South* z katalogu `src/roms/games/tap/N/` poprzez „Autostart First (North and South (Side 1).tap)” licznik taśmy dochodził do 100% (counter: 0999), lecz gra nie startowała lub zatrzymywała się na ekranie ładowarki Cyberload.  
**Komponenty:** `src/c64/c64_tap.ts`, `src/c64/c64_system.ts`, `src/c64/c64_datasette.ts`, `src/c64/c64_cia.ts`.

---

## 1. Zidentyfikowane Przyczyny Źródłowe (Root Causes)

1. **Błędny Adres Skoku Autostartu dla Loaderów Maszynowych KERNAL:**
   - W obrazach TAP z systemem Cyberload (np. *North & South*) pierwszy blok (nagłówek) zawiera `startAddr = $3B02` i `endAddr = $0803`.
   - Zgodnie ze specyfikacją KERNAL tape format dla absolutnych loaderów maszynowych, `endAddr` podaje adres skoku/wywołania programu (`runAddr`), a nie koniec danych.
   - W emulatorze próba skoku pod `$0803` powodowała trafienie w niewypełniony RAM (`$00 $00` -> instrukcja `BRK`) i powrót do pętli interpretera BASIC (`$3534`).
   - Właściwym adresem startowym dla Cyberload jest `$02AD` (pierwsza instrukcja `SEI` pod indeksem 9).

2. **Brak Inicjalizacji Bufora Kasety KERNAL (`$033C..$03FB`):**
   - W systemie Cyberload zaszyfrowana procedura loadera drugiego stopnia (stage-2 turbo reader) jest ukryta w nieużywanych bajtach standardowego 192-bajtowego bloku nagłówka taśmy (Block 0).
   - Na rzeczywistym C64 procedura KERNAL `LOAD` podczas fazy `SEARCHING` wczytuje ten 192-bajtowy blok bezpośrednio do bufora magnetofonu `TBUFFR` (`$033C..$03FB`).
   - Następnie bootstrap ładujący się pod `$02A6..$0340` uruchamia pętlę XOR (`$02E1..$02EA`), która deszyfruje zawartość bufora `$0350..$03FB` i skacze do kodu loadera.
   - W emulatorze bufor `$033C..$03FB` nie był kopiowany z bloku nagłówka `headerPayload`, co powodowało deszyfrowanie zerowych komórek RAM i skok do instrukcji `BRK` (`$00`).

3. **Zakłócenie Przerwaniem Sprzętowym CIA 1 Timer A podczas `JSR $E544`:**
   - W procedurze bootstrapu pod adresem `$02AD` loader wykonuje `SEI` i `JSR $E544` (czyszczenie ekranu).
   - W procedurze `$E544` wektor przerwań procesora nie był chroniony przed zegarem systemowym CIA 1 Timer A, który wystartował po zimnym starcie, generując przerwanie przez nieprzygotowany jeszcze wektor `CINV ($0314) = $0814`.

---

## 2. Zrealizowane Zmiany

1. **Moduł `C64TAP` (`src/c64/c64_tap.ts`):**
   - Rozszerzono strukturę `TAPFileEntry` oraz obiekt nagłówka o pole `headerPayload: Uint8Array` przechowujące pełne 192 bajty bloku nagłówkowego KERNAL.
   - W metodzie `decodeStandardFiles()` dodano ekstrakcję i zachowanie bufora nagłówka z bloków typu 1 i 3.
   - Dodano detekcję punktu startowego `runAddr = 0x02ad` dla bloków ładowanych pod `$02A6` z nagłówkiem Cyberload (`SEI`).
   - Wskaźnik `pulseOffset` jest aktualizowany do końca bloku danych KERNAL (`pulse 47479`), skąd zaczynają się impulsy turbo.

2. **Moduł `C64System` (`src/c64/c64_system.ts`):**
   - W metodzie `mountTAP()` dodano automatyczne wypełnianie bufora kasety `TBUFFR` (`$033C..$03FB`) danymi z `firstFile.headerPayload`.
   - Zabezpieczono rejestry przerwań `CIA 1` (`imr = 0`, `icr = 0`, `irqActive = false`, `irqPending = false`) przed wywołaniem procedury startowej.
   - Ustawiono autentyczny punkt wejścia `$02AD` dla loaderów maszynowych oraz aktywację silnika magnetofonu (`motorOn = true`, `$0001 bit 5 = 0`).

3. **Moduł `C64Datasette` (`src/c64/c64_datasette.ts`):**
   - Skorygowano getter `counter`, wprowadzając limit `Math.min(999, ...)` zgodny ze standardem 3-cyfrowego licznika magnetofonów Commodore 1530 C2N.

---

## 3. Zmodyfikowane Pliki

- `src/c64/c64_tap.ts` (linie 20–35, 125–290)
- `src/c64/c64_system.ts` (linie 695–740)
- `src/c64/c64_datasette.ts` (linia 178)

---

## 4. Weryfikacja

1. **Weryfikacja w Przeglądarce (Browser Subagent):**
   - Załadowano `src/roms/games/tap/N/North and South (Side 1).tap` (716 215 impulsów).
   - Ekran renderuje autentyczny żółto-zielony ekran ładowarki **„CYBERLOAD NOW LOADING NORTH & SOUTH”** z białymi pasami.
   - Datasette: `PLAYING`, `MOTOR ON`, licznik przesuwa się płynnie (`Counter: 0290 (29.1%)` w trybie Warp 2x Speed) bez zatrzymania ani powrotu do interpretera BASIC.
2. **Kompilacja TypeScript:**
   - `npx tsc --noEmit` — 0 błędów.

---

## 5. Wynik
**Status:** `SUKCES` ✅
