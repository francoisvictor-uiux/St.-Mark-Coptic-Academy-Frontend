"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const CREAM = "#FEF6F0"; // page-cream — the emblem colour
const BROWN = "#562823"; // --color-brown-500 — the curtain colour
const CURVE = 180; // depth of the curved bottom edge, in px

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

/**
 * Full-screen intro overlay shown on every hard page load. The hero pauses its
 * entrance while `[data-preloader]` is in the DOM and resumes on the
 * `preloader:done` window event.
 *
 * On exit the whole sheet slides up while a single SVG `<path>` flattens its
 * curved bottom edge — the classic curved-curtain wipe. Only the path's `d`
 * and one transform animate, so there's no per-frame mask re-rasterization
 * (the old Cross.svg mask-size + scale reveal was the source of the lag).
 */
export default function Preloader() {
  const t = useTranslations("misc");
  const root = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [done, setDone] = useState(false);

  useGSAP(
    () => {
      document.body.style.overflow = "hidden";

      const finish = () => {
        document.body.style.removeProperty("overflow");
        setDone(true);
      };

      // Track the live curve depth so a mid-load resize can redraw correctly.
      const state = { curve: CURVE };

      const draw = () => {
        const el = root.current;
        const path = pathRef.current;
        if (!el || !path) return;
        const w = window.innerWidth;
        const h = el.getBoundingClientRect().height;
        // Rectangle with a quadratic-curved bottom edge that rises `curve` px
        // toward the middle. curve = CURVE → covers the viewport; curve = 0 → flat.
        path.setAttribute(
          "d",
          `M0 0 L${w} 0 L${w} ${h} Q${w / 2} ${h - state.curve} 0 ${h} L0 0`,
        );
      };

      draw();
      const onResize = () => draw();
      window.addEventListener("resize", onResize);

      const started = { done: false };
      const releaseHero = () => {
        if (started.done) return;
        started.done = true;
        window.dispatchEvent(new Event("preloader:done"));
      };

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set("[data-loader-emblem]", { autoAlpha: 0 });
        gsap
          .timeline({ defaults: { ease: "power2.out" }, onComplete: finish })
          // Emblem fades in (opacity only — no mask re-raster).
          .to("[data-loader-emblem]", { autoAlpha: 1, duration: 0.5 })
          .addLabel("exit", "+=0.2")
          // Let the hero begin its entrance as the curtain starts lifting.
          .add(releaseHero, "exit")
          .to(
            "[data-loader-emblem]",
            { autoAlpha: 0, duration: 0.3, ease: "power2.in" },
            "exit",
          )
          // Flatten the curved edge and slide the whole sheet up — one coherent
          // wipe. Transform + a single path redraw = compositor-friendly.
          .to(
            state,
            { curve: 0, duration: 0.9, ease: "power2.inOut", onUpdate: draw },
            "exit",
          )
          .to(
            root.current,
            { yPercent: -100, duration: 0.9, ease: "power2.inOut" },
            "exit",
          );
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set("[data-loader-emblem]", { autoAlpha: 1 });
        releaseHero();
        gsap.to(root.current, { autoAlpha: 0, duration: 0.4, onComplete: finish });
      });

      return () => window.removeEventListener("resize", onResize);
    },
    { scope: root },
  );

  if (done) return null;

  return (
    <div
      ref={root}
      data-preloader
      role="status"
      aria-label={t("loading")}
      className="fixed left-0 top-0 z-[100] w-screen will-change-transform"
      style={{ height: `calc(100vh + ${CURVE}px)` }}
    >
      {/* The curtain itself: a single filled path whose bottom edge curves. */}
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
        <path ref={pathRef} style={{ fill: BROWN }} />
      </svg>

      {/* Cream loading emblem centred in the viewport (not the taller sheet). */}
      <div className="relative flex h-screen items-center justify-center px-6">
        <div
          data-loader-emblem
          aria-hidden="true"
          className="aspect-[860/640] w-[min(460px,72vw)]"
          style={EMBLEM}
        />
      </div>
    </div>
  );
}
