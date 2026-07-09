import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Proxy API calls to Django so the browser sees one origin — the httpOnly
  // refresh cookie works without CORS (docs/auth-spec/04-backend-django.md §3).
  async rewrites() {
    const backend = process.env.BACKEND_URL ?? "http://localhost:8000";
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
