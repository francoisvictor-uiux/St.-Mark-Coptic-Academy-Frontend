"use client";

import { useTranslations } from "next-intl";

/**
 * Full-screen loading overlay shown while a route segment is loading (wired up
 * through the App Router `loading.tsx` files). It mirrors the emblem + motif
 * band of the hard-load {@link Preloader} so navigation feels like one piece,
 * but stays lightweight: no GSAP, just a gentle CSS breathe and an
 * indeterminate hairline sweep. Next.js unmounts it automatically once the new
 * segment has finished rendering.
 *
 * It's a client component so `useTranslations` reads the locale straight from
 * the surrounding NextIntlClientProvider — reliable even as a Suspense
 * fallback, where the server request locale isn't guaranteed.
 */
export default function LoadingScreen() {
  const t = useTranslations("misc");

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t("loading")}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-creamy-100"
    >
      {/* Same gradient-masked motif band as the hero / preloader */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 h-[430px] -translate-y-1/2 opacity-[0.05] [background-image:url('/Pattern.svg')] [background-size:374px_212px] [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)]"
      />

      <div className="relative flex flex-col items-center gap-8 px-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative local SVG, no optimization needed */}
        <img
          src="/loading.svg"
          alt=""
          width={860}
          height={640}
          className="loader-emblem w-[min(460px,72vw)]"
        />
        {/* Indeterminate hairline: a soft sweep travels across a faint track */}
        <div
          aria-hidden="true"
          className="relative h-px w-44 overflow-hidden bg-brown-300/20"
        >
          <div className="loader-sweep absolute inset-y-0 left-0 w-full origin-center bg-brown-300/70" />
        </div>
      </div>
    </div>
  );
}
