/**
 * Typed client for the Django auth API (docs/auth-spec/04-backend-django.md §3).
 * Requests go through the Next.js rewrite proxy, so the refresh cookie is
 * first-party. The access token lives in module memory only — never storage.
 */

export type ApiUser = {
  id: string;
  email: string;
  user_type: "super_admin" | "admin" | "student";
  first_name_ar: string;
  last_name_ar: string;
  name_ar: string;
  full_name_en: string;
  locale: string;
  permissions: string[];
};

export type RegistrationOptions = {
  dioceses: { id: string; name_ar: string; name_en: string; country_code: string }[];
  churches: { id: string; diocese_id: string; name_ar: string; name_en: string; city: string }[];
  programs: { id: string; slug: string; name_ar: string; name_en: string }[];
  genders: { value: string; label_ar: string }[];
  education_levels: { value: string; label_ar: string }[];
};

export class ApiError extends Error {
  code: string;
  messageAr: string;
  messageEn: string;
  status: number;
  fields: Record<string, string[]>;

  constructor(status: number, body: unknown) {
    const err = (body as { error?: Record<string, unknown> })?.error ?? {};
    const messageEn = typeof err.message_en === "string" ? err.message_en : "Something went wrong";
    super(messageEn);
    this.status = status;
    this.code = typeof err.code === "string" ? err.code : "error";
    this.messageEn = messageEn;
    this.messageAr = typeof err.message_ar === "string" ? err.message_ar : "حدث خطأ ما";
    this.fields = (err.fields as Record<string, string[]>) ?? {};
  }

  localized(locale: string) {
    return locale === "ar" ? this.messageAr : this.messageEn;
  }
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

/** localStorage hint so guests never fire a doomed silent-refresh request. */
const SESSION_HINT = "smca_session";

export function markSession(active: boolean) {
  try {
    if (active) localStorage.setItem(SESSION_HINT, "1");
    else localStorage.removeItem(SESSION_HINT);
  } catch {
    /* storage unavailable (private mode) — silent refresh just won't persist */
  }
}

export function hasSessionHint() {
  try {
    return localStorage.getItem(SESSION_HINT) === "1";
  } catch {
    return false;
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "X-Requested-With": "XMLHttpRequest",
    // FormData sets its own multipart boundary — only JSON gets the header.
    ...(typeof init.body === "string" ? { "Content-Type": "application/json" } : {}),
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (init.auth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  const res = await fetch(`/api/v1${path}`, { ...init, headers, credentials: "same-origin" });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

/** Retry an authenticated call once after a silent refresh on 401. */
async function authed<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    return await request<T>(path, { ...init, auth: true });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && hasSessionHint()) {
      await refresh();
      return request<T>(path, { ...init, auth: true });
    }
    throw error;
  }
}

/** Authenticated call with silent-refresh retry — building block for admin APIs. */
export function authedRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return authed<T>(path, init);
}

type LoginResponse = { access: string; user: ApiUser };

export async function login(identifier: string, password: string, rememberMe: boolean) {
  const data = await request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password, remember_me: rememberMe }),
  });
  setAccessToken(data.access);
  markSession(true);
  return data.user;
}

export async function refresh() {
  const data = await request<{ access: string }>("/auth/refresh", { method: "POST" });
  setAccessToken(data.access);
  return data.access;
}

export async function logout() {
  try {
    await request<void>("/auth/logout", { method: "POST" });
  } finally {
    setAccessToken(null);
    markSession(false);
  }
}

export function me() {
  return authed<ApiUser>("/auth/me");
}

export function checkEmail(email: string) {
  return request<{ available: boolean }>("/auth/check-email", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export type RegisterPayload = {
  email: string;
  password: string;
  first_name_ar: string;
  last_name_ar: string;
  full_name_en: string;
  phone?: string;
  locale: string;
  terms_accepted: boolean;
  country_code?: string;
  diocese_id?: string | null;
  church_id?: string | null;
  church_other_text?: string;
  program_interest_id?: string | null;
};

export function register(payload: RegisterPayload) {
  return request<{ user_id: string; verification: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyEmail(email: string, code: string) {
  const data = await request<LoginResponse>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });
  setAccessToken(data.access);
  markSession(true);
  return data.user;
}

export function resendOtp(email: string, purpose: "email_verify" | "password_reset" = "email_verify") {
  return request<{ sent: boolean }>("/auth/resend-otp", {
    method: "POST",
    body: JSON.stringify({ email, purpose }),
  });
}

export function forgotPassword(email: string) {
  return request<{ sent: boolean }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function verifyResetCode(email: string, code: string) {
  return request<{ reset_token: string }>("/auth/verify-reset-code", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });
}

export function resetPassword(resetToken: string, password: string) {
  return request<{ changed: boolean }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ reset_token: resetToken, password }),
  });
}

export function registrationOptions() {
  return request<RegistrationOptions>("/meta/registration-options");
}
