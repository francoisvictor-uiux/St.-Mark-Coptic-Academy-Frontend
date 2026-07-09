# Part 3 — Screen Specifications: User & Role Management (Dashboard)

Dashboard shell context (applies to all screens below): sidebar 264px on the **start** side (right in RTL) with module nav filtered by the user's effective permissions; topbar with breadcrumb, global search, notifications, profile menu (incl. "Active sessions" and logout); content area on `creamy-100` with level-1 cards. Dense UI uses `--font-sans`; titles use Display. Empty/loading/error states specified per screen.

Screens: **ADM-01 Users List · ADM-02 Create/Edit Admin Drawer · ADM-03 User Detail · ADM-04 Roles List · ADM-05 Permission Matrix Editor · ADM-06 Audit Log**

---

## ADM-01 — Users List

**1. Purpose.** Single operational view of every account (admins + students) for holders of `users.view`; the launchpad for create/edit/deactivate/reset actions.

**2. Target user.** Super Admin (full) · Admins holding partial `users.*` (e.g. Admission Officer sees students only — scoped by rule: non-super-admins never see `super_admin` or `admin` rows unless granted `users.view` explicitly with admin scope).

**3. UX goals.** Find any user in <5s (search-first); state of every account readable at a glance (status badges); destructive actions deliberately slower than safe ones.

**4. Layout structure.** Page header: title "المستخدمون" + count + primary button "إضافة مسؤول" (visible only with `users.create`). Below: filter bar — search input (name/email, debounced 300ms) · type filter (الكل/مسؤولون/طلاب) · status filter (نشط/موقوف/بانتظار التحقق/مدعو) · role filter (multi) · "تصدير" ghost button (with `users.export`). Then the table card.

**5. Components.** Data table: Avatar+name (AR primary, EN caption) · Email (LTR) · Type badge · Roles (chips, +N overflow) · Status badge (نشط=success, موقوف=danger, بانتظار التحقق=warning, مدعو=info) · Last login (relative, tooltip absolute ISO) · Row actions kebab: عرض · تعديل · إعادة تعيين كلمة المرور · إيقاف/تفعيل · حذف (danger, separated). Pagination 25/page, server-side. Column sort: name, last login, created.

**6–7. Fields/validation.** Filters only; search min 2 chars.

**8. Interaction design.** Row click → ADM-03 detail. Deactivate → confirm modal stating live-session consequences ("سيتم تسجيل خروجه فورًا"). Delete → typed-confirmation modal (type email); soft-delete with 30-day restore (Super Admin sees "المحذوفون مؤخرًا" filter). Reset password → sends the user a reset email; never shows/sets a password inline. Bulk selection (checkbox column) enables bulk activate/deactivate/export — bulk delete deliberately **not** offered.

**9. Accessibility.** Table semantics with sortable-header `aria-sort`; kebab menus ARIA menu pattern; badges have text (not color-only); bulk bar announced; focus returns to invoking row after modal close.

**10. Responsive behavior.** ≥1024 full table · 640–1023 hides Last-login + Roles columns (visible in detail) · <640 card list rows (avatar, name, status badge, chevron) with filters in a bottom-sheet.

**11. Backend requirements.** Cursor-paginated list endpoint with q/type/status/role filters; scoping rule enforced in queryset (not just UI); export streams CSV (UTF-8 BOM for Excel-Arabic) and writes an audit entry.

**12. DB fields.** `users` core + `user_roles` join + `last_login_at` + soft-delete `deleted_at`.

**13. API.** `GET /api/v1/admin/users?q&type&status&role&cursor` · `PATCH /api/v1/admin/users/{id}/status {action: activate|deactivate}` · `POST /api/v1/admin/users/{id}/reset-password` · `DELETE /api/v1/admin/users/{id}` (soft) · `POST /api/v1/admin/users/export`. Every mutation requires the matching `users.*` permission server-side.

**14. Security.** All actions audited (actor, target, before/after); deactivation cascades to token revocation; export logged with row count; admins cannot act on accounts of equal-or-higher privilege (admin can't touch admin unless Super Admin).

**15. Scalability.** Table config-driven (column registry) so new columns (2FA status, program) slot in; saved-filter presets; scoped delegation (e.g. diocese-scoped user managers) supported by adding a scope column to `user_roles` (schema reserves it).

**Empty state.** Icon + "لا يوجد مستخدمون بعد" + primary "إضافة مسؤول". Filtered-empty: "لا نتائج لبحثك" + "مسح عوامل التصفية". **Loading:** 8 skeleton rows. **Error:** inline retry card, never a blank table.

---

## ADM-02 — Create / Edit Administrator (Drawer)

**1. Purpose.** Create admin accounts by invitation and edit existing ones — the only way admin accounts come into existence.

**2. Target user.** Super Admin (always); Admins with `users.create`/`users.edit` limited to student accounts (they do not see this drawer for admins).

**3. UX goals.** Impossible to create an admin without understanding what they'll be able to do — the live permission preview is the centerpiece.

**4. Layout structure.** 480px drawer from the end edge. Header: title ("إضافة مسؤول" / "تعديل {name}") + close. Body sections: ① الهوية — name AR (first/last), full name EN, email, mobile (optional) ② الأدوار — multi-select role chips + link "إنشاء دور جديد" (→ ADM-05, drawer state preserved) ③ **معاينة الصلاحيات** — read-only mini-matrix (modules as rows, granted actions as chips) recomputed live as roles toggle; guarded permissions marked with shield + amber note ④ خيارات — account expiry date (optional; for temporary staff), "إرسال الدعوة الآن" toggle (default on). Sticky footer: primary "إرسال الدعوة"/"حفظ" + ghost cancel.

**6. Form fields.** Identity fields validate as registration; email async-unique; ≥1 role required (error on save otherwise: "اختر دورًا واحدًا على الأقل").

**7. Validation rules.** Editing your own account here hides status/role controls (can't self-demote); editing another Super Admin allowed only for Super Admins; expiry date must be future.

**8. Interaction design.** Role chip toggle → preview matrix diff-highlights additions ~800ms (success tint) / removals (danger tint). Save (create) → invitation email with 72h set-password link; drawer closes; toast "admin.invited"; row appears status "مدعو" with resend/revoke actions. Save (edit) with role changes → confirm modal summarizing permission delta ("سيفقد الوصول إلى: الفعاليات ×"). Dirty-close guard.

**9. Accessibility.** Drawer focus-trapped, labeled by title; preview matrix is a described table, diff changes announced politely; chips are toggle buttons with `aria-pressed`.

**10. Responsive.** Full-screen sheet <640px; preview matrix collapses to per-module expandable rows.

**11. Backend.** Create: `users` row `status=invited`, no password; invitation token (signed, single-use, 72h) emailed; first successful set-password flips to `active`. Edit: role sync in a transaction; permission cache invalidated; delta audited.

**12. DB.** `users` (+`invited_by, invitation_sent_at, expires_at`) · `user_roles` · `invitation_tokens (or reuse otp_codes with purpose='invite' — decision in Part 4)`.

**13. API.** `POST /api/v1/admin/users {identity, role_ids[], expiry?}` → `201` · `PATCH /api/v1/admin/users/{id}` · `POST /api/v1/admin/users/{id}/resend-invite` · `POST /api/v1/admin/users/{id}/revoke-invite` · `GET /api/v1/admin/roles?with=permissions` (feeds preview).

**14. Security.** Invitation link single-use + expiring; set-password page enforces full password policy; guarded permissions grantable only when the actor is Super Admin (server-enforced); creating a user with `users.assign`-bearing roles requires Super Admin.

**15. Scalability.** Same drawer serves "edit student" with a reduced field set (type-driven form registry); expiry field enables visiting-staff workflows; future org-scoping slots into section ②.

---

## ADM-03 — User Detail

**1. Purpose.** 360° view of one account: identity, roles & effective permissions, activity, sessions, and documents (students).

**4. Layout.** Header card: avatar, names AR/EN, email, type + status badges, quick actions (تعديل، إيقاف، إعادة تعيين كلمة المرور). Tabs: **نظرة عامة** (profile data read-only) · **الأدوار والصلاحيات** (roles list + full effective-permission matrix, read-only with "تعديل" shortcut) · **النشاط** (this user's audit trail: logins, content actions; filterable) · **الجلسات** (active sessions: device, browser, IP, last seen — "إنهاء الجلسة" per row + "إنهاء جميع الجلسات") · **المستندات** (students: uploaded docs with preview/verify actions for `admissions.view` holders).

**8. Interaction.** Session termination immediate (revokes refresh token) with toast; verify-document marks `verified_by/at` with actor.

**11–13. Backend/API.** `GET /api/v1/admin/users/{id}` (+`?include=permissions,sessions`) · `GET /api/v1/admin/users/{id}/activity?cursor` · `DELETE /api/v1/admin/users/{id}/sessions/{sid}`. Activity reads from `audit_log` filtered by actor **or** target = user.

**14. Security.** Viewing another user's sessions/activity requires `users.view` + audit-logged itself (watch-the-watchers). IPs shown truncated to /24 for non-super-admins.

**15. Scalability.** Tabs are a registry — future tabs (enrollments, payments) plug in.

---

## ADM-04 — Roles List

**1. Purpose.** Inventory of system + custom roles; entry to the matrix editor.

**4. Layout.** Header: "الأدوار والصلاحيات" + primary "إنشاء دور" (`roles.create`). Grid of role cards (3-up desktop): role name (AR + EN), description, permission count ("١٨ صلاحية في ٦ وحدات"), member count avatars (+N), system-role lock badge for Super Admin/Admin/Student base roles. Card actions: تعديل · نسخ (duplicate as draft) · حذف (custom roles only).

**8. Interaction.** Delete blocked while members exist → dialog lists members with inline "نقل إلى دور آخر" reassignment picker; then typed-confirm. Duplicate opens editor prefilled ("نسخة من مدير المحتوى").

**11–13.** `GET/POST /api/v1/admin/roles` · `POST /api/v1/admin/roles/{id}/duplicate` · `DELETE /api/v1/admin/roles/{id}` → `409 {members[]}` when occupied.

**Empty state.** First-run shows seed-role suggestion cards ("ابدأ بأدوار جاهزة: مدير محتوى، مدير أبحاث…") — one-click create from templates (Part 0 §2.3).

---

## ADM-05 — Permission Matrix Editor

**1. Purpose.** Compose exactly what a role can do — the heart of the RBAC system.

**2. Target user.** Super Admin; Admins with `roles.edit` (cannot grant guarded permissions).

**3. UX goals.** A 20-module × 11-action grid that stays scannable; impossible to save an incoherent bundle (dependencies auto-resolved); changes reviewable before commit.

**4. Layout structure.** Header: role name (inline-editable) + description + members count link. Toolbar: search modules · "تحديد الكل" per visible set · view toggle (الكل / الممنوحة فقط). The matrix: sticky first column (module names, grouped: المحتوى، الأكاديمية، الفعاليات، النظام), sticky header row (11 action columns with icons+labels); cells = checkboxes (Part 1 §4.10); row-end "الكل" tri-state checkbox per module; unavailable module-action combos render as empty cells. System section (users/roles/settings/audit) visually separated with shield header and amber hairline.

**5. Components.** Matrix · module group accordions · tri-state row/column selectors · dependency chips (when `publish` auto-checks `edit`+`view`, chips appear on those cells: "مطلوبة للنشر") · sticky **diff footer** appearing on first change: "٥ إضافات · ٢ إزالة — مراجعة وحفظ".

**7. Validation rules.** Dependencies from Part 0 §2.2 enforced bidirectionally (unchecking `view` warns it will uncheck dependents — confirm inline). Guarded permissions: disabled+shield-tooltip for non-super-admins. Cannot strip your own role of `roles.edit` (self-lockout guard, server-checked too).

**8. Interaction design.** Save → review modal: two lists (تمت الإضافة / تمت الإزالة, grouped by module) + affected-user count → confirm → toast "role.saved {n}". Unsaved-changes route guard. Keyboard: arrow keys traverse the grid, Space toggles (ARIA grid pattern).

**9. Accessibility.** ARIA grid with row/column headers; cell state announced ("المقالات، نشر، ممنوحة"); tri-state announced as mixed; diff modal fully readable by SR; not color-only diffs (± icons).

**10. Responsive.** ≥1024 full grid (horizontal scroll within card, sticky column intact) · <1024 accordion-per-module with action checkbox list — matrix never squeezed below usable.

**11. Backend requirements.** `permissions` catalogue table seeds the grid (module, action, is_guarded, dependencies as JSON); role save = atomic replace of `role_permissions` + audit diff entry + permission-cache invalidation for all members (see Part 4 §5 caching).

**12. DB.** `roles, permissions, role_permissions, modules` (Part 4 schema).

**13. API.** `GET /api/v1/admin/permissions/catalog` · `GET /api/v1/admin/roles/{id}` → `{role, permission_ids[]}` · `PUT /api/v1/admin/roles/{id}/permissions {permission_ids[]}` → `200 {added[], removed[], affected_users}` | `422 dependency_violation` | `403 guarded_permission`.

**14. Security.** Server revalidates dependencies + guarded rules regardless of UI; every save audited with full before/after arrays; rate-limit saves (accidental scripting).

**15. Scalability.** New module = one catalogue row set → appears automatically. Future: permission **scopes** (own/diocese/all) render as a third dimension via per-cell popover — cell component designed with a slot for it. Role templates exportable/importable as JSON (`roles.export` future permission).

---

## ADM-06 — Audit Log

**1. Purpose.** Immutable, searchable record of every sensitive action — the accountability backbone.

**2. Target user.** Super Admin; `audit.view` holders.

**4. Layout.** Filter bar: date range picker · actor picker (user search) · module select · action select · target search. Timeline-table rows: timestamp (ISO) · actor (avatar+name) · sentence-form action ("منح دور *مدير الفعاليات* إلى *مينا س.*") · module chip · expandable detail (before/after JSON rendered as a readable diff table, IP, user-agent). Export button (`audit.export`) → CSV of current filter.

**7–8.** Read-only; rows expand inline; live "new events" pill when newer entries exist (poll 30s) — never auto-shifts rows under the reader. Retention notice in footer ("تُحفظ السجلات لمدة ٢٤ شهرًا").

**9. Accessibility.** Expandable rows are buttons with `aria-expanded`; diffs presented as tables, not color-only JSON.

**11–13. Backend/API.** Append-only `audit_log` (no UPDATE/DELETE grants to the app role — enforced at DB level); `GET /api/v1/admin/audit?actor&module&action&from&to&cursor` · `POST /api/v1/admin/audit/export`. What gets logged (minimum): all auth events, all `users.* roles.* settings.*` mutations, publish/approve/delete on content, exports, permission-denied attempts on guarded endpoints.

**14. Security.** Log access is itself logged; PII in payload snapshots minimized (ids + labels, not full documents); exports watermarked with requesting actor + timestamp.

**15. Scalability.** Partition by month in PostgreSQL when volume grows; stream to external SIEM later via outbox pattern; anomaly badges ("١٢ محاولة دخول فاشلة") as computed insights layer on top.
