"use client";

/** Guest-friendly article bookmarks in localStorage (no auth needed). */

import { useCallback, useEffect, useSyncExternalStore } from "react";

const KEY = "smca_bookmarks";
const EVENT = "smca-bookmarks-changed";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(slugs: string[]) {
  localStorage.setItem(KEY, JSON.stringify(slugs));
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

const SERVER_SNAPSHOT: string[] = [];
let cache: string[] = [];
let cacheKey = "";
function getSnapshot() {
  const raw = typeof window === "undefined" ? "[]" : localStorage.getItem(KEY) || "[]";
  if (raw !== cacheKey) {
    cacheKey = raw;
    try {
      cache = JSON.parse(raw);
    } catch {
      cache = [];
    }
  }
  return cache;
}

// Stable reference so React doesn't loop on the SSR snapshot.
function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

export function useBookmarks() {
  const slugs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback((slug: string) => {
    const current = read();
    write(current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug]);
  }, []);

  const has = useCallback((slug: string) => slugs.includes(slug), [slugs]);

  return { slugs, toggle, has, count: slugs.length };
}

/** Fire once on mount to migrate/normalize if needed (currently a no-op hook shell). */
export function useBookmarksReady() {
  useEffect(() => {}, []);
}
