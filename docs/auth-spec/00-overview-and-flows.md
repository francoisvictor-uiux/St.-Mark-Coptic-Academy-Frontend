# St. Mark Coptic Academy — Authentication & User Management UX Specification

**Part 0 — Overview, Roles, Journeys & Flows**
Version 1.0 · 2026-07-08 · Stack decisions: **Django + DRF · PostgreSQL · Email-verification activation · Gmail SMTP (initial)**

This specification set contains five documents:

| File | Contents |
|---|---|
| `00-overview-and-flows.md` | Roles, RBAC model, user journeys, all flows, session management, security, edge cases, message catalogue |
| `01-design-system.md` | Typography, spacing, grid, every component spec, color usage, dark-mode readiness, RTL rules |
| `02-screens-auth.md` | Login, Registration, OTP, Forgot Password, Profile Completion — full 15-point screen specs |
| `03-screens-admin.md` | User Management, Admin Creation, Roles & Permission Matrix, Audit Log — full 15-point screen specs |
| `04-backend-django.md` | Django/DRF architecture, PostgreSQL schema, API contract, security hardening, scalability |

---

## 1. Design Principles

1. **Quiet prestige.** The auth experience is the front door of an academic institution. No gradients-on-gradients, no stock illustrations. Warm parchment surfaces (`creamy`), deep manuscript brown (`brown-900`), a single ceremonial accent (`red-500`), generous whitespace, serif typography. Inspiration: Oxford's application portal restraint + Stripe Dashboard's form clarity + Apple's focus on one task per screen.
2. **One decision per screen.** Registration is a wizard, not a wall of 14 fields. Login shows nothing it doesn't need.
3. **Arabic-first, English-equal.** Every layout is designed in RTL first and mirrored to LTR — never the reverse. Numerals, emails, phone numbers, and passwords are always LTR islands inside RTL layouts.
4. **Errors teach, never blame.** Every error states what happened + what to do next. No "Invalid input."
5. **Trust is visible.** Lock iconography on password fields, explicit session messaging, "last login" surfacing, visible audit trail for admins.
6. **Design for the permission system, not around it.** Every admin screen renders from the user's effective permission set. UI hides what you cannot do; API enforces it regardless.

---

## 2. User Types & RBAC Model

### 2.1 Role hierarchy

```
Super Admin  (system role, cannot be deleted, min. 1 must always exist)
   └── Admin (system role, capabilities defined by assigned custom roles)
         └── Custom roles: Content Editor, Research Manager, Library Manager,
             Events Manager, Admission Officer, Moderator, … (created by Super Admin)
Student      (system role, self-registration)
```

- **Account type** (`user_type`): `super_admin | admin | student`. Determines which portal shell the user lands in.
- **Roles** are named bundles of permissions. A user can hold **multiple roles**; effective permissions = union of all role permissions ∪ direct user-level permission overrides.
- **Permissions** are atomic strings: `<module>.<action>` — e.g. `articles.publish`, `users.create`, `settings.edit`.

### 2.2 Modules × Actions matrix (initial)

Actions vocabulary: `view · create · edit · delete · publish · approve · export · import · assign · archive · restore`

| Module | view | create | edit | delete | publish | approve | export | import | assign | archive | restore |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `articles` | ● | ● | ● | ● | ● | ● | ● | — | — | ● | ● |
| `research` (papers) | ● | ● | ● | ● | ● | ● | ● | — | — | ● | ● |
| `theses` (Master's) | ● | ● | ● | ● | ● | ● | ● | — | — | ● | ● |
| `dissertations` (PhD) | ● | ● | ● | ● | ● | ● | ● | — | — | ● | ● |
| `books` | ● | ● | ● | ● | ● | — | ● | ● | — | ● | ● |
| `events` | ● | ● | ● | ● | ● | ● | ● | — | — | ● | ● |
| `news` | ● | ● | ● | ● | ● | — | — | — | — | ● | ● |
| `pages` (website) | ● | ● | ● | ● | ● | — | — | — | — | — | — |
| `homepage` | ● | — | ● | — | ● | — | — | — | — | — | — |
| `media` | ● | ● | ● | ● | — | — | — | ● | — | — | — |
| `categories` | ● | ● | ● | ● | — | — | — | — | — | — | — |
| `programs` | ● | ● | ● | ● | ● | — | — | — | — | ● | ● |
| `admissions` | ● | — | ● | — | — | ● | ● | — | ● | — | — |
| `faqs` | ● | ● | ● | ● | ● | — | — | — | — | — | — |
| `contact` | ● | — | ● | — | — | — | ● | — | — | — | — |
| `menus` | ● | ● | ● | ● | — | — | — | — | — | — | — |
| `users` | ● | ● | ● | ● | — | ● | ● | — | ● | — | — |
| `roles` | ● | ● | ● | ● | — | — | — | — | ● | — | — |
| `settings` | ● | — | ● | — | — | — | — | — | — | — | — |
| `analytics` | ● | — | — | — | — | — | ● | — | — | — | — |
| `audit` | ● | — | — | — | — | — | ● | — | — | — | — |

Rules:
- The matrix is **data, not code**: modules and their allowed actions live in the DB so new modules appear in the permission UI without redeploying.
- `users.*`, `roles.*`, `settings.edit`, `audit.view` are **guarded permissions**: only Super Admin can grant them, and they trigger a confirmation dialog when assigned.
- Super Admin implicitly holds every permission; the matrix editor is read-only for the Super Admin's own role.
- Dependent actions: granting `edit` auto-suggests `view`; `publish` requires `edit`; `restore` requires `archive` visibility. The UI enforces these as soft dependencies (auto-check + explain), the API validates them.

### 2.3 Suggested seed roles

| Role | Permission bundle (summary) |
|---|---|
| **Content Editor** | articles/news/pages/faqs: view·create·edit; media: view·create |
| **Research Manager** | research/theses/dissertations: full incl. publish·approve·archive |
| **Library Manager** | books: full incl. import; categories: view·create·edit |
| **Events Manager** | events: full; media: view·create |
| **Admission Officer** | admissions: view·edit·approve·export·assign; programs: view |
| **Moderator** | all content modules: view·approve; no create/delete |

---

## 3. User Journeys

### 3.1 Student — first contact to enrolled

```
Public site → "Register" CTA → Registration wizard (3 steps)
→ Email OTP verification → Account active → Welcome screen
→ Profile completion prompt (skippable, progress-tracked)
→ Browse programs → Apply → Application tracked in portal
→ Notifications (email + in-portal) on application status
```

Emotional arc: *curiosity → confidence (clear wizard) → accomplishment (verified) → belonging (personalized portal greeting with Arabic name).*

### 3.2 Admin — invited to productive

```
Super Admin creates account (assigns roles) → System emails invitation
→ Admin opens invite link (time-boxed, 72h) → Sets own password
→ First login → forced onto dashboard tour highlighting only permitted modules
→ Works within permission boundary; forbidden areas are absent from nav
```

Admins never self-register. There is no "register as admin" path anywhere in public UI.

### 3.3 Super Admin — governance loop

```
Login (+ mandatory 2FA once available) → Dashboard
→ Users table → create/edit/deactivate admins
→ Roles screen → compose permission matrices → assign
→ Audit log → filter by actor/module/date → export
```

---

## 4. Flows

### 4.1 Authentication flow (all roles, single login screen)

```
[Login screen]
  → submit(email|username, password)
  → API validates
      ├─ invalid credentials → inline error, attempt counter++ (silent)
      ├─ 5 failed attempts / 15 min → account temporarily locked (15 min) → locked state screen
      ├─ email not yet verified → redirect to OTP verification screen (resend available)
      ├─ account deactivated by admin → dedicated "account suspended" state with contact link
      └─ success
          → issue access JWT (15 min) + refresh token (httpOnly cookie; 7d, or 30d if "Remember me")
          → route by user_type:
              student      → /portal
              admin        → /dashboard
              super_admin  → /dashboard (with governance nav visible)
```

- One login screen for everyone. **Do not** build a separate admin login URL with different branding — role routing happens after authentication. (Optionally serve the dashboard under `/dashboard` and let deep-links redirect through login with `?next=`.)
- Google/Microsoft SSO buttons are specified in the login screen spec as **phase 2, feature-flagged** — layout reserves space so enabling them later doesn't reflow the design.

### 4.2 Registration flow (students only)

```
Step 1 — Account            Step 2 — Academic identity      Step 3 — Verify
 first name (AR)             country                          6-digit OTP emailed
 last name (AR)              church                           10-min expiry
 full name (EN)              diocese                          resend w/ 60s cooldown
 email                       program of interest              3 wrong codes → new code required
 mobile (E.164, optional     ────────────────────
   phone OTP = phase 2)
 password + confirm
 T&C + Privacy checkboxes
```

- Progress indicator: 3 steps, labeled, clickable backwards only.
- Data persists per step (draft saved client-side; account row created at end of Step 2 in `pending_verification` status).
- On OTP success → status `active`, auto-login, → **Success screen** → **Profile completion** prompt.
- Duplicate email at Step 1 is caught on blur (async check) — not at the end.
- Per decision: **no manual approval gate** — email verification alone activates the student account. (The `pending_approval` status still exists in the schema for future toggling; see backend doc.)

### 4.3 Forgot-password flow

```
[Enter email] → always show neutral confirmation ("If this email exists…")
→ email with 6-digit code (15-min expiry, single-use)
→ [Enter code] (5 attempts max → invalidate + restart)
→ [New password + confirm] (strength meter; can't reuse last 3 passwords)
→ [Success] → all other sessions revoked → prompt to login
```

### 4.4 Admin creation flow (Super Admin)

```
Users → "Add administrator"
→ Drawer: name (AR/EN), email, mobile, role(s) multi-select, expiry date (optional)
→ Preview of effective permissions (live union, read-only matrix)
→ Create → invitation email with set-password link (72h token)
→ Row appears as "Invited" until first login → then "Active"
→ Re-send / revoke invitation from row actions
```

### 4.5 Role assignment flow

```
Roles → select role → matrix editor (modules × actions checkboxes)
→ dependency auto-checks (edit ⇒ view) with inline explanation chips
→ Save → confirmation modal shows DIFF of changes + count of affected users
→ audit entry written; affected users' permission cache invalidated immediately
Assign: from user drawer (roles multi-select) OR from role screen ("Members" tab)
```

### 4.6 Approval flow (content, not accounts)

Student accounts skip approval (per decision), but content and admissions use a shared approval pattern:

```
Draft → Submitted for review → (Approver with <module>.approve)
  ├─ Approve → Published/Accepted (+ notification to author)
  └─ Request changes → back to Draft with required comment
```

### 4.7 Session management

| Aspect | Specification |
|---|---|
| Access token | JWT, 15 min, held in memory (never localStorage) |
| Refresh token | httpOnly + Secure + SameSite=Lax cookie; rotated on every refresh; reuse detection revokes the whole family |
| "Remember me" | refresh lifetime 7 days → 30 days |
| Idle timeout (dashboard) | 30 min inactivity → modal warning at 28 min ("Extend session?") → auto-logout |
| Concurrent sessions | allowed; "Active sessions" list in profile with device/browser/IP + "sign out" per session and "sign out everywhere" |
| Password change / reset | revokes all refresh tokens except (on change) the current one |
| Deactivation by admin | immediate: refresh revoked + permission cache cleared; access token dies within ≤15 min, sensitive endpoints double-check `is_active` |

### 4.8 Security considerations (UX-visible)

- Neutral messaging on login failure and forgot-password (never reveal whether an email exists).
- Progressive throttling: attempts 1–4 instant, 5th → 15-min lock with clear countdown; lock message identical whether the account exists or not.
- Password policy: min 10 chars, must not contain email local-part, checked against breached-password list (zxcvbn-style meter, score ≥ 3 required). Show a live 4-segment strength meter — never a wall of unchecked rule bullets.
- OTP codes: 6 digits, hashed at rest, single-use, rate-limited (max 5 sends/hour/identity).
- All auth pages: no third-party trackers, autocomplete attributes set correctly, paste **allowed** in password fields (NIST 800-63B).
- Full server-side catalogue in `04-backend-django.md`.

---

## 5. Edge Cases Catalogue

| # | Case | Handling |
|---|---|---|
| E1 | Registering with an email that exists but is unverified | Offer "Resend verification" instead of generic duplicate error |
| E2 | OTP email lands in spam | Verification screen shows "Check spam folder" hint after 30 s + resend |
| E3 | User closes tab mid-wizard | Steps 1–2 draft restored from sessionStorage on return (except passwords) |
| E4 | Token expiry mid-form (dashboard) | Silent refresh; if refresh fails, modal login-in-place preserving unsaved work |
| E5 | Admin deactivated while logged in | Next API call → 401 with reason `account_disabled` → suspended screen |
| E6 | Super Admin tries to delete/deactivate themselves | Blocked with explanation; must transfer or use another Super Admin |
| E7 | Last Super Admin demotion attempt | Blocked at API + UI (button disabled with tooltip) |
| E8 | Role deleted while users hold it | Soft-delete only; must reassign members first (blocking dialog lists them) |
| E9 | Student applies, then changes email | Re-verification required; applications remain linked via user id |
| E10 | Mobile number entered with Arabic-Indic digits (٠١٢…) | Normalize to ASCII digits on input, display as typed |
| E11 | Very long Arabic names | Inputs and cards must not truncate; min 100-char capacity, ellipsis + tooltip in tables |
| E12 | Slow network on OTP submit | Button enters loading ≤100 ms, disable resubmit, 10 s timeout → retriable error |
| E13 | Two tabs, logout in one | BroadcastChannel syncs logout to all tabs instantly |
| E14 | Invitation link opened after expiry (72 h) | Friendly expiry screen with "Request new invitation" that notifies Super Admin |
| E15 | Browser autotranslate mangling Arabic UI | `translate="no"` on brand names and codes (OTP inputs) |

---

## 6. Message Catalogue (AR primary / EN)

**Validation (inline, under field):**

| Key | AR | EN |
|---|---|---|
| required | هذا الحقل مطلوب | This field is required |
| email.invalid | يرجى إدخال بريد إلكتروني صحيح | Please enter a valid email address |
| email.taken | هذا البريد مسجّل بالفعل — هل تريد تسجيل الدخول؟ | This email is already registered — sign in instead? |
| password.weak | كلمة المرور ضعيفة — أضف كلمات أطول أو رموزًا | Password is too weak — try a longer phrase |
| password.mismatch | كلمتا المرور غير متطابقتين | Passwords don't match |
| phone.invalid | يرجى إدخال رقم جوال صحيح مع رمز الدولة | Enter a valid mobile number with country code |
| terms.required | يجب الموافقة على الشروط وسياسة الخصوصية للمتابعة | You must accept the Terms and Privacy Policy to continue |

**Auth errors (banner above form):**

| Key | AR | EN |
|---|---|---|
| login.invalid | البريد الإلكتروني أو كلمة المرور غير صحيحة | Incorrect email or password |
| login.locked | تم إيقاف تسجيل الدخول مؤقتًا لمدة ١٥ دقيقة بعد محاولات متكررة | Sign-in temporarily paused for 15 minutes after repeated attempts |
| login.suspended | تم تعليق هذا الحساب. تواصل مع إدارة الأكاديمية | This account is suspended. Please contact the Academy office |
| otp.wrong | الرمز غير صحيح — تبقّى {n} محاولات | Incorrect code — {n} attempts remaining |
| otp.expired | انتهت صلاحية الرمز — أرسلنا رمزًا جديدًا | Code expired — we've sent a new one |
| session.expired | انتهت الجلسة لحمايتك — سجّل الدخول للمتابعة | Your session ended to keep you safe — sign in to continue |

**Success:**

| Key | AR | EN |
|---|---|---|
| register.done | أهلًا بك في أكاديمية القديس مارمرقس القبطية 🎓 تم تفعيل حسابك | Welcome to St. Mark Coptic Academy 🎓 Your account is active |
| reset.done | تم تحديث كلمة المرور بنجاح | Your password has been updated |
| profile.saved | تم حفظ ملفك الشخصي | Your profile has been saved |
| admin.invited | تم إرسال الدعوة إلى {email} | Invitation sent to {email} |
| role.saved | تم حفظ الدور وتحديث صلاحيات {n} مستخدمين | Role saved — permissions updated for {n} users |

Tone rules: Arabic uses formal-warm register (فصحى مبسطة), never machine-translated. Numbers in Arabic UI use Western digits for codes/phones (LTR islands) and may use Arabic-Indic for decorative counts. No exclamation marks in errors. Success messages may carry one emotive touch max.
