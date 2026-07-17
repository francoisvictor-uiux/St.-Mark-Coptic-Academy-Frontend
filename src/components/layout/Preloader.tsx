"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const CREAM = "#FEF6F0"; // page-cream — the emblem colour
const BROWN = "#562823"; // --color-brown-500 — the curtain colour

// The curtain is drawn in a normalised 0-100 viewBox (preserveAspectRatio="none"
// stretches it to fill the sheet). That's deliberate: the shape needs no
// measuring, so the real `d` is rendered on the SERVER and the curtain is opaque
// on the very first paint. Previously `d` was computed from window.innerWidth in
// an effect, so the SSR'd path was empty — the page flashed through the
// "invisible" preloader until JS hydrated and drew it.
const CURVE = 16; // bulge of the bottom edge, in viewBox units
const SHEET = "124vh"; // taller than the viewport so the curve can't reveal the page early

// The flatten and the slide MUST share a duration and ease — they're two tweens
// describing one motion, and any drift between them makes the curved edge lag
// the sheet. Kept as constants so they can't be edited apart.
//
// `power2.in` rather than an inOut: the sheet travels 124vh but clears the
// viewport at ~84% of that, so an inOut spends its whole deceleration phase
// while the trailing edge is still on screen — the curtain visibly slows as it
// leaves, which reads as a stall. Accelerating out keeps the edge speeding up
// until it's gone, and the gentle start still eases in cleanly.
const EXIT_DURATION = 1;
const EXIT_EASE = "power2.in";

// Rectangle with a quadratic-curved bottom edge that rises `curve` toward the
// middle. At CURVE the mid-point sits at (1 - 16/100) * 124vh = 104vh — still
// below the fold on ANY viewport height, since it's all in vh. curve 0 = flat.
const curvePath = (curve: number) => `M0 0 L100 0 L100 100 Q50 ${100 - curve} 0 100 L0 0`;

// loading.svg rendered in cream via mask. A *static* mask is cheap: it's
// rasterized once and then only opacity animates (GPU-composited). Animating
// mask-SIZE is what janked the old cross reveal — this never resizes the mask.
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
 * The cream emblem fades in (opacity only), then the whole sheet slides up
 * while a single SVG `<path>` flattens its curved bottom edge — a curved-curtain
 * wipe. Nothing masked is ever re-sized/re-rastered per frame, so it stays
 * smooth even on weak GPUs.
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

      // Normalised coords, so the sheet rescales itself on resize — no measuring,
      // no redraw listener. The path already carries its server-rendered shape.
      const state = { curve: CURVE };
      const draw = () => pathRef.current?.setAttribute("d", curvePath(state.curve));

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
          .addLabel("exit", "+=0.25")
          .add(releaseHero, "exit")
          .to("[data-loader-emblem]", { autoAlpha: 0, duration: 0.3, ease: "power2.in" }, "exit")
          // Flatten the curved edge and slide the sheet up — one coherent wipe.
          .to(
            state,
            { curve: 0, duration: EXIT_DURATION, ease: EXIT_EASE, onUpdate: draw },
            "exit",
          )
          .to(
            root.current,
            { yPercent: -100, duration: EXIT_DURATION, ease: EXIT_EASE },
            "exit",
          );
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set("[data-loader-emblem]", { autoAlpha: 1 });
        releaseHero();
        gsap.to(root.current, { autoAlpha: 0, duration: 0.4, onComplete: finish });
      });
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
      style={{ height: SHEET }}
    >
      {/* The curtain: a single filled path whose bottom edge curves. `d` is
          rendered here (not in an effect) so the sheet is opaque on the first
          paint — otherwise the page shows through until JS hydrates. */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path ref={pathRef} d={curvePath(CURVE)} style={{ fill: BROWN }} />
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
