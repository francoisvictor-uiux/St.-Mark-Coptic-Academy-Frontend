"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertIcon, CheckIcon, ChevronDownIcon, SearchIcon } from "./icons";
import { inputBorder } from "./Field";

export type SelectOption = {
  value: string;
  label: string;
  /** Secondary line (e.g. church city). */
  meta?: string;
};

type SearchableSelectProps = {
  /** Optional visible label above the field; use ariaLabel when omitted. */
  label?: string;
  ariaLabel?: string;
  options: SelectOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  /** "أخرى" escape hatch (church/diocese) — appears under the list. */
  otherLabel?: string;
  onOther?: () => void;
  searchable?: boolean;
  /** md = 56px form fields (auth) · sm = 40px dense filters (dashboard). */
  size?: "md" | "sm";
  className?: string;
};

const CLOSE_MS = 140;

/**
 * Custom listbox (spec Part 1 §4.3): searchable, keyboard-navigable,
 * check on selected, escape hatch, animated open/close.
 */
export default function SearchableSelect({
  label,
  ariaLabel,
  options,
  value,
  onChange,
  placeholder,
  error,
  hint,
  disabled,
  otherLabel,
  onOther,
  searchable = true,
  size = "md",
  className = "",
}: SearchableSelectProps) {
  const id = useId();
  const t = useTranslations("auth.select");
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const selected = options.find((o) => o.value === value) ?? null;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.meta?.toLowerCase().includes(q),
    );
  }, [options, query]);

  const requestClose = useCallback(() => {
    if (!open || closing) return;
    setClosing(true);
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, CLOSE_MS);
  }, [open, closing]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHighlight(0);
    searchRef.current?.focus();
    function onOutside(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) requestClose();
    }
    document.addEventListener("pointerdown", onOutside);
    return () => document.removeEventListener("pointerdown", onOutside);
  }, [open, requestClose]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${highlight}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  function pick(option: SelectOption) {
    onChange(option.value);
    requestClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      requestClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(filtered.length - 1, h + 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const option = filtered[highlight];
      if (option) pick(option);
    }
  }

  const compact = size === "sm";
  const buttonCls = compact
    ? `flex h-10 w-full items-center justify-between gap-2 rounded-xl border bg-creamy-50 px-3 font-sans text-[13.5px] transition-colors duration-150`
    : `flex h-14 w-full items-center justify-between gap-3 rounded-2xl border bg-creamy-50 px-5 font-serif text-[16px] transition-colors duration-150`;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {label ? (
        <label
          id={`${id}-label`}
          className={`mb-2 block font-bold text-brown-500 ${compact ? "text-[13px]" : "font-serif text-[15px]"}`}
        >
          {label}
        </label>
      ) : null}
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open && !closing}
        aria-labelledby={label ? `${id}-label` : undefined}
        aria-label={label ? undefined : ariaLabel}
        onClick={() => (open ? requestClose() : setOpen(true))}
        className={`${buttonCls} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:opacity-40 ${inputBorder(!!error)} ${
          selected ? "text-brown-900" : compact ? "text-brown-400" : "text-brown-100"
        }`}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDownIcon
          className={`shrink-0 text-brown-300 transition-transform duration-200 ${compact ? "size-4" : "size-5"} ${
            open && !closing ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div
          className={`absolute z-30 mt-2 w-full min-w-44 overflow-hidden rounded-2xl border border-line bg-card shadow-[0_8px_24px_rgba(36,17,15,0.08)] ${
            closing ? "dropdown-out" : "dropdown-in"
          }`}
          onKeyDown={onKeyDown}
        >
          {searchable ? (
            <div className="relative border-b border-line">
              <SearchIcon className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-brown-200" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlight(0);
                }}
                placeholder={t("searchPlaceholder")}
                className={`w-full bg-transparent ps-11 pe-4 text-brown-900 placeholder:text-brown-100 focus:outline-none ${
                  compact ? "h-10 font-sans text-[13.5px]" : "h-12 font-serif text-[15px]"
                }`}
              />
            </div>
          ) : null}

          <ul
            ref={listRef}
            role="listbox"
            aria-labelledby={label ? `${id}-label` : undefined}
            aria-label={label ? undefined : ariaLabel}
            className="max-h-64 overflow-y-auto p-2"
          >
            {filtered.length === 0 ? (
              <li className={`px-3 py-4 text-center text-brown-300 ${compact ? "font-sans text-[13px]" : "font-serif text-[14px]"}`}>
                {t("noResults")}
              </li>
            ) : (
              filtered.map((option, i) => (
                <li
                  key={option.value || "__empty"}
                  role="option"
                  aria-selected={option.value === value}
                  data-index={i}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    pick(option);
                  }}
                  onPointerMove={() => setHighlight(i)}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 text-brown-900 ${
                    compact ? "py-2 font-sans text-[13.5px]" : "py-2.5 font-serif text-[15px]"
                  } ${i === highlight ? "bg-creamy-200" : ""}`}
                >
                  <span>
                    {option.label}
                    {option.meta ? (
                      <span className={`block text-brown-300 ${compact ? "text-[11.5px]" : "text-[13px]"}`}>{option.meta}</span>
                    ) : null}
                  </span>
                  {option.value === value ? <CheckIcon className="size-4 shrink-0 text-brown-500" /> : null}
                </li>
              ))
            )}
          </ul>

          {otherLabel && onOther ? (
            <button
              type="button"
              onClick={() => {
                requestClose();
                onOther();
              }}
              className={`block w-full border-t border-line px-4 py-3 text-start font-bold text-blue-500 hover:bg-creamy-100 ${
                compact ? "font-sans text-[13px]" : "font-serif text-[14px]"
              }`}
            >
              {otherLabel}
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="auth-error-in mt-1.5 flex items-center gap-1.5 font-serif text-[13px] text-danger">
          <AlertIcon className="size-4 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 font-serif text-[13px] text-brown-300">{hint}</p>
      ) : null}
    </div>
  );
}
