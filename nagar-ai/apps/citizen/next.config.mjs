/**
 * Single-origin deploy: browser calls same-origin /api/v1/* and Next.js
 * proxies to the FastAPI backend. BACKEND_ORIGIN differs per environment
 * (docker compose sets http://backend:8000; bare-metal dev uses the default
 * http://localhost:8000). When NEXT_PUBLIC_API_BASE_URL is an absolute URL
 * (local .env.local), these rewrites simply never match and nothing changes.
 */
const backendOrigin = process.env.BACKEND_ORIGIN || "http://localhost:8000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendOrigin}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
