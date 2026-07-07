"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/**
 * Full-screen intro overlay shown on every hard page load. The hero pauses
 * its entrance while `[data-preloader]` is in the DOM and resumes on the
 * `preloader:done` window event.
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
        gsap
          .timeline({ defaults: { ease: "power3.out" }, onComplete: finish })
          // Pattern band breathes in behind the emblem
          .from("[data-loader-pattern]", { autoAlpha: 0, duration: 1.2, ease: "power2.out" })
          // Emblem rises into place
          .from(
            "[data-loader-emblem]",
            { autoAlpha: 0, y: 36, scale: 0.94, duration: 1.1 },
            "-=0.9",
          )
          // Hairline draws underneath like an ink stroke
          .fromTo(
            "[data-loader-line]",
            { scaleX: 0 },
            { scaleX: 1, duration: 1.2, ease: "power2.inOut" },
            "-=0.5",
          )
          // Exit: emblem drifts up and the whole sheet lifts away
          .to(
            "[data-loader-emblem], [data-loader-line]",
            { autoAlpha: 0, y: -48, duration: 0.55, ease: "power2.in" },
            "+=0.3",
          )
          .to(
            ref.current,
            {
              yPercent: -100,
              duration: 1,
              ease: "power4.inOut",
              // Let the hero begin its entrance while the sheet lifts
              onStart: () => window.dispatchEvent(new Event("preloader:done")),
            },
            "-=0.25",
          );
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
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
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-creamy-100"
    >
      {/* Same gradient-masked motif band as the hero */}
      <div
        data-loader-pattern
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 h-[430px] -translate-y-1/2 opacity-[0.05] [background-image:url('/Pattern.svg')] [background-size:374px_212px] [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)]"
      />

      <div className="relative flex flex-col items-center gap-8 px-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative local SVG, no optimization needed */}
        <img
          data-loader-emblem
          src="/loading.svg"
          alt=""
          width={860}
          height={640}
          className="w-[min(460px,72vw)]"
        />
        <div
          data-loader-line
          aria-hidden="true"
          className="h-px w-44 origin-center bg-brown-300/70"
        />
      </div>
    </div>
  );
}
