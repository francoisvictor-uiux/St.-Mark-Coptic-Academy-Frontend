"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Rounded panel that rises over the previous section and settles into focus:
 * a scroll-scrubbed scale-up gives the cinematic "coming forward" feel. Its
 * content is revealed by the section's own <Reveal> as it lands.
 */
export default function RisingPanel({ children }: { children: React.ReactNode }) {
  const trigger = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const t = trigger.current;
      const el = inner.current;
      if (!t || !el) return;

      // Scrubbed rise: the panel scales up and lifts as it enters.
      gsap.fromTo(
        el,
        { scale: 0.955, yPercent: 2.5 },
        {
          scale: 1,
          yPercent: 0,
          ease: "none",
          scrollTrigger: { trigger: t, start: "top 95%", end: "top 45%", scrub: 1 },
        },
      );
    },
    { scope: trigger },
  );

  return (
    <div ref={trigger} className="relative z-10 -mt-8">
      <div
        ref={inner}
        className="overflow-hidden rounded-t-[44px] bg-creamy-100 shadow-[0_-24px_60px_-28px_rgba(36,17,15,0.4)] [will-change:transform]"
      >
        {children}
      </div>
    </div>
  );
}
