import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { CMS_TAG } from "@/lib/public-content";

/**
 * On-demand ISR revalidation for CMS content.
 *
 * Public pages fetch published content tagged with `CMS_TAG` (see
 * `src/lib/public-content.ts`) using a 60s ISR window. The admin dashboard
 * pings this route after every successful content mutation so that edits,
 * publishes and image changes appear on the live site immediately instead of
 * waiting for the time-based window to lapse.
 */
export async function POST() {
  // `{ expire: 0 }` expires tagged entries immediately, so the next visit to a
  // public page refetches fresh content from the backend (Next 16 signature).
  revalidateTag(CMS_TAG, { expire: 0 });
  return NextResponse.json({ revalidated: true, tag: CMS_TAG });
}
