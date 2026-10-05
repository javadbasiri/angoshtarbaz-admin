import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Gallery bytes that must carry the admin JWT are posted as a server action.
    // 64mb covers the 12mb image cap and the 50mb video cap, plus multipart overhead.
    serverActions: {
      bodySizeLimit: "64mb",
    },
    proxyClientMaxBodySize: "64mb",
  },
};

export default nextConfig;
