"use client";

import { useId } from "react";
import { AlertIcon, CheckIcon, SpinnerIcon } from "./icons";

export const inputBase =
  "h-14 w-full rounded-2xl border bg-creamy-50 px-5 font-serif text-[16px] text-brown-900 placeholder:text-brown-100 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-card";

export function inputBorder(error?: boolean) {
  return error ? "border-danger" : "border-line focus:border-brown-400";
}

type FieldProps = {
  label: string;
  error?: string;
  hint?: string;
  /** Email/phone/password are LTR islands (spec Part 1 §5.3). */
  ltr?: boolean;
  /** Async state for on-blur checks (email availability). */
  pending?: boolean;
  valid?: boolean;
  children?: never;
} & React.InputHTMLAttributes<HTMLInputElement>;

/** Label-above input with the 8/6px rhythm, inline error + async indicator. */
export default function Field({
  label,
  error,
  hint,
  ltr,
  pending,
  valid,
  className = "",
  ...input
}: FieldProps) {
  const id = useId();
  const messageId = `${id}-msg`;
  const showTrailing = pending || (valid && !error);

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block font-serif text-[15px] font-bold text-brown-500">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          dir={ltr ? "ltr" : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          className={`${inputBase} ${inputBorder(!!error)} ${ltr ? "text-start" : ""} ${showTrailing ? "pe-12" : ""}`}
          {...input}
        />
        {showTrailing ? (
          <span className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2">
            {pending ? (
              <SpinnerIcon className="size-5 text-brown-200" />
            ) : (
              <CheckIcon className="size-5 text-success" />
            )}
          </span>
        ) : null}
      </div>
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
