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
 * Scroll-reveal region: fades/slides every `[data-reveal]` descendant up as it
 * enters the viewport, and reverses it back to the hidden state when it scrolls
 * out the bottom again (so scrolling up "un-reveals" the content). Respects
 * prefers-reduced-motion.
 *
 * Uses ScrollTrigger.batch so items entering/leaving together animate as one
 * staggered group rather than each firing its own tween.
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
          // Scrolling down into view → reveal (front-to-back stagger).
          onEnter: (els) =>
            gsap.to(els, {
              autoAlpha: 1,
              y: 0,
              duration: 0.9,
              ease: "power3.out",
              stagger,
              overwrite: true,
            }),
          // Scrolling back up out of view → de-reveal (reverse stagger, snappier).
          onLeaveBack: (els) =>
            gsap.to(els, {
              autoAlpha: 0,
              y,
              duration: 0.5,
              ease: "power2.in",
              stagger: { each: stagger, from: "end" },
              overwrite: true,
            }),
        });
      });

      // Reduced motion: no hiding, no animation — content stays visible.
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className} id={id}>
      {children}
    </div>
  );
}
