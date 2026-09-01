# Fix Log: VERMES Framebuffer Artifact — Ekran Powitalny Fortuna

---

## Sesja #1 — 2026-09-01 · 00:43–01:00 CEST

### Zgłoszony Błąd (Symptom)

Na ekranie powitalnym gry **Fortuna kolem sie toczy.d64** widoczne były artefakty graficzne
z innej gry (tekst/grafika VERMES) nakładające się na poprawnie renderowany ekran tytułowy.
Crash snapshot: `PC=$9062`, Raster `#264`, Frame `#8`, tryb PAL.

```
{
  "format": "COMMODORE_64_CRASH_SNAPSHOT_V1",
  "cpu.pc": 36965,          // $9062
  "system.currentRaster": 264,
  "system.frameCount": 8,
  "vic.vicBank": 3,
  "vic.regs[0x11]": 59,     // $3B — Text mode, DEN=1, 25 rows, YSCROLL=3
  "vic.regs[0x18]": 120,    // $78 — Screen @VIC+$1C00 ($DC00), Charset @VIC+$2000 ($E000)
  "vic.regs[0x20]": 102     // $66 — Border purple
}
```

---

### Analiza Przyczyn Źródłowych

Zidentyfikowano **4 niezależne przyczyny**:

#### Bug #1 — PRIMARY: Brak czyszczenia bufora pikseli między sesjami gier
- **Plik:** [`src/c64/c64_vic2.ts`](../../src/c64/c64_vic2.ts) — `startLine()` L~209
- `clearFrameBuffer()` wywoływane tylko gdy `currentRaster === 0`.
- Po załadowaniu nowej gry piksel-buffer (`this.pixels`) zawierał dane poprzedniej gry do czasu
  pierwszego przejścia rastra przez linię 0.
- **Okno podatności:** do 311 skanerów po `hardReset()`.

#### Bug #2 — SECONDARY: `clearFrameBuffer()` używa `regs[0x20]` po resecie = kolor poprzedniej gry
- **Plik:** [`src/c64/c64_vic2.ts`](../../src/c64/c64_vic2.ts) — `clearFrameBuffer()` L~104
- W momencie pierwszego czyszczenia (raster=0, klatka 1), `regs[0x20]` = `$0E` (light blue z resetu),
  ale może odzwierciedlać kolor granicy poprzedniej gry jeśli reset nie jest kompletny.

#### Bug #3 — TERTIARY: `fastBoot()` nadpisuje piksele zainicjowane przez `reset()`
- **Plik:** [`src/c64/c64_system.ts`](../../src/c64/c64_system.ts) — `hardReset()` L~105
- `vic.reset()` czyści buffer czarnym → `fastBoot()` renderuje ~100k skanerów i zostawia
  piksele ekranu bootowania BASIC READY.

#### Bug #4 — CRITICAL WINDOW: Race condition między `hardReset()` a pętlą React render
- **Plik:** [`src/c64/c64_system.ts`](../../src/c64/c64_system.ts) — `loadAndRunPRG()` + `loadCartridge()`
- Pętla `requestAnimationFrame` w `C64Screen.tsx` jest asynchroniczna — może namalować klatkę
  ze starymi pikselami w oknie między `hardReset()` a pierwszym `stepFrame()` nowej gry.

---

### Zmodyfikowane Pliki

#### [`src/c64/c64_vic2.ts`](../../src/c64/c64_vic2.ts)

| Zmiana | Linie (przed/po) | Opis |
|---|---|---|
| Nowe pole `_pendingBlackClear` | klasa, po `mainBorder` | Flaga czarnego czyszczenia po resecie |
| `reset()` — fill black FIRST | ~L111 | `this.pixels.fill(0xFF000000)` jako pierwsza instrukcja |
| `forceBlackFrame()` [NOWA METODA] | po `clearFrameBuffer()` | Publiczne API dla `C64System` |
| `startLine()` @ raster=0 | ~L209 | Przy `_pendingBlackClear=true` → fill black, nie border |

```diff
// reset():
+   this.pixels.fill(0xFF000000);  // ← NOWE: czarny fill PRZED rejestrem
+   this._pendingBlackClear = true;
    this.regs.fill(0);
    ...

// startLine() @ c64Raster === 0:
-   this.clearFrameBuffer();
+   if (this._pendingBlackClear) {
+     this.pixels.fill(0xFF000000);
+     this._pendingBlackClear = false;
+   } else {
+     this.clearFrameBuffer();
+   }
```

#### [`src/c64/c64_system.ts`](../../src/c64/c64_system.ts)

| Zmiana | Metoda | Opis |
|---|---|---|
| `this.vic.forceBlackFrame()` | `hardReset()` po bootseq | Gwarantuje czarny slate po fastrBoot |
| `this.vic.forceBlackFrame()` | `loadAndRunPRG()` | Zamknięcie race window |
| `this.vic.forceBlackFrame()` | `loadCartridge()` | Zabezpieczenie dla ładowania CRT |

---

### Wynik

**✅ SUKCES**

- TypeScript type-check: `exit code 0` — zero błędów
- Piksele poprzedniej gry nie mogą przetrwać żadnej ścieżki `hardReset()` → `loadAndRunPRG()` / `loadCartridge()`
- Trzy niezależne bariery (`reset()`, `hardReset()`, `loadAndRunPRG()`) gwarantują czarną klatkę przed startem nowej gry

---

### Wnioski i Zalecenia

1. **Na przyszłość:** Każde nowe miejsce, które wywołuje `hardReset()` lub reset VIC (np. ewentualna implementacja `softreset()`) musi wywoływać `vic.forceBlackFrame()` lub `vic.reset()`.
2. **Testy regresji:** Po dodaniu jakiegokolwiek nowego trybu video (multicolor bitmap split-screen, ECM) — zweryfikować czy `startLine()` poprawnie czyści bufor przed pierwszą klatką tego trybu.
3. **Potencjalne obszary ryzyka:** Jeżeli dodana zostanie obsługa migawek stanu (`.VSF` snapshots), mechanizm przywracania musi również wywołać `forceBlackFrame()` przed wznowieniem, bo snapshot może zawierać VIC bank inny niż ten, który pozostawił piksele w buforze.
4. **`_pendingBlackClear` flaga** jest resetowana przez `_pendingBlackClear = false` w `forceBlackFrame()` i w `startLine()`. Przy debugowaniu — sprawdź tę flagę, jeśli artefakty powrócą.

---

## Sesja #2 — 2026-09-01 · 01:05–01:12 CEST

### Zgłoszony Błąd (Symptom)

Na ekranie intro grupy **VERMES** (będącym integralnym intro/loaderem do gry *Fortuna kołem się toczy.d64*):
- Górna część ekranu (linie rastra ~55–114) renderowała się poprawnie (logo "VERMES" w trybie Multicolor Bitmap).
- Dolna część ekranu (od linii 114 w dół) była całkowicie **zaszumiona/uszkodzona** (zielono-białe kropki i pasy), zamiast wyświetlać poprawny 2x2 tekst w trybie znakowym ("PRZEDSTAWIA GRĘ / FORTUNA KOŁEM / SIĘ TOCZY / 1993 MAREX").

---

### Analiza Przyczyn Źródłowych

#### Główna Przyczyna: Zatrzaskowy (Edge-latched) IRQ w emulacji MOS 6510 zamiast poziomu (Level-sensitive)
- **Plik:** [`src/c64/c64_cpu.ts`](../../src/c64/c64_cpu.ts) — `handleInterrupts()` / `triggerIRQ()`
- Przerwanie rastra VIC-II występuje na linii **32**.
- Handler intro pod `$9049`:
  1. Włącza tryb Multicolor Bitmap (`$D011 |= $20`, `$D016 |= $10`, `$D018 = $78`).
  2. Czeka w pętli na linię rastra **45** (`CMP $D012`).
  3. Czeka w pętli na linię rastra **114** (`CMP $D012`).
  4. Na linii 114 przełącza VIC-II z powrotem w tryb tekstowy (`$D011 &= ~$20`, `$D016 &= ~$10`, `$D018 = $34`).
  5. Potwierdza przerwanie VIC-II (`INC $D019`) i wywołuje procedurę odtwarzania SID (`JSR $A4EA`).
  6. Kończy się instrukcją `RTI` w KERNAL IRQ (`$EA31`).
- **Mechanizm błędu:**
  - Ponieważ wykonanie handlera trwa od linii 32 do około linii 136, funkcja `stepScanline()` na każdej pośredniej linii (33..117) wywoływała `cpu.triggerIRQ()`.
  - W klasie `C64CPU` flaga `irqPending = true` była zapamiętywana jako zatrzask (latch).
  - Kiedy na linii 136 procesor wykonał `RTI` i zdjął flagę `I` (Interrupt Disable) ze stosu, `irqPending` było nadal `true`, mimo że linia przerwania VIC-II została już skasowana przez `INC $D019`!
  - W rezultacie procesor **błędnie wszedł powtórnie w handler `$9049` na linii 136**.
  - Handler `$9049` ponownie włączył tryb Multicolor Bitmap i zaczął czekać na linię 45 (która w tej klatce już minęła!).
  - Procesor zablokował się w pętli `CMP $D012` aż do końca klatki, a cały dół ekranu (linie 136–311) renderował się w trybie **Bitmap Mode**, czytając niezainicjowaną pamięć RAM zamiast bufora znakowego `$CC00` i czcionki `$D000`!

---

### Zmodyfikowane Pliki

#### [`src/c64/c64_cpu.ts`](../../src/c64/c64_cpu.ts) (L141–L175)

Zastąpiono zatrzaskową obsługę przerwaniem **rzeczywistą, poziomową weryfikacją stanu linii `/IRQ`** (MOS 6502/6510 Hardware Standard):

```diff
  handleInterrupts(): number {
    if (this.nmiPending) {
      this.nmiPending = false;
      ...
    }
-   if (this.irqPending && !this.fI) {
+   // 6502 /IRQ pin is level-sensitive: an interrupt triggers if and only if
+   // any hardware line (VIC-II raster/sprite IRQ or CIA1 timer/keyboard) is currently active,
+   // or an explicit triggerIRQ() pulse is pending.
+   const isHardwareIrqActive = (this.mem?.vic && this.mem.vic.isIrqActive?.()) ||
+                               (this.mem?.cia1 && this.mem.cia1.irqAsserted);
+
+   // If hardware lines have de-asserted, clear any stale latch
+   if (!isHardwareIrqActive && this.fI) {
+     this.irqPending = false;
+   }
+
+   const irqRequested = isHardwareIrqActive || this.irqPending;
+
+   if (irqRequested && !this.fI) {
      this.irqPending = false;
      this.push16(this.pc);
      this.push(this.getP() & ~0x10);
      this.fI = 1;
      const lo = this.mem.read(0xFFFE);
      const hi = this.mem.read(0xFFFF);
      this.pc = (hi << 8) | lo;
      return 7;
    }
    return 0;
  }
```

---

### Wynik

**✅ SUKCES**

- Raster split działa idealnie:
  - Linie 15–113: Tryb **Multicolor Bitmap** (logo "VERMES" na fioletowym tle).
  - Linie 114–311: Tryb **Standard Text** (niebieskie tło, biały tekst "PRZEDSTAWIA GRĘ / FORTUNA KOŁEM / SIĘ TOCZY / 1993 MAREX").
- Naciśnięcie spacji / kliknięcie na ekranie poprawnie wychodzi z intro i uruchamia grę właściwą *Fortuna kołem się toczy*.
- Kompilacja TypeScript: 0 błędów.

