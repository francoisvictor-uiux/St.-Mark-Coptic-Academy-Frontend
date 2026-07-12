"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const CREAM = "#FEF6F0"; // page-cream — emblem, hairline, pattern

// loading.svg rendered in cream via mask (preserves its shapes and text holes).
// Starts hidden so there's no first-paint flash before GSAP fades it in.
const EMBLEM: React.CSSProperties = {
  opacity: 0,
  backgroundColor: CREAM,
  WebkitMaskImage: "url(/loading.svg)",
  maskImage: "url(/loading.svg)",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
  WebkitMaskSize: "contain",
  maskSize: "contain",
};

// Cream motif band at the bottom: Pattern.svg tiled, intersected with a fade
// that's strongest at the bottom and blends up into the brown background.
const PATTERN: React.CSSProperties = {
  opacity: 0,
  backgroundColor: CREAM,
  WebkitMaskImage: "url(/Pattern.svg), linear-gradient(to top, #000, #000 18%, transparent)",
  maskImage: "url(/Pattern.svg), linear-gradient(to top, #000, #000 18%, transparent)",
  WebkitMaskRepeat: "repeat, no-repeat",
  maskRepeat: "repeat, no-repeat",
  WebkitMaskSize: "374px 212px, 100% 100%",
  maskSize: "374px 212px, 100% 100%",
  WebkitMaskComposite: "source-in",
  maskComposite: "intersect",
};

// Cross.svg used as an *inverted* mask: the sheet is everything EXCEPT the
// cross, so growing the cross opens a cross-shaped hole that reveals the page.
const CROSS_REVEAL: React.CSSProperties = {
  ["--cross" as string]: 0,
  WebkitMaskImage: "url(/Cross.svg), linear-gradient(#000, #000)",
  maskImage: "url(/Cross.svg), linear-gradient(#000, #000)",
  WebkitMaskRepeat: "no-repeat, no-repeat",
  maskRepeat: "no-repeat, no-repeat",
  WebkitMaskPosition: "center, center",
  maskPosition: "center, center",
  WebkitMaskSize: "calc(var(--cross, 0) * 1px), cover",
  maskSize: "calc(var(--cross, 0) * 1px), cover",
  WebkitMaskComposite: "xor",
  maskComposite: "exclude",
};

/**
 * Full-screen intro overlay shown on every hard page load. The hero pauses
 * its entrance while `[data-preloader]` is in the DOM and resumes on the
 * `preloader:done` window event. On exit a cross-shaped hole (Cross.svg used
 * as an inverted mask) grows open to reveal the page.
 */
export default function Preloader() {
  const t = useTranslations("misc");
  const ref = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useGSAP(
    () => {
      document.body.style.overflow = "hidden";

      const finish = () => {
        document.body.style.removeProperty("overflow");
        window.dispatchEvent(new Event("preloader:done"));
        setDone(true);
      };

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Pre-hide (already opacity:0 inline) so nothing flashes on first paint.
        gsap.set(["[data-loader-pattern]", "[data-loader-emblem]"], { autoAlpha: 0 });
        gsap
          .timeline({ defaults: { ease: "power2.out" }, onComplete: finish })
          // Pattern band appears first…
          .to("[data-loader-pattern]", { autoAlpha: 1, duration: 1.1 })
          // …then the emblem fades in smoothly (opacity only — no mask re-raster)
          .to("[data-loader-emblem]", { autoAlpha: 1, duration: 1.0 }, "-=0.35")
          // Exit: fade the content, then open a cross-shaped hole to the page
          .to(
            "[data-loader-emblem], [data-loader-pattern]",
            { autoAlpha: 0, duration: 0.5, ease: "power2.in" },
            "+=0.5",
          )
          .to(
            ref.current,
            {
              ["--cross"]: 3200,
              duration: 1.05,
              ease: "power2.in",
              // Let the hero begin its entrance while the cross opens
              onStart: () => window.dispatchEvent(new Event("preloader:done")),
            },
            "-=0.15",
          )
          // Clear the last corner slivers the cross arms can't cover
          .to(ref.current, { autoAlpha: 0, duration: 0.4, ease: "power1.out" }, "-=0.4");
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(["[data-loader-pattern]", "[data-loader-emblem]"], { autoAlpha: 1 });
        gsap.to(ref.current, { autoAlpha: 0, duration: 0.4, onComplete: finish });
      });
    },
    { scope: ref },
  );

  if (done) return null;

  return (
    <div
      ref={ref}
      data-preloader
      role="status"
      aria-label={t("loading")}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-brown-500"
      style={CROSS_REVEAL}
    >
      {/* Cream motif band */}
      <div
        data-loader-pattern
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[52vh] opacity-[0.1]"
        style={PATTERN}
      />

      <div className="relative flex flex-col items-center px-6">
        {/* Cream loading emblem (loading.svg via mask) */}
        <div data-loader-emblem aria-hidden="true" className="aspect-[860/640] w-[min(460px,72vw)]" style={EMBLEM} />
      </div>
    </div>
  );
}
