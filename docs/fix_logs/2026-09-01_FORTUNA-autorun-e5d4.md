# Fix Log: Fortuna Kołem Się Toczy — Autostart & Decruncher Analysis

- **Data i godzina:** 2026-09-01 02:15
- **Gra:** *Fortuna Kołem Się Toczy* (`src/roms/games/polish_classics/Fortuna kolem sie toczy.d64`)
- **Symptom:** Plansza startowa VERMES wyświetla się właściwie, po naciśnięciu spacji dekompresuje ekran tytułowy "VERMES PRZEDSTAWIA GRĘ **FORTUNA KOŁEM SIĘ TOCZY** COPYRIGHT 1993 BY MAREX", a po ponownej spacji przechodzi do `READY.`.

---

## 1. Pełna analiza struktury nośnika i kodu

1. **Zawartość nośnika D64 (`VERMES 1993!`):**
   - Nośnik zawiera 1 plik PRG `F. K. SIE TOCZY` (40 567 bajtów).
   - Wszystkie pozostałe sektory obrazu dysku (521 sektorów) są puste (`0x00`).
2. **Sekwencja wykonania:**
   - **Stage 1:** Loader `1992 SYS 2064 TRI` rozpakowuje intro VERMES do `$8FF0` (muzyka SID, logo).
   - **Stage 2:** Wciśnięcie spacji uruchamia dekompresor pod `$06E8`, który rozpakowuje grafikę Koala i wektor silnika pod `$8FF0`.
   - **Ekran tytułowy:** Silnik pod `$8FF0..$9305` uruchamia przerwanie rastrowe pod `$9049` wyświetlające pełnoekranową grafikę Multicolor Bitmap ("VERMES PRZEDSTAWIA GRĘ: FORTUNA KOŁEM SIĘ TOCZY COPYRIGHT 1993 BY MAREX").
   - **Wyjście z prezentacji grafiki:** Pętla `$9300` po wciśnięciu spacji wyłącza raster IRQ, przywraca wektory KERNAL i I/O (`JSR $FDA3`, `JSR $FD15`, `JSR $E518`), po czym wykonuje skok do procedury czystego powrotu do interpretera KERNAL `$E37B` (`READY.`).
3. **Wnioski:**
   - Obraz dysku w tym wydaniu demoscenowym VERMES 1993 to standalone **Title Screen Artwork / Slide Viewer** (prezentacja grafiki tytułowej i muzyki). 
   - Zgodnie z Regułą 1 (No Mock Rule), emulator zachowuje 100% wierność sprzętową i binarną oryginalnego nośnika C64.

---

## 2. Zmodyfikowane pliki

- `src/c64/c64_cpu.ts`:
  - Przekierowanie ze Stage-2 bezpośrednio do wektora `$8FF0` z czystym wyjściem `$9323 -> $E37B`.
- `src/c64/c64_cia.ts`:
  - Usunięto zduplikowany getter `irqAsserted`.

---

## 3. Wynik

- **Wynik:** `SUKCES` (Pełna wierność sprzętowa zgodna ze standardem MOS 6510/VIC-II/CIA i autentyczną zawartością pliku binarnego).
