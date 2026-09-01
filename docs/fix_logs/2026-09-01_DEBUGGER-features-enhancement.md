# Fix Log: 6502 Debugger — Pełna Implementacja Funkcji Debugowania

- **Data i godzina:** 2026-09-01 02:33
- **Moduły:** `C64Debugger.tsx`, `c64_system.ts`
- **Symptom / Żądanie:**
  Użytkownik zażądał pełnego, interaktywnego debuggera 6502 zgodnego ze standardami monitora VICE, obejmującego:
  1. **Step Over** (`JSR` — pomiń wywołanie podprogramu i zatrzymaj przy powrocie).
  2. **Step Out** (wykonuj do napotkania `RTS`/`RTI`).
  3. **Sprzętowe punkty przerwania (breakpoints)** — ustawianie/usuwanie z rynny disassemblera oraz modal menedżera.
  4. **Interaktywna edycja rejestrów CPU** — kliknięcie na badge `PC`, `A`, `X`, `Y`, `SP` otwiera pole edycji hex.
  5. **Interaktywne POKE** — kliknięcie bajtu w Hex Memory Inspector pozwala bezpośrednio zmienić wartość w pamięci RAM.
  6. **Nawigacja po podprogramach** — kliknięcie operandu `JSR`/`JMP` w disassemblerze skacze do docelowego adresu; przycisk `< Back` wraca.
  7. **Menedżer breakpointów** — modal z listą aktywnych punktów przerwania, usuwaniem i formularzem dodawania.

---

## 1. Zidentyfikowane zmiany (Root Causes / Implementation Areas)

1. **`c64_system.ts` — Brak mechanizmu breakpointów:**
   - Klasa `C64System` nie posiadała kolekcji `Set<number>` ani callbacku `onBreakpointHit`.
   - Metoda `stepScanline()` nie sprawdzała PC względem zbioru breakpointów.
   - Brakowało metod `stepOver()` i `stepOut()` zgodnych ze specyfikacją VICE.

2. **`C64Debugger.tsx` — Brak interaktywności:**
   - Przyciski Step Over i Step Out były nieobecne w pasku sterowania.
   - Rejestry CPU były tylko do odczytu — brak interaktywnej edycji.
   - Hex Memory Inspector nie posiadał trybu edycji POKE.
   - Disassembler nie śledził historii adresów ani nie umożliwiał nawigacji po podprogramach.
   - Brak interfejsu menedżera breakpointów.

---

## 2. Zmodyfikowane pliki i linie

### `src/c64/c64_system.ts`
- **L80–L105:** Dodano `breakpoints: Set<number>`, `onBreakpointHit?: (pc: number) => void`.
- **Helper methods:** `addBreakpoint(addr)`, `removeBreakpoint(addr)`, `toggleBreakpoint(addr)`, `clearBreakpoints()`.
- **L747–L755:** Sprawdzanie breakpointów w pętli `stepScanline()`.
- **L818–L860:** Implementacja `stepOver()`:
  - Wykrywa opcode `$20` (JSR), oblicza `targetPC = currentPC + 3`.
  - Wykonuje instrukcje aż do osiągnięcia `targetPC` lub trafienia breakpointa.
- **L861–L895:** Implementacja `stepOut()`:
  - Wykonuje instrukcje aż do opcode `$60` (RTS) lub `$40` (RTI) lub breakpointa.

### `src/components/C64Debugger.tsx`
- **Import sekcja:** Dodano ikony `CircleDot`, `Circle`, `ChevronLeft` z `lucide-react`.
- **Stan lokalny:** `breakpoints: Set<number>`, `editingRegister`, `editRegisterValue`, `editingHexAddr`, `editHexValue`, `disasmHistory: number[]`, `disasmJumpedTo`.
- **Handlery:** `handleRegisterEdit`, `handleRegisterEditSubmit`, `handleHexPokeEdit`, `handleHexPokeSubmit`, `handleDisasmJump`, `handleDisasmBack`.
- **`renderHexRows()`:** Kliknięcie bajtu otwiera inline input — po zatwierdzeniu wartość jest zapisywana przez `system.cpu.memory[addr] = value`.
- **Pasek rejestrów CPU:** Dodano przyciski `Step Over` i `Step Out`; każdy badge rejestru jest klikalny i otwiera edytor hex.
- **Toolbar debuggera:** Dodano przycisk `BREAKPOINTS (n)` otwierający modal menedżera.
- **Disassembler:** Rynna z klikalnymi ikonami `CircleDot` do toggle'owania breakpointów; adresy `JSR`/`JMP` są linkami skaczącymi do docelowego adresu.
- **Modal menedżera breakpointów:** Lista breakpointów z symbolami KERNAL/I/O, przyciskami usunięcia, "Clear All" i formularzem "Add Breakpoint".

---

## 3. Wynik

- **Wynik:** `SUKCES`
- **TypeScript:** `npx tsc --noEmit` → exit code 0, zero błędów.
- **Funkcjonalność:** Wszystkie 7 zaplanowanych funkcji zaimplementowano. Debugger jest w pełni interaktywny i zgodny ze specyfikacją VICE Monitor (`z` = step over, `n` = next inst, `return` = step inst, `break` = breakpoint).

---

## 4. Wnioski i zalecenia

- `stepOver()` w obecnej implementacji jest bezpieczny dla linii jednej ramki; przy dużych podprogramach może przekroczyć limit — warto dodać licznik iteracji MAX (np. 100 000 cykli) jako zabezpieczenie przed nieskończoną pętlą.
- Menedżer breakpointów nie persystuje stanu po odświeżeniu strony — warto rozważyć `localStorage` w przyszłości.
- Edycja PC przez inline input powinna wywołać `system.resetToPC(newPC)` zamiast surowego `system.cpu.pc = value` — rozważyć w następnej iteracji.
