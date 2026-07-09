"use client";

import { useEffect, useRef } from "react";
import { AlertIcon, CheckIcon, InfoIcon } from "./icons";

const styles = {
  danger: "bg-danger-tint text-danger",
  success: "bg-success-tint text-success",
  info: "bg-blue-50 text-blue-500",
  warning: "bg-warning-tint text-warning",
};

const icons = {
  danger: AlertIcon,
  success: CheckIcon,
  info: InfoIcon,
  warning: AlertIcon,
};

type FormBannerProps = {
  tone: keyof typeof styles;
  children: React.ReactNode;
};

/** Full-width form banner, radius 12, auto-scrolls into view (spec §4.5). */
export default function FormBanner({ tone, children }: FormBannerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const Icon = icons[tone];

  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);

  return (
    <div
      ref={ref}
      role="alert"
      className={`auth-error-in mb-5 flex items-start gap-2.5 rounded-xl p-4 font-serif text-[14px] leading-relaxed ${styles[tone]}`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
