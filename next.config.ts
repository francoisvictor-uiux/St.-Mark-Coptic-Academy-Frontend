import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

// Normalize BACKEND_URL so the rewrite destinations are always valid: Next.js
// rejects any destination that doesn't start with `/`, `http://`, or `https://`.
// This tolerates a scheme-less host (adds https://) and strips trailing slashes,
// so e.g. `api.smcacademy.org/` becomes `https://api.smcacademy.org`.
const rawBackend = process.env.BACKEND_URL ?? "http://localhost:8000";
const backend = (/^https?:\/\//i.test(rawBackend) ? rawBackend : `https://${rawBackend}`).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // Proxy API calls to Django so the browser sees one origin — the httpOnly
  // refresh cookie works without CORS (docs/auth-spec/04-backend-django.md §3).
  // NOTE: rewrites are baked in at BUILD time, so BACKEND_URL must be set when building.
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backend}/api/v1/:path*`,
      },
      {
        // Uploaded media (CMS images) served by Django
        source: "/media/:path*",
        destination: `${backend}/media/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
