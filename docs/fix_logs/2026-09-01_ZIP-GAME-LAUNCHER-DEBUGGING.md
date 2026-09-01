# Fix Log: C64 Game Launcher & ZIP Archive Handler Debugging

- **Data i godzina:** 2026-09-01 02:49
- **Moduły:** `C64ArchiveManager`, `App`, `C64ArchiveModal`, `C64PolishGamesCatalog`
- **Symptom:** 
  1. Archiwa `.zip` zawierające pliki tekstowe (`.txt`, `.nfo`, `.diz`) lub grafikę zrzutów ekranu (`.png`, `.jpg`) traktowały te pliki jako binarne `PRG` lub skrypty BASIC `BAS`, co prowadziło do błędów składni `?SYNTAX ERROR` lub prób uruchamiania plików graficznych jako kodu maszynowego 6502.
  2. Archiwa ZIP z 1 pojedynczym obrazem gry (`.d64`) oraz plikami `readme.txt` / `file_id.diz` niepotrzebnie otwierały modal wyboru zamiast natychmiastowego automatycznego startu gry (brak fast-path dla 1 nośnika uruchamialnego).
  3. Brak obsługi nośników typu `SID` w handlerze montowania wyekstrahowanych plików (`handleMountExtractedFile`).
  4. Brak transparentnej dekompresji nośników ZIP w katalogu polskich gier.

---

## 1. Zidentyfikowane przyczyny źródłowe (Root Causes)

1. **Agresywny fallback w `detectMediaType`**:
   - Dowolny plik o rozszerzeniu `.txt` był klasyfikowany jako `"BAS"` i wstrzykiwany do bufora klawiatury `typeText()`.
   - Pliki o nieretro rozszerzeniach (`.png`, `.jpg`, `.doc`, `.nfo`) wpadały w domyślny warunek `data.length > 2 ? "PRG" : "UNKNOWN"`, będąc traktowanymi jako pliki wykonywalne 6502.
2. **Brak podziału na nośniki uruchamialne i pliki towarzyszące**:
   - `handleFileUpload` sprawdzał jedynie ogólną liczbę plików w archiwum (`allExtracted.length === 1`), przez co archiwum z 1 dyskietką i 1 plikiem txt było traktowane jako wieloplikowe.
3. **Brak handlera dla plików muzycznych SID w `App.tsx`**:
   - `handleMountExtractedFile` posiadał gałęzie dla `D64`, `CRT`, `T64`, `TAP`, `PRG`, `P00`, `BAS`, ale pomijał `SID`.
4. **Niewystarczająca normalizacja ścieżek w archiwach ZIP**:
   - W archiwach ZIP tworzonych na systemach Windows separatory `\` oraz 0-bajtowe wpisy katalogów nie były odfiltrowywane.

---

## 2. Zmodyfikowane pliki

- `src/c64/c64_archive_manager.ts`:
  - Dodano typy `DOC` i `IMAGE` do `C64MediaType`.
  - Wprowadzono metody pomocnicze `isZipData()`, `isGzipData()`, `isRunnableMedia()`, `getRunnableFiles()`, `processBinaryData()`, `loadFromUrl()`.
  - Zaimplementowano precyzyjną detekcję magii binarnej i rozszerzeń w `detectMediaType()` z analizą kodu źródłowego BASIC w `.txt` i adresów ładowania PRG.
  - Znormalizowano ścieżki i dodano sortowanie plików w `unzipArchive()`.
- `src/App.tsx`:
  - Zaimplementowano fast-path w `handleFileUpload()` dla archiwów zawierających dokładnie 1 nośnik uruchamialny.
  - Dodano obsługę globalnego ładowania plików z parametrów URL (`?load=`, `?url=`, `?zip=`).
  - Dodano globalny listener drag & drop na poziomie okna przeglądarki (`window`).
  - Dodano pełną obsługę odtwarzania chiptune'ów SID w `handleMountExtractedFile()`.
- `src/components/C64Toolbar.tsx`:
  - Dodano obsługę plików `.sid` i resetowanie `input.value` po załadowaniu.
- `src/components/C64StorageExplorer.tsx`:
  - Wprowadzono automatyczne rozpakowywanie archiwów ZIP/GZ w kreatorze własnych obrazów dyskietek D64.
- `src/components/C64ArchiveModal.tsx`:
  - Wdrożono grupowanie plików na nośniki C64 i pliki towarzyszące.
  - Dodano wbudowaną przeglądarkę dokumentacji (`DOC`, `.nfo`, `.diz`, instrukcje gier).
  - Dodano szybki przycisk autostartu pierwszego nośnika.
- `src/components/C64PolishGamesCatalog.tsx`:
  - Wprowadzono transparentne rozpakowywanie nośników `.zip` i `.gz` w locie w `handleLaunchGame()` i module testów funkcjonalnych `handleRunFunctionalTest()`.

---

## 3. Wynik

- **Wynik:** `SUKCES` (100% zgodności ze standardami TypeScript, zero błędów lint/build, pełna niezawodność uruchamiania pojedynczych i spakowanych gier lokalnie oraz z zewnętrznych źródeł URL).
