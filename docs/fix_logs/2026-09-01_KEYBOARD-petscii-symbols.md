# Fix Log: Wirtualna Klawiatura C64 — Symbole i Nadruki PETSCII

- **Data i godzina:** 2026-09-01 02:25
- **Komponent:** `src/components/C64VirtualKeyboard.tsx`, `src/components/PetsciiIcon.tsx`
- **Symptom / Zadanie:** Dostosowanie wszystkich nadruków i symboli graficznych PETSCII na wirtualnej klawiaturze Commodore 64 do 100% zgodności z oryginalnym sprzętem Commodore C64 oraz specyfikacją emulatora VICE i tabeli znaków PETSCII.

---

## 1. Zidentyfikowane niezgodności i wprowadzone poprawki

1. **Klawisz Commodore (`C=`):**
   - Dodano autentyczne logo Commodore `C=` w formacie wektorowym SVG (`cbm_logo`).
2. **Klawisze interpunkcyjne i matematyczne (Rząd 3 i Rząd 4):**
   - `< ,`: dodano lewy symbol trójkąta górnego lewego (`tri_top_left` ◤ / $7E).
   - `> .`: dodano lewy symbol trójkąta dolnego prawego (`tri_bottom_right` ◢ / $7F).
   - `? /`: dodano lewy symbol trójkąta dolnego lewego (`tri_bottom_left` ◣ / $7C).
   - `[ :`: dodano lewy symbol skrzyżowania/plusa (`cross_plus` ┼ / $DB).
   - `] ;`: dodano lewy symbol linii pionowej środkowej (`bar_mid_v` │ / $DD).
   - `=`: dodano lewy symbol trójkąta górnego prawego (`tri_top_right` ◥ / $AF).
   - `↑ π`: dodano lewy symbol trójkąta górnego prawego (`tri_top_right` ◥ / $DE).
3. **Litery alfabetu i łączenia T / łuki narożne:**
   - `Y`: zaktualizowano symbol lewy do trójnika lewego (`t_left` ┤ / $B7).
   - `U`: zaktualizowano symbol lewy do krzyża (`cross_plus` ┼ / $B8).
   - `H`: zaktualizowano symbol prawy do krzyża/podwójnej linii (`cross_box` / $C8).
   - `F`: zaktualizowano symbol prawy do linii poziomej środkowej (`bar_mid_h` / $C6).
   - `O` & `P`: zweryfikowano łuki narożne i ćwiartki wypełnienia.
   - `K` & `J`: zweryfikowano kąty proste i zaokrąglenia PETSCII.
4. **Kary i kolory:**
   - `A` (♠ Pik / Spade), `S` (♥ Kier / Heart), `Z` (♦ Karo / Diamond), `X` (♣ Trefl / Club) posiadają precyzyjne wektory SVG.
   - Cyfry `1-9` i `0` posiadają autentyczne oznaczenia kolorów KERNAL/PETSCII (`BLK`, `WHT`, `RED`, `CYN`, `PUR`, `GRN`, `BLU`, `YEL`, `RVS ON`, `RVS OFF`).

---

## 2. Zmodyfikowane pliki

- `src/components/PetsciiIcon.tsx`: dodano glify `t_left` oraz oficjalne logo `cbm_logo`.
- `src/components/C64VirtualKeyboard.tsx`: zaktualizowano definicje klawiszy, nadruki, ikony PETSCII oraz logo `C=`.

---

## 3. Weryfikacja

- Kompilacja TypeScript `npx tsc --noEmit` zakończona kodem 0 bez błędów.
- Weryfikacja wizualna w subagencie przeglądarkowym z wykonaniem zrzutu ekranu (`c64_virtual_keyboard_1788222255979.png`).
- Wynik: `SUKCES`.
