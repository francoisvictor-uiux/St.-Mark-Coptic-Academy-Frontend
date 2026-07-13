"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const CREAM = "#FEF6F0"; // page-cream — the emblem colour

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
 * Full-screen intro overlay shown on every hard page load. The hero pauses
 * its entrance while `[data-preloader]` is in the DOM and resumes on the
 * `preloader:done` window event. On exit the emblem zooms toward the viewer
 * and the sheet dissolves to reveal the page — transform/opacity only, so it
 * stays smooth (the old mask-size cross-reveal repainted every frame).
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
        // Promote to their own layers so the transforms composite on the GPU.
        gsap.set(ref.current, { willChange: "opacity" });
        gsap.set("[data-loader-emblem]", { autoAlpha: 0, scale: 0.94, transformOrigin: "50% 50%", willChange: "transform, opacity" });
        gsap
          .timeline({ defaults: { ease: "power2.out" }, onComplete: finish })
          // Emblem eases in (opacity + a touch of scale — no mask re-raster)
          .to("[data-loader-emblem]", { autoAlpha: 1, scale: 1, duration: 1.0 })
          // Exit: emblem dives toward the viewer while the sheet dissolves to
          // reveal the page. Pure transform/opacity → GPU-composited, smooth.
          .to(
            "[data-loader-emblem]",
            {
              scale: 5,
              autoAlpha: 0,
              duration: 0.9,
              ease: "power2.in",
              onStart: () => window.dispatchEvent(new Event("preloader:done")),
            },
            "+=0.55",
          )
          .to(ref.current, { autoAlpha: 0, duration: 0.7, ease: "power1.out" }, "-=0.7");
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set("[data-loader-emblem]", { autoAlpha: 1 });
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
    >
      <div className="relative flex flex-col items-center px-6">
        {/* Cream loading emblem (loading.svg via mask) */}
        <div data-loader-emblem aria-hidden="true" className="aspect-[860/640] w-[min(460px,72vw)]" style={EMBLEM} />
      </div>
    </div>
  );
}
