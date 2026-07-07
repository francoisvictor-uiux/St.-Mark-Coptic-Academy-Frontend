"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Stagger between [data-reveal] children entering together. */
  stagger?: number;
  /** Initial vertical offset in px. */
  y?: number;
  id?: string;
};

/**
 * Scroll-reveal region: fades/slides every `[data-reveal]` descendant up
 * as it enters the viewport. Respects prefers-reduced-motion.
 */
export default function Reveal({
  children,
  className,
  stagger = 0.12,
  y = 48,
  id,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const targets = gsap.utils.toArray<HTMLElement>("[data-reveal]", ref.current);
      if (!targets.length) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(targets, { autoAlpha: 0, y });
        ScrollTrigger.batch(targets, {
          start: "top 88%",
          once: true,
          onEnter: (els) =>
            gsap.to(els, {
              autoAlpha: 1,
              y: 0,
              duration: 0.9,
              ease: "power3.out",
              stagger,
              overwrite: true,
            }),
        });
      });
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className} id={id}>
      {children}
    </div>
  );
}
