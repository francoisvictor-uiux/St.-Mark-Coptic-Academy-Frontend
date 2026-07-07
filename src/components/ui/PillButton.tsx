import { Link } from "@/i18n/navigation";
import ArrowIcon from "./ArrowIcon";

type PillButtonProps = {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "outline" | "light";
  withArrow?: boolean;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
};

const base =
  "group inline-flex h-[58px] items-center justify-center gap-3 rounded-full px-7 font-serif text-[17px] font-bold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brown-500 md:h-[66px] md:text-[18.4px]";

const variants = {
  primary:
    "bg-brown-500 text-creamy-50 hover:bg-brown-600 active:bg-brown-700",
  outline:
    "border border-brown-500 text-brown-500 hover:bg-brown-500/5 active:bg-brown-500/10",
  light:
    "bg-creamy-100 text-brown-500 hover:bg-creamy-300 active:bg-creamy-400",
};

/**
 * Figma pill CTA (66px, radius 999). Primary carries the circular
 * arrow chip that nudges forward on hover.
 */
export default function PillButton({
  children,
  href,
  variant = "primary",
  withArrow = false,
  className = "",
  type = "button",
  disabled,
  onClick,
}: PillButtonProps) {
  const arrowChip = withArrow ? (
    <span
      className={`flex size-[42px] items-center justify-center overflow-hidden rounded-full md:size-[46px] ${
        variant === "primary" ? "bg-creamy-50 text-brown-500" : "bg-brown-500 text-creamy-50"
      }`}
    >
      <ArrowIcon className="size-6 transition-transform duration-300 group-hover:translate-x-1 group-hover:rtl:-translate-x-1" />
    </span>
  ) : null;

  const content = (
    <>
      <span className={withArrow ? "ps-2" : undefined}>{children}</span>
      {arrowChip}
    </>
  );

  const classes = `${base} ${variants[variant]} ${withArrow ? "pe-2.5" : ""} ${className}`;

  if (href) {
    // Hash links stay native anchors; internal routes go through the
    // locale-aware Link so the /ar|/en prefix is preserved.
    if (href.startsWith("#")) {
      return (
        <a href={href} className={classes} onClick={onClick}>
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} disabled={disabled} onClick={onClick}>
      {content}
    </button>
  );
}
