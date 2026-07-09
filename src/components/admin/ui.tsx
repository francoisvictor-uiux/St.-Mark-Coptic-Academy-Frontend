"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SpinnerIcon } from "@/components/auth/icons";
import type { RoleChip } from "@/lib/admin-api";

/* ─── Badges ─── */

const STATUS_STYLES: Record<string, string> = {
  active: "bg-success-tint text-success",
  suspended: "bg-danger-tint text-danger",
  pending_verification: "bg-warning-tint text-warning",
  invited: "bg-blue-50 text-blue-500",
  pending_approval: "bg-warning-tint text-warning",
};

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("admin.status");
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-[12px] font-bold ${STATUS_STYLES[status] ?? "bg-creamy-300 text-brown-500"}`}>
      {t(status as "active")}
    </span>
  );
}

export function TypeBadge({ type }: { type: string }) {
  const t = useTranslations("admin.shell.types");
  const style =
    type === "super_admin"
      ? "bg-brown-500 text-creamy-100"
      : type === "admin"
        ? "bg-creamy-400 text-brown-500"
        : "bg-creamy-200 text-brown-400";
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-[12px] font-bold ${style}`}>
      {t(type as "admin")}
    </span>
  );
}

export function RoleChips({ roles, max = 2 }: { roles: RoleChip[]; max?: number }) {
  const locale = useLocale();
  if (roles.length === 0) return <span className="text-[12px] text-brown-200">—</span>;
  const shown = roles.slice(0, max);
  return (
    <span className="flex flex-wrap items-center gap-1">
      {shown.map((role) => (
        <span key={role.id} className="rounded-md bg-blue-50 px-2 py-0.5 text-[12px] text-blue-500">
          {locale === "ar" ? role.name_ar : role.name_en}
        </span>
      ))}
      {roles.length > max ? (
        <span className="text-[12px] text-brown-300">+{roles.length - max}</span>
      ) : null}
    </span>
  );
}

/* ─── Relative time ─── */

export function RelativeTime({ iso }: { iso: string | null }) {
  const locale = useLocale();
  if (!iso) return <span className="text-brown-200">—</span>;
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  let text: string;
  if (minutes < 60) text = rtf.format(-minutes, "minute");
  else if (minutes < 60 * 24) text = rtf.format(-Math.round(minutes / 60), "hour");
  else text = rtf.format(-Math.round(minutes / 1440), "day");
  return <span title={date.toISOString()}>{text}</span>;
}

/* ─── Modal ─── */

export function Modal({
  title,
  children,
  onClose,
  width = 480,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-brown-900/40 p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[85vh] w-full overflow-y-auto rounded-3xl bg-card p-6 shadow-[0_16px_48px_rgba(36,17,15,0.16)] focus:outline-none md:p-8"
        style={{ maxWidth: width }}
      >
        <h2 className="mb-4 font-display text-[20px] font-bold text-brown-900">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function ModalActions({
  confirmLabel,
  onConfirm,
  onCancel,
  danger,
  busy,
  disabled,
}: {
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  busy?: boolean;
  disabled?: boolean;
}) {
  const t = useTranslations("admin.common");
  return (
    <div className="mt-6 flex justify-end gap-3">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-full border border-line px-5 py-2.5 text-[14px] font-bold text-brown-500 hover:border-brown-400"
      >
        {t("cancel")}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={busy || disabled}
        className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-bold text-creamy-50 disabled:opacity-40 ${
          danger ? "bg-danger hover:opacity-90" : "rounded-full bg-brown-500 hover:bg-brown-600"
        }`}
      >
        {busy ? <SpinnerIcon className="size-4" /> : null}
        {confirmLabel}
      </button>
    </div>
  );
}

/** Destructive confirm requiring the user to type a value (spec ADM-01 §8). */
export function TypedConfirm({
  title,
  body,
  requiredText,
  confirmLabel,
  onConfirm,
  onCancel,
  busy,
}: {
  title: string;
  body: string;
  requiredText: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const t = useTranslations("admin.common");
  const [typed, setTyped] = useState("");
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-[14.5px] leading-relaxed text-brown-500">{body}</p>
      <p className="mt-4 text-[13px] text-brown-400">
        {t("typeToConfirm")} <bdi dir="ltr" className="font-bold text-brown-900">{requiredText}</bdi>
      </p>
      <input
        dir="ltr"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-line bg-creamy-50 px-4 text-[14px] focus:border-brown-400 focus:outline-none"
      />
      <ModalActions
        confirmLabel={confirmLabel}
        onConfirm={onConfirm}
        onCancel={onCancel}
        danger
        busy={busy}
        disabled={typed !== requiredText}
      />
    </Modal>
  );
}

/* ─── Kebab menu ─── */

export type KebabItem = {
  label: string;
  onClick: () => void;
  danger?: boolean;
  hidden?: boolean;
};

export function KebabMenu({ items, label }: { items: KebabItem[]; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onOutside);
    return () => document.removeEventListener("pointerdown", onOutside);
  }, [open]);

  const visible = items.filter((item) => !item.hidden);
  if (visible.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="flex size-8 items-center justify-center rounded-lg text-brown-300 hover:bg-creamy-200 hover:text-brown-900"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden="true">
          <circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute end-0 z-30 mt-1 w-48 overflow-hidden rounded-xl border border-line bg-card py-1 shadow-[0_8px_24px_rgba(36,17,15,0.08)]"
        >
          {visible.map((item, i) => (
            <button
              key={i}
              role="menuitem"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                item.onClick();
              }}
              className={`block w-full px-4 py-2 text-start text-[13.5px] hover:bg-creamy-200 ${
                item.danger ? "border-t border-line text-danger" : "text-brown-900"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ─── Table states ─── */

export function SkeletonRows({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-t border-line">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-3">
              <div className="h-4 animate-pulse rounded bg-creamy-400" style={{ width: `${55 + ((r + c) % 4) * 12}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function EmptyState({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <span className="text-[40px]" aria-hidden="true">✢</span>
      <p className="text-[15px] text-brown-400">{text}</p>
      {action}
    </div>
  );
}

export function ErrorCard({ text, onRetry, retryLabel }: { text: string; onRetry: () => void; retryLabel: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-danger/30 bg-danger-tint p-8 text-center">
      <p className="text-[14.5px] text-danger">{text}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full border border-danger px-5 py-2 text-[13px] font-bold text-danger hover:bg-danger hover:text-creamy-50"
      >
        {retryLabel}
      </button>
    </div>
  );
}

/** Extract the DRF cursor from a next/previous URL. */
export function cursorFrom(url: string | null): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url, "http://x").searchParams.get("cursor") ?? undefined;
  } catch {
    return undefined;
  }
}
