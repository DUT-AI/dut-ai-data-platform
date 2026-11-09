import type { NextConfig } from "next";

import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["tri-dac.taila6b408.ts.net"],
  output: "standalone",
  async rewrites() {
    const apiOrigin = process.env.API_PROXY_ORIGIN ?? "http://127.0.0.1:8002";

    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/v1/:path*`,
      },
    ];
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
