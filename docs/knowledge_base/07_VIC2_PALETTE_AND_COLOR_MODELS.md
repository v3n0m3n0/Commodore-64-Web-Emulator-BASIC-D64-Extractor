# 07. VIC-II Color Palette, Colorimetry & Dithering Reference

> **Autorytatywne źródło:** https://www.pagetable.com/c64ref/colors/ (rev 7cae8b9, 2026-04-06)  
> **Powiązane źródła:** Philip 'Pepto' Timmermann (*Calculating the color palette of the VIC II*), Colodore (*Colodore Calibration Standard*), VICE Emulator Video Reference.  
> **Relewancja dla projektu:** `src/c64/c64_vic2.ts` (renderowanie bufora ramki, tablica kolorów RGBA), `src/components/C64Screen.tsx` (wyświetlanie na kanwie HTML5), `src/components/PetsciiIcon.tsx`.

---

## 1. Modele Kolorów VIC-II — Pepto vs Colodore

Układ graficzny MOS VIC-II (MOS 6569 PAL / MOS 6567 NTSC) nie generuje sygnału cyfrowego RGB, lecz analogowy sygnał wizyjny Y/C (Luminancja / Chrominancja). Wartości RGB w emulatorach są wynikiem matematycznego dekodowania sygnału wideo na przestrzeń sRGB / Rec.709.

### A. Paleta Pepto (Historyczny Standard)
Opracowana przez Philipa „Pepto” Timmermanna na podstawie laboratoryjnych pomiarów sygnału oscyloskopowego i analizy nieliniowości luminancji. Była standardową paletą emulatora VICE przed serią 3.x.

### B. Paleta Colodore (Nowoczesny Standard Kalibracji)
Opracowana z użyciem nowoczesnego sprzętu pomiarowego, uwzględnia precyzyjne kąty fazy koloru chroma oraz krzywe gamma monitorów CRT (Commodore 1702/1084S).

---

## 2. Tabela 16 Kolorów Podstawowych VIC-II

| Indeks (Dec/Hex) | Nazwa koloru | Pepto HEX | Pepto RGB | Colodore HEX | Colodore RGB | Luma NEW (9 poz.) | Luma OLD (5 poz.) |
|---|---|---|---|---|---|---|---|
| **0 ($0)** | Black (Czarny) | `#000000` | `rgb(0, 0, 0)` | `#000000` | `rgb(0, 0, 0)` | 0% | 0% |
| **1 ($1)** | White (Biały) | `#FFFFFF` | `rgb(255, 255, 255)` | `#FFFFFF` | `rgb(255, 255, 255)` | 100% | 100% |
| **2 ($2)** | Red (Czerwony) | `#880000` | `rgb(136, 0, 0)` | `#813338` | `rgb(129, 51, 56)` | 24% | 25% |
| **3 ($3)** | Cyan (Cyjan) | `#AAFFEE` | `rgb(170, 255, 238)` | `#75CEC8` | `rgb(117, 206, 200)` | 84% | 75% |
| **4 ($4)** | Purple / Violet (Fioletowy) | `#CC44CC` | `rgb(204, 68, 204)` | `#8E3C97` | `rgb(142, 60, 151)` | 42% | 50% |
| **5 ($5)** | Green (Zielony) | `#00CC55` | `rgb(0, 204, 85)` | `#56AC4D` | `rgb(86, 172, 77)` | 58% | 50% |
| **6 ($6)** | Blue (Niebieski) | `#0000AA` | `rgb(0, 0, 170)` | `#2E2C9B` | `rgb(46, 44, 155)` | 18% | 25% |
| **7 ($7)** | Yellow (Żółty) | `#EEEE77` | `rgb(238, 238, 119)` | `#EDF171` | `rgb(237, 241, 113)` | 86% | 75% |
| **8 ($8)** | Orange (Pomarańczowy) | `#DD8855` | `rgb(221, 136, 85)` | `#8E5029` | `rgb(142, 80, 41)` | 52% | 50% |
| **9 ($9)** | Brown (Brązowy) | `#664400` | `rgb(102, 68, 0)` | `#553800` | `rgb(85, 56, 0)` | 28% | 25% |
| **10 ($A)** | Light Red / Pink (Jasnoczerwony) | `#FF7777` | `rgb(255, 119, 119)` | `#C46C71` | `rgb(196, 108, 113)` | 56% | 50% |
| **11 ($B)** | Dark Grey (Ciemnoszary / Grey 1) | `#333333` | `rgb(51, 51, 51)` | `#4A4A4A` | `rgb(74, 74, 74)` | 20% | 25% |
| **12 ($C)** | Medium Grey (Szary / Grey 2) | `#777777` | `rgb(119, 119, 119)` | `#7B7B7B` | `rgb(123, 123, 123)` | 48% | 50% |
| **13 ($D)** | Light Green (Jasnozielony) | `#AAFF66` | `rgb(170, 255, 102)` | `#A9FF9F` | `rgb(169, 255, 159)` | 80% | 75% |
| **14 ($E)** | Light Blue (Jasnoniebieski) | `#0088FF` | `rgb(0, 136, 255)` | `#706DEB` | `rgb(112, 109, 235)` | 44% | 50% |
| **15 ($F)** | Light Grey (Jasnoszary / Grey 3) | `#BBBBBB` | `rgb(187, 187, 187)` | `#B2B2B2` | `rgb(178, 178, 178)` | 74% | 75% |

---

## 3. Poziomy Luminancji a Rewizje Układu VIC-II

> **Kluczowa wiedza sprzętowa:** Różne rewizje fizycznego chipu VIC-II posiadają różną liczbę dyskretnych poziomów napięcia luminancji.

1. **OLD VIC-II (MOS 6569R1 — bardzo rzadki):**
   - Posiada tylko **5 dyskretnych poziomów luminancji** (0%, 25%, 50%, 75%, 100%).
   - Kolory o zbliżonej jasności w nowszych wersjach (np. Grey 1 vs Czerwony vs Niebieski) na układzie 6569R1 mają identyczną luminancję (25%).
2. **NEW VIC-II (MOS 6569R3, 6569R5, 8565 PAL oraz MOS 6567R8, 8562 NTSC — standard powszechny):**
   - Posiada **9 unikalnych poziomów luminancji** (0%, 18%, 20%, 24%, 28%, 42-44-48-52-56-58%, 74-80-84-86%, 100%).
   - Zapewnia znacznie bogatszą dynamikę tonalną i kontrast.

---

## 4. Dithering PAL i Fizyczne Mieszanie Kolorów (Color Blending)

Na telewizorach standardu PAL linia opóźniająca (*ultrasonic delay line*) uśrednia sygnał chrominancji sąsiadujących linii rastra w celu eliminacji błędów fazowych różnicowych. W efekcie naprzemienne linie o różnych barwach tworzą **fizyczne zlanie barw w jeden nowy kolor optyczny**.

### Presety Palet Mieszanych:
- **16c (Plain):** Podstawowa paleta 16 kolorów bez ditheringu.
- **23c (50% Mix, Luma Diff = 0):** Mieszanie par kolorów o identycznej lub niemal identycznej luminancji. Daje 23 efektywne kolory o idealnie gładkim przejściu bez widocznych prążków.
- **39c (50% Mix, Max Luma Diff = 30):** Rozszerzenie o pary z umiarkowaną różnicą jasności.
- **55c (50% Mix, Max Luma Diff = 40):** Zaawansowany miks 55 barw używany w demoscenie.
- **133c / 136c (Joe's technique):** Miks 25%/50%/75% z ditheringiem poziomym i pionowym.

### Wzorce Mieszania (*Mixing Patterns*) i Artefakty Sprzętowe:
- **Alternating Lines (Poziome linie naprzemienne):** Najbardziej naturalne dla PAL, fizycznie uśredniane przez tor wideo.
- **Alternating Columns / Checkered (Szachownica pionowa):** Na prawdziwym CRT generuje niepożądane prążki pionowe niskiej częstotliwości (tzw. *efekt GEOS*).

---

## 5. Relewancja dla Kodu Emulatora

1. **`src/c64/c64_vic2.ts`:**
   - Tablica `PALETTE` przechowuje 32-bitowe wartości pikseli w formacie `0xAABBGGRR` (lub `Uint32Array` RGBA).
   - Wartości powinny odpowiadać skalibrowanej palecie Pepto/Colodore 9-poziomowej dla zachowania zgodności ze standardem dominującym.
2. **Rejestry kolorów VIC-II:**
   - `$D020` — Border Color (tylko dolne 4 bity: `color & 0x0F`).
   - `$D021` — Background Color 0 (`color & 0x0F`).
   - `$D022-$D024` — Extra Background Colors 1–3 (Multi-Color Mode).
   - `$D027-$D02E` — Sprite 0–7 Individual Colors.
3. **Pamięć kolorów (*Color RAM* `$D800-$DBFF`):**
   - 1024 bajty (4 bity na komórkę, górne 4 bity niepodłączone — przy odczycie zwracają losowe szumy szyny danych / `$F0`).
