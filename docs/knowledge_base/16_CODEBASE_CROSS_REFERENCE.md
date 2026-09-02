# 16. Cross-Reference: Knowledge Base ↔ Kod Źródłowy Projektu

> **Cel:** Precyzyjna mapa łącząca pojęcia sprzętowe, rejestry, formaty plików i wektory z konkretnymi plikami TypeScript i komponentami React w projekcie Commodore 64 Web Emulator.  
> **Aktualizacja:** Po każdej zmianie architektury rdzenia emulatora lub dodaniu nowych modułów.

---

## 1. Mapa Komponentów Sprzętowych C64 → Moduły TypeScript

| Układ / Podsystem C64 | Rozdział KB | Główny plik TypeScript | Klasa / Obiekt | Rola w projekcie |
|---|---|---|---|---|
| **MOS 6510 CPU** | [01_CPU](01_MOS_6510_CPU_AND_OPCODES.md) | `src/c64/c64_cpu.ts` | `C64CPU` | Emulacja procesora, pełny zestaw instrukcji (oficjalne + nieudokumentowane), cykle, BCD |
| **Pamięć 64 KB & PLA** | [02_MEMORY](02_C64_MEMORY_MAP_AND_ZERO_PAGE.md) | `src/c64/c64_memory.ts` | `C64Memory` | 64 KB RAM, bankowanie PLA przez `$0001`, nakładanie ROM-ów i rejestrów I/O |
| **VIC-II (Wideo)** | [04_HW_IO](04_HARDWARE_IO_MAP_VIC_SID_CIA.md), [07_COLORS](07_VIC2_PALETTE_AND_COLOR_MODELS.md) | `src/c64/c64_vic2.ts` | `C64VIC2` | Renderowanie linii skanowania, Bad Lines, DMA sprajtów, przerwania rastrowe, PAL/NTSC |
| **SID (Dźwięk)** | [11_SID](11_VICE_SID_RESID_AUDIO_ENGINE.md) | `src/c64/c64_sid.ts` | `C64SID` | 3 głosy, synteza fal (trójkąt, piła, impuls, szum), filtry analogowe, Web Audio API |
| **CIA 1 (Klawiatura/Joy2/Timer)**| [04_HW_IO](04_HARDWARE_IO_MAP_VIC_SID_CIA.md) | `src/c64/c64_cia.ts` | `C64CIA` | Timery A/B, matryca klawiatury `$DC00/$DC01`, Port Joysticka 2, IRQ 50/60 Hz |
| **CIA 2 (VIC Bank/IEC/NMI)** | [04_HW_IO](04_HARDWARE_IO_MAP_VIC_SID_CIA.md) | `src/c64/c64_cia.ts` | `C64CIA` | Wybór banku VIC-II przez `$DD00`, sygnały NMI, szyna szeregowa IEC |
| **Klawiatura & PETSCII** | [06_PETSCII](06_PETSCII_CHARSET_AND_KEYBOARD_MATRIX.md) | `src/c64/c64_keyboard.ts` | `C64Keyboard` | Matryca 8x8, skanowanie `pressChord()`, obsługa polskich znaków diakrytycznych |
| **Obrazy Dyskietek (D64)** | [10_FORMATS](10_VICE_FILE_FORMATS_AND_CONTAINERS.md) | `src/c64/c64_d64.ts` | `C64D64` | Parser obrazów dyskietek 35/40 ścieżek, sektor BAM, katalog, ekstrakcja plików |
| **Archiwa Taśmowe (T64)** | [10_FORMATS](10_VICE_FILE_FORMATS_AND_CONTAINERS.md) | `src/c64/c64_t64.ts` | `C64T64` | Parser archiwów taśmowych Commodore, ekstrakcja programów PRG |
| **Surowy Sygnał Taśmy (TAP)** | [10_FORMATS](10_VICE_FILE_FORMATS_AND_CONTAINERS.md) | `src/c64/c64_tap.ts`, `c64_datasette.ts`, `src/components/C64DatasetteStudio.tsx` | `C64TAP`, `C64Datasette`, `C64DatasetteStudio` | Emulacja magnetofonu C2N Datasette, karuzela kaset (multi-side), impulsy, oscyloskop |
| **Kartridże (CRT)** | [10_FORMATS](10_VICE_FILE_FORMATS_AND_CONTAINERS.md) | `src/c64/c64_crt.ts` | `C64CRT` | Pakiety CHIP, tryby Ultimax / CBM80, autostart z pamięci ROM kartridża |
| **Pliki Binarne (PRG/P00)** | [10_FORMATS](10_VICE_FILE_FORMATS_AND_CONTAINERS.md) | `src/c64/c64_prg.ts` | `C64PRG` | 2-bajtowy nagłówek adresu ładowania, bezpośrednia iniekcja do pamięci RAM |
| **Detokenizer BASIC V2** | [05_BASIC](05_BASIC_V2_INTERNALS_AND_TOKENS.md) | `src/c64/c64_basic_detokenizer.ts` | `C64Basic` | Konwersja tokenów binarnych BASIC `$80-$FF` na czytelny tekst źródłowy |
| **Asembler / Disasmebler 6502** | [01_CPU](01_MOS_6510_CPU_AND_OPCODES.md), [15_ROM_DISASM](15_ROM_DISASSEMBLY_AND_ENTRY_POINTS.md) | `src/c64/c64_assembler.ts`, `c64_disassembler.ts` | `C64Assembler`, `C64Disassembler` | 2-przebiegowy asembler i disasmebler wzbogacony o tablicę symboli C64 |
| **Główny Koordynator Systemu** | Wszystkie | `src/c64/c64_system.ts` | `C64System` | Master loop (`stepFrame()`, `stepScanline()`), boot, zarządzanie nośnikami |

---

## 2. Mapa Rejestrów Sprzętowych i Pamięci → Kod Źródłowy

| Adres Rejestru | Nazwa Sprzętowa | Funkcja Sprzętowa | Implementacja w Kodzie TS |
|---|---|---|---|
| `$0000` | `D6510` | Kierunek portu I/O 6510 | `c64_memory.ts` → `ioPortDdr` |
| `$0001` | `R6510` | Port I/O 6510 (Bankowanie PLA) | `c64_memory.ts` → `ioPortData`, `updateMemoryBanking()` |
| `$00C6` | `NDX` | Licznik bufora klawiatury | `c64_system.ts` → `pushKey()`, `typeText()` |
| `$0277-$0280` | `KEYBUF` | Bufor klawiatury KERNAL (10 bajtów) | `c64_system.ts` → `KEYBUF_ADDR` (iniekcja znaków) |
| `$0314-$0315` | `CINV` | Wektor przerwania IRQ | `c64_cpu.ts` → obsługa przerwań, disasemblacja |
| `$0318-$0319` | `NMINV` | Wektor przerwania NMI | `c64_cpu.ts` → `triggerNMI()`, klawisz RESTORE |
| `$0801` | `TXTTAB` | Początek programu BASIC | `c64_basic_detokenizer.ts`, `c64_system.ts` |
| `$A480` | `READY` | Punkt gotowości BASIC | `c64_system.ts` → `fastBoot()` (warunek stopu) |
| `$D000-$D00F` | `SP0X..SP7Y` | Współrzędne sprajtów 0-7 | `c64_vic2.ts` → `spriteX`, `spriteY` |
| `$D011` | `SCROLY` | Rejestr kontrolny 1 (Ekran ON, BMM, Y-Scroll) | `c64_vic2.ts` → `ctrl1`, `rasterLine` bit 8 |
| `$D012` | `RASTER` | Linia rastra (bity 0-7) / Porównanie IRQ | `c64_vic2.ts` → `rasterLine`, `rasterCompare` |
| `$D016` | `SCROLX` | Rejestr kontrolny 2 (MCM, 38/40 kolumn, X-Scroll) | `c64_vic2.ts` → `ctrl2` |
| `$D018` | `VMCSB` | Wskaźniki pamięci ekranu i generatora znaków | `c64_vic2.ts` → `screenAddr`, `charsetAddr` |
| `$D019` | `VICIRQ` | Flagi przerwań VIC-II (Raster, Sprajty) | `c64_vic2.ts` → `irqStatus`, `checkIrq()` |
| `$D01A` | `IRQMASK` | Maska zezwoleń na przerwania VIC-II | `c64_vic2.ts` → `irqMask` |
| `$D020` | `EXTCOL` | Kolor ramki ekranu | `c64_vic2.ts` → `borderColor` |
| `$D021` | `BGCOL0` | Kolor tła 0 | `c64_vic2.ts` → `bgColor[0]` |
| `$D400-$D41C` | `SID_REGS` | Rejestry syntezatora SID | `c64_sid.ts` → `writeRegister()`, `readRegister()` |
| `$D800-$DBFF` | `COLOR_RAM` | Pamięć kolorów (1024 bajty) | `c64_memory.ts` → `colorRam`, `c64_vic2.ts` |
| `$DC00` | `CIAPRA` | CIA 1 Port A (Kolumny klawiatury / Joy 2) | `c64_cia.ts` → `pra`, `c64_keyboard.ts` |
| `$DC01` | `CIAPRB` | CIA 1 Port B (Wiersze klawiatury / Joy 1) | `c64_cia.ts` → `prb`, `c64_keyboard.ts` |
| `$DC04-$DC07` | `TIMER_A/B` | Timery A i B układu CIA 1 | `c64_cia.ts` → `timerA`, `timerB` |
| `$DC0D` | `CIA1_ICR` | Rejestr kontroli przerwań CIA 1 | `c64_cia.ts` → `icr`, generowanie IRQ |
| `$DD00` | `CIA2_PRA` | Wybór banku pamięci VIC-II (bity 0-1) | `c64_cia.ts` → `pra`, `c64_vic2.ts` → `vicBank` |
| `$DD0D` | `CIA2_ICR` | Rejestr kontroli przerwań CIA 2 (NMI) | `c64_cia.ts` → `icr`, generowanie NMI |

---

## 3. Mapa Interfejsu Użytkownika React → Rdzeń Emulacji

| Komponent UI | Ścieżka pliku | Powiązanie z `C64System` |
|---|---|---|
| `C64Screen` | `src/components/C64Screen.tsx` | Renderowanie klatek kanwasu `system.vic.frameBuffer`, przechwytywanie klawiatury fizycznej i myszy |
| `C64VirtualKeyboard` | `src/components/C64VirtualKeyboard.tsx` | Klawisze wirtualne → `system.keyboard.pressChord()`, klawisz RESTORE → `system.triggerRestore()` |
| `C64Debugger` | `src/components/C64Debugger.tsx` | Inspekcja rejestrów `system.cpu`, pamięci `system.memory`, disassembly `C64Disassembler`, breakpointy |
| `C64BasicStudio` | `src/components/C64BasicStudio.tsx` | Edytor BASIC V2, tokenizacja, ładowanie kodu do RAM przez `system.loadAndRunPRG()` |
| `C64SidStudio` | `src/components/C64SidStudio.tsx` | Sterowanie rejestrami syntezatora `system.sid`, wizualizator fal audio |
| `C64StorageExplorer` | `src/components/C64StorageExplorer.tsx` | Podgląd i montowanie dyskietek D64, taśm T64, plików PRG i kartridży CRT |
| `C64PolishGamesCatalog`| `src/components/C64PolishGamesCatalog.tsx` | Autentyczny katalog gier polskich, pobieranie i montowanie nośników D64/PRG/CRT |
| `C64MemoryWatcher` | `src/components/C64MemoryWatcher.tsx` | Podgląd szesnastkowy pamięci RAM/ROM w czasie rzeczywistym |
| `C64TimingAnalyzer` | `src/components/C64TimingAnalyzer.tsx` | Wizualizacja taktowania rastra PAL (63 cykli/312 linii) vs NTSC (65 cykli/263 linii) |
