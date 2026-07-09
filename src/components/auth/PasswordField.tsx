"use client";

import { useId, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertIcon, EyeIcon, EyeOffIcon } from "./icons";
import { inputBase, inputBorder } from "./Field";

/** 0–4 heuristic score driving the 4-segment meter (spec Part 1 §4.10). */
export function passwordScore(password: string, emailLocalPart?: string): number {
  if (!password) return 0;
  if (emailLocalPart && emailLocalPart.length >= 3 && password.toLowerCase().includes(emailLocalPart.toLowerCase())) {
    return 1;
  }
  let score = 0;
  if (password.length >= 10) score += 1;
  if (password.length >= 14) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^a-zA-Z0-9]/.test(password)) score += 1;
  return Math.min(4, Math.max(1, score));
}

const meterColors = ["", "bg-danger", "bg-warning", "bg-blue-500", "bg-success"];
const meterText = ["", "text-danger", "text-warning", "text-blue-500", "text-success"];

type PasswordFieldProps = {
  label: string;
  error?: string;
  hint?: string;
  /** Show the 4-segment strength meter (registration / reset). */
  withMeter?: boolean;
  emailLocalPart?: string;
  onCapsLock?: (on: boolean) => void;
} & React.InputHTMLAttributes<HTMLInputElement>;

export default function PasswordField({
  label,
  error,
  hint,
  withMeter,
  emailLocalPart,
  onCapsLock,
  className = "",
  onKeyUp,
  ...input
}: PasswordFieldProps) {
  const id = useId();
  const messageId = `${id}-msg`;
  const t = useTranslations("auth.password");
  const [visible, setVisible] = useState(false);
  const value = typeof input.value === "string" ? input.value : "";
  const score = useMemo(
    () => (withMeter ? passwordScore(value, emailLocalPart) : 0),
    [withMeter, value, emailLocalPart],
  );

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block font-serif text-[15px] font-bold text-brown-500">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          dir="ltr"
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          className={`${inputBase} ${inputBorder(!!error)} pr-14 text-start`}
          onKeyUp={(e) => {
            onCapsLock?.(e.getModifierState?.("CapsLock") ?? false);
            onKeyUp?.(e);
          }}
          {...input}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? t("hide") : t("show")}
          className="absolute right-1.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-xl text-brown-300 transition-colors hover:text-brown-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          {visible ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
        </button>
      </div>

      {withMeter && value ? (
        <div className="mt-2" role="status" aria-live="polite">
          <div className="flex gap-1.5" aria-hidden="true">
            {[1, 2, 3, 4].map((seg) => (
              <span
                key={seg}
                className={`h-1 flex-1 rounded-full transition-colors duration-150 ${
                  seg <= score ? meterColors[score] : "bg-creamy-500"
                }`}
              />
            ))}
          </div>
          <p className={`mt-1.5 font-serif text-[13px] ${meterText[score]}`}>
            {t(`strength.${score}` as "strength.1")}
          </p>
        </div>
      ) : null}

      {error ? (
        <p id={messageId} className="auth-error-in mt-1.5 flex items-center gap-1.5 font-serif text-[13px] text-danger">
          <AlertIcon className="size-4 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="mt-1.5 font-serif text-[13px] text-brown-300">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
