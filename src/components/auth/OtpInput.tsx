"use client";

import { useEffect, useRef, useState } from "react";

const LENGTH = 6;

/** Accept Arabic-Indic digits from Arabic keyboards, store Western. */
function normalizeDigits(raw: string) {
  return raw
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/\D/g, "");
}

type OtpInputProps = {
  label: string;
  value: string;
  onChange: (code: string) => void;
  /** Fires once when the 6th digit lands. */
  onComplete: (code: string) => void;
  state?: "idle" | "error" | "success";
  disabled?: boolean;
};

/**
 * 6-box one-time-code group (spec Part 1 §4.10): always LTR, Archivo digits,
 * auto-advance, backspace steps back, full paste distributes, OS autofill.
 */
export default function OtpInput({
  label,
  value,
  onChange,
  onComplete,
  state = "idle",
  disabled,
}: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [shaking, setShaking] = useState(false);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (state === "error") {
      setShaking(true);
      const timer = setTimeout(() => setShaking(false), 350);
      refs.current[0]?.focus();
      return () => clearTimeout(timer);
    }
  }, [state]);

  function commit(next: string, focusIndex?: number) {
    const code = next.slice(0, LENGTH);
    onChange(code);
    if (focusIndex !== undefined) {
      refs.current[Math.min(focusIndex, LENGTH - 1)]?.focus();
    }
    if (code.length === LENGTH) onComplete(code);
  }

  function handleChange(index: number, raw: string) {
    const clean = normalizeDigits(raw);
    if (!clean) {
      commit(value.slice(0, index));
      return;
    }
    // Multi-char input = paste or OS autofill: distribute from this box.
    const next = (value.slice(0, index) + clean).slice(0, LENGTH);
    commit(next, next.length);
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      e.preventDefault();
      commit(value.slice(0, index - 1), index - 1);
    }
    // Visual direction regardless of document dir (spec Part 1 §5.7).
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      refs.current[Math.max(0, index - 1)]?.focus();
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      refs.current[Math.min(LENGTH - 1, index + 1)]?.focus();
    }
  }

  const borders =
    state === "error"
      ? "border-danger"
      : state === "success"
        ? "border-success"
        : "border-line focus:border-brown-400";

  return (
    <fieldset
      dir="ltr"
      role="group"
      aria-label={label}
      className={`flex justify-center gap-2 sm:gap-3 ${shaking ? "auth-shake" : ""}`}
    >
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          translate="no"
          aria-label={`${label} ${i + 1}/${LENGTH}`}
          className={`h-16 w-11 rounded-2xl border bg-creamy-50 text-center font-archivo text-[32px] font-light leading-10 text-brown-900 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-card sm:w-[52px] ${borders} ${
            state === "success" ? "auth-pulse-success" : ""
          }`}
        />
      ))}
    </fieldset>
  );
}
