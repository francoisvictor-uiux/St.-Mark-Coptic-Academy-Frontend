"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * Forces the viewport back to the top on every route change. Next.js normally
 * scrolls to the top on navigation, but scroll-restoration and the site's
 * scroll-driven animations can leave a new page part-way down — this guarantees
 * every page opens at the top. Hash links (#section) are left alone so in-page
 * anchors still work.
 */
export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Don't fight an intentional in-page anchor jump.
    if (window.location.hash) return;

    // Instant jump — a smooth scroll on every navigation feels sluggish.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}
