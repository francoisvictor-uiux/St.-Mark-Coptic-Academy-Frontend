/** Animated stroke-drawn check in a success-tint circle (AUTH-04/08). */
export default function SuccessCheck({ className = "" }: { className?: string }) {
  return (
    <span
      className={`flex size-20 items-center justify-center rounded-full bg-success-tint ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-10 text-success">
        <path
          d="M20 6 9 17l-5-5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="auth-check-draw"
        />
      </svg>
    </span>
  );
}
