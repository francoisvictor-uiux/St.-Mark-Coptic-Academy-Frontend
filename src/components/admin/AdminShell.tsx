"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import LogoMark from "@/components/ui/LogoMark";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/admin-api";
import { SpinnerIcon } from "@/components/auth/icons";

/* ─── Toasts ─── */

type Toast = { id: number; tone: "success" | "danger" | "info"; text: string };
const ToastContext = createContext<{ toast: (tone: Toast["tone"], text: string) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside AdminShell");
  return ctx.toast;
}

const toastStyles = {
  success: "bg-success-tint text-success border-success/30",
  danger: "bg-danger-tint text-danger border-danger/30",
  info: "bg-blue-50 text-blue-500 border-blue-500/30",
};

/* ─── Shell ─── */

const NAV = [
  { href: "/admin/articles", key: "articles", permission: "articles.view" },
  { href: "/admin/news", key: "news", permission: "news.view" },
  { href: "/admin/events", key: "events", permission: "events.view" },
  { href: "/admin/media", key: "media", permission: "media.view" },
  { href: "/admin/categories", key: "categories", permission: "categories.view" },
  { href: "/admin/faqs", key: "faqs", permission: "faqs.view" },
  { href: "/admin/pages", key: "pages", permission: "pages.view" },
  { href: "/admin/programs-admin", key: "programs", permission: "programs.view" },
  { href: "/admin/theses-admin", key: "theses", permission: "theses.view" },
  { href: "/admin/homepage", key: "homepage", permission: "homepage.view" },
  { href: "/admin/users", key: "users", permission: "users.view" },
  { href: "/admin/roles", key: "roles", permission: "roles.view" },
  { href: "/admin/audit", key: "audit", permission: "audit.view" },
] as const;

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("admin.shell");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { user, status, signOut } = useAuth();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((tone: Toast["tone"], text: string) => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-2), { id, tone, text }]);
    setTimeout(() => setToasts((list) => list.filter((item) => item.id !== id)), tone === "danger" ? 8000 : 4000);
  }, []);

  useEffect(() => {
    if (status === "guest") router.replace("/login");
    else if (status === "authed" && user?.user_type === "student") router.replace("/portal");
  }, [status, user, router]);

  if (status !== "authed" || !user || user.user_type === "student") {
    return (
      <main className="flex min-h-svh items-center justify-center bg-surface">
        <SpinnerIcon className="size-6 text-brown-300" />
      </main>
    );
  }

  const visibleNav = NAV.filter((item) => can(user, item.permission));
  const otherLocale = locale === "ar" ? "en" : "ar";

  return (
    <ToastContext.Provider value={{ toast }}>
      <div className="flex min-h-svh bg-surface font-sans text-brown-900">
        {/* Sidebar — start side (right in RTL, spec Part 1 §3) */}
        <aside className="sticky top-0 hidden h-svh w-[264px] shrink-0 flex-col border-e border-line bg-card md:flex">
          <Link href="/" className="flex items-center gap-3 px-6 py-6">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-500">
              <LogoMark className="size-5 text-creamy-100" />
            </span>
            <span className="font-serif text-[15px] font-bold leading-tight">{t("title")}</span>
          </Link>
          <nav className="flex flex-1 flex-col gap-1 px-3">
            {visibleNav.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-xl px-4 py-2.5 text-[14.5px] transition-colors ${
                    active
                      ? "bg-brown-500 font-bold text-creamy-100"
                      : "text-brown-400 hover:bg-creamy-200 hover:text-brown-900"
                  }`}
                >
                  {t(`nav.${item.key}`)}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-line px-6 py-4">
            <p className="truncate text-[13px] font-bold">{user.name_ar || user.full_name_en}</p>
            <p className="text-[12px] text-brown-300">{t(`types.${user.user_type}` as "types.admin")}</p>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                router.push("/login");
              }}
              className="mt-3 text-[13px] font-bold text-danger hover:underline"
            >
              {t("signOut")}
            </button>
          </div>
        </aside>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center justify-between gap-4 border-b border-line bg-card px-4 md:px-8">
            {/* Mobile nav */}
            <nav className="flex gap-1 md:hidden">
              {visibleNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-1.5 text-[13px] ${
                    pathname.startsWith(item.href) ? "bg-brown-500 font-bold text-creamy-100" : "text-brown-400"
                  }`}
                >
                  {t(`nav.${item.key}`)}
                </Link>
              ))}
            </nav>
            <div className="hidden text-[13px] text-brown-300 md:block">{t("breadcrumb")}</div>
            <Link
              href={pathname}
              locale={otherLocale}
              className="rounded-full border border-line px-3 py-1 text-[13px] font-bold text-brown-400 hover:border-brown-400"
            >
              {otherLocale === "ar" ? "ع" : "EN"}
            </Link>
          </header>
          <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
        </div>

        {/* Toasts — bottom-start (spec Part 1 §4.5) */}
        <div className="pointer-events-none fixed bottom-6 start-6 z-50 flex flex-col gap-2">
          {toasts.map((item) => (
            <div
              key={item.id}
              role="status"
              className={`pointer-events-auto rounded-xl border px-4 py-3 font-sans text-[14px] shadow-[0_8px_24px_rgba(36,17,15,0.08)] ${toastStyles[item.tone]}`}
            >
              {item.text}
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
