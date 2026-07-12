"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Link } from "@/i18n/navigation";

gsap.registerPlugin(useGSAP);

type Item = { href: string; label: string; active?: boolean };

/**
 * Awwwards-style mobile side menu: a panel slides in from the edge with a
 * morphing curved seam and the links reveal in a stagger. GSAP-driven; the
 * component stays mounted and animates open/closed off the `open` prop.
 */
export default function MobileMenu({
  open,
  onClose,
  items,
  loginLabel,
  registerLabel,
}: {
  open: boolean;
  onClose: () => void;
  items: Item[];
  loginLabel: string;
  registerLabel: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const curve = useRef<SVGPathElement>(null);
  const cp = useRef({ c: -100 }); // curve control-point x (bulged when hidden, flat when open)

  useGSAP(
    () => {
      const b = backdrop.current;
      const p = panel.current;
      const c = curve.current;
      if (!b || !p) return;
      const links = p.querySelectorAll<HTMLElement>("[data-menu-item]");
      const h = window.innerHeight;
      const setPath = () =>
        c?.setAttribute("d", `M100 0 L100 ${h} Q${cp.current.c} ${h / 2} 100 0`);
      setPath();

      if (open) {
        gsap.set(root.current, { pointerEvents: "auto" });
        globalThis.__lenis?.stop();
        gsap.to(b, { autoAlpha: 1, duration: 0.4, ease: "power2.out", overwrite: true });
        gsap.to(p, { xPercent: 0, duration: 0.9, ease: "expo.out", overwrite: true });
        gsap.to(cp.current, { c: 100, duration: 0.9, ease: "expo.out", onUpdate: setPath, overwrite: true });
        gsap.fromTo(
          links,
          { autoAlpha: 0, x: 48 },
          { autoAlpha: 1, x: 0, duration: 0.6, ease: "power3.out", stagger: 0.07, delay: 0.22, overwrite: true },
        );
      } else {
        gsap.to(p, { xPercent: 100, duration: 0.7, ease: "expo.inOut", overwrite: true });
        gsap.to(cp.current, { c: -100, duration: 0.7, ease: "expo.inOut", onUpdate: setPath, overwrite: true });
        gsap.to(b, {
          autoAlpha: 0,
          duration: 0.5,
          ease: "power2.out",
          overwrite: true,
          onComplete: () => {
            gsap.set(root.current, { pointerEvents: "none" });
            globalThis.__lenis?.start();
          },
        });
      }
    },
    { dependencies: [open], scope: root },
  );

  return (
    <div ref={root} className="fixed inset-0 z-40 lg:hidden" style={{ pointerEvents: "none" }} aria-hidden={!open}>
      {/* Backdrop */}
      <div
        ref={backdrop}
        onClick={onClose}
        className="absolute inset-0 bg-brown-900/50 opacity-0 backdrop-blur-sm"
      />

      {/* Sliding panel */}
      <div
        ref={panel}
        id="mobile-menu"
        className="absolute inset-y-0 right-0 flex w-[min(84vw,360px)] translate-x-full flex-col bg-brown-900 px-8 pb-10 pt-28 text-creamy-100"
      >
        {/* Morphing curved seam on the panel's inner edge */}
        <svg
          aria-hidden="true"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-y-0 right-full h-full w-[101px] fill-brown-900"
        >
          <path ref={curve} d="" />
        </svg>

        <nav aria-label="Mobile" className="flex flex-col gap-1">
          {items.map((item) => (
            <div key={item.href} data-menu-item className="overflow-hidden">
              <Link
                href={item.href}
                onClick={onClose}
                aria-current={item.active ? "page" : undefined}
                data-active={item.active ? "true" : undefined}
                className="group flex items-center gap-3 py-3 font-serif text-2xl text-creamy-100/85 transition-colors hover:text-creamy-50 data-active:text-creamy-50"
              >
                <span className="size-1.5 shrink-0 rounded-full bg-red-400 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-data-active:opacity-100" />
                {item.label}
              </Link>
            </div>
          ))}
        </nav>

        <div data-menu-item className="mt-auto flex flex-col gap-3 pt-8">
          <Link
            href="/login"
            onClick={onClose}
            className="flex h-12 items-center justify-center rounded-full border border-creamy-100/40 font-serif font-bold text-creamy-100 transition-colors hover:bg-creamy-100/10"
          >
            {loginLabel}
          </Link>
          <Link
            href="/register"
            onClick={onClose}
            className="flex h-12 items-center justify-center rounded-full bg-creamy-100 font-serif font-bold text-brown-900 transition-colors hover:bg-creamy-300"
          >
            {registerLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
