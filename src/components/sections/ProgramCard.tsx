"use client";

import { useRef } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Link } from "@/i18n/navigation";
import ArrowIcon from "@/components/ui/ArrowIcon";

gsap.registerPlugin(useGSAP);

export type ProgramItem = {
  id: string;
  title: string;
  description: string;
  duration: string;
  status: "open" | "soon" | "closed";
  image: string;
  /** Optional enrichment — falls back to sensible academy-wide defaults. */
  faculty?: string;
  language?: string;
  mode?: string;
  award?: string;
};

const STATUS_STYLES: Record<ProgramItem["status"], string> = {
  open: "bg-red-50 text-red-800 ring-red-800/10",
  soon: "bg-creamy-300 text-brown-500 ring-brown-500/10",
  closed: "bg-ink-50 text-ink-400 ring-ink-400/10",
};

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "size-[17px]",
  "aria-hidden": true,
};
const DurationIcon = () => (
  <svg {...iconProps}><circle cx="12" cy="12.5" r="7.5" /><path d="M12 8.6V12.5l2.6 1.7" /><path d="M9 3.5h6" /></svg>
);
const ModeIcon = () => (
  <svg {...iconProps}><path d="M4 9.5 12 5l8 4.5" /><path d="M5.5 9.7V19M18.5 9.7V19M9 10v9M15 10v9" /><path d="M3.5 19h17" /></svg>
);
const LanguageIcon = () => (
  <svg {...iconProps}><circle cx="12" cy="12" r="8.2" /><path d="M3.8 12h16.4M12 3.8c2.4 2.2 3.6 5.1 3.6 8.2s-1.2 6-3.6 8.2c-2.4-2.2-3.6-5.1-3.6-8.2S9.6 6 12 3.8Z" /></svg>
);
const AwardIcon = () => (
  <svg {...iconProps}><circle cx="12" cy="10" r="5.4" /><path d="m9.4 14.6-1.6 6 4.2-2.4 4.2 2.4-1.6-6" /><path d="m9.9 10 1.5 1.5L14.2 8.7" /></svg>
);

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 min-w-0">
      <span className="grid size-9 flex-none place-items-center rounded-[10px] border border-line bg-creamy-50 text-brown-500">
        {icon}
      </span>
      <span className="min-w-0 pt-0.5">
        <span className="block font-sans text-[10px] font-semibold uppercase tracking-[0.09em] text-brown-400">{label}</span>
        <span className="mt-0.5 block font-serif text-[14px] font-medium leading-snug text-pretty break-words text-brown-900">{value}</span>
      </span>
    </div>
  );
}

export default function ProgramCard({ program }: { program: ProgramItem }) {
  const t = useTranslations("programs");
  const root = useRef<HTMLElement>(null);

  const language = program.language ?? t("info.languageValue");
  const mode = program.mode ?? t("info.modeValue");
  const award = program.award ?? t("info.awardValue");

  // Interactive tilt — the card leans toward the moving cursor, with a gentle lift.
  useGSAP(
    (_context, contextSafe) => {
      const el = root.current;
      if (!el || !contextSafe) return;
      // Animate an inner wrapper — NOT the [data-reveal] <article>, whose transform
      // is owned by <Reveal> (its reveal tween uses overwrite:true and would kill this).
      const cardEl = el.querySelector<HTMLElement>("[data-card]");
      if (!cardEl) return;
      const imgEl = el.querySelector<HTMLElement>("[data-img]");
      gsap.set(cardEl, { transformPerspective: 900, transformOrigin: "50% 50%" });

      const TILT = 16; // full-range tilt span in degrees (±8°)
      const rotX = gsap.quickTo(cardEl, "rotationX", { duration: 0.5, ease: "power3.out" });
      const rotY = gsap.quickTo(cardEl, "rotationY", { duration: 0.5, ease: "power3.out" });
      const scaleTo = gsap.quickTo(cardEl, "scale", { duration: 0.5, ease: "power3.out" });
      const imgScale = imgEl ? gsap.quickTo(imgEl, "scale", { duration: 0.6, ease: "power2.out" }) : null;

      const enter = contextSafe(() => { scaleTo(1.04); imgScale?.(1.07); });
      const move = contextSafe((e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        const r = cardEl.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;  // -0.5 (left) .. 0.5 (right)
        const py = (e.clientY - r.top) / r.height - 0.5;  // -0.5 (top) .. 0.5 (bottom)
        rotX(py * TILT);   // lean the edge under the cursor toward the viewer
        rotY(-px * TILT);
      });
      const leave = contextSafe(() => { rotX(0); rotY(0); scaleTo(1); imgScale?.(1); });

      el.addEventListener("pointerenter", enter);
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", leave);
      el.addEventListener("focusin", enter);
      el.addEventListener("focusout", leave);
      return () => {
        el.removeEventListener("pointerenter", enter);
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerleave", leave);
        el.removeEventListener("focusin", enter);
        el.removeEventListener("focusout", leave);
      };
    },
    { scope: root },
  );

  return (
    <article
      ref={root}
      data-reveal
      className="group relative z-0 flex hover:z-10 focus-within:z-10"
    >
      <div
        data-card
        className="relative flex flex-1 flex-col overflow-hidden rounded-[20px] border border-line bg-creamy-50 transition-colors duration-300 [transform-origin:50%_50%] [will-change:transform] hover:border-brown-200"
      >
      {/* Featured image */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <div data-img className="absolute inset-0 [will-change:transform]">
          <Image
            src={program.image}
            alt=""
            fill
            sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(36,17,15,0.34),rgba(36,17,15,0.04)_36%,transparent_66%,rgba(36,17,15,0.14))]"
        />
        <span
          data-badge
          className={`absolute top-4 start-4 inline-flex items-center rounded-full px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.08em] shadow-sm ring-1 backdrop-blur-md ${STATUS_STYLES[program.status]}`}
        >
          {t(`status.${program.status}`)}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-7">
        {program.faculty ? (
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-brown-400">{program.faculty}</p>
        ) : null}
        <h3 className={`${program.faculty ? "mt-2" : ""} line-clamp-2 font-serif text-[23px] font-bold leading-[1.2] text-balance text-brown-900`}>
          <Link
            href="/programs"
            className="rounded-sm outline-none transition-colors hover:text-brown-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brown-500"
          >
            {program.title}
          </Link>
        </h3>
        {/* Reserve 2 lines so short and long descriptions keep cards aligned */}
        <p className="mt-3 line-clamp-2 min-h-[2lh] font-serif text-[15px] font-light leading-[1.62] text-brown-400">
          {program.description}
        </p>

        {/* Details panel */}
        <dl className="mt-5 grid grid-cols-2 gap-x-3 gap-y-4 rounded-2xl border border-line bg-creamy-100/70 p-4">
          <InfoItem icon={<DurationIcon />} label={t("duration")} value={program.duration} />
          <InfoItem icon={<ModeIcon />} label={t("info.mode")} value={mode} />
          <InfoItem icon={<LanguageIcon />} label={t("info.language")} value={language} />
          <InfoItem icon={<AwardIcon />} label={t("info.award")} value={award} />
        </dl>

        {/* Actions */}
        <div className="mt-auto flex gap-3 pt-5 max-[380px]:flex-col">
          <Link
            href="/register"
            className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl bg-brown-500 px-4 font-serif text-[15px] font-bold text-creamy-50 transition-colors duration-200 hover:bg-brown-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brown-500"
          >
            {t("apply")}
            <span className="inline-flex"><ArrowIcon className="size-4" /></span>
          </Link>
          <Link
            href="/programs"
            className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-xl border border-line px-4 font-serif text-[15px] font-bold text-brown-500 transition-colors duration-200 hover:border-brown-400 hover:bg-brown-500/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brown-500"
          >
            {t("learnMore")}
          </Link>
        </div>
      </div>
      </div>
    </article>
  );
}
