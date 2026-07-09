# Part 2 — Screen Specifications: Authentication (Student-facing)

Each screen follows the 15-point handoff format. Shared behaviors (design tokens, RTL, motion) are defined in Part 1 and not repeated.

Screens: **AUTH-01 Login · AUTH-02 Registration Wizard · AUTH-03 Email OTP Verification · AUTH-04 Registration Success · AUTH-05 Forgot Password (request) · AUTH-06 Reset Code Entry · AUTH-07 New Password · AUTH-08 Reset Success · AUTH-09 Profile Completion · AUTH-10 Account State Screens (locked / suspended / expired link)**

---

## AUTH-01 — Login

**1. Screen purpose.** Authenticate any user (student, admin, super admin) and route them to their portal. The institution's front door: must feel calm, prestigious, and safe.

**2. Target user.** All roles. Majority students on mobile; admins on desktop.

**3. UX goals.** Sign-in in under 10 seconds for returning users; zero ambiguity on failure; visible trust cues (lock icon, institutional identity); no dead ends (paths to register and to recover password always visible).

**4. Layout structure.**
- **Desktop (≥1024):** split view. Form pane (5/12, min 480px) on the *start* side: logo chip (existing red circle + LogoMark), title "تسجيل الدخول", subtitle, form, footer links. Brand pane (7/12): full-bleed `campus.webp` with brown-900 60% scrim, Display-L quote about the Academy's mission, subtle Pattern.svg texture at 6% opacity. Brand pane is decorative (`aria-hidden`).
- **Tablet (640–1023):** single centered card (max 440px) on `creamy-100` with Pattern.svg watermark at 4%; brand pane removed.
- **Mobile (<640):** full-bleed sheet, no card border, logo at top, form fills width, sticky-free (page scrolls naturally). Safe-area padding for iOS.

**5. Components.** Logo chip · Title/Subtitle · Email input · Password input with eye toggle · "Remember me" checkbox · "Forgot password?" tertiary link (same row as Remember me, opposite ends) · Primary pill button "تسجيل الدخول" · divider "أو" (reserved, hidden until SSO enabled) · SSO buttons Google/Microsoft (feature-flagged, phase 2) · footer line "ليس لديك حساب؟ **إنشاء حساب**" · language switcher (ع/EN, top end corner) · form banner slot for errors.

**6. Form fields.**

| Field | Type | Autocomplete | Notes |
|---|---|---|---|
| Email or username | text | `username` | `dir=ltr`, trims whitespace, lowercased on submit |
| Password | password | `current-password` | `dir=ltr`, paste allowed, eye toggle |
| Remember me | checkbox | — | default unchecked; copy: "تذكرني على هذا الجهاز" |

**7. Validation rules.** Client: both fields non-empty (validate on submit, not on blur — login should not nag). Server errors map to banner messages from the catalogue (Part 0 §6): invalid credentials (identical for wrong-email vs wrong-password), locked, suspended, unverified (→ redirect to AUTH-03 with resend). Never field-level errors for credentials — banner only.

**8. Interaction design.** Submit on Enter from any field. Button → loading state ≤100ms (label → spinner, width locked). On failure: banner + gentle form shake + password cleared, focus to password. On success: button shows check 400ms → route. Caps-lock detection shows caption hint under password. After 3 failures, surface "Forgot password?" as a secondary suggestion inside the banner.

**9. Accessibility.** `<main>` landmark; h1 = title; banner `role="alert"`; labels programmatically tied; focus order: email → password → remember → forgot → submit; focus visible always; eye toggle `aria-pressed`; color-independent error (icon + text); touch targets ≥44px; screen-reader announcement of loading via `aria-busy`; entire flow operable with keyboard only; WCAG 2.2 AA.

**10. Responsive behavior.** As §4. Additionally: on mobile keyboards, `autocapitalize=off autocorrect=off` on email; viewport does not zoom on focus (16px+ input text); brand pane image lazy-loaded desktop-only.

**11. Backend requirements.** Endpoint validates credentials against Argon2 hashes; per-identity and per-IP throttling; on success issues access JWT + rotating refresh cookie; writes `login_history` row (timestamp, IP, user-agent, result); updates `last_login_at`; returns `user_type` + effective permission list for client routing/nav.

**12. Database fields touched.** `users.email, username, password_hash, status, failed_login_count, locked_until, last_login_at` · `login_history.*` · `refresh_tokens.*` (see Part 4 schema).

**13. API requirements.** `POST /api/v1/auth/login` `{identifier, password, remember_me}` → `200 {access, user{id, type, name_ar, name_en, permissions[]}}` + `Set-Cookie: refresh` | `401 invalid_credentials` | `423 locked {retry_after}` | `403 suspended | unverified {resend_available}`. `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout` (revokes family). All auth endpoints rate-limited (10/min/IP).

**14. Security recommendations.** Identical response timing for existing/non-existing identities (constant-time compare + dummy hash); lockout counter server-side only; refresh cookie `HttpOnly Secure SameSite=Lax Path=/api/v1/auth`; no credentials in URLs/logs; CAPTCHA (invisible) only after lock threshold, never by default.

**15. Future scalability.** SSO slot reserved in layout (Google/Microsoft via OAuth). 2FA challenge screen slots after password step without layout change (same card swaps content). Passkeys (WebAuthn) can replace password block — keep the form area component-composed. Magic-link login possible reusing OTP infrastructure.

---

## AUTH-02 — Registration Wizard (Students)

**1. Screen purpose.** Convert a visitor into a verified student account with minimal drop-off, collecting identity + academic context across 3 digestible steps.

**2. Target user.** Prospective students, mostly Arabic-speaking, wide age range (18–65+), significant mobile share, varying digital literacy.

**3. UX goals.** ≤3 minutes to complete; each step under 7 visible fields; errors caught at the field (async email check on blur), not at submission; user always knows where they are (stepper) and can go back without data loss.

**4. Layout structure.** Same shell as AUTH-01 (split on desktop / card on tablet / sheet on mobile) but form column max 560px. Top: logo chip + stepper (3 steps: "الحساب" · "البيانات الأكاديمية" · "التحقق"). Under stepper: step title (Display 28) + one-line description. Footer per step: Primary "متابعة" full width; secondary ghost "رجوع" above it (step 2+). Mobile stepper compresses to progress bar + "الخطوة ٢ من ٣".

**5. Components.** Stepper · text inputs · phone input with country-code select · searchable selects (Country, Church, Diocese, Program) · password + confirm with strength meter · two consent checkboxes with inline links · form banner slot · draft-restored toast ("استعدنا بياناتك السابقة").

**6. Form fields.**

*Step 1 — الحساب (Account):*

| Field | Type | Rules |
|---|---|---|
| الاسم الأول (First name, AR) | text | required, 2–50 chars, Arabic letters + spaces |
| اسم العائلة (Last name, AR) | text | required, 2–50 chars, Arabic letters + spaces |
| Full name (EN) | text | required, 2–100 chars, Latin letters, `dir=ltr` — used on certificates; helper: "كما في جواز السفر" |
| البريد الإلكتروني | email | required, RFC format, async uniqueness on blur; E1 case → resend-verification suggestion |
| رقم الجوال | tel + country select | optional in v1 (phone OTP is phase 2), E.164, normalize Arabic-Indic digits |
| كلمة المرور | password | required, min 10, strength score ≥3, live meter |
| تأكيد كلمة المرور | password | must match, validate on blur |
| الشروط والأحكام | checkbox | required, links open in new tab |
| سياسة الخصوصية | checkbox | required (may be combined into one checkbox with two links — legal to confirm; design supports both) |

*Step 2 — البيانات الأكاديمية (Academic identity):*

| Field | Type | Rules |
|---|---|---|
| الدولة (Country) | searchable select | required; ISO 3166 list, Arabic labels, popular Coptic-diaspora countries pinned at top (مصر, USA, Canada, Australia…) |
| الإيبارشية (Diocese) | searchable select | required; filtered by country; groups by region; escape hatch "أخرى" → free text |
| الكنيسة (Church) | searchable select | required; filtered by diocese; escape hatch "أخرى" → free text, flagged for admin review |
| البرنامج المهتم به (Program of interest) | select | required; from published programs; helper text: "يمكنك التغيير لاحقًا" |

*Step 3 — التحقق:* see AUTH-03 (rendered inside the wizard as final step).

**7. Validation rules.** Per-field on blur; step gate on "متابعة" focuses first invalid field and scrolls it into view. Arabic-name fields reject Latin chars with a specific message (and vice versa for EN name). Email uniqueness check debounced 500ms, spinner inside field, result cached. Password must not contain email local-part. Draft (steps 1–2, excluding passwords) persisted to sessionStorage; restored with toast; cleared on completion or explicit exit.

**8. Interaction design.** Step transitions slide in flow direction (Part 1 motion). Back never destroys entered data. Account row is created at end of Step 2 (`status=pending_verification`) — this triggers the OTP email so the code is already arriving while the step transition plays. Selects cascade: choosing country resets diocese/church with a subtle highlight explaining why. Consent checkboxes cannot be pre-checked (legal).

**9. Accessibility.** Stepper is an `<ol>` with `aria-current="step"`; step change moves focus to step title and announces via live region; selects are ARIA listbox pattern with type-ahead; strength meter announced politely; error summary link-list offered at top of step when >2 errors (WCAG 3.3.1); all cascading resets announced.

**10. Responsive behavior.** Desktop: 2-column field grid where pairs are natural (first/last name). Tablet/mobile: single column. Selects become bottom sheets <640px. Keyboard-avoidance: focused field scrolls above the keyboard.

**11. Backend requirements.** Step-2 submit = atomic create of `users` + `student_profiles` rows in `pending_verification`; OTP generation + Gmail SMTP send (async task so the API returns fast); duplicate race handled by DB unique constraint (second submit gets E1 flow); unverified accounts auto-purged after 7 days (scheduled job) to free emails.

**12. Database fields.** `users`: `first_name_ar, last_name_ar, full_name_en, email, phone, password_hash, user_type='student', status, locale`. `student_profiles`: `country_code, diocese_id, church_id, church_other_text, program_interest_id`. `otp_codes`: new row. Reference tables `countries (static), dioceses, churches, programs`.

**13. API requirements.** `GET /api/v1/meta/registration-options` (countries, dioceses, churches, programs — cached, public) · `POST /api/v1/auth/check-email {email}` → `{available}` (rate-limited 20/hr/IP) · `POST /api/v1/auth/register {step1+step2 payload}` → `201 {pending_user_id}` + OTP email side-effect | `409 email_taken` | `422 field errors keyed by name`.

**14. Security recommendations.** Never echo password back; server re-validates everything client validated; check-email endpoint returns generic throttle response when abused (email-enumeration vector — acceptable trade-off for UX, mitigate with rate limits + optional invisible CAPTCHA); consent stored with timestamp + document version (`terms_accepted_at, terms_version`).

**15. Future scalability.** Phone OTP inserts as optional Step-3 tab. "Pending approval" gate re-enabled by a single platform setting (status flow already supports it). Additional account types (member/organization — already hinted in current UI copy) become a type selector above Step 1 with per-type field sets. Program application can deep-link into registration with program pre-selected (`?program=`).

---

## AUTH-03 — Email OTP Verification

**1. Screen purpose.** Prove email ownership; activate the account (per decision: activation gate = email only).

**2. Target user.** Students mid-registration; also reachable from login when an unverified user attempts sign-in.

**3. UX goals.** Zero-typing path (paste/autofill); recover gracefully from lost/expired/spam-foldered codes; never strand the user.

**4. Layout structure.** Wizard step 3 (or standalone card when arriving from login). Mail icon in soft `blue-50` circle → title "تحقق من بريدك" → sentence showing the target email in bold LTR with "تغيير" (change email) link → 6 OTP boxes → resend row → primary "تفعيل الحساب".

**5. Components.** OTP input (Part 1 §4.10) · countdown resend ("إعادة الإرسال خلال ٠:٥٩" → becomes ghost button) · spam hint (appears after 30s: "لم يصل؟ تحقق من مجلد الرسائل غير المرغوبة") · change-email link (returns to Step 1 with email focused; invalidates old code) · banner slot.

**6. Form fields.** Single 6-digit code, `inputmode=numeric`, `autocomplete=one-time-code`, `dir=ltr`.

**7. Validation rules.** Exactly 6 digits; auto-submit on 6th digit; wrong code → shake + "otp.wrong {n}" (3 attempts per code); expired (10 min) → auto-message + auto-resend once; resend cooldown 60s, max 5/hour.

**8. Interaction design.** Boxes auto-advance; backspace steps back; full paste distributes; success → all boxes pulse success → check draw-in → auto-advance to AUTH-04 after 600ms. Attempts remaining shown only after first failure.

**9. Accessibility.** The 6 boxes are one labeled group ("رمز التحقق المكوّن من ٦ أرقام"); countdown has `aria-live=off` (announce only state changes: "يمكنك الآن إعادة الإرسال"); error announced assertively; boxes have `translate="no"`.

**10. Responsive behavior.** Boxes shrink to 44×56 on <360px; numeric keyboard forced on mobile; code arriving via mail app → OS-level autofill honored (`one-time-code`).

**11. Backend requirements.** OTP: 6 digits from CSPRNG, stored **hashed** with expiry + attempt counter; verification atomically flips `users.status → active`, sets `email_verified_at`, deletes/invalidates OTP, issues auth tokens (auto-login), fires welcome email.

**12. Database fields.** `otp_codes: user_id, purpose('email_verify'), code_hash, expires_at, attempts, max_attempts, consumed_at, sent_to` · `users.status, email_verified_at`.

**13. API requirements.** `POST /api/v1/auth/verify-email {pending_user_id, code}` → `200 {access, user}` + refresh cookie | `400 invalid_code {attempts_left}` | `410 expired` · `POST /api/v1/auth/resend-otp {pending_user_id}` → `202` | `429 {retry_after}`.

**14. Security recommendations.** Hash codes (never plaintext at rest or in logs); constant-time compare; bind code to user+purpose; invalidate all previous codes on resend; throttle verify endpoint (10/min); Gmail SMTP creds in env vars only, via app-password, sending queued off-request (see Part 4 §6 for SMTP limits & production migration note).

**15. Future scalability.** Same component + table serve phone OTP (`purpose='phone_verify'`), password reset codes, and future step-up 2FA challenges.

---

## AUTH-04 — Registration Success

**1. Purpose.** Celebrate activation; hand off to profile completion or the portal. **2. User.** Freshly verified student (already logged in). **3. UX goals.** A single moment of institutional warmth; clear next action; no dead-end.

**4. Layout.** Centered card: animated success check (stroke draw-in) inside `success` tint circle → title "أهلًا بك في أكاديمية القديس مارمرقس" → personalized line with first name → two actions: Primary "أكمل ملفك الشخصي" (→ AUTH-09), Ghost "الانتقال إلى البوابة" (→ portal). Optional subtle confetti burst ≤1s, `prefers-reduced-motion` → none.

**5–7. Components/fields/validation.** No inputs. **8. Interaction.** Auto-focus on primary action; screen is skippable — portal link never hidden. **9. Accessibility.** `role=status` announcement "تم تفعيل حسابك"; check animation decorative. **10. Responsive.** Same card at all sizes. **11–13. Backend/API.** None beyond AUTH-03 side effects; welcome email already queued. **14. Security.** Page requires the fresh session; direct anonymous visits redirect to login. **15. Scalability.** Slot for "verify your phone" secondary prompt (phase 2) and onboarding checklist.

---

## AUTH-05 — Forgot Password (Request)

**1. Purpose.** Start account recovery via email. **2. User.** Any role; stressed mental state — keep it minimal. **3. UX goals.** One field, one action, neutral outcome that doesn't leak account existence.

**4. Layout.** Auth card: key icon in blue-50 circle → title "استعادة كلمة المرور" → one sentence explanation → email field → primary "إرسال رمز الاستعادة" → ghost "العودة لتسجيل الدخول".

**6. Fields.** Email (required, format-validated, `autocomplete=email`).

**7. Validation.** Format only client-side. Server always returns success-shaped response.

**8. Interaction.** Submit → loading → **always** advance to AUTH-06 with neutral copy: "إذا كان البريد مسجلاً لدينا فستصلك رسالة تحتوي الرمز" (if the email exists, a code is on the way). Resend available from AUTH-06.

**9. Accessibility.** As AUTH-01 conventions. **10. Responsive.** Standard card behavior.

**11. Backend.** If email exists & active: create reset OTP (purpose `password_reset`, 15-min), send email; if not: do nothing — identical latency (execute dummy work). Rate-limit 5 requests/hour/email and /IP.

**12. DB.** `otp_codes` (purpose `password_reset`). **13. API.** `POST /api/v1/auth/forgot-password {email}` → always `202`.

**14. Security.** No user enumeration via message, timing, or status code. **15. Scalability.** SMS recovery channel adds a tab, reusing the same flow.

---

## AUTH-06 — Reset Code Entry

Same component and rules as AUTH-03 with deltas: purpose `password_reset`; 15-min expiry; 5 attempts then the flow restarts at AUTH-05 with banner; heading "أدخل رمز الاستعادة"; on success server issues a **short-lived reset token** (10 min, single-use) — the code itself is never carried to the next screen. `POST /api/v1/auth/verify-reset-code {email, code}` → `200 {reset_token}`.

---

## AUTH-07 — New Password

**1. Purpose.** Set a new password after code verification. **2. User.** Recovering account owner. **3. UX goals.** Confidence the account is now secure; prevent immediate lockout by re-entry mistakes.

**4. Layout.** Auth card: shield icon → title "كلمة مرور جديدة" → password + confirm with strength meter → primary "تحديث كلمة المرور".

**6–7. Fields/validation.** Same password policy as registration; additionally: cannot equal any of the last 3 passwords (server check → specific message "لا يمكن استخدام كلمة مرور سابقة"); reset token must still be valid — expiry mid-form → banner with "ابدأ من جديد" restart action.

**8. Interaction.** Success → AUTH-08; all refresh tokens revoked; security notification email sent ("Your password was changed — wasn't you? Contact us").

**11–13. Backend/API.** `POST /api/v1/auth/reset-password {reset_token, new_password}` → `200` | `410 token_expired` | `422 password_reused|weak`. Writes `password_history`, revokes `refresh_tokens`, audit entry.

**14. Security.** Token single-use & bound to user; new hash Argon2id; notify email. **15. Scalability.** Same screen reused for "force password change" admin action and expiring-password policies.

---

## AUTH-08 — Reset Success

Mirror of AUTH-04, sober tone: success check → "تم تحديث كلمة المرور" → single primary "تسجيل الدخول". Sessions-revoked notice: "قمنا بتسجيل خروجك من جميع الأجهزة لحمايتك".

---

## AUTH-09 — Profile Completion

**1. Purpose.** Enrich the verified student account with the data admissions and academics need — without blocking portal access.

**2. Target user.** New students post-activation; also reachable anytime from portal ("الملف الشخصي" + completion nudge).

**3. UX goals.** Feel optional but rewarding; show tangible progress; chunked sections; save every section independently (no giant lost form).

**4. Layout structure.** Portal shell (with nav), not the auth card: page title + **completion ring** ("٦٠٪ مكتمل") + section cards in a single column (max 720px). Each card: section title, fields, its own "حفظ" button that turns into saved-check. Sections: ① الصورة الشخصية ② المعلومات الأساسية ③ التعليم ④ معلومات الكنيسة ⑤ جهة اتصال للطوارئ ⑥ نبذة شخصية ⑦ المستندات (اختياري).

**5. Components.** Avatar uploader (drag-drop + tap, circular crop, client resize ≤512px, JPG/PNG/WebP ≤5MB, instant preview, remove) · date picker (dual: Gregorian input with localized display; typing allowed `dd/mm/yyyy`) · radio group (gender) · searchable selects (nationality; education level) · textarea with counter (bio ≤500 chars) · document uploader (PDF/JPG ≤10MB each, max 5 files, list with per-file progress, retry on failure, delete) · completion ring (animates on section save).

**6. Form fields.**

| Section | Field | Type | Rules |
|---|---|---|---|
| Photo | صورة شخصية | file | optional; formats above |
| Basic | الجنس | radio (ذكر/أنثى) | optional* |
| Basic | تاريخ الميلاد | date | optional*; age 15–100 sanity check |
| Basic | الجنسية | select | optional* |
| Education | المؤهل العلمي | select (ثانوي/بكالوريوس/ماجستير/دكتوراه/أخرى) | optional* |
| Education | التخصص / الجامعة | text | optional, ≤120 |
| Church | سنوات الخدمة، الخدمة الحالية، أب الاعتراف | text/number | optional, ≤120 |
| Emergency | الاسم، صلة القرابة، رقم الجوال | text/select/tel | all-or-none: if any filled, all three required |
| Bio | نبذة | textarea | ≤500 chars, counter |
| Documents | مستندات | files | optional; scanned for type/size |

\* "optional*" fields become **required** at program-application time — the application flow reuses these sections and enforces them there. The profile itself never blocks.

**7. Validation rules.** Per-section on save; date sanity; phone as registration; file type/size validated client + server (magic bytes, not extension).

**8. Interaction design.** Section save → optimistic check + ring increment animation; leaving with unsaved section → inline (not modal) "لديك تغييرات غير محفوظة" bar with حفظ/تجاهل; completion ring at 100% → one-time toast celebration.

**9. Accessibility.** Each section a labeled `<section>` with h2; uploader fully keyboard operable (button + file input) with upload progress announced; cropper has keyboard nudge controls; counters `aria-live=polite` at thresholds only (450/500).

**10. Responsive behavior.** Single column throughout; avatar uploader centers on mobile; documents list rows stack meta under filename <640px.

**11. Backend requirements.** Media stored outside web root (local `media/` in dev; S3-compatible in production — see Part 4); image files re-encoded server-side (EXIF stripped); per-section PATCH endpoints; completion % computed server-side from weighted required-for-application fields.

**12. Database fields.** `student_profiles`: `photo_path, gender, date_of_birth, nationality_code, education_level, education_field, church_service, confession_father, bio, emergency_name, emergency_relation, emergency_phone, completion_pct`. `student_documents`: `id, user_id, file_path, original_name, mime, size, uploaded_at, verified_by/at`.

**13. API requirements.** `GET /api/v1/students/me/profile` · `PATCH /api/v1/students/me/profile` (partial, per-section payloads) · `POST /api/v1/students/me/photo` (multipart) · `POST/DELETE /api/v1/students/me/documents`.

**14. Security.** Documents downloadable only by owner + admins holding `admissions.view`; signed URLs with expiry; AV-scan hook point on upload; size/count quotas per user.

**15. Scalability.** Sections are data-driven (section registry) so Admissions can later require new fields without redesign; documents table already supports verification workflow (`verified_by`).

---

## AUTH-10 — Account State Screens

Small family sharing one layout (icon + title + explanation + one action), reached from auth flows:

| State | Icon/tint | Copy essence | Action |
|---|---|---|---|
| Temporarily locked | clock / warning | "لحمايتك أوقفنا تسجيل الدخول مؤقتًا" + live countdown | "استعادة كلمة المرور" |
| Suspended | shield / danger | Suspended by administration; not an error by the user | "تواصل معنا" (contact) |
| Invitation expired | envelope / info | Link no longer valid (72h passed) | "طلب دعوة جديدة" → notifies Super Admin |
| Session expired (modal) | — | "انتهت الجلسة لحمايتك" | Re-login in-place modal preserving unsaved work (edge E4) |

All are indexed-noindex, require no auth, never disclose internal reasons beyond the category.
