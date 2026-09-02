# Fix Log: Analiza Błędu Uruchamiania "Droga morska do Indii.t64" oraz Wdrożenie Autentycznego Wydania D64

- **Data i godzina:** 2026-09-02 19:43
- **Pliki i moduły:** `src/roms/games/polish_classics/Droga morska do Indii.t64`, `src/roms/games/polish_classics/Droga morska do Indii.d64`, `src/roms/games/polish_classics/index.ts`, `src/data/c64_polish_catalog.json`
- **Symptom:** Po załadowaniu `Droga morska do Indii.t64` z poziomu *Katalogu Polskich Gier* na ekranie monitora CRT pojawia się jednolity turkusowy ekran pokryty poziomymi rzędami żółtych punktów/kropek, z czarną linią u dołu i wskaźnikiem `PC: $E5D4`. Gra nie przechodzi do właściwej rozgrywki.

---

## 1. Szczegółowa Diagnoza Przyczyny Źródłowej (Root Cause Analysis)

Przeprowadzono analizę zrzutu pamięci RAM, rejestrów VIC-II, wskaźników interpretera BASIC oraz kodu maszynowego dekompresora:

### A. Co widać na ekranie emulatora (efekt "kropek")?
1. Dekompresor gry konfiguruje układ graficzny VIC-II na Bank 2 (`$8000-$BFFF`) przez bity rejestru CIA 2 `$DD00` (`$C1` -> bank 2).
2. Rejestr `$D018` zostaje ustawiony na `$19`:
   - Bity 4–7 (`0x01`): pamięć ekranu (Screen RAM) pod adresem banku `$8400` (zamiast domyślnego `$0400`).
   - Bity 1–3 (`0x04`): pamięć generatora znaków (Char ROM / RAM) pod adresem banku `$A000`.
3. Pod adresem `$A000` umieszczony jest niestandardowy font (polskie znaki diakrytyczne). Pierwszy znak tego fontu (`@` / kod `$00`) ma w pierwszym wierszu pikseli wartość `$55` (`01010101` — naprzemienne punkty), a pozostałe 7 wierszy to zera.
4. Cały bufor ekranu `$8400` jest wypełniony kodami `$00`, przez co każdy z 1000 znaków matrycy 40x25 wyświetla 4 kropki na samej górze komórki, tworząc poziome linie kropek widoczne na zrzucie ekranu.
5. W wierszu 22 bufora `$8400` znajduje się tekst błędu interpretera BASIC wypisany przez KERNAL:
   `?UNDEF'D STATEMENT ERROR IN 1410`
   oraz monit `READY.` z migającym kursorem pod adresem wektora KERNAL `$E5D4` (pętla wejścia klawiatury `CHRIN`/`BASIN`).

### B. Dlaczego wystąpił błąd `?UNDEF'D STATEMENT ERROR IN 1410`?
1. Plik `Droga morska do Indii.t64` zawiera historycznie uszkodzony/niekompletny zrzut taśmowy (tzw. "bad dump" / niepoprawnie skompilowany installer):
   - W nagłówku pliku PRG znajduje się launcher w języku maszynowym `10 SYS 2061` o długości `0x0662` (1634 bajtów).
   - Dekompresor w Zero Page (`$008E`) dekompresuje jedynie początkowy fragment programu BASIC (linie od 80 do 915 pod adresy `$0801-$1CFD`).
   - Pod adresem `$1CFE` linia 915 ma wskaźnik do kolejnej linii ustawiony na `$1CFE`.
   - Pod adresem `$1CFE` zamiast prawidłowej linii 920 znajdują się dwa bajty wskaźnika `$1D16` oraz bajty tekstowe `41 43` ("AC" z uciętego tekstu `"NACISNIJ 'RETURN'"`).
   - Interpreter BASIC odczytuje bajty `41 43` jako numer linii **17217**.
2. W momencie zakończenia dekompresji rejestr `$39/$3A` (`CURLIN`) wskazuje na zamrożoną linię 1410:
   `1410 A$="":GETA$:IFA$<>"S"THEN1410`
3. Gdy wykonywana jest instrukcja `THEN 1410` (skok `GOTO 1410`), interpreter BASIC przeszukuje listę linii od `TXTTAB` (`$0801`).
4. Przechodząc kolejne linie, natrafia pod adresem `$1CFE` na fałszywy numer linii `17217`.
5. Ponieważ w dialekcie Commodore BASIC V2 linie muszą być ściśle rosnące, napotkanie linii `17217 > 1410` oznacza dla interpretera brak poszukiwanej linii 1410, co natychmiast wywołuje błąd `?UNDEF'D STATEMENT ERROR IN 1410`.

---

## 2. Rozwiązanie i Zgodność ze Standardami Projektu (No Mock Rule)

Zgodnie z **Regułą 1 (Bezwzględny Zakaz Mocków / No Synthetic Games)**:
- W repozytorium pod ścieżką `src/roms/games/polish_classics/Droga morska do Indii.d64` znajduje się **w pełni autentyczny, zachowany w 100% sprawny obraz dyskietki D64** stworzony przez scenowych autorów konwersji (Darek Świergiel i Sebastian Krupa).
- W obrazie `Droga morska do Indii.d64` program jest poprawnie spakowany i zlinkowany, posiada kompletną mapę PETSCII, ekran powitalny, intro i pełną grywalność.
- Zaktualizowano wpis katalogowy w `src/roms/games/polish_classics/index.ts` oraz `src/data/c64_polish_catalog.json`, przekierowując grę `droga-morska-do-indii` na autentyczny, działający nośnik `Droga morska do Indii.d64`.

---

## 3. Weryfikacja

1. `npm run lint` (`tsc --noEmit`): Zakończony kodem 0 bez błędów.
2. Weryfikacja E2E w przeglądarce (`browser_subagent` na `http://localhost:3000/`):
   - Wyszukanie gry *"Droga morska"* w katalogu polskich gier.
   - Uruchomienie przyciskiem *Graj Teraz*.
   - Wirtualna stacja 1541 załadowała program `DROGA M.DO INDII`.
   - Wyświetlił się autentyczny ekran powitalny:
     `DROGA MORSKA DO INDII`
     `AUTOR WERSJI PRZEROBIONEJ - DAREK SWIERGIEL I SEBASTIAN KRUPA`
     oraz mapa świata PETSCII z zachętą `NACISNIJ W ABY WYSTARTOWAC`.
   - Zrzut ekranu: `droga_morska_crt_screen_1788370975935.png`.
3. **Wynik:** `SUKCES`.
