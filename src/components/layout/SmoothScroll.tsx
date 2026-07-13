"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

declare global {
  // eslint-disable-next-line no-var
  var __lenis: Lenis | undefined;
}

/**
 * Site-wide smooth scroll (Lenis) wired into GSAP ScrollTrigger.
 *
 * Lenis drives the native window scroll and GSAP's ticker drives Lenis, so
 * every existing ScrollTrigger (section reveals, hero parallax, …) stays in
 * perfect sync with the smoothed scroll position — no per-section changes and
 * no scroller-proxy container needed. This is the same engine Locomotive
 * Scroll v5 runs on internally.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      // Snappier response — a long duration reads as lag. Touch stays native.
      duration: 0.9,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    globalThis.__lenis = lenis;

    // Update ScrollTrigger on every Lenis scroll, and advance Lenis from
    // GSAP's ticker so both share one animation frame loop.
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Keep the page still while the preloader intro is on screen.
    if (document.querySelector("[data-preloader]")) lenis.stop();
    const onPreloaderDone = () => lenis.start();
    window.addEventListener("preloader:done", onPreloaderDone);

    // Smoothly ease in-page anchor links (#programs, #apply, #top …).
    const clean = (p: string) => p.replace(/\/+$/, "") || "/";
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest?.('a[href*="#"]') as
        | HTMLAnchorElement
        | null;
      if (!anchor) return;
      const url = new URL(anchor.href, window.location.href);
      if (clean(url.pathname) !== clean(window.location.pathname)) return;
      const id = url.hash.slice(1);
      const target = id ? document.getElementById(id) : null;
      if (!target && id !== "top") return;
      e.preventDefault();
      lenis.scrollTo(target ?? 0, { offset: -110 });
    };
    document.addEventListener("click", onClick);

    return () => {
      window.removeEventListener("preloader:done", onPreloaderDone);
      document.removeEventListener("click", onClick);
      gsap.ticker.remove(raf);
      lenis.destroy();
      globalThis.__lenis = undefined;
    };
  }, []);

  return null;
}
