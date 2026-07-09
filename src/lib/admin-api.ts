/** Typed client for the admin console APIs (spec Part 3 + Part 4 §3). */

import { authedRequest, type ApiUser } from "./api";

export type Paginated<T> = { results: T[]; next: string | null; previous: string | null };

export type RoleChip = { id: string; slug: string; name_ar: string; name_en: string; is_system: boolean };

export type AdminUser = {
  id: string;
  email: string;
  first_name_ar: string;
  last_name_ar: string;
  name_ar: string;
  full_name_en: string;
  user_type: "super_admin" | "admin" | "student";
  status: "pending_verification" | "active" | "suspended" | "invited" | "pending_approval";
  roles: RoleChip[];
  last_login: string | null;
  created_at: string;
};

export type AdminUserDetail = AdminUser & {
  phone: string;
  locale: string;
  email_verified_at: string | null;
  invitation_sent_at: string | null;
  account_expires_at: string | null;
  invited_by_label: string;
  permissions: string[];
  deleted_at: string | null;
};

export type Role = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  description: string;
  is_system: boolean;
  member_count: number;
  permission_count: number;
  created_at: string;
  permission_ids?: string[];
};

export type CatalogPermission = {
  id: string;
  action: string;
  code: string;
  is_guarded: boolean;
  depends_on: string[];
};

export type CatalogModule = {
  key: string;
  name_ar: string;
  name_en: string;
  group: "content" | "academic" | "events" | "system";
  sort_order: number;
  permissions: CatalogPermission[];
};

export type AuditEntry = {
  id: string;
  actor_id: string | null;
  actor_label: string;
  action: string;
  module: string;
  target_type: string;
  target_id: string;
  target_label: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string;
  created_at: string;
};

export type SessionRow = { id: string; created_at: string; expires_at: string; is_current: boolean };

export function can(user: ApiUser | null, code: string): boolean {
  if (!user) return false;
  if (user.user_type === "super_admin") return true;
  return user.permissions.includes(code);
}

function qs(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

function json(body: unknown): RequestInit {
  return { method: "POST", body: JSON.stringify(body) };
}

// ─── Users (ADM-01/02/03) ───

export function listUsers(params: {
  q?: string; type?: string; status?: string; role?: string; cursor?: string;
}) {
  return authedRequest<Paginated<AdminUser>>(`/admin/users${qs(params)}`);
}

export type CreateAdminPayload = {
  email: string;
  first_name_ar: string;
  last_name_ar: string;
  full_name_en: string;
  phone?: string;
  role_ids: string[];
  account_expires_at?: string | null;
};

export function createAdmin(payload: CreateAdminPayload) {
  return authedRequest<AdminUserDetail>("/admin/users", json(payload));
}

export function getUser(id: string) {
  return authedRequest<AdminUserDetail>(`/admin/users/${id}`);
}

export function updateUser(id: string, payload: Partial<CreateAdminPayload>) {
  return authedRequest<AdminUserDetail>(`/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteUser(id: string) {
  return authedRequest<void>(`/admin/users/${id}`, { method: "DELETE" });
}

export function setUserStatus(id: string, action: "activate" | "deactivate") {
  return authedRequest<AdminUserDetail>(`/admin/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ action }),
  });
}

export function resetUserPassword(id: string) {
  return authedRequest<{ sent: boolean }>(`/admin/users/${id}/reset-password`, { method: "POST" });
}

export function resendInvite(id: string) {
  return authedRequest<{ sent: boolean }>(`/admin/users/${id}/resend-invite`, { method: "POST" });
}

export function revokeInvite(id: string) {
  return authedRequest<{ revoked: number }>(`/admin/users/${id}/revoke-invite`, { method: "POST" });
}

export function userActivity(id: string, cursor?: string) {
  return authedRequest<Paginated<AuditEntry>>(`/admin/users/${id}/activity${qs({ cursor })}`);
}

export function userSessions(id: string) {
  return authedRequest<{ sessions: SessionRow[] }>(`/admin/users/${id}/sessions`);
}

export function revokeSession(id: string, sessionId: string) {
  return authedRequest<void>(`/admin/users/${id}/sessions/${sessionId}`, { method: "DELETE" });
}

export function revokeAllSessions(id: string) {
  return authedRequest<{ revoked: number }>(`/admin/users/${id}/sessions`, { method: "DELETE" });
}

// ─── Roles + catalog (ADM-04/05) ───

export function permissionCatalog() {
  return authedRequest<{ modules: CatalogModule[] }>("/admin/permissions/catalog");
}

export function listRoles(withPermissions = false) {
  return authedRequest<{ roles: Role[] }>(`/admin/roles${withPermissions ? "?with=permissions" : ""}`);
}

export function createRole(payload: { name_ar: string; name_en: string; description?: string }) {
  return authedRequest<Role>("/admin/roles", json(payload));
}

export function getRole(id: string) {
  return authedRequest<Role & { permission_ids: string[] }>(`/admin/roles/${id}`);
}

export function updateRole(id: string, payload: { name_ar?: string; name_en?: string; description?: string }) {
  return authedRequest<Role>(`/admin/roles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteRole(id: string) {
  return authedRequest<void>(`/admin/roles/${id}`, { method: "DELETE" });
}

export function putRolePermissions(id: string, permissionIds: string[]) {
  return authedRequest<{ added: string[]; removed: string[]; affected_users: number }>(
    `/admin/roles/${id}/permissions`,
    { method: "PUT", body: JSON.stringify({ permission_ids: permissionIds }) },
  );
}

export function duplicateRole(id: string) {
  return authedRequest<Role>(`/admin/roles/${id}/duplicate`, { method: "POST" });
}

// ─── Audit (ADM-06) ───

export function auditList(params: {
  module?: string; action?: string; q?: string; from?: string; to?: string; cursor?: string;
}) {
  return authedRequest<Paginated<AuditEntry>>(`/admin/audit${qs(params)}`);
}

// ─── Invite acceptance (public) ───

export async function acceptInvite(token: string, password: string) {
  const res = await fetch("/api/v1/auth/accept-invite", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
    credentials: "same-origin",
    body: JSON.stringify({ token, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const { ApiError } = await import("./api");
    throw new ApiError(res.status, body);
  }
  const { setAccessToken, markSession } = await import("./api");
  setAccessToken(body.access);
  markSession(true);
  return body.user as ApiUser;
}
