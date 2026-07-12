"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Cinematic recede: as this section scrolls out, it eases back (a gentle
 * scale-down + upward drift) while a soft shadow gradient deepens from the
 * bottom — as if the next section is settling on top and casting onto it.
 * Fully scroll-scrubbed (synced to the smooth scroll) and buttery via scrub:1.
 * The transform lives on an inner node so it never feeds back into the trigger.
 */
export default function SectionRecede({ children }: { children: React.ReactNode }) {
  const trigger = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const shade = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!trigger.current || !inner.current || !shade.current) return;
      const st = { trigger: trigger.current, start: "bottom bottom", end: "bottom top", scrub: 1 };
      gsap.set(inner.current, { transformOrigin: "50% 35%" });
      gsap.to(inner.current, { scale: 0.93, yPercent: -3, ease: "none", scrollTrigger: st });
      gsap.to(shade.current, { opacity: 0.6, ease: "none", scrollTrigger: st });
    },
    { scope: trigger },
  );

  return (
    <div ref={trigger} className="relative">
      <div ref={inner} className="relative [will-change:transform]">
        {children}
        <div
          ref={shade}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-brown-900/0 to-brown-900 opacity-0"
        />
      </div>
    </div>
  );
}
