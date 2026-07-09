"use client";

import { CheckIcon, SpinnerIcon } from "./icons";

type SubmitButtonProps = {
  children: React.ReactNode;
  state?: "idle" | "loading" | "success";
  variant?: "primary" | "ghost";
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
};

/**
 * Auth-sized (56px) pill action. Width stays locked while the label swaps
 * for a spinner/check (spec Part 1 §4.1 loading state).
 */
export default function SubmitButton({
  children,
  state = "idle",
  variant = "primary",
  className = "",
  onClick,
  type = "submit",
}: SubmitButtonProps) {
  const base =
    "relative inline-flex h-14 w-full items-center justify-center rounded-full px-7 font-serif text-[17px] font-bold transition-[background-color,transform] duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";
  const look =
    variant === "primary"
      ? "bg-brown-500 text-creamy-100 hover:bg-brown-600"
      : "border border-brown-500 bg-transparent text-brown-500 hover:bg-brown-500/5";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={state !== "idle"}
      aria-busy={state === "loading"}
      className={`${base} ${look} ${state !== "idle" ? "cursor-default" : ""} ${className}`}
    >
      <span className={state === "idle" ? "" : "invisible"}>{children}</span>
      {state === "loading" ? (
        <SpinnerIcon className="absolute size-6" />
      ) : state === "success" ? (
        <CheckIcon className="absolute size-6" />
      ) : null}
    </button>
  );
}
