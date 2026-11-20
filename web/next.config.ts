import type { NextConfig } from "next";

import path from "path";

// The DUT AI Workspace gateway serves this app under /data.
const BASE_PATH = "/data";

// Same-origin API proxy (read at build time).
// Production docker: API_PROXY_ORIGIN=http://api:8000 and NEXT_PUBLIC_API_BASE_URL=/data/api/v1.
const apiOrigin = (
  process.env.API_PROXY_ORIGIN ?? "http://127.0.0.1:8002"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["tri-dac.taila6b408.ts.net"],
  output: "standalone",
  basePath: BASE_PATH,
  env: {
    APP_BASE_PATH: BASE_PATH,
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    // Rewrites clone the request body and silently truncate it past this size.
    proxyClientMaxBodySize: "100mb",
  },
  async rewrites() {
    // `source` gets the basePath automatically (/data/api/...).
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiOrigin}/api/v1/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
