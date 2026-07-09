# Part 1 — Design System (Auth & Dashboard)

Grounded in the tokens already shipped in `src/app/globals.css` and `src/app/fonts.ts`. New tokens introduced here are marked **NEW** and must be added to the theme before implementation.

---

## 1. Typography

Existing families (keep):

| Token | Family | Use |
|---|---|---|
| `--font-serif` | Thmanyah Serif Text | Body, labels, inputs, buttons — the workhorse |
| `--font-display` | Thmanyah Serif Display | Page/screen titles, wizard step titles |
| `--font-sans` | Thmanyah Sans | Dense dashboard UI: tables, badges, breadcrumbs, matrix cells |
| `--font-archivo` | Archivo Light | Numerals only (stats, OTP digits) |
| `--font-thulth` | A Moshref Thulth | Ceremonial brand title only — never in auth forms |

Type scale (auth + dashboard):

| Style | Size/Line | Weight | Family | Usage |
|---|---|---|---|---|
| Display L | 40/48 | 700 | Display | Marketing side-panel headline (login split view) |
| Title | 28/36 | 700 | Display | Screen titles ("تسجيل الدخول") |
| Subtitle | 17/28 | 300 | Serif | Under-title helper line |
| Body | 16/26 | 400 | Serif | Paragraphs, input text |
| Label | 15/22 | 700 | Serif | Field labels |
| Caption | 13/20 | 400 | Serif | Hints, counters, meta |
| Table/UI | 14/20 | 400–500 | Sans | Dashboard tables, chips, tabs |
| OTP digit | 32/40 | 300 | Archivo | The 6 code boxes |

Rules: minimum interactive text 15px; Arabic line-height never below 1.6 for body; no all-caps in Arabic (use weight instead); English fallback inherits the same scale.

---

## 2. Color Usage

Existing palettes: `creamy` (surfaces), `brown` (text/ink), `blue` (secondary/info), `red` (brand accent), `ink` (neutrals for dark mode).

Semantic mapping:

| Role | Light token | Notes |
|---|---|---|
| Page background | `creamy-100` (`--color-surface`) | |
| Card / panel | `creamy-50` (`--color-card`) | |
| Recessed field bg | `creamy-50` on card, `creamy-200` on page | |
| Hairline border | `brown-100` (`--color-line`) | |
| Primary text | `brown-900` | |
| Secondary text | `brown-400` | |
| Placeholder | `brown-100` | |
| Primary action | `brown-500` bg / `creamy-100` text | Buttons — brand brown, not red |
| Ceremonial accent | `red-500` | Logo chip, focused decorations, marketing panel only |
| Focus ring | `blue-500` at 2px offset 2px | Distinct from error red |
| Link | `blue-500`, underline on hover | |
| Error | **NEW** `--color-danger: #B3362C` + tint `#FBEDEB` | red-500 (#dd6e6e) is brand, too soft for errors — add a true danger red |
| Success | **NEW** `--color-success: #2F6B4F` + tint `#EAF3EE` | |
| Warning | **NEW** `--color-warning: #9A6A1B` + tint `#FBF3E4` | |
| Info | `blue-500` + tint `blue-50` | |

Usage laws:
- Danger/success/warning appear **only** in feedback (alerts, field states, badges) — never decorative.
- All text/background pairs must pass WCAG AA 4.5:1 (the tints above are tuned for their paired deep tones).
- Never place `red-500` text on `creamy` backgrounds for reading text (fails contrast) — it's an object color (shapes, fills), not a text color.

### Dark mode readiness

Do not ship dark auth screens in v1, but build everything against semantic aliases so flipping is a token swap:

| Alias | Light | Dark (reserved) |
|---|---|---|
| `surface` | creamy-100 | ink-900 |
| `card` | creamy-50 | ink-800 |
| `line` | brown-100 | ink-600 |
| `text-primary` | brown-900 | creamy-100 |
| `text-secondary` | brown-400 | creamy-700 |
| `action-primary` | brown-500 | creamy-500 (text ink-900) |

Rule for implementers: components reference aliases only; raw palette steps are forbidden inside component styles.

---

## 3. Spacing & Grid

- Base unit **4px**; allowed steps: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96.
- Field vertical rhythm: label → 8 → input → 6 → hint/error; between fields 20; between sections 32.
- **Auth grid:** centered column, max-width 440px (login/forgot) or 560px (registration wizard), page padding 16 (mobile) / 24 (tablet).
- **Split layout (desktop ≥1024px):** 12-col grid; form pane 5 cols (min 480px), brand pane 7 cols. Brand pane drops entirely below 1024px — never squeeze it.
- **Dashboard grid:** fixed sidebar 264px (RTL: right side), content max 1320px, 24px gutters; tables full-bleed within content card.

Breakpoints: 0–639 mobile · 640–1023 tablet · 1024–1439 desktop · ≥1440 wide.

---

## 4. Components

### 4.1 Buttons (extends existing `PillButton`)

| Variant | Style | Use |
|---|---|---|
| Primary | brown-500 bg, creamy-100 text, full-round (pill) | One per screen: Login, Continue, Save |
| Secondary | transparent, 1px brown-500 border, brown-500 text | Back, Cancel |
| Tertiary/Ghost | text-only brown-500, underline on hover | "Resend code", inline actions |
| Danger | danger bg, white text — rectangular `radius 12` not pill | Destructive confirms only (never on auth screens) |
| SSO | creamy-50 bg, line border, provider logo + text | Google / Microsoft (phase 2) |

Sizes: L 56px (auth forms), M 44px (dashboard), S 36px (table rows). States: default / hover (bg −1 step darker, 150ms) / active (scale 0.98) / focus-visible (blue ring) / loading (spinner replaces label, width locked, `aria-busy`) / disabled (40% opacity, cursor default — but prefer enabled buttons that validate on click).

### 4.2 Inputs

- Height 56 (auth) / 44 (dashboard); radius 16; bg `creamy-50`; border 1px `line`.
- States: focus → border `brown-400` + blue focus ring; error → border danger + danger hint line with icon; success (async checks like email availability) → subtle success check icon inside the field, no green border.
- Label always above (RTL: right-aligned). Never floating labels (poor Arabic support). Never placeholder-as-label.
- LTR islands: email, phone, password, OTP get `dir="ltr"` with text-alignment matching the surrounding flow (`text-align: start` visually resolved).
- Password field: trailing eye toggle (44×44 target, `aria-pressed`, tooltip "Show password"); paste allowed.
- Phone field: country-code select (flag + code, searchable) fused to the number input; stored E.164.

### 4.3 Dropdowns / Selects

Custom listbox (not native) for Church/Diocese/Country/Program: searchable, keyboard-navigable (type-ahead), virtualized beyond 50 items, 8px option padding steps, check indicator on selected, groups supported (dioceses grouped by country). Mobile <640px: opens as bottom sheet. Empty result: "لا توجد نتائج" + "Can't find your church?" escape-hatch link (free-text entry flagged for admin review).

### 4.4 Checkboxes & Radio buttons

- 20×20, radius 6 (checkbox) / full (radio); 2px border `brown-300`; checked: brown-500 fill + creamy check.
- Indeterminate state (matrix "some actions granted"): 8×2 dash.
- Hit area ≥ 44×44 including label. Label click toggles.
- T&C checkbox: label contains inline links (Terms, Privacy) that open in new tab **without** toggling the box.

### 4.5 Alerts

| Type | Anatomy |
|---|---|
| Inline field error | 13px danger text + 16px icon, appears with 120ms fade+2px slide |
| Form banner | Full-width, tint bg, deep-tone text + icon, radius 12, `role="alert"`, appears above form, auto-scrolls into view |
| Toast (dashboard) | Bottom-start (RTL: bottom-right), 4s auto-dismiss (errors persist until dismissed), max 3 stacked, `role="status"` |

### 4.6 Modals & Drawers

- Modal: max-width 480 (confirm) / 640 (content); radius 24; overlay `brown-900` @ 40%; focus-trapped; Esc + overlay click close (except destructive confirms — explicit button only); title 20/700 Display; actions right-aligned LTR / left-aligned RTL, primary outermost.
- Drawer (admin create/edit): slides from **start edge opposite the sidebar** — in RTL sidebar sits right, drawer slides from left; width 480; sticky footer with Save/Cancel; dirty-state guard ("Discard changes?").
- Destructive confirm pattern: consequence sentence + typed-confirmation only for role deletion & admin deletion ("type the role name").

### 4.7 Icons

- One family: **Lucide** (outline, 1.5px stroke) at 16/20/24. No emoji in UI, no mixed families.
- Directional icons (arrows, chevrons) must flip in RTL; universal icons (lock, mail, eye) must not.
- Every icon-only button has `aria-label` + tooltip.

### 4.8 Cards & Elevation

Warm paper aesthetic — borders over shadows:

| Level | Treatment | Use |
|---|---|---|
| 0 | bg only | page sections |
| 1 | card bg + 1px line border, radius 24–40 (`--radius-card`) | auth card, dashboard panels |
| 2 | + shadow `0 8px 24px rgba(36,17,15,0.08)` | dropdown menus, popovers |
| 3 | + shadow `0 16px 48px rgba(36,17,15,0.16)` | modals, drawers |

### 4.9 Border radius scale

4 (chips) · 6 (checkbox) · 12 (alerts, small buttons) · 16 (inputs) · 24 (modals, dashboard cards) · 40 (auth card, hero cards = existing `--radius-card`) · full (pills, avatars).

### 4.10 Special auth components

- **OTP input:** 6 boxes 52×64, Archivo 32px, `dir="ltr"` always, auto-advance, backspace moves back, full-code paste distributes, `inputmode="numeric"` `autocomplete="one-time-code"`, shake 300ms + danger borders on wrong code, all-success pulse on correct.
- **Password strength meter:** 4 segments under field; colors danger→warning→blue→success; label ("ضعيفة/مقبولة/جيدة/قوية"); updates on keyup ≤50ms; `role="status" aria-live="polite"`.
- **Stepper (wizard):** numbered circles + labels, connector line fills on completion (RTL flows right→left); completed = brown-500 fill + check; current = brown-500 ring; future = line border. Mobile: compresses to "الخطوة ٢ من ٣" + progress bar.
- **Permission matrix cell:** 40×40 cell with centered checkbox; row = module, column = action; column-header hover highlights column; unavailable action = empty cell (not disabled checkbox); guarded permission = small shield icon beside checkbox.

---

## 5. RTL Guidelines (binding)

1. All layout uses **logical properties/utilities** (`ps-`, `pe-`, `text-start`, `start-0`) — physical `left/right` utilities are forbidden in auth/dashboard code.
2. Arabic is the design source; English mirrors. QA reviews every screen in both `dir` values.
3. LTR islands: email, URLs, phone, passwords, OTP, code snippets — `dir="ltr"` with `unicode-bidi: isolate` semantics; caret/selection must behave correctly.
4. Mixed-text truncation in tables uses `dir="auto"` per cell.
5. Numerals: functional numbers (codes, phones, dates in forms) = Western digits; decorative counters may use Arabic-Indic.
6. Icon flips: chevrons/arrows/steppers/back icons flip; lock/mail/eye/search do not.
7. Keyboard: arrow-key navigation in menus/OTP respects visual direction (Right arrow = visually right regardless of dir).
8. Dates: student-facing = localized (e.g. ٨ يوليو ٢٠٢٦); dashboard tables = ISO `2026-07-08` for scannability.

---

## 6. Motion

| Interaction | Spec |
|---|---|
| Field focus | border-color 150ms ease-out |
| Error appear | fade + 2px slide-down 120ms |
| Wrong OTP / login shake | translateX ±6px, 3 cycles, 300ms |
| Button press | scale 0.98, 100ms |
| Screen transitions (wizard) | slide 24px in flow direction + fade, 250ms `--ease-out-quart` |
| Success check | SVG stroke draw-in 400ms + 1 soft pulse |
| Modal/drawer | overlay fade 200ms; panel slide/scale 250ms `--ease-out-quart` |
| Skeletons | shimmer 1.2s linear infinite (dashboard tables only) |

All motion honors `prefers-reduced-motion` → crossfade only. GSAP already in the stack may drive the wizard transitions; CSS suffices for the rest.
