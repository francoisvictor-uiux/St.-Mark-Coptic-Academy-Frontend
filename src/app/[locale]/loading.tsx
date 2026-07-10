import LoadingScreen from "@/components/layout/LoadingScreen";

/**
 * App Router loading UI for every route under `[locale]`. Next.js renders this
 * as a Suspense fallback whenever navigating to a segment that is still
 * fetching/rendering, so any page transition that isn't instant shows the
 * academy loading emblem.
 */
export default function Loading() {
  return <LoadingScreen />;
}
