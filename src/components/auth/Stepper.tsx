"use client";

import { useTranslations } from "next-intl";
import { CheckIcon } from "./icons";

type StepperProps = {
  steps: string[];
  /** 0-based index of the current step. */
  current: number;
};

/**
 * Wizard stepper (spec Part 1 §4.10): numbered circles + connector that fills
 * on completion; compresses to "step n of m" + progress bar on mobile.
 */
export default function Stepper({ steps, current }: StepperProps) {
  const t = useTranslations("auth.wizard");

  return (
    <nav aria-label={t("progressLabel")}>
      {/* Mobile: progress bar */}
      <div className="sm:hidden">
        <p className="mb-2 text-center font-serif text-[14px] font-bold text-brown-500">
          {t("stepOf", { current: current + 1, total: steps.length })} — {steps[current]}
        </p>
        <div className="h-1.5 overflow-hidden rounded-full bg-creamy-500">
          <div
            className="h-full rounded-full bg-brown-500 transition-[width] duration-300"
            style={{ width: `${((current + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* ≥sm: circles + connectors */}
      <ol className="hidden items-center sm:flex">
        {steps.map((stepLabel, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li
              key={stepLabel}
              aria-current={active ? "step" : undefined}
              className={`flex items-center ${i > 0 ? "flex-1" : ""}`}
            >
              {i > 0 ? (
                <span
                  aria-hidden="true"
                  className={`mx-2 h-px flex-1 transition-colors duration-300 ${done || active ? "bg-brown-500" : "bg-line"}`}
                />
              ) : null}
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full border font-serif text-[14px] font-bold transition-colors duration-300 ${
                    done
                      ? "border-brown-500 bg-brown-500 text-creamy-100"
                      : active
                        ? "border-brown-500 text-brown-500 ring-2 ring-brown-500/20"
                        : "border-line text-brown-200"
                  }`}
                >
                  {done ? <CheckIcon className="size-4" /> : i + 1}
                </span>
                <span
                  className={`font-serif text-[14px] ${active ? "font-bold text-brown-900" : done ? "text-brown-500" : "text-brown-200"}`}
                >
                  {stepLabel}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
